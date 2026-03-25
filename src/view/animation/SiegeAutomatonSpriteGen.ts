// Procedural sprite generator for the Siege Automaton unit type.
//
// Draws a mechanical stone golem at 48x48 pixels per frame
// using PixiJS Graphics -> RenderTexture.
//
// Visual features:
//   * Weathered stone body with erosion marks, mineral veins, moss, chisel marks
//   * Intricate blue rune circuit network with pulsing energy channels
//   * Multi-gear clockwork joints with meshing teeth, axles, springs, steam vents
//   * Menacing angular head with visor slits, forehead plate, stone horns
//   * Articulated stone fingers with metal knuckle plates and rivets
//   * Layered metal reinforcement with bolts, pins, and verdigris patina
//   * Ground-cracking slam attack with shockwave debris ring
//   * Sequential rune circuit activation cast with energy beam
//   * Mechanical lurching walk with gear-grinding particles
//   * Systematic shutdown death with sequential rune dimming

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* -- constants ----------------------------------------------------------- */

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette -- stone and metal construct
const COL_STONE = 0x706858;
const COL_STONE_HI = 0x8a8070;
const COL_STONE_DK = 0x504840;
const COL_STONE_CRACK = 0x3a3430;
const COL_STONE_MOSS = 0x4a6040;
const COL_STONE_VEIN = 0x887868;
const COL_STONE_CHISEL = 0x5a5248;

const COL_METAL = 0x808890;
const COL_METAL_HI = 0xa0a8b0;
const COL_METAL_DK = 0x606870;
const COL_VERDIGRIS = 0x5a8878;
const COL_BRONZE = 0x8a7048;
const COL_BRONZE_DK = 0x6a5438;

const COL_GEAR = 0x707880;
const COL_GEAR_HI = 0x909898;
const COL_GEAR_AXLE = 0x505858;
const COL_SPRING = 0x909090;

const COL_RUNE = 0x3388cc;
const COL_RUNE_HI = 0x66bbff;
const COL_RUNE_DIM = 0x204060;
const COL_RUNE_CIRCUIT = 0x2a6699;

const COL_FIST = 0x606060;
const COL_RIVET = 0x999999;

const COL_EYE = 0x44aaee;
const COL_EYE_GLOW = 0x66ccff;

const COL_SHADOW = 0x000000;
const COL_STEAM = 0xbbccdd;
const COL_SPARK = 0xffdd66;
const COL_DUST = 0x9a8a70;
const COL_INNER = 0x3a3030;

/* -- helpers ------------------------------------------------------------- */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

function hash(n: number): number {
  // deterministic pseudo-random from integer
  let x = ((n * 1597 + 51749) % 244944) / 244944;
  return x < 0 ? x + 1 : x;
}

/* -- drawing sub-routines ------------------------------------------------ */

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4, alpha = 0.35): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha });
  g.ellipse(cx, gy + 1, w * 0.6, h * 0.6).fill({ color: COL_SHADOW, alpha: alpha * 0.3 });
}

function drawStoneTexture(g: Graphics, x: number, y: number, w: number, h: number, seed = 0): void {
  // Erosion pitting
  for (let i = 0; i < 5; i++) {
    const px = x + hash(seed + i * 7) * w;
    const py = y + hash(seed + i * 11 + 3) * h;
    const s = 0.5 + hash(seed + i * 13) * 0.8;
    g.circle(px, py, s).fill({ color: COL_STONE_DK, alpha: 0.25 });
  }
  // Mineral veins — thin wandering lines
  const vx = x + hash(seed + 100) * w * 0.6;
  const vy = y + 1;
  g.moveTo(vx, vy)
    .lineTo(vx + hash(seed + 101) * 3 - 1, vy + h * 0.4)
    .lineTo(vx + hash(seed + 102) * 4 - 2, vy + h * 0.8)
    .stroke({ color: COL_STONE_VEIN, width: 0.35, alpha: 0.35 });
  // Chisel marks — short hatches
  for (let i = 0; i < 3; i++) {
    const cx2 = x + 1 + hash(seed + i * 19 + 50) * (w - 2);
    const cy2 = y + 1 + hash(seed + i * 23 + 50) * (h - 2);
    g.moveTo(cx2, cy2).lineTo(cx2 + 1.2, cy2 + 0.6)
      .stroke({ color: COL_STONE_CHISEL, width: 0.3, alpha: 0.4 });
  }
  // Moss in crevice at bottom
  if (h > 4) {
    g.rect(x + 1, y + h - 1.5, Math.min(w * 0.4, 4), 1)
      .fill({ color: COL_STONE_MOSS, alpha: 0.3 });
    g.circle(x + w * 0.7, y + h - 1, 0.8)
      .fill({ color: COL_STONE_MOSS, alpha: 0.25 });
  }
}

function drawFeet(g: Graphics, cx: number, gy: number, stanceL: number, stanceR: number): void {
  // Left foot — blocky stone with metal sole plate
  const lx = cx - 9 + stanceL;
  g.roundRect(lx, gy - 5, 9, 5, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.6 });
  // Layered sole plate
  g.rect(lx + 1, gy - 2, 7, 1.5)
    .fill({ color: COL_BRONZE })
    .stroke({ color: COL_BRONZE_DK, width: 0.3 });
  // Toe rivets
  g.circle(lx + 2, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  g.circle(lx + 5, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  g.circle(lx + 7, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  drawStoneTexture(g, lx, gy - 5, 9, 3, 700);

  // Right foot
  const rx = cx + 1 + stanceR;
  g.roundRect(rx, gy - 5, 9, 5, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.6 });
  g.rect(rx + 1, gy - 2, 7, 1.5)
    .fill({ color: COL_BRONZE })
    .stroke({ color: COL_BRONZE_DK, width: 0.3 });
  g.circle(rx + 2, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  g.circle(rx + 5, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  g.circle(rx + 7, gy - 3.5, 0.4).fill({ color: COL_RIVET });
  drawStoneTexture(g, rx, gy - 5, 9, 3, 710);
}

function drawLegs(g: Graphics, cx: number, legTop: number, legH: number, stanceL: number, stanceR: number): void {
  // Left leg — thick stone column with layered plates
  const llx = cx - 8 + stanceL;
  g.roundRect(llx, legTop, 7, legH, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.4 });
  drawStoneTexture(g, llx, legTop, 7, legH, 200);
  // Metal shin guard with bolts
  g.roundRect(llx + 1, legTop + 1, 5, legH - 3, 0.5)
    .fill({ color: COL_METAL, alpha: 0.25 })
    .stroke({ color: COL_METAL_DK, width: 0.3, alpha: 0.4 });
  g.circle(llx + 2, legTop + 2, 0.4).fill({ color: COL_RIVET });
  g.circle(llx + 5, legTop + legH - 3, 0.4).fill({ color: COL_RIVET });

  // Right leg
  const rlx = cx + 2 + stanceR;
  g.roundRect(rlx, legTop, 7, legH, 1)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.4 });
  drawStoneTexture(g, rlx, legTop, 7, legH, 210);
  g.roundRect(rlx + 1, legTop + 1, 5, legH - 3, 0.5)
    .fill({ color: COL_METAL, alpha: 0.25 })
    .stroke({ color: COL_METAL_DK, width: 0.3, alpha: 0.4 });
  g.circle(rlx + 2, legTop + 2, 0.4).fill({ color: COL_RIVET });
  g.circle(rlx + 5, legTop + legH - 3, 0.4).fill({ color: COL_RIVET });

  // Knee gear joints — interlocking pair
  const kneeY = legTop + legH * 0.4;
  drawGearCluster(g, cx - 4.5 + stanceL, kneeY, 2.5, 0);
  drawGearCluster(g, cx + 5.5 + stanceR, kneeY, 2.5, 0);

  // Rune circuit lines on legs
  g.moveTo(llx + 3.5, legTop + 2)
    .lineTo(llx + 2, legTop + legH * 0.5)
    .lineTo(llx + 3.5, legTop + legH - 2)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.5, alpha: 0.35 });
  g.circle(llx + 3.5, legTop + 2, 0.6).fill({ color: COL_RUNE, alpha: 0.3 });
  g.circle(llx + 3.5, legTop + legH - 2, 0.6).fill({ color: COL_RUNE, alpha: 0.3 });

  g.moveTo(rlx + 3.5, legTop + 2)
    .lineTo(rlx + 5, legTop + legH * 0.5)
    .lineTo(rlx + 3.5, legTop + legH - 2)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.5, alpha: 0.35 });
  g.circle(rlx + 3.5, legTop + 2, 0.6).fill({ color: COL_RUNE, alpha: 0.3 });
  g.circle(rlx + 3.5, legTop + legH - 2, 0.6).fill({ color: COL_RUNE, alpha: 0.3 });
}

