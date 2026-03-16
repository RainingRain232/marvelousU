// ---------------------------------------------------------------------------
// Rift Wizard renderer — tile grid + entities + spell VFX
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import {
  RWTileType,
  RWAnimationType,
  type AnimationEvent,
} from "../state/RiftWizardState";
import { RWBalance } from "../config/RiftWizardConfig";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";

const TS = RWBalance.TILE_SIZE;

// ---------------------------------------------------------------------------
// Color palette
// ---------------------------------------------------------------------------

const TILE_COLORS: Record<RWTileType, number> = {
  [RWTileType.WALL]: 0x222222,
  [RWTileType.FLOOR]: 0x444444,
  [RWTileType.CORRIDOR]: 0x3a3a3a,
  [RWTileType.LAVA]: 0xcc3300,
  [RWTileType.ICE]: 0x88ccff,
  [RWTileType.CHASM]: 0x111111,
  [RWTileType.SHRINE]: 0x886644,
  [RWTileType.SPELL_CIRCLE]: 0x5544aa,
  [RWTileType.RIFT_PORTAL]: 0x9933ff,
};

const WIZARD_COLOR = 0x4488ff;
const ENEMY_COLOR = 0xcc2222;
const BOSS_COLOR = 0xff4444;
const SUMMON_COLOR = 0x44cc88;
const SPAWNER_COLOR = 0x996633;
const ITEM_COLOR = 0xffcc00;
// ---------------------------------------------------------------------------
// Active animation state
// ---------------------------------------------------------------------------

