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
    drawCircle(g, x, y, size * 0.8, color, outlineColor);
  } else {
    // Outline
    g.roundRect(x - size - 1, y - size - 1, size * 2 + 2, size * 2 + 2, 3);
    g.fill({ color: outlineColor });
    // Fill
    g.roundRect(x - size, y - size, size * 2, size * 2, 3);
    g.fill({ color });
  }
}

/**
 * Draw a foot/shoe with outline.
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
  // Outline
  g.roundRect(fx - 1, y - height / 2 - 1, width + 2, height + 2, 4);
  g.fill({ color: outlineColor });
  // Fill
  g.roundRect(fx, y - height / 2, width, height, 4);
  g.fill({ color });
}

// ---- Main draw function ---------------------------------------------------

export interface DrawFighterOptions {
  pose: FighterPose;
  palette: FighterPalette;
  isFlashing?: boolean;
  flashColor?: number;
  /** Custom draw function for character-specific details (weapon, accessories). */
  drawExtras?: (g: Graphics, p: FighterPose, pal: FighterPalette) => void;
}

/**
 * Draw a full fighter skeleton into the given Graphics.
 * The graphics origin (0,0) should be at the fighter's feet (ground level).
 * The fighter is drawn facing RIGHT; flip with scale.x = -1 for left.
 */
export function drawFighterSkeleton(g: Graphics, opts: DrawFighterOptions): void {
  const { pose: p, palette: pal, isFlashing, flashColor } = opts;
  const outline = pal.outline;

  const skinColor = isFlashing && flashColor ? flashColor : pal.skin;
  const bodyColor = isFlashing && flashColor ? flashColor : pal.body;
  const pantsColor = isFlashing && flashColor ? flashColor : pal.pants;
  const shoeColor = isFlashing && flashColor ? flashColor : pal.shoes;
  const hairColor = isFlashing && flashColor ? flashColor : pal.hair;
  const handColor = isFlashing && flashColor ? flashColor : (pal.gloves ?? skinColor);

  // Draw order: back arm → back leg → torso → front leg → front arm → head

  // Back arm
  if (p.backArm) {
    drawLimb(g, p.backArm.shoulderX, p.backArm.shoulderY,
      p.backArm.elbowX, p.backArm.elbowY, 14, bodyColor, outline);
    drawLimb(g, p.backArm.elbowX, p.backArm.elbowY,
      p.backArm.handX, p.backArm.handY, 12, skinColor, outline);
    drawFist(g, p.backArm.handX, p.backArm.handY, 7, handColor, outline, !!p.backArm.open);
  }

  // Back leg
  if (p.backLeg) {
    drawLimb(g, p.backLeg.hipX, p.backLeg.hipY,
      p.backLeg.kneeX, p.backLeg.kneeY, 18, pantsColor, outline);
    drawLimb(g, p.backLeg.kneeX, p.backLeg.kneeY,
      p.backLeg.footX, p.backLeg.footY, 14, pantsColor, outline);
    drawFoot(g, p.backLeg.footX, p.backLeg.footY, 22, 11, shoeColor, outline);
  }

  // Torso
  if (p.torso) {
    const t = p.torso;
    // Outline
    g.moveTo(-t.topWidth / 2 - 2 + t.x, -t.height / 2 - 2 + t.y);
    g.lineTo(t.topWidth / 2 + 2 + t.x, -t.height / 2 - 2 + t.y);
    g.lineTo(t.bottomWidth / 2 + 2 + t.x, t.height / 2 + 2 + t.y);
    g.lineTo(-t.bottomWidth / 2 - 2 + t.x, t.height / 2 + 2 + t.y);
    g.closePath();
    g.fill({ color: outline });

    // Body fill
    g.moveTo(-t.topWidth / 2 + t.x, -t.height / 2 + t.y);
    g.lineTo(t.topWidth / 2 + t.x, -t.height / 2 + t.y);
    g.lineTo(t.bottomWidth / 2 + t.x, t.height / 2 + t.y);
    g.lineTo(-t.bottomWidth / 2 + t.x, t.height / 2 + t.y);
    g.closePath();
    g.fill({ color: bodyColor });

    // Belt
    if (pal.belt) {
      g.rect(-t.bottomWidth / 2 + t.x, t.height / 2 - 8 + t.y, t.bottomWidth, 8);
      g.fill({ color: pal.belt });
    }
  }

  // Front leg
  if (p.frontLeg) {
    drawLimb(g, p.frontLeg.hipX, p.frontLeg.hipY,
      p.frontLeg.kneeX, p.frontLeg.kneeY, 20, pantsColor, outline);
    drawLimb(g, p.frontLeg.kneeX, p.frontLeg.kneeY,
      p.frontLeg.footX, p.frontLeg.footY, 16, pantsColor, outline);
    drawFoot(g, p.frontLeg.footX, p.frontLeg.footY, 24, 13, shoeColor, outline);
  }

  // Front arm
  if (p.frontArm) {
    drawLimb(g, p.frontArm.shoulderX, p.frontArm.shoulderY,
      p.frontArm.elbowX, p.frontArm.elbowY, 16, bodyColor, outline);
    drawLimb(g, p.frontArm.elbowX, p.frontArm.elbowY,
      p.frontArm.handX, p.frontArm.handY, 13, skinColor, outline);
    drawFist(g, p.frontArm.handX, p.frontArm.handY, 8, handColor, outline, !!p.frontArm.open);
  }

  // Head
  if (p.head) {
    // Neck
    const neckFromX = p.torso ? p.torso.x : 0;
    const neckFromY = p.torso ? p.torso.y - p.torso.height / 2 : -100;
    drawLimb(g, neckFromX, neckFromY, p.head.x, p.head.y + 16, 9, skinColor, outline);

    const hr = p.head.radius ?? 24;

    // Hair (behind head)
    drawCircle(g, p.head.x, p.head.y - 3, hr + 3, hairColor, outline);

    // Head circle
    drawCircle(g, p.head.x, p.head.y, hr, skinColor, outline);

    // Eyes
    const eyeY = p.head.y - 3;
    // Back eye
    g.circle(p.head.x - 3, eyeY, 3.5);
    g.fill({ color: 0xffffff });
    g.circle(p.head.x - 2, eyeY, 2);
    g.fill({ color: pal.eyes });
    // Front eye
    g.circle(p.head.x + 6, eyeY, 5);
    g.fill({ color: 0xffffff });
    g.circle(p.head.x + 8, eyeY, 2.5);
    g.fill({ color: pal.eyes });

    // Mouth
    const mouthX = p.head.x + 3;
    g.moveTo(mouthX - 4, p.head.y + 9);
    g.lineTo(mouthX + 4, p.head.y + 8);
    g.stroke({ color: 0x442222, width: 2, cap: "round" });
  }

  // Character-specific extras (weapon, accessories)
  opts.drawExtras?.(g, p, pal);
}

// ---- Shadow ---------------------------------------------------------------

export function drawFighterShadow(g: Graphics, x: number, floorY: number, grounded: boolean): void {
  const scale = grounded ? 1.0 : 0.6;
  g.ellipse(x, floorY + 2, 40 * scale, 8 * scale);
  g.fill({ color: 0x000000, alpha: 0.3 });
}