function drawGear(g: Graphics, cx: number, cy: number, r: number, rotation = 0): void {
  // Gear body
  g.circle(cx, cy, r)
    .fill({ color: COL_GEAR })
    .stroke({ color: COL_GEAR_AXLE, width: 0.5 });
  // Properly meshing teeth
  const teeth = Math.max(6, Math.round(r * 3));
  for (let i = 0; i < teeth; i++) {
    const a = rotation + (i / teeth) * Math.PI * 2;
    const innerR = r - 0.2;
    const outerR = r + 1;
    const halfW = 0.4;
    const cos1 = Math.cos(a - halfW / r);
    const sin1 = Math.sin(a - halfW / r);
    const cos2 = Math.cos(a + halfW / r);
    const sin2 = Math.sin(a + halfW / r);
    g.moveTo(cx + cos1 * innerR, cy + sin1 * innerR)
      .lineTo(cx + cos1 * outerR, cy + sin1 * outerR)
      .lineTo(cx + cos2 * outerR, cy + sin2 * outerR)
      .lineTo(cx + cos2 * innerR, cy + sin2 * innerR)
      .closePath()
      .fill({ color: COL_GEAR_HI });
  }
  // Center axle with spoke detail
  g.circle(cx, cy, r * 0.35)
    .fill({ color: COL_GEAR_AXLE })
    .stroke({ color: COL_METAL_DK, width: 0.3 });
  // Spokes
  for (let i = 0; i < 4; i++) {
    const a = rotation + (i / 4) * Math.PI * 2;
    g.moveTo(cx + Math.cos(a) * r * 0.35, cy + Math.sin(a) * r * 0.35)
      .lineTo(cx + Math.cos(a) * (r - 0.5), cy + Math.sin(a) * (r - 0.5))
      .stroke({ color: COL_METAL_DK, width: 0.4, alpha: 0.6 });
  }
  // Axle pin highlight
  g.circle(cx - 0.3, cy - 0.3, r * 0.15).fill({ color: COL_METAL_HI, alpha: 0.5 });
}

function drawGearCluster(g: Graphics, cx: number, cy: number, mainR: number, rotation: number): void {
  // Main gear
  drawGear(g, cx, cy, mainR, rotation);
  // Smaller meshing gear offset — teeth interlock
  const smallR = mainR * 0.6;
  const offset = mainR + smallR + 0.4;
  const counterRot = -rotation * (mainR / smallR);
  drawGear(g, cx + offset * 0.7, cy - offset * 0.3, smallR, counterRot);
}

function drawSpring(g: Graphics, x: number, y: number, h: number, alpha = 0.5): void {
  const coils = 4;
  const w = 2;
  for (let i = 0; i < coils; i++) {
    const cy = y + (i / coils) * h;
    const nextY = y + ((i + 0.5) / coils) * h;
    g.moveTo(x - w, cy).lineTo(x + w, nextY)
      .stroke({ color: COL_SPRING, width: 0.4, alpha });
  }
}

function drawSteamVent(g: Graphics, x: number, y: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < 3; i++) {
    const py = y - i * 2 - intensity * 2;
    const size = 0.6 + i * 0.3;
    const a = clamp01(intensity * 0.4 - i * 0.08);
    g.circle(x + (i % 2) * 0.8 - 0.4, py, size).fill({ color: COL_STEAM, alpha: a });
  }
}

function drawTorso(g: Graphics, cx: number, top: number, h: number, tilt = 0): void {
  const tw = 18;
  const x = cx - tw / 2 + tilt;

  // Massive stone chest block
  g.roundRect(x, top, tw, h, 2)
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.7 });

  // Weathered stone texture
  drawStoneTexture(g, x, top, tw, h, 100);

  // Stone highlight / weathering on upper edge
  g.roundRect(x + 1, top + 1, tw - 2, 2, 1).fill({ color: COL_STONE_HI, alpha: 0.25 });
  // Lower edge shadow
  g.rect(x + 1, top + h - 2, tw - 2, 1).fill({ color: COL_STONE_DK, alpha: 0.2 });

  // Layered metal reinforcement — upper plate
  g.roundRect(x + 1, top + h * 0.2, tw - 2, 2.5, 0.5)
    .fill({ color: COL_BRONZE })
    .stroke({ color: COL_BRONZE_DK, width: 0.3 });
  // Verdigris patina spots on bronze
  g.circle(x + 4, top + h * 0.2 + 1, 0.8).fill({ color: COL_VERDIGRIS, alpha: 0.35 });
  g.circle(x + tw - 5, top + h * 0.2 + 1.5, 0.6).fill({ color: COL_VERDIGRIS, alpha: 0.3 });

  // Lower reinforcement plate
  g.roundRect(x + 2, top + h * 0.65, tw - 4, 2, 0.5)
    .fill({ color: COL_METAL })
    .stroke({ color: COL_METAL_DK, width: 0.3 });

  // Visible bolts/pins on plates
  for (let i = 0; i < 5; i++) {
    g.circle(x + 2.5 + i * 3, top + h * 0.2 + 1.2, 0.5)
      .fill({ color: COL_RIVET })
      .stroke({ color: COL_METAL_DK, width: 0.2 });
  }
  for (let i = 0; i < 3; i++) {
    g.circle(x + 4 + i * 4, top + h * 0.65 + 1, 0.45)
      .fill({ color: COL_RIVET })
      .stroke({ color: COL_METAL_DK, width: 0.2 });
  }

  // Deep crack lines for texture
  g.moveTo(x + 3, top + 2)
    .lineTo(x + 4, top + h * 0.35)
    .lineTo(x + 3.5, top + h * 0.5)
    .stroke({ color: COL_STONE_CRACK, width: 0.5, alpha: 0.5 });
  g.moveTo(x + tw - 3, top + 3)
    .lineTo(x + tw - 5, top + h * 0.55)
    .lineTo(x + tw - 4, top + h - 2)
    .stroke({ color: COL_STONE_CRACK, width: 0.4, alpha: 0.4 });
}

