// ---------------------------------------------------------------------------
// Camelot Craft – Dynamic skybox with day/night cycle, volumetric clouds,
// improved sky shader with Mie scattering / horizon haze, and god rays
// ---------------------------------------------------------------------------

import * as THREE from "three";
import {
  getSunAngle,
  getSunlight,
  getSkyColor,
  getFogColor,
} from "../systems/CraftDayNightSystem";

// ---------------------------------------------------------------------------
// GLSL helpers (shared inline noise used by clouds)
// ---------------------------------------------------------------------------

const NOISE_GLSL = /* glsl */ `
  // --- value noise (hash-based, no textures) ---
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f); // smoothstep interp

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // 3-octave fBm
  float fbm(vec2 p) {
    float v  = 0.0;
    float a  = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 3; i++) {
      v += a * valueNoise(p);
      p  = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }
`;

// ---------------------------------------------------------------------------
// Sky dome shaders (improved: 3-band gradient, horizon haze, Mie, god rays)
// ---------------------------------------------------------------------------

const SKY_VERT = /* glsl */ `
  varying vec3 vWorldPos;
  void main() {
    vWorldPos = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */ `
  uniform vec3 uTopColor;      // zenith
  uniform vec3 uMidColor;      // mid-sky
  uniform vec3 uBottomColor;   // horizon / fog
  uniform vec3 uSunDir;
  uniform vec3 uSunColor;
  uniform float uSunlight;     // 0..1  (day brightness)

  varying vec3 vWorldPos;

  void main() {
    float h = vWorldPos.y * 0.5 + 0.5;   // 0 = nadir, 1 = zenith

    // --- 3-band gradient: horizon -> mid -> zenith ---
    vec3 sky;
    if (h < 0.35) {
      sky = mix(uBottomColor, uMidColor, smoothstep(0.0, 0.35, h));
    } else {
      sky = mix(uMidColor, uTopColor, smoothstep(0.35, 0.75, h));
    }

    // --- horizon haze (warm orange/pink at dawn / dusk) ---
    float horizonBand = 1.0 - smoothstep(0.0, 0.18, abs(vWorldPos.y));
    // Haze is strongest when the sun is near the horizon
    float sunHorizonFactor = 1.0 - abs(uSunDir.y);          // 1 at horizon, 0 at zenith
    vec3 hazeColor = mix(vec3(1.0, 0.55, 0.3), vec3(1.0, 0.4, 0.6), sunHorizonFactor);
    sky = mix(sky, hazeColor, horizonBand * sunHorizonFactor * 0.45);

    // --- simple Mie-like scattering: brighter near sun, redder at low angles ---
    float sunDot = max(dot(vWorldPos, uSunDir), 0.0);
    float mieStrong = pow(sunDot, 64.0) * 0.85;             // tight core
    float mieWide   = pow(sunDot, 8.0)  * 0.20;             // wide halo
    vec3  mieColor  = mix(uSunColor, vec3(1.0, 0.4, 0.15), sunHorizonFactor * 0.6);
    sky += mieColor * (mieStrong + mieWide);

    // --- god rays (radial streaks near horizon sun) ---
    float rays = pow(max(dot(vWorldPos, uSunDir), 0.0), 32.0) * 0.3;
    // Only visible when sun is near horizon (dawn/dusk)
    float rayVisibility = smoothstep(0.0, 0.35, sunHorizonFactor) * smoothstep(0.0, 0.1, uSunDir.y);
    sky += uSunColor * rays * rayVisibility;

    gl_FragColor = vec4(sky, 1.0);
  }
`;

// ---------------------------------------------------------------------------
// Cloud plane shaders
// ---------------------------------------------------------------------------

const CLOUD_VERT = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorldPosition;

  void main() {
    vUv = uv;
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPos;
  }
`;

const CLOUD_FRAG = /* glsl */ `
  uniform float uTime;
  uniform float uCloudScale;
  uniform float uCloudCover;
  uniform vec2  uCloudSpeed;
  uniform vec3  uSunDir;
  uniform vec3  uCloudColor;

  varying vec2 vUv;
  varying vec3 vWorldPosition;

  ${NOISE_GLSL}

  void main() {
    // Sample cloud density with layered noise
    vec2 st = vUv * uCloudScale + uTime * uCloudSpeed;

    float n1 = fbm(st);
    float n2 = fbm(st * 2.1 + vec2(5.2, 1.3));
    float n3 = fbm(st * 4.3 + vec2(8.7, 3.1));

    float density = n1 * 0.625 + n2 * 0.25 + n3 * 0.125;

    // Apply cloud cover threshold (higher uCloudCover -> more clouds)
    density = smoothstep(1.0 - uCloudCover, 1.0 - uCloudCover + 0.35, density);

    if (density < 0.01) discard;

    // --- Lighting: brighter top, darker underside ---
    // Use a secondary noise layer offset to fake vertical thickness shading
    float shadowNoise = fbm(st * 1.5 + vec2(3.0, 7.0));
    float topLight    = 1.0;
    float botShadow   = 0.55 + 0.25 * shadowNoise;    // darker underside

    // Simple sun-side brightening
    float sunFactor = max(dot(normalize(uSunDir), vec3(0.0, 1.0, 0.0)), 0.0);
    float lighting  = mix(botShadow, topLight, sunFactor);

    vec3 col = uCloudColor * lighting;

    // Edge fade using density as alpha
    float alpha = smoothstep(0.0, 0.4, density) * 0.92;

    // Fade clouds near the plane edges to avoid hard cutoff
    float edgeFade = 1.0 - smoothstep(0.35, 0.5, length(vUv - 0.5));
    alpha *= edgeFade;

    gl_FragColor = vec4(col, alpha);
  }
`;

