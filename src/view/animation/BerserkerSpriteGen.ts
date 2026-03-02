import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

const COL_SKIN = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_HELM = 0x778899;
const COL_HELM_HI = 0x99aabb;
const COL_ARMOR_DK = 0x556677;
const COL_VISOR = 0x1a1a2e;
const COL_TROUSERS = 0x5a4a3a;
const COL_BOOT = 0x443322;
const COL_BOOT_DK = 0x332211;
const COL_SHADOW = 0x000000;
const COL_AXE_BLD = 0x8899aa;
const COL_AXE_HI = 0xaabbcc;
const COL_AXE_HANDLE = 0x6b4423;
const COL_AXE_METAL = 0x777788;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function sin01(frame: number, total: number): number {
  return Math.sin((frame / total) * Math.PI * 2) * 0.5 + 0.5;
}

function drawShadow(g: Graphics, cx: number, gy: number, w = 14, h = 4): void {
  g.ellipse(cx, gy + 1, w, h).fill({ color: COL_SHADOW, alpha: 0.3 });
}

function drawBoots(
  g: Graphics,
  cx: number,
  gy: number,
  stanceL: number,
  stanceR: number,
  squash = 0,
): void {
  const bw = 5,
    bh = 5 - squash;
  g.roundRect(cx - 7 + stanceL, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
  g.roundRect(cx + 2 + stanceR, gy - bh, bw, bh, 1)
    .fill({ color: COL_BOOT })
    .stroke({ color: COL_BOOT_DK, width: 0.5 });
}

function drawTrousers(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_TROUSERS });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_TROUSERS });
}

function drawNakedTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_SKIN })
    .stroke({ color: COL_SKIN_DARK, width: 0.5 });
  for (let row = 3; row < torsoH - 2; row += 4) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_SKIN_DARK, width: 0.3, alpha: 0.4 });
  }
}

function drawHelm(g: Graphics, cx: number, helmTop: number, tilt = 0): void {
  const hw = 10,
    hh = 9;
  const x = cx - hw / 2 + tilt;
  g.roundRect(x, helmTop, hw, hh, 3)
    .fill({ color: COL_HELM })
    .stroke({ color: COL_ARMOR_DK, width: 0.6 });
  g.roundRect(x + 2, helmTop + 1, 4, 3, 1).fill({
    color: COL_HELM_HI,
    alpha: 0.5,
  });
  g.rect(x + 2, helmTop + hh - 4, hw - 4, 2).fill({ color: COL_VISOR });
  g.rect(cx - 1 + tilt, helmTop + 2, 2, hh - 2).fill({ color: COL_ARMOR_DK });
}

function drawTwoHandedAxe(
  g: Graphics,
  axeX: number,
  axeY: number,
  angle: number,
  handleLen = 22,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const handleEndX = axeX + sin * handleLen;
  const handleEndY = axeY - cos * handleLen;

  g.moveTo(axeX, axeY)
    .lineTo(handleEndX, handleEndY)
    .stroke({ color: COL_AXE_HANDLE, width: 3 });

  const bladeX = handleEndX;
  const bladeY = handleEndY;
  const bladeAngle = angle;

  const bladeLen = 10;
  const bladeW = 7;

  const bx1 = bladeX + Math.sin(bladeAngle) * bladeLen;
  const by1 = bladeY - Math.cos(bladeAngle) * bladeLen;
  const bx2 = bladeX + Math.cos(bladeAngle) * bladeW + Math.sin(bladeAngle) * 3;
  const by2 = bladeY + Math.sin(bladeAngle) * bladeW - Math.cos(bladeAngle) * 3;
  const bx3 = bladeX - Math.cos(bladeAngle) * bladeW + Math.sin(bladeAngle) * 3;
  const by3 = bladeY - Math.sin(bladeAngle) * bladeW - Math.cos(bladeAngle) * 3;

  g.moveTo(bladeX, bladeY)
    .lineTo(bx1, by1)
    .lineTo(bx2, by2)
    .lineTo(bx3, by3)
    .closePath()
    .fill({ color: COL_AXE_METAL })
    .stroke({ color: COL_AXE_BLD, width: 1 });

  g.moveTo(bladeX, bladeY)
    .lineTo(bx1 + Math.cos(bladeAngle) * 2, by1 + Math.sin(bladeAngle) * 2)
    .stroke({ color: COL_AXE_HI, width: 1, alpha: 0.6 });
}

function drawArm(
  g: Graphics,
  sx: number,
  sy: number,
  ex: number,
  ey: number,
  color = COL_SKIN,
): void {
  g.moveTo(sx, sy).lineTo(ex, ey).stroke({ color, width: 3 });
  g.circle(ex, ey, 2).fill({ color: COL_SKIN_DARK });
}

