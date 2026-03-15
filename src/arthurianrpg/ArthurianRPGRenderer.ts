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
const MAX_PARTICLES = 5000;
const TORCH_FLICKER_SPEED = 8;

// ---------------------------------------------------------------------------
// Color grading + vignette shader
// ---------------------------------------------------------------------------

const ColorGradingShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    warmth: { value: 0.15 },
    vignetteStrength: { value: 0.5 },
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
    varying vec2 vUv;
    void main() {
      vec4 col = texture2D(tDiffuse, vUv);
      // warm medieval tones with subtle contrast boost
      col.r += warmth * 0.6;
      col.g += warmth * 0.3;
      col.b -= warmth * 0.15;
      // Slight contrast enhancement
      col.rgb = (col.rgb - 0.5) * 1.08 + 0.5;
      // Subtle desaturation for cinematic feel
      float lum = dot(col.rgb, vec3(0.299, 0.587, 0.114));
      col.rgb = mix(vec3(lum), col.rgb, 0.92);
      // vignette (smoother, more cinematic)
      vec2 c = vUv - 0.5;
      float dist = length(c);
      col.rgb *= 1.0 - vignetteStrength * smoothstep(0.25, 0.9, dist);
      gl_FragColor = col;
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
  scale: number;
  shape: "humanoid" | "quadruped" | "large" | "arachnid";
  eyeColor: number;
}

const ENEMY_LOOKS: Record<string, EnemyAppearance> = {
  bandit:       { bodyColor: 0x665544, scale: 1.0, shape: "humanoid", eyeColor: 0xffaa00 },
  wolf:         { bodyColor: 0x555555, scale: 0.7, shape: "quadruped", eyeColor: 0xffff00 },
  dragon:       { bodyColor: 0x882222, scale: 4.0, shape: "large", eyeColor: 0xff4400 },
  troll:        { bodyColor: 0x447744, scale: 2.0, shape: "humanoid", eyeColor: 0x88ff44 },
  skeleton:     { bodyColor: 0xddddaa, scale: 1.0, shape: "humanoid", eyeColor: 0x44ffff },
  blackknight:  { bodyColor: 0x111111, scale: 1.2, shape: "humanoid", eyeColor: 0xff0000 },
  giant:        { bodyColor: 0x887766, scale: 3.5, shape: "humanoid", eyeColor: 0xffcc66 },
  spider:       { bodyColor: 0x332211, scale: 1.5, shape: "arachnid", eyeColor: 0xff0000 },
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
  action: "idle" | "walk" | "run" | "attack" | "cast" | "dodge" | "death" | "block";
  blendFactor: number;
}