// ---------------------------------------------------------------------------
// CraftSkybox class
// ---------------------------------------------------------------------------

export class CraftSkybox {
  readonly group = new THREE.Group();

  /* existing elements */
  private _skyMesh!: THREE.Mesh;
  private _sunMesh!: THREE.Mesh;
  private _moonMesh!: THREE.Mesh;
  private _starField!: THREE.Points;
  private _skyMaterial!: THREE.ShaderMaterial;

  /* new: volumetric cloud layer */
  private _cloudMesh!: THREE.Mesh;
  private _cloudMaterial!: THREE.ShaderMaterial;

  /* directional light reference (optional, for cloud shadow) */
  private _directionalLight: THREE.DirectionalLight | null = null;
  private _baseLightIntensity = 1.0;

  /* base colors (biome) */
  private _baseSkyColor = 0x87ceeb;
  private _baseFogColor = 0xc8d8e8;

  /** Optionally hand in the scene's directional light so clouds can dim it. */
  setDirectionalLight(light: THREE.DirectionalLight): void {
    this._directionalLight = light;
    this._baseLightIntensity = light.intensity;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------
  build(): void {
    this._buildSkyDome();
    this._buildSun();
    this._buildMoon();
    this._buildStars();
    this._buildCloudLayer();
  }

  // ---- sky dome ----------------------------------------------------------

  private _buildSkyDome(): void {
    const skyGeo = new THREE.SphereGeometry(400, 32, 16);
    this._skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        uTopColor: { value: new THREE.Color(0x4488cc) },   // deeper zenith
        uMidColor: { value: new THREE.Color(0x87ceeb) },   // mid sky
        uBottomColor: { value: new THREE.Color(0xe8d8c8) }, // horizon
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uSunColor: { value: new THREE.Color(0xffdd88) },
        uSunlight: { value: 1.0 },
      },
      vertexShader: SKY_VERT,
      fragmentShader: SKY_FRAG,
    });
    this._skyMesh = new THREE.Mesh(skyGeo, this._skyMaterial);
    this.group.add(this._skyMesh);
  }

  // ---- sun ---------------------------------------------------------------

  private _buildSun(): void {
    const sunGeo = new THREE.SphereGeometry(8, 16, 8);
    const sunMat = new THREE.MeshBasicMaterial({ color: 0xffdd44 });
    this._sunMesh = new THREE.Mesh(sunGeo, sunMat);
    this.group.add(this._sunMesh);
  }

  // ---- moon --------------------------------------------------------------

  private _buildMoon(): void {
    const moonGeo = new THREE.SphereGeometry(5, 16, 8);
    const moonMat = new THREE.MeshBasicMaterial({ color: 0xd0d8e8 });
    this._moonMesh = new THREE.Mesh(moonGeo, moonMat);
    this.group.add(this._moonMesh);
  }

  // ---- stars -------------------------------------------------------------

  private _buildStars(): void {
    const starCount = 500;
    const starPositions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(Math.random() * 2 - 1);
      const r = 350;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.abs(Math.cos(phi)); // upper hemisphere
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute(
      "position",
      new THREE.BufferAttribute(starPositions, 3),
    );
    const starMat = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 1.5,
      sizeAttenuation: true,
    });
    this._starField = new THREE.Points(starGeo, starMat);
    this.group.add(this._starField);
  }

  // ---- clouds ------------------------------------------------------------

  private _buildCloudLayer(): void {
    const cloudGeo = new THREE.PlaneGeometry(800, 800, 1, 1);
    this._cloudMaterial = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0.0 },
        uCloudScale: { value: 5.0 },
        uCloudCover: { value: 0.4 },
        uCloudSpeed: { value: new THREE.Vector2(0.015, 0.005) },
        uSunDir: { value: new THREE.Vector3(0, 1, 0) },
        uCloudColor: { value: new THREE.Color(0xffffff) },
      },
      vertexShader: CLOUD_VERT,
      fragmentShader: CLOUD_FRAG,
    });

    this._cloudMesh = new THREE.Mesh(cloudGeo, this._cloudMaterial);
    // Place plane at y=200, facing downward (rotate to be horizontal)
    this._cloudMesh.rotation.x = -Math.PI / 2;
    this._cloudMesh.position.set(0, 200, 0);
    this.group.add(this._cloudMesh);
  }

  // -----------------------------------------------------------------------
  // Update – call every frame
  // -----------------------------------------------------------------------
  update(timeOfDay: number, playerPos: THREE.Vector3): void {
    // Move skybox with player so it always surrounds them
    this.group.position.set(playerPos.x, 0, playerPos.z);

    const sunAngle = getSunAngle(timeOfDay);
    const sunlight = getSunlight(timeOfDay);

    // ---- Sun position ----
    const sunDist = 300;
    const sunX = Math.cos(sunAngle) * sunDist;
    const sunY = Math.sin(sunAngle) * sunDist;
    this._sunMesh.position.set(sunX, sunY, 0);
    this._sunMesh.visible = sunY > -20;

    // ---- Moon (opposite of sun) ----
    this._moonMesh.position.set(-sunX, -sunY, 0);
    this._moonMesh.visible = -sunY > -20;

    // ---- Stars visible at night ----
    const starOpacity = Math.max(0, 1 - sunlight * 2);
    (this._starField.material as THREE.PointsMaterial).opacity = starOpacity;
    (this._starField.material as THREE.PointsMaterial).transparent = true;
    this._starField.visible = starOpacity > 0.01;

    // ---- Sky colors ----
    const topColorHex = getSkyColor(timeOfDay, this._baseSkyColor);
    const bottomColorHex = getFogColor(timeOfDay, this._baseFogColor);

    const topCol = new THREE.Color(topColorHex);
    const botCol = new THREE.Color(bottomColorHex);
    const midCol = topCol.clone().lerp(botCol, 0.3);
    const zenithCol = topCol.clone().multiplyScalar(0.75);

    this._skyMaterial.uniforms.uTopColor.value.copy(zenithCol);
    this._skyMaterial.uniforms.uMidColor.value.copy(midCol);
    this._skyMaterial.uniforms.uMidColor.value.copy(topCol);
    this._skyMaterial.uniforms.uBottomColor.value.copy(botCol);
    this._skyMaterial.uniforms.uSunlight.value = sunlight;

    // ---- Sun direction for glow / scattering ----
    const sunDir = new THREE.Vector3(sunX, sunY, 0).normalize();
    this._skyMaterial.uniforms.uSunDir.value.copy(sunDir);

    // Sun colour shifts orange at horizon
    const horizonFactor = 1 - Math.abs(sunY) / sunDist;
    const sunColor = new THREE.Color(0xffdd44).lerp(
      new THREE.Color(0xff6600),
      horizonFactor * 0.6,
    );
    this._skyMaterial.uniforms.uSunColor.value.copy(sunColor);

    // ---- Cloud layer ----
    this._cloudMaterial.uniforms.uTime.value += 0.016; // ~60fps tick
    this._cloudMaterial.uniforms.uSunDir.value.copy(sunDir);

    // Tint cloud colour by sunlight: white during day, blue-grey at night
    const cloudCol = new THREE.Color(0xffffff).lerp(
      new THREE.Color(0x667788),
      1 - sunlight,
    );
    this._cloudMaterial.uniforms.uCloudColor.value.copy(cloudCol);

    // Fade clouds at night (reduce alpha by lowering cover)
    // Keep user-set cover during day, fade to half at night
    const effectiveCover =
      this._cloudMaterial.uniforms.uCloudCover.value * (0.5 + 0.5 * sunlight);
    this._cloudMaterial.uniforms.uCloudCover.value = effectiveCover;
    // (restore base next frame via setWeather or external control)

    // ---- Cloud shadow on directional light ----
    if (this._directionalLight) {
      const cover = this._cloudMaterial.uniforms.uCloudCover.value;
      // Dim the directional light proportionally to cloud cover
      const shadowDim = 1.0 - cover * 0.25; // up to 25 % dimmer
      this._directionalLight.intensity =
        this._baseLightIntensity * shadowDim * sunlight;
    }
  }

  // -----------------------------------------------------------------------
  // Weather control
  // -----------------------------------------------------------------------

  /** Set cloud cover (0 = clear, 1 = overcast). */
  setCloudCover(cover: number): void {
    this._cloudMaterial.uniforms.uCloudCover.value = Math.max(
      0,
      Math.min(1, cover),
    );
  }

  /** Set wind direction / speed for cloud drift. */
  setWindSpeed(x: number, y: number): void {
    this._cloudMaterial.uniforms.uCloudSpeed.value.set(x, y);
  }

  // -----------------------------------------------------------------------
  // Biome colours
  // -----------------------------------------------------------------------

  /** Set base colours from the current biome. */
  setBiomeColors(skyColor: number, fogColor: number): void {
    this._baseSkyColor = skyColor;
    this._baseFogColor = fogColor;
  }

  // -----------------------------------------------------------------------
  // Cleanup
  // -----------------------------------------------------------------------

  destroy(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
      if (child instanceof THREE.Points) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    });
  }
}
