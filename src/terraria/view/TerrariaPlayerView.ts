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
  private _blinkTimer = 0;
  private _blinkState = 0; // 0=open, 1=closing, 2=closed, 3=opening
  private _idleSwayPhase = 0;
  private _totalTime = 0;

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
    this._totalTime += dt;
    this._idleSwayPhase += dt * (walking ? 0 : 0.8);

    // Blink logic (blink every 3-6 seconds)
    this._blinkTimer -= dt;
    if (this._blinkTimer <= 0) {
      if (this._blinkState === 0) {
        this._blinkState = 1; this._blinkTimer = 0.05;
      } else if (this._blinkState === 1) {
        this._blinkState = 2; this._blinkTimer = 0.06;
      } else if (this._blinkState === 2) {
        this._blinkState = 3; this._blinkTimer = 0.05;
      } else {
        this._blinkState = 0; this._blinkTimer = 3 + Math.random() * 3;
      }
    }

    const breath = Math.sin(this._breathFrame) * 0.7;
    const idleSway = walking ? 0 : Math.sin(this._idleSwayPhase) * 0.3;
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
    const headTop = sy + breath;
    const bodyTop = headTop + headH;
    const bodyH = ph * 0.36;
    const legTop = bodyTop + bodyH;
    const legH = ph - headH - bodyH;

    // ===== CAPE (behind everything, multi-fold) =====
    const capeX = sx - dir * hw * 0.2;
    const capeTop = bodyTop + 1;
    const capeBottom = legTop + legH * 0.6;
    const capeMid = capeTop + (capeBottom - capeTop) * 0.5;
    const cw2 = capeWave;
    const cw3 = Math.sin(this._capePhase * 0.7 + 1) * 2;

    // Outer cape shape (main silhouette)
    g.moveTo(capeX - 5, capeTop);
    g.lineTo(capeX + 5, capeTop);
    g.bezierCurveTo(
      capeX + 6 - dir * cw2, capeTop + (capeBottom - capeTop) * 0.3,
      capeX + 7 - dir * cw2 * 1.5, capeTop + (capeBottom - capeTop) * 0.65,
      capeX + 4 - dir * cw2 * 2, capeBottom,
    );
    // Tattered bottom edge (zig-zag)
    g.lineTo(capeX + 2 - dir * cw2 * 1.8, capeBottom - 1);
    g.lineTo(capeX - dir * cw2 * 1.5, capeBottom + 1);
    g.lineTo(capeX - 2 - dir * cw2 * 1.2, capeBottom - 1);
    g.lineTo(capeX - 4 - dir * cw2, capeBottom);
    g.bezierCurveTo(
      capeX - 7 - dir * cw3, capeTop + (capeBottom - capeTop) * 0.55,
      capeX - 6, capeTop + (capeBottom - capeTop) * 0.25,
      capeX - 5, capeTop,
    );
    g.closePath();
    g.fill(CAPE);

    // Inner fold #1 (dark shadow stripe)
    g.moveTo(capeX - 1, capeTop + 3);
    g.bezierCurveTo(
      capeX - 2 - dir * cw2 * 0.5, capeMid - 2,
      capeX - 1 - dir * cw2, capeMid + 5,
      capeX - 2 - dir * cw2 * 1.3, capeBottom - 3,
    );
    g.lineTo(capeX + 1 - dir * cw2 * 1.1, capeBottom - 3);
    g.bezierCurveTo(
      capeX + 1 - dir * cw2 * 0.8, capeMid + 3,
      capeX - dir * cw2 * 0.3, capeMid - 4,
      capeX + 2, capeTop + 3,
    );
    g.closePath();
    g.fill({ color: CAPE_SHADE, alpha: 0.45 });

    // Inner fold #2 (highlight stripe)
    g.moveTo(capeX + 3, capeTop + 4);
    g.bezierCurveTo(
      capeX + 4 - dir * cw3, capeMid,
      capeX + 3 - dir * cw2 * 0.7, capeMid + 6,
      capeX + 2 - dir * cw2 * 1.5, capeBottom - 4,
    );
    g.lineTo(capeX + 4 - dir * cw2 * 1.3, capeBottom - 4);
    g.bezierCurveTo(
      capeX + 5 - dir * cw2 * 0.9, capeMid + 4,
      capeX + 5 - dir * cw3, capeMid - 2,
      capeX + 5, capeTop + 4,
    );
    g.closePath();
    g.fill({ color: 0xCC4444, alpha: 0.25 });

    // Gold trim along cape bottom edge
    g.moveTo(capeX - 4 - dir * cw2, capeBottom);
    g.lineTo(capeX - 2 - dir * cw2 * 1.2, capeBottom - 1);
    g.lineTo(capeX - dir * cw2 * 1.5, capeBottom + 1);
    g.lineTo(capeX + 2 - dir * cw2 * 1.8, capeBottom - 1);
    g.lineTo(capeX + 4 - dir * cw2 * 2, capeBottom);
    g.stroke({ color: BUCKLE, width: 0.6, alpha: 0.35 });

    // Cape clasp at neck
    g.circle(capeX, capeTop + 1, 1.5);
    g.fill(BUCKLE);

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
    g.moveTo(sx - shoulderW / 2 + idleSway, bodyTop);
    g.lineTo(sx + shoulderW / 2 + idleSway, bodyTop);
    g.lineTo(sx + waistW / 2, bodyTop + bodyH);
    g.lineTo(sx - waistW / 2, bodyTop + bodyH);
    g.closePath();
    g.fill(TUNIC);
    // Tunic fold lines (fabric wrinkles)
    g.moveTo(sx - shoulderW * 0.3 + idleSway, bodyTop + 2);
    g.bezierCurveTo(sx - waistW * 0.2, bodyTop + bodyH * 0.4, sx - waistW * 0.25, bodyTop + bodyH * 0.7, sx - waistW * 0.3, bodyTop + bodyH - 2);
    g.stroke({ color: TUNIC_SHADE, width: 0.6, alpha: 0.2 });
    g.moveTo(sx + shoulderW * 0.2 + idleSway, bodyTop + 3);
    g.bezierCurveTo(sx + waistW * 0.15, bodyTop + bodyH * 0.5, sx + waistW * 0.1, bodyTop + bodyH * 0.8, sx + waistW * 0.15, bodyTop + bodyH - 2);
    g.stroke({ color: TUNIC_SHADE, width: 0.5, alpha: 0.15 });
    // Tunic front panel highlight
    g.moveTo(sx - waistW * 0.15, bodyTop + 2);
    g.lineTo(sx + waistW * 0.15, bodyTop + 2);
    g.lineTo(sx + waistW * 0.1, bodyTop + bodyH - 3);
    g.lineTo(sx - waistW * 0.1, bodyTop + bodyH - 3);
    g.closePath();
    g.fill({ color: TUNIC_HI, alpha: 0.35 });
    // Shoulder seams
    g.moveTo(sx - shoulderW / 2 + idleSway, bodyTop);
    g.lineTo(sx - shoulderW / 2 + 1, bodyTop + 2);
    g.stroke({ color: TUNIC_SHADE, width: 0.5, alpha: 0.2 });
    g.moveTo(sx + shoulderW / 2 + idleSway, bodyTop);
    g.lineTo(sx + shoulderW / 2 - 1, bodyTop + 2);
    g.stroke({ color: TUNIC_SHADE, width: 0.5, alpha: 0.2 });
    // Collar (V-neck detail)
    g.moveTo(sx - shoulderW * 0.3, bodyTop);
    g.lineTo(sx, bodyTop + 4);
    g.lineTo(sx + shoulderW * 0.3, bodyTop);
    g.lineTo(sx + shoulderW * 0.2, bodyTop + 3);
    g.lineTo(sx, bodyTop + 3);
    g.lineTo(sx - shoulderW * 0.2, bodyTop + 3);
    g.closePath();
    g.fill(TUNIC_HI);
    // Chest emblem (small Camelot cross)
    const embX = sx + dir * 1;
    const embY = bodyTop + bodyH * 0.35;
    g.rect(embX - 0.5, embY - 2, 1, 4);
    g.fill({ color: BUCKLE, alpha: 0.3 });
    g.rect(embX - 2, embY - 0.5, 4, 1);
    g.fill({ color: BUCKLE, alpha: 0.3 });
    // Belt with pouch
    g.rect(sx - waistW / 2, bodyTop + bodyH - 3.5, waistW, 3.5);
    g.fill(BELT);
    // Belt stitching
    g.moveTo(sx - waistW / 2 + 1, bodyTop + bodyH - 2);
    g.lineTo(sx + waistW / 2 - 1, bodyTop + bodyH - 2);
    g.stroke({ color: 0x000000, width: 0.3, alpha: 0.1 });
    // Buckle (ornate)
    g.rect(sx - 2.5, bodyTop + bodyH - 3.5, 5, 3.5);
    g.fill(BUCKLE);
    g.rect(sx - 1.5, bodyTop + bodyH - 3, 3, 2.5);
    g.fill({ color: 0x000000, alpha: 0.2 });
    g.circle(sx, bodyTop + bodyH - 1.8, 0.6);
    g.fill({ color: 0xFFFFFF, alpha: 0.2 });
    // Belt pouch (side)
    g.ellipse(sx + dir * waistW * 0.4, bodyTop + bodyH - 1, 2, 2.5);
    g.fill(BELT);
    g.ellipse(sx + dir * waistW * 0.4, bodyTop + bodyH - 1.5, 1.2, 1);
    g.fill({ color: 0x000000, alpha: 0.08 });

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
    const eyeX = sx + faceDir * headW * 0.12 + idleSway;
    const eyeY = headTop + headH * 0.42;
    // Eye white
    const blinkSquash = this._blinkState === 1 ? 0.4 : this._blinkState === 2 ? 0.05 : this._blinkState === 3 ? 0.5 : 1;
    g.ellipse(eyeX, eyeY, 2.5, 2 * blinkSquash);
    g.fill(0xFFFFFF);
    if (blinkSquash > 0.3) {
      // Iris (follows direction slightly)
      g.ellipse(eyeX + faceDir * 0.6, eyeY, 1.3, 1.2 * blinkSquash);
      g.fill(0x2255AA);
      // Iris highlight
      g.circle(eyeX + faceDir * 0.3, eyeY - 0.5 * blinkSquash, 0.4);
      g.fill({ color: 0x4488CC, alpha: 0.4 });
      // Pupil
      g.ellipse(eyeX + faceDir * 0.8, eyeY, 0.6, 0.6 * blinkSquash);
      g.fill(0x111122);
      // Eye shine (specular highlight)
      g.circle(eyeX + faceDir * 0.2, eyeY - 0.7 * blinkSquash, 0.5);
      g.fill({ color: 0xFFFFFF, alpha: 0.55 });
    }
    // Eyelid line when blinking
    if (blinkSquash < 0.5) {
      g.moveTo(eyeX - 2.5, eyeY);
      g.lineTo(eyeX + 2.5, eyeY);
      g.stroke({ color: SKIN_SHADE, width: 0.6, alpha: 0.6 });
    }
    // Eyebrow (more expressive, arched)
    g.moveTo(eyeX - 2.5, eyeY - 3.2);
    g.quadraticCurveTo(eyeX, eyeY - 4, eyeX + 2.5 * faceDir, eyeY - 3.2);
    g.stroke({ color: HAIR, width: 1.1 });
    // Nose (more defined)
    g.moveTo(sx + faceDir * headW * 0.18, headTop + headH * 0.48);
    g.quadraticCurveTo(sx + faceDir * headW * 0.26, headTop + headH * 0.55, sx + faceDir * headW * 0.22, headTop + headH * 0.58);
    g.lineTo(sx + faceDir * headW * 0.16, headTop + headH * 0.58);
    g.closePath();
    g.fill(SKIN_SHADE);
    // Nostril hint
    g.circle(sx + faceDir * headW * 0.2, headTop + headH * 0.57, 0.4);
    g.fill({ color: 0x000000, alpha: 0.08 });
    // Mouth (changes with state)
    const mouthX = sx + faceDir * headW * 0.05 + idleSway;
    const mouthY = headTop + headH * 0.72;
    if (jumping) {
      // Open mouth (surprised/exertion)
      g.ellipse(mouthX + faceDir * headW * 0.07, mouthY, 1.5, 1.2);
      g.fill({ color: 0x8A4433, alpha: 0.4 });
    } else if (sprinting) {
      // Determined grin
      g.moveTo(mouthX, mouthY);
      g.quadraticCurveTo(mouthX + faceDir * headW * 0.12, mouthY + 1.5, mouthX + faceDir * headW * 0.2, mouthY - 0.5);
      g.stroke({ color: 0xBB8866, width: 0.9 });
    } else {
      // Gentle smile
      g.moveTo(mouthX, mouthY);
      g.quadraticCurveTo(mouthX + faceDir * headW * 0.1, mouthY + 1, mouthX + faceDir * headW * 0.17, mouthY);
      g.stroke({ color: 0xBB8866, width: 0.8 });
    }
    // Chin shadow
    g.moveTo(sx - headW * 0.2, headTop + headH - 1);
    g.lineTo(sx + headW * 0.2, headTop + headH - 1);
    g.stroke({ color: SKIN_SHADE, width: 0.5, alpha: 0.15 });

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

  private _drawSwingArm(g: Graphics, ax: number, ay: number, _bodyH: number, dir: number, timer: number, held: ReturnType<typeof getHeldItem>): void {
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
        // Sword blade (tapered, double-edged)
        const perpX = Math.sin(wAngle) * 1.8;
        const perpY = Math.cos(wAngle) * 1.8;
        const midX = (hx + tipX) / 2;
        const midY = (hy + tipY) / 2;
        // Blade
        g.moveTo(hx + perpX * 0.6, hy + perpY * 0.6);
        g.lineTo(midX + perpX, midY + perpY);
        g.lineTo(tipX, tipY);
        g.lineTo(midX - perpX, midY - perpY);
        g.lineTo(hx - perpX * 0.6, hy - perpY * 0.6);
        g.closePath();
        g.fill(held.color);
        // Blade edge highlight
        g.moveTo(hx + perpX * 0.3, hy + perpY * 0.3);
        g.lineTo(tipX, tipY);
        g.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.3 });
        // Fuller (blade groove)
        g.moveTo(hx, hy);
        g.lineTo(midX, midY);
        g.stroke({ color: 0x000000, width: 0.6, alpha: 0.1 });
        // Hilt cross-guard
        g.moveTo(hx - perpX * 2.5, hy - perpY * 2.5);
        g.lineTo(hx + perpX * 2.5, hy + perpY * 2.5);
        g.stroke({ color: BELT, width: 2.5 });
        // Guard ends (pommel-like)
        g.circle(hx - perpX * 2.5, hy - perpY * 2.5, 1);
        g.fill(BUCKLE);
        g.circle(hx + perpX * 2.5, hy + perpY * 2.5, 1);
        g.fill(BUCKLE);
        // Grip wrap
        const gripX = hx - Math.cos(wAngle) * 3;
        const gripY = hy + Math.sin(wAngle) * 3;
        g.moveTo(gripX, gripY);
        g.lineTo(hx, hy);
        g.stroke({ color: 0x5A3A1A, width: 2 });
        // Pommel
        g.circle(gripX, gripY, 1.5);
        g.fill(BUCKLE);
      } else {
        // Tool handle (wooden)
        g.moveTo(hx, hy);
        g.lineTo(tipX, tipY);
        g.stroke({ color: 0x8B6914, width: 2 });
        // Handle wrap
        g.moveTo(hx, hy);
        g.lineTo(hx + Math.cos(wAngle) * 2, hy - Math.sin(wAngle) * 2);
        g.stroke({ color: 0x6B4226, width: 2.5 });
        // Tool head (shaped by type)
        if (held.toolType === ToolType.PICKAXE) {
          // Pickaxe head (curved)
          const headAngle = wAngle + Math.PI * 0.3 * dir;
          g.moveTo(tipX + Math.cos(headAngle) * 5, tipY - Math.sin(headAngle) * 5);
          g.quadraticCurveTo(tipX + Math.cos(wAngle) * 2, tipY - Math.sin(wAngle) * 2,
            tipX + Math.cos(headAngle + Math.PI) * 4, tipY - Math.sin(headAngle + Math.PI) * 4);
          g.stroke({ color: held.color, width: 2 });
        } else if (held.toolType === ToolType.AXE) {
          // Axe head (wedge shape)
          const ax1 = tipX + Math.sin(wAngle) * 4;
          const ay1 = tipY + Math.cos(wAngle) * 4;
          const ax2 = tipX - Math.sin(wAngle) * 1;
          const ay2 = tipY - Math.cos(wAngle) * 1;
          g.moveTo(tipX + Math.cos(wAngle) * 2, tipY - Math.sin(wAngle) * 2);
          g.lineTo(ax1, ay1);
          g.lineTo(ax2, ay2);
          g.closePath();
          g.fill(held.color);
          // Edge highlight
          g.moveTo(ax1, ay1); g.lineTo(ax2, ay2);
          g.stroke({ color: 0xFFFFFF, width: 0.4, alpha: 0.25 });
        } else {
          // Default tool head
          g.rect(tipX - 2.5, tipY - 2.5, 5, 5);
          g.fill(held.color);
          g.rect(tipX - 2.5, tipY - 2.5, 5, 1);
          g.fill({ color: 0xFFFFFF, alpha: 0.15 });
        }
      }
    }
  }

  private _drawMiningArm(g: Graphics, ax: number, ay: number, _bodyH: number, dir: number, progress: number, held: ReturnType<typeof getHeldItem>): void {
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
  // Thigh (shaped, not just rectangle)
  g.moveTo(x, top);
  g.lineTo(x + w * 1.05, top);
  g.quadraticCurveTo(x + w * 1.1, kneeY * 0.5 + top * 0.5, x + w * 0.9, kneeY);
  g.lineTo(x + w * 0.1, kneeY);
  g.quadraticCurveTo(x - w * 0.05, kneeY * 0.5 + top * 0.5, x, top);
  g.closePath();
  g.fill(pantsColor);
  // Thigh highlight (muscle contour)
  g.moveTo(x + w * 0.2, top + 1);
  g.quadraticCurveTo(x + w * 0.3, top + h * 0.2, x + w * 0.25, kneeY - 1);
  g.stroke({ color: 0xFFFFFF, width: 0.5, alpha: 0.08 });
  // Knee cap
  g.ellipse(x + w * 0.5, kneeY, w * 0.35, 1.5);
  g.fill({ color: 0x000000, alpha: 0.06 });
  // Shin (tapered)
  g.moveTo(x + w * 0.1, kneeY);
  g.lineTo(x + w * 0.9, kneeY);
  g.lineTo(x + w * 0.82, top + h - 3);
  g.lineTo(x + w * 0.18, top + h - 3);
  g.closePath();
  g.fill(pantsColor);
  // Shin crease
  g.moveTo(x + w * 0.45, kneeY + 2);
  g.lineTo(x + w * 0.5, top + h - 4);
  g.stroke({ color: 0x000000, width: 0.4, alpha: 0.06 });
  // Boot (extended with cuff and toe)
  g.moveTo(x - 1, top + h - 3);
  g.lineTo(x + w + 1, top + h - 3);
  g.lineTo(x + w + 2.5, top + h);
  g.lineTo(x - 1, top + h);
  g.closePath();
  g.fill(bootColor);
  // Boot cuff (top edge)
  g.rect(x - 0.5, top + h - 3, w + 1, 1.5);
  g.fill({ color: 0xFFFFFF, alpha: 0.06 });
  // Boot lace crosses
  for (let ly = 0; ly < 2; ly++) {
    const lcy = top + h - 2 + ly * 1;
    g.moveTo(x + w * 0.3, lcy - 0.3);
    g.lineTo(x + w * 0.6, lcy + 0.3);
    g.stroke({ color: 0x000000, width: 0.3, alpha: 0.12 });
    g.moveTo(x + w * 0.6, lcy - 0.3);
    g.lineTo(x + w * 0.3, lcy + 0.3);
    g.stroke({ color: 0x000000, width: 0.3, alpha: 0.12 });
  }
  // Boot toe cap
  g.moveTo(x + w + 1, top + h - 1.5);
  g.lineTo(x + w + 2.5, top + h);
  g.lineTo(x + w + 1, top + h);
  g.closePath();
  g.fill({ color: 0xFFFFFF, alpha: 0.06 });
  // Boot sole
  g.rect(x - 1, top + h - 0.5, w + 3.5, 0.5);
  g.fill({ color: 0x000000, alpha: 0.15 });
  // Boot highlight
  g.moveTo(x, top + h - 3);
  g.lineTo(x + w * 0.35, top + h - 3);
  g.lineTo(x + w * 0.35, top + h - 1.5);
  g.lineTo(x, top + h - 1.5);
  g.closePath();
  g.fill({ color: 0xFFFFFF, alpha: 0.08 });
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
