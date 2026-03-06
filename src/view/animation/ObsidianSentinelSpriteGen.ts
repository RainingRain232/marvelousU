// Procedural sprite generator for the Obsidian Sentinel unit type.
//
// Draws a massive volcanic glass golem at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   - Large blocky angular obsidian body
//   - Black/dark purple base with orange/red magma cracks
//   - Glowing orange veins that pulse on idle
//   - Heavy, slow-looking animations
//   - Stone fists for weapons (no held weapon)
//   - On death, shatters into angular shards
//   - Magma glow from eye sockets

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ------------------------------------------------------------ */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- volcanic obsidian
const COL_OBSIDIAN = 0x1a1020;
const COL_OBSIDIAN_HI = 0x2a1e30;
const COL_OBSIDIAN_DK = 0x0e0a14;
const COL_OBSIDIAN_EDGE = 0x3a2e44; // reflective glass edges

const COL_MAGMA = 0xff6622;
const COL_MAGMA_HI = 0xffaa44;
const COL_MAGMA_GLOW = 0xff4400;

const COL_CRACK = 0xff5500;       // magma cracks in body
const COL_CRACK_DK = 0xaa2200;

const COL_EYE = 0xff8800;         // burning eye glow
const COL_EYE_HI = 0xffcc44;

const COL_FIST = 0x141018;        // polished obsidian fists
const COL_FIST_HI = 0x2a2030;

const COL_SHADOW = 0x000000;

const COL_SHARD = 0x221830;       // death shard color
const COL_EMBER = 0xff6600;       // death ember particles

/* -- helpers -------------------------------------------------------------- */

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* -- drawing sub-routines ------------------------------------------------- */

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 14,
  h = 4,
  alpha = 0.4,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
}

function drawFeet(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
): void {
  // Massive blocky stone feet
  const fw = 7;
  const fh = 4;
  // Left foot
  g.rect(cx - 9 + stanceL, gy - fh, fw, fh)
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_EDGE, width: 0.5 });
  // Magma crack on foot
  g.moveTo(cx - 7 + stanceL, gy - fh + 1)
    .lineTo(cx - 5 + stanceL, gy - 1)
    .stroke({ color: COL_CRACK_DK, width: 0.6, alpha: 0.6 });

  // Right foot
  g.rect(cx + 2 + stanceR, gy - fh, fw, fh)
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_EDGE, width: 0.5 });
  g.moveTo(cx + 4 + stanceR, gy - fh + 1)
    .lineTo(cx + 6 + stanceR, gy - 1)
    .stroke({ color: COL_CRACK_DK, width: 0.6, alpha: 0.6 });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  // Thick column legs
  const lw = 6;
  g.rect(cx - 8 + stanceL, legTop, lw, legH)
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_DK, width: 0.4 });
  g.rect(cx + 2 + stanceR, legTop, lw, legH)
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_DK, width: 0.4 });

  // Magma vein cracks running up legs
  g.moveTo(cx - 6 + stanceL, legTop + legH)
    .lineTo(cx - 5 + stanceL, legTop + legH * 0.3)
    .stroke({ color: COL_CRACK, width: 0.8, alpha: 0.7 });
  g.moveTo(cx + 4 + stanceR, legTop + legH)
    .lineTo(cx + 5 + stanceR, legTop + legH * 0.3)
    .stroke({ color: COL_CRACK, width: 0.8, alpha: 0.7 });
}

