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
 * Draw a limb segment (bone) with outline.
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
  // Outline
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke({ color: outlineColor, width: thickness + OUTLINE_EXTRA, cap: "round", join: "round" });

  // Fill
  g.moveTo(x1, y1);
  g.lineTo(x2, y2);
  g.stroke({ color, width: thickness, cap: "round", join: "round" });

  // Highlight edge — subtle light strip along one side of the limb
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const nx = -dy / len; // perpendicular
  const ny = dx / len;
  const off = thickness * 0.25;
  g.moveTo(x1 + nx * off, y1 + ny * off);
  g.lineTo(x2 + nx * off, y2 + ny * off);
  g.stroke({ color: lighten(color, 0.2), width: thickness * 0.3, cap: "round", alpha: 0.35 });
}

/**
 * Draw a circle with outline (for head, joints, etc.)
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
    // Open hand with finger suggestions
    drawCircle(g, x, y, size * 0.8, color, outlineColor);
    // Finger lines radiating outward
    for (let i = -1; i <= 1; i++) {
      const angle = -Math.PI / 2 + i * 0.4;
      const fx = x + Math.cos(angle) * size * 1.4;
      const fy = y + Math.sin(angle) * size * 1.4;
      g.moveTo(x + Math.cos(angle) * size * 0.6, y + Math.sin(angle) * size * 0.6);
      g.lineTo(fx, fy);
      g.stroke({ color: outlineColor, width: 3.5, cap: "round" });
      g.moveTo(x + Math.cos(angle) * size * 0.6, y + Math.sin(angle) * size * 0.6);
      g.lineTo(fx, fy);
      g.stroke({ color, width: 2, cap: "round" });
    }
    // Thumb
    const thumbAngle = -Math.PI / 2 - 1.0;
    const tx = x + Math.cos(thumbAngle) * size * 1.1;
    const ty = y + Math.sin(thumbAngle) * size * 1.1;
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.stroke({ color: outlineColor, width: 3.5, cap: "round" });
    g.moveTo(x, y);
    g.lineTo(tx, ty);
    g.stroke({ color, width: 2, cap: "round" });
  } else {
    // Closed fist
    // Outline
    g.roundRect(x - size - 1, y - size - 1, size * 2 + 2, size * 2 + 2, 3);
    g.fill({ color: outlineColor });
    // Fill
    g.roundRect(x - size, y - size, size * 2, size * 2, 3);
    g.fill({ color });
    // Knuckle bumps
    g.moveTo(x - size * 0.6, y - size);
    g.lineTo(x + size * 0.6, y - size);
    g.stroke({ color: darken(color, 0.15), width: 1.5, cap: "round", alpha: 0.5 });
    // Highlight on fist
    g.roundRect(x - size + 1, y - size + 1, size * 1.2, size * 0.8, 2);
    g.fill({ color: lighten(color, 0.15), alpha: 0.3 });
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

  // Outline
  g.roundRect(fx - 1, y - height / 2 - 1, width + 2, height + 2, 4);
  g.fill({ color: outlineColor });

  // Boot upper
  g.roundRect(fx, y - height / 2, width, height - soleH, 4);
  g.fill({ color });

  // Sole (darker)
  g.roundRect(fx, y - height / 2 + height - soleH, width, soleH, 2);
  g.fill({ color: darken(color, 0.35) });

  // Heel bump at the back
  g.roundRect(fx, y - height / 2 + height - soleH - 1, 5, soleH + 1, 2);
  g.fill({ color: darken(color, 0.3) });

  // Toe cap line
  g.moveTo(fx + width - 7, y - height / 2 + 2);
  g.lineTo(fx + width - 7, y + height / 2 - soleH);
  g.stroke({ color: darken(color, 0.12), width: 1, cap: "round", alpha: 0.5 });

  // Boot highlight
  g.roundRect(fx + 2, y - height / 2 + 1, width * 0.5, height * 0.35, 2);
  g.fill({ color: lighten(color, 0.12), alpha: 0.3 });
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

    // Rivet/button details (tiny dots along the chest)
    if (!flashing) {
      const rivetY1 = top + 12;
      const rivetY2 = midY;
      g.circle(t.x + 6, rivetY1, 1.2);
      g.fill({ color: lighten(bodyColor, 0.25), alpha: 0.3 });
      g.circle(t.x + 6, rivetY2, 1.2);
      g.fill({ color: lighten(bodyColor, 0.25), alpha: 0.3 });
    }

    // Shoulder joints (round circles at arm attachment points) — with armor pad
    if (p.frontArm) {
      // Shoulder pad (larger, more detailed)
      if (!flashing) {
        g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 10);
        g.fill({ color: darken(bodyColor, 0.05), alpha: 0.3 });
      }
      drawJoint(g, p.frontArm.shoulderX, p.frontArm.shoulderY, 7, bodyColor, outline);
      // Shoulder rivet
      g.circle(p.frontArm.shoulderX, p.frontArm.shoulderY, 2);
      g.fill({ color: lighten(bodyColor, 0.2), alpha: 0.4 });
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

      // Helm shape (slightly taller than head)
      drawCircle(g, hx, hy - 1, hr + 2, helmCol, outline);

      // Helm shading — darker on back side
      { const sa = Math.PI * 0.5; g.moveTo(hx + (hr + 1) * Math.cos(sa), hy - 1 + (hr + 1) * Math.sin(sa)); }
      g.arc(hx, hy - 1, hr + 1, Math.PI * 0.5, Math.PI * 1.5);
      g.fill({ color: darken(helmCol, 0.2), alpha: 0.3 });

      // Visor slit
      g.roundRect(hx - 4, hy - 5, 16, 5, 2);
      g.fill({ color: 0x111118 });
      // Subtle eye glint in visor
      g.circle(hx + 7, hy - 3, 1);
      g.fill({ color: 0x334455, alpha: 0.5 });

      // Helm ridge on top
      g.moveTo(hx - 8, hy - hr + 2);
      g.lineTo(hx + 10, hy - hr + 2);
      g.stroke({ color: helmCol, width: 4, cap: "round" });
      g.moveTo(hx - 7, hy - hr + 2);
      g.lineTo(hx + 9, hy - hr + 2);
      g.stroke({ color: lighten(helmCol, 0.25), width: 2, cap: "round" });

      // Breather holes (small dots)
      for (let i = 0; i < 3; i++) {
        g.circle(hx + 4 + i * 4, hy + 6, 1.2);
        g.fill({ color: 0x111118 });
      }

      // Chin guard
      g.moveTo(hx - 2, hy + hr - 6);
      g.quadraticCurveTo(hx + 6, hy + hr + 2, hx + 14, hy + hr - 6);
      g.stroke({ color: helmCol, width: 3, cap: "round" });
      g.moveTo(hx - 1, hy + hr - 6);
      g.quadraticCurveTo(hx + 6, hy + hr + 1, hx + 13, hy + hr - 6);
      g.stroke({ color: lighten(helmCol, 0.1), width: 1.5, cap: "round", alpha: 0.5 });
    } else {
      // Normal head with face
      // Neck with muscle suggestion
      drawLimb(g, neckFromX, neckFromY, hx, hy + 16, 10, skinColor, outline);
      // Subtle neck tendon lines
      g.moveTo(neckFromX + 2, neckFromY + 2);
      g.lineTo(hx + 3, hy + 14);
      g.stroke({ color: darken(skinColor, 0.08), width: 0.8, cap: "round", alpha: 0.3 });

      // Hair (behind head) — more dimensional with side coverage
      g.circle(hx, hy - 3, hr + 4);
      g.fill({ color: outline });
      g.circle(hx, hy - 3, hr + 3);
      g.fill({ color: hairColor });
      // Hair side coverage (wraps around head more)
      { const sa = Math.PI * 0.55; g.moveTo(hx + (hr + 2) * Math.cos(sa), hy + (hr + 2) * Math.sin(sa)); }
      g.arc(hx, hy, hr + 2, Math.PI * 0.55, Math.PI * 1.45);
      g.fill({ color: hairColor });
      // Hair texture strands
      g.moveTo(hx - hr, hy - 8);
      g.quadraticCurveTo(hx - hr - 4, hy - 2, hx - hr + 1, hy + 4);
      g.stroke({ color: darken(hairColor, 0.15), width: 1, cap: "round", alpha: 0.4 });
      g.moveTo(hx - hr + 3, hy - 12);
      g.quadraticCurveTo(hx - hr - 1, hy - 6, hx - hr + 4, hy);
      g.stroke({ color: lighten(hairColor, 0.15), width: 1, cap: "round", alpha: 0.35 });

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

      // Subtle cheek/face contour shading
      { const sa = -Math.PI * 0.3; g.moveTo(hx + (hr - 1) * Math.cos(sa), hy + (hr - 1) * Math.sin(sa)); }
      g.arc(hx, hy, hr - 1, -Math.PI * 0.3, Math.PI * 0.3);
      g.fill({ color: lighten(skinColor, 0.08), alpha: 0.3 });

      // Jaw/chin definition
      g.moveTo(hx + 2, hy + hr - 8);
      g.quadraticCurveTo(hx + 8, hy + hr + 1, hx + 14, hy + hr - 6);
      g.stroke({ color: darken(skinColor, 0.1), width: 1.2, cap: "round", alpha: 0.35 });

      // Nose (subtle wedge with bridge)
      g.moveTo(hx + 6, hy - 8);
      g.quadraticCurveTo(hx + 10, hy - 2, hx + 13, hy + 2);
      g.lineTo(hx + 9, hy + 4);
      g.stroke({ color: outline, width: 1.2, cap: "round", join: "round", alpha: 0.35 });
      // Nostril dot
      g.circle(hx + 10, hy + 3, 0.8);
      g.fill({ color: outline, alpha: 0.25 });

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
        g.ellipse(hx - 2, eyeY, 3.5, 2.5);
        g.fill({ color: 0xf8f4f0 });
        // Upper eyelid shadow
        g.ellipse(hx - 2, eyeY - 1.5, 3.5, 1.2);
        g.fill({ color: darken(skinColor, 0.06), alpha: 0.3 });
        // Iris
        g.circle(hx - 1, eyeY, 1.8);
        g.fill({ color: pal.eyes });
        // Pupil
        g.circle(hx - 0.5, eyeY - 0.3, 0.8);
        g.fill({ color: 0x111111 });
        // Eye catchlight
        g.circle(hx - 1.5, eyeY - 0.8, 0.5);
        g.fill({ color: 0xffffff, alpha: 0.7 });

        // Front eye (closer, slightly larger)
        g.ellipse(hx + 8, eyeY, 4.5, 2.8);
        g.fill({ color: 0xf8f4f0 });
        // Upper eyelid shadow
        g.ellipse(hx + 8, eyeY - 1.8, 4.5, 1.3);
        g.fill({ color: darken(skinColor, 0.06), alpha: 0.3 });
        // Iris
        g.circle(hx + 8.5, eyeY, 2);
        g.fill({ color: pal.eyes });
        // Pupil
        g.circle(hx + 9, eyeY - 0.3, 0.9);
        g.fill({ color: 0x111111 });
        // Eye catchlight
        g.circle(hx + 7.5, eyeY - 1, 0.6);
        g.fill({ color: 0xffffff, alpha: 0.7 });

        // Eyebrows — thicker, more defined with shape
        g.moveTo(hx - 5, eyeY - 5);
        g.quadraticCurveTo(hx - 2, eyeY - 7, hx + 1, eyeY - 6);
        g.stroke({ color: hairColor, width: 2.8, cap: "round" });
        g.moveTo(hx + 4, eyeY - 6.5);
        g.quadraticCurveTo(hx + 8, eyeY - 7.5, hx + 13, eyeY - 5.5);
        g.stroke({ color: hairColor, width: 2.8, cap: "round" });

        // Mouth — firm with lip definition
        g.moveTo(hx + 2, hy + 8);
        g.quadraticCurveTo(hx + 6, hy + 8.5, hx + 10, hy + 7.5);
        g.stroke({ color: 0x774444, width: 1.8, cap: "round" });
        // Upper lip shadow
        g.moveTo(hx + 3, hy + 7.5);
        g.lineTo(hx + 9, hy + 7);
        g.stroke({ color: 0x553333, width: 0.8, cap: "round", alpha: 0.25 });
        // Lower lip highlight
        g.moveTo(hx + 3, hy + 9.5);
        g.quadraticCurveTo(hx + 6, hy + 10.5, hx + 9, hy + 9);
        g.stroke({ color: lighten(skinColor, 0.05), width: 1.2, cap: "round", alpha: 0.3 });
      }
    }
  }

  // Character-specific extras (weapon, accessories)
  opts.drawExtras?.(g, p, pal, flashing, fColor);
}

// ---- Shadow ---------------------------------------------------------------

export function drawFighterShadow(g: Graphics, x: number, floorY: number, grounded: boolean): void {
  const scale = grounded ? 1.0 : 0.6;
  const w = 40 * scale;
  const h = 8 * scale;
  // Outer soft shadow
  g.ellipse(x, floorY + 2, w * 1.3, h * 1.3);
  g.fill({ color: 0x000000, alpha: 0.12 });
  // Core shadow
  g.ellipse(x, floorY + 2, w, h);
  g.fill({ color: 0x000000, alpha: 0.25 });
  // Inner dark spot
  g.ellipse(x, floorY + 2, w * 0.5, h * 0.5);
  g.fill({ color: 0x000000, alpha: 0.1 });
}
