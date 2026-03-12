// ---------------------------------------------------------------------------
// 3Dragon mode — Three.js 3D renderer
// Beautiful 3D world: volumetric sky, rolling terrain, eagle + Arthur,
// enemies as 3D meshes, projectile trails, god rays, and atmospheric fog.
// ---------------------------------------------------------------------------

import * as THREE from "three";
import type { ThreeDragonState, TDEnemy } from "../state/ThreeDragonState";
import { TDEnemyType } from "../state/ThreeDragonState";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FOG_COLOR = 0x1a1833;
const AMBIENT_COLOR = 0x334466;
const SUN_COLOR = 0xffeedd;
const GROUND_COLOR = 0x1e4a1e;

// ---------------------------------------------------------------------------
// ThreeDragonRenderer
// ---------------------------------------------------------------------------

export class ThreeDragonRenderer {
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

  // Projectile meshes
  private _projMeshes = new Map<number, THREE.Mesh>();

  // Explosion meshes
  private _explosionMeshes: { mesh: THREE.Mesh; timer: number; maxTimer: number }[] = [];
  // Shockwave ring meshes
  private _shockwaveRings: { mesh: THREE.Mesh; timer: number; maxTimer: number; maxRadius: number }[] = [];

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

  init(sw: number, sh: number): void {
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
    this._scene.fog = new THREE.FogExp2(FOG_COLOR, 0.006);

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
  }

  // ---------------------------------------------------------------------------
  // Lighting
  // ---------------------------------------------------------------------------

  private _buildLighting(): void {
    // Ambient — warm tinted for golden hour feel
    this._ambientLight = new THREE.AmbientLight(AMBIENT_COLOR, 0.5);
    this._scene.add(this._ambientLight);

    // Sun directional — warm golden light from ahead-right
    this._sunLight = new THREE.DirectionalLight(SUN_COLOR, 1.6);
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

    // Player wand light — bright magic glow
    this._pointLight = new THREE.PointLight(0x88ccff, 3, 20);
    this._scene.add(this._pointLight);

    // Hemisphere light — blue sky above, green ground below
    const hemiLight = new THREE.HemisphereLight(0x7799dd, 0x224422, 0.5);
    this._scene.add(hemiLight);

    // Rim light from behind — creates silhouette edge glow
    const rimLight = new THREE.DirectionalLight(0xff9966, 0.4);
    rimLight.position.set(-20, 30, 60);
    this._scene.add(rimLight);
  }

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------

