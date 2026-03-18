// ---------------------------------------------------------------------------
// Camelot Craft – Multi-part mob renderer with simple animation
// ---------------------------------------------------------------------------

import * as THREE from "three";
import { MOB_DEFS, MobType, type MobDef } from "../config/CraftMobDefs";
import type { MobInstance } from "../state/CraftState";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MobCategory = "humanoid" | "animal" | "large" | "small";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Slightly shift a hex color lighter or darker by a factor (-1..1). */
function shadeColor(base: number, factor: number): number {
  let r = (base >> 16) & 0xff;
  let g = (base >> 8) & 0xff;
  let b = base & 0xff;
  if (factor > 0) {
    r = Math.min(255, Math.round(r + (255 - r) * factor));
    g = Math.min(255, Math.round(g + (255 - g) * factor));
    b = Math.min(255, Math.round(b + (255 - b) * factor));
  } else {
    const f = 1 + factor; // factor is negative
    r = Math.round(r * f);
    g = Math.round(g * f);
    b = Math.round(b * f);
  }
  return (r << 16) | (g << 8) | b;
}

function lambertMat(color: number): THREE.MeshLambertMaterial {
  return new THREE.MeshLambertMaterial({ color });
}

function box(
  w: number,
  h: number,
  d: number,
  color: number,
): THREE.Mesh {
  const geo = new THREE.BoxGeometry(w, h, d);
  return new THREE.Mesh(geo, lambertMat(color));
}

function sphere(
  radius: number,
  color: number,
  emissive?: number,
): THREE.Mesh {
  const geo = new THREE.SphereGeometry(radius, 8, 8);
  const mat = new THREE.MeshLambertMaterial({ color });
  if (emissive !== undefined) {
    mat.emissive = new THREE.Color(emissive);
    mat.emissiveIntensity = 0.6;
  }
  return new THREE.Mesh(geo, mat);
}

// ---------------------------------------------------------------------------
// CraftMobRenderer
// ---------------------------------------------------------------------------

export class CraftMobRenderer {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /** Determine the rendering category for a mob definition. */
  getMobCategory(def: MobDef): MobCategory {
    // Dragon is the only "large" mob
    if (def.type === MobType.DRAGON) return "large";

    // Faerie is the only "small" mob
    if (def.type === MobType.FAERIE) return "small";

    // Animals: body wider or deeper than tall (wolf, spider, deer, horse)
    if (def.bodyWidth > def.bodyHeight || def.bodyDepth > def.bodyHeight) {
      return "animal";
    }

    // Everything else is humanoid
    return "humanoid";
  }

  /** Build a brand-new THREE.Group representing the given mob type. */
  createMobMesh(type: MobType): THREE.Group {
    const def = MOB_DEFS[type];
    const category = this.getMobCategory(def);

    switch (category) {
      case "humanoid":
        return this.buildHumanoid(def);
      case "animal":
        return this.buildAnimal(def);
      case "large":
        return this.buildLarge(def);
      case "small":
        return this.buildSmall(def);
    }
  }

  /** Animate the mob group each frame. */
  animateMob(group: THREE.Group, mob: MobInstance, dt: number): void {
    const def = MOB_DEFS[mob.type];
    const category = this.getMobCategory(def);

    // Compute a walk phase from horizontal speed
    const speed = Math.sqrt(
      mob.velocity.x * mob.velocity.x + mob.velocity.z * mob.velocity.z,
    );
    const walkPhase =
      (mob.position.x + mob.position.z) * 2.5; // deterministic phase from position
    const isWalking = speed > 0.2;

    switch (category) {
      case "humanoid":
        this.animateHumanoid(group, mob, dt, walkPhase, isWalking);
        break;
      case "animal":
        this.animateAnimal(group, mob, dt, walkPhase, isWalking);
        break;
      case "large":
        this.animateLarge(group, mob, dt, walkPhase, isWalking);
        break;
      case "small":
        this.animateSmall(group, mob, dt);
        break;
    }
  }

  // -----------------------------------------------------------------------
  // Humanoid builder
  // -----------------------------------------------------------------------

