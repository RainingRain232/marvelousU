// Procedural sprite generator for the Imp Overlord unit type.
//
// Draws a bloated demon lord at 48×48 pixels per frame
// using PixiJS Graphics → RenderTexture.
//
// Visual features:
//   • Fat, bloated red demon body with pot belly
//   • Short stubby curved horns, wide grinning mouth, yellow eyes
//   • Tattered dark robes dragging on the ground
//   • Gnarled wooden staff topped with an imp skull
//   • 2–3 tiny fire imps orbiting/darting around the unit
//   • Comical, waddling movement style

import { Graphics, RenderTexture, type Renderer } from "pixi.js";

/* ── constants ───────────────────────────────────────────────────────── */

const F = 48;
const CX = F / 2;
const GY = F - 3;

// Palette — bloated demon & fire
const COL_SKIN      = 0xcc2222; // fat red demon skin
const COL_SKIN_HI   = 0xee4444; // highlight
const COL_SKIN_DK   = 0x881111; // deep shadow on folds
const COL_BELLY     = 0xdd3333; // exposed belly slightly lighter
const COL_BELLY_HI  = 0xee5555;

const COL_ROBE      = 0x1e1428; // tattered dark purple-black robe
const COL_ROBE_HI   = 0x332244; // robe highlight folds
const COL_ROBE_TATTER = 0x2a1a38; // tattered hem pieces
const COL_ROBE_TRIM = 0x4a1a4a; // faded purple trim

const COL_HORN      = 0x3a1a08; // dark stubby horns
const COL_HORN_HI   = 0x5a2a10;

const COL_EYE       = 0xffee00; // yellow eyes
const COL_EYE_GLOW  = 0xffaa00;
const COL_TOOTH     = 0xeeeecc; // wide grinning teeth

const COL_STAFF     = 0x4a3010; // gnarled wood
const COL_STAFF_HI  = 0x6a4a20; // wood highlight
const COL_STAFF_KNOT = 0x3a2008; // dark wood knots
const COL_SKULL     = 0xddccaa; // imp skull on staff
const COL_SKULL_DK  = 0xaa9980;
const COL_SKULL_EYE = 0xff4400; // glowing skull eye sockets

// Imp fire colors
const COL_IMP_BODY  = 0xff5500; // orange-red imp body
const COL_IMP_FIRE  = 0xffcc00; // bright yellow core flame
const COL_IMP_EYE   = 0xffff00; // tiny glowing imp eyes

const COL_SHADOW    = 0x000000;

/* ── helpers ──────────────────────────────────────────────────────────── */

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

/* ── imp drawing ──────────────────────────────────────────────────────── */

