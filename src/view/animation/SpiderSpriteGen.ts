// Procedural sprite generator for the Spider unit type.
//
// Draws a detailed arachnid at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Segmented body (cephalothorax + bulbous abdomen with markings)
//   • 8 articulated legs with joints and hair tufts
//   • Cluster of 8 eyes with reflections
//   • Chelicerae/fangs with venom drip
//   • Spinnerets, bristles, patterned abdomen
//   • Web silk cast, venomous bite attack

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// --- palette ---
const COL_CEPH       = 0x2e1a1a;  // cephalothorax dark brown
const COL_CEPH_LT    = 0x4a3030;
const COL_ABDOMEN    = 0x1e1020;  // abdomen deep purple-black
const COL_ABDOMEN_LT = 0x3a2040;
const COL_MARKING    = 0xcc3030;  // red hourglass / chevrons
const COL_MARKING_DK = 0x881818;
const COL_LEG        = 0x201010;
const COL_LEG_JOINT  = 0x503838;
const COL_LEG_HAIR   = 0x3a2828;
const COL_FANG       = 0x887060;
const COL_FANG_TIP   = 0xccbb99;
const COL_EYE_BIG    = 0x882288;  // principal eyes
const COL_EYE_SMALL  = 0x662266;
const COL_EYE_SHINE  = 0xffccff;
const COL_PUPIL      = 0x110011;
const COL_VENOM      = 0x44cc44;
const COL_WEB        = 0xcccccc;
const COL_SHADOW     = 0x000000;

// --- helpers ---
function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}
function clamp01(t: number): number {
  return t < 0 ? 0 : t > 1 ? 1 : t;
}

// --- drawing sub-routines ---

function drawShadow(g: Graphics, cx: number, cy: number, scaleX = 1): void {
  g.ellipse(cx, cy + 2, 14 * scaleX, 4).fill({ color: COL_SHADOW, alpha: 0.35 });
}

/** Draw a single articulated leg with 3 segments + hair tufts */
function drawLeg(
  g: Graphics,
  baseX: number, baseY: number,
  side: number,        // +1 right, -1 left
  index: number,       // 0-3 from front to back
  phase: number,       // animation phase
  crouchAmt: number,   // 0 = normal, 1 = crouched
): void {
  const spread = (index - 1.5) * 0.35;
  const walkAnim = Math.sin(phase + index * 1.3 + side * 0.7) * (1 - crouchAmt * 0.6);

  // segment lengths scale by leg index (front legs shorter, back longer)
  const lenScale = 0.85 + index * 0.1;
  const seg1 = 6 * lenScale;
  const seg2 = 7 * lenScale;
  const seg3 = 5 * lenScale;

  // coxa → femur (up and out)
  const j1x = baseX + side * seg1 * 0.8;
  const j1y = baseY - seg1 * 0.6 + walkAnim * 2 - spread * 3;

  // femur → tibia (knee, high point)
  const j2x = j1x + side * seg2 * 0.7;
  const j2y = j1y - seg2 * 0.4 + walkAnim * 1.5 + crouchAmt * 3;

  // tibia → tarsus (down to ground)
  const j3x = j2x + side * seg3 * 0.5;
  const j3y = baseY + 4 + walkAnim * 1.2 + crouchAmt * 2;

  // draw segments
  g.moveTo(baseX, baseY).lineTo(j1x, j1y)
    .stroke({ color: COL_LEG, width: 2.2 });
  g.moveTo(j1x, j1y).lineTo(j2x, j2y)
    .stroke({ color: COL_LEG, width: 1.8 });
  g.moveTo(j2x, j2y).lineTo(j3x, j3y)
    .stroke({ color: COL_LEG, width: 1.4 });

  // joint dots
  g.circle(j1x, j1y, 1.2).fill({ color: COL_LEG_JOINT });
  g.circle(j2x, j2y, 1.0).fill({ color: COL_LEG_JOINT });

  // hair tufts on femur
  const hx = (j1x + j2x) * 0.5;
  const hy = (j1y + j2y) * 0.5;
  g.moveTo(hx, hy).lineTo(hx + side * 2, hy - 2)
    .stroke({ color: COL_LEG_HAIR, width: 0.7 });
  g.moveTo(hx, hy).lineTo(hx + side * 1.5, hy - 3)
    .stroke({ color: COL_LEG_HAIR, width: 0.6 });
}

