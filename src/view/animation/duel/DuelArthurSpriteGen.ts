// ---------------------------------------------------------------------------
// Duel mode – Arthur (Swordsman) procedural fighter sprites
// ---------------------------------------------------------------------------
// Full plate armor, great helm, longsword + kite shield, crimson cape
// 96×128 px frames, right-facing only (flip for left)
// ---------------------------------------------------------------------------

import { Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { DuelFighterState } from "../../../types";

const F_W = 96;
const F_H = 128;
const CX = F_W / 2;       // center X
const GY = F_H - 8;       // ground Y (feet)

// Palette
const COL_PLATE = 0x8899aa;
const COL_PLATE_DK = 0x667788;
const COL_PLATE_HI = 0xaabbcc;
const COL_GOLD = 0xddaa33;
const COL_CAPE = 0xcc2222;
const COL_CAPE_DK = 0x991111;
const COL_SWORD = 0xccccdd;
const COL_SWORD_HI = 0xeeeeff;
const COL_GUARD = 0xddaa33;
const COL_SHIELD = 0x8b4513;
const COL_SHIELD_HI = 0xa0522d;
const COL_VISOR = 0x223344;
const COL_SHADOW = 0x000000;

// ---- State generators ------------------------------------------------------

type FrameGen = (g: Graphics, frame: number) => void;

const STATE_GENS: Record<DuelFighterState, { gen: FrameGen; count: number }> = {
  [DuelFighterState.IDLE]:         { gen: _idle, count: 6 },
  [DuelFighterState.WALK_FORWARD]: { gen: _walkForward, count: 6 },
  [DuelFighterState.WALK_BACK]:    { gen: _walkBack, count: 6 },
  [DuelFighterState.CROUCH]:       { gen: _crouch, count: 4 },
  [DuelFighterState.CROUCH_IDLE]:  { gen: _crouch, count: 4 },
  [DuelFighterState.JUMP]:         { gen: _jump, count: 5 },
  [DuelFighterState.JUMP_FORWARD]: { gen: _jump, count: 5 },
  [DuelFighterState.JUMP_BACK]:    { gen: _jump, count: 5 },
  [DuelFighterState.ATTACK]:       { gen: _attack, count: 6 },
  [DuelFighterState.BLOCK_STAND]:  { gen: _blockStand, count: 4 },
  [DuelFighterState.BLOCK_CROUCH]: { gen: _blockCrouch, count: 4 },
  [DuelFighterState.HIT_STUN]:     { gen: _hitStun, count: 4 },
  [DuelFighterState.KNOCKDOWN]:    { gen: _knockdown, count: 5 },
  [DuelFighterState.GET_UP]:       { gen: _getUp, count: 4 },
  [DuelFighterState.GRAB]:         { gen: _grab, count: 4 },
  [DuelFighterState.GRABBED]:      { gen: _grabbed, count: 4 },
  [DuelFighterState.VICTORY]:      { gen: _victory, count: 6 },
  [DuelFighterState.DEFEAT]:       { gen: _defeat, count: 5 },
};

// ---- Public entry point ----------------------------------------------------

export function generateDuelArthurFrames(
  renderer: Renderer,
): Map<DuelFighterState, Texture[]> {
  const result = new Map<DuelFighterState, Texture[]>();

  for (const [stateStr, { gen, count }] of Object.entries(STATE_GENS)) {
    const state = stateStr as DuelFighterState;
    const textures: Texture[] = [];

    for (let i = 0; i < count; i++) {
      const g = new Graphics();
      gen(g, i);
      const rt = RenderTexture.create({ width: F_W, height: F_H });
      renderer.render({ container: g, target: rt });
      textures.push(rt);
      g.destroy();
    }

    result.set(state, textures);
  }

  return result;
}

// ---- Drawing helpers -------------------------------------------------------

function _drawShadow(g: Graphics, cx: number, gy: number): void {
  g.ellipse(cx, gy + 2, 18, 5);
  g.fill({ color: COL_SHADOW, alpha: 0.25 });
}

function _drawBody(
  g: Graphics,
  cx: number, gy: number,
  bob: number,
  lean: number,
  stanceL: number, stanceR: number,
  crouching: boolean,
): void {
  const bodyH = crouching ? 45 : 65;
  const headY = gy - bodyH - 14 + bob;
  const shoulderY = gy - bodyH + bob;

  // Legs
  const legLen = crouching ? 15 : 25;
  g.moveTo(cx - 6, gy - legLen + bob).lineTo(cx - 6 + stanceL, gy);
  g.stroke({ color: COL_PLATE_DK, width: 5 });
  g.moveTo(cx + 6, gy - legLen + bob).lineTo(cx + 6 + stanceR, gy);
  g.stroke({ color: COL_PLATE_DK, width: 5 });

  // Boots
  g.roundRect(cx - 9 + stanceL, gy - 5, 7, 5, 1);
  g.fill({ color: COL_PLATE_DK });
  g.roundRect(cx + 3 + stanceR, gy - 5, 7, 5, 1);
  g.fill({ color: COL_PLATE_DK });

  // Cape (behind body)
  const capeLen = crouching ? 20 : 35;
  g.moveTo(cx - 8 + lean, shoulderY + 5);
  g.lineTo(cx - 12 + lean * 0.5, shoulderY + capeLen);
  g.lineTo(cx + 4 + lean * 0.5, shoulderY + capeLen + 3);
  g.lineTo(cx - 2 + lean, shoulderY + 5);
  g.closePath();
  g.fill({ color: COL_CAPE });
  // Cape highlight
  g.moveTo(cx - 6 + lean, shoulderY + 8);
  g.lineTo(cx - 10 + lean * 0.5, shoulderY + capeLen - 5);
  g.stroke({ color: COL_CAPE_DK, width: 1, alpha: 0.5 });

  // Torso (plate armor)
  g.roundRect(cx - 12 + lean, shoulderY, 24, bodyH - legLen - 10, 3);
  g.fill({ color: COL_PLATE });
  g.stroke({ color: COL_PLATE_DK, width: 1 });
  // Gold trim
  g.rect(cx - 12 + lean, shoulderY + 5, 24, 3);
  g.fill({ color: COL_GOLD, alpha: 0.6 });

  // Pauldrons
  g.ellipse(cx - 14 + lean, shoulderY + 3, 6, 5);
  g.fill({ color: COL_PLATE_HI });
  g.stroke({ color: COL_PLATE_DK, width: 0.8 });
  g.ellipse(cx + 14 + lean, shoulderY + 3, 6, 5);
  g.fill({ color: COL_PLATE_HI });
  g.stroke({ color: COL_PLATE_DK, width: 0.8 });

  // Head / Great Helm
  g.roundRect(cx - 8 + lean, headY, 16, 18, 3);
  g.fill({ color: COL_PLATE });
  g.stroke({ color: COL_PLATE_DK, width: 1 });
  // Visor slit
  g.rect(cx - 5 + lean, headY + 8, 10, 3);
  g.fill({ color: COL_VISOR });
  // Gold crown band
  g.rect(cx - 8 + lean, headY + 3, 16, 3);
  g.fill({ color: COL_GOLD });
  // Plume
  g.ellipse(cx + lean, headY - 3, 3, 5);
  g.fill({ color: COL_CAPE });
}

function _drawSword(
  g: Graphics,
  _cx: number, _gy: number,
  handX: number, handY: number,
  angle: number,
  bladeLen: number,
): void {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const tipX = handX + sin * bladeLen;
  const tipY = handY - cos * bladeLen;

  // Blade
  g.moveTo(handX, handY).lineTo(tipX, tipY);
  g.stroke({ color: COL_SWORD, width: 3 });
  // Highlight
  g.moveTo(handX + 1, handY).lineTo(tipX + 1, tipY);
  g.stroke({ color: COL_SWORD_HI, width: 1, alpha: 0.6 });
  // Crossguard
  g.rect(handX - 5, handY - 1, 10, 3);
  g.fill({ color: COL_GUARD });
  // Pommel
  g.circle(handX, handY + 4, 2);
  g.fill({ color: COL_GUARD });
}

function _drawShield(
  g: Graphics,
  shieldX: number, shieldY: number,
  small: boolean,
): void {
  const sw = small ? 10 : 14;
  const sh = small ? 16 : 22;
  g.roundRect(shieldX - sw / 2, shieldY, sw, sh, 3);
  g.fill({ color: COL_SHIELD });
  g.stroke({ color: COL_SHIELD_HI, width: 1 });
  // Cross emblem
  g.rect(shieldX - 1, shieldY + 3, 2, sh - 6);
  g.fill({ color: COL_GOLD, alpha: 0.7 });
  g.rect(shieldX - sw / 2 + 2, shieldY + sh / 2 - 1, sw - 4, 2);
  g.fill({ color: COL_GOLD, alpha: 0.7 });
}

// ---- Animation states ------------------------------------------------------

function _idle(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);

  // Sword arm (right)
  const swordX = CX + 18;
  const swordY = GY - 50 + bob;
  _drawSword(g, CX, GY, swordX, swordY, 0.3, 22);

  // Shield arm (left)
  _drawShield(g, CX - 20, GY - 55 + bob, false);
}

