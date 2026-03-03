// Procedural sprite generator for the Templar unit type.
//
// Draws a holy warrior / crusader knight at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Great helm with cross visor and crest
//   • White surcoat over chainmail with red templar cross
//   • Longsword with golden crossguard
//   • Kite shield bearing the templar cross
//   • Shoulder pauldrons with gold trim
//   • Flowing white cape
//   • Armored boots and legs

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48; // frame size
const CX = F / 2; // center X
const GY = F - 4; // ground line

// Palette — holy warrior silver & white
const COL_SKIN = 0xdbb896;
const COL_SKIN_DK = 0xc09870;

const COL_MAIL = 0x8899aa; // chainmail undercoat
const COL_MAIL_HI = 0xaabbcc;
const COL_MAIL_DK = 0x667788;

const COL_SURCOAT = 0xf0ece0; // white/cream surcoat

const COL_CROSS = 0xaa1111; // templar red cross

const COL_HELM = 0x99aabb; // great helm steel
const COL_HELM_HI = 0xc0ccdd;
const COL_HELM_DK = 0x6e7e8e;
const COL_VISOR = 0x111122;

const COL_GOLD = 0xd4af37; // gold trim
const COL_GOLD_HI = 0xf0d060;

const COL_SWORD = 0xc4ccd4; // blade
const COL_SWORD_HI = 0xe4ecf4;
const COL_SWORD_GRD = 0xb8962e; // crossguard gold
const COL_SWORD_POM = 0x8a6a1e;

const COL_SHIELD = 0xe8e4d8; // off-white shield face
const COL_SHIELD_RIM = 0x99887a; // brown-grey rim
const COL_SHIELD_CROSS = 0xaa1111;

const COL_CAPE = 0xeeeade; // white cape
const COL_CAPE_DK = 0xccc8b8;

const COL_BOOT = 0x554433;
const COL_BOOT_DK = 0x3a2e22;

const COL_SHADOW = 0x000000;

const COL_HOLY = 0xffee88; // divine glow
const COL_HOLY_CORE = 0xffffcc;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── drawing sub-routines ────────────────────────────────────────────── */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 13,
  h = 3.5,
  alpha = 0.3,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5;
  const bh = 5 - squash;
  // left
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  // right
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Chainmail leggings
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_MAIL_DK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_MAIL_DK });
  // Knee guards
  g.ellipse(cx - 3 + stanceL, legTop + 1, 3, 2).fill({ color: COL_MAIL_HI });
  g.ellipse(cx + 3 + stanceR, legTop + 1, 3, 2).fill({ color: COL_MAIL_HI });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;

  // Chainmail base layer
  g.roundRect(x - 1, top, tw + 2, h, 2)
    .fill({ color: COL_MAIL })
    .stroke({ color: COL_MAIL_DK, width: 0.6 });

  // Mail texture lines
  for (let row = 2; row < h - 1; row += 3) {
    g.moveTo(x + 1, top + row)
      .lineTo(x + tw + 1, top + row)
      .stroke({ color: COL_MAIL_HI, width: 0.3, alpha: 0.4 });
  }

  // White surcoat over chainmail
  g.roundRect(x + 1, top + 1, tw - 2, h - 2, 1).fill({ color: COL_SURCOAT });

  // Red templar cross on chest
  const crossCx = cx + tilt;
  const crossCy = top + h * 0.45;
  g.rect(crossCx - 1, crossCy - 3.5, 2, 7).fill({ color: COL_CROSS });
  g.rect(crossCx - 3, crossCy - 1, 6, 2).fill({ color: COL_CROSS });

  // Shoulder pauldrons
  g.ellipse(x, top + 2, 4, 3)
    .fill({ color: COL_MAIL_HI })
    .stroke({ color: COL_GOLD, width: 0.5 });
  g.ellipse(x + tw, top + 2, 4, 3)
    .fill({ color: COL_MAIL_HI })
    .stroke({ color: COL_GOLD, width: 0.5 });

  // Gold belt
  g.rect(x + 1, top + h - 3, tw - 2, 2).fill({ color: COL_GOLD });
  // Belt buckle
  g.circle(cx + tilt, top + h - 2, 1.2).fill({ color: COL_GOLD_HI });
}

