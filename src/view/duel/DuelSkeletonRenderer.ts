// ---------------------------------------------------------------------------
// Duel mode – skeleton-based fighter renderer (bone/limb system)
// Inspired by fantasiaCup's Canvas2D bone renderer, adapted for PixiJS Graphics.
// Fighters are drawn each frame using joint positions (poses).
// ---------------------------------------------------------------------------

import { Graphics } from "pixi.js";

// ---- Pose types -----------------------------------------------------------

export interface PoseHead {
  x: number;
  y: number;
  radius?: number;
}

export interface PoseTorso {
  x: number;
  y: number;
  topWidth: number;
  bottomWidth: number;
  height: number;
  rotation?: number;
}

export interface PoseArm {
  shoulderX: number;
  shoulderY: number;
  elbowX: number;
  elbowY: number;
  handX: number;
  handY: number;
  open?: boolean;
}

export interface PoseLeg {
  hipX: number;
  hipY: number;
  kneeX: number;
  kneeY: number;
  footX: number;
  footY: number;
}

export interface FighterPose {
  head: PoseHead;
  torso: PoseTorso;
  frontArm: PoseArm;
  backArm: PoseArm;
  frontLeg: PoseLeg;
  backLeg: PoseLeg;
}

// ---- Palette (colors per character) ---------------------------------------

export interface FighterPalette {
  skin: number;
  body: number;
  pants: number;
  shoes: number;
  hair: number;
  eyes: number;
  outline: number;
  gloves?: number;
  belt?: number;
  accent?: number;
  weapon?: number;
  weaponAccent?: number;
}

// ---- Helper functions for pose building -----------------------------------

export function pose(
  head: PoseHead,
  torso: PoseTorso,
  frontArm: PoseArm,
  backArm: PoseArm,
  frontLeg: PoseLeg,
  backLeg: PoseLeg,
): FighterPose {
  return { head, torso, frontArm, backArm, frontLeg, backLeg };
}

export function arm(
  sx: number, sy: number,
  ex: number, ey: number,
  hx: number, hy: number,
  open = false,
): PoseArm {
  return { shoulderX: sx, shoulderY: sy, elbowX: ex, elbowY: ey, handX: hx, handY: hy, open };
}

export function leg(
  hx: number, hy: number,
  kx: number, ky: number,
  fx: number, fy: number,
): PoseLeg {
  return { hipX: hx, hipY: hy, kneeX: kx, kneeY: ky, footX: fx, footY: fy };
}

export function torso(
  x: number, y: number,
  tw: number, bw: number,
  h: number, rot = 0,
): PoseTorso {
  return { x, y, topWidth: tw, bottomWidth: bw, height: h, rotation: rot };
}

export function head(x: number, y: number, r = 24): PoseHead {
  return { x, y, radius: r };
}

// ---- Color helpers --------------------------------------------------------

/** Lighten a color by mixing with white. amount 0..1 */
function lighten(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const gr = (color >> 8) & 0xff;
  const b = color & 0xff;
  const lr = Math.min(255, r + (255 - r) * amount) | 0;
  const lg = Math.min(255, gr + (255 - gr) * amount) | 0;
  const lb = Math.min(255, b + (255 - b) * amount) | 0;
  return (lr << 16) | (lg << 8) | lb;
}

/** Darken a color by mixing with black. amount 0..1 */
function darken(color: number, amount: number): number {
  const r = (color >> 16) & 0xff;
  const gr = (color >> 8) & 0xff;
  const b = color & 0xff;
  const dr = (r * (1 - amount)) | 0;
  const dg = (gr * (1 - amount)) | 0;
  const db = (b * (1 - amount)) | 0;
  return (dr << 16) | (dg << 8) | db;
}

// ---- Skeleton renderer ----------------------------------------------------

const OUTLINE_EXTRA = 4; // how many pixels wider the outline is

/**
 * Draw a limb segment (bone) with outline, muscle contour, and enhanced shading.
 * Uses PixiJS Graphics line drawing with round cap/join.
 */
function drawLimb(
  g: Graphics,
  x1: number, y1: number,
  x2: number, y2: number,
  thickness: number,
  color: number,
  outlineColor: number,
): void {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len; // perpendicular
  const ny = dx / len;

  // Outline (thicker for more definition)
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke({ color: outlineColor, width: thickness + OUTLINE_EXTRA, cap: "round", join: "round" });

  // Fill
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke({ color, width: thickness, cap: "round", join: "round" });

  // Multi-point muscle contour: bulges at 30% and 60% for bicep/forearm shape
  for (const [t, bulgeScale, lightAmt, alpha] of [[0.3, 0.16, 0.24, 0.40], [0.6, 0.10, 0.16, 0.30]] as [number, number, number, number][]) {
    const mx = x1 + dx * t;
    const my = y1 + dy * t;
    const bulge = thickness * bulgeScale;
    g.moveTo(x1 + nx * bulge * 0.5, y1 + ny * bulge * 0.5);
    g.quadraticCurveTo(mx + nx * (bulge + thickness * 0.18), my + ny * (bulge + thickness * 0.18),
      x2 + nx * bulge * 0.3, y2 + ny * bulge * 0.3);
    g.stroke({ color: lighten(color, lightAmt), width: thickness * 0.26, cap: "round", alpha });
  }

  // Shadow contour on the opposite side (deeper, two layers for softer falloff)
  for (const [sOff, sDark, sAlpha] of [[0.12, 0.14, 0.28], [0.08, 0.08, 0.15]] as [number, number, number][]) {
    const bulgeOff = thickness * sOff;
    g.moveTo(x1 - nx * bulgeOff, y1 - ny * bulgeOff);
    g.quadraticCurveTo(
      x1 + dx * 0.4 - nx * (bulgeOff + thickness * 0.1),
      y1 + dy * 0.4 - ny * (bulgeOff + thickness * 0.1),
      x2 - nx * bulgeOff * 0.5, y2 - ny * bulgeOff * 0.5);
    g.stroke({ color: darken(color, sDark), width: thickness * 0.22, cap: "round", alpha: sAlpha });
  }

  // Highlight edge — specular strip along one side
  const off = thickness * 0.28;
  g.moveTo(x1 + nx * off, y1 + ny * off);
  g.lineTo(x2 + nx * off * 0.7, y2 + ny * off * 0.7);
  g.stroke({ color: lighten(color, 0.25), width: thickness * 0.18, cap: "round", alpha: 0.32 });

  // Secondary highlight (narrower, brighter, for wet/shiny look)
  g.moveTo(x1 + nx * off * 0.6, y1 + ny * off * 0.6);
  g.lineTo(x1 + dx * 0.5 + nx * off * 0.5, y1 + dy * 0.5 + ny * off * 0.5);
  g.stroke({ color: lighten(color, 0.35), width: thickness * 0.08, cap: "round", alpha: 0.2 });

  // Fabric/skin creases at multiple points along the limb
  if (thickness > 10) {
    for (const ct of [0.35, 0.65]) {
      const cx = x1 + dx * ct;
      const cy = y1 + dy * ct;
      g.moveTo(cx + nx * thickness * 0.38, cy + ny * thickness * 0.38);
      g.lineTo(cx - nx * thickness * 0.38, cy - ny * thickness * 0.38);
      g.stroke({ color: darken(color, 0.08), width: 0.7, cap: "round", alpha: 0.18 });
    }
  }

  // Vein/tendon suggestion on larger limbs
  if (thickness > 16) {
    g.moveTo(x1 + nx * thickness * 0.15, y1 + ny * thickness * 0.15);
    g.quadraticCurveTo(
      x1 + dx * 0.5 + nx * thickness * 0.2, y1 + dy * 0.5 + ny * thickness * 0.2,
      x2 + nx * thickness * 0.1, y2 + ny * thickness * 0.1);
    g.stroke({ color: darken(color, 0.06), width: 0.6, cap: "round", alpha: 0.12 });
  }
}