function applyProceduralAnimation(
  skeleton: THREE.Skeleton,
  anim: AnimState,
  _dt: number,
): void {
  const bones = skeleton.bones;
  const boneMap = new Map<string, THREE.Bone>();
  for (const b of bones) boneMap.set(b.name, b);

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

  const p = anim.phase;

  switch (anim.action) {
    case "idle": {
      const breathe = Math.sin(p * 1.5) * 0.015;
      if (spine) spine.rotation.x = breathe;
      if (chest) chest.rotation.x = breathe * 0.5;
      if (lUpperArm) lUpperArm.rotation.z = -0.08 + Math.sin(p * 0.8) * 0.02;
      if (rUpperArm) rUpperArm.rotation.z = 0.08 - Math.sin(p * 0.8) * 0.02;
      // slight weight shift
      if (hips) hips.rotation.z = Math.sin(p * 0.5) * 0.01;
      break;
    }
    case "walk": {
      const stride = 0.4;
      const legSwing = Math.sin(p * 4) * stride;
      const armSwing = Math.sin(p * 4) * stride * 0.5;
      if (lUpperLeg) lUpperLeg.rotation.x = legSwing;
      if (rUpperLeg) rUpperLeg.rotation.x = -legSwing;
      if (lLowerLeg) lLowerLeg.rotation.x = Math.max(0, -legSwing) * 0.6;
      if (rLowerLeg) rLowerLeg.rotation.x = Math.max(0, legSwing) * 0.6;
      if (lUpperArm) lUpperArm.rotation.x = -armSwing;
      if (rUpperArm) rUpperArm.rotation.x = armSwing;
      if (hips) {
        hips.position.y = 0.95 + Math.abs(Math.sin(p * 4)) * 0.03;
        hips.rotation.y = Math.sin(p * 4) * 0.03;
      }
      if (spine) spine.rotation.x = 0.03;
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
      }
      if (spine) spine.rotation.x = 0.12;
      break;
    }
    case "attack": {
      const t = (p % 1.0);
      const windUp = Math.min(t * 3, 1);
      const swing = Math.max(0, Math.min((t - 0.33) * 4, 1));
      if (rUpperArm) {
        rUpperArm.rotation.x = -1.8 * windUp + 2.5 * swing;
        rUpperArm.rotation.z = 0.5 * windUp - 0.3 * swing;
      }
      if (rForearm) rForearm.rotation.x = -0.5 * windUp;
      if (spine) spine.rotation.y = -0.3 * windUp + 0.5 * swing;
      if (chest) chest.rotation.y = -0.15 * windUp + 0.25 * swing;
      if (hips) hips.rotation.y = -0.1 * windUp + 0.15 * swing;
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
      if (lUpperArm) { lUpperArm.rotation.x = -1.2; lUpperArm.rotation.z = 0.4; }
      if (lForearm) lForearm.rotation.x = -0.6;
      if (spine) spine.rotation.x = -0.05;
      if (hips) hips.position.y = 0.9;
      break;
    }
    case "death": {
      const t = Math.min(p * 0.5, 1);
      if (hips) {
        hips.position.y = 0.95 - 0.7 * t;
        hips.rotation.x = 1.2 * t;
      }
      if (spine) spine.rotation.x = 0.4 * t;
      if (lUpperArm) lUpperArm.rotation.z = -1.2 * t;
      if (rUpperArm) rUpperArm.rotation.z = 1.2 * t;
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Character mesh builder
// ---------------------------------------------------------------------------

function buildCharacterMesh(look: ClassAppearance, scale = 1.0): THREE.Group {
  const group = new THREE.Group();
  const mat = (color: number) =>
    new THREE.MeshStandardMaterial({ color, roughness: 0.7, metalness: 0.3 });

  // torso
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.4, 0.2), mat(look.bodyColor));
  torso.position.y = 1.3;
  torso.castShadow = true;
  group.add(torso);

  // waist
  const waist = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.15, 0.18), mat(look.bodyColor));
  waist.position.y = 1.0;
  waist.castShadow = true;
  group.add(waist);

  // head
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), mat(0xddbb99));
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // eyes
  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x223344, emissive: 0x112233, emissiveIntensity: 0.3 });
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat);
    eye.position.set(side * 0.035, 1.72, 0.08);
    group.add(eye);
  }

  // helm
  if (look.helmShape !== "none") {
    let helmGeo: THREE.BufferGeometry;
    if (look.helmShape === "round") helmGeo = new THREE.SphereGeometry(0.12, 8, 8);
    else if (look.helmShape === "pointed") helmGeo = new THREE.ConeGeometry(0.1, 0.2, 8);
    else helmGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.08, 8);
    const helm = new THREE.Mesh(helmGeo, mat(look.accentColor));
    helm.position.y = look.helmShape === "pointed" ? 1.82 : 1.75;
    helm.castShadow = true;
    group.add(helm);
  }

  // arms
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.25, 6), mat(look.bodyColor));
    upper.position.set(side * 0.24, 1.35, 0);
    upper.castShadow = true;
    group.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.22, 6), mat(look.accentColor));
    lower.position.set(side * 0.24, 1.1, 0);
    lower.castShadow = true;
    group.add(lower);

    // hand
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 6), mat(0xddbb99));
    hand.position.set(side * 0.24, 0.97, 0);
    group.add(hand);
  }

  // legs
  for (const side of [-1, 1]) {
    const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.045, 0.3, 6), mat(look.bodyColor));
    upper.position.set(side * 0.09, 0.78, 0);
    upper.castShadow = true;
    group.add(upper);

    const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.28, 6), mat(look.accentColor));
    lower.position.set(side * 0.09, 0.5, 0);
    lower.castShadow = true;
    group.add(lower);

    // boot
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.06, 0.14), mat(0x443322));
    boot.position.set(side * 0.09, 0.33, 0.02);
    group.add(boot);
  }

  // weapon accessories
  if (look.hasStaff) {
    const staff = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 1.4, 6), mat(0x664422));
    staff.position.set(0.3, 1.1, 0);
    group.add(staff);
    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x88aaff, emissive: 0x4466ff, emissiveIntensity: 0.8 }),
    );
    orb.position.set(0.3, 1.82, 0);
    group.add(orb);
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

  // cape
  if (look.capeColor !== null) {
    const cape = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.5),
      new THREE.MeshStandardMaterial({ color: look.capeColor, side: THREE.DoubleSide }),
    );
    cape.position.set(0, 1.2, -0.12);
    group.add(cape);
  }

  group.scale.setScalar(scale);
  return group;
}

