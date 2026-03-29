// ---------------------------------------------------------------------------
// Age of Wonders — Three.js Scene Manager (enhanced visuals)
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

export class AoWSceneManager {
  renderer!: THREE.WebGLRenderer;
  scene!: THREE.Scene;
  camera!: THREE.PerspectiveCamera;
  canvas!: HTMLCanvasElement;

  // Post-processing
  private _composer!: EffectComposer;
  private _bloomPass!: UnrealBloomPass;
  private _vignettePass!: ShaderPass;

  // Lighting
  private _sunLight!: THREE.DirectionalLight;
  private _ambientLight!: THREE.AmbientLight;
  private _hemiLight!: THREE.HemisphereLight;
  private _rimLight!: THREE.DirectionalLight;

  // Day/night cycle
  private _timeOfDay = 0.3; // 0=midnight, 0.25=sunrise, 0.5=noon, 0.75=sunset
  private _daySpeed = 0.008; // full cycle ~125 seconds
  private _skyMat!: THREE.ShaderMaterial;

  // Camera controls
  private _cameraTarget = new THREE.Vector3(0, 0, 0);
  private _cameraTargetSmooth = new THREE.Vector3(0, 0, 0);
  private _cameraAngle = Math.PI / 4;
  private _cameraDistance = 15;
  private _cameraDistanceSmooth = 15;
  private _cameraRotation = 0;
  private _cameraRotationSmooth = 0;
  private _cameraMinDist = 6;
  private _cameraMaxDist = 40;

  // Screen shake
  private _shakeIntensity = 0;
  private _shakeDuration = 0;
  private _shakeTimer = 0;

  private _width = 0;
  private _height = 0;
  private _resizeHandler: (() => void) | null = null;

  // Raycaster for hex picking
  raycaster = new THREE.Raycaster();
  private _mouse = new THREE.Vector2();

  // Groups for organization
  terrainGroup = new THREE.Group();
  unitGroup = new THREE.Group();
  fxGroup = new THREE.Group();
  uiGroup = new THREE.Group();

