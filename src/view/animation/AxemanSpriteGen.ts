// Procedural sprite generator for the Axeman unit type.
//
// Based on the Swordsman but with an axe instead of sword, and no shield.
// 48×48 pixels per frame.

import { Graphics, RenderTexture, type Renderer, Texture } from "pixi.js";
import { UnitState } from "@/types";

const F = 48;
const CX = F / 2;
const GY = F - 4;

// Palette — steel armor with reddish-brown leather accents
const COL_SKIN = 0xd4a574;
const COL_SKIN_DARK = 0xb8875a;
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_HI = 0xaabbcc;
const COL_ARMOR_DK = 0x556677;
const COL_HELM = 0x778899;
const COL_HELM_HI = 0x99aabb;
const COL_VISOR = 0x1a1a2e;
const COL_CAPE = 0x8b2222;
const COL_CAPE_DK = 0x6b1111;
const COL_AXE_BLADE = 0x666666;
const COL_AXE_BLADE_HI = 0x888888;
const COL_AXE_BLADE_DK = 0x444444;
const COL_AXE_HANDLE = 0x5a3a1a;
const COL_AXE_HANDLE_DK = 0x3a2810;
const COL_BOOT = 0x443322;
const COL_BOOT_DK = 0x332211;
const COL_SHADOW = 0x000000;

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

function drawLegs(
  g: Graphics,
  cx: number,
  legTop: number,
  legH: number,
  stanceL: number,
  stanceR: number,
): void {
  g.rect(cx - 5 + stanceL, legTop, 4, legH).fill({ color: COL_ARMOR_DK });
  g.rect(cx + 1 + stanceR, legTop, 4, legH).fill({ color: COL_ARMOR_DK });
}

function drawTorso(
  g: Graphics,
  cx: number,
  torsoTop: number,
  torsoH: number,
  tilt = 0,
): void {
  const tw = 14;
  const x = cx - tw / 2 + tilt;
  g.roundRect(x, torsoTop, tw, torsoH, 2)
    .fill({ color: COL_ARMOR })
    .stroke({ color: COL_ARMOR_DK, width: 0.7 });
  for (let row = 2; row < torsoH - 1; row += 3) {
    g.moveTo(x + 2, torsoTop + row)
      .lineTo(x + tw - 2, torsoTop + row)
      .stroke({ color: COL_ARMOR_HI, width: 0.3, alpha: 0.5 });
  }
  g.ellipse(x + 1, torsoTop + 2, 4, 3).fill({ color: COL_ARMOR_HI });
  g.ellipse(x + tw - 1, torsoTop + 2, 4, 3).fill({ color: COL_ARMOR_HI });
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

function drawCape(
  g: Graphics,
  cx: number,
  capeTop: number,
  capeH: number,
  wave: number,
): void {
  const cw = 10;
  const x = cx - cw / 2 - 3;
  g.moveTo(x, capeTop)
    .lineTo(x + cw, capeTop)
    .lineTo(x + cw + wave * 3, capeTop + capeH)
    .lineTo(x + wave * 2, capeTop + capeH)
    .closePath()
    .fill({ color: COL_CAPE })
    .stroke({ color: COL_CAPE_DK, width: 0.5 });
}

/** Battle axe — large blade on wooden handle */
function drawAxe(
  g: Graphics,
  bladeX: number,
  bladeY: number,
  angle: number,
  swing = 0,
): void {
  const cos = Math.cos(angle + swing);
  const sin = Math.sin(angle + swing);

  const handleLen = 20;
  const handleEndX = bladeX + sin * handleLen;
  const handleEndY = bladeY - cos * handleLen;

  g.moveTo(bladeX, bladeY)
    .lineTo(handleEndX, handleEndY)
    .stroke({ color: COL_AXE_HANDLE, width: 2.5 });
  g.moveTo(bladeX + cos * 0.4, bladeY + sin * 0.4)
    .lineTo(handleEndX + cos * 0.4, handleEndY + sin * 0.4)
    .stroke({ color: COL_AXE_HANDLE_DK, width: 0.5 });

  const bladeCenterX = handleEndX;
  const bladeCenterY = handleEndY;
  const bladeW = 8;
  const bladeH = 12;

  const bx1 = bladeCenterX + cos * bladeW - sin * bladeH;
  const by1 = bladeCenterY + sin * bladeW + cos * bladeH;
  const bx2 = bladeCenterX + cos * bladeW + sin * bladeH;
  const by2 = bladeCenterY + sin * bladeW - cos * bladeH;
  const bx3 = bladeCenterX - cos * 2;
  const by3 = bladeCenterY - sin * 2;

  g.moveTo(bx1, by1)
    .lineTo(bladeCenterX + cos * 3, bladeCenterY + sin * 3)
    .lineTo(bx2, by2)
    .lineTo(bx3, by3)
    .closePath()
    .fill({ color: COL_AXE_BLADE });

  g.moveTo(bx1, by1)
    .lineTo(bladeCenterX + cos * 3, bladeCenterY + sin * 3)
    .lineTo(bx3, by3)
    .closePath()
    .fill({ color: COL_AXE_BLADE_HI });

  const bx4 = bladeCenterX - cos * bladeW - sin * bladeH;
  const by4 = bladeCenterY - sin * bladeW + cos * bladeH;
  const bx5 = bladeCenterX - cos * bladeW + sin * bladeH;
  const by5 = bladeCenterY - sin * bladeW - cos * bladeH;

  g.moveTo(bx4, by4)
    .lineTo(bladeCenterX - cos * 3, bladeCenterY - sin * 3)
    .lineTo(bx5, by5)
    .lineTo(bx3, by3)
    .closePath()
    .fill({ color: COL_AXE_BLADE_DK });
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

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 + bob;
  const helmTop = torsoTop - 9 + bob;

  const capeWave = (t - 0.5) * 0.5;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, 0, 0);
  drawLegs(g, CX, legTop, legH, 0, 0);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop, 0);

  drawArm(g, CX + 6, torsoTop + 3, CX + 9, torsoTop + 7);
  drawAxe(g, CX + 9, torsoTop + 7, -0.2 + t * 0.05);
}

