// Procedural sprite generator for the Settler unit type.
//
// Draws a medieval peasant/colonist at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture. Produces textures for every
// animation state (IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7).
//
// Visual features:
//   * Brown tunic with earthy tones
//   * Tan pants and leather boots
//   * Large supply pack/bundle on back
//   * Simple dark brown hood/hat
//   * Walking staff/stick in one hand
//   * Skin tones with shadow detail
//   * Shadow ellipse under feet

import { Graphics, RenderTexture, type Renderer } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Skin
const COL_SKIN = 0xf5d0b0;
const COL_SKIN_SH = 0xd4a880;

// Tunic — earthy brown
const COL_TUNIC = 0x8b6914;
const COL_TUNIC_LT = 0xa07828;
const COL_TUNIC_DK = 0x6a5010;

// Pants — tan
const COL_PANT = 0xc8a848;
const COL_PANT_LT = 0xd8b858;

// Boots — leather
const COL_BOOT = 0x5c3a1e;
const COL_BOOT_HI = 0x6c4a2e;

// Hood/hat — dark brown
const COL_HOOD = 0x4a3020;
const COL_HOOD_LT = 0x5a4030;

// Supply pack/bundle
const COL_PACK = 0xc8a848;
const COL_PACK_DK = 0x8b6914;
const COL_PACK_STRAP = 0x5c3a1e;

// Staff — wood tones
const COL_STAFF = 0x6b4226;
const COL_STAFF_LT = 0x8b5a36;

// Belt
const COL_BELT = 0x5c3a1e;
const COL_BUCKLE = 0xb8960c;

const COL_SHADOW = 0x000000;
const COL_EYE = 0x222222;
const COL_MOUTH = 0x994444;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number, a = 1): void {
  g.rect(x, y, w, h).fill({ color: c, alpha: a });
}
function circle(g: Graphics, x: number, y: number, r: number, c: number, a = 1): void {
  g.circle(x, y, r).fill({ color: c, alpha: a });
}
function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, c: number, a = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color: c, alpha: a });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w: number): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: c, width: w });
}

// ---------------------------------------------------------------------------
// Sub-routines — reusable body parts
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics, ox = 0, scale = 1): void {
  ellipse(g, CX + ox, GY + 1, 12 * scale, 3, COL_SHADOW, 0.3);
}

function drawBoots(g: Graphics, lx: number, rx: number, ly: number, ry: number): void {
  // Left boot
  rect(g, lx, ly, 5, 5, COL_BOOT);
  rect(g, lx + 1, ly, 3, 4, COL_BOOT_HI);
  rect(g, lx - 1, ly + 4, 7, 1, COL_BOOT);

  // Right boot
  rect(g, rx, ry, 5, 5, COL_BOOT);
  rect(g, rx + 1, ry, 3, 4, COL_BOOT_HI);
  rect(g, rx - 1, ry + 4, 7, 1, COL_BOOT);
}

function drawLegs(g: Graphics, bob: number, legSwing = 0): void {
  const ly = GY - 18 + bob;
  // Left leg
  rect(g, CX - 5 - legSwing * 0.3, ly, 4, 14, COL_PANT);
  rect(g, CX - 4 - legSwing * 0.3, ly, 2, 13, COL_PANT_LT);
  // Right leg
  rect(g, CX + 1 + legSwing * 0.3, ly, 4, 14, COL_PANT);
  rect(g, CX + 2 + legSwing * 0.3, ly, 2, 13, COL_PANT_LT);

  // Boots
  drawBoots(
    g,
    CX - 6 - legSwing * 0.5, CX + 1 + legSwing * 0.5,
    GY - 5, GY - 5,
  );
}