function drawRuneCircuit(g: Graphics, cx: number, top: number, h: number, pulse: number, tilt = 0): void {
  const runeAlpha = 0.2 + pulse * 0.4;
  const nodeAlpha = 0.3 + pulse * 0.5;
  const x = cx + tilt;

  // Central arcane circle
  g.circle(x, top + h * 0.45, 3)
    .stroke({ color: COL_RUNE, width: 0.7, alpha: runeAlpha * 0.8 });
  g.circle(x, top + h * 0.45, 1.5)
    .stroke({ color: COL_RUNE_HI, width: 0.4, alpha: runeAlpha * 0.6 });

  // Rune nodes — different shapes
  // Top node: triangle
  g.moveTo(x, top + 2).lineTo(x - 1.2, top + 4).lineTo(x + 1.2, top + 4).closePath()
    .fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.7 });
  // Bottom node: square
  g.rect(x - 1, top + h - 4, 2, 2).fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.6 });
  // Side nodes: circles
  g.circle(x - 7, top + h * 0.35, 0.9).fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.5 });
  g.circle(x + 7, top + h * 0.35, 0.9).fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.5 });

  // Circuit-like connecting lines between nodes
  // Top to center
  g.moveTo(x, top + 4)
    .lineTo(x - 1, top + h * 0.3)
    .lineTo(x, top + h * 0.45 - 3)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.6, alpha: runeAlpha });
  // Center to bottom
  g.moveTo(x, top + h * 0.45 + 3)
    .lineTo(x + 1, top + h * 0.7)
    .lineTo(x, top + h - 4)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.6, alpha: runeAlpha });
  // Center to left
  g.moveTo(x - 3, top + h * 0.45)
    .lineTo(x - 5, top + h * 0.4)
    .lineTo(x - 7, top + h * 0.35)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.5, alpha: runeAlpha * 0.8 });
  // Center to right
  g.moveTo(x + 3, top + h * 0.45)
    .lineTo(x + 5, top + h * 0.4)
    .lineTo(x + 7, top + h * 0.35)
    .stroke({ color: COL_RUNE_CIRCUIT, width: 0.5, alpha: runeAlpha * 0.8 });

  // Pulsing energy dots flowing along channels
  const flowPos = (pulse * 2) % 1;
  const flowAlpha = 0.3 + pulse * 0.4;
  // Energy dot on top channel
  const topFlowY = lerp(top + 4, top + h * 0.45 - 3, flowPos);
  g.circle(x, topFlowY, 0.7).fill({ color: COL_RUNE_HI, alpha: flowAlpha });
  // Energy dot on bottom channel
  const botFlowY = lerp(top + h * 0.45 + 3, top + h - 4, flowPos);
  g.circle(x, botFlowY, 0.7).fill({ color: COL_RUNE_HI, alpha: flowAlpha });

  // Shoulder rune nodes (larger, brighter)
  g.circle(x - 9, top + 1, 1.2).fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.6 });
  g.circle(x + 9, top + 1, 1.2).fill({ color: COL_RUNE_HI, alpha: nodeAlpha * 0.6 });
  // Small arcane circles at shoulders
  g.circle(x - 9, top + 1, 2)
    .stroke({ color: COL_RUNE, width: 0.4, alpha: runeAlpha * 0.4 });
  g.circle(x + 9, top + 1, 2)
    .stroke({ color: COL_RUNE, width: 0.4, alpha: runeAlpha * 0.4 });
}

function drawHead(g: Graphics, cx: number, top: number, tilt = 0, runePulse = 0): void {
  const hw = 13;
  const hh = 9;
  const x = cx - hw / 2 + tilt;

  // Angular stone head — trapezoidal shape: wider at brow, narrow at jaw
  g.moveTo(x, top + 1)
    .lineTo(x + hw, top + 1)
    .lineTo(x + hw - 1.5, top + hh)
    .lineTo(x + 1.5, top + hh)
    .closePath()
    .fill({ color: COL_STONE })
    .stroke({ color: COL_STONE_DK, width: 0.5 });
  drawStoneTexture(g, x + 1, top + 1, hw - 2, hh - 1, 300);

  // Stone horns / crested ridge
  g.moveTo(x - 1, top + 2)
    .lineTo(x - 2.5, top - 1)
    .lineTo(x + 1, top + 1)
    .closePath()
    .fill({ color: COL_STONE_DK });
  g.moveTo(x + hw + 1, top + 2)
    .lineTo(x + hw + 2.5, top - 1)
    .lineTo(x + hw - 1, top + 1)
    .closePath()
    .fill({ color: COL_STONE_DK });
  // Horn highlights
  g.moveTo(x - 1.5, top).lineTo(x - 2, top - 0.5)
    .stroke({ color: COL_STONE_HI, width: 0.3, alpha: 0.4 });
  g.moveTo(x + hw + 1.5, top).lineTo(x + hw + 2, top - 0.5)
    .stroke({ color: COL_STONE_HI, width: 0.3, alpha: 0.4 });

  // Metal forehead plate with rune etching
  g.rect(x + 1, top + 1, hw - 2, 2.5)
    .fill({ color: COL_METAL })
    .stroke({ color: COL_METAL_DK, width: 0.3 });
  g.rect(x + 2, top + 1.2, hw - 4, 0.5).fill({ color: COL_METAL_HI, alpha: 0.25 });
  // Forehead rune — arcane sigil
  const fhx = cx + tilt;
  const runeA = 0.4 + runePulse * 0.4;
  g.moveTo(fhx - 2.5, top + 2)
    .lineTo(fhx - 1, top + 1.3)
    .lineTo(fhx, top + 2.8)
    .lineTo(fhx + 1, top + 1.3)
    .lineTo(fhx + 2.5, top + 2)
    .stroke({ color: COL_RUNE, width: 0.6, alpha: runeA });
  g.circle(fhx, top + 2, 0.6).fill({ color: COL_RUNE_HI, alpha: runeA * 0.6 });

  // Flat stone brow ridge — heavy overhang
  g.rect(x - 0.5, top + 3, hw + 1, 1.2).fill({ color: COL_STONE_DK });

  // Visor-like eye slits with depth
  const eyeAlpha = 0.7 + runePulse * 0.3;
  // Left eye — recessed slit with dark surround
  g.rect(cx - 4 + tilt, top + 4.2, 3.5, 1).fill({ color: COL_STONE_CRACK }); // depth shadow
  g.rect(cx - 3.8 + tilt, top + 4.4, 3, 0.6).fill({ color: COL_EYE, alpha: eyeAlpha });
  // Right eye
  g.rect(cx + 0.5 + tilt, top + 4.2, 3.5, 1).fill({ color: COL_STONE_CRACK });
  g.rect(cx + 0.7 + tilt, top + 4.4, 3, 0.6).fill({ color: COL_EYE, alpha: eyeAlpha });
  // Eye glow halos
  g.circle(cx - 2.3 + tilt, top + 4.7, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha * 0.12 });
  g.circle(cx + 2.3 + tilt, top + 4.7, 2.5).fill({ color: COL_EYE_GLOW, alpha: eyeAlpha * 0.12 });

  // Angular jaw line — menacing
  g.moveTo(x + 2, top + hh - 1)
    .lineTo(x + hw / 2, top + hh)
    .lineTo(x + hw - 2, top + hh - 1)
    .stroke({ color: COL_STONE_CRACK, width: 0.5, alpha: 0.5 });
  // Jaw rivets
  g.circle(x + 3, top + hh - 1.5, 0.35).fill({ color: COL_RIVET, alpha: 0.5 });
  g.circle(x + hw - 3, top + hh - 1.5, 0.35).fill({ color: COL_RIVET, alpha: 0.5 });
}

