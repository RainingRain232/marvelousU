import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";

// Vignette shader definition
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    offset: { value: 1.0 },
    darkness: { value: 1.2 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform float offset;
    uniform float darkness;
    uniform sampler2D tDiffuse;
    varying vec2 vUv;
    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec2 uv = (vUv - vec2(0.5)) * vec2(offset);
      gl_FragColor = vec4(mix(texel.rgb, vec3(1.0 - darkness), dot(uv, uv)), texel.a);
    }
  `,
};

// Chromatic aberration shader definition
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    amount: { value: 0.0 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float amount;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - vec2(0.5);
      float d = length(dir);
      vec2 offset = dir * d * amount;
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

// Radial blur / impact distortion shader for heavy hits
const RadialBlurShader = {
  uniforms: {
    tDiffuse: { value: null },
    intensity: { value: 0.0 },
    center: { value: new THREE.Vector2(0.5, 0.5) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float intensity;
    uniform vec2 center;
    varying vec2 vUv;
    void main() {
      vec2 dir = vUv - center;
      float d = length(dir);
      vec4 color = vec4(0.0);
      float total = 0.0;
      for (int i = 0; i < 8; i++) {
        float scale = 1.0 - intensity * 0.01 * float(i);
        vec2 uv = center + dir * scale;
        float weight = 1.0 - float(i) / 8.0;
        color += texture2D(tDiffuse, uv) * weight;
        total += weight;
      }
      gl_FragColor = color / total;
    }
  `,
};

export class TekkenSceneManager {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  // Post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _vignettePass!: ShaderPass;
  private _chromaticPass!: ShaderPass;
  private _radialBlurPass!: ShaderPass;
  private _baseBloomStrength = 0.5;
  private _rageGlowActive = false;

  // Lighting
  private _keyLight!: THREE.DirectionalLight;
  private _fillLight!: THREE.DirectionalLight;
  private _rimLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;

  // Volumetric light cones (decorative meshes)
  private _lightCones: THREE.Mesh[] = [];

  // Torch point lights (for arena atmosphere)
  private _torchLights: THREE.PointLight[] = [];

  private _width = 0;
  private _height = 0;
  private _clock = new THREE.Clock();

  init(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "tekken-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.zIndex = "10";

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this.canvas);

