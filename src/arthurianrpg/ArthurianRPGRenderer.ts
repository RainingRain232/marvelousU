// ============================================================================
// ArthurianRPGRenderer.ts – 3D Skyrim-style medieval world renderer
// Three.js-based with post-processing, day/night cycle, skeletal characters
// ============================================================================

import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";

import type { ArthurianRPGState, CombatantState, Vec3 } from "./ArthurianRPGState";
import { ElementalType } from "./ArthurianRPGConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TERRAIN_SIZE = 512;
const TERRAIN_SEGMENTS = 256;
const WATER_LEVEL = 1.5;
const SKY_RADIUS = 1000;
const MAX_PARTICLES = 8000;
const TORCH_FLICKER_SPEED = 8;
const GOD_RAY_SAMPLES = 60;

// ---------------------------------------------------------------------------
// Color grading + vignette shader
// ---------------------------------------------------------------------------

const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    warmth: { value: 0.15 },
    vignetteStrength: { value: 0.55 },
    timeOfDay: { value: 0.5 },
    filmGrain: { value: 0.03 },
    chromaticAberration: { value: 0.002 },
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
    uniform float warmth;
    uniform float vignetteStrength;
    uniform float timeOfDay;
    uniform float filmGrain;
    uniform float chromaticAberration;
    varying vec2 vUv;

    // Film grain noise
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    // Filmic tonemapping (ACES approximation)
    vec3 acesFilm(vec3 x) {
      float a = 2.51;
      float b = 0.03;
      float c = 2.43;
      float d = 0.59;
      float e = 0.14;
      return clamp((x * (a * x + b)) / (x * (c * x + d) + e), 0.0, 1.0);
    }

    void main() {
      // Chromatic aberration at edges for cinematic lens feel
      vec2 center = vUv - 0.5;
      float edgeDist = length(center);
      float caAmount = chromaticAberration * edgeDist;
      vec4 col;
      col.r = texture2D(tDiffuse, vUv + center * caAmount).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv - center * caAmount).b;
      col.a = 1.0;

      // Dynamic warmth based on time of day
      float dayFactor = smoothstep(0.2, 0.35, timeOfDay) - smoothstep(0.7, 0.85, timeOfDay);
      float sunsetFactor = smoothstep(0.2, 0.3, timeOfDay) * (1.0 - smoothstep(0.3, 0.4, timeOfDay))
                         + smoothstep(0.65, 0.75, timeOfDay) * (1.0 - smoothstep(0.75, 0.85, timeOfDay));
      float dynamicWarmth = warmth * (1.0 + sunsetFactor * 2.0);

      // Warm medieval tones with time-adaptive color shift
      col.r += dynamicWarmth * 0.5;
      col.g += dynamicWarmth * 0.25;
      col.b -= dynamicWarmth * 0.12;

      // Night: cool blue shift
      float nightFactor = 1.0 - dayFactor;
      col.r -= nightFactor * 0.04;
      col.b += nightFactor * 0.06;

      // S-curve contrast enhancement (more cinematic)
      col.rgb = (col.rgb - 0.5) * 1.12 + 0.5;

      // Subtle color split: lift shadows warm, push highlights cool
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      vec3 shadows = vec3(0.05, 0.03, 0.0); // warm shadow tint
      vec3 highlights = vec3(-0.01, 0.0, 0.03); // cool highlight tint
      col.rgb += mix(shadows, highlights, smoothstep(0.0, 1.0, lum));

      // Cinematic desaturation with luma-aware preservation
      col.rgb = mix(vec3(lum), col.rgb, 0.88 + dayFactor * 0.07);

      // Vignette (multi-layered for more natural falloff)
      float dist = length(center);
      float vignette = 1.0 - vignetteStrength * smoothstep(0.2, 0.95, dist);
      vignette *= 1.0 - 0.15 * smoothstep(0.5, 1.0, dist * dist); // extra soft outer ring
      col.rgb *= vignette;

      // Film grain for analog texture
      float grain = (hash(vUv * 1000.0 + fract(timeOfDay * 100.0)) - 0.5) * filmGrain;
      col.rgb += grain;

      // Final clamp
      col.rgb = clamp(col.rgb, 0.0, 1.0);

      gl_FragColor = col;
    }
  `,
};

// ---------------------------------------------------------------------------
// God rays (light scattering) shader
// ---------------------------------------------------------------------------

const GodRaysShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    lightPosition: { value: new THREE.Vector2(0.5, 0.5) },
    exposure: { value: 0.3 },
    decay: { value: 0.96 },
    density: { value: 0.8 },
    weight: { value: 0.4 },
    samples: { value: GOD_RAY_SAMPLES },
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
    uniform vec2 lightPosition;
    uniform float exposure;
    uniform float decay;
    uniform float density;
    uniform float weight;
    uniform int samples;
    varying vec2 vUv;
    void main() {
      vec2 texCoord = vUv;
      vec2 deltaTextCoord = (texCoord - lightPosition) * density / float(samples);
      vec4 color = texture2D(tDiffuse, texCoord);
      float illuminationDecay = 1.0;
      vec4 godRayColor = vec4(0.0);
      for (int i = 0; i < 60; i++) {
        texCoord -= deltaTextCoord;
        vec4 sampleColor = texture2D(tDiffuse, texCoord);
        sampleColor *= illuminationDecay * weight;
        godRayColor += sampleColor;
        illuminationDecay *= decay;
      }
      gl_FragColor = color + godRayColor * exposure;
    }
  `,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function v3(x: number, y: number, z: number): THREE.Vector3 {
  return new THREE.Vector3(x, y, z);
}

function stateToV3(p: Vec3): THREE.Vector3 {
  return new THREE.Vector3(p.x, p.y, p.z);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.min(Math.max(t, 0), 1);
}