function drawTinyImp(
  g: Graphics,
  cx: number,
  cy: number,
  size: number,
  flicker: number,
  alpha = 1,
): void {
  // Tiny fire imp — flame body with glowing eyes
  // Flame body tapering upward
  g.moveTo(cx - size, cy + size)
    .quadraticCurveTo(cx - size * 1.2, cy - size * 0.5, cx, cy - size * 1.5)
    .quadraticCurveTo(cx + size * 1.2, cy - size * 0.5, cx + size, cy + size)
    .closePath()
    .fill({ color: COL_IMP_BODY, alpha });
  // Inner flame flicker
  const fy = cy + size * 0.2 - flicker * size * 0.4;
  g.moveTo(cx - size * 0.5, cy + size * 0.8)
    .quadraticCurveTo(cx, fy - size * 0.5, cx, cy - size * 0.8)
    .quadraticCurveTo(cx, fy - size * 0.5, cx + size * 0.5, cy + size * 0.8)
    .fill({ color: COL_IMP_FIRE, alpha: alpha * (0.6 + flicker * 0.4) });
  // Tiny imp eyes
  g.ellipse(cx - size * 0.35, cy - size * 0.1, size * 0.28, size * 0.2)
    .fill({ color: COL_IMP_EYE, alpha });
  g.ellipse(cx + size * 0.35, cy - size * 0.1, size * 0.28, size * 0.2)
    .fill({ color: COL_IMP_EYE, alpha });
  // Dark pupils
  g.circle(cx - size * 0.35, cy - size * 0.1, size * 0.1).fill({ color: COL_SHADOW, alpha });
  g.circle(cx + size * 0.35, cy - size * 0.1, size * 0.1).fill({ color: COL_SHADOW, alpha });
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

function drawRobeHem(
  g: Graphics,
  cx: number,
  gy: number,
  wobble: number,
): void {
  // Tattered robe hem dragging on ground — multiple irregular strips
  const strips = [
    { ox: -7, w: 4, h: 5 },
    { ox: -4, w: 3, h: 4 },
    { ox: -1, w: 5, h: 6 },
    { ox:  4, w: 3, h: 4 },
    { ox:  6, w: 4, h: 5 },
  ];
  for (const s of strips) {
    const sw = wobble * (s.ox % 2 === 0 ? 1 : -1) * 0.6;
    g.moveTo(cx + s.ox + sw, gy - s.h)
      .lineTo(cx + s.ox + s.w + sw * 0.5, gy - s.h)
      .lineTo(cx + s.ox + s.w - 1 + sw * 0.3, gy + 1)
      .lineTo(cx + s.ox + 1 + sw * 0.3, gy + 1)
      .closePath()
      .fill({ color: COL_ROBE_TATTER });
  }
  // Main wide hem piece
  g.roundRect(cx - 8 + wobble * 0.5, gy - 4, 16, 4, 1)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_HI, width: 0.4 });
}

function drawRobe(
  g: Graphics,
  cx: number,
  top: number,
  h: number,
  bulge: number,
  tilt = 0,
): void {
  const rw = 15 + bulge * 1.5; // very wide bloated robe
  const x = cx - rw / 2 + tilt;
  // Main robe body
  g.roundRect(x, top, rw, h, 3)
    .fill({ color: COL_ROBE })
    .stroke({ color: COL_ROBE_HI, width: 0.5 });
  // Robe fold lines
  g.moveTo(cx + tilt - 4, top + 2)
    .lineTo(cx + tilt - 3, top + h - 1)
    .stroke({ color: COL_ROBE_HI, width: 0.6, alpha: 0.4 });
  g.moveTo(cx + tilt + 4, top + 2)
    .lineTo(cx + tilt + 3, top + h - 1)
    .stroke({ color: COL_ROBE_HI, width: 0.6, alpha: 0.4 });
  // Faded trim along robe edge
  g.moveTo(x, top + 1)
    .lineTo(x, top + h - 1)
    .stroke({ color: COL_ROBE_TRIM, width: 1, alpha: 0.5 });
  g.moveTo(x + rw, top + 1)
    .lineTo(x + rw, top + h - 1)
    .stroke({ color: COL_ROBE_TRIM, width: 1, alpha: 0.5 });
  // Exposed belly bulge — pot belly poking through robe gap
  g.ellipse(cx + tilt, top + h * 0.55, 5 + bulge, 5 + bulge * 0.5)
    .fill({ color: COL_BELLY })
    .stroke({ color: COL_BELLY_HI, width: 0.4, alpha: 0.4 });
  // Belly highlight
  g.ellipse(cx + tilt - 1, top + h * 0.45, 2, 2).fill({ color: COL_BELLY_HI, alpha: 0.3 });
  // Belly button (comical detail)
  g.circle(cx + tilt, top + h * 0.58, 0.8).fill({ color: COL_SKIN_DK, alpha: 0.5 });
}

