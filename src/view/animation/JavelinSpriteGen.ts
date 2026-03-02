// Procedural sprite generator for the Javelin (Javelineer) unit type.
// Inspired by the Archer but uses a javelin and buckler shield.
import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN_DK = 0xb8875a;
const COL_TUNIC = 0x2e7a3f;
const COL_TUNIC_DK = 0x1f5e30;
const COL_SHIELD = 0x334455;
const COL_SHIELD_EMB = 0xddcc44;
const COL_JAVELIN = 0xccccaa;
const COL_BOOT = 0x443322;
const COL_SHADOW = 0x000000;

// (utility helpers removed to keep file lean in this patch)

function drawShadow(
  g: Graphics,
  cx: number,
  gy: number,
  w = 12,
  h = 3.5,
): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.25 });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 4,
    bh = 4 - squash;
  g.roundRect(cx - 6 + stanceL, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1).fill({ color: COL_BOOT });
}

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 4.5 + stanceL, legTop, 3, legH).fill({ color: COL_SKIN_DK });
  g.rect(cx + 1.5 + stanceR, legTop, 3, legH).fill({ color: COL_SKIN_DK });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 12;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_TUNIC })
    .stroke({ color: COL_TUNIC_DK, width: 0.8 });
}

function drawBuckler(g: Graphics, cx: number, cy: number): void {
  const r = 5;
  g.ellipse(cx - 10, cy, r, r).fill({ color: COL_SHIELD });
  g.ellipse(cx - 10, cy, r - 1, r - 1).fill({
    color: COL_SHIELD_EMB,
    alpha: 0.6,
  });
}

function drawJavelin(
  g: Graphics,
  cx: number,
  cy: number,
  angle: number,
  length = 18,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const x2 = cx + Math.round(length * cos);
  const y2 = cy + Math.round(length * sin);
  g.moveTo(cx, cy).lineTo(x2, y2).stroke({ color: COL_JAVELIN, width: 2 });
  g.moveTo(x2, y2)
    .lineTo(x2 - cos * 4, y2 - sin * 4)
    .stroke({ color: COL_JAVELIN, width: 2 });
}

// (arm drawing helper removed)

// ---------------------------------------------------------------------------
// Frame generators
// ---------------------------------------------------------------------------

function generateIdleFrames(g: Graphics, _frame: number): void {
  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;

  drawShadow(g, CX, gy2);
  drawBuckler(g, CX, torsoTop + 8);
  drawBoots(g, CX, gy2, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  // Right hand holds javelin
  drawJavelin(g, CX + 6, torsoTop + 4, -0.2, 22);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const walk = Math.sin((frame / 8) * Math.PI * 2);
  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const stanceL = Math.round(walk * 3);
  const stanceR = Math.round(-walk * 3);

  drawShadow(g, CX, gy2, 14 + Math.abs(walk) * 2, 4);
  drawBuckler(g, CX - 6, torsoTop + 6);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH);
  drawJavelin(g, CX + 6, torsoTop + 6, -0.2 + walk * 0.2, 22);
}

function generateAttackFrames(g: Graphics, _frame: number): void {
  // Simple thrust forward with javelin
  const gy2 = GY;
  const legTop = gy2 - 5 - 8;
  const torsoTop = legTop - 12;
  drawShadow(g, CX, gy2);
  drawBuckler(g, CX - 6, torsoTop + 6);
  drawJavelin(g, CX + 6, torsoTop + 6, 0.8, 22);
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;
  const gy2 = GY;
  drawShadow(g, CX, gy2, 12 + t * 4, 4);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 8 },
  [UnitState.CAST]: { gen: generateAttackFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 8 },
};

export function generateJavelinFrames(
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
