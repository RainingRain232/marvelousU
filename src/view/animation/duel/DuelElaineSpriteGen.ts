// ---------------------------------------------------------------------------
// Duel mode – Elaine (Archer) procedural fighter sprites
// ---------------------------------------------------------------------------
// Green leather armor, hooded cloak, longbow, quiver on back, braided hair
// 96×128 px frames, right-facing only
// ---------------------------------------------------------------------------

import { Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { DuelFighterState } from "../../../types";

const F_W = 96;
const F_H = 128;
const CX = F_W / 2;
const GY = F_H - 8;

// Palette
const COL_LEATHER = 0x4a7a3a;
const COL_LEATHER_DK = 0x365a2a;
const COL_LEATHER_HI = 0x5a9a4a;
const COL_CLOAK = 0x2a5a2a;
const COL_CLOAK_DK = 0x1a3a1a;
const COL_SKIN = 0xddbb99;
const COL_HAIR = 0xbb7744;
const COL_HAIR_DK = 0x995533;
const COL_BOW = 0x8b5a2b;
const COL_BOW_DK = 0x6b3a1b;
const COL_STRING = 0xccccbb;
const COL_ARROW = 0xccbb88;
const COL_ARROW_TIP = 0xaaaaaa;
const COL_QUIVER = 0x6b4226;
const COL_BOOT = 0x5a3a1a;
const COL_SHADOW = 0x000000;

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

export function generateDuelElaineFrames(
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

function _drawShadow(g: Graphics): void {
  g.ellipse(CX, GY + 2, 15, 4);
  g.fill({ color: COL_SHADOW, alpha: 0.25 });
}

function _drawBody(
  g: Graphics,
  cx: number, gy: number,
  bob: number, lean: number,
  stanceL: number, stanceR: number,
  crouching: boolean,
): void {
  const bodyH = crouching ? 35 : 55;
  const headY = gy - bodyH - 12 + bob;
  const topY = gy - bodyH + bob;

  // Legs (slimmer than Arthur)
  const legLen = crouching ? 12 : 22;
  g.moveTo(cx - 5, gy - legLen + bob).lineTo(cx - 5 + stanceL, gy);
  g.stroke({ color: COL_LEATHER_DK, width: 4 });
  g.moveTo(cx + 5, gy - legLen + bob).lineTo(cx + 5 + stanceR, gy);
  g.stroke({ color: COL_LEATHER_DK, width: 4 });

  // Boots
  g.roundRect(cx - 8 + stanceL, gy - 4, 6, 4, 1);
  g.fill({ color: COL_BOOT });
  g.roundRect(cx + 2 + stanceR, gy - 4, 6, 4, 1);
  g.fill({ color: COL_BOOT });

  // Cloak (behind body)
  const cloakLen = crouching ? 15 : 28;
  g.moveTo(cx - 6 + lean, topY + 3);
  g.lineTo(cx - 10 + lean * 0.4, topY + cloakLen);
  g.lineTo(cx + 2 + lean * 0.4, topY + cloakLen + 2);
  g.lineTo(cx - 2 + lean, topY + 3);
  g.closePath();
  g.fill({ color: COL_CLOAK });
  g.stroke({ color: COL_CLOAK_DK, width: 0.5, alpha: 0.5 });

  // Torso (leather armor)
  g.roundRect(cx - 10 + lean, topY, 20, bodyH - legLen - 8, 3);
  g.fill({ color: COL_LEATHER });
  g.stroke({ color: COL_LEATHER_DK, width: 1 });
  // Leather detail
  g.rect(cx - 3 + lean, topY + 3, 6, bodyH - legLen - 12);
  g.fill({ color: COL_LEATHER_HI, alpha: 0.3 });

  // Quiver on back
  g.roundRect(cx - 14 + lean, topY + 2, 5, 25, 2);
  g.fill({ color: COL_QUIVER });
  g.stroke({ color: COL_QUIVER, width: 0.5 });
  // Arrow tips poking out
  g.moveTo(cx - 13 + lean, topY).lineTo(cx - 12 + lean, topY - 4);
  g.stroke({ color: COL_ARROW_TIP, width: 1 });
  g.moveTo(cx - 11 + lean, topY + 1).lineTo(cx - 10 + lean, topY - 3);
  g.stroke({ color: COL_ARROW_TIP, width: 1 });

  // Head
  g.circle(cx + lean, headY + 5, 7);
  g.fill({ color: COL_SKIN });

  // Eyes
  g.circle(cx - 2 + lean, headY + 4, 1);
  g.fill({ color: 0x336633 });
  g.circle(cx + 3 + lean, headY + 4, 1);
  g.fill({ color: 0x336633 });

  // Braided hair
  g.moveTo(cx - 6 + lean, headY + 2);
  g.quadraticCurveTo(cx - 10 + lean, headY + 10, cx - 8 + lean, headY + 20);
  g.stroke({ color: COL_HAIR, width: 3 });
  g.moveTo(cx - 6 + lean, headY + 2);
  g.quadraticCurveTo(cx - 10 + lean, headY + 10, cx - 8 + lean, headY + 20);
  g.stroke({ color: COL_HAIR_DK, width: 1, alpha: 0.5 });

  // Hood
  g.moveTo(cx - 7 + lean, headY);
  g.quadraticCurveTo(cx + lean, headY - 6, cx + 7 + lean, headY);
  g.stroke({ color: COL_CLOAK, width: 3 });
  g.moveTo(cx - 8 + lean, headY + 1);
  g.lineTo(cx - 10 + lean, headY + 8);
  g.stroke({ color: COL_CLOAK, width: 2 });
}

function _drawBow(
  g: Graphics,
  bowX: number, bowY: number,
  pull: number, // 0 = relaxed, 1 = fully drawn
): void {
  const bowLen = 28;
  const curve = 6 + pull * 3;

  // Bow limb (curved)
  g.moveTo(bowX, bowY - bowLen / 2);
  g.quadraticCurveTo(bowX + curve, bowY, bowX, bowY + bowLen / 2);
  g.stroke({ color: COL_BOW, width: 3 });
  g.moveTo(bowX, bowY - bowLen / 2);
  g.quadraticCurveTo(bowX + curve, bowY, bowX, bowY + bowLen / 2);
  g.stroke({ color: COL_BOW_DK, width: 1, alpha: 0.5 });

  // Bowstring
  const stringPull = pull * 10;
  g.moveTo(bowX, bowY - bowLen / 2);
  g.lineTo(bowX - stringPull, bowY);
  g.lineTo(bowX, bowY + bowLen / 2);
  g.stroke({ color: COL_STRING, width: 0.8 });

  // Arrow (if pulling)
  if (pull > 0.1) {
    const arrowLen = 16;
    g.moveTo(bowX - stringPull, bowY);
    g.lineTo(bowX - stringPull + arrowLen, bowY);
    g.stroke({ color: COL_ARROW, width: 1.2 });
    // Arrowhead
    g.moveTo(bowX - stringPull + arrowLen, bowY);
    g.lineTo(bowX - stringPull + arrowLen + 3, bowY - 2);
    g.lineTo(bowX - stringPull + arrowLen + 3, bowY + 2);
    g.closePath();
    g.fill({ color: COL_ARROW_TIP });
  }
}

// ---- States ----------------------------------------------------------------

function _idle(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);
  _drawBow(g, CX + 22, GY - 48 + bob, 0);
}

function _walkForward(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;
  const stride = Math.sin(t * Math.PI * 2) * 5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 3, -stride, stride, false);
  _drawBow(g, CX + 24, GY - 46 + bob, 0);
}