// ---------------------------------------------------------------------------
// Enemy mesh builder
// ---------------------------------------------------------------------------

function buildEnemyMesh(look: EnemyAppearance): THREE.Group {
  const g = new THREE.Group();
  const mat = (c: number) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, metalness: 0.2 });
  const eyeMat = new THREE.MeshStandardMaterial({
    color: look.eyeColor, emissive: look.eyeColor, emissiveIntensity: 1.0,
  });

  if (look.shape === "humanoid") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.5, 0.25), mat(look.bodyColor));
    body.position.y = 1.3;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(look.bodyColor));
    head.position.y = 1.75;
    head.castShadow = true;
    g.add(head);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eye.position.set(s * 0.04, 1.78, 0.1);
      g.add(eye);
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.6, 6), mat(look.bodyColor));
      leg.position.set(s * 0.1, 0.6, 0);
      leg.castShadow = true;
      g.add(leg);
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 6), mat(look.bodyColor));
      arm.position.set(s * 0.28, 1.25, 0);
      arm.castShadow = true;
      g.add(arm);
    }
  } else if (look.shape === "quadruped") {
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.2, 0.55), mat(look.bodyColor));
    body.position.y = 0.45;
    body.castShadow = true;
    g.add(body);
    const head = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.2, 6), mat(look.bodyColor));
    head.position.set(0, 0.5, 0.35);
    head.rotation.x = Math.PI * 0.5;
    g.add(head);
    for (const eye of [new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), eyeMat)]) {
      eye.position.set(0.04, 0.52, 0.42);
      g.add(eye);
      const eye2 = eye.clone();
      eye2.position.x = -0.04;
      g.add(eye2);
    }
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.3, 6), mat(look.bodyColor));
        leg.position.set(sx * 0.1, 0.2, sz * 0.2);
        leg.castShadow = true;
        g.add(leg);
      }
    }
    // tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.02, 0.25, 4), mat(look.bodyColor));
    tail.position.set(0, 0.5, -0.35);
    tail.rotation.x = -0.5;
    g.add(tail);
  } else if (look.shape === "large") {
    // dragon/giant
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.5), mat(look.bodyColor));
    body.position.y = 1.5;
    body.castShadow = true;
    g.add(body);
    // neck + head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.6, 6), mat(look.bodyColor));
    neck.position.set(0, 1.9, 0.7);
    neck.rotation.x = -0.6;
    g.add(neck);
    const dHead = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.2, 0.4), mat(look.bodyColor));
    dHead.position.set(0, 2.2, 1.0);
    g.add(dHead);
    for (const s of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.04, 6, 6), eyeMat);
      eye.position.set(s * 0.12, 2.3, 1.15);
      g.add(eye);
    }
    // wings
    for (const s of [-1, 1]) {
      const wing = new THREE.Mesh(
        new THREE.PlaneGeometry(1.5, 0.8),
        new THREE.MeshStandardMaterial({ color: look.bodyColor, side: THREE.DoubleSide, transparent: true, opacity: 0.7 }),
      );
      wing.position.set(s * 1.1, 2.0, 0);
      wing.rotation.z = s * 0.4;
      g.add(wing);
    }
    // legs
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 0.6]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.08, 1.0, 6), mat(look.bodyColor));
        leg.position.set(sx * 0.3, 0.7, sz * 0.5);
        leg.castShadow = true;
        g.add(leg);
      }
    }
    // tail
    const tail = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.2, 6), mat(look.bodyColor));
    tail.position.set(0, 1.3, -1.2);
    tail.rotation.x = Math.PI * 0.5;
    g.add(tail);
  } else {
    // arachnid (spider)
    const body = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 8), mat(look.bodyColor));
    body.position.y = 0.5;
    body.castShadow = true;
    g.add(body);
    const abdomen = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 8), mat(look.bodyColor));
    abdomen.position.set(0, 0.45, -0.4);
    g.add(abdomen);
    // eyes (cluster)
    for (let i = 0; i < 6; i++) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eye.position.set((i % 3 - 1) * 0.04, 0.6, 0.22 + Math.floor(i / 3) * 0.03);
      g.add(eye);
    }
    // 8 legs
    for (let i = 0; i < 8; i++) {
      const side = i < 4 ? -1 : 1;
      const idx = i % 4;
      const angle = (idx - 1.5) * 0.5;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.01, 0.6, 4), mat(look.bodyColor));
      leg.position.set(side * (0.2 + idx * 0.02), 0.35, angle * 0.3);
      leg.rotation.z = side * (0.8 + idx * 0.15);
      leg.rotation.y = angle;
      g.add(leg);
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
    roughness: 0.85,
    metalness: 0.05,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;

  const getHeight = (wx: number, wz: number): number => {
    return heightAt(wx, wz);
  };

  return { mesh, getHeight };
}

