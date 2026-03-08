// ---------------------------------------------------------------------------
// Duel mode – Merlin (Mage) procedural fighter sprites
// ---------------------------------------------------------------------------
// Long blue/purple robes, pointed hat, gnarled staff with crystal, long beard
// 96×128 px frames, right-facing only
// ---------------------------------------------------------------------------

import { Graphics, RenderTexture, type Renderer, type Texture } from "pixi.js";
import { DuelFighterState } from "../../../types";

const F_W = 96;
const F_H = 128;
const CX = F_W / 2;
const GY = F_H - 8;

// Palette
const COL_ROBE = 0x2233aa;
const COL_ROBE_DK = 0x112277;
const COL_ROBE_HI = 0x4455cc;
const COL_HAT = 0x1a1a66;
const COL_HAT_BAND = 0xddaa33;
const COL_STAFF = 0x6b4226;
const COL_STAFF_DK = 0x4a2e17;
const COL_CRYSTAL = 0x88ccff;
const COL_CRYSTAL_HI = 0xeeffff;
const COL_BEARD = 0xcccccc;
const COL_SKIN = 0xddbb99;
const COL_MAGIC = 0x6688ff;
const COL_MAGIC_HI = 0xaaccff;
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

export function generateDuelMerlinFrames(
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
  g.ellipse(CX, GY + 2, 16, 4);
  g.fill({ color: COL_SHADOW, alpha: 0.25 });
}

function _drawBody(
  g: Graphics,
  cx: number, gy: number,
  bob: number, lean: number,
  stanceL: number, stanceR: number,
  crouching: boolean,
): void {
  const robeH = crouching ? 40 : 60;
  const headY = gy - robeH - 12 + bob;
  const topY = gy - robeH + bob;

  // Robe (main body - triangular, wider at bottom)
  const robeTopW = 10;
  const robeBotW = crouching ? 18 : 22;
  g.moveTo(cx - robeTopW + lean, topY);
  g.lineTo(cx - robeBotW + lean * 0.3 + stanceL, gy);
  g.lineTo(cx + robeBotW + lean * 0.3 + stanceR, gy);
  g.lineTo(cx + robeTopW + lean, topY);
  g.closePath();
  g.fill({ color: COL_ROBE });
  g.stroke({ color: COL_ROBE_DK, width: 1 });

  // Robe trim
  g.moveTo(cx - robeBotW + 2 + lean * 0.3 + stanceL, gy - 2);
  g.lineTo(cx + robeBotW - 2 + lean * 0.3 + stanceR, gy - 2);
  g.stroke({ color: COL_ROBE_HI, width: 1.5, alpha: 0.4 });

  // Belt/sash
  g.rect(cx - robeTopW + lean, topY + 18, robeTopW * 2, 3);
  g.fill({ color: COL_HAT_BAND });

  // Head (face)
  g.circle(cx + lean, headY + 6, 8);
  g.fill({ color: COL_SKIN });

  // Beard
  g.moveTo(cx - 5 + lean, headY + 10);
  g.lineTo(cx - 3 + lean, headY + 22);
  g.lineTo(cx + 3 + lean, headY + 22);
  g.lineTo(cx + 5 + lean, headY + 10);
  g.closePath();
  g.fill({ color: COL_BEARD });

  // Eyes (dots)
  g.circle(cx - 3 + lean, headY + 5, 1);
  g.fill({ color: 0x222222 });
  g.circle(cx + 3 + lean, headY + 5, 1);
  g.fill({ color: 0x222222 });

  // Pointed hat
  g.moveTo(cx + lean, headY - 22);
  g.lineTo(cx - 10 + lean, headY);
  g.lineTo(cx + 10 + lean, headY);
  g.closePath();
  g.fill({ color: COL_HAT });
  // Hat band
  g.moveTo(cx - 10 + lean, headY);
  g.lineTo(cx + 10 + lean, headY);
  g.stroke({ color: COL_HAT_BAND, width: 2 });
  // Stars on hat
  g.circle(cx - 2 + lean, headY - 12, 1.5);
  g.fill({ color: COL_HAT_BAND, alpha: 0.7 });
  g.circle(cx + 4 + lean, headY - 6, 1);
  g.fill({ color: COL_HAT_BAND, alpha: 0.5 });
}