function seededRandom(seed: number): number {
  let h = (seed * 374761393 + 668265263) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Camera modes
// ---------------------------------------------------------------------------

enum CameraMode {
  ThirdPerson,
  FirstPerson,
}

// ---------------------------------------------------------------------------
// Character class visual presets
// ---------------------------------------------------------------------------

interface ClassAppearance {
  bodyColor: number;
  accentColor: number;
  helmShape: "round" | "pointed" | "flat" | "none";
  hasStaff: boolean;
  hasBow: boolean;
  hasDaggers: boolean;
  capeColor: number | null;
}

const CLASS_LOOKS: Record<string, ClassAppearance> = {
  knight: {
    bodyColor: 0x888888, accentColor: 0xcccccc, helmShape: "round",
    hasStaff: false, hasBow: false, hasDaggers: false, capeColor: 0x2244aa,
  },
  mage: {
    bodyColor: 0x3322aa, accentColor: 0x8866ff, helmShape: "pointed",
    hasStaff: true, hasBow: false, hasDaggers: false, capeColor: 0x221166,
  },
  ranger: {
    bodyColor: 0x556633, accentColor: 0x887744, helmShape: "none",
    hasStaff: false, hasBow: true, hasDaggers: false, capeColor: 0x445522,
  },
  rogue: {
    bodyColor: 0x222222, accentColor: 0x333333, helmShape: "flat",
    hasStaff: false, hasBow: false, hasDaggers: true, capeColor: null,
  },
  paladin: {
    bodyColor: 0xccaa33, accentColor: 0xffdd55, helmShape: "round",
    hasStaff: false, hasBow: false, hasDaggers: false, capeColor: 0xeedd88,
  },
  druid: {
    bodyColor: 0x336622, accentColor: 0x55aa44, helmShape: "none",
    hasStaff: true, hasBow: false, hasDaggers: false, capeColor: 0x224411,
  },
};

// ---------------------------------------------------------------------------
// Enemy visual presets
// ---------------------------------------------------------------------------

interface EnemyAppearance {
  bodyColor: number;
  accentColor: number;
  scale: number;
  shape: "humanoid" | "quadruped" | "large" | "arachnid" | "spectral" | "beast" | "armored" | "boss_humanoid";
  eyeColor: number;
  hasWeapon?: "sword" | "axe" | "bow" | "staff" | "dual" | "claws" | "none";
  hasShield?: boolean;
  hasHelm?: boolean;
  hasCape?: boolean;
  glowColor?: number;
}

const ENEMY_LOOKS: Record<string, EnemyAppearance> = {
  bandit:          { bodyColor: 0x665544, accentColor: 0x8a7055, scale: 1.0, shape: "humanoid", eyeColor: 0xdeb887, hasWeapon: "sword", hasCape: true },
  bandit_archer:   { bodyColor: 0x5a4a3a, accentColor: 0x7a6a50, scale: 1.0, shape: "humanoid", eyeColor: 0xdeb887, hasWeapon: "bow", hasCape: true },
  wolf:            { bodyColor: 0x555560, accentColor: 0x444450, scale: 0.75, shape: "quadruped", eyeColor: 0xddff44 },
  bear:            { bodyColor: 0x4a3020, accentColor: 0x3a2010, scale: 1.4, shape: "beast", eyeColor: 0x885522 },
  boar:            { bodyColor: 0x6b5040, accentColor: 0x5a4030, scale: 0.7, shape: "quadruped", eyeColor: 0x664422 },
  saxon:           { bodyColor: 0x556644, accentColor: 0x888877, scale: 1.05, shape: "humanoid", eyeColor: 0xccbb88, hasWeapon: "axe", hasHelm: true, hasShield: true },
  saxon_archer:    { bodyColor: 0x556644, accentColor: 0x777766, scale: 1.0, shape: "humanoid", eyeColor: 0xccbb88, hasWeapon: "bow" },
  saxon_champion:  { bodyColor: 0x445533, accentColor: 0xaaaa88, scale: 1.25, shape: "armored", eyeColor: 0xeedd99, hasWeapon: "axe", hasHelm: true, hasShield: true, hasCape: true },
  skeleton:        { bodyColor: 0xddddaa, accentColor: 0xccccaa, scale: 1.0, shape: "humanoid", eyeColor: 0x44ffff, glowColor: 0x224444 },
  blackknight:     { bodyColor: 0x111115, accentColor: 0x333340, scale: 1.25, shape: "armored", eyeColor: 0xff2200, hasWeapon: "sword", hasShield: true, hasHelm: true, hasCape: true, glowColor: 0x440000 },
  spider:          { bodyColor: 0x2a1a0a, accentColor: 0x442211, scale: 1.5, shape: "arachnid", eyeColor: 0xff0000, glowColor: 0x220000 },
  troll:           { bodyColor: 0x447744, accentColor: 0x335533, scale: 2.0, shape: "beast", eyeColor: 0x88ff44 },
  enchanted_armor: { bodyColor: 0x4455aa, accentColor: 0x6688cc, scale: 1.3, shape: "armored", eyeColor: 0x44ccff, hasWeapon: "sword", hasShield: true, hasHelm: true, glowColor: 0x2244aa },
  wraith:          { bodyColor: 0x334455, accentColor: 0x223344, scale: 1.1, shape: "spectral", eyeColor: 0x88ccff, glowColor: 0x224488 },
  fae_knight:      { bodyColor: 0x88aacc, accentColor: 0xaaccee, scale: 1.15, shape: "armored", eyeColor: 0x88ddff, hasWeapon: "sword", hasShield: true, hasCape: true, glowColor: 0x4488cc },
  dragon_whelp:    { bodyColor: 0x884422, accentColor: 0xcc6633, scale: 2.5, shape: "large", eyeColor: 0xff6600, glowColor: 0x882200 },
  dragon:          { bodyColor: 0x882222, accentColor: 0xcc4444, scale: 4.0, shape: "large", eyeColor: 0xff4400, glowColor: 0x660000 },
  giant:           { bodyColor: 0x887766, accentColor: 0x665544, scale: 3.5, shape: "beast", eyeColor: 0xffcc66 },
  mordred:         { bodyColor: 0x1a1a22, accentColor: 0x442244, scale: 1.3, shape: "boss_humanoid", eyeColor: 0xff0044, hasWeapon: "sword", hasCape: true, hasHelm: true, glowColor: 0x660022 },
  morgan:          { bodyColor: 0x220033, accentColor: 0x6622aa, scale: 1.15, shape: "boss_humanoid", eyeColor: 0xcc44ff, hasWeapon: "staff", hasCape: true, glowColor: 0x440088 },
  green_knight:    { bodyColor: 0x225522, accentColor: 0x44aa44, scale: 1.5, shape: "boss_humanoid", eyeColor: 0x44ff88, hasWeapon: "axe", hasHelm: true, hasCape: true, glowColor: 0x226622 },
};

// ---------------------------------------------------------------------------
// Skeleton builder – Tekken-quality skeletal hierarchy
// ---------------------------------------------------------------------------

function buildHumanoidSkeleton(): THREE.Skeleton {
  const bones: THREE.Bone[] = [];
  const create = (name: string, parent: THREE.Bone | null, pos: THREE.Vector3): THREE.Bone => {
    const b = new THREE.Bone();
    b.name = name;
    b.position.copy(pos);
    if (parent) parent.add(b);
    bones.push(b);
    return b;
  };

  const hips = create("Hips", null, v3(0, 0.95, 0));
  const spine = create("Spine", hips, v3(0, 0.15, 0));
  const chest = create("Chest", spine, v3(0, 0.2, 0));
  const neck = create("Neck", chest, v3(0, 0.18, 0));
  create("Head", neck, v3(0, 0.12, 0));

  // left arm
  const lShoulder = create("L_Shoulder", chest, v3(-0.2, 0.15, 0));
  const lUpperArm = create("L_UpperArm", lShoulder, v3(-0.12, 0, 0));
  const lForearm = create("L_Forearm", lUpperArm, v3(-0.18, 0, 0));
  create("L_Hand", lForearm, v3(-0.15, 0, 0));

  // right arm
  const rShoulder = create("R_Shoulder", chest, v3(0.2, 0.15, 0));
  const rUpperArm = create("R_UpperArm", rShoulder, v3(0.12, 0, 0));
  const rForearm = create("R_Forearm", rUpperArm, v3(0.18, 0, 0));
  create("R_Hand", rForearm, v3(0.15, 0, 0));

  // left leg
  const lUpperLeg = create("L_UpperLeg", hips, v3(-0.1, -0.05, 0));
  const lLowerLeg = create("L_LowerLeg", lUpperLeg, v3(0, -0.28, 0));
  create("L_Foot", lLowerLeg, v3(0, -0.28, 0.05));

  // right leg
  const rUpperLeg = create("R_UpperLeg", hips, v3(0.1, -0.05, 0));
  const rLowerLeg = create("R_LowerLeg", rUpperLeg, v3(0, -0.28, 0));
  create("R_Foot", rLowerLeg, v3(0, -0.28, 0.05));

  return new THREE.Skeleton(bones);
}

// ---------------------------------------------------------------------------
// Procedural animation keyframes
// ---------------------------------------------------------------------------

interface AnimState {
  phase: number;
  action: "idle" | "walk" | "run" | "attack" | "cast" | "dodge" | "death" | "block" | "hit";
  blendFactor: number;
  /** Previous action for crossfade blending */
  prevAction: "idle" | "walk" | "run" | "attack" | "cast" | "dodge" | "death" | "block" | "hit";
  /** Blend transition timer (0 = fully transitioned, > 0 = blending from prevAction) */
  blendTimer: number;
  /** Movement speed scalar (used to sync walk/run cycle to actual velocity) */
  moveSpeed: number;
}

// ---------------------------------------------------------------------------
// Animation blending crossfade duration
// ---------------------------------------------------------------------------

const ANIM_BLEND_DURATION = 0.2; // 0.2s crossfade between states

// ---------------------------------------------------------------------------
// LOD animation thresholds
// ---------------------------------------------------------------------------

const LOD_FULL_SKELETAL = 20;       // < 20m: full skeletal animation
const LOD_SIMPLIFIED = 50;          // 20-50m: simplified (fewer bones)
// > 50m: static pose (AnimLOD.Static) – no animation applied

enum AnimLOD {
  Full,
  Simplified,
  Static,
}

function getAnimLOD(distanceToCamera: number): AnimLOD {
  if (distanceToCamera < LOD_FULL_SKELETAL) return AnimLOD.Full;
  if (distanceToCamera < LOD_SIMPLIFIED) return AnimLOD.Simplified;
  return AnimLOD.Static;
}

/**
 * Transition animation state. Call this when the desired action changes.
 * Handles crossfade blending setup.
 */
function transitionAnimState(
  anim: AnimState,
  newAction: AnimState["action"],
): void {
  if (anim.action === newAction) return;
  anim.prevAction = anim.action;
  anim.action = newAction;
  anim.blendTimer = ANIM_BLEND_DURATION;
  // Reset phase for one-shot animations
  if (newAction === "attack" || newAction === "hit" || newAction === "death") {
    anim.phase = 0;
  }
}

/**
 * Store bone rotations/positions as a snapshot for blending.
 */
interface BonePose {
  posY: number;
  rotX: number;
  rotY: number;
  rotZ: number;
}

function captureBonePose(bone: THREE.Bone | undefined): BonePose {
  if (!bone) return { posY: 0, rotX: 0, rotY: 0, rotZ: 0 };
  return {
    posY: bone.position.y,
    rotX: bone.rotation.x,
    rotY: bone.rotation.y,
    rotZ: bone.rotation.z,
  };
}

function applyBonePoseBlend(
  bone: THREE.Bone | undefined,
  poseA: BonePose,
  poseB: BonePose,
  t: number,
): void {
  if (!bone) return;
  bone.position.y = poseA.posY + (poseB.posY - poseA.posY) * t;
  bone.rotation.x = poseA.rotX + (poseB.rotX - poseA.rotX) * t;
  bone.rotation.y = poseA.rotY + (poseB.rotY - poseA.rotY) * t;
  bone.rotation.z = poseA.rotZ + (poseB.rotZ - poseA.rotZ) * t;
}

/**
 * Apply a single animation pose to the skeleton for the given action.
 * Separated from blending logic so it can be called for both current and previous action.
 */
function applyPoseForAction(
  boneMap: Map<string, THREE.Bone>,
  action: AnimState["action"],
  phase: number,
  moveSpeed: number,
  _lod: AnimLOD,
): void {
  const hips = boneMap.get("Hips");
  const spine = boneMap.get("Spine");
  const chest = boneMap.get("Chest");
  const head = boneMap.get("Head");
  const lUpperArm = boneMap.get("L_UpperArm");
  const rUpperArm = boneMap.get("R_UpperArm");
  const lForearm = boneMap.get("L_Forearm");
  const rForearm = boneMap.get("R_Forearm");
  const lUpperLeg = boneMap.get("L_UpperLeg");
  const rUpperLeg = boneMap.get("R_UpperLeg");
  const lLowerLeg = boneMap.get("L_LowerLeg");
  const rLowerLeg = boneMap.get("R_LowerLeg");
  const lFoot = boneMap.get("L_Foot");
  const rFoot = boneMap.get("R_Foot");

  const p = phase;

  switch (action) {
    case "idle": {
      // Subtle breathing cycle + gentle sway
      const breathe = Math.sin(p * 1.5) * 0.015;
      const sway = Math.sin(p * 0.5) * 0.01;
      if (spine) spine.rotation.x = breathe;
      if (chest) chest.rotation.x = breathe * 0.5;
      if (head) head.rotation.x = Math.sin(p * 0.7) * 0.008;
      if (lUpperArm) lUpperArm.rotation.z = -0.08 + Math.sin(p * 0.8) * 0.02;
      if (rUpperArm) rUpperArm.rotation.z = 0.08 - Math.sin(p * 0.8) * 0.02;
      if (lForearm) lForearm.rotation.x = -0.05 + Math.sin(p * 0.6) * 0.01;
      if (rForearm) rForearm.rotation.x = -0.05 - Math.sin(p * 0.6) * 0.01;
      // Weight shift side to side
      if (hips) {
        hips.position.y = 0.95;
        hips.rotation.z = sway;
        hips.rotation.x = 0;
        hips.rotation.y = 0;
      }
      // Legs at rest with micro-adjustment
      if (lUpperLeg) lUpperLeg.rotation.x = Math.sin(p * 0.3) * 0.005;
      if (rUpperLeg) rUpperLeg.rotation.x = -Math.sin(p * 0.3) * 0.005;
      if (lLowerLeg) lLowerLeg.rotation.x = 0;
      if (rLowerLeg) rLowerLeg.rotation.x = 0;
      break;
    }
    case "walk": {
      // Leg/arm swing synced to movement speed
      const speedFactor = Math.max(0.5, Math.min(2, moveSpeed / 4));
      const cycleRate = 4 * speedFactor;
      const stride = 0.4;
      const legSwing = Math.sin(p * cycleRate) * stride;
      const armSwing = Math.sin(p * cycleRate) * stride * 0.5;
      if (lUpperLeg) lUpperLeg.rotation.x = legSwing;
      if (rUpperLeg) rUpperLeg.rotation.x = -legSwing;
      if (lLowerLeg) lLowerLeg.rotation.x = Math.max(0, -legSwing) * 0.6;
      if (rLowerLeg) rLowerLeg.rotation.x = Math.max(0, legSwing) * 0.6;
      // Foot roll
      if (lFoot) lFoot.rotation.x = Math.sin(p * cycleRate + 0.5) * 0.1;
      if (rFoot) rFoot.rotation.x = Math.sin(p * cycleRate + 0.5 + Math.PI) * 0.1;
      if (lUpperArm) lUpperArm.rotation.x = -armSwing;
      if (rUpperArm) rUpperArm.rotation.x = armSwing;
      if (hips) {
        hips.position.y = 0.95 + Math.abs(Math.sin(p * cycleRate)) * 0.03;
        hips.rotation.y = Math.sin(p * cycleRate) * 0.03;
        hips.rotation.x = 0;
        hips.rotation.z = 0;
      }
      if (spine) spine.rotation.x = 0.03;
      if (chest) chest.rotation.x = 0;
      break;
    }
    case "run": {
      const stride = 0.65;
      const speed = 6;
      const legSwing = Math.sin(p * speed) * stride;
      if (lUpperLeg) lUpperLeg.rotation.x = legSwing;
      if (rUpperLeg) rUpperLeg.rotation.x = -legSwing;
      if (lLowerLeg) lLowerLeg.rotation.x = Math.max(0, -legSwing) * 0.8;
      if (rLowerLeg) rLowerLeg.rotation.x = Math.max(0, legSwing) * 0.8;
      if (lUpperArm) { lUpperArm.rotation.x = -legSwing * 0.7; lUpperArm.rotation.z = -0.3; }
      if (rUpperArm) { rUpperArm.rotation.x = legSwing * 0.7; rUpperArm.rotation.z = 0.3; }
      if (lForearm) lForearm.rotation.x = -0.8;
      if (rForearm) rForearm.rotation.x = -0.8;
      if (hips) {
        hips.position.y = 0.95 + Math.abs(Math.sin(p * speed)) * 0.06;
        hips.rotation.z = Math.sin(p * speed) * 0.04;
        hips.rotation.x = 0;
        hips.rotation.y = 0;
      }
      if (spine) spine.rotation.x = 0.12;
      break;
    }
    case "attack": {
      // Three-phase weapon swing: wind-up, strike, follow-through
      const t = (p % 1.0);
      const windUp = Math.min(t * 3, 1);                          // 0-0.33s
      const strike = Math.max(0, Math.min((t - 0.33) * 4, 1));    // 0.33-0.58s
      const followThrough = Math.max(0, Math.min((t - 0.58) * 3, 1)); // 0.58-0.91s
      if (rUpperArm) {
        rUpperArm.rotation.x = -1.8 * windUp + 2.5 * strike + 0.3 * followThrough;
        rUpperArm.rotation.z = 0.5 * windUp - 0.3 * strike - 0.1 * followThrough;
      }
      if (rForearm) rForearm.rotation.x = -0.5 * windUp + 0.2 * followThrough;
      if (spine) {
        spine.rotation.y = -0.3 * windUp + 0.5 * strike - 0.1 * followThrough;
        spine.rotation.x = -0.05 * windUp + 0.08 * strike;
      }
      if (chest) chest.rotation.y = -0.15 * windUp + 0.25 * strike - 0.05 * followThrough;
      if (hips) {
        hips.rotation.y = -0.1 * windUp + 0.15 * strike - 0.03 * followThrough;
        hips.position.y = 0.95 - 0.03 * strike;
      }
      // Lunge forward slightly
      if (lUpperLeg) lUpperLeg.rotation.x = 0.15 * strike;
      if (rUpperLeg) rUpperLeg.rotation.x = -0.1 * strike;
      break;
    }
    case "cast": {
      const t = (p % 2.0) / 2.0;
      const raise = Math.min(t * 2, 1);
      if (lUpperArm) { lUpperArm.rotation.x = -2.2 * raise; lUpperArm.rotation.z = -0.5 * raise; }
      if (rUpperArm) { rUpperArm.rotation.x = -2.2 * raise; rUpperArm.rotation.z = 0.5 * raise; }
      if (lForearm) lForearm.rotation.x = -0.3 * raise;
      if (rForearm) rForearm.rotation.x = -0.3 * raise;
      if (spine) spine.rotation.x = -0.1 * raise;
      if (head) head.rotation.x = -0.15 * raise;
      break;
    }
    case "dodge": {
      const t = (p % 0.6) / 0.6;
      if (hips) {
        hips.position.y = 0.95 - 0.3 * Math.sin(t * Math.PI);
        hips.rotation.x = 0.3 * Math.sin(t * Math.PI);
      }
      if (spine) spine.rotation.x = 0.4 * Math.sin(t * Math.PI);
      break;
    }
    case "block": {
      // Shield raise pose – defensive stance
      if (lUpperArm) { lUpperArm.rotation.x = -1.2; lUpperArm.rotation.z = 0.4; }
      if (lForearm) lForearm.rotation.x = -0.6;
      if (rUpperArm) { rUpperArm.rotation.x = -0.3; rUpperArm.rotation.z = 0.1; }
      if (spine) spine.rotation.x = -0.05;
      if (chest) chest.rotation.x = -0.03;
      if (hips) {
        hips.position.y = 0.9;
        hips.rotation.x = 0;
      }
      // Slightly bent knees
      if (lUpperLeg) lUpperLeg.rotation.x = 0.1;
      if (rUpperLeg) rUpperLeg.rotation.x = 0.1;
      if (lLowerLeg) lLowerLeg.rotation.x = -0.15;
      if (rLowerLeg) rLowerLeg.rotation.x = -0.15;
      break;
    }
    case "hit": {
      // Stagger animation with recovery
      const t = Math.min(p * 2, 1); // 0.5s total
      const stagger = t < 0.4 ? t / 0.4 : 1 - (t - 0.4) / 0.6; // quick stagger, slow recovery
      if (hips) {
        hips.position.y = 0.95 - 0.12 * stagger;
        hips.rotation.x = -0.15 * stagger;
      }
      if (spine) spine.rotation.x = -0.25 * stagger;
      if (chest) chest.rotation.x = -0.1 * stagger;
      if (head) head.rotation.x = 0.2 * stagger;
      // Arms fly back
      if (lUpperArm) lUpperArm.rotation.z = -0.5 * stagger;
      if (rUpperArm) rUpperArm.rotation.z = 0.5 * stagger;
      // Step back
      if (lUpperLeg) lUpperLeg.rotation.x = -0.2 * stagger;
      if (rUpperLeg) rUpperLeg.rotation.x = 0.15 * stagger;
      break;
    }
    case "death": {
      // Multi-phase collapse sequence
      const t = Math.min(p * 0.5, 1);
      const phase1 = Math.min(t * 2, 1); // knees buckle
      const phase2 = Math.max(0, Math.min((t - 0.3) * 2, 1)); // torso falls
      const phase3 = Math.max(0, Math.min((t - 0.6) * 2.5, 1)); // full collapse
      if (hips) {
        hips.position.y = 0.95 - 0.3 * phase1 - 0.4 * phase2 - 0.2 * phase3;
        hips.rotation.x = 0.4 * phase1 + 0.5 * phase2 + 0.3 * phase3;
        hips.rotation.z = 0.2 * phase3;
      }
      if (spine) spine.rotation.x = 0.2 * phase1 + 0.2 * phase2;
      if (chest) chest.rotation.x = 0.15 * phase2;
      if (head) head.rotation.x = 0.3 * phase2 + 0.2 * phase3;
      if (lUpperArm) lUpperArm.rotation.z = -0.5 * phase1 - 0.7 * phase3;
      if (rUpperArm) rUpperArm.rotation.z = 0.5 * phase1 + 0.7 * phase3;
      // Knees buckle
      if (lUpperLeg) lUpperLeg.rotation.x = 0.8 * phase1;
      if (rUpperLeg) rUpperLeg.rotation.x = 0.6 * phase1;
      if (lLowerLeg) lLowerLeg.rotation.x = -1.0 * phase1;
      if (rLowerLeg) rLowerLeg.rotation.x = -0.8 * phase1;
      break;
    }
  }
}

function applyProceduralAnimation(
  skeleton: THREE.Skeleton,
  anim: AnimState,
  dt: number,
  distanceToCamera: number = 0,
): void {
  const lod = getAnimLOD(distanceToCamera);

  // Static LOD: no animation at all
  if (lod === AnimLOD.Static) return;

  const bones = skeleton.bones;
  const boneMap = new Map<string, THREE.Bone>();
  for (const b of bones) boneMap.set(b.name, b);

  // Update blend timer
  if (anim.blendTimer > 0) {
    anim.blendTimer = Math.max(0, anim.blendTimer - dt);
  }

  const blendT = anim.blendTimer > 0
    ? 1 - (anim.blendTimer / ANIM_BLEND_DURATION)
    : 1;

  // If blending, we need to compute both poses and interpolate
  if (blendT < 1 && lod === AnimLOD.Full) {
    // Capture bone keys to blend
    const blendBones = ["Hips", "Spine", "Chest", "Head",
      "L_UpperArm", "R_UpperArm", "L_Forearm", "R_Forearm",
      "L_UpperLeg", "R_UpperLeg", "L_LowerLeg", "R_LowerLeg",
      "L_Foot", "R_Foot"];

    // Apply previous action pose
    applyPoseForAction(boneMap, anim.prevAction, anim.phase, anim.moveSpeed, lod);
    const prevPoses = new Map<string, BonePose>();
    for (const name of blendBones) {
      prevPoses.set(name, captureBonePose(boneMap.get(name)));
    }

    // Apply current action pose
    applyPoseForAction(boneMap, anim.action, anim.phase, anim.moveSpeed, lod);
    const currPoses = new Map<string, BonePose>();
    for (const name of blendBones) {
      currPoses.set(name, captureBonePose(boneMap.get(name)));
    }

    // Smoothstep for smoother crossfade
    const smoothT = blendT * blendT * (3 - 2 * blendT);

    // Blend between the two
    for (const name of blendBones) {
      const prev = prevPoses.get(name)!;
      const curr = currPoses.get(name)!;
      applyBonePoseBlend(boneMap.get(name), prev, curr, smoothT);
    }
  } else {
    // No blending needed or simplified LOD
    applyPoseForAction(boneMap, anim.action, anim.phase, anim.moveSpeed, lod);
  }
}

// ---------------------------------------------------------------------------
// Character mesh builder
// ---------------------------------------------------------------------------

function buildCharacterMesh(look: ClassAppearance, scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  const mat = (color: number, rough = 0.65, metal = 0.35) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      envMapIntensity: 0.6,
    });
  const armorMat = (color: number) =>
    new THREE.MeshStandardMaterial({
      color,
      roughness: 0.35,
      metalness: 0.7,
      envMapIntensity: 1.2,
    });
  const skinMat = () =>
    new THREE.MeshStandardMaterial({
      color: 0xddbb99,
      roughness: 0.85,
      metalness: 0.05,
    });

  // torso – higher poly for smoother look
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.2, 2, 2, 2), armorMat(look.bodyColor));
  torso.position.y = 1.3;
  torso.castShadow = true;
  torso.receiveShadow = true;
  group.add(torso);

  // chest detail plate (layered armor feel)
  const chestPlate = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.25, 0.04),
    armorMat(look.accentColor),
  );
  chestPlate.position.set(0, 1.35, 0.11);
  chestPlate.castShadow = true;
  group.add(chestPlate);

  // waist with belt
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.18, 2, 1, 2), mat(look.bodyColor));
  waist.position.y = 1.0;
  waist.castShadow = true;
  waist.receiveShadow = true;
  group.add(waist);
  const belt = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 0.04, 0.2),
    new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.8, metalness: 0.15 }),
  );
  belt.position.y = 1.07;
  group.add(belt);
  const buckle = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, 0.04, 0.03),
    new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.3, metalness: 0.85 }),
  );
  buckle.position.set(0, 1.07, 0.11);
  group.add(buckle);

  // head – higher poly sphere
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 16), skinMat());
  head.position.y = 1.7;
  head.castShadow = true;
  head.receiveShadow = true;
  group.add(head);

  // eyes with realistic shading
  const eyeWhiteMat = new THREE.MeshStandardMaterial({ color: 0xeeeedd, roughness: 0.5, metalness: 0.0 });
  const irisMat = new THREE.MeshStandardMaterial({ color: 0x334466, emissive: 0x112233, emissiveIntensity: 0.4, roughness: 0.3 });
  for (const side of [-1, 1]) {
    const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), eyeWhiteMat);
    eyeWhite.position.set(side * 0.035, 1.72, 0.08);
    group.add(eyeWhite);
    const iris = new THREE.Mesh(new THREE.SphereGeometry(0.01, 8, 8), irisMat);
    iris.position.set(side * 0.035, 1.72, 0.094);
    group.add(iris);
  }

  // helm – higher poly, metallic finish
  if (look.helmShape !== "none") {
    let helmGeo: THREE.BufferGeometry;
    if (look.helmShape === "round") helmGeo = new THREE.SphereGeometry(0.12, 16, 16);
    else if (look.helmShape === "pointed") helmGeo = new THREE.ConeGeometry(0.1, 0.2, 12);
    else helmGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 12);
    const helm = new THREE.Mesh(helmGeo, armorMat(look.accentColor));
    helm.position.y = look.helmShape === "pointed" ? 1.82 : 1.75;
    helm.castShadow = true;
    helm.receiveShadow = true;
    group.add(helm);
    // visor slit for round helms
    if (look.helmShape === "round") {
      const visor = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.015, 0.03),
        new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.2, metalness: 0.9 }),
      );
      visor.position.set(0, 1.74, 0.11);
      group.add(visor);
    }
  }

  // arms – higher poly with pauldrons
  for (const side of [-1, 1]) {
    // pauldron (shoulder armor)
    const pauldron = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 10, 10, 0, Math.PI * 2, 0, Math.PI / 2),
      armorMat(look.accentColor),
    );
    pauldron.position.set(side * 0.24, 1.48, 0);
    pauldron.castShadow = true;
    group.add(pauldron);

    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 10), mat(look.bodyColor));
    upper.position.set(side * 0.24, 1.35, 0);
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 10), armorMat(look.accentColor));
    lower.position.set(side * 0.24, 1.1, 0);
    lower.castShadow = true;
    lower.receiveShadow = true;
    group.add(lower);

    // hand with glove
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 10), skinMat());
    hand.position.set(side * 0.24, 0.97, 0);
    group.add(hand);
    // gauntlet cuff
    const cuff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.038, 0.04, 8),
      armorMat(look.accentColor),
    );
    cuff.position.set(side * 0.24, 0.99, 0);
    group.add(cuff);
  }

  // legs – higher poly with knee guards
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 10), mat(look.bodyColor));
    upper.position.set(side * 0.09, 0.78, 0);
    upper.castShadow = true;
    upper.receiveShadow = true;
    group.add(upper);

    // knee guard
    const kneeGuard = new THREE.Mesh(
      new THREE.SphereGeometry(0.035, 8, 8, 0, Math.PI * 2, 0, Math.PI / 2),
      armorMat(look.accentColor),
    );
    kneeGuard.position.set(side * 0.09, 0.65, 0.03);
    kneeGuard.rotation.x = -Math.PI / 4;
    group.add(kneeGuard);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 10), armorMat(look.accentColor));
    lower.position.set(side * 0.09, 0.5, 0);
    lower.castShadow = true;
    lower.receiveShadow = true;
    group.add(lower);

    // boot – more detailed with sole
    const boot = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.06, 0.14, 2, 1, 2),
      new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9, metalness: 0.05 }),
    );
    boot.position.set(side * 0.09, 0.33, 0.02);
    boot.castShadow = true;
    group.add(boot);
    // boot sole
    const sole = new THREE.Mesh(
      new THREE.BoxGeometry(0.085, 0.02, 0.15),
      new THREE.MeshStandardMaterial({ color: 0x221100, roughness: 0.95 }),
    );
    sole.position.set(side * 0.09, 0.29, 0.02);
    group.add(sole);
  }

  // weapon accessories
  if (look.hasStaff) {
    const staff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.015, 0.022, 1.4, 8),
      new THREE.MeshStandardMaterial({ color: 0x5a3818, roughness: 0.85, metalness: 0.05 }),
    );
    staff.position.set(0.3, 1.1, 0);
    staff.castShadow = true;
    group.add(staff);
    // staff head ornament
    const staffHead = new THREE.Mesh(
      new THREE.TorusGeometry(0.04, 0.008, 8, 12),
      new THREE.MeshStandardMaterial({ color: 0x886633, roughness: 0.4, metalness: 0.6 }),
    );
    staffHead.position.set(0.3, 1.8, 0);
    group.add(staffHead);
    // glowing orb with brighter emission
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 16, 16),
      new THREE.MeshStandardMaterial({
        color: 0x88aaff,
        emissive: 0x4466ff,
        emissiveIntensity: 1.8,
        transparent: true,
        opacity: 0.9,
        roughness: 0.1,
        metalness: 0.1,
      }),
    );
    orb.position.set(0.3, 1.82, 0);
    group.add(orb);
    // orb glow halo
    const halo = new THREE.Mesh(
      new THREE.SphereGeometry(0.08, 12, 12),
      new THREE.MeshBasicMaterial({
        color: 0x6688ff,
        transparent: true,
        opacity: 0.15,
        side: THREE.DoubleSide,
      }),
    );
    halo.position.set(0.3, 1.82, 0);
    group.add(halo);
  }
  if (look.hasBow) {
    const bowCurve = new THREE.TorusGeometry(0.3, 0.012, 6, 12, Math.PI);
    const bow = new THREE.Mesh(bowCurve, mat(0x664422));
    bow.position.set(-0.35, 1.3, -0.1);
    bow.rotation.z = Math.PI * 0.5;
    group.add(bow);
  }
  if (look.hasDaggers) {
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.2, 4), mat(0xaaaaaa));
      blade.position.set(side * 0.28, 0.9, 0.1);
      blade.rotation.x = Math.PI;
      group.add(blade);
    }
  }

  // cape – more detailed with cloth-like material
  if (look.capeColor !== null) {
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.32, 0.55, 6, 8),
      new THREE.MeshStandardMaterial({
        color: look.capeColor,
        side: THREE.DoubleSide,
        roughness: 0.9,
        metalness: 0.02,
      }),
    );
    cape.position.set(0, 1.2, -0.13);
    cape.castShadow = true;
    cape.receiveShadow = true;
    group.add(cape);
    // cape clasp
    const clasp = new THREE.Mesh(
      new THREE.SphereGeometry(0.02, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xccaa44, roughness: 0.25, metalness: 0.9 }),
    );
    clasp.position.set(0, 1.47, -0.1);
    group.add(clasp);
  }

  group.scale.setScalar(scale);
  return group;
}