  private _buildSky(): void {
    // Sky dome
    const skyGeo = new THREE.SphereGeometry(200, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uTopColor: { value: new THREE.Color(0x0b0e2a) },
        uMidColor: { value: new THREE.Color(0x1a2555) },
        uHorizonColor: { value: new THREE.Color(0xdd6633) },
        uSunColor: { value: new THREE.Color(0xffcc44) },
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
    const sunGeo = new THREE.PlaneGeometry(20, 20);
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
          float glow = exp(-d * 4.0) * 0.9;
          float core = exp(-d * 12.0) * 1.0;
          float rays = sin(atan(c.y, c.x) * 8.0 + uTime * 0.5) * 0.5 + 0.5;
          rays *= exp(-d * 6.0) * 0.15;
          float a = glow + core + rays;
          vec3 col = mix(vec3(1.0, 0.85, 0.4), vec3(1.0, 1.0, 0.95), core);
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this._sunMesh.position.set(80, 60, -120);
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
          // Soft glow
          float glow = exp(-d * 3.5) * 0.25;
          float halo = exp(-d * 1.5) * 0.08;
          vec3 moonCol = vec3(0.8, 0.85, 1.0);
          vec3 glowCol = vec3(0.5, 0.6, 0.9);
          vec3 col = moonCol * crescent + glowCol * (glow + halo);
          float a = crescent * 0.9 + glow + halo;
          // Subtle surface detail
          float detail = sin(c.x * 40.0) * sin(c.y * 40.0) * 0.05 * disc;
          col -= detail;
          gl_FragColor = vec4(col, a);
        }
      `,
    });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this._moonMesh.position.set(-90, 70, -80);
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
    // Cloud color palette — sunset-lit with depth layers
    const cloudLightColors = [0xddccaa, 0xeeddbb, 0xccbb99, 0xddbb88];
    const cloudDarkColors = [0x556688, 0x667799, 0x445577, 0x778899];
    const cloudMidColors = [0x99aabb, 0xaabbcc, 0x8899aa, 0xbbaa99];

    for (let i = 0; i < 55; i++) {
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
          color: 0xffeedd,
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
    // Rolling green terrain tiles
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

      // Gradient ground material with vertex colors for variation
      const mat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(GROUND_COLOR).offsetHSL(
          (Math.random() - 0.5) * 0.03,
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
    const waterGeo = new THREE.PlaneGeometry(500, 500, 64, 64);
    waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0x0d1f3c) },
        uHighlight: { value: new THREE.Color(0x3388bb) },
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
    this._waterPlane.position.y = -3;
    this._scene.add(this._waterPlane);

    // Mountains (distant backdrop) with snow caps, ridgelines, and foothills
    for (let i = 0; i < 30; i++) {
      const h = 15 + Math.random() * 45;
      const w = 10 + Math.random() * 25;
      const mtnGroup = new THREE.Group();

      // Main peak — varied polygon counts for organic shapes
      const mtnGeo = new THREE.ConeGeometry(w, h, 5 + Math.floor(Math.random() * 4));
      const baseHue = 0.28 + (Math.random() - 0.5) * 0.06;
      const mtnMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color().setHSL(baseHue, 0.25 + Math.random() * 0.15, 0.15 + Math.random() * 0.12),
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
      if (h > 22) {
        const snowGeo = new THREE.ConeGeometry(w * 0.35, h * 0.2, 6);
        const snowMat = new THREE.MeshPhongMaterial({
          color: 0xddeeff,
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
        (Math.random() < 0.5 ? -1 : 1) * (30 + Math.random() * 45),
        h * 0.4,
        -Math.random() * 350,
      );
      mtn.castShadow = true;
      this._scene.add(mtnGroup);
      this._mountains.push(mtnGroup as any);
    }

    // Scattered ground rocks and boulders
    const rockMat = new THREE.MeshPhongMaterial({ color: 0x445544, flatShading: true });
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
    const grassColors = [0x2a6e2a, 0x337733, 0x448833, 0x557722];
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
    const flowerColors = [0xff6688, 0xffaa44, 0xcc88ff, 0x88ccff, 0xffff66, 0xff4466];
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

    // Trees scattered on ground — mixed forest with autumn colors
    const canopyColors = [0x225522, 0x2a5e2a, 0x4a7a2a, 0x886622, 0x994422, 0x553322];
    for (let i = 0; i < 80; i++) {
      const treeGroup = new THREE.Group();
      const trunkH = 1.5 + Math.random() * 2.5;
      const trunkGeo = new THREE.CylinderGeometry(0.2, 0.35, trunkH, 6);
      const trunkMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x553311).offsetHSL(0, 0, (Math.random() - 0.5) * 0.1),
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

    return group;
  }

  private _buildBossMesh(group: THREE.Group, enemy: TDEnemy): void {
    const s = enemy.size;

    switch (enemy.type) {
      case TDEnemyType.BOSS_ANCIENT_DRAGON: {
        // Massive dragon with detailed body
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x881100,
          emissive: 0xff4400,
          emissiveIntensity: 0.15,
          flatShading: true,
        });
        // Body
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 2, s * 0.8, s * 1.2);
        group.add(body);
        // Head
        const head = new THREE.Mesh(this._sphereGeo, bodyMat.clone());
        head.scale.set(s * 0.8, s * 0.6, s * 0.6);
        head.position.set(s * 2, s * 0.3, 0);
        group.add(head);
        // Horns
        const hornMat = new THREE.MeshPhongMaterial({ color: 0x553300 });
        for (const z of [-0.3, 0.3]) {
          const horn = new THREE.Mesh(this._coneGeo, hornMat);
          horn.scale.set(s * 0.15, s * 0.8, s * 0.15);
          horn.position.set(s * 2.2, s * 0.8, z * s);
          group.add(horn);
        }
        // Fire eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0xff4400 });
        for (const z of [-0.2, 0.2]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.15, s * 0.15, s * 0.15);
          eye.position.set(s * 2.5, s * 0.5, z * s);
          group.add(eye);
        }
        // Tail
        const tailMat = new THREE.MeshPhongMaterial({ color: 0x770a00 });
        const tail = new THREE.Mesh(this._coneGeo, tailMat);
        tail.scale.set(s * 0.3, s * 2.5, s * 0.3);
        tail.rotation.z = Math.PI / 2;
        tail.position.set(-s * 2.5, 0, 0);
        group.add(tail);
        break;
      }

      case TDEnemyType.BOSS_STORM_COLOSSUS: {
        // Giant humanoid of storm energy
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x003355,
          emissive: 0x00ccff,
          emissiveIntensity: 0.2,
          transparent: true,
          opacity: 0.85,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.5, s * 2.5, s * 1.2);
        group.add(body);
        // Head
        const head = new THREE.Mesh(this._sphereGeo, bodyMat.clone());
        head.scale.set(s * 0.7, s * 0.7, s * 0.7);
        head.position.y = s * 2.8;
        group.add(head);
        // Lightning eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00ccff });
        for (const z of [-0.3, 0.3]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.2, s * 0.2, s * 0.2);
          eye.position.set(s * 0.3, s * 2.9, z * s);
          group.add(eye);
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
        // Multi-headed serpent
        const bodyMat = new THREE.MeshPhongMaterial({
          color: 0x005533,
          emissive: 0x44ffaa,
          emissiveIntensity: 0.15,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 2, s * 1.5, s * 1.5);
        group.add(body);
        // Three heads
        for (let i = -1; i <= 1; i++) {
          const neckGeo = new THREE.CylinderGeometry(s * 0.2, s * 0.3, s * 2, 6);
          neckGeo.rotateZ(-Math.PI / 4 + i * 0.3);
          const neck = new THREE.Mesh(neckGeo, bodyMat.clone());
          neck.position.set(s * 1.2, s * 1 + i * s * 0.3, i * s * 0.6);
          group.add(neck);
          const head = new THREE.Mesh(this._sphereGeo, bodyMat.clone());
          head.scale.set(s * 0.5, s * 0.4, s * 0.4);
          head.position.set(s * 2.5, s * 1.8 + i * s * 0.5, i * s * 0.8);
          group.add(head);
          // Eyes
          const eyeMat = new THREE.MeshBasicMaterial({ color: 0x44ffaa });
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(s * 0.1, s * 0.1, s * 0.1);
          eye.position.set(s * 2.8, s * 1.9 + i * s * 0.5, i * s * 0.8);
          group.add(eye);
        }
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
        mtn.position.z -= 300;
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
      const t = ring.timer / ring.maxTimer;
      if (t >= 1) {
        this._scene.remove(ring.mesh);
        (ring.mesh.material as THREE.Material).dispose();
        ring.mesh.geometry.dispose();
        return false;
      }
      const scale = t * ring.maxRadius;
      ring.mesh.scale.set(scale, scale, scale * 0.3);
      (ring.mesh.material as THREE.MeshBasicMaterial).opacity = 0.5 * (1 - t);
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

  private _updateEnemies(state: ThreeDragonState, _dt: number, time: number): void {
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
      let mesh = this._projMeshes.get(proj.id);

      if (!mesh) {
        const mat = new THREE.MeshBasicMaterial({
          color: proj.color,
          transparent: true,
          opacity: 0.9,
        });
        mesh = new THREE.Mesh(this._sphereGeo, mat);
        mesh.scale.setScalar(proj.size);
        this._scene.add(mesh);
        this._projMeshes.set(proj.id, mesh);
      }

      mesh.position.set(proj.position.x, proj.position.y, proj.position.z);

      // Pulse glow
      const pulse = 1 + Math.sin(time * 10 + proj.id) * 0.15 * proj.glowIntensity;
      mesh.scale.setScalar(proj.size * pulse);

      // Trail particles
      if (Math.random() < 0.6) {
        const col = new THREE.Color(proj.trailColor);
        this._addTrailPoint(
          proj.position.x + (Math.random() - 0.5) * 0.3,
          proj.position.y + (Math.random() - 0.5) * 0.3,
          proj.position.z + (Math.random() - 0.5) * 0.3,
          col.r, col.g, col.b,
          proj.size * 0.6,
        );
      }
    }

    // Cleanup
    for (const [id, mesh] of this._projMeshes) {
      if (!seen.has(id)) {
        this._scene.remove(mesh);
        (mesh.material as THREE.Material).dispose();
        this._projMeshes.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Explosions
  // ---------------------------------------------------------------------------

  addExplosion(x: number, y: number, z: number, radius: number, color: number): void {
    // Outer expanding sphere
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(this._sphereGeo, mat);
    mesh.position.set(x, y, z);
    mesh.scale.setScalar(0.1);
    this._scene.add(mesh);
    this._explosionMeshes.push({ mesh, timer: 0, maxTimer: 0.6 });

    // Inner bright core — hotter, faster
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this._sphereGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(0.05);
    this._scene.add(core);
    this._explosionMeshes.push({ mesh: core, timer: 0, maxTimer: 0.25 });

    // Secondary colored glow layer
    const glowMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const glowMesh = new THREE.Mesh(this._sphereGeo, glowMat);
    glowMesh.position.set(x, y, z);
    glowMesh.scale.setScalar(0.05);
    this._scene.add(glowMesh);
    this._explosionMeshes.push({ mesh: glowMesh, timer: 0, maxTimer: 0.8 });

    // Shockwave ring — horizontal expanding torus
    const ringGeo = new THREE.TorusGeometry(1, 0.15, 8, 24);
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
    this._shockwaveRings.push({ mesh: ring, timer: 0, maxTimer: 0.5, maxRadius: radius * 1.5 });

    // Second vertical shockwave ring for larger explosions
    if (radius > 3) {
      const ring2Geo = new THREE.TorusGeometry(1, 0.1, 8, 20);
      const ring2Mat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.3).getHex(),
        transparent: true,
        opacity: 0.35,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const ring2 = new THREE.Mesh(ring2Geo, ring2Mat);
      ring2.position.set(x, y, z);
      ring2.rotation.z = Math.PI / 2;
      ring2.scale.setScalar(0.1);
      this._scene.add(ring2);
      this._shockwaveRings.push({ mesh: ring2, timer: 0, maxTimer: 0.6, maxRadius: radius * 1.2 });
    }

    // Flash point light for illumination — brighter
    const flash = new THREE.PointLight(color, 12, radius * 4);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    setTimeout(() => { this._scene.remove(flash); }, 250);

    // Burst trail particles — more of them, varied sizes
    const col = new THREE.Color(color);
    const brightCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4);
    const darkCol = new THREE.Color(color).lerp(new THREE.Color(0x000000), 0.3);
    for (let i = 0; i < 35; i++) {
      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const r = radius * (0.2 + Math.random() * 0.5);
      const useColor = Math.random() < 0.2 ? brightCol : Math.random() < 0.15 ? darkCol : col;
      this._addTrailPoint(
        x + Math.cos(angle) * Math.sin(angleV) * r,
        y + Math.cos(angleV) * r,
        z + Math.sin(angle) * Math.sin(angleV) * r,
        useColor.r, useColor.g, useColor.b,
        0.4 + Math.random() * 1.0,
      );
    }
  }

  private _updateExplosionMeshes(_state: ThreeDragonState, dt: number): void {
    this._explosionMeshes = this._explosionMeshes.filter(ex => {
      ex.timer += dt;
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
      // Faster initial opacity then slow fade
      const opacity = t < 0.2 ? 0.6 : 0.6 * Math.pow(1 - (t - 0.2) / 0.8, 2);
      (ex.mesh.material as THREE.MeshBasicMaterial).opacity = opacity;
      return true;
    });
  }

  // ---------------------------------------------------------------------------
  // Lightning FX
  // ---------------------------------------------------------------------------

  addLightning(x: number, y: number, z: number): void {
    // Create a simple lightning line from sky to point
    const points: THREE.Vector3[] = [];
    let cx = x + (Math.random() - 0.5) * 5;
    let cy = 40;
    const steps = 8;
    const stepY = (40 - y) / steps;

    for (let i = 0; i <= steps; i++) {
      points.push(new THREE.Vector3(
        cx + (Math.random() - 0.5) * 4,
        cy,
        z + (Math.random() - 0.5) * 4,
      ));
      cx += (Math.random() - 0.5) * 6;
      cy -= stepY;
    }

    const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x88ddff,
      transparent: true,
      opacity: 1,
      linewidth: 2,
    });
    const line = new THREE.Line(lineGeo, lineMat);
    this._scene.add(line);

    // Flash point light
    const flash = new THREE.PointLight(0x88ddff, 10, 30);
    flash.position.set(x, y, z);
    this._scene.add(flash);

    // Cleanup after short time
    setTimeout(() => {
      this._scene.remove(line);
      this._scene.remove(flash);
      lineGeo.dispose();
      lineMat.dispose();
    }, 150);
  }

  // ---------------------------------------------------------------------------
  // Enemy death effects
  // ---------------------------------------------------------------------------

  addEnemyDeathEffect(x: number, y: number, z: number, size: number, color: number, glowColor: number, isBoss: boolean): void {
    const debrisCount = isBoss ? 30 : 15 + Math.floor(Math.random() * 6);

    for (let i = 0; i < debrisCount; i++) {
      const debrisMat = new THREE.MeshBasicMaterial({
        color: Math.random() < 0.5 ? color : glowColor,
        transparent: true,
        opacity: 0.9,
        depthWrite: false,
      });
      const debris = new THREE.Mesh(this._sphereGeo, debrisMat);
      const debrisSize = (isBoss ? 0.3 : 0.15) + Math.random() * 0.25;
      debris.scale.setScalar(debrisSize);

      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const speed = (isBoss ? 15 : 8) + Math.random() * 10;
      const vx = Math.cos(angle) * Math.sin(angleV) * speed;
      const vy = Math.cos(angleV) * speed;
      const vz = Math.sin(angle) * Math.sin(angleV) * speed;

      debris.position.set(x, y, z);
      this._scene.add(debris);

      const startTime = performance.now();
      const duration = 400 + Math.random() * 400;

      const animate = () => {
        const elapsed = performance.now() - startTime;
        const t = elapsed / duration;
        if (t >= 1) {
          this._scene.remove(debris);
          debrisMat.dispose();
          return;
        }
        debris.position.x += vx * 0.016;
        debris.position.y += (vy - 15 * (elapsed / 1000)) * 0.016;
        debris.position.z += vz * 0.016;
        debrisMat.opacity = Math.max(0, 0.9 * (1 - t));
        debris.scale.setScalar(debrisSize * (1 - t * 0.5));
        requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    }

    // Flash point light
    const flashIntensity = isBoss ? 20 : 8;
    const flashRange = isBoss ? size * 10 : size * 5;
    const flash = new THREE.PointLight(glowColor, flashIntensity, flashRange);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    setTimeout(() => { this._scene.remove(flash); }, isBoss ? 400 : 200);

    // Boss: extra large explosion with screen flash
    if (isBoss) {
      // Large bright core
      const coreMat = new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.8,
        depthWrite: false,
      });
      const core = new THREE.Mesh(this._sphereGeo, coreMat);
      core.position.set(x, y, z);
      core.scale.setScalar(0.5);
      this._scene.add(core);
      this._explosionMeshes.push({ mesh: core, timer: 0, maxTimer: 0.8 });

      // Extra glow layers
      for (let i = 0; i < 3; i++) {
        const glowMat = new THREE.MeshBasicMaterial({
          color: glowColor,
          transparent: true,
          opacity: 0.4 - i * 0.1,
          depthWrite: false,
          side: THREE.DoubleSide,
        });
        const glow = new THREE.Mesh(this._sphereGeo, glowMat);
        glow.position.set(x, y, z);
        glow.scale.setScalar(0.3);
        this._scene.add(glow);
        this._explosionMeshes.push({ mesh: glow, timer: 0, maxTimer: 1.0 + i * 0.2 });
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
    for (const [, mesh] of this._projMeshes) {
      this._scene.remove(mesh);
      (mesh.material as THREE.Material).dispose();
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

    // Remove canvas
    if (this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    this._renderer.dispose();
  }
}