/**
 * Draw a circle with outline, highlight, and ambient occlusion (for head, joints, etc.)
 */
function drawCircle(
  g: Graphics,
  x: number, y: number,
  radius: number,
  color: number,
  outlineColor: number,
): void {
  // Outline
  g.circle(x, y, radius + 2);
  g.fill({ color: outlineColor });
  // Fill
  g.circle(x, y, radius);
  g.fill({ color });

  // Multi-layer volume shading for convincing 3D sphere
  // Top-left bright highlight (primary specular)
  g.circle(x - radius * 0.2, y - radius * 0.22, radius * 0.42);
  g.fill({ color: lighten(color, 0.22), alpha: 0.30 });
  // Smaller, brighter specular hotspot
  g.circle(x - radius * 0.25, y - radius * 0.28, radius * 0.2);
  g.fill({ color: lighten(color, 0.4), alpha: 0.2 });

  // Mid-body ambient light (subtle)
  g.circle(x + radius * 0.05, y - radius * 0.05, radius * 0.65);
  g.fill({ color: lighten(color, 0.06), alpha: 0.12 });

  // Bottom-right ambient occlusion (larger, softer)
  { const sa = Math.PI * 0.1; g.moveTo(x + radius * 0.75 * Math.cos(sa), y + radius * 0.75 * Math.sin(sa)); }
  g.arc(x, y, radius * 0.75, Math.PI * 0.1, Math.PI * 0.9);
  g.fill({ color: darken(color, 0.12), alpha: 0.18 });

  // Edge darkening (rim shadow for depth)
  { const sa = Math.PI * 0.6; g.moveTo(x + radius * 0.9 * Math.cos(sa), y + radius * 0.9 * Math.sin(sa)); }
  g.arc(x, y, radius * 0.9, Math.PI * 0.6, Math.PI * 1.4);
  g.fill({ color: darken(color, 0.08), alpha: 0.1 });

  // Subtle rim light on the opposite side (backlight effect)
  { const sa = -Math.PI * 0.7; g.moveTo(x + radius * 0.85 * Math.cos(sa), y + radius * 0.85 * Math.sin(sa)); }
  g.arc(x, y, radius * 0.95, -Math.PI * 0.7, -Math.PI * 0.3);
  g.stroke({ color: lighten(color, 0.15), width: 1.5, alpha: 0.15 });
}

/**
 * Draw a joint circle (smaller, subtle, at articulation points).
 */
function drawJoint(
  g: Graphics,
  x: number, y: number,
  radius: number,
  color: number,
  outlineColor: number,
): void {
  g.circle(x, y, radius + 1.5);
  g.fill({ color: outlineColor });
  g.circle(x, y, radius);
  g.fill({ color });
  // Small highlight
  g.circle(x - radius * 0.25, y - radius * 0.3, radius * 0.35);
  g.fill({ color: lighten(color, 0.25), alpha: 0.4 });
}

/**
 * Draw a fist/hand with outline.
 */
function drawFist(
  g: Graphics,
  x: number, y: number,
  size: number,
  color: number,
  outlineColor: number,
  isOpen: boolean,
): void {
  if (isOpen) {
    // Open hand with individual finger details
    drawCircle(g, x, y, size * 0.8, color, outlineColor);
    // Four distinct fingers radiating outward with joints
    for (let i = -1.5; i <= 1.5; i++) {
      const angle = -Math.PI / 2 + i * 0.32;
      const knuckleR = size * 0.7;
      const fingerR = size * 1.5;
      const kx = x + Math.cos(angle) * knuckleR;
      const ky = y + Math.sin(angle) * knuckleR;
      const fx = x + Math.cos(angle) * fingerR;
      const fy = y + Math.sin(angle) * fingerR;
      // Finger outline
      g.moveTo(kx, ky);
      g.lineTo(fx, fy);
      g.stroke({ color: outlineColor, width: 3.5, cap: "round" });
      // Finger fill
      g.moveTo(kx, ky);
      g.lineTo(fx, fy);
      g.stroke({ color, width: 2.2, cap: "round" });
      // Fingertip roundness
      g.circle(fx, fy, 1.2);
      g.fill({ color: lighten(color, 0.08) });
      // Finger joint crease
      const jx = (kx + fx) / 2;
      const jy = (ky + fy) / 2;
      const perpX = -Math.sin(angle);
      const perpY = Math.cos(angle);
      g.moveTo(jx + perpX * 1.2, jy + perpY * 1.2);
      g.lineTo(jx - perpX * 1.2, jy - perpY * 1.2);
      g.stroke({ color: darken(color, 0.1), width: 0.6, cap: "round", alpha: 0.35 });
    }
    // Thumb (wider, offset angle)
    const thumbAngle = -Math.PI / 2 - 1.0;
    const tx = x + Math.cos(thumbAngle) * size * 1.15;
    const ty = y + Math.sin(thumbAngle) * size * 1.15;
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.stroke({ color: outlineColor, width: 4, cap: "round" });
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.stroke({ color, width: 2.5, cap: "round" });
    // Thumb tip
    g.circle(tx, ty, 1.5);
    g.fill({ color: lighten(color, 0.05) });
  } else {
    // Closed fist with knuckle detail and finger wraps
    // Outline
    g.roundRect(x - size - 1, y - size - 1, size * 2 + 2, size * 2 + 2, 3);
    g.fill({ color: outlineColor });
    // Fill
    g.roundRect(x - size, y - size, size * 2, size * 2, 3);
    g.fill({ color });
    // Individual knuckle bumps (four distinct knuckles)
    for (let k = 0; k < 4; k++) {
      const kx = x - size * 0.6 + k * (size * 0.4);
      g.circle(kx, y - size + 0.5, 1.3);
      g.fill({ color: darken(color, 0.12), alpha: 0.5 });
    }
    // Finger wrap lines (horizontal creases across the fist)
    g.moveTo(x - size * 0.7, y - size * 0.3);
    g.lineTo(x + size * 0.7, y - size * 0.3);
    g.stroke({ color: darken(color, 0.1), width: 0.7, cap: "round", alpha: 0.35 });
    g.moveTo(x - size * 0.6, y + size * 0.1);
    g.lineTo(x + size * 0.6, y + size * 0.1);
    g.stroke({ color: darken(color, 0.08), width: 0.6, cap: "round", alpha: 0.25 });
    // Thumb wrapped across front
    g.moveTo(x - size, y + size * 0.2);
    g.quadraticCurveTo(x - size - 2, y - size * 0.3, x - size * 0.3, y - size * 0.8);
    g.stroke({ color: darken(color, 0.06), width: 2.5, cap: "round", alpha: 0.4 });
    // Highlight on fist
    g.roundRect(x - size + 1, y - size + 1, size * 1.2, size * 0.7, 2);
    g.fill({ color: lighten(color, 0.18), alpha: 0.3 });
    // Shadow under fist
    g.roundRect(x - size + 1, y + size * 0.3, size * 1.8, size * 0.5, 2);
    g.fill({ color: darken(color, 0.12), alpha: 0.2 });
  }
}