function _walkBack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  const stride = Math.sin(t * Math.PI * 2) * 4;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -2, stride, -stride, false);
  _drawBow(g, CX + 20, GY - 50 + bob, 0);
}

function _crouch(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, -2, 2, true);
  _drawBow(g, CX + 18, GY - 34 + bob, 0);
}

function _jump(g: Graphics, frame: number): void {
  const t = frame / 5;
  const jumpY = -Math.sin(t * Math.PI) * 28;
  _drawShadow(g);
  _drawBody(g, CX, GY + jumpY, 0, 0, -4, 4, false);
  _drawBow(g, CX + 22, GY - 48 + jumpY, 0);
}

function _attack(g: Graphics, frame: number): void {
  // 6-frame: aim → draw → draw more → release → snap → recover
  const phases = [0, 0.15, 0.35, 0.55, 0.75, 1.0];
  const t = phases[Math.min(frame, 5)];
  const lean = t < 0.55 ? 2 : t < 0.75 ? 5 : 1;

  _drawShadow(g);
  _drawBody(g, CX, GY, 0, lean, 0, 0, false);

  let pull: number;
  if (t < 0.15) pull = 0.2;
  else if (t < 0.35) pull = 0.5;
  else if (t < 0.55) pull = 0.9;
  else if (t < 0.75) pull = -0.1; // released!
  else pull = 0;

  _drawBow(g, CX + 20 + lean, GY - 50, Math.max(0, pull));

  // Arrow flying away on release
  if (t >= 0.55 && t < 0.85) {
    const arrowDist = (t - 0.55) * 120;
    g.moveTo(CX + 35 + arrowDist, GY - 50);
    g.lineTo(CX + 50 + arrowDist, GY - 50);
    g.stroke({ color: COL_ARROW, width: 1.2 });
    // Tip
    g.moveTo(CX + 50 + arrowDist, GY - 50);
    g.lineTo(CX + 53 + arrowDist, GY - 52);
    g.lineTo(CX + 53 + arrowDist, GY - 48);
    g.closePath();
    g.fill({ color: COL_ARROW_TIP });
  }
}