interface ActiveAnim {
  event: AnimationEvent;
  elapsed: number;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class RiftWizardRenderer {
  readonly worldLayer = new Container();

  private _tileGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _fxGfx = new Graphics();
  private _cursorGfx = new Graphics();
  private _dmgNumbers: { x: number; y: number; text: Text; lifetime: number }[] = [];
  private _activeAnims: ActiveAnim[] = [];

  init(): void {
    this.worldLayer.removeChildren();

    this._tileGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._fxGfx = new Graphics();
    this._cursorGfx = new Graphics();

    this.worldLayer.addChild(this._tileGfx);
    this.worldLayer.addChild(this._entityGfx);
    this.worldLayer.addChild(this._fxGfx);
    this.worldLayer.addChild(this._cursorGfx);

    this._dmgNumbers = [];
    this._activeAnims = [];
  }

  /** Returns true if animations are still playing. */
  get isAnimating(): boolean {
    return this._activeAnims.length > 0;
  }

  draw(
    state: RiftWizardState,
    screenWidth: number,
    screenHeight: number,
    dt: number,
  ): void {
    // Center the map on screen
    const mapPxW = state.level.width * TS;
    const mapPxH = state.level.height * TS;
    const offsetX = Math.floor((screenWidth - mapPxW) / 2);
    const offsetY = Math.floor((screenHeight - mapPxH) / 2) - 40; // leave room for HUD

    this.worldLayer.x = offsetX;
    this.worldLayer.y = offsetY;

    this._drawTiles(state);
    this._drawEntities(state);
    this._drawTargetCursor(state);
    this._updateAnimations(state, dt);
    this._updateDamageNumbers(dt);
  }

  // -------------------------------------------------------------------------
  // Tiles
  // -------------------------------------------------------------------------

  private _drawTiles(state: RiftWizardState): void {
    this._tileGfx.clear();

    for (let row = 0; row < state.level.height; row++) {
      for (let col = 0; col < state.level.width; col++) {
        const tile = state.level.tiles[row][col];
        const color = TILE_COLORS[tile] ?? 0x333333;
        const x = col * TS;
        const y = row * TS;

        this._tileGfx.rect(x, y, TS - 1, TS - 1);
        this._tileGfx.fill(color);

        // Grid lines
        this._tileGfx.rect(x, y, TS, TS);
        this._tileGfx.stroke({ color: 0x1a1a1a, width: 1 });
      }
    }

    // Draw shrine indicators
    for (const shrine of state.level.shrines) {
      if (shrine.used) continue;
      const sx = shrine.col * TS + TS / 2;
      const sy = shrine.row * TS + TS / 2;
      this._tileGfx.circle(sx, sy, TS * 0.35);
      this._tileGfx.fill({ color: SCHOOL_COLORS[shrine.school], alpha: 0.4 });
    }

    // Draw spell circle indicators
    for (const circle of state.level.spellCircles) {
      const cx = circle.col * TS + TS / 2;
      const cy = circle.row * TS + TS / 2;
      this._tileGfx.circle(cx, cy, TS * 0.4);
      this._tileGfx.stroke({ color: SCHOOL_COLORS[circle.school], width: 2 });
    }

    // Draw items on ground
    for (const item of state.level.items) {
      if (item.picked) continue;
      const ix = item.col * TS + TS / 2;
      const iy = item.row * TS + TS / 2;
      this._tileGfx.star(ix, iy, 4, TS * 0.15, TS * 0.08);
      this._tileGfx.fill(ITEM_COLOR);
    }
  }

  // -------------------------------------------------------------------------
  // Entities
  // -------------------------------------------------------------------------

  private _drawEntities(state: RiftWizardState): void {
    this._entityGfx.clear();

    // Draw rift portals
    for (const portal of state.level.riftPortals) {
      const px = portal.col * TS;
      const py = portal.row * TS;
      // Pulsing portal effect
      this._entityGfx.rect(px + 2, py + 2, TS - 4, TS - 4);
      this._entityGfx.fill({ color: SCHOOL_COLORS[portal.theme] ?? 0x9933ff, alpha: 0.7 });
      this._entityGfx.rect(px + 4, py + 4, TS - 8, TS - 8);
      this._entityGfx.stroke({ color: 0xffffff, width: 1 });
    }

    // Draw spawners
    for (const spawner of state.level.spawners) {
      if (!spawner.alive) continue;
      const sx = spawner.col * TS;
      const sy = spawner.row * TS;
      this._entityGfx.rect(sx + 2, sy + 2, TS - 4, TS - 4);
      this._entityGfx.fill(SPAWNER_COLOR);
      // HP bar
      this._drawHpBar(sx, sy - 4, spawner.hp, spawner.maxHp);
    }

    // Draw summons
    for (const summon of state.level.summons) {
      if (!summon.alive) continue;
      const sx = summon.col * TS + TS / 2;
      const sy = summon.row * TS + TS / 2;
      this._entityGfx.circle(sx, sy, TS * 0.3);
      this._entityGfx.fill(SUMMON_COLOR);
      this._drawHpBar(summon.col * TS, summon.row * TS - 4, summon.hp, summon.maxHp);
    }

    // Draw enemies
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.col * TS + TS / 2;
      const ey = enemy.row * TS + TS / 2;
      const color = enemy.isBoss ? BOSS_COLOR : (enemy.school ? SCHOOL_COLORS[enemy.school] ?? ENEMY_COLOR : ENEMY_COLOR);

      if (enemy.isBoss) {
        // Boss: larger diamond
        this._entityGfx.moveTo(ex, ey - TS * 0.4);
        this._entityGfx.lineTo(ex + TS * 0.4, ey);
        this._entityGfx.lineTo(ex, ey + TS * 0.4);
        this._entityGfx.lineTo(ex - TS * 0.4, ey);
        this._entityGfx.closePath();
        this._entityGfx.fill(color);
      } else {
        // Regular: circle
        this._entityGfx.circle(ex, ey, TS * 0.3);
        this._entityGfx.fill(color);
      }

      // Stun indicator
      if (enemy.stunTurns > 0) {
        this._entityGfx.circle(ex, ey, TS * 0.35);
        this._entityGfx.stroke({ color: 0x88ccff, width: 2 });
      }

      // HP bar
      this._drawHpBar(enemy.col * TS, enemy.row * TS - 4, enemy.hp, enemy.maxHp);
    }

    // Draw wizard (on top)
    const wx = state.wizard.col * TS + TS / 2;
    const wy = state.wizard.row * TS + TS / 2;
    // Wizard body
    this._entityGfx.circle(wx, wy, TS * 0.35);
    this._entityGfx.fill(WIZARD_COLOR);
    // Wizard hat (triangle)
    this._entityGfx.moveTo(wx, wy - TS * 0.5);
    this._entityGfx.lineTo(wx + TS * 0.2, wy - TS * 0.15);
    this._entityGfx.lineTo(wx - TS * 0.2, wy - TS * 0.15);
    this._entityGfx.closePath();
    this._entityGfx.fill(WIZARD_COLOR);
    // Shield indicator
    if (state.wizard.shields > 0) {
      this._entityGfx.circle(wx, wy, TS * 0.4);
      this._entityGfx.stroke({ color: 0x44ddff, width: 2 });
    }
    // HP bar
    this._drawHpBar(state.wizard.col * TS, state.wizard.row * TS - 6, state.wizard.hp, state.wizard.maxHp);
  }

  private _drawHpBar(x: number, y: number, hp: number, maxHp: number): void {
    const barWidth = TS - 4;
    const barHeight = 3;
    const ratio = Math.max(0, hp / maxHp);

    // Background
    this._entityGfx.rect(x + 2, y, barWidth, barHeight);
    this._entityGfx.fill(0x330000);
    // Fill
    this._entityGfx.rect(x + 2, y, barWidth * ratio, barHeight);
    this._entityGfx.fill(ratio > 0.5 ? 0x00cc00 : ratio > 0.25 ? 0xcccc00 : 0xcc0000);
  }

