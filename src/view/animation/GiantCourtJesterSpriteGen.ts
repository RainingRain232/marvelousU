// Procedural sprite generator for the Giant Court Jester.
//
// 96×144 pixel frames (2w×3h tiles at 48px/tile). Drawn natively, NOT upscaled.
// A huge, rotund jester with bells, motley, three-pointed hat, ruffled collar,
// puffy pantaloons, curly-toe shoes, and an enormous belly.
// States: IDLE 8, MOVE 8, ATTACK 7, CAST 6, DIE 7.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const FW = 96;
const FH = 144;
const CX = FW / 2; // 48
const GY = FH - 8; // ground line near bottom

// Palette
const COL_SKIN = 0xeeccaa;
const COL_SKIN_HL = 0xffeedd;
const COL_SKIN_SH = 0xccaa88;
const COL_LEFT = 0xdd3333;
const COL_LEFT_DK = 0xaa2222;
const COL_LEFT_LT = 0xee5555;
const COL_RIGHT = 0x3333dd;
const COL_RIGHT_DK = 0x2222aa;
const COL_RIGHT_LT = 0x5555ee;
const COL_YELLOW = 0xffcc00;
const COL_YELLOW_DK = 0xcc9900;
const COL_BELL = 0xffdd44;
const COL_BELL_DK = 0xccaa22;
const COL_SHOE = 0x882288;
const COL_SHOE_DK = 0x661166;
const COL_SHOE_TIP = 0xffdd44;
const COL_SHADOW = 0x000000;
const COL_SMILE = 0xcc3333;
const COL_EYE = 0x222222;
const COL_NOSE = 0xff4444;
const COL_WHITE = 0xffffff;
const COL_GREEN = 0x33aa33;
const COL_STITCH = 0x886644;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ellipse(g: Graphics, x: number, y: number, rx: number, ry: number, color: number, alpha = 1): void {
  g.ellipse(x, y, rx, ry).fill({ color, alpha });
}
function circle(g: Graphics, x: number, y: number, r: number, color: number, alpha = 1): void {
  g.circle(x, y, r).fill({ color, alpha });
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, color: number, alpha = 1): void {
  g.rect(x, y, w, h).fill({ color, alpha });
}
function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, color: number, w = 1): void {
  g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color, width: w });
}
function roundRect(g: Graphics, x: number, y: number, w: number, h: number, r: number, color: number, alpha = 1): void {
  g.roundRect(x, y, w, h, r).fill({ color, alpha });
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawHat(g: Graphics, x: number, y: number, bounce: number): void {
  // Three-pointed jester hat with long floppy points and bells

  // Left point (red) — curves outward
  const lx = x - 20;
  const ly = y - 20 + bounce * 1.2;
  line(g, x - 8, y - 8, lx - 2, ly + 4, COL_LEFT, 6);
  line(g, lx - 2, ly + 4, lx, ly, COL_LEFT_LT, 5);
  circle(g, lx, ly, 3.5, COL_BELL);
  circle(g, lx + 0.5, ly - 0.5, 2, COL_BELL_DK);
  // Tiny clapper inside bell
  circle(g, lx, ly + 1.5, 1, COL_YELLOW_DK);

  // Right point (blue)
  const rx = x + 20;
  const ry = y - 20 - bounce * 1.2;
  line(g, x + 8, y - 8, rx + 2, ry + 4, COL_RIGHT, 6);
  line(g, rx + 2, ry + 4, rx, ry, COL_RIGHT_LT, 5);
  circle(g, rx, ry, 3.5, COL_BELL);
  circle(g, rx + 0.5, ry - 0.5, 2, COL_BELL_DK);
  circle(g, rx, ry + 1.5, 1, COL_YELLOW_DK);

  // Center point (yellow) — tallest
  const cy = y - 28 + bounce * 2;
  line(g, x, y - 8, x - 1, cy + 5, COL_YELLOW, 6);
  line(g, x - 1, cy + 5, x, cy, COL_YELLOW_DK, 5);
  circle(g, x, cy, 3.5, COL_BELL);
  circle(g, x + 0.5, cy - 0.5, 2, COL_BELL_DK);
  circle(g, x, cy + 1.5, 1, COL_YELLOW_DK);

  // Hat base — wide brim with scalloped edge
  ellipse(g, x, y - 6, 17, 7, COL_YELLOW_DK);
  // Scallops on brim
  for (let i = -3; i <= 3; i++) {
    circle(g, x + i * 5, y - 2, 3, COL_YELLOW, 0.3);
  }
  // Highlight on brim
  ellipse(g, x - 3, y - 7.5, 8, 2.5, COL_YELLOW, 0.4);

  // Stitching on hat base
  for (let i = -14; i <= 14; i += 4) {
    line(g, x + i, y - 5, x + i + 2, y - 5, COL_STITCH, 0.8);
  }
}

function drawHead(g: Graphics, x: number, y: number, breathe: number): void {
  // Chubby neck / double chin connecting to body
  ellipse(g, x, y + 14, 10, 5, COL_SKIN);
  ellipse(g, x, y + 12, 9, 3, COL_SKIN_SH, 0.3);

  // Big round face
  circle(g, x, y, 14, COL_SKIN);
  // Face highlight
  circle(g, x + 2, y - 2, 11, COL_SKIN_HL, 0.2);
  // Jawline shadow
  ellipse(g, x, y + 8, 12, 4, COL_SKIN_SH, 0.2);

  // Ears
  ellipse(g, x - 13, y, 3, 5, COL_SKIN);
  circle(g, x - 13, y, 2, COL_SKIN_SH, 0.3); // ear detail
  ellipse(g, x + 13, y, 3, 5, COL_SKIN);
  circle(g, x + 13, y, 2, COL_SKIN_SH, 0.3);

  // Rosy cheeks
  circle(g, x - 8, y + 3, 4.5, 0xffaaaa, 0.45);
  circle(g, x + 8, y + 3, 4.5, 0xffaaaa, 0.45);

  // Eyebrows (bushy)
  line(g, x - 8, y - 6, x - 2, y - 7, COL_STITCH, 2);
  line(g, x + 2, y - 7, x + 8, y - 6, COL_STITCH, 2);

  // Eyes (happy squinting arcs)
  line(g, x - 7, y - 2, x - 3, y - 5, COL_EYE, 2.5);
  line(g, x - 3, y - 5, x + 0, y - 2, COL_EYE, 2.5);
  line(g, x + 2, y - 2, x + 5, y - 5, COL_EYE, 2.5);
  line(g, x + 5, y - 5, x + 9, y - 2, COL_EYE, 2.5);

  // Eyelashes
  line(g, x - 7, y - 2, x - 8, y - 4, COL_EYE, 1);
  line(g, x + 9, y - 2, x + 10, y - 4, COL_EYE, 1);

  // Sparkle in eyes
  circle(g, x - 3, y - 3.5, 1.2, COL_WHITE, 0.8);
  circle(g, x + 5, y - 3.5, 1.2, COL_WHITE, 0.8);

  // Big red bulbous nose
  circle(g, x, y + 2, 5, COL_NOSE);
  circle(g, x - 1.5, y + 0.5, 2.5, 0xff6666, 0.5); // highlight
  circle(g, x + 1, y + 3.5, 1, COL_LEFT_DK, 0.3); // nostril hint

  // Wide grinning smile
  line(g, x - 9, y + 7, x - 4, y + 10.5, COL_SMILE, 2.5);
  line(g, x - 4, y + 10.5, x, y + 11, COL_SMILE, 2.5);
  line(g, x, y + 11, x + 4, y + 10.5, COL_SMILE, 2.5);
  line(g, x + 4, y + 10.5, x + 9, y + 7, COL_SMILE, 2.5);
  // Teeth
  rect(g, x - 3, y + 9, 2.5, 2, COL_WHITE, 0.7);
  rect(g, x + 0.5, y + 9, 2.5, 2, COL_WHITE, 0.7);
  // Tongue hint
  circle(g, x, y + 11.5, 2, 0xff8888, 0.3);

  // Freckles
  circle(g, x - 5, y + 1, 0.8, COL_STITCH, 0.3);
  circle(g, x - 6, y + 3, 0.8, COL_STITCH, 0.3);
  circle(g, x + 6, y + 1, 0.8, COL_STITCH, 0.3);
  circle(g, x + 7, y + 3, 0.8, COL_STITCH, 0.3);

  drawHat(g, x, y, breathe);
}

function drawBody(g: Graphics, x: number, y: number, breathe: number): void {
  const bellyRx = 20;
  const bellyRy = 28 + breathe * 0.6;

  // Main belly — motley pattern (left red, right blue)
  // Left half (red)
  ellipse(g, x - 3, y + 8, bellyRx, bellyRy, COL_LEFT);
  // Right half (blue)
  ellipse(g, x + 3, y + 8, bellyRx, bellyRy, COL_RIGHT);

  // Shading on belly
  ellipse(g, x - 6, y + 14, bellyRx - 6, bellyRy - 6, COL_LEFT_DK, 0.2);
  ellipse(g, x + 6, y + 14, bellyRx - 6, bellyRy - 6, COL_RIGHT_DK, 0.2);

  // Center dividing stripe (gold seam)
  rect(g, x - 2.5, y - 14, 5, 48, COL_YELLOW, 0.6);
  // Stitching along center seam
  for (let sy = y - 12; sy < y + 32; sy += 5) {
    line(g, x - 0.5, sy, x + 0.5, sy + 3, COL_STITCH, 1);
  }

  // Diamond pattern on belly (checkerboard motley detail)
  for (let i = 0; i < 5; i++) {
    const dy = y - 4 + i * 8;
    // Left side diamonds
    const lCol = i % 2 === 0 ? COL_YELLOW : COL_GREEN;
    rect(g, x - 12, dy, 5, 5, lCol, 0.4);
    // Right side diamonds
    const rCol = i % 2 === 0 ? COL_GREEN : COL_YELLOW;
    rect(g, x + 7, dy, 5, 5, rCol, 0.4);
  }

  // Patches (sewn-on patches for extra detail)
  roundRect(g, x - 16, y + 4, 8, 6, 1, COL_GREEN, 0.4);
  // Patch stitching
  line(g, x - 16, y + 4, x - 8, y + 4, COL_STITCH, 0.8);
  line(g, x - 16, y + 10, x - 8, y + 10, COL_STITCH, 0.8);
  line(g, x - 16, y + 4, x - 16, y + 10, COL_STITCH, 0.8);
  line(g, x - 8, y + 4, x - 8, y + 10, COL_STITCH, 0.8);

  roundRect(g, x + 10, y + 16, 7, 5, 1, COL_YELLOW, 0.3);
  line(g, x + 10, y + 16, x + 17, y + 16, COL_STITCH, 0.8);
  line(g, x + 10, y + 21, x + 17, y + 21, COL_STITCH, 0.8);

  // Belly button
  circle(g, x, y + 14, 2.5, COL_LEFT_DK, 0.35);
  circle(g, x, y + 14, 1, COL_SHADOW, 0.3);

  // Buttons down center stripe
  for (let i = 0; i < 4; i++) {
    const by = y - 8 + i * 10;
    circle(g, x, by, 2.5, COL_BELL);
    circle(g, x, by, 1.5, COL_BELL_DK);
    // Button holes (tiny dots)
    circle(g, x - 0.8, by - 0.5, 0.5, COL_SHADOW, 0.4);
    circle(g, x + 0.8, by - 0.5, 0.5, COL_SHADOW, 0.4);
  }

  // Belt / sash around the waist area
  ellipse(g, x, y - 8, bellyRx + 2, 5, COL_YELLOW_DK);
  // Belt buckle — ornate
  roundRect(g, x - 5, y - 12, 10, 8, 2, COL_BELL);
  roundRect(g, x - 3, y - 10, 6, 4, 1, COL_YELLOW_DK);
  // Star on buckle
  circle(g, x, y - 8, 1.5, COL_WHITE, 0.6);

  // Ruffled collar — layered circles around the neck
  for (let i = -5; i <= 5; i++) {
    circle(g, x + i * 4, y - 14, 5, COL_WHITE);
  }
  // Inner row with color
  for (let i = -4; i <= 4; i++) {
    circle(g, x + i * 4 + 2, y - 16, 3.5, COL_YELLOW, 0.5);
  }
  // Collar shadow
  for (let i = -5; i <= 5; i++) {
    circle(g, x + i * 4, y - 12, 3, COL_SHADOW, 0.06);
  }

  // Suspenders/straps going up to shoulders (over belly to collar)
  line(g, x - 14, y - 14, x - 8, y + 20, COL_YELLOW_DK, 2.5);
  line(g, x + 14, y - 14, x + 8, y + 20, COL_YELLOW_DK, 2.5);
}

function drawArms(g: Graphics, x: number, y: number, breathe: number, leftAngle: number, rightAngle: number): void {
  // Left arm (red puffy sleeve)
  const lsx = x - 22; // shoulder
  const lsy = y + 2 + breathe * 0.5;
  const handDist = 22;
  const lhx = lsx + Math.cos(leftAngle) * handDist;
  const lhy = lsy + Math.sin(leftAngle) * handDist;

  // Puffy upper sleeve
  const lubx = (lsx + lhx) / 2 - 2;
  const luby = (lsy + lhy) / 2 - 2;
  line(g, lsx, lsy, lhx, lhy, COL_LEFT_DK, 9);
  // Puff at shoulder
  circle(g, lsx + 2, lsy, 6, COL_LEFT);
  // Stripe on sleeve
  circle(g, lubx, luby, 4.5, COL_YELLOW, 0.4);
  // Cuff
  circle(g, lhx + (lsx - lhx) * 0.15, lhy + (lsy - lhy) * 0.15, 5, COL_YELLOW_DK, 0.6);
  // Hand with fingers
  circle(g, lhx, lhy, 5, COL_SKIN);
  circle(g, lhx + 0.5, lhy - 0.5, 4, COL_SKIN_HL, 0.3);
  // Fingers
  circle(g, lhx - 3, lhy + 3, 1.8, COL_SKIN);
  circle(g, lhx - 1, lhy + 4, 1.8, COL_SKIN);
  circle(g, lhx + 1.5, lhy + 3.5, 1.8, COL_SKIN);
  // Bell on wrist
  circle(g, lhx - 3, lhy + 6, 2.5, COL_BELL);
  circle(g, lhx - 2.5, lhy + 5.5, 1.2, COL_BELL_DK);

  // Right arm (blue puffy sleeve)
  const rsx = x + 22;
  const rsy = y + 2 + breathe * 0.5;
  const rhx = rsx + Math.cos(rightAngle) * handDist;
  const rhy = rsy + Math.sin(rightAngle) * handDist;

  const rubx = (rsx + rhx) / 2 + 2;
  const ruby = (rsy + rhy) / 2 - 2;
  line(g, rsx, rsy, rhx, rhy, COL_RIGHT_DK, 9);
  circle(g, rsx - 2, rsy, 6, COL_RIGHT);
  circle(g, rubx, ruby, 4.5, COL_YELLOW, 0.4);
  circle(g, rhx + (rsx - rhx) * 0.15, rhy + (rsy - rhy) * 0.15, 5, COL_YELLOW_DK, 0.6);
  circle(g, rhx, rhy, 5, COL_SKIN);
  circle(g, rhx - 0.5, rhy - 0.5, 4, COL_SKIN_HL, 0.3);
  circle(g, rhx + 3, rhy + 3, 1.8, COL_SKIN);
  circle(g, rhx + 1, rhy + 4, 1.8, COL_SKIN);
  circle(g, rhx - 1.5, rhy + 3.5, 1.8, COL_SKIN);
  circle(g, rhx + 3, rhy + 6, 2.5, COL_BELL);
  circle(g, rhx + 2.5, rhy + 5.5, 1.2, COL_BELL_DK);
}

function drawLegs(g: Graphics, x: number, y: number, step: number, bodyBottom: number): void {
  const stride = Math.sin(step * Math.PI * 2) * 5;

  // Left leg — red puffy pantaloon
  const legTop = bodyBottom; // connect seamlessly to body bottom
  const legLen = y + 18 - legTop; // from body to shoe top
  const llEnd = y + 18 + stride * 0.5;

  // Upper pantaloon (puffy)
  ellipse(g, x - 6, legTop + legLen * 0.3, 9, legLen * 0.35, COL_LEFT);
  // Lower pantaloon
  rect(g, x - 12, legTop, 12, legLen, COL_LEFT_DK);
  // Puffy knee puff
  circle(g, x - 6, legTop + legLen * 0.5, 7, COL_LEFT);
  // Knee stripe
  ellipse(g, x - 6, legTop + legLen * 0.5, 7, 2, COL_YELLOW, 0.35);
  // Sock/stocking cuff
  rect(g, x - 12, llEnd - 4, 12, 4, COL_YELLOW_DK);
  // Stitching on pantaloon
  line(g, x - 6, legTop + 3, x - 6, legTop + legLen - 4, COL_STITCH, 0.8);

  // Curly-toe shoe
  ellipse(g, x - 7, llEnd + 2, 10, 6, COL_SHOE);
  ellipse(g, x - 7, llEnd, 9, 4, COL_SHOE_DK, 0.4); // shoe top shadow
  // Curly toe curl
  circle(g, x - 17, llEnd, 4, COL_SHOE);
  circle(g, x - 20, llEnd - 3, 3, COL_SHOE);
  circle(g, x - 22, llEnd - 5, 2.5, COL_SHOE_TIP);
  // Shoe buckle
  roundRect(g, x - 9, llEnd - 1, 5, 4, 1, COL_BELL, 0.7);
  // Sole highlight
  line(g, x - 16, llEnd + 5, x + 2, llEnd + 5, COL_SHOE_DK, 1.5);

  // Right leg — blue puffy pantaloon
  const rlEnd = y + 18 - stride * 0.5;
  ellipse(g, x + 6, legTop + legLen * 0.3, 9, legLen * 0.35, COL_RIGHT);
  rect(g, x + 1, legTop, 12, legLen, COL_RIGHT_DK);
  circle(g, x + 7, legTop + legLen * 0.5, 7, COL_RIGHT);
  ellipse(g, x + 7, legTop + legLen * 0.5, 7, 2, COL_YELLOW, 0.35);
  rect(g, x + 1, rlEnd - 4, 12, 4, COL_YELLOW_DK);
  line(g, x + 7, legTop + 3, x + 7, legTop + legLen - 4, COL_STITCH, 0.8);

  ellipse(g, x + 8, rlEnd + 2, 10, 6, COL_SHOE);
  ellipse(g, x + 8, rlEnd, 9, 4, COL_SHOE_DK, 0.4);
  circle(g, x + 18, rlEnd, 4, COL_SHOE);
  circle(g, x + 21, rlEnd - 3, 3, COL_SHOE);
  circle(g, x + 23, rlEnd - 5, 2.5, COL_SHOE_TIP);
  roundRect(g, x + 5, rlEnd - 1, 5, 4, 1, COL_BELL, 0.7);
  line(g, x - 1, rlEnd + 5, x + 17, rlEnd + 5, COL_SHOE_DK, 1.5);
}

// ---------------------------------------------------------------------------
// Animation states — body parts positioned so legs connect to belly bottom
// ---------------------------------------------------------------------------

// Layout constants: belly center is at bodyY+8, bellyRy~28, so belly bottom ~ bodyY+36
// Legs connect at bodyBottom = bodyY + 36

function generateIdle(g: Graphics, frame: number): void {
  const t = frame / 8;
  const breathe = Math.sin(t * Math.PI * 2) * 1.5;
  const jingle = Math.sin(t * Math.PI * 4) * 1;

  ellipse(g, CX, GY, 26, 8, COL_SHADOW, 0.3);

  const bodyY = GY - 72 + breathe;
  const bodyBottom = bodyY + 36 + breathe * 0.6; // matches belly ellipse bottom
  const headY = bodyY - 26 + breathe * 0.3;

  drawLegs(g, CX, GY - 26, 0, bodyBottom);
  drawBody(g, CX, bodyY, breathe);
  drawArms(g, CX, bodyY, breathe,
    -Math.PI * 0.4 + jingle * 0.15,
    -Math.PI * 0.6 - jingle * 0.15);
  drawHead(g, CX, headY, jingle);
}

function generateMove(g: Graphics, frame: number): void {
  const t = frame / 8;
  const bob = Math.abs(Math.sin(t * Math.PI * 2)) * 4;
  const sway = Math.sin(t * Math.PI * 2) * 3;
  const jingle = Math.sin(t * Math.PI * 4) * 2;

  ellipse(g, CX, GY, 26, 8, COL_SHADOW, 0.3);

  const bodyY = GY - 72 - bob;
  const bodyBottom = bodyY + 36;
  const headY = bodyY - 26;

  drawLegs(g, CX + sway, GY - 26, t, bodyBottom);
  drawBody(g, CX + sway, bodyY, bob * 0.3);
  drawArms(g, CX + sway, bodyY, bob * 0.3,
    -Math.PI * 0.3 + sway * 0.05,
    -Math.PI * 0.7 - sway * 0.05);
  drawHead(g, CX + sway, headY, jingle);
}

function generateAttack(g: Graphics, frame: number): void {
  const t = frame / 6;
  let lean = 0;
  let armSwing = -Math.PI * 0.4;

  if (t < 0.3) {
    lean = -t / 0.3 * 4;
    armSwing = -Math.PI * 0.4 - (t / 0.3) * 0.4;
  } else if (t < 0.6) {
    const p = (t - 0.3) / 0.3;
    lean = -4 + p * 12;
    armSwing = -Math.PI * 0.8 + p * Math.PI * 0.6;
  } else {
    const p = (t - 0.6) / 0.4;
    lean = 8 - p * 8;
    armSwing = -Math.PI * 0.2 - p * 0.2;
  }

  ellipse(g, CX, GY, 26, 8, COL_SHADOW, 0.3);

  const bodyY = GY - 72;
  const bodyBottom = bodyY + 36;
  const headY = bodyY - 26;

  drawLegs(g, CX, GY - 26, 0, bodyBottom);
  drawBody(g, CX + lean, bodyY, 0);
  drawArms(g, CX + lean, bodyY, 0, armSwing, -Math.PI * 0.6);
  drawHead(g, CX + lean, headY, 0);

  // Impact star on forward slap
  if (t >= 0.45 && t < 0.6) {
    const sx = CX + lean + 28;
    const sy = bodyY + 5;
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r1 = 6;
      const r2 = 12;
      const r = i % 2 === 0 ? r2 : r1;
      const ex = sx + Math.cos(a) * r;
      const ey = sy + Math.sin(a) * r;
      line(g, sx, sy, ex, ey, COL_YELLOW, 2);
    }
    circle(g, sx, sy, 3, COL_WHITE, 0.6);
  }
}