function drawTunic(g: Graphics, bob: number): void {
  const ty = GY - 26 + bob;
  // Main tunic body
  rect(g, CX - 9, ty, 18, 14, COL_TUNIC);
  rect(g, CX - 7, ty + 2, 14, 10, COL_TUNIC_LT);
  // Darker hem at bottom
  rect(g, CX - 9, ty + 12, 18, 2, COL_TUNIC_DK);
  // Neckline
  rect(g, CX - 3, ty, 6, 2, COL_TUNIC_DK);

  // Belt
  rect(g, CX - 9, ty + 9, 18, 2, COL_BELT);
  // Buckle
  rect(g, CX - 1, ty + 9, 2, 2, COL_BUCKLE);

  // Tunic stitching — vertical center seam
  line(g, CX, ty + 2, CX, ty + 9, COL_TUNIC_DK, 0.5);
}

function drawPack(g: Graphics, bob: number, sway = 0): void {
  const py = GY - 28 + bob;
  const px = CX + 6 + sway;

  // Main bundle — large rounded pack
  rect(g, px - 2, py - 2, 12, 14, COL_PACK_DK);
  rect(g, px, py, 10, 12, COL_PACK);
  // Highlight on pack
  rect(g, px + 1, py + 1, 6, 4, COL_PANT_LT, 0.4);

  // Strap across body (front diagonal)
  line(g, CX - 6, GY - 24 + bob, CX + 4, GY - 16 + bob, COL_PACK_STRAP, 2);
  // Shoulder strap
  line(g, CX + 4, py, px, py + 2, COL_PACK_STRAP, 2);

  // Rope tie around the bundle
  line(g, px, py + 4, px + 9, py + 4, COL_PACK_STRAP, 1);
  line(g, px, py + 8, px + 9, py + 8, COL_PACK_STRAP, 1);

  // Rolled blanket on top of pack
  ellipse(g, px + 5, py - 2, 5, 2, COL_TUNIC_DK);
  ellipse(g, px + 5, py - 2, 4, 1.5, COL_TUNIC);
}

function drawHead(g: Graphics, bob: number): void {
  const hy = GY - 34 + bob;

  // Neck
  rect(g, CX - 2, hy + 6, 4, 3, COL_SKIN);

  // Head shape
  rect(g, CX - 4, hy, 8, 9, COL_SKIN);
  rect(g, CX - 3, hy + 1, 6, 7, COL_SKIN, 1);
  // Jaw shadow
  rect(g, CX - 3, hy + 6, 6, 2, COL_SKIN_SH);

  // Eyes
  rect(g, CX - 3, hy + 3, 2, 1.5, 0xffffff);
  rect(g, CX + 1, hy + 3, 2, 1.5, 0xffffff);
  rect(g, CX - 2.5, hy + 3.3, 1, 1, COL_EYE);
  rect(g, CX + 1.5, hy + 3.3, 1, 1, COL_EYE);
  // Eyebrows
  rect(g, CX - 3, hy + 2, 2.5, 0.7, COL_HOOD);
  rect(g, CX + 0.5, hy + 2, 2.5, 0.7, COL_HOOD);

  // Nose
  rect(g, CX - 0.5, hy + 4, 1, 2, COL_SKIN_SH);

  // Mouth
  rect(g, CX - 1, hy + 7, 2, 0.7, COL_MOUTH);

  // Ears
  circle(g, CX - 4, hy + 4, 1.2, COL_SKIN);
  circle(g, CX + 4, hy + 4, 1.2, COL_SKIN);
  circle(g, CX - 4, hy + 4, 0.5, COL_SKIN_SH);
  circle(g, CX + 4, hy + 4, 0.5, COL_SKIN_SH);
}

function drawHood(g: Graphics, bob: number): void {
  const hy = GY - 34 + bob;

  // Hood body — covers top and sides of head
  rect(g, CX - 5, hy - 2, 10, 5, COL_HOOD);
  rect(g, CX - 4, hy - 1, 8, 4, COL_HOOD_LT);
  // Hood brim / front edge
  rect(g, CX - 5, hy + 1, 10, 1, COL_HOOD);
  // Hood peak
  rect(g, CX - 3, hy - 3, 6, 2, COL_HOOD);
  rect(g, CX - 2, hy - 3, 4, 1, COL_HOOD_LT);
}

