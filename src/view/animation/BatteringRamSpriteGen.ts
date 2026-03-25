// Procedural sprite generator for the BatteringRam unit type.
//
// Draws a detailed medieval battering ram at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 5, CAST 6, DIE 7).
//
// Visual features:
//   • Heavy timber frame with cross-bracing and iron brackets
//   • Protective hide/wood canopy roof over the frame
//   • Iron ram head sculpted as a ram's skull with rivets & bands
//   • Spoked wheels with iron rims and hub detail
//   • Crew of soldiers with helmets, chain mail, varied poses
//   • Impact sparks, wood splinters, dust clouds

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// --- palette ---
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4b3020;
const COL_WOOD_LT = 0x8b6a4a;
const COL_WOOD_GRAIN = 0x5a3e22;
const COL_IRON = 0x606068;
const COL_IRON_DK = 0x3a3a42;
const COL_IRON_HI = 0x8a8a96;
const COL_IRON_RIM = 0x505058;
const COL_SKIN = 0xd4a574;
const COL_MAIL = 0x7a7a82;
const COL_MAIL_DK = 0x5a5a64;
const COL_HELMET = 0x888890;
const COL_HELMET_HI = 0xaaaaB4;
const COL_CLOTH = 0x4a6a8a;
const COL_CLOTH_DK = 0x3a5a7a;
const COL_HIDE = 0x7a6040;
const COL_HIDE_DK = 0x5a4830;
const COL_ROPE = 0xb09060;
const COL_SHADOW = 0x000000;
const COL_SPARK = 0xffdd44;
const COL_SPARK_HI = 0xffffff;
const COL_DUST = 0xc0a878;
const COL_SPLINTER = 0x9a7a4a;
const COL_FIRE = 0xff6622;

// ───────────────────── drawing helpers ─────────────────────

function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number): void {
  g.fill({ color }).rect(x, y, w, h);
}

function circle(g: Graphics, x: number, y: number, r: number, color: number): void {
  g.fill({ color }).circle(x, y, r);
}

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number): void {
  g.fill({ color }).ellipse(x, y, rx, ry);
}

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w: number = 1): void {
  g.stroke({ color, width: w }).moveTo(x1, y1).lineTo(x2, y2);
}

function pixel(g: Graphics, x: number, y: number, color: number): void {
  g.fill({ color }).rect(x, y, 1, 1);
}

// ───────────────────── shadow ─────────────────────

function drawShadow(g: Graphics, scaleX: number = 1): void {
  ellipse(g, CX, GY, 18 * scaleX, 4, COL_SHADOW);
}

// ───────────────────── wheels ─────────────────────

function drawWheel(g: Graphics, cx: number, cy: number, r: number, rotation: number): void {
  // iron rim
  circle(g, cx, cy, r, COL_IRON_RIM);
  // wooden wheel body
  circle(g, cx, cy, r - 1, COL_WOOD_DK);
  // spokes (6)
  for (let s = 0; s < 6; s++) {
    const a = rotation + (s * Math.PI) / 3;
    const sx = cx + Math.cos(a) * (r - 2);
    const sy = cy + Math.sin(a) * (r - 2);
    line(g, cx, cy, sx, sy, COL_WOOD_LT, 1);
  }
  // hub
  circle(g, cx, cy, 2, COL_IRON);
  circle(g, cx, cy, 1, COL_IRON_HI);
  // iron rim highlight arc (top)
  pixel(g, cx - 1, cy - r, COL_IRON_HI);
  pixel(g, cx, cy - r, COL_IRON_HI);
  pixel(g, cx + 1, cy - r, COL_IRON_HI);
}

// ───────────────────── frame ─────────────────────

