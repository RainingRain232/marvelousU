import * as THREE from "three";

export class TekkenSceneManager {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  // Lighting
  private _keyLight!: THREE.DirectionalLight;
  private _fillLight!: THREE.DirectionalLight;
  private _rimLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;

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
    });
    this.renderer.setSize(this._width, this._height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

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

    // Handle resize
    window.addEventListener("resize", this._onResize);
  }

  private _setupLighting(): void {
    // Key light: strong warm directional from upper-front-right
    this._keyLight = new THREE.DirectionalLight(0xffeedd, 2.8);
    this._keyLight.position.set(3, 6, 4);
    this._keyLight.castShadow = true;
    this._keyLight.shadow.mapSize.set(2048, 2048);
    this._keyLight.shadow.camera.near = 0.5;
    this._keyLight.shadow.camera.far = 20;
    this._keyLight.shadow.camera.left = -6;
    this._keyLight.shadow.camera.right = 6;
    this._keyLight.shadow.camera.top = 4;
    this._keyLight.shadow.camera.bottom = -2;
    this._keyLight.shadow.bias = -0.001;
    this._keyLight.shadow.normalBias = 0.02;
    this.scene.add(this._keyLight);

    // Fill light: cool blue from opposite side (creates depth)
    this._fillLight = new THREE.DirectionalLight(0x6688cc, 0.8);
    this._fillLight.position.set(-4, 3, -2);
    this.scene.add(this._fillLight);

    // Rim/back light: strong backlight for silhouette definition
    this._rimLight = new THREE.DirectionalLight(0xffffff, 1.4);
    this._rimLight.position.set(0, 2, -5);
    this.scene.add(this._rimLight);

    // Ambient: low, warm, to lift shadows
    this._ambientLight = new THREE.AmbientLight(0x443344, 0.4);
    this.scene.add(this._ambientLight);

    // Hemisphere: subtle color grading (warm from above, cool from below)
    this._hemiLight = new THREE.HemisphereLight(0x887766, 0x223344, 0.5);
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
    const light = new THREE.PointLight(0xff8833, 1.5, 8, 2);
    light.position.set(x, y, z);
    light.castShadow = false; // perf: skip shadow for point lights
    this.scene.add(light);
    this._torchLights.push(light);
    return light;
  }

  /** Animate torch flicker - call each frame */
  updateTorches(time: number): void {
    for (let i = 0; i < this._torchLights.length; i++) {
      const t = this._torchLights[i];
      t.intensity = 1.2 + Math.sin(time * 3.5 + i * 1.7) * 0.3 + Math.sin(time * 7.1 + i * 2.3) * 0.15;
    }
  }

  render(): void {
    const time = this._clock.getElapsedTime();
    this.updateTorches(time);
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
    for (const t of this._torchLights) {
      this.scene.remove(t);
      t.dispose();
    }
    this._torchLights = [];

    if (this.canvas.parentNode) {
      this.canvas.parentNode.removeChild(this.canvas);
    }
    this.renderer.dispose();
  }
}