function _walkForward(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;
  const stride = Math.sin(t * Math.PI * 2) * 4;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, 3, -stride, stride, false);

  const swordX = CX + 20;
  const swordY = GY - 48 + bob;
  _drawSword(g, CX, GY, swordX, swordY, 0.2 + Math.sin(t * Math.PI) * 0.1, 22);
  _drawShield(g, CX - 18, GY - 53 + bob, false);
}

function _walkBack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  const stride = Math.sin(t * Math.PI * 2) * 3;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, -2, stride, -stride, false);

  const swordX = CX + 16;
  const swordY = GY - 50 + bob;
  _drawSword(g, CX, GY, swordX, swordY, 0.4, 22);
  _drawShield(g, CX - 22, GY - 55 + bob, false);
}

function _crouch(g: Graphics, frame: number): void {
  const t = frame / 4;
  const bob = Math.sin(t * Math.PI * 2) * 0.5;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, 0, -2, 2, true);

  const swordX = CX + 16;
  const swordY = GY - 30 + bob;
  _drawSword(g, CX, GY, swordX, swordY, 0.8, 20);
  _drawShield(g, CX - 18, GY - 35 + bob, true);
}

function _jump(g: Graphics, frame: number): void {
  const t = frame / 5;
  const jumpY = -Math.sin(t * Math.PI) * 25;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY + jumpY, 0, 0, -3, 3, false);

  const swordX = CX + 18;
  const swordY = GY - 52 + jumpY;
  _drawSword(g, CX, GY + jumpY, swordX, swordY, -0.3, 22);
  _drawShield(g, CX - 20, GY - 55 + jumpY, false);
}