function drawHead(
  g: Graphics,
  cx: number,
  top: number,
  laugh: number,
  tilt = 0,
): void {
  const hw = 13; // fat round head
  const hh = 11;
  const x = cx - hw / 2 + tilt;
  // Fat round face
  g.ellipse(cx + tilt, top + hh / 2, hw / 2, hh / 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DK, width: 0.5 });
  // Jowls — fat cheeks
  g.ellipse(cx + tilt - hw * 0.4, top + hh * 0.6, 3, 2.5).fill({ color: COL_SKIN_HI, alpha: 0.4 });
  g.ellipse(cx + tilt + hw * 0.4, top + hh * 0.6, 3, 2.5).fill({ color: COL_SKIN_HI, alpha: 0.4 });
  // Forehead wrinkles
  g.moveTo(cx + tilt - 3, top + 2)
    .lineTo(cx + tilt - 1, top + 1)
    .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.5 });
  g.moveTo(cx + tilt + 3, top + 2)
    .lineTo(cx + tilt + 1, top + 1)
    .stroke({ color: COL_SKIN_DK, width: 0.4, alpha: 0.5 });
  // Short stubby horns — curved outward
  g.moveTo(x + 2, top + 2)
    .quadraticCurveTo(x - 1, top - 2, x + 2, top - 4)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.moveTo(x + 2, top + 2)
    .quadraticCurveTo(x, top - 1, x + 2.5, top - 3.5)
    .stroke({ color: COL_HORN_HI, width: 0.7, alpha: 0.5 });
  g.moveTo(x + hw - 2, top + 2)
    .quadraticCurveTo(x + hw + 1, top - 2, x + hw - 2, top - 4)
    .stroke({ color: COL_HORN, width: 2.5 });
  g.moveTo(x + hw - 2, top + 2)
    .quadraticCurveTo(x + hw, top - 1, x + hw - 2.5, top - 3.5)
    .stroke({ color: COL_HORN_HI, width: 0.7, alpha: 0.5 });
  // Yellow eyes — wide and leering
  const eyeY = top + hh * 0.38;
  g.ellipse(cx - 2.8 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
  g.ellipse(cx + 2.8 + tilt, eyeY, 1.8, 1.2).fill({ color: COL_EYE_GLOW, alpha: 0.6 });
  g.ellipse(cx - 2.8 + tilt, eyeY, 1.3, 0.9).fill({ color: COL_EYE });
  g.ellipse(cx + 2.8 + tilt, eyeY, 1.3, 0.9).fill({ color: COL_EYE });
  g.circle(cx - 2.8 + tilt, eyeY, 0.45).fill({ color: COL_SHADOW });
  g.circle(cx + 2.8 + tilt, eyeY, 0.45).fill({ color: COL_SHADOW });
  // Wide grinning mouth — laugh amount affects how open it is
  const mouthY = top + hh * 0.7;
  const mouthOpen = 1.2 + laugh * 2.5;
  const mouthW = 5.5;
  // Mouth cavity
  g.ellipse(cx + tilt, mouthY, mouthW, mouthOpen)
    .fill({ color: COL_SHADOW });
  // Teeth — wide grin
  for (let i = 0; i < 4; i++) {
    const tx = cx + tilt - 4.5 + i * 3;
    g.rect(tx, mouthY - mouthOpen * 0.6, 2, mouthOpen * 0.7)
      .fill({ color: COL_TOOTH });
  }
  // Lower lip
  g.moveTo(cx + tilt - mouthW, mouthY + mouthOpen * 0.3)
    .quadraticCurveTo(cx + tilt, mouthY + mouthOpen * 0.6, cx + tilt + mouthW, mouthY + mouthOpen * 0.3)
    .stroke({ color: COL_SKIN_DK, width: 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
): void {
  // Fat, pudgy arms visible under robe sleeve edges
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN_DK, width: 5 });
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color: COL_SKIN, width: 3 });
  // Pudgy hand
  g.circle(ex, ey, 2.5).fill({ color: COL_SKIN });
  g.circle(ex - 0.5, ey - 0.5, 0.8).fill({ color: COL_SKIN_HI, alpha: 0.4 });
}