// ---------------------------------------------------------------------------
// Enemy mesh builder
// ---------------------------------------------------------------------------

function buildEnemyMesh(look: EnemyAppearance): THREE.Group {
  const g = new THREE.Group();

  // --- PBR material helpers ---
  const mat = (c: number) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.7, metalness: 0.08, envMapIntensity: 0.6,
    sheen: 0.15, sheenRoughness: 0.6, sheenColor: new THREE.Color(c).offsetHSL(0, 0, 0.15),
  });
  const skinMat = (c: number) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.75, metalness: 0.0,
    sheen: 0.4, sheenRoughness: 0.4, sheenColor: new THREE.Color(c).offsetHSL(0, -0.1, 0.2),
    clearcoat: 0.05, clearcoatRoughness: 0.9,
  });
  const armorMat = (c: number) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.3, metalness: 0.7,
    clearcoat: 0.5, clearcoatRoughness: 0.2, reflectivity: 0.8,
  });
  const furMat = (c: number) => new THREE.MeshPhysicalMaterial({
    color: c, roughness: 0.85, metalness: 0.0,
    sheen: 0.8, sheenRoughness: 0.3, sheenColor: new THREE.Color(c).offsetHSL(0, 0, 0.25),
  });
  const eyeMat = new THREE.MeshPhysicalMaterial({
    color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 2.0,
    roughness: 0.05, clearcoat: 1.0, clearcoatRoughness: 0.0,
  });
  const glowMat = look.glowColor ? new THREE.MeshPhysicalMaterial({
    color: look.glowColor, emissive: look.glowColor, emissiveIntensity: 0.6,
    transparent: true, opacity: 0.25, transmission: 0.4,
  }) : null;

  // --- Weapon builder helper ---
  const addWeapon = (parent: THREE.Group, wx: number, wy: number) => {
    if (!look.hasWeapon || look.hasWeapon === "none" || look.hasWeapon === "claws") return;
    const metalMat = new THREE.MeshPhysicalMaterial({ color: 0xbbbbcc, metalness: 0.85, roughness: 0.12, clearcoat: 0.6 });
    const hiltMat = new THREE.MeshPhysicalMaterial({ color: 0x553322, roughness: 0.8 });
    if (look.hasWeapon === "sword") {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.4, 0.03), metalMat);
      blade.position.set(wx, wy + 0.2, 0);
      blade.castShadow = true;
      parent.add(blade);
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.02, 0.03), armorMat(look.accentColor));
      guard.position.set(wx, wy, 0);
      parent.add(guard);
      const hilt = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.014, 0.1, 6), hiltMat);
      hilt.position.set(wx, wy - 0.06, 0);
      parent.add(hilt);
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), armorMat(look.accentColor));
      pommel.position.set(wx, wy - 0.12, 0);
      parent.add(pommel);
    } else if (look.hasWeapon === "axe") {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.015, 0.5, 6), hiltMat);
      shaft.position.set(wx, wy + 0.1, 0);
      parent.add(shaft);
      const headGeo = new THREE.BoxGeometry(0.12, 0.15, 0.02);
      const axeHead = new THREE.Mesh(headGeo, metalMat);
      axeHead.position.set(wx + 0.06, wy + 0.3, 0);
      axeHead.castShadow = true;
      parent.add(axeHead);
    } else if (look.hasWeapon === "bow") {
      const bowCurve = new THREE.Mesh(
        new THREE.TorusGeometry(0.3, 0.015, 6, 12, Math.PI),
        hiltMat,
      );
      bowCurve.position.set(wx, wy + 0.15, 0.05);
      bowCurve.rotation.z = Math.PI / 2;
      parent.add(bowCurve);
      // bowstring
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, 0.58, 4), new THREE.MeshPhysicalMaterial({ color: 0xddddcc, roughness: 0.5 }));
      string.position.set(wx, wy + 0.15, 0.05);
      parent.add(string);
    } else if (look.hasWeapon === "staff") {
      const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, 0.8, 6), hiltMat);
      staff.position.set(wx, wy + 0.25, 0);
      parent.add(staff);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), eyeMat);
      orb.position.set(wx, wy + 0.68, 0);
      parent.add(orb);
      if (glowMat) {
        const orbGlow = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), glowMat);
        orbGlow.position.set(wx, wy + 0.68, 0);
        parent.add(orbGlow);
      }
    } else if (look.hasWeapon === "dual") {
      for (const dx of [-1, 1]) {
        const dagger = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.2, 0.02), metalMat);
        dagger.position.set(dx * Math.abs(wx), wy + 0.1, 0);
        parent.add(dagger);
        const dHilt = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.012, 0.06, 5), hiltMat);
        dHilt.position.set(dx * Math.abs(wx), wy - 0.02, 0);
        parent.add(dHilt);
      }
    }
  };

  // --- Shield builder helper ---
  const addShield = (parent: THREE.Group, sx: number, sy: number) => {
    if (!look.hasShield) return;
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.25, 0.2), armorMat(look.accentColor));
    shield.position.set(sx, sy, 0.04);
    shield.castShadow = true;
    parent.add(shield);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.008, 4, 12), armorMat(look.accentColor));
    rim.position.set(sx - 0.02, sy, 0.14);
    parent.add(rim);
    const emblem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), eyeMat);
    emblem.position.set(sx - 0.02, sy, 0.15);
    parent.add(emblem);
  };

  if (look.shape === "humanoid") {
    // --- Detailed humanoid with proper anatomy ---
    const bMat = mat(look.bodyColor);
    const sMat = skinMat(look.accentColor);

    // Torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.48, 0.22, 2, 2, 2), bMat);
    torso.position.y = 1.28;
    torso.castShadow = true;
    g.add(torso);

    // Chest detail
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.18, 0.04), mat(look.accentColor));
    chest.position.set(0, 1.38, 0.12);
    g.add(chest);

    // Waist/belt
    const waist = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.1, 0.2), mat(look.accentColor));
    waist.position.y = 1.0;
    g.add(waist);
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.015, 4, 12), armorMat(look.accentColor));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.0;
    g.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.04, 0.015), armorMat(look.accentColor));
    buckle.position.set(0, 1.0, 0.18);
    g.add(buckle);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.1, 8), sMat);
    neck.position.y = 1.57;
    g.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), sMat);
    head.position.y = 1.72;
    head.castShadow = true;
    g.add(head);

    // Brow ridge
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.025, 0.04), sMat);
    brow.position.set(0, 1.77, 0.09);
    g.add(brow);

    // Nose
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.04, 4), sMat);
    nose.position.set(0, 1.7, 0.13);
    nose.rotation.x = -0.3;
    g.add(nose);

    // Eyes with sockets
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 5), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.9 }));
      socket.position.set(s * 0.045, 1.74, 0.09);
      g.add(socket);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
      eye.position.set(s * 0.045, 1.74, 0.11);
      g.add(eye);
    }

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 4), sMat);
      ear.position.set(s * 0.14, 1.72, 0);
      ear.scale.set(0.5, 1, 0.7);
      g.add(ear);
    }

    // Helm
    if (look.hasHelm) {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.6), armorMat(look.accentColor));
      helm.position.y = 1.76;
      helm.castShadow = true;
      g.add(helm);
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.02, 0.06), armorMat(look.accentColor));
      visor.position.set(0, 1.75, 0.1);
      g.add(visor);
    }

    // Arms with joints
    for (const s of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.22, 8), bMat);
      upperArm.position.set(s * 0.26, 1.38, 0);
      upperArm.rotation.z = s * -0.1;
      upperArm.castShadow = true;
      g.add(upperArm);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 5), sMat);
      elbow.position.set(s * 0.28, 1.24, 0);
      g.add(elbow);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.2, 8), sMat);
      forearm.position.set(s * 0.28, 1.1, 0);
      forearm.castShadow = true;
      g.add(forearm);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), sMat);
      hand.position.set(s * 0.28, 0.98, 0);
      g.add(hand);
    }

    // Legs with knees and boots
    for (const s of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.28, 8), bMat);
      thigh.position.set(s * 0.1, 0.78, 0);
      thigh.castShadow = true;
      g.add(thigh);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), mat(look.accentColor));
      knee.position.set(s * 0.1, 0.62, 0.02);
      g.add(knee);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.25, 8), bMat);
      shin.position.set(s * 0.1, 0.45, 0);
      g.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.06, 0.14), mat(look.accentColor));
      boot.position.set(s * 0.1, 0.08, 0.02);
      boot.castShadow = true;
      g.add(boot);
    }

    // Cape
    if (look.hasCape) {
      const capeMat = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(look.bodyColor).offsetHSL(0, 0, -0.15).getHex(),
        roughness: 0.85, metalness: 0.0, side: THREE.DoubleSide,
      });
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.6), capeMat);
      cape.position.set(0, 1.1, -0.14);
      cape.rotation.x = 0.15;
      cape.castShadow = true;
      g.add(cape);
    }

    // Weapons & shield
    addWeapon(g, 0.32, 0.98);
    addShield(g, -0.32, 1.1);

  } else if (look.shape === "armored") {
    // --- Heavily armored humanoid (knights, enchanted armor) ---
    const aMat = armorMat(look.bodyColor);
    const aAccent = armorMat(look.accentColor);

    // Torso plate
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.5, 0.24, 2, 2, 2), aMat);
    torso.position.y = 1.3;
    torso.castShadow = true;
    g.add(torso);

    // Layered chest plates
    const chestTop = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.04), aAccent);
    chestTop.position.set(0, 1.42, 0.13);
    g.add(chestTop);
    const chestBot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.12, 0.04), aAccent);
    chestBot.position.set(0, 1.25, 0.13);
    g.add(chestBot);

    // Gorget (neck guard)
    const gorget = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.08, 10), aMat);
    gorget.position.y = 1.58;
    g.add(gorget);

    // Belt with tassets
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.02, 6, 16), aAccent);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.02;
    g.add(belt);
    for (const s of [-1, 0, 1]) {
      const tasset = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.03), aMat);
      tasset.position.set(s * 0.1, 0.92, 0.1);
      g.add(tasset);
    }

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skinMat(look.accentColor));
    head.position.y = 1.72;
    head.castShadow = true;
    g.add(head);

    // Full helm
    if (look.hasHelm) {
      const helm = new THREE.Mesh(new THREE.SphereGeometry(0.15, 12, 10), aMat);
      helm.position.y = 1.74;
      helm.castShadow = true;
      g.add(helm);
      // Visor slit
      const visor = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.015, 0.02), new THREE.MeshPhysicalMaterial({ color: 0x000000 }));
      visor.position.set(0, 1.74, 0.14);
      g.add(visor);
      // Crest
      const crest = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.08, 0.12), aAccent);
      crest.position.set(0, 1.85, 0);
      g.add(crest);
    }

    // Eyes visible through visor
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
      eye.position.set(s * 0.04, 1.74, 0.15);
      g.add(eye);
    }

    // Pauldrons (shoulder armor)
    for (const s of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), aMat);
      pauldron.scale.set(1.3, 0.8, 1.0);
      pauldron.position.set(s * 0.3, 1.52, 0);
      pauldron.castShadow = true;
      g.add(pauldron);
      // Layered pauldron plates
      for (let p = 0; p < 2; p++) {
        const plate = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.1), aAccent);
        plate.position.set(s * (0.32 + p * 0.03), 1.48 - p * 0.05, 0);
        plate.rotation.z = s * 0.3;
        g.add(plate);
      }
    }

    // Arms - armored
    for (const s of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.22, 8), aMat);
      upperArm.position.set(s * 0.3, 1.35, 0);
      upperArm.rotation.z = s * -0.1;
      upperArm.castShadow = true;
      g.add(upperArm);
      const couter = new THREE.Mesh(new THREE.SphereGeometry(0.045, 6, 5), aAccent);
      couter.position.set(s * 0.32, 1.22, 0);
      g.add(couter);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.045, 0.2, 8), aMat);
      forearm.position.set(s * 0.32, 1.08, 0);
      g.add(forearm);
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.06), aAccent);
      gauntlet.position.set(s * 0.32, 0.95, 0);
      g.add(gauntlet);
    }

    // Legs - armored with greaves
    for (const s of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.065, 0.28, 8), aMat);
      thigh.position.set(s * 0.12, 0.78, 0);
      thigh.castShadow = true;
      g.add(thigh);
      const poleyn = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), aAccent);
      poleyn.position.set(s * 0.12, 0.62, 0.03);
      g.add(poleyn);
      const greave = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.25, 8), aMat);
      greave.position.set(s * 0.12, 0.44, 0);
      g.add(greave);
      const sabaton = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.06, 0.16), aAccent);
      sabaton.position.set(s * 0.12, 0.08, 0.03);
      sabaton.castShadow = true;
      g.add(sabaton);
    }

    // Cape
    if (look.hasCape) {
      const capeMat2 = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(look.bodyColor).offsetHSL(0, 0.1, 0.1).getHex(),
        roughness: 0.8, side: THREE.DoubleSide,
      });
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.7), capeMat2);
      cape.position.set(0, 1.1, -0.15);
      cape.rotation.x = 0.12;
      g.add(cape);
    }

    // Glow aura for magical armored enemies
    if (glowMat) {
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.6, 10, 8), glowMat);
      aura.position.y = 1.3;
      g.add(aura);
      const pt = new THREE.PointLight(look.glowColor!, 0.5, 6);
      pt.position.set(0, 1.3, 0);
      g.add(pt);
    }

    addWeapon(g, 0.38, 0.95);
    addShield(g, -0.38, 1.1);

  } else if (look.shape === "boss_humanoid") {
    // --- Boss-tier humanoid with imposing detail ---
    const bMat = mat(look.bodyColor);
    const aAccent = armorMat(look.accentColor);
    const sMat = skinMat(look.accentColor);

    // Massive torso
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.28, 2, 2, 2), bMat);
    torso.position.y = 1.35;
    torso.castShadow = true;
    g.add(torso);

    // Ornate chest plates
    for (let p = 0; p < 3; p++) {
      const plate = new THREE.Mesh(new THREE.BoxGeometry(0.32 - p * 0.04, 0.1, 0.04), aAccent);
      plate.position.set(0, 1.48 - p * 0.12, 0.15);
      g.add(plate);
    }

    // Abdomen
    const abdomen = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 10), bMat);
    abdomen.position.y = 1.0;
    g.add(abdomen);

    // Ornate belt
    const belt = new THREE.Mesh(new THREE.TorusGeometry(0.24, 0.025, 6, 16), aAccent);
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 1.02;
    g.add(belt);
    const buckle = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), eyeMat);
    buckle.position.set(0, 1.02, 0.24);
    g.add(buckle);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.12, 8), sMat);
    neck.position.y = 1.68;
    g.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.16, 14, 12), sMat);
    head.position.y = 1.85;
    head.castShadow = true;
    g.add(head);

    // Jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.1), sMat);
    jaw.position.set(0, 1.77, 0.06);
    g.add(jaw);

    // Brow
    const brow = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.03, 0.06), bMat);
    brow.position.set(0, 1.92, 0.1);
    g.add(brow);

    // Crown/helm
    if (look.hasHelm) {
      const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.06, 12), aAccent);
      crown.position.y = 1.96;
      g.add(crown);
      for (let sp = 0; sp < 5; sp++) {
        const angle = (sp / 5) * Math.PI * 2;
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 5), aAccent);
        spike.position.set(Math.cos(angle) * 0.15, 2.02, Math.sin(angle) * 0.15);
        g.add(spike);
      }
    }

    // Eyes with inner glow
    for (const s of [-1, 1]) {
      const socket = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.9 }));
      socket.position.set(s * 0.055, 1.88, 0.11);
      g.add(socket);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 8, 6), eyeMat);
      eye.position.set(s * 0.055, 1.88, 0.13);
      g.add(eye);
    }

    // Massive pauldrons with spikes
    for (const s of [-1, 1]) {
      const pauldron = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), aAccent);
      pauldron.scale.set(1.4, 0.8, 1.1);
      pauldron.position.set(s * 0.35, 1.6, 0);
      pauldron.castShadow = true;
      g.add(pauldron);
      for (let sp = 0; sp < 3; sp++) {
        const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.15, 6), aAccent);
        spike.position.set(s * (0.4 + sp * 0.06), 1.65 + sp * 0.03, (sp - 1) * 0.06);
        spike.rotation.z = s * -0.5;
        g.add(spike);
      }
    }

    // Arms
    for (const s of [-1, 1]) {
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.06, 0.25, 8), bMat);
      upperArm.position.set(s * 0.35, 1.38, 0);
      upperArm.rotation.z = s * -0.15;
      upperArm.castShadow = true;
      g.add(upperArm);
      const elbow = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), aAccent);
      elbow.position.set(s * 0.38, 1.22, 0);
      g.add(elbow);
      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.055, 0.22, 8), bMat);
      forearm.position.set(s * 0.38, 1.06, 0);
      g.add(forearm);
      // Gauntlets with knuckle guard
      const gauntlet = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.06, 0.07), aAccent);
      gauntlet.position.set(s * 0.38, 0.92, 0);
      g.add(gauntlet);
    }

    // Legs
    for (const s of [-1, 1]) {
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.075, 0.3, 8), bMat);
      thigh.position.set(s * 0.14, 0.76, 0);
      thigh.castShadow = true;
      g.add(thigh);
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), aAccent);
      knee.position.set(s * 0.14, 0.58, 0.03);
      g.add(knee);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.26, 8), bMat);
      shin.position.set(s * 0.14, 0.42, 0);
      g.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.07, 0.18), aAccent);
      boot.position.set(s * 0.14, 0.08, 0.03);
      boot.castShadow = true;
      g.add(boot);
    }

    // Boss cape (larger, flowing)
    if (look.hasCape) {
      const capeMat2 = new THREE.MeshPhysicalMaterial({
        color: new THREE.Color(look.bodyColor).offsetHSL(0, 0.15, 0.05).getHex(),
        roughness: 0.75, side: THREE.DoubleSide,
        sheen: 0.3, sheenColor: new THREE.Color(look.accentColor),
      });
      const cape = new THREE.Mesh(new THREE.PlaneGeometry(0.45, 0.9), capeMat2);
      cape.position.set(0, 1.1, -0.18);
      cape.rotation.x = 0.1;
      cape.castShadow = true;
      g.add(cape);
    }

    // Boss aura
    if (glowMat) {
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.8, 12, 8), glowMat);
      aura.position.y = 1.3;
      g.add(aura);
    }
    const bossLight = new THREE.PointLight(look.glowColor || look.eyeColor, 1.2, 10);
    bossLight.position.set(0, 1.5, 0);
    g.add(bossLight);

    addWeapon(g, 0.44, 0.92);

  } else if (look.shape === "quadruped") {
    // --- Detailed wolf/boar with fur and anatomy ---
    const fMat = furMat(look.bodyColor);
    const darkFur = furMat(new THREE.Color(look.bodyColor).offsetHSL(0, 0, -0.1).getHex());

    // Body with elongated shape
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.6), fMat);
    body.position.y = 0.46;
    body.castShadow = true;
    g.add(body);

    // Chest (slightly larger front)
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), fMat);
    chest.position.set(0, 0.48, 0.18);
    chest.scale.set(0.9, 0.8, 0.7);
    g.add(chest);

    // Head with snout
    const headBase = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), fMat);
    headBase.position.set(0, 0.54, 0.38);
    headBase.castShadow = true;
    g.add(headBase);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 8), fMat);
    snout.position.set(0, 0.5, 0.5);
    snout.rotation.x = -Math.PI / 2;
    g.add(snout);

    // Nose
    const noseTip = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 5), new THREE.MeshPhysicalMaterial({ color: 0x111111, roughness: 0.5 }));
    noseTip.position.set(0, 0.5, 0.59);
    g.add(noseTip);

    // Mouth/jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.02, 0.1), new THREE.MeshPhysicalMaterial({ color: 0x661111, roughness: 0.8 }));
    jaw.position.set(0, 0.45, 0.5);
    g.add(jaw);

    // Teeth
    const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.4, clearcoat: 0.3 });
    for (const s of [-1, 1]) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.03, 4), toothMat);
      tooth.position.set(s * 0.02, 0.44, 0.55);
      tooth.rotation.x = Math.PI;
      g.add(tooth);
    }

    // Eyes
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), eyeMat);
      eye.position.set(s * 0.06, 0.57, 0.42);
      g.add(eye);
    }

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.1, 6), darkFur);
      ear.position.set(s * 0.06, 0.65, 0.32);
      ear.rotation.z = s * 0.2;
      g.add(ear);
    }

    // Fur tufts along spine
    for (let f = 0; f < 6; f++) {
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.05, 4), darkFur);
      tuft.position.set(0, 0.58, 0.25 - f * 0.1);
      g.add(tuft);
    }

    // Legs with paws
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.035, 0.18, 6), fMat);
        upperLeg.position.set(sx * 0.12, 0.32, sz * 0.2);
        upperLeg.castShadow = true;
        g.add(upperLeg);
        const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.028, 0.14, 6), fMat);
        lowerLeg.position.set(sx * 0.12, 0.16, sz * 0.2);
        g.add(lowerLeg);
        // Paw
        const paw = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.025, 0.06), darkFur);
        paw.position.set(sx * 0.12, 0.04, sz * 0.2 + 0.01);
        g.add(paw);
      }
    }

    // Tail (bushy for wolf, curly for boar)
    for (let t = 0; t < 3; t++) {
      const tailSeg = new THREE.Mesh(new THREE.CylinderGeometry(0.02 - t * 0.004, 0.018 - t * 0.003, 0.12, 5), darkFur);
      tailSeg.position.set(0, 0.5 + t * 0.03, -0.35 - t * 0.06);
      tailSeg.rotation.x = -0.5 - t * 0.15;
      g.add(tailSeg);
    }

  } else if (look.shape === "beast") {
    // --- Large beast (bear, troll, giant) with muscular build ---
    const bMat = furMat(look.bodyColor);
    const darkMat = mat(new THREE.Color(look.bodyColor).offsetHSL(0, 0, -0.15).getHex());

    // Massive body
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), bMat);
    body.scale.set(0.9, 1.0, 1.1);
    body.position.y = 1.0;
    body.castShadow = true;
    g.add(body);

    // Neck (thick)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 0.3, 8), bMat);
    neck.position.set(0, 1.35, 0.3);
    neck.rotation.x = -0.3;
    g.add(neck);

    // Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), bMat);
    head.position.set(0, 1.5, 0.5);
    head.castShadow = true;
    g.add(head);

    // Snout / jaw
    const snout = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), bMat);
    snout.position.set(0, 1.42, 0.7);
    g.add(snout);
    const mouthMat = new THREE.MeshPhysicalMaterial({ color: 0x661111, roughness: 0.85 });
    const mouth = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), mouthMat);
    mouth.position.set(0, 1.35, 0.78);
    g.add(mouth);

    // Teeth
    const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.4 });
    for (const s of [-1, 1]) {
      for (let t = 0; t < 2; t++) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.04, 4), toothMat);
        tooth.position.set(s * (0.02 + t * 0.02), 1.33, 0.76 + t * 0.02);
        tooth.rotation.x = Math.PI;
        g.add(tooth);
      }
    }

    // Eyes
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
      eye.position.set(s * 0.1, 1.55, 0.6);
      g.add(eye);
    }

    // Ears
    for (const s of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 5), bMat);
      ear.position.set(s * 0.18, 1.65, 0.42);
      ear.scale.set(0.6, 1, 0.5);
      g.add(ear);
    }

    // Fur ridge along spine
    for (let f = 0; f < 8; f++) {
      const ridge = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.06, 4), darkMat);
      ridge.position.set(0, 1.45 - f * 0.04, 0.2 - f * 0.05);
      g.add(ridge);
    }

    // Muscular arms
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), bMat);
      arm.position.set(s * 0.4, 0.85, 0.15);
      arm.rotation.z = s * 0.15;
      arm.castShadow = true;
      g.add(arm);
      // Claws
      for (let c = 0; c < 3; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.06, 4), toothMat);
        claw.position.set(s * 0.42 + (c - 1) * 0.025, 0.56, 0.2);
        claw.rotation.x = -0.5;
        g.add(claw);
      }
    }

    // Legs (thick)
    for (const s of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.45, 8), bMat);
        leg.position.set(s * 0.25, 0.28, sz * 0.35);
        leg.castShadow = true;
        g.add(leg);
        // Paw with claws
        const paw = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.14), darkMat);
        paw.position.set(s * 0.25, 0.04, sz * 0.35 + 0.02);
        g.add(paw);
        if (sz === 1) {
          for (let c = 0; c < 3; c++) {
            const claw = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.05, 4), toothMat);
            claw.position.set(s * 0.25 + (c - 1) * 0.03, 0.02, sz * 0.35 + 0.1);
            claw.rotation.x = -Math.PI / 2;
            g.add(claw);
          }
        }
      }
    }

    // Scars on body
    const scarMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(look.bodyColor).offsetHSL(0, -0.1, 0.15).getHex(), roughness: 0.8 });
    for (let sc = 0; sc < 3; sc++) {
      const scar = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.01, 0.01), scarMat);
      scar.position.set((Math.random() - 0.5) * 0.3, 0.9 + sc * 0.15, 0.4);
      scar.rotation.z = (Math.random() - 0.5) * 0.4;
      g.add(scar);
    }

  } else if (look.shape === "large") {
    // --- Dragon / large creature with wings, scales, and fire ---
    const scaleMat = new THREE.MeshPhysicalMaterial({
      color: look.bodyColor, roughness: 0.45, metalness: 0.15,
      sheen: 0.6, sheenRoughness: 0.3, sheenColor: new THREE.Color(look.accentColor),
      clearcoat: 0.3, clearcoatRoughness: 0.4,
    });
    const bellyMat = new THREE.MeshPhysicalMaterial({
      color: new THREE.Color(look.bodyColor).offsetHSL(0, -0.1, 0.2).getHex(),
      roughness: 0.6, metalness: 0.05,
    });

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.55, 1.5, 3, 2, 3), scaleMat);
    body.position.y = 1.5;
    body.castShadow = true;
    g.add(body);

    // Belly plates
    const belly = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.15, 1.2), bellyMat);
    belly.position.set(0, 1.2, 0);
    g.add(belly);

    // Dorsal spines
    for (let d = 0; d < 8; d++) {
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.03 + d * 0.003, 0.12 + d * 0.01, 5), scaleMat);
      spine.position.set(0, 1.82, 0.6 - d * 0.18);
      g.add(spine);
    }

    // Neck + head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.65, 8), scaleMat);
    neck.position.set(0, 1.9, 0.75);
    neck.rotation.x = -0.6;
    neck.castShadow = true;
    g.add(neck);

    const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.45, 2, 2, 2), scaleMat);
    dHead.position.set(0, 2.2, 1.05);
    dHead.castShadow = true;
    g.add(dHead);

    // Snout
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.3, 8), scaleMat);
    snout.position.set(0, 2.15, 1.35);
    snout.rotation.x = -Math.PI / 2;
    g.add(snout);

    // Nostrils (small emissive for fire-breathers)
    for (const s of [-1, 1]) {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), new THREE.MeshPhysicalMaterial({
        color: 0xff4400, emissive: look.glowColor || 0xff2200, emissiveIntensity: 0.8, roughness: 0.3,
      }));
      nostril.position.set(s * 0.04, 2.12, 1.48);
      g.add(nostril);
    }

    // Jaw
    const jaw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.06, 0.35), scaleMat);
    jaw.position.set(0, 2.06, 1.1);
    g.add(jaw);

    // Teeth
    const toothMat = new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.3, clearcoat: 0.4 });
    for (let t = 0; t < 5; t++) {
      for (const s of [-1, 1]) {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.05, 4), toothMat);
        tooth.position.set(s * 0.1, 2.04, 0.92 + t * 0.08);
        tooth.rotation.x = Math.PI;
        g.add(tooth);
      }
    }

    // Horns
    for (const s of [-1, 1]) {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.25, 6), new THREE.MeshPhysicalMaterial({
        color: 0x444433, roughness: 0.5, metalness: 0.1,
      }));
      horn.position.set(s * 0.14, 2.4, 0.95);
      horn.rotation.z = s * 0.4;
      horn.rotation.x = 0.3;
      g.add(horn);
    }

    // Eyes
    for (const s of [-1, 1]) {
      const eyeSocket = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 5), new THREE.MeshPhysicalMaterial({ color: 0x000000, roughness: 0.9 }));
      eyeSocket.position.set(s * 0.12, 2.28, 1.12);
      g.add(eyeSocket);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), eyeMat);
      eye.position.set(s * 0.12, 2.28, 1.15);
      g.add(eye);
      // Slit pupil
      const pupil = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.04, 0.004), new THREE.MeshPhysicalMaterial({ color: 0x000000 }));
      pupil.position.set(s * 0.12, 2.28, 1.19);
      g.add(pupil);
    }

    // Wings with membrane and bone structure
    const wingBoneMat = new THREE.MeshPhysicalMaterial({ color: new THREE.Color(look.bodyColor).offsetHSL(0, 0, -0.1).getHex(), roughness: 0.5, metalness: 0.1 });
    const membraneMat = new THREE.MeshPhysicalMaterial({
      color: look.accentColor, side: THREE.DoubleSide,
      transparent: true, opacity: 0.6, roughness: 0.7,
      sheen: 0.3, sheenColor: new THREE.Color(look.eyeColor),
    });
    for (const s of [-1, 1]) {
      // Wing bone (upper arm)
      const wingBone = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.025, 0.8, 6), wingBoneMat);
      wingBone.position.set(s * 0.6, 2.0, -0.1);
      wingBone.rotation.z = s * 1.0;
      g.add(wingBone);
      // Wing bone (forearm)
      const wingBone2 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.015, 0.7, 6), wingBoneMat);
      wingBone2.position.set(s * 1.15, 2.2, -0.1);
      wingBone2.rotation.z = s * 0.6;
      g.add(wingBone2);
      // Wing finger bones
      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.006, 0.5, 4), wingBoneMat);
        finger.position.set(s * (1.4 + f * 0.08), 2.3 - f * 0.15, -0.1);
        finger.rotation.z = s * (0.3 + f * 0.2);
        g.add(finger);
      }
      // Wing membrane
      const membrane = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 0.9), membraneMat);
      membrane.position.set(s * 1.1, 2.0, -0.1);
      membrane.rotation.z = s * 0.35;
      g.add(membrane);
    }

    // Legs with claws
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 0.6]) {
        const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 8), scaleMat);
        thigh.position.set(sx * 0.3, 1.0, sz * 0.5);
        thigh.castShadow = true;
        g.add(thigh);
        const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.45, 8), scaleMat);
        shin.position.set(sx * 0.3, 0.5, sz * 0.5);
        g.add(shin);
        // Foot with claws
        const foot = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.05, 0.18), scaleMat);
        foot.position.set(sx * 0.3, 0.05, sz * 0.5 + 0.04);
        g.add(foot);
        for (let c = 0; c < 3; c++) {
          const claw = new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.08, 4), toothMat);
          claw.position.set(sx * 0.3 + (c - 1) * 0.04, 0.02, sz * 0.5 + 0.14);
          claw.rotation.x = -Math.PI / 2;
          g.add(claw);
        }
      }
    }

    // Tail with segments
    for (let t = 0; t < 6; t++) {
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(0.1 - t * 0.012, 0.09 - t * 0.01, 0.25, 8),
        scaleMat,
      );
      seg.position.set(0, 1.4 - t * 0.05, -0.8 - t * 0.22);
      seg.rotation.x = Math.PI * 0.5 + t * 0.08;
      seg.castShadow = true;
      g.add(seg);
    }
    // Tail spike
    const tailSpike = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.2, 6), scaleMat);
    tailSpike.position.set(0, 1.1, -2.1);
    tailSpike.rotation.x = Math.PI * 0.5;
    g.add(tailSpike);

    // Dragon glow
    if (glowMat) {
      const aura = new THREE.Mesh(new THREE.SphereGeometry(1.2, 10, 8), glowMat);
      aura.position.y = 1.5;
      g.add(aura);
    }
    const dLight = new THREE.PointLight(look.glowColor || look.eyeColor, 0.8, 12);
    dLight.position.set(0, 2.0, 0.5);
    g.add(dLight);

  } else if (look.shape === "spectral") {
    // --- Wraith / ghost with ethereal translucency ---
    const ghostMat = new THREE.MeshPhysicalMaterial({
      color: look.bodyColor, roughness: 0.3, metalness: 0.0,
      transparent: true, opacity: 0.5, transmission: 0.3, thickness: 1.0,
      emissive: look.glowColor || look.bodyColor, emissiveIntensity: 0.4,
      side: THREE.DoubleSide,
    });
    const innerGlow = new THREE.MeshPhysicalMaterial({
      color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 0.6,
      transparent: true, opacity: 0.2, transmission: 0.5,
    });

    // Floating robed body (cone shape for robes)
    const robes = new THREE.Mesh(new THREE.ConeGeometry(0.4, 1.2, 10), ghostMat);
    robes.position.y = 0.8;
    g.add(robes);

    // Upper body within robes
    const upperBody = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.2, 0.4, 8), ghostMat);
    upperBody.position.y = 1.4;
    g.add(upperBody);

    // Head (skull-like sphere)
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), ghostMat);
    head.position.y = 1.75;
    g.add(head);

    // Hood
    const hood = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.25, 10), ghostMat);
    hood.position.y = 1.85;
    g.add(hood);

    // Eyes (intense glowing)
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), eyeMat);
      eye.position.set(s * 0.05, 1.77, 0.1);
      g.add(eye);
      // Eye trail
      const trail = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.06), new THREE.MeshPhysicalMaterial({
        color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 1.0,
        transparent: true, opacity: 0.4,
      }));
      trail.position.set(s * 0.05, 1.77, 0.14);
      g.add(trail);
    }

    // Ghostly arms (thin, reaching)
    for (const s of [-1, 1]) {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.4, 6), ghostMat);
      arm.position.set(s * 0.25, 1.3, 0.1);
      arm.rotation.z = s * -0.4;
      arm.rotation.x = -0.3;
      g.add(arm);
      // Skeletal fingers
      for (let f = 0; f < 3; f++) {
        const finger = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.006, 0.08, 4), ghostMat);
        finger.position.set(s * (0.32 + f * 0.015), 1.08, 0.15 + f * 0.02);
        finger.rotation.x = -0.5;
        g.add(finger);
      }
    }

    // Wisp particles floating around
    for (let w = 0; w < 6; w++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 5), innerGlow);
      wisp.position.set(
        (Math.random() - 0.5) * 0.6,
        0.5 + Math.random() * 1.2,
        (Math.random() - 0.5) * 0.5,
      );
      g.add(wisp);
    }

    // Inner glow core
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 6), innerGlow);
    core.position.y = 1.3;
    g.add(core);

    // Point light
    const ghostLight = new THREE.PointLight(look.glowColor || look.eyeColor, 0.8, 8);
    ghostLight.position.set(0, 1.3, 0);
    g.add(ghostLight);

  } else {
    // --- Arachnid (spider) with detailed anatomy ---
    const chitinMat = new THREE.MeshPhysicalMaterial({
      color: look.bodyColor, roughness: 0.4, metalness: 0.1,
      clearcoat: 0.6, clearcoatRoughness: 0.3,
      sheen: 0.3, sheenRoughness: 0.4, sheenColor: new THREE.Color(look.accentColor),
    });
    const abdomenMat = new THREE.MeshPhysicalMaterial({
      color: look.accentColor, roughness: 0.5, metalness: 0.05,
      sheen: 0.5, sheenRoughness: 0.3, sheenColor: new THREE.Color(look.bodyColor).offsetHSL(0, 0, 0.15),
    });

    // Cephalothorax
    const ceph = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), chitinMat);
    ceph.position.y = 0.55;
    ceph.scale.set(1, 0.8, 1);
    ceph.castShadow = true;
    g.add(ceph);

    // Abdomen (larger, bulbous)
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.4, 12, 10), abdomenMat);
    abdomen.position.set(0, 0.5, -0.5);
    abdomen.scale.set(0.9, 0.85, 1.1);
    abdomen.castShadow = true;
    g.add(abdomen);

    // Abdomen markings (hourglass/pattern)
    const markMat = new THREE.MeshPhysicalMaterial({ color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 0.3, roughness: 0.5 });
    for (let m = 0; m < 4; m++) {
      const mark = new THREE.Mesh(new THREE.SphereGeometry(0.04, 5, 4), markMat);
      mark.position.set(0, 0.6 - m * 0.05, -0.5 + 0.38);
      g.add(mark);
    }

    // Pedipalps (small arm-like appendages at front)
    for (const s of [-1, 1]) {
      const palp = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.12, 5), chitinMat);
      palp.position.set(s * 0.08, 0.48, 0.3);
      palp.rotation.x = -0.6;
      palp.rotation.z = s * 0.3;
      g.add(palp);
    }

    // Mandibles / chelicerae
    for (const s of [-1, 1]) {
      const mandible = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.1, 5), chitinMat);
      mandible.position.set(s * 0.06, 0.42, 0.3);
      mandible.rotation.x = -0.4;
      mandible.rotation.z = s * 0.2;
      g.add(mandible);
      // Fang tip
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.008, 0.04, 4), new THREE.MeshPhysicalMaterial({ color: 0xeeeeee, roughness: 0.3, clearcoat: 0.5 }));
      fang.position.set(s * 0.06, 0.35, 0.35);
      fang.rotation.x = -0.2;
      g.add(fang);
    }

    // Eyes (cluster of 6-8)
    const eyePositions = [
      [-0.1, 0.65, 0.22], [0.1, 0.65, 0.22],
      [-0.06, 0.7, 0.24], [0.06, 0.7, 0.24],
      [-0.04, 0.62, 0.25], [0.04, 0.62, 0.25],
      [-0.08, 0.67, 0.2], [0.08, 0.67, 0.2],
    ];
    for (const ep of eyePositions) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), eyeMat);
      eye.position.set(ep[0], ep[1], ep[2]);
      g.add(eye);
    }

    // 8 legs with joints (two segments each)
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const spreadAngle = (idx - 1.5) * 0.45;

      // Coxa (base segment)
      const coxa = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.15, 5), chitinMat);
      coxa.position.set(side * 0.25, 0.5, spreadAngle * 0.5);
      coxa.rotation.z = side * 0.6;
      coxa.rotation.y = spreadAngle * 0.5;
      g.add(coxa);

      // Joint
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 4), chitinMat);
      joint.position.set(side * 0.38, 0.55, spreadAngle * 0.65);
      g.add(joint);

      // Femur (upper leg)
      const femur = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.015, 0.35, 5), chitinMat);
      femur.position.set(side * 0.5, 0.4, spreadAngle * 0.8);
      femur.rotation.z = side * 1.0;
      femur.rotation.y = spreadAngle * 0.3;
      g.add(femur);

      // Knee joint
      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.015, 4, 3), chitinMat);
      knee.position.set(side * 0.62, 0.2, spreadAngle * 0.9);
      g.add(knee);

      // Tibia (lower leg)
      const tibia = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.008, 0.3, 5), chitinMat);
      tibia.position.set(side * 0.6, 0.08, spreadAngle * 0.95);
      tibia.rotation.z = side * 0.2;
      g.add(tibia);
    }

    // Spinnerets (at back of abdomen)
    for (let sp = 0; sp < 3; sp++) {
      const spinneret = new THREE.Mesh(new THREE.ConeGeometry(0.01, 0.04, 4), chitinMat);
      spinneret.position.set((sp - 1) * 0.02, 0.38, -0.9);
      spinneret.rotation.x = 0.5;
      g.add(spinneret);
    }

    // Bristles / hair on body
    for (let b = 0; b < 12; b++) {
      const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.005, 0.04, 3), chitinMat);
      const onAbdomen = b > 5;
      bristle.position.set(
        (Math.random() - 0.5) * (onAbdomen ? 0.35 : 0.22),
        0.6 + Math.random() * 0.12,
        onAbdomen ? -0.5 + (Math.random() - 0.5) * 0.35 : (Math.random() - 0.5) * 0.2,
      );
      g.add(bristle);
    }

    // Glow
    if (glowMat) {
      const aura = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 6), glowMat);
      aura.position.set(0, 0.5, -0.2);
      g.add(aura);
    }
  }

  g.scale.setScalar(look.scale);
  return g;
}