  private buildHumanoid(def: MobDef): THREE.Group {
    const group = new THREE.Group();
    const c = def.bodyColor;
    const bw = def.bodyWidth;
    const bh = def.bodyHeight;
    const bd = def.bodyDepth;

    // Torso
    const torsoH = bh * 0.4;
    const torso = box(bw, torsoH, bd, c);
    torso.name = "torso";
    torso.position.y = bh * 0.35;
    group.add(torso);

    // Head
    const headSize = bw * 0.7;
    const head = box(headSize, headSize, headSize, shadeColor(c, 0.15));
    head.name = "head";
    head.position.y = bh * 0.35 + torsoH * 0.5 + headSize * 0.5;
    group.add(head);

    // Arms
    const armW = bw * 0.22;
    const armH = bh * 0.38;
    const armColor = shadeColor(c, -0.1);

    const leftArmPivot = new THREE.Group();
    leftArmPivot.name = "leftArm";
    leftArmPivot.position.set(-(bw * 0.5 + armW * 0.5), bh * 0.5, 0);
    const leftArmMesh = box(armW, armH, bd * 0.8, armColor);
    leftArmMesh.position.y = -armH * 0.5;
    leftArmPivot.add(leftArmMesh);
    group.add(leftArmPivot);

    const rightArmPivot = new THREE.Group();
    rightArmPivot.name = "rightArm";
    rightArmPivot.position.set(bw * 0.5 + armW * 0.5, bh * 0.5, 0);
    const rightArmMesh = box(armW, armH, bd * 0.8, armColor);
    rightArmMesh.position.y = -armH * 0.5;
    rightArmPivot.add(rightArmMesh);
    group.add(rightArmPivot);

    // Legs
    const legW = bw * 0.3;
    const legH = bh * 0.35;
    const legColor = shadeColor(c, -0.2);

    const leftLegPivot = new THREE.Group();
    leftLegPivot.name = "leftLeg";
    leftLegPivot.position.set(-bw * 0.22, bh * 0.15, 0);
    const leftLegMesh = box(legW, legH, bd * 0.85, legColor);
    leftLegMesh.position.y = -legH * 0.5;
    leftLegPivot.add(leftLegMesh);
    group.add(leftLegPivot);

    const rightLegPivot = new THREE.Group();
    rightLegPivot.name = "rightLeg";
    rightLegPivot.position.set(bw * 0.22, bh * 0.15, 0);
    const rightLegMesh = box(legW, legH, bd * 0.85, legColor);
    rightLegMesh.position.y = -legH * 0.5;
    rightLegPivot.add(rightLegMesh);
    group.add(rightLegPivot);

    return group;
  }

  // -----------------------------------------------------------------------
  // Animal builder
  // -----------------------------------------------------------------------

  private buildAnimal(def: MobDef): THREE.Group {
    const group = new THREE.Group();
    const c = def.bodyColor;
    const bw = def.bodyWidth;
    const bh = def.bodyHeight;
    const bd = def.bodyDepth;

    // Body (flat / long box)
    const body = box(bw, bh * 0.6, bd, c);
    body.name = "body";
    body.position.y = bh * 0.55;
    group.add(body);

    // Head (small cube at front)
    const headSize = Math.min(bw, bh) * 0.55;
    const head = box(headSize, headSize, headSize, shadeColor(c, 0.15));
    head.name = "head";
    head.position.set(0, bh * 0.65, -(bd * 0.5 + headSize * 0.35));
    group.add(head);

    // 4 legs
    const legW = bw * 0.15;
    const legH = bh * 0.5;
    const legColor = shadeColor(c, -0.15);
    const legOffsetX = bw * 0.35;
    const legOffsetZ = bd * 0.3;

    const legPositions: [string, number, number][] = [
      ["legFL", -legOffsetX, -legOffsetZ],
      ["legFR", legOffsetX, -legOffsetZ],
      ["legBL", -legOffsetX, legOffsetZ],
      ["legBR", legOffsetX, legOffsetZ],
    ];

    for (const [name, ox, oz] of legPositions) {
      const pivot = new THREE.Group();
      pivot.name = name;
      pivot.position.set(ox, bh * 0.3, oz);
      const legMesh = box(legW, legH, legW, legColor);
      legMesh.position.y = -legH * 0.5;
      pivot.add(legMesh);
      group.add(pivot);
    }

    return group;
  }

  // -----------------------------------------------------------------------
  // Large (dragon) builder
  // -----------------------------------------------------------------------