function drawStaff(
  g: Graphics,
  bx: number,
  by: number,
  angle: number,
  staffLen = 20,
  skullGlow = 0.3,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = bx + sin * staffLen;
  const tipY = by - cos * staffLen;

  // Gnarled wood staff
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_STAFF, width: 2.5 });
  g.moveTo(bx, by).lineTo(tipX, tipY).stroke({ color: COL_STAFF_HI, width: 0.7, alpha: 0.5 });

  // Knots along wood grain
  for (let k = 0; k < 3; k++) {
    const kt = 0.2 + k * 0.22;
    const kx = lerp(bx, tipX, kt);
    const ky = lerp(by, tipY, kt);
    g.circle(kx, ky, 1.3).fill({ color: COL_STAFF_KNOT });
    g.circle(kx, ky, 0.5).fill({ color: COL_STAFF_HI, alpha: 0.3 });
  }

  // Imp skull topper
  const skullX = tipX;
  const skullY = tipY;
  // Skull head round shape
  g.ellipse(skullX, skullY - 2.5, 4, 3.5)
    .fill({ color: COL_SKULL })
    .stroke({ color: COL_SKULL_DK, width: 0.4 });
  // Skull jaw
  g.roundRect(skullX - 2, skullY - 0.5, 4, 2.5, 1)
    .fill({ color: COL_SKULL })
    .stroke({ color: COL_SKULL_DK, width: 0.3 });
  // Eye sockets — glowing
  g.ellipse(skullX - 1.4, skullY - 2.8, 1, 1).fill({ color: COL_SKULL_EYE, alpha: skullGlow + 0.1 });
  g.ellipse(skullX + 1.4, skullY - 2.8, 1, 1).fill({ color: COL_SKULL_EYE, alpha: skullGlow + 0.1 });
  // Teeth on jaw
  for (let t2 = 0; t2 < 3; t2++) {
    g.rect(skullX - 1.5 + t2 * 1.2, skullY + 0.5, 0.9, 1.5)
      .fill({ color: COL_SKULL_DK });
  }
  // Skull glow halo
  g.circle(skullX, skullY - 2.5, 5 + skullGlow * 2)
    .stroke({ color: COL_SKULL_EYE, width: 0.8, alpha: skullGlow * 0.25 });
}

/* ── frame generators ────────────────────────────────────────────────── */

function generateIdleFrame(g: Graphics, frame: number): void {
  // Laughs silently — body jiggles, staff glows, mini imps orbit and chitter
  const t = (frame % 8) / 8;
  const jiggle = Math.sin(t * Math.PI * 4) * 0.4; // fast jiggle = belly laugh
  const breathe = Math.sin(t * Math.PI * 2) * 0.5;
  const staffPulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const torsoH = 13;
  const legTop = GY - 5;
  const torsoTop = legTop - torsoH + 1 + breathe;
  const headTop = torsoTop - 11;

  // 3 orbiting imps
  for (let i = 0; i < 3; i++) {
    const orbitAngle = t * Math.PI * 2 + i * (Math.PI * 2 / 3);
    const orbitR = 11 + i * 1.5;
    const ix = CX + Math.cos(orbitAngle) * orbitR;
    const iy = torsoTop + 4 + Math.sin(orbitAngle) * orbitR * 0.35;
    const flickerI = Math.sin(t * Math.PI * 6 + i * 2) * 0.5 + 0.5;
    drawTinyImp(g, ix, iy, 2.5 + i * 0.3, flickerI);
  }

  drawShadow(g, CX, GY, 13, 3.5);
  drawRobeHem(g, CX + jiggle * 0.3, GY, jiggle);
  drawRobe(g, CX, torsoTop, torsoH, Math.abs(jiggle) * 0.5, jiggle * 0.3);
  drawHead(g, CX, headTop, Math.abs(jiggle) * 0.8, jiggle * 0.2);

  // Staff held at left side, slightly raised
  const staffX = CX - 10 + jiggle * 0.2;
  const staffY = torsoTop + 4;
  drawStaff(g, staffX, staffY, -0.15, 19, 0.2 + staffPulse * 0.4);
  drawArm(g, CX - 6, torsoTop + 3, staffX + 1, staffY + 2);
}