function drawTorso(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  tilt = 0,
  crackPulse = 0.5,
): void {
  const tw = 18;
  const x = cx - tw / 2 + tilt;

  // Massive blocky torso -- angular shape
  g.moveTo(x + 2, top + h)
    .lineTo(x, top + 3)
    .lineTo(x + 3, top)
    .lineTo(x + tw - 3, top)
    .lineTo(x + tw, top + 3)
    .lineTo(x + tw - 2, top + h)
    .closePath()
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_EDGE, width: 0.6 });

  // Obsidian surface highlights (glassy reflections)
  g.moveTo(x + 3, top + 2)
    .lineTo(x + 6, top + h * 0.6)
    .stroke({ color: COL_OBSIDIAN_HI, width: 1, alpha: 0.3 });
  g.moveTo(x + tw - 4, top + 3)
    .lineTo(x + tw - 6, top + h * 0.5)
    .stroke({ color: COL_OBSIDIAN_HI, width: 0.8, alpha: 0.25 });

  // Magma crack network across torso
  const crackAlpha = 0.5 + crackPulse * 0.5;
  // Main vertical crack
  g.moveTo(cx + tilt, top + 2)
    .lineTo(cx - 1 + tilt, top + h * 0.4)
    .lineTo(cx + 1 + tilt, top + h * 0.7)
    .lineTo(cx + tilt, top + h - 1)
    .stroke({ color: COL_CRACK, width: 1.2, alpha: crackAlpha });
  // Branch cracks
  g.moveTo(cx - 1 + tilt, top + h * 0.4)
    .lineTo(cx - 5 + tilt, top + h * 0.5)
    .stroke({ color: COL_CRACK, width: 0.8, alpha: crackAlpha * 0.8 });
  g.moveTo(cx + 1 + tilt, top + h * 0.7)
    .lineTo(cx + 5 + tilt, top + h * 0.6)
    .stroke({ color: COL_CRACK, width: 0.8, alpha: crackAlpha * 0.8 });

  // Magma glow behind cracks
  g.circle(cx + tilt, top + h * 0.5, 3).fill({ color: COL_MAGMA_GLOW, alpha: crackAlpha * 0.15 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  tilt = 0,
  eyeGlow = 0.7,
): void {
  const hw = 12;
  const hh = 10;
  const x = cx - hw / 2 + tilt;

  // Angular blocky head
  g.moveTo(x + 1, top + hh)
    .lineTo(x, top + 3)
    .lineTo(x + 2, top)
    .lineTo(x + hw - 2, top)
    .lineTo(x + hw, top + 3)
    .lineTo(x + hw - 1, top + hh)
    .closePath()
    .fill({ color: COL_OBSIDIAN })
    .stroke({ color: COL_OBSIDIAN_EDGE, width: 0.5 });

  // Brow ridge -- angular overhang
  g.moveTo(x + 1, top + 3.5)
    .lineTo(x + hw - 1, top + 3.5)
    .stroke({ color: COL_OBSIDIAN_DK, width: 1.5 });

  // Burning eye sockets
  const eyeAlpha = 0.5 + eyeGlow * 0.5;
  const eyeY = top + 5;
  // Left eye socket
  g.rect(cx - 3.5 + tilt, eyeY, 2.5, 2).fill({ color: COL_SHADOW });
  g.rect(cx - 3 + tilt, eyeY + 0.3, 1.5, 1.2).fill({ color: COL_EYE, alpha: eyeAlpha });
  g.circle(cx - 2.3 + tilt, eyeY + 0.9, 2).fill({ color: COL_EYE_HI, alpha: eyeAlpha * 0.15 });
  // Right eye socket
  g.rect(cx + 1 + tilt, eyeY, 2.5, 2).fill({ color: COL_SHADOW });
  g.rect(cx + 1.5 + tilt, eyeY + 0.3, 1.5, 1.2).fill({ color: COL_EYE, alpha: eyeAlpha });
  g.circle(cx + 2.3 + tilt, eyeY + 0.9, 2).fill({ color: COL_EYE_HI, alpha: eyeAlpha * 0.15 });

  // Crack across forehead
  g.moveTo(x + 3, top + 2)
    .lineTo(cx + tilt, top + 3.5)
    .lineTo(x + hw - 4, top + 1.5)
    .stroke({ color: COL_CRACK, width: 0.6, alpha: eyeAlpha * 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  fistSize = 3.5,
): void {
  // Thick stone arm
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_OBSIDIAN, width: 5 });
  // Edge highlight
  g.moveTo(sx + 1, sy).lineTo(ex + 1, ey).stroke({ color: COL_OBSIDIAN_EDGE, width: 0.5, alpha: 0.3 });
  // Crack on arm
  const mx = (sx + ex) / 2;
  const my = (sy + ey) / 2;
  g.moveTo(mx - 1, my - 1)
    .lineTo(mx + 1, my + 1)
    .stroke({ color: COL_CRACK, width: 0.5, alpha: 0.5 });
  // Massive fist
  g.roundRect(ex - fistSize, ey - fistSize, fistSize * 2, fistSize * 2, 1)
    .fill({ color: COL_FIST })
    .stroke({ color: COL_FIST_HI, width: 0.5 });
}

/* -- frame generators ----------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  // Slow breathing -- golem is massive, barely moves
  const breathe = Math.sin(t * Math.PI * 2) * 0.3;
  // Magma pulse
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 7;
  const torsoH = 14;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 + breathe;
  const headTop = torsoTop - 10;

  // Ambient magma glow on ground
  g.ellipse(CX, GY, 10, 3).fill({ color: COL_MAGMA_GLOW, alpha: pulse * 0.08 });

  drawShadow(g, CX, GY, 14, 4);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, 0, pulse);
  drawHead(g, CX, headTop, 0, pulse);

  // Arms at sides, fists hanging
  const rHandY = torsoTop + torsoH - 2 + breathe;
  drawArm(g, CX + 9, torsoTop + 4, CX + 12, rHandY);
  drawArm(g, CX - 9, torsoTop + 4, CX - 12, rHandY);

  // Floating ember particles
  for (let i = 0; i < 3; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI * 2 / 3);
    const ex = CX + Math.cos(angle) * 6;
    const ey = torsoTop + 4 + Math.sin(angle) * 3 - i * 2;
    g.circle(ex, ey, 0.5).fill({ color: COL_EMBER, alpha: pulse * 0.4 });
  }
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  // Slow heavy trudge
  const walk = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walk) * 0.8; // minimal bounce (heavy)
  const shake = Math.sin(t * Math.PI * 4) * 0.3; // ground tremor

  const legH = 7;
  const torsoH = 14;
  const stanceL = Math.round(walk * 2);
  const stanceR = Math.round(-walk * 2);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 10;

  drawShadow(g, CX, GY, 14 + Math.abs(walk), 4);
  drawFeet(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walk * 0.2 + shake, 0.5);
  drawHead(g, CX, headTop, walk * 0.2 + shake, 0.6);

  // Arms swing heavily
  const armSwing = walk * 1.5;
  drawArm(g, CX + 9, torsoTop + 4, CX + 12 + armSwing, torsoTop + torsoH - 2);
  drawArm(g, CX - 9, torsoTop + 4, CX - 12 - armSwing, torsoTop + torsoH - 2);

  // Ground impact particles when foot lands
  if (Math.abs(walk) < 0.15) {
    for (let i = 0; i < 3; i++) {
      const dx = (i - 1) * 4;
      g.circle(CX + dx, GY, 0.8).fill({ color: 0x666666, alpha: 0.3 });
    }
  }
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Heavy double-fist slam: 0-1=raise fists, 2-3=overhead, 4-5=slam down, 6-7=impact
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 14;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  const lean = t < 0.55 ? t * 2 : (1 - t) * 3;
  const raise = t < 0.4 ? t * 8 : 0;  // fists rise
  const slam = t > 0.4 ? (t - 0.4) * 12 : 0; // fists come down

  drawShadow(g, CX, GY, 14 + lean, 4);
  drawFeet(g, CX, GY, 0, Math.round(lean * 0.5));
  drawLegs(g, CX, legTop, legH, 0, Math.round(lean * 0.5));
  drawTorso(g, CX, torsoTop, torsoH, lean, 0.8);
  drawHead(g, CX, headTop, lean * 0.3, 1.0);

  // Fists: raise up, then slam down
  const fistY = torsoTop + 4 - raise + slam;
  const fistReach = t > 0.4 ? lean * 2 : 0;
  drawArm(g, CX + 9, torsoTop + 4, CX + 8 + fistReach, Math.min(fistY, torsoTop + torsoH + 2), 4);
  drawArm(g, CX - 9, torsoTop + 4, CX - 4 + fistReach, Math.min(fistY + 1, torsoTop + torsoH + 2), 4);

  // Ground impact effect
  if (t > 0.7) {
    const impactAlpha = clamp01((t - 0.7) / 0.3) * 0.5;
    // Shockwave ring
    const ringSize = (t - 0.7) * 30;
    g.circle(CX + lean * 2, GY - 1, ringSize).stroke({ color: COL_MAGMA, width: 1.5, alpha: impactAlpha });
    // Debris
    for (let i = 0; i < 5; i++) {
      const dx = (i - 2) * 5 + lean;
      const dy = -(t - 0.7) * 10 * (3 - Math.abs(i - 2));
      g.rect(CX + dx, GY + dy - 3, 2, 2).fill({ color: COL_SHARD, alpha: impactAlpha });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Magma eruption: veins blaze bright, emits magma burst
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 14;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // Magma eruption particles
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 4);
    const dist = 6 + intensity * 10 + i * 1.5;
    const px = CX + Math.cos(angle) * dist;
    const py = torsoTop + Math.sin(angle) * dist * 0.5;
    const pAlpha = clamp01(0.3 + pulse * 0.3 - i * 0.03);
    const col = i % 2 === 0 ? COL_MAGMA : COL_MAGMA_HI;
    g.circle(px, py, 1.5 + pulse).fill({ color: col, alpha: pAlpha });
  }

  // Heat haze glow
  g.ellipse(CX, torsoTop + torsoH * 0.5, 12 + intensity * 4, 10).fill({
    color: COL_MAGMA_GLOW,
    alpha: intensity * 0.1,
  });

  drawShadow(g, CX, GY, 14, 4, 0.4 + intensity * 0.2);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, 0, 0.7 + intensity * 0.3); // cracks blaze
  drawHead(g, CX, headTop, 0, 0.8 + intensity * 0.2); // eyes blaze

  // Arms raised channeling magma
  const armRaise = intensity * 5;
  drawArm(g, CX + 9, torsoTop + 4, CX + 11, torsoTop + 2 - armRaise, 3.5);
  drawArm(g, CX - 9, torsoTop + 4, CX - 11, torsoTop + 2 - armRaise, 3.5);

  // Magma drips from fists
  if (intensity > 0.3) {
    for (let i = 0; i < 3; i++) {
      const dy = i * 3 + t * 6;
      const dAlpha = clamp01(intensity - i * 0.15) * 0.6;
      g.circle(CX + 11, torsoTop + 2 - armRaise + dy, 1).fill({ color: COL_MAGMA, alpha: dAlpha });
      g.circle(CX - 11, torsoTop + 2 - armRaise + dy, 1).fill({ color: COL_MAGMA, alpha: dAlpha });
    }
  }
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Shatters into obsidian shards: 0=crack, 1-2=fracture, 3-4=break apart, 5-7=shards scatter
  const t = frame / 7;

  const legH = 7;
  const torsoH = 14;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 10;

  // In early frames, draw the body cracking apart
  if (t < 0.5) {
    const crackIntensity = t * 2;
    drawShadow(g, CX, GY, 14, 4, 0.4 * (1 - t));
    drawFeet(g, CX, GY, Math.round(t * 3), Math.round(-t * 3));
    drawLegs(g, CX, legTop, legH, Math.round(t * 3), Math.round(-t * 3));
    drawTorso(g, CX, torsoTop, torsoH, t * 2, crackIntensity);
    drawHead(g, CX, headTop, t * 2, crackIntensity);

    // Extra fracture lines
    for (let i = 0; i < 4; i++) {
      const fx = CX + (i - 2) * 5;
      const fy = torsoTop + i * 4;
      g.moveTo(fx, fy)
        .lineTo(fx + (i - 1.5) * 3, fy + 5)
        .stroke({ color: COL_MAGMA, width: 1 + crackIntensity, alpha: 0.8 });
    }

    drawArm(g, CX + 9, torsoTop + 4, CX + 12 + t * 4, torsoTop + torsoH - 2 + t * 3);
    drawArm(g, CX - 9, torsoTop + 4, CX - 12 - t * 4, torsoTop + torsoH - 2 + t * 3);
  }

  // Shards scatter outward (all frames, but dominant in later frames)
  if (t > 0.25) {
    const shardProgress = clamp01((t - 0.25) / 0.75);
    const shardAlpha = 1 - shardProgress * 0.7;

    // Generate angular shards flying outward
    for (let i = 0; i < 12; i++) {
      const baseAngle = i * (Math.PI * 2 / 12) + 0.3;
      const dist = shardProgress * (15 + (i % 3) * 5);
      const sx = CX + Math.cos(baseAngle) * dist;
      const sy = torsoTop + 8 + Math.sin(baseAngle) * dist * 0.6 + shardProgress * (i % 4) * 3;
      const size = 2 + (i % 3);
      const rot = shardProgress * (i - 6) * 0.5;

      if (sy < GY + 2 && shardAlpha > 0.1) {
        // Angular shard shape
        g.moveTo(sx, sy - size)
          .lineTo(sx + size * Math.cos(rot), sy + size * Math.sin(rot))
          .lineTo(sx - size * 0.5, sy + size * 0.7)
          .closePath()
          .fill({ color: i % 3 === 0 ? COL_SHARD : COL_OBSIDIAN, alpha: shardAlpha });

        // Ember on some shards
        if (i % 2 === 0) {
          g.circle(sx, sy, 0.8).fill({ color: COL_EMBER, alpha: shardAlpha * 0.6 });
        }
      }
    }
  }

  // Final magma burst flash
  if (t > 0.3 && t < 0.55) {
    const flashAlpha = clamp01(1 - Math.abs(t - 0.42) / 0.12) * 0.3;
    g.circle(CX, torsoTop + 8, 8 + t * 4).fill({ color: COL_MAGMA_GLOW, alpha: flashAlpha });
  }

  // Diminishing shadow
  if (t < 0.8) {
    drawShadow(g, CX, GY, 14 * (1 - t), 4 * (1 - t), 0.3 * (1 - t));
  }
}

/* -- public API ----------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all obsidian sentinel sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateObsidianSentinelFrames(renderer: Renderer): RenderTexture[] {
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
