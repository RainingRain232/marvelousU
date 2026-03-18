// ---------------------------------------------------------------------------
// Terraria – Player sprite rendering (improved with hair, arms, held item)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import { BLOCK_DEFS } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { getHeldItem } from "../state/TerrariaInventory";
import { ItemCategory } from "../state/TerrariaInventory";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;

export class TerrariaPlayerView {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _walkFrame = 0;
  private _breathFrame = 0;

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

    // Animations
    const walking = Math.abs(p.vx) > 0.5;
    const jumping = !p.onGround;

    if (walking && p.onGround) {
      this._walkFrame += dt * 10;
    } else if (jumping) {
      this._walkFrame = Math.PI / 4; // fixed jump pose
    } else {
      this._walkFrame *= 0.85; // settle
    }
    this._breathFrame += dt * 2;
    const breathOffset = Math.sin(this._breathFrame) * 0.5;

    const legSwing = Math.sin(this._walkFrame) * 3;
    const armSwing = Math.sin(this._walkFrame + Math.PI) * 2.5;

    this._gfx.clear();

    // Invulnerability flash
    if (p.invulnTimer > 0 && Math.floor(p.invulnTimer * 10) % 2 === 0) {
      this.container.alpha = 0.35;
    } else {
      this.container.alpha = 1;
    }

    const headTop = sy - ph + breathOffset;
    const headH = pw * 0.9;
    const bodyTop = headTop + headH;
    const bodyH = ph * 0.38;
    const legTop = bodyTop + bodyH;
    const legH = ph - headH - bodyH;

    // === BACK ARM ===
    const backArmX = sx - dir * hw * 0.3;
    const backArmY = bodyTop + 2;
    this._gfx.rect(backArmX - 2, backArmY + armSwing, 4, bodyH * 0.8);
    this._gfx.fill(0x1a448a);

    // === LEGS ===
    const legW = pw * 0.28;
    // Left leg
    this._gfx.rect(sx - hw * 0.5 + legSwing, legTop, legW, legH);
    this._gfx.fill(0x6B5020);
    // Right leg
    this._gfx.rect(sx + hw * 0.1 - legSwing, legTop, legW, legH);
    this._gfx.fill(0x5A4018);
    // Boots
    this._gfx.rect(sx - hw * 0.5 + legSwing - 1, legTop + legH - 3, legW + 2, 3);
    this._gfx.fill(0x4A3010);
    this._gfx.rect(sx + hw * 0.1 - legSwing - 1, legTop + legH - 3, legW + 2, 3);
    this._gfx.fill(0x4A3010);

    // === BODY (tunic) ===
    this._gfx.rect(sx - hw, bodyTop, pw, bodyH);
    this._gfx.fill(0x2255AA);
    // Belt
    this._gfx.rect(sx - hw, bodyTop + bodyH - 3, pw, 3);
    this._gfx.fill(0x8B6914);
    // Belt buckle
    this._gfx.rect(sx - 1.5, bodyTop + bodyH - 3, 3, 3);
    this._gfx.fill(0xFFD700);

    // === HEAD ===
    const headW = pw * 0.75;
    this._gfx.rect(sx - headW / 2, headTop, headW, headH);
    this._gfx.fill(0xFFCC99);

    // Hair
    this._gfx.rect(sx - headW / 2 - 1, headTop - 2, headW + 2, headH * 0.4);
    this._gfx.fill(0x6B3A1F);
    // Hair fringe
    if (p.facingRight) {
      this._gfx.rect(sx - headW / 2 - 1, headTop - 2, headW * 0.3, headH * 0.55);
      this._gfx.fill(0x6B3A1F);
    } else {
      this._gfx.rect(sx + headW / 2 - headW * 0.3 + 1, headTop - 2, headW * 0.3, headH * 0.55);
      this._gfx.fill(0x6B3A1F);
    }

    // Eyes
    const eyeX = p.facingRight ? sx + headW * 0.1 : sx - headW * 0.2;
    this._gfx.rect(eyeX, headTop + headH * 0.4, 2, 2);
    this._gfx.fill(0x2244AA);
    // Mouth
    this._gfx.rect(p.facingRight ? sx + headW * 0.05 : sx - headW * 0.15, headTop + headH * 0.7, 3, 1);
    this._gfx.fill(0xCC8866);

    // === FRONT ARM + HELD ITEM ===
    const frontArmX = sx + dir * hw * 0.3;
    const frontArmY = bodyTop + 2;
    const held = getHeldItem(p.inventory);

    if (p.attackTimer > 0) {
      // Swing animation
      const swingPct = 1 - p.attackTimer / TB.ATTACK_COOLDOWN;
      const swingAngle = swingPct * Math.PI * 0.8 - Math.PI * 0.3;
      const armLen = TS * 1.4;
      const ax = frontArmX;
      const ay = frontArmY + 3;
      const ex = ax + Math.cos(swingAngle * dir) * armLen;
      const ey = ay - Math.sin(swingAngle * dir) * armLen;

      // Arm
      this._gfx.moveTo(ax, ay);
      this._gfx.lineTo(ex, ey);
      this._gfx.stroke({ color: 0xFFCC99, width: 3 });

      // Tool/weapon at end
      if (held) {
        const toolColor = held.color;
        this._gfx.rect(ex - 2, ey - 2, 5, 5);
        this._gfx.fill(toolColor);
        // Blade/head
        const bx = ex + Math.cos(swingAngle * dir) * 5;
        const by = ey - Math.sin(swingAngle * dir) * 5;
        this._gfx.moveTo(ex, ey);
        this._gfx.lineTo(bx, by);
        this._gfx.stroke({ color: toolColor, width: 3 });
      }
    } else if (p.miningTarget) {
      // Mining animation (pickaxe swing)
      const prog = p.miningTarget.progress;
      const mineAngle = Math.sin(prog * Math.PI * 6) * 0.5 - 0.3;
      const armLen = TS * 1.2;
      const ax = frontArmX;
      const ay = frontArmY + 3;
      const ex = ax + Math.cos(mineAngle * dir) * armLen;
      const ey = ay - Math.sin(mineAngle * dir) * armLen;

      this._gfx.moveTo(ax, ay);
      this._gfx.lineTo(ex, ey);
      this._gfx.stroke({ color: 0xFFCC99, width: 3 });

      if (held) {
        this._gfx.rect(ex - 2, ey - 3, 4, 6);
        this._gfx.fill(held.color);
      }
    } else {
      // Idle/walking arm
      this._gfx.rect(frontArmX - 2, frontArmY - armSwing, 4, bodyH * 0.8);
      this._gfx.fill(0xFFCC99);

      // Show held item at side
      if (held) {
        const itemY = frontArmY + bodyH * 0.5 - armSwing;
        const itemX = frontArmX + dir * 3;
        if (held.category === ItemCategory.BLOCK && held.blockType !== undefined) {
          const blockDef = BLOCK_DEFS[held.blockType];
          if (blockDef) {
            this._gfx.rect(itemX - 3, itemY - 3, 6, 6);
            this._gfx.fill(blockDef.color);
          }
        } else {
          this._gfx.rect(itemX - 2, itemY - 4, 4, 8);
          this._gfx.fill(held.color);
        }
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