// ---------------------------------------------------------------------------
// Water plane
// ---------------------------------------------------------------------------

function buildWater(): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, 96, 96);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x1a6699,
    transparent: true,
    opacity: 0.72,
    roughness: 0.02,
    metalness: 0.6,
    side: THREE.DoubleSide,
    envMapIntensity: 1.5,
    emissive: 0x061828,
    emissiveIntensity: 0.15,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = WATER_LEVEL;
  return mesh;
}

function animateWater(mesh: THREE.Mesh, time: number): void {
  const pos = (mesh.geometry as THREE.PlaneGeometry).attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = Math.sin(x * 0.05 + time * 1.5) * 0.2 +
              Math.sin(z * 0.07 + time * 1.2) * 0.15 +
              Math.sin((x + z) * 0.03 + time * 0.8) * 0.3;
    pos.setY(i, y);
  }
  pos.needsUpdate = true;
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
  const stone = new THREE.MeshStandardMaterial({ color: 0x999988, roughness: 0.9, metalness: 0.1 });
  const roof = new THREE.MeshStandardMaterial({ color: 0x663333, roughness: 0.8 });
  const dark = new THREE.MeshStandardMaterial({ color: 0x666655, roughness: 0.95 });
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
  // gate
  addMesh(new THREE.BoxGeometry(2.5, 3.5, 1), new THREE.MeshStandardMaterial({ color: 0x442200, roughness: 0.9 }), 0, 1.75, -6.2);
  return g;
}