function generateMoveFrames(g: Graphics, frame: number): void {
  const t = frame / 8;
  const walkCycle = Math.sin(t * Math.PI * 2);
  const bob = Math.abs(walkCycle) * 1.5;

  const legH = 9;
  const torsoH = 12;
  const stanceL = Math.round(walkCycle * 2);
  const stanceR = Math.round(-walkCycle * 2);
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2 - Math.round(bob * 0.4);
  const helmTop = torsoTop - 9;

  const capeWave = -walkCycle * 1.0;

  drawShadow(g, CX, GY, 14 + Math.abs(walkCycle), 4);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, capeWave);
  drawBoots(g, CX, GY, stanceL, stanceR);
  drawLegs(g, CX, legTop, legH, stanceL, stanceR);
  drawTorso(g, CX, torsoTop, torsoH, walkCycle * 0.3);
  drawHelm(g, CX, helmTop, walkCycle * 0.3);

  drawArm(g, CX + 6, torsoTop + 3, CX + 9 + walkCycle * 0.5, torsoTop + 7);
  drawAxe(g, CX + 9 + walkCycle * 0.5, torsoTop + 7, -0.15 + walkCycle * 0.1);
}

function generateAttackFrames(g: Graphics, frame: number): void {
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 0.9, 1.0];
  const t = phases[Math.min(frame, 6)];

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  const lean = t < 0.55 ? t * 3.5 : (1 - t) * 5.5;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  let axeSwing: number;
  if (t < 0.2) {
    axeSwing = lerp(-0.4, -1.3, t / 0.2);
  } else if (t < 0.55) {
    axeSwing = lerp(-1.3, 1.0, (t - 0.2) / 0.35);
  } else if (t < 0.8) {
    axeSwing = lerp(1.0, 0.4, (t - 0.55) / 0.25);
  } else {
    axeSwing = lerp(0.4, -0.4, (t - 0.8) / 0.2);
  }

  const lunge = t > 0.3 && t < 0.85 ? 4 : 0;

  drawShadow(g, CX + lean, GY, 14 + lean, 4);
  drawCape(g, CX + lean * 0.2, torsoTop + 2, legH + torsoH - 2, -lean * 0.5);

  drawBoots(g, CX, GY, -1, lunge);
  drawLegs(g, CX, legTop, legH, -1, lunge);
  drawTorso(g, CX, torsoTop, torsoH, lean);
  drawHelm(g, CX, helmTop, lean * 0.6);

  const armReach = t > 0.2 && t < 0.8 ? (t - 0.2) * 5 : 0;
  const sArmX = CX + 7 + lean + armReach;
  const sArmY = torsoTop + 4;
  drawArm(g, CX + 6 + lean, torsoTop + 3, sArmX, sArmY);
  drawAxe(g, sArmX, sArmY, -0.2, axeSwing);

  if (t >= 0.4 && t <= 0.7) {
    const impactAlpha = 1 - Math.abs(t - 0.55) / 0.15;
    const axeX = sArmX + Math.sin(-0.2 + axeSwing) * 20;
    const axeY = sArmY - Math.cos(-0.2 + axeSwing) * 20;
    g.circle(axeX, axeY, 7).fill({ color: 0xffffff, alpha: impactAlpha * 0.4 });
    g.circle(axeX, axeY, 4).fill({
      color: COL_AXE_BLADE_HI,
      alpha: impactAlpha * 0.3,
    });
  }
}

