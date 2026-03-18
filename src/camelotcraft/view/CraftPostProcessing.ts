// ---------------------------------------------------------------------------
// Camelot Craft – Post-Processing Pipeline
// ---------------------------------------------------------------------------
// Implements SSAO, Bloom, Tone Mapping / Color Grading, and optional DOF
// using custom shader passes with THREE.WebGLRenderTarget and fullscreen quads.
// ---------------------------------------------------------------------------

import * as THREE from "three";

// ---------------------------------------------------------------------------
// Shader sources
// ---------------------------------------------------------------------------

/** Vertex shader shared by all fullscreen passes. */
const FULLSCREEN_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

// ---- Depth ----------------------------------------------------------------

const DEPTH_PACK_FRAG = /* glsl */ `
uniform float uNear;
uniform float uFar;
varying vec2 vUv;

float linearizeDepth(float d) {
  return (2.0 * uNear) / (uFar + uNear - d * (uFar - uNear));
}

void main() {
  float d = linearizeDepth(gl_FragCoord.z);
  gl_FragColor = vec4(vec3(d), 1.0);
}
`;

// ---- SSAO -----------------------------------------------------------------

const SSAO_FRAG = /* glsl */ `
uniform sampler2D uDepthTex;
uniform vec2 uResolution;
uniform float uRadius;
uniform float uIntensity;

varying vec2 vUv;

// Simple pseudo-random from UV
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  float depth = texture2D(uDepthTex, vUv).r;

  // Skip sky / very far pixels
  if (depth > 0.999) {
    gl_FragColor = vec4(1.0);
    return;
  }

  float occlusion = 0.0;
  float texelW = 1.0 / uResolution.x;
  float texelH = 1.0 / uResolution.y;

  // 8 hemisphere samples in screen-space
  const int SAMPLES = 8;
  vec2 offsets[8];
  offsets[0] = vec2( 1.0,  0.0);
  offsets[1] = vec2(-1.0,  0.0);
  offsets[2] = vec2( 0.0,  1.0);
  offsets[3] = vec2( 0.0, -1.0);
  offsets[4] = vec2( 0.707,  0.707);
  offsets[5] = vec2(-0.707,  0.707);
  offsets[6] = vec2( 0.707, -0.707);
  offsets[7] = vec2(-0.707, -0.707);

  for (int i = 0; i < SAMPLES; i++) {
    float r = rand(vUv * float(i + 1)) * 0.5 + 0.5;
    vec2 sampleUv = vUv + offsets[i] * uRadius * r * vec2(texelW, texelH);
    sampleUv = clamp(sampleUv, 0.0, 1.0);
    float sampleDepth = texture2D(uDepthTex, sampleUv).r;
    float diff = depth - sampleDepth;
    // Only occlude when sample is in front and within a reasonable range
    if (diff > 0.0001 && diff < 0.05) {
      occlusion += 1.0;
    }
  }

  occlusion = 1.0 - (occlusion / float(SAMPLES)) * uIntensity;
  gl_FragColor = vec4(vec3(occlusion), 1.0);
}
`;

// ---- SSAO Blur ------------------------------------------------------------

const AO_BLUR_FRAG = /* glsl */ `
uniform sampler2D uAOTex;
uniform vec2 uResolution;
varying vec2 vUv;

void main() {
  float texelW = 1.0 / uResolution.x;
  float texelH = 1.0 / uResolution.y;

  float sum = 0.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec2 offset = vec2(float(x) * texelW, float(y) * texelH);
      sum += texture2D(uAOTex, vUv + offset).r;
    }
  }
  sum /= 9.0;
  gl_FragColor = vec4(vec3(sum), 1.0);
}
`;

// ---- SSAO Composite (multiply AO into scene) -----------------------------

const AO_COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D uSceneTex;
uniform sampler2D uAOTex;
varying vec2 vUv;

void main() {
  vec3 scene = texture2D(uSceneTex, vUv).rgb;
  float ao = texture2D(uAOTex, vUv).r;
  gl_FragColor = vec4(scene * ao, 1.0);
}
`;

// ---- Bloom: Bright-pass ---------------------------------------------------

const BRIGHT_PASS_FRAG = /* glsl */ `
uniform sampler2D uSceneTex;
uniform float uThreshold;
varying vec2 vUv;