// ---------------------------------------------------------------------------
// NPC builders: Arthur, Merlin
// ---------------------------------------------------------------------------

function buildArthurMesh(): THREE.Group {
  return buildCharacterMesh({
    bodyColor: 0xccaa33, accentColor: 0xffdd66, helmShape: "round",
    hasStaff: false, hasBow: false, hasDaggers: false, capeColor: 0xcc2222,
  }, 1.1);
}

function buildMerlinMesh(): THREE.Group {
  const g = buildCharacterMesh({
    bodyColor: 0x1a1a44, accentColor: 0x6644cc, helmShape: "pointed",
    hasStaff: true, hasBow: false, hasDaggers: false, capeColor: 0x110033,
  }, 1.05);
  const starMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xaaaaff, emissiveIntensity: 2 });
  for (let i = 0; i < 12; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.01, 4, 4), starMat);
    s.position.set((Math.random() - 0.5) * 0.3, 0.8 + Math.random() * 0.6, (Math.random() - 0.5) * 0.15);
    g.add(s);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Terrain builder
// ---------------------------------------------------------------------------

function buildTerrain(): { mesh: THREE.Mesh; getHeight: (x: number, z: number) => number } {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
  geo.rotateX(-Math.PI / 2);

  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);

  // height function using layered simplex-ish noise (enhanced detail)
  const heightAt = (x: number, z: number): number => {
    const s1 = Math.sin(x * 0.008) * Math.cos(z * 0.008) * 18;
    const s2 = Math.sin(x * 0.025 + 1.3) * Math.cos(z * 0.02 - 0.7) * 6;
    const s3 = Math.sin(x * 0.06) * Math.sin(z * 0.06) * 2;
    const s4 = Math.sin(x * 0.15 + 0.5) * Math.cos(z * 0.12 - 0.3) * 0.8;
    // Extra micro-detail for texture
    const s5 = Math.sin(x * 0.3 + 2.1) * Math.cos(z * 0.28 - 1.1) * 0.3;
    const s6 = Math.sin(x * 0.5 + 0.8) * Math.sin(z * 0.45 + 0.4) * 0.12;
    return s1 + s2 + s3 + s4 + s5 + s6;
  };

  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const h = heightAt(x, z);
    pos.setY(i, h);

    // Multi-texture coloring by height with noise variation for realism
    let r: number, g: number, b: number;
    const noiseVar = Math.sin(x * 0.4 + z * 0.3) * 0.04 + Math.sin(x * 0.8 - z * 0.6) * 0.02;
    if (h < WATER_LEVEL + 0.5) {
      // sand near water - warm beach tones
      r = 0.78 + noiseVar; g = 0.72 + noiseVar * 0.8; b = 0.52 + noiseVar * 0.5;
    } else if (h < 3.5) {
      // transition sand to grass
      const t = (h - WATER_LEVEL - 0.5) / 1.5;
      r = lerp(0.76, 0.28, t) + noiseVar; g = lerp(0.7, 0.52, t) + noiseVar; b = lerp(0.5, 0.12, t) + noiseVar * 0.5;
    } else if (h < 6) {
      // lush grass with variety
      const t = (h - 3.5) / 2.5;
      r = lerp(0.28, 0.2, t) + noiseVar * 0.5; g = lerp(0.52, 0.42, t) + noiseVar; b = lerp(0.12, 0.08, t) + noiseVar * 0.3;
    } else if (h < 9) {
      // forest floor / dirt
      const t = (h - 6) / 3;
      r = lerp(0.2, 0.35, t) + noiseVar; g = lerp(0.42, 0.32, t) + noiseVar * 0.5; b = lerp(0.08, 0.15, t) + noiseVar * 0.3;
    } else if (h < 14) {
      // rock / stone transition
      const t = (h - 9) / 5;
      r = lerp(0.35, 0.48, t) + noiseVar; g = lerp(0.32, 0.46, t) + noiseVar; b = lerp(0.15, 0.42, t) + noiseVar;
    } else {
      // snow caps with bluish tint
      const t = Math.min((h - 14) / 6, 1);
      r = lerp(0.48, 0.94, t) + noiseVar * 0.3; g = lerp(0.46, 0.94, t) + noiseVar * 0.3; b = lerp(0.42, 0.97, t) + noiseVar * 0.2;
    }
    colors[i * 3] = r;
    colors[i * 3 + 1] = g;
    colors[i * 3 + 2] = b;
  }

  geo.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const mat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.82,
    metalness: 0.04,
    envMapIntensity: 0.4,
    flatShading: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.castShadow = true;

  const getHeight = (wx: number, wz: number): number => {
    return heightAt(wx, wz);
  };

  return { mesh, getHeight };
}