function generateCastFrames(g: Graphics, frame: number): void {
  const t = frame / 5;
  const pulse = Math.sin(t * Math.PI * 2) * 0.5 + 0.5;

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;
  const torsoTop = legTop - torsoH + 2;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX, GY);
  drawCape(g, CX, torsoTop + 2, legH + torsoH - 2, pulse * 0.3 - 0.15);
  drawBoots(g, CX, GY, -1, 1);
  drawLegs(g, CX, legTop, legH, -1, 1);
  drawTorso(g, CX, torsoTop, torsoH);
  drawHelm(g, CX, helmTop, 0);

  drawArm(g, CX + 6, torsoTop + 3, CX + 9, torsoTop + 6);
  drawAxe(g, CX + 9, torsoTop + 6, -0.2 + pulse * 0.1);

  const glowR = 8 + pulse * 3;
  g.circle(CX, torsoTop - 2, glowR).fill({
    color: 0xffffff,
    alpha: 0.05 + pulse * 0.05,
  });
}

function generateDieFrames(g: Graphics, frame: number): void {
  const t = frame / 6;

  const legH = 9;
  const torsoH = 12;
  const legTop = GY - 5 - legH;

  const fallAngle = t * 1.0;
  const fallX = t * 8;
  const dropY = t * t * 10;

  const torsoTop = legTop - torsoH + 2 + dropY;
  const helmTop = torsoTop - 9;

  drawShadow(g, CX + fallX * 0.5, GY, 14 + t * 4, 4);
  drawCape(
    g,
    CX + fallX * 0.2,
    torsoTop + 2,
    (legH + torsoH - 2) * (1 - t * 0.3),
    t * 1.5,
  );

  const squash = Math.round(t * 3);
  drawBoots(g, CX + fallX * 0.2, GY, t * 2, -t, squash);
  if (t < 0.7) {
    drawLegs(
      g,
      CX + fallX * 0.2,
      legTop + dropY * 0.5,
      legH - squash,
      t * 2,
      -t,
    );
  }

  drawTorso(
    g,
    CX + fallX * 0.4,
    torsoTop,
    torsoH * (1 - t * 0.15),
    fallAngle * 2.5,
  );
  drawHelm(g, CX + fallX * 0.4, helmTop + dropY * 0.5, fallAngle * 3);

  if (t < 0.85) {
    const adx = CX + 12 + t * 10;
    const ady = torsoTop + torsoH * 0.3 + t * 8;
    drawAxe(g, adx, ady, 0.5 + t * 2);
  }

  if (t > 0.5) {
    drawArm(
      g,
      CX + fallX * 0.4 + 5,
      torsoTop + 4,
      CX + fallX * 0.4 + 8,
      torsoTop + 7,
      COL_ARMOR,
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

export function generateAxemanFrames(
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