function buildVillageHouse(seed: number): THREE.Group {
  const g = new THREE.Group();
  const r = seededRandom(seed), w = 2 + r * 2, h = 2 + r * 1.5, d = 2 + r * 1.5;
  const walls = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: 0xaa9977 + ((seed * 77) & 0x111111), roughness: 0.9 }));
  walls.position.y = h / 2; walls.castShadow = true; walls.receiveShadow = true; g.add(walls);
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(w, d) * 0.75, 1.5, 4),
    new THREE.MeshStandardMaterial({ color: 0x553322, roughness: 0.85 }));
  roof.position.y = h + 0.75; roof.rotation.y = Math.PI / 4; g.add(roof);
  const door = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 1.2),
    new THREE.MeshStandardMaterial({ color: 0x442200, side: THREE.DoubleSide }));
  door.position.set(0, 0.6, d / 2 + 0.01); g.add(door);
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
  const mat = new THREE.MeshStandardMaterial({ color: 0xbbbbaa, roughness: 0.7, metalness: 0.2 });
  const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.8, 0.5, 8), mat);
  base.position.y = 0.25; g.add(base);
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.15, 1.5, 6), mat);
  pillar.position.y = 1.25; g.add(pillar);
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0),
    new THREE.MeshStandardMaterial({ color: 0x66ccff, emissive: 0x2288ff, emissiveIntensity: 1.5, transparent: true, opacity: 0.85 }));
  crystal.position.y = 2.2; g.add(crystal);
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
      void main() {
        vec3 dir = normalize(vWorldPos);
        float y = dir.y * 0.5 + 0.5;
        // day sky
        vec3 dayTop = vec3(0.3, 0.5, 0.9);
        vec3 dayBot = vec3(0.6, 0.75, 1.0);
        vec3 dayCol = mix(dayBot, dayTop, y);
        // night sky
        vec3 nightTop = vec3(0.02, 0.02, 0.08);
        vec3 nightBot = vec3(0.05, 0.03, 0.1);
        vec3 nightCol = mix(nightBot, nightTop, y);
        // sunrise/sunset
        vec3 sunsetCol = vec3(1.0, 0.4, 0.15);
        float sunsetFactor = smoothstep(0.0, 0.15, y) * (1.0 - smoothstep(0.15, 0.4, y));
        // blend based on time
        float dayFactor = smoothstep(0.2, 0.35, timeOfDay) - smoothstep(0.7, 0.85, timeOfDay);
        vec3 col = mix(nightCol, dayCol, dayFactor);
        // add sunset glow during transitions
        float transitionFactor = smoothstep(0.2, 0.3, timeOfDay) * (1.0 - smoothstep(0.3, 0.4, timeOfDay))
                               + smoothstep(0.65, 0.75, timeOfDay) * (1.0 - smoothstep(0.75, 0.85, timeOfDay));
        col = mix(col, sunsetCol, transitionFactor * sunsetFactor * 0.8);
        // sun disc
        float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
        col += vec3(1.0, 0.95, 0.8) * pow(sunDot, 256.0) * dayFactor;
        col += vec3(1.0, 0.7, 0.3) * pow(sunDot, 8.0) * 0.15 * dayFactor;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
    side: THREE.BackSide,
    depthWrite: false,
  });
  const dome = new THREE.Mesh(skyGeo, skyMat);

  // stars
  const starCount = 1500;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(Math.random()); // upper hemisphere bias
    const r = SKY_RADIUS * 0.95;
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.cos(phi);
    starPos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPos, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.5, sizeAttenuation: false });
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
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.45, roughness: 1, metalness: 0 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0xddddee, transparent: true, opacity: 0.3, roughness: 1, metalness: 0 });
  for (let i = 0; i < 30; i++) {
    const cloud = new THREE.Group();
    const puffCount = 4 + Math.floor(Math.random() * 5);
    const isThick = Math.random() > 0.6;
    for (let j = 0; j < puffCount; j++) {
      const pSize = 6 + Math.random() * (isThick ? 18 : 12);
      const p = new THREE.Mesh(
        new THREE.SphereGeometry(pSize, 8, 6),
        isThick ? matDark : mat,
      );
      p.position.set(
        (Math.random() - 0.5) * 25,
        (Math.random() - 0.5) * (isThick ? 6 : 3),
        (Math.random() - 0.5) * 12,
      );
      p.scale.y = 0.3 + Math.random() * 0.15;
      cloud.add(p);
    }
    cloud.position.set(
      (Math.random() - 0.5) * TERRAIN_SIZE * 0.8,
      70 + Math.random() * 40,
      (Math.random() - 0.5) * TERRAIN_SIZE * 0.8,
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
  for (let i = 0; i < 30; i++) {
    const spread = v3(
      (Math.random() - 0.5) * 2,
      (Math.random() - 0.5) * 2 + 1,
      (Math.random() - 0.5) * 2,
    );
    const vel = dir.clone().multiplyScalar(8).add(spread);
    const c = new THREE.Color().setHSL(0.05 + Math.random() * 0.05, 1, 0.5 + Math.random() * 0.3);
    pool.emit(origin.clone(), vel, c, 0.5 + Math.random() * 0.5, 0.3 + Math.random() * 0.2);
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
  for (let i = 0; i < 40; i++) {
    const t = Math.random();
    const pos = from.clone().addScaledVector(dir, t * len);
    pos.add(v3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5));
    const vel = v3((Math.random() - 0.5) * 1, Math.random() * 0.5, (Math.random() - 0.5) * 1);
    pool.emit(pos, vel, new THREE.Color(0.7, 0.7, 1), 0.2 + Math.random() * 0.15, 0.1);
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
  const pos = center.clone().add(v3(
    (Math.random() - 0.5) * 15,
    0.5 + Math.random() * 2,
    (Math.random() - 0.5) * 15,
  ));
  const vel = v3((Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.3, (Math.random() - 0.5) * 0.5);
  pool.emit(pos, vel, new THREE.Color(0.6, 1, 0.2), 2 + Math.random() * 2, 0.08);
}

function emitTorchFire(pool: ParticlePool, pos: THREE.Vector3): void {
  for (let i = 0; i < 3; i++) {
    const p = pos.clone().add(v3((Math.random() - 0.5) * 0.1, 0, (Math.random() - 0.5) * 0.1));
    const vel = v3((Math.random() - 0.5) * 0.3, 1.5 + Math.random(), (Math.random() - 0.5) * 0.3);
    const c = new THREE.Color().setHSL(0.05 + Math.random() * 0.04, 1, 0.5 + Math.random() * 0.2);
    pool.emit(p, vel, c, 0.4 + Math.random() * 0.3, 0.12);
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
  private playerAnim: AnimState = { phase: 0, action: "idle", blendFactor: 1 };
  private enemyMeshes = new Map<string, THREE.Group>();
  private enemyHealthBars = new Map<string, THREE.Group>();
  private companionMeshes = new Map<string, THREE.Group>();

  // Particles
  private particles!: ParticlePool;
  private envTimer = 0;

  // Timers
  private totalTime = 0;

  // Post-processing
  private bloomPass!: UnrealBloomPass;
  private colorGradingPass!: ShaderPass;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  build(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    // Scene
    this.scene = new THREE.Scene();
    this.fog = new THREE.FogExp2(0x88aacc, 0.003);
    this.scene.fog = this.fog;

    // Camera
    this.camera = new THREE.PerspectiveCamera(65, canvas.clientWidth / canvas.clientHeight, 0.1, 1200);
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
    // Sun
    this.sunLight = new THREE.DirectionalLight(0xffe8c0, 1.5);
    this.sunLight.position.set(50, 80, 30);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.set(4096, 4096);
    this.sunLight.shadow.camera.near = 0.5;
    this.sunLight.shadow.camera.far = 250;
    this.sunLight.shadow.camera.left = -80;
    this.sunLight.shadow.camera.right = 80;
    this.sunLight.shadow.camera.top = 80;
    this.sunLight.shadow.camera.bottom = -80;
    this.sunLight.shadow.bias = -0.0005;
    this.sunLight.shadow.normalBias = 0.02;
    this.scene.add(this.sunLight);

    // Moon
    this.moonLight = new THREE.DirectionalLight(0x8899cc, 0.2);
    this.moonLight.position.set(-30, 50, -20);
    this.scene.add(this.moonLight);

    // Ambient
    this.ambientLight = new THREE.AmbientLight(0x334466, 0.3);
    this.scene.add(this.ambientLight);

    // Torches / campfires at key locations
    const torchPositions = [
      v3(5, 2.5, -2), v3(-5, 2.5, -2), // castle entrance
      v3(50, 2, 30), v3(52, 2, 30),     // village area
      v3(-30, 3, -40),                   // ruins
    ];
    for (const pos of torchPositions) {
      const light = new THREE.PointLight(0xff8833, 1.5, 15);
      light.position.copy(pos);
      light.castShadow = false; // performance: only sun casts shadows
      this.scene.add(light);
      this.torchLights.push(light);
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

    // Bloom for magical glow
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(this.canvas.clientWidth, this.canvas.clientHeight),
      0.65,  // strength (increased for magical glow)
      0.4,   // radius (wider bloom spread)
      0.7,   // threshold (catch more bright areas)
    );
    this.composer.addPass(this.bloomPass);

    // Color grading + vignette
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

    // --- Fog density based on forest proximity ---
    const pPos = stateToV3(state.player.combatant.position);
    const playerH = this.terrain.getHeight(pPos.x, pPos.z);
    if (playerH > 3 && playerH < 10) {
      this.fog.density = lerp(this.fog.density, 0.008, dt * 2); // denser in forests
    } else {
      this.fog.density = lerp(this.fog.density, 0.003, dt * 2);
    }

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

    // Tone mapping exposure
    this.renderer.toneMappingExposure = lerp(0.4, 1.1, dayness);
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
    }

    this.playerMesh.position.copy(pos);

    // Determine animation
    if (pc.hp <= 0) {
      this.playerAnim.action = "death";
    } else if (pc.isBlocking) {
      this.playerAnim.action = "block";
    } else {
      // approximate movement detection from position changes
      this.playerAnim.action = "idle";
    }
    this.playerAnim.phase += dt;

    if (this.playerSkeleton) {
      applyProceduralAnimation(this.playerSkeleton, this.playerAnim, dt);
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

  private updateEnemies(state: ArthurianRPGState, _dt: number): void {
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

      // idle bob
      if (enemy.hp > 0) {
        mesh.position.y += Math.sin(this.totalTime * 2 + enemy.id.charCodeAt(0)) * 0.03;
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
    if (n.includes("wolf")) return "wolf";
    if (n.includes("dragon")) return "dragon";
    if (n.includes("troll")) return "troll";
    if (n.includes("skeleton") || n.includes("undead")) return "skeleton";
    if (n.includes("black knight") || n.includes("dark knight")) return "blackknight";
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
    this.enemyMeshes.clear(); this.enemyHealthBars.clear(); this.companionMeshes.clear();
    this.playerMesh = null; this.playerSkeleton = null;
  }

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