/** Draw the abdomen with markings */
function drawAbdomen(
  g: Graphics,
  cx: number, cy: number,
  breathe: number,
  markingAlpha: number,
): void {
  const rx = 10 + breathe * 0.3;
  const ry = 8 + breathe * 0.5;

  // main abdomen shape
  g.ellipse(cx, cy, rx, ry).fill({ color: COL_ABDOMEN });
  g.ellipse(cx, cy, rx - 0.5, ry - 0.5).stroke({ color: COL_ABDOMEN_LT, width: 0.5 });

  // dorsal highlight
  g.ellipse(cx - 1, cy - 2, rx * 0.5, ry * 0.4).fill({ color: COL_ABDOMEN_LT, alpha: 0.3 });

  // hourglass marking
  if (markingAlpha > 0) {
    // upper triangle
    g.moveTo(cx - 3, cy - 3).lineTo(cx, cy - 0.5).lineTo(cx + 3, cy - 3).closePath()
      .fill({ color: COL_MARKING, alpha: markingAlpha });
    // lower triangle
    g.moveTo(cx - 3, cy + 3).lineTo(cx, cy + 0.5).lineTo(cx + 3, cy + 3).closePath()
      .fill({ color: COL_MARKING, alpha: markingAlpha });

    // chevron accents
    g.moveTo(cx - 4, cy - 5).lineTo(cx, cy - 3.5).lineTo(cx + 4, cy - 5)
      .stroke({ color: COL_MARKING_DK, width: 0.7, alpha: markingAlpha * 0.7 });
  }

  // spinnerets (two tiny nubs at rear)
  g.circle(cx - 1.5, cy + ry - 1, 0.8).fill({ color: COL_CEPH });
  g.circle(cx + 1.5, cy + ry - 1, 0.8).fill({ color: COL_CEPH });
}

/** Draw the cephalothorax (head-thorax fused segment) */
function drawCephalothorax(
  g: Graphics,
  cx: number, cy: number,
): void {
  // main shape
  g.ellipse(cx, cy, 7, 5.5).fill({ color: COL_CEPH });
  g.ellipse(cx, cy, 7, 5.5).stroke({ color: COL_CEPH_LT, width: 0.4 });

  // carapace highlight
  g.ellipse(cx, cy - 1.5, 4, 2.5).fill({ color: COL_CEPH_LT, alpha: 0.25 });
}

/** Draw the 8 eyes in a natural cluster */
function drawEyes(
  g: Graphics,
  cx: number, cy: number,
  glowAmt: number,
): void {
  // anterior median eyes (big pair, front center)
  for (const side of [-1, 1]) {
    g.circle(cx + side * 2.2, cy - 2, 1.8).fill({ color: COL_EYE_BIG, alpha: lerp(0.9, 1, glowAmt) });
    g.circle(cx + side * 2.2, cy - 2, 1.0).fill({ color: COL_PUPIL });
    g.circle(cx + side * 1.8, cy - 2.6, 0.5).fill({ color: COL_EYE_SHINE, alpha: 0.7 });
  }

  // anterior lateral eyes (medium pair, outer front)
  for (const side of [-1, 1]) {
    g.circle(cx + side * 4.2, cy - 1, 1.2).fill({ color: COL_EYE_SMALL, alpha: lerp(0.8, 1, glowAmt) });
    g.circle(cx + side * 4.2, cy - 1, 0.6).fill({ color: COL_PUPIL });
  }

  // posterior median eyes (small pair, behind AME)
  for (const side of [-1, 1]) {
    g.circle(cx + side * 1.5, cy + 0.5, 0.9).fill({ color: COL_EYE_SMALL, alpha: 0.7 });
    g.circle(cx + side * 1.5, cy + 0.5, 0.4).fill({ color: COL_PUPIL });
  }

  // posterior lateral eyes (small pair, far back)
  for (const side of [-1, 1]) {
    g.circle(cx + side * 3.5, cy + 1.2, 0.8).fill({ color: COL_EYE_SMALL, alpha: 0.6 });
  }
}