function _attack(g: Graphics, frame: number): void {
  // 6-frame attack: windup → raise → slash → follow-through → recover
  const phases = [0, 0.2, 0.4, 0.65, 0.85, 1.0];
  const t = phases[Math.min(frame, 5)];

  _drawShadow(g, CX, GY);

  const lean = t < 0.4 ? -3 : t < 0.85 ? 8 : 2;
  _drawBody(g, CX, GY, 0, lean, 0, 0, false);

  const swordX = CX + 18 + lean;
  const swordY = GY - 50;
  let angle: number;
  let bladeLen = 24;

  if (t < 0.2) {
    angle = 0.5;
  } else if (t < 0.4) {
    angle = -1.0; // raised overhead
  } else if (t < 0.65) {
    angle = 0.8; // slashing down
    bladeLen = 28;
    // Slash trail
    g.moveTo(swordX + 10, swordY - 20);
    g.lineTo(swordX + 30, swordY + 10);
    g.stroke({ color: COL_SWORD_HI, width: 2, alpha: 0.4 });
  } else if (t < 0.85) {
    angle = 1.5; // follow through
  } else {
    angle = 0.3;
  }

  _drawSword(g, CX, GY, swordX, swordY, angle, bladeLen);
  _drawShield(g, CX - 20, GY - 55, false);
}

function _blockStand(g: Graphics, frame: number): void {
  const t = frame / 4;
  const bob = Math.sin(t * Math.PI * 2) * 0.5;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, -2, 0, 0, false);

  // Shield raised in front
  _drawShield(g, CX + 5, GY - 60 + bob, false);
  // Sword held back
  _drawSword(g, CX, GY, CX - 10, GY - 45 + bob, 0.5, 20);
}

