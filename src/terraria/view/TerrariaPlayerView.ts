// ---------------------------------------------------------------------------
// Terraria – Player character rendering (detailed polygon art)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import { BLOCK_DEFS, ToolType } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { getHeldItem } from "../state/TerrariaInventory";
import { ItemCategory } from "../state/TerrariaInventory";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;
const SKIN = 0xF2C89D;
const SKIN_SHADE = 0xD4A87A;
const HAIR = 0x5C2E0E;
const HAIR_HI = 0x7A4420;
const TUNIC = 0x1E4FA0;
const TUNIC_SHADE = 0x163B78;
const TUNIC_HI = 0x2A66C0;
const PANTS = 0x604020;
const PANTS_SHADE = 0x4A3018;
const BOOT = 0x3A2010;
const BOOT_HI = 0x5A3820;
const BELT = 0x8B6914;
const BUCKLE = 0xFFD700;
const CAPE = 0xAA2222;
const CAPE_SHADE = 0x881818;

export class TerrariaPlayerView {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _walkFrame = 0;
  private _breathFrame = 0;
  private _capePhase = 0;

  constructor() {
    this.container.addChild(this._gfx);
  }

  draw(state: TerrariaState, camera: TerrariaCamera, dt: number): void {
    const p = state.player;
    const { sx, sy } = camera.worldToScreen(p.x, p.y + TB.PLAYER_HEIGHT / 2);

    const pw = TB.PLAYER_WIDTH * TS;
    const ph = TB.PLAYER_HEIGHT * TS;
    const hw = pw / 2;
    const dir = p.facingRight ? 1 : -1;

    const walking = Math.abs(p.vx) > 0.5;
    const jumping = !p.onGround;
    const sprinting = Math.abs(p.vx) > TB.PLAYER_SPEED * 1.2;

    if (walking && p.onGround) {
      this._walkFrame += dt * (sprinting ? 14 : 10);
    } else if (jumping) {
      this._walkFrame += (Math.PI * 0.25 - this._walkFrame) * dt * 8;
    } else {
      this._walkFrame *= 0.82;
    }
    this._breathFrame += dt * 2.2;
    this._capePhase += dt * (walking ? 6 : 2);

    const breath = Math.sin(this._breathFrame) * 0.5;
    const legA = Math.sin(this._walkFrame) * 3.5;
    const legB = Math.sin(this._walkFrame + Math.PI) * 3.5;
    const armA = Math.sin(this._walkFrame + Math.PI) * 3;
    const armB = Math.sin(this._walkFrame) * 3;
    const capeWave = Math.sin(this._capePhase) * 2.5;

    const g = this._gfx;
    g.clear();

    // Invulnerability flash
    this.container.alpha = (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0) ? 0.3 : 1;

    // Layout
    const headH = pw * 1.0;
    const headTop = sy - ph + breath;
    const bodyTop = headTop + headH;
    const bodyH = ph * 0.36;
    const legTop = bodyTop + bodyH;
    const legH = ph - headH - bodyH;

    // ===== CAPE (behind everything) =====
    const capeX = sx - dir * hw * 0.2;
    const capeTop = bodyTop + 1;
    const capeBottom = legTop + legH * 0.5;
    g.moveTo(capeX - 4, capeTop);
    g.lineTo(capeX + 4, capeTop);
    g.bezierCurveTo(
      capeX + 5 - dir * capeWave, capeTop + (capeBottom - capeTop) * 0.4,
      capeX + 6 - dir * capeWave * 1.5, capeTop + (capeBottom - capeTop) * 0.7,
      capeX + 3 - dir * capeWave * 2, capeBottom,
    );
    g.lineTo(capeX - 3 - dir * capeWave * 1.5, capeBottom);
    g.bezierCurveTo(
      capeX - 6 - dir * capeWave, capeTop + (capeBottom - capeTop) * 0.6,
      capeX - 5, capeTop + (capeBottom - capeTop) * 0.3,
      capeX - 4, capeTop,
    );
    g.closePath();
    g.fill(CAPE);
    // Cape inner shade
    g.moveTo(capeX - 2, capeTop + 2);
    g.lineTo(capeX + 2, capeTop + 2);
    g.lineTo(capeX + 1 - dir * capeWave * 1.5, capeBottom - 2);
    g.lineTo(capeX - 1 - dir * capeWave, capeBottom - 2);
    g.closePath();
    g.fill({ color: CAPE_SHADE, alpha: 0.5 });

    // ===== BACK ARM =====
    {
      const ax = sx - dir * hw * 0.35;
      const ay = bodyTop + 3;
      const aLen = bodyH * 0.75;
      // Upper arm
      g.moveTo(ax - 2, ay + armB);
      g.lineTo(ax + 2, ay + armB);
      g.lineTo(ax + 2, ay + aLen * 0.5 + armB);
      g.lineTo(ax - 2, ay + aLen * 0.5 + armB);
      g.closePath();
      g.fill(TUNIC_SHADE);
      // Forearm (skin)
      g.moveTo(ax - 1.5, ay + aLen * 0.5 + armB);
      g.lineTo(ax + 1.5, ay + aLen * 0.5 + armB);
      g.lineTo(ax + 1.5, ay + aLen + armB);
      g.lineTo(ax - 1.5, ay + aLen + armB);
      g.closePath();
      g.fill(SKIN_SHADE);
    }

    // ===== LEGS =====
    const legW = pw * 0.26;
    // Back leg
    _drawLeg(g, sx - hw * 0.3 + legB, legTop, legW, legH, PANTS_SHADE, BOOT);
    // Front leg
    _drawLeg(g, sx + hw * 0.05 + legA, legTop, legW, legH, PANTS, BOOT_HI);

    // ===== BODY =====
    // Torso polygon (slightly tapered)
    const shoulderW = pw * 0.55;
    const waistW = pw * 0.45;
    g.moveTo(sx - shoulderW / 2, bodyTop);
    g.lineTo(sx + shoulderW / 2, bodyTop);
    g.lineTo(sx + waistW / 2, bodyTop + bodyH);
    g.lineTo(sx - waistW / 2, bodyTop + bodyH);
    g.closePath();
    g.fill(TUNIC);
    // Tunic front panel highlight
    g.moveTo(sx - waistW * 0.15, bodyTop + 2);
    g.lineTo(sx + waistW * 0.15, bodyTop + 2);
    g.lineTo(sx + waistW * 0.1, bodyTop + bodyH - 3);
    g.lineTo(sx - waistW * 0.1, bodyTop + bodyH - 3);
    g.closePath();
    g.fill({ color: TUNIC_HI, alpha: 0.35 });
    // Collar
    g.moveTo(sx - shoulderW * 0.3, bodyTop);
    g.lineTo(sx + shoulderW * 0.3, bodyTop);
    g.lineTo(sx + shoulderW * 0.2, bodyTop + 3);
    g.lineTo(sx - shoulderW * 0.2, bodyTop + 3);
    g.closePath();
    g.fill(TUNIC_HI);
    // Belt
    g.rect(sx - waistW / 2, bodyTop + bodyH - 3.5, waistW, 3.5);
    g.fill(BELT);
    // Buckle
    g.rect(sx - 2, bodyTop + bodyH - 3.5, 4, 3.5);
    g.fill(BUCKLE);
    g.rect(sx - 1, bodyTop + bodyH - 2.5, 2, 1.5);
    g.fill({ color: 0x000000, alpha: 0.3 });

    // ===== HEAD =====
    const headW = pw * 0.8;
    // Neck
    g.rect(sx - 2, headTop + headH - 2, 4, 3);
    g.fill(SKIN_SHADE);
    // Head shape (rounded rect via polygon)
    const r = 2;
    _roundedRect(g, sx - headW / 2, headTop, headW, headH, r);
    g.fill(SKIN);
    // Ear
    g.ellipse(sx + dir * headW / 2, headTop + headH * 0.45, 2, 3);
    g.fill(SKIN_SHADE);

    // Hair (layered)
    const hairTop = headTop - 2;
    const hairH = headH * 0.42;
    // Main hair
    g.moveTo(sx - headW / 2 - 1, hairTop + hairH);
    g.lineTo(sx - headW / 2 - 1, hairTop + r);
    g.quadraticCurveTo(sx - headW / 2, hairTop - 1, sx - headW / 4, hairTop - 1);
    g.lineTo(sx + headW / 4, hairTop - 1);
    g.quadraticCurveTo(sx + headW / 2, hairTop - 1, sx + headW / 2 + 1, hairTop + r);
    g.lineTo(sx + headW / 2 + 1, hairTop + hairH);
    g.closePath();
    g.fill(HAIR);
    // Hair highlight strands
    g.moveTo(sx - headW * 0.1, hairTop);
    g.lineTo(sx + headW * 0.05, hairTop);
    g.lineTo(sx, hairTop + hairH * 0.5);
    g.closePath();
    g.fill({ color: HAIR_HI, alpha: 0.4 });
    // Side fringe
    const fringeX = p.facingRight ? sx - headW / 2 - 1 : sx + headW / 2 - headW * 0.25;
    g.rect(fringeX, hairTop, headW * 0.28, hairH + 3);
    g.fill(HAIR);

    // Face
    const faceDir = dir;
    const eyeX = sx + faceDir * headW * 0.12;
    const eyeY = headTop + headH * 0.42;
    // Eye white
    g.ellipse(eyeX, eyeY, 2.5, 2);
    g.fill(0xFFFFFF);
    // Iris
    g.circle(eyeX + faceDir * 0.5, eyeY, 1.2);
    g.fill(0x2255AA);
    // Pupil
    g.circle(eyeX + faceDir * 0.8, eyeY, 0.6);
    g.fill(0x111122);
    // Eyebrow
    g.moveTo(eyeX - 2.5, eyeY - 3);
    g.lineTo(eyeX + 2.5 * faceDir, eyeY - 3.5);
    g.stroke({ color: HAIR, width: 1 });
    // Nose
    g.moveTo(sx + faceDir * headW * 0.2, headTop + headH * 0.5);
    g.lineTo(sx + faceDir * headW * 0.25, headTop + headH * 0.58);
    g.lineTo(sx + faceDir * headW * 0.18, headTop + headH * 0.58);
    g.closePath();
    g.fill(SKIN_SHADE);
    // Mouth
    g.moveTo(sx + faceDir * headW * 0.05, headTop + headH * 0.72);
    g.quadraticCurveTo(sx + faceDir * headW * 0.15, headTop + headH * 0.75, sx + faceDir * headW * 0.2, headTop + headH * 0.72);
    g.stroke({ color: 0xBB8866, width: 0.8 });

    // ===== FRONT ARM + HELD ITEM =====
    const held = getHeldItem(p.inventory);
    const fax = sx + dir * hw * 0.35;
    const fay = bodyTop + 3;

    if (p.attackTimer > 0) {
      this._drawSwingArm(g, fax, fay, bodyH, dir, p.attackTimer, held);
    } else if (p.miningTarget) {
      this._drawMiningArm(g, fax, fay, bodyH, dir, p.miningTarget.progress, held);
    } else {
      this._drawIdleArm(g, fax, fay, bodyH, armA, dir, held);
    }
  }