function drawFrame(g: Graphics, ox: number, oy: number): void {
  const baseY = GY - 8 + oy;

  // --- bottom frame rail ---
  rect(g, 8 + ox, baseY, 32, 3, COL_WOOD_DK);
  // wood grain lines
  line(g, 9 + ox, baseY + 1, 39 + ox, baseY + 1, COL_WOOD_GRAIN, 1);

  // --- vertical posts (4) ---
  const posts = [9, 17, 29, 37];
  for (const px of posts) {
    rect(g, px + ox, baseY - 12, 3, 12, COL_WOOD);
    // wood grain
    line(g, px + 1 + ox, baseY - 11, px + 1 + ox, baseY - 1, COL_WOOD_GRAIN, 1);
    // iron bracket at base
    rect(g, px - 1 + ox, baseY - 1, 5, 2, COL_IRON_DK);
    pixel(g, px + ox, baseY - 1, COL_IRON_HI);
    pixel(g, px + 2 + ox, baseY - 1, COL_IRON_HI);
  }

  // --- top rail ---
  rect(g, 8 + ox, baseY - 13, 32, 2, COL_WOOD_DK);
  line(g, 9 + ox, baseY - 12, 39 + ox, baseY - 12, COL_WOOD_GRAIN, 1);
  // iron brackets on top rail
  rect(g, 8 + ox, baseY - 14, 4, 2, COL_IRON_DK);
  rect(g, 36 + ox, baseY - 14, 4, 2, COL_IRON_DK);

  // --- cross bracing (X shapes between posts) ---
  line(g, 11 + ox, baseY - 11, 18 + ox, baseY - 2, COL_WOOD_LT, 1);
  line(g, 18 + ox, baseY - 11, 11 + ox, baseY - 2, COL_WOOD_LT, 1);
  line(g, 30 + ox, baseY - 11, 38 + ox, baseY - 2, COL_WOOD_LT, 1);
  line(g, 38 + ox, baseY - 11, 30 + ox, baseY - 2, COL_WOOD_LT, 1);

  // --- rope lashings at joints ---
  const ropeJoints = [10, 18, 30, 38];
  for (const rx of ropeJoints) {
    pixel(g, rx + ox, baseY - 10, COL_ROPE);
    pixel(g, rx + ox, baseY - 9, COL_ROPE);
    pixel(g, rx + 1 + ox, baseY - 10, COL_ROPE);
  }
}

// ───────────────────── canopy / roof ─────────────────────

function drawCanopy(g: Graphics, ox: number, oy: number, tearProgress: number = 0): void {
  const baseY = GY - 8 + oy;
  const roofY = baseY - 15;

  if (tearProgress >= 1) return;

  // ridge beam
  rect(g, 10 + ox, roofY - 3, 28, 2, COL_WOOD_DK);

  // hide/leather canopy panels (sloped on each side)
  // front slope
  for (let i = 0; i < 6; i++) {
    const tearCut = tearProgress > 0 && i > 3 * (1 - tearProgress);
    if (tearCut) continue;
    const y = roofY - 2 + i;
    const xL = 9 + ox - i;
    const w = 30 + i * 2;
    rect(g, xL, y, w, 1, i % 2 === 0 ? COL_HIDE : COL_HIDE_DK);
  }

  // stitching lines on canopy
  for (let sx = 12 + ox; sx < 36 + ox; sx += 5) {
    if (tearProgress > 0.5) continue;
    line(g, sx, roofY - 1, sx, roofY + 3, COL_ROPE, 1);
  }

  // canopy support poles on the sides
  rect(g, 7 + ox, roofY, 2, 4, COL_WOOD);
  rect(g, 39 + ox, roofY, 2, 4, COL_WOOD);
}

// ───────────────────── ram head ─────────────────────

