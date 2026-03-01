// Procedural sprite generator for the Bolt Thrower unit type.
//
// Draws a scorpion-style torsion engine at 48×48 pixels per frame.
// Entirely different silhouette from the ballista:
//
//   Two large twisted-rope torsion bundles flank a central bolt channel.
//   Short stiff throwing arms are embedded in the bundles and snap forward
//   on release — no bending bow limbs, no wheels, no operator.
//   The machine is compact and upright, almost square in profile.
//
// States: IDLE 8, MOVE 8, ATTACK 6, DIE 7

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F  = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — darker iron-heavy look to differ from ballista's wood-warm tones
const COL_FRAME     = 0x5a4020;   // dark oak frame
const COL_FRAME_LT  = 0x8a6840;   // frame highlight
const COL_IRON      = 0x5a5a5a;
const COL_IRON_DK   = 0x353535;
const COL_IRON_HI   = 0x909090;
const COL_ROPE      = 0xb89a60;   // sinew/rope color
const COL_ROPE_DK   = 0x806a38;
const COL_ROPE_HI   = 0xd8ba80;
const COL_BOLT_WOOD = 0xc0a060;
const COL_BOLT_IRON = 0x444444;
const COL_BOLT_TAIL = 0x882222;
const COL_SHADOW    = 0x000000;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function line(g: Graphics, x1: number, y1: number, x2: number, y2: number, c: number, w = 1) {
  g.stroke({ color: c, width: w });
  g.moveTo(x1, y1).lineTo(x2, y2);
}
function rect(g: Graphics, x: number, y: number, w: number, h: number, c: number) {
  g.fill({ color: c }); g.rect(x, y, w, h);
}
function circ(g: Graphics, x: number, y: number, r: number, c: number) {
  g.fill({ color: c }); g.circle(x, y, r);
}
function ell(g: Graphics, x: number, y: number, rx: number, ry: number, c: number) {
  g.fill({ color: c }); g.ellipse(x, y, rx, ry);
}
function poly(g: Graphics, pts: number[], c: number) {
  g.fill({ color: c }); g.poly(pts);
}

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function drawShadow(g: Graphics) {
  ell(g, CX, GY, 14, 3, COL_SHADOW);
}

/**
 * The base frame — a squat rectangular box sitting on the ground.
 * Wider than tall, iron-banded wooden construction.
 */
function drawFrame(g: Graphics, bobY = 0) {
  const bx = CX - 14;
  const by = GY - 16 + bobY;
  const bw = 28;
  const bh = 12;

  // Main frame box
  rect(g, bx, by, bw, bh, COL_FRAME);
  // Top and bottom iron bands
  rect(g, bx, by, bw, 2, COL_IRON_DK);
  rect(g, bx, by + bh - 2, bw, 2, COL_IRON_DK);
  // Frame highlight
  rect(g, bx + 2, by + 2, bw - 4, 2, COL_FRAME_LT);

  // Two small feet at the base
  rect(g, bx + 2, by + bh, 4, 4, COL_FRAME);
  rect(g, bx + bw - 6, by + bh, 4, 4, COL_FRAME);

  // Iron bolts/rivets on the frame
  circ(g, bx + 5, by + bh / 2, 1.5, COL_IRON_DK);
  circ(g, bx + bw - 5, by + bh / 2, 1.5, COL_IRON_DK);
}

/**
 * Torsion bundle — a cylindrical drum of wound sinew/rope.
 * Drawn as a circle with wound rope pattern lines.
 * `tension` 0–1 controls how tightly wound (visual winding lines density).
 */