function generateMoveFrame(g: Graphics, frame: number): void {
  // Waddle slowly — robes drag, imps dart ahead
  const t = frame / 8;
  const waddle = Math.sin(t * Math.PI * 2); // slower waddle cycle
  const bob = Math.abs(waddle) * 1.0;
  const tilt = waddle * 1.2; // lurch side to side

  const torsoH = 13;
  const legTop = GY - 5;
  const torsoTop = legTop - torsoH + 1 - bob * 0.3;
  const headTop = torsoTop - 11;

  // Imps dart ahead of the waddle direction
  for (let i = 0; i < 2; i++) {
    const dartX = CX + 12 + i * 5 + Math.cos(t * Math.PI * 4 + i * 1.5) * 2;
    const dartY = headTop + 4 + Math.sin(t * Math.PI * 4 + i * 2) * 3;
    const flickerI = Math.sin(t * Math.PI * 8 + i * 3) * 0.5 + 0.5;
    drawTinyImp(g, dartX, dartY, 2 + i * 0.4, flickerI, 0.85);
  }
  // One imp lags behind
  {
    const lagX = CX - 12 + Math.cos(t * Math.PI * 3) * 2;
    const lagY = torsoTop + 6 + Math.sin(t * Math.PI * 5) * 2;
    const flickerLag = Math.sin(t * Math.PI * 7) * 0.5 + 0.5;
    drawTinyImp(g, lagX, lagY, 2.2, flickerLag, 0.7);
  }

  drawShadow(g, CX + tilt * 0.5, GY, 13 + Math.abs(waddle) * 1.5, 3.5);
  drawRobeHem(g, CX + tilt * 0.4, GY, waddle * 1.2);
  drawRobe(g, CX, torsoTop, torsoH, 0, tilt);
  drawHead(g, CX, headTop, 0.3, tilt * 0.5);

  // Staff wobbles with the waddle
  const staffX = CX - 10 + tilt;
  const staffY = torsoTop + 4;
  const staffTilt = -0.15 + waddle * 0.08;
  drawStaff(g, staffX, staffY, staffTilt, 19, 0.2);
  drawArm(g, CX - 6 + tilt, torsoTop + 3, staffX + 1, staffY + 2);
}

function generateAttackFrame(g: Graphics, frame: number): void {
  // Points staff, imp projectile fires forward
  const phases = [0, 0.1, 0.22, 0.38, 0.54, 0.67, 0.82, 1.0];
  const t = phases[Math.min(frame, 7)];

  const torsoH = 13;
  const legTop = GY - 5;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 11;

  // Body leans forward to point
  const lean = t < 0.4 ? lerp(0, 2, t / 0.4) : t < 0.6 ? 2 : lerp(2, 0, (t - 0.6) / 0.4);
  const tilt = lean * 0.7;

  // Imp projectile firing — launches at t≈0.35 and travels right
  if (t >= 0.3 && t <= 0.85) {
    const launchT = clamp01((t - 0.3) / 0.55);
    const projX = lerp(CX + 8, F - 2, launchT * launchT);
    const projY = lerp(headTop + 4, headTop + 2, Math.sin(launchT * Math.PI) * 0.2);
    const flickerP = Math.sin(t * Math.PI * 10) * 0.5 + 0.5;
    drawTinyImp(g, projX, projY, 2.8 - launchT * 0.8, flickerP, clamp01(1 - launchT * 0.7));
    // Flame trail behind projectile
    if (launchT > 0.05) {
      g.moveTo(projX - 3, projY)
        .lineTo(projX - 8 - launchT * 5, projY + 1)
        .stroke({ color: COL_IMP_FIRE, width: 1.2, alpha: (1 - launchT) * 0.5 });
    }
  }

  // Remaining orbiting imp
  const orbitAngle = t * Math.PI * 2;
  const ix = CX + Math.cos(orbitAngle) * 12;
  const iy = torsoTop + 4 + Math.sin(orbitAngle) * 4;
  const flickerOrbit = Math.sin(t * Math.PI * 6) * 0.5 + 0.5;
  drawTinyImp(g, ix, iy, 2.3, flickerOrbit, 0.8);

  drawShadow(g, CX + lean, GY, 13 + lean, 3.5);
  drawRobeHem(g, CX + tilt * 0.5, GY, lean * 0.4);
  drawRobe(g, CX, torsoTop, torsoH, 0, tilt);
  drawHead(g, CX, headTop, t > 0.25 && t < 0.65 ? 0.8 : 0.2, tilt * 0.5);

  // Staff points forward/right when attacking
  const staffX = CX + 2 + lean * 2;
  const staffY = torsoTop + 3;
  const staffAngle = t < 0.38 ? lerp(-0.15, 0.8, t / 0.38) : t < 0.6 ? 0.8 : lerp(0.8, -0.15, (t - 0.6) / 0.4);
  drawStaff(g, staffX, staffY, staffAngle, 19, 0.2 + (t > 0.25 && t < 0.6 ? 0.5 : 0));
  drawArm(g, CX - 2 + tilt, torsoTop + 2, staffX - 1, staffY + 1);
  // Other arm gestures dramatically
  const waveArm = t < 0.45 ? lerp(0, -4, t / 0.45) : lerp(-4, 0, (t - 0.45) / 0.55);
  drawArm(g, CX + 4 + tilt, torsoTop + 3, CX + 11 + tilt + lean, torsoTop + 3 + waveArm);
}