void main() {
  vec3 c = texture2D(uSceneTex, vUv).rgb;
  float brightness = dot(c, vec3(0.2126, 0.7152, 0.0722));
  if (brightness > uThreshold) {
    gl_FragColor = vec4(c, 1.0);
  } else {
    gl_FragColor = vec4(0.0);
  }
}
`;

// ---- Bloom: Gaussian blur (direction uniform) -----------------------------

const GAUSSIAN_BLUR_FRAG = /* glsl */ `
uniform sampler2D uTex;
uniform vec2 uDirection; // (1/w, 0) or (0, 1/h)
varying vec2 vUv;

void main() {
  // 5-tap Gaussian kernel: weights sum to 1
  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.194594;
  weights[2] = 0.121621;
  weights[3] = 0.054054;
  weights[4] = 0.016216;

  vec3 result = texture2D(uTex, vUv).rgb * weights[0];
  for (int i = 1; i < 5; i++) {
    vec2 off = uDirection * float(i);
    result += texture2D(uTex, vUv + off).rgb * weights[i];
    result += texture2D(uTex, vUv - off).rgb * weights[i];
  }
  gl_FragColor = vec4(result, 1.0);
}
`;

// ---- Bloom: Additive composite -------------------------------------------

const BLOOM_COMPOSITE_FRAG = /* glsl */ `
uniform sampler2D uSceneTex;
uniform sampler2D uBloomTex;
uniform float uBloomIntensity;
varying vec2 vUv;

void main() {
  vec3 scene = texture2D(uSceneTex, vUv).rgb;
  vec3 bloom = texture2D(uBloomTex, vUv).rgb;
  gl_FragColor = vec4(scene + bloom * uBloomIntensity, 1.0);
}
`;

// ---- Tone mapping + Color grading -----------------------------------------

const TONEMAP_FRAG = /* glsl */ `
uniform sampler2D uSceneTex;
uniform float uTime;
uniform float uVignetteIntensity;
varying vec2 vUv;

// ACES filmic tone mapping (Narkowicz 2015 approximation)
vec3 acesFilm(vec3 x) {
  float a = 2.51;
  float b = 0.03;
  float c = 2.43;
  float d = 0.59;
  float e = 0.14;
  return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
}

// Pseudo-random for film grain
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec3 color = texture2D(uSceneTex, vUv).rgb;

  // ACES tone mapping
  color = acesFilm(color);

  // Vignette – darken edges
  vec2 center = vUv - 0.5;
  float dist = length(center);
  float vig = smoothstep(0.7, 0.4, dist);
  color *= mix(1.0, vig, uVignetteIntensity);

  // Subtle film grain
  float grain = rand(vUv + fract(uTime)) * 0.04 - 0.02;
  color += grain;

  // Gamma correction (linear -> sRGB)
  color = pow(clamp(color, 0.0, 1.0), vec3(1.0 / 2.2));

  gl_FragColor = vec4(color, 1.0);
}
`;

// ---- Depth of Field -------------------------------------------------------

const DOF_FRAG = /* glsl */ `
uniform sampler2D uSceneTex;
uniform sampler2D uDepthTex;
uniform vec2 uResolution;
uniform float uFocusDistance;  // linear depth of focus plane (0..1)
uniform float uFocusRange;    // range around focus that stays sharp

varying vec2 vUv;