function _drawStaff(
  g: Graphics,
  staffX: number, staffTopY: number, staffBotY: number,
  glowing: boolean,
): void {
  // Staff shaft
  g.moveTo(staffX, staffTopY).lineTo(staffX, staffBotY);
  g.stroke({ color: COL_STAFF, width: 3.5 });
  g.moveTo(staffX + 1, staffTopY).lineTo(staffX + 1, staffBotY);
  g.stroke({ color: COL_STAFF_DK, width: 1, alpha: 0.5 });

  // Crystal orb at top
  g.circle(staffX, staffTopY - 4, 5);
  g.fill({ color: COL_CRYSTAL, alpha: 0.8 });
  g.circle(staffX, staffTopY - 4, 5);
  g.stroke({ color: COL_CRYSTAL_HI, width: 1 });
  // Inner glow
  g.circle(staffX - 1, staffTopY - 5, 2);
  g.fill({ color: COL_CRYSTAL_HI, alpha: 0.6 });

  if (glowing) {
    g.circle(staffX, staffTopY - 4, 10);
    g.fill({ color: COL_MAGIC, alpha: 0.15 });
    g.circle(staffX, staffTopY - 4, 6);
    g.fill({ color: COL_MAGIC_HI, alpha: 0.2 });
  }
}

function _drawMagicEffect(g: Graphics, x: number, y: number, intensity: number): void {
  // Sparkle particles
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + intensity * 3;
    const r = 8 + intensity * 6;
    const px = x + Math.cos(angle) * r;
    const py = y + Math.sin(angle) * r;
    g.circle(px, py, 1.5);
    g.fill({ color: COL_MAGIC_HI, alpha: intensity * 0.6 });
  }
  // Core glow
  g.circle(x, y, 4 * intensity);
  g.fill({ color: COL_MAGIC, alpha: intensity * 0.3 });
}

// ---- States ----------------------------------------------------------------

function _idle(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);
  _drawStaff(g, CX + 20, GY - 72 + bob, GY, false);
}

function _walkForward(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;
  const stride = Math.sin(t * Math.PI * 2) * 3;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 2, -stride, stride, false);
  _drawStaff(g, CX + 22, GY - 70 + bob, GY, false);
}

function _walkBack(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 1.5;
  const stride = Math.sin(t * Math.PI * 2) * 2;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -2, stride, -stride, false);
  _drawStaff(g, CX + 18, GY - 72 + bob, GY, false);
}

function _crouch(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, 0, 0, true);
  _drawStaff(g, CX + 18, GY - 52 + bob, GY, false);
}

function _jump(g: Graphics, frame: number): void {
  const t = frame / 5;
  const jumpY = -Math.sin(t * Math.PI) * 25;
  _drawShadow(g);
  _drawBody(g, CX, GY + jumpY, 0, 0, -3, 3, false);
  _drawStaff(g, CX + 20, GY - 72 + jumpY, GY - 10 + jumpY, false);
}

function _attack(g: Graphics, frame: number): void {
  const phases = [0, 0.2, 0.4, 0.7, 0.85, 1.0];
  const t = phases[Math.min(frame, 5)];
  const lean = t < 0.4 ? 0 : t < 0.85 ? 6 : 2;

  _drawShadow(g);
  _drawBody(g, CX, GY, 0, lean, 0, 0, false);

  // Staff thrust forward
  const staffX = CX + 18 + lean * 2;
  const staffAngle = t < 0.4 ? 0 : Math.min((t - 0.4) * 3, 1.2);
  const topY = GY - 70 + Math.sin(staffAngle) * 20;
  const botY = GY - 5;
  _drawStaff(g, staffX, topY, botY, t > 0.3 && t < 0.85);

  // Magic burst on active frames
  if (t > 0.35 && t < 0.8) {
    _drawMagicEffect(g, staffX + 15, topY - 5, (t - 0.35) * 2);
  }
}

function _blockStand(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -2, 0, 0, false);
  // Staff held defensively
  _drawStaff(g, CX + 5, GY - 75 + bob, GY - 15, true);
  // Magic shield
  g.ellipse(CX + 12, GY - 45 + bob, 12, 25);
  g.fill({ color: COL_MAGIC, alpha: 0.15 });
  g.stroke({ color: COL_MAGIC_HI, width: 1, alpha: 0.3 });
}

function _blockCrouch(g: Graphics, frame: number): void {
  const bob = Math.sin((frame / 4) * Math.PI * 2) * 0.5;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, -2, 0, 0, true);
  _drawStaff(g, CX + 5, GY - 55 + bob, GY - 5, true);
  g.ellipse(CX + 10, GY - 30 + bob, 10, 18);
  g.fill({ color: COL_MAGIC, alpha: 0.15 });
  g.stroke({ color: COL_MAGIC_HI, width: 1, alpha: 0.3 });
}