  private buildLarge(def: MobDef): THREE.Group {
    const group = new THREE.Group();
    const c = def.bodyColor;
    const bw = def.bodyWidth;
    const bh = def.bodyHeight;
    const bd = def.bodyDepth;

    // Main body
    const body = box(bw, bh * 0.5, bd, c);
    body.name = "body";
    body.position.y = bh * 0.4;
    group.add(body);

    // Head
    const headSize = bw * 0.45;
    const head = box(headSize, headSize * 0.7, headSize * 1.3, shadeColor(c, 0.1));
    head.name = "head";
    head.position.set(0, bh * 0.55, -(bd * 0.5 + headSize * 0.5));
    group.add(head);

    // Wings (thin stretched boxes)
    const wingSpan = bw * 1.6;
    const wingH = bh * 0.05;
    const wingD = bd * 0.7;
    const wingColor = shadeColor(c, -0.15);

    const leftWingPivot = new THREE.Group();
    leftWingPivot.name = "leftWing";
    leftWingPivot.position.set(-(bw * 0.5), bh * 0.6, 0);
    const leftWingMesh = box(wingSpan, wingH, wingD, wingColor);
    leftWingMesh.position.x = -wingSpan * 0.5;
    leftWingPivot.add(leftWingMesh);
    group.add(leftWingPivot);

    const rightWingPivot = new THREE.Group();
    rightWingPivot.name = "rightWing";
    rightWingPivot.position.set(bw * 0.5, bh * 0.6, 0);
    const rightWingMesh = box(wingSpan, wingH, wingD, wingColor);
    rightWingMesh.position.x = wingSpan * 0.5;
    rightWingPivot.add(rightWingMesh);
    group.add(rightWingPivot);

    // Tail
    const tail = box(bw * 0.25, bh * 0.15, bd * 0.6, shadeColor(c, -0.2));
    tail.name = "tail";
    tail.position.set(0, bh * 0.3, bd * 0.5 + bd * 0.25);
    group.add(tail);

    // 4 legs (stout)
    const legW = bw * 0.3;
    const legH = bh * 0.35;
    const legColor = shadeColor(c, -0.25);
    const legConfigs: [string, number, number][] = [
      ["legFL", -bw * 0.35, -bd * 0.3],
      ["legFR", bw * 0.35, -bd * 0.3],
      ["legBL", -bw * 0.35, bd * 0.3],
      ["legBR", bw * 0.35, bd * 0.3],
    ];

    for (const [name, ox, oz] of legConfigs) {
      const pivot = new THREE.Group();
      pivot.name = name;
      pivot.position.set(ox, bh * 0.15, oz);
      const legMesh = box(legW, legH, legW, legColor);
      legMesh.position.y = -legH * 0.5;
      pivot.add(legMesh);
      group.add(pivot);
    }

    return group;
  }

  // -----------------------------------------------------------------------
  // Small (faerie) builder
  // -----------------------------------------------------------------------

  private buildSmall(def: MobDef): THREE.Group {
    const group = new THREE.Group();
    const c = def.bodyColor;

    // Glowing sphere body
    const bodyRadius = def.bodyHeight * 0.35;
    const body = sphere(bodyRadius, c, c);
    body.name = "body";
    body.position.y = def.bodyHeight * 0.5;
    group.add(body);

    // Two thin wing planes
    const wingW = def.bodyWidth * 1.2;
    const wingH = def.bodyHeight * 0.6;
    const wingColor = shadeColor(c, 0.3);
    const wingMat = new THREE.MeshLambertMaterial({
      color: wingColor,
      transparent: true,
      opacity: 0.5,
      side: THREE.DoubleSide,
    });

    const leftWingGeo = new THREE.PlaneGeometry(wingW, wingH);
    const leftWing = new THREE.Mesh(leftWingGeo, wingMat);
    leftWing.name = "leftWing";
    leftWing.position.set(-wingW * 0.4, def.bodyHeight * 0.55, 0);
    leftWing.rotation.y = -0.3;
    group.add(leftWing);

    const rightWingGeo = new THREE.PlaneGeometry(wingW, wingH);
    const rightWing = new THREE.Mesh(rightWingGeo, wingMat);
    rightWing.name = "rightWing";
    rightWing.position.set(wingW * 0.4, def.bodyHeight * 0.55, 0);
    rightWing.rotation.y = 0.3;
    group.add(rightWing);

    return group;
  }

  // -----------------------------------------------------------------------
  // Humanoid animation
  // -----------------------------------------------------------------------