function generateCast(g: Graphics, frame: number): void {
  generateAttack(g, frame);
}

function generateDie(g: Graphics, frame: number): void {
  const t = frame / 6;
  const fall = t * 16;
  const drop = t * 30;
  const fade = 1 - t;

  ellipse(g, CX, GY, 26 * fade, 8 * fade, COL_SHADOW, 0.3 * fade);

  const bodyY = GY - 72;
  const bodyBottom = bodyY + 36;
  const headY = bodyY - 26;

  if (t < 0.85) drawLegs(g, CX + fall * 0.5, GY - 26 + drop * 0.3, 0, bodyBottom + drop * 0.4);
  if (t < 0.75) {
    drawBody(g, CX + fall, bodyY + drop, 0);
    drawArms(g, CX + fall, bodyY + drop, 0,
      -Math.PI * 0.2 + t * 0.5, -Math.PI * 0.8 + t * 0.3);
  }
  if (t < 0.55) drawHead(g, CX + fall * 1.5, headY + drop * 0.7, 0);

  // Bells scatter in arc
  if (t > 0.3) {
    for (let i = 0; i < 5; i++) {
      const a = i * 1.3 + 0.5;
      const dist = t * 35;
      const bx = CX + fall + Math.cos(a) * dist;
      const by = headY + drop * 0.5 + Math.sin(a) * dist * 0.6 - (1 - t) * 15;
      circle(g, bx, by, 2.5 * fade, COL_BELL, fade * 0.8);
      circle(g, bx, by, 1.2 * fade, COL_BELL_DK, fade * 0.5);
    }
  }

  // Stars/dizzy above head
  if (t > 0.2 && t < 0.7) {
    for (let i = 0; i < 3; i++) {
      const sa = t * 5 + i * 2.1;
      const sx = CX + fall * 1.5 + Math.cos(sa) * 12;
      const sy = headY + drop * 0.5 - 12 + Math.sin(sa) * 6;
      circle(g, sx, sy, 1.5, COL_YELLOW, fade);
    }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdle,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMove,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttack, count: 7 },
  [UnitState.CAST]:   { gen: generateCast,   count: 6 },
  [UnitState.DIE]:    { gen: generateDie,    count: 7 },
};

export function generateGiantCourtJesterFrames(renderer: Renderer): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);
      const rt = RenderTexture.create({ width: FW, height: FH });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
