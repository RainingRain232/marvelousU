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
  // Cached materials per enemy for fast hit-flash updates (avoids group.traverse each frame)
  private _enemyMaterials = new Map<number, THREE.Material[]>();

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

  // Hazard meshes
  private _hazardMeshes = new Map<number, THREE.Group>();

  // Reusable geometries
  private _sphereGeo!: THREE.SphereGeometry;
  private _boxGeo!: THREE.BoxGeometry;
  private _coneGeo!: THREE.ConeGeometry;
  private _cylinderGeo!: THREE.CylinderGeometry;

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
    this._cylinderGeo = new THREE.CylinderGeometry(1, 1, 1, 6);

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
          // Create angled ray beams — 12 diffuse rays for a smooth, natural look
          float rays = 0.0;
          float x = vUv.x;
          float y = vUv.y;
          // Many overlapping rays with wide spacing and soft falloff
          for (float i = 0.0; i < 12.0; i++) {
            float offset = i * 0.075 + 0.05;
            float width = 0.03 + sin(uTime * 0.25 + i * 0.8) * 0.01;
            float ray = smoothstep(width, 0.0, abs(x - offset + sin(y * 1.5 + uTime * 0.15 + i * 0.7) * 0.04));
            ray *= smoothstep(0.0, 0.35, y) * smoothstep(1.0, 0.35, y);
            rays += ray * (0.5 + sin(uTime * 0.4 + i * 1.2) * 0.15);
          }
          vec3 col = vec3(1.0, 0.9, 0.6) * rays * 0.06;
          float a = rays * 0.04;
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
      case TDEnemyType.SHADOW_RAVEN: {
        // ── Shadow Wraith Serpent ──
        // A nightmarish spectral centipede-dragon: writhing segmented body of
        // shadow tendrils, multiple ghostly skull heads, trailing dark smoke,
        // hollow glowing purple eye sockets.

        const shadowMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.35,
          specular: 0x220033,
          shininess: 20,
          transparent: true,
          opacity: 0.85,
        });

        // --- Serpentine segmented body (7 segments, undulating) ---
        const segCount = 7;
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1); // 0..1 head-to-tail
          const segScale = 1.0 - t * 0.35; // taper toward tail
          const seg = new THREE.Mesh(this._sphereGeo, shadowMat.clone());
          seg.scale.set(s * 0.45 * segScale, s * 0.35 * segScale, s * 0.4 * segScale);
          const xOff = s * 1.2 - i * s * 0.4;
          const yOff = Math.sin(i * 0.7) * s * 0.12;
          seg.position.set(xOff, yOff, 0);
          group.add(seg);

          // Shadow tendrils dangling from each segment
          const tendrilMat = new THREE.MeshBasicMaterial({
            color: 0x110011,
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          });
          for (let t2 = 0; t2 < 2; t2++) {
            const tendril = new THREE.Mesh(this._coneGeo, tendrilMat);
            tendril.scale.set(s * 0.06, s * (0.3 + Math.random() * 0.25), s * 0.06);
            tendril.position.set(
              xOff + (Math.random() - 0.5) * s * 0.15,
              yOff - s * 0.25 - Math.random() * s * 0.15,
              (t2 === 0 ? -1 : 1) * s * 0.12 + (Math.random() - 0.5) * s * 0.08,
            );
            tendril.rotation.z = (Math.random() - 0.5) * 0.6;
            group.add(tendril);
          }
        }

        // --- Connector ridges between segments (spiny centipede feel) ---
        for (let i = 0; i < segCount - 1; i++) {
          const ridgeMat = new THREE.MeshPhongMaterial({
            color: 0x1a0025,
            emissive: enemy.glowColor,
            emissiveIntensity: 0.15,
          });
          const ridge = new THREE.Mesh(this._boxGeo, ridgeMat);
          const xOff = s * 1.0 - i * s * 0.4;
          ridge.scale.set(s * 0.12, s * 0.08, s * 0.5);
          ridge.position.set(xOff, s * 0.2, 0);
          group.add(ridge);
        }

        // --- Multiple ghostly skull heads (3 skulls along front) ---
        const skullMat = new THREE.MeshPhongMaterial({
          color: 0x2a1a2a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.9,
        });
        const eyeSocketMat = new THREE.MeshBasicMaterial({ color: 0xaa44ff });
        const skullPositions = [
          { x: s * 1.5, y: s * 0.25, z: 0 },       // center skull (main)
          { x: s * 1.1, y: s * 0.45, z: -s * 0.3 }, // upper-left skull
          { x: s * 1.1, y: s * 0.45, z: s * 0.3 },  // upper-right skull
        ];
        for (let si = 0; si < skullPositions.length; si++) {
          const sp = skullPositions[si];
          const skullScale = si === 0 ? 1.0 : 0.7; // main skull bigger

          // Cranium
          const cranium = new THREE.Mesh(this._sphereGeo, skullMat.clone());
          cranium.scale.set(s * 0.3 * skullScale, s * 0.25 * skullScale, s * 0.22 * skullScale);
          cranium.position.set(sp.x, sp.y, sp.z);
          group.add(cranium);

          // Jaw (slightly open)
          const jaw = new THREE.Mesh(this._boxGeo, skullMat.clone());
          jaw.scale.set(s * 0.18 * skullScale, s * 0.06 * skullScale, s * 0.16 * skullScale);
          jaw.position.set(sp.x + s * 0.12 * skullScale, sp.y - s * 0.12 * skullScale, sp.z);
          jaw.rotation.z = 0.15;
          group.add(jaw);

          // Hollow glowing purple eye sockets
          for (const zSide of [-1, 1]) {
            const eyeSocket = new THREE.Mesh(
              new THREE.SphereGeometry(s * 0.06 * skullScale, 6, 4),
              eyeSocketMat,
            );
            eyeSocket.position.set(
              sp.x + s * 0.14 * skullScale,
              sp.y + s * 0.04 * skullScale,
              sp.z + zSide * s * 0.08 * skullScale,
            );
            group.add(eyeSocket);
          }

          // Spectral horns curving back from each skull
          const hornMat = new THREE.MeshPhongMaterial({
            color: 0x330044,
            emissive: 0x220033,
            emissiveIntensity: 0.3,
          });
          for (const zSide of [-1, 1]) {
            const horn = new THREE.Mesh(this._coneGeo, hornMat);
            horn.scale.set(s * 0.04 * skullScale, s * 0.2 * skullScale, s * 0.04 * skullScale);
            horn.position.set(
              sp.x - s * 0.08 * skullScale,
              sp.y + s * 0.18 * skullScale,
              sp.z + zSide * s * 0.1 * skullScale,
            );
            horn.rotation.z = 0.6 * zSide;
            horn.rotation.x = -0.3 * zSide;
            group.add(horn);
          }
        }

        // --- Spectral shadow wings (wraith membranes, not feathered) ---
        const wingMemMat = new THREE.MeshPhongMaterial({
          color: 0x0d0015,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        const wL = new THREE.Mesh(this._createWingGeometry(), wingMemMat);
        wL.scale.set(s * 0.8, s * 0.5, s * 1.1);
        wL.position.set(s * 0.2, s * 0.15, -s * 0.5);
        wL.name = "wingL";
        group.add(wL);
        const wR = new THREE.Mesh(this._createWingGeometry(), wingMemMat.clone());
        wR.scale.set(s * 0.8, s * 0.5, -s * 1.1);
        wR.position.set(s * 0.2, s * 0.15, s * 0.5);
        wR.name = "wingR";
        group.add(wR);

        // --- Trailing dark smoke plume (layered transparent spheres) ---
        const smokeMat = new THREE.MeshBasicMaterial({
          color: 0x0a0010,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        for (let i = 0; i < 5; i++) {
          const smoke = new THREE.Mesh(this._sphereGeo, smokeMat.clone());
          const smokeScale = s * (0.3 + i * 0.12);
          smoke.scale.set(smokeScale, smokeScale * 0.5, smokeScale * 0.7);
          smoke.position.set(
            -s * 1.0 - i * s * 0.35,
            (Math.random() - 0.5) * s * 0.15,
            (Math.random() - 0.5) * s * 0.2,
          );
          group.add(smoke);
        }

        // --- Centipede legs (small spikes along underside) ---
        const legMat = new THREE.MeshPhongMaterial({
          color: 0x1a0025,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
        });
        for (let i = 0; i < 6; i++) {
          for (const zSide of [-1, 1]) {
            const leg = new THREE.Mesh(this._coneGeo, legMat);
            leg.scale.set(s * 0.03, s * 0.18, s * 0.03);
            const xOff = s * 1.0 - i * s * 0.35;
            leg.position.set(xOff, -s * 0.3, zSide * s * 0.25);
            leg.rotation.z = zSide * 0.4;
            group.add(leg);
          }
        }

        // --- Ghostly purple energy orbs floating around body ---
        const orbMat = new THREE.MeshBasicMaterial({
          color: 0xbb66ff,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        for (let i = 0; i < 4; i++) {
          const orb = new THREE.Mesh(
            new THREE.SphereGeometry(s * 0.07, 5, 4),
            orbMat,
          );
          orb.position.set(
            (Math.random() - 0.3) * s * 2.0,
            (Math.random() - 0.5) * s * 0.6,
            (Math.random() - 0.5) * s * 0.8,
          );
          group.add(orb);
        }

        // --- Overlapping scale plates on each body segment ---
        const scalePlateMat = new THREE.MeshPhongMaterial({
          color: 0x1a0028,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.12,
          specular: 0x330044,
          shininess: 40,
        });
        for (let i = 0; i < segCount; i++) {
          const tSeg = i / (segCount - 1);
          const segScaleP = 1.0 - tSeg * 0.35;
          const xOffP = s * 1.2 - i * s * 0.4;
          const yOffP = Math.sin(i * 0.7) * s * 0.12;
          for (let sc = 0; sc < 4; sc++) {
            const plate = new THREE.Mesh(this._boxGeo, scalePlateMat.clone());
            plate.scale.set(s * 0.1 * segScaleP, s * 0.015 * segScaleP, s * 0.12 * segScaleP);
            plate.position.set(
              xOffP + (sc - 1.5) * s * 0.08 * segScaleP,
              yOffP + s * 0.22 * segScaleP,
              (sc % 2 === 0 ? -1 : 1) * s * 0.05 * segScaleP,
            );
            plate.rotation.z = (sc - 1.5) * 0.15;
            plate.rotation.x = (sc % 2 === 0 ? -1 : 1) * 0.2;
            group.add(plate);
          }
        }

        // --- Glowing nerve lines between segments ---
        const nerveMat = new THREE.MeshBasicMaterial({
          color: 0xcc66ff,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });
        for (let i = 0; i < segCount - 1; i++) {
          const nx1 = s * 1.2 - i * s * 0.4;
          const nx2 = s * 1.2 - (i + 1) * s * 0.4;
          const ny1 = Math.sin(i * 0.7) * s * 0.12;
          const ny2 = Math.sin((i + 1) * 0.7) * s * 0.12;
          for (const nzOff of [-0.1, 0, 0.1]) {
            const nerve = new THREE.Mesh(this._boxGeo, nerveMat.clone());
            const ndx = nx2 - nx1;
            const ndy = ny2 - ny1;
            const nerveLen = Math.sqrt(ndx * ndx + ndy * ndy);
            nerve.scale.set(nerveLen, s * 0.008, s * 0.008);
            nerve.position.set(
              (nx1 + nx2) / 2,
              (ny1 + ny2) / 2 + s * 0.05,
              nzOff * s,
            );
            nerve.rotation.z = Math.atan2(ndy, ndx);
            group.add(nerve);
          }
        }

        // --- Skull anatomy: cheekbones, teeth rows, brow ridges ---
        const boneMat = new THREE.MeshPhongMaterial({
          color: 0x2a1a2a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.88,
        });
        for (let si2 = 0; si2 < skullPositions.length; si2++) {
          const sp2 = skullPositions[si2];
          const skullScale2 = si2 === 0 ? 1.0 : 0.7;

          // Cheekbones
          for (const zSide of [-1, 1]) {
            const cheek = new THREE.Mesh(this._boxGeo, boneMat.clone());
            cheek.scale.set(s * 0.1 * skullScale2, s * 0.04 * skullScale2, s * 0.06 * skullScale2);
            cheek.position.set(
              sp2.x + s * 0.1 * skullScale2,
              sp2.y - s * 0.04 * skullScale2,
              sp2.z + zSide * s * 0.12 * skullScale2,
            );
            cheek.rotation.y = zSide * 0.3;
            group.add(cheek);
          }

          // Brow ridges
          for (const zSide of [-1, 1]) {
            const brow = new THREE.Mesh(this._boxGeo, boneMat.clone());
            brow.scale.set(s * 0.12 * skullScale2, s * 0.025 * skullScale2, s * 0.05 * skullScale2);
            brow.position.set(
              sp2.x + s * 0.13 * skullScale2,
              sp2.y + s * 0.1 * skullScale2,
              sp2.z + zSide * s * 0.07 * skullScale2,
            );
            brow.rotation.z = zSide * 0.15;
            group.add(brow);
          }

          // Teeth rows — 6 small cones per jaw (upper and lower)
          for (let tooth = 0; tooth < 6; tooth++) {
            const toothMat = new THREE.MeshPhongMaterial({
              color: 0x3a2a3a,
              emissive: 0x220033,
              emissiveIntensity: 0.15,
            });
            const upperTooth = new THREE.Mesh(this._coneGeo, toothMat);
            upperTooth.scale.set(s * 0.012 * skullScale2, s * 0.04 * skullScale2, s * 0.012 * skullScale2);
            upperTooth.position.set(
              sp2.x + s * 0.18 * skullScale2 + tooth * s * 0.018 * skullScale2,
              sp2.y - s * 0.06 * skullScale2,
              sp2.z + (tooth - 2.5) * s * 0.02 * skullScale2,
            );
            upperTooth.rotation.z = Math.PI;
            group.add(upperTooth);

            const lowerTooth = new THREE.Mesh(this._coneGeo, toothMat.clone());
            lowerTooth.scale.set(s * 0.01 * skullScale2, s * 0.035 * skullScale2, s * 0.01 * skullScale2);
            lowerTooth.position.set(
              sp2.x + s * 0.18 * skullScale2 + tooth * s * 0.018 * skullScale2,
              sp2.y - s * 0.14 * skullScale2,
              sp2.z + (tooth - 2.5) * s * 0.02 * skullScale2,
            );
            group.add(lowerTooth);
          }
        }

        // --- Spectral chains between skulls ---
        const chainMat = new THREE.MeshPhongMaterial({
          color: 0x3a2a4a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.65,
        });
        const chainLinks = 8;
        // Chain from skull 1 to skull 2
        for (let c = 0; c < chainLinks; c++) {
          const ct = c / (chainLinks - 1);
          const csp1 = skullPositions[1];
          const csp2 = skullPositions[2];
          const link = new THREE.Mesh(this._boxGeo, chainMat.clone());
          link.scale.set(s * 0.025, s * 0.015, s * 0.04);
          link.position.set(
            csp1.x + (csp2.x - csp1.x) * ct,
            csp1.y + (csp2.y - csp1.y) * ct - Math.sin(ct * Math.PI) * s * 0.15,
            csp1.z + (csp2.z - csp1.z) * ct,
          );
          link.rotation.y = ct * Math.PI * 2;
          group.add(link);
        }
        // Chain from main skull to left secondary
        for (let c = 0; c < chainLinks; c++) {
          const ct = c / (chainLinks - 1);
          const csp0 = skullPositions[0];
          const csp1 = skullPositions[1];
          const link = new THREE.Mesh(this._boxGeo, chainMat.clone());
          link.scale.set(s * 0.02, s * 0.012, s * 0.035);
          link.position.set(
            csp0.x + (csp1.x - csp0.x) * ct,
            csp0.y + (csp1.y - csp0.y) * ct - Math.sin(ct * Math.PI) * s * 0.2,
            csp0.z + (csp1.z - csp0.z) * ct,
          );
          link.rotation.y = ct * Math.PI * 1.5 + 0.5;
          group.add(link);
        }
        // Chain from main skull to right secondary
        for (let c = 0; c < chainLinks; c++) {
          const ct = c / (chainLinks - 1);
          const csp0 = skullPositions[0];
          const csp2 = skullPositions[2];
          const link = new THREE.Mesh(this._boxGeo, chainMat.clone());
          link.scale.set(s * 0.02, s * 0.012, s * 0.035);
          link.position.set(
            csp0.x + (csp2.x - csp0.x) * ct,
            csp0.y + (csp2.y - csp0.y) * ct - Math.sin(ct * Math.PI) * s * 0.18,
            csp0.z + (csp2.z - csp0.z) * ct,
          );
          link.rotation.y = ct * Math.PI * 1.5 - 0.5;
          group.add(link);
        }

        // --- Ghostly rib cages inside body segments ---
        const ribMat = new THREE.MeshPhongMaterial({
          color: 0x2a1a3a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.35,
        });
        for (let ri = 0; ri < segCount; ri++) {
          const tRib = ri / (segCount - 1);
          const ribSegScale = 1.0 - tRib * 0.35;
          const ribXOff = s * 1.2 - ri * s * 0.4;
          const ribYOff = Math.sin(ri * 0.7) * s * 0.12;
          for (let r = 0; r < 4; r++) {
            for (const zSide of [-1, 1]) {
              const rib = new THREE.Mesh(this._boxGeo, ribMat.clone());
              rib.scale.set(s * 0.008 * ribSegScale, s * 0.12 * ribSegScale, s * 0.06 * ribSegScale);
              rib.position.set(
                ribXOff + (r - 1.5) * s * 0.06 * ribSegScale,
                ribYOff - s * 0.02 * ribSegScale,
                zSide * s * 0.12 * ribSegScale,
              );
              rib.rotation.z = zSide * 0.6 + (r - 1.5) * 0.05;
              rib.rotation.x = zSide * 0.4;
              group.add(rib);
            }
          }
          const ribSpine = new THREE.Mesh(this._boxGeo, ribMat.clone());
          ribSpine.scale.set(s * 0.28 * ribSegScale, s * 0.01 * ribSegScale, s * 0.01 * ribSegScale);
          ribSpine.position.set(ribXOff, ribYOff + s * 0.12 * ribSegScale, 0);
          group.add(ribSpine);
        }

        // --- Dripping ectoplasm from skulls ---
        const ectoMat = new THREE.MeshPhongMaterial({
          color: 0x33ff66,
          emissive: 0x11cc33,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        for (let si3 = 0; si3 < skullPositions.length; si3++) {
          const sp3 = skullPositions[si3];
          const skullScale3 = si3 === 0 ? 1.0 : 0.7;
          for (let d = 0; d < 4; d++) {
            const drip = new THREE.Mesh(this._coneGeo, ectoMat.clone());
            drip.scale.set(s * 0.018 * skullScale3, s * (0.06 + Math.random() * 0.08) * skullScale3, s * 0.018 * skullScale3);
            drip.position.set(
              sp3.x + s * 0.1 * skullScale3 + (d - 1.5) * s * 0.04 * skullScale3,
              sp3.y - s * 0.18 * skullScale3 - Math.random() * s * 0.06,
              sp3.z + (Math.random() - 0.5) * s * 0.1 * skullScale3,
            );
            drip.rotation.z = Math.PI + (Math.random() - 0.5) * 0.3;
            group.add(drip);
          }
          const ectoPool = new THREE.Mesh(this._sphereGeo, ectoMat.clone());
          ectoPool.scale.set(s * 0.05 * skullScale3, s * 0.015 * skullScale3, s * 0.05 * skullScale3);
          ectoPool.position.set(
            sp3.x + s * 0.12 * skullScale3,
            sp3.y - s * 0.22 * skullScale3,
            sp3.z,
          );
          group.add(ectoPool);
        }

        // --- Extended tail tendrils with branching tips ---
        const tailTendrilMat = new THREE.MeshBasicMaterial({
          color: 0x0a0012,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });
        for (let tt = 0; tt < 6; tt++) {
          const mainTendril = new THREE.Mesh(this._coneGeo, tailTendrilMat.clone());
          const tendrilLen = s * (0.5 + Math.random() * 0.4);
          mainTendril.scale.set(s * 0.04, tendrilLen, s * 0.04);
          const ttBaseX = -s * 1.5 - tt * s * 0.15;
          const ttBaseY = (Math.random() - 0.5) * s * 0.2;
          const ttBaseZ = (Math.random() - 0.5) * s * 0.3;
          mainTendril.position.set(ttBaseX, ttBaseY - tendrilLen * 0.3, ttBaseZ);
          mainTendril.rotation.z = Math.PI * 0.7 + (Math.random() - 0.5) * 0.5;
          group.add(mainTendril);

          const branches = 2 + Math.floor(Math.random() * 2);
          for (let b = 0; b < branches; b++) {
            const branch = new THREE.Mesh(this._coneGeo, tailTendrilMat.clone());
            branch.scale.set(s * 0.02, s * (0.15 + Math.random() * 0.12), s * 0.02);
            branch.position.set(
              ttBaseX - s * 0.2 - b * s * 0.05,
              ttBaseY - tendrilLen * 0.5 - b * s * 0.06,
              ttBaseZ + (b - 1) * s * 0.1,
            );
            branch.rotation.z = Math.PI * 0.6 + (Math.random() - 0.5) * 0.8;
            group.add(branch);
          }
        }

        // --- Parasitic shadow mites clinging to body ---
        const miteMat = new THREE.MeshPhongMaterial({
          color: 0x050008,
          emissive: 0x110015,
          emissiveIntensity: 0.1,
          specular: 0x110022,
          shininess: 10,
        });
        for (let mi = 0; mi < segCount; mi++) {
          const miteXOff = s * 1.2 - mi * s * 0.4;
          const miteYOff = Math.sin(mi * 0.7) * s * 0.12;
          const miteCount = 3 + Math.floor(Math.random() * 3);
          for (let m = 0; m < miteCount; m++) {
            const mite = new THREE.Mesh(this._sphereGeo, miteMat.clone());
            mite.scale.set(s * 0.025, s * 0.02, s * 0.025);
            mite.position.set(
              miteXOff + (Math.random() - 0.5) * s * 0.2,
              miteYOff + (Math.random() - 0.3) * s * 0.15,
              (Math.random() - 0.5) * s * 0.25,
            );
            group.add(mite);
          }
        }

        // --- Shadow aura layers around body ---
        const auraMat = new THREE.MeshBasicMaterial({
          color: 0x08000e,
          transparent: true,
          opacity: 0.12,
          depthWrite: false,
        });
        for (let ai = 0; ai < 8; ai++) {
          const aura = new THREE.Mesh(this._sphereGeo, auraMat.clone());
          const auraSize = s * (0.2 + Math.random() * 0.25);
          aura.scale.set(auraSize * 1.5, auraSize * 0.6, auraSize);
          aura.position.set(
            s * 1.2 - ai * s * 0.35 + (Math.random() - 0.5) * s * 0.15,
            (Math.random() - 0.5) * s * 0.3,
            (Math.random() - 0.5) * s * 0.4,
          );
          group.add(aura);
        }

        // --- Ghostly eye trails from skull sockets ---
        const eyeTrailMat = new THREE.MeshBasicMaterial({
          color: 0xbb44ff,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        for (let si4 = 0; si4 < skullPositions.length; si4++) {
          const sp4 = skullPositions[si4];
          const skullScale4 = si4 === 0 ? 1.0 : 0.7;
          for (const zSide of [-1, 1]) {
            for (let tr = 0; tr < 4; tr++) {
              const trail = new THREE.Mesh(this._boxGeo, eyeTrailMat.clone());
              trail.scale.set(s * 0.06 * skullScale4, s * 0.01, s * 0.01);
              trail.position.set(
                sp4.x + s * 0.14 * skullScale4 - tr * s * 0.08,
                sp4.y + s * 0.04 * skullScale4 + (Math.random() - 0.5) * s * 0.03,
                sp4.z + zSide * (s * 0.1 * skullScale4 + tr * s * 0.02),
              );
              trail.rotation.y = zSide * 0.2;
              group.add(trail);
            }
          }
        }

        // --- Shadow spines protruding from dorsal ridge ---
        const dorsalSpineMat = new THREE.MeshPhongMaterial({
          color: 0x150020,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.08,
        });
        for (let dsi = 0; dsi < segCount; dsi++) {
          const dsT = dsi / (segCount - 1);
          const dsScale = 1.0 - dsT * 0.35;
          const dsXOff = s * 1.2 - dsi * s * 0.4;
          const dsYOff = Math.sin(dsi * 0.7) * s * 0.12;
          for (let dsp = 0; dsp < 2; dsp++) {
            const dorsalSpine = new THREE.Mesh(this._coneGeo, dorsalSpineMat.clone());
            dorsalSpine.scale.set(s * 0.02 * dsScale, s * 0.12 * dsScale, s * 0.02 * dsScale);
            dorsalSpine.position.set(
              dsXOff + (dsp - 0.5) * s * 0.1 * dsScale,
              dsYOff + s * 0.28 * dsScale,
              0,
            );
            dorsalSpine.rotation.z = (dsp - 0.5) * 0.3;
            group.add(dorsalSpine);
          }
        }

        break;
      }

      case TDEnemyType.STORM_HARPY: {
        // ── Tempest Mantis ──
        // An insectoid storm creature: segmented thorax crackling with
        // electricity, jagged crystalline mantis arms, translucent dragonfly
        // wings, compound eyes, lightning arcs between limbs.

        const chitinMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          specular: 0x66aaff,
          shininess: 70,
        });

        // --- Segmented thorax (3 segments, insect-like) ---
        const thoraxSegments = [
          { x: 0, y: 0, sx: 0.5, sy: 0.4, sz: 0.45 },          // abdomen
          { x: s * 0.55, y: s * 0.08, sx: 0.45, sy: 0.35, sz: 0.4 },  // mid
          { x: s * 1.0, y: s * 0.18, sx: 0.35, sy: 0.3, sz: 0.35 },   // head-thorax
        ];
        for (const seg of thoraxSegments) {
          const part = new THREE.Mesh(this._sphereGeo, chitinMat.clone());
          part.scale.set(s * seg.sx, s * seg.sy, s * seg.sz);
          part.position.set(seg.x, seg.y, 0);
          group.add(part);
        }

        // Segment connectors (narrow waist joints)
        const jointMat = new THREE.MeshPhongMaterial({
          color: 0x223344,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
        });
        for (let i = 0; i < 2; i++) {
          const joint = new THREE.Mesh(this._boxGeo, jointMat);
          joint.scale.set(s * 0.08, s * 0.12, s * 0.15);
          joint.position.set(s * 0.28 + i * s * 0.45, s * 0.04 + i * s * 0.05, 0);
          group.add(joint);
        }

        // --- Mantis head with compound eyes ---
        const headMat = new THREE.MeshPhongMaterial({
          color: 0x1a2a3a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          specular: 0x4488cc,
          shininess: 60,
        });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.28, s * 0.22, s * 0.3);
        head.position.set(s * 1.3, s * 0.28, 0);
        group.add(head);

        // Compound eyes (clusters of small glowing spheres)
        const compoundEyeMat = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        for (const zSide of [-1, 1]) {
          // Each compound eye = 4 small facets
          for (let f = 0; f < 4; f++) {
            const facet = new THREE.Mesh(
              new THREE.SphereGeometry(s * 0.04, 5, 4),
              compoundEyeMat,
            );
            const angle = (f / 4) * Math.PI * 0.6 - 0.3;
            facet.position.set(
              s * 1.38 + Math.cos(angle) * s * 0.06,
              s * 0.32 + Math.sin(angle) * s * 0.06,
              zSide * (s * 0.14 + Math.abs(Math.sin(angle)) * s * 0.03),
            );
            group.add(facet);
          }
        }

        // Mandibles
        const mandibleMat = new THREE.MeshPhongMaterial({
          color: 0x88ccee,
          specular: 0xffffff,
          shininess: 90,
        });
        for (const zSide of [-1, 1]) {
          const mandible = new THREE.Mesh(this._coneGeo, mandibleMat);
          mandible.scale.set(s * 0.03, s * 0.15, s * 0.03);
          mandible.position.set(s * 1.5, s * 0.18, zSide * s * 0.08);
          mandible.rotation.z = -Math.PI / 3;
          mandible.rotation.y = zSide * 0.3;
          group.add(mandible);
        }

        // --- Jagged crystalline mantis raptorial arms ---
        const crystalArmMat = new THREE.MeshPhongMaterial({
          color: 0x66ddff,
          emissive: 0x2288cc,
          emissiveIntensity: 0.4,
          specular: 0xffffff,
          shininess: 100,
          transparent: true,
          opacity: 0.8,
        });
        for (const zSide of [-1, 1]) {
          // Upper arm (femur)
          const upperArm = new THREE.Mesh(this._boxGeo, crystalArmMat.clone());
          upperArm.scale.set(s * 0.35, s * 0.06, s * 0.06);
          upperArm.position.set(s * 0.9, s * -0.05, zSide * s * 0.35);
          upperArm.rotation.z = -0.5 * zSide * 0.3 - 0.3;
          group.add(upperArm);

          // Forearm (tibia) — angled down like a mantis strike pose
          const forearm = new THREE.Mesh(this._boxGeo, crystalArmMat.clone());
          forearm.scale.set(s * 0.28, s * 0.05, s * 0.05);
          forearm.position.set(s * 1.15, s * -0.22, zSide * s * 0.35);
          forearm.rotation.z = -1.0;
          group.add(forearm);

          // Jagged crystal spikes on forearm (serrated edge)
          for (let sp = 0; sp < 3; sp++) {
            const spike = new THREE.Mesh(this._coneGeo, crystalArmMat.clone());
            spike.scale.set(s * 0.025, s * 0.1, s * 0.025);
            spike.position.set(
              s * 1.05 + sp * s * 0.07,
              s * -0.15 - sp * s * 0.06,
              zSide * s * 0.35,
            );
            spike.rotation.z = -0.5 + sp * 0.15;
            group.add(spike);
          }

          // Claw tip
          const clawTip = new THREE.Mesh(this._coneGeo, crystalArmMat.clone());
          clawTip.scale.set(s * 0.04, s * 0.14, s * 0.04);
          clawTip.position.set(s * 1.25, s * -0.38, zSide * s * 0.35);
          clawTip.rotation.z = -Math.PI / 2.5;
          group.add(clawTip);
        }

        // --- Translucent dragonfly-style storm wings ---
        const stormWingMat = new THREE.MeshPhongMaterial({
          color: 0x88ccff,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.35,
          specular: 0xffffff,
          shininess: 100,
          depthWrite: false,
        });
        // Primary wings (large)
        const wL = new THREE.Mesh(this._createWingGeometry(), stormWingMat);
        wL.scale.set(s * 0.9, s * 0.15, s * 1.2);
        wL.position.set(s * 0.3, s * 0.3, -s * 0.4);
        wL.name = "wingL";
        group.add(wL);
        const wR = new THREE.Mesh(this._createWingGeometry(), stormWingMat.clone());
        wR.scale.set(s * 0.9, s * 0.15, -s * 1.2);
        wR.position.set(s * 0.3, s * 0.3, s * 0.4);
        wR.name = "wingR";
        group.add(wR);
        // Secondary hindwings (smaller, offset back)
        const hindWingMat = stormWingMat.clone();
        hindWingMat.opacity = 0.25;
        const hwL = new THREE.Mesh(this._createWingGeometry(), hindWingMat);
        hwL.scale.set(s * 0.6, s * 0.1, s * 0.9);
        hwL.position.set(-s * 0.1, s * 0.25, -s * 0.35);
        group.add(hwL);
        const hwR = new THREE.Mesh(this._createWingGeometry(), hindWingMat.clone());
        hwR.scale.set(s * 0.6, s * 0.1, -s * 0.9);
        hwR.position.set(-s * 0.1, s * 0.25, s * 0.35);
        group.add(hwR);

        // Wing vein lines (thin boxes along wings)
        const veinMat = new THREE.MeshBasicMaterial({
          color: 0x44aaff,
          transparent: true,
          opacity: 0.5,
        });
        for (const zSide of [-1, 1]) {
          for (let v = 0; v < 3; v++) {
            const vein = new THREE.Mesh(this._boxGeo, veinMat);
            vein.scale.set(s * (0.5 - v * 0.1), s * 0.008, s * 0.008);
            vein.position.set(
              s * 0.3 - v * s * 0.05,
              s * 0.3,
              zSide * (s * 0.5 + v * s * 0.2),
            );
            vein.rotation.y = zSide * (0.3 + v * 0.15);
            group.add(vein);
          }
        }

        // --- Insect legs (3 pairs, spindly) ---
        const legMat = new THREE.MeshPhongMaterial({
          color: 0x334455,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          specular: 0x4488cc,
          shininess: 50,
        });
        for (let i = 0; i < 3; i++) {
          for (const zSide of [-1, 1]) {
            // Upper leg
            const upperLeg = new THREE.Mesh(this._boxGeo, legMat);
            upperLeg.scale.set(s * 0.04, s * 0.2, s * 0.04);
            const lx = s * 0.6 - i * s * 0.3;
            upperLeg.position.set(lx, -s * 0.3, zSide * s * 0.25);
            upperLeg.rotation.z = zSide * 0.3;
            group.add(upperLeg);
            // Lower leg
            const lowerLeg = new THREE.Mesh(this._boxGeo, legMat.clone());
            lowerLeg.scale.set(s * 0.03, s * 0.15, s * 0.03);
            lowerLeg.position.set(lx + zSide * s * 0.05, -s * 0.48, zSide * s * 0.28);
            group.add(lowerLeg);
          }
        }

        // --- Lightning arcs between limbs (glowing rods) ---
        const arcMat = new THREE.MeshBasicMaterial({
          color: 0x44eeff,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });
        const arcPositions = [
          // arc from left arm tip to right arm tip
          { from: { x: s * 1.25, y: -s * 0.38, z: -s * 0.35 }, to: { x: s * 1.25, y: -s * 0.38, z: s * 0.35 } },
          // arc from abdomen to left wing
          { from: { x: 0, y: 0, z: -s * 0.3 }, to: { x: s * 0.3, y: s * 0.3, z: -s * 0.7 } },
          // arc from abdomen to right wing
          { from: { x: 0, y: 0, z: s * 0.3 }, to: { x: s * 0.3, y: s * 0.3, z: s * 0.7 } },
          // arc from head down to foreleg
          { from: { x: s * 1.3, y: s * 0.2, z: 0 }, to: { x: s * 0.6, y: -s * 0.3, z: -s * 0.25 } },
        ];
        for (const arc of arcPositions) {
          const dx = arc.to.x - arc.from.x;
          const dy = arc.to.y - arc.from.y;
          const dz = arc.to.z - arc.from.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          const bolt = new THREE.Mesh(this._boxGeo, arcMat.clone());
          bolt.scale.set(len, s * 0.015, s * 0.015);
          bolt.position.set(
            (arc.from.x + arc.to.x) / 2,
            (arc.from.y + arc.to.y) / 2,
            (arc.from.z + arc.to.z) / 2,
          );
          bolt.lookAt(arc.to.x, arc.to.y, arc.to.z);
          group.add(bolt);
        }

        // --- Crackling electricity sparks around body ---
        const sparkMat = new THREE.MeshBasicMaterial({
          color: 0x00eeff,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        for (let i = 0; i < 6; i++) {
          const spark = new THREE.Mesh(
            new THREE.SphereGeometry(s * 0.04, 4, 3),
            sparkMat,
          );
          spark.position.set(
            (Math.random() - 0.3) * s * 1.8,
            (Math.random() - 0.5) * s * 0.6,
            (Math.random() - 0.5) * s * 0.9,
          );
          group.add(spark);
        }

        // --- Abdomen stinger / tail spike ---
        const stingerMat = new THREE.MeshPhongMaterial({
          color: 0x88ddff,
          emissive: 0x2266aa,
          emissiveIntensity: 0.3,
          specular: 0xffffff,
          shininess: 90,
        });
        const stinger = new THREE.Mesh(this._coneGeo, stingerMat);
        stinger.scale.set(s * 0.06, s * 0.3, s * 0.06);
        stinger.position.set(-s * 0.5, -s * 0.05, 0);
        stinger.rotation.z = Math.PI / 2;
        group.add(stinger);

        // --- Additional wing veining (cross-veins and longitudinal veins) ---
        const crossVeinMat = new THREE.MeshBasicMaterial({
          color: 0x44aaff,
          transparent: true,
          opacity: 0.45,
        });
        for (const zSide of [-1, 1]) {
          // Longitudinal veins radiating from wing root
          for (let lv = 0; lv < 5; lv++) {
            const longVein = new THREE.Mesh(this._boxGeo, crossVeinMat.clone());
            longVein.scale.set(s * (0.6 - lv * 0.08), s * 0.006, s * 0.006);
            longVein.position.set(
              s * 0.3 - lv * s * 0.03,
              s * 0.3 + lv * s * 0.01,
              zSide * (s * 0.35 + lv * s * 0.18),
            );
            longVein.rotation.y = zSide * (0.2 + lv * 0.12);
            longVein.rotation.z = lv * 0.05;
            group.add(longVein);
          }
          // Cross-veins connecting the longitudinal veins
          for (let cv = 0; cv < 7; cv++) {
            const crossVein = new THREE.Mesh(this._boxGeo, crossVeinMat.clone());
            crossVein.scale.set(s * 0.006, s * 0.006, s * 0.15);
            crossVein.position.set(
              s * 0.5 - cv * s * 0.08,
              s * 0.3,
              zSide * (s * 0.5 + cv * s * 0.04),
            );
            crossVein.rotation.y = zSide * (0.1 + cv * 0.03);
            group.add(crossVein);
          }
          // Hindwing veins
          for (let hv = 0; hv < 3; hv++) {
            const hindVein = new THREE.Mesh(this._boxGeo, crossVeinMat.clone());
            hindVein.scale.set(s * (0.4 - hv * 0.08), s * 0.005, s * 0.005);
            hindVein.position.set(
              -s * 0.1 - hv * s * 0.02,
              s * 0.25,
              zSide * (s * 0.3 + hv * s * 0.15),
            );
            hindVein.rotation.y = zSide * (0.25 + hv * 0.15);
            group.add(hindVein);
          }
        }

        // --- Antenna stalks with crackling tips ---
        const antennaMat = new THREE.MeshPhongMaterial({
          color: 0x334455,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          specular: 0x4488cc,
          shininess: 50,
        });
        const antennaTipMat = new THREE.MeshBasicMaterial({
          color: 0x00ffee,
          transparent: true,
          opacity: 0.7,
          depthWrite: false,
        });
        for (const zSide of [-1, 1]) {
          // Antenna stalk — 3 segments
          for (let aseg = 0; aseg < 3; aseg++) {
            const antSeg = new THREE.Mesh(this._boxGeo, antennaMat.clone());
            antSeg.scale.set(s * 0.015, s * 0.12, s * 0.015);
            antSeg.position.set(
              s * 1.35 + aseg * s * 0.06,
              s * 0.4 + aseg * s * 0.12,
              zSide * (s * 0.08 + aseg * s * 0.04),
            );
            antSeg.rotation.z = -0.3 + aseg * 0.15;
            antSeg.rotation.x = zSide * 0.2;
            group.add(antSeg);
          }
          // Crackling tip orb
          const antTip = new THREE.Mesh(this._sphereGeo, antennaTipMat.clone());
          antTip.scale.set(s * 0.035, s * 0.035, s * 0.035);
          antTip.position.set(s * 1.53, s * 0.76, zSide * s * 0.2);
          group.add(antTip);
          // Small sparks around tip
          for (let atsp = 0; atsp < 3; atsp++) {
            const antSpark = new THREE.Mesh(this._boxGeo, antennaTipMat.clone());
            antSpark.scale.set(s * 0.04, s * 0.005, s * 0.005);
            antSpark.position.set(
              s * 1.53 + (Math.random() - 0.5) * s * 0.06,
              s * 0.76 + (Math.random() - 0.5) * s * 0.06,
              zSide * s * 0.2 + (Math.random() - 0.5) * s * 0.06,
            );
            antSpark.rotation.z = Math.random() * Math.PI;
            antSpark.rotation.y = Math.random() * Math.PI;
            group.add(antSpark);
          }
        }

        // --- Additional compound eye facets (expand from 8 to 20+) ---
        const facetMat2 = new THREE.MeshBasicMaterial({ color: 0x00ffcc });
        for (const zSide of [-1, 1]) {
          // Additional 12 facets per eye in a honeycomb-like arrangement
          for (let f2 = 0; f2 < 12; f2++) {
            const facet2 = new THREE.Mesh(this._sphereGeo, facetMat2.clone());
            facet2.scale.set(s * 0.025, s * 0.025, s * 0.025);
            const ring = Math.floor(f2 / 6);
            const angleIdx = f2 % 6;
            const fAngle = (angleIdx / 6) * Math.PI * 2 + ring * 0.5;
            const fRadius = s * (0.09 + ring * 0.04);
            facet2.position.set(
              s * 1.38 + Math.cos(fAngle) * fRadius * 0.5,
              s * 0.32 + Math.sin(fAngle) * fRadius * 0.5,
              zSide * (s * 0.15 + Math.abs(Math.cos(fAngle)) * s * 0.02),
            );
            group.add(facet2);
          }
        }

        // --- Thorax spiracle breathing holes ---
        const spiracleMat = new THREE.MeshPhongMaterial({
          color: 0x0a1520,
          emissive: 0x112233,
          emissiveIntensity: 0.2,
        });
        for (const seg of thoraxSegments) {
          for (const zSide of [-1, 1]) {
            // 2 spiracles per side per segment
            for (let sp = 0; sp < 2; sp++) {
              const spiracle = new THREE.Mesh(this._sphereGeo, spiracleMat.clone());
              spiracle.scale.set(s * 0.02, s * 0.015, s * 0.02);
              spiracle.position.set(
                seg.x + (sp - 0.5) * s * 0.12,
                seg.y - s * 0.05,
                zSide * s * seg.sz * 0.85,
              );
              group.add(spiracle);
            }
          }
        }

        // --- Chitinous ridges on thorax ---
        const chitinRidgeMat = new THREE.MeshPhongMaterial({
          color: 0x1a2a3a,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.08,
          specular: 0x4488cc,
          shininess: 60,
        });
        for (const seg of thoraxSegments) {
          // 3 dorsal ridges per segment
          for (let cr = 0; cr < 3; cr++) {
            const ridge = new THREE.Mesh(this._boxGeo, chitinRidgeMat.clone());
            ridge.scale.set(s * seg.sx * 0.6, s * 0.012, s * seg.sz * 0.9);
            ridge.position.set(
              seg.x + (cr - 1) * s * 0.06,
              seg.y + s * seg.sy * 0.9,
              0,
            );
            ridge.rotation.z = (cr - 1) * 0.08;
            group.add(ridge);
          }
          // Lateral ridges
          for (const zSide of [-1, 1]) {
            const latRidge = new THREE.Mesh(this._boxGeo, chitinRidgeMat.clone());
            latRidge.scale.set(s * seg.sx * 0.7, s * 0.01, s * 0.015);
            latRidge.position.set(
              seg.x,
              seg.y + s * 0.02,
              zSide * s * seg.sz * 0.7,
            );
            group.add(latRidge);
          }
        }

        // --- Ovipositor/tail detail with segments ---
        const oviMat = new THREE.MeshPhongMaterial({
          color: 0x556677,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.12,
          specular: 0x4488cc,
          shininess: 50,
        });
        for (let ovi = 0; ovi < 5; ovi++) {
          const oviSeg = new THREE.Mesh(this._sphereGeo, oviMat.clone());
          const oviScale = 1.0 - ovi * 0.15;
          oviSeg.scale.set(s * 0.06 * oviScale, s * 0.05 * oviScale, s * 0.06 * oviScale);
          oviSeg.position.set(
            -s * 0.55 - ovi * s * 0.1,
            -s * 0.05 - ovi * s * 0.03,
            0,
          );
          group.add(oviSeg);
        }
        // Ovipositor tip prongs
        for (const zSide of [-1, 0, 1]) {
          const prong = new THREE.Mesh(this._coneGeo, oviMat.clone());
          prong.scale.set(s * 0.015, s * 0.08, s * 0.015);
          prong.position.set(-s * 1.05, -s * 0.2, zSide * s * 0.03);
          prong.rotation.z = Math.PI * 0.6;
          group.add(prong);
        }

        // --- Electricity buildup orbs at each claw tip ---
        const elecOrbMat = new THREE.MeshBasicMaterial({
          color: 0x44eeff,
          transparent: true,
          opacity: 0.65,
          depthWrite: false,
        });
        for (const zSide of [-1, 1]) {
          // Orb at mantis arm claw tip
          const clawOrb = new THREE.Mesh(this._sphereGeo, elecOrbMat.clone());
          clawOrb.scale.set(s * 0.05, s * 0.05, s * 0.05);
          clawOrb.position.set(s * 1.25, -s * 0.38, zSide * s * 0.35);
          group.add(clawOrb);
          // Small crackling rays from the orb
          for (let er = 0; er < 4; er++) {
            const ray = new THREE.Mesh(this._boxGeo, elecOrbMat.clone());
            ray.scale.set(s * 0.06, s * 0.005, s * 0.005);
            ray.position.set(
              s * 1.25 + (Math.random() - 0.5) * s * 0.06,
              -s * 0.38 + (Math.random() - 0.5) * s * 0.06,
              zSide * s * 0.35 + (Math.random() - 0.5) * s * 0.06,
            );
            ray.rotation.z = Math.random() * Math.PI;
            ray.rotation.y = Math.random() * Math.PI;
            group.add(ray);
          }
        }

        // --- Static discharge tendrils between the legs ---
        const staticMat = new THREE.MeshBasicMaterial({
          color: 0x33ddff,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        for (let li = 0; li < 2; li++) {
          // Tendril between adjacent leg pairs (same side)
          for (const zSide of [-1, 1]) {
            const lx1 = s * 0.6 - li * s * 0.3;
            const lx2 = s * 0.6 - (li + 1) * s * 0.3;
            const staticTendril = new THREE.Mesh(this._boxGeo, staticMat.clone());
            const stLen = Math.abs(lx2 - lx1);
            staticTendril.scale.set(stLen, s * 0.008, s * 0.008);
            staticTendril.position.set(
              (lx1 + lx2) / 2,
              -s * 0.48,
              zSide * s * 0.28,
            );
            staticTendril.rotation.z = (Math.random() - 0.5) * 0.3;
            group.add(staticTendril);
          }
          // Cross-body discharge between opposite legs
          const crossDischarge = new THREE.Mesh(this._boxGeo, staticMat.clone());
          const crossLx = s * 0.6 - li * s * 0.3;
          crossDischarge.scale.set(s * 0.01, s * 0.01, s * 0.56);
          crossDischarge.position.set(crossLx, -s * 0.48, 0);
          group.add(crossDischarge);
        }

        // --- Iridescent patches on the thorax ---
        const iridescentMat = new THREE.MeshPhongMaterial({
          color: 0x88aaff,
          emissive: 0x4466cc,
          emissiveIntensity: 0.35,
          specular: 0xffffff,
          shininess: 120,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
        });
        for (const seg of thoraxSegments) {
          // 2 iridescent patches per segment (left and right dorsal)
          for (const zSide of [-1, 1]) {
            const patch = new THREE.Mesh(this._boxGeo, iridescentMat.clone());
            patch.scale.set(s * seg.sx * 0.35, s * 0.005, s * seg.sz * 0.3);
            patch.position.set(
              seg.x + s * 0.02,
              seg.y + s * seg.sy * 0.85,
              zSide * s * seg.sz * 0.3,
            );
            patch.rotation.x = zSide * 0.3;
            group.add(patch);
          }
          // Ventral iridescent stripe
          const ventralPatch = new THREE.Mesh(this._boxGeo, iridescentMat.clone());
          ventralPatch.scale.set(s * seg.sx * 0.5, s * 0.005, s * seg.sz * 0.25);
          ventralPatch.position.set(
            seg.x,
            seg.y - s * seg.sy * 0.8,
            0,
          );
          group.add(ventralPatch);
        }

        // --- Venomous barb at each leg tip ---
        const barbMat = new THREE.MeshPhongMaterial({
          color: 0x44ff88,
          emissive: 0x22cc44,
          emissiveIntensity: 0.3,
          specular: 0xffffff,
          shininess: 80,
        });
        for (let li2 = 0; li2 < 3; li2++) {
          for (const zSide of [-1, 1]) {
            const barb = new THREE.Mesh(this._coneGeo, barbMat.clone());
            barb.scale.set(s * 0.015, s * 0.06, s * 0.015);
            const lx = s * 0.6 - li2 * s * 0.3;
            barb.position.set(
              lx + zSide * s * 0.05,
              -s * 0.58,
              zSide * s * 0.28,
            );
            barb.rotation.z = Math.PI;
            group.add(barb);
            // Venom drip below barb
            const venomDrip = new THREE.Mesh(this._sphereGeo, barbMat.clone());
            venomDrip.scale.set(s * 0.01, s * 0.015, s * 0.01);
            venomDrip.position.set(
              lx + zSide * s * 0.05,
              -s * 0.63,
              zSide * s * 0.28,
            );
            (venomDrip.material as THREE.MeshPhongMaterial).transparent = true;
            (venomDrip.material as THREE.MeshPhongMaterial).opacity = 0.5;
            group.add(venomDrip);
          }
        }

        // --- Thorax surface texture bumps ---
        const bumpMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.08,
          specular: 0x4488cc,
          shininess: 40,
        });
        for (const seg of thoraxSegments) {
          for (let tb = 0; tb < 8; tb++) {
            const bump = new THREE.Mesh(this._sphereGeo, bumpMat.clone());
            bump.scale.set(s * 0.02, s * 0.015, s * 0.02);
            const bAngle = (tb / 8) * Math.PI * 2;
            bump.position.set(
              seg.x + Math.cos(bAngle) * s * seg.sx * 0.4,
              seg.y + Math.sin(bAngle) * s * seg.sy * 0.4,
              Math.sin(bAngle + Math.PI / 4) * s * seg.sz * 0.35,
            );
            group.add(bump);
          }
        }

        // --- Storm energy halo around head ---
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0x44ccff,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
        });
        for (let hi = 0; hi < 8; hi++) {
          const haloSeg = new THREE.Mesh(this._boxGeo, haloMat.clone());
          const hAngle = (hi / 8) * Math.PI * 2;
          haloSeg.scale.set(s * 0.08, s * 0.006, s * 0.006);
          haloSeg.position.set(
            s * 1.3 + Math.cos(hAngle) * s * 0.2,
            s * 0.28 + Math.sin(hAngle) * s * 0.2,
            Math.sin(hAngle) * s * 0.15,
          );
          haloSeg.rotation.z = hAngle;
          group.add(haloSeg);
        }

        break;
      }


      case TDEnemyType.CRYSTAL_WYVERN: {
        // Prismatic Leviathan — massive translucent crystalline serpent
        const octGeo = new THREE.OctahedronGeometry(1, 0);

        // --- Serpentine body: 7 interlocking crystal segments ---
        const segmentMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0xffffff,
          shininess: 140,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.72,
          flatShading: true,
        });
        const innerGlowMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.35,
        });
        const connectorMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.8,
        });
        const segCount = 7;
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const xPos = s * 1.8 - i * s * 0.6;
          const yPos = Math.sin(t * Math.PI * 0.7) * s * 0.15;
          // Segments taper toward tail
          const segScale = 0.38 - t * 0.12;
          const seg = new THREE.Mesh(octGeo, segmentMat.clone());
          seg.scale.set(s * segScale * 1.3, s * segScale, s * segScale * 1.1);
          seg.position.set(xPos, yPos, 0);
          seg.rotation.set(0, 0, t * 0.3);
          group.add(seg);
          // Inner energy core visible through translucent shell
          const core = new THREE.Mesh(this._sphereGeo, innerGlowMat.clone());
          core.scale.set(s * segScale * 0.5, s * segScale * 0.4, s * segScale * 0.45);
          core.position.set(xPos, yPos, 0);
          group.add(core);
          // Glowing energy connectors between segments
          if (i < segCount - 1) {
            const cx = xPos - s * 0.3;
            const cy = yPos + Math.sin((t + 0.07) * Math.PI * 0.7) * s * 0.02;
            const conn = new THREE.Mesh(this._sphereGeo, connectorMat.clone());
            conn.scale.set(s * 0.12, s * 0.08, s * 0.08);
            conn.position.set(cx, cy, 0);
            group.add(conn);
          }
        }

        // --- Fearsome crystalline head ---
        const headMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0xffffff,
          shininess: 160,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          flatShading: true,
          transparent: true,
          opacity: 0.8,
        });
        // Angular skull
        const skull = new THREE.Mesh(octGeo, headMat);
        skull.scale.set(s * 0.55, s * 0.35, s * 0.4);
        skull.position.set(s * 2.4, s * 0.25, 0);
        skull.rotation.z = 0.15;
        group.add(skull);
        // Snout — elongated crystal wedge
        const snout = new THREE.Mesh(octGeo, headMat.clone());
        snout.scale.set(s * 0.4, s * 0.18, s * 0.22);
        snout.position.set(s * 2.9, s * 0.15, 0);
        snout.rotation.z = 0.1;
        group.add(snout);
        // Wide jaw with crystal fangs
        const jawMat = headMat.clone();
        jawMat.emissiveIntensity = 0.2;
        const jaw = new THREE.Mesh(octGeo, jawMat);
        jaw.scale.set(s * 0.35, s * 0.12, s * 0.3);
        jaw.position.set(s * 2.7, s * 0.02, 0);
        group.add(jaw);
        // Crystal teeth/fangs along jaw
        const fangMat = new THREE.MeshPhongMaterial({
          color: 0xccefff,
          specular: 0xffffff,
          shininess: 200,
          emissive: 0x66bbdd,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.85,
        });
        for (let fi = 0; fi < 5; fi++) {
          const fangX = s * 2.55 + fi * s * 0.12;
          for (const fz of [-1, 1]) {
            const fang = new THREE.Mesh(this._coneGeo, fangMat.clone());
            const fangSize = 0.04 + (fi < 2 ? 0.03 : 0);
            fang.scale.set(s * 0.025, s * fangSize, s * 0.025);
            fang.position.set(fangX, s * -0.05, fz * s * (0.1 + fi * 0.02));
            fang.rotation.z = 0.2;
            group.add(fang);
          }
        }
        // Crown of crystal horns fanning outward
        const hornMat = new THREE.MeshPhongMaterial({
          color: 0xaaddff,
          specular: 0xffffff,
          shininess: 180,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.8,
          flatShading: true,
        });
        const hornAngles = [-0.7, -0.35, 0, 0.35, 0.7];
        const hornLengths = [0.35, 0.5, 0.6, 0.5, 0.35];
        for (let hi = 0; hi < hornAngles.length; hi++) {
          const horn = new THREE.Mesh(octGeo, hornMat.clone());
          const hl = hornLengths[hi];
          horn.scale.set(s * 0.05, s * hl, s * 0.05);
          horn.position.set(
            s * 2.3 - Math.abs(hornAngles[hi]) * s * 0.1,
            s * 0.45 + hl * s * 0.3,
            Math.sin(hornAngles[hi]) * s * 0.4
          );
          horn.rotation.set(hornAngles[hi] * 0.5, 0, -0.3 + hornAngles[hi] * 0.2);
          group.add(horn);
          // Small crystal tip on each horn
          const tip = new THREE.Mesh(octGeo, fangMat.clone());
          tip.scale.set(s * 0.03, s * 0.08, s * 0.03);
          tip.position.set(
            horn.position.x - s * 0.03,
            horn.position.y + s * hl * 0.35,
            horn.position.z + Math.sin(hornAngles[hi]) * s * 0.05
          );
          group.add(tip);
        }
        // Prismatic eyes
        const eyeOuterMat = new THREE.MeshPhongMaterial({
          color: 0xffffff,
          specular: 0xffffff,
          shininess: 200,
          emissive: 0x88ffff,
          emissiveIntensity: 0.6,
          transparent: true,
          opacity: 0.9,
        });
        const eyeInnerMat = new THREE.MeshBasicMaterial({
          color: 0xeeffff,
        });
        for (const ez of [-1, 1]) {
          const eyeOuter = new THREE.Mesh(this._sphereGeo, eyeOuterMat.clone());
          eyeOuter.scale.set(s * 0.1, s * 0.08, s * 0.08);
          eyeOuter.position.set(s * 2.65, s * 0.32, ez * s * 0.2);
          group.add(eyeOuter);
          const eyeInner = new THREE.Mesh(octGeo, eyeInnerMat.clone());
          eyeInner.scale.set(s * 0.04, s * 0.04, s * 0.04);
          eyeInner.position.set(s * 2.7, s * 0.32, ez * s * 0.2);
          group.add(eyeInner);
        }

        // --- Crystal lattice wings ---
        const wingBeamMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0xffffff,
          shininess: 160,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          flatShading: true,
          transparent: true,
          opacity: 0.85,
        });
        const wingMembraneMat = new THREE.MeshPhongMaterial({
          color: 0x99ccee,
          specular: 0xffffff,
          shininess: 120,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
        });
        for (const wSide of [-1, 1]) {
          const wingGroup = new THREE.Group();
          wingGroup.name = wSide === -1 ? "wingL" : "wingR";
          wingGroup.position.set(s * 0.8, s * 0.2, wSide * s * 0.3);
          // Main wing spar
          const spar = new THREE.Mesh(this._boxGeo, wingBeamMat.clone());
          spar.scale.set(s * 0.6, s * 0.04, s * 0.04);
          spar.position.set(s * 0.1, s * 0.15, wSide * s * 0.5);
          spar.rotation.set(0, 0, wSide === -1 ? 0.4 : -0.4);
          wingGroup.add(spar);
          // Secondary spar
          const spar2 = new THREE.Mesh(this._boxGeo, wingBeamMat.clone());
          spar2.scale.set(s * 0.5, s * 0.03, s * 0.03);
          spar2.position.set(s * -0.1, s * 0.05, wSide * s * 0.6);
          spar2.rotation.set(0, 0, wSide === -1 ? 0.2 : -0.2);
          wingGroup.add(spar2);
          // Cross-beams forming lattice
          for (let ci = 0; ci < 4; ci++) {
            const cross = new THREE.Mesh(this._boxGeo, wingBeamMat.clone());
            cross.scale.set(s * 0.025, s * 0.025, s * (0.15 + ci * 0.08));
            cross.position.set(
              s * -0.15 + ci * s * 0.18,
              s * 0.05 + ci * s * 0.04,
              wSide * s * (0.5 + ci * 0.03)
            );
            wingGroup.add(cross);
          }
          // Crystal nodes at lattice intersections
          for (let ni = 0; ni < 5; ni++) {
            const node = new THREE.Mesh(octGeo, wingBeamMat.clone());
            node.scale.set(s * 0.04, s * 0.04, s * 0.04);
            node.position.set(
              s * -0.15 + ni * s * 0.15,
              s * 0.08 + ni * s * 0.03,
              wSide * s * (0.45 + ni * 0.05)
            );
            wingGroup.add(node);
          }
          // Translucent prismatic membrane panels
          for (let mi = 0; mi < 3; mi++) {
            const membrane = new THREE.Mesh(this._boxGeo, wingMembraneMat.clone());
            membrane.scale.set(s * 0.2, s * 0.005, s * (0.2 + mi * 0.06));
            membrane.position.set(
              s * -0.05 + mi * s * 0.18,
              s * 0.07 + mi * s * 0.03,
              wSide * s * (0.5 + mi * 0.04)
            );
            membrane.rotation.set(0, 0, wSide === -1 ? 0.25 : -0.25);
            wingGroup.add(membrane);
          }
          // Outer wing tip crystal
          const wingTip = new THREE.Mesh(octGeo, fangMat.clone());
          wingTip.scale.set(s * 0.06, s * 0.12, s * 0.06);
          wingTip.position.set(s * 0.4, s * 0.22, wSide * s * 0.75);
          wingGroup.add(wingTip);
          group.add(wingGroup);
        }

        // --- Tail ending in massive crystal cluster ---
        const tailBaseMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0xffffff,
          shininess: 130,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.7,
          flatShading: true,
        });
        // Tail extension segments
        for (let ti = 0; ti < 3; ti++) {
          const tSeg = new THREE.Mesh(octGeo, tailBaseMat.clone());
          const tScale = 0.18 - ti * 0.03;
          tSeg.scale.set(s * tScale * 1.4, s * tScale, s * tScale);
          tSeg.position.set(-s * 1.6 - ti * s * 0.45, -s * 0.05 - ti * s * 0.04, 0);
          tSeg.rotation.z = ti * 0.15;
          group.add(tSeg);
        }
        // Terminal crystal cluster
        const clusterMat = new THREE.MeshPhongMaterial({
          color: 0x99ddff,
          specular: 0xffffff,
          shininess: 200,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.75,
          flatShading: true,
        });
        const clusterAngles = [0, 0.8, -0.8, 1.5, -1.5, 0.4, -0.4];
        const clusterLens = [0.35, 0.25, 0.25, 0.18, 0.18, 0.3, 0.3];
        for (let ci = 0; ci < clusterAngles.length; ci++) {
          const crystal = new THREE.Mesh(octGeo, clusterMat.clone());
          const cl = clusterLens[ci];
          crystal.scale.set(s * 0.05, s * cl, s * 0.05);
          crystal.position.set(
            -s * 2.85 - Math.cos(clusterAngles[ci]) * s * 0.08,
            -s * 0.1 + Math.sin(clusterAngles[ci]) * s * 0.12,
            Math.sin(clusterAngles[ci] * 1.3) * s * 0.1
          );
          crystal.rotation.z = Math.PI * 0.5 + clusterAngles[ci] * 0.4;
          group.add(crystal);
        }

        // --- Floating orbital crystal shards ---
        const shardMat = new THREE.MeshPhongMaterial({
          color: 0xbbddff,
          specular: 0xffffff,
          shininess: 200,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.65,
          flatShading: true,
        });
        for (let si = 0; si < 8; si++) {
          const shard = new THREE.Mesh(octGeo, shardMat.clone());
          const angle = (si / 8) * Math.PI * 2;
          const radius = s * (1.0 + Math.sin(si * 1.7) * 0.3);
          shard.scale.set(s * 0.04, s * 0.08, s * 0.04);
          shard.position.set(
            Math.cos(angle) * radius * 0.6,
            s * 0.5 + Math.sin(angle) * s * 0.25,
            Math.sin(angle) * radius * 0.5
          );
          shard.rotation.set(si * 0.7, si * 0.5, si * 0.3);
          group.add(shard);
        }

        // --- Internal crystal lattice structures visible through translucent body ---
        const latticeMat = new THREE.MeshPhongMaterial({
          color: 0xaaddff,
          specular: 0xffffff,
          shininess: 180,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.3,
        });
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const xPos = s * 1.8 - i * s * 0.6;
          const yPos = Math.sin(t * Math.PI * 0.7) * s * 0.15;
          const segScale = 0.38 - t * 0.12;
          // Crossing internal lattice struts (X pattern inside each segment)
          const strutA = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutA.scale.set(s * segScale * 0.8, s * 0.008, s * 0.008);
          strutA.position.set(xPos, yPos, 0);
          strutA.rotation.z = 0.5;
          group.add(strutA);
          const strutB = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutB.scale.set(s * segScale * 0.8, s * 0.008, s * 0.008);
          strutB.position.set(xPos, yPos, 0);
          strutB.rotation.z = -0.5;
          group.add(strutB);
          // Vertical lattice strut
          const strutV = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutV.scale.set(s * 0.008, s * segScale * 0.6, s * 0.008);
          strutV.position.set(xPos, yPos, 0);
          group.add(strutV);
          // Horizontal crossing strut (depth direction)
          const strutD = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutD.scale.set(s * 0.008, s * 0.008, s * segScale * 0.7);
          strutD.position.set(xPos, yPos, 0);
          group.add(strutD);
          // Diagonal depth struts
          const strutDiag1 = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutDiag1.scale.set(s * 0.006, s * segScale * 0.5, s * 0.006);
          strutDiag1.position.set(xPos, yPos, s * segScale * 0.15);
          strutDiag1.rotation.x = 0.6;
          group.add(strutDiag1);
          const strutDiag2 = new THREE.Mesh(this._boxGeo, latticeMat.clone());
          strutDiag2.scale.set(s * 0.006, s * segScale * 0.5, s * 0.006);
          strutDiag2.position.set(xPos, yPos, -s * segScale * 0.15);
          strutDiag2.rotation.x = -0.6;
          group.add(strutDiag2);
        }

        // --- Prismatic light refraction spots ---
        const prismColors = [0xff4444, 0xff8800, 0xffff44, 0x44ff44, 0x4488ff, 0x8844ff, 0xff44ff];
        for (let pi = 0; pi < 14; pi++) {
          const prismSpot = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: prismColors[pi % prismColors.length],
            transparent: true,
            opacity: 0.35,
            depthWrite: false,
          }));
          prismSpot.scale.set(s * 0.03, s * 0.03, s * 0.03);
          const spotAngle = (pi / 14) * Math.PI * 2;
          const spotR = s * (0.4 + Math.sin(pi * 2.1) * 0.3);
          prismSpot.position.set(
            s * 0.5 + Math.cos(spotAngle) * spotR,
            s * 0.15 + Math.sin(spotAngle) * s * 0.2,
            Math.sin(spotAngle) * spotR * 0.6,
          );
          group.add(prismSpot);
        }
        // Larger rainbow refraction patches on body surface
        for (let ri = 0; ri < 7; ri++) {
          const patchMat = new THREE.MeshBasicMaterial({
            color: prismColors[ri],
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const patch = new THREE.Mesh(this._boxGeo, patchMat);
          patch.scale.set(s * 0.06, s * 0.005, s * 0.06);
          const patchX = s * 1.8 - ri * s * 0.55;
          patch.position.set(patchX, s * 0.08 + Math.sin(ri * 0.9) * s * 0.05, s * 0.15);
          patch.rotation.y = ri * 0.4;
          group.add(patch);
        }

        // --- Crystal growth formations on the underside (stalactites) ---
        const stalactiteMat = new THREE.MeshPhongMaterial({
          color: 0x88ccee,
          specular: 0xffffff,
          shininess: 180,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.7,
          flatShading: true,
        });
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const xPos = s * 1.8 - i * s * 0.6;
          const yPos = Math.sin(t * Math.PI * 0.7) * s * 0.15;
          const segScale = 0.38 - t * 0.12;
          // 2-3 stalactite cones hanging from underside of each segment
          const stalCount = i < 3 ? 3 : 2;
          for (let si = 0; si < stalCount; si++) {
            const stal = new THREE.Mesh(this._coneGeo, stalactiteMat.clone());
            const stalLen = 0.06 + Math.random() * 0.08;
            stal.scale.set(s * 0.02, s * stalLen, s * 0.02);
            stal.rotation.x = Math.PI;
            stal.position.set(
              xPos + (si - 1) * s * 0.08,
              yPos - s * segScale * 0.6,
              (si - 1) * s * 0.05,
            );
            group.add(stal);
          }
        }
        // Larger stalactite clusters under the head
        for (let ji = 0; ji < 4; ji++) {
          const bigStal = new THREE.Mesh(this._coneGeo, stalactiteMat.clone());
          bigStal.scale.set(s * 0.03, s * (0.1 + ji * 0.02), s * 0.03);
          bigStal.rotation.x = Math.PI;
          bigStal.position.set(
            s * 2.4 + (ji - 1.5) * s * 0.12,
            s * -0.15,
            (ji - 1.5) * s * 0.06,
          );
          group.add(bigStal);
        }

        // --- Additional wing lattice detail: cross-struts and crystal nodes ---
        for (const wSide of [-1, 1]) {
          // Tertiary diagonal struts in wing
          for (let di = 0; di < 3; di++) {
            const diagStrut = new THREE.Mesh(this._boxGeo, wingBeamMat.clone());
            diagStrut.scale.set(s * 0.35, s * 0.02, s * 0.02);
            diagStrut.position.set(
              s * 0.8 + s * -0.1 + di * s * 0.15,
              s * 0.2 + s * 0.12 + di * s * 0.02,
              wSide * (s * 0.3 + s * (0.55 + di * 0.06)),
            );
            diagStrut.rotation.set(0, 0, wSide === -1 ? 0.6 + di * 0.1 : -0.6 - di * 0.1);
            group.add(diagStrut);
          }
          // Additional crystal nodes along wing edge
          for (let ni = 0; ni < 4; ni++) {
            const edgeNode = new THREE.Mesh(octGeo, shardMat.clone());
            edgeNode.scale.set(s * 0.03, s * 0.05, s * 0.03);
            edgeNode.position.set(
              s * 0.8 + s * 0.05 + ni * s * 0.12,
              s * 0.2 + s * 0.18 + ni * s * 0.03,
              wSide * (s * 0.3 + s * (0.7 + ni * 0.04)),
            );
            edgeNode.rotation.set(ni * 0.5, ni * 0.3, ni * 0.4);
            group.add(edgeNode);
          }
          // Wing trailing edge crystals
          for (let ei = 0; ei < 5; ei++) {
            const trailing = new THREE.Mesh(this._coneGeo, stalactiteMat.clone());
            trailing.scale.set(s * 0.02, s * (0.04 + ei * 0.01), s * 0.02);
            trailing.rotation.x = Math.PI;
            trailing.position.set(
              s * 0.8 + s * -0.2 + ei * s * 0.15,
              s * 0.2 + s * 0.02,
              wSide * (s * 0.3 + s * (0.45 + ei * 0.05)),
            );
            group.add(trailing);
          }
        }

        // --- Floating crystal dust particles in a halo around the creature ---
        const dustMat = new THREE.MeshBasicMaterial({
          color: 0xcceeFF,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        for (let di = 0; di < 20; di++) {
          const dust = new THREE.Mesh(this._sphereGeo, dustMat.clone());
          dust.scale.set(s * 0.015, s * 0.015, s * 0.015);
          const dustAngle = (di / 20) * Math.PI * 2;
          const dustR = s * (1.5 + Math.sin(di * 1.3) * 0.5);
          dust.position.set(
            Math.cos(dustAngle) * dustR * 0.5 + s * 0.3,
            s * 0.3 + Math.sin(dustAngle * 1.5) * s * 0.4,
            Math.sin(dustAngle) * dustR * 0.4,
          );
          group.add(dust);
        }
        // Slightly larger sparkling motes
        for (let mi = 0; mi < 10; mi++) {
          const mote = new THREE.Mesh(octGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.25,
            depthWrite: false,
          }));
          mote.scale.set(s * 0.012, s * 0.02, s * 0.012);
          const mAngle = (mi / 10) * Math.PI * 2 + 0.3;
          mote.position.set(
            Math.cos(mAngle) * s * 1.8 + s * 0.2,
            s * 0.4 + Math.sin(mAngle * 2) * s * 0.3,
            Math.sin(mAngle) * s * 1.2,
          );
          mote.rotation.set(mi * 0.8, mi * 0.6, mi * 0.4);
          group.add(mote);
        }

        // --- Resonance rings — thin torus shapes pulsing outward ---
        const ringMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let ri = 0; ri < 5; ri++) {
          const ring = new THREE.Mesh(
            new THREE.TorusGeometry(s * (0.5 + ri * 0.25), s * 0.01, 8, 24),
            ringMat.clone(),
          );
          ring.position.set(s * (0.6 - ri * 0.2), s * 0.15, 0);
          ring.rotation.x = Math.PI / 2 + ri * 0.1;
          ring.rotation.y = ri * 0.15;
          group.add(ring);
        }
        // Vertical resonance rings around body
        for (let ri = 0; ri < 3; ri++) {
          const vRing = new THREE.Mesh(
            new THREE.TorusGeometry(s * (0.35 + ri * 0.1), s * 0.008, 6, 20),
            ringMat.clone(),
          );
          vRing.position.set(s * 1.0 - ri * s * 0.8, s * 0.1, 0);
          vRing.rotation.y = Math.PI / 2;
          vRing.rotation.z = ri * 0.2;
          group.add(vRing);
        }

        // --- Additional crystal teeth/fangs (more varied sizes) ---
        const extraFangMat = new THREE.MeshPhongMaterial({
          color: 0xddeeff,
          specular: 0xffffff,
          shininess: 200,
          emissive: 0x88ccee,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.8,
        });
        // Upper jaw fangs
        for (let fi = 0; fi < 7; fi++) {
          const fangX = s * 2.5 + fi * s * 0.08;
          for (const fz of [-1, 1]) {
            const extraFang = new THREE.Mesh(this._coneGeo, extraFangMat.clone());
            const fSize = 0.02 + Math.sin(fi * 1.2) * 0.015;
            extraFang.scale.set(s * 0.015, s * fSize, s * 0.015);
            extraFang.rotation.x = Math.PI;
            extraFang.position.set(fangX, s * 0.22, fz * s * (0.08 + fi * 0.015));
            group.add(extraFang);
          }
        }
        // Side tusks
        for (const tz of [-1, 1]) {
          const tusk = new THREE.Mesh(octGeo, extraFangMat.clone());
          tusk.scale.set(s * 0.03, s * 0.1, s * 0.03);
          tusk.position.set(s * 2.55, s * 0.05, tz * s * 0.28);
          tusk.rotation.z = tz * 0.3;
          group.add(tusk);
          // Smaller tusk beside it
          const tuskSmall = new THREE.Mesh(octGeo, extraFangMat.clone());
          tuskSmall.scale.set(s * 0.02, s * 0.06, s * 0.02);
          tuskSmall.position.set(s * 2.65, s * 0.03, tz * s * 0.25);
          tuskSmall.rotation.z = tz * 0.2;
          group.add(tuskSmall);
        }

        // --- Crystalline tail fin (flat crystal planes in a fan shape) ---
        const tailFinMat = new THREE.MeshPhongMaterial({
          color: 0x99ddff,
          specular: 0xffffff,
          shininess: 160,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          flatShading: true,
        });
        const finAngles = [-1.2, -0.6, 0, 0.6, 1.2];
        const finLengths = [0.15, 0.22, 0.28, 0.22, 0.15];
        for (let fi = 0; fi < finAngles.length; fi++) {
          const fin = new THREE.Mesh(this._boxGeo, tailFinMat.clone());
          fin.scale.set(s * finLengths[fi], s * 0.005, s * 0.08);
          fin.position.set(
            -s * 3.0 - Math.cos(finAngles[fi]) * s * 0.05,
            -s * 0.12 + Math.sin(finAngles[fi]) * s * 0.1,
            Math.sin(finAngles[fi]) * s * 0.08,
          );
          fin.rotation.z = Math.PI * 0.5 + finAngles[fi] * 0.3;
          fin.rotation.y = finAngles[fi] * 0.4;
          group.add(fin);
          // Crystal edge highlight on each fin plane
          const finEdge = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({
            color: 0xccffff,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
          }));
          finEdge.scale.set(s * finLengths[fi] * 1.02, s * 0.002, s * 0.003);
          finEdge.position.copy(fin.position);
          finEdge.position.y += s * 0.005;
          finEdge.rotation.copy(fin.rotation);
          group.add(finEdge);
        }
        // Central fin spine
        const finSpine = new THREE.Mesh(this._boxGeo, clusterMat.clone());
        finSpine.scale.set(s * 0.18, s * 0.03, s * 0.03);
        finSpine.position.set(-s * 3.0, -s * 0.12, 0);
        finSpine.rotation.z = Math.PI * 0.5;
        group.add(finSpine);

        // --- Enhanced eye detail: faceted iris, inner glow pupil ---
        for (const ez of [-1, 1]) {
          // Faceted iris ring (octahedron ring of small crystals)
          for (let ei = 0; ei < 6; ei++) {
            const irisAngle = (ei / 6) * Math.PI * 2;
            const irisFacet = new THREE.Mesh(octGeo, new THREE.MeshPhongMaterial({
              color: 0x88ffff,
              specular: 0xffffff,
              shininess: 200,
              emissive: 0x44dddd,
              emissiveIntensity: 0.4,
              transparent: true,
              opacity: 0.85,
            }));
            irisFacet.scale.set(s * 0.015, s * 0.015, s * 0.015);
            irisFacet.position.set(
              s * 2.68 + Math.cos(irisAngle) * s * 0.035,
              s * 0.32 + Math.sin(irisAngle) * s * 0.03,
              ez * s * 0.2 + Math.sin(irisAngle) * s * 0.01,
            );
            irisFacet.rotation.set(irisAngle, 0, 0);
            group.add(irisFacet);
          }
          // Inner glow pupil (bright core)
          const pupilGlow = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.9,
          }));
          pupilGlow.scale.set(s * 0.02, s * 0.02, s * 0.02);
          pupilGlow.position.set(s * 2.72, s * 0.32, ez * s * 0.2);
          group.add(pupilGlow);
          // Outer glow halo around eye
          const eyeHalo = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0x88ffff,
            transparent: true,
            opacity: 0.15,
            depthWrite: false,
          }));
          eyeHalo.scale.set(s * 0.14, s * 0.12, s * 0.1);
          eyeHalo.position.set(s * 2.67, s * 0.32, ez * s * 0.2);
          group.add(eyeHalo);
        }

        // --- Underbelly energy veins (glowing lines along the underside) ---
        const veinMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        for (let vi = 0; vi < segCount - 1; vi++) {
          const t = vi / (segCount - 1);
          const xPos = s * 1.8 - vi * s * 0.6;
          const yPos = Math.sin(t * Math.PI * 0.7) * s * 0.15;
          const segScale = 0.38 - t * 0.12;
          const vein = new THREE.Mesh(this._boxGeo, veinMat.clone());
          vein.scale.set(s * 0.5, s * 0.005, s * 0.005);
          vein.position.set(xPos - s * 0.15, yPos - s * segScale * 0.35, 0);
          group.add(vein);
          // Branching veins
          for (const bz of [-1, 1]) {
            const branch = new THREE.Mesh(this._boxGeo, veinMat.clone());
            branch.scale.set(s * 0.15, s * 0.004, s * 0.004);
            branch.position.set(xPos, yPos - s * segScale * 0.3, bz * s * segScale * 0.2);
            branch.rotation.y = bz * 0.6;
            group.add(branch);
          }
        }

        // --- Dorsal crystal spines along the back ---
        const spineMat = new THREE.MeshPhongMaterial({
          color: 0xaaddff,
          specular: 0xffffff,
          shininess: 180,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.75,
          flatShading: true,
        });
        for (let i = 0; i < segCount; i++) {
          const t = i / (segCount - 1);
          const xPos = s * 1.8 - i * s * 0.6;
          const yPos = Math.sin(t * Math.PI * 0.7) * s * 0.15;
          const segScale = 0.38 - t * 0.12;
          // Central dorsal spine
          const spine = new THREE.Mesh(octGeo, spineMat.clone());
          spine.scale.set(s * 0.025, s * (0.06 + segScale * 0.15), s * 0.025);
          spine.position.set(xPos, yPos + s * segScale * 0.7, 0);
          group.add(spine);
          // Side dorsal spines (smaller)
          for (const dz of [-1, 1]) {
            const sideSpine = new THREE.Mesh(octGeo, spineMat.clone());
            sideSpine.scale.set(s * 0.018, s * (0.04 + segScale * 0.08), s * 0.018);
            sideSpine.position.set(xPos, yPos + s * segScale * 0.55, dz * s * segScale * 0.3);
            sideSpine.rotation.z = dz * 0.3;
            group.add(sideSpine);
          }
        }

        break;
      }

      case TDEnemyType.EMBER_PHOENIX: {
        // Infernal Scorpion Wyrm — segmented armored fire creature
        const armorMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          flatShading: true,
          specular: 0x331100,
          shininess: 40,
        });
        const lavaMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const whiteHotMat = new THREE.MeshBasicMaterial({ color: 0xffffcc });
        const moltenJointMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.8,
        });

        // === Main body: 5 armored segments ===
        const segmentCount = 5;
        for (let i = 0; i < segmentCount; i++) {
          const seg = new THREE.Mesh(this._sphereGeo, armorMat.clone());
          const segScale = 1.0 - i * 0.1;
          seg.scale.set(s * 0.5 * segScale, s * 0.35 * segScale, s * 0.55 * segScale);
          seg.position.set(-s * 0.45 * i, s * 0.3, 0);
          if (i === 0) seg.name = "phoenixBody";
          group.add(seg);
          // Armored ridge on top of each segment
          const ridge = new THREE.Mesh(this._boxGeo, armorMat.clone());
          ridge.scale.set(s * 0.35 * segScale, s * 0.08, s * 0.15 * segScale);
          ridge.position.set(-s * 0.45 * i, s * 0.55 * segScale, 0);
          group.add(ridge);
          // Molten fire dripping from joints between segments
          if (i > 0) {
            const joint = new THREE.Mesh(this._sphereGeo, moltenJointMat.clone());
            joint.scale.set(s * 0.15, s * 0.12, s * 0.15);
            joint.position.set(-s * 0.45 * i + s * 0.22, s * 0.15, 0);
            group.add(joint);
            // Fire drip below joint
            const drip = new THREE.Mesh(this._coneGeo, lavaMat.clone());
            drip.scale.set(s * 0.06, s * 0.15, s * 0.06);
            drip.rotation.x = Math.PI;
            drip.position.set(-s * 0.45 * i + s * 0.22, s * 0.02, 0);
            group.add(drip);
          }
        }

        // === Head: angular armored skull ===
        const headMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: 0xff2200,
          emissiveIntensity: 0.4,
          flatShading: true,
        });
        const head = new THREE.Mesh(this._boxGeo, headMat);
        head.scale.set(s * 0.55, s * 0.3, s * 0.4);
        head.position.set(s * 0.5, s * 0.35, 0);
        head.rotation.z = -0.15;
        group.add(head);
        // Mandibles
        for (const z of [-1, 1]) {
          const mandible = new THREE.Mesh(this._coneGeo, armorMat.clone());
          mandible.scale.set(s * 0.06, s * 0.25, s * 0.04);
          mandible.rotation.z = -Math.PI / 2 + z * 0.25;
          mandible.position.set(s * 0.75, s * 0.2, z * s * 0.18);
          group.add(mandible);
        }
        // Glowing slit eyes
        const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xffff44 });
        for (const z of [-s * 0.12, s * 0.12]) {
          const eye = new THREE.Mesh(this._boxGeo, eyeGlowMat);
          eye.scale.set(s * 0.1, s * 0.03, s * 0.06);
          eye.position.set(s * 0.7, s * 0.42, z);
          group.add(eye);
        }

        // === Crown of flame horns ===
        for (let i = 0; i < 5; i++) {
          const horn = new THREE.Mesh(this._coneGeo, lavaMat.clone());
          const hAngle = ((i - 2) / 4) * Math.PI * 0.6;
          horn.scale.set(s * 0.05, s * (0.2 + Math.random() * 0.15), s * 0.05);
          horn.position.set(
            s * 0.45 + Math.cos(hAngle) * s * 0.1,
            s * 0.55 + Math.abs(Math.sin(hAngle)) * s * 0.1,
            Math.sin(hAngle) * s * 0.2,
          );
          horn.rotation.z = hAngle * 0.3;
          group.add(horn);
        }

        // === Pincers at front — white-hot ===
        for (const z of [-1, 1]) {
          // Pincer arm
          const pArm = new THREE.Mesh(this._boxGeo, armorMat.clone());
          pArm.scale.set(s * 0.45, s * 0.12, s * 0.1);
          pArm.position.set(s * 0.8, s * 0.1, z * s * 0.45);
          pArm.rotation.z = z * 0.2;
          group.add(pArm);
          // Upper claw
          const clawU = new THREE.Mesh(this._coneGeo, whiteHotMat);
          clawU.scale.set(s * 0.04, s * 0.2, s * 0.04);
          clawU.rotation.z = -Math.PI / 2 + 0.4;
          clawU.position.set(s * 1.1, s * 0.18, z * s * 0.45);
          group.add(clawU);
          // Lower claw
          const clawD = new THREE.Mesh(this._coneGeo, whiteHotMat.clone());
          clawD.scale.set(s * 0.04, s * 0.2, s * 0.04);
          clawD.rotation.z = -Math.PI / 2 - 0.4;
          clawD.position.set(s * 1.1, s * 0.02, z * s * 0.45);
          group.add(clawD);
          // Glow between claws
          const pGlow = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xffcc44,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }));
          pGlow.scale.set(s * 0.08, s * 0.08, s * 0.08);
          pGlow.position.set(s * 1.15, s * 0.1, z * s * 0.45);
          group.add(pGlow);
        }

        // === Skittering legs — hardened magma ===
        const legMat = new THREE.MeshPhongMaterial({
          color: 0x441100,
          emissive: 0x331100,
          emissiveIntensity: 0.3,
          flatShading: true,
        });
        for (let i = 0; i < 4; i++) {
          for (const z of [-1, 1]) {
            // Upper leg segment
            const upperLeg = new THREE.Mesh(this._boxGeo, legMat);
            upperLeg.scale.set(s * 0.06, s * 0.25, s * 0.06);
            upperLeg.rotation.z = z * 0.3;
            upperLeg.position.set(-s * 0.15 * i + s * 0.1, s * 0.05, z * s * 0.4);
            group.add(upperLeg);
            // Lower leg segment (angled down)
            const lowerLeg = new THREE.Mesh(this._boxGeo, legMat.clone());
            lowerLeg.scale.set(s * 0.04, s * 0.2, s * 0.04);
            lowerLeg.rotation.z = z * -0.5;
            lowerLeg.position.set(-s * 0.15 * i + s * 0.1, -s * 0.2, z * s * 0.55);
            group.add(lowerLeg);
            // Leg tip glowing ember
            const legTip = new THREE.Mesh(this._sphereGeo, moltenJointMat.clone());
            legTip.scale.set(s * 0.03, s * 0.03, s * 0.03);
            legTip.position.set(-s * 0.15 * i + s * 0.1, -s * 0.35, z * s * 0.6);
            group.add(legTip);
          }
        }

        // === Stinger tail — massive, dripping molten lava ===
        const tailSeg1 = new THREE.Mesh(this._boxGeo, armorMat.clone());
        tailSeg1.scale.set(s * 0.2, s * 0.5, s * 0.2);
        tailSeg1.position.set(-s * 1.9, s * 0.6, 0);
        tailSeg1.rotation.z = 0.4;
        group.add(tailSeg1);
        const tailSeg2 = new THREE.Mesh(this._boxGeo, armorMat.clone());
        tailSeg2.scale.set(s * 0.16, s * 0.45, s * 0.16);
        tailSeg2.position.set(-s * 1.75, s * 1.1, 0);
        tailSeg2.rotation.z = 0.8;
        group.add(tailSeg2);
        const tailSeg3 = new THREE.Mesh(this._boxGeo, armorMat.clone());
        tailSeg3.scale.set(s * 0.12, s * 0.4, s * 0.12);
        tailSeg3.position.set(-s * 1.45, s * 1.5, 0);
        tailSeg3.rotation.z = 1.2;
        group.add(tailSeg3);
        // Stinger tip
        const stingerMat = new THREE.MeshBasicMaterial({ color: 0xff2200 });
        const stinger = new THREE.Mesh(this._coneGeo, stingerMat);
        stinger.scale.set(s * 0.12, s * 0.35, s * 0.12);
        stinger.position.set(-s * 1.1, s * 1.75, 0);
        stinger.rotation.z = 1.8;
        group.add(stinger);
        // Lava drips from stinger
        for (let i = 0; i < 3; i++) {
          const drip = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xff4400,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }));
          drip.scale.set(s * 0.04, s * 0.08, s * 0.04);
          drip.position.set(
            -s * 1.1 + (Math.random() - 0.5) * s * 0.15,
            s * 1.55 - i * s * 0.12,
            (Math.random() - 0.5) * s * 0.1,
          );
          group.add(drip);
        }

        // === Flame membrane wings from back segments ===
        const fireWingMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.55,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        const fwL = new THREE.Mesh(this._createWingGeometry(), fireWingMat);
        fwL.scale.set(s * 0.45, s * 0.4, s * 0.6);
        fwL.position.set(-s * 0.4, s * 0.55, -s * 0.45);
        fwL.name = "wingL";
        group.add(fwL);
        const fwR = new THREE.Mesh(this._createWingGeometry(), fireWingMat.clone());
        fwR.scale.set(s * 0.45, s * 0.4, -s * 0.6);
        fwR.position.set(-s * 0.4, s * 0.55, s * 0.45);
        fwR.name = "wingR";
        group.add(fwR);
        // Wing vein glow lines
        for (const z of [-1, 1]) {
          const vein = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
          }));
          vein.scale.set(s * 0.35, s * 0.01, s * 0.01);
          vein.position.set(-s * 0.4, s * 0.6, z * s * 0.5);
          group.add(vein);
        }

        // === Ember particles rising from body ===
        const emberMat = new THREE.MeshBasicMaterial({ color: 0xffaa22 });
        for (let i = 0; i < 8; i++) {
          const ember = new THREE.Mesh(new THREE.SphereGeometry(s * 0.03, 4, 3), emberMat);
          ember.position.set(
            (Math.random() - 0.5) * s * 2.5,
            s * 0.5 + Math.random() * s * 0.8,
            (Math.random() - 0.5) * s * 0.6,
          );
          group.add(ember);
        }

        // === Heat distortion glow halos around body segment joints ===
        const haloMat = new THREE.MeshBasicMaterial({
          color: 0xff8800,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let i = 1; i < segmentCount; i++) {
          const halo = new THREE.Mesh(new THREE.TorusGeometry(s * 0.2, s * 0.03, 6, 12), haloMat.clone());
          halo.position.set(-s * 0.45 * i + s * 0.22, s * 0.3, 0);
          halo.rotation.y = Math.PI / 2;
          group.add(halo);
          // Secondary smaller inner halo
          const halo2 = new THREE.Mesh(new THREE.TorusGeometry(s * 0.12, s * 0.02, 6, 10), haloMat.clone());
          halo2.position.set(-s * 0.45 * i + s * 0.22, s * 0.3, 0);
          halo2.rotation.y = Math.PI / 2;
          halo2.rotation.x = 0.3;
          group.add(halo2);
        }

        // === Molten lava drips from stinger tip (additional) ===
        const lavaDripMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
        });
        for (let i = 0; i < 5; i++) {
          // Elongated drip spheres
          const dripSphere = new THREE.Mesh(this._sphereGeo, lavaDripMat.clone());
          dripSphere.scale.set(s * 0.03, s * 0.06, s * 0.03);
          dripSphere.position.set(
            -s * 1.1 + (Math.random() - 0.5) * s * 0.2,
            s * 1.45 - i * s * 0.15,
            (Math.random() - 0.5) * s * 0.12,
          );
          group.add(dripSphere);
          // Cone-shaped drip drops
          const dripCone = new THREE.Mesh(this._coneGeo, lavaDripMat.clone());
          dripCone.scale.set(s * 0.02, s * 0.05, s * 0.02);
          dripCone.rotation.x = Math.PI;
          dripCone.position.set(
            -s * 1.05 + (Math.random() - 0.5) * s * 0.18,
            s * 1.35 - i * s * 0.18,
            (Math.random() - 0.5) * s * 0.1,
          );
          group.add(dripCone);
        }

        // === Enhanced leg detail: knee joints, shin plates, toe segments ===
        const kneeGlowMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.6,
        });
        const shinPlateMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: 0x331100,
          emissiveIntensity: 0.2,
          flatShading: true,
        });
        for (let i = 0; i < 4; i++) {
          for (const z of [-1, 1]) {
            // Knee joint sphere between upper and lower leg
            const knee = new THREE.Mesh(this._sphereGeo, kneeGlowMat.clone());
            knee.scale.set(s * 0.05, s * 0.05, s * 0.05);
            knee.position.set(-s * 0.15 * i + s * 0.1, -s * 0.08, z * s * 0.48);
            group.add(knee);
            // Armored shin plate on lower leg
            const shin = new THREE.Mesh(this._boxGeo, shinPlateMat.clone());
            shin.scale.set(s * 0.055, s * 0.12, s * 0.06);
            shin.rotation.z = z * -0.5;
            shin.position.set(-s * 0.15 * i + s * 0.1, -s * 0.18, z * s * 0.53);
            group.add(shin);
            // Articulated toe segments (3 toes per foot)
            for (let toe = -1; toe <= 1; toe++) {
              const toeSeg = new THREE.Mesh(this._coneGeo, legMat.clone());
              toeSeg.scale.set(s * 0.015, s * 0.06, s * 0.015);
              toeSeg.rotation.z = z * -0.8 + toe * 0.2;
              toeSeg.position.set(
                -s * 0.15 * i + s * 0.1 + toe * s * 0.025,
                -s * 0.38,
                z * s * 0.62 + toe * z * s * 0.02,
              );
              group.add(toeSeg);
            }
          }
        }

        // === Exhaust vents on back segments ===
        const ventMat = new THREE.MeshPhongMaterial({
          color: 0x222222,
          emissive: 0x000000,
          flatShading: true,
        });
        const ventFireMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
          transparent: true,
          opacity: 0.7,
        });
        for (let i = 0; i < segmentCount; i++) {
          const segScale = 1.0 - i * 0.1;
          for (const z of [-1, 1]) {
            // Vent housing (dark ring shape)
            const vent = new THREE.Mesh(this._boxGeo, ventMat.clone());
            vent.scale.set(s * 0.08, s * 0.04, s * 0.06);
            vent.position.set(-s * 0.45 * i, s * 0.6 * segScale, z * s * 0.2 * segScale);
            vent.rotation.x = z * 0.3;
            group.add(vent);
            // Inner fire glow visible from vent
            const ventFire = new THREE.Mesh(this._sphereGeo, ventFireMat.clone());
            ventFire.scale.set(s * 0.04, s * 0.03, s * 0.04);
            ventFire.position.set(-s * 0.45 * i, s * 0.62 * segScale, z * s * 0.21 * segScale);
            group.add(ventFire);
          }
        }

        // === Enhanced pincer detail: serrated inner edges, hydraulic muscle ===
        const serratedMat = new THREE.MeshPhongMaterial({
          color: 0xffccaa,
          emissive: 0xff4400,
          emissiveIntensity: 0.3,
          flatShading: true,
        });
        const hydraulicMat = new THREE.MeshPhongMaterial({
          color: 0x553322,
          emissive: 0x331100,
          emissiveIntensity: 0.15,
          shininess: 60,
        });
        for (const z of [-1, 1]) {
          // Serrated teeth along upper claw inner edge
          for (let t = 0; t < 6; t++) {
            const tooth = new THREE.Mesh(this._coneGeo, serratedMat.clone());
            tooth.scale.set(s * 0.012, s * 0.035, s * 0.012);
            tooth.position.set(
              s * 0.95 + t * s * 0.04,
              s * 0.12 + t * s * 0.01,
              z * s * 0.45,
            );
            tooth.rotation.z = -Math.PI / 2;
            group.add(tooth);
          }
          // Serrated teeth along lower claw inner edge
          for (let t = 0; t < 6; t++) {
            const tooth = new THREE.Mesh(this._coneGeo, serratedMat.clone());
            tooth.scale.set(s * 0.012, s * 0.035, s * 0.012);
            tooth.position.set(
              s * 0.95 + t * s * 0.04,
              s * 0.08 - t * s * 0.01,
              z * s * 0.45,
            );
            tooth.rotation.z = Math.PI / 2;
            group.add(tooth);
          }
          // Hydraulic muscle bundle at pincer base
          const hydraulic1 = new THREE.Mesh(this._boxGeo, hydraulicMat.clone());
          hydraulic1.scale.set(s * 0.15, s * 0.06, s * 0.08);
          hydraulic1.position.set(s * 0.7, s * 0.1, z * s * 0.42);
          group.add(hydraulic1);
          const hydraulic2 = new THREE.Mesh(this._boxGeo, hydraulicMat.clone());
          hydraulic2.scale.set(s * 0.1, s * 0.04, s * 0.06);
          hydraulic2.position.set(s * 0.65, s * 0.18, z * s * 0.42);
          hydraulic2.rotation.z = 0.2;
          group.add(hydraulic2);
          // Muscle tendon connection
          const tendon = new THREE.Mesh(this._sphereGeo, hydraulicMat.clone());
          tendon.scale.set(s * 0.04, s * 0.06, s * 0.04);
          tendon.position.set(s * 0.78, s * 0.12, z * s * 0.44);
          group.add(tendon);
        }

        // === Smoldering ember particles trailing from tail ===
        const smolderMat = new THREE.MeshBasicMaterial({
          color: 0xff5500,
          transparent: true,
          opacity: 0.45,
          depthWrite: false,
        });
        const ashMat = new THREE.MeshBasicMaterial({
          color: 0x553311,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        for (let i = 0; i < 12; i++) {
          const smolder = new THREE.Mesh(this._sphereGeo, i % 2 === 0 ? smolderMat.clone() : ashMat.clone());
          smolder.scale.set(s * 0.025, s * 0.025, s * 0.025);
          const tailT = i / 12;
          smolder.position.set(
            -s * 1.9 + tailT * s * 0.8 + (Math.random() - 0.5) * s * 0.15,
            s * 0.6 + tailT * s * 1.2 + (Math.random() - 0.5) * s * 0.2,
            (Math.random() - 0.5) * s * 0.25,
          );
          group.add(smolder);
        }
        // Rising smoke wisps from tail
        for (let i = 0; i < 6; i++) {
          const wisp = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0x442211,
            transparent: true,
            opacity: 0.2,
            depthWrite: false,
          }));
          wisp.scale.set(s * 0.05, s * 0.08, s * 0.05);
          wisp.position.set(
            -s * 1.5 + (Math.random() - 0.5) * s * 0.6,
            s * 1.3 + i * s * 0.15,
            (Math.random() - 0.5) * s * 0.15,
          );
          group.add(wisp);
        }

        // === Cracked obsidian armor plates on top of body segments ===
        const obsidianMat = new THREE.MeshPhongMaterial({
          color: 0x1a1a1a,
          emissive: 0x000000,
          flatShading: true,
          shininess: 80,
          specular: 0x444444,
        });
        const crackLavaMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.8,
        });
        for (let i = 0; i < segmentCount; i++) {
          const segScale = 1.0 - i * 0.1;
          // Main obsidian plate
          const plate = new THREE.Mesh(this._boxGeo, obsidianMat.clone());
          plate.scale.set(s * 0.3 * segScale, s * 0.03, s * 0.22 * segScale);
          plate.position.set(-s * 0.45 * i, s * 0.58 * segScale, 0);
          group.add(plate);
          // Lava cracks visible through armor (cross pattern)
          const crackH = new THREE.Mesh(this._boxGeo, crackLavaMat.clone());
          crackH.scale.set(s * 0.25 * segScale, s * 0.008, s * 0.015);
          crackH.position.set(-s * 0.45 * i, s * 0.59 * segScale, 0);
          group.add(crackH);
          const crackV = new THREE.Mesh(this._boxGeo, crackLavaMat.clone());
          crackV.scale.set(s * 0.015, s * 0.008, s * 0.18 * segScale);
          crackV.position.set(-s * 0.45 * i, s * 0.59 * segScale, 0);
          group.add(crackV);
          // Diagonal cracks
          const crackD1 = new THREE.Mesh(this._boxGeo, crackLavaMat.clone());
          crackD1.scale.set(s * 0.15 * segScale, s * 0.006, s * 0.01);
          crackD1.position.set(-s * 0.45 * i + s * 0.05, s * 0.592 * segScale, s * 0.04);
          crackD1.rotation.y = 0.6;
          group.add(crackD1);
          const crackD2 = new THREE.Mesh(this._boxGeo, crackLavaMat.clone());
          crackD2.scale.set(s * 0.12 * segScale, s * 0.006, s * 0.01);
          crackD2.position.set(-s * 0.45 * i - s * 0.04, s * 0.592 * segScale, -s * 0.03);
          crackD2.rotation.y = -0.5;
          group.add(crackD2);
        }

        // === Secondary vestigial legs/appendages ===
        const vestigialMat = new THREE.MeshPhongMaterial({
          color: 0x552200,
          emissive: 0x221100,
          emissiveIntensity: 0.15,
          flatShading: true,
        });
        for (let i = 0; i < 3; i++) {
          for (const z of [-1, 1]) {
            // Small vestigial leg stub
            const vestigUpper = new THREE.Mesh(this._boxGeo, vestigialMat.clone());
            vestigUpper.scale.set(s * 0.03, s * 0.1, s * 0.025);
            vestigUpper.rotation.z = z * 0.6;
            vestigUpper.position.set(-s * 0.45 * (i + 1) - s * 0.1, s * 0.1, z * s * 0.32);
            group.add(vestigUpper);
            // Lower vestigial segment
            const vestigLower = new THREE.Mesh(this._coneGeo, vestigialMat.clone());
            vestigLower.scale.set(s * 0.015, s * 0.06, s * 0.015);
            vestigLower.rotation.z = z * -0.3;
            vestigLower.position.set(-s * 0.45 * (i + 1) - s * 0.1, s * 0.0, z * s * 0.35);
            group.add(vestigLower);
            // Tiny joint between vestigial segments
            const vestigJoint = new THREE.Mesh(this._sphereGeo, moltenJointMat.clone());
            vestigJoint.scale.set(s * 0.015, s * 0.015, s * 0.015);
            vestigJoint.position.set(-s * 0.45 * (i + 1) - s * 0.1, s * 0.05, z * s * 0.33);
            group.add(vestigJoint);
          }
        }

        // === Additional tail armor plating detail ===
        for (let ti = 0; ti < 3; ti++) {
          // Side armor flanges on tail segments
          for (const z of [-1, 1]) {
            const flange = new THREE.Mesh(this._boxGeo, armorMat.clone());
            flange.scale.set(s * 0.08, s * 0.15, s * 0.03);
            flange.position.set(
              -s * 1.9 + ti * s * 0.22,
              s * 0.6 + ti * s * 0.25,
              z * s * 0.12,
            );
            flange.rotation.z = 0.4 + ti * 0.2;
            group.add(flange);
          }
          // Heat glow between tail segments
          const tailHeat = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xff5500,
            transparent: true,
            opacity: 0.4,
            depthWrite: false,
          }));
          tailHeat.scale.set(s * 0.06, s * 0.04, s * 0.06);
          tailHeat.position.set(-s * 1.82 + ti * s * 0.22, s * 0.72 + ti * s * 0.25, 0);
          group.add(tailHeat);
        }

        // === Belly underplate glow (visible from below) ===
        const bellyGlowMat = new THREE.MeshBasicMaterial({
          color: 0xff3300,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let i = 0; i < segmentCount; i++) {
          const segScale = 1.0 - i * 0.1;
          const bellyGlow = new THREE.Mesh(this._boxGeo, bellyGlowMat.clone());
          bellyGlow.scale.set(s * 0.3 * segScale, s * 0.01, s * 0.2 * segScale);
          bellyGlow.position.set(-s * 0.45 * i, s * 0.12, 0);
          group.add(bellyGlow);
        }

        // === Head antennae/feelers ===
        const antennaeMat = new THREE.MeshPhongMaterial({
          color: 0x663300,
          emissive: 0xff4400,
          emissiveIntensity: 0.3,
          flatShading: true,
        });
        for (const z of [-1, 1]) {
          const antenna = new THREE.Mesh(this._boxGeo, antennaeMat.clone());
          antenna.scale.set(s * 0.35, s * 0.015, s * 0.015);
          antenna.position.set(s * 0.85, s * 0.45, z * s * 0.22);
          antenna.rotation.z = -0.2;
          antenna.rotation.y = z * 0.15;
          group.add(antenna);
          // Glowing antenna tip
          const antTip = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xffaa00,
            transparent: true,
            opacity: 0.7,
          }));
          antTip.scale.set(s * 0.025, s * 0.025, s * 0.025);
          antTip.position.set(s * 1.2, s * 0.38, z * s * 0.25);
          group.add(antTip);
        }

        break;
      }

      case TDEnemyType.VOID_WRAITH: {
        // === ABYSSAL DEVOURER — tentacled void horror ===

        // --- Central vortex body: swirling dark energy sphere ---
        const vortexCoreMat = new THREE.MeshPhongMaterial({
          color: 0x110022,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.85,
        });
        const vortexCore = new THREE.Mesh(this._sphereGeo, vortexCoreMat);
        vortexCore.scale.set(s * 0.7, s * 0.75, s * 0.7);
        vortexCore.position.y = s * 1.0;
        group.add(vortexCore);

        // --- Dimensional distortion layers (overlapping transparent shells) ---
        for (let layer = 0; layer < 3; layer++) {
          const distortMat = new THREE.MeshPhongMaterial({
            color: 0x1a0033,
            emissive: enemy.glowColor,
            emissiveIntensity: 0.15 + layer * 0.1,
            transparent: true,
            opacity: 0.15 - layer * 0.03,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          const distortShell = new THREE.Mesh(this._sphereGeo, distortMat);
          const shellScale = s * (0.85 + layer * 0.18);
          distortShell.scale.set(shellScale, shellScale * 0.9, shellScale);
          distortShell.position.y = s * 1.0;
          distortShell.rotation.set(layer * 0.7, layer * 1.1, layer * 0.4);
          group.add(distortShell);
        }

        // --- Gaping maw with void teeth ---
        const mawMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const maw = new THREE.Mesh(this._sphereGeo, mawMat);
        maw.scale.set(s * 0.35, s * 0.25, s * 0.2);
        maw.position.set(s * 0.35, s * 0.9, 0);
        group.add(maw);

        // Void teeth ringing the maw
        const toothMat = new THREE.MeshPhongMaterial({
          color: 0x6622aa,
          emissive: 0x4400aa,
          emissiveIntensity: 0.6,
        });
        for (let t = 0; t < 10; t++) {
          const angle = (t / 10) * Math.PI * 2;
          const tooth = new THREE.Mesh(this._coneGeo, toothMat);
          tooth.scale.set(s * 0.04, s * 0.12, s * 0.04);
          const mawR = s * 0.22;
          tooth.position.set(
            s * 0.45,
            s * 0.9 + Math.sin(angle) * mawR,
            Math.cos(angle) * mawR,
          );
          tooth.rotation.z = Math.PI * 0.5 + Math.sin(angle) * 0.3;
          tooth.rotation.x = -Math.cos(angle) * 0.3;
          group.add(tooth);
        }

        // --- 8 spectral tentacles radiating outward ---
        const tentacleMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.7,
        });
        const eyeTipMat = new THREE.MeshBasicMaterial({ color: 0xcc44ff });
        const eyePupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });

        for (let tentIdx = 0; tentIdx < 8; tentIdx++) {
          const baseAngle = (tentIdx / 8) * Math.PI * 2;
          const segments = 5 + Math.floor(Math.random() * 3);
          let px = 0, py = s * 0.8, pz = 0;
          const reachDir = baseAngle;
          for (let seg = 0; seg < segments; seg++) {
            const segLen = s * (0.18 + Math.random() * 0.08);
            const thickness = s * (0.08 - seg * 0.008);
            const segMesh = new THREE.Mesh(this._sphereGeo, tentacleMat);
            segMesh.scale.set(thickness, segLen * 0.5, thickness);

            // Each segment extends outward and slightly downward
            px += Math.cos(reachDir) * segLen * 0.7;
            pz += Math.sin(reachDir) * segLen * 0.7;
            py -= segLen * 0.25;
            segMesh.position.set(px, py, pz);
            segMesh.rotation.set(
              Math.sin(baseAngle + seg) * 0.3,
              reachDir,
              Math.PI * 0.3 + seg * 0.15,
            );
            group.add(segMesh);
          }

          // Void eye at tentacle tip
          const tipEye = new THREE.Mesh(this._sphereGeo, eyeTipMat);
          tipEye.scale.set(s * 0.07, s * 0.07, s * 0.07);
          tipEye.position.set(px, py, pz);
          group.add(tipEye);

          const tipPupil = new THREE.Mesh(this._sphereGeo, eyePupilMat);
          tipPupil.scale.set(s * 0.035, s * 0.035, s * 0.035);
          tipPupil.position.set(px + Math.cos(reachDir) * s * 0.03, py, pz + Math.sin(reachDir) * s * 0.03);
          group.add(tipPupil);
        }

        // --- Crown of broken reality shards floating above ---
        const shardMat = new THREE.MeshPhongMaterial({
          color: 0x8833cc,
          emissive: 0xaa55ff,
          emissiveIntensity: 0.8,
          transparent: true,
          opacity: 0.6,
          flatShading: true,
        });
        for (let sh = 0; sh < 7; sh++) {
          const shardAngle = (sh / 7) * Math.PI * 2;
          const shard = new THREE.Mesh(this._boxGeo, shardMat);
          const shW = s * (0.04 + Math.random() * 0.06);
          const shH = s * (0.12 + Math.random() * 0.15);
          shard.scale.set(shW, shH, s * 0.02);
          shard.position.set(
            Math.cos(shardAngle) * s * 0.45,
            s * 1.65 + Math.sin(sh * 1.7) * s * 0.08,
            Math.sin(shardAngle) * s * 0.45,
          );
          shard.rotation.set(
            Math.random() * 0.5 - 0.25,
            shardAngle + Math.PI * 0.5,
            Math.random() * 0.8 - 0.4,
          );
          group.add(shard);
        }

        // --- Void energy particles orbiting the body ---
        const voidParticleMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.7,
        });
        for (let vp = 0; vp < 12; vp++) {
          const vpAngle = (vp / 12) * Math.PI * 2;
          const orbitR = s * (0.9 + Math.random() * 0.4);
          const particle = new THREE.Mesh(this._sphereGeo, voidParticleMat);
          particle.scale.set(s * 0.04, s * 0.04, s * 0.04);
          particle.position.set(
            Math.cos(vpAngle) * orbitR,
            s * 0.8 + Math.sin(vpAngle * 2.3) * s * 0.4,
            Math.sin(vpAngle) * orbitR,
          );
          group.add(particle);
        }

        // --- Tendrils of darkness dripping downward ---
        const dripMat = new THREE.MeshBasicMaterial({
          color: 0x0a0015,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        for (let dr = 0; dr < 6; dr++) {
          const dripAngle = (dr / 6) * Math.PI * 2;
          const drip = new THREE.Mesh(this._coneGeo, dripMat);
          drip.scale.set(s * 0.06, s * (0.4 + Math.random() * 0.3), s * 0.06);
          drip.position.set(
            Math.cos(dripAngle) * s * 0.3,
            s * 0.2 - dr * s * 0.05,
            Math.sin(dripAngle) * s * 0.3,
          );
          drip.rotation.z = Math.PI; // point downward
          group.add(drip);
        }

        // --- Tentacle barbs/spines along each tentacle ---
        const barbMat = new THREE.MeshPhongMaterial({
          color: 0x5511aa,
          emissive: 0x3300aa,
          emissiveIntensity: 0.5,
        });
        for (let tentIdx2 = 0; tentIdx2 < 8; tentIdx2++) {
          const bAngle = (tentIdx2 / 8) * Math.PI * 2;
          let bx = 0, by = s * 0.8, bz = 0;
          for (let seg2 = 0; seg2 < 5; seg2++) {
            const segL = s * 0.2;
            bx += Math.cos(bAngle) * segL * 0.7;
            bz += Math.sin(bAngle) * segL * 0.7;
            by -= segL * 0.25;
            // Barb spine on alternating sides
            if (seg2 % 2 === 0) {
              const barb = new THREE.Mesh(this._coneGeo, barbMat);
              barb.scale.set(s * 0.02, s * 0.07, s * 0.02);
              const barbOff = (seg2 % 4 === 0) ? 1 : -1;
              barb.position.set(
                bx + Math.sin(bAngle) * s * 0.05 * barbOff,
                by + s * 0.02,
                bz - Math.cos(bAngle) * s * 0.05 * barbOff,
              );
              barb.rotation.set(Math.cos(bAngle) * 0.5, 0, Math.sin(bAngle) * 0.5);
              group.add(barb);
            }
          }
        }

        // --- Suction cup discs on tentacle undersides ---
        const suctionMat = new THREE.MeshPhongMaterial({
          color: 0x3a1166,
          emissive: 0x220055,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.75,
        });
        for (let tentIdx3 = 0; tentIdx3 < 8; tentIdx3++) {
          const scAngle = (tentIdx3 / 8) * Math.PI * 2;
          let scx = 0, scy = s * 0.8, scz = 0;
          for (let seg3 = 0; seg3 < 5; seg3++) {
            const segL2 = s * 0.2;
            scx += Math.cos(scAngle) * segL2 * 0.7;
            scz += Math.sin(scAngle) * segL2 * 0.7;
            scy -= segL2 * 0.25;
            // Small flat disc (squashed sphere) on the underside
            const suction = new THREE.Mesh(this._sphereGeo, suctionMat);
            suction.scale.set(s * 0.035, s * 0.01, s * 0.035);
            suction.position.set(scx, scy - s * 0.04, scz);
            group.add(suction);
          }
        }

        // --- Secondary pharyngeal jaw ring inside the maw ---
        const innerJawMat = new THREE.MeshPhongMaterial({
          color: 0x4a0077,
          emissive: 0x6600cc,
          emissiveIntensity: 0.7,
        });
        for (let pj = 0; pj < 8; pj++) {
          const pAngle = (pj / 8) * Math.PI * 2;
          const pharynxTooth = new THREE.Mesh(this._coneGeo, innerJawMat);
          pharynxTooth.scale.set(s * 0.025, s * 0.08, s * 0.025);
          const innerR = s * 0.14;
          pharynxTooth.position.set(
            s * 0.5,
            s * 0.9 + Math.sin(pAngle) * innerR,
            Math.cos(pAngle) * innerR,
          );
          // Inward-facing — teeth point toward center of maw
          pharynxTooth.rotation.z = Math.PI * 0.5 + Math.sin(pAngle) * 0.5;
          pharynxTooth.rotation.x = -Math.cos(pAngle) * 0.5;
          group.add(pharynxTooth);
        }
        // Inner jaw ring connecting disc
        const jawRing = new THREE.Mesh(this._cylinderGeo, innerJawMat.clone());
        jawRing.material.transparent = true;
        jawRing.material.opacity = 0.5;
        jawRing.scale.set(s * 0.15, s * 0.03, s * 0.15);
        jawRing.position.set(s * 0.5, s * 0.9, 0);
        jawRing.rotation.z = Math.PI * 0.5;
        group.add(jawRing);

        // --- Pulsing veins/arteries from tentacles to central body ---
        const veinMat = new THREE.MeshPhongMaterial({
          color: 0x2a0055,
          emissive: 0x4400aa,
          emissiveIntensity: 0.45,
          transparent: true,
          opacity: 0.6,
        });
        for (let vt = 0; vt < 8; vt++) {
          const vtAngle = (vt / 8) * Math.PI * 2;
          const vein = new THREE.Mesh(this._cylinderGeo, veinMat);
          const veinLen = s * 0.4;
          vein.scale.set(s * 0.015, veinLen, s * 0.015);
          vein.position.set(
            Math.cos(vtAngle) * s * 0.3,
            s * 0.85,
            Math.sin(vtAngle) * s * 0.3,
          );
          vein.rotation.x = Math.sin(vtAngle) * 0.6;
          vein.rotation.z = Math.cos(vtAngle) * 0.6;
          group.add(vein);
          // Secondary thinner branching vein
          const veinBranch = new THREE.Mesh(this._cylinderGeo, veinMat);
          veinBranch.scale.set(s * 0.008, veinLen * 0.6, s * 0.008);
          veinBranch.position.set(
            Math.cos(vtAngle) * s * 0.38,
            s * 0.75,
            Math.sin(vtAngle) * s * 0.38,
          );
          veinBranch.rotation.x = Math.sin(vtAngle) * 0.8;
          veinBranch.rotation.z = Math.cos(vtAngle) * 0.8 + 0.3;
          group.add(veinBranch);
        }

        // --- Dimensional rift cracks — glowing tears in reality ---
        const riftMat = new THREE.MeshBasicMaterial({
          color: 0xcc66ff,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const riftGlowMat = new THREE.MeshBasicMaterial({
          color: 0xeeddff,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let rc = 0; rc < 3; rc++) {
          const riftAngle = rc * 2.1 + 0.5;
          const riftDist = s * (0.7 + rc * 0.3);
          // Main rift crack — thin elongated plane
          const riftCrack = new THREE.Mesh(this._boxGeo, riftMat);
          const riftH = s * (0.25 + Math.random() * 0.2);
          const riftW = s * (0.005 + Math.random() * 0.005);
          riftCrack.scale.set(riftW, riftH, s * 0.001);
          riftCrack.position.set(
            Math.cos(riftAngle) * riftDist,
            s * (1.0 + rc * 0.15),
            Math.sin(riftAngle) * riftDist,
          );
          riftCrack.rotation.set(
            Math.random() * 0.4 - 0.2,
            riftAngle,
            Math.random() * 0.6 - 0.3,
          );
          group.add(riftCrack);
          // Rift glow aura around the crack
          const riftAura = new THREE.Mesh(this._boxGeo, riftGlowMat);
          riftAura.scale.set(riftW * 4, riftH * 1.2, s * 0.01);
          riftAura.position.copy(riftCrack.position);
          riftAura.rotation.copy(riftCrack.rotation);
          group.add(riftAura);
          // Smaller branching fracture off the main crack
          const fracture = new THREE.Mesh(this._boxGeo, riftMat);
          fracture.scale.set(riftW, riftH * 0.5, s * 0.001);
          fracture.position.set(
            riftCrack.position.x + s * 0.05,
            riftCrack.position.y + s * 0.08,
            riftCrack.position.z + s * 0.02,
          );
          fracture.rotation.set(
            riftCrack.rotation.x + 0.4,
            riftCrack.rotation.y + 0.3,
            riftCrack.rotation.z - 0.5,
          );
          group.add(fracture);
        }

        // --- Bioluminescent pustules on body surface ---
        const pustuleMat = new THREE.MeshBasicMaterial({
          color: 0xaa44ff,
          transparent: true,
          opacity: 0.8,
        });
        const pustuleGlowMat = new THREE.MeshBasicMaterial({
          color: 0xcc88ff,
          transparent: true,
          opacity: 0.3,
        });
        for (let bp = 0; bp < 14; bp++) {
          const pTheta = Math.random() * Math.PI * 2;
          const pPhi = Math.random() * Math.PI;
          const pRadius = s * (0.55 + Math.random() * 0.15);
          const pustule = new THREE.Mesh(this._sphereGeo, pustuleMat);
          const pustSize = s * (0.02 + Math.random() * 0.025);
          pustule.scale.set(pustSize, pustSize, pustSize);
          pustule.position.set(
            Math.sin(pPhi) * Math.cos(pTheta) * pRadius,
            s * 1.0 + Math.cos(pPhi) * pRadius * 0.6,
            Math.sin(pPhi) * Math.sin(pTheta) * pRadius,
          );
          group.add(pustule);
          // Small glow halo around each pustule
          const pGlow = new THREE.Mesh(this._sphereGeo, pustuleGlowMat);
          pGlow.scale.set(pustSize * 2.5, pustSize * 2.5, pustSize * 2.5);
          pGlow.position.copy(pustule.position);
          group.add(pGlow);
        }

        // --- Shadow wake trailing behind the body ---
        const shadowMat = new THREE.MeshBasicMaterial({
          color: 0x050008,
          transparent: true,
          opacity: 0.2,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let sw = 0; sw < 5; sw++) {
          const shadowPanel = new THREE.Mesh(this._boxGeo, shadowMat.clone());
          const swLen = s * (0.4 + sw * 0.25);
          const swH = s * (0.2 + Math.random() * 0.15);
          shadowPanel.scale.set(swLen, swH, s * 0.01);
          shadowPanel.position.set(
            -s * (0.5 + sw * 0.35),
            s * (0.9 + Math.sin(sw * 1.2) * 0.15),
            Math.sin(sw * 1.5) * s * 0.2,
          );
          shadowPanel.rotation.set(0, Math.sin(sw * 0.8) * 0.3, sw * 0.05);
          // Decrease opacity further back
          (shadowPanel.material as THREE.MeshBasicMaterial).opacity = 0.2 - sw * 0.03;
          group.add(shadowPanel);
        }

        // --- Varied distortion shells (stretched/squashed, not all spheres) ---
        for (let ds = 0; ds < 4; ds++) {
          const dsDistortMat = new THREE.MeshPhongMaterial({
            color: 0x0d001a,
            emissive: enemy.glowColor,
            emissiveIntensity: 0.1 + ds * 0.05,
            transparent: true,
            opacity: 0.08,
            depthWrite: false,
            side: THREE.DoubleSide,
          });
          // Alternate between sphere and box base geometries for variety
          const dsGeo = ds % 2 === 0 ? this._sphereGeo : this._boxGeo;
          const dsShell = new THREE.Mesh(dsGeo, dsDistortMat);
          // Stretch/squash each shell differently
          const xStr = s * (1.1 + ds * 0.12) * (ds % 3 === 0 ? 1.4 : 0.8);
          const yStr = s * (1.0 + ds * 0.1) * (ds % 3 === 1 ? 1.5 : 0.7);
          const zStr = s * (1.05 + ds * 0.15) * (ds % 3 === 2 ? 1.3 : 0.9);
          dsShell.scale.set(xStr, yStr, zStr);
          dsShell.position.y = s * 1.0;
          dsShell.rotation.set(ds * 0.9, ds * 1.4 + 0.5, ds * 0.6 + 0.3);
          group.add(dsShell);
        }

        // --- Void membrane flaps between tentacle bases ---
        const membFlapMat = new THREE.MeshPhongMaterial({
          color: 0x180030,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        for (let mf = 0; mf < 8; mf++) {
          const mfAngle = (mf / 8) * Math.PI * 2;
          const mfNext = ((mf + 1) / 8) * Math.PI * 2;
          const midAngle = (mfAngle + mfNext) / 2;
          const flap = new THREE.Mesh(this._boxGeo, membFlapMat);
          flap.scale.set(s * 0.18, s * 0.12, s * 0.005);
          flap.position.set(
            Math.cos(midAngle) * s * 0.35,
            s * 0.65,
            Math.sin(midAngle) * s * 0.35,
          );
          flap.rotation.y = midAngle + Math.PI * 0.5;
          flap.rotation.x = 0.4;
          group.add(flap);
        }

        break;
      }

      case TDEnemyType.SPECTRAL_KNIGHT: {
        // === DREAD PALADIN — heavily armored ghostly warrior ===

        // --- Ghostly inner body (translucent energy core) ---
        const ghostCoreMat = new THREE.MeshPhongMaterial({
          color: 0x2244aa,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.25,
          depthWrite: false,
        });
        const ghostCore = new THREE.Mesh(this._coneGeo, ghostCoreMat);
        ghostCore.scale.set(s * 0.55, s * 1.4, s * 0.55);
        ghostCore.position.y = s * 0.5;
        group.add(ghostCore);

        // --- Massive spectral plate armor torso ---
        const armorMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.85,
          specular: 0x6688cc,
          shininess: 60,
        });
        // Chest plate
        const chestPlate = new THREE.Mesh(this._boxGeo, armorMat);
        chestPlate.scale.set(s * 0.75, s * 0.7, s * 0.9);
        chestPlate.position.set(0, s * 1.0, 0);
        group.add(chestPlate);

        // Waist armor
        const waistPlate = new THREE.Mesh(this._boxGeo, armorMat);
        waistPlate.scale.set(s * 0.65, s * 0.3, s * 0.8);
        waistPlate.position.set(0, s * 0.55, 0);
        group.add(waistPlate);

        // Armored skirt / tassets
        const tassetMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.8,
        });
        for (const zOff of [-1, 0, 1]) {
          const tasset = new THREE.Mesh(this._boxGeo, tassetMat);
          tasset.scale.set(s * 0.08, s * 0.35, s * 0.22);
          tasset.position.set(s * 0.05, s * 0.25, zOff * s * 0.3);
          tasset.rotation.x = zOff * 0.15;
          group.add(tasset);
        }

        // --- Layered pauldrons (multi-plate shoulders) ---
        const pauldronMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.9,
          specular: 0x8899cc,
          shininess: 80,
        });
        for (const side of [-1, 1]) {
          // Main pauldron dome
          const pauldron = new THREE.Mesh(this._sphereGeo, pauldronMat);
          pauldron.scale.set(s * 0.35, s * 0.2, s * 0.4);
          pauldron.position.set(0, s * 1.35, side * s * 0.6);
          group.add(pauldron);

          // Second layer plate
          const plate2 = new THREE.Mesh(this._boxGeo, pauldronMat);
          plate2.scale.set(s * 0.3, s * 0.08, s * 0.35);
          plate2.position.set(0, s * 1.25, side * s * 0.55);
          plate2.rotation.x = side * 0.2;
          group.add(plate2);

          // Third layer rim
          const plate3 = new THREE.Mesh(this._boxGeo, pauldronMat);
          plate3.scale.set(s * 0.25, s * 0.05, s * 0.3);
          plate3.position.set(0, s * 1.15, side * s * 0.5);
          plate3.rotation.x = side * 0.35;
          group.add(plate3);

          // Pauldron spike
          const spike = new THREE.Mesh(this._coneGeo, pauldronMat);
          spike.scale.set(s * 0.06, s * 0.2, s * 0.06);
          spike.position.set(0, s * 1.5, side * s * 0.6);
          group.add(spike);
        }

        // --- Great helm with T-shaped glowing visor ---
        const helmMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.9,
          specular: 0x556688,
          shininess: 70,
        });
        const helm = new THREE.Mesh(this._sphereGeo, helmMat);
        helm.scale.set(s * 0.4, s * 0.45, s * 0.4);
        helm.position.y = s * 1.6;
        group.add(helm);

        // Helm top ridge / crest base
        const helmRidge = new THREE.Mesh(this._boxGeo, helmMat);
        helmRidge.scale.set(s * 0.05, s * 0.12, s * 0.35);
        helmRidge.position.set(0, s * 1.85, 0);
        group.add(helmRidge);

        // T-visor horizontal slit (glowing blue)
        const visorMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const visorH = new THREE.Mesh(this._boxGeo, visorMat);
        visorH.scale.set(s * 0.03, s * 0.04, s * 0.3);
        visorH.position.set(s * 0.22, s * 1.65, 0);
        group.add(visorH);

        // T-visor vertical slit
        const visorV = new THREE.Mesh(this._boxGeo, visorMat);
        visorV.scale.set(s * 0.03, s * 0.15, s * 0.04);
        visorV.position.set(s * 0.22, s * 1.55, 0);
        group.add(visorV);

        // --- Spectral flame rising from helm crest ---
        const flameMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.5,
          depthWrite: false,
        });
        for (let fl = 0; fl < 5; fl++) {
          const flame = new THREE.Mesh(this._coneGeo, flameMat);
          const flH = s * (0.15 + Math.random() * 0.2);
          flame.scale.set(s * 0.04, flH, s * 0.04);
          flame.position.set(
            (Math.random() - 0.5) * s * 0.06,
            s * 1.9 + fl * s * 0.06,
            (Math.random() - 0.5) * s * 0.15,
          );
          flame.rotation.x = (Math.random() - 0.5) * 0.4;
          group.add(flame);
        }

        // --- Gauntlets with spiked knuckles ---
        const gauntletMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.85,
        });
        for (const side of [-1, 1]) {
          // Forearm
          const forearm = new THREE.Mesh(this._boxGeo, gauntletMat);
          forearm.scale.set(s * 0.15, s * 0.35, s * 0.15);
          forearm.position.set(s * 0.1, s * 0.85, side * s * 0.65);
          group.add(forearm);

          // Gauntlet fist
          const fist = new THREE.Mesh(this._boxGeo, gauntletMat);
          fist.scale.set(s * 0.14, s * 0.12, s * 0.16);
          fist.position.set(s * 0.15, s * 0.65, side * s * 0.65);
          group.add(fist);

          // Knuckle spikes
          for (let kn = 0; kn < 3; kn++) {
            const knSpike = new THREE.Mesh(this._coneGeo, gauntletMat);
            knSpike.scale.set(s * 0.025, s * 0.08, s * 0.025);
            knSpike.position.set(
              s * 0.25,
              s * 0.65,
              side * s * 0.65 + (kn - 1) * s * 0.05,
            );
            knSpike.rotation.z = -Math.PI * 0.5;
            group.add(knSpike);
          }
        }

        // --- Armored boots ---
        const bootMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.85,
        });
        for (const side of [-1, 1]) {
          const boot = new THREE.Mesh(this._boxGeo, bootMat);
          boot.scale.set(s * 0.2, s * 0.25, s * 0.18);
          boot.position.set(s * 0.05, s * 0.05, side * s * 0.2);
          group.add(boot);

          // Boot toe plate
          const toePlate = new THREE.Mesh(this._boxGeo, bootMat);
          toePlate.scale.set(s * 0.12, s * 0.08, s * 0.15);
          toePlate.position.set(s * 0.18, s * 0.0, side * s * 0.2);
          group.add(toePlate);
        }

        // --- Massive ghostly greatsword (right hand) ---
        const swordBladeMat = new THREE.MeshPhongMaterial({
          color: 0x99aacc,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.75,
          specular: 0xffffff,
          shininess: 120,
        });
        // Blade
        const blade = new THREE.Mesh(this._boxGeo, swordBladeMat);
        blade.scale.set(s * 0.06, s * 1.5, s * 0.15);
        blade.position.set(s * 0.2, s * 1.2, s * 0.7);
        blade.rotation.x = -0.2;
        group.add(blade);

        // Blade edge glow
        const bladeGlowMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        const bladeGlow = new THREE.Mesh(this._boxGeo, bladeGlowMat);
        bladeGlow.scale.set(s * 0.02, s * 1.45, s * 0.18);
        bladeGlow.position.set(s * 0.2, s * 1.2, s * 0.7);
        bladeGlow.rotation.x = -0.2;
        group.add(bladeGlow);

        // Crossguard
        const crossguardMat = new THREE.MeshPhongMaterial({
          color: 0x556677,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
        });
        const crossguard = new THREE.Mesh(this._boxGeo, crossguardMat);
        crossguard.scale.set(s * 0.04, s * 0.04, s * 0.3);
        crossguard.position.set(s * 0.2, s * 0.45, s * 0.7);
        group.add(crossguard);

        // Hilt / grip
        const hilt = new THREE.Mesh(this._boxGeo, crossguardMat);
        hilt.scale.set(s * 0.04, s * 0.25, s * 0.04);
        hilt.position.set(s * 0.2, s * 0.25, s * 0.7);
        group.add(hilt);

        // Pommel
        const pommel = new THREE.Mesh(this._sphereGeo, crossguardMat);
        pommel.scale.set(s * 0.06, s * 0.06, s * 0.06);
        pommel.position.set(s * 0.2, s * 0.12, s * 0.7);
        group.add(pommel);

        // --- Tower shield with glowing emblem (left hand) ---
        const shieldBodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.85,
          specular: 0x445566,
          shininess: 50,
          side: THREE.DoubleSide,
        });
        const towerShieldGeo = new THREE.PlaneGeometry(s * 0.9, s * 1.2, 1, 1);
        const towerShield = new THREE.Mesh(towerShieldGeo, shieldBodyMat);
        towerShield.position.set(s * 0.15, s * 0.85, -s * 0.7);
        towerShield.rotation.y = 0.25;
        group.add(towerShield);

        // Shield border
        const shieldBorderMat = new THREE.MeshPhongMaterial({
          color: 0x667788,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
        });
        // Top border
        const shieldTop = new THREE.Mesh(this._boxGeo, shieldBorderMat);
        shieldTop.scale.set(s * 0.06, s * 0.04, s * 0.9);
        shieldTop.position.set(s * 0.15, s * 1.45, -s * 0.7);
        shieldTop.rotation.y = 0.25;
        group.add(shieldTop);
        // Bottom border
        const shieldBot = new THREE.Mesh(this._boxGeo, shieldBorderMat);
        shieldBot.scale.set(s * 0.06, s * 0.04, s * 0.9);
        shieldBot.position.set(s * 0.15, s * 0.25, -s * 0.7);
        shieldBot.rotation.y = 0.25;
        group.add(shieldBot);

        // Glowing emblem on shield (diamond shape via rotated box)
        const emblemMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.7,
        });
        const emblem = new THREE.Mesh(this._boxGeo, emblemMat);
        emblem.scale.set(s * 0.03, s * 0.18, s * 0.18);
        emblem.position.set(s * 0.18, s * 0.9, -s * 0.7);
        emblem.rotation.set(0, 0.25, Math.PI * 0.25);
        group.add(emblem);

        // Emblem inner glow
        const emblemGlow = new THREE.Mesh(this._sphereGeo, emblemMat);
        emblemGlow.scale.set(s * 0.06, s * 0.06, s * 0.06);
        emblemGlow.position.set(s * 0.2, s * 0.9, -s * 0.7);
        group.add(emblemGlow);

        // --- Tattered spectral cape (overlapping transparent planes) ---
        const capeMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.3,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        for (let cp = 0; cp < 5; cp++) {
          const capeGeo = new THREE.PlaneGeometry(
            s * (0.7 - cp * 0.03),
            s * (0.9 + cp * 0.15),
          );
          const capePlane = new THREE.Mesh(capeGeo, capeMat);
          capePlane.position.set(
            -s * 0.3 - cp * s * 0.06,
            s * 0.7 - cp * s * 0.08,
            (Math.random() - 0.5) * s * 0.1,
          );
          capePlane.rotation.set(
            (Math.random() - 0.5) * 0.15,
            Math.PI * 0.5 + (Math.random() - 0.5) * 0.2,
            (Math.random() - 0.5) * 0.1,
          );
          group.add(capePlane);
        }

        // --- Chains hanging from waist ---
        const chainMat = new THREE.MeshPhongMaterial({
          color: 0x556677,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.7,
        });
        for (let ch = 0; ch < 3; ch++) {
          const chainAngle = (ch / 3) * Math.PI - Math.PI * 0.25;
          for (let link = 0; link < 4; link++) {
            const chainLink = new THREE.Mesh(this._sphereGeo, chainMat);
            chainLink.scale.set(s * 0.035, s * 0.025, s * 0.035);
            chainLink.position.set(
              Math.cos(chainAngle) * s * 0.35,
              s * 0.4 - link * s * 0.08,
              Math.sin(chainAngle) * s * 0.35 + ch * s * 0.1,
            );
            group.add(chainLink);
          }
        }

        // --- Ornamental engravings on chest plate ---
        const engravingMat = new THREE.MeshPhongMaterial({
          color: 0x8899bb,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.7,
        });
        // Chest plate horizontal engraving lines
        for (let eg = 0; eg < 3; eg++) {
          const engraveLine = new THREE.Mesh(this._boxGeo, engravingMat);
          engraveLine.scale.set(s * 0.02, s * 0.015, s * 0.55);
          engraveLine.position.set(s * 0.38, s * 0.88 + eg * s * 0.12, 0);
          group.add(engraveLine);
        }
        // Chest plate vertical center engraving
        const chestVLine = new THREE.Mesh(this._boxGeo, engravingMat);
        chestVLine.scale.set(s * 0.02, s * 0.35, s * 0.015);
        chestVLine.position.set(s * 0.38, s * 1.0, 0);
        group.add(chestVLine);
        // Chest plate diagonal cross engravings
        for (const dSide of [-1, 1]) {
          const diagLine = new THREE.Mesh(this._boxGeo, engravingMat);
          diagLine.scale.set(s * 0.02, s * 0.25, s * 0.015);
          diagLine.position.set(s * 0.38, s * 1.0, dSide * s * 0.15);
          diagLine.rotation.x = dSide * 0.4;
          group.add(diagLine);
        }

        // --- Pauldron engraving lines ---
        for (const peSide of [-1, 1]) {
          // Raised ridge line across pauldron
          const pEngrave1 = new THREE.Mesh(this._boxGeo, engravingMat);
          pEngrave1.scale.set(s * 0.015, s * 0.015, s * 0.28);
          pEngrave1.position.set(s * 0.02, s * 1.37, peSide * s * 0.6);
          group.add(pEngrave1);
          // Second parallel ridge
          const pEngrave2 = new THREE.Mesh(this._boxGeo, engravingMat);
          pEngrave2.scale.set(s * 0.015, s * 0.015, s * 0.22);
          pEngrave2.position.set(s * 0.02, s * 1.32, peSide * s * 0.58);
          group.add(pEngrave2);
          // Pauldron dot rivets
          for (let pr = 0; pr < 4; pr++) {
            const pRivet = new THREE.Mesh(this._sphereGeo, engravingMat);
            pRivet.scale.set(s * 0.018, s * 0.018, s * 0.018);
            pRivet.position.set(s * 0.02, s * 1.28, peSide * s * (0.45 + pr * 0.05));
            group.add(pRivet);
          }
        }

        // --- Heraldic crest on tower shield ---
        const crestMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.6,
        });
        const crestOuterMat = new THREE.MeshPhongMaterial({
          color: 0x7788aa,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.8,
        });
        // Shield crest outer border (large diamond)
        const crestOuterDiamond = new THREE.Mesh(this._boxGeo, crestOuterMat);
        crestOuterDiamond.scale.set(s * 0.025, s * 0.32, s * 0.32);
        crestOuterDiamond.position.set(s * 0.19, s * 0.9, -s * 0.7);
        crestOuterDiamond.rotation.set(0, 0.25, Math.PI * 0.25);
        group.add(crestOuterDiamond);
        // Top chevron of coat of arms
        const crestChevron = new THREE.Mesh(this._coneGeo, crestMat);
        crestChevron.scale.set(s * 0.1, s * 0.12, s * 0.02);
        crestChevron.position.set(s * 0.2, s * 1.02, -s * 0.7);
        group.add(crestChevron);
        // Horizontal bar across crest
        const crestBar = new THREE.Mesh(this._boxGeo, crestMat);
        crestBar.scale.set(s * 0.02, s * 0.03, s * 0.2);
        crestBar.position.set(s * 0.2, s * 0.9, -s * 0.7);
        group.add(crestBar);
        // Two small flanking shields within the crest
        for (const cs of [-1, 1]) {
          const miniShield = new THREE.Mesh(this._boxGeo, crestMat);
          miniShield.scale.set(s * 0.02, s * 0.08, s * 0.06);
          miniShield.position.set(s * 0.2, s * 0.82, -s * 0.7 + cs * s * 0.06);
          group.add(miniShield);
        }
        // Central crest circle
        const crestCircle = new THREE.Mesh(this._sphereGeo, crestMat);
        crestCircle.scale.set(s * 0.04, s * 0.04, s * 0.04);
        crestCircle.position.set(s * 0.21, s * 0.9, -s * 0.7);
        group.add(crestCircle);
        // Star points on crest
        for (let sp = 0; sp < 4; sp++) {
          const starPt = new THREE.Mesh(this._coneGeo, crestMat);
          starPt.scale.set(s * 0.015, s * 0.05, s * 0.015);
          const spAng = (sp / 4) * Math.PI * 2;
          starPt.position.set(
            s * 0.21,
            s * 0.9 + Math.sin(spAng) * s * 0.05,
            -s * 0.7 + Math.cos(spAng) * s * 0.05,
          );
          starPt.rotation.x = spAng;
          group.add(starPt);
        }

        // --- Ghostly wisps trailing from armor joints ---
        const wispMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.15,
          depthWrite: false,
        });
        // Shoulder joint wisps
        for (const wsSide of [-1, 1]) {
          for (let w = 0; w < 3; w++) {
            const wisp = new THREE.Mesh(this._sphereGeo, wispMat);
            wisp.scale.set(s * 0.04, s * (0.12 + w * 0.06), s * 0.03);
            wisp.position.set(
              -s * 0.1 - w * s * 0.05,
              s * 1.2 - w * s * 0.1,
              wsSide * s * 0.6,
            );
            wisp.rotation.z = -0.3 - w * 0.15;
            group.add(wisp);
          }
        }
        // Elbow wisps
        for (const ewSide of [-1, 1]) {
          for (let w = 0; w < 2; w++) {
            const elbowWisp = new THREE.Mesh(this._sphereGeo, wispMat);
            elbowWisp.scale.set(s * 0.03, s * (0.1 + w * 0.05), s * 0.025);
            elbowWisp.position.set(
              s * 0.05 - w * s * 0.04,
              s * 0.78 - w * s * 0.08,
              ewSide * s * 0.65,
            );
            elbowWisp.rotation.z = -0.2;
            group.add(elbowWisp);
          }
        }
        // Waist wisps trailing downward
        for (let ww = 0; ww < 4; ww++) {
          const waistWisp = new THREE.Mesh(this._sphereGeo, wispMat);
          waistWisp.scale.set(s * 0.035, s * (0.15 + ww * 0.05), s * 0.03);
          const wwAng = (ww / 4) * Math.PI - Math.PI * 0.25;
          waistWisp.position.set(
            -s * 0.15 - ww * s * 0.04,
            s * 0.35 - ww * s * 0.06,
            Math.sin(wwAng) * s * 0.4,
          );
          waistWisp.rotation.z = -0.4;
          group.add(waistWisp);
        }
        // Knee joint wisps
        for (const kwSide of [-1, 1]) {
          const kneeWisp = new THREE.Mesh(this._sphereGeo, wispMat);
          kneeWisp.scale.set(s * 0.03, s * 0.1, s * 0.025);
          kneeWisp.position.set(-s * 0.05, s * 0.1, kwSide * s * 0.2);
          kneeWisp.rotation.z = -0.3;
          group.add(kneeWisp);
        }

        // --- Greatsword blade detail: fuller groove ---
        const fullerMat = new THREE.MeshPhongMaterial({
          color: 0x667799,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.6,
        });
        const fuller = new THREE.Mesh(this._boxGeo, fullerMat);
        fuller.scale.set(s * 0.015, s * 1.2, s * 0.04);
        fuller.position.set(s * 0.2, s * 1.3, s * 0.7);
        fuller.rotation.x = -0.2;
        group.add(fuller);

        // Blood channel (thin dark line on opposite side)
        const bloodChannelMat = new THREE.MeshPhongMaterial({
          color: 0x331122,
          emissive: 0x440011,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.7,
        });
        const bloodChannel = new THREE.Mesh(this._boxGeo, bloodChannelMat);
        bloodChannel.scale.set(s * 0.01, s * 1.0, s * 0.02);
        bloodChannel.position.set(s * 0.2, s * 1.35, s * 0.72);
        bloodChannel.rotation.x = -0.2;
        group.add(bloodChannel);

        // Rune inscriptions along blade
        const runeInscMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.55,
        });
        for (let ri = 0; ri < 6; ri++) {
          const runeGlyph = new THREE.Mesh(this._boxGeo, runeInscMat);
          runeGlyph.scale.set(s * 0.012, s * 0.03, s * 0.06);
          runeGlyph.position.set(
            s * 0.22,
            s * 0.7 + ri * s * 0.18,
            s * 0.7,
          );
          runeGlyph.rotation.x = -0.2;
          group.add(runeGlyph);
          // Rune cross-mark
          const runeCross = new THREE.Mesh(this._boxGeo, runeInscMat);
          runeCross.scale.set(s * 0.012, s * 0.015, s * 0.04);
          runeCross.position.set(
            s * 0.22,
            s * 0.71 + ri * s * 0.18,
            s * 0.7,
          );
          runeCross.rotation.set(-0.2, 0, Math.PI * 0.25);
          group.add(runeCross);
        }

        // --- Tattered banner/pennant from back of armor ---
        const bannerMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.08,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        // Banner pole
        const bannerPole = new THREE.Mesh(this._boxGeo, gauntletMat);
        bannerPole.scale.set(s * 0.02, s * 0.8, s * 0.02);
        bannerPole.position.set(-s * 0.35, s * 1.6, 0);
        bannerPole.rotation.z = 0.15;
        group.add(bannerPole);
        // Banner pole top finial
        const poleFinial = new THREE.Mesh(this._sphereGeo, gauntletMat);
        poleFinial.scale.set(s * 0.035, s * 0.035, s * 0.035);
        poleFinial.position.set(-s * 0.41, s * 2.0, 0);
        group.add(poleFinial);
        // Banner cloth strips (tattered)
        for (let bn = 0; bn < 5; bn++) {
          const bannerGeo = new THREE.PlaneGeometry(
            s * (0.22 - bn * 0.02),
            s * (0.35 + bn * 0.08),
          );
          const bannerStrip = new THREE.Mesh(bannerGeo, bannerMat);
          bannerStrip.position.set(
            -s * 0.42 - bn * s * 0.02,
            s * 1.7 - bn * s * 0.12,
            -s * 0.08 + bn * s * 0.04,
          );
          bannerStrip.rotation.set(
            (Math.random() - 0.5) * 0.15,
            Math.PI * 0.5 + (Math.random() - 0.5) * 0.15,
            0.1 + bn * 0.05,
          );
          group.add(bannerStrip);
        }
        // Banner emblem (small glowing mark on banner)
        const bannerEmblem = new THREE.Mesh(this._boxGeo, runeInscMat);
        bannerEmblem.scale.set(s * 0.01, s * 0.06, s * 0.06);
        bannerEmblem.position.set(-s * 0.44, s * 1.65, 0);
        bannerEmblem.rotation.set(0, 0, Math.PI * 0.25);
        group.add(bannerEmblem);

        // --- Knee guards and greaves with rivets ---
        const greaveMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.88,
          specular: 0x667788,
          shininess: 65,
        });
        for (const grvSide of [-1, 1]) {
          // Knee guard plate
          const kneeGuard = new THREE.Mesh(this._boxGeo, greaveMat);
          kneeGuard.scale.set(s * 0.18, s * 0.12, s * 0.2);
          kneeGuard.position.set(s * 0.12, s * 0.22, grvSide * s * 0.2);
          group.add(kneeGuard);
          // Knee guard boss (raised center)
          const kneeBoss = new THREE.Mesh(this._sphereGeo, greaveMat);
          kneeBoss.scale.set(s * 0.06, s * 0.06, s * 0.06);
          kneeBoss.position.set(s * 0.2, s * 0.22, grvSide * s * 0.2);
          group.add(kneeBoss);
          // Greave shin plate
          const greavePlate = new THREE.Mesh(this._boxGeo, greaveMat);
          greavePlate.scale.set(s * 0.14, s * 0.22, s * 0.16);
          greavePlate.position.set(s * 0.1, s * 0.12, grvSide * s * 0.2);
          group.add(greavePlate);
          // Greave edge trim
          const greaveTrim = new THREE.Mesh(this._boxGeo, engravingMat);
          greaveTrim.scale.set(s * 0.015, s * 0.24, s * 0.01);
          greaveTrim.position.set(s * 0.18, s * 0.12, grvSide * s * 0.2);
          group.add(greaveTrim);
          // Rivets on knee guard and greaves
          for (let rv = 0; rv < 3; rv++) {
            const grvRivet = new THREE.Mesh(this._sphereGeo, engravingMat);
            grvRivet.scale.set(s * 0.012, s * 0.012, s * 0.012);
            grvRivet.position.set(
              s * 0.19,
              s * 0.08 + rv * s * 0.07,
              grvSide * s * (0.14 + rv * 0.02),
            );
            group.add(grvRivet);
          }
          // Inner greave rivets
          for (let rv2 = 0; rv2 < 2; rv2++) {
            const rivetInner = new THREE.Mesh(this._sphereGeo, engravingMat);
            rivetInner.scale.set(s * 0.01, s * 0.01, s * 0.01);
            rivetInner.position.set(
              s * 0.17,
              s * 0.26 + rv2 * s * 0.05,
              grvSide * s * 0.2,
            );
            group.add(rivetInner);
          }
        }

        // --- Belt with pouches and skull trophy ---
        const beltMat = new THREE.MeshPhongMaterial({
          color: 0x443322,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.05,
          transparent: true,
          opacity: 0.8,
        });
        // Main belt band
        const beltBand = new THREE.Mesh(this._boxGeo, beltMat);
        beltBand.scale.set(s * 0.68, s * 0.06, s * 0.82);
        beltBand.position.set(0, s * 0.52, 0);
        group.add(beltBand);
        // Belt buckle
        const buckleMat = new THREE.MeshPhongMaterial({
          color: 0x888888,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
          specular: 0xaaaaaa,
          shininess: 90,
        });
        const beltBuckle = new THREE.Mesh(this._boxGeo, buckleMat);
        beltBuckle.scale.set(s * 0.06, s * 0.06, s * 0.08);
        beltBuckle.position.set(s * 0.35, s * 0.52, 0);
        group.add(beltBuckle);
        // Pouches on belt
        for (let pouch = 0; pouch < 2; pouch++) {
          const pouchMesh = new THREE.Mesh(this._boxGeo, beltMat);
          pouchMesh.scale.set(s * 0.07, s * 0.08, s * 0.06);
          pouchMesh.position.set(
            s * 0.2,
            s * 0.45,
            s * (0.2 + pouch * 0.2),
          );
          group.add(pouchMesh);
          // Pouch flap
          const flapMesh = new THREE.Mesh(this._boxGeo, beltMat);
          flapMesh.scale.set(s * 0.075, s * 0.02, s * 0.065);
          flapMesh.position.set(
            s * 0.2,
            s * 0.5,
            s * (0.2 + pouch * 0.2),
          );
          group.add(flapMesh);
        }
        // Hanging skull trophy
        const skullTrophyMat = new THREE.MeshPhongMaterial({
          color: 0xccbb99,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.8,
        });
        // Skull chain attachment
        const skullChainLink = new THREE.Mesh(this._boxGeo, chainMat);
        skullChainLink.scale.set(s * 0.015, s * 0.1, s * 0.015);
        skullChainLink.position.set(s * 0.15, s * 0.4, -s * 0.35);
        group.add(skullChainLink);
        // Skull cranium
        const skullHead = new THREE.Mesh(this._sphereGeo, skullTrophyMat);
        skullHead.scale.set(s * 0.06, s * 0.07, s * 0.06);
        skullHead.position.set(s * 0.15, s * 0.3, -s * 0.35);
        group.add(skullHead);
        // Skull jaw
        const skullJaw = new THREE.Mesh(this._boxGeo, skullTrophyMat);
        skullJaw.scale.set(s * 0.04, s * 0.025, s * 0.05);
        skullJaw.position.set(s * 0.18, s * 0.27, -s * 0.35);
        group.add(skullJaw);
        // Skull eye sockets
        for (const es of [-1, 1]) {
          const skullEye = new THREE.Mesh(this._sphereGeo, visorMat);
          skullEye.scale.set(s * 0.012, s * 0.015, s * 0.012);
          skullEye.position.set(s * 0.19, s * 0.31, -s * 0.35 + es * s * 0.02);
          group.add(skullEye);
        }

        // --- Helm detail: breathing holes, visor rivets, neck gorget ---
        // Breathing holes on helm front left section
        for (let bh = 0; bh < 5; bh++) {
          const breathHoleL = new THREE.Mesh(this._sphereGeo, visorMat);
          breathHoleL.scale.set(s * 0.01, s * 0.01, s * 0.01);
          breathHoleL.position.set(
            s * 0.22,
            s * 1.48 + bh * s * 0.02,
            s * (-0.08 + bh * 0.04),
          );
          group.add(breathHoleL);
        }
        // Breathing holes on helm front right section
        for (let bh2 = 0; bh2 < 5; bh2++) {
          const breathHoleR = new THREE.Mesh(this._sphereGeo, visorMat);
          breathHoleR.scale.set(s * 0.01, s * 0.01, s * 0.01);
          breathHoleR.position.set(
            s * 0.22,
            s * 1.48 + bh2 * s * 0.02,
            -s * (-0.08 + bh2 * 0.04),
          );
          group.add(breathHoleR);
        }
        // Visor rivets along the T-visor edges
        const rivetMat = new THREE.MeshPhongMaterial({
          color: 0x777788,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          specular: 0x999999,
          shininess: 80,
        });
        // Rivets along horizontal visor slit
        for (let vr = 0; vr < 6; vr++) {
          const visorRivetH = new THREE.Mesh(this._sphereGeo, rivetMat);
          visorRivetH.scale.set(s * 0.012, s * 0.012, s * 0.012);
          visorRivetH.position.set(
            s * 0.24,
            s * 1.66,
            s * (-0.12 + vr * 0.048),
          );
          group.add(visorRivetH);
        }
        // Rivets along vertical visor slit
        for (let vr2 = 0; vr2 < 4; vr2++) {
          const visorRivetVL = new THREE.Mesh(this._sphereGeo, rivetMat);
          visorRivetVL.scale.set(s * 0.012, s * 0.012, s * 0.012);
          visorRivetVL.position.set(
            s * 0.24,
            s * 1.5 + vr2 * s * 0.04,
            s * 0.025,
          );
          group.add(visorRivetVL);
          const visorRivetVR = new THREE.Mesh(this._sphereGeo, rivetMat);
          visorRivetVR.scale.set(s * 0.012, s * 0.012, s * 0.012);
          visorRivetVR.position.set(
            s * 0.24,
            s * 1.5 + vr2 * s * 0.04,
            -s * 0.025,
          );
          group.add(visorRivetVR);
        }
        // Neck gorget (armored collar below helm)
        const gorgetMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.18,
          transparent: true,
          opacity: 0.88,
          specular: 0x667788,
          shininess: 60,
        });
        // Main gorget ring
        const gorgetRing = new THREE.Mesh(this._boxGeo, gorgetMat);
        gorgetRing.scale.set(s * 0.42, s * 0.1, s * 0.42);
        gorgetRing.position.set(0, s * 1.38, 0);
        group.add(gorgetRing);
        // Gorget front raised plate
        const gorgetFront = new THREE.Mesh(this._boxGeo, gorgetMat);
        gorgetFront.scale.set(s * 0.15, s * 0.12, s * 0.35);
        gorgetFront.position.set(s * 0.22, s * 1.38, 0);
        group.add(gorgetFront);
        // Gorget overlap plates
        for (let gp = 0; gp < 3; gp++) {
          const gorgetPlate = new THREE.Mesh(this._boxGeo, gorgetMat);
          gorgetPlate.scale.set(s * 0.38 - gp * s * 0.04, s * 0.03, s * 0.38 - gp * s * 0.04);
          gorgetPlate.position.set(0, s * 1.34 - gp * s * 0.035, 0);
          group.add(gorgetPlate);
        }
        // Gorget rivets
        for (let gr = 0; gr < 6; gr++) {
          const gAngle = (gr / 6) * Math.PI * 2;
          const gorgetRivet = new THREE.Mesh(this._sphereGeo, rivetMat);
          gorgetRivet.scale.set(s * 0.01, s * 0.01, s * 0.01);
          gorgetRivet.position.set(
            Math.cos(gAngle) * s * 0.2,
            s * 1.38,
            Math.sin(gAngle) * s * 0.2,
          );
          group.add(gorgetRivet);
        }
        break;
      }

      case TDEnemyType.ARCANE_ORB: {
        // Eldritch Eye Cluster — horrifying floating mass of fused eyeballs
        const fleshMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
          flatShading: true,
        });
        const veinMat = new THREE.MeshBasicMaterial({
          color: 0xcc44aa,
          transparent: true,
          opacity: 0.6,
        });
        const arcaneMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.4,
          depthWrite: false,
        });

        // === Central fleshy mass ===
        const massCore = new THREE.Mesh(this._sphereGeo, fleshMat);
        massCore.scale.set(s * 0.7, s * 0.6, s * 0.65);
        group.add(massCore);
        // Lumpy irregular surface — additional overlapping spheres
        for (let i = 0; i < 6; i++) {
          const lump = new THREE.Mesh(this._sphereGeo, fleshMat.clone());
          const lAngle = (i / 6) * Math.PI * 2;
          lump.scale.set(s * 0.25, s * 0.2, s * 0.25);
          lump.position.set(
            Math.cos(lAngle) * s * 0.35,
            (Math.random() - 0.4) * s * 0.3,
            Math.sin(lAngle) * s * 0.35,
          );
          group.add(lump);
        }

        // === Central massive eye with slit pupil ===
        // Eyeball
        const centralEyeWhite = new THREE.Mesh(this._sphereGeo, new THREE.MeshPhongMaterial({
          color: 0xeeeedd,
          specular: 0xffffff,
          shininess: 80,
        }));
        centralEyeWhite.scale.set(s * 0.4, s * 0.38, s * 0.35);
        centralEyeWhite.position.set(s * 0.35, s * 0.05, 0);
        group.add(centralEyeWhite);
        // Iris
        const irisMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const iris = new THREE.Mesh(this._sphereGeo, irisMat);
        iris.scale.set(s * 0.22, s * 0.22, s * 0.08);
        iris.position.set(s * 0.55, s * 0.05, 0);
        group.add(iris);
        // Slit pupil (vertical thin box)
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const pupil = new THREE.Mesh(this._boxGeo, pupilMat);
        pupil.scale.set(s * 0.02, s * 0.2, s * 0.04);
        pupil.position.set(s * 0.6, s * 0.05, 0);
        group.add(pupil);
        // Eyelid ridges — fleshy folds above and below
        for (const yDir of [-1, 1]) {
          const lid = new THREE.Mesh(this._sphereGeo, fleshMat.clone());
          lid.scale.set(s * 0.42, s * 0.08, s * 0.38);
          lid.position.set(s * 0.35, s * 0.05 + yDir * s * 0.25, 0);
          group.add(lid);
        }

        // === Surrounding smaller eyes — different sizes, looking in different directions ===
        const smallEyePositions = [
          { x: 0.1, y: 0.55, z: 0.3, size: 0.15, lookX: -0.3, lookY: 0.5 },
          { x: -0.2, y: 0.45, z: -0.25, size: 0.12, lookX: -0.5, lookY: 0.3 },
          { x: 0.4, y: 0.4, z: 0.35, size: 0.1, lookX: 0.6, lookY: 0.2 },
          { x: -0.35, y: 0.1, z: 0.4, size: 0.13, lookX: -0.4, lookY: -0.2 },
          { x: 0.15, y: -0.35, z: 0.3, size: 0.11, lookX: 0.2, lookY: -0.6 },
          { x: -0.3, y: -0.25, z: -0.35, size: 0.14, lookX: -0.3, lookY: -0.4 },
          { x: 0.5, y: 0.25, z: -0.2, size: 0.09, lookX: 0.7, lookY: 0.1 },
          { x: -0.1, y: 0.5, z: -0.4, size: 0.1, lookX: 0.0, lookY: 0.6 },
          { x: 0.3, y: -0.2, z: -0.35, size: 0.12, lookX: 0.4, lookY: -0.3 },
          { x: -0.4, y: -0.1, z: 0.15, size: 0.08, lookX: -0.6, lookY: 0.0 },
        ];
        for (const ep of smallEyePositions) {
          // Eyeball
          const sEye = new THREE.Mesh(this._sphereGeo, new THREE.MeshPhongMaterial({
            color: 0xddddcc,
            specular: 0xaaaaaa,
            shininess: 60,
          }));
          sEye.scale.set(s * ep.size, s * ep.size, s * ep.size * 0.9);
          sEye.position.set(s * ep.x, s * ep.y, s * ep.z);
          group.add(sEye);
          // Iris — each eye looks a slightly different direction
          const sIris = new THREE.Mesh(this._sphereGeo, irisMat.clone());
          const irisSize = ep.size * 0.55;
          sIris.scale.set(s * irisSize, s * irisSize, s * irisSize * 0.5);
          sIris.position.set(
            s * ep.x + s * ep.lookX * ep.size * 0.5,
            s * ep.y + s * ep.lookY * ep.size * 0.5,
            s * ep.z,
          );
          group.add(sIris);
          // Pupil dot
          const sPupil = new THREE.Mesh(this._sphereGeo, pupilMat);
          const pupilSize = ep.size * 0.2;
          sPupil.scale.set(s * pupilSize, s * pupilSize, s * pupilSize);
          sPupil.position.set(
            s * ep.x + s * ep.lookX * ep.size * 0.6,
            s * ep.y + s * ep.lookY * ep.size * 0.6,
            s * ep.z,
          );
          group.add(sPupil);
        }

        // === Pulsing arcane tendrils/veins connecting eyes ===
        const tendrilPairs = [
          [0, 1], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [0, 2], [8, 9],
        ];
        for (const [a, b] of tendrilPairs) {
          const ea = smallEyePositions[a];
          const eb = smallEyePositions[b];
          const tendril = new THREE.Mesh(this._boxGeo, veinMat.clone());
          const dx = eb.x - ea.x;
          const dy = eb.y - ea.y;
          const dz = eb.z - ea.z;
          const len = Math.sqrt(dx * dx + dy * dy + dz * dz);
          tendril.scale.set(s * len * 0.5, s * 0.015, s * 0.015);
          tendril.position.set(
            s * (ea.x + eb.x) / 2,
            s * (ea.y + eb.y) / 2,
            s * (ea.z + eb.z) / 2,
          );
          tendril.lookAt(new THREE.Vector3(s * eb.x, s * eb.y, s * eb.z));
          group.add(tendril);
        }

        // === Arcane energy crackling between eyes (glowing arcs) ===
        const arcaneRing = new THREE.Mesh(new THREE.TorusGeometry(s * 0.55, s * 0.02, 6, 16), arcaneMat);
        arcaneRing.rotation.x = Math.PI / 4;
        arcaneRing.name = "ring";
        group.add(arcaneRing);
        // Smaller energy arc
        const arcaneRing2 = new THREE.Mesh(new THREE.TorusGeometry(s * 0.4, s * 0.015, 6, 12), arcaneMat.clone());
        arcaneRing2.rotation.z = Math.PI / 3;
        arcaneRing2.rotation.x = -Math.PI / 6;
        arcaneRing2.name = "ring2";
        group.add(arcaneRing2);
        // Crackling energy sparks
        for (let i = 0; i < 6; i++) {
          const spark = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({
            color: enemy.glowColor,
            transparent: true,
            opacity: 0.6,
            depthWrite: false,
          }));
          const spAngle = (i / 6) * Math.PI * 2;
          spark.scale.set(s * 0.12, s * 0.005, s * 0.005);
          spark.position.set(
            Math.cos(spAngle) * s * 0.5,
            Math.sin(spAngle) * s * 0.3,
            Math.sin(spAngle + 1.0) * s * 0.4,
          );
          spark.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
          group.add(spark);
        }

        // === Hanging tentacles below ===
        const tentacleMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.1,
          flatShading: true,
        });
        for (let t = 0; t < 7; t++) {
          const tAngle = (t / 7) * Math.PI * 2;
          const tRadius = s * (0.15 + Math.random() * 0.2);
          const tentSegments = 4 + Math.floor(Math.random() * 3);
          for (let seg = 0; seg < tentSegments; seg++) {
            const tentSeg = new THREE.Mesh(this._sphereGeo, tentacleMat.clone());
            const taper = 1.0 - seg * 0.2;
            tentSeg.scale.set(s * 0.06 * taper, s * 0.1, s * 0.06 * taper);
            tentSeg.position.set(
              Math.cos(tAngle) * tRadius + Math.sin(seg * 0.4) * s * 0.05,
              -s * 0.4 - seg * s * 0.18,
              Math.sin(tAngle) * tRadius + Math.cos(seg * 0.3) * s * 0.05,
            );
            group.add(tentSeg);
          }
          // Tentacle tip — glowing sucker
          const tipGlow = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: enemy.glowColor,
            transparent: true,
            opacity: 0.5,
            depthWrite: false,
          }));
          tipGlow.scale.set(s * 0.03, s * 0.03, s * 0.03);
          tipGlow.position.set(
            Math.cos(tAngle) * tRadius,
            -s * 0.4 - tentSegments * s * 0.18,
            Math.sin(tAngle) * tRadius,
          );
          group.add(tipGlow);
        }

        // === Outer aura — unsettling translucent shell ===
        const auraMat = new THREE.MeshPhongMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.08,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const aura = new THREE.Mesh(this._sphereGeo, auraMat);
        aura.scale.set(s * 1.0, s * 0.9, s * 0.95);
        group.add(aura);

        // --- Eyelid details on the main eye ---
        const eyelidMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.08,
          flatShading: true,
        });
        // Upper eyelid — thick curved flesh fold over the main eye
        const upperLid = new THREE.Mesh(this._sphereGeo, eyelidMat);
        upperLid.scale.set(s * 0.45, s * 0.12, s * 0.4);
        upperLid.position.set(s * 0.35, s * 0.25, 0);
        group.add(upperLid);
        // Lower eyelid
        const lowerLid = new THREE.Mesh(this._sphereGeo, eyelidMat.clone());
        lowerLid.scale.set(s * 0.43, s * 0.1, s * 0.38);
        lowerLid.position.set(s * 0.35, s * -0.15, 0);
        group.add(lowerLid);
        // Inner eyelid crease — darker shadow line
        const lidCreaseMat = new THREE.MeshPhongMaterial({
          color: 0x442233,
          emissive: 0x110011,
          emissiveIntensity: 0.1,
        });
        const upperCrease = new THREE.Mesh(this._boxGeo, lidCreaseMat);
        upperCrease.scale.set(s * 0.4, s * 0.015, s * 0.35);
        upperCrease.position.set(s * 0.35, s * 0.32, 0);
        group.add(upperCrease);
        const lowerCrease = new THREE.Mesh(this._boxGeo, lidCreaseMat.clone());
        lowerCrease.scale.set(s * 0.38, s * 0.012, s * 0.33);
        lowerCrease.position.set(s * 0.35, s * -0.21, 0);
        group.add(lowerCrease);
        // Eyelids on selected smaller eyes (indices 0, 2, 5, 7)
        const lidSmallEyeIndices = [0, 2, 5, 7];
        for (const lei of lidSmallEyeIndices) {
          const sep = smallEyePositions[lei];
          const sLidUp = new THREE.Mesh(this._sphereGeo, eyelidMat.clone());
          sLidUp.scale.set(s * sep.size * 1.1, s * sep.size * 0.3, s * sep.size * 1.1);
          sLidUp.position.set(s * sep.x, s * sep.y + s * sep.size * 0.7, s * sep.z);
          group.add(sLidUp);
          const sLidLo = new THREE.Mesh(this._sphereGeo, eyelidMat.clone());
          sLidLo.scale.set(s * sep.size * 1.05, s * sep.size * 0.25, s * sep.size * 1.05);
          sLidLo.position.set(s * sep.x, s * sep.y - s * sep.size * 0.65, s * sep.z);
          group.add(sLidLo);
        }

        // --- Bloodshot veins on some smaller eyes ---
        const bloodshotMat = new THREE.MeshBasicMaterial({
          color: 0xcc2222,
          transparent: true,
          opacity: 0.55,
        });
        const bloodshotEyes = [1, 3, 6, 8];
        for (const bi of bloodshotEyes) {
          const bep = smallEyePositions[bi];
          // Radial red vein lines on the eyeball surface
          for (let bv = 0; bv < 5; bv++) {
            const bvAngle = (bv / 5) * Math.PI * 2 + bi * 0.3;
            const bVein = new THREE.Mesh(this._boxGeo, bloodshotMat.clone());
            bVein.scale.set(s * bep.size * 0.6, s * 0.005, s * 0.005);
            bVein.position.set(
              s * bep.x + Math.cos(bvAngle) * s * bep.size * 0.3,
              s * bep.y + Math.sin(bvAngle) * s * bep.size * 0.3,
              s * bep.z + s * bep.size * 0.4,
            );
            bVein.rotation.z = bvAngle;
            group.add(bVein);
          }
        }
        // Half-closed eyes (drooping upper lids covering eye partially)
        const halfClosedEyes = [4, 9];
        for (const hci of halfClosedEyes) {
          const hep = smallEyePositions[hci];
          const droopLid = new THREE.Mesh(this._sphereGeo, eyelidMat.clone());
          droopLid.scale.set(s * hep.size * 1.2, s * hep.size * 0.7, s * hep.size * 1.15);
          droopLid.position.set(s * hep.x, s * hep.y + s * hep.size * 0.15, s * hep.z);
          group.add(droopLid);
        }

        // --- Pulsing iris detail on the main eye: concentric ring patterns ---
        const irisRingMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
        });
        for (let ir = 0; ir < 4; ir++) {
          const irisRingGeo = new THREE.TorusGeometry(s * (0.05 + ir * 0.04), s * 0.005, 6, 16);
          const irisRingMesh = new THREE.Mesh(irisRingGeo, irisRingMat.clone());
          irisRingMesh.position.set(s * 0.56, s * 0.05, 0);
          irisRingMesh.rotation.y = Math.PI / 2;
          group.add(irisRingMesh);
        }
        // Iris color variation — inner bright spot
        const irisBrightMat = new THREE.MeshBasicMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.2,
        });
        const irisBright = new THREE.Mesh(this._sphereGeo, irisBrightMat);
        irisBright.scale.set(s * 0.06, s * 0.06, s * 0.03);
        irisBright.position.set(s * 0.58, s * 0.08, s * 0.03);
        group.add(irisBright);

        // --- Drool / slime strands hanging between tentacles ---
        const slimeMat = new THREE.MeshPhongMaterial({
          color: 0x88aa77,
          emissive: 0x223311,
          emissiveIntensity: 0.1,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        // Slime strands between adjacent tentacle positions
        for (let sd = 0; sd < 6; sd++) {
          const sdAngle1 = (sd / 7) * Math.PI * 2;
          const sdAngle2 = ((sd + 1) / 7) * Math.PI * 2;
          const slimeStrand = new THREE.Mesh(this._boxGeo, slimeMat.clone());
          const sdMidX = (Math.cos(sdAngle1) + Math.cos(sdAngle2)) * s * 0.12;
          const sdMidZ = (Math.sin(sdAngle1) + Math.sin(sdAngle2)) * s * 0.12;
          slimeStrand.scale.set(s * 0.008, s * 0.25, s * 0.008);
          slimeStrand.position.set(sdMidX, -s * 0.55, sdMidZ);
          slimeStrand.rotation.z = (sd - 3) * 0.08;
          group.add(slimeStrand);
          // Secondary thinner drip
          const thinDrip = new THREE.Mesh(this._boxGeo, slimeMat.clone());
          thinDrip.scale.set(s * 0.004, s * 0.18, s * 0.004);
          thinDrip.position.set(sdMidX + s * 0.02, -s * 0.65, sdMidZ - s * 0.01);
          group.add(thinDrip);
        }
        // Drool drops at strand ends
        for (let dd = 0; dd < 4; dd++) {
          const ddAngle = (dd / 4) * Math.PI * 2 + 0.5;
          const droolDrop = new THREE.Mesh(this._sphereGeo, slimeMat.clone());
          droolDrop.scale.set(s * 0.015, s * 0.02, s * 0.015);
          droolDrop.position.set(
            Math.cos(ddAngle) * s * 0.18,
            -s * 0.82,
            Math.sin(ddAngle) * s * 0.18,
          );
          group.add(droolDrop);
        }

        // --- Pustules and warts on the fleshy central mass ---
        const pustuleMat = new THREE.MeshPhongMaterial({
          color: 0xbb8866,
          emissive: 0x331100,
          emissiveIntensity: 0.15,
          flatShading: true,
        });
        const pustulePositions = [
          { x: -0.3, y: 0.2, z: 0.35, sz: 0.05 },
          { x: -0.15, y: -0.25, z: 0.4, sz: 0.04 },
          { x: 0.2, y: 0.35, z: -0.3, sz: 0.06 },
          { x: -0.4, y: 0.0, z: -0.2, sz: 0.035 },
          { x: 0.0, y: -0.3, z: -0.35, sz: 0.045 },
          { x: -0.25, y: 0.35, z: -0.15, sz: 0.04 },
          { x: 0.3, y: -0.15, z: 0.25, sz: 0.05 },
          { x: -0.1, y: -0.35, z: 0.2, sz: 0.03 },
          { x: 0.15, y: 0.4, z: 0.2, sz: 0.035 },
          { x: -0.35, y: -0.15, z: -0.3, sz: 0.045 },
          { x: 0.25, y: 0.1, z: -0.4, sz: 0.04 },
          { x: -0.2, y: 0.3, z: 0.4, sz: 0.03 },
        ];
        for (const pp of pustulePositions) {
          const pustule = new THREE.Mesh(this._sphereGeo, pustuleMat.clone());
          pustule.scale.set(s * pp.sz, s * pp.sz * 0.8, s * pp.sz);
          pustule.position.set(s * pp.x, s * pp.y, s * pp.z);
          group.add(pustule);
          // Highlight sheen on top of pustule
          const pustuleSheen = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
            color: 0xffddbb,
            transparent: true,
            opacity: 0.15,
          }));
          pustuleSheen.scale.set(s * pp.sz * 0.5, s * pp.sz * 0.4, s * pp.sz * 0.5);
          pustuleSheen.position.set(s * pp.x, s * pp.y + s * pp.sz * 0.3, s * pp.z);
          group.add(pustuleSheen);
        }

        // --- Nerve endings visible on the surface ---
        const nerveMat = new THREE.MeshBasicMaterial({
          color: 0xdd6688,
          transparent: true,
          opacity: 0.4,
        });
        // Main nerve trunk lines
        const nerveTrunks = [
          { sx: -0.2, sy: 0.4, sz: 0.3, ex: -0.5, ey: -0.1, ez: 0.25 },
          { sx: 0.1, sy: 0.35, sz: -0.35, ex: -0.2, ey: -0.2, ez: -0.4 },
          { sx: -0.35, sy: 0.15, sz: -0.2, ex: -0.4, ey: -0.3, ez: 0.1 },
          { sx: 0.2, sy: -0.1, sz: 0.4, ex: -0.1, ey: -0.35, ez: 0.35 },
        ];
        for (const nt of nerveTrunks) {
          const ntDx = nt.ex - nt.sx;
          const ntDy = nt.ey - nt.sy;
          const ntDz = nt.ez - nt.sz;
          const ntLen = Math.sqrt(ntDx * ntDx + ntDy * ntDy + ntDz * ntDz);
          const trunk = new THREE.Mesh(this._boxGeo, nerveMat.clone());
          trunk.scale.set(s * ntLen * 0.5, s * 0.008, s * 0.008);
          trunk.position.set(
            s * (nt.sx + nt.ex) / 2,
            s * (nt.sy + nt.ey) / 2,
            s * (nt.sz + nt.ez) / 2,
          );
          trunk.lookAt(new THREE.Vector3(s * nt.ex, s * nt.ey, s * nt.ez));
          group.add(trunk);
          // Branch endings off each trunk
          for (let nb = 0; nb < 3; nb++) {
            const branchFrac = 0.3 + nb * 0.25;
            const nerveBranch = new THREE.Mesh(this._boxGeo, nerveMat.clone());
            nerveBranch.scale.set(s * 0.06, s * 0.005, s * 0.005);
            nerveBranch.position.set(
              s * (nt.sx + ntDx * branchFrac),
              s * (nt.sy + ntDy * branchFrac),
              s * (nt.sz + ntDz * branchFrac + 0.03),
            );
            nerveBranch.rotation.z = nb * 0.8 - 0.8;
            group.add(nerveBranch);
          }
        }

        // --- A mouth hidden among the eyes: lipless gash with teeth ---
        const mouthMat = new THREE.MeshPhongMaterial({
          color: 0x220a0a,
          emissive: 0x110000,
          emissiveIntensity: 0.2,
        });
        // Dark gash opening
        const mouthGash = new THREE.Mesh(this._boxGeo, mouthMat);
        mouthGash.scale.set(s * 0.15, s * 0.04, s * 0.2);
        mouthGash.position.set(s * -0.15, s * -0.2, s * 0.35);
        mouthGash.rotation.z = 0.15;
        group.add(mouthGash);
        // Inner darkness (deeper)
        const mouthInner = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0x050000 }));
        mouthInner.scale.set(s * 0.12, s * 0.025, s * 0.16);
        mouthInner.position.set(s * -0.14, s * -0.2, s * 0.36);
        mouthInner.rotation.z = 0.15;
        group.add(mouthInner);
        // Gum line (fleshy ridge)
        const gumMat = new THREE.MeshPhongMaterial({
          color: 0x993344,
          emissive: 0x220011,
          emissiveIntensity: 0.1,
        });
        const upperGum = new THREE.Mesh(this._boxGeo, gumMat);
        upperGum.scale.set(s * 0.16, s * 0.015, s * 0.21);
        upperGum.position.set(s * -0.15, s * -0.175, s * 0.35);
        upperGum.rotation.z = 0.15;
        group.add(upperGum);
        const lowerGum = new THREE.Mesh(this._boxGeo, gumMat.clone());
        lowerGum.scale.set(s * 0.16, s * 0.015, s * 0.21);
        lowerGum.position.set(s * -0.15, s * -0.225, s * 0.35);
        lowerGum.rotation.z = 0.15;
        group.add(lowerGum);
        // Small jagged teeth along the mouth
        const mouthToothMat = new THREE.MeshPhongMaterial({
          color: 0xccbb99,
          emissive: 0x111100,
          emissiveIntensity: 0.1,
          specular: 0xeeddcc,
          shininess: 50,
        });
        for (let mth = 0; mth < 8; mth++) {
          // Upper teeth pointing down
          const mToothUp = new THREE.Mesh(this._coneGeo, mouthToothMat.clone());
          const mthSize = 0.015 + (mth % 3) * 0.005;
          mToothUp.scale.set(s * mthSize, s * 0.03, s * mthSize);
          mToothUp.rotation.x = Math.PI;
          mToothUp.position.set(
            s * (-0.22 + mth * 0.02),
            s * -0.185,
            s * (0.27 + mth * 0.02),
          );
          group.add(mToothUp);
          // Lower teeth pointing up
          const mToothLo = new THREE.Mesh(this._coneGeo, mouthToothMat.clone());
          mToothLo.scale.set(s * mthSize * 0.9, s * 0.025, s * mthSize * 0.9);
          mToothLo.position.set(
            s * (-0.22 + mth * 0.02),
            s * -0.215,
            s * (0.27 + mth * 0.02),
          );
          group.add(mToothLo);
        }

        // --- Floating arcane sigils orbiting the cluster ---
        const sigilMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.35,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        for (let sg = 0; sg < 8; sg++) {
          const sgAngle = (sg / 8) * Math.PI * 2;
          const sgRadius = s * 1.1;
          // Triangle sigil (using cone geo flattened)
          const sigil = new THREE.Mesh(this._coneGeo, sigilMat.clone());
          sigil.scale.set(s * 0.06, s * 0.005, s * 0.06);
          sigil.position.set(
            Math.cos(sgAngle) * sgRadius,
            Math.sin(sgAngle * 0.7) * s * 0.4,
            Math.sin(sgAngle) * sgRadius,
          );
          sigil.rotation.set(sgAngle, sg * 0.5, sgAngle * 0.3);
          group.add(sigil);
          // Inner dot of each sigil
          const sigilDot = new THREE.Mesh(this._sphereGeo, sigilMat.clone());
          sigilDot.scale.set(s * 0.015, s * 0.015, s * 0.015);
          sigilDot.position.set(
            Math.cos(sgAngle) * sgRadius,
            Math.sin(sgAngle * 0.7) * s * 0.4,
            Math.sin(sgAngle) * sgRadius,
          );
          group.add(sigilDot);
        }
        // Larger geometric sigil shapes at cardinal positions
        for (let csg = 0; csg < 4; csg++) {
          const csgAngle = (csg / 4) * Math.PI * 2 + 0.4;
          const csgSigil = new THREE.Mesh(this._boxGeo, sigilMat.clone());
          csgSigil.scale.set(s * 0.08, s * 0.08, s * 0.005);
          csgSigil.position.set(
            Math.cos(csgAngle) * s * 1.25,
            s * (0.1 + csg * 0.08),
            Math.sin(csgAngle) * s * 1.25,
          );
          csgSigil.rotation.set(csg * 0.3, csgAngle, csg * 0.5);
          group.add(csgSigil);
        }

        // --- More tentacle sucker detail ---
        const suckerMat = new THREE.MeshPhongMaterial({
          color: 0xcc8888,
          emissive: 0x331111,
          emissiveIntensity: 0.1,
          flatShading: true,
        });
        const suckerInnerMat = new THREE.MeshPhongMaterial({
          color: 0x662233,
          emissive: 0x110011,
          emissiveIntensity: 0.15,
        });
        for (let st = 0; st < 7; st++) {
          const stAngle = (st / 7) * Math.PI * 2;
          const stRadius = s * (0.15 + (st % 3) * 0.05);
          // Suckers along each tentacle — 2-3 per tentacle
          for (let su = 0; su < 3; su++) {
            const sucker = new THREE.Mesh(this._sphereGeo, suckerMat.clone());
            const suckerSz = 0.025 - su * 0.005;
            sucker.scale.set(s * suckerSz, s * suckerSz * 0.6, s * suckerSz);
            sucker.position.set(
              Math.cos(stAngle) * stRadius + Math.cos(stAngle + Math.PI / 2) * s * 0.04,
              -s * (0.5 + su * 0.2),
              Math.sin(stAngle) * stRadius + Math.sin(stAngle + Math.PI / 2) * s * 0.04,
            );
            group.add(sucker);
            // Sucker center hole
            const suckerHole = new THREE.Mesh(this._sphereGeo, suckerInnerMat.clone());
            suckerHole.scale.set(s * suckerSz * 0.4, s * suckerSz * 0.3, s * suckerSz * 0.4);
            suckerHole.position.set(
              Math.cos(stAngle) * stRadius + Math.cos(stAngle + Math.PI / 2) * s * 0.045,
              -s * (0.5 + su * 0.2),
              Math.sin(stAngle) * stRadius + Math.sin(stAngle + Math.PI / 2) * s * 0.045,
            );
            group.add(suckerHole);
          }
        }
        break;
      }

      case TDEnemyType.DARK_TOWER: {
        // === NECROMANTIC OBELISK ===
        // Twisted obsidian spire with skull faces, energy veins, death orb, skeletal arms, rune circles
        const obsidianMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true, shininess: 80, specular: 0x222244 });
        const darkStoneMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x0a0a0a, flatShading: true });
        const veinMat = new THREE.MeshBasicMaterial({ color: 0x44ff66, transparent: true, opacity: 0.7 });
        const purpleVeinMat = new THREE.MeshBasicMaterial({ color: 0x9933ff, transparent: true, opacity: 0.6 });
        const skullMat = new THREE.MeshPhongMaterial({ color: 0xd4c8a0, flatShading: true });
        const boneMat = new THREE.MeshPhongMaterial({ color: 0xc8bfa0, flatShading: true });
        const flameMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.5 });

        // Cracked stone foundation
        const foundation = new THREE.Mesh(this._boxGeo, darkStoneMat);
        foundation.scale.set(s * 1.4, s * 0.4, s * 1.4);
        foundation.position.y = s * 0.2;
        group.add(foundation);
        // Foundation erosion detail blocks
        for (let i = 0; i < 6; i++) {
          const ang = (i / 6) * Math.PI * 2;
          const chip = new THREE.Mesh(this._boxGeo, darkStoneMat.clone());
          chip.scale.set(s * 0.25, s * 0.2, s * 0.15);
          chip.position.set(Math.cos(ang) * s * 0.7, s * 0.1, Math.sin(ang) * s * 0.7);
          chip.rotation.y = ang;
          group.add(chip);
        }

        // Main spiraling obelisk — stacked, progressively rotated & tapered segments
        const spireSegments = 8;
        for (let i = 0; i < spireSegments; i++) {
          const t = i / spireSegments;
          const taper = 1.0 - t * 0.6;
          const segH = s * 0.45;
          const seg = new THREE.Mesh(this._boxGeo, obsidianMat.clone());
          seg.scale.set(s * 0.7 * taper, segH, s * 0.7 * taper);
          seg.position.y = s * 0.5 + i * segH * 0.85;
          seg.rotation.y = i * 0.18;
          group.add(seg);
        }

        // Skull faces — one on each cardinal side of the spire
        for (let i = 0; i < 4; i++) {
          const ang = (i / 4) * Math.PI * 2;
          const skullY = s * 1.8;
          const dist = s * 0.38;
          // Cranium
          const cranium = new THREE.Mesh(this._sphereGeo, skullMat);
          cranium.scale.set(s * 0.18, s * 0.2, s * 0.12);
          cranium.position.set(Math.cos(ang) * dist, skullY, Math.sin(ang) * dist);
          group.add(cranium);
          // Eye sockets — glowing voids
          for (const ez of [-0.04, 0.04]) {
            const eyeSocket = new THREE.Mesh(this._sphereGeo, veinMat);
            eyeSocket.scale.set(s * 0.04, s * 0.04, s * 0.04);
            eyeSocket.position.set(
              Math.cos(ang) * (dist + s * 0.08),
              skullY + s * 0.04,
              Math.sin(ang) * (dist + s * 0.08) + ez * s,
            );
            group.add(eyeSocket);
          }
          // Jaw bone
          const jaw = new THREE.Mesh(this._boxGeo, skullMat.clone());
          jaw.scale.set(s * 0.12, s * 0.05, s * 0.08);
          jaw.position.set(Math.cos(ang) * (dist + s * 0.02), skullY - s * 0.12, Math.sin(ang) * (dist + s * 0.02));
          group.add(jaw);
        }

        // Necromantic energy veins running up the spire — glowing green/purple lines
        for (let i = 0; i < 12; i++) {
          const vAngle = (i / 6) * Math.PI * 2 + i * 0.15;
          const vy = s * 0.5 + (i / 12) * s * 3.0;
          const vr = s * 0.35 * (1.0 - (i / 12) * 0.5);
          const vein = new THREE.Mesh(this._boxGeo, i % 2 === 0 ? veinMat : purpleVeinMat);
          vein.scale.set(s * 0.03, s * 0.25, s * 0.03);
          vein.position.set(Math.cos(vAngle) * vr, vy, Math.sin(vAngle) * vr);
          vein.rotation.z = 0.2 * Math.sin(i);
          group.add(vein);
        }

        // Skeletal arms reaching out from cracks in the stone
        for (let i = 0; i < 5; i++) {
          const armAng = (i / 5) * Math.PI * 2 + 0.3;
          const armY = s * 1.0 + i * s * 0.5;
          const reach = s * 0.45 + i * s * 0.03;
          // Upper arm bone
          const upperArm = new THREE.Mesh(this._boxGeo, boneMat);
          upperArm.scale.set(s * 0.04, s * 0.03, s * 0.25);
          upperArm.position.set(Math.cos(armAng) * reach, armY, Math.sin(armAng) * reach);
          upperArm.rotation.y = armAng;
          upperArm.rotation.x = -0.4;
          group.add(upperArm);
          // Forearm bone
          const forearm = new THREE.Mesh(this._boxGeo, boneMat.clone());
          forearm.scale.set(s * 0.03, s * 0.025, s * 0.2);
          forearm.position.set(Math.cos(armAng) * (reach + s * 0.2), armY - s * 0.08, Math.sin(armAng) * (reach + s * 0.2));
          forearm.rotation.y = armAng;
          forearm.rotation.x = -0.7;
          group.add(forearm);
          // Clawed hand
          const claw = new THREE.Mesh(this._coneGeo, boneMat.clone());
          claw.scale.set(s * 0.05, s * 0.08, s * 0.05);
          claw.position.set(Math.cos(armAng) * (reach + s * 0.35), armY - s * 0.18, Math.sin(armAng) * (reach + s * 0.35));
          claw.rotation.z = armAng + Math.PI;
          group.add(claw);
        }

        // Hovering death orb at the top wreathed in dark flames
        const topOrb = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: enemy.glowColor }));
        topOrb.scale.set(s * 0.4, s * 0.4, s * 0.4);
        topOrb.position.y = s * 3.8;
        topOrb.name = "topOrb";
        group.add(topOrb);
        // Dark flame corona around the orb
        for (let i = 0; i < 8; i++) {
          const fAng = (i / 8) * Math.PI * 2;
          const flame = new THREE.Mesh(this._coneGeo, flameMat);
          flame.scale.set(s * 0.08, s * 0.3 + Math.sin(i * 1.5) * s * 0.1, s * 0.08);
          flame.position.set(
            Math.cos(fAng) * s * 0.3,
            s * 3.8 + Math.sin(i * 2.0) * s * 0.1,
            Math.sin(fAng) * s * 0.3,
          );
          flame.rotation.z = fAng * 0.5;
          group.add(flame);
        }
        // Inner dark core inside orb
        const darkCore = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0x110022 }));
        darkCore.scale.set(s * 0.2, s * 0.2, s * 0.2);
        darkCore.position.y = s * 3.8;
        group.add(darkCore);

        // Floating bone fragments orbiting the top
        for (let i = 0; i < 6; i++) {
          const bAng = (i / 6) * Math.PI * 2;
          const bone = new THREE.Mesh(this._boxGeo, boneMat.clone());
          bone.scale.set(s * 0.04, s * 0.1, s * 0.03);
          bone.position.set(Math.cos(bAng) * s * 0.6, s * 3.6 + Math.sin(i * 1.2) * s * 0.2, Math.sin(bAng) * s * 0.6);
          bone.rotation.set(i * 0.8, i * 0.5, i * 0.3);
          group.add(bone);
        }

        // Rune circles orbiting around the base
        const runeGlowMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.35, side: THREE.DoubleSide });
        for (let i = 0; i < 3; i++) {
          const runeRing = new THREE.Mesh(new THREE.TorusGeometry(s * (0.8 + i * 0.15), s * 0.02, 4, 16), runeGlowMat);
          runeRing.position.y = s * 0.15 + i * s * 0.12;
          runeRing.rotation.x = Math.PI / 2;
          runeRing.rotation.z = i * 0.6;
          group.add(runeRing);
        }
        // Vertical rune pillars at base corners
        for (let i = 0; i < 4; i++) {
          const pAng = (i / 4) * Math.PI * 2 + Math.PI / 4;
          const pillar = new THREE.Mesh(this._boxGeo, darkStoneMat.clone());
          pillar.scale.set(s * 0.1, s * 0.6, s * 0.1);
          pillar.position.set(Math.cos(pAng) * s * 0.9, s * 0.3, Math.sin(pAng) * s * 0.9);
          group.add(pillar);
          // Rune glyph on pillar
          const glyph = new THREE.Mesh(this._boxGeo, veinMat);
          glyph.scale.set(s * 0.06, s * 0.15, s * 0.005);
          glyph.position.set(Math.cos(pAng) * (s * 0.9 + s * 0.06), s * 0.35, Math.sin(pAng) * (s * 0.9 + s * 0.06));
          group.add(glyph);
        }

        // Creeping root/tendril growths climbing up the obelisk base
        const tendrilMat = new THREE.MeshPhongMaterial({ color: 0x1a3a1a, flatShading: true });
        const tendrilGlowMat = new THREE.MeshBasicMaterial({ color: 0x33ff55, transparent: true, opacity: 0.3 });
        for (let i = 0; i < 8; i++) {
          const tAng = (i / 8) * Math.PI * 2 + 0.2;
          const tendrilR = s * 0.55;
          // Main tendril trunk climbing upward
          const tendril = new THREE.Mesh(this._boxGeo, tendrilMat);
          tendril.scale.set(s * 0.05, s * 0.6 + Math.sin(i * 1.7) * s * 0.2, s * 0.04);
          tendril.position.set(Math.cos(tAng) * tendrilR, s * 0.5 + i * s * 0.08, Math.sin(tAng) * tendrilR);
          tendril.rotation.set(0.1 * Math.sin(i), tAng, 0.15 * Math.cos(i * 2.3));
          group.add(tendril);
          // Small branching sub-tendrils
          const subTendril = new THREE.Mesh(this._boxGeo, tendrilMat.clone());
          subTendril.scale.set(s * 0.03, s * 0.2, s * 0.025);
          subTendril.position.set(
            Math.cos(tAng + 0.3) * (tendrilR + s * 0.06),
            s * 0.7 + i * s * 0.1,
            Math.sin(tAng + 0.3) * (tendrilR + s * 0.06),
          );
          subTendril.rotation.z = 0.4 * (i % 2 === 0 ? 1 : -1);
          group.add(subTendril);
          // Glowing nodes on tendrils
          if (i % 2 === 0) {
            const tNode = new THREE.Mesh(this._sphereGeo, tendrilGlowMat);
            tNode.scale.set(s * 0.04, s * 0.04, s * 0.04);
            tNode.position.set(Math.cos(tAng) * tendrilR, s * 0.9 + i * s * 0.06, Math.sin(tAng) * tendrilR);
            group.add(tNode);
          }
        }

        // Additional protruding skull faces with more 3D depth at various heights
        const deepSkullMat = new THREE.MeshPhongMaterial({ color: 0xccc099, flatShading: true, shininess: 20 });
        const skullGlowEyeMat = new THREE.MeshBasicMaterial({ color: 0x66ff88, transparent: true, opacity: 0.8 });
        for (let i = 0; i < 6; i++) {
          const sAng = (i / 6) * Math.PI * 2 + Math.PI / 6;
          const sY = s * 1.0 + i * s * 0.4;
          const sDist = s * 0.42 * (1.0 - (i / 12) * 0.3);
          // Protruding cranium — larger and more 3D
          const protCranium = new THREE.Mesh(this._sphereGeo, deepSkullMat);
          protCranium.scale.set(s * 0.2, s * 0.22, s * 0.18);
          protCranium.position.set(Math.cos(sAng) * sDist, sY, Math.sin(sAng) * sDist);
          group.add(protCranium);
          // Brow ridge for depth
          const browRidge = new THREE.Mesh(this._boxGeo, deepSkullMat.clone());
          browRidge.scale.set(s * 0.16, s * 0.04, s * 0.06);
          browRidge.position.set(Math.cos(sAng) * (sDist + s * 0.08), sY + s * 0.08, Math.sin(sAng) * (sDist + s * 0.08));
          group.add(browRidge);
          // Deep-set glowing eyes
          for (const ez of [-0.035, 0.035]) {
            const deepEye = new THREE.Mesh(this._sphereGeo, skullGlowEyeMat);
            deepEye.scale.set(s * 0.045, s * 0.045, s * 0.045);
            deepEye.position.set(
              Math.cos(sAng) * (sDist + s * 0.12),
              sY + s * 0.05,
              Math.sin(sAng) * (sDist + s * 0.12) + ez * s,
            );
            group.add(deepEye);
          }
          // Nasal cavity
          const nasal = new THREE.Mesh(this._coneGeo, new THREE.MeshBasicMaterial({ color: 0x110011 }));
          nasal.scale.set(s * 0.03, s * 0.04, s * 0.03);
          nasal.position.set(Math.cos(sAng) * (sDist + s * 0.1), sY - s * 0.02, Math.sin(sAng) * (sDist + s * 0.1));
          nasal.rotation.z = Math.PI;
          group.add(nasal);
          // Jaw with teeth
          const protJaw = new THREE.Mesh(this._boxGeo, deepSkullMat.clone());
          protJaw.scale.set(s * 0.13, s * 0.06, s * 0.1);
          protJaw.position.set(Math.cos(sAng) * (sDist + s * 0.04), sY - s * 0.14, Math.sin(sAng) * (sDist + s * 0.04));
          group.add(protJaw);
          // Individual teeth
          for (let t = 0; t < 3; t++) {
            const tooth = new THREE.Mesh(this._coneGeo, skullMat.clone());
            tooth.scale.set(s * 0.015, s * 0.03, s * 0.015);
            tooth.position.set(
              Math.cos(sAng) * (sDist + s * 0.08),
              sY - s * 0.17,
              Math.sin(sAng) * (sDist + s * 0.08) + (t - 1) * s * 0.03,
            );
            tooth.rotation.z = Math.PI;
            group.add(tooth);
          }
          // Dripping ectoplasm from skull mouths
          const ectoMat = new THREE.MeshBasicMaterial({ color: 0x44ff88, transparent: true, opacity: 0.35 });
          const drip = new THREE.Mesh(this._coneGeo, ectoMat);
          drip.scale.set(s * 0.04, s * 0.12 + Math.sin(i * 2.1) * s * 0.05, s * 0.04);
          drip.position.set(Math.cos(sAng) * (sDist + s * 0.06), sY - s * 0.24, Math.sin(sAng) * (sDist + s * 0.06));
          drip.rotation.z = Math.PI;
          group.add(drip);
          // Secondary ectoplasm drip
          const drip2 = new THREE.Mesh(this._coneGeo, ectoMat);
          drip2.scale.set(s * 0.025, s * 0.08, s * 0.025);
          drip2.position.set(
            Math.cos(sAng) * (sDist + s * 0.04),
            sY - s * 0.2,
            Math.sin(sAng) * (sDist + s * 0.04) + s * 0.04,
          );
          drip2.rotation.z = Math.PI;
          group.add(drip2);
        }

        // Dangling chains with soul lanterns from midway up the spire
        const chainMat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true, shininess: 60 });
        const lanternGlassMat = new THREE.MeshBasicMaterial({ color: 0x55ffaa, transparent: true, opacity: 0.5 });
        const lanternFrameMat = new THREE.MeshPhongMaterial({ color: 0x333333, flatShading: true });
        for (let i = 0; i < 6; i++) {
          const cAng = (i / 6) * Math.PI * 2 + 0.5;
          const chainY = s * 2.0 + i * s * 0.3;
          const chainDist = s * 0.4;
          // Chain links — descending series of small boxes
          for (let link = 0; link < 5; link++) {
            const chainLink = new THREE.Mesh(this._boxGeo, chainMat);
            chainLink.scale.set(s * 0.02, s * 0.04, s * 0.015);
            chainLink.position.set(
              Math.cos(cAng) * chainDist,
              chainY - link * s * 0.06,
              Math.sin(cAng) * chainDist,
            );
            chainLink.rotation.y = link * 0.8;
            group.add(chainLink);
          }
          // Soul lantern at the bottom of each chain
          const lanternFrame = new THREE.Mesh(this._boxGeo, lanternFrameMat);
          lanternFrame.scale.set(s * 0.06, s * 0.08, s * 0.06);
          lanternFrame.position.set(
            Math.cos(cAng) * chainDist,
            chainY - s * 0.35,
            Math.sin(cAng) * chainDist,
          );
          group.add(lanternFrame);
          // Glowing soul inside lantern
          const soulGlow = new THREE.Mesh(this._sphereGeo, lanternGlassMat);
          soulGlow.scale.set(s * 0.045, s * 0.055, s * 0.045);
          soulGlow.position.set(
            Math.cos(cAng) * chainDist,
            chainY - s * 0.34,
            Math.sin(cAng) * chainDist,
          );
          group.add(soulGlow);
          // Lantern hook on top
          const lHook = new THREE.Mesh(this._coneGeo, chainMat.clone());
          lHook.scale.set(s * 0.02, s * 0.04, s * 0.02);
          lHook.position.set(
            Math.cos(cAng) * chainDist,
            chainY - s * 0.28,
            Math.sin(cAng) * chainDist,
          );
          group.add(lHook);
        }

        // Sacrificial altar/platform at the base with blood stains
        const altarMat = new THREE.MeshPhongMaterial({ color: 0x2a2a2a, flatShading: true, shininess: 30 });
        const bloodMat = new THREE.MeshBasicMaterial({ color: 0x880011, transparent: true, opacity: 0.6 });
        // Main altar slab
        const altarBase = new THREE.Mesh(this._boxGeo, altarMat);
        altarBase.scale.set(s * 0.8, s * 0.12, s * 0.5);
        altarBase.position.set(s * 1.2, s * 0.12, 0);
        group.add(altarBase);
        // Altar top slab
        const altarTop = new THREE.Mesh(this._boxGeo, altarMat.clone());
        altarTop.scale.set(s * 0.7, s * 0.06, s * 0.4);
        altarTop.position.set(s * 1.2, s * 0.22, 0);
        group.add(altarTop);
        // Blood stain pools on altar
        for (let i = 0; i < 4; i++) {
          const bloodPool = new THREE.Mesh(this._boxGeo, bloodMat);
          bloodPool.scale.set(s * 0.12 + Math.sin(i * 1.3) * s * 0.08, s * 0.005, s * 0.1 + Math.sin(i * 0.7) * s * 0.06);
          bloodPool.position.set(s * 1.1 + i * s * 0.08, s * 0.26, (i - 1.5) * s * 0.08);
          group.add(bloodPool);
        }
        // Blood drip down side of altar
        for (let i = 0; i < 3; i++) {
          const bloodDrip = new THREE.Mesh(this._boxGeo, bloodMat);
          bloodDrip.scale.set(s * 0.03, s * 0.1, s * 0.02);
          bloodDrip.position.set(s * 1.55, s * 0.12 - i * s * 0.03, (i - 1) * s * 0.12);
          group.add(bloodDrip);
        }
        // Altar corner pillars with skulls
        for (const ax of [-1, 1]) {
          for (const az of [-1, 1]) {
            const altarPillar = new THREE.Mesh(this._boxGeo, altarMat.clone());
            altarPillar.scale.set(s * 0.06, s * 0.25, s * 0.06);
            altarPillar.position.set(s * 1.2 + ax * s * 0.35, s * 0.2, az * s * 0.2);
            group.add(altarPillar);
            // Skull on top of each altar pillar
            const altarSkull = new THREE.Mesh(this._sphereGeo, skullMat.clone());
            altarSkull.scale.set(s * 0.06, s * 0.07, s * 0.05);
            altarSkull.position.set(s * 1.2 + ax * s * 0.35, s * 0.36, az * s * 0.2);
            group.add(altarSkull);
          }
        }

        // Floating spirit wisps orbiting the middle section
        const wispMat = new THREE.MeshBasicMaterial({ color: 0x88ffcc, transparent: true, opacity: 0.35 });
        const wispTrailMat = new THREE.MeshBasicMaterial({ color: 0x66ddaa, transparent: true, opacity: 0.2 });
        for (let i = 0; i < 8; i++) {
          const wAng = (i / 8) * Math.PI * 2;
          const wY = s * 1.8 + Math.sin(i * 1.3) * s * 0.5;
          const wR = s * 0.8 + Math.sin(i * 0.7) * s * 0.15;
          // Main wisp sphere
          const wisp = new THREE.Mesh(this._sphereGeo, wispMat);
          wisp.scale.set(s * 0.06, s * 0.06, s * 0.06);
          wisp.position.set(Math.cos(wAng) * wR, wY, Math.sin(wAng) * wR);
          group.add(wisp);
          // Wisp tail/trail — stretched sphere behind it
          const wTrail = new THREE.Mesh(this._sphereGeo, wispTrailMat);
          wTrail.scale.set(s * 0.04, s * 0.035, s * 0.12);
          wTrail.position.set(Math.cos(wAng) * (wR + s * 0.08), wY, Math.sin(wAng) * (wR + s * 0.08));
          wTrail.rotation.y = wAng + Math.PI;
          group.add(wTrail);
          // Secondary trail fragment
          const wTrail2 = new THREE.Mesh(this._sphereGeo, wispTrailMat);
          wTrail2.scale.set(s * 0.025, s * 0.025, s * 0.08);
          wTrail2.position.set(Math.cos(wAng) * (wR + s * 0.16), wY - s * 0.02, Math.sin(wAng) * (wR + s * 0.16));
          wTrail2.rotation.y = wAng + Math.PI;
          group.add(wTrail2);
        }

        // Cracked/broken stone debris scattered at the base
        const debrisMat = new THREE.MeshPhongMaterial({ color: 0x333344, flatShading: true });
        for (let i = 0; i < 10; i++) {
          const dAng = (i / 10) * Math.PI * 2 + i * 0.3;
          const dR = s * 1.0 + Math.sin(i * 2.5) * s * 0.4;
          const debris = new THREE.Mesh(this._boxGeo, debrisMat);
          debris.scale.set(
            s * (0.08 + Math.sin(i * 1.7) * 0.05),
            s * (0.05 + Math.cos(i * 2.1) * 0.03),
            s * (0.1 + Math.sin(i * 0.9) * 0.04),
          );
          debris.position.set(Math.cos(dAng) * dR, s * 0.03, Math.sin(dAng) * dR);
          debris.rotation.set(i * 0.7, i * 1.1, i * 0.4);
          group.add(debris);
        }
        // Larger rubble chunks
        for (let i = 0; i < 5; i++) {
          const rbAng = (i / 5) * Math.PI * 2 + 0.8;
          const rbR = s * 1.2 + i * s * 0.1;
          const rubble = new THREE.Mesh(this._boxGeo, debrisMat.clone());
          rubble.scale.set(s * 0.15, s * 0.08, s * 0.12);
          rubble.position.set(Math.cos(rbAng) * rbR, s * 0.05, Math.sin(rbAng) * rbR);
          rubble.rotation.set(i * 0.5, i * 0.9, i * 0.3);
          group.add(rubble);
        }

        // Glowing rune circles at multiple heights along the spire
        const runeCircleMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.3, side: THREE.DoubleSide });
        const runeCircleAltMat = new THREE.MeshBasicMaterial({ color: 0x9933ff, transparent: true, opacity: 0.25, side: THREE.DoubleSide });
        for (let i = 0; i < 5; i++) {
          const rcY = s * 0.8 + i * s * 0.7;
          const rcRadius = s * (0.55 - i * 0.06);
          const runeCircle = new THREE.Mesh(
            new THREE.TorusGeometry(rcRadius, s * 0.015, 4, 20),
            i % 2 === 0 ? runeCircleMat : runeCircleAltMat,
          );
          runeCircle.position.y = rcY;
          runeCircle.rotation.x = Math.PI / 2;
          runeCircle.rotation.z = i * 0.45;
          group.add(runeCircle);
          // Rune glyphs floating at each circle
          for (let g = 0; g < 4; g++) {
            const gAng = (g / 4) * Math.PI * 2 + i * 0.5;
            const rcGlyph = new THREE.Mesh(this._boxGeo, i % 2 === 0 ? veinMat : purpleVeinMat);
            rcGlyph.scale.set(s * 0.04, s * 0.08, s * 0.005);
            rcGlyph.position.set(
              Math.cos(gAng) * rcRadius,
              rcY,
              Math.sin(gAng) * rcRadius,
            );
            rcGlyph.rotation.y = gAng;
            group.add(rcGlyph);
          }
        }

        break;
      }

      case TDEnemyType.CANNON_FORT: {
        // === WAR MACHINE CRAWLER ===
        // Squat armored tortoise-machine with spider legs, twin cannons, ammo feeds, sensor dome
        const armorMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true, shininess: 40, specular: 0x333333 });
        const darkArmorMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x101010, flatShading: true, shininess: 50, specular: 0x444444 });
        const metalMat = new THREE.MeshPhongMaterial({ color: 0x555555, flatShading: true, shininess: 70, specular: 0x666666 });
        const rivetMat = new THREE.MeshPhongMaterial({ color: 0x888888, shininess: 90 });
        const glowTubeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.6 });
        const lensMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const ventMat = new THREE.MeshPhongMaterial({ color: 0x222222, flatShading: true });

        // Main body — squat tortoise-like shell, wider than tall
        const bodyShell = new THREE.Mesh(this._sphereGeo, armorMat);
        bodyShell.scale.set(s * 1.4, s * 0.7, s * 1.1);
        bodyShell.position.y = s * 0.7;
        group.add(bodyShell);
        // Flattened underbelly plate
        const belly = new THREE.Mesh(this._boxGeo, darkArmorMat);
        belly.scale.set(s * 1.3, s * 0.15, s * 1.0);
        belly.position.y = s * 0.35;
        group.add(belly);

        // Segmented armor plates on top of shell
        for (let i = 0; i < 5; i++) {
          const seg = new THREE.Mesh(this._boxGeo, armorMat.clone());
          const segW = s * 1.2 - i * s * 0.15;
          seg.scale.set(segW, s * 0.06, s * 0.15);
          seg.position.set(0, s * 0.85 + i * s * 0.06, -s * 0.35 + i * s * 0.15);
          group.add(seg);
        }

        // Front heavy plow/ram plate
        const plow = new THREE.Mesh(this._boxGeo, darkArmorMat);
        plow.scale.set(s * 1.1, s * 0.5, s * 0.12);
        plow.position.set(s * 0.05, s * 0.55, s * 0.55);
        group.add(plow);

        // Rivet details on body
        for (let i = 0; i < 12; i++) {
          const rAng = (i / 12) * Math.PI * 2;
          const rivet = new THREE.Mesh(this._sphereGeo, rivetMat);
          rivet.scale.set(s * 0.03, s * 0.03, s * 0.03);
          rivet.position.set(
            Math.cos(rAng) * s * 1.0,
            s * 0.65 + Math.sin(i * 0.8) * s * 0.1,
            Math.sin(rAng) * s * 0.75,
          );
          group.add(rivet);
        }

        // Mechanical spider legs — 4 pairs (8 legs total)
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 4; i++) {
            const legZ = -s * 0.5 + i * s * 0.3;
            const legSpread = s * 0.7 + i * s * 0.05;
            // Upper leg segment (thigh)
            const upperLeg = new THREE.Mesh(this._boxGeo, metalMat);
            upperLeg.scale.set(s * 0.08, s * 0.35, s * 0.06);
            upperLeg.position.set(side * legSpread, s * 0.5, legZ);
            upperLeg.rotation.z = side * 0.5;
            group.add(upperLeg);
            // Knee joint
            const knee = new THREE.Mesh(this._sphereGeo, metalMat.clone());
            knee.scale.set(s * 0.06, s * 0.06, s * 0.06);
            knee.position.set(side * (legSpread + s * 0.12), s * 0.25, legZ);
            group.add(knee);
            // Lower leg segment (shin)
            const lowerLeg = new THREE.Mesh(this._boxGeo, metalMat.clone());
            lowerLeg.scale.set(s * 0.05, s * 0.3, s * 0.05);
            lowerLeg.position.set(side * (legSpread + s * 0.18), s * 0.08, legZ);
            lowerLeg.rotation.z = side * -0.3;
            group.add(lowerLeg);
            // Foot claw
            const foot = new THREE.Mesh(this._coneGeo, metalMat.clone());
            foot.scale.set(s * 0.06, s * 0.08, s * 0.06);
            foot.position.set(side * (legSpread + s * 0.22), s * 0.0, legZ);
            foot.rotation.z = Math.PI;
            group.add(foot);
          }
        }

        // Twin rotating cannon barrels — longer with heat venting
        for (const bz of [-s * 0.28, s * 0.28]) {
          // Main barrel
          const barrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.09, s * 0.12, s * 1.2, 10), metalMat);
          barrel.rotation.z = Math.PI / 2;
          barrel.position.set(s * 0.9, s * 0.85, bz);
          group.add(barrel);
          // Barrel tip / muzzle brake
          const muzzle = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.12, s * 0.09, s * 0.15, 10), darkArmorMat);
          muzzle.rotation.z = Math.PI / 2;
          muzzle.position.set(s * 1.5, s * 0.85, bz);
          group.add(muzzle);
          // Heat vent fins along barrel
          for (let v = 0; v < 4; v++) {
            const vent = new THREE.Mesh(this._boxGeo, ventMat);
            vent.scale.set(s * 0.04, s * 0.08, s * 0.14);
            vent.position.set(s * 0.6 + v * s * 0.2, s * 0.85, bz);
            group.add(vent);
          }
        }

        // Glowing ammunition feed tubes running along sides
        for (const side of [-1, 1]) {
          for (let i = 0; i < 5; i++) {
            const tube = new THREE.Mesh(this._sphereGeo, glowTubeMat);
            tube.scale.set(s * 0.05, s * 0.05, s * 0.05);
            tube.position.set(s * 0.2 + i * s * 0.2, s * 0.55, side * s * 0.65);
            group.add(tube);
          }
          // Tube connectors
          for (let i = 0; i < 4; i++) {
            const conn = new THREE.Mesh(this._boxGeo, metalMat.clone());
            conn.scale.set(s * 0.15, s * 0.02, s * 0.02);
            conn.position.set(s * 0.3 + i * s * 0.2, s * 0.55, side * s * 0.65);
            group.add(conn);
          }
        }

        // Sensor eye dome on top
        const domeCasing = new THREE.Mesh(this._sphereGeo, darkArmorMat.clone());
        domeCasing.scale.set(s * 0.3, s * 0.2, s * 0.3);
        domeCasing.position.set(-s * 0.15, s * 1.1, 0);
        group.add(domeCasing);
        // Sensor lens
        const sensorLens = new THREE.Mesh(this._sphereGeo, lensMat);
        sensorLens.scale.set(s * 0.12, s * 0.12, s * 0.12);
        sensorLens.position.set(-s * 0.0, s * 1.15, 0);
        group.add(sensorLens);
        // Sensor antenna
        const antenna = new THREE.Mesh(this._boxGeo, metalMat.clone());
        antenna.scale.set(s * 0.02, s * 0.25, s * 0.02);
        antenna.position.set(-s * 0.15, s * 1.35, 0);
        group.add(antenna);
        // Antenna tip
        const antTip = new THREE.Mesh(this._sphereGeo, lensMat.clone());
        antTip.scale.set(s * 0.04, s * 0.04, s * 0.04);
        antTip.position.set(-s * 0.15, s * 1.5, 0);
        group.add(antTip);

        // Additional armor plate details on sides
        for (const side of [-1, 1]) {
          const sidePlate = new THREE.Mesh(this._boxGeo, armorMat.clone());
          sidePlate.scale.set(s * 0.8, s * 0.35, s * 0.08);
          sidePlate.position.set(s * 0.1, s * 0.6, side * s * 0.85);
          group.add(sidePlate);
        }
        // Rear exhaust vents
        for (let i = 0; i < 3; i++) {
          const exhaust = new THREE.Mesh(this._boxGeo, ventMat.clone());
          exhaust.scale.set(s * 0.08, s * 0.08, s * 0.15);
          exhaust.position.set(-s * 0.8, s * 0.6 + i * s * 0.12, 0);
          group.add(exhaust);
        }

        // Exhaust pipes/smokestacks on the rear with heat shimmer glow
        const heatGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6633, transparent: true, opacity: 0.3 });
        const pipeMetalMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, flatShading: true, shininess: 50 });
        for (let i = 0; i < 3; i++) {
          const pipeZ = (i - 1) * s * 0.3;
          // Smokestack pipe body
          const pipe = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.06, s * 0.08, s * 0.4, 8), pipeMetalMat);
          pipe.position.set(-s * 0.9, s * 0.95 + i * s * 0.05, pipeZ);
          group.add(pipe);
          // Pipe rim at top
          const pipeRim = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.08, s * 0.06, s * 0.05, 8), metalMat.clone());
          pipeRim.position.set(-s * 0.9, s * 1.17 + i * s * 0.05, pipeZ);
          group.add(pipeRim);
          // Heat shimmer glow above each pipe
          const heatShimmer = new THREE.Mesh(this._sphereGeo, heatGlowMat);
          heatShimmer.scale.set(s * 0.1, s * 0.15, s * 0.1);
          heatShimmer.position.set(-s * 0.9, s * 1.3 + i * s * 0.05, pipeZ);
          group.add(heatShimmer);
          // Secondary shimmer haze
          const haze = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: 0xff4422, transparent: true, opacity: 0.15 }));
          haze.scale.set(s * 0.14, s * 0.2, s * 0.14);
          haze.position.set(-s * 0.9, s * 1.45 + i * s * 0.05, pipeZ);
          group.add(haze);
        }

        // Articulated track/tread sections on the sides
        const treadMat = new THREE.MeshPhongMaterial({ color: 0x333333, flatShading: true, shininess: 30 });
        const treadLinkMat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true });
        for (const side of [-1, 1]) {
          // Track housing / fender
          const trackHousing = new THREE.Mesh(this._boxGeo, darkArmorMat.clone());
          trackHousing.scale.set(s * 0.9, s * 0.18, s * 0.15);
          trackHousing.position.set(s * 0.05, s * 0.22, side * s * 0.95);
          group.add(trackHousing);
          // Individual tread links
          for (let t = 0; t < 8; t++) {
            const treadLink = new THREE.Mesh(this._boxGeo, treadMat);
            treadLink.scale.set(s * 0.09, s * 0.04, s * 0.13);
            treadLink.position.set(-s * 0.35 + t * s * 0.11, s * 0.12, side * s * 0.95);
            group.add(treadLink);
            // Tread teeth/grousers
            const grouser = new THREE.Mesh(this._boxGeo, treadLinkMat);
            grouser.scale.set(s * 0.07, s * 0.02, s * 0.02);
            grouser.position.set(-s * 0.35 + t * s * 0.11, s * 0.09, side * (s * 0.95 + s * 0.07));
            group.add(grouser);
          }
          // Drive wheel front
          const driveFront = new THREE.Mesh(this._sphereGeo, metalMat.clone());
          driveFront.scale.set(s * 0.08, s * 0.08, s * 0.06);
          driveFront.position.set(s * 0.45, s * 0.18, side * s * 0.95);
          group.add(driveFront);
          // Drive wheel rear
          const driveRear = new THREE.Mesh(this._sphereGeo, metalMat.clone());
          driveRear.scale.set(s * 0.08, s * 0.08, s * 0.06);
          driveRear.position.set(-s * 0.4, s * 0.18, side * s * 0.95);
          group.add(driveRear);
        }

        // Ammunition boxes/crates strapped to the sides
        const crateMat = new THREE.MeshPhongMaterial({ color: 0x5a4a2a, flatShading: true });
        const strapMat = new THREE.MeshPhongMaterial({ color: 0x3a3a3a, flatShading: true });
        for (const side of [-1, 1]) {
          // Two ammo crates per side
          for (let c = 0; c < 2; c++) {
            const crate = new THREE.Mesh(this._boxGeo, crateMat);
            crate.scale.set(s * 0.2, s * 0.12, s * 0.1);
            crate.position.set(s * -0.2 + c * s * 0.35, s * 0.75, side * s * 0.92);
            crate.rotation.y = side * 0.05;
            group.add(crate);
            // Lid detail
            const lid = new THREE.Mesh(this._boxGeo, crateMat.clone());
            lid.scale.set(s * 0.19, s * 0.02, s * 0.09);
            lid.position.set(s * -0.2 + c * s * 0.35, s * 0.82, side * s * 0.92);
            group.add(lid);
            // Strap holding crate
            const strap = new THREE.Mesh(this._boxGeo, strapMat);
            strap.scale.set(s * 0.22, s * 0.015, s * 0.015);
            strap.position.set(s * -0.2 + c * s * 0.35, s * 0.78, side * s * 0.93);
            group.add(strap);
            // Buckle on strap
            const buckle = new THREE.Mesh(this._sphereGeo, rivetMat.clone());
            buckle.scale.set(s * 0.02, s * 0.02, s * 0.02);
            buckle.position.set(s * -0.1 + c * s * 0.35, s * 0.78, side * s * 0.94);
            group.add(buckle);
          }
        }

        // Command periscope/scope on top near the sensor dome
        const scopeMat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true, shininess: 60 });
        // Periscope base mount
        const periBase = new THREE.Mesh(this._boxGeo, scopeMat);
        periBase.scale.set(s * 0.08, s * 0.06, s * 0.08);
        periBase.position.set(-s * 0.35, s * 1.1, s * 0.15);
        group.add(periBase);
        // Periscope tube
        const periTube = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.025, s * 0.025, s * 0.3, 8), scopeMat.clone());
        periTube.position.set(-s * 0.35, s * 1.3, s * 0.15);
        group.add(periTube);
        // Periscope head with viewing slit
        const periHead = new THREE.Mesh(this._boxGeo, scopeMat.clone());
        periHead.scale.set(s * 0.06, s * 0.04, s * 0.04);
        periHead.position.set(-s * 0.35, s * 1.47, s * 0.15);
        group.add(periHead);
        // Viewing lens
        const periLens = new THREE.Mesh(this._sphereGeo, lensMat.clone());
        periLens.scale.set(s * 0.025, s * 0.02, s * 0.025);
        periLens.position.set(-s * 0.32, s * 1.47, s * 0.18);
        group.add(periLens);

        // Welded seam lines along the armor plates
        const seamMat = new THREE.MeshPhongMaterial({ color: 0x1a1a1a, flatShading: true });
        // Horizontal seams across the body
        for (let i = 0; i < 4; i++) {
          const seamY = s * 0.5 + i * s * 0.12;
          const seam = new THREE.Mesh(this._boxGeo, seamMat);
          seam.scale.set(s * 1.35, s * 0.008, s * 0.008);
          seam.position.set(0, seamY, s * 0.5);
          group.add(seam);
          // Rear-facing seam
          const seamR = new THREE.Mesh(this._boxGeo, seamMat);
          seamR.scale.set(s * 1.35, s * 0.008, s * 0.008);
          seamR.position.set(0, seamY, -s * 0.5);
          group.add(seamR);
        }
        // Vertical seams on side plates
        for (const side of [-1, 1]) {
          for (let i = 0; i < 3; i++) {
            const vSeam = new THREE.Mesh(this._boxGeo, seamMat);
            vSeam.scale.set(s * 0.008, s * 0.3, s * 0.008);
            vSeam.position.set(-s * 0.3 + i * s * 0.3, s * 0.6, side * s * 0.86);
            group.add(vSeam);
          }
        }
        // Diagonal weld lines on the plow
        for (let i = 0; i < 3; i++) {
          const dWeld = new THREE.Mesh(this._boxGeo, seamMat);
          dWeld.scale.set(s * 0.3, s * 0.008, s * 0.008);
          dWeld.position.set(s * 0.05, s * 0.4 + i * s * 0.1, s * 0.56);
          dWeld.rotation.z = 0.3;
          group.add(dWeld);
        }

        // Front-mounted blade/ram with battle damage scratches
        const bladeMat = new THREE.MeshPhongMaterial({ color: 0x555566, flatShading: true, shininess: 60 });
        const scratchMat = new THREE.MeshBasicMaterial({ color: 0x888899, transparent: true, opacity: 0.5 });
        // Main blade
        const ramBlade = new THREE.Mesh(this._boxGeo, bladeMat);
        ramBlade.scale.set(s * 1.2, s * 0.35, s * 0.06);
        ramBlade.position.set(s * 0.05, s * 0.4, s * 0.65);
        ramBlade.rotation.x = -0.15;
        group.add(ramBlade);
        // Blade edge — tapered
        const bladeEdge = new THREE.Mesh(this._boxGeo, bladeMat.clone());
        bladeEdge.scale.set(s * 1.25, s * 0.04, s * 0.08);
        bladeEdge.position.set(s * 0.05, s * 0.22, s * 0.68);
        group.add(bladeEdge);
        // Battle damage scratches on blade
        for (let i = 0; i < 6; i++) {
          const scratch = new THREE.Mesh(this._boxGeo, scratchMat);
          scratch.scale.set(s * (0.12 + Math.sin(i * 1.5) * 0.06), s * 0.005, s * 0.005);
          scratch.position.set(-s * 0.3 + i * s * 0.12, s * 0.35 + Math.sin(i * 2.3) * s * 0.08, s * 0.66);
          scratch.rotation.z = (i - 3) * 0.1;
          group.add(scratch);
        }
        // Dent marks
        for (let i = 0; i < 3; i++) {
          const dent = new THREE.Mesh(this._sphereGeo, scratchMat);
          dent.scale.set(s * 0.04, s * 0.03, s * 0.01);
          dent.position.set(-s * 0.2 + i * s * 0.25, s * 0.42, s * 0.66);
          group.add(dent);
        }

        // Signal flags and antenna arrays on top
        const flagPoleMat = new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true });
        const flagMat = new THREE.MeshBasicMaterial({ color: 0xcc2222, transparent: true, opacity: 0.8 });
        // Signal flag pole
        const flagPole = new THREE.Mesh(this._boxGeo, flagPoleMat);
        flagPole.scale.set(s * 0.015, s * 0.35, s * 0.015);
        flagPole.position.set(-s * 0.4, s * 1.3, s * 0.3);
        group.add(flagPole);
        // Signal flag — triangular pennant (flat box)
        const flag = new THREE.Mesh(this._boxGeo, flagMat);
        flag.scale.set(s * 0.15, s * 0.08, s * 0.005);
        flag.position.set(-s * 0.33, s * 1.42, s * 0.3);
        flag.rotation.z = 0.1;
        group.add(flag);
        // Second smaller pennant
        const flag2 = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0x222288, transparent: true, opacity: 0.8 }));
        flag2.scale.set(s * 0.1, s * 0.06, s * 0.005);
        flag2.position.set(-s * 0.33, s * 1.35, s * 0.3);
        flag2.rotation.z = -0.05;
        group.add(flag2);
        // Antenna array — multiple thin rods
        for (let i = 0; i < 4; i++) {
          const antRod = new THREE.Mesh(this._boxGeo, flagPoleMat.clone());
          antRod.scale.set(s * 0.01, s * 0.2 + i * s * 0.03, s * 0.01);
          antRod.position.set(-s * 0.05 + i * s * 0.08, s * 1.2 + i * s * 0.02, -s * 0.3);
          group.add(antRod);
          // Antenna tip nodes
          const antNode = new THREE.Mesh(this._sphereGeo, lensMat.clone());
          antNode.scale.set(s * 0.02, s * 0.02, s * 0.02);
          antNode.position.set(-s * 0.05 + i * s * 0.08, s * 1.32 + i * s * 0.05, -s * 0.3);
          group.add(antNode);
        }
        // Crossbar connecting antennas
        const crossbar = new THREE.Mesh(this._boxGeo, flagPoleMat.clone());
        crossbar.scale.set(s * 0.3, s * 0.01, s * 0.01);
        crossbar.position.set(s * 0.07, s * 1.25, -s * 0.3);
        group.add(crossbar);

        // Glowing rune wards inscribed on the armor
        const runeWardMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.4 });
        // Rune ward circles on side plates
        for (const side of [-1, 1]) {
          // Main ward circle
          const wardCircle = new THREE.Mesh(
            new THREE.TorusGeometry(s * 0.12, s * 0.01, 4, 12),
            runeWardMat,
          );
          wardCircle.position.set(s * 0.15, s * 0.65, side * s * 0.87);
          wardCircle.rotation.y = Math.PI / 2;
          group.add(wardCircle);
          // Inner rune glyph cross
          const wardCross1 = new THREE.Mesh(this._boxGeo, runeWardMat);
          wardCross1.scale.set(s * 0.008, s * 0.18, s * 0.008);
          wardCross1.position.set(s * 0.15, s * 0.65, side * s * 0.87);
          group.add(wardCross1);
          const wardCross2 = new THREE.Mesh(this._boxGeo, runeWardMat);
          wardCross2.scale.set(s * 0.008, s * 0.008, s * 0.008);
          wardCross2.position.set(s * 0.15, s * 0.65, side * s * 0.87);
          wardCross2.scale.set(s * 0.18, s * 0.008, s * 0.008);
          wardCross2.rotation.z = Math.PI / 4;
          group.add(wardCross2);
        }
        // Front plow rune ward
        const frontWard = new THREE.Mesh(
          new THREE.TorusGeometry(s * 0.15, s * 0.012, 4, 12),
          runeWardMat,
        );
        frontWard.position.set(s * 0.05, s * 0.45, s * 0.67);
        frontWard.rotation.x = Math.PI / 2;
        group.add(frontWard);
        // Rune lines radiating from front ward
        for (let i = 0; i < 6; i++) {
          const rAng = (i / 6) * Math.PI * 2;
          const runeLine = new THREE.Mesh(this._boxGeo, runeWardMat);
          runeLine.scale.set(s * 0.008, s * 0.1, s * 0.008);
          runeLine.position.set(
            s * 0.05 + Math.cos(rAng) * s * 0.08,
            s * 0.45 + Math.sin(rAng) * s * 0.08,
            s * 0.67,
          );
          runeLine.rotation.z = rAng;
          group.add(runeLine);
        }

        // Mechanical pistons/hydraulics visible on the leg joints
        const pistonMat = new THREE.MeshPhongMaterial({ color: 0x666666, flatShading: true, shininess: 80, specular: 0x888888 });
        const hydraulicMat = new THREE.MeshPhongMaterial({ color: 0x777777, flatShading: true, shininess: 90 });
        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < 4; i++) {
            const legZ = -s * 0.5 + i * s * 0.3;
            const legSpread = s * 0.7 + i * s * 0.05;
            // Hydraulic cylinder on upper leg
            const hydraulicCyl = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.02, s * 0.02, s * 0.2, 6), pistonMat);
            hydraulicCyl.position.set(side * (legSpread + s * 0.04), s * 0.45, legZ + s * 0.04);
            hydraulicCyl.rotation.z = side * 0.4;
            group.add(hydraulicCyl);
            // Piston rod inside cylinder
            const pistonRod = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.01, s * 0.01, s * 0.15, 6), hydraulicMat);
            pistonRod.position.set(side * (legSpread + s * 0.08), s * 0.35, legZ + s * 0.04);
            pistonRod.rotation.z = side * 0.5;
            group.add(pistonRod);
            // Joint bracket at knee
            const bracket = new THREE.Mesh(this._boxGeo, pistonMat.clone());
            bracket.scale.set(s * 0.04, s * 0.03, s * 0.08);
            bracket.position.set(side * (legSpread + s * 0.12), s * 0.28, legZ);
            group.add(bracket);
            // Lower hydraulic line
            const lowerHydraulic = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.015, s * 0.015, s * 0.15, 6), pistonMat.clone());
            lowerHydraulic.position.set(side * (legSpread + s * 0.15), s * 0.15, legZ - s * 0.03);
            lowerHydraulic.rotation.z = side * -0.2;
            group.add(lowerHydraulic);
          }
        }

        break;
      }

      case TDEnemyType.SIEGE_GOLEM: {
        // === RUINED TITAN ===
        // Crumbling stone colossus with hammer-fist, cannon-arm, magma core, baleful eye, chains, rune brands
        const stoneMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true });
        const wornStoneMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x0c0c0c, flatShading: true });
        const crackedMat = new THREE.MeshPhongMaterial({ color: enemy.color + 0x080808, flatShading: true });
        const magmaMat = new THREE.MeshBasicMaterial({ color: 0xff4400, transparent: true, opacity: 0.8 });
        const magmaGlowMat = new THREE.MeshBasicMaterial({ color: 0xff6622, transparent: true, opacity: 0.5 });
        const eyeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const chainMat = new THREE.MeshPhongMaterial({ color: 0x555555, flatShading: true, shininess: 40 });
        const runeBrandMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.55 });
        const metalArmMat = new THREE.MeshPhongMaterial({ color: 0x444444, flatShading: true, shininess: 60, specular: 0x555555 });

        // === LEGS — massive crumbling stone pillars ===
        for (const side of [-1, 1]) {
          // Thigh
          const thigh = new THREE.Mesh(this._boxGeo, stoneMat);
          thigh.scale.set(s * 0.5, s * 0.7, s * 0.5);
          thigh.position.set(0, s * 0.55, side * s * 0.45);
          group.add(thigh);
          // Knee joint
          const knee = new THREE.Mesh(this._sphereGeo, crackedMat);
          knee.scale.set(s * 0.25, s * 0.25, s * 0.25);
          knee.position.set(0, s * 0.9, side * s * 0.45);
          group.add(knee);
          // Shin
          const shin = new THREE.Mesh(this._boxGeo, wornStoneMat);
          shin.scale.set(s * 0.4, s * 0.5, s * 0.4);
          shin.position.set(0, s * 0.25, side * s * 0.45);
          group.add(shin);
          // Foot — heavy stone slab
          const foot = new THREE.Mesh(this._boxGeo, wornStoneMat.clone());
          foot.scale.set(s * 0.55, s * 0.15, s * 0.45);
          foot.position.set(s * 0.05, s * 0.08, side * s * 0.45);
          group.add(foot);
          // Crumbling debris at feet
          for (let d = 0; d < 3; d++) {
            const debris = new THREE.Mesh(this._boxGeo, crackedMat.clone());
            debris.scale.set(s * 0.08, s * 0.06, s * 0.07);
            debris.position.set(s * 0.15 * (d - 1), s * 0.03, side * s * 0.45 + (d - 1) * s * 0.12);
            debris.rotation.set(d * 0.5, d * 0.8, d * 0.3);
            group.add(debris);
          }
          // Chain dragging from each leg
          for (let c = 0; c < 5; c++) {
            const chainLink = new THREE.Mesh(new THREE.TorusGeometry(s * 0.04, s * 0.012, 4, 6), chainMat);
            chainLink.position.set(s * 0.15, s * 0.15 + c * s * 0.08, side * s * 0.55);
            chainLink.rotation.x = c * 0.5;
            chainLink.rotation.z = Math.PI / 2;
            group.add(chainLink);
          }
        }

        // === TORSO — massive cracked stone chest ===
        const torso = new THREE.Mesh(this._boxGeo, stoneMat);
        torso.scale.set(s * 1.8, s * 1.5, s * 1.4);
        torso.position.y = s * 1.75;
        group.add(torso);
        // Upper chest ridge
        const chestRidge = new THREE.Mesh(this._boxGeo, wornStoneMat);
        chestRidge.scale.set(s * 1.5, s * 0.2, s * 0.15);
        chestRidge.position.set(0, s * 2.35, s * 0.65);
        group.add(chestRidge);

        // Exposed magma/energy core visible through cracks in chest
        const magmaCore = new THREE.Mesh(this._sphereGeo, magmaMat);
        magmaCore.scale.set(s * 0.4, s * 0.45, s * 0.35);
        magmaCore.position.set(0, s * 1.8, s * 0.6);
        group.add(magmaCore);
        // Magma glow halo
        const magmaHalo = new THREE.Mesh(this._sphereGeo, magmaGlowMat);
        magmaHalo.scale.set(s * 0.55, s * 0.6, s * 0.2);
        magmaHalo.position.set(0, s * 1.8, s * 0.65);
        group.add(magmaHalo);
        // Cracks radiating from core
        for (let i = 0; i < 6; i++) {
          const crack = new THREE.Mesh(this._boxGeo, magmaMat.clone());
          const cAng = (i / 6) * Math.PI * 2;
          crack.scale.set(s * 0.03, s * 0.3, s * 0.02);
          crack.position.set(
            Math.cos(cAng) * s * 0.35,
            s * 1.8 + Math.sin(cAng) * s * 0.3,
            s * 0.7,
          );
          crack.rotation.z = cAng;
          group.add(crack);
        }

        // Heavy pauldrons on shoulders
        for (const side of [-1, 1]) {
          // Main pauldron
          const pauldron = new THREE.Mesh(this._boxGeo, wornStoneMat);
          pauldron.scale.set(s * 0.55, s * 0.35, s * 0.65);
          pauldron.position.set(0, s * 2.55, side * s * 0.9);
          group.add(pauldron);
          // Pauldron spike
          const spike = new THREE.Mesh(this._coneGeo, stoneMat.clone());
          spike.scale.set(s * 0.12, s * 0.3, s * 0.12);
          spike.position.set(0, s * 2.8, side * s * 0.95);
          group.add(spike);
          // Pauldron edge detail
          const edgeDetail = new THREE.Mesh(this._boxGeo, crackedMat);
          edgeDetail.scale.set(s * 0.5, s * 0.06, s * 0.7);
          edgeDetail.position.set(0, s * 2.38, side * s * 0.9);
          group.add(edgeDetail);
        }

        // === LEFT ARM — massive hammer-fist ===
        const hammerUpperArm = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        hammerUpperArm.scale.set(s * 0.4, s * 0.9, s * 0.4);
        hammerUpperArm.position.set(0, s * 1.7, -s * 1.1);
        group.add(hammerUpperArm);
        // Elbow joint
        const hammerElbow = new THREE.Mesh(this._sphereGeo, crackedMat);
        hammerElbow.scale.set(s * 0.2, s * 0.2, s * 0.2);
        hammerElbow.position.set(0, s * 1.2, -s * 1.1);
        group.add(hammerElbow);
        // Forearm
        const hammerForearm = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        hammerForearm.scale.set(s * 0.35, s * 0.7, s * 0.35);
        hammerForearm.position.set(0, s * 0.85, -s * 1.2);
        group.add(hammerForearm);
        // Giant hammer head
        const hammerHead = new THREE.Mesh(this._boxGeo, wornStoneMat);
        hammerHead.scale.set(s * 0.7, s * 0.5, s * 0.6);
        hammerHead.position.set(0, s * 0.45, -s * 1.2);
        group.add(hammerHead);
        // Hammer impact face — magma-infused
        const hammerFace = new THREE.Mesh(this._boxGeo, magmaMat.clone());
        hammerFace.scale.set(s * 0.5, s * 0.35, s * 0.05);
        hammerFace.position.set(0, s * 0.42, -s * 1.5);
        group.add(hammerFace);
        // Rune brand on hammer
        const hammerRune = new THREE.Mesh(new THREE.TorusGeometry(s * 0.12, s * 0.02, 4, 6), runeBrandMat);
        hammerRune.position.set(0, s * 0.45, -s * 1.52);
        hammerRune.rotation.x = Math.PI / 2;
        group.add(hammerRune);
        // Chain wrapped around hammer arm
        for (let c = 0; c < 4; c++) {
          const chainLink = new THREE.Mesh(new THREE.TorusGeometry(s * 0.22, s * 0.015, 4, 8), chainMat);
          chainLink.position.set(0, s * 1.0 + c * s * 0.2, -s * 1.15);
          chainLink.rotation.y = Math.PI / 2;
          group.add(chainLink);
        }

        // === RIGHT ARM — cannon arm ===
        const cannonUpperArm = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        cannonUpperArm.scale.set(s * 0.4, s * 0.8, s * 0.4);
        cannonUpperArm.position.set(0, s * 1.7, s * 1.1);
        group.add(cannonUpperArm);
        // Elbow mechanism
        const cannonElbow = new THREE.Mesh(this._sphereGeo, metalArmMat);
        cannonElbow.scale.set(s * 0.22, s * 0.22, s * 0.22);
        cannonElbow.position.set(0, s * 1.25, s * 1.1);
        group.add(cannonElbow);
        // Cannon housing
        const cannonHousing = new THREE.Mesh(this._boxGeo, metalArmMat.clone());
        cannonHousing.scale.set(s * 0.45, s * 0.45, s * 0.5);
        cannonHousing.position.set(0, s * 0.95, s * 1.15);
        group.add(cannonHousing);
        // Cannon barrel
        const cannonBarrel = new THREE.Mesh(new THREE.CylinderGeometry(s * 0.1, s * 0.15, s * 1.0, 10), metalArmMat);
        cannonBarrel.rotation.x = Math.PI / 2;
        cannonBarrel.position.set(0, s * 0.95, s * 1.65);
        group.add(cannonBarrel);
        // Cannon muzzle ring
        const muzzleRing = new THREE.Mesh(new THREE.TorusGeometry(s * 0.13, s * 0.025, 6, 10), metalArmMat.clone());
        muzzleRing.position.set(0, s * 0.95, s * 2.15);
        group.add(muzzleRing);
        // Energy glow in cannon bore
        const boreGlow = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.7 }));
        boreGlow.scale.set(s * 0.08, s * 0.08, s * 0.08);
        boreGlow.position.set(0, s * 0.95, s * 2.18);
        group.add(boreGlow);
        // Chain hanging from cannon arm
        for (let c = 0; c < 3; c++) {
          const chainLink = new THREE.Mesh(new THREE.TorusGeometry(s * 0.05, s * 0.012, 4, 6), chainMat);
          chainLink.position.set(s * 0.2, s * 0.65 - c * s * 0.1, s * 1.0);
          chainLink.rotation.z = c * 0.4;
          group.add(chainLink);
        }

        // === HEAD — weathered stone with single baleful eye and cracked jaw ===
        const headBlock = new THREE.Mesh(this._boxGeo, crackedMat);
        headBlock.scale.set(s * 0.85, s * 0.7, s * 0.75);
        headBlock.position.y = s * 2.85;
        group.add(headBlock);
        // Brow ridge
        const browRidge = new THREE.Mesh(this._boxGeo, wornStoneMat.clone());
        browRidge.scale.set(s * 0.9, s * 0.15, s * 0.2);
        browRidge.position.set(0, s * 3.1, s * 0.3);
        group.add(browRidge);
        // Single baleful glowing eye — large and centered
        const eyeSocket = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({ color: 0x111111 }));
        eyeSocket.scale.set(s * 0.3, s * 0.2, s * 0.08);
        eyeSocket.position.set(0, s * 2.95, s * 0.38);
        group.add(eyeSocket);
        const balefulEye = new THREE.Mesh(this._sphereGeo, eyeMat);
        balefulEye.scale.set(s * 0.15, s * 0.15, s * 0.1);
        balefulEye.position.set(0, s * 2.95, s * 0.42);
        group.add(balefulEye);
        // Eye glow aura
        const eyeAura = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.25 }));
        eyeAura.scale.set(s * 0.25, s * 0.25, s * 0.1);
        eyeAura.position.set(0, s * 2.95, s * 0.43);
        group.add(eyeAura);
        // Cracked jaw — split into two halves, hanging open
        const jawLeft = new THREE.Mesh(this._boxGeo, crackedMat.clone());
        jawLeft.scale.set(s * 0.35, s * 0.2, s * 0.2);
        jawLeft.position.set(0, s * 2.5, s * 0.2);
        jawLeft.rotation.z = 0.15;
        group.add(jawLeft);
        const jawRight = new THREE.Mesh(this._boxGeo, crackedMat.clone());
        jawRight.scale.set(s * 0.35, s * 0.2, s * 0.2);
        jawRight.position.set(0, s * 2.5, -s * 0.2);
        jawRight.rotation.z = -0.15;
        group.add(jawRight);
        // Broken stone teeth
        for (let t = 0; t < 4; t++) {
          const tooth = new THREE.Mesh(this._coneGeo, crackedMat.clone());
          tooth.scale.set(s * 0.04, s * 0.08, s * 0.04);
          tooth.position.set(0, s * 2.42, -s * 0.15 + t * s * 0.1);
          tooth.rotation.z = Math.PI;
          group.add(tooth);
        }

        // Rune brands glowing on skin/body
        for (let i = 0; i < 8; i++) {
          const rAng = (i / 8) * Math.PI * 2;
          const runeY = s * 1.3 + (i % 4) * s * 0.4;
          const runeR = s * 0.75 + (i % 2) * s * 0.15;
          const runeBrand = new THREE.Mesh(this._boxGeo, runeBrandMat);
          runeBrand.scale.set(s * 0.15, s * 0.08, s * 0.01);
          runeBrand.position.set(
            Math.cos(rAng) * runeR * 0.15,
            runeY,
            Math.sin(rAng) * runeR,
          );
          runeBrand.rotation.y = rAng;
          group.add(runeBrand);
        }
        // Large rune circle on back
        const backRune = new THREE.Mesh(new THREE.TorusGeometry(s * 0.35, s * 0.025, 4, 8), runeBrandMat);
        backRune.position.set(0, s * 1.8, -s * 0.72);

        // --- Additional crack detail with lava/energy visible ---
        const deepCrackMat = new THREE.MeshBasicMaterial({
          color: 0xff3300,
          transparent: true,
          opacity: 0.85,
        });
        const crackLineMat = new THREE.MeshBasicMaterial({
          color: 0xff5500,
          transparent: true,
          opacity: 0.6,
        });
        // Vertical cracks on torso front
        for (let vc = 0; vc < 4; vc++) {
          const vertCrack = new THREE.Mesh(this._boxGeo, deepCrackMat);
          vertCrack.scale.set(s * 0.02, s * (0.3 + vc * 0.1), s * 0.015);
          vertCrack.position.set(
            s * 0.75,
            s * 1.5 + vc * s * 0.2,
            s * (-0.3 + vc * 0.2),
          );
          vertCrack.rotation.z = (vc - 1.5) * 0.12;
          group.add(vertCrack);
        }
        // Horizontal cracks across torso sides
        for (let hc = 0; hc < 3; hc++) {
          const horizCrack = new THREE.Mesh(this._boxGeo, crackLineMat);
          horizCrack.scale.set(s * 0.015, s * 0.02, s * (0.4 + hc * 0.15));
          horizCrack.position.set(
            s * 0.6,
            s * 1.6 + hc * s * 0.25,
            0,
          );
          group.add(horizCrack);
        }
        // Diagonal cracks on back
        for (let dc = 0; dc < 3; dc++) {
          const diagCrack = new THREE.Mesh(this._boxGeo, deepCrackMat);
          diagCrack.scale.set(s * 0.02, s * 0.35, s * 0.015);
          diagCrack.position.set(
            -s * 0.7,
            s * 1.7 + dc * s * 0.15,
            s * (-0.2 + dc * 0.2),
          );
          diagCrack.rotation.set(0, 0, dc * 0.25);
          group.add(diagCrack);
        }
        // Lava glow spots visible in deep cracks
        for (let lg = 0; lg < 5; lg++) {
          const lavaGlow = new THREE.Mesh(this._sphereGeo, magmaGlowMat);
          lavaGlow.scale.set(s * 0.06, s * 0.04, s * 0.03);
          const lgAng = (lg / 5) * Math.PI * 1.5 - 0.5;
          lavaGlow.position.set(
            Math.cos(lgAng) * s * 0.78,
            s * 1.6 + lg * s * 0.15,
            Math.sin(lgAng) * s * 0.6,
          );
          group.add(lavaGlow);
        }

        // --- Hanging moss and vines on legs and lower body ---
        const mossMat = new THREE.MeshPhongMaterial({
          color: 0x2a4a1a,
          transparent: true,
          opacity: 0.65,
          flatShading: true,
        });
        const vineMat = new THREE.MeshPhongMaterial({
          color: 0x1a3a12,
          transparent: true,
          opacity: 0.6,
        });
        for (const mvSide of [-1, 1]) {
          // Moss clumps on thighs
          for (let mc = 0; mc < 3; mc++) {
            const mossClump = new THREE.Mesh(this._sphereGeo, mossMat);
            mossClump.scale.set(s * 0.08, s * 0.06, s * 0.1);
            mossClump.position.set(
              s * 0.15,
              s * 0.5 + mc * s * 0.15,
              mvSide * s * (0.5 + mc * 0.05),
            );
            group.add(mossClump);
          }
          // Hanging vine strands on shins
          for (let vn = 0; vn < 3; vn++) {
            const vine = new THREE.Mesh(this._boxGeo, vineMat);
            vine.scale.set(s * 0.015, s * (0.15 + vn * 0.06), s * 0.015);
            vine.position.set(
              s * 0.12 + vn * s * 0.05,
              s * 0.2 - vn * s * 0.04,
              mvSide * s * 0.5,
            );
            vine.rotation.z = (vn - 1) * 0.15;
            group.add(vine);
          }
          // Moss on feet
          const footMoss = new THREE.Mesh(this._sphereGeo, mossMat);
          footMoss.scale.set(s * 0.12, s * 0.04, s * 0.1);
          footMoss.position.set(s * 0.1, s * 0.16, mvSide * s * 0.45);
          group.add(footMoss);
        }
        // Moss on lower torso
        for (let lm = 0; lm < 4; lm++) {
          const lowerMoss = new THREE.Mesh(this._sphereGeo, mossMat);
          lowerMoss.scale.set(s * 0.1, s * 0.05, s * 0.08);
          const lmAng = (lm / 4) * Math.PI - 0.3;
          lowerMoss.position.set(
            Math.cos(lmAng) * s * 0.75,
            s * 1.1,
            Math.sin(lmAng) * s * 0.6,
          );
          group.add(lowerMoss);
        }

        // --- Inscribed rune bands around upper arms ---
        const runeArmBandMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.5,
        });
        // Left arm (hammer arm) rune bands
        for (let rb = 0; rb < 3; rb++) {
          const runeBandL = new THREE.Mesh(this._boxGeo, runeArmBandMat);
          runeBandL.scale.set(s * 0.42, s * 0.03, s * 0.42);
          runeBandL.position.set(0, s * 1.45 + rb * s * 0.12, -s * 1.1);
          group.add(runeBandL);
          // Individual rune glyphs on band
          for (let rg = 0; rg < 4; rg++) {
            const runeOnArm = new THREE.Mesh(this._boxGeo, runeArmBandMat);
            runeOnArm.scale.set(s * 0.04, s * 0.06, s * 0.015);
            const rgAng = (rg / 4) * Math.PI * 2;
            runeOnArm.position.set(
              Math.cos(rgAng) * s * 0.2,
              s * 1.45 + rb * s * 0.12,
              -s * 1.1 + Math.sin(rgAng) * s * 0.2,
            );
            runeOnArm.rotation.y = rgAng;
            group.add(runeOnArm);
          }
        }
        // Right arm (cannon arm) rune bands
        for (let rb2 = 0; rb2 < 3; rb2++) {
          const runeBandR = new THREE.Mesh(this._boxGeo, runeArmBandMat);
          runeBandR.scale.set(s * 0.42, s * 0.03, s * 0.42);
          runeBandR.position.set(0, s * 1.45 + rb2 * s * 0.12, s * 1.1);
          group.add(runeBandR);
          for (let rg2 = 0; rg2 < 4; rg2++) {
            const runeOnArmR = new THREE.Mesh(this._boxGeo, runeArmBandMat);
            runeOnArmR.scale.set(s * 0.04, s * 0.06, s * 0.015);
            const rgAng2 = (rg2 / 4) * Math.PI * 2;
            runeOnArmR.position.set(
              Math.cos(rgAng2) * s * 0.2,
              s * 1.45 + rb2 * s * 0.12,
              s * 1.1 + Math.sin(rgAng2) * s * 0.2,
            );
            runeOnArmR.rotation.y = rgAng2;
            group.add(runeOnArmR);
          }
        }

        // --- Broken stone crown/halo tilted on head ---
        const crownMat = new THREE.MeshPhongMaterial({
          color: enemy.color + 0x111111,
          flatShading: true,
          shininess: 30,
        });
        // Crown base ring (broken — segments)
        for (let cr = 0; cr < 7; cr++) {
          const crownSeg = new THREE.Mesh(this._boxGeo, crownMat);
          const crAng = (cr / 8) * Math.PI * 2;
          crownSeg.scale.set(s * 0.12, s * 0.08, s * 0.06);
          crownSeg.position.set(
            Math.cos(crAng) * s * 0.4,
            s * 3.25 + Math.sin(crAng * 2) * s * 0.02,
            Math.sin(crAng) * s * 0.4,
          );
          crownSeg.rotation.set(0.15, crAng, 0.1);
          group.add(crownSeg);
        }
        // Crown spikes (some broken/missing)
        for (let cs2 = 0; cs2 < 5; cs2++) {
          const csAng = (cs2 / 5) * Math.PI * 2;
          const spikeH = cs2 === 2 ? s * 0.08 : s * (0.15 + cs2 * 0.03);
          const crownSpike = new THREE.Mesh(this._coneGeo, crownMat);
          crownSpike.scale.set(s * 0.04, spikeH, s * 0.04);
          crownSpike.position.set(
            Math.cos(csAng) * s * 0.4,
            s * 3.32,
            Math.sin(csAng) * s * 0.4,
          );
          crownSpike.rotation.set(0.15, 0, cs2 === 2 ? 0.4 : 0);
          group.add(crownSpike);
        }

        // --- Foot/boot detail: individual stone toes, ankle armor ---
        for (const ftSide of [-1, 1]) {
          // Individual stone toes
          for (let toe = 0; toe < 3; toe++) {
            const stoneToe = new THREE.Mesh(this._boxGeo, wornStoneMat);
            stoneToe.scale.set(s * 0.12, s * 0.08, s * 0.1);
            stoneToe.position.set(
              s * 0.2 + toe * s * 0.08,
              s * 0.04,
              ftSide * s * 0.45 + (toe - 1) * ftSide * s * 0.08,
            );
            stoneToe.rotation.y = (toe - 1) * ftSide * 0.15;
            group.add(stoneToe);
          }
          // Ankle armor plates
          const anklePlate = new THREE.Mesh(this._boxGeo, stoneMat);
          anklePlate.scale.set(s * 0.35, s * 0.12, s * 0.35);
          anklePlate.position.set(0, s * 0.18, ftSide * s * 0.45);
          group.add(anklePlate);
          // Ankle guard rivets
          for (let ar = 0; ar < 4; ar++) {
            const ankleRivet = new THREE.Mesh(this._sphereGeo, crackedMat);
            ankleRivet.scale.set(s * 0.03, s * 0.03, s * 0.03);
            const arAng = (ar / 4) * Math.PI * 2;
            ankleRivet.position.set(
              Math.cos(arAng) * s * 0.16,
              s * 0.18,
              ftSide * s * 0.45 + Math.sin(arAng) * s * 0.16,
            );
            group.add(ankleRivet);
          }
        }

        // --- Battle damage: embedded weapon fragments ---
        // Broken sword blade embedded in left shoulder
        const brokenBladeMat = new THREE.MeshPhongMaterial({
          color: 0x888899,
          shininess: 80,
          specular: 0x666666,
          flatShading: true,
        });
        const brokenBlade = new THREE.Mesh(this._boxGeo, brokenBladeMat);
        brokenBlade.scale.set(s * 0.04, s * 0.5, s * 0.12);
        brokenBlade.position.set(s * 0.2, s * 2.6, -s * 0.85);
        brokenBlade.rotation.set(0.3, 0, -0.6);
        group.add(brokenBlade);
        // Broken blade snapped edge
        const bladeSnapEdge = new THREE.Mesh(this._coneGeo, brokenBladeMat);
        bladeSnapEdge.scale.set(s * 0.04, s * 0.08, s * 0.1);
        bladeSnapEdge.position.set(s * 0.35, s * 2.85, -s * 0.8);
        bladeSnapEdge.rotation.set(0.3, 0, -0.6);
        group.add(bladeSnapEdge);
        // Arrow shafts embedded in back
        const arrowShaftMat = new THREE.MeshPhongMaterial({
          color: 0x664422,
          flatShading: true,
        });
        for (let aw = 0; aw < 3; aw++) {
          // Arrow shaft
          const arrowShaft = new THREE.Mesh(this._boxGeo, arrowShaftMat);
          arrowShaft.scale.set(s * 0.02, s * 0.35, s * 0.02);
          arrowShaft.position.set(
            -s * 0.7,
            s * 1.8 + aw * s * 0.3,
            s * (-0.3 + aw * 0.3),
          );
          arrowShaft.rotation.set(aw * 0.1, 0, 0.4 + aw * 0.1);
          group.add(arrowShaft);
          // Arrow fletching
          const fletchMat = new THREE.MeshPhongMaterial({ color: 0x886644, flatShading: true });
          const fletching = new THREE.Mesh(this._coneGeo, fletchMat);
          fletching.scale.set(s * 0.03, s * 0.06, s * 0.01);
          fletching.position.set(
            -s * 0.82,
            s * 2.0 + aw * s * 0.3,
            s * (-0.3 + aw * 0.3),
          );
          fletching.rotation.set(aw * 0.1, 0, 0.4 + aw * 0.1);
          group.add(fletching);
        }

        // --- Power conduits from core to arms (glowing tubes) ---
        const conduitMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.6,
        });
        const conduitOuterMat = new THREE.MeshPhongMaterial({
          color: 0x333333,
          transparent: true,
          opacity: 0.7,
          flatShading: true,
        });
        // Left arm conduit (to hammer)
        for (let pc = 0; pc < 5; pc++) {
          // Outer tube segment
          const conduitOuter = new THREE.Mesh(this._boxGeo, conduitOuterMat);
          conduitOuter.scale.set(s * 0.06, s * 0.06, s * 0.15);
          const pcT = pc / 4;
          conduitOuter.position.set(
            0,
            s * 1.8 - pcT * s * 0.3,
            -s * 0.7 - pcT * s * 0.4,
          );
          group.add(conduitOuter);
          // Inner glow
          const conduitGlow = new THREE.Mesh(this._boxGeo, conduitMat);
          conduitGlow.scale.set(s * 0.03, s * 0.03, s * 0.16);
          conduitGlow.position.set(
            0,
            s * 1.8 - pcT * s * 0.3,
            -s * 0.7 - pcT * s * 0.4,
          );
          group.add(conduitGlow);
        }
        // Right arm conduit (to cannon)
        for (let pc2 = 0; pc2 < 5; pc2++) {
          const conduitOuter2 = new THREE.Mesh(this._boxGeo, conduitOuterMat);
          conduitOuter2.scale.set(s * 0.06, s * 0.06, s * 0.15);
          const pcT2 = pc2 / 4;
          conduitOuter2.position.set(
            0,
            s * 1.8 - pcT2 * s * 0.3,
            s * 0.7 + pcT2 * s * 0.4,
          );
          group.add(conduitOuter2);
          const conduitGlow2 = new THREE.Mesh(this._boxGeo, conduitMat);
          conduitGlow2.scale.set(s * 0.03, s * 0.03, s * 0.16);
          conduitGlow2.position.set(
            0,
            s * 1.8 - pcT2 * s * 0.3,
            s * 0.7 + pcT2 * s * 0.4,
          );
          group.add(conduitGlow2);
        }

        // --- Grinding gears/mechanisms at hip and shoulder joints ---
        const gearMat = new THREE.MeshPhongMaterial({
          color: 0x555555,
          shininess: 70,
          specular: 0x666666,
          flatShading: true,
        });
        // Hip joint gears
        for (const gSide of [-1, 1]) {
          // Large gear
          const hipGear = new THREE.Mesh(this._sphereGeo, gearMat);
          hipGear.scale.set(s * 0.15, s * 0.15, s * 0.05);
          hipGear.position.set(0, s * 0.95, gSide * s * 0.5);
          group.add(hipGear);
          // Gear teeth
          for (let gt = 0; gt < 6; gt++) {
            const tooth = new THREE.Mesh(this._boxGeo, gearMat);
            tooth.scale.set(s * 0.04, s * 0.03, s * 0.06);
            const gtAng = (gt / 6) * Math.PI * 2;
            tooth.position.set(
              Math.cos(gtAng) * s * 0.14,
              s * 0.95 + Math.sin(gtAng) * s * 0.14,
              gSide * s * 0.5,
            );
            tooth.rotation.z = gtAng;
            group.add(tooth);
          }
          // Small secondary gear
          const smallGear = new THREE.Mesh(this._sphereGeo, gearMat);
          smallGear.scale.set(s * 0.08, s * 0.08, s * 0.04);
          smallGear.position.set(s * 0.12, s * 1.05, gSide * s * 0.52);
          group.add(smallGear);
        }
        // Shoulder joint gears
        for (const sSide of [-1, 1]) {
          const shoulderGear = new THREE.Mesh(this._sphereGeo, gearMat);
          shoulderGear.scale.set(s * 0.12, s * 0.12, s * 0.04);
          shoulderGear.position.set(0, s * 2.35, sSide * s * 0.82);
          group.add(shoulderGear);
          // Gear teeth
          for (let st = 0; st < 5; st++) {
            const sTooth = new THREE.Mesh(this._boxGeo, gearMat);
            sTooth.scale.set(s * 0.035, s * 0.025, s * 0.05);
            const stAng = (st / 5) * Math.PI * 2;
            sTooth.position.set(
              Math.cos(stAng) * s * 0.11,
              s * 2.35 + Math.sin(stAng) * s * 0.11,
              sSide * s * 0.82,
            );
            sTooth.rotation.z = stAng;
            group.add(sTooth);
          }
          // Axle bolt
          const axleBolt = new THREE.Mesh(this._sphereGeo, gearMat);
          axleBolt.scale.set(s * 0.04, s * 0.04, s * 0.06);
          axleBolt.position.set(0, s * 2.35, sSide * s * 0.84);
          group.add(axleBolt);
        }

        // --- Trophy skulls hanging from chains at waist ---
        const trophySkullMat = new THREE.MeshPhongMaterial({
          color: 0xbbaa88,
          flatShading: true,
        });
        for (let ts = 0; ts < 3; ts++) {
          const tsAng = (ts / 3) * Math.PI - Math.PI * 0.3;
          // Chain links hanging down
          for (let tcl = 0; tcl < 3; tcl++) {
            const tChainLink = new THREE.Mesh(this._sphereGeo, chainMat);
            tChainLink.scale.set(s * 0.03, s * 0.025, s * 0.03);
            tChainLink.position.set(
              Math.cos(tsAng) * s * 0.8,
              s * 1.1 - tcl * s * 0.08,
              Math.sin(tsAng) * s * 0.6,
            );
            group.add(tChainLink);
          }
          // Skull
          const trophySkull = new THREE.Mesh(this._sphereGeo, trophySkullMat);
          trophySkull.scale.set(s * 0.08, s * 0.09, s * 0.07);
          trophySkull.position.set(
            Math.cos(tsAng) * s * 0.8,
            s * 0.82,
            Math.sin(tsAng) * s * 0.6,
          );
          group.add(trophySkull);
          // Skull jaw
          const tsJaw = new THREE.Mesh(this._boxGeo, trophySkullMat);
          tsJaw.scale.set(s * 0.06, s * 0.03, s * 0.05);
          tsJaw.position.set(
            Math.cos(tsAng) * s * 0.83,
            s * 0.76,
            Math.sin(tsAng) * s * 0.6,
          );
          group.add(tsJaw);
          // Skull eye holes
          for (const tsEye of [-1, 1]) {
            const eyeHole = new THREE.Mesh(this._sphereGeo, eyeMat);
            eyeHole.scale.set(s * 0.015, s * 0.02, s * 0.015);
            eyeHole.position.set(
              Math.cos(tsAng) * s * 0.85,
              s * 0.84,
              Math.sin(tsAng) * s * 0.6 + tsEye * s * 0.025,
            );
            group.add(eyeHole);
          }
        }
        group.add(backRune);
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
          const r = s * (0.18 + Math.sin(i * 0.5) * 0.05);
          const scalePlate = new THREE.Mesh(this._sphereGeo, scaleMat);
          scalePlate.scale.set(r, r * 0.5, r * 1.3);
          scalePlate.position.set(-s * 1.5 + i * s * 0.35, s * 0.55 + Math.sin(i * 0.6) * s * 0.05, 0);
          group.add(scalePlate);
        }

        // Neck — thicker, muscular (using cylinderGeo with scale)
        const neck = new THREE.Mesh(this._cylinderGeo, bodyMat);
        neck.scale.set(s * 0.33, s * 1.2, s * 0.33);
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
        const snout = new THREE.Mesh(this._coneGeo, headMat);
        snout.scale.set(s * 0.22, s * 0.35, s * 0.22);
        snout.rotation.z = -Math.PI / 2;
        snout.position.set(s * 3.15, s * 0.52, 0);
        group.add(snout);

        // Lower jaw — hinged-looking jaw piece
        const jawMat = new THREE.MeshPhongMaterial({
          color: 0x881100,
          emissive: 0xff2200,
          emissiveIntensity: 0.12,
          flatShading: true,
        });
        const jaw = new THREE.Mesh(this._coneGeo, jawMat);
        jaw.scale.set(s * 0.18, s * 0.275, s * 0.18);
        jaw.rotation.z = -Math.PI / 2;
        jaw.position.set(s * 3.0, s * 0.22, 0);
        jaw.name = "dragonJaw";
        group.add(jaw);

        // Teeth — small spikes along upper and lower jaw
        const toothMat = new THREE.MeshPhongMaterial({ color: 0xeeddcc, specular: 0xffffff, shininess: 80 });
        for (let t = 0; t < 5; t++) {
          const toothSize = s * (0.04 + Math.random() * 0.03);
          for (const yOff of [0.58, 0.28]) {
            const tooth = new THREE.Mesh(this._coneGeo, toothMat);
            tooth.scale.set(toothSize, toothSize * 1.5, toothSize);
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
        const mouthGlow = new THREE.Mesh(this._sphereGeo, mouthGlowMat);
        mouthGlow.scale.set(s * 0.15, s * 0.15, s * 0.15);
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
          const horn2 = new THREE.Mesh(this._coneGeo, hornMat);
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

        // Fire eyes — larger with glow (using emissive spheres instead of PointLights)
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        const eyeGlowMat = new THREE.MeshBasicMaterial({
          color: 0xff4400,
          transparent: true,
          opacity: 0.3,
          depthWrite: false,
        });
        for (const z of [-0.2, 0.2]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.12, s * 0.15, s * 0.12);
          eye.position.set(s * 2.65, s * 0.65, z * s);
          group.add(eye);
          // Eye glow sphere (cheap alternative to PointLight)
          const eyeGlow = new THREE.Mesh(this._sphereGeo, eyeGlowMat);
          eyeGlow.scale.set(s * 0.35, s * 0.35, s * 0.35);
          eyeGlow.position.copy(eye.position);
          group.add(eyeGlow);
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
          const spine = new THREE.Mesh(this._coneGeo, spineMat);
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
        const tailMid = new THREE.Mesh(this._coneGeo, tailMat);
        tailMid.scale.set(s * 0.2, s * 1.5, s * 0.2);
        tailMid.rotation.z = Math.PI / 2;
        tailMid.position.set(-s * 3.5, -s * 0.1, 0);
        group.add(tailMid);
        // Tail blade/spike
        const bladeMat = new THREE.MeshPhongMaterial({ color: 0x553300, specular: 0x442211, shininess: 60, flatShading: true });
        const tailBlade = new THREE.Mesh(this._coneGeo, bladeMat);
        tailBlade.scale.set(s * 0.3, s * 0.3, s * 0.3);
        tailBlade.rotation.z = Math.PI / 2;
        tailBlade.position.set(-s * 4.5, -s * 0.15, 0);
        group.add(tailBlade);

        // Legs / claws — stubby but visible
        const legMat = new THREE.MeshPhongMaterial({ color: 0x661000, flatShading: true });
        const clawMat2 = new THREE.MeshPhongMaterial({ color: 0x332200 });
        for (const side of [-1, 1]) {
          for (const xOff of [s * 0.8, -s * 0.5]) {
            const leg = new THREE.Mesh(this._cylinderGeo, legMat);
            leg.scale.set(s * 0.15, s * 0.8, s * 0.15);
            leg.position.set(xOff, -s * 0.7, side * s * 0.7);
            group.add(leg);
            // Claws
            for (let c = -1; c <= 1; c++) {
              const claw = new THREE.Mesh(this._coneGeo, clawMat2);
              claw.scale.set(s * 0.04, s * 0.1, s * 0.04);
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
          const upperBone = new THREE.Mesh(this._cylinderGeo, boneMat);
          upperBone.scale.set(s * 0.1, s * 2.5, s * 0.1);
          upperBone.rotation.x = side * 0.2;
          upperBone.rotation.z = Math.PI / 2;
          upperBone.position.set(0, 0, side * s * 1.2);
          upperArm.add(upperBone);

          // Forearm bone
          const forearm = new THREE.Group();
          forearm.position.set(0, 0, side * s * 2.4);
          forearm.name = side < 0 ? "forearmL" : "forearmR";
          const forearmBone = new THREE.Mesh(this._cylinderGeo, boneMat);
          forearmBone.scale.set(s * 0.075, s * 2.0, s * 0.075);
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
            const fingerBone = new THREE.Mesh(this._cylinderGeo, boneMat);
            fingerBone.scale.set(s * 0.04, len, s * 0.04);
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
          const membrane = new THREE.Mesh(memGeo, membraneMat);
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

      case TDEnemyType.BLOOD_HUNTER: {
        // Gore Stalker — nightmarish bone-spider predator with exposed ribcage and pulsing heart
        const boneMat = new THREE.MeshPhongMaterial({
          color: 0xd4c4a8,
          emissive: 0x331108,
          emissiveIntensity: 0.2,
          specular: 0xffddcc,
          shininess: 40,
        });
        const sinewMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: 0x660011,
          emissiveIntensity: 0.4,
          specular: 0xff2222,
          shininess: 60,
        });

        // --- Ribcage thorax (open-frame body) ---
        // Spine beam running along the top
        const spine = new THREE.Mesh(this._boxGeo, boneMat);
        spine.scale.set(s * 1.2, s * 0.12, s * 0.1);
        spine.position.set(0, s * 0.35, 0);
        group.add(spine);
        // Individual ribs curving down from spine
        for (let i = 0; i < 5; i++) {
          const xOff = (i - 2) * s * 0.22;
          for (const zSide of [-1, 1]) {
            const rib = new THREE.Mesh(this._boxGeo, boneMat.clone());
            rib.scale.set(s * 0.04, s * 0.45, s * 0.04);
            rib.position.set(xOff, s * 0.1, zSide * s * 0.25);
            rib.rotation.z = zSide * 0.15;
            rib.rotation.x = zSide * 0.4;
            group.add(rib);
          }
        }
        // Pulsing heart visible inside ribcage
        const heartMat = new THREE.MeshBasicMaterial({
          color: 0xff0022,
          transparent: true,
          opacity: 0.85,
        });
        const heart = new THREE.Mesh(this._sphereGeo, heartMat);
        heart.scale.set(s * 0.18, s * 0.2, s * 0.16);
        heart.position.set(0, s * 0.1, 0);
        group.add(heart);
        // Heart outer glow
        const heartGlow = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.25,
        }));
        heartGlow.scale.set(s * 0.35, s * 0.35, s * 0.3);
        heartGlow.position.set(0, s * 0.1, 0);
        group.add(heartGlow);

        // --- Elongated skull head with split mandible jaw ---
        const skull = new THREE.Mesh(this._sphereGeo, boneMat.clone());
        skull.scale.set(s * 0.45, s * 0.25, s * 0.28);
        skull.position.set(s * 0.9, s * 0.3, 0);
        group.add(skull);
        // Snout extension
        const snout = new THREE.Mesh(this._boxGeo, boneMat.clone());
        snout.scale.set(s * 0.35, s * 0.1, s * 0.18);
        snout.position.set(s * 1.2, s * 0.28, 0);
        group.add(snout);
        // Split mandible jaws (two halves angled apart)
        for (const zSide of [-1, 1]) {
          const jaw = new THREE.Mesh(this._boxGeo, boneMat.clone());
          jaw.scale.set(s * 0.35, s * 0.06, s * 0.08);
          jaw.position.set(s * 1.15, s * 0.12, zSide * s * 0.1);
          jaw.rotation.y = zSide * 0.15;
          jaw.rotation.z = 0.2;
          group.add(jaw);
          // Jagged teeth along each mandible half
          for (let t = 0; t < 4; t++) {
            const tooth = new THREE.Mesh(this._coneGeo, boneMat.clone());
            tooth.scale.set(s * 0.025, s * 0.1, s * 0.025);
            tooth.position.set(s * (1.0 + t * 0.1), s * 0.08, zSide * s * 0.1);
            tooth.rotation.z = Math.PI;
            group.add(tooth);
          }
        }
        // Upper row of teeth
        for (let t = 0; t < 5; t++) {
          const tooth = new THREE.Mesh(this._coneGeo, boneMat.clone());
          tooth.scale.set(s * 0.02, s * 0.08, s * 0.02);
          tooth.position.set(s * (1.0 + t * 0.08), s * 0.2, 0);
          tooth.rotation.z = Math.PI;
          group.add(tooth);
        }
        // Eye sockets — deep red glow
        const eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        for (const z of [-s * 0.1, s * 0.1]) {
          const eyeSocket = new THREE.Mesh(this._sphereGeo, new THREE.MeshPhongMaterial({ color: 0x110000 }));
          eyeSocket.scale.set(s * 0.09, s * 0.07, s * 0.07);
          eyeSocket.position.set(s * 1.0, s * 0.35, z);
          group.add(eyeSocket);
          const eyeLight = new THREE.Mesh(new THREE.SphereGeometry(s * 0.04, 4, 3), eyeGlowMat);
          eyeLight.position.set(s * 1.03, s * 0.35, z);
          group.add(eyeLight);
        }

        // --- Six articulated bone-and-sinew legs (3 per side) ---
        for (let i = 0; i < 3; i++) {
          const xOff = (i - 1) * s * 0.4;
          for (const zSide of [-1, 1]) {
            // Upper leg segment (bone)
            const upperLeg = new THREE.Mesh(this._boxGeo, boneMat.clone());
            upperLeg.scale.set(s * 0.06, s * 0.5, s * 0.06);
            upperLeg.position.set(xOff, -s * 0.05, zSide * s * 0.4);
            upperLeg.rotation.x = zSide * 0.6;
            upperLeg.rotation.z = (i - 1) * 0.15;
            group.add(upperLeg);
            // Lower leg segment (thinner, with sinew coloring)
            const lowerLeg = new THREE.Mesh(this._boxGeo, sinewMat.clone());
            lowerLeg.scale.set(s * 0.04, s * 0.45, s * 0.04);
            lowerLeg.position.set(xOff, -s * 0.5, zSide * s * 0.75);
            lowerLeg.rotation.x = zSide * -0.3;
            lowerLeg.rotation.z = (i - 1) * 0.1;
            group.add(lowerLeg);
            // Claw tip at end of each leg
            const clawTip = new THREE.Mesh(this._coneGeo, boneMat.clone());
            clawTip.scale.set(s * 0.05, s * 0.15, s * 0.05);
            clawTip.position.set(xOff, -s * 0.85, zSide * s * 0.85);
            clawTip.rotation.x = zSide * -0.5;
            group.add(clawTip);
          }
        }

        // --- Barbed bone spines along the back ---
        for (let i = 0; i < 7; i++) {
          const spineX = (i - 3) * s * 0.18;
          const spineHeight = s * (0.2 + Math.sin(i * 0.8) * 0.08);
          const boneSpine = new THREE.Mesh(this._coneGeo, boneMat.clone());
          boneSpine.scale.set(s * 0.04, spineHeight, s * 0.04);
          boneSpine.position.set(spineX, s * 0.45, 0);
          group.add(boneSpine);
        }

        // --- Tattered membrane wings on bone struts (named for animation) ---
        const wingBoneMat = new THREE.MeshPhongMaterial({
          color: 0xc8b898,
          emissive: 0x331108,
          emissiveIntensity: 0.15,
        });
        const membraneMat = new THREE.MeshPhongMaterial({
          color: 0x880022,
          side: THREE.DoubleSide,
          emissive: 0x440011,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.55,
        });
        // Left wing
        const wingLGroup = new THREE.Group();
        wingLGroup.name = "wingL";
        wingLGroup.position.set(-s * 0.15, s * 0.35, -s * 0.25);
        // Bone struts
        for (let i = 0; i < 3; i++) {
          const strut = new THREE.Mesh(this._boxGeo, wingBoneMat.clone());
          strut.scale.set(s * 0.03, s * 0.03, s * (0.7 + i * 0.15));
          strut.position.set(-s * i * 0.2, s * 0.05 * i, -s * (0.4 + i * 0.1));
          strut.rotation.y = 0.3 + i * 0.12;
          strut.rotation.x = -0.15 * i;
          wingLGroup.add(strut);
        }
        // Tattered membrane between struts
        const membraneL = new THREE.Mesh(this._createWingGeometry(), membraneMat);
        membraneL.scale.set(s * 0.8, s * 0.6, s * 1.2);
        wingLGroup.add(membraneL);
        group.add(wingLGroup);

        // Right wing (mirrored)
        const wingRGroup = new THREE.Group();
        wingRGroup.name = "wingR";
        wingRGroup.position.set(-s * 0.15, s * 0.35, s * 0.25);
        for (let i = 0; i < 3; i++) {
          const strut = new THREE.Mesh(this._boxGeo, wingBoneMat.clone());
          strut.scale.set(s * 0.03, s * 0.03, s * (0.7 + i * 0.15));
          strut.position.set(-s * i * 0.2, s * 0.05 * i, s * (0.4 + i * 0.1));
          strut.rotation.y = -(0.3 + i * 0.12);
          strut.rotation.x = 0.15 * i;
          wingRGroup.add(strut);
        }
        const membraneR = new THREE.Mesh(this._createWingGeometry(), membraneMat.clone());
        membraneR.scale.set(s * 0.8, s * 0.6, -s * 1.2);
        wingRGroup.add(membraneR);
        group.add(wingRGroup);

        // --- Trailing blood-red energy wisps ---
        const wispMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.3,
        });
        for (let i = 0; i < 5; i++) {
          const wisp = new THREE.Mesh(this._sphereGeo, wispMat.clone());
          wisp.scale.set(s * 0.1, s * 0.06, s * 0.06);
          wisp.position.set(-s * (0.7 + i * 0.25), s * (Math.sin(i * 1.3) * 0.15), s * (Math.cos(i * 1.7) * 0.12));
          group.add(wisp);
        }

        // --- Sinew/muscle strands connecting bone legs to ribcage ---
        const sinewStrandMat = new THREE.MeshPhongMaterial({
          color: 0x991122,
          emissive: 0x550011,
          emissiveIntensity: 0.35,
          transparent: true,
          opacity: 0.7,
          specular: 0xff4444,
          shininess: 50,
        });
        for (let li = 0; li < 3; li++) {
          const legX = (li - 1) * s * 0.4;
          for (const zSide of [-1, 1]) {
            // Primary sinew strand
            const strand = new THREE.Mesh(this._cylinderGeo, sinewStrandMat);
            strand.scale.set(s * 0.02, s * 0.35, s * 0.015);
            strand.position.set(legX, s * 0.05, zSide * s * 0.32);
            strand.rotation.x = zSide * 0.5;
            strand.rotation.z = (li - 1) * 0.12;
            group.add(strand);
            // Secondary thinner strand
            const strand2 = new THREE.Mesh(this._cylinderGeo, sinewStrandMat);
            strand2.scale.set(s * 0.012, s * 0.28, s * 0.01);
            strand2.position.set(legX + s * 0.03, s * 0.0, zSide * s * 0.35);
            strand2.rotation.x = zSide * 0.55;
            strand2.rotation.z = (li - 1) * 0.1 + 0.08;
            group.add(strand2);
            // Stretched sinew blob at attachment point
            const sinewBlob = new THREE.Mesh(this._sphereGeo, sinewStrandMat);
            sinewBlob.scale.set(s * 0.04, s * 0.025, s * 0.035);
            sinewBlob.position.set(legX, s * 0.2, zSide * s * 0.27);
            group.add(sinewBlob);
          }
        }

        // --- Dripping blood droplets from jaw and claws ---
        const bloodDripMat = new THREE.MeshPhongMaterial({
          color: 0xcc0011,
          emissive: 0x440000,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.65,
          specular: 0xff6666,
          shininess: 80,
        });
        // Drips from jaw
        for (let jd = 0; jd < 6; jd++) {
          const drip = new THREE.Mesh(this._sphereGeo, bloodDripMat);
          const dripSize = s * (0.015 + Math.random() * 0.015);
          drip.scale.set(dripSize, dripSize * 1.5, dripSize);
          drip.position.set(
            s * (1.0 + jd * 0.06),
            s * (0.02 - Math.random() * 0.08),
            (Math.random() - 0.5) * s * 0.15,
          );
          group.add(drip);
        }
        // Drips from claw tips
        for (let ci = 0; ci < 3; ci++) {
          const clawX = (ci - 1) * s * 0.4;
          for (const zSide of [-1, 1]) {
            const clawDrip = new THREE.Mesh(this._sphereGeo, bloodDripMat);
            const cdSize = s * (0.012 + Math.random() * 0.01);
            clawDrip.scale.set(cdSize, cdSize * 1.8, cdSize);
            clawDrip.position.set(clawX, -s * 0.92, zSide * s * 0.85);
            group.add(clawDrip);
            // Tiny secondary droplet falling below
            if (Math.random() > 0.4) {
              const miniDrip = new THREE.Mesh(this._sphereGeo, bloodDripMat);
              miniDrip.scale.set(cdSize * 0.5, cdSize * 0.8, cdSize * 0.5);
              miniDrip.position.set(clawX, -s * 1.0, zSide * s * 0.85);
              group.add(miniDrip);
            }
          }
        }

        // --- Exposed vertebrae along the spine between bone spines ---
        const vertebraeMat = new THREE.MeshPhongMaterial({
          color: 0xc8b898,
          emissive: 0x221100,
          emissiveIntensity: 0.15,
          specular: 0xeeddcc,
          shininess: 35,
        });
        for (let vi = 0; vi < 8; vi++) {
          const vx = (vi - 3.5) * s * 0.15;
          // Vertebral body — slightly flattened cylinder
          const vertBody = new THREE.Mesh(this._cylinderGeo, vertebraeMat);
          vertBody.scale.set(s * 0.055, s * 0.04, s * 0.055);
          vertBody.position.set(vx, s * 0.42, 0);
          vertBody.rotation.z = Math.PI * 0.5;
          group.add(vertBody);
          // Spinous process — small upward nub
          const spinousProc = new THREE.Mesh(this._coneGeo, vertebraeMat);
          spinousProc.scale.set(s * 0.02, s * 0.05, s * 0.02);
          spinousProc.position.set(vx, s * 0.47, 0);
          group.add(spinousProc);
          // Transverse processes — small lateral wings
          for (const zs of [-1, 1]) {
            const transProc = new THREE.Mesh(this._boxGeo, vertebraeMat);
            transProc.scale.set(s * 0.02, s * 0.015, s * 0.04);
            transProc.position.set(vx, s * 0.41, zs * s * 0.05);
            transProc.rotation.x = zs * 0.2;
            group.add(transProc);
          }
        }

        // --- Pulsing aorta/artery from heart to skull ---
        const aortaMat = new THREE.MeshPhongMaterial({
          color: 0xbb0015,
          emissive: 0x880000,
          emissiveIntensity: 0.5,
          transparent: true,
          opacity: 0.8,
          specular: 0xff3333,
          shininess: 70,
        });
        // Build aorta as connected segments with slight curve
        const aortaSegments = 6;
        for (let ai = 0; ai < aortaSegments; ai++) {
          const t = ai / (aortaSegments - 1); // 0..1 from heart to skull
          const ax = t * s * 0.9; // x: from heart (0) to skull (0.9)
          const ay = s * (0.1 + Math.sin(t * Math.PI) * 0.18); // curved upward arc
          const az = Math.sin(t * Math.PI * 0.5) * s * 0.03; // subtle lateral sway
          const aortaSeg = new THREE.Mesh(this._cylinderGeo, aortaMat);
          aortaSeg.scale.set(s * 0.025, s * 0.16, s * 0.025);
          aortaSeg.position.set(ax, ay, az);
          // Tilt each segment to follow the curve
          aortaSeg.rotation.z = -Math.PI * 0.5 + Math.cos(t * Math.PI) * 0.3;
          aortaSeg.rotation.x = Math.cos(t * Math.PI * 0.5) * 0.1;
          group.add(aortaSeg);
        }
        // Aorta junction node at heart
        const aortaNode = new THREE.Mesh(this._sphereGeo, aortaMat);
        aortaNode.scale.set(s * 0.04, s * 0.04, s * 0.04);
        aortaNode.position.set(0, s * 0.12, 0);
        group.add(aortaNode);
        // Aorta junction at skull base
        const aortaSkullNode = new THREE.Mesh(this._sphereGeo, aortaMat);
        aortaSkullNode.scale.set(s * 0.03, s * 0.03, s * 0.03);
        aortaSkullNode.position.set(s * 0.82, s * 0.28, 0);
        group.add(aortaSkullNode);

        // --- Tattered flesh patches hanging from ribcage ---
        const fleshPatchMat = new THREE.MeshPhongMaterial({
          color: 0x993322,
          emissive: 0x440011,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
          depthWrite: false,
        });
        for (let fp = 0; fp < 6; fp++) {
          const fpX = (fp - 2.5) * s * 0.2;
          const fpSide = fp % 2 === 0 ? -1 : 1;
          const fleshPatch = new THREE.Mesh(this._boxGeo, fleshPatchMat.clone());
          const fpW = s * (0.08 + Math.random() * 0.06);
          const fpH = s * (0.12 + Math.random() * 0.1);
          fleshPatch.scale.set(fpW, fpH, s * 0.008);
          fleshPatch.position.set(
            fpX,
            s * (-0.05 - Math.random() * 0.1),
            fpSide * s * (0.22 + Math.random() * 0.08),
          );
          fleshPatch.rotation.set(
            fpSide * (0.3 + Math.random() * 0.3),
            Math.random() * 0.2,
            Math.random() * 0.15 - 0.07,
          );
          group.add(fleshPatch);
        }
        // Stringy connective tissue dangling from patches
        for (let st = 0; st < 4; st++) {
          const stX = (st - 1.5) * s * 0.3;
          const stringy = new THREE.Mesh(this._cylinderGeo, fleshPatchMat);
          stringy.scale.set(s * 0.008, s * (0.1 + Math.random() * 0.08), s * 0.008);
          stringy.position.set(stX, -s * 0.15, (st % 2 === 0 ? -1 : 1) * s * 0.28);
          group.add(stringy);
        }

        // --- Skull extra detail: nasal cavity, orbital ridge, temporal bone ---
        // Nasal cavity — dark recessed opening on snout
        const nasalMat = new THREE.MeshBasicMaterial({ color: 0x0a0000 });
        const nasalCavity = new THREE.Mesh(this._sphereGeo, nasalMat);
        nasalCavity.scale.set(s * 0.06, s * 0.04, s * 0.08);
        nasalCavity.position.set(s * 1.3, s * 0.32, 0);
        group.add(nasalCavity);
        // Nostril openings
        for (const nz of [-1, 1]) {
          const nostril = new THREE.Mesh(this._sphereGeo, nasalMat);
          nostril.scale.set(s * 0.025, s * 0.02, s * 0.025);
          nostril.position.set(s * 1.35, s * 0.31, nz * s * 0.04);
          group.add(nostril);
        }
        // Orbital ridges above eye sockets — prominent brow bone
        const orbitalRidgeMat = new THREE.MeshPhongMaterial({
          color: 0xd8cca0,
          emissive: 0x221100,
          emissiveIntensity: 0.1,
          specular: 0xffeedd,
          shininess: 30,
        });
        for (const oz of [-1, 1]) {
          const ridge = new THREE.Mesh(this._boxGeo, orbitalRidgeMat);
          ridge.scale.set(s * 0.14, s * 0.035, s * 0.06);
          ridge.position.set(s * 1.0, s * 0.41, oz * s * 0.1);
          ridge.rotation.z = oz * 0.1;
          group.add(ridge);
        }
        // Temporal bones on sides of skull
        for (const tz of [-1, 1]) {
          const temporalBone = new THREE.Mesh(this._sphereGeo, orbitalRidgeMat);
          temporalBone.scale.set(s * 0.12, s * 0.08, s * 0.06);
          temporalBone.position.set(s * 0.85, s * 0.3, tz * s * 0.18);
          group.add(temporalBone);
        }
        // Zygomatic arch (cheekbone) connecting to snout
        for (const zz of [-1, 1]) {
          const zygArch = new THREE.Mesh(this._boxGeo, orbitalRidgeMat);
          zygArch.scale.set(s * 0.18, s * 0.025, s * 0.03);
          zygArch.position.set(s * 1.0, s * 0.27, zz * s * 0.16);
          zygArch.rotation.y = zz * 0.15;
          group.add(zygArch);
        }

        // --- Bone spur growths on leg joints ---
        const spurMat = new THREE.MeshPhongMaterial({
          color: 0xc8b090,
          emissive: 0x331108,
          emissiveIntensity: 0.15,
          specular: 0xeeddbb,
          shininess: 35,
        });
        for (let si = 0; si < 3; si++) {
          const spurX = (si - 1) * s * 0.4;
          for (const zSide of [-1, 1]) {
            // Upper joint spur (at knee)
            const upperSpur = new THREE.Mesh(this._coneGeo, spurMat);
            upperSpur.scale.set(s * 0.03, s * 0.1, s * 0.03);
            upperSpur.position.set(spurX, -s * 0.25, zSide * s * 0.55);
            upperSpur.rotation.x = zSide * 0.7;
            upperSpur.rotation.z = (si - 1) * 0.2;
            group.add(upperSpur);
            // Secondary smaller spur
            const spur2 = new THREE.Mesh(this._coneGeo, spurMat);
            spur2.scale.set(s * 0.02, s * 0.065, s * 0.02);
            spur2.position.set(spurX + s * 0.04, -s * 0.28, zSide * s * 0.58);
            spur2.rotation.x = zSide * 0.9;
            spur2.rotation.z = (si - 1) * 0.15 + 0.3;
            group.add(spur2);
            // Lower joint spur (at ankle)
            const lowerSpur = new THREE.Mesh(this._coneGeo, spurMat);
            lowerSpur.scale.set(s * 0.025, s * 0.08, s * 0.025);
            lowerSpur.position.set(spurX, -s * 0.7, zSide * s * 0.8);
            lowerSpur.rotation.x = zSide * -0.4;
            lowerSpur.rotation.z = 0.2;
            group.add(lowerSpur);
          }
        }

        // --- Additional gore detail: exposed muscle fibers on legs ---
        const muscleFiberMat = new THREE.MeshPhongMaterial({
          color: 0x882218,
          emissive: 0x440008,
          emissiveIntensity: 0.25,
          transparent: true,
          opacity: 0.6,
        });
        for (let mf = 0; mf < 3; mf++) {
          const mfX = (mf - 1) * s * 0.4;
          for (const zSide of [-1, 1]) {
            // Muscle fiber wrapping around upper leg
            const fiber1 = new THREE.Mesh(this._cylinderGeo, muscleFiberMat);
            fiber1.scale.set(s * 0.015, s * 0.3, s * 0.01);
            fiber1.position.set(mfX + s * 0.02, -s * 0.1, zSide * s * 0.42);
            fiber1.rotation.x = zSide * 0.55;
            fiber1.rotation.y = 0.15;
            group.add(fiber1);
            const fiber2 = new THREE.Mesh(this._cylinderGeo, muscleFiberMat);
            fiber2.scale.set(s * 0.01, s * 0.25, s * 0.008);
            fiber2.position.set(mfX - s * 0.02, -s * 0.05, zSide * s * 0.4);
            fiber2.rotation.x = zSide * 0.62;
            fiber2.rotation.y = -0.1;
            group.add(fiber2);
          }
        }

        break;
      }

      case TDEnemyType.RUNIC_SENTINEL: {
        // Warden Colossus — towering floating stone golem head with cracked rune armor
        const stoneMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: 0x112233,
          emissiveIntensity: 0.2,
          specular: 0x334455,
          shininess: 25,
        });
        const crackGlowMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.6,
        });
        const runeMat = new THREE.MeshBasicMaterial({
          color: 0x44ddff,
          transparent: true,
          opacity: 0.7,
        });

        // --- Massive stone head (main body) ---
        const headBlock = new THREE.Mesh(this._boxGeo, stoneMat);
        headBlock.scale.set(s * 1.0, s * 1.3, s * 0.9);
        headBlock.position.set(0, s * 0.2, 0);
        group.add(headBlock);
        // Brow ridge — heavy overhang above the eye
        const brow = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        brow.scale.set(s * 1.1, s * 0.2, s * 0.95);
        brow.position.set(s * 0.1, s * 0.75, 0);
        group.add(brow);
        // Forehead crest
        const crest = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        crest.scale.set(s * 0.6, s * 0.35, s * 0.5);
        crest.position.set(0, s * 1.0, 0);
        group.add(crest);

        // --- Singular massive targeting eye ---
        // Eye socket (recessed dark area)
        const socketMat = new THREE.MeshPhongMaterial({ color: 0x0a0a0f, emissive: 0x000000 });
        const eyeSocket = new THREE.Mesh(this._sphereGeo, socketMat);
        eyeSocket.scale.set(s * 0.35, s * 0.35, s * 0.2);
        eyeSocket.position.set(s * 0.4, s * 0.35, 0);
        group.add(eyeSocket);
        // Glowing eye orb
        const eyeOrbMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
        const eyeOrb = new THREE.Mesh(this._sphereGeo, eyeOrbMat);
        eyeOrb.scale.set(s * 0.25, s * 0.25, s * 0.15);
        eyeOrb.position.set(s * 0.45, s * 0.35, 0);
        group.add(eyeOrb);
        // Bright targeting pupil
        const pupilMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const pupil = new THREE.Mesh(this._sphereGeo, pupilMat);
        pupil.scale.set(s * 0.1, s * 0.1, s * 0.08);
        pupil.position.set(s * 0.52, s * 0.35, 0);
        group.add(pupil);
        // Targeting energy beam hint
        const beamMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.15,
        });
        const beam = new THREE.Mesh(this._coneGeo, beamMat);
        beam.scale.set(s * 0.15, s * 1.5, s * 0.15);
        beam.rotation.z = -Math.PI / 2;
        beam.position.set(s * 1.3, s * 0.35, 0);
        group.add(beam);

        // --- Heavy angular jaw segments (split jaw) ---
        for (const zSide of [-1, 1]) {
          const jawSegment = new THREE.Mesh(this._boxGeo, stoneMat.clone());
          jawSegment.scale.set(s * 0.45, s * 0.4, s * 0.35);
          jawSegment.position.set(s * 0.15, -s * 0.5, zSide * s * 0.25);
          jawSegment.rotation.x = zSide * 0.1;
          jawSegment.rotation.z = 0.12;
          group.add(jawSegment);
          // Glowing rune crack on each jaw
          const jawCrack = new THREE.Mesh(this._boxGeo, crackGlowMat.clone());
          jawCrack.scale.set(s * 0.42, s * 0.02, s * 0.03);
          jawCrack.position.set(s * 0.2, -s * 0.4, zSide * s * 0.36);
          group.add(jawCrack);
        }
        // Chin plate
        const chin = new THREE.Mesh(this._boxGeo, stoneMat.clone());
        chin.scale.set(s * 0.3, s * 0.15, s * 0.4);
        chin.position.set(s * 0.2, -s * 0.7, 0);
        group.add(chin);

        // --- Cracked rune inscriptions on face ---
        // Vertical crack lines
        for (let i = 0; i < 3; i++) {
          const crack = new THREE.Mesh(this._boxGeo, crackGlowMat.clone());
          crack.scale.set(s * 0.02, s * (0.3 + i * 0.1), s * 0.02);
          crack.position.set(s * 0.51, s * (0.1 + i * 0.2), s * (i - 1) * 0.2);
          group.add(crack);
        }
        // Horizontal rune line across brow
        const browRune = new THREE.Mesh(this._boxGeo, runeMat);
        browRune.scale.set(s * 0.8, s * 0.02, s * 0.02);
        browRune.position.set(0, s * 0.65, s * 0.46);
        group.add(browRune);
        const browRune2 = new THREE.Mesh(this._boxGeo, runeMat.clone());
        browRune2.scale.set(s * 0.8, s * 0.02, s * 0.02);
        browRune2.position.set(0, s * 0.65, -s * 0.46);
        group.add(browRune2);

        // --- Floating stone shoulder plates orbiting the head ---
        const shoulderMat = new THREE.MeshPhongMaterial({
          color: 0x556677,
          emissive: 0x112233,
          emissiveIntensity: 0.15,
          specular: 0x445566,
          shininess: 30,
        });
        for (const zSide of [-1, 1]) {
          // Main shoulder plate
          const shoulder = new THREE.Mesh(this._boxGeo, shoulderMat.clone());
          shoulder.scale.set(s * 0.5, s * 0.6, s * 0.2);
          shoulder.position.set(-s * 0.1, s * 0.3, zSide * s * 1.1);
          shoulder.rotation.z = zSide * 0.2;
          group.add(shoulder);
          // Smaller floating plate fragment above each shoulder
          const fragment = new THREE.Mesh(this._boxGeo, shoulderMat.clone());
          fragment.scale.set(s * 0.25, s * 0.3, s * 0.12);
          fragment.position.set(-s * 0.3, s * 0.7, zSide * s * 1.2);
          fragment.rotation.z = zSide * 0.35;
          fragment.rotation.y = zSide * 0.2;
          group.add(fragment);
          // Rune glow on shoulder
          const shoulderRune = new THREE.Mesh(this._boxGeo, crackGlowMat.clone());
          shoulderRune.scale.set(s * 0.3, s * 0.02, s * 0.21);
          shoulderRune.position.set(-s * 0.1, s * 0.35, zSide * s * 1.1);
          group.add(shoulderRune);
        }

        // --- Arcane chains hanging from head ---
        const chainMat = new THREE.MeshPhongMaterial({
          color: 0x445566,
          emissive: 0x0a1a2a,
          emissiveIntensity: 0.15,
        });
        for (const zOff of [-s * 0.35, 0, s * 0.35]) {
          for (let link = 0; link < 4; link++) {
            const chainLink = new THREE.Mesh(this._boxGeo, chainMat.clone());
            chainLink.scale.set(s * 0.06, s * 0.1, s * 0.06);
            chainLink.position.set(-s * 0.3, -s * (0.6 + link * 0.15), zOff);
            chainLink.rotation.y = link * 0.4;
            group.add(chainLink);
          }
          // Dangling weight at chain end
          const weight = new THREE.Mesh(this._sphereGeo, chainMat.clone());
          weight.scale.set(s * 0.08, s * 0.1, s * 0.08);
          weight.position.set(-s * 0.3, -s * 1.25, zOff);
          group.add(weight);
        }

        // --- Rune circles orbiting (named ring1/ring2 for animation) ---
        const ringGlowMat = new THREE.MeshBasicMaterial({
          color: 0x44ddff,
          transparent: true,
          opacity: 0.45,
          side: THREE.DoubleSide,
        });
        const ringGeo1 = new THREE.TorusGeometry(s * 1.5, s * 0.06, 6, 32);
        const ring1 = new THREE.Mesh(ringGeo1, ringGlowMat);
        ring1.name = "ring1";
        group.add(ring1);
        const ringGeo2 = new THREE.TorusGeometry(s * 1.8, s * 0.04, 6, 32);
        const ring2 = new THREE.Mesh(ringGeo2, ringGlowMat.clone());
        ring2.rotation.x = Math.PI / 2;
        ring2.name = "ring2";
        group.add(ring2);
        // Rune glyphs embedded in ring1 (small floating boxes around the ring)
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const glyph = new THREE.Mesh(this._boxGeo, runeMat.clone());
          glyph.scale.set(s * 0.08, s * 0.12, s * 0.02);
          glyph.position.set(
            Math.cos(angle) * s * 1.5,
            Math.sin(angle) * s * 1.5,
            0,
          );
          glyph.rotation.z = angle;
          group.add(glyph);
        }

        // --- Floating runic crystals (named crystal_0..3 for animation) ---
        const crystalMat = new THREE.MeshPhongMaterial({
          color: 0x2288cc,
          emissive: 0x0066aa,
          emissiveIntensity: 0.4,
          transparent: true,
          opacity: 0.8,
        });
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(s * 0.2), crystalMat.clone());
          crystal.position.set(
            Math.cos(angle) * s * 1.3,
            Math.sin(angle) * s * 0.6 + s * 0.2,
            Math.sin(angle + Math.PI / 4) * s * 0.6,
          );
          crystal.name = `crystal_${i}`;
          group.add(crystal);
        }

        // --- Cracked stone texture on head: deep gouges with glowing energy inside ---
        const deepCrackMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
          transparent: true,
          opacity: 0.75,
        });
        const darkCrackMat = new THREE.MeshPhongMaterial({
          color: 0x0a0a0f,
          emissive: 0x000000,
        });
        // Diagonal gouges across the left cheek area
        for (let gc = 0; gc < 5; gc++) {
          const gouge = new THREE.Mesh(this._boxGeo, darkCrackMat.clone());
          gouge.scale.set(s * 0.35, s * 0.025, s * 0.03);
          gouge.position.set(
            s * 0.52,
            s * (0.0 + gc * 0.12),
            s * (-0.2 + gc * 0.08),
          );
          gouge.rotation.z = 0.3 + gc * 0.05;
          gouge.rotation.y = 0.15;
          group.add(gouge);
          // Glowing energy visible inside each gouge
          const gougeGlow = new THREE.Mesh(this._boxGeo, deepCrackMat.clone());
          gougeGlow.scale.set(s * 0.3, s * 0.012, s * 0.015);
          gougeGlow.position.set(
            s * 0.50,
            s * (0.0 + gc * 0.12),
            s * (-0.2 + gc * 0.08),
          );
          gougeGlow.rotation.z = 0.3 + gc * 0.05;
          gougeGlow.rotation.y = 0.15;
          group.add(gougeGlow);
        }
        // Large crack running from forehead down through the right side
        for (let vc = 0; vc < 7; vc++) {
          const vCrack = new THREE.Mesh(this._boxGeo, darkCrackMat.clone());
          vCrack.scale.set(s * 0.025, s * 0.12, s * 0.03);
          vCrack.position.set(
            s * (0.35 + vc * 0.02),
            s * (0.85 - vc * 0.18),
            s * (-0.3 + vc * 0.04),
          );
          vCrack.rotation.z = -0.1 + vc * 0.04;
          group.add(vCrack);
          const vCrackGlow = new THREE.Mesh(this._boxGeo, deepCrackMat.clone());
          vCrackGlow.scale.set(s * 0.012, s * 0.10, s * 0.015);
          vCrackGlow.position.set(
            s * (0.36 + vc * 0.02),
            s * (0.85 - vc * 0.18),
            s * (-0.3 + vc * 0.04),
          );
          vCrackGlow.rotation.z = -0.1 + vc * 0.04;
          group.add(vCrackGlow);
        }
        // Branching hairline fractures on opposite side
        for (let bf = 0; bf < 4; bf++) {
          const fracture = new THREE.Mesh(this._boxGeo, darkCrackMat.clone());
          fracture.scale.set(s * 0.18, s * 0.018, s * 0.02);
          fracture.position.set(
            s * 0.48,
            s * (0.5 - bf * 0.15),
            s * (0.25 + bf * 0.06),
          );
          fracture.rotation.z = -0.4 + bf * 0.2;
          fracture.rotation.y = -0.25;
          group.add(fracture);
        }

        // --- Hanging stone beard / chin extensions ---
        const beardMat = new THREE.MeshPhongMaterial({
          color: 0x667788,
          emissive: 0x0a1520,
          emissiveIntensity: 0.1,
          specular: 0x334455,
          shininess: 20,
        });
        const beardSlabs = [
          { x: 0.1, z: -0.15, w: 0.12, h: 0.35, d: 0.08, rot: 0.08 },
          { x: 0.2, z: 0.0, w: 0.15, h: 0.45, d: 0.1, rot: -0.05 },
          { x: 0.15, z: 0.15, w: 0.1, h: 0.3, d: 0.07, rot: 0.12 },
          { x: 0.3, z: -0.1, w: 0.08, h: 0.25, d: 0.06, rot: -0.1 },
          { x: 0.25, z: 0.12, w: 0.11, h: 0.38, d: 0.09, rot: 0.06 },
          { x: 0.05, z: -0.08, w: 0.09, h: 0.2, d: 0.07, rot: -0.15 },
          { x: 0.35, z: 0.05, w: 0.07, h: 0.22, d: 0.05, rot: 0.1 },
        ];
        for (const bs of beardSlabs) {
          const slab = new THREE.Mesh(this._boxGeo, beardMat.clone());
          slab.scale.set(s * bs.w, s * bs.h, s * bs.d);
          slab.position.set(s * bs.x, -s * 0.85 - s * bs.h * 0.3, s * bs.z);
          slab.rotation.x = bs.rot;
          slab.rotation.z = bs.rot * 0.5;
          group.add(slab);
        }
        // Small connecting stone bits between beard slabs
        for (let bc = 0; bc < 5; bc++) {
          const beardConn = new THREE.Mesh(this._boxGeo, beardMat.clone());
          beardConn.scale.set(s * 0.04, s * 0.06, s * 0.15);
          beardConn.position.set(
            s * (0.1 + bc * 0.05),
            -s * 0.82,
            s * (-0.1 + bc * 0.05),
          );
          group.add(beardConn);
        }

        // --- Rune inscriptions: rows of small glowing glyphs across forehead and cheeks ---
        const glyphMat2 = new THREE.MeshBasicMaterial({
          color: 0x66eeff,
          transparent: true,
          opacity: 0.65,
        });
        // Forehead glyph row — top row
        for (let fg = 0; fg < 10; fg++) {
          const fgGlyph = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          fgGlyph.scale.set(s * 0.04, s * 0.06, s * 0.01);
          fgGlyph.position.set(
            s * (-0.35 + fg * 0.07),
            s * 0.88,
            s * 0.46,
          );
          group.add(fgGlyph);
          // Horizontal bar under each glyph
          const fgBar = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          fgBar.scale.set(s * 0.05, s * 0.01, s * 0.01);
          fgBar.position.set(
            s * (-0.35 + fg * 0.07),
            s * 0.84,
            s * 0.46,
          );
          group.add(fgBar);
        }
        // Second forehead row
        for (let fg2 = 0; fg2 < 8; fg2++) {
          const fgGlyph2 = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          fgGlyph2.scale.set(s * 0.035, s * 0.05, s * 0.01);
          fgGlyph2.position.set(
            s * (-0.25 + fg2 * 0.07),
            s * 0.78,
            s * 0.46,
          );
          group.add(fgGlyph2);
        }
        // Right cheek glyphs
        for (let cg = 0; cg < 6; cg++) {
          const cheekGlyph = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          cheekGlyph.scale.set(s * 0.01, s * 0.05, s * 0.035);
          cheekGlyph.position.set(
            s * 0.52,
            s * (0.6 - cg * 0.1),
            s * (0.2 + cg * 0.03),
          );
          group.add(cheekGlyph);
        }
        // Left cheek glyphs
        for (let cg2 = 0; cg2 < 6; cg2++) {
          const cheekGlyph2 = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          cheekGlyph2.scale.set(s * 0.01, s * 0.05, s * 0.035);
          cheekGlyph2.position.set(
            s * 0.52,
            s * (0.6 - cg2 * 0.1),
            s * (-0.2 - cg2 * 0.03),
          );
          group.add(cheekGlyph2);
        }
        // Back-of-head rune column
        for (let bg = 0; bg < 8; bg++) {
          const backGlyph = new THREE.Mesh(this._boxGeo, glyphMat2.clone());
          backGlyph.scale.set(s * 0.04, s * 0.05, s * 0.01);
          backGlyph.position.set(
            s * -0.51,
            s * (0.7 - bg * 0.12),
            s * (bg % 2 === 0 ? 0.05 : -0.05),
          );
          group.add(backGlyph);
        }

        // --- Battle damage: missing chunks and exposed inner structure ---
        const damageMat = new THREE.MeshPhongMaterial({
          color: 0x1a1a2a,
          emissive: 0x050510,
          emissiveIntensity: 0.1,
        });
        const innerStructMat = new THREE.MeshBasicMaterial({
          color: 0x3399bb,
          transparent: true,
          opacity: 0.35,
        });
        // Missing chunk on upper-left head
        const dmgChunk1 = new THREE.Mesh(this._boxGeo, damageMat);
        dmgChunk1.scale.set(s * 0.2, s * 0.18, s * 0.15);
        dmgChunk1.position.set(s * -0.4, s * 0.7, s * 0.35);
        dmgChunk1.rotation.y = 0.3;
        group.add(dmgChunk1);
        // Inner lattice visible in chunk1
        for (let il = 0; il < 3; il++) {
          const lattice = new THREE.Mesh(this._boxGeo, innerStructMat.clone());
          lattice.scale.set(s * 0.02, s * 0.14, s * 0.02);
          lattice.position.set(
            s * (-0.38 + il * 0.04),
            s * 0.7,
            s * (0.33 + il * 0.02),
          );
          lattice.rotation.z = il * 0.3;
          group.add(lattice);
        }
        // Missing chunk on right jaw
        const dmgChunk2 = new THREE.Mesh(this._boxGeo, damageMat.clone());
        dmgChunk2.scale.set(s * 0.15, s * 0.12, s * 0.13);
        dmgChunk2.position.set(s * 0.35, s * -0.35, s * -0.38);
        dmgChunk2.rotation.y = -0.2;
        group.add(dmgChunk2);
        for (let is2 = 0; is2 < 2; is2++) {
          const strut = new THREE.Mesh(this._boxGeo, innerStructMat.clone());
          strut.scale.set(s * 0.015, s * 0.1, s * 0.015);
          strut.position.set(
            s * (0.33 + is2 * 0.03),
            s * -0.35,
            s * (-0.36 - is2 * 0.02),
          );
          group.add(strut);
        }
        // Crater-like damage on top
        const dmgChunk3 = new THREE.Mesh(this._boxGeo, damageMat.clone());
        dmgChunk3.scale.set(s * 0.25, s * 0.1, s * 0.2);
        dmgChunk3.position.set(s * 0.1, s * 0.95, s * -0.15);
        group.add(dmgChunk3);
        for (let ch = 0; ch < 4; ch++) {
          const crossBar = new THREE.Mesh(this._boxGeo, innerStructMat.clone());
          crossBar.scale.set(s * 0.18, s * 0.012, s * 0.012);
          crossBar.position.set(s * 0.1, s * 0.96, s * (-0.2 + ch * 0.04));
          crossBar.rotation.y = ch * 0.5;
          group.add(crossBar);
        }

        // --- Floating debris particles orbiting the head ---
        const debrisMat = new THREE.MeshPhongMaterial({
          color: 0x778899,
          emissive: 0x111122,
          emissiveIntensity: 0.1,
        });
        for (let dp = 0; dp < 12; dp++) {
          const debris = new THREE.Mesh(this._boxGeo, debrisMat.clone());
          const dAngle = (dp / 12) * Math.PI * 2;
          const dRadius = s * (1.6 + Math.sin(dp * 1.7) * 0.3);
          const dSize = 0.03 + Math.sin(dp * 0.9) * 0.02 + 0.02;
          debris.scale.set(s * dSize, s * dSize, s * dSize);
          debris.position.set(
            Math.cos(dAngle) * dRadius,
            s * (0.3 + Math.sin(dp * 2.3) * 0.5),
            Math.sin(dAngle) * dRadius,
          );
          debris.rotation.set(dp * 0.7, dp * 1.1, dp * 0.4);
          group.add(debris);
        }
        for (let tp = 0; tp < 8; tp++) {
          const pebble = new THREE.Mesh(this._boxGeo, debrisMat.clone());
          const pAngle = (tp / 8) * Math.PI * 2 + 0.4;
          pebble.scale.set(s * 0.02, s * 0.02, s * 0.02);
          pebble.position.set(
            Math.cos(pAngle) * s * 1.2,
            s * (-0.1 + Math.sin(tp * 1.5) * 0.3),
            Math.sin(pAngle) * s * 1.2,
          );
          pebble.rotation.set(tp * 1.2, tp * 0.8, 0);
          group.add(pebble);
        }

        // --- Ancient moss / lichen patches on lower surfaces ---
        const mossMat = new THREE.MeshPhongMaterial({
          color: 0x3a6b3a,
          emissive: 0x1a3a1a,
          emissiveIntensity: 0.15,
          transparent: true,
          opacity: 0.7,
          side: THREE.DoubleSide,
        });
        const mossPatches = [
          { x: 0.1, y: -0.65, z: 0.2, sx: 0.15, sz: 0.12 },
          { x: 0.25, y: -0.6, z: -0.18, sx: 0.1, sz: 0.08 },
          { x: -0.1, y: -0.55, z: 0.1, sx: 0.12, sz: 0.1 },
          { x: 0.0, y: -0.7, z: -0.05, sx: 0.18, sz: 0.14 },
          { x: -0.35, y: 0.0, z: 0.42, sx: 0.08, sz: 0.06 },
          { x: -0.42, y: -0.2, z: 0.3, sx: 0.1, sz: 0.08 },
          { x: -0.3, y: -0.45, z: -0.35, sx: 0.12, sz: 0.1 },
        ];
        for (const mp of mossPatches) {
          const moss = new THREE.Mesh(this._boxGeo, mossMat.clone());
          moss.scale.set(s * mp.sx, s * 0.01, s * mp.sz);
          moss.position.set(s * mp.x, s * mp.y, s * mp.z);
          group.add(moss);
        }
        for (let mt = 0; mt < 4; mt++) {
          const mossTendril = new THREE.Mesh(this._boxGeo, mossMat.clone());
          mossTendril.scale.set(s * 0.01, s * (0.08 + mt * 0.03), s * 0.01);
          mossTendril.position.set(
            s * (0.05 + mt * 0.06),
            s * (-0.75 - mt * 0.04),
            s * (0.1 - mt * 0.05),
          );
          group.add(mossTendril);
        }

        // --- Targeting laser beam from the main eye ---
        const laserOuterMat = new THREE.MeshBasicMaterial({
          color: 0xff2200,
          transparent: true,
          opacity: 0.35,
        });
        const laserCore = new THREE.Mesh(this._boxGeo, laserOuterMat);
        laserCore.scale.set(s * 3.5, s * 0.02, s * 0.02);
        laserCore.position.set(s * 2.3, s * 0.35, 0);
        group.add(laserCore);
        const laserInner = new THREE.Mesh(this._boxGeo, new THREE.MeshBasicMaterial({
          color: 0xff6644,
          transparent: true,
          opacity: 0.6,
        }));
        laserInner.scale.set(s * 3.5, s * 0.008, s * 0.008);
        laserInner.position.set(s * 2.3, s * 0.35, 0);
        group.add(laserInner);
        const laserFlare = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
          color: 0xff4422,
          transparent: true,
          opacity: 0.5,
        }));
        laserFlare.scale.set(s * 0.06, s * 0.06, s * 0.06);
        laserFlare.position.set(s * 0.58, s * 0.35, 0);
        group.add(laserFlare);
        const laserImpact = new THREE.Mesh(this._sphereGeo, new THREE.MeshBasicMaterial({
          color: 0xff3311,
          transparent: true,
          opacity: 0.3,
        }));
        laserImpact.scale.set(s * 0.12, s * 0.12, s * 0.12);
        laserImpact.position.set(s * 4.0, s * 0.35, 0);
        group.add(laserImpact);

        // --- Stone teeth / fangs in the jaw segments ---
        const toothMat = new THREE.MeshPhongMaterial({
          color: 0xaabb99,
          emissive: 0x112211,
          emissiveIntensity: 0.1,
          specular: 0x556655,
          shininess: 40,
        });
        for (let ut = 0; ut < 6; ut++) {
          const upperTooth = new THREE.Mesh(this._coneGeo, toothMat.clone());
          upperTooth.scale.set(s * 0.04, s * (0.1 + (ut % 2) * 0.06), s * 0.04);
          upperTooth.rotation.x = Math.PI;
          upperTooth.position.set(
            s * (0.25 + ut * 0.03),
            s * (-0.15 - (ut % 2) * 0.03),
            s * (-0.2 + ut * 0.07),
          );
          group.add(upperTooth);
        }
        for (let lt = 0; lt < 6; lt++) {
          const lowerTooth = new THREE.Mesh(this._coneGeo, toothMat.clone());
          lowerTooth.scale.set(s * 0.035, s * (0.08 + (lt % 3) * 0.04), s * 0.035);
          lowerTooth.position.set(
            s * (0.2 + lt * 0.04),
            s * (-0.32 + (lt % 2) * 0.02),
            s * (-0.18 + lt * 0.06),
          );
          group.add(lowerTooth);
        }
        for (const fangZ of [-1, 1]) {
          const fang = new THREE.Mesh(this._coneGeo, toothMat.clone());
          fang.scale.set(s * 0.06, s * 0.18, s * 0.06);
          fang.rotation.x = Math.PI;
          fang.position.set(s * 0.35, s * -0.2, fangZ * s * 0.3);
          group.add(fang);
        }

        // --- Ornamental stone horns / crown protrusions ---
        const hornMat = new THREE.MeshPhongMaterial({
          color: 0x556677,
          emissive: 0x0a1a2a,
          emissiveIntensity: 0.15,
          specular: 0x445566,
          shininess: 35,
        });
        const centralHorn = new THREE.Mesh(this._coneGeo, hornMat);
        centralHorn.scale.set(s * 0.12, s * 0.5, s * 0.12);
        centralHorn.position.set(0, s * 1.35, 0);
        group.add(centralHorn);
        for (const hz of [-1, 1]) {
          const sideHorn = new THREE.Mesh(this._coneGeo, hornMat.clone());
          sideHorn.scale.set(s * 0.1, s * 0.45, s * 0.1);
          sideHorn.position.set(s * -0.15, s * 1.2, hz * s * 0.35);
          sideHorn.rotation.x = hz * 0.3;
          group.add(sideHorn);
          const smallHorn = new THREE.Mesh(this._coneGeo, hornMat.clone());
          smallHorn.scale.set(s * 0.06, s * 0.3, s * 0.06);
          smallHorn.position.set(s * -0.25, s * 1.1, hz * s * 0.55);
          smallHorn.rotation.x = hz * 0.45;
          group.add(smallHorn);
        }
        for (const hp of [-1, 1]) {
          const prong = new THREE.Mesh(this._boxGeo, hornMat.clone());
          prong.scale.set(s * 0.06, s * 0.35, s * 0.06);
          prong.position.set(s * 0.1, s * 1.05, hp * s * 0.5);
          prong.rotation.x = hp * 0.5;
          prong.rotation.z = -0.15;
          group.add(prong);
        }
        const crownBase = new THREE.Mesh(this._boxGeo, hornMat.clone());
        crownBase.scale.set(s * 0.7, s * 0.08, s * 0.7);
        crownBase.position.set(0, s * 1.05, 0);
        group.add(crownBase);
        for (let cr = 0; cr < 6; cr++) {
          const crAngle = (cr / 6) * Math.PI * 2;
          const crownRune = new THREE.Mesh(this._boxGeo, runeMat.clone());
          crownRune.scale.set(s * 0.03, s * 0.04, s * 0.01);
          crownRune.position.set(
            Math.cos(crAngle) * s * 0.32,
            s * 1.06,
            Math.sin(crAngle) * s * 0.32,
          );
          group.add(crownRune);
        }

        // --- Stone plate edges / armor seams ---
        const seamMat = new THREE.MeshPhongMaterial({
          color: 0x3a4a5a,
          emissive: 0x050a10,
          emissiveIntensity: 0.1,
        });
        for (let sl = 0; sl < 4; sl++) {
          const seamF = new THREE.Mesh(this._boxGeo, seamMat);
          seamF.scale.set(s * 0.9, s * 0.015, s * 0.015);
          seamF.position.set(s * 0.0, s * (0.0 + sl * 0.25), s * 0.46);
          group.add(seamF);
          const seamB = new THREE.Mesh(this._boxGeo, seamMat.clone());
          seamB.scale.set(s * 0.9, s * 0.015, s * 0.015);
          seamB.position.set(s * 0.0, s * (0.0 + sl * 0.25), s * -0.46);
          group.add(seamB);
        }
        for (let vs = 0; vs < 3; vs++) {
          for (const seamSide of [-1, 1]) {
            const vSeam = new THREE.Mesh(this._boxGeo, seamMat.clone());
            vSeam.scale.set(s * 0.015, s * 0.8, s * 0.015);
            vSeam.position.set(
              s * (-0.3 + vs * 0.3),
              s * 0.3,
              seamSide * s * 0.46,
            );
            group.add(vSeam);
          }
        }

        // --- Extra shoulder plate detail: rune engravings and edge chips ---
        for (const zSide2 of [-1, 1]) {
          for (let sr = 0; sr < 3; sr++) {
            const shoulderLine = new THREE.Mesh(this._boxGeo, runeMat.clone());
            shoulderLine.scale.set(s * 0.35, s * 0.015, s * 0.21);
            shoulderLine.position.set(
              -s * 0.1,
              s * (0.15 + sr * 0.12),
              zSide2 * s * 1.1,
            );
            group.add(shoulderLine);
          }
          for (let ec = 0; ec < 3; ec++) {
            const edgeChip = new THREE.Mesh(this._boxGeo, damageMat.clone());
            edgeChip.scale.set(s * 0.06, s * 0.08, s * 0.22);
            edgeChip.position.set(
              s * (0.1 + ec * 0.08),
              s * (0.55 - ec * 0.1),
              zSide2 * s * 1.1,
            );
            edgeChip.rotation.z = ec * 0.3;
            group.add(edgeChip);
          }
        }

        // --- Energy conduits connecting crystals to head ---
        const conduitMat = new THREE.MeshBasicMaterial({
          color: 0x2288cc,
          transparent: true,
          opacity: 0.25,
        });
        for (let cd = 0; cd < 4; cd++) {
          const cdAngle = (cd / 4) * Math.PI * 2;
          const conduit = new THREE.Mesh(this._boxGeo, conduitMat.clone());
          conduit.scale.set(s * 0.015, s * 0.8, s * 0.015);
          conduit.position.set(
            Math.cos(cdAngle) * s * 0.7,
            s * 0.3 + Math.sin(cdAngle) * s * 0.3,
            Math.sin(cdAngle + Math.PI / 4) * s * 0.3,
          );
          conduit.lookAt(new THREE.Vector3(0, s * 0.2, 0));
          group.add(conduit);
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

    // Update hazards
    this._updateHazardMeshes(state, dt, time);

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
        // Cache emissive materials for fast hit-flash updates
        const mats: THREE.Material[] = [];
        group.traverse(child => {
          if ((child as THREE.Mesh).material && 'emissiveIntensity' in ((child as THREE.Mesh).material as any)) {
            mats.push((child as THREE.Mesh).material as THREE.Material);
          }
        });
        this._enemyMaterials.set(enemy.id, mats);
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

      // Hit flash (uses cached materials to avoid costly group.traverse each frame)
      const cachedMats = this._enemyMaterials.get(enemy.id);
      if (cachedMats) {
        const emissive = enemy.hitTimer > 0 ? 1.0 : 0.15;
        for (let m = 0; m < cachedMats.length; m++) {
          (cachedMats[m] as any).emissiveIntensity = emissive;
        }
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

      // Animate Runic Sentinel rings and crystals
      if (enemy.type === TDEnemyType.RUNIC_SENTINEL) {
        const ring1 = group.getObjectByName("ring1") as THREE.Mesh;
        const ring2 = group.getObjectByName("ring2") as THREE.Mesh;
        if (ring1) {
          ring1.rotation.x = time * 1.5 + enemy.id;
          ring1.rotation.y = time * 2.0;
        }
        if (ring2) {
          ring2.rotation.y = time * 1.8 + enemy.id * 0.5;
          ring2.rotation.z = time * 1.2;
        }
        for (let ci = 0; ci < 4; ci++) {
          const crystal = group.getObjectByName(`crystal_${ci}`) as THREE.Mesh;
          if (crystal) {
            const angle = (ci / 4) * Math.PI * 2 + time * 1.5;
            crystal.position.x = Math.cos(angle) * enemy.size * 1.0;
            crystal.position.y = Math.sin(angle) * enemy.size * 0.5;
            crystal.position.z = Math.sin(angle + Math.PI / 4) * enemy.size * 0.5;
            crystal.rotation.y = time * 3;
          }
        }
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
        this._enemyMaterials.delete(id);
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
    const debrisCount = isBoss ? 25 : 18 + Math.floor(Math.random() * 8);
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
    const burstCount = isBoss ? 25 : 25;
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
  // Hazard rendering
  // ---------------------------------------------------------------------------

  private _updateHazardMeshes(state: import("../state/ThreeDragonState").ThreeDragonState, dt: number, time: number): void {
    const activeIds = new Set<number>();

    for (const h of state.hazards) {
      activeIds.add(h.id);
      let group = this._hazardMeshes.get(h.id);

      if (!group) {
        group = new THREE.Group();
        // Create visual based on hazard type
        const colors: Record<string, number> = {
          lava_geyser: 0xff4400,
          blizzard_wind: 0xaaddff,
          crystal_shard: 0xaa44ff,
          lightning_strike: 0xffff44,
          water_spout: 0x44aaff,
          leaf_tornado: 0xcc8833,
          pressure_wave: 0x00ddbb,
          petal_storm: 0xffaacc,
        };
        const color = colors[h.type] ?? 0xffffff;
        const mat = new THREE.MeshBasicMaterial({
          color,
          transparent: true,
          opacity: 0.6,
          depthWrite: false,
        });

        if (h.type === "lava_geyser" || h.type === "water_spout") {
          // Column of particles — use a cylinder-ish shape
          const cyl = new THREE.Mesh(
            new THREE.CylinderGeometry(h.radius * 0.3, h.radius * 0.8, 8, 8),
            mat,
          );
          group.add(cyl);
        } else if (h.type === "lightning_strike") {
          // Warning circle on ground + bolt
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(h.radius * 0.8, h.radius, 16),
            mat,
          );
          ring.rotation.x = -Math.PI / 2;
          group.add(ring);
        } else if (h.type === "crystal_shard") {
          // Falling shard
          const shard = new THREE.Mesh(
            new THREE.ConeGeometry(1, 4, 4),
            mat,
          );
          shard.rotation.x = Math.PI; // point down
          group.add(shard);
        } else if (h.type === "leaf_tornado" || h.type === "blizzard_wind" || h.type === "petal_storm") {
          // Swirling particles — use sphere as proxy
          const sphere = new THREE.Mesh(this._sphereGeo, mat);
          sphere.scale.set(h.radius, h.radius * 2, h.radius);
          group.add(sphere);
        } else if (h.type === "pressure_wave") {
          // Expanding ring on the ground
          const ring = new THREE.Mesh(
            new THREE.RingGeometry(h.radius * 0.6, h.radius, 24),
            mat,
          );
          ring.rotation.x = -Math.PI / 2;
          group.add(ring);
        }

        this._scene.add(group);
        this._hazardMeshes.set(h.id, group);
      }

      // Update position and appearance
      group.position.set(h.position.x, h.position.y, h.position.z);
      group.visible = true;

      // Animate based on phase
      if (h.phase === "warning") {
        // Pulsing warning indicator
        const pulse = 0.3 + Math.sin(time * 8) * 0.2;
        group.children.forEach(c => {
          if ((c as THREE.Mesh).material) {
            ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = pulse;
          }
        });
        const warningScale = 0.5 + (1 - h.timer / h.warningDuration) * 0.5;
        group.scale.setScalar(warningScale);
      } else if (h.phase === "active") {
        group.children.forEach(c => {
          if ((c as THREE.Mesh).material) {
            ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = 0.7;
          }
        });
        group.scale.setScalar(1);
        // Rotate tornado/wind effects
        if (h.type === "leaf_tornado" || h.type === "petal_storm") {
          group.rotation.y += dt * 5;
        } else if (h.type === "pressure_wave") {
          // Pulsing expand/contract effect
          const pulseScale = 1 + Math.sin(time * 6) * 0.15;
          group.scale.setScalar(pulseScale);
        }
      } else {
        // Fading
        const fade = h.timer / 0.5;
        group.children.forEach(c => {
          if ((c as THREE.Mesh).material) {
            ((c as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = fade * 0.5;
          }
        });
      }
    }

    // Remove old hazard meshes
    for (const [id, group] of this._hazardMeshes) {
      if (!activeIds.has(id)) {
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
        this._scene.remove(group);
        this._hazardMeshes.delete(id);
      }
    }
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
    this._enemyMaterials.clear();

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

    // Remove hazard meshes
    for (const [, group] of this._hazardMeshes) {
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
    this._hazardMeshes.clear();

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