  init(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;

    // Create canvas
    this.canvas = document.createElement("canvas");
    this.canvas.id = "aow-canvas";
    this.canvas.style.position = "absolute";
    this.canvas.style.top = "0";
    this.canvas.style.left = "0";
    this.canvas.style.width = "100%";
    this.canvas.style.height = "100%";
    this.canvas.style.zIndex = "10";

    const container = document.getElementById("pixi-container");
    if (container) container.appendChild(this.canvas);

    // Renderer
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
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.2;

    // Scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.012);

    // Camera
    this.camera = new THREE.PerspectiveCamera(50, this._width / this._height, 0.1, 200);
    this._cameraTargetSmooth.copy(this._cameraTarget);
    this._cameraDistanceSmooth = this._cameraDistance;
    this._cameraRotationSmooth = this._cameraRotation;
    this._updateCameraPosition();

    // Lighting
    this._ambientLight = new THREE.AmbientLight(0x506080, 0.5);
    this.scene.add(this._ambientLight);

    this._hemiLight = new THREE.HemisphereLight(0x8899cc, 0x443322, 0.5);
    this.scene.add(this._hemiLight);

    this._sunLight = new THREE.DirectionalLight(0xffeedd, 1.2);
    this._sunLight.position.set(20, 30, 10);
    this._sunLight.castShadow = true;
    this._sunLight.shadow.mapSize.width = 2048;
    this._sunLight.shadow.mapSize.height = 2048;
    this._sunLight.shadow.camera.near = 0.5;
    this._sunLight.shadow.camera.far = 80;
    this._sunLight.shadow.camera.left = -30;
    this._sunLight.shadow.camera.right = 30;
    this._sunLight.shadow.camera.top = 30;
    this._sunLight.shadow.camera.bottom = -30;
    this._sunLight.shadow.bias = -0.001;
    this.scene.add(this._sunLight);

    // Rim/back light for unit silhouettes
    this._rimLight = new THREE.DirectionalLight(0x4466aa, 0.3);
    this._rimLight.position.set(-15, 10, -20);
    this.scene.add(this._rimLight);

    // Add groups
    this.scene.add(this.terrainGroup);
    this.scene.add(this.unitGroup);
    this.scene.add(this.fxGroup);
    this.scene.add(this.uiGroup);

    // Skybox
    this._createSkybox();

    // Post-processing
    this._composer = new EffectComposer(this.renderer);
    this._composer.addPass(new RenderPass(this.scene, this.camera));
    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this._width, this._height), 0.45, 0.5, 0.78,
    );
    this._composer.addPass(this._bloomPass);

    // Vignette pass
    this._vignettePass = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        darkness: { value: 1.3 },
        offset: { value: 1.1 },
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float darkness;
        uniform float offset;
        varying vec2 vUv;
        void main() {
          vec4 texel = texture2D(tDiffuse, vUv);
          vec2 uv = (vUv - 0.5) * 2.0;
          float vig = 1.0 - dot(uv, uv) * 0.15 * darkness;
          vig = clamp(vig, 0.0, 1.0);
          gl_FragColor = vec4(texel.rgb * vig, texel.a);
        }
      `,
    });
    this._composer.addPass(this._vignettePass);
    this._composer.addPass(new OutputPass());

    // Resize handler
    this._resizeHandler = () => this._onResize();
    window.addEventListener("resize", this._resizeHandler);
  }

  private _createSkybox(): void {
    const geo = new THREE.SphereGeometry(90, 32, 32);
    this._skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      uniforms: {
        topColor: { value: new THREE.Color(0x0a0a2e) },
        bottomColor: { value: new THREE.Color(0x1a1a3e) },
        horizonColor: { value: new THREE.Color(0x2a1a3e) },
        sunDirection: { value: new THREE.Vector3(0.3, 0.5, 0.2).normalize() },
        sunColor: { value: new THREE.Color(0xffeedd) },
        time: { value: 0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        varying vec3 vNormal;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform vec3 sunDirection;
        uniform vec3 sunColor;
        uniform float time;
        varying vec3 vWorldPos;

        // Hash-based noise for clouds
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
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y;

          // Base sky gradient
          vec3 col;
          if (h > 0.0) {
            col = mix(horizonColor, topColor, pow(h, 0.6));
          } else {
            col = mix(horizonColor, bottomColor, pow(-h, 0.6));
          }

          // Sun glow
          float sunDot = max(dot(dir, sunDirection), 0.0);
          col += sunColor * pow(sunDot, 64.0) * 0.8;
          col += sunColor * pow(sunDot, 8.0) * 0.15;

          // Stars (only visible when sun is low)
          float starField = fract(sin(dot(floor(vWorldPos.xz * 2.0), vec2(12.9898, 78.233))) * 43758.5453);
          float starBrightness = step(0.997, starField) * smoothstep(0.05, 0.3, h);
          float nightFactor = 1.0 - smoothstep(-0.1, 0.3, sunDirection.y);
          col += vec3(0.9) * starBrightness * nightFactor;

          // Twinkling
          float twinkle = sin(time * 3.0 + starField * 100.0) * 0.5 + 0.5;
          col += vec3(0.3) * starBrightness * nightFactor * twinkle;

          // Cloud layer near horizon
          if (h > 0.02 && h < 0.4) {
            vec2 cloudUv = dir.xz / max(h, 0.01) * 0.3;
            float cloudDensity = fbm(cloudUv + vec2(time * 0.02, time * 0.01));
            cloudDensity = smoothstep(0.35, 0.65, cloudDensity);
            float cloudFade = smoothstep(0.02, 0.08, h) * smoothstep(0.4, 0.2, h);
            vec3 cloudCol = mix(horizonColor * 1.2, sunColor * 0.4, pow(sunDot, 4.0));
            col = mix(col, cloudCol, cloudDensity * cloudFade * 0.5);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    });
    const sky = new THREE.Mesh(geo, this._skyMat);
    this.scene.add(sky);
  }

  // ---------------------------------------------------------------------------
  // Day/night cycle
  // ---------------------------------------------------------------------------

  private _updateDayNightCycle(dt: number): void {
    this._timeOfDay = (this._timeOfDay + this._daySpeed * dt) % 1.0;

    // Sun angle: 0.5 = noon (overhead), 0/1 = midnight (below)
    const sunAngle = this._timeOfDay * Math.PI * 2 - Math.PI / 2;
    const sunY = Math.sin(sunAngle);
    const sunX = Math.cos(sunAngle) * 0.6;
    const sunZ = Math.cos(sunAngle) * 0.3;

    // Sun direction for sky shader
    const sunDir = new THREE.Vector3(sunX, Math.max(sunY, -0.2), sunZ).normalize();
    this._skyMat.uniforms.sunDirection.value.copy(sunDir);
    this._skyMat.uniforms.time.value += dt;

    // Sun position follows camera but tracks the sky angle
    const isDaytime = sunY > -0.1;
    const dayFactor = Math.max(0, Math.min(1, (sunY + 0.1) / 0.6));

    // Directional light intensity based on sun height
    this._sunLight.intensity = isDaytime ? 0.4 + dayFactor * 1.0 : 0.15;

    // Sun color: warm at horizon, white at noon
    const sunColorDay = new THREE.Color(0xffffff);
    const sunColorDawn = new THREE.Color(0xff8844);
    const sunColorNight = new THREE.Color(0x334466);
    if (isDaytime) {
      const warmth = 1 - Math.min(1, sunY * 2);
      this._sunLight.color.copy(sunColorDay).lerp(sunColorDawn, warmth * 0.6);
    } else {
      this._sunLight.color.copy(sunColorNight);
    }

    // Sun world position relative to camera
    this._sunLight.position.set(
      this._cameraTargetSmooth.x + sunDir.x * 30,
      sunDir.y * 30 + 10,
      this._cameraTargetSmooth.z + sunDir.z * 30,
    );
    this._sunLight.target.position.copy(this._cameraTargetSmooth);
    this._sunLight.target.updateMatrixWorld();

    // Ambient light: brighter during day, bluish at night
    const ambientDay = new THREE.Color(0x607090);
    const ambientNight = new THREE.Color(0x1a1a40);
    this._ambientLight.color.copy(ambientDay).lerp(ambientNight, 1 - dayFactor);
    this._ambientLight.intensity = 0.3 + dayFactor * 0.4;

    // Hemisphere light
    const hemiSkyDay = new THREE.Color(0x8899cc);
    const hemiSkyNight = new THREE.Color(0x1a1a3a);
    this._hemiLight.color.copy(hemiSkyDay).lerp(hemiSkyNight, 1 - dayFactor);
    this._hemiLight.intensity = 0.3 + dayFactor * 0.3;

    // Skybox colors
    const topDay = new THREE.Color(0x1a3a6e);
    const topNight = new THREE.Color(0x060818);
    const horizonDay = new THREE.Color(0x6688bb);
    const horizonNight = new THREE.Color(0x1a1028);
    const horizonDawn = new THREE.Color(0x884433);

    this._skyMat.uniforms.topColor.value.copy(topDay).lerp(topNight, 1 - dayFactor);

    // Horizon gets warm at dawn/dusk
    const dawnFactor = Math.max(0, 1 - Math.abs(sunY) * 5) * (isDaytime ? 1 : 0.5);
    const baseHorizon = new THREE.Color().copy(horizonDay).lerp(horizonNight, 1 - dayFactor);
    this._skyMat.uniforms.horizonColor.value.copy(baseHorizon).lerp(horizonDawn, dawnFactor);
    this._skyMat.uniforms.sunColor.value.copy(this._sunLight.color);

    // Fog color matches sky
    const fogDay = new THREE.Color(0x3a4a6a);
    const fogNight = new THREE.Color(0x0a0a1e);
    (this.scene.fog as THREE.FogExp2).color.copy(fogDay).lerp(fogNight, 1 - dayFactor);
    (this.scene.background as THREE.Color).copy(fogDay).lerp(fogNight, 1 - dayFactor);

    // Tone mapping exposure
    this.renderer.toneMappingExposure = 0.8 + dayFactor * 0.5;
  }

  // ---------------------------------------------------------------------------
  // Screen shake
  // ---------------------------------------------------------------------------

  triggerShake(intensity: number = 0.15, duration: number = 0.3): void {
    this._shakeIntensity = intensity;
    this._shakeDuration = duration;
    this._shakeTimer = duration;
  }

  // ---------------------------------------------------------------------------
  // Camera controls
  // ---------------------------------------------------------------------------

  private _updateCameraPosition(): void {
    // Smooth interpolation
    this._cameraTargetSmooth.lerp(this._cameraTarget, 0.12);
    this._cameraDistanceSmooth += (this._cameraDistance - this._cameraDistanceSmooth) * 0.12;
    this._cameraRotationSmooth += (this._cameraRotation - this._cameraRotationSmooth) * 0.12;

    // Dynamic angle: steeper when closer
    const zoomFactor = (this._cameraDistanceSmooth - this._cameraMinDist) / (this._cameraMaxDist - this._cameraMinDist);
    const dynamicAngle = this._cameraAngle + (1 - zoomFactor) * 0.15;

    const x = this._cameraTargetSmooth.x + this._cameraDistanceSmooth * Math.sin(this._cameraRotationSmooth) * Math.cos(dynamicAngle);
    const y = this._cameraTargetSmooth.y + this._cameraDistanceSmooth * Math.sin(dynamicAngle);
    const z = this._cameraTargetSmooth.z + this._cameraDistanceSmooth * Math.cos(this._cameraRotationSmooth) * Math.cos(dynamicAngle);

    this.camera.position.set(x, y, z);

    // Screen shake offset
    if (this._shakeTimer > 0) {
      const shakePower = this._shakeIntensity * (this._shakeTimer / this._shakeDuration);
      this.camera.position.x += (Math.random() - 0.5) * shakePower;
      this.camera.position.y += (Math.random() - 0.5) * shakePower * 0.5;
      this.camera.position.z += (Math.random() - 0.5) * shakePower;
    }

    this.camera.lookAt(this._cameraTargetSmooth);

    // Update shadow camera bounds based on zoom
    if (this._sunLight) {
      const shadowRange = 15 + this._cameraDistanceSmooth * 0.8;
      this._sunLight.shadow.camera.left = -shadowRange;
      this._sunLight.shadow.camera.right = shadowRange;
      this._sunLight.shadow.camera.top = shadowRange;
      this._sunLight.shadow.camera.bottom = -shadowRange;
      this._sunLight.shadow.camera.updateProjectionMatrix();
    }
  }

  panCamera(dx: number, dz: number): void {
    const cos = Math.cos(this._cameraRotation);
    const sin = Math.sin(this._cameraRotation);
    this._cameraTarget.x += dx * cos - dz * sin;
    this._cameraTarget.z += dx * sin + dz * cos;
  }

  zoomCamera(delta: number): void {
    this._cameraDistance = Math.max(
      this._cameraMinDist,
      Math.min(this._cameraMaxDist, this._cameraDistance + delta),
    );
  }

  rotateCamera(delta: number): void {
    this._cameraRotation += delta;
  }

  setCameraTarget(x: number, y: number, z: number): void {
    this._cameraTarget.set(x, y, z);
  }

  /** Get world position from mouse screen coords */
  screenToWorld(screenX: number, screenY: number): THREE.Vector3 | null {
    this._mouse.x = (screenX / this._width) * 2 - 1;
    this._mouse.y = -(screenY / this._height) * 2 + 1;
    this.raycaster.setFromCamera(this._mouse, this.camera);

    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersection = new THREE.Vector3();
    if (this.raycaster.ray.intersectPlane(plane, intersection)) {
      return intersection;
    }
    return null;
  }

  // ---------------------------------------------------------------------------
  // Tick & Render
  // ---------------------------------------------------------------------------

  tick(dt: number): void {
    this._updateDayNightCycle(dt);
    this._updateCameraPosition();

    // Screen shake timer
    if (this._shakeTimer > 0) {
      this._shakeTimer -= dt;
      if (this._shakeTimer < 0) this._shakeTimer = 0;
    }
  }

  render(): void {
    this._composer.render();
  }

  // Save/restore camera for battle animation
  private _savedCameraTarget = new THREE.Vector3();
  private _savedCameraDistance = 15;
  private _savedCameraRotation = 0;

  setHexGroupVisible(visible: boolean): void {
    this.terrainGroup.visible = visible;
    if (!visible) {
      this._savedCameraTarget.copy(this._cameraTarget);
      this._savedCameraDistance = this._cameraDistance;
      this._savedCameraRotation = this._cameraRotation;
    }
  }

  restoreCamera(): void {
    this._cameraTarget.copy(this._savedCameraTarget);
    this._cameraTargetSmooth.copy(this._savedCameraTarget);
    this._cameraDistance = this._savedCameraDistance;
    this._cameraDistanceSmooth = this._savedCameraDistance;
    this._cameraRotation = this._savedCameraRotation;
    this._cameraRotationSmooth = this._savedCameraRotation;
  }

  // ---------------------------------------------------------------------------
  // Resize & Cleanup
  // ---------------------------------------------------------------------------

  private _onResize(): void {
    this._width = window.innerWidth;
    this._height = window.innerHeight;
    this.camera.aspect = this._width / this._height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(this._width, this._height);
    this._composer.setSize(this._width, this._height);
  }

  destroy(): void {
    if (this._resizeHandler) {
      window.removeEventListener("resize", this._resizeHandler);
      this._resizeHandler = null;
    }
    this.scene.clear();
    this.renderer.dispose();
    if (this.canvas.parentElement) {
      this.canvas.parentElement.removeChild(this.canvas);
    }
  }
}