function _blockCrouch(g: Graphics, frame: number): void {
  const t = frame / 4;
  const bob = Math.sin(t * Math.PI * 2) * 0.5;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, -2, -2, 2, true);

  _drawShield(g, CX + 3, GY - 40 + bob, true);
  _drawSword(g, CX, GY, CX - 8, GY - 28 + bob, 0.6, 18);
}

function _hitStun(g: Graphics, frame: number): void {
  const t = frame / 4;
  const recoil = Math.sin(t * Math.PI) * 8;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, 0, -recoil, 0, 0, false);

  // Flash white on first frame
  if (frame === 0) {
    g.rect(CX - 15, GY - 80, 30, 70);
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }

  _drawSword(g, CX, GY, CX + 10 - recoil, GY - 40, 1.0, 20);
  _drawShield(g, CX - 18 - recoil, GY - 50, false);
}

function _knockdown(g: Graphics, frame: number): void {
  const t = frame / 5;
  const fallAngle = t * (Math.PI / 2);

  _drawShadow(g, CX, GY);

  // Falling body
  const bodyX = CX - Math.sin(fallAngle) * 10;
  const bodyY = GY - Math.cos(fallAngle) * 20;

  g.roundRect(bodyX - 25, bodyY - 8, 50, 16, 3);
  g.fill({ color: COL_PLATE });
  g.stroke({ color: COL_PLATE_DK, width: 1 });

  // Helm
  g.roundRect(bodyX + 20, bodyY - 6, 12, 12, 2);
  g.fill({ color: COL_PLATE });

  // Sword fallen
  g.moveTo(bodyX - 20, bodyY + 5).lineTo(bodyX - 35, bodyY - 5);
  g.stroke({ color: COL_SWORD, width: 2 });
}

function _getUp(g: Graphics, frame: number): void {
  const t = frame / 4;
  const rise = t;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, (1 - rise) * 10, -(1 - rise) * 5, 0, 0, rise < 0.5);

  _drawSword(g, CX, GY, CX + 15, GY - 30 - rise * 20, 0.4, 20);
  _drawShield(g, CX - 18, GY - 35 - rise * 20, true);
}

function _grab(g: Graphics, frame: number): void {
  const t = frame / 4;
  const reach = Math.sin(t * Math.PI) * 15;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, 0, reach * 0.5, 0, 0, false);

  // Reaching with shield
  _drawShield(g, CX + 20 + reach, GY - 50, false);
  _drawSword(g, CX, GY, CX - 10, GY - 45, 0.5, 20);
}

function _grabbed(g: Graphics, frame: number): void {
  const t = frame / 4;
  const shake = Math.sin(t * Math.PI * 4) * 3;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX + shake, GY, 0, -5, 0, 0, false);

  _drawSword(g, CX + shake, GY, CX + 12 + shake, GY - 40, 1.2, 18);
  _drawShield(g, CX - 22 + shake, GY - 50, false);
}

function _victory(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;

  _drawShadow(g, CX, GY);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);

  // Sword raised high
  _drawSword(g, CX, GY, CX + 5, GY - 65 + bob, -0.2, 26);
  _drawShield(g, CX - 22, GY - 55 + bob, false);

  // Crown glow
  g.circle(CX, GY - 85 + bob, 8);
  g.fill({ color: COL_GOLD, alpha: 0.2 });
}

function _defeat(g: Graphics, frame: number): void {
  _drawShadow(g, CX, GY);

  // Kneeling
  const kneel = Math.min(frame / 3, 1);
  g.roundRect(CX - 12, GY - 40 + kneel * 15, 24, 35 - kneel * 10, 3);
  g.fill({ color: COL_PLATE });
  g.stroke({ color: COL_PLATE_DK, width: 1 });

  // Head bowed
  g.roundRect(CX - 7, GY - 50 + kneel * 10, 14, 14, 2);
  g.fill({ color: COL_PLATE });
  g.rect(CX - 4, GY - 44 + kneel * 10, 8, 2);
  g.fill({ color: COL_VISOR });

  // Sword on ground
  g.moveTo(CX + 15, GY - 5).lineTo(CX + 35, GY - 3);
  g.stroke({ color: COL_SWORD, width: 2 });

  // Shield lowered
  _drawShield(g, CX - 15, GY - 20, true);
}