function drawArms(g: Graphics, bob: number, lArmY = 0, rArmY = 0): void {
  // Left arm (front arm, holds staff)
  rect(g, CX - 12, GY - 22 + bob + lArmY, 4, 9, COL_TUNIC);
  rect(g, CX - 11, GY - 22 + bob + lArmY, 2, 8, COL_TUNIC_LT);
  // Sleeve cuff
  rect(g, CX - 12, GY - 14 + bob + lArmY, 4, 1, COL_TUNIC_DK);
  // Hand
  circle(g, CX - 10, GY - 12 + bob + lArmY, 2, COL_SKIN);
  circle(g, CX - 10, GY - 12 + bob + lArmY, 1, COL_SKIN_SH);

  // Right arm (back arm, mostly hidden by pack)
  rect(g, CX + 8, GY - 22 + bob + rArmY, 3, 8, COL_TUNIC);
  rect(g, CX + 9, GY - 22 + bob + rArmY, 1, 7, COL_TUNIC_LT);
  // Sleeve cuff
  rect(g, CX + 8, GY - 15 + bob + rArmY, 3, 1, COL_TUNIC_DK);
  // Hand
  circle(g, CX + 9, GY - 13 + bob + rArmY, 1.5, COL_SKIN);
}

function drawStaff(g: Graphics, x: number, topY: number, botY: number): void {
  // Main staff shaft
  line(g, x, topY, x, botY, COL_STAFF, 2);
  // Highlight along shaft
  line(g, x + 0.5, topY + 2, x + 0.5, botY - 2, COL_STAFF_LT, 0.5);
  // Top knob
  circle(g, x, topY, 1.5, COL_STAFF);
  circle(g, x, topY, 0.8, COL_STAFF_LT);
}

// ---------------------------------------------------------------------------
// Full figure composite
// ---------------------------------------------------------------------------

function drawFullSettler(g: Graphics, bob: number, legSwing = 0, armL = 0, armR = 0, packSway = 0): void {
  drawShadow(g);
  drawPack(g, bob, packSway);
  drawLegs(g, bob, legSwing);
  drawTunic(g, bob);
  drawArms(g, bob, armL, armR);
  drawHead(g, bob);
  drawHood(g, bob);
}

// ---------------------------------------------------------------------------
// Animation states
// ---------------------------------------------------------------------------

function drawIdleSettler(g: Graphics, frame: number): void {
  const breathe = Math.sin(frame * 0.8) * 0.5;
  const bob = (frame % 2 === 0) ? 1 : 0;
  const totalBob = breathe + bob * 0.3;
  drawFullSettler(g, totalBob);

  // Staff in left hand
  const staffX = CX - 12;
  drawStaff(g, staffX, GY - 36 + totalBob, GY);

  // Subtle pack sway
  const packSway = Math.sin(frame * 0.5) * 0.3;
  // Redraw pack strap detail with sway
  line(g, CX - 6, GY - 24 + totalBob, CX + 4 + packSway, GY - 16 + totalBob, COL_PACK_STRAP, 0.3);
}

function drawWalkingSettler(g: Graphics, frame: number): void {
  const walkCycle = (frame % 8) / 8;
  const bob = Math.sin(walkCycle * Math.PI * 2) * 1.5;
  const legSwing = Math.sin(walkCycle * Math.PI * 2) * 3;
  const armSwing = Math.sin(walkCycle * Math.PI * 2) * 2;
  const packSway = Math.sin(walkCycle * Math.PI * 2 + 0.5) * 1.5;

  drawFullSettler(g, bob, legSwing, armSwing, -armSwing, packSway);

  // Staff swings with left arm
  const staffX = CX - 12 - armSwing * 0.3;
  const staffTopY = GY - 36 + bob + armSwing * 0.5;
  drawStaff(g, staffX, staffTopY, GY);
}

function drawAttackingSettler(g: Graphics, frame: number): void {
  // Settlers have no attack — use idle pose
  const breathe = Math.sin(frame * 0.8) * 0.5;
  drawFullSettler(g, breathe);

  // Staff in left hand
  const staffX = CX - 12;
  drawStaff(g, staffX, GY - 36 + breathe, GY);
}