  // ---- Arm drawing helpers ----

  private _drawSwingArm(g: Graphics, ax: number, ay: number, bodyH: number, dir: number, timer: number, held: ReturnType<typeof getHeldItem>): void {
    const pct = 1 - timer / TB.ATTACK_COOLDOWN;
    const angle = (pct * Math.PI * 0.9 - Math.PI * 0.35) * dir;
    const armLen = TS * 1.5;
    const elbowLen = armLen * 0.45;
    const forearmLen = armLen * 0.55;

    // Shoulder
    const ex = ax + Math.cos(angle - 0.3 * dir) * elbowLen;
    const ey = ay - Math.sin(angle - 0.3 * dir) * elbowLen;
    // Hand
    const hx = ex + Math.cos(angle + 0.2 * dir) * forearmLen;
    const hy = ey - Math.sin(angle + 0.2 * dir) * forearmLen;

    // Upper arm (tunic sleeve)
    g.moveTo(ax, ay);
    g.lineTo(ex, ey);
    g.stroke({ color: TUNIC, width: 4 });
    // Forearm (skin)
    g.moveTo(ex, ey);
    g.lineTo(hx, hy);
    g.stroke({ color: SKIN, width: 3 });
    // Hand
    g.circle(hx, hy, 2);
    g.fill(SKIN);

    // Weapon at hand
    if (held) {
      const wAngle = angle + 0.3 * dir;
      const wLen = 10;
      const tipX = hx + Math.cos(wAngle) * wLen;
      const tipY = hy - Math.sin(wAngle) * wLen;

      if (held.toolType === ToolType.SWORD) {
        // Sword blade (tapered polygon)
        const perpX = Math.sin(wAngle) * 1.5;
        const perpY = Math.cos(wAngle) * 1.5;
        g.moveTo(hx + perpX, hy + perpY);
        g.lineTo(tipX, tipY);
        g.lineTo(hx - perpX, hy - perpY);
        g.closePath();
        g.fill(held.color);
        // Hilt guard
        g.moveTo(hx - perpX * 2, hy - perpY * 2);
        g.lineTo(hx + perpX * 2, hy + perpY * 2);
        g.stroke({ color: BELT, width: 2 });
      } else {
        // Generic tool/weapon
        g.moveTo(hx, hy);
        g.lineTo(tipX, tipY);
        g.stroke({ color: held.color, width: 2.5 });
        g.rect(tipX - 2, tipY - 2, 4, 4);
        g.fill(held.color);
      }
    }
  }