/** Draw chelicerae (fangs) */
function drawFangs(
  g: Graphics,
  cx: number, cy: number,
  openAmt: number,  // 0=closed, 1=fully open
  venomDrip: number, // 0=none, 1=full drip
): void {
  const spread = openAmt * 4;
  const fangLen = 4 + openAmt * 3;

  for (const side of [-1, 1]) {
    // chelicera base
    g.ellipse(cx + side * 2, cy + 3, 1.5, 2).fill({ color: COL_CEPH });

    // fang curve
    const fx = cx + side * (2.5 + spread);
    const fy = cy + 3 + fangLen;
    g.moveTo(cx + side * 2, cy + 4)
      .quadraticCurveTo(cx + side * (3 + spread * 0.5), cy + 4 + fangLen * 0.6, fx, fy)
      .stroke({ color: COL_FANG, width: 1.5 });

    // fang tip highlight
    g.circle(fx, fy, 0.6).fill({ color: COL_FANG_TIP });

    // venom droplet
    if (venomDrip > 0) {
      g.circle(fx, fy + 1.5 + venomDrip * 2, 0.8 * venomDrip)
        .fill({ color: COL_VENOM, alpha: 0.7 * venomDrip });
    }
  }
}

/** Draw body bristles/hairs */
function drawBristles(g: Graphics, cx: number, cy: number): void {
  const bristles = [
    [-5, -2, -7, -5], [5, -2, 7, -5],
    [-3, -4, -5, -7], [3, -4, 5, -7],
    [-6, 1, -8, -1], [6, 1, 8, -1],
  ];
  for (const [x1, y1, x2, y2] of bristles) {
    g.moveTo(cx + x1, cy + y1).lineTo(cx + x2, cy + y2)
      .stroke({ color: COL_LEG_HAIR, width: 0.5 });
  }
}