function drawCastingSettler(g: Graphics, frame: number): void {
  // Settlers have no cast — use idle pose
  const breathe = Math.sin(frame * 0.8) * 0.5;
  drawFullSettler(g, breathe);

  // Staff in left hand
  const staffX = CX - 12;
  drawStaff(g, staffX, GY - 36 + breathe, GY);
}

function drawDyingSettler(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 18;
  const fadeAlpha = Math.max(0, 1 - t * 0.3);

  // Shrinking shadow
  ellipse(g, CX, GY + 1, 12 - t * 4, 3 - t, COL_SHADOW, 0.3 * fadeAlpha);

  // Lateral offset as settler collapses sideways
  const ox = t * 5;
  const oy = fall;

  // Pack falls off to the side
  const packFall = t * 10;
  const packDrift = t * 8;
  rect(g, CX + 8 + packDrift, GY - 26 + oy + packFall * 0.5 - 2, 10, 12, COL_PACK_DK, fadeAlpha);
  rect(g, CX + 9 + packDrift, GY - 26 + oy + packFall * 0.5, 8, 10, COL_PACK, fadeAlpha);

  // Legs crumpling
  rect(g, CX - 5 + ox, GY - 18 + oy, 4, 14, COL_PANT);
  rect(g, CX + 1 + ox, GY - 18 + oy, 4, 14, COL_PANT);
  // Boots
  rect(g, CX - 6 + ox, GY - 5 + oy * 0.3, 5, 5, COL_BOOT);
  rect(g, CX + 1 + ox, GY - 5 + oy * 0.3, 5, 5, COL_BOOT);

  // Tunic
  rect(g, CX - 9 + ox, GY - 26 + oy, 18, 14, COL_TUNIC);
  rect(g, CX - 9 + ox, GY - 18 + oy, 18, 2, COL_BELT);

  // Head
  rect(g, CX - 4 + ox, GY - 34 + oy, 8, 9, COL_SKIN);
  // Eyes closed
  rect(g, CX - 3 + ox, GY - 31 + oy, 2, 0.7, COL_EYE);
  rect(g, CX + 1 + ox, GY - 31 + oy, 2, 0.7, COL_EYE);

  // Hood sliding off
  const hoodDrift = t * 6;
  rect(g, CX - 5 + ox + hoodDrift, GY - 36 + oy, 10, 5, COL_HOOD, fadeAlpha);

  // Arms limp
  rect(g, CX - 12 + ox, GY - 22 + oy + fall * 0.3, 4, 9, COL_TUNIC);
  circle(g, CX - 10 + ox, GY - 12 + oy + fall * 0.3, 2, COL_SKIN);
  rect(g, CX + 8 + ox, GY - 22 + oy + fall * 0.4, 3, 8, COL_TUNIC);
  circle(g, CX + 9 + ox, GY - 13 + oy + fall * 0.4, 1.5, COL_SKIN);

  // Staff falling away
  if (t > 0.15) {
    const staffDrift = (t - 0.15) * 12;
    const staffAngle = t * 1.2;
    const sx = CX - 14 - staffDrift;
    const sy1 = GY - 36 + oy;
    const sy2 = GY + oy * 0.2;
    line(g, sx, sy1 + staffAngle * 6, sx - staffDrift * 0.5, sy2 + staffAngle * 3, COL_STAFF, 2);
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

export function generateSettlerFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (let row = 0; row < 5; row++) {
    for (let col = 0; col < 8; col++) {
      const state = Object.values(UnitState)[row];
      const g = new Graphics();
      g.clear();

      switch (state) {
        case UnitState.IDLE:
          drawIdleSettler(g, col);
          break;
        case UnitState.MOVE:
          drawWalkingSettler(g, col);
          break;
        case UnitState.ATTACK:
          drawAttackingSettler(g, col);
          break;
        case UnitState.CAST:
          drawCastingSettler(g, col);
          break;
        case UnitState.DIE:
          drawDyingSettler(g, col);
          break;
      }

      const texture = RenderTexture.create({ width: F, height: F });
      renderer.render({ target: texture, container: g });
      g.destroy();
      frames.push(texture);
    }
  }

  return frames;
}