/**
 * Draw a foot/shoe with outline, sole, and heel detail.
 */
function drawFoot(
  g: Graphics,
  x: number, y: number,
  width: number, height: number,
  color: number,
  outlineColor: number,
): void {
  // Always draw "forward" (right-facing; flip is done at container level)
  const fx = x - 4;
  const soleH = height * 0.3;
  const ankleH = height * 0.2;

  // Outline
  g.roundRect(fx - 1, y - height / 2 - 1, width + 2, height + 2, 4);
  g.fill({ color: outlineColor });

  // Boot upper (ankle section — slightly different shade for boot top)
  g.roundRect(fx, y - height / 2, width, ankleH, 4);
  g.fill({ color: lighten(color, 0.06) });

  // Boot mid section
  g.roundRect(fx, y - height / 2 + ankleH, width, height - soleH - ankleH, 3);
  g.fill({ color });

  // Sole (darker, with tread texture)
  g.roundRect(fx, y - height / 2 + height - soleH, width, soleH, 2);
  g.fill({ color: darken(color, 0.35) });
  // Tread lines on sole
  for (let t = 0; t < 3; t++) {
    const tx = fx + 4 + t * ((width - 8) / 2);
    g.moveTo(tx, y + height / 2 - soleH + 1);
    g.lineTo(tx, y + height / 2 - 1);
    g.stroke({ color: darken(color, 0.45), width: 0.6, alpha: 0.3 });
  }

  // Heel bump at the back
  g.roundRect(fx, y - height / 2 + height - soleH - 1, 5, soleH + 1, 2);
  g.fill({ color: darken(color, 0.3) });

  // Toe cap (rounded front)
  g.moveTo(fx + width - 7, y - height / 2 + 2);
  g.lineTo(fx + width - 7, y + height / 2 - soleH);
  g.stroke({ color: darken(color, 0.12), width: 1, cap: "round", alpha: 0.5 });
  // Toe cap curved seam
  g.moveTo(fx + width - 8, y - height / 2 + height * 0.3);
  g.quadraticCurveTo(fx + width - 3, y - height / 2 + height * 0.4, fx + width - 8, y - height / 2 + height * 0.5);
  g.stroke({ color: darken(color, 0.1), width: 0.8, cap: "round", alpha: 0.35 });

  // Boot ankle strap
  g.moveTo(fx + 1, y - height / 2 + ankleH);
  g.lineTo(fx + width - 1, y - height / 2 + ankleH);
  g.stroke({ color: darken(color, 0.15), width: 1.2, cap: "round", alpha: 0.4 });

  // Stitching detail along the side
  const stitchY1 = y - height / 2 + 3;
  const stitchY2 = y + height / 2 - soleH - 2;
  const stitchX = fx + width * 0.35;
  for (let s = stitchY1; s < stitchY2; s += 4) {
    g.circle(stitchX, s, 0.5);
    g.fill({ color: darken(color, 0.2), alpha: 0.3 });
  }

  // Boot highlight (leather sheen)
  g.roundRect(fx + 2, y - height / 2 + 1, width * 0.45, height * 0.3, 2);
  g.fill({ color: lighten(color, 0.15), alpha: 0.3 });

  // Lower boot shadow
  g.roundRect(fx + 1, y + height / 2 - soleH - 3, width - 2, 3, 1);
  g.fill({ color: darken(color, 0.1), alpha: 0.2 });
}

// ---- Main draw function ---------------------------------------------------