function drawArm(g: Graphics, sx: number, sy: number, ex: number, ey: number, gearRot = 0): void {
  // Thick stone arm segment with visible construction
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_STONE, width: 5.5 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_STONE_DK, width: 5.5, alpha: 0.15 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_STONE_HI, width: 1, alpha: 0.15 });

  // Metal band reinforcements along arm
  const mx = lerp(sx, ex, 0.3);
  const my = lerp(sy, ey, 0.3);
  g.circle(mx, my, 3).stroke({ color: COL_BRONZE, width: 0.5, alpha: 0.4 });

  // Elbow gear cluster
  const elX = lerp(sx, ex, 0.5);
  const elY = lerp(sy, ey, 0.5);
  drawGearCluster(g, elX, elY, 2, gearRot);

  // Spring mechanism visible near shoulder
  const spX = lerp(sx, ex, 0.2);
  const spY = lerp(sy, ey, 0.2);
  drawSpring(g, spX + 1, spY - 1, 3, 0.3);
}

function drawFist(g: Graphics, cx: number, cy: number, size = 4, runeGlow = 0.3): void {
  // Articulated stone fingers — 4 segments
  const fingerW = size * 0.4;
  const fingerH = size * 0.65;
  for (let i = 0; i < 4; i++) {
    const fx = cx - size + 0.8 + i * (size * 0.5);
    const fy = cy + size * 0.3;
    g.roundRect(fx, fy, fingerW, fingerH, 0.5)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.3 });
    // Finger joint line
    g.moveTo(fx, fy + fingerH * 0.45).lineTo(fx + fingerW, fy + fingerH * 0.45)
      .stroke({ color: COL_STONE_CRACK, width: 0.3, alpha: 0.5 });
  }

  // Main fist block — over fingers
  g.roundRect(cx - size, cy - size * 0.7, size * 2, size * 1.4, 1.5)
    .fill({ color: COL_FIST })
    .stroke({ color: COL_METAL_DK, width: 0.6 });

  // Metal knuckle plates with individual rivets
  for (let i = 0; i < 3; i++) {
    const kx = cx - size + 1.5 + i * (size * 0.7);
    const ky = cy - size * 0.6;
    g.roundRect(kx, ky, size * 0.55, size * 0.5, 0.5)
      .fill({ color: COL_METAL_HI, alpha: 0.35 })
      .stroke({ color: COL_METAL_DK, width: 0.25 });
    // Individual rivet per plate
    g.circle(kx + size * 0.27, ky + size * 0.25, 0.35)
      .fill({ color: COL_RIVET });
  }

  // Rune-inscribed palm — visible glyph
  g.circle(cx, cy, size * 0.35)
    .stroke({ color: COL_RUNE, width: 0.5, alpha: runeGlow });
  // Cross inside circle
  g.moveTo(cx - size * 0.25, cy).lineTo(cx + size * 0.25, cy)
    .stroke({ color: COL_RUNE, width: 0.4, alpha: runeGlow * 0.7 });
  g.moveTo(cx, cy - size * 0.25).lineTo(cx, cy + size * 0.25)
    .stroke({ color: COL_RUNE, width: 0.4, alpha: runeGlow * 0.7 });
}

function drawDustCloud(g: Graphics, cx: number, gy: number, intensity: number): void {
  if (intensity <= 0) return;
  for (let i = 0; i < 5; i++) {
    const dx = cx + (i - 2) * 3 * intensity;
    const dy = gy - 1 - hash(i * 31) * 3 * intensity;
    const r = 1 + hash(i * 17) * 1.5 * intensity;
    g.circle(dx, dy, r).fill({ color: COL_DUST, alpha: 0.2 * intensity });
  }
}

function drawGearParticles(g: Graphics, cx: number, cy: number, t: number): void {
  for (let i = 0; i < 3; i++) {
    const angle = t * 5 + i * 2.1;
    const dist = 2 + t * 4;
    const px = cx + Math.cos(angle) * dist;
    const py = cy + Math.sin(angle) * dist - t * 3;
    const a = clamp01(0.4 - t * 0.3);
    g.rect(px, py, 0.8, 0.8).fill({ color: COL_GEAR_HI, alpha: a });
  }
}

function drawInnerMechanism(g: Graphics, x: number, y: number, w: number, h: number, alpha = 0.5): void {
  // Dark interior with visible gears and springs
  g.rect(x, y, w, h).fill({ color: COL_INNER, alpha });
  // Tiny inner gears
  const gx = x + w * 0.3;
  const gy2 = y + h * 0.4;
  g.circle(gx, gy2, 1.2).fill({ color: COL_GEAR, alpha: alpha * 0.8 });
  g.circle(gx, gy2, 0.4).fill({ color: COL_GEAR_AXLE, alpha: alpha * 0.8 });
  // Tiny spring
  g.moveTo(x + w * 0.6, y + 1).lineTo(x + w * 0.7, y + h * 0.5).lineTo(x + w * 0.6, y + h - 1)
    .stroke({ color: COL_SPRING, width: 0.3, alpha: alpha * 0.6 });
}