// ---------------------------------------------------------------------------
// Water plane
// ---------------------------------------------------------------------------

function buildWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 128, 128);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a7099,
    transparent: true,
    opacity: 0.68,
    roughness: 0.01,
    metalness: 0.7,
    side: THREE.DoubleSide,
    envMapIntensity: 2.0,
    emissive: 0x081a30,
    emissiveIntensity: 0.2,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_LEVEL;
  mesh.receiveShadow = true;
  return mesh;
}

function animateWater(mesh: THREE.Mesh, time: number): void {
  const pos = (mesh.geometry as THREE.PlaneGeometry).attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // Multi-octave wave simulation for more realistic water
    const y = Math.sin(x * 0.05 + time * 1.5) * 0.2 +
              Math.sin(z * 0.07 + time * 1.2) * 0.15 +
              Math.sin((x + z) * 0.03 + time * 0.8) * 0.3 +
              Math.sin(x * 0.12 + z * 0.08 + time * 2.2) * 0.08 + // higher frequency ripple
              Math.sin(x * 0.18 - z * 0.15 + time * 3.0) * 0.04 + // fine detail
              Math.cos(x * 0.025 - time * 0.5) * Math.sin(z * 0.03 + time * 0.7) * 0.2; // broad swell
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
  // Recompute normals for proper lighting on waves
  mesh.geometry.computeVertexNormals();
}

// ---------------------------------------------------------------------------
// Procedural trees, bushes, grass
// ---------------------------------------------------------------------------

function buildTree(seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = seededRandom(seed);
  const height = 2.5 + r * 3;
  const trunkR = 0.08 + r * 0.06;

  // Trunk with bark-like color variation
  const trunkColor = 0x553311 + ((seed * 37) & 0x111100);
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(trunkR * 0.6, trunkR, height, 8),
    new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.95, metalness: 0.02 }),
  );
  trunk.position.y = height / 2;
  trunk.castShadow = true;
  g.add(trunk);

  // Branch stubs
  const branchMat = new THREE.MeshStandardMaterial({ color: trunkColor, roughness: 0.9 });
  for (let b = 0; b < 3; b++) {
    const bAngle = seededRandom(seed * 7 + b * 31) * Math.PI * 2;
    const bH = height * (0.4 + seededRandom(seed * 11 + b * 17) * 0.4);
    const branch = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.025, 0.4, 4), branchMat);
    branch.position.set(Math.cos(bAngle) * trunkR * 0.8, bH, Math.sin(bAngle) * trunkR * 0.8);
    branch.rotation.z = (Math.cos(bAngle) > 0 ? 1 : -1) * 1.0;
    branch.rotation.y = bAngle;
    branch.castShadow = true;
    g.add(branch);
  }

  const crownColor = 0x226622 + ((seed * 1234) & 0x003300);
  const crownMat = new THREE.MeshStandardMaterial({ color: crownColor, roughness: 0.85, metalness: 0.02 });
  if (r > 0.5) {
    // Multi-sphere crown for more natural look
    for (let c = 0; c < 3; c++) {
      const cSize = (0.6 + r * 0.7) * (c === 0 ? 1 : 0.7);
      const crown = new THREE.Mesh(
        new THREE.SphereGeometry(cSize, 8, 8), crownMat,
      );
      const cAngle = c * Math.PI * 0.67;
      crown.position.set(
        Math.cos(cAngle) * cSize * 0.3,
        height + 0.3 + c * 0.15,
        Math.sin(cAngle) * cSize * 0.3,
      );
      crown.castShadow = true;
      g.add(crown);
    }
  } else {
    // Conifer with multiple layers
    for (let layer = 0; layer < 3; layer++) {
      const layerSize = (0.7 + r * 0.5) * (1 - layer * 0.2);
      const layerH = 1.0 + r * 0.5 - layer * 0.3;
      const cone = new THREE.Mesh(
        new THREE.ConeGeometry(layerSize, layerH, 8), crownMat,
      );
      cone.position.y = height + 0.3 + layer * 0.6;
      cone.castShadow = true;
      g.add(cone);
    }
  }
  return g;
}

function buildBush(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x2a5a1a, roughness: 0.9 });
  for (let i = 0; i < 3; i++) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.3 + Math.random() * 0.2, 6, 6), mat);
    s.position.set((Math.random() - 0.5) * 0.3, 0.25, (Math.random() - 0.5) * 0.3);
    s.castShadow = true; g.add(s);
  }
  return g;
}

function buildGrassPatch(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x44aa22, side: THREE.DoubleSide, roughness: 0.9 });
  for (let i = 0; i < 8; i++) {
    const b = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.3), mat);
    b.position.set((Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4);
    b.rotation.y = Math.random() * Math.PI; b.rotation.x = (Math.random() - 0.5) * 0.3; g.add(b);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Buildings: Camelot castle, village houses, ruins, shrines
// ---------------------------------------------------------------------------

function buildCamelotCastle(): THREE.Group {
  const g = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({
    color: 0x9a9888, roughness: 0.88, metalness: 0.08, envMapIntensity: 0.3,
  });
  const roof = new THREE.MeshStandardMaterial({
    color: 0x5a2828, roughness: 0.78, metalness: 0.05,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: 0x626252, roughness: 0.92, metalness: 0.06,
  });
  const goldTrim = new THREE.MeshStandardMaterial({
    color: 0xccaa33, roughness: 0.3, metalness: 0.85, emissive: 0x332200, emissiveIntensity: 0.1,
  });
  const addMesh = (geo: THREE.BufferGeometry, mat: THREE.Material, x: number, y: number, z: number, ry = 0, shadow = true) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.y = ry;
    m.castShadow = shadow; m.receiveShadow = shadow; g.add(m); return m;
  };
  // great hall + roof
  addMesh(new THREE.BoxGeometry(12, 6, 8), stone, 0, 3, 0);
  addMesh(new THREE.ConeGeometry(7.5, 3, 4), roof, 0, 7.5, 0, Math.PI / 4, false);
  // 4 corner towers with battlements
  for (const [sx, sz] of [[-1, -1], [-1, 1], [1, -1], [1, 1]] as [number, number][]) {
    addMesh(new THREE.CylinderGeometry(1.5, 1.8, 10, 8), stone, sx * 8, 5, sz * 6);
    addMesh(new THREE.ConeGeometry(2, 3, 8), roof, sx * 8, 11.5, sz * 6, 0, false);
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      addMesh(new THREE.BoxGeometry(0.4, 0.6, 0.4), dark, sx * 8 + Math.cos(ang) * 1.6, 10.3, sz * 6 + Math.sin(ang) * 1.6, 0, false);
    }
  }
  // walls
  for (const [wx, wy, wz, wl, wr] of [[0,5,-6,16,0],[0,5,6,16,0],[-8,5,0,12,Math.PI/2],[8,5,0,12,Math.PI/2]] as number[][]) {
    addMesh(new THREE.BoxGeometry(wl, 8, 0.8), dark, wx, wy, wz, wr);
  }
  // gate with iron portcullis look
  addMesh(new THREE.BoxGeometry(2.5, 3.5, 1), new THREE.MeshStandardMaterial({
    color: 0x3a1a08, roughness: 0.85, metalness: 0.1,
  }), 0, 1.75, -6.2);
  // gate arch
  addMesh(new THREE.TorusGeometry(1.3, 0.3, 6, 8, Math.PI), stone, 0, 3.5, -6.2);
  // banners on front towers
  for (const sx of [-1, 1]) {
    const banner = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 2.5, 1, 4),
      new THREE.MeshStandardMaterial({
        color: 0xcc2222, side: THREE.DoubleSide, roughness: 0.9, metalness: 0.02,
      }),
    );
    banner.position.set(sx * 8, 7, sx * -6 + (sx > 0 ? 1.8 : -1.8));
    banner.castShadow = true;
    g.add(banner);
  }
  // gold trim on main hall
  addMesh(new THREE.BoxGeometry(12.2, 0.15, 8.2), goldTrim, 0, 6.02, 0, 0, false);
  return g;
}

function buildVillageHouse(seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = seededRandom(seed), w = 2 + r * 2, h = 2 + r * 1.5, d = 2 + r * 1.5;
  const wallColor = 0xaa9977 + ((seed * 77) & 0x111111);
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.88, metalness: 0.04, envMapIntensity: 0.2 }));
  walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  // Half-timber beams
  const beamMat = new THREE.MeshStandardMaterial({ color: 0x3a2210, roughness: 0.92 });
  for (let i = 0; i < 3; i++) {
    const beam = new THREE.Mesh(new THREE.BoxGeometry(w + 0.05, 0.06, d + 0.05), beamMat);
    beam.position.y = h * (0.3 + i * 0.3); g.add(beam);
  }
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.78, 1.6, 4),
    new THREE.MeshStandardMaterial({ color: 0x4a2818, roughness: 0.82, metalness: 0.03 }));
  roof.position.y = h + 0.8; roof.rotation.y = Math.PI / 4; roof.castShadow = true; g.add(roof);
  // Door with frame
  const doorFrame = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.3, 0.06),
    new THREE.MeshStandardMaterial({ color: 0x3a1a08, roughness: 0.9 }));
  doorFrame.position.set(0, 0.65, d / 2 + 0.02); g.add(doorFrame);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x5a3018, side: THREE.DoubleSide, roughness: 0.85 }));
  door.position.set(0, 0.6, d / 2 + 0.04); g.add(door);
  // Window with glow
  const windowMat = new THREE.MeshStandardMaterial({
    color: 0xffcc66, emissive: 0xffaa33, emissiveIntensity: 0.4,
    transparent: true, opacity: 0.7, roughness: 0.1,
  });
  for (const sx of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.PlaneGeometry(0.35, 0.35), windowMat);
    win.position.set(sx * (w * 0.3), h * 0.55, d / 2 + 0.02); g.add(win);
  }
  // Chimney
  const chimney = new THREE.Mesh(
    new THREE.BoxGeometry(0.3, 1.2, 0.3),
    new THREE.MeshStandardMaterial({ color: 0x665544, roughness: 0.9 }),
  );
  chimney.position.set(w * 0.25, h + 1.0, 0); chimney.castShadow = true; g.add(chimney);
  return g;
}

function buildRuin(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x777766, roughness: 0.95 });
  for (let i = 0; i < 4; i++) {
    const h = 1.5 + Math.random() * 2.5, a = (i / 4) * Math.PI * 2;
    const w = new THREE.Mesh(new THREE.BoxGeometry(2 + Math.random(), h, 0.4), mat);
    w.position.set(Math.cos(a) * 3, h / 2, Math.sin(a) * 3); w.rotation.y = a + Math.PI / 2;
    w.castShadow = true; g.add(w);
  }
  const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.25, 2.5, 6), mat);
  col.position.set(1, 0.2, 0); col.rotation.z = Math.PI / 2 + 0.1; g.add(col);
  return g;
}

function buildShrine(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0xbbbbaa, roughness: 0.7, metalness: 0.2, envMapIntensity: 0.5,
  });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 12), mat);
  base.position.y = 0.25; base.castShadow = true; base.receiveShadow = true; g.add(base);
  // Carved runes on base
  for (let i = 0; i < 6; i++) {
    const runeAngle = (i / 6) * Math.PI * 2;
    const rune = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.15, 0.01),
      new THREE.MeshStandardMaterial({ color: 0x4488cc, emissive: 0x2266aa, emissiveIntensity: 0.8 }),
    );
    rune.position.set(Math.cos(runeAngle) * 0.72, 0.25, Math.sin(runeAngle) * 0.72);
    rune.rotation.y = -runeAngle;
    g.add(rune);
  }
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 1.5, 8), mat);
  pillar.position.y = 1.25; pillar.castShadow = true; g.add(pillar);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 1),
    new THREE.MeshStandardMaterial({
      color: 0x66ccff, emissive: 0x3399ff, emissiveIntensity: 2.5,
      transparent: true, opacity: 0.8, roughness: 0.05, metalness: 0.1,
    }));
  crystal.position.y = 2.2; g.add(crystal);
  // Crystal glow halo
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 12, 12),
    new THREE.MeshBasicMaterial({ color: 0x4488ff, transparent: true, opacity: 0.08, side: THREE.DoubleSide }),
  );
  glow.position.y = 2.2; g.add(glow);
  // Point light from crystal
  const shrineLight = new THREE.PointLight(0x4488ff, 1.5, 10);
  shrineLight.position.y = 2.2; g.add(shrineLight);
  return g;
}

// ---------------------------------------------------------------------------
// Caves (dark interior box with torch lights)
// ---------------------------------------------------------------------------

function buildCaveEntrance(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0x333322, roughness: 1, side: THREE.DoubleSide });
  const add = (geo: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); g.add(m);
  };
  add(new THREE.TorusGeometry(2, 0.5, 6, 8, Math.PI), 0, 2, 0, Math.PI / 2);
  add(new THREE.PlaneGeometry(4, 6), 0, 0.01, -3, -Math.PI / 2);
  add(new THREE.PlaneGeometry(4, 6), 0, 3.5, -3, Math.PI / 2);
  for (const s of [-1, 1]) add(new THREE.PlaneGeometry(6, 3.5), s * 2, 1.75, -3, 0, s * Math.PI / 2);
  const torch = new THREE.PointLight(0xff8833, 1.5, 8);
  torch.position.set(0, 2.5, -4); g.add(torch);
  return g;
}