function generateIdleFrames(g: Graphics, frame: number): void {
  const t = sin01(frame, 8);
  const bob = Math.round(t * 2 - 1);

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 9 + bob;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, 0, 0);
  drawTrousers(g, CX, legTop, legH, 0, 0);
  drawNakedTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  const axeAngle = 0.2 + t * 0.05;
  drawArm(g, CX + 5, torsoTop + 4, CX + 9, torsoTop + torsoH - 2);
  drawArm(g, CX - 5, torsoTop + 4, CX - 9, torsoTop + torsoH - 2);
  drawTwoHandedAxe(g, CX + 9, torsoTop + torsoH - 2, axeAngle, 20);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 2;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const stanceL = Math.round(walkCycle * 3);
  const stanceR = Math.round(-walkCycle * 3);
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.5);
  const helmTop = torsoTop - 9;

  drawShadow(g, CX, gy2, 14 + Math.abs(walkCycle) * 2, 4);
  drawBoots(g, CX, gy2, stanceL, stanceR);
  drawTrousers(g, CX, legTop, legH, stanceL, stanceR);
  drawNakedTorso(g, CX, torsoTop, torsoH, walkCycle * 0.5);
  drawHelm(g, CX, helmTop, walkCycle * 0.5);

  const armSwing = walkCycle * 2;
  drawArm(g, CX + 5, torsoTop + 4, CX + 9 + armSwing, torsoTop + torsoH - 2);
  drawArm(g, CX - 5, torsoTop + 4, CX - 9 - armSwing, torsoTop + torsoH - 2);
  drawTwoHandedAxe(
    g,
    CX + 9 + armSwing,
    torsoTop + torsoH - 2,
    0.3 + walkCycle * 0.1,
    20,
  );
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;

  const lean = t < 0.55 ? t * 3 : (1 - t) * 5;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  let axeAngle: number;
  if (t < 0.35) {
    axeAngle = lerp(0.3, -2.0, t / 0.35);
  } else if (t < 0.75) {
    axeAngle = lerp(-2.0, 1.8, (t - 0.35) / 0.4);
  } else {
    axeAngle = lerp(1.8, 0.5, (t - 0.75) / 0.25);
  }

  const armReach = t < 0.55 ? t * 6 : (1 - t) * 8;

  drawShadow(g, CX + lean, gy2, 14 + lean, 4);

  const lunge = t > 0.3 && t < 0.8 ? 4 : 0;
  drawBoots(g, CX, gy2, -1, lunge);
  drawTrousers(g, CX, legTop, legH, -1, lunge);

  drawNakedTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.7);

  const aArmX = CX + 7 + lean + armReach;
  const aArmY = torsoTop + 3;
  drawArm(g, CX + 5 + lean, torsoTop + 4, aArmX - 2, aArmY + 2);
  drawArm(g, CX - 5 + lean, torsoTop + 4, aArmX + 2, aArmY - 2);
  drawTwoHandedAxe(g, aArmX, aArmY, axeAngle, 22);

  if (t >= 0.4 && t <= 0.7) {
    const trailAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    g.moveTo(aArmX + 2, aArmY - 12)
      .bezierCurveTo(
        aArmX + 10,
        aArmY - 5,
        aArmX + 12,
        aArmY + 5,
        aArmX + 8,
        aArmY + 12,
      )
      .stroke({ color: 0xff4422, width: 2, alpha: trailAlpha * 0.5 });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX, gy2);
  drawBoots(g, CX, gy2, -1, 1);
  drawTrousers(g, CX, legTop, legH, -1, 1);
  drawNakedTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop);

  drawArm(g, CX + 5, torsoTop + 3, CX + 3, torsoTop - 5);
  drawArm(g, CX - 5, torsoTop + 3, CX - 1, torsoTop - 4);
  drawTwoHandedAxe(g, CX + 2, torsoTop - 6, -0.1, 20);

  const glowR = 8 + pulse * 5;
  g.circle(CX + 2, torsoTop - 14, glowR).fill({
    color: 0xff4422,
    alpha: 0.1 + pulse * 0.1,
  });
  g.circle(CX + 2, torsoTop - 14, glowR * 0.5).fill({
    color: 0xffaa44,
    alpha: 0.15 + pulse * 0.1,
  });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const gy2 = GY;
  const legH = 8;
  const torsoH = 12;
  const legTop = gy2 - 5 - legH;

  const fallAngle = t * 1.2;
  const fallX = t * 10;
  const dropY = t * t * 8;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.5, gy2, 14 + t * 4, 4);

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.2, gy2, t * 2, -t * 1, squash);
  if (t < 0.7) {
    drawTrousers(
      g,
      CX + fallX * 0.2,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
      -t * 1,
    );
  }

  drawNakedTorso(
    g,
    CX + fallX * 0.5,
    torsoTop,
    torsoH * (1 - t * 0.2),
    fallAngle * 3,
  );
  drawHelm(g, CX + fallX * 0.5, helmTop + dropY * 0.5, fallAngle * 4);

  const axeDropX = CX + 12 + t * 8;
  const axeDropY = torsoTop + torsoH * 0.5 + t * 6;
  const axeDropAngle = 0.3 + t * 2.5;
  if (t < 0.85) {
    drawTwoHandedAxe(g, axeDropX, axeDropY, axeDropAngle, 18 * (1 - t * 0.3));
  }

  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.5 + 5,
      torsoTop + 5,
      CX + fallX * 0.5 + 10,
      torsoTop + torsoH - 2,
      COL_SKIN,
    );
  }
}

type StateFrameGenerator = (g: Graphics, frame: number) => void;

const STATE_GENERATORS: Record<
  UnitState,
  { gen: StateFrameGenerator; count: number }
> = {
  [UnitState.IDLE]: { gen: generateIdleFrames, count: 8 },
  [UnitState.MOVE]: { gen: generateMoveFrames, count: 8 },
  [UnitState.ATTACK]: { gen: generateAttackFrames, count: 7 },
  [UnitState.CAST]: { gen: generateCastFrames, count: 6 },
  [UnitState.DIE]: { gen: generateDieFrames, count: 7 },
};

export function generateBerserkerFrames(
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