  private animateHumanoid(
    group: THREE.Group,
    mob: MobInstance,
    _dt: number,
    walkPhase: number,
    isWalking: boolean,
  ): void {
    const leftArm = group.getObjectByName("leftArm");
    const rightArm = group.getObjectByName("rightArm");
    const leftLeg = group.getObjectByName("leftLeg");
    const rightLeg = group.getObjectByName("rightLeg");
    const torso = group.getObjectByName("torso");

    if (mob.aiState === "attack") {
      // Attack: both arms swing forward
      if (leftArm) leftArm.rotation.x = -1.2;
      if (rightArm) rightArm.rotation.x = -1.2;
      // Legs stay planted
      if (leftLeg) leftLeg.rotation.x = 0;
      if (rightLeg) rightLeg.rotation.x = 0;
    } else if (isWalking) {
      // Walk cycle
      const swing = Math.sin(walkPhase * 3.0) * 0.6;
      if (leftArm) leftArm.rotation.x = swing;
      if (rightArm) rightArm.rotation.x = -swing;
      if (leftLeg) leftLeg.rotation.x = -swing;
      if (rightLeg) rightLeg.rotation.x = swing;
    } else {
      // Idle: return to neutral with slight bob
      if (leftArm) leftArm.rotation.x *= 0.9;
      if (rightArm) rightArm.rotation.x *= 0.9;
      if (leftLeg) leftLeg.rotation.x *= 0.9;
      if (rightLeg) rightLeg.rotation.x *= 0.9;

      // Subtle body bob
      if (torso) {
        torso.position.y =
          MOB_DEFS[mob.type].bodyHeight * 0.35 +
          Math.sin(mob.position.x * 0.5 + mob.position.z * 0.5 + Date.now() * 0.002) * 0.015;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Animal animation
  // -----------------------------------------------------------------------

  private animateAnimal(
    group: THREE.Group,
    mob: MobInstance,
    _dt: number,
    walkPhase: number,
    isWalking: boolean,
  ): void {
    const legNames = ["legFL", "legFR", "legBL", "legBR"];
    const legs = legNames.map((n) => group.getObjectByName(n));

    if (isWalking) {
      const swing = Math.sin(walkPhase * 4.0) * 0.5;
      // Diagonal gait: FL+BR together, FR+BL together
      if (legs[0]) legs[0].rotation.x = swing;
      if (legs[1]) legs[1].rotation.x = -swing;
      if (legs[2]) legs[2].rotation.x = -swing;
      if (legs[3]) legs[3].rotation.x = swing;
    } else {
      // Ease back to neutral
      for (const leg of legs) {
        if (leg) leg.rotation.x *= 0.9;
      }
      // Idle bob
      const body = group.getObjectByName("body");
      if (body) {
        const def = MOB_DEFS[mob.type];
        body.position.y =
          def.bodyHeight * 0.55 +
          Math.sin(Date.now() * 0.002) * 0.01;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Large (dragon) animation
  // -----------------------------------------------------------------------

  private animateLarge(
    group: THREE.Group,
    mob: MobInstance,
    _dt: number,
    walkPhase: number,
    isWalking: boolean,
  ): void {
    const leftWing = group.getObjectByName("leftWing");
    const rightWing = group.getObjectByName("rightWing");
    const tail = group.getObjectByName("tail");

    // Wing flap — always active at varying intensity
    const flapSpeed = isWalking ? 6.0 : 3.0;
    const flapAngle = Math.sin(Date.now() * 0.003 * flapSpeed) * 0.5;
    if (leftWing) leftWing.rotation.z = -flapAngle - 0.1;
    if (rightWing) rightWing.rotation.z = flapAngle + 0.1;

    // Tail sway
    if (tail) {
      tail.rotation.y = Math.sin(Date.now() * 0.002) * 0.3;
    }

    // Leg walk
    const legNames = ["legFL", "legFR", "legBL", "legBR"];
    const legs = legNames.map((n) => group.getObjectByName(n));

    if (isWalking) {
      const swing = Math.sin(walkPhase * 2.0) * 0.4;
      if (legs[0]) legs[0].rotation.x = swing;
      if (legs[1]) legs[1].rotation.x = -swing;
      if (legs[2]) legs[2].rotation.x = -swing;
      if (legs[3]) legs[3].rotation.x = swing;
    } else {
      for (const leg of legs) {
        if (leg) leg.rotation.x *= 0.9;
      }
    }

    // Attack: head lunges forward
    if (mob.aiState === "attack") {
      const head = group.getObjectByName("head");
      if (head) {
        head.rotation.x = -0.4;
      }
    } else {
      const head = group.getObjectByName("head");
      if (head) {
        head.rotation.x *= 0.9;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Small (faerie) animation
  // -----------------------------------------------------------------------

  private animateSmall(
    group: THREE.Group,
    mob: MobInstance,
    _dt: number,
  ): void {
    const body = group.getObjectByName("body");
    const leftWing = group.getObjectByName("leftWing");
    const rightWing = group.getObjectByName("rightWing");
    const t = Date.now() * 0.004;

    // Hover bob
    if (body) {
      const def = MOB_DEFS[mob.type];
      body.position.y = def.bodyHeight * 0.5 + Math.sin(t) * 0.08;
    }

    // Rapid wing flutter
    const flutter = Math.sin(t * 8) * 0.5;
    if (leftWing) leftWing.rotation.y = -0.3 + flutter;
    if (rightWing) rightWing.rotation.y = 0.3 - flutter;
  }
}