// ---------------------------------------------------------------------------
// Sky dome with stars and clouds
// ---------------------------------------------------------------------------

function buildSkyDome(): { dome: THREE.Mesh; stars: THREE.Points; update: (time: number) => void } {
  // gradient sky dome
  const skyGeo = new THREE.SphereGeometry(SKY_RADIUS, 32, 16);
  const skyMat = new THREE.ShaderMaterial({
    uniforms: {
      sunDir: { value: new THREE.Vector3(0, 1, 0) },
      timeOfDay: { value: 0.5 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vWorldPos;
      void main() {
        vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * viewMatrix * vec4(vWorldPos, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 sunDir;
      uniform float timeOfDay;
      varying vec3 vWorldPos;

      // Simple Mie phase function for atmospheric haze
      float miePhase(float cosTheta, float g) {
        float g2 = g * g;
        return (1.0 - g2) / pow(1.0 + g2 - 2.0 * g * cosTheta, 1.5) * 0.25;
      }

      void main() {
        vec3 dir = normalize(vWorldPos);
        float y = dir.y * 0.5 + 0.5;

        // day sky with Rayleigh-like gradient
        vec3 dayZenith = vec3(0.22, 0.42, 0.88);
        vec3 dayHorizon = vec3(0.55, 0.72, 0.95);
        vec3 dayCol = mix(dayHorizon, dayZenith, pow(y, 0.6));

        // night sky with deep blue/purple tones
        vec3 nightZenith = vec3(0.01, 0.01, 0.06);
        vec3 nightHorizon = vec3(0.04, 0.02, 0.09);
        vec3 nightCol = mix(nightHorizon, nightZenith, pow(y, 0.5));

        // aurora-like subtle green at night horizon
        float auroraFactor = smoothstep(0.3, 0.5, y) * (1.0 - smoothstep(0.5, 0.7, y));
        nightCol += vec3(0.0, 0.02, 0.01) * auroraFactor;

        // multi-color sunrise/sunset (orange -> pink -> purple gradient)
        vec3 sunsetLow = vec3(1.0, 0.35, 0.1);
        vec3 sunsetMid = vec3(0.95, 0.45, 0.35);
        vec3 sunsetHigh = vec3(0.6, 0.3, 0.5);
        float lowBand = smoothstep(0.0, 0.12, y) * (1.0 - smoothstep(0.12, 0.25, y));
        float midBand = smoothstep(0.12, 0.25, y) * (1.0 - smoothstep(0.25, 0.4, y));
        float highBand = smoothstep(0.25, 0.4, y) * (1.0 - smoothstep(0.4, 0.55, y));
        vec3 sunsetCol = sunsetLow * lowBand + sunsetMid * midBand + sunsetHigh * highBand;

        // blend based on time
        float dayFactor = smoothstep(0.2, 0.35, timeOfDay) - smoothstep(0.7, 0.85, timeOfDay);
        vec3 col = mix(nightCol, dayCol, dayFactor);

        // add sunset glow during transitions
        float transitionFactor = smoothstep(0.2, 0.3, timeOfDay) * (1.0 - smoothstep(0.3, 0.4, timeOfDay))
                               + smoothstep(0.65, 0.75, timeOfDay) * (1.0 - smoothstep(0.75, 0.85, timeOfDay));
        col = mix(col, col + sunsetCol, transitionFactor * 0.85);

        // sun disc with realistic falloff
        float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
        col += vec3(1.0, 0.97, 0.85) * pow(sunDot, 512.0) * dayFactor * 1.5; // bright core
        col += vec3(1.0, 0.85, 0.55) * pow(sunDot, 64.0) * 0.2 * dayFactor; // inner halo
        col += vec3(1.0, 0.6, 0.25) * pow(sunDot, 8.0) * 0.12 * dayFactor; // outer glow

        // Atmospheric Mie scattering near sun during golden hour
        float mie = miePhase(sunDot, 0.76);
        col += vec3(1.0, 0.8, 0.5) * mie * transitionFactor * 0.25;

        // Moon glow at night
        float moonDot = max(dot(dir, normalize(-sunDir)), 0.0);
        float nightness = 1.0 - dayFactor;
        col += vec3(0.6, 0.65, 0.8) * pow(moonDot, 256.0) * nightness * 0.8;
        col += vec3(0.3, 0.35, 0.5) * pow(moonDot, 16.0) * nightness * 0.1;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(skyGeo, skyMat);

  // stars – more numerous with varied brightness via vertex colors
  const starCount = 3000;
  const starPos = new Float32Array(starCount * 3);
  const starColors = new Float32Array(starCount * 3);
  const starSizes = new Float32Array(starCount);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random()); // upper hemisphere bias
    const r = SKY_RADIUS * 0.95;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    // Varied star colors: white, blueish, yellowish, reddish
    const colorRoll = Math.random();
    if (colorRoll < 0.6) {
      starColors[i * 3] = 0.95 + Math.random() * 0.05;
      starColors[i * 3 + 1] = 0.95 + Math.random() * 0.05;
      starColors[i * 3 + 2] = 1.0;
    } else if (colorRoll < 0.8) {
      starColors[i * 3] = 0.7; starColors[i * 3 + 1] = 0.8; starColors[i * 3 + 2] = 1.0;
    } else if (colorRoll < 0.92) {
      starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.95; starColors[i * 3 + 2] = 0.7;
    } else {
      starColors[i * 3] = 1.0; starColors[i * 3 + 1] = 0.7; starColors[i * 3 + 2] = 0.6;
    }
    // Varied star sizes for depth
    starSizes[i] = 0.8 + Math.random() * 2.0;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute("color", new THREE.BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 1.8,
    sizeAttenuation: false,
    vertexColors: true,
  });
  const stars = new THREE.Points(starGeo, starMat);

  const update = (worldTimeHours: number) => {
    const t = worldTimeHours / 24; // 0..1
    (skyMat.uniforms.timeOfDay as { value: number }).value = t;

    // sun position
    const sunAngle = (t - 0.25) * Math.PI * 2; // rises at 6am
    const sunDir = new THREE.Vector3(
      Math.cos(sunAngle) * 0.5,
      Math.sin(sunAngle),
      Math.cos(sunAngle) * 0.3,
    ).normalize();
    (skyMat.uniforms.sunDir as { value: THREE.Vector3 }).value.copy(sunDir);

    // stars visibility – fade in at night
    const nightness = 1 - (Math.sin(sunAngle) * 0.5 + 0.5);
    (starMat as THREE.PointsMaterial).opacity = Math.pow(nightness, 2);
    starMat.transparent = true;
  };

  return { dome, stars, update };
}

// ---------------------------------------------------------------------------
// Cloud layer
// ---------------------------------------------------------------------------

function buildClouds(): THREE.Group {
  const g = new THREE.Group();
  // Volumetric-style clouds with varied density layers
  const matBright = new THREE.MeshStandardMaterial({
    color: 0xfcfcfc, transparent: true, opacity: 0.5, roughness: 1, metalness: 0,
    emissive: 0x222222, emissiveIntensity: 0.1,
  });
  const matMid = new THREE.MeshStandardMaterial({
    color: 0xeeeef4, transparent: true, opacity: 0.38, roughness: 1, metalness: 0,
  });
  const matDark = new THREE.MeshStandardMaterial({
    color: 0xccccdd, transparent: true, opacity: 0.28, roughness: 1, metalness: 0,
  });
  const matUnderbelly = new THREE.MeshStandardMaterial({
    color: 0x999aaa, transparent: true, opacity: 0.22, roughness: 1, metalness: 0,
  });

  for (let i = 0; i < 40; i++) {
    const cloud = new THREE.Group();
    const puffCount = 5 + Math.floor(Math.random() * 7);
    const isThick = Math.random() > 0.5;
    const isMassive = Math.random() > 0.85;
    for (let j = 0; j < puffCount; j++) {
      const pSize = (isMassive ? 12 : 6) + Math.random() * (isThick ? 20 : 14);
      const layerMat = j === 0 ? matBright : j < puffCount / 2 ? matMid : (j < puffCount * 0.75 ? matDark : matUnderbelly);
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(pSize, 10, 8),
        layerMat,
      );
      p.position.set(
        (Math.random() - 0.5) * 30,
        (Math.random() - 0.5) * (isThick ? 7 : 4) - (j >= puffCount * 0.75 ? 3 : 0),
        (Math.random() - 0.5) * 15,
      );
      p.scale.y = 0.25 + Math.random() * 0.2;
      p.scale.x = 1.0 + Math.random() * 0.3;
      cloud.add(p);
    }
    cloud.position.set(
      (Math.random() - 0.5) * TERRAIN_SIZE * 0.85,
      65 + Math.random() * 50,
      (Math.random() - 0.5) * TERRAIN_SIZE * 0.85,
    );
    g.add(cloud);
  }
  return g;
}

// ---------------------------------------------------------------------------
// Particle system (pooled)
// ---------------------------------------------------------------------------

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
  color: THREE.Color;
  size: number;
  active: boolean;
}

class ParticlePool {
  particles: Particle[] = [];
  geometry: THREE.BufferGeometry;
  points: THREE.Points;
  private posArr: Float32Array;
  private colArr: Float32Array;
  private sizeArr: Float32Array;

  constructor(maxCount: number) {
    this.posArr = new Float32Array(maxCount * 3);
    this.colArr = new Float32Array(maxCount * 3);
    this.sizeArr = new Float32Array(maxCount);
    this.geometry = new THREE.BufferGeometry();
    this.geometry.setAttribute("position", new THREE.BufferAttribute(this.posArr, 3));
    this.geometry.setAttribute("color", new THREE.BufferAttribute(this.colArr, 3));
    this.geometry.setAttribute("size", new THREE.BufferAttribute(this.sizeArr, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.3,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      sizeAttenuation: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.geometry, mat);

    for (let i = 0; i < maxCount; i++) {
      this.particles.push({
        position: new THREE.Vector3(),
        velocity: new THREE.Vector3(),
        life: 0,
        maxLife: 1,
        color: new THREE.Color(),
        size: 0.2,
        active: false,
      });
    }
  }

  emit(pos: THREE.Vector3, vel: THREE.Vector3, color: THREE.Color, life: number, size = 0.2): void {
    for (const p of this.particles) {
      if (!p.active) {
        p.position.copy(pos);
        p.velocity.copy(vel);
        p.color.copy(color);
        p.life = life;
        p.maxLife = life;
        p.size = size;
        p.active = true;
        return;
      }
    }
  }

  update(dt: number): void {
    let idx = 0;
    for (const p of this.particles) {
      if (p.active) {
        p.life -= dt;
        if (p.life <= 0) {
          p.active = false;
        } else {
          p.position.addScaledVector(p.velocity, dt);
          p.velocity.y -= 0.5 * dt; // gentle gravity
          const alpha = p.life / p.maxLife;
          this.posArr[idx * 3] = p.position.x;
          this.posArr[idx * 3 + 1] = p.position.y;
          this.posArr[idx * 3 + 2] = p.position.z;
          this.colArr[idx * 3] = p.color.r * alpha;
          this.colArr[idx * 3 + 1] = p.color.g * alpha;
          this.colArr[idx * 3 + 2] = p.color.b * alpha;
          this.sizeArr[idx] = p.size * alpha;
          idx++;
        }
      }
    }
    // zero out remaining
    for (let i = idx; i < this.particles.length; i++) {
      this.posArr[i * 3 + 1] = -9999;
      this.sizeArr[i] = 0;
    }
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.setDrawRange(0, idx);
  }
}

// ---------------------------------------------------------------------------
// Spell effect emitters
// ---------------------------------------------------------------------------

function emitFireball(pool: ParticlePool, origin: THREE.Vector3, dir: THREE.Vector3): void {
  // Inner core (bright white-yellow)
  for (let i = 0; i < 10; i++) {
    const spread = v3(
      (Math.random() - 0.5) * 0.8,
      (Math.random() - 0.5) * 0.8 + 0.5,
      (Math.random() - 0.5) * 0.8,
    );
    const vel = dir.clone().multiplyScalar(10).add(spread);
    const c = new THREE.Color().setHSL(0.12 + Math.random() * 0.03, 1, 0.7 + Math.random() * 0.25);
    pool.emit(origin.clone(), vel, c, 0.3 + Math.random() * 0.3, 0.35 + Math.random() * 0.15);
  }
  // Outer flame (orange-red)
  for (let i = 0; i < 25; i++) {
    const spread = v3(
      (Math.random() - 0.5) * 2.5,
      (Math.random() - 0.5) * 2.5 + 1,
      (Math.random() - 0.5) * 2.5,
    );
    const vel = dir.clone().multiplyScalar(7).add(spread);
    const c = new THREE.Color().setHSL(0.03 + Math.random() * 0.06, 1, 0.4 + Math.random() * 0.3);
    pool.emit(origin.clone(), vel, c, 0.5 + Math.random() * 0.6, 0.25 + Math.random() * 0.2);
  }
  // Trailing smoke
  for (let i = 0; i < 8; i++) {
    const spread = v3(
      (Math.random() - 0.5) * 1.5,
      Math.random() * 1.5,
      (Math.random() - 0.5) * 1.5,
    );
    const vel = dir.clone().multiplyScalar(3).add(spread);
    pool.emit(origin.clone(), vel, new THREE.Color(0.25, 0.2, 0.15), 0.8 + Math.random() * 0.5, 0.3);
  }
}

function emitIceShards(pool: ParticlePool, origin: THREE.Vector3): void {
  for (let i = 0; i < 25; i++) {
    const vel = v3((Math.random() - 0.5) * 4, Math.random() * 3, (Math.random() - 0.5) * 4);
    const c = new THREE.Color().setHSL(0.55 + Math.random() * 0.05, 0.6, 0.7 + Math.random() * 0.2);
    pool.emit(origin.clone().add(v3(0, 1, 0)), vel, c, 0.8 + Math.random() * 0.4, 0.15);
  }
}

function emitLightning(pool: ParticlePool, from: THREE.Vector3, to: THREE.Vector3): void {
  const dir = to.clone().sub(from);
  const len = dir.length();
  dir.normalize();
  // Main bolt (bright white-blue core)
  for (let i = 0; i < 50; i++) {
    const t = Math.random();
    const pos = from.clone().addScaledVector(dir, t * len);
    // Jagged bolt path
    const jitter = Math.sin(t * 20) * 0.3 + Math.cos(t * 13) * 0.2;
    pos.add(v3((Math.random() - 0.5) * 0.3 + jitter, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.3));
    const vel = v3((Math.random() - 0.5) * 0.8, Math.random() * 0.4, (Math.random() - 0.5) * 0.8);
    const c = new THREE.Color().setHSL(0.65 + Math.random() * 0.05, 0.5, 0.85 + Math.random() * 0.15);
    pool.emit(pos, vel, c, 0.15 + Math.random() * 0.1, 0.12);
  }
  // Branch sparks
  for (let i = 0; i < 20; i++) {
    const t = Math.random();
    const pos = from.clone().addScaledVector(dir, t * len);
    const branchDir = v3((Math.random() - 0.5) * 4, (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 4);
    pool.emit(pos, branchDir, new THREE.Color(0.5, 0.6, 1.0), 0.1 + Math.random() * 0.08, 0.06);
  }
  // Impact glow at target
  for (let i = 0; i < 12; i++) {
    const vel = v3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3);
    pool.emit(to.clone(), vel, new THREE.Color(0.8, 0.85, 1.0), 0.3, 0.15);
  }
}

function emitHealingAura(pool: ParticlePool, center: THREE.Vector3): void {
  for (let i = 0; i < 15; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = 0.5 + Math.random() * 0.5;
    const pos = center.clone().add(v3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
    const vel = v3(0, 1.5 + Math.random(), 0);
    pool.emit(pos, vel, new THREE.Color(0.2, 1, 0.3), 1.0 + Math.random() * 0.5, 0.15);
  }
}

// ---------------------------------------------------------------------------
// Combat effects
// ---------------------------------------------------------------------------

function emitSwordTrail(pool: ParticlePool, origin: THREE.Vector3, dir: THREE.Vector3): void {
  for (let i = 0; i < 8; i++) {
    const pos = origin.clone().add(v3(0, 1.2, 0));
    const vel = dir.clone().multiplyScalar(2).add(v3(
      (Math.random() - 0.5) * 0.5, Math.random() * 0.5, (Math.random() - 0.5) * 0.5,
    ));
    pool.emit(pos, vel, new THREE.Color(0.9, 0.9, 1.0), 0.3, 0.08);
  }
}

function emitImpactSparks(pool: ParticlePool, pos: THREE.Vector3): void {
  for (let i = 0; i < 20; i++) {
    const vel = v3(
      (Math.random() - 0.5) * 6,
      Math.random() * 4,
      (Math.random() - 0.5) * 6,
    );
    const c = new THREE.Color().setHSL(0.1, 1, 0.5 + Math.random() * 0.4);
    pool.emit(pos.clone().add(v3(0, 1, 0)), vel, c, 0.3 + Math.random() * 0.2, 0.05);
  }
}

// ---------------------------------------------------------------------------
// Environmental effects
// ---------------------------------------------------------------------------

function emitRain(pool: ParticlePool, center: THREE.Vector3): void {
  for (let i = 0; i < 10; i++) {
    const pos = center.clone().add(v3(
      (Math.random() - 0.5) * 40,
      15 + Math.random() * 5,
      (Math.random() - 0.5) * 40,
    ));
    pool.emit(pos, v3(0, -12, 0), new THREE.Color(0.5, 0.55, 0.7), 1.5, 0.02);
  }
}

function emitSnow(pool: ParticlePool, center: THREE.Vector3): void {
  for (let i = 0; i < 5; i++) {
    const pos = center.clone().add(v3(
      (Math.random() - 0.5) * 40,
      15 + Math.random() * 5,
      (Math.random() - 0.5) * 40,
    ));
    const vel = v3((Math.random() - 0.5) * 1, -2 - Math.random(), (Math.random() - 0.5) * 1);
    pool.emit(pos, vel, new THREE.Color(0.95, 0.95, 1), 4, 0.06);
  }
}

function emitFallingLeaves(pool: ParticlePool, center: THREE.Vector3): void {
  const pos = center.clone().add(v3(
    (Math.random() - 0.5) * 20,
    5 + Math.random() * 4,
    (Math.random() - 0.5) * 20,
  ));
  const vel = v3((Math.random() - 0.5) * 2, -1, (Math.random() - 0.5) * 2);
  const c = new THREE.Color().setHSL(0.08 + Math.random() * 0.08, 0.7, 0.4);
  pool.emit(pos, vel, c, 3 + Math.random() * 2, 0.1);
}

function emitFireflies(pool: ParticlePool, center: THREE.Vector3): void {
  // More numerous, varied colors (golden to green)
  for (let i = 0; i < 2; i++) {
    const pos = center.clone().add(v3(
      (Math.random() - 0.5) * 20,
      0.3 + Math.random() * 2.5,
      (Math.random() - 0.5) * 20,
    ));
    const vel = v3(
      (Math.random() - 0.5) * 0.6,
      (Math.random() - 0.5) * 0.4,
      (Math.random() - 0.5) * 0.6,
    );
    const hue = 0.2 + Math.random() * 0.15; // yellow-green range
    const c = new THREE.Color().setHSL(hue, 0.9, 0.55 + Math.random() * 0.3);
    pool.emit(pos, vel, c, 2.5 + Math.random() * 3, 0.06 + Math.random() * 0.06);
  }
}

function emitDustMotes(pool: ParticlePool, center: THREE.Vector3): void {
  const pos = center.clone().add(v3(
    (Math.random() - 0.5) * 10,
    0.5 + Math.random() * 3,
    (Math.random() - 0.5) * 10,
  ));
  const vel = v3((Math.random() - 0.5) * 0.3, Math.random() * 0.15, (Math.random() - 0.5) * 0.3);
  pool.emit(pos, vel, new THREE.Color(0.8, 0.75, 0.6), 3 + Math.random() * 2, 0.04);
}

function emitTorchFire(pool: ParticlePool, pos: THREE.Vector3): void {
  // Fire core (bright yellow-white)
  for (let i = 0; i < 2; i++) {
    const p = pos.clone().add(v3((Math.random() - 0.5) * 0.05, 0, (Math.random() - 0.5) * 0.05));
    const vel = v3((Math.random() - 0.5) * 0.15, 1.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.15);
    const c = new THREE.Color().setHSL(0.12 + Math.random() * 0.02, 1, 0.7 + Math.random() * 0.2);
    pool.emit(p, vel, c, 0.3 + Math.random() * 0.2, 0.15);
  }
  // Fire outer (orange-red)
  for (let i = 0; i < 3; i++) {
    const p = pos.clone().add(v3((Math.random() - 0.5) * 0.12, 0, (Math.random() - 0.5) * 0.12));
    const vel = v3((Math.random() - 0.5) * 0.35, 1.2 + Math.random() * 0.8, (Math.random() - 0.5) * 0.35);
    const c = new THREE.Color().setHSL(0.04 + Math.random() * 0.04, 1, 0.45 + Math.random() * 0.2);
    pool.emit(p, vel, c, 0.45 + Math.random() * 0.35, 0.12);
  }
  // Embers / sparks (occasional)
  if (Math.random() < 0.3) {
    const p = pos.clone().add(v3((Math.random() - 0.5) * 0.08, 0.1, (Math.random() - 0.5) * 0.08));
    const vel = v3((Math.random() - 0.5) * 1.5, 2.5 + Math.random() * 2, (Math.random() - 0.5) * 1.5);
    pool.emit(p, vel, new THREE.Color(1, 0.6, 0.1), 0.8 + Math.random() * 0.5, 0.03);
  }
  // Smoke (dark, rises slowly)
  if (Math.random() < 0.15) {
    const p = pos.clone().add(v3((Math.random() - 0.5) * 0.1, 0.3, (Math.random() - 0.5) * 0.1));
    const vel = v3((Math.random() - 0.5) * 0.4, 0.8 + Math.random() * 0.5, (Math.random() - 0.5) * 0.4);
    pool.emit(p, vel, new THREE.Color(0.2, 0.18, 0.15), 1.5 + Math.random(), 0.2);
  }
}

// ---------------------------------------------------------------------------
// 3D health bars & quest markers
// ---------------------------------------------------------------------------

function buildHealthBar(): THREE.Group {
  const g = new THREE.Group();
  const bg = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.1), new THREE.MeshBasicMaterial({ color: 0x220000, side: THREE.DoubleSide }));
  g.add(bg);
  const fg = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.07), new THREE.MeshBasicMaterial({ color: 0xcc2222, side: THREE.DoubleSide }));
  fg.position.z = 0.001; fg.name = "healthFill"; g.add(fg);
  return g;
}

function updateHealthBar(bar: THREE.Group, hpRatio: number, camera: THREE.Camera): void {
  const fill = bar.getObjectByName("healthFill") as THREE.Mesh | undefined;
  if (fill) {
    fill.scale.x = Math.max(0, Math.min(hpRatio, 1));
    fill.position.x = -(1 - hpRatio) * 0.48;
    const mat = fill.material as THREE.MeshBasicMaterial;
    mat.color.setHex(hpRatio > 0.5 ? 0x22cc22 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222);
  }
  bar.lookAt(camera.position);
}

function buildQuestMarker(): THREE.Group {
  const g = new THREE.Group();
  const d = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 0),
    new THREE.MeshStandardMaterial({ color: 0xffdd00, emissive: 0xffaa00, emissiveIntensity: 1.5 }));
  g.add(d);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.5, 4),
    new THREE.MeshStandardMaterial({ color: 0xffdd00 }));
  p.position.y = -0.35; g.add(p);
  return g;
}