// --- state frame generators ---

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1;
  const legPhase = t * Math.PI * 2 * 0.3;

  const bodyCY = GY - 10;
  const abCY = bodyCY + 8;

  drawShadow(g, CX, GY);

  // back legs first (behind body)
  for (let i = 2; i < 4; i++) {
    drawLeg(g, CX + 6, bodyCY + 1, 1, i, legPhase, 0);
    drawLeg(g, CX - 6, bodyCY + 1, -1, i, legPhase, 0);
  }

  // abdomen
  drawAbdomen(g, CX, abCY + breathe * 0.3, breathe, 1);

  // cephalothorax
  drawCephalothorax(g, CX, bodyCY + breathe * 0.2);

  // bristles on cephalothorax
  drawBristles(g, CX, bodyCY + breathe * 0.2);

  // front legs (over body)
  for (let i = 0; i < 2; i++) {
    drawLeg(g, CX + 6, bodyCY + 1, 1, i, legPhase, 0);
    drawLeg(g, CX - 6, bodyCY + 1, -1, i, legPhase, 0);
  }

  // eyes + fangs
  drawEyes(g, CX, bodyCY - 2 + breathe * 0.2, 0);
  drawFangs(g, CX, bodyCY + 1 + breathe * 0.2, 0.1, 0);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const legPhase = t * Math.PI * 2 * 2;   // fast walk cycle
  const bodyBob = Math.abs(Math.sin(t * Math.PI * 2)) * 2;

  const bodyCY = GY - 10 - bodyBob;
  const abCY = bodyCY + 8;

  drawShadow(g, CX, GY, 1 - bodyBob * 0.02);

  // back legs
  for (let i = 2; i < 4; i++) {
    drawLeg(g, CX + 6, bodyCY + 1, 1, i, legPhase, 0);
    drawLeg(g, CX - 6, bodyCY + 1, -1, i, legPhase, 0);
  }

  drawAbdomen(g, CX, abCY, 0, 1);
  drawCephalothorax(g, CX, bodyCY);
  drawBristles(g, CX, bodyCY);

  // front legs
  for (let i = 0; i < 2; i++) {
    drawLeg(g, CX + 6, bodyCY + 1, 1, i, legPhase, 0);
    drawLeg(g, CX - 6, bodyCY + 1, -1, i, legPhase, 0);
  }

  drawEyes(g, CX, bodyCY - 2, 0);
  drawFangs(g, CX, bodyCY + 1, 0.15, 0);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // phases: crouch (0-0.25), lunge (0.25-0.55), bite (0.55-0.75), retract (0.75-1)
  let lunge = 0;
  let fangOpen = 0;
  let venomDrip = 0;
  let crouchAmt = 0;

  if (t < 0.25) {
    crouchAmt = t / 0.25;
    fangOpen = crouchAmt * 0.5;
  } else if (t < 0.55) {
    const lt = (t - 0.25) / 0.3;
    crouchAmt = 1 - lt;
    lunge = lt * 8;
    fangOpen = 0.5 + lt * 0.5;
  } else if (t < 0.75) {
    const lt = (t - 0.55) / 0.2;
    lunge = 8 - lt * 4;
    fangOpen = 1;
    venomDrip = lt;
  } else {
    const lt = (t - 0.75) / 0.25;
    lunge = 4 - lt * 4;
    fangOpen = 1 - lt;
    venomDrip = 1 - lt;
  }

  const bodyCY = GY - 10 + crouchAmt * 3;
  const abCY = bodyCY + 8;
  const attackCX = CX - lunge;

  drawShadow(g, CX, GY, 1 + crouchAmt * 0.1);

  // back legs
  for (let i = 2; i < 4; i++) {
    drawLeg(g, attackCX + 6, bodyCY + 1, 1, i, frame * 0.3, crouchAmt);
    drawLeg(g, attackCX - 6, bodyCY + 1, -1, i, frame * 0.3, crouchAmt);
  }

  drawAbdomen(g, attackCX, abCY, crouchAmt * 2, 1);
  drawCephalothorax(g, attackCX, bodyCY);
  drawBristles(g, attackCX, bodyCY);

  // front legs reared up during bite
  for (let i = 0; i < 2; i++) {
    drawLeg(g, attackCX + 6, bodyCY + 1, 1, i, frame * 0.3 + fangOpen * 2, crouchAmt);
    drawLeg(g, attackCX - 6, bodyCY + 1, -1, i, frame * 0.3 + fangOpen * 2, crouchAmt);
  }

  // eyes glow during attack
  drawEyes(g, attackCX, bodyCY - 2, fangOpen);
  drawFangs(g, attackCX, bodyCY + 1, fangOpen, venomDrip);

  // venom splash on bite
  if (fangOpen > 0.8 && venomDrip > 0.3) {
    for (let i = 0; i < 3; i++) {
      const angle = -0.8 + i * 0.4;
      const dist = 6 + i * 3;
      g.circle(attackCX - dist * Math.cos(angle), bodyCY + 6 + dist * Math.sin(angle), 1.0 - i * 0.2)
        .fill({ color: COL_VENOM, alpha: 0.5 * venomDrip });
    }
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  // spider shoots web silk
  const bodyCY = GY - 10;
  const abCY = bodyCY + 8;
  const rearUp = Math.sin(t * Math.PI) * 3;

  drawShadow(g, CX, GY);

  // back legs braced
  for (let i = 2; i < 4; i++) {
    drawLeg(g, CX + 6, bodyCY + 1 + rearUp * 0.3, 1, i, 0, 0.3);
    drawLeg(g, CX - 6, bodyCY + 1 + rearUp * 0.3, -1, i, 0, 0.3);
  }

  drawAbdomen(g, CX, abCY + rearUp * 0.5, rearUp, 1);

  // web silk threads shooting from spinnerets
  if (t > 0.15) {
    const webProgress = clamp01((t - 0.15) / 0.7);
    const webLen = webProgress * 20;
    for (let i = -1; i <= 1; i++) {
      const angle = i * 0.25;
      const endX = CX + Math.cos(Math.PI * 0.5 + angle) * webLen;
      const endY = abCY + 8 + Math.sin(Math.PI * 0.5 + angle) * webLen;
      g.moveTo(CX + i * 1.5, abCY + 7)
        .lineTo(endX, endY)
        .stroke({ color: COL_WEB, width: 0.8, alpha: 0.6 + webProgress * 0.3 });

      // web globs at thread ends
      if (webProgress > 0.3) {
        g.circle(endX, endY, 1.2).fill({ color: COL_WEB, alpha: 0.5 });
      }
    }

    // cross threads forming web pattern
    if (webProgress > 0.5) {
      const crossAlpha = (webProgress - 0.5) * 2;
      for (let r = 0; r < 3; r++) {
        const dist = 6 + r * 5;
        const arcY = abCY + 8 + dist;
        g.moveTo(CX - dist * 0.4, arcY)
          .quadraticCurveTo(CX, arcY + 2, CX + dist * 0.4, arcY)
          .stroke({ color: COL_WEB, width: 0.5, alpha: 0.3 * crossAlpha });
      }
    }
  }

  drawCephalothorax(g, CX, bodyCY - rearUp * 0.3);
  drawBristles(g, CX, bodyCY - rearUp * 0.3);

  // front legs raised
  for (let i = 0; i < 2; i++) {
    drawLeg(g, CX + 6, bodyCY + 1 - rearUp * 0.3, 1, i, rearUp * 0.5, 0);
    drawLeg(g, CX - 6, bodyCY + 1 - rearUp * 0.3, -1, i, rearUp * 0.5, 0);
  }

  drawEyes(g, CX, bodyCY - 2 - rearUp * 0.3, 0.5);
  drawFangs(g, CX, bodyCY + 1 - rearUp * 0.3, 0.2, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = clamp01(frame / 7);

  const fade = 1 - t * 0.8;
  const curl = t;   // legs curl inward as spider dies
  const roll = t * 2; // tips over

  g.alpha = fade;

  const bodyCY = GY - 10 + t * 5;
  const abCY = bodyCY + 8;

  drawShadow(g, CX, GY, 1 - t * 0.4);

  // abdomen shrinks as it curls
  g.ellipse(CX, abCY, 10 - curl * 3, 8 - curl * 2).fill({ color: COL_ABDOMEN });
  if (curl < 0.5) {
    // fading marking
    g.moveTo(CX - 3, abCY - 3).lineTo(CX, abCY - 0.5).lineTo(CX + 3, abCY - 3).closePath()
      .fill({ color: COL_MARKING, alpha: 1 - curl * 2 });
  }

  // cephalothorax tilts
  g.ellipse(CX + roll, bodyCY + roll, 7 - curl * 2, 5.5 - curl * 1.5).fill({ color: COL_CEPH });

  // legs curl inward
  for (let i = 0; i < 4; i++) {
    const curlPhase = curl * Math.PI * 0.8;
    const legBaseY = bodyCY + 1 + curl * 3;
    // curl legs toward center on death
    const shrink = 1 - curl * 0.6;
    const cx2 = CX + roll;

    for (const side of [1, -1] as const) {
      const bx = cx2 + side * 6 * shrink;
      const j1x = bx + side * 5 * shrink;
      const j1y = legBaseY - 3 + curlPhase * 2;
      const j2x = bx + side * 3 * shrink;
      const j2y = legBaseY + curlPhase * 3;

      g.moveTo(bx, legBaseY).lineTo(j1x, j1y)
        .stroke({ color: COL_LEG, width: 1.5 * shrink });
      g.moveTo(j1x, j1y).lineTo(j2x, j2y)
        .stroke({ color: COL_LEG, width: 1.2 * shrink });
    }
  }

  // eyes dim
  if (t < 0.6) {
    drawEyes(g, CX + roll, bodyCY - 2 + roll, 0);
  }
}

// --- frame generation ---

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames,  count: 8 },
  [UnitState.CAST]:   { gen: generateCastFrames,    count: 8 },
  [UnitState.DIE]:    { gen: generateDieFrames,     count: 8 },
};

export function generateSpiderFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();
  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];
    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);
      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }
    result.set(state, textures);
  }
  return result;
}