/* -- frame generators ---------------------------------------------------- */

function generateIdleFrame(g: Graphics, frame: number): void {
  const t = (frame % 8) / 8;
  const runePulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const sway = Math.sin(t * Math.PI * 2) * 0.3;
  const gearRot = t * Math.PI * 0.5;

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  drawShadow(g, CX, GY, 14, 4);
  drawFeet(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH, sway);
  drawRuneCircuit(g, CX, torsoTop, torsoH, runePulse, sway);
  drawHead(g, CX, headTop, sway * 0.3, runePulse);

  // Shoulder gear clusters
  drawGearCluster(g, CX - 10, torsoTop + 2, 3, gearRot);
  drawGearCluster(g, CX + 10, torsoTop + 2, 3, -gearRot);

  // Steam vents from shoulders (subtle idle steam)
  drawSteamVent(g, CX - 10, torsoTop, runePulse * 0.3);
  drawSteamVent(g, CX + 10, torsoTop, runePulse * 0.3);

  // Arms hanging with detailed fists
  const rHandX = CX + 12;
  const rHandY = torsoTop + torsoH;
  drawArm(g, CX + 9, torsoTop + 3, rHandX, rHandY, gearRot);
  drawFist(g, rHandX, rHandY + 2, 3.5, 0.3);

  const lHandX = CX - 12;
  const lHandY = torsoTop + torsoH;
  drawArm(g, CX - 9, torsoTop + 3, lHandX, lHandY, -gearRot);
  drawFist(g, lHandX, lHandY + 2, 4, 0.3); // Slightly larger left fist
}