function drawRamHead(g: Graphics, swingDeg: number, ox: number = 0, oy: number = 0): void {
  const pivotX = CX + ox;
  const pivotY = GY - 14 + oy;
  const armLen = 18;
  const rad = (swingDeg * Math.PI) / 180;
  const tipX = pivotX + Math.cos(rad) * armLen;
  const tipY = pivotY + Math.sin(rad) * armLen;

  // suspension ropes from top rail
  line(g, pivotX - 4, pivotY - 6, pivotX - 2 + Math.sin(rad) * 3, pivotY + Math.sin(rad) * 2, COL_ROPE, 1);
  line(g, pivotX + 4, pivotY - 6, pivotX + 2 + Math.sin(rad) * 3, pivotY + Math.sin(rad) * 2, COL_ROPE, 1);

  // ram shaft (thick log)
  line(g, pivotX, pivotY, tipX, tipY, COL_WOOD_DK, 4);
  line(g, pivotX, pivotY, tipX, tipY, COL_WOOD, 2);
  // wood grain on shaft
  const mx = (pivotX + tipX) / 2;
  const my = (pivotY + tipY) / 2;
  pixel(g, mx, my, COL_WOOD_GRAIN);
  pixel(g, mx + 2, my, COL_WOOD_GRAIN);

  // reinforcement iron bands on shaft
  for (let b = 0; b < 3; b++) {
    const t = 0.3 + b * 0.2;
    const bx = pivotX + (tipX - pivotX) * t;
    const by = pivotY + (tipY - pivotY) * t;
    circle(g, bx, by, 2, COL_IRON_DK);
    pixel(g, bx, by - 1, COL_IRON_HI);
  }

  // --- ram's head / skull at tip ---
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);

  // skull main shape
  const skullX = tipX + dx * 4;
  const skullY = tipY + dy * 4;
  circle(g, skullX, skullY, 4, COL_IRON);

  // pointed snout
  const snoutX = skullX + dx * 4;
  const snoutY = skullY + dy * 4;
  g.fill({ color: COL_IRON_DK });
  g.moveTo(skullX + dy * 3, skullY - dx * 3)
    .lineTo(snoutX, snoutY)
    .lineTo(skullX - dy * 3, skullY + dx * 3)
    .closePath();

  // highlight on skull top
  pixel(g, skullX - dy * 2, skullY + dx * 2, COL_IRON_HI);
  pixel(g, skullX, skullY - 2, COL_IRON_HI);

  // eye sockets (dark dots)
  const eyeOff = 2;
  pixel(g, skullX + dy * eyeOff + dx * 1, skullY - dx * eyeOff + dy * 1, 0x111111);
  pixel(g, skullX - dy * eyeOff + dx * 1, skullY + dx * eyeOff + dy * 1, 0x111111);

  // curled horns
  const horn1X = skullX + dy * 4 - dx * 2;
  const horn1Y = skullY - dx * 4 - dy * 2;
  const horn2X = skullX - dy * 4 - dx * 2;
  const horn2Y = skullY + dx * 4 - dy * 2;
  line(g, skullX + dy * 3, skullY - dx * 3, horn1X, horn1Y, COL_IRON_DK, 2);
  line(g, skullX - dy * 3, skullY + dx * 3, horn2X, horn2Y, COL_IRON_DK, 2);
  pixel(g, horn1X, horn1Y, COL_IRON_HI);
  pixel(g, horn2X, horn2Y, COL_IRON_HI);

  // rivets along skull-shaft junction
  for (let r = -1; r <= 1; r++) {
    pixel(g, tipX + dy * r * 2, tipY - dx * r * 2, COL_IRON_HI);
  }
}

// ───────────────────── crew / soldiers ─────────────────────