function drawTorsionBundle(g: Graphics, cx: number, cy: number, tension: number) {
  const r = 7;

  // Outer drum casing (iron)
  circ(g, cx, cy, r, COL_IRON_DK);
  circ(g, cx, cy, r - 1.5, COL_ROPE_DK);

  // Wound rope lines — radial spokes that look like tight sinew
  const lines = 6;
  for (let i = 0; i < lines; i++) {
    const a = (i / lines) * Math.PI * 2 + tension * Math.PI * 0.5;
    const lx = cx + Math.cos(a) * (r - 2);
    const ly = cy + Math.sin(a) * (r - 2);
    const lx2 = cx + Math.cos(a + Math.PI) * (r - 2);
    const ly2 = cy + Math.sin(a + Math.PI) * (r - 2);
    line(g, lx, ly, lx2, ly2, COL_ROPE_DK, 1);
  }

  // Highlight cross lines (rope texture)
  line(g, cx - (r - 2), cy, cx + (r - 2), cy, COL_ROPE_HI, 0.7);
  line(g, cx, cy - (r - 2), cx, cy + (r - 2), COL_ROPE_HI, 0.7);

  // Center iron axle cap
  circ(g, cx, cy, 2, COL_IRON);
  circ(g, cx, cy, 1, COL_IRON_HI);

  // Outer iron rim
  g.stroke({ color: COL_IRON, width: 1.2 });
  g.circle(cx, cy, r);
}

/**
 * Throwing arm — a short stiff lever embedded in the torsion bundle.
 * `armAngle` controls rotation: positive = cocked back, 0 = fired forward.
 * Returns the tip position (where the bolt nock rests).
 */
function drawArm(
  g: Graphics,
  bundleCx: number,
  bundleCy: number,
  armAngle: number,
  side: "left" | "right",
): { tx: number; ty: number } {
  const dir = side === "left" ? -1 : 1;
  // Arm extends outward from the bundle, angled by armAngle
  const baseAngle = (side === "left" ? Math.PI : 0) + armAngle * dir;
  const armLen = 10;

  const tx = bundleCx + Math.cos(baseAngle) * armLen;
  const ty = bundleCy + Math.sin(baseAngle) * armLen;

  // Arm shaft (thick short lever)
  line(g, bundleCx, bundleCy, tx, ty, COL_FRAME, 3);
  line(g, bundleCx, bundleCy, tx, ty, COL_FRAME_LT, 1.5);

  // Tip iron cap
  circ(g, tx, ty, 2, COL_IRON);

  return { tx, ty };
}

/**
 * The bolt resting in the central trough.
 * `progress` 0 = at rest, 1 = just fired (short flash position).
 */
function drawBolt(g: Graphics, centerY: number, visible = true, launchOffset = 0) {
  if (!visible) return;

  const bx1 = CX - 16 - launchOffset;
  const bx2 = CX + 4 - launchOffset;
  const by = centerY;

  // Shaft
  line(g, bx1, by, bx2, by, COL_BOLT_WOOD, 2);

  // Tip
  line(g, bx1 - 4, by - 1.5, bx1, by, COL_BOLT_IRON, 1.5);
  line(g, bx1 - 4, by + 1.5, bx1, by, COL_BOLT_IRON, 1.5);

  // Fletching
  line(g, bx2, by - 2, bx2 + 3, by, COL_BOLT_TAIL, 1);
  line(g, bx2, by + 2, bx2 + 3, by, COL_BOLT_TAIL, 1);
}

/**
 * Crossbar — the horizontal guide rail between the two torsion bundles.
 * The bolt rests on this rail.
 */
function drawCrossbar(g: Graphics, bobY = 0) {
  const by = GY - 22 + bobY;
  // Rail
  rect(g, CX - 18, by - 1, 36, 2, COL_IRON_DK);
  // Center notch / trigger block
  rect(g, CX - 3, by - 3, 6, 5, COL_IRON);
  circ(g, CX, by, 1.5, COL_IRON_HI);
}

// ---------------------------------------------------------------------------
// Composite draw
// ---------------------------------------------------------------------------

/**
 * Draw the full machine.
 * `armAngle` in radians: how far the arms are cocked (positive = cocked back).
 * `boltVisible` / `boltLaunch`: bolt state.
 */