// ============================================================================
// ArthurianRPGRenderer – Main renderer class
// ============================================================================

export class ArthurianRPGRenderer {
  // Core Three.js
  private renderer!: THREE.WebGLRenderer;
  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private composer!: EffectComposer;
  private canvas!: HTMLCanvasElement;

  // Camera system
  private cameraMode = CameraMode.ThirdPerson;
  private cameraYaw = 0;
  private cameraPitch = -0.3;
  private cameraDistance = 5;
  private cameraTarget = new THREE.Vector3();
  private cameraCurrentPos = new THREE.Vector3();
  private headBobPhase = 0;
  private cameraTransitionT = 1; // 1 = fully transitioned
  private cameraPrevPos = new THREE.Vector3();
  private cameraPrevTarget = new THREE.Vector3();

  // Lighting
  private sunLight!: THREE.DirectionalLight;
  private moonLight!: THREE.DirectionalLight;
  private ambientLight!: THREE.AmbientLight;
  private torchLights: THREE.PointLight[] = [];

  // Sky
  private skySystem!: ReturnType<typeof buildSkyDome>;
  private clouds!: THREE.Group;

  // World
  private terrain!: ReturnType<typeof buildTerrain>;
  private water!: THREE.Mesh;
  private fog!: THREE.FogExp2;

  // Entities
  private playerMesh: THREE.Group | null = null;
  private playerSkeleton: THREE.Skeleton | null = null;
  private playerAnim: AnimState = {
    phase: 0, action: "idle", blendFactor: 1,
    prevAction: "idle", blendTimer: 0, moveSpeed: 0,
  };
  private playerPrevPos = new THREE.Vector3();
  private playerLastHp = -1;
  private enemyMeshes = new Map<string, THREE.Group>();
  private enemyHealthBars = new Map<string, THREE.Group>();
  private enemySkeletons = new Map<string, THREE.Skeleton>();
  private enemyAnims = new Map<string, AnimState>();
  private enemyPrevPos = new Map<string, THREE.Vector3>();
  private enemyPrevHp = new Map<string, number>();
  private companionMeshes = new Map<string, THREE.Group>();

  // Particles
  private particles!: ParticlePool;
  private envTimer = 0;

  // Timers
  private totalTime = 0;

  // Post-processing
  private bloomPass!: UnrealBloomPass;
  private colorGradingPass!: ShaderPass;
  private godRaysPass!: ShaderPass;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  build(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // Renderer – high quality settings
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "high-performance",
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    // Scene
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x88aacc, 0.0028);
    this.scene.fog = this.fog;

    // Environment map for reflections (procedural)
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    pmremGenerator.compileEquirectangularShader();
    const envScene = new THREE.Scene();
    envScene.background = new THREE.Color(0x88aacc);
    const envLight = new THREE.HemisphereLight(0x88aacc, 0x445522, 1.0);
    envScene.add(envLight);
    const envRT = pmremGenerator.fromScene(envScene, 0.04);
    this.scene.environment = envRT.texture;
    pmremGenerator.dispose();