function drawHelm(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
): void {
  const hw = 10;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Main helm dome
  g.roundRect(x, top, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_HELM_DK, width: 0.6 });

  // Steel highlight
  g.roundRect(x + 2, top + 1, 4, 3, 1).fill({ color: COL_HELM_HI, alpha: 0.5 });

  // Cross-shaped visor
  // Horizontal eye slit
  g.rect(x + 2, top + hh - 5, hw - 4, 2).fill({ color: COL_VISOR });
  // Vertical nasal / cross bar
  g.rect(cx - 0.8 + tilt, top + 2, 1.6, hh - 3).fill({ color: COL_HELM_DK });

  // Tiny gold cross crest on top
  g.rect(cx - 0.5 + tilt, top - 2, 1, 3).fill({ color: COL_GOLD });
  g.rect(cx - 1.5 + tilt, top - 1, 3, 1).fill({ color: COL_GOLD });
}

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 12;
  const x = cx - cw / 2 - 2;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });

  // Subtle folds
  const mid = capeTop + capeH * 0.5;
  g.moveTo(x + 3, capeTop + 2)
    .lineTo(x + 3 + wave, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.3, alpha: 0.4 });
  g.moveTo(x + cw - 3, capeTop + 2)
    .lineTo(x + cw - 3 + wave * 2, mid)
    .stroke({ color: COL_CAPE_DK, width: 0.3, alpha: 0.4 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  armored = true,
): void {
  // Upper arm (armored)
  g.moveTo(sx, sy)
    .lineTo(ex, ey)
    .stroke({ color: armored ? COL_MAIL : COL_SKIN, width: 3.5 });
  // Elbow guard
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  if (armored) {
    g.circle(mx, my, 2).fill({ color: COL_MAIL_HI });
  }
  // Hand
  g.circle(ex, ey, 1.8).fill({ color: COL_SKIN_DK });
}

function drawSword(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  bladeLen = 16,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const tipX = bx + sin * bladeLen;
  const tipY = by - cos * bladeLen;

  // Blade
  g.moveTo(bx, by)
    .lineTo(tipX, tipY)
    .stroke({ color: COL_SWORD, width: 2.5 });
  // Highlight edge
  g.moveTo(bx + cos * 0.5, by + sin * 0.5)
    .lineTo(tipX + cos * 0.5, tipY + sin * 0.5)
    .stroke({ color: COL_SWORD_HI, width: 0.7, alpha: 0.7 });
  // Blade tip accent
  g.circle(tipX, tipY, 0.8).fill({ color: COL_SWORD_HI });

  // Crossguard
  const cx1 = bx + cos * 3.5;
  const cy1 = by + sin * 3.5;
  const cx2 = bx - cos * 3.5;
  const cy2 = by - sin * 3.5;
  g.moveTo(cx1, cy1).lineTo(cx2, cy2).stroke({ color: COL_SWORD_GRD, width: 2 });

  // Pommel
  const pomX = bx - sin * 3;
  const pomY = by + cos * 3;
  g.circle(pomX, pomY, 1.8).fill({ color: COL_SWORD_POM });
}

function drawShield(
  g: Graphics,
  sx: number,
  sy: number,
  scale = 1,
): void {
  const sw = 9 * scale;
  const sh = 12 * scale;

  // Shield body — pointed kite shape
  g.moveTo(sx, sy)
    .lineTo(sx + sw, sy)
    .lineTo(sx + sw, sy + sh * 0.55)
    .lineTo(sx + sw / 2, sy + sh)
    .lineTo(sx, sy + sh * 0.55)
    .closePath()
    .fill({ color: COL_SHIELD })
    .stroke({ color: COL_SHIELD_RIM, width: 1 });

  // Red cross on shield
  const scx = sx + sw / 2;
  const scy = sy + sh * 0.38;
  const cw = sw * 0.2;
  const ch = sh * 0.45;
  g.rect(scx - cw / 2, scy - ch / 2, cw, ch).fill({ color: COL_SHIELD_CROSS });
  g.rect(scx - ch / 3, scy - cw / 2, ch * 0.67, cw).fill({
    color: COL_SHIELD_CROSS,
  });
}

function drawHolyGlow(
  g: Graphics,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
): void {
  // Outer glow
  g.circle(cx, cy, radius).fill({
    color: COL_HOLY,
    alpha: 0.08 + intensity * 0.12,
  });
  // Mid glow
  g.circle(cx, cy, radius * 0.6).fill({
    color: COL_HOLY,
    alpha: 0.1 + intensity * 0.15,
  });
  // Core
  g.circle(cx, cy, radius * 0.3).fill({
    color: COL_HOLY_CORE,
    alpha: 0.15 + intensity * 0.15,
  });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const bob = Math.sin(t * Math.PI * 2) * 0.8;

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 10;

  const capeWave = Math.sin(t * Math.PI * 2) * 0.4;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Sword arm (right) — resting at side
  const swordTilt = 0.12 + Math.sin(t * Math.PI * 2) * 0.04;
  const handX = CX + 10;
  const handY = torsoTop + torsoH - 1;
  drawArm(g, CX + 7, torsoTop + 4, handX, handY);
  drawSword(g, handX, handY, swordTilt, 14);

  // Shield arm (left) — held in front
  drawArm(g, CX - 7, torsoTop + 4, CX - 10, torsoTop + 8);
  drawShield(g, CX - 16, torsoTop + 3, 0.85);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 1.5;

  const legH = 8;
  const torsoH = 12;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 10;

  const capeWave = -walk * 1.5;

  drawShadow(g, CX, GY, 13 + Math.abs(walk) * 2, 3.5);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.4);
  drawHelm(g, CX, helmTop, walk * 0.4);

  // Sword arm — angled forward, bouncing with stride
  const armX = CX + 10 + walk * 0.8;
  const armY = torsoTop + torsoH - 2;
  drawArm(g, CX + 7, torsoTop + 4, armX, armY);
  drawSword(g, armX, armY, 0.25 + walk * 0.08, 14);

  // Shield arm — swings opposite to legs
  drawArm(g, CX - 7, torsoTop + 4, CX - 9, torsoTop + 7 - walk);
  drawShield(g, CX - 15, torsoTop + 3 - walk * 0.4, 0.82);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // 8 frames: 0-1=windup  2-3=raise  4=apex  5-6=slash  7=recover
  const phases = [0, 0.12, 0.28, 0.45, 0.58, 0.74, 0.88, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Lean forward during slash
  const lean = t < 0.58 ? t * 2.5 : (1 - t) * 4.5;

  // Sword arc: low → high behind → slash forward → recover
  let swordAngle: number;
  if (t < 0.28) {
    swordAngle = lerp(0.2, -1.6, t / 0.28);
  } else if (t < 0.58) {
    swordAngle = lerp(-1.6, -2.0, (t - 0.28) / 0.3);
  } else if (t < 0.88) {
    swordAngle = lerp(-2.0, 1.4, (t - 0.58) / 0.3);
  } else {
    swordAngle = lerp(1.4, 0.3, (t - 0.88) / 0.12);
  }

  const armReach = t < 0.58 ? t * 3.5 : (1 - t) * 6;

  // Lunge foot
  const lunge = t > 0.35 && t < 0.85 ? 3 : 0;

  drawShadow(g, CX + lean, GY, 13 + lean, 3.5);
  drawCape(
    g,
    CX + lean * 0.3,
    torsoTop + 2,
    legH + torsoH - 2,
    -lean * 0.6,
  );
  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  // Shield — pull back during swing
  const shieldPull = lean * 0.3;
  drawArm(g, CX - 7 + lean, torsoTop + 4, CX - 9 - shieldPull, torsoTop + 8);
  drawShield(g, CX - 15 - shieldPull, torsoTop + 4, 0.78);

  // Sword arm — extended swing
  const sHandX = CX + 8 + lean + armReach;
  const sHandY = torsoTop + 3;
  drawArm(g, CX + 7 + lean, torsoTop + 4, sHandX, sHandY);
  drawSword(g, sHandX, sHandY, swordAngle, 16);

  // Slash trail at peak of swing
  if (t >= 0.55 && t <= 0.82) {
    const trailAlpha = 1 - Math.abs(t - 0.68) / 0.14;
    g.moveTo(sHandX + 2, sHandY - 12)
      .bezierCurveTo(
        sHandX + 10,
        sHandY - 5,
        sHandX + 12,
        sHandY + 5,
        sHandX + 6,
        sHandY + 12,
      )
      .stroke({ color: 0xffffff, width: 1.5, alpha: clamp01(trailAlpha) * 0.5 });
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // 8 frames: raise sword overhead, divine light intensifies, releases
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const raise = Math.min(t * 1.8, 1) * 5;

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 10;

  // Holy glow behind character
  const glowIntensity = clamp01(t * 1.5) * (0.6 + pulse * 0.4);
  drawHolyGlow(g, CX, torsoTop - 2 - raise, 10 + glowIntensity * 6, glowIntensity);

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.5 - 0.25);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  // Both arms raised — sword held overhead
  const raiseAmt = raise;
  drawArm(g, CX + 7, torsoTop + 3, CX + 4, torsoTop - 3 - raiseAmt);
  drawArm(g, CX - 7, torsoTop + 3, CX - 2, torsoTop - 2 - raiseAmt);
  drawSword(g, CX + 2, torsoTop - 4 - raiseAmt, -0.05, 15);

  // Holy particles orbiting the sword tip
  const swordTipY = torsoTop - 4 - raiseAmt - 15;
  for (let i = 0; i < 4; i++) {
    const a = t * Math.PI * 3 + i * (Math.PI / 2);
    const dist = 4 + pulse * 3;
    const px = CX + 2 + Math.cos(a) * dist;
    const py = swordTipY + Math.sin(a) * dist * 0.5;
    const pAlpha = clamp01(0.3 + pulse * 0.4 - i * 0.05);
    g.circle(px, py, 1.2 - i * 0.15).fill({ color: COL_HOLY_CORE, alpha: pAlpha });
  }

  // Shield on back
  drawShield(g, CX - 13, torsoTop + 1, 0.65);
}

function generateDieFrame(g: Graphics, frame: number): void {
  // 8 frames: 0=hit  1-2=stagger  3-4=knees buckle  5-7=collapse
  const t = frame / 7;

  const legH = 8;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  // Progressive collapse
  const fallX = t * 11;
  const dropY = t * t * 10;
  const fallAngle = t * 1.0;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 10;

  drawShadow(g, CX + fallX * 0.4, GY, 13 + t * 3, 3.5, 0.3 * (1 - t * 0.5));

  // Cape crumples
  if (t < 0.85) {
    drawCape(
      g,
      CX + fallX * 0.2,
      torsoTop + 2,
      (legH + torsoH - 2) * (1 - t * 0.3),
      t * 2.5,
    );
  }

  // Legs buckle
  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.15, GY, t * 2, -t * 1, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.15,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
      -t * 1,
    );
  }

  // Torso tilts
  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 3.5,
  );
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.4, fallAngle * 4);

  // Sword tumbles away
  if (t < 0.8) {
    const sdx = CX + 12 + t * 10;
    const sdy = torsoTop + torsoH * 0.5 + t * 7;
    drawSword(g, sdx, sdy, 0.3 + t * 2.8, 14 * (1 - t * 0.3));
  }

  // Shield drops
  if (t < 0.55) {
    drawShield(
      g,
      CX - 14 + fallX * 0.3,
      torsoTop + 4 + dropY * 0.4,
      0.8 * (1 - t * 0.35),
    );
  }

  // Arm flopped on ground in late frames
  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 5,
      CX + fallX * 0.4 + 11,
      torsoTop + torsoH - 2,
      false,
    );
  }
}

/* ── public API ──────────────────────────────────────────────────────── */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all templar sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateTemplarFrames(renderer: Renderer): RenderTexture[] {
  const frames: RenderTexture[] = [];

  for (const [gen, count] of GENERATORS) {
    for (let col = 0; col < count; col++) {
      const g = new Graphics();
      gen(g, col);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      frames.push(rt);

      g.destroy();
    }
  }

  return frames;
}