void main() {
  float depth = texture2D(uDepthTex, vUv).r;
  float diff = abs(depth - uFocusDistance);
  float coc = smoothstep(0.0, uFocusRange, diff); // circle of confusion 0..1

  if (coc < 0.01) {
    gl_FragColor = texture2D(uSceneTex, vUv);
    return;
  }

  // Variable-radius disc blur based on CoC
  float texelW = 1.0 / uResolution.x;
  float texelH = 1.0 / uResolution.y;
  float maxRadius = 5.0;
  float radius = coc * maxRadius;

  vec3 sum = vec3(0.0);
  float total = 0.0;

  for (int x = -5; x <= 5; x++) {
    for (int y = -5; y <= 5; y++) {
      float r = length(vec2(float(x), float(y)));
      if (r > radius) continue;
      vec2 offset = vec2(float(x) * texelW, float(y) * texelH);
      sum += texture2D(uSceneTex, vUv + offset).rgb;
      total += 1.0;
    }
  }

  gl_FragColor = vec4(sum / max(total, 1.0), 1.0);
}
`;

// ---- Simple copy (blit) ---------------------------------------------------

const COPY_FRAG = /* glsl */ `
uniform sampler2D uTex;
varying vec2 vUv;
void main() {
  gl_FragColor = texture2D(uTex, vUv);
}
`;

// ---------------------------------------------------------------------------
// Helper: create a ShaderMaterial for a fullscreen pass
// ---------------------------------------------------------------------------

function makePassMaterial(
  fragmentShader: string,
  uniforms: Record<string, THREE.IUniform>,
): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: FULLSCREEN_VERT,
    fragmentShader,
    uniforms,
    depthTest: false,
    depthWrite: false,
  });
}

// ---------------------------------------------------------------------------
// CraftPostProcessing
// ---------------------------------------------------------------------------

export class CraftPostProcessing {
  // Core rendering objects
  private _renderer: THREE.WebGLRenderer;
  private _fsScene: THREE.Scene;
  private _fsCamera: THREE.OrthographicCamera;
  private _fsQuad: THREE.Mesh;

  // Render targets (ping-pong pair + specialised)
  private _rtScene: THREE.WebGLRenderTarget;
  private _rtDepth: THREE.WebGLRenderTarget;
  private _rtPingA: THREE.WebGLRenderTarget;
  private _rtPingB: THREE.WebGLRenderTarget;
  private _rtBloomHalf: THREE.WebGLRenderTarget; // half-res for bloom

  // Depth capture
  private _depthMaterial: THREE.ShaderMaterial;

  // Pass materials
  private _ssaoMat: THREE.ShaderMaterial;
  private _aoBlurMat: THREE.ShaderMaterial;
  private _aoCompositeMat: THREE.ShaderMaterial;
  private _brightPassMat: THREE.ShaderMaterial;
  private _blurMat: THREE.ShaderMaterial;
  private _bloomCompositeMat: THREE.ShaderMaterial;
  private _tonemapMat: THREE.ShaderMaterial;
  private _dofMat: THREE.ShaderMaterial;
  private _copyMat: THREE.ShaderMaterial;

  // Tunables
  private _bloomIntensity = 0.35;
  private _ssaoIntensity = 0.6;
  private _vignetteIntensity = 0.4;
  private _dofEnabled = false;
  private _time = 0;

  // Dimensions
  private _width: number;
  private _height: number;

  // -----------------------------------------------------------------------
  constructor(renderer: THREE.WebGLRenderer, width: number, height: number) {
    this._renderer = renderer;
    this._width = width;
    this._height = height;

    // Fullscreen quad scene --------------------------------------------------
    this._fsCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this._fsScene = new THREE.Scene();

    const quadGeo = new THREE.PlaneGeometry(2, 2);
    // Temporary material; swapped per pass
    this._fsQuad = new THREE.Mesh(quadGeo, new THREE.MeshBasicMaterial());
    this._fsScene.add(this._fsQuad);

    // Render targets ---------------------------------------------------------
    this._rtScene = this._createRT(width, height);
    this._rtDepth = this._createRT(width, height);
    this._rtPingA = this._createRT(width, height);
    this._rtPingB = this._createRT(width, height);
    this._rtBloomHalf = this._createRT(
      Math.max(1, Math.floor(width / 2)),
      Math.max(1, Math.floor(height / 2)),
    );

    // Depth material (override) ----------------------------------------------
    this._depthMaterial = makePassMaterial(DEPTH_PACK_FRAG, {
      uNear: { value: 0.1 },
      uFar: { value: 500.0 },
    });

    // SSAO -------------------------------------------------------------------
    this._ssaoMat = makePassMaterial(SSAO_FRAG, {
      uDepthTex: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uRadius: { value: 16.0 },
      uIntensity: { value: this._ssaoIntensity },
    });

    this._aoBlurMat = makePassMaterial(AO_BLUR_FRAG, {
      uAOTex: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
    });

    this._aoCompositeMat = makePassMaterial(AO_COMPOSITE_FRAG, {
      uSceneTex: { value: null },
      uAOTex: { value: null },
    });

    // Bloom ------------------------------------------------------------------
    this._brightPassMat = makePassMaterial(BRIGHT_PASS_FRAG, {
      uSceneTex: { value: null },
      uThreshold: { value: 0.8 },
    });

    this._blurMat = makePassMaterial(GAUSSIAN_BLUR_FRAG, {
      uTex: { value: null },
      uDirection: { value: new THREE.Vector2() },
    });

    this._bloomCompositeMat = makePassMaterial(BLOOM_COMPOSITE_FRAG, {
      uSceneTex: { value: null },
      uBloomTex: { value: null },
      uBloomIntensity: { value: this._bloomIntensity },
    });

    // Tone mapping -----------------------------------------------------------
    this._tonemapMat = makePassMaterial(TONEMAP_FRAG, {
      uSceneTex: { value: null },
      uTime: { value: 0 },
      uVignetteIntensity: { value: this._vignetteIntensity },
    });

    // DOF --------------------------------------------------------------------
    this._dofMat = makePassMaterial(DOF_FRAG, {
      uSceneTex: { value: null },
      uDepthTex: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uFocusDistance: { value: 0.05 },
      uFocusRange: { value: 0.1 },
    });

    // Copy (blit) ------------------------------------------------------------
    this._copyMat = makePassMaterial(COPY_FRAG, {
      uTex: { value: null },
    });
  }

  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Full post-processing pipeline. Call this instead of `renderer.render()`.
   */
  render(scene: THREE.Scene, camera: THREE.Camera, dt: number): void {
    this._time += dt;
    const renderer = this._renderer;

    // 1. Render scene color to _rtScene
    renderer.setRenderTarget(this._rtScene);
    renderer.clear();
    renderer.render(scene, camera);

    // 2. Render linear depth to _rtDepth
    const prevOverride = scene.overrideMaterial;
    scene.overrideMaterial = this._depthMaterial;
    if ((camera as THREE.PerspectiveCamera).near !== undefined) {
      this._depthMaterial.uniforms.uNear.value = (camera as THREE.PerspectiveCamera).near;
      this._depthMaterial.uniforms.uFar.value = (camera as THREE.PerspectiveCamera).far;
    }
    renderer.setRenderTarget(this._rtDepth);
    renderer.clear();
    renderer.render(scene, camera);
    scene.overrideMaterial = prevOverride;

    // Current "result" texture starts as the scene render
    let currentRT = this._rtScene;

    // ----- Pass 1: SSAO ----------------------------------------------------
    if (this._ssaoIntensity > 0) {
      // Compute raw AO -> _rtPingA
      this._ssaoMat.uniforms.uDepthTex.value = this._rtDepth.texture;
      this._ssaoMat.uniforms.uIntensity.value = this._ssaoIntensity;
      this._renderPass(this._ssaoMat, this._rtPingA);

      // Blur AO -> _rtPingB
      this._aoBlurMat.uniforms.uAOTex.value = this._rtPingA.texture;
      this._renderPass(this._aoBlurMat, this._rtPingB);

      // Composite AO * scene -> _rtPingA
      this._aoCompositeMat.uniforms.uSceneTex.value = currentRT.texture;
      this._aoCompositeMat.uniforms.uAOTex.value = this._rtPingB.texture;
      this._renderPass(this._aoCompositeMat, this._rtPingA);

      currentRT = this._rtPingA;
    }

    // ----- Pass 2: Bloom ---------------------------------------------------
    if (this._bloomIntensity > 0) {
      const halfW = Math.max(1, Math.floor(this._width / 2));
      const halfH = Math.max(1, Math.floor(this._height / 2));

      // Bright pass -> _rtBloomHalf (half-res)
      this._brightPassMat.uniforms.uSceneTex.value = currentRT.texture;
      this._renderPass(this._brightPassMat, this._rtBloomHalf);

      // Horizontal blur -> _rtPingB (reuse at half-res viewport)
      this._blurMat.uniforms.uTex.value = this._rtBloomHalf.texture;
      this._blurMat.uniforms.uDirection.value.set(1.0 / halfW, 0.0);
      this._renderPass(this._blurMat, this._rtPingB);

      // Vertical blur -> _rtBloomHalf
      this._blurMat.uniforms.uTex.value = this._rtPingB.texture;
      this._blurMat.uniforms.uDirection.value.set(0.0, 1.0 / halfH);
      this._renderPass(this._blurMat, this._rtBloomHalf);

      // Composite bloom + scene -> _rtPingB
      this._bloomCompositeMat.uniforms.uSceneTex.value = currentRT.texture;
      this._bloomCompositeMat.uniforms.uBloomTex.value = this._rtBloomHalf.texture;
      this._bloomCompositeMat.uniforms.uBloomIntensity.value = this._bloomIntensity;

      // Write to a target that is NOT currentRT
      const compositeTarget = currentRT === this._rtPingA ? this._rtPingB : this._rtPingA;
      this._renderPass(this._bloomCompositeMat, compositeTarget);
      currentRT = compositeTarget;
    }

    // ----- Pass 3: Tone mapping + Color grading ----------------------------
    {
      this._tonemapMat.uniforms.uSceneTex.value = currentRT.texture;
      this._tonemapMat.uniforms.uTime.value = this._time;
      this._tonemapMat.uniforms.uVignetteIntensity.value = this._vignetteIntensity;

      const tmTarget = currentRT === this._rtPingA ? this._rtPingB : this._rtPingA;
      this._renderPass(this._tonemapMat, tmTarget);
      currentRT = tmTarget;
    }

    // ----- Pass 4: DOF (optional) ------------------------------------------
    if (this._dofEnabled) {
      this._dofMat.uniforms.uSceneTex.value = currentRT.texture;
      this._dofMat.uniforms.uDepthTex.value = this._rtDepth.texture;

      const dofTarget = currentRT === this._rtPingA ? this._rtPingB : this._rtPingA;
      this._renderPass(this._dofMat, dofTarget);
      currentRT = dofTarget;
    }

    // ----- Final blit to screen --------------------------------------------
    this._copyMat.uniforms.uTex.value = currentRT.texture;
    this._renderPass(this._copyMat, null); // null = default framebuffer
  }

  /** Recreate render targets after a viewport resize. */
  resize(width: number, height: number): void {
    this._width = width;
    this._height = height;

    this._rtScene.setSize(width, height);
    this._rtDepth.setSize(width, height);
    this._rtPingA.setSize(width, height);
    this._rtPingB.setSize(width, height);
    this._rtBloomHalf.setSize(
      Math.max(1, Math.floor(width / 2)),
      Math.max(1, Math.floor(height / 2)),
    );

    const res = new THREE.Vector2(width, height);
    this._ssaoMat.uniforms.uResolution.value.copy(res);
    this._aoBlurMat.uniforms.uResolution.value.copy(res);
    this._dofMat.uniforms.uResolution.value.copy(res);
  }

  setBloomIntensity(v: number): void {
    this._bloomIntensity = Math.max(0, Math.min(1, v));
  }

  setSSAOIntensity(v: number): void {
    this._ssaoIntensity = Math.max(0, Math.min(1, v));
  }

  setDOFEnabled(enabled: boolean): void {
    this._dofEnabled = enabled;
  }

  setVignetteIntensity(v: number): void {
    this._vignetteIntensity = Math.max(0, Math.min(1, v));
  }

  /** Dispose all GPU resources. */
  destroy(): void {
    this._rtScene.dispose();
    this._rtDepth.dispose();
    this._rtPingA.dispose();
    this._rtPingB.dispose();
    this._rtBloomHalf.dispose();

    this._depthMaterial.dispose();
    this._ssaoMat.dispose();
    this._aoBlurMat.dispose();
    this._aoCompositeMat.dispose();
    this._brightPassMat.dispose();
    this._blurMat.dispose();
    this._bloomCompositeMat.dispose();
    this._tonemapMat.dispose();
    this._dofMat.dispose();
    this._copyMat.dispose();

    (this._fsQuad.geometry as THREE.BufferGeometry).dispose();
  }

  // -----------------------------------------------------------------------
  // Internals
  // -----------------------------------------------------------------------

  /** Create a standard RGBA render target. */
  private _createRT(w: number, h: number): THREE.WebGLRenderTarget {
    return new THREE.WebGLRenderTarget(w, h, {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.UnsignedByteType,
    });
  }

  /**
   * Render a fullscreen pass with the given material to the specified target
   * (or to the screen if target is null).
   */
  private _renderPass(
    material: THREE.ShaderMaterial,
    target: THREE.WebGLRenderTarget | null,
  ): void {
    this._fsQuad.material = material;
    this._renderer.setRenderTarget(target);
    this._renderer.clear();
    this._renderer.render(this._fsScene, this._fsCamera);
  }
}