    // Camera – slightly narrower FOV for cinematic feel
    this.camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 1400);
    this.camera.position.set(0, 5, 10);

    // Lighting
    this.setupLighting();

    // Sky
    this.skySystem = buildSkyDome();
    this.scene.add(this.skySystem.dome);
    this.scene.add(this.skySystem.stars);
    this.clouds = buildClouds();
    this.scene.add(this.clouds);

    // Terrain
    this.terrain = buildTerrain();
    this.scene.add(this.terrain.mesh);

    // Water
    this.water = buildWater();
    this.scene.add(this.water);

    // World features
    this.populateWorld();

    // Particles
    this.particles = new ParticlePool(MAX_PARTICLES);
    this.scene.add(this.particles.points);

    // Post-processing
    this.setupPostProcessing();
  }

  // ---------------------------------------------------------------------------
  // Lighting setup
  // ---------------------------------------------------------------------------

  private setupLighting(): void {
    // Sun – higher quality shadows
    this.sunLight = new THREE.DirectionalLight(0xffe8c0, 1.6);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 300;
    this.sunLight.shadow.camera.left = -100;
    this.sunLight.shadow.camera.right = 100;
    this.sunLight.shadow.camera.top = 100;
    this.sunLight.shadow.camera.bottom = -100;
    this.sunLight.shadow.bias = -0.0004;
    this.sunLight.shadow.normalBias = 0.025;
    this.sunLight.shadow.radius = 2; // softer shadow edges
    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Moon – slightly stronger for better night visibility
    this.moonLight = new THREE.DirectionalLight(0x7788bb, 0.25);
    this.moonLight.position.set(-30, 50, -20);
    this.moonLight.castShadow = true;
    this.moonLight.shadow.mapSize.set(1024, 1024);
    this.moonLight.shadow.camera.near = 0.5;
    this.moonLight.shadow.camera.far = 200;
    this.moonLight.shadow.camera.left = -60;
    this.moonLight.shadow.camera.right = 60;
    this.moonLight.shadow.camera.top = 60;
    this.moonLight.shadow.camera.bottom = -60;
    this.moonLight.shadow.bias = -0.001;
    this.scene.add(this.moonLight);

    // Hemisphere light for more realistic ambient (sky blue from above, earth brown from below)
    const hemiLight = new THREE.HemisphereLight(0x88aacc, 0x445522, 0.25);
    this.scene.add(hemiLight);

    // Ambient – softer base
    this.ambientLight = new THREE.AmbientLight(0x334466, 0.2);
    this.scene.add(this.ambientLight);

    // Torches / campfires at key locations – more warm light sources
    const torchPositions = [
      v3(5, 2.5, -2), v3(-5, 2.5, -2),   // castle entrance
      v3(8, 2.5, 0), v3(-8, 2.5, 0),     // castle courtyard
      v3(50, 2, 30), v3(52, 2, 30),       // village area
      v3(45, 2, 28), v3(60, 2, 35),       // more village lights
      v3(-30, 3, -40),                     // ruins
      v3(-50, 3, -20),                     // cave entrance
    ];
    for (const pos of torchPositions) {
      const light = new THREE.PointLight(0xff8833, 1.8, 18);
      light.position.copy(pos);
      light.castShadow = false; // performance
      this.scene.add(light);
      this.torchLights.push(light);

      // Add a small mesh for the torch holder
      const torchPole = new THREE.Mesh(
        new THREE.CylinderGeometry(0.02, 0.025, 0.8, 6),
        new THREE.MeshStandardMaterial({ color: 0x553311, roughness: 0.9 }),
      );
      torchPole.position.copy(pos).add(v3(0, -0.4, 0));
      torchPole.castShadow = true;
      this.scene.add(torchPole);
    }
  }

  // ---------------------------------------------------------------------------
  // World population
  // ---------------------------------------------------------------------------

  private populateWorld(): void {
    // Camelot castle at origin
    const castle = buildCamelotCastle();
    castle.position.set(0, this.terrain.getHeight(0, 0), 0);
    this.scene.add(castle);

    // Village houses
    for (let i = 0; i < 8; i++) {
      const x = 40 + (i % 4) * 10, z = 25 + Math.floor(i / 4) * 15;
      const h = buildVillageHouse(i * 7 + 13);
      h.position.set(x, this.terrain.getHeight(x, z), z); h.rotation.y = seededRandom(i * 31) * Math.PI * 2;
      this.scene.add(h);
    }
    // Ruins
    for (let i = 0; i < 3; i++) {
      const x = -30 + i * 25, z = -40 - i * 10, r = buildRuin();
      r.position.set(x, this.terrain.getHeight(x, z), z); this.scene.add(r);
    }
    // Shrines
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2, x = Math.cos(a) * 60, z = Math.sin(a) * 60;
      const s = buildShrine(); s.position.set(x, this.terrain.getHeight(x, z), z); this.scene.add(s);
    }
    // Cave entrance
    const cave = buildCaveEntrance();
    cave.position.set(-50, this.terrain.getHeight(-50, -20), -20); cave.rotation.y = Math.PI * 0.3;
    this.scene.add(cave);

    // Trees (denser for richer world)
    for (let i = 0; i < 350; i++) {
      const x = (seededRandom(i * 3) - 0.5) * TERRAIN_SIZE * 0.8;
      const z = (seededRandom(i * 3 + 1) - 0.5) * TERRAIN_SIZE * 0.8;
      const h = this.terrain.getHeight(x, z);
      if (h < WATER_LEVEL + 1 || h > 15 || Math.sqrt(x * x + z * z) < 15) continue;
      const t = buildTree(i * 17); t.position.set(x, h, z); this.scene.add(t);
    }
    // Bushes (more vegetation)
    for (let i = 0; i < 180; i++) {
      const x = (seededRandom(i * 5 + 900) - 0.5) * TERRAIN_SIZE * 0.6;
      const z = (seededRandom(i * 5 + 901) - 0.5) * TERRAIN_SIZE * 0.6;
      const h = this.terrain.getHeight(x, z);
      if (h < WATER_LEVEL + 0.5 || h > 12) continue;
      const b = buildBush(); b.position.set(x, h, z); this.scene.add(b);
    }
    // Grass patches (denser ground cover)
    for (let i = 0; i < 250; i++) {
      const x = (seededRandom(i * 7 + 2000) - 0.5) * TERRAIN_SIZE * 0.5;
      const z = (seededRandom(i * 7 + 2001) - 0.5) * TERRAIN_SIZE * 0.5;
      const h = this.terrain.getHeight(x, z);
      if (h < WATER_LEVEL + 0.5 || h > 10) continue;
      const gp = buildGrassPatch(); gp.position.set(x, h, z); this.scene.add(gp);
    }

    // Key NPCs: Arthur and Merlin near the castle
    const arthur = buildArthurMesh(); arthur.position.set(3, this.terrain.getHeight(3, 5), 5);
    arthur.name = "npc_arthur"; this.scene.add(arthur);
    const am = buildQuestMarker(); am.position.set(3, this.terrain.getHeight(3, 5) + 2.5, 5); this.scene.add(am);
    const merlin = buildMerlinMesh(); merlin.position.set(-4, this.terrain.getHeight(-4, 6), 6);
    merlin.name = "npc_merlin"; this.scene.add(merlin);
  }

  // ---------------------------------------------------------------------------
  // Post-processing
  // ---------------------------------------------------------------------------

  private setupPostProcessing(): void {
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));

    // Bloom for magical glow – tuned for cinematic quality
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.55,  // strength
      0.5,   // radius (wider bloom spread for softer glow)
      0.65,  // threshold (catch bright emissives)
    );
    this.composer.addPass(this.bloomPass);

    // God rays (volumetric light scattering)
    this.godRaysPass = new ShaderPass(GodRaysShader);
    this.godRaysPass.uniforms.exposure.value = 0.12;
    this.godRaysPass.uniforms.decay.value = 0.97;
    this.godRaysPass.uniforms.density.value = 0.7;
    this.godRaysPass.uniforms.weight.value = 0.3;
    this.composer.addPass(this.godRaysPass);

    // Color grading + vignette + film grain
    this.colorGradingPass = new ShaderPass(ColorGradingShader);
    this.composer.addPass(this.colorGradingPass);
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(state: ArthurianRPGState, dt: number): void {
    this.totalTime += dt;
    this.envTimer += dt;

    // --- Day/night cycle ---
    this.updateDayNight(state.worldTime);

    // --- Water animation ---
    animateWater(this.water, this.totalTime);

    // --- Cloud drift ---
    this.clouds.rotation.y += dt * 0.002;

    // --- Torch flicker ---
    for (const t of this.torchLights) {
      t.intensity = 1.2 + Math.sin(this.totalTime * TORCH_FLICKER_SPEED + t.position.x) * 0.4;
      emitTorchFire(this.particles, t.position);
    }

    // --- Wind on grass ---
    // (grass patches sway is implicit via scene children that are grass)

    // --- Player ---
    this.updatePlayer(state, dt);

    // --- Enemies ---
    this.updateEnemies(state, dt);

    // --- Companions ---
    this.updateCompanions(state, dt);

    // --- Environmental particles ---
    if (this.envTimer > 0.1) {
      this.envTimer = 0;
      const playerPos = stateToV3(state.player.combatant.position);
      // fireflies at night
      if (state.worldTime > 20 || state.worldTime < 5) {
        emitFireflies(this.particles, playerPos);
      }
      // falling leaves in forest areas
      emitFallingLeaves(this.particles, playerPos);
      // dust motes in sunlight during daytime
      if (state.worldTime > 8 && state.worldTime < 18) {
        emitDustMotes(this.particles, playerPos);
      }
      // determine weather by terrain height
      const pH = this.terrain.getHeight(playerPos.x, playerPos.z);
      if (pH > 14) {
        emitSnow(this.particles, playerPos);
      } else if (state.worldTime > 15 && state.worldTime < 20) {
        // evening rain chance
        emitRain(this.particles, playerPos);
      }
    }

    // --- Quest markers bob ---
    this.scene.traverse((child) => {
      if (child.name === "" && child instanceof THREE.Group) {
        // quest markers contain octahedron children, animate them
        const oct = child.children.find(
          (c) => c instanceof THREE.Mesh && (c as THREE.Mesh).geometry instanceof THREE.OctahedronGeometry,
        );
        if (oct) {
          oct.rotation.y = this.totalTime * 2;
          oct.position.y = Math.sin(this.totalTime * 3) * 0.1;
        }
      }
    });

    // --- Particles ---
    this.particles.update(dt);

    // --- Camera ---
    this.updateCamera(state, dt);

    // --- Dynamic fog density based on environment ---
    const pPos = stateToV3(state.player.combatant.position);
    const playerH = this.terrain.getHeight(pPos.x, pPos.z);
    // Dense forest fog
    if (playerH > 3 && playerH < 10) {
      this.fog.density = lerp(this.fog.density, 0.009, dt * 1.5);
    }
    // Near water: misty
    else if (playerH < WATER_LEVEL + 1.5) {
      this.fog.density = lerp(this.fog.density, 0.007, dt * 1.5);
    }
    // Mountain: thin, clear air
    else if (playerH > 12) {
      this.fog.density = lerp(this.fog.density, 0.0015, dt * 2);
    }
    // Default open terrain
    else {
      this.fog.density = lerp(this.fog.density, 0.0028, dt * 2);
    }
    // Time-of-day fog: denser at dawn/dusk
    const timeT = state.worldTime / 24;
    const dawnDusk = Math.max(
      Math.exp(-Math.pow((timeT - 0.25) * 10, 2)),
      Math.exp(-Math.pow((timeT - 0.75) * 10, 2)),
    );
    this.fog.density += dawnDusk * 0.003;

    // --- Render ---
    this.composer.render();
  }

  // ---------------------------------------------------------------------------
  // Day/night cycle
  // ---------------------------------------------------------------------------

  private updateDayNight(worldTime: number): void {
    this.skySystem.update(worldTime);

    const t = worldTime / 24; // 0..1
    const sunAngle = (t - 0.25) * Math.PI * 2;
    const sunY = Math.sin(sunAngle);

    // Sun position & intensity
    this.sunLight.position.set(
      Math.cos(sunAngle) * 80,
      Math.max(sunY, 0) * 80 + 5,
      Math.cos(sunAngle) * 30,
    );
    this.sunLight.intensity = Math.max(sunY, 0) * 1.5;

    // Sun color shift during sunrise/sunset
    const absSunY = Math.abs(sunY);
    if (absSunY < 0.3) {
      const orangeFactor = 1 - absSunY / 0.3;
      this.sunLight.color.setRGB(
        1,
        lerp(0.91, 0.6, orangeFactor),
        lerp(0.75, 0.2, orangeFactor),
      );
    } else {
      this.sunLight.color.setHex(0xffe8c0);
    }

    // Moon
    this.moonLight.position.set(
      -Math.cos(sunAngle) * 60,
      Math.max(-sunY, 0.1) * 50,
      -Math.cos(sunAngle) * 20,
    );
    this.moonLight.intensity = Math.max(-sunY, 0) * 0.3;

    // Ambient
    const dayness = Math.max(sunY, 0);
    this.ambientLight.intensity = lerp(0.08, 0.35, dayness);
    this.ambientLight.color.setRGB(
      lerp(0.15, 0.3, dayness),
      lerp(0.15, 0.3, dayness),
      lerp(0.25, 0.4, dayness),
    );

    // Fog color
    const fogR = lerp(0.05, 0.53, dayness);
    const fogG = lerp(0.05, 0.67, dayness);
    const fogB = lerp(0.1, 0.8, dayness);
    this.fog.color.setRGB(fogR, fogG, fogB);

    // Renderer background matches fog
    this.renderer.setClearColor(this.fog.color, 1);

    // Tone mapping exposure – wider dynamic range
    this.renderer.toneMappingExposure = lerp(0.35, 1.15, dayness);

    // Update post-processing uniforms for time-of-day
    if (this.colorGradingPass) {
      this.colorGradingPass.uniforms.timeOfDay.value = t;
      // Increase vignette at night for moody atmosphere
      this.colorGradingPass.uniforms.vignetteStrength.value = lerp(0.65, 0.5, dayness);
      // More film grain at night
      this.colorGradingPass.uniforms.filmGrain.value = lerp(0.05, 0.025, dayness);
    }

    // God rays: project sun position to screen space
    if (this.godRaysPass) {
      const sunWorldPos = this.sunLight.position.clone();
      const sunScreenPos = sunWorldPos.project(this.camera);
      this.godRaysPass.uniforms.lightPosition.value.set(
        sunScreenPos.x * 0.5 + 0.5,
        sunScreenPos.y * 0.5 + 0.5,
      );
      // Only show god rays when sun is visible and in front of camera
      const sunVisible = sunY > 0.05 && sunScreenPos.z < 1;
      this.godRaysPass.uniforms.exposure.value = sunVisible ? lerp(0.0, 0.15, dayness) : 0.0;
    }
  }

  // ---------------------------------------------------------------------------
  // Player update
  // ---------------------------------------------------------------------------

  private updatePlayer(state: ArthurianRPGState, dt: number): void {
    const pc = state.player.combatant;
    const pos = stateToV3(pc.position);
    pos.y = this.terrain.getHeight(pos.x, pos.z);

    // Create or update player mesh
    if (!this.playerMesh) {
      const classKey = this.inferClass(pc);
      const look = CLASS_LOOKS[classKey] || CLASS_LOOKS.knight;
      this.playerMesh = buildCharacterMesh(look);
      this.playerSkeleton = buildHumanoidSkeleton();
      this.scene.add(this.playerMesh);
      this.playerPrevPos.copy(pos);
      this.playerLastHp = pc.hp;
    }

    this.playerMesh.position.copy(pos);

    // Compute movement velocity for animation detection
    const dx = pos.x - this.playerPrevPos.x;
    const dz = pos.z - this.playerPrevPos.z;
    const moveDistSq = dx * dx + dz * dz;
    const moveSpeed = dt > 0 ? Math.sqrt(moveDistSq) / dt : 0;
    this.playerPrevPos.copy(pos);
    this.playerAnim.moveSpeed = moveSpeed;

    // Detect HP loss for hit reaction
    const tookDamage = this.playerLastHp > 0 && pc.hp < this.playerLastHp;
    this.playerLastHp = pc.hp;

    // Determine desired animation state with proper transitions
    let desiredAction: AnimState["action"] = "idle";
    if (pc.hp <= 0) {
      desiredAction = "death";
    } else if (tookDamage && this.playerAnim.action !== "death") {
      desiredAction = "hit";
    } else if (pc.isBlocking) {
      desiredAction = "block";
    } else if (state.player.combat.cooldowns["attack"] !== undefined && state.player.combat.cooldowns["attack"] > 0.2) {
      desiredAction = "attack";
    } else if (moveSpeed > 5) {
      desiredAction = "run";
    } else if (moveSpeed > 0.5) {
      desiredAction = "walk";
    }

    // Handle hit reaction: after 0.5s, recover to previous state
    if (this.playerAnim.action === "hit" && this.playerAnim.phase > 0.5) {
      desiredAction = moveSpeed > 0.5 ? "walk" : "idle";
    }

    // Transition with crossfade blending
    transitionAnimState(this.playerAnim, desiredAction);

    this.playerAnim.phase += dt;

    if (this.playerSkeleton) {
      // LOD: compute distance from camera to player
      const camDist = this.camera.position.distanceTo(pos);
      applyProceduralAnimation(this.playerSkeleton, this.playerAnim, dt, camDist);
    }

    // Spell/combat particle triggers based on state
    if (pc.primaryElement === ElementalType.Fire) {
      if (Math.random() < 0.05) {
        emitFireball(this.particles, pos.clone().add(v3(0, 1.5, 0)), v3(0, 0, 1));
      }
    }
  }

  private inferClass(c: CombatantState): string {
    const skills = c.skills;
    if (skills.destruction > 15 || skills.restoration > 15) return "mage";
    if (skills.stealth > 15) return "rogue";
    if (skills.lightArmor > 15) return "ranger";
    if (c.primaryElement === ElementalType.Holy) return "paladin";
    if (skills.alchemy > 15 || skills.enchanting > 15) return "druid";
    return "knight";
  }

  // ---------------------------------------------------------------------------
  // Enemy update
  // ---------------------------------------------------------------------------

  private updateEnemies(state: ArthurianRPGState, dt: number): void {
    const alive = new Set<string>();

    for (const enemy of state.enemies) {
      alive.add(enemy.id);
      const pos = stateToV3(enemy.position);
      pos.y = this.terrain.getHeight(pos.x, pos.z);

      if (!this.enemyMeshes.has(enemy.id)) {
        // determine enemy type from name
        const type = this.inferEnemyType(enemy.name);
        const look = ENEMY_LOOKS[type] || ENEMY_LOOKS.bandit;
        const mesh = buildEnemyMesh(look);
        mesh.name = `enemy_${enemy.id}`;
        this.scene.add(mesh);
        this.enemyMeshes.set(enemy.id, mesh);

        // Build skeleton for humanoid-shaped enemies
        if (look.shape === "humanoid" || look.shape === "armored" || look.shape === "boss_humanoid") {
          const skeleton = buildHumanoidSkeleton();
          this.enemySkeletons.set(enemy.id, skeleton);
          this.enemyAnims.set(enemy.id, {
            phase: 0, action: "idle", blendFactor: 1,
            prevAction: "idle", blendTimer: 0, moveSpeed: 0,
          });
        }

        this.enemyPrevPos.set(enemy.id, pos.clone());
        this.enemyPrevHp.set(enemy.id, enemy.hp);

        // health bar
        const hb = buildHealthBar();
        this.scene.add(hb);
        this.enemyHealthBars.set(enemy.id, hb);
      }

      const mesh = this.enemyMeshes.get(enemy.id)!;
      mesh.position.copy(pos);

      // face player
      const pPos = stateToV3(state.player.combatant.position);
      const lookDir = pPos.clone().sub(pos);
      lookDir.y = 0;
      if (lookDir.lengthSq() > 0.01) {
        mesh.rotation.y = Math.atan2(lookDir.x, lookDir.z);
      }

      // Compute distance to camera for LOD
      const camDist = this.camera.position.distanceTo(pos);

      // Animate enemy with skeletal animation if available
      const skeleton = this.enemySkeletons.get(enemy.id);
      const anim = this.enemyAnims.get(enemy.id);
      if (skeleton && anim) {
        // Movement detection
        const prevP = this.enemyPrevPos.get(enemy.id)!;
        const edx = pos.x - prevP.x;
        const edz = pos.z - prevP.z;
        const eMoveSpeed = dt > 0 ? Math.sqrt(edx * edx + edz * edz) / dt : 0;
        prevP.copy(pos);
        anim.moveSpeed = eMoveSpeed;

        // Damage detection
        const prevHp = this.enemyPrevHp.get(enemy.id) ?? enemy.hp;
        const tookDamage = prevHp > 0 && enemy.hp < prevHp;
        this.enemyPrevHp.set(enemy.id, enemy.hp);

        // Determine animation
        let desiredAction: AnimState["action"] = "idle";
        if (enemy.hp <= 0) {
          desiredAction = "death";
        } else if (tookDamage && anim.action !== "death") {
          desiredAction = "hit";
        } else if (enemy.isBlocking) {
          desiredAction = "block";
        } else if (eMoveSpeed > 2) {
          desiredAction = "walk";
        } else if (eMoveSpeed > 0.3) {
          desiredAction = "walk";
        }

        // Hit recovery
        if (anim.action === "hit" && anim.phase > 0.5) {
          desiredAction = eMoveSpeed > 0.3 ? "walk" : "idle";
        }

        transitionAnimState(anim, desiredAction);
        anim.phase += dt;
        applyProceduralAnimation(skeleton, anim, dt, camDist);
      } else {
        // Fallback: simple idle bob for non-skeletal enemies
        if (enemy.hp > 0) {
          mesh.position.y += Math.sin(this.totalTime * 2 + enemy.id.charCodeAt(0)) * 0.03;
        }
      }

      // health bar
      const hb = this.enemyHealthBars.get(enemy.id)!;
      const barHeight = (ENEMY_LOOKS[this.inferEnemyType(enemy.name)]?.scale ?? 1) * 2.2;
      hb.position.copy(pos).add(v3(0, barHeight, 0));
      updateHealthBar(hb, enemy.hp / enemy.maxHp, this.camera);
      hb.visible = enemy.hp > 0 && enemy.hp < enemy.maxHp;
    }

    // Remove dead/gone enemies
    for (const [id, mesh] of this.enemyMeshes) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        this.enemyMeshes.delete(id);
        this.enemySkeletons.delete(id);
        this.enemyAnims.delete(id);
        this.enemyPrevPos.delete(id);
        this.enemyPrevHp.delete(id);
        const hb = this.enemyHealthBars.get(id);
        if (hb) {
          this.scene.remove(hb);
          this.enemyHealthBars.delete(id);
        }
      }
    }
  }

  private inferEnemyType(name: string): string {
    const n = name.toLowerCase();
    if (n.includes("mordred") || n.includes("traitor")) return "mordred";
    if (n.includes("morgan") || n.includes("le fay")) return "morgan";
    if (n.includes("green knight")) return "green_knight";
    if (n.includes("dragon whelp")) return "dragon_whelp";
    if (n.includes("dragon")) return "dragon";
    if (n.includes("black knight") || n.includes("dark knight")) return "blackknight";
    if (n.includes("fae knight") || n.includes("fey knight")) return "fae_knight";
    if (n.includes("enchanted armor") || n.includes("animated armor")) return "enchanted_armor";
    if (n.includes("wraith") || n.includes("barrow")) return "wraith";
    if (n.includes("saxon champion")) return "saxon_champion";
    if (n.includes("saxon archer")) return "saxon_archer";
    if (n.includes("saxon")) return "saxon";
    if (n.includes("bandit archer")) return "bandit_archer";
    if (n.includes("wolf")) return "wolf";
    if (n.includes("bear") || n.includes("cave bear")) return "bear";
    if (n.includes("boar")) return "boar";
    if (n.includes("troll")) return "troll";
    if (n.includes("skeleton") || n.includes("undead") || n.includes("restless")) return "skeleton";
    if (n.includes("giant")) return "giant";
    if (n.includes("spider")) return "spider";
    return "bandit";
  }

  // ---------------------------------------------------------------------------
  // Companion update
  // ---------------------------------------------------------------------------

  private updateCompanions(state: ArthurianRPGState, _dt: number): void {
    const alive = new Set<string>();

    for (const comp of state.companions) {
      alive.add(comp.id);
      const pos = stateToV3(comp.position);
      pos.y = this.terrain.getHeight(pos.x, pos.z);

      if (!this.companionMeshes.has(comp.id)) {
        const classKey = this.inferClass(comp);
        const look = CLASS_LOOKS[classKey] || CLASS_LOOKS.knight;
        const mesh = buildCharacterMesh(look, 0.95);
        mesh.name = `companion_${comp.id}`;
        this.scene.add(mesh);
        this.companionMeshes.set(comp.id, mesh);
      }

      const mesh = this.companionMeshes.get(comp.id)!;
      mesh.position.copy(pos);
    }

    for (const [id, mesh] of this.companionMeshes) {
      if (!alive.has(id)) {
        this.scene.remove(mesh);
        this.companionMeshes.delete(id);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Camera system
  // ---------------------------------------------------------------------------

  private updateCamera(state: ArthurianRPGState, dt: number): void {
    const playerPos = stateToV3(state.player.combatant.position);
    playerPos.y = this.terrain.getHeight(playerPos.x, playerPos.z);

    const targetPoint = playerPos.clone().add(v3(0, 1.6, 0)); // eye level

    if (this.cameraTransitionT < 1) {
      this.cameraTransitionT = Math.min(this.cameraTransitionT + dt * 2.5, 1);
    }

    let desiredPos: THREE.Vector3;
    let desiredTarget: THREE.Vector3;

    if (this.cameraMode === CameraMode.ThirdPerson) {
      // Over-shoulder orbit
      const offsetX = Math.sin(this.cameraYaw) * this.cameraDistance;
      const offsetZ = Math.cos(this.cameraYaw) * this.cameraDistance;
      const offsetY = Math.sin(this.cameraPitch) * this.cameraDistance + 2;
      desiredPos = playerPos.clone().add(v3(offsetX, offsetY, offsetZ));
      desiredTarget = targetPoint;

      // Prevent camera going below terrain
      const camTerrainH = this.terrain.getHeight(desiredPos.x, desiredPos.z);
      if (desiredPos.y < camTerrainH + 0.5) {
        desiredPos.y = camTerrainH + 0.5;
      }
    } else {
      // First person: at eye level
      const forward = v3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
      desiredPos = targetPoint.clone();

      // head bob while moving
      this.headBobPhase += dt * 8;
      const bobY = Math.sin(this.headBobPhase) * 0.04;
      const bobX = Math.cos(this.headBobPhase * 0.5) * 0.02;
      desiredPos.y += bobY;
      desiredPos.x += bobX;

      desiredTarget = desiredPos.clone().add(forward).add(v3(0, Math.sin(this.cameraPitch) * 2, 0));
    }

    // Smooth transition between modes via lerp
    if (this.cameraTransitionT < 1) {
      const t = this.smoothStep(this.cameraTransitionT);
      this.cameraCurrentPos.lerpVectors(this.cameraPrevPos, desiredPos, t);
      this.cameraTarget.lerpVectors(this.cameraPrevTarget, desiredTarget, t);
    } else {
      // smooth follow
      this.cameraCurrentPos.lerp(desiredPos, 1 - Math.exp(-8 * dt));
      this.cameraTarget.lerp(desiredTarget, 1 - Math.exp(-10 * dt));
    }

    this.camera.position.copy(this.cameraCurrentPos);
    this.camera.lookAt(this.cameraTarget);

    // Update shadow camera to follow player
    this.sunLight.target.position.copy(playerPos);
    this.sunLight.target.updateMatrixWorld();
  }

  private smoothStep(t: number): number {
    return t * t * (3 - 2 * t);
  }

  // ---------------------------------------------------------------------------
  // Public camera controls
  // ---------------------------------------------------------------------------

  toggleCameraMode(): void {
    this.cameraPrevPos.copy(this.cameraCurrentPos);
    this.cameraPrevTarget.copy(this.cameraTarget);
    this.cameraTransitionT = 0;

    if (this.cameraMode === CameraMode.ThirdPerson) {
      this.cameraMode = CameraMode.FirstPerson;
    } else {
      this.cameraMode = CameraMode.ThirdPerson;
    }
  }

  onMouseMove(dx: number, dy: number): void {
    const sensitivity = 0.003;
    this.cameraYaw += dx * sensitivity;
    this.cameraPitch = Math.max(-1.2, Math.min(0.8, this.cameraPitch - dy * sensitivity));

    // rotate player mesh to face camera direction in first person
    if (this.playerMesh && this.cameraMode === CameraMode.FirstPerson) {
      this.playerMesh.rotation.y = this.cameraYaw;
    }
  }

  onScroll(delta: number): void {
    if (this.cameraMode === CameraMode.ThirdPerson) {
      this.cameraDistance = Math.max(2, Math.min(15, this.cameraDistance + delta * 0.5));
    }
  }

  // ---------------------------------------------------------------------------
  // Public: spell/combat effect triggers
  // ---------------------------------------------------------------------------

  triggerSpellEffect(type: ElementalType, origin: Vec3, target?: Vec3): void {
    const o = stateToV3(origin).add(v3(0, 1.2, 0));
    switch (type) {
      case ElementalType.Fire: {
        const dir = target ? stateToV3(target).sub(o).normalize() : v3(0, 0, 1);
        emitFireball(this.particles, o, dir);
        break;
      }
      case ElementalType.Ice:
        emitIceShards(this.particles, o);
        break;
      case ElementalType.Lightning: {
        const t = target ? stateToV3(target).add(v3(0, 1, 0)) : o.clone().add(v3(0, 5, 0));
        emitLightning(this.particles, o, t);
        break;
      }
      case ElementalType.Holy:
        emitHealingAura(this.particles, o);
        break;
      default:
        emitImpactSparks(this.particles, o);
    }
  }

  triggerCombatEffect(type: "slash" | "impact", origin: Vec3, direction?: Vec3): void {
    const o = stateToV3(origin);
    if (type === "slash") {
      const dir = direction ? stateToV3(direction).normalize() : v3(0, 0, 1);
      emitSwordTrail(this.particles, o, dir);
    } else {
      emitImpactSparks(this.particles, o);
    }
  }

  // ---------------------------------------------------------------------------
  // Resize
  // ---------------------------------------------------------------------------

  resize(w: number, h: number): void {
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
    this.composer.setSize(w, h);
    this.bloomPass.resolution.set(w, h);
  }

  // ---------------------------------------------------------------------------
  // Destroy
  // ---------------------------------------------------------------------------

  destroy(): void {
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
        mats.forEach((m) => m.dispose());
      }
      if (obj instanceof THREE.Points) { obj.geometry.dispose(); (obj.material as THREE.Material).dispose(); }
    });
    this.composer.dispose(); this.renderer.dispose();
    this.enemyMeshes.clear(); this.enemyHealthBars.clear();
    this.enemySkeletons.clear(); this.enemyAnims.clear();
    this.enemyPrevPos.clear(); this.enemyPrevHp.clear();
    this.companionMeshes.clear();
    this.playerMesh = null; this.playerSkeleton = null;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  /** Expose terrain height for external systems (movement, AI, etc.). */
  getTerrainHeight(x: number, z: number): number {
    return this.terrain.getHeight(x, z);
  }

  /** Return the world-space size of the terrain (square, centered at origin). */
  getTerrainSize(): number {
    return TERRAIN_SIZE;
  }

  /** Return the water surface Y level. */
  getWaterLevel(): number {
    return WATER_LEVEL;
  }
}