  // -------------------------------------------------------------------------
  // Target cursor
  // -------------------------------------------------------------------------

  private _drawTargetCursor(state: RiftWizardState): void {
    this._cursorGfx.clear();

    if (state.selectedSpellIndex < 0 || !state.targetCursor) return;

    const spell = state.spells[state.selectedSpellIndex];
    if (!spell) return;

    const tc = state.targetCursor;

    // Highlight AoE area
    if (spell.aoeRadius > 0 && spell.aoeRadius < 50) {
      for (let dr = -spell.aoeRadius; dr <= spell.aoeRadius; dr++) {
        for (let dc = -spell.aoeRadius; dc <= spell.aoeRadius; dc++) {
          if (Math.abs(dr) + Math.abs(dc) > spell.aoeRadius) continue;
          const hx = (tc.col + dc) * TS;
          const hy = (tc.row + dr) * TS;
          this._cursorGfx.rect(hx, hy, TS, TS);
          this._cursorGfx.fill({ color: SCHOOL_COLORS[spell.school] ?? 0xff4444, alpha: 0.2 });
        }
      }
    }

    // Cursor outline
    this._cursorGfx.rect(tc.col * TS, tc.row * TS, TS, TS);
    this._cursorGfx.stroke({ color: 0xffffff, width: 2 });
  }

  // -------------------------------------------------------------------------
  // VFX animations
  // -------------------------------------------------------------------------

  /** Consume animation events from state and create active animations. */
  consumeAnimationQueue(state: RiftWizardState): void {
    for (const event of state.animationQueue) {
      if (event.type === RWAnimationType.DAMAGE_NUMBER) {
        this._spawnDamageNumber(event);
      } else {
        this._activeAnims.push({ event, elapsed: 0 });
      }
    }
    state.animationQueue.length = 0;
  }

