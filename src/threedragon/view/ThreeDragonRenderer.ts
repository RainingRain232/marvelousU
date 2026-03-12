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
  private _cloudGroup = new THREE.Group();
  private _starField!: THREE.Points;

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

    // Clouds
    this._buildClouds();
  }

  private _buildClouds(): void {
    // Cloud color palette — sunset-lit whites and warm golds
    const cloudColors = [0x8899bb, 0x99aaca, 0xccaa88, 0xddccaa, 0xaa99bb];

    for (let i = 0; i < 50; i++) {
      const cloudGroup = new THREE.Group();
      const puffs = 4 + Math.floor(Math.random() * 5);
      const baseColor = cloudColors[Math.floor(Math.random() * cloudColors.length)];
      for (let j = 0; j < puffs; j++) {
        const size = 4 + Math.random() * 10;
        const mat = new THREE.MeshBasicMaterial({
          color: baseColor,
          transparent: true,
          opacity: 0.06 + Math.random() * 0.14,
          depthWrite: false,
        });
        const puff = new THREE.Mesh(this._sphereGeo, mat);
        puff.scale.set(size, size * 0.35, size * 0.7);
        puff.position.set(
          (Math.random() - 0.5) * size * 2.5,
          (Math.random() - 0.5) * size * 0.25,
          (Math.random() - 0.5) * size * 1.2,
        );
        cloudGroup.add(puff);
      }
      cloudGroup.position.set(
        (Math.random() - 0.5) * 250,
        20 + Math.random() * 50,
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
          vec3 col = mix(uColor, uHighlight, shimmer + foam);
          float alpha = 0.65 + shimmer * 0.1;
          gl_FragColor = vec4(col, alpha);
        }
      `,
    });
    this._waterPlane = new THREE.Mesh(waterGeo, waterMat);
    this._waterPlane.position.y = -3;
    this._scene.add(this._waterPlane);

    // Mountains (distant backdrop) with snow caps
    for (let i = 0; i < 20; i++) {
      const h = 15 + Math.random() * 35;
      const w = 10 + Math.random() * 20;
      const mtnGroup = new THREE.Group();

      const mtnGeo = new THREE.ConeGeometry(w, h, 6);
      const mtnMat = new THREE.MeshPhongMaterial({
        color: new THREE.Color(0x2a3a2a).offsetHSL(
          (Math.random() - 0.5) * 0.02,
          0,
          (Math.random() - 0.5) * 0.12,
        ),
        flatShading: true,
      });
      const mtn = new THREE.Mesh(mtnGeo, mtnMat);
      mtnGroup.add(mtn);

      // Snow cap on tall mountains
      if (h > 25) {
        const snowGeo = new THREE.ConeGeometry(w * 0.35, h * 0.2, 6);
        const snowMat = new THREE.MeshPhongMaterial({
          color: 0xddeeff,
          emissive: 0x223344,
          emissiveIntensity: 0.1,
        });
        const snow = new THREE.Mesh(snowGeo, snowMat);
        snow.position.y = h * 0.4;
        mtnGroup.add(snow);
      }

      mtnGroup.position.set(
        (Math.random() < 0.5 ? -1 : 1) * (35 + Math.random() * 35),
        h * 0.4,
        -Math.random() * 300,
      );
      mtn.castShadow = true;
      this._scene.add(mtnGroup);
      this._mountains.push(mtnGroup as any);
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
    // The eagle is built facing +X, so rotate -90 degrees around Y
    this._eagleGroup.rotation.y = -Math.PI / 2;

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
        // Bird-like body
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.2,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.2, s * 0.5, s * 0.8);
        group.add(body);
        // Wings
        const wingMat = new THREE.MeshPhongMaterial({ color: enemy.color - 0x111111, side: THREE.DoubleSide });
        const wL = new THREE.Mesh(this._createWingGeometry(), wingMat);
        wL.scale.set(s * 0.5, s * 0.5, s * 0.8);
        wL.position.set(0, 0.2 * s, -s * 0.5);
        wL.name = "wingL";
        group.add(wL);
        const wR = new THREE.Mesh(this._createWingGeometry(), wingMat.clone());
        wR.scale.set(s * 0.5, s * 0.5, -s * 0.8);
        wR.position.set(0, 0.2 * s, s * 0.5);
        wR.name = "wingR";
        group.add(wR);
        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: enemy.type === TDEnemyType.STORM_HARPY ? 0x00ffff : 0xff0000 });
        const eye = new THREE.Mesh(new THREE.SphereGeometry(s * 0.15, 6, 4), eyeMat);
        eye.position.set(s * 0.9, s * 0.2, 0);
        group.add(eye);
        break;
      }

      case TDEnemyType.CRYSTAL_WYVERN: {
        // Dragon-like
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          specular: 0x88ccff,
          shininess: 60,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.15,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s * 1.8, s * 0.7, s);
        group.add(body);
        // Crystal spines
        const spineMat = new THREE.MeshPhongMaterial({ color: 0x88ddff, transparent: true, opacity: 0.7 });
        for (let i = 0; i < 4; i++) {
          const spine = new THREE.Mesh(this._coneGeo, spineMat);
          spine.scale.set(s * 0.2, s * 0.6, s * 0.2);
          spine.position.set(-s * 0.5 + i * s * 0.4, s * 0.6, 0);
          group.add(spine);
        }
        break;
      }

      case TDEnemyType.EMBER_PHOENIX: {
        // Fiery bird
        const bodyMat = new THREE.MeshBasicMaterial({
          color: 0xff6600,
        });
        const body = new THREE.Mesh(this._sphereGeo, bodyMat);
        body.scale.set(s, s * 0.6, s * 0.6);
        body.name = "phoenixBody";
        group.add(body);
        // Inner glow
        const innerMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
        const inner = new THREE.Mesh(this._sphereGeo, innerMat);
        inner.scale.set(s * 0.6, s * 0.35, s * 0.35);
        group.add(inner);
        break;
      }

      case TDEnemyType.VOID_WRAITH:
      case TDEnemyType.SPECTRAL_KNIGHT: {
        // Ghostly robed figure
        const bodyMat = new THREE.MeshPhongMaterial({
          color: enemy.color,
          emissive: enemy.glowColor,
          emissiveIntensity: 0.3,
          transparent: true,
          opacity: 0.8,
        });
        const body = new THREE.Mesh(this._coneGeo, bodyMat);
        body.scale.set(s * 0.8, s * 1.5, s * 0.8);
        body.position.y = s * 0.5;
        group.add(body);
        // Head
        const headMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const head = new THREE.Mesh(this._sphereGeo, headMat);
        head.scale.set(s * 0.4, s * 0.4, s * 0.4);
        head.position.y = s * 1.5;
        group.add(head);
        break;
      }

      case TDEnemyType.ARCANE_ORB: {
        const orbMat = new THREE.MeshBasicMaterial({
          color: enemy.glowColor,
        });
        const orb = new THREE.Mesh(this._sphereGeo, orbMat);
        orb.scale.set(s * 0.6, s * 0.6, s * 0.6);
        group.add(orb);
        // Rings
        const ringGeo = new THREE.TorusGeometry(s * 0.8, 0.05, 8, 16);
        const ringMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor, transparent: true, opacity: 0.4 });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.name = "ring";
        group.add(ring);
        break;
      }

      case TDEnemyType.DARK_TOWER:
      case TDEnemyType.CANNON_FORT: {
        // Tower structure
        const towerMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true });
        const tower = new THREE.Mesh(this._boxGeo, towerMat);
        tower.scale.set(s, s * 3, s);
        tower.position.y = s * 1.5;
        group.add(tower);
        // Top orb
        const topMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        const top = new THREE.Mesh(this._sphereGeo, topMat);
        top.scale.set(s * 0.4, s * 0.4, s * 0.4);
        top.position.y = s * 3.2;
        top.name = "topOrb";
        group.add(top);
        break;
      }

      case TDEnemyType.SIEGE_GOLEM: {
        // Blocky golem
        const bodyMat = new THREE.MeshPhongMaterial({ color: enemy.color, flatShading: true });
        const body = new THREE.Mesh(this._boxGeo, bodyMat);
        body.scale.set(s * 1.5, s * 2, s * 1.2);
        body.position.y = s;
        group.add(body);
        const headMat = new THREE.MeshPhongMaterial({ color: enemy.color + 0x111111 });
        const head = new THREE.Mesh(this._boxGeo, headMat);
        head.scale.set(s * 0.8, s * 0.8, s * 0.8);
        head.position.y = s * 2.5;
        group.add(head);
        // Eyes
        const eyeMat = new THREE.MeshBasicMaterial({ color: enemy.glowColor });
        for (const z of [-0.2, 0.2]) {
          const eye = new THREE.Mesh(this._sphereGeo, eyeMat);
          eye.scale.set(0.15, 0.15, 0.15);
          eye.position.set(s * 0.4, s * 2.6, z * s);
          group.add(eye);
        }
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
    // Since the group is rotated -PI/2 on Y, banking maps to local Z
    this._eagleGroup.rotation.set(0, -Math.PI / 2, p.eagleBankAngle);

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
        // Death: scale up and fade
        const t = 1 - enemy.deathTimer / 0.5;
        group.scale.setScalar(1 + t * 0.5);
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
    // Outer shockwave ring
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

    // Inner bright core
    const coreMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      depthWrite: false,
    });
    const core = new THREE.Mesh(this._sphereGeo, coreMat);
    core.position.set(x, y, z);
    core.scale.setScalar(0.05);
    this._scene.add(core);
    this._explosionMeshes.push({ mesh: core, timer: 0, maxTimer: 0.3 });

    // Flash point light for illumination
    const flash = new THREE.PointLight(color, 8, radius * 3);
    flash.position.set(x, y, z);
    this._scene.add(flash);
    setTimeout(() => { this._scene.remove(flash); }, 200);

    // Burst trail particles — more of them, varied sizes
    const col = new THREE.Color(color);
    const brightCol = new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.4);
    for (let i = 0; i < 25; i++) {
      const angle = Math.random() * Math.PI * 2;
      const angleV = Math.random() * Math.PI;
      const r = radius * (0.2 + Math.random() * 0.4);
      const useColor = Math.random() < 0.3 ? brightCol : col;
      this._addTrailPoint(
        x + Math.cos(angle) * Math.sin(angleV) * r,
        y + Math.cos(angleV) * r,
        z + Math.sin(angle) * Math.sin(angleV) * r,
        useColor.r, useColor.g, useColor.b,
        0.4 + Math.random() * 0.8,
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
      const scale = t * 5; // expand
      ex.mesh.scale.setScalar(scale);
      (ex.mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 * (1 - t);
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

    // Remove canvas
    if (this._canvas.parentNode) {
      this._canvas.parentNode.removeChild(this._canvas);
    }

    this._renderer.dispose();
  }
}