export interface DrawFighterOptions {
  pose: FighterPose;
  palette: FighterPalette;
  isFlashing?: boolean;
  flashColor?: number;
  /** When true, skip face/hair and draw a helm-colored head instead. */
  helmeted?: boolean;
  /** Helm color (used when helmeted is true). */
  helmColor?: number;
  /** When true, draw a pain/hurt expression on the face. */
  isHurt?: boolean;
  /** Breathing animation phase (0..2PI cycle), used for idle breathing sway. */
  breathePhase?: number;
  /** Draw behind body (capes, cloaks, etc.). Called before back arm. */
  drawBackExtras?: (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void;
  /** Custom draw function for character-specific details (weapon, accessories). */
  drawExtras?: (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void;
}

/**
 * Draw a full fighter skeleton into the given Graphics.
 * The graphics origin (0,0) should be at the fighter's feet (ground level).
 * The fighter is drawn facing RIGHT; flip with scale.x = -1 for left.
 */
export function drawFighterSkeleton(g: Graphics, opts: DrawFighterOptions): void {
  const { pose: p, palette: pal, isFlashing, flashColor } = opts;
  const outline = pal.outline;

  const flashing = !!(isFlashing && flashColor);
  const fColor = flashColor ?? 0xffffff;

  const skinColor = flashing ? fColor : pal.skin;
  const bodyColor = flashing ? fColor : pal.body;
  const pantsColor = flashing ? fColor : pal.pants;
  const shoeColor = flashing ? fColor : pal.shoes;
  const hairColor = flashing ? fColor : pal.hair;
  const handColor = flashing ? fColor : (pal.gloves ?? skinColor);

  // Draw back extras first (capes, cloaks) — behind everything
  opts.drawBackExtras?.(g, p, pal, flashing, fColor);

  // Draw order: back arm → back leg → torso → front leg → front arm → head

  // Back arm (slightly darker to convey depth)
  if (p.backArm) {
    const backBody = flashing ? fColor : darken(pal.body, 0.15);
    const backSkin = flashing ? fColor : darken(pal.skin, 0.1);
    const backHand = flashing ? fColor : darken(pal.gloves ?? pal.skin, 0.1);

    drawLimb(g, p.backArm.shoulderX, p.backArm.shoulderY,
      p.backArm.elbowX, p.backArm.elbowY, 14, backBody, outline);
    // Elbow joint
    drawJoint(g, p.backArm.elbowX, p.backArm.elbowY, 5, backBody, outline);
    drawLimb(g, p.backArm.elbowX, p.backArm.elbowY,
      p.backArm.handX, p.backArm.handY, 12, backSkin, outline);
    drawFist(g, p.backArm.handX, p.backArm.handY, 7, backHand, outline, !!p.backArm.open);
  }

  // Back leg (slightly darker)
  if (p.backLeg) {
    const backPants = flashing ? fColor : darken(pal.pants, 0.12);
    const backShoe = flashing ? fColor : darken(pal.shoes, 0.1);

    drawLimb(g, p.backLeg.hipX, p.backLeg.hipY,
      p.backLeg.kneeX, p.backLeg.kneeY, 18, backPants, outline);
    // Knee joint
    drawJoint(g, p.backLeg.kneeX, p.backLeg.kneeY, 6, backPants, outline);
    drawLimb(g, p.backLeg.kneeX, p.backLeg.kneeY,
      p.backLeg.footX, p.backLeg.footY, 14, backPants, outline);
    drawFoot(g, p.backLeg.footX, p.backLeg.footY, 22, 11, backShoe, outline);
  }

  // Torso — curved trapezoidal shape with detail and breathing
  if (p.torso) {
    const t = p.torso;
    // Breathing: subtle expansion of torso width and vertical sway
    const breathe = opts.breathePhase !== undefined ? opts.breathePhase : 0;
    const breatheExpand = Math.sin(breathe) * 1.2; // width expansion
    const breatheRise = Math.sin(breathe) * 0.8;   // slight rise

    const tl = -t.topWidth / 2 + t.x - breatheExpand * 0.5;
    const tr = t.topWidth / 2 + t.x + breatheExpand * 0.5;
    const bl = -t.bottomWidth / 2 + t.x;
    const br = t.bottomWidth / 2 + t.x;
    const top = -t.height / 2 + t.y - breatheRise;
    const bot = t.height / 2 + t.y;
    const midY = t.y - breatheRise * 0.5;

    // Outline (slightly curved sides via quadratic)
    g.moveTo(tl - 2, top - 2);
    g.lineTo(tr + 2, top - 2);
    g.quadraticCurveTo(br + 4, midY, br + 2, bot + 2);
    g.lineTo(bl - 2, bot + 2);
    g.quadraticCurveTo(bl - 4, midY, tl - 2, top - 2);
    g.closePath();
    g.fill({ color: outline });

    // Body fill (curved)
    g.moveTo(tl, top);
    g.lineTo(tr, top);
    g.quadraticCurveTo(br + 2, midY, br, bot);
    g.lineTo(bl, bot);
    g.quadraticCurveTo(bl - 2, midY, tl, top);
    g.closePath();
    g.fill({ color: bodyColor });

    // Chest/collar highlight — subtle curved line at top
    g.moveTo(tl + 4, top + 3);
    g.quadraticCurveTo(t.x, top + 8, tr - 4, top + 3);
    g.stroke({ color: lighten(bodyColor, 0.18), width: 2, cap: "round", alpha: 0.45 });

    // Vertical center seam (subtle)
    g.moveTo(t.x, top + 6);
    g.lineTo(t.x, bot - 4);
    g.stroke({ color: darken(bodyColor, 0.1), width: 0.8, cap: "round", alpha: 0.3 });

    // Side shading — darker strip on the back side
    g.moveTo(tl, top + 2);
    g.quadraticCurveTo(bl - 1, midY, bl, bot - 2);
    g.lineTo(bl + 5, bot - 2);
    g.quadraticCurveTo(bl + 4, midY, tl + 5, top + 2);
    g.closePath();
    g.fill({ color: darken(bodyColor, 0.12), alpha: 0.4 });

    // Belt
    if (pal.belt) {
      const beltColor = flashing ? fColor : pal.belt;
      // Belt outline
      g.rect(bl - 1, bot - 9, t.bottomWidth + 2, 10);
      g.fill({ color: outline });
      // Belt fill
      g.rect(bl, bot - 8, t.bottomWidth, 8);
      g.fill({ color: beltColor });
      // Belt highlight
      g.rect(bl + 2, bot - 8, t.bottomWidth - 4, 3);
      g.fill({ color: lighten(beltColor, 0.15), alpha: 0.3 });
      // Belt buckle
      const buckleX = t.x;
      g.roundRect(buckleX - 3, bot - 8, 6, 8, 1);
      g.fill({ color: lighten(beltColor, 0.3) });
      g.roundRect(buckleX - 2, bot - 7, 4, 6, 1);
      g.fill({ color: darken(beltColor, 0.1) });
    }

    // Armor plate / clothing detail: subtle horizontal lines suggesting layers
    if (pal.accent && !flashing) {
      const accentColor = pal.accent;
      // Collar accent
      g.moveTo(tl + 6, top + 2);
      g.quadraticCurveTo(t.x, top - 2, tr - 6, top + 2);
      g.stroke({ color: accentColor, width: 1.5, cap: "round", alpha: 0.35 });
      // Mid-chest armor line
      g.moveTo(tl + 3, midY - 4);
      g.lineTo(tr - 3, midY - 4);
      g.stroke({ color: darken(bodyColor, 0.08), width: 0.8, alpha: 0.25 });
    }

    // Pectoral/chest muscle definition (subtle curved lines)
    if (!flashing) {
      // Left pec outline
      g.moveTo(t.x - 2, top + 8);
      g.quadraticCurveTo(t.x - t.topWidth / 3 - 2, top + 18, t.x - t.topWidth / 4, midY - 6);
      g.stroke({ color: darken(bodyColor, 0.06), width: 0.8, cap: "round", alpha: 0.22 });
      // Right pec outline
      g.moveTo(t.x + 2, top + 8);
      g.quadraticCurveTo(t.x + t.topWidth / 3 + 2, top + 18, t.x + t.topWidth / 4, midY - 6);
      g.stroke({ color: darken(bodyColor, 0.06), width: 0.8, cap: "round", alpha: 0.22 });
      // Abdominal definition (subtle horizontal lines in lower torso)
      const absTop = midY + 2;
      const absBot = bot - 10;
      const absSpacing = (absBot - absTop) / 3;
      for (let a = 0; a < 3; a++) {
        const ay = absTop + a * absSpacing;
        const aw = t.bottomWidth * 0.3;
        g.moveTo(t.x - aw, ay);
        g.quadraticCurveTo(t.x, ay + 1.5, t.x + aw, ay);
        g.stroke({ color: darken(bodyColor, 0.05), width: 0.6, cap: "round", alpha: 0.18 });
      }
    }

    // Rivet/button details (tiny dots along the chest, with metallic sheen)
    if (!flashing) {
      const rivetY1 = top + 12;
      const rivetY2 = midY;
      const rivetY3 = midY + 14;
      // Rivet with metallic highlight
      for (const ry of [rivetY1, rivetY2, rivetY3]) {
        g.circle(t.x + 6, ry, 1.5);
        g.fill({ color: darken(bodyColor, 0.1), alpha: 0.4 });
        g.circle(t.x + 6, ry, 1.2);
        g.fill({ color: lighten(bodyColor, 0.25), alpha: 0.35 });
        g.circle(t.x + 5.5, ry - 0.5, 0.6);
        g.fill({ color: lighten(bodyColor, 0.4), alpha: 0.3 });
      }
    }

    // Fabric/armor fold detail — subtle diagonal creases from shoulders
    if (!flashing) {
      g.moveTo(tl + 4, top + 5);
      g.quadraticCurveTo(t.x - 4, midY - 8, bl + 6, bot - 6);
      g.stroke({ color: darken(bodyColor, 0.04), width: 0.6, cap: "round", alpha: 0.15 });
      g.moveTo(tr - 4, top + 5);
      g.quadraticCurveTo(t.x + 8, midY - 4, br - 4, bot - 6);
      g.stroke({ color: darken(bodyColor, 0.04), width: 0.6, cap: "round", alpha: 0.15 });
    }

    // Shoulder joints (round circles at arm attachment points) — with layered armor pad
    if (p.frontArm) {
      // Shoulder pad (layered with gradient for depth)
      if (!flashing) {
        g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 12);
        g.fill({ color: darken(bodyColor, 0.06), alpha: 0.2 });
        g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 10);
        g.fill({ color: darken(bodyColor, 0.03), alpha: 0.25 });
        // Shoulder pad segmented lines (layered plates)
        g.moveTo(p.frontArm.shoulderX - 8, p.frontArm.shoulderY);
        g.lineTo(p.frontArm.shoulderX + 8, p.frontArm.shoulderY);
        g.stroke({ color: darken(bodyColor, 0.1), width: 0.6, alpha: 0.2 });
      }
      drawJoint(g, p.frontArm.shoulderX, p.frontArm.shoulderY, 7, bodyColor, outline);
      // Shoulder rivet with highlight
      g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 2.5);
      g.fill({ color: darken(bodyColor, 0.05), alpha: 0.35 });
      g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 2);
      g.fill({ color: lighten(bodyColor, 0.2), alpha: 0.4 });
      g.circle(p.frontArm.shoulderX - 0.5, p.frontArm.shoulderY - 0.5, 0.8);
      g.fill({ color: lighten(bodyColor, 0.35), alpha: 0.3 });
    }
  }

  // Front leg
  if (p.frontLeg) {
    drawLimb(g, p.frontLeg.hipX, p.frontLeg.hipY,
      p.frontLeg.kneeX, p.frontLeg.kneeY, 20, pantsColor, outline);
    // Knee joint
    drawJoint(g, p.frontLeg.kneeX, p.frontLeg.kneeY, 7, pantsColor, outline);
    drawLimb(g, p.frontLeg.kneeX, p.frontLeg.kneeY,
      p.frontLeg.footX, p.frontLeg.footY, 16, pantsColor, outline);
    drawFoot(g, p.frontLeg.footX, p.frontLeg.footY, 24, 13, shoeColor, outline);
  }

  // Front arm
  if (p.frontArm) {
    drawLimb(g, p.frontArm.shoulderX, p.frontArm.shoulderY,
      p.frontArm.elbowX, p.frontArm.elbowY, 16, bodyColor, outline);
    // Elbow joint with armor pad
    drawJoint(g, p.frontArm.elbowX, p.frontArm.elbowY, 6, bodyColor, outline);
    // Elbow plate/guard detail
    if (!flashing) {
      g.circle(p.frontArm.elbowX, p.frontArm.elbowY, 4);
      g.fill({ color: lighten(bodyColor, 0.1), alpha: 0.25 });
    }
    drawLimb(g, p.frontArm.elbowX, p.frontArm.elbowY,
      p.frontArm.handX, p.frontArm.handY, 13, skinColor, outline);
    // Forearm bracer/gauntlet detail
    if (!flashing && pal.gloves) {
      const faMidX = (p.frontArm.elbowX + p.frontArm.handX) / 2;
      const faMidY = (p.frontArm.elbowY + p.frontArm.handY) / 2;
      g.circle(faMidX, faMidY, 5);
      g.fill({ color: lighten(pal.gloves, 0.08), alpha: 0.2 });
    }
    drawFist(g, p.frontArm.handX, p.frontArm.handY, 8, handColor, outline, !!p.frontArm.open);
  }

  // Head
  if (p.head) {
    // Neck
    const neckFromX = p.torso ? p.torso.x : 0;
    const neckFromY = p.torso ? p.torso.y - p.torso.height / 2 : -100;
    const hr = p.head.radius ?? 24;
    const hx = p.head.x;
    const hy = p.head.y;

    if (opts.helmeted) {
      // Helmeted head — draw neck in armor color, helm over head
      const helmCol = isFlashing && flashColor ? flashColor : (opts.helmColor ?? pal.body);
      drawLimb(g, neckFromX, neckFromY, hx, hy + 16, 9, helmCol, outline);

      // Helm shape (slightly taller than head) with enhanced volume
      drawCircle(g, hx, hy - 1, hr + 2, helmCol, outline);

      // Helm shading — darker on back side (deeper shadow)
      { const sa = Math.PI * 0.5; g.moveTo(hx + (hr + 1) * Math.cos(sa), hy - 1 + (hr + 1) * Math.sin(sa)); }
      g.arc(hx, hy - 1, hr + 1, Math.PI * 0.5, Math.PI * 1.5);
      g.fill({ color: darken(helmCol, 0.22), alpha: 0.35 });

      // Front highlight for metallic sheen
      { const sa = -Math.PI * 0.25; g.moveTo(hx + (hr - 2) * Math.cos(sa), hy - 1 + (hr - 2) * Math.sin(sa)); }
      g.arc(hx, hy - 1, hr - 2, -Math.PI * 0.25, Math.PI * 0.25);
      g.fill({ color: lighten(helmCol, 0.2), alpha: 0.2 });

      // Helm plate seam (vertical center line)
      g.moveTo(hx + 2, hy - hr);
      g.lineTo(hx + 2, hy + hr - 4);
      g.stroke({ color: darken(helmCol, 0.12), width: 0.8, cap: "round", alpha: 0.3 });

      // Visor slit with depth
      g.roundRect(hx - 5, hy - 6, 18, 7, 2);
      g.fill({ color: 0x0a0a12 });
      // Inner visor edge highlight (top)
      g.moveTo(hx - 4, hy - 5);
      g.lineTo(hx + 12, hy - 5);
      g.stroke({ color: darken(helmCol, 0.15), width: 0.8, alpha: 0.4 });
      // Eye glint visible through visor (slightly animated feel)
      g.circle(hx + 7, hy - 3, 1.2);
      g.fill({ color: 0x445566, alpha: 0.55 });
      g.circle(hx + 7, hy - 3.5, 0.5);
      g.fill({ color: 0x88aacc, alpha: 0.4 });
      // Second eye glint (back eye, dimmer)
      g.circle(hx + 1, hy - 2.5, 0.8);
      g.fill({ color: 0x334455, alpha: 0.35 });

      // Helm ridge on top (thicker, layered)
      g.moveTo(hx - 8, hy - hr + 2);
      g.lineTo(hx + 10, hy - hr + 2);
      g.stroke({ color: outline, width: 5, cap: "round" });
      g.moveTo(hx - 8, hy - hr + 2);
      g.lineTo(hx + 10, hy - hr + 2);
      g.stroke({ color: helmCol, width: 4, cap: "round" });
      g.moveTo(hx - 7, hy - hr + 2);
      g.lineTo(hx + 9, hy - hr + 2);
      g.stroke({ color: lighten(helmCol, 0.28), width: 2, cap: "round" });
      // Ridge highlight spot
      g.circle(hx + 2, hy - hr + 1, 1.5);
      g.fill({ color: lighten(helmCol, 0.35), alpha: 0.35 });

      // Breather holes (small dots with depth)
      for (let i = 0; i < 4; i++) {
        g.circle(hx + 3 + i * 3.5, hy + 6, 1.4);
        g.fill({ color: 0x0a0a12 });
        g.circle(hx + 3 + i * 3.5, hy + 5.5, 0.5);
        g.fill({ color: darken(helmCol, 0.1), alpha: 0.3 });
      }

      // Chin guard (enhanced with rivet detail)
      g.moveTo(hx - 2, hy + hr - 6);
      g.quadraticCurveTo(hx + 6, hy + hr + 3, hx + 14, hy + hr - 6);
      g.stroke({ color: outline, width: 4, cap: "round" });
      g.moveTo(hx - 2, hy + hr - 6);
      g.quadraticCurveTo(hx + 6, hy + hr + 2, hx + 14, hy + hr - 6);
      g.stroke({ color: helmCol, width: 3, cap: "round" });
      g.moveTo(hx - 1, hy + hr - 6);
      g.quadraticCurveTo(hx + 6, hy + hr + 1, hx + 13, hy + hr - 6);
      g.stroke({ color: lighten(helmCol, 0.12), width: 1.5, cap: "round", alpha: 0.5 });
      // Chin rivets
      g.circle(hx + 1, hy + hr - 4, 1);
      g.fill({ color: lighten(helmCol, 0.2), alpha: 0.5 });
      g.circle(hx + 11, hy + hr - 4, 1);
      g.fill({ color: lighten(helmCol, 0.2), alpha: 0.5 });
    } else {
      // Normal head with face
      // Neck with muscle suggestion
      drawLimb(g, neckFromX, neckFromY, hx, hy + 16, 10, skinColor, outline);
      // Subtle neck tendon lines
      g.moveTo(neckFromX + 2, neckFromY + 2);
      g.lineTo(hx + 3, hy + 14);
      g.stroke({ color: darken(skinColor, 0.08), width: 0.8, cap: "round", alpha: 0.3 });

      // Hair (behind head) — more dimensional with side coverage and volume
      g.circle(hx, hy - 3, hr + 5);
      g.fill({ color: outline });
      g.circle(hx, hy - 3, hr + 4);
      g.fill({ color: hairColor });
      // Hair side coverage (wraps around head more)
      { const sa = Math.PI * 0.55; g.moveTo(hx + (hr + 3) * Math.cos(sa), hy + (hr + 3) * Math.sin(sa)); }
      g.arc(hx, hy, hr + 3, Math.PI * 0.55, Math.PI * 1.45);
      g.fill({ color: hairColor });
      // Hair volume highlight (top sheen)
      g.circle(hx - 2, hy - hr - 1, hr * 0.5);
      g.fill({ color: lighten(hairColor, 0.18), alpha: 0.2 });
      // Multiple hair strand groups for texture
      for (const [ox, oy, cx, cy, ex, ey, dark, w, a] of [
        [-hr, -8, -hr - 4, -2, -hr + 1, 4, true, 1.2, 0.4],
        [-hr + 3, -12, -hr - 1, -6, -hr + 4, 0, false, 1, 0.35],
        [-hr + 6, -14, -hr + 2, -8, -hr + 5, -2, true, 0.8, 0.3],
        [-hr - 1, -4, -hr - 3, 2, -hr + 2, 8, true, 1, 0.35],
        [-hr + 8, -16, -hr + 5, -10, -hr + 7, -4, false, 0.7, 0.25],
      ] as [number, number, number, number, number, number, boolean, number, number][]) {
        g.moveTo(hx + ox, hy + oy);
        g.quadraticCurveTo(hx + cx, hy + cy, hx + ex, hy + ey);
        g.stroke({ color: dark ? darken(hairColor, 0.15) : lighten(hairColor, 0.15), width: w, cap: "round", alpha: a });
      }
      // Hair parting line
      g.moveTo(hx - 4, hy - hr - 2);
      g.quadraticCurveTo(hx, hy - hr + 3, hx + 5, hy - hr);
      g.stroke({ color: darken(hairColor, 0.1), width: 0.7, cap: "round", alpha: 0.2 });

      // Ear (visible between hair and head, on the back side)
      const earX = hx - 6;
      const earY = hy + 1;
      g.ellipse(earX, earY, 4, 6);
      g.fill({ color: outline });
      g.ellipse(earX, earY, 3, 5);
      g.fill({ color: skinColor });
      // Inner ear
      g.ellipse(earX, earY - 0.5, 1.5, 3);
      g.fill({ color: darken(skinColor, 0.12), alpha: 0.5 });

      // Head circle
      drawCircle(g, hx, hy, hr, skinColor, outline);

      // Subtle cheek/face contour shading (multi-layer for depth)
      { const sa = -Math.PI * 0.3; g.moveTo(hx + (hr - 1) * Math.cos(sa), hy + (hr - 1) * Math.sin(sa)); }
      g.arc(hx, hy, hr - 1, -Math.PI * 0.3, Math.PI * 0.3);
      g.fill({ color: lighten(skinColor, 0.08), alpha: 0.3 });
      // Cheekbone highlight
      g.circle(hx + 10, hy - 1, 5);
      g.fill({ color: lighten(skinColor, 0.1), alpha: 0.15 });
      // Cheek shadow (hollow below cheekbone)
      g.ellipse(hx + 8, hy + 6, 4, 3);
      g.fill({ color: darken(skinColor, 0.06), alpha: 0.12 });
      // Temple shadow
      g.circle(hx - 4, hy - 6, 5);
      g.fill({ color: darken(skinColor, 0.04), alpha: 0.1 });

      // Jaw/chin definition (stronger jawline)
      g.moveTo(hx + 2, hy + hr - 8);
      g.quadraticCurveTo(hx + 8, hy + hr + 1, hx + 14, hy + hr - 6);
      g.stroke({ color: darken(skinColor, 0.1), width: 1.4, cap: "round", alpha: 0.38 });
      // Chin cleft suggestion
      g.circle(hx + 7, hy + hr - 3, 1.2);
      g.fill({ color: darken(skinColor, 0.06), alpha: 0.15 });

      // Nose (more defined bridge and tip)
      g.moveTo(hx + 6, hy - 8);
      g.quadraticCurveTo(hx + 10, hy - 2, hx + 13, hy + 2);
      g.lineTo(hx + 9, hy + 4);
      g.stroke({ color: outline, width: 1.2, cap: "round", join: "round", alpha: 0.35 });
      // Nose bridge highlight
      g.moveTo(hx + 7, hy - 7);
      g.quadraticCurveTo(hx + 9.5, hy - 3, hx + 11, hy);
      g.stroke({ color: lighten(skinColor, 0.15), width: 0.8, cap: "round", alpha: 0.25 });
      // Nostril (with shadow)
      g.circle(hx + 10, hy + 3, 1);
      g.fill({ color: outline, alpha: 0.25 });
      g.circle(hx + 8.5, hy + 3.5, 0.7);
      g.fill({ color: outline, alpha: 0.15 });
      // Nose tip roundness
      g.circle(hx + 11, hy + 1, 2.5);
      g.fill({ color: lighten(skinColor, 0.06), alpha: 0.12 });

      const eyeY = hy - 4;
      const hurt = !!opts.isHurt;

      if (hurt) {
        // --- HURT EXPRESSION ---
        // Back eye — squinted shut (tight line)
        g.moveTo(hx - 4.5, eyeY - 0.5);
        g.quadraticCurveTo(hx - 2, eyeY + 2, hx + 0.5, eyeY - 0.5);
        g.stroke({ color: outline, width: 1.8, cap: "round", alpha: 0.7 });
        // Upper squeeze line
        g.moveTo(hx - 4, eyeY - 2);
        g.quadraticCurveTo(hx - 2, eyeY - 0.5, hx + 0, eyeY - 2);
        g.stroke({ color: darken(skinColor, 0.12), width: 1.2, cap: "round", alpha: 0.5 });

        // Front eye — squinted, barely open with tiny iris visible
        g.ellipse(hx + 8, eyeY, 4.5, 1.2);
        g.fill({ color: 0xf8f4f0 });
        // Heavy upper lid pressing down
        g.ellipse(hx + 8, eyeY - 1, 4.5, 1.5);
        g.fill({ color: darken(skinColor, 0.08), alpha: 0.5 });
        // Lower lid pushing up
        g.ellipse(hx + 8, eyeY + 0.8, 4.2, 1);
        g.fill({ color: darken(skinColor, 0.05), alpha: 0.3 });
        // Tiny iris barely visible
        g.circle(hx + 8.5, eyeY, 1.2);
        g.fill({ color: pal.eyes });
        g.circle(hx + 8.5, eyeY, 0.5);
        g.fill({ color: 0x111111 });

        // Eyebrows — knitted together, angled inward (pain)
        g.moveTo(hx - 4, eyeY - 4);
        g.quadraticCurveTo(hx - 2, eyeY - 7.5, hx + 1, eyeY - 7);
        g.stroke({ color: hairColor, width: 2.8, cap: "round" });
        g.moveTo(hx + 4, eyeY - 7.5);
        g.quadraticCurveTo(hx + 8, eyeY - 8.5, hx + 13, eyeY - 4.5);
        g.stroke({ color: hairColor, width: 2.8, cap: "round" });

        // Forehead crease between brows
        g.moveTo(hx + 1.5, eyeY - 7);
        g.lineTo(hx + 2.5, eyeY - 5);
        g.stroke({ color: darken(skinColor, 0.12), width: 0.8, cap: "round", alpha: 0.4 });

        // Mouth — open grimace
        // Outer mouth shape
        g.moveTo(hx + 2, hy + 7);
        g.quadraticCurveTo(hx + 6, hy + 12, hx + 10, hy + 7.5);
        g.stroke({ color: 0x774444, width: 2, cap: "round" });
        // Dark open mouth interior
        g.moveTo(hx + 3.5, hy + 8);
        g.quadraticCurveTo(hx + 6, hy + 11, hx + 8.5, hy + 8);
        g.lineTo(hx + 8.5, hy + 8);
        g.quadraticCurveTo(hx + 6, hy + 10.5, hx + 3.5, hy + 8);
        g.fill({ color: 0x331111, alpha: 0.7 });
        // Teeth line (upper)
        g.moveTo(hx + 4, hy + 8.2);
        g.lineTo(hx + 8, hy + 8);
        g.stroke({ color: 0xeeeedd, width: 1, cap: "round", alpha: 0.6 });
      } else {
        // --- NORMAL EXPRESSION ---
        // Back eye (further, slightly smaller for 3/4 perspective)
        // Eye socket shadow
        g.ellipse(hx - 2, eyeY, 4.5, 3.5);
        g.fill({ color: darken(skinColor, 0.05), alpha: 0.15 });
        // White sclera
        g.ellipse(hx - 2, eyeY, 3.5, 2.5);
        g.fill({ color: 0xf8f4f0 });
        // Upper eyelid shadow (deeper)
        g.ellipse(hx - 2, eyeY - 1.5, 3.5, 1.2);
        g.fill({ color: darken(skinColor, 0.08), alpha: 0.35 });
        // Lower eyelid
        g.ellipse(hx - 2, eyeY + 1.5, 3.2, 0.8);
        g.fill({ color: darken(skinColor, 0.04), alpha: 0.15 });
        // Iris with gradient (outer ring darker)
        g.circle(hx - 1, eyeY, 2);
        g.fill({ color: darken(pal.eyes, 0.2) });
        g.circle(hx - 1, eyeY, 1.8);
        g.fill({ color: pal.eyes });
        // Iris detail (lighter inner ring)
        g.circle(hx - 0.8, eyeY, 1.2);
        g.fill({ color: lighten(pal.eyes, 0.15), alpha: 0.3 });
        // Pupil
        g.circle(hx - 0.5, eyeY - 0.3, 0.8);
        g.fill({ color: 0x111111 });
        // Eye catchlight (primary)
        g.circle(hx - 1.5, eyeY - 0.8, 0.5);
        g.fill({ color: 0xffffff, alpha: 0.7 });
        // Secondary catchlight (smaller, lower)
        g.circle(hx - 0.2, eyeY + 0.5, 0.3);
        g.fill({ color: 0xffffff, alpha: 0.35 });
        // Eyelash line
        g.moveTo(hx - 5, eyeY - 1);
        g.quadraticCurveTo(hx - 2, eyeY - 2.8, hx + 1.5, eyeY - 1.5);
        g.stroke({ color: outline, width: 0.8, cap: "round", alpha: 0.4 });

        // Front eye (closer, slightly larger)
        // Eye socket shadow
        g.ellipse(hx + 8, eyeY, 5.5, 4);
        g.fill({ color: darken(skinColor, 0.05), alpha: 0.15 });
        // White sclera
        g.ellipse(hx + 8, eyeY, 4.5, 2.8);
        g.fill({ color: 0xf8f4f0 });
        // Upper eyelid shadow (deeper)
        g.ellipse(hx + 8, eyeY - 1.8, 4.5, 1.3);
        g.fill({ color: darken(skinColor, 0.08), alpha: 0.35 });
        // Lower eyelid
        g.ellipse(hx + 8, eyeY + 1.6, 4.2, 0.9);
        g.fill({ color: darken(skinColor, 0.04), alpha: 0.15 });
        // Iris with gradient
        g.circle(hx + 8.5, eyeY, 2.3);
        g.fill({ color: darken(pal.eyes, 0.2) });
        g.circle(hx + 8.5, eyeY, 2);
        g.fill({ color: pal.eyes });
        // Iris inner detail
        g.circle(hx + 8.7, eyeY, 1.3);
        g.fill({ color: lighten(pal.eyes, 0.15), alpha: 0.3 });
        // Pupil
        g.circle(hx + 9, eyeY - 0.3, 0.9);
        g.fill({ color: 0x111111 });
        // Eye catchlight (primary)
        g.circle(hx + 7.5, eyeY - 1, 0.6);
        g.fill({ color: 0xffffff, alpha: 0.7 });
        // Secondary catchlight
        g.circle(hx + 9.2, eyeY + 0.5, 0.35);
        g.fill({ color: 0xffffff, alpha: 0.35 });
        // Eyelash line
        g.moveTo(hx + 3.5, eyeY - 1.5);
        g.quadraticCurveTo(hx + 8, eyeY - 3.2, hx + 12.5, eyeY - 1.5);
        g.stroke({ color: outline, width: 0.9, cap: "round", alpha: 0.45 });

        // Eyebrows — thicker, more defined with hair texture
        g.moveTo(hx - 5, eyeY - 5);
        g.quadraticCurveTo(hx - 2, eyeY - 7, hx + 1, eyeY - 6);
        g.stroke({ color: hairColor, width: 3, cap: "round" });
        // Brow hair strokes
        g.moveTo(hx - 4, eyeY - 5.5);
        g.quadraticCurveTo(hx - 2.5, eyeY - 6.8, hx, eyeY - 6.2);
        g.stroke({ color: darken(hairColor, 0.1), width: 1.2, cap: "round", alpha: 0.3 });
        g.moveTo(hx + 4, eyeY - 6.5);
        g.quadraticCurveTo(hx + 8, eyeY - 7.5, hx + 13, eyeY - 5.5);
        g.stroke({ color: hairColor, width: 3, cap: "round" });
        // Brow hair strokes
        g.moveTo(hx + 5, eyeY - 6.8);
        g.quadraticCurveTo(hx + 9, eyeY - 7.8, hx + 12, eyeY - 5.8);
        g.stroke({ color: darken(hairColor, 0.1), width: 1.2, cap: "round", alpha: 0.3 });

        // Brow ridge shadow
        g.moveTo(hx - 4, eyeY - 4);
        g.quadraticCurveTo(hx + 5, eyeY - 5, hx + 13, eyeY - 4);
        g.stroke({ color: darken(skinColor, 0.06), width: 1.5, cap: "round", alpha: 0.15 });

        // Mouth — firm with lip definition and volume
        // Lip outline
        g.moveTo(hx + 2, hy + 8);
        g.quadraticCurveTo(hx + 6, hy + 8.5, hx + 10, hy + 7.5);
        g.stroke({ color: 0x774444, width: 1.8, cap: "round" });
        // Upper lip shadow
        g.moveTo(hx + 3, hy + 7.5);
        g.lineTo(hx + 9, hy + 7);
        g.stroke({ color: 0x553333, width: 0.8, cap: "round", alpha: 0.25 });
        // Cupid's bow (upper lip shape)
        g.moveTo(hx + 4, hy + 7.8);
        g.quadraticCurveTo(hx + 6, hy + 7, hx + 8, hy + 7.8);
        g.stroke({ color: darken(skinColor, 0.08), width: 0.6, cap: "round", alpha: 0.2 });
        // Lower lip highlight (fuller)
        g.moveTo(hx + 3, hy + 9.5);
        g.quadraticCurveTo(hx + 6, hy + 10.8, hx + 9, hy + 9);
        g.stroke({ color: lighten(skinColor, 0.08), width: 1.5, cap: "round", alpha: 0.3 });
        // Lip center highlight (wet look)
        g.circle(hx + 6, hy + 9.5, 1.5);
        g.fill({ color: lighten(skinColor, 0.12), alpha: 0.15 });
        // Chin shadow below lip
        g.moveTo(hx + 4, hy + 11);
        g.quadraticCurveTo(hx + 6, hy + 12, hx + 8, hy + 11);
        g.stroke({ color: darken(skinColor, 0.06), width: 0.8, cap: "round", alpha: 0.15 });
        // Nasolabial fold (nose-to-mouth crease)
        g.moveTo(hx + 3, hy + 3);
        g.quadraticCurveTo(hx + 2, hy + 5.5, hx + 3, hy + 7.5);
        g.stroke({ color: darken(skinColor, 0.05), width: 0.6, cap: "round", alpha: 0.12 });
      }
    }
  }

  // Character-specific extras (weapon, accessories)
  opts.drawExtras?.(g, p, pal, flashing, fColor);
}

// ---- Shadow ---------------------------------------------------------------

export function drawFighterShadow(g: Graphics, x: number, floorY: number, grounded: boolean): void {
  const scale = grounded ? 1.0 : 0.5;
  const w = 44 * scale;
  const h = 9 * scale;
  // Outer diffuse shadow (very soft, wide)
  g.ellipse(x, floorY + 2, w * 1.6, h * 1.6);
  g.fill({ color: 0x000000, alpha: 0.06 });
  // Mid soft shadow
  g.ellipse(x, floorY + 2, w * 1.3, h * 1.3);
  g.fill({ color: 0x000000, alpha: 0.1 });
  // Core shadow
  g.ellipse(x, floorY + 2, w, h);
  g.fill({ color: 0x000000, alpha: 0.22 });
  // Inner dark spot (contact point)
  g.ellipse(x, floorY + 2, w * 0.4, h * 0.45);
  g.fill({ color: 0x000000, alpha: 0.12 });
  // Subtle ground contact highlight (rim light bounce on floor)
  if (grounded) {
    g.ellipse(x, floorY + 3, w * 0.6, h * 0.3);
    g.fill({ color: 0x000000, alpha: 0.05 });
  }
}