  private _drawMiningArm(g: Graphics, ax: number, ay: number, bodyH: number, dir: number, progress: number, held: ReturnType<typeof getHeldItem>): void {
    const angle = (Math.sin(progress * Math.PI * 6) * 0.5 - 0.3) * dir;
    const armLen = TS * 1.3;
    const hx = ax + Math.cos(angle) * armLen;
    const hy = ay - Math.sin(angle) * armLen;

    g.moveTo(ax, ay);
    g.lineTo(ax + (hx - ax) * 0.5, ay + (hy - ay) * 0.5);
    g.stroke({ color: TUNIC, width: 4 });
    g.moveTo(ax + (hx - ax) * 0.5, ay + (hy - ay) * 0.5);
    g.lineTo(hx, hy);
    g.stroke({ color: SKIN, width: 3 });

    if (held) {
      // Pickaxe shape
      const headAngle = angle + Math.PI * 0.25 * dir;
      g.moveTo(hx, hy);
      g.lineTo(hx + Math.cos(angle) * 6, hy - Math.sin(angle) * 6);
      g.stroke({ color: 0x8B6914, width: 2 });
      // Pick head
      g.moveTo(hx + Math.cos(headAngle) * 4, hy - Math.sin(headAngle) * 4);
      g.lineTo(hx + Math.cos(headAngle - Math.PI) * 3, hy - Math.sin(headAngle - Math.PI) * 3);
      g.stroke({ color: held.color, width: 2.5 });
    }
  }