function drawMachine(
  g: Graphics,
  armAngle: number,
  bobY = 0,
  boltVisible = true,
  boltLaunchOffset = 0,
  tension = 0.5,
) {
  const frameBy = GY - 16 + bobY;
  const bundleY = frameBy + 4;   // torsion bundles sit in the frame
  const leftBX  = CX - 10;
  const rightBX = CX + 10;
  const railY   = GY - 22 + bobY;

  drawFrame(g, bobY);
  drawCrossbar(g, bobY);

  // Left bundle
  drawTorsionBundle(g, leftBX, bundleY, tension);
  // Right bundle
  drawTorsionBundle(g, rightBX, bundleY, tension);

  // Arms
  drawArm(g, leftBX, bundleY, armAngle, "left");
  drawArm(g, rightBX, bundleY, armAngle, "right");

  // Bolt in rail
  drawBolt(g, railY, boltVisible, boltLaunchOffset);
}

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, frame: number): void {
  drawShadow(g);
  const cycle = frame / 8;
  // Gentle tension variation — arms shift very slightly as if under load
  const armAngle = 0.4 + Math.sin(cycle * Math.PI * 2) * 0.05;
  const tension  = 0.5 + Math.sin(cycle * Math.PI) * 0.1;
  drawMachine(g, armAngle, 0, true, 0, tension);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  drawShadow(g);
  const cycle  = frame / 8;
  const bobY   = Math.abs(Math.sin(cycle * Math.PI * 2)) * 2;
  const sway   = Math.sin(cycle * Math.PI * 2) * 0.08;
  drawMachine(g, 0.4 + sway, bobY, true, 0, 0.5);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  drawShadow(g);

  let armAngle  = 0;
  let boltOk    = true;
  let launch    = 0;
  let tension   = 0.5;

  if (frame === 0) {
    // Fully cocked, tense
    armAngle = 0.7;
    tension  = 1.0;
  } else if (frame === 1) {
    // Maximum draw — arms at peak
    armAngle = 0.9;
    tension  = 1.0;
  } else if (frame === 2) {
    // Trigger released — arms snap to 0
    armAngle = 0.3;
    tension  = 0.6;
    boltOk   = false;
    launch   = 6;
  } else if (frame === 3) {
    // Arms fully forward, bolt gone
    armAngle = -0.15;
    tension  = 0.2;
    boltOk   = false;
    launch   = 14;
  } else {
    // Rebound / settling
    armAngle = 0.1 + (frame - 3) * 0.1;
    tension  = 0.3 + (frame - 3) * 0.1;
    boltOk   = false;
  }

  drawMachine(g, armAngle, 0, boltOk, launch, tension);
}

function generateCastFrames(g: Graphics, _frame: number): void {
  generateIdleFrames(g, 0);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const progress = frame / 7;

  g.alpha = 1 - progress;

  // Tilt and collapse downward
  const tilt  = progress * 18;
  const sinkY = progress * 10;
  const slideX = progress * 6;

  drawShadow(g);
  g.setTransform(1, 0, 0, 1, slideX, sinkY);

  drawMachine(g, 0, tilt, progress < 0.4, 0, 0);
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<UnitState, { gen: StateFrameGenerator; count: number }> = {
  [UnitState.IDLE]:   { gen: generateIdleFrames,   count: 8 },
  [UnitState.MOVE]:   { gen: generateMoveFrames,   count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 6 },
  [UnitState.CAST]:   { gen: generateCastFrames,   count: 6 },
  [UnitState.DIE]:    { gen: generateDieFrames,    count: 7 },
};

export function generateBoltThrowerFrames(
  renderer: Renderer,
): Map<UnitState, Texture[]> {
  const result = new Map<UnitState, Texture[]>();

  for (const state of Object.values(UnitState)) {
    const { gen, count } = STATE_GENERATORS[state];
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);

      const rt = RenderTexture.create({ width: F, height: F });
      renderer.render({ container: g, target: rt });
      textures.push(rt);

      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}