function generateCastFrame(g: Graphics, frame: number): void {
  // Staff raised high, fire portal opens, imp emerges from fire circle
  const t = frame / 7;
  const pulse = Math.sin(t * Math.PI * 3) * 0.5 + 0.5;
  const intensity = clamp01(t * 1.5);

  const torsoH = 13;
  const legTop = GY - 5;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 11;

  // Fire portal — expanding circle
  const portalCX = CX + 10;
  const portalCY = torsoTop - 2;
  const portalR = 3 + intensity * 9;
  // Outer ring
  g.circle(portalCX, portalCY, portalR)
    .stroke({ color: COL_IMP_BODY, width: 1.5, alpha: 0.2 + pulse * 0.35 });
  // Inner fire fill
  g.circle(portalCX, portalCY, portalR * 0.7)
    .fill({ color: COL_IMP_BODY, alpha: 0.1 + pulse * 0.2 });
  g.circle(portalCX, portalCY, portalR * 0.4)
    .fill({ color: COL_IMP_FIRE, alpha: 0.1 + pulse * 0.25 });

  // Fire particles orbiting portal
  for (let i = 0; i < 6; i++) {
    const fAngle = t * Math.PI * 4 + i * (Math.PI / 3);
    const fx = portalCX + Math.cos(fAngle) * (portalR + 1);
    const fy = portalCY + Math.sin(fAngle) * (portalR + 1) * 0.6;
    g.circle(fx, fy, 0.8 + pulse * 0.5)
      .fill({ color: i % 2 === 0 ? COL_IMP_FIRE : COL_IMP_BODY, alpha: 0.3 + pulse * 0.4 });
  }

  // Imp emerging from portal
  if (intensity > 0.3) {
    const emergeT = clamp01((intensity - 0.3) / 0.7);
    const emergeX = portalCX;
    const emergeY = lerp(portalCY + portalR * 0.5, portalCY - 4, emergeT);
    const flickerE = Math.sin(t * Math.PI * 8) * 0.5 + 0.5;
    drawTinyImp(g, emergeX, emergeY, 2.5 + emergeT * 1.5, flickerE, clamp01(emergeT * 1.5));
  }

  // Additional 2 imps orbiting body excitedly
  for (let i = 0; i < 2; i++) {
    const orbitAngle = t * Math.PI * 3 + i * Math.PI;
    const ix = CX + Math.cos(orbitAngle) * 12;
    const iy = torsoTop + 5 + Math.sin(orbitAngle) * 5;
    const flickerI = Math.sin(t * Math.PI * 7 + i * 2) * 0.5 + 0.5;
    drawTinyImp(g, ix, iy, 2.2, flickerI, 0.9);
  }

  drawShadow(g, CX, GY, 13, 3.5, 0.3 + intensity * 0.15);
  drawRobeHem(g, CX, GY, pulse * 0.5);
  drawRobe(g, CX, torsoTop, torsoH, pulse * 0.4);
  drawHead(g, CX, headTop, pulse * 0.6);

  // Staff raised high — arm extended upward
  const raise = intensity * 7;
  const staffX = CX - 8;
  const staffY = torsoTop - raise;
  drawStaff(g, staffX, staffY, -0.2, 20, 0.3 + intensity * 0.5 + pulse * 0.2);
  drawArm(g, CX - 5, torsoTop + 2, staffX + 1, staffY + 3);

  // Other arm outstretched toward portal
  drawArm(g, CX + 5, torsoTop + 4, CX + 13, portalCY + 3);

  // Skull eyes blaze during cast
  // (already drawn inside drawStaff with skullGlow passed, but add extra burst)
  g.circle(staffX + Math.sin(-0.2) * 19.5, staffY - Math.cos(-0.2) * 19.5 - 2.5, 4 + pulse * 3)
    .stroke({ color: COL_SKULL_EYE, width: 0.8, alpha: (0.15 + pulse * 0.2) * intensity });
}