function _hitStun(g: Graphics, frame: number): void {
  const recoil = Math.sin((frame / 4) * Math.PI) * 8;
  _drawShadow(g);
  _drawBody(g, CX, GY, 0, -recoil, 0, 0, false);
  if (frame === 0) {
    g.rect(CX - 15, GY - 80, 30, 70);
    g.fill({ color: 0xffffff, alpha: 0.3 });
  }
  _drawStaff(g, CX + 15 - recoil, GY - 60, GY, false);
}

function _knockdown(g: Graphics, frame: number): void {
  const t = frame / 5;
  _drawShadow(g);
  // Fallen body
  g.moveTo(CX - 25, GY - 10 + t * 5);
  g.lineTo(CX + 25, GY - 5 + t * 3);
  g.lineTo(CX + 25, GY + 5);
  g.lineTo(CX - 25, GY);
  g.closePath();
  g.fill({ color: COL_ROBE });
  g.stroke({ color: COL_ROBE_DK, width: 1 });
  // Hat fallen off
  g.moveTo(CX - 30, GY - 20).lineTo(CX - 25, GY - 8).lineTo(CX - 20, GY - 8);
  g.closePath();
  g.fill({ color: COL_HAT });
  // Staff on ground
  g.moveTo(CX - 15, GY - 2).lineTo(CX + 30, GY - 5);
  g.stroke({ color: COL_STAFF, width: 3 });
}

function _getUp(g: Graphics, frame: number): void {
  const rise = frame / 4;
  _drawShadow(g);
  _drawBody(g, CX, GY, (1 - rise) * 10, -(1 - rise) * 4, 0, 0, rise < 0.5);
  _drawStaff(g, CX + 18, GY - 40 - rise * 30, GY, false);
}

function _grab(g: Graphics, frame: number): void {
  const reach = Math.sin((frame / 4) * Math.PI) * 12;
  _drawShadow(g);
  _drawBody(g, CX, GY, 0, reach * 0.4, 0, 0, false);
  _drawStaff(g, CX + 22 + reach, GY - 65, GY - 10, true);
  // Grabbing magic tendrils
  g.moveTo(CX + 30 + reach, GY - 55);
  g.quadraticCurveTo(CX + 40 + reach, GY - 45, CX + 35 + reach, GY - 35);
  g.stroke({ color: COL_MAGIC, width: 1.5, alpha: 0.5 });
}

function _grabbed(g: Graphics, frame: number): void {
  const shake = Math.sin((frame / 4) * Math.PI * 4) * 3;
  _drawShadow(g);
  _drawBody(g, CX + shake, GY, 0, -5, 0, 0, false);
  _drawStaff(g, CX + 15 + shake, GY - 65, GY, false);
}

function _victory(g: Graphics, frame: number): void {
  const t = frame / 6;
  const bob = Math.sin(t * Math.PI * 2) * 2;
  _drawShadow(g);
  _drawBody(g, CX, GY, bob, 0, 0, 0, false);
  // Staff raised, glowing
  _drawStaff(g, CX + 5, GY - 85 + bob, GY - 20, true);
  // Magical aura
  g.circle(CX + 5, GY - 89 + bob, 12);
  g.fill({ color: COL_MAGIC, alpha: 0.2 });
  _drawMagicEffect(g, CX + 5, GY - 89 + bob, 0.8 + Math.sin(t * Math.PI * 2) * 0.2);
}

function _defeat(g: Graphics, frame: number): void {
  _drawShadow(g);
  const kneel = Math.min(frame / 3, 1);
  // Kneeling figure
  g.moveTo(CX - 10, GY - 30 + kneel * 10);
  g.lineTo(CX - 15, GY);
  g.lineTo(CX + 15, GY);
  g.lineTo(CX + 10, GY - 30 + kneel * 10);
  g.closePath();
  g.fill({ color: COL_ROBE });
  // Head bowed
  g.circle(CX, GY - 35 + kneel * 10, 7);
  g.fill({ color: COL_SKIN });
  // Hat drooping
  g.moveTo(CX, GY - 50 + kneel * 15);
  g.lineTo(CX - 8, GY - 38 + kneel * 10);
  g.lineTo(CX + 8, GY - 38 + kneel * 10);
  g.closePath();
  g.fill({ color: COL_HAT });
  // Staff dropped
  g.moveTo(CX + 20, GY - 3).lineTo(CX + 35, GY - 15);
  g.stroke({ color: COL_STAFF, width: 3 });
}