  private _drawIdleArm(g: Graphics, ax: number, ay: number, bodyH: number, swing: number, dir: number, held: ReturnType<typeof getHeldItem>): void {
    const aLen = bodyH * 0.75;
    // Upper arm
    g.moveTo(ax - 2, ay + swing);
    g.lineTo(ax + 2, ay + swing);
    g.lineTo(ax + 2, ay + aLen * 0.5 + swing);
    g.lineTo(ax - 2, ay + aLen * 0.5 + swing);
    g.closePath();
    g.fill(TUNIC);
    // Forearm
    g.moveTo(ax - 1.5, ay + aLen * 0.5 + swing);
    g.lineTo(ax + 1.5, ay + aLen * 0.5 + swing);
    g.lineTo(ax + 1.5, ay + aLen + swing);
    g.lineTo(ax - 1.5, ay + aLen + swing);
    g.closePath();
    g.fill(SKIN);
    // Hand
    g.circle(ax, ay + aLen + swing + 1, 2);
    g.fill(SKIN);

    // Held item at side
    if (held) {
      const itemX = ax + dir * 3;
      const itemY = ay + aLen + swing;
      if (held.category === ItemCategory.BLOCK && held.blockType !== undefined) {
        const bd = BLOCK_DEFS[held.blockType];
        if (bd) {
          g.rect(itemX - 3, itemY - 3, 6, 6);
          g.fill(bd.color);
          g.rect(itemX - 3, itemY - 3, 6, 6);
          g.stroke({ color: 0x000000, width: 0.5, alpha: 0.2 });
        }
      } else if (held.toolType === ToolType.SWORD) {
        // Sword at rest
        g.moveTo(itemX, itemY);
        g.lineTo(itemX + dir * 2, itemY - 10);
        g.stroke({ color: held.color, width: 2 });
        g.moveTo(itemX - 2, itemY, );
        g.lineTo(itemX + 2, itemY);
        g.stroke({ color: BELT, width: 1.5 });
      } else {
        // Tool handle
        g.moveTo(itemX, itemY);
        g.lineTo(itemX, itemY - 8);
        g.stroke({ color: 0x8B6914, width: 1.5 });
        g.rect(itemX - 2, itemY - 10, 4, 3);
        g.fill(held.color);
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _drawLeg(g: Graphics, x: number, top: number, w: number, h: number, pantsColor: number, bootColor: number): void {
  const kneeY = top + h * 0.5;
  // Thigh
  g.moveTo(x, top);
  g.lineTo(x + w, top);
  g.lineTo(x + w * 0.9, kneeY);
  g.lineTo(x + w * 0.1, kneeY);
  g.closePath();
  g.fill(pantsColor);
  // Shin
  g.moveTo(x + w * 0.1, kneeY);
  g.lineTo(x + w * 0.9, kneeY);
  g.lineTo(x + w * 0.85, top + h - 3);
  g.lineTo(x + w * 0.15, top + h - 3);
  g.closePath();
  g.fill(pantsColor);
  // Boot
  g.moveTo(x - 1, top + h - 3);
  g.lineTo(x + w + 1, top + h - 3);
  g.lineTo(x + w + 2, top + h);
  g.lineTo(x - 1, top + h);
  g.closePath();
  g.fill(bootColor);
  // Boot highlight
  g.moveTo(x, top + h - 3);
  g.lineTo(x + w * 0.4, top + h - 3);
  g.lineTo(x + w * 0.4, top + h - 1);
  g.lineTo(x, top + h - 1);
  g.closePath();
  g.fill({ color: 0xFFFFFF, alpha: 0.1 });
}

function _roundedRect(g: Graphics, x: number, y: number, w: number, h: number, r: number): void {
  g.moveTo(x + r, y);
  g.lineTo(x + w - r, y);
  g.quadraticCurveTo(x + w, y, x + w, y + r);
  g.lineTo(x + w, y + h - r);
  g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  g.lineTo(x + r, y + h);
  g.quadraticCurveTo(x, y + h, x, y + h - r);
  g.lineTo(x, y + r);
  g.quadraticCurveTo(x, y, x + r, y);
  g.closePath();
}