function drawSoldier(
  g: Graphics,
  x: number,
  y: number,
  armAngle: number = 0, // 0 = arms at side, >0 = pushing forward
  legPhase: number = 0, // 0..1 walk cycle
  facingRight: boolean = true,
): void {
  const dir = facingRight ? 1 : -1;

  // legs (walk cycle)
  const legSpread = Math.sin(legPhase * Math.PI * 2) * 3;
  rect(g, x - 2, y + 2, 2, 5, COL_CLOTH); // left leg
  rect(g, x + 1, y + 2, 2, 5, COL_CLOTH); // right leg
  // offset legs for walking
  if (Math.abs(legSpread) > 0.5) {
    rect(g, x - 2 + legSpread * 0.5, y + 5, 2, 2, COL_CLOTH_DK);
    rect(g, x + 1 - legSpread * 0.5, y + 5, 2, 2, COL_CLOTH_DK);
  }
  // boots
  rect(g, x - 2, y + 7, 2, 1, COL_IRON_DK);
  rect(g, x + 1, y + 7, 2, 1, COL_IRON_DK);

  // torso — chain mail
  rect(g, x - 2, y - 3, 5, 6, COL_MAIL);
  // mail texture dots
  pixel(g, x - 1, y - 2, COL_MAIL_DK);
  pixel(g, x + 1, y - 1, COL_MAIL_DK);
  pixel(g, x, y, COL_MAIL_DK);
  pixel(g, x + 2, y - 2, COL_MAIL_DK);
  // belt
  rect(g, x - 2, y + 1, 5, 1, COL_WOOD_DK);
  pixel(g, x, y + 1, COL_IRON_HI); // buckle

  // arms (pushing)
  const armDx = Math.cos(armAngle) * 3 * dir;
  const armDy = -Math.sin(armAngle) * 2;
  rect(g, x + 3 * dir, y - 2 + armDy, 3 * dir, 2, COL_MAIL);
  rect(g, x + 3 * dir + armDx, y - 2 + armDy, 2, 2, COL_SKIN); // hand

  // head
  circle(g, x + 1, y - 5, 2, COL_SKIN);
  // helmet
  rect(g, x - 1, y - 8, 4, 3, COL_HELMET);
  // helmet highlight
  pixel(g, x, y - 8, COL_HELMET_HI);
  pixel(g, x + 1, y - 8, COL_HELMET_HI);
  // nasal guard
  rect(g, x + dir, y - 6, 1, 2, COL_HELMET);
  // face detail
  pixel(g, x + dir, y - 5, 0x222222); // eye
}

// ───────────────────── impact effects ─────────────────────

function drawSparks(g: Graphics, cx: number, cy: number, intensity: number, seed: number): void {
  for (let i = 0; i < 6; i++) {
    const a = seed + i * 1.1;
    const dist = 3 + intensity * (4 + (i % 3) * 2);
    const sx = cx + Math.cos(a) * dist;
    const sy = cy + Math.sin(a) * dist;
    const col = i % 2 === 0 ? COL_SPARK : COL_SPARK_HI;
    pixel(g, sx, sy, col);
    if (intensity > 0.5) {
      pixel(g, sx + 1, sy, COL_FIRE);
    }
  }
}

function drawSplinters(g: Graphics, cx: number, cy: number, intensity: number, seed: number): void {
  for (let i = 0; i < 5; i++) {
    const a = seed + i * 1.3;
    const dist = 2 + intensity * (3 + i * 2);
    const sx = cx + Math.cos(a) * dist;
    const sy = cy + Math.sin(a) * dist;
    const ex = sx + Math.cos(a) * 3;
    const ey = sy + Math.sin(a) * 3;
    line(g, sx, sy, ex, ey, COL_SPLINTER, 1);
  }
}

function drawDust(g: Graphics, cx: number, cy: number, spread: number, opacity: number): void {
  if (opacity <= 0) return;
  for (let i = 0; i < 4; i++) {
    const dx = (i - 1.5) * spread * 2 + Math.sin(i * 2.3) * spread;
    const dy = Math.cos(i * 1.7) * spread * 0.5;
    ellipse(g, cx + dx, cy + dy, 2 + spread * 0.5, 1 + spread * 0.3, COL_DUST);
  }
}

function drawShockwave(g: Graphics, cx: number, cy: number, radius: number): void {
  if (radius <= 0) return;
  g.stroke({ color: 0xffffff, width: 1 }).circle(cx, cy, radius);
}