    // Renderer with high quality settings
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: false,
      powerPreference: "high-performance",
    });
    this.renderer.setSize(this._width, this._height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x0a0a14);
    // Subtle fog for depth
    this.scene.fog = new THREE.FogExp2(0x0a0a14, 0.04);

    // Camera - side view, slightly elevated, looking at fighters
    this.camera = new THREE.PerspectiveCamera(35, this._width / this._height, 0.1, 100);
    this.camera.position.set(0, 1.4, 5.5);
    this.camera.lookAt(0, 0.9, 0);

    // Setup dramatic lighting
    this._setupLighting();

    // Environment map for metallic reflections
    this._setupEnvironmentMap();

    // Post-processing composer
    this._setupPostProcessing();

    // Handle resize
    window.addEventListener("resize", this._onResize);
  }

  private _setupPostProcessing(): void {
    this._composer = new EffectComposer(this.renderer);

    // Base scene render
    const renderPass = new RenderPass(this.scene, this.camera);
    this._composer.addPass(renderPass);

    // Bloom for hit effects, rage glow, and torch flames
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this._width, this._height),
      this._baseBloomStrength, // strength
      0.6,                     // radius (wider glow spread)
      0.6                      // threshold (catch more bright areas)
    );
    this._composer.addPass(this._bloomPass);

    // Radial blur for heavy hit screen distortion (starts at 0)
    this._radialBlurPass = new ShaderPass(RadialBlurShader);
    this._composer.addPass(this._radialBlurPass);

    // Vignette for cinematic framing
    this._vignettePass = new ShaderPass(VignetteShader);
    this._vignettePass.uniforms["darkness"].value = 1.4;
    this._composer.addPass(this._vignettePass);

    // Chromatic aberration for heavy hit impacts (starts at 0)
    this._chromaticPass = new ShaderPass(ChromaticAberrationShader);
    this._composer.addPass(this._chromaticPass);

    // Output pass (tone mapping / color space conversion)
    const outputPass = new OutputPass();
    this._composer.addPass(outputPass);
  }

  private _setupLighting(): void {
    // Key light: strong warm directional from upper-front-right
    this._keyLight = new THREE.DirectionalLight(0xffeedd, 3.0);
    this._keyLight.position.set(3, 6, 4);
    this._keyLight.castShadow = true;
    this._keyLight.shadow.mapSize.set(4096, 4096);
    this._keyLight.shadow.camera.near = 0.5;
    this._keyLight.shadow.camera.far = 20;
    this._keyLight.shadow.camera.left = -6;
    this._keyLight.shadow.camera.right = 6;
    this._keyLight.shadow.camera.top = 4;
    this._keyLight.shadow.camera.bottom = -2;
    this._keyLight.shadow.bias = -0.0005;
    this._keyLight.shadow.normalBias = 0.015;
    this._keyLight.shadow.radius = 2;
    this.scene.add(this._keyLight);

    // Fill light: cool blue from opposite side (creates depth)
    this._fillLight = new THREE.DirectionalLight(0x6688cc, 1.0);
    this._fillLight.position.set(-4, 3, -2);
    this._fillLight.castShadow = true;
    this._fillLight.shadow.mapSize.set(1024, 1024);
    this._fillLight.shadow.camera.near = 0.5;
    this._fillLight.shadow.camera.far = 15;
    this._fillLight.shadow.camera.left = -5;
    this._fillLight.shadow.camera.right = 5;
    this._fillLight.shadow.camera.top = 4;
    this._fillLight.shadow.camera.bottom = -1;
    this._fillLight.shadow.bias = -0.001;
    this.scene.add(this._fillLight);

    // Rim/back light: strong backlight for silhouette definition
    this._rimLight = new THREE.DirectionalLight(0xffffff, 1.6);
    this._rimLight.position.set(0, 2, -5);
    this.scene.add(this._rimLight);

    // Ambient: low, warm, to lift shadows
    this._ambientLight = new THREE.AmbientLight(0x443344, 0.5);
    this.scene.add(this._ambientLight);

    // Hemisphere: subtle color grading (warm from above, cool from below)
    this._hemiLight = new THREE.HemisphereLight(0x887766, 0x223344, 0.6);
    this.scene.add(this._hemiLight);
  }

  private _setupEnvironmentMap(): void {
    // Create a simple procedural environment map for metallic reflections
    const size = 64;
    const data = new Float32Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4;
        const ny = y / size;
        // Warm top, cool bottom gradient
        data[i] = 0.3 + ny * 0.4;     // R
        data[i + 1] = 0.25 + ny * 0.3; // G
        data[i + 2] = 0.4 + ny * 0.1;  // B
        data[i + 3] = 1;
      }
    }
    const envTexture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat, THREE.FloatType);
    envTexture.mapping = THREE.EquirectangularReflectionMapping;
    envTexture.needsUpdate = true;
    this.scene.environment = envTexture;
  }

  /** Add flickering torch point lights at given positions */
  addTorchLight(x: number, y: number, z: number): THREE.PointLight {
    const light = new THREE.PointLight(0xff8833, 1.8, 10, 2);
    light.position.set(x, y, z);
    light.castShadow = false; // perf: skip shadow for point lights
    this.scene.add(light);
    this._torchLights.push(light);
    return light;
  }

  /** Add a volumetric light cone (decorative mesh that simulates god rays) */
  addLightCone(x: number, y: number, z: number, height: number, radius: number, color: number = 0xffeebb): void {
    const coneGeo = new THREE.CylinderGeometry(0.05, radius, height, 12, 1, true);
    const coneMat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.04,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.position.set(x, y - height / 2, z);
    this.scene.add(cone);
    this._lightCones.push(cone);
  }

  /** Animate torch flicker and light cones - call each frame */
  updateTorches(time: number): void {
    for (let i = 0; i < this._torchLights.length; i++) {
      const t = this._torchLights[i];
      t.intensity = 1.4 + Math.sin(time * 3.5 + i * 1.7) * 0.4 + Math.sin(time * 7.1 + i * 2.3) * 0.2
        + Math.sin(time * 11.3 + i * 3.1) * 0.1;
    }
    // Animate light cones (subtle shimmer)
    for (let i = 0; i < this._lightCones.length; i++) {
      const cone = this._lightCones[i];
      const mat = cone.material as THREE.MeshBasicMaterial;
      mat.opacity = 0.03 + Math.sin(time * 1.5 + i * 2.3) * 0.015;
    }
  }

  /** Intensify torch and key lighting based on combo count (0-1) */
  setComboIntensity(intensity: number): void {
    for (const torch of this._torchLights) {
      torch.intensity = 1.5 + intensity * 2.0;
      torch.distance = 8 + intensity * 4;
    }
    this._keyLight.intensity = 2.8 + intensity * 0.5;
  }

  render(): void {
    const time = this._clock.getElapsedTime();
    this.updateTorches(time);

    // Decay radial blur each frame
    const radialIntensity = this._radialBlurPass.uniforms["intensity"].value;
    if (radialIntensity > 0.001) {
      this._radialBlurPass.uniforms["intensity"].value *= 0.88;
    } else {
      this._radialBlurPass.uniforms["intensity"].value = 0;
    }

    this._composer.render();
  }

  /** Boost bloom, chromatic aberration, and radial blur on heavy hits */
  setHitImpactIntensity(intensity: number): void {
    // Boost bloom temporarily based on hit intensity
    const bloomBoost = Math.min(intensity * 0.18, 1.5);
    const rageExtra = this._rageGlowActive ? 0.2 : 0;
    this._bloomPass.strength = this._baseBloomStrength + bloomBoost + rageExtra;

    // Set chromatic aberration offset
    this._chromaticPass.uniforms["amount"].value = Math.min(intensity * 0.01, 0.08);

    // Trigger radial blur for heavy hits (intensity > 3)
    if (intensity > 3) {
      this._radialBlurPass.uniforms["intensity"].value = Math.min(intensity * 0.4, 3.0);
    }
  }

  /** Subtly increase bloom when rage is active */
  setRageGlow(active: boolean): void {
    this._rageGlowActive = active;
    if (!active) {
      // Reset bloom to base if no hit impact is boosting it
      // (hit impact will re-set it each frame anyway)
    }
  }

  private _onResize = (): void => {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this.camera.aspect = this._width / this._height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this._width, this._height);
    this._composer.setSize(this._width, this._height);
    this._bloomPass.resolution.set(this._width, this._height);
  };

  destroy(): void {
    window.removeEventListener("resize", this._onResize);
    for (const t of this._torchLights) {
      this.scene.remove(t);
      t.dispose();
    }
    this._torchLights = [];

    for (const cone of this._lightCones) {
      this.scene.remove(cone);
      cone.geometry.dispose();
      (cone.material as THREE.Material).dispose();
    }
    this._lightCones = [];

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this._composer.dispose();
    this.renderer.dispose();
  }
}
