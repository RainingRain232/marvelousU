// Animated sprite per unit — uses AnimatedSprite when textures are available,
// falls back to the colored-circle placeholder when AnimationManager is not
// yet loaded or has no real sheet for this unit type.
import { Container, Graphics, AnimatedSprite } from "pixi.js";
import type { Unit } from "@sim/entities/Unit";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { Direction, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

// Team colors (placeholder / fallback)
const COLOR_WEST = 0x4488ff;
const COLOR_EAST = 0xff4444;

const RADIUS = TS * 0.3;
const BORDER_ALPHA = 0.7;

// Health bar
const BAR_W = TS * 0.7;
const BAR_H = 4;
const BAR_Y_OFF = -(RADIUS + 8);
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_DANGER = 0xff4444;

const ALPHA_ALIVE = 1.0;
const ALPHA_DIE = 0.35;

// ---------------------------------------------------------------------------
// UnitView
// ---------------------------------------------------------------------------

export class UnitView {
  readonly container = new Container();

  // Placeholder graphics (shown when no real spritesheet is loaded)
  private _body = new Graphics();
  private _direction = new Graphics();
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();

  // Animated sprite (shown when AnimationManager has textures)
  private _sprite: AnimatedSprite | null = null;
  private _currentAnimState: UnitState | null = null;

  constructor(unit: Unit) {
    this._buildPlaceholder(unit);
    this._tryAttachSprite(unit);
    this.update(unit);
  }

  /** Sync position, animation state, flip, alpha, and HP bar each frame. */
  update(unit: Unit): void {
    // World-space tile-centre position
    this.container.position.set(
      (unit.position.x + 0.5) * TS,
      (unit.position.y + 0.5) * TS,
    );
    this.container.zIndex = unit.position.y;
    this.container.scale.x = unit.facingDirection === Direction.WEST ? -1 : 1;
    this.container.alpha =
      unit.state === UnitState.DIE ? ALPHA_DIE : ALPHA_ALIVE;

    // Switch animation when state changes
    if (this._sprite) {
      this._syncAnimation(unit);
    }

    // HP bar
    const pct = Math.max(0, unit.hp / unit.maxHp);
    const fillW = BAR_W * pct;
    const hpColor = pct < 0.3 ? HP_DANGER : HP_FILL;
    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill
        .rect(-BAR_W / 2, BAR_Y_OFF, fillW, BAR_H)
        .fill({ color: hpColor });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Placeholder (colored circle)
  // ---------------------------------------------------------------------------

  private _buildPlaceholder(unit: Unit): void {
    const color = unit.owner === "p1" ? COLOR_WEST : COLOR_EAST;
    this._body
      .circle(0, 0, RADIUS)
      .fill({ color })
      .circle(0, 0, RADIUS)
      .stroke({ color: 0x000000, alpha: BORDER_ALPHA, width: 1.5 });

    this._direction
      .moveTo(RADIUS - 2, 0)
      .lineTo(RADIUS + 6, 0)
      .stroke({ color: 0xffffff, alpha: 0.8, width: 2 });

    this._hpBg.rect(-BAR_W / 2, BAR_Y_OFF, BAR_W, BAR_H).fill({ color: HP_BG });

    this.container.addChild(this._body);
    this.container.addChild(this._direction);
    this.container.addChild(this._hpBg);
    this.container.addChild(this._hpFill);
  }

  // ---------------------------------------------------------------------------
  // Animated sprite
  // ---------------------------------------------------------------------------

  private _tryAttachSprite(unit: Unit): void {
    if (!animationManager.isLoaded) return;

    const textures = animationManager.getFrames(unit.type, UnitState.IDLE);
    if (textures.length === 0) return;

    const sprite = new AnimatedSprite(textures);
    sprite.anchor.set(0.5, 0.75); // pivot at feet
    sprite.width = TS * 0.8;
    sprite.height = TS * 0.8;
    sprite.play();

    // Hide placeholder graphics
    this._body.visible = false;
    this._direction.visible = false;

    this.container.addChildAt(sprite, 0);
    this._sprite = sprite;
    this._currentAnimState = UnitState.IDLE;
  }

  private _syncAnimation(unit: Unit): void {
    if (!this._sprite) return;
    if (unit.state === this._currentAnimState) return;

    const frameSet = animationManager.getFrameSet(unit.type, unit.state);
    const textures = animationManager.getFrames(unit.type, unit.state);

    this._sprite.textures = textures;
    this._sprite.animationSpeed = frameSet.fps / 60; // PixiJS uses 60fps base
    this._sprite.loop = frameSet.loop;

    if (!frameSet.loop) {
      // One-shot: play then freeze on last frame
      this._sprite.onComplete = () => {
        if (this._sprite)
          this._sprite.gotoAndStop(this._sprite.totalFrames - 1);
      };
    } else {
      this._sprite.onComplete = undefined;
    }

    this._sprite.gotoAndPlay(0);
    this._currentAnimState = unit.state;
  }
}
