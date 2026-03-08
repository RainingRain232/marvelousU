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
  /** When true, skip face/hair and draw a helm-colored head instead. */
  helmeted?: boolean;
  /** Helm color (used when helmeted is true). */
  helmColor?: number;
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
    const hr = p.head.radius ?? 24;
    const hx = p.head.x;
    const hy = p.head.y;

    if (opts.helmeted) {
      // Helmeted head — draw neck in armor color, helm over head
      const helmCol = isFlashing && flashColor ? flashColor : (opts.helmColor ?? pal.body);
      drawLimb(g, neckFromX, neckFromY, hx, hy + 16, 9, helmCol, outline);

      // Helm shape (slightly taller than head)
      drawCircle(g, hx, hy - 1, hr + 2, helmCol, outline);

      // Visor slit
      g.roundRect(hx - 4, hy - 5, 16, 5, 2);
      g.fill({ color: 0x111118 });

      // Helm ridge on top
      g.moveTo(hx - 8, hy - hr + 2);
      g.lineTo(hx + 10, hy - hr + 2);
      g.stroke({ color: helmCol, width: 4, cap: "round" });
      g.moveTo(hx - 7, hy - hr + 2);
      g.lineTo(hx + 9, hy - hr + 2);
      g.stroke({ color: 0xaaaabb, width: 2, cap: "round" });

      // Breather holes (small dots)
      for (let i = 0; i < 3; i++) {
        g.circle(hx + 4 + i * 4, hy + 6, 1.2);
        g.fill({ color: 0x111118 });
      }
    } else {
      // Normal head with face
      drawLimb(g, neckFromX, neckFromY, hx, hy + 16, 9, skinColor, outline);

      // Hair (behind head)
      drawCircle(g, hx, hy - 3, hr + 3, hairColor, outline);

      // Head circle
      drawCircle(g, hx, hy, hr, skinColor, outline);

      // Nose (subtle wedge)
      g.moveTo(hx + 8, hy - 4);
      g.lineTo(hx + 12, hy + 2);
      g.lineTo(hx + 8, hy + 3);
      g.stroke({ color: outline, width: 1.2, cap: "round", join: "round", alpha: 0.4 });

      // Eyes — proportional, slightly narrowed for serious look
      const eyeY = hy - 4;

      // Back eye (further, slightly smaller for 3/4 perspective)
      g.ellipse(hx - 2, eyeY, 3.5, 2.5);
      g.fill({ color: 0xffffff });
      g.circle(hx - 1, eyeY, 1.8);
      g.fill({ color: pal.eyes });
      g.circle(hx - 0.5, eyeY - 0.3, 0.8);
      g.fill({ color: 0x111111 }); // pupil

      // Front eye (closer, slightly larger)
      g.ellipse(hx + 8, eyeY, 4.5, 2.8);
      g.fill({ color: 0xffffff });
      g.circle(hx + 8.5, eyeY, 2);
      g.fill({ color: pal.eyes });
      g.circle(hx + 9, eyeY - 0.3, 0.9);
      g.fill({ color: 0x111111 }); // pupil

      // Eyebrows — angled slightly for determined look
      g.moveTo(hx - 5, eyeY - 5);
      g.lineTo(hx + 1, eyeY - 6);
      g.stroke({ color: hairColor, width: 2.5, cap: "round" });
      g.moveTo(hx + 4, eyeY - 6);
      g.lineTo(hx + 13, eyeY - 5.5);
      g.stroke({ color: hairColor, width: 2.5, cap: "round" });

      // Mouth — firm, slightly downturned line
      g.moveTo(hx + 2, hy + 8);
      g.lineTo(hx + 10, hy + 7.5);
      g.stroke({ color: 0x553333, width: 1.8, cap: "round" });
      // Slight lower lip shadow
      g.moveTo(hx + 3, hy + 10);
      g.lineTo(hx + 9, hy + 9.5);
      g.stroke({ color: 0x553333, width: 1, cap: "round", alpha: 0.3 });
    }
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