  private _spawnDamageNumber(event: AnimationEvent): void {
    const amount = event.amount ?? 0;
    const isHeal = amount < 0;
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 14,
      fill: isHeal ? 0x44ff44 : 0xff4444,
      fontWeight: "bold",
    });
    const text = new Text({ text: `${Math.abs(amount)}`, style });
    text.anchor.set(0.5, 1);
    text.x = event.fromCol * TS + TS / 2;
    text.y = event.fromRow * TS;
    this.worldLayer.addChild(text);
    this._dmgNumbers.push({ x: text.x, y: text.y, text, lifetime: RWBalance.DAMAGE_NUMBER_DURATION });
  }

  private _updateDamageNumbers(dt: number): void {
    for (let i = this._dmgNumbers.length - 1; i >= 0; i--) {
      const dmg = this._dmgNumbers[i];
      dmg.lifetime -= dt;
      dmg.text.y -= 30 * dt; // float upward
      dmg.text.alpha = Math.max(0, dmg.lifetime / RWBalance.DAMAGE_NUMBER_DURATION);
      if (dmg.lifetime <= 0) {
        this.worldLayer.removeChild(dmg.text);
        dmg.text.destroy();
        this._dmgNumbers.splice(i, 1);
      }
    }
  }

  private _updateAnimations(_state: RiftWizardState, dt: number): void {
    this._fxGfx.clear();

    for (let i = this._activeAnims.length - 1; i >= 0; i--) {
      const anim = this._activeAnims[i];
      anim.elapsed += dt;
      const t = Math.min(1, anim.elapsed / anim.event.duration);

      this._drawAnimation(anim.event, t);

      if (t >= 1) {
        this._activeAnims.splice(i, 1);
      }
    }
  }

  private _drawAnimation(event: AnimationEvent, t: number): void {
    const fromX = event.fromCol * TS + TS / 2;
    const fromY = event.fromRow * TS + TS / 2;
    const toX = event.toCol * TS + TS / 2;
    const toY = event.toRow * TS + TS / 2;
    const alpha = 1 - t;

    switch (event.type) {
      case RWAnimationType.FIREBALL:
      case RWAnimationType.ICE_BALL: {
        // Projectile traveling from -> to then expanding
        const color = event.type === RWAnimationType.FIREBALL ? 0xff6600 : 0x44bbff;
        if (t < 0.5) {
          // Travel phase
          const pt = t * 2;
          const px = fromX + (toX - fromX) * pt;
          const py = fromY + (toY - fromY) * pt;
          this._fxGfx.circle(px, py, 4);
          this._fxGfx.fill(color);
        } else {
          // Explosion phase
          const et = (t - 0.5) * 2;
          const radius = et * TS * 1.5;
          this._fxGfx.circle(toX, toY, radius);
          this._fxGfx.fill({ color, alpha: alpha });
        }
        break;
      }

      case RWAnimationType.CHAIN_LIGHTNING: {
        if (event.chain && event.chain.length >= 2) {
          for (let j = 0; j < event.chain.length - 1; j++) {
            const a = event.chain[j];
            const b = event.chain[j + 1];
            const ax = a.col * TS + TS / 2;
            const ay = a.row * TS + TS / 2;
            const bx = b.col * TS + TS / 2;
            const by = b.row * TS + TS / 2;
            // Jagged line
            this._fxGfx.moveTo(ax, ay);
            const midX = (ax + bx) / 2 + (Math.random() - 0.5) * 8;
            const midY = (ay + by) / 2 + (Math.random() - 0.5) * 8;
            this._fxGfx.lineTo(midX, midY);
            this._fxGfx.lineTo(bx, by);
            this._fxGfx.stroke({ color: 0xffff44, width: 2, alpha });
          }
        }
        break;
      }

      case RWAnimationType.MAGIC_MISSILE:
      case RWAnimationType.DEATH_BOLT:
      case RWAnimationType.HOLY_LIGHT:
      case RWAnimationType.ENEMY_SPELL: {
        const color =
          event.type === RWAnimationType.DEATH_BOLT ? 0x666666 :
          event.type === RWAnimationType.HOLY_LIGHT ? 0xffffaa :
          event.type === RWAnimationType.ENEMY_SPELL ? 0xff8844 :
          0xaa44ff;
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        this._fxGfx.circle(px, py, 3);
        this._fxGfx.fill({ color, alpha });
        break;
      }

      case RWAnimationType.WARP: {
        // Flash at origin and destination
        this._fxGfx.circle(fromX, fromY, TS * alpha);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.5 });
        this._fxGfx.circle(toX, toY, TS * t);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.5 });
        break;
      }

      case RWAnimationType.HEAL: {
        this._fxGfx.circle(toX, toY, TS * t * 0.8);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.5 });
        break;
      }

      case RWAnimationType.SUMMON: {
        this._fxGfx.circle(toX, toY, TS * t);
        this._fxGfx.fill({ color: 0x44cc88, alpha: alpha * 0.4 });
        break;
      }

      case RWAnimationType.FIRE_BREATH:
      case RWAnimationType.FROST_BREATH: {
        const color = event.type === RWAnimationType.FIRE_BREATH ? 0xff6600 : 0x44bbff;
        // Expanding cone
        const dx = toX - fromX;
        const dy = toY - fromY;
        const spread = t * TS * 2;
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + dx * t + spread * 0.5, fromY + dy * t - spread * 0.3);
        this._fxGfx.lineTo(fromX + dx * t - spread * 0.5, fromY + dy * t + spread * 0.3);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color, alpha: alpha * 0.5 });
        break;
      }

      case RWAnimationType.WEB: {
        this._fxGfx.circle(toX, toY, TS * t * 1.2);
        this._fxGfx.fill({ color: 0xcccccc, alpha: alpha * 0.3 });
        break;
      }

      case RWAnimationType.DISTORTION: {
        this._fxGfx.circle(toX, toY, TS * t * 1.5);
        this._fxGfx.stroke({ color: 0xaa44ff, width: 3, alpha });
        break;
      }

      case RWAnimationType.EARTHQUAKE: {
        // Screen-wide shake effect (draw pulsing overlay)
        const shakeAlpha = alpha * 0.15;
        this._fxGfx.rect(0, 0, 1000, 800);
        this._fxGfx.fill({ color: 0x886633, alpha: shakeAlpha });
        break;
      }

      case RWAnimationType.FIRE_AURA: {
        this._fxGfx.circle(fromX, fromY, TS * 2 * t);
        this._fxGfx.stroke({ color: 0xff6600, width: 3, alpha });
        break;
      }

      case RWAnimationType.MELEE_HIT: {
        // Quick flash at target
        this._fxGfx.circle(toX, toY, TS * 0.3 * alpha);
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.6 });
        break;
      }

      case RWAnimationType.DEATH: {
        // Fade out circle
        this._fxGfx.circle(fromX, fromY, TS * 0.3 * alpha);
        this._fxGfx.fill({ color: 0xff0000, alpha: alpha * 0.5 });
        break;
      }
    }
  }

  destroy(): void {
    for (const dmg of this._dmgNumbers) {
      this.worldLayer.removeChild(dmg.text);
      dmg.text.destroy();
    }
    this._dmgNumbers = [];
    this._activeAnims = [];
    this.worldLayer.removeChildren();
    this._tileGfx.destroy();
    this._entityGfx.destroy();
    this._fxGfx.destroy();
    this._cursorGfx.destroy();
  }
}