function generateDieFrame(g: Graphics, frame: number): void {
  // Bloated body deflates comically, staff drops, imps scatter and vanish
  const t = frame / 7;

  const torsoH = 13;
  const legTop = GY - 5;
  const torsoTop = legTop - torsoH + 1;
  const headTop = torsoTop - 11;

  // Deflate: body gets smaller horizontally, collapses downward
  const deflate = clamp01(t * 1.5);
  const deflateScale = 1 - deflate * 0.55; // horizontal squish
  const collapseY = deflate * deflate * 10;
  const slump = clamp01(t * 2) * 1.2;

  const bodyTop = torsoTop + collapseY;

  // Imps scatter — fly off in different directions, fading
  for (let i = 0; i < 3; i++) {
    const scatterAngle = Math.PI * 0.2 + i * (Math.PI * 0.55);
    const scatterDist = deflate * (12 + i * 6);
    const ix = CX + Math.cos(scatterAngle) * scatterDist;
    const iy = headTop + Math.sin(scatterAngle) * scatterDist * 0.7;
    const scatterAlpha = clamp01((1 - deflate) * 1.5);
    const flickerS = Math.sin(t * Math.PI * 8 + i * 1.5) * 0.5 + 0.5;
    if (scatterAlpha > 0.05) {
      drawTinyImp(g, ix, iy, 2.2 - deflate * 1.5, flickerS, scatterAlpha);
    }
  }

  // Staff drops and clatters
  if (t < 0.9) {
    const staffDropT = clamp01(t * 2);
    const dropStaffX = lerp(CX - 8, CX - 18, staffDropT);
    const dropStaffY = lerp(torsoTop + 2, GY - 3, staffDropT * staffDropT);
    const dropAngle = lerp(-0.15, Math.PI * 0.45, staffDropT);
    drawStaff(g, dropStaffX, dropStaffY, dropAngle, 19, 0.1 * (1 - staffDropT));
  }

  // Shadow shrinks
  drawShadow(g, CX, GY, 13 * deflateScale + 5, 3.5, 0.3 * (1 - t * 0.5));

  // Deflated body — squished robe
  if (t < 0.92) {
    drawRobeHem(g, CX, GY, deflate * 2);
    // Scale robe width to show deflation
    g.roundRect(
      CX - (8 * deflateScale),
      bodyTop,
      16 * deflateScale,
      (torsoH * (1 - deflate * 0.4)),
      3,
    ).fill({ color: COL_ROBE }).stroke({ color: COL_ROBE_HI, width: 0.4 });
    // Belly visibly deflates
    g.ellipse(CX, bodyTop + torsoH * 0.55, 5 * deflateScale, 5 * (1 - deflate * 0.7))
      .fill({ color: COL_BELLY });
  }

  // Head slumps and squishes down
  if (t < 0.88) {
    const headSquish = deflate * 0.4;
    const headTilt = slump * 8;
    // Comically squished head
    g.ellipse(CX + headTilt, bodyTop - 7 + collapseY * 0.4, 7 * (1 + headSquish), 5.5 * (1 - headSquish))
      .fill({ color: COL_SKIN })
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Eyes half-closed / X'd out
    const eyeY2 = bodyTop - 8.5 + collapseY * 0.4;
    if (t < 0.5) {
      g.ellipse(CX - 2.8 + headTilt, eyeY2, 1.3 * (1 + headSquish), 0.9 * (1 - deflate)).fill({ color: COL_EYE });
      g.ellipse(CX + 2.8 + headTilt, eyeY2, 1.3 * (1 + headSquish), 0.9 * (1 - deflate)).fill({ color: COL_EYE });
    } else {
      // X eyes — comical death
      const xAlpha = clamp01((t - 0.5) * 4);
      g.moveTo(CX - 4.1 + headTilt, eyeY2 - 0.8).lineTo(CX - 1.5 + headTilt, eyeY2 + 0.8).stroke({ color: COL_SHADOW, width: 1, alpha: xAlpha });
      g.moveTo(CX - 1.5 + headTilt, eyeY2 - 0.8).lineTo(CX - 4.1 + headTilt, eyeY2 + 0.8).stroke({ color: COL_SHADOW, width: 1, alpha: xAlpha });
      g.moveTo(CX + 1.5 + headTilt, eyeY2 - 0.8).lineTo(CX + 4.1 + headTilt, eyeY2 + 0.8).stroke({ color: COL_SHADOW, width: 1, alpha: xAlpha });
      g.moveTo(CX + 4.1 + headTilt, eyeY2 - 0.8).lineTo(CX + 1.5 + headTilt, eyeY2 + 0.8).stroke({ color: COL_SHADOW, width: 1, alpha: xAlpha });
    }
    // Stubby horns droop with the slump
    const hx = CX + headTilt;
    const ht = bodyTop - 12 + collapseY * 0.3;
    g.moveTo(hx - 4, ht + 3)
      .quadraticCurveTo(hx - 7 - slump, ht + 2 + slump * 3, hx - 6 - slump * 1.5, ht + 5 + slump * 2)
      .stroke({ color: COL_HORN, width: 2.5 });
    g.moveTo(hx + 4, ht + 3)
      .quadraticCurveTo(hx + 7 + slump, ht + 2 + slump * 3, hx + 6 + slump * 1.5, ht + 5 + slump * 2)
      .stroke({ color: COL_HORN, width: 2.5 });
    // Tongue lolls out
    if (t > 0.35) {
      const tongueLen = clamp01((t - 0.35) / 0.35) * 4;
      g.moveTo(hx, eyeY2 + 3)
        .quadraticCurveTo(hx + 1, eyeY2 + 3 + tongueLen, hx, eyeY2 + 3 + tongueLen)
        .stroke({ color: 0xee4444, width: 1.5, alpha: 0.8 });
    }
  }

  // Fat arm flops limp
  if (t > 0.3) {
    drawArm(g, CX + 4, bodyTop + 3, CX + 10, bodyTop + torsoH * (1 - deflate * 0.4) - 1);
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
 * Generate all Imp Overlord sprite frames procedurally.
 *
 * Returns a flat array of RenderTextures arranged in a 5-row × 8-column
 * grid (one row per UnitState, 8 frames per row).
 */
export function generateImpOverlordFrames(renderer: Renderer): RenderTexture[] {
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