function generateMoveFrame(g: Graphics, frame: number): void {
  const t = frame / 8;
  const step = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(step) * 1.5;
  const gearRot = t * Math.PI * 2;

  const legH = 7;
  const torsoH = 13;
  const stanceL = Math.round(step * 2);
  const stanceR = Math.round(-step * 2);
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.3);
  const headTop = torsoTop - 9;

  const runePulse = Math.sin(t * Math.PI * 4) * 0.5 + 0.5;

  // Mechanical lurching offset
  const shakeX = step * 0.7;
  const lurchTilt = step * 0.8;

  drawShadow(g, CX + shakeX, GY, 14 + Math.abs(step), 4);

  // Heavy footfall dust on the stepping foot
  const dustIntensity = Math.abs(step) > 0.7 ? (Math.abs(step) - 0.7) * 3.3 : 0;
  if (step > 0.7) {
    drawDustCloud(g, CX - 5 + stanceL, GY, dustIntensity * 0.6);
  } else if (step < -0.7) {
    drawDustCloud(g, CX + 5 + stanceR, GY, dustIntensity * 0.6);
  }

  drawFeet(g, CX + shakeX, GY, stanceL, stanceR);
  drawLegs(g, CX + shakeX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX + shakeX, torsoTop, torsoH, lurchTilt);
  drawRuneCircuit(g, CX + shakeX, torsoTop, torsoH, runePulse, lurchTilt);

  // Visible gap in stone showing internal mechanism (at torso side during lurch)
  if (Math.abs(lurchTilt) > 0.3) {
    const gapSide = lurchTilt > 0 ? -1 : 1;
    const gapX = CX + shakeX + gapSide * 8;
    drawInnerMechanism(g, gapX, torsoTop + 4, 2, 4, Math.abs(lurchTilt) * 0.3);
  }

  drawHead(g, CX + shakeX, headTop, lurchTilt * 0.4, runePulse);

  drawGearCluster(g, CX - 10 + shakeX, torsoTop + 2, 3, gearRot);
  drawGearCluster(g, CX + 10 + shakeX, torsoTop + 2, 3, -gearRot);

  // Steam vents more active during movement
  drawSteamVent(g, CX - 10 + shakeX, torsoTop, 0.3 + bob * 0.2);
  drawSteamVent(g, CX + 10 + shakeX, torsoTop, 0.3 + bob * 0.2);

  // Gear grinding particles at knees during step
  if (Math.abs(step) > 0.5) {
    const kneeY = legTop + legH * 0.4;
    drawGearParticles(g, CX - 4.5 + stanceL + shakeX, kneeY, (Math.abs(step) - 0.5) * 2);
    drawGearParticles(g, CX + 5.5 + stanceR + shakeX, kneeY, (Math.abs(step) - 0.5) * 2);
  }

  // Arms swing mechanically
  const armSwing = step * 1.8;
  const rHandX = CX + 12 + shakeX + armSwing * 0.3;
  const rHandY = torsoTop + torsoH - armSwing * 0.5;
  drawArm(g, CX + 9 + shakeX, torsoTop + 3, rHandX, rHandY, gearRot);
  drawFist(g, rHandX, rHandY + 2, 3.5);

  const lHandX = CX - 12 + shakeX - armSwing * 0.3;
  const lHandY = torsoTop + torsoH + armSwing * 0.5;
  drawArm(g, CX - 9 + shakeX, torsoTop + 3, lHandX, lHandY, -gearRot);
  drawFist(g, lHandX, lHandY + 2, 4);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Overhead fist slam — ground pound with devastating impact
  const phases = [0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 7)];

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  const lean = t < 0.45 ? t * 2.2 : (1 - t) * 2.5;
  const runePulse = t < 0.55 ? t * 2 : (1 - t) * 2;
  const gearRot = t * Math.PI * 4;

  // Ground impact shake
  const shake = t > 0.4 && t < 0.65 ? Math.sin(t * 40) * 2 : 0;

  drawShadow(g, CX + shake, GY, 14 + lean * 2, 4, 0.35 + runePulse * 0.1);
  drawFeet(g, CX + shake, GY, -1, 2);
  drawLegs(g, CX + shake, legTop, legH, -1, 2);
  drawTorso(g, CX + shake, torsoTop, torsoH, lean);
  drawRuneCircuit(g, CX + shake, torsoTop, torsoH, runePulse, lean);
  drawHead(g, CX + shake, headTop, lean * 0.3, runePulse);

  drawGearCluster(g, CX - 10 + shake, torsoTop + 2, 3, gearRot);
  drawGearCluster(g, CX + 10 + shake, torsoTop + 2, 3, -gearRot);

  // Steam burst during attack
  if (t > 0.2 && t < 0.6) {
    drawSteamVent(g, CX - 10 + shake, torsoTop, (0.6 - t) * 2);
    drawSteamVent(g, CX + 10 + shake, torsoTop, (0.6 - t) * 2);
  }

  // Right fist — overhead slam arc
  let rFistX: number;
  let rFistY: number;
  let fistRuneGlow = 0.3;
  if (t < 0.25) {
    rFistX = CX + 10 + lean;
    rFistY = lerp(torsoTop + torsoH, torsoTop - 8, t / 0.25);
    fistRuneGlow = 0.3 + t * 2;
  } else if (t < 0.5) {
    rFistX = CX + 10 + lean * 2;
    rFistY = lerp(torsoTop - 8, GY - 4, (t - 0.25) / 0.25);
    fistRuneGlow = 0.8;
  } else {
    rFistX = CX + 10 + lean;
    rFistY = lerp(GY - 4, torsoTop + torsoH, (t - 0.5) / 0.5);
    fistRuneGlow = lerp(0.8, 0.3, (t - 0.5) / 0.5);
  }
  drawArm(g, CX + 9 + shake + lean, torsoTop + 3, rFistX + shake, rFistY, gearRot);
  drawFist(g, rFistX + shake, rFistY + 2, 4.5, fistRuneGlow);

  // Rune energy discharge on fist at impact
  if (t > 0.35 && t < 0.6) {
    const dischargeA = clamp01(1 - Math.abs(t - 0.47) / 0.12) * 0.5;
    g.circle(rFistX + shake, rFistY + 2, 5).fill({ color: COL_RUNE_HI, alpha: dischargeA * 0.3 });
    // Discharge arcs
    for (let i = 0; i < 4; i++) {
      const a = (t * 10 + i * 1.5);
      const arcX = rFistX + shake + Math.cos(a) * 5;
      const arcY = rFistY + 2 + Math.sin(a) * 3;
      g.moveTo(rFistX + shake, rFistY + 2).lineTo(arcX, arcY)
        .stroke({ color: COL_RUNE_HI, width: 0.5, alpha: dischargeA * 0.6 });
    }
  }

  // Left arm braces
  const lHandX = CX - 11;
  const lHandY = torsoTop + torsoH - 2;
  drawArm(g, CX - 9 + shake, torsoTop + 3, lHandX + shake, lHandY, -gearRot);
  drawFist(g, lHandX + shake, lHandY + 2, 4);

  // Ground crack radiating from impact point
  if (t > 0.4 && t < 0.8) {
    const crackProgress = clamp01((t - 0.4) / 0.3);
    const crackAlpha = clamp01(1 - (t - 0.4) / 0.4) * 0.6;
    const impactX = rFistX + shake;
    // Radiating crack lines
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI + 0.2;
      const len = crackProgress * 10 + i * 1.5;
      const endX = impactX + Math.cos(angle) * len;
      const endY = GY + Math.sin(angle) * len * 0.25;
      g.moveTo(impactX, GY)
        .lineTo(impactX + Math.cos(angle) * len * 0.4, GY + Math.sin(angle) * len * 0.1 - 0.5)
        .lineTo(endX, endY)
        .stroke({ color: COL_STONE_CRACK, width: 0.6 + (1 - i / 6) * 0.4, alpha: crackAlpha });
    }
  }

  // Shockwave with debris ring
  if (t > 0.4 && t < 0.7) {
    const waveAlpha = clamp01(1 - Math.abs(t - 0.52) / 0.13) * 0.45;
    const waveR = (t - 0.4) * 50;
    const impactX = rFistX + shake;
    // Double shockwave rings
    g.ellipse(impactX, GY, waveR, waveR * 0.25)
      .stroke({ color: COL_RUNE, width: 1.5, alpha: waveAlpha });
    g.ellipse(impactX, GY, waveR * 0.7, waveR * 0.18)
      .stroke({ color: COL_RUNE_HI, width: 0.8, alpha: waveAlpha * 0.6 });
    // Debris ring — stone chunks flying out
    for (let i = 0; i < 8; i++) {
      const da = (i / 8) * Math.PI + hash(i * 37) * 0.3;
      const dr = waveR * (0.5 + hash(i * 41) * 0.5);
      const dx = impactX + Math.cos(da) * dr;
      const dy = GY - 1 - (t - 0.4) * 18 * (1 - i * 0.08) * hash(i * 53 + 1);
      const sz = 1 + hash(i * 7) * 1.5;
      g.rect(dx, dy, sz, sz).fill({ color: COL_STONE, alpha: waveAlpha * 0.8 });
    }
  }

  // Dust mushroom cloud at impact
  if (t > 0.45 && t < 0.85) {
    const dustT = (t - 0.45) / 0.4;
    const dustAlpha = clamp01(1 - dustT) * 0.3;
    const impactX = rFistX + shake;
    // Rising dust column
    const colH = dustT * 8;
    g.ellipse(impactX, GY - colH, 3 + dustT * 4, 2 + dustT * 2)
      .fill({ color: COL_DUST, alpha: dustAlpha });
    g.ellipse(impactX, GY - colH * 0.5, 2 + dustT * 2, 1.5 + dustT)
      .fill({ color: COL_DUST, alpha: dustAlpha * 0.7 });
    // Mushroom cap
    if (dustT > 0.3) {
      g.ellipse(impactX, GY - colH - 1, 4 + dustT * 3, 1.5 + dustT)
        .fill({ color: COL_DUST, alpha: dustAlpha * 0.5 });
    }
  }
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Rune circuit sequential activation with energy beam
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;
  const torsoTop = legTop - torsoH + 2;
  const headTop = torsoTop - 9;

  // Sequential rune channel activation (circuit lights up segment by segment)
  const activationStage = Math.floor(t * 6); // 0..5 stages

  // Rune energy rings expanding outward
  for (let ring = 0; ring < 3; ring++) {
    const r = 8 + ring * 6 + intensity * 8;
    const ringAlpha = clamp01(0.15 + pulse * 0.15 - ring * 0.04);
    g.ellipse(CX, torsoTop + torsoH / 2, r, r * 0.6)
      .stroke({ color: COL_RUNE, width: 1, alpha: ringAlpha });
    // Tick marks on rings
    for (let ti = 0; ti < 8; ti++) {
      const ta = (ti / 8) * Math.PI * 2 + t * Math.PI;
      const tx = CX + Math.cos(ta) * r;
      const ty = torsoTop + torsoH / 2 + Math.sin(ta) * r * 0.6;
      g.circle(tx, ty, 0.4).fill({ color: COL_RUNE_HI, alpha: ringAlpha * 0.5 });
    }
  }

  // Floating rune symbols rotating in 3D-like perspective
  for (let i = 0; i < 8; i++) {
    const angle = t * Math.PI * 2 + i * (Math.PI / 4);
    const dist = 10 + intensity * 6;
    // 3D perspective: scale and y-offset vary with angle
    const perspScale = 0.6 + Math.sin(angle) * 0.4; // appears larger/smaller
    const rx = CX + Math.cos(angle) * dist;
    const ry = torsoTop + torsoH / 2 + Math.sin(angle) * dist * 0.4;
    const sAlpha = clamp01(0.15 + pulse * 0.35) * perspScale;
    const sSize = 2 * perspScale;

    // Different rune symbols per index
    if (i % 4 === 0) {
      // Diamond
      g.moveTo(rx, ry - sSize).lineTo(rx + sSize * 0.7, ry)
        .lineTo(rx, ry + sSize).lineTo(rx - sSize * 0.7, ry).closePath()
        .fill({ color: COL_RUNE_HI, alpha: sAlpha });
    } else if (i % 4 === 1) {
      // Triangle
      g.moveTo(rx, ry - sSize).lineTo(rx + sSize * 0.8, ry + sSize * 0.6)
        .lineTo(rx - sSize * 0.8, ry + sSize * 0.6).closePath()
        .fill({ color: COL_RUNE_HI, alpha: sAlpha });
    } else if (i % 4 === 2) {
      // Circle with dot
      g.circle(rx, ry, sSize * 0.7)
        .stroke({ color: COL_RUNE_HI, width: 0.4, alpha: sAlpha });
      g.circle(rx, ry, sSize * 0.2).fill({ color: COL_RUNE_HI, alpha: sAlpha });
    } else {
      // Cross
      g.moveTo(rx - sSize * 0.5, ry).lineTo(rx + sSize * 0.5, ry)
        .stroke({ color: COL_RUNE_HI, width: 0.5, alpha: sAlpha });
      g.moveTo(rx, ry - sSize * 0.5).lineTo(rx, ry + sSize * 0.5)
        .stroke({ color: COL_RUNE_HI, width: 0.5, alpha: sAlpha });
    }
  }

  drawShadow(g, CX, GY, 14, 4, 0.35 + intensity * 0.15);
  drawFeet(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);

  // Sequential rune circuit activation — circuits light up in stages
  const seqPulse = 0.5 + intensity * 0.5;
  drawRuneCircuit(g, CX, torsoTop, torsoH, seqPulse);

  // Additional sequential lighting: individual rune nodes activate one by one
  const nodePositions = [
    [CX, torsoTop + 2],     // top
    [CX - 7, torsoTop + torsoH * 0.35], // left
    [CX + 7, torsoTop + torsoH * 0.35], // right
    [CX, torsoTop + torsoH * 0.45],      // center
    [CX, torsoTop + torsoH - 4],          // bottom
    [CX - 9, torsoTop + 1],               // shoulder L
  ];
  for (let i = 0; i < nodePositions.length; i++) {
    if (activationStage >= i) {
      const nodeGlow = clamp01((activationStage - i) * 0.4 + pulse * 0.3);
      const [nx, ny] = nodePositions[i];
      g.circle(nx, ny, 1.5 + nodeGlow)
        .fill({ color: COL_RUNE_HI, alpha: nodeGlow * 0.5 });
    }
  }

  drawHead(g, CX, headTop, 0, seqPulse);

  drawGearCluster(g, CX - 10, torsoTop + 2, 3, t * Math.PI);
  drawGearCluster(g, CX + 10, torsoTop + 2, 3, -t * Math.PI);

  // Steam vents active during channeling
  drawSteamVent(g, CX - 10, torsoTop, intensity * 0.5);
  drawSteamVent(g, CX + 10, torsoTop, intensity * 0.5);

  // Arms spread wide — channeling
  const spread = intensity * 4;
  drawArm(g, CX + 9, torsoTop + 3, CX + 14 + spread, torsoTop + 4, t * Math.PI * 2);
  drawFist(g, CX + 14 + spread, torsoTop + 6, 3.5, 0.5 + pulse * 0.3);
  drawArm(g, CX - 9, torsoTop + 3, CX - 14 - spread, torsoTop + 4, -t * Math.PI * 2);
  drawFist(g, CX - 14 - spread, torsoTop + 6, 4, 0.5 + pulse * 0.3);

  // Energy beam between fists
  if (intensity > 0.3) {
    const beamAlpha = clamp01((intensity - 0.3) / 0.5) * (0.3 + pulse * 0.3);
    const lFistX = CX - 14 - spread;
    const rFistX = CX + 14 + spread;
    const beamY = torsoTop + 6;
    // Main beam
    g.moveTo(lFistX, beamY).lineTo(rFistX, beamY)
      .stroke({ color: COL_RUNE, width: 2, alpha: beamAlpha });
    // Bright core
    g.moveTo(lFistX, beamY).lineTo(rFistX, beamY)
      .stroke({ color: COL_RUNE_HI, width: 0.8, alpha: beamAlpha * 1.2 });
    // Energy beam undulation
    const waveAmp = 1.5;
    for (let s = 0; s < 5; s++) {
      const sx = lerp(lFistX, rFistX, s / 4);
      const sy = beamY + Math.sin(t * 10 + s * 2) * waveAmp;
      g.circle(sx, sy, 0.8 + pulse * 0.4).fill({ color: COL_RUNE_HI, alpha: beamAlpha * 0.5 });
    }
  }

  // Fist rune glow halos
  g.circle(CX + 14 + spread, torsoTop + 6, 4 + pulse * 2)
    .fill({ color: COL_RUNE, alpha: 0.08 + pulse * 0.1 });
  g.circle(CX - 14 - spread, torsoTop + 6, 4 + pulse * 2)
    .fill({ color: COL_RUNE, alpha: 0.08 + pulse * 0.1 });

  // Eye blaze intensifies
  g.circle(CX - 2, headTop + 4.7, 3).fill({ color: COL_EYE_GLOW, alpha: intensity * 0.25 });
  g.circle(CX + 2, headTop + 4.7, 3).fill({ color: COL_EYE_GLOW, alpha: intensity * 0.25 });
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Systematic shutdown: runes dim, gears halt, plates fall, final flicker
  const t = frame / 7;

  const legH = 7;
  const torsoH = 13;
  const legTop = GY - 4 - legH;

  const dropY = t * t * 6;
  const torsoTop = legTop - torsoH + 2 + dropY;
  const headTop = torsoTop - 9;

  // Runes dim one by one (6 rune nodes, each shuts off at different t)
  const runeCount = 6;
  const activeRunes = Math.max(0, runeCount - Math.floor(t * (runeCount + 1)));
  const runeFlicker = activeRunes > 0 ? (1 - t) * Math.sin(t * 25) * 0.5 + 0.5 : 0;
  // Final rune flicker at the very end
  const finalFlicker = (t > 0.85 && t < 0.95) ? Math.sin(t * 60) * 0.4 : 0;

  drawShadow(g, CX, GY, 14 + t * 4, 4, 0.35 * (1 - t * 0.4));

  // Body starts to separate
  if (t < 0.8) {
    drawFeet(g, CX, GY, t * 3, -t * 2);
  }
  if (t < 0.7) {
    drawLegs(g, CX, legTop + dropY * 0.5, legH * (1 - t * 0.2), t * 3, -t * 2);
  }

  // Torso splits revealing inner mechanism
  if (t < 0.85) {
    const splitX = t * 4;
    const plateAlpha = 1 - t * 0.4;

    // Left stone half slides off
    g.roundRect(CX - 9 - splitX, torsoTop - t * 2, 8, torsoH * (1 - t * 0.2), 1)
      .fill({ color: COL_STONE, alpha: plateAlpha });
    // Right stone half slides off
    g.roundRect(CX + 1 + splitX, torsoTop + t, 8, torsoH * (1 - t * 0.2), 1)
      .fill({ color: COL_STONE, alpha: plateAlpha });

    // Revealed inner mechanism between the halves
    if (t > 0.2) {
      const innerAlpha = clamp01((t - 0.2) * 1.5);
      drawInnerMechanism(g, CX - 4, torsoTop + 2, 8, torsoH - 4, innerAlpha * 0.6);
    }

    // Dying runes — only active ones still glow
    if (activeRunes > 0) {
      const nodePositions = [
        [CX, torsoTop + 2],
        [CX - 7, torsoTop + torsoH * 0.35],
        [CX + 7, torsoTop + torsoH * 0.35],
        [CX, torsoTop + torsoH * 0.45],
        [CX, torsoTop + torsoH - 4],
        [CX - 9, torsoTop + 1],
      ];
      for (let i = 0; i < activeRunes; i++) {
        const [nx, ny] = nodePositions[i];
        const dimAlpha = (runeFlicker + finalFlicker) * (1 - t) * 0.5;
        g.circle(nx, ny, 1).fill({ color: COL_RUNE, alpha: dimAlpha });
        // Dimming circuit lines to next node
        if (i < activeRunes - 1) {
          const [nx2, ny2] = nodePositions[i + 1];
          g.moveTo(nx, ny).lineTo(nx2, ny2)
            .stroke({ color: COL_RUNE_DIM, width: 0.4, alpha: dimAlpha * 0.5 });
        }
      }
    }

    // Last rune flicker — bright flash then gone
    if (t > 0.85 && activeRunes <= 1) {
      g.circle(CX, torsoTop + torsoH * 0.45, 2 + finalFlicker * 3)
        .fill({ color: COL_RUNE_HI, alpha: Math.abs(finalFlicker) * 0.6 });
    }
  }

  // Head topples off
  if (t < 0.75) {
    const headTumble = t * 5;
    const headDropX = t * 7;
    drawHead(g, CX + headDropX, headTop + dropY * 0.8, headTumble, runeFlicker * (1 - t));
  }

  // Arms fall off
  if (t < 0.6) {
    const armDrop = t * 8;
    drawArm(g, CX + 9, torsoTop + 3, CX + 14 + t * 4, torsoTop + torsoH + armDrop);
    drawFist(g, CX + 14 + t * 4, torsoTop + torsoH + armDrop + 2, 3 * (1 - t * 0.3));
  }
  if (t < 0.65) {
    const armDrop = t * 7;
    drawArm(g, CX - 9, torsoTop + 3, CX - 13 - t * 3, torsoTop + torsoH + armDrop);
    drawFist(g, CX - 13 - t * 3, torsoTop + torsoH + armDrop + 2, 3.5 * (1 - t * 0.3));
  }

  // Gears grind to halt with sparks
  if (t < 0.7) {
    const gearSpeed = (1 - t) * Math.PI * 2;
    const gearAlpha = 1 - t;
    // Shoulder gears slowing
    drawGear(g, CX - 8 - t * 4, torsoTop + 4 + t * 5, 2.5, t * gearSpeed);
    drawGear(g, CX + 10 + t * 3, torsoTop + 3 + t * 7, 2, t * gearSpeed * 0.7);
    // Sparks from grinding gears
    if (t > 0.15) {
      const sparkAlpha = clamp01((0.7 - t) * 1.5);
      for (let i = 0; i < 3; i++) {
        const sx = CX - 8 - t * 4 + Math.cos(t * 20 + i) * 3;
        const sy = torsoTop + 4 + t * 5 + Math.sin(t * 20 + i) * 2;
        g.circle(sx, sy, 0.4).fill({ color: COL_SPARK, alpha: sparkAlpha * gearAlpha });
      }
      for (let i = 0; i < 2; i++) {
        const sx = CX + 10 + t * 3 + Math.cos(t * 15 + i * 2) * 2.5;
        const sy = torsoTop + 3 + t * 7 + Math.sin(t * 15 + i * 2) * 2;
        g.circle(sx, sy, 0.3).fill({ color: COL_SPARK, alpha: sparkAlpha * gearAlpha * 0.8 });
      }
    }
  }

  // Stone debris scattering — larger pieces
  if (t > 0.25) {
    const debrisAlpha = (1 - t) * 0.6;
    for (let i = 0; i < 8; i++) {
      const dx = CX + Math.sin(t * 4 + i * 1.1) * (8 + i * 3);
      const dy = torsoTop + i * 3.5 + t * 6;
      const size = 1.8 - i * 0.12;
      g.rect(dx, dy, size, size).fill({ color: COL_STONE, alpha: debrisAlpha });
      // Some pieces show inner color
      if (i % 3 === 0) {
        g.rect(dx + 0.3, dy + 0.3, size * 0.5, size * 0.5)
          .fill({ color: COL_STONE_HI, alpha: debrisAlpha * 0.5 });
      }
    }
  }

  // Metal plates slide off
  if (t > 0.3 && t < 0.8) {
    const plateT = (t - 0.3) / 0.5;
    const plateAlpha = (1 - plateT) * 0.5;
    // Bronze plate falling
    g.roundRect(CX - 3 + plateT * 6, torsoTop + torsoH * 0.2 + plateT * 12, 5, 2, 0.5)
      .fill({ color: COL_BRONZE, alpha: plateAlpha });
    // Metal plate falling other side
    g.roundRect(CX + 1 - plateT * 5, torsoTop + torsoH * 0.65 + plateT * 10, 4, 1.5, 0.5)
      .fill({ color: COL_METAL, alpha: plateAlpha });
  }

  // Dust settling at base
  if (t > 0.5) {
    drawDustCloud(g, CX, GY, (t - 0.5) * 1.5);
  }
}

/* -- public API ---------------------------------------------------------- */

type FrameGen = (g: Graphics, frame: number) => void;

const GENERATORS: [FrameGen, number][] = [
  [generateIdleFrame, 8],
  [generateMoveFrame, 8],
  [generateAttackFrame, 8],
  [generateCastFrame, 8],
  [generateDieFrame, 8],
];

/**
 * Generate all siege automaton sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row x 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateSiegeAutomatonFrames(renderer: Renderer): RenderTexture[] {
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