// ───────────────────── state generators ─────────────────────

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.8;
  const wheelRot = t * 0.3;

  // wheels
  drawWheel(g, 13, GY - 1, 5, wheelRot);
  drawWheel(g, 35, GY - 1, 5, wheelRot);

  // frame
  drawFrame(g, sway * 0.3, breathe * 0.3);

  // canopy
  drawCanopy(g, sway * 0.3, breathe * 0.3);

  // ram (gentle swing)
  drawRamHead(g, 90 + Math.sin(t * Math.PI * 2) * 4, sway * 0.3, breathe * 0.3);

  // crew (2 soldiers flanking, idle stance)
  drawSoldier(g, CX - 10, GY - 14 + breathe, 0.2, t * 0.1, true);
  drawSoldier(g, CX + 6, GY - 14 + breathe, 0.2, t * 0.1 + 0.5, true);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bounce = Math.abs(Math.sin(t * Math.PI * 2)) * 1.5;
  const lean = Math.sin(t * Math.PI * 2) * 1.5;
  const wheelRot = t * Math.PI * 0.8;

  // dust clouds behind
  drawDust(g, CX - 12 - lean, GY - 1, 1.5 + t * 0.5, 0.6);

  // wheel track marks
  line(g, 8 - lean * 2, GY + 1, 16 - lean, GY + 1, COL_DUST, 1);
  line(g, 28 - lean * 2, GY + 1, 40 - lean, GY + 1, COL_DUST, 1);

  drawShadow(g);

  // wheels (spinning)
  drawWheel(g, 13 + lean * 0.5, GY - 1, 5, wheelRot);
  drawWheel(g, 35 + lean * 0.5, GY - 1, 5, wheelRot);

  // frame
  drawFrame(g, lean, -bounce * 0.5);

  // canopy
  drawCanopy(g, lean, -bounce * 0.5);

  // ram swings with momentum
  drawRamHead(g, 90 + lean * 2 + bounce, lean, -bounce * 0.5);

  // crew pushing (3 soldiers, leaning forward, running)
  drawSoldier(g, CX - 14 + lean * 0.5, GY - 14 + bounce * 0.5, 0.8, t, true);
  drawSoldier(g, CX - 6 + lean * 0.3, GY - 14 + bounce * 0.3, 0.7, t + 0.33, true);
  drawSoldier(g, CX + 2 + lean * 0.2, GY - 14 + bounce * 0.4, 0.6, t + 0.66, true);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  // swing sequence: pull back → swing forward → impact
  const swingAngles = [-25, -15, 20, 50, 35];
  const swing = swingAngles[frame] ?? 0;
  const isImpact = frame >= 3;
  const impactIntensity = frame === 3 ? 1 : frame === 4 ? 0.6 : 0;

  // wheels
  drawWheel(g, 13, GY - 1, 5, frame * 0.2);
  drawWheel(g, 35, GY - 1, 5, frame * 0.2);

  // frame (recoil on impact)
  const recoil = isImpact ? (frame - 3) * -1.5 : 0;
  drawFrame(g, recoil, 0);

  // canopy
  drawCanopy(g, recoil, 0);

  // ram head
  drawRamHead(g, 90 + swing, recoil, 0);

  // crew — push forward on swing, brace on impact
  const pushOff = frame < 3 ? frame * 2 : 6 - (frame - 3) * 2;
  drawSoldier(g, CX - 14 + pushOff, GY - 14, 0.6 + frame * 0.1, frame * 0.15, true);
  drawSoldier(g, CX - 6 + pushOff * 0.8, GY - 14, 0.5 + frame * 0.1, frame * 0.15 + 0.3, true);
  drawSoldier(g, CX + 2 + pushOff * 0.6, GY - 14, 0.4 + frame * 0.1, frame * 0.15 + 0.6, true);

  // impact effects
  if (isImpact) {
    const ramTipX = CX + Math.cos((90 + swing) * Math.PI / 180) * 22;
    const ramTipY = GY - 14 + Math.sin((90 + swing) * Math.PI / 180) * 22;

    drawSparks(g, ramTipX, ramTipY, impactIntensity, frame * 2);
    drawSplinters(g, ramTipX, ramTipY, impactIntensity, frame * 1.5);
    drawShockwave(g, ramTipX, ramTipY, impactIntensity * 8);
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  // cast reuses idle with a slight variation (ram glows with gathered force)
  generateIdleFrames(g, frame % 8);

  // add a subtle "readying" glow on the ram head
  const pulse = Math.sin((frame / 6) * Math.PI * 2) * 0.5 + 0.5;
  const glowR = 3 + pulse * 3;
  g.fill({ color: COL_SPARK, alpha: 0.15 + pulse * 0.1 }).circle(CX + 18, GY - 14, glowR);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const p = frame / 6; // 0..1 progress
  const collapse = p * p; // accelerating

  // shadow shrinks
  drawShadow(g, 1 - collapse * 0.5);

  // frame breaks apart
  const tiltAngle = collapse * 25;
  const sinkY = collapse * 12;
  const splitX = collapse * 6;

  // left side of frame breaks off
  const lx = -splitX;
  const ly = sinkY;

  // right side
  const rx = splitX * 0.5;
  const ry = sinkY * 0.7;

  // draw broken left half
  if (p < 0.85) {
    const baseY = GY - 8 + ly;
    // broken posts
    rect(g, 9 + lx, baseY - 12 + tiltAngle * 0.3, 3, 10, COL_WOOD);
    rect(g, 17 + lx, baseY - 8, 3, 8, COL_WOOD);
    // broken rail
    rect(g, 8 + lx, baseY - 2, 14, 2, COL_WOOD_DK);
    // wheel falls off
    drawWheel(g, 13 + lx * 1.5, GY - 1 + ly * 0.5, 5, p * 4);
  }

  // draw broken right half
  if (p < 0.9) {
    const baseY = GY - 8 + ry;
    rect(g, 29 + rx, baseY - 10, 3, 8, COL_WOOD);
    rect(g, 37 + rx, baseY - 6 - tiltAngle * 0.2, 3, 6, COL_WOOD);
    rect(g, 26 + rx, baseY - 1, 14, 2, COL_WOOD_DK);
    drawWheel(g, 35 + rx * 2, GY - 1 + ry * 0.3, 5, -p * 3);
  }

  // canopy tears and falls
  drawCanopy(g, lx * 0.5, ly * 0.5 + sinkY * 0.3, p);

  // ram log drops
  if (p < 0.8) {
    const ramDrop = collapse * 15;
    const ramTilt = collapse * 40;
    line(g, CX - 8, GY - 12 + ramDrop, CX + 12, GY - 12 + ramDrop + ramTilt * 0.3, COL_WOOD_DK, 3);
    circle(g, CX + 12, GY - 12 + ramDrop + ramTilt * 0.3, 3, COL_IRON);
  }

  // splinters flying
  drawSplinters(g, CX, GY - 10, collapse, frame * 0.7);
  if (p > 0.3) {
    drawSplinters(g, CX + 5, GY - 6, (p - 0.3) * 1.5, frame * 1.2);
  }

  // crew scatters
  if (p < 0.7) {
    // soldiers running away
    const flee1 = p * 20;
    const flee2 = p * 15;
    drawSoldier(g, CX - 14 - flee1, GY - 14 + sinkY * 0.3, 0.3, p * 3, false);
    if (p < 0.5) {
      drawSoldier(g, CX + 8 + flee2, GY - 14 + sinkY * 0.2, 0.3, p * 3 + 0.5, true);
    }
  }

  // dust cloud at base
  drawDust(g, CX, GY - 2, 3 + collapse * 6, 1 - collapse * 0.5);
}

// ───────────────────── generator registry ─────────────────────

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 5 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateBatteringRamFrames(renderer: Renderer): Map<UnitState, Texture[]> {
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