function _blockStand(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -3, 0, 0, false);
  // Bow held horizontally as guard
  g.moveTo(CX + 5, GY - 60 + bob);
  g.lineTo(CX + 5, GY - 30 + bob);
  g.stroke({ color: COL_BOW, width: 3 });
  // Forearm guard
  g.roundRect(CX + 8, GY - 50 + bob, 8, 15, 2);
  g.fill({ color: COL_LEATHER, alpha: 0.7 });
}

function _blockCrouch(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -2, -2, 2, true);
  g.moveTo(CX + 5, GY - 40 + bob);
  g.lineTo(CX + 5, GY - 18 + bob);
  g.stroke({ color: COL_BOW, width: 3 });
}

function _hitStun(g: Graphics, frame: number): void {
  const recoil = Math.sin((frame / 4) * Math.PI) * 8;
  _drawShadow(g);
  _drawBody(g, CX, GY, 0, -recoil, 0, 0, false);
  if (frame === 0) {
    g.rect(CX - 12, GY - 70, 24, 60);
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }
  _drawBow(g, CX + 15 - recoil, GY - 45, 0);
}

function _knockdown(g: Graphics, frame: number): void {
  const t = frame / 5;
  _drawShadow(g);
  // Fallen
  g.roundRect(CX - 22, GY - 10 + t * 3, 44, 12, 2);
  g.fill({ color: COL_LEATHER });
  g.stroke({ color: COL_LEATHER_DK, width: 1 });
  // Hood/head
  g.circle(CX + 18, GY - 8, 6);
  g.fill({ color: COL_CLOAK });
  // Bow fallen
  g.moveTo(CX - 20, GY - 15);
  g.quadraticCurveTo(CX - 25, GY - 5, CX - 20, GY + 2);
  g.stroke({ color: COL_BOW, width: 2.5 });
}

function _getUp(g: Graphics, frame: number): void {
  const rise = frame / 4;
  _drawShadow(g);
  _drawBody(g, CX, GY, (1 - rise) * 8, -(1 - rise) * 4, 0, 0, rise < 0.5);
  _drawBow(g, CX + 18, GY - 30 - rise * 20, 0);
}

function _grab(g: Graphics, frame: number): void {
  const reach = Math.sin((frame / 4) * Math.PI) * 12;
  _drawShadow(g);
  _drawBody(g, CX, GY, 0, reach * 0.4, 0, 0, false);
  // Reaching with string
  g.moveTo(CX + 20 + reach, GY - 55);
  g.quadraticCurveTo(CX + 30 + reach, GY - 45, CX + 25 + reach, GY - 35);
  g.stroke({ color: COL_STRING, width: 1.5 });
  _drawBow(g, CX + 15, GY - 48, 0);
}

function _grabbed(g: Graphics, frame: number): void {
  const shake = Math.sin((frame / 4) * Math.PI * 4) * 3;
  _drawShadow(g);
  _drawBody(g, CX + shake, GY, 0, -4, 0, 0, false);
  _drawBow(g, CX + 18 + shake, GY - 48, 0);
}

function _victory(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);
  // Bow raised triumphantly
  _drawBow(g, CX + 10, GY - 70 + bob, 0);
  // Victory arrow shot upward
  const arrowY = GY - 80 + bob - t * 20;
  g.moveTo(CX + 10, arrowY).lineTo(CX + 10, arrowY - 10);
  g.stroke({ color: COL_ARROW, width: 1 });
}

function _defeat(g: Graphics, frame: number): void {
  _drawShadow(g);
  const kneel = Math.min(frame / 3, 1);
  // Kneeling
  g.roundRect(CX - 8, GY - 25 + kneel * 8, 16, 25 - kneel * 5, 2);
  g.fill({ color: COL_LEATHER });
  g.stroke({ color: COL_LEATHER_DK, width: 1 });
  // Head bowed
  g.circle(CX, GY - 30 + kneel * 8, 6);
  g.fill({ color: COL_SKIN });
  // Hood drooping
  g.moveTo(CX - 6, GY - 33 + kneel * 8);
  g.quadraticCurveTo(CX, GY - 38 + kneel * 8, CX + 6, GY - 33 + kneel * 8);
  g.stroke({ color: COL_CLOAK, width: 2.5 });
  // Bow on ground
  g.moveTo(CX + 15, GY - 2);
  g.quadraticCurveTo(CX + 20, GY - 10, CX + 15, GY - 18);
  g.stroke({ color: COL_BOW, width: 2 });
}
