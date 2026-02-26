// AnimatedSprite per unit — wired to unit state machine.
//
// Animation state machine (mirrors sim FSM):
//
//   IDLE  → looping idle breath/stand cycle
//   MOVE  → looping walk cycle (direction flipped via container.scale.x)
//   ATTACK→ one-shot swing; onComplete → return visual to IDLE
//   CAST  → one-shot channel; onComplete → return visual to IDLE
//   DIE   → one-shot collapse; onComplete → freeze on last frame
//
// Sprite attachment is deferred: if AnimationManager is not yet loaded when
// the UnitView is first constructed, `update()` will attach the sprite on the
// first frame after loading is complete.
//
// Fallback: when AnimationManager has no textures for a unit type (placeholder
// mode), a colored circle is shown instead.
import { Container, Graphics, AnimatedSprite, Text, TextStyle } from "pixi.js";
import { gsap } from "gsap";
import type { Unit } from "@sim/entities/Unit";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { Direction, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";

// ---------------------------------------------------------------------------
// Visual constants
// ---------------------------------------------------------------------------

const TS = BalanceConfig.TILE_SIZE;

// Team colors (placeholder / fallback)
const COLOR_WEST = 0x4488ff;
const COLOR_EAST = 0xff4444;

const RADIUS = TS * 0.3;
const BORDER_ALPHA = 0.7;

// Health bar — positioned above the sprite / circle
const BAR_W = TS * 0.7;
const BAR_H = 4;
const HP_BG = 0x330000;
const HP_FILL = 0x44ff44;
const HP_CRIT = 0xff4444;

// Owner shield — right of the HP bar, always visible
const SHIELD_W = 12;
const SHIELD_H = 14;
const SHIELD_P1_FILL   = 0x3366cc;
const SHIELD_P1_STROKE = 0x2244aa;
const SHIELD_P1_HI     = 0x5588ee;
const SHIELD_P2_FILL   = 0xcc3333;
const SHIELD_P2_STROKE = 0xaa2222;
const SHIELD_P2_HI     = 0xee5555;

// Level star — shown next to the HP bar at level 1+
const STAR_RADIUS_OUTER = 10;
const STAR_RADIUS_INNER = 4;
const STAR_POINTS = 5;
const STAR_COLOR = 0xffdd00;
const STAR_STROKE = 0xaa8800;

// Helper functions to get size-based positioning
function getUnitSize(unit: Unit) {
  const def = UNIT_DEFINITIONS[unit.type];
  return def.size || { width: 1.0, height: 1.0 }; // Default to normal size
}

function getHealthBarY(unit: Unit) {
  const size = getUnitSize(unit);
  const baseOffset = -(TS * 0.55); // Base position for normal units
  const customOffset = size.healthBarOffset ? size.healthBarOffset * TS : 0;
  return baseOffset + customOffset;
}

function getShieldPosition(unit: Unit) {
  const barY = getHealthBarY(unit);
  return {
    x: BAR_W / 2 + SHIELD_W / 2 + 2,
    y: barY + BAR_H / 2 - 1,
  };
}

function getStarPosition(unit: Unit) {
  const barY = getHealthBarY(unit);
  // Shift star further right to make room for the shield
  return {
    x: BAR_W / 2 + SHIELD_W + STAR_RADIUS_OUTER + 4,
    y: barY + BAR_H / 2,
  };
}

const ALPHA_ALIVE = 1.0;
const ALPHA_DIE = 0.35;

/**
 * How long (ms) the corpse fade lasts after the DIE animation finishes.
 * UnitLayer uses this to time the removal timeout.
 */
export const CORPSE_FADE_MS = 1000;

// ---------------------------------------------------------------------------
// UnitView
// ---------------------------------------------------------------------------

export class UnitView {
  readonly container = new Container();

  // Placeholder graphics (visible only when no sprite sheet is available)
  private _body = new Graphics();
  private _direction = new Graphics();

  // HP bar (always visible)
  private _hpBg = new Graphics();
  private _hpFill = new Graphics();

  // Owner shield (always visible while alive)
  private _shieldContainer = new Container();
  private _shield = new Graphics();

  // Level star (visible at level >= 1)
  // Wrapped in a sub-container so we can counter-scale it against the
  // parent container's horizontal flip (west-facing units get scale.x = -1).
  private _levelStarContainer = new Container();
  private _levelStar = new Graphics();
  private _levelText = new Text({ text: "", style: new TextStyle({ fontSize: 10, fill: 0x000000, fontWeight: "bold", align: "center", stroke: { color: 0xffffff, width: 2 } }) });
  private _displayedLevel = 0;

  // Animated sprite — null until AnimationManager is ready
  private _sprite: AnimatedSprite | null = null;

  /**
   * The animation state the sprite is currently playing.
   * Separate from `unit.state` so we can detect transitions.
   */
  private _playingState: UnitState = UnitState.IDLE;

  /** True once the death sequence (anim + fade) has been started. */
  private _deathStarted = false;

  constructor(unit: Unit) {
    this._buildPlaceholder(unit);
    this._buildHpBar(unit);
    this._buildShield(unit);
    this._buildLevelStar(unit);
    this._tryAttachSprite(unit);
    this.update(unit);
  }

  // ---------------------------------------------------------------------------
  // Per-frame sync
  // ---------------------------------------------------------------------------

  /** Called every render frame by UnitLayer. */
  update(unit: Unit): void {
    // Once the death sequence has started, stop all further updates — gsap
    // owns the container alpha from this point.
    if (this._deathStarted) return;

    // Position
    this.container.position.set(
      (unit.position.x + 0.5) * TS,
      (unit.position.y + 0.5) * TS,
    );
    // Depth sort
    this.container.zIndex = unit.position.y;
    // Facing direction — flip horizontally for west-facing units
    this.container.scale.x = unit.facingDirection === Direction.WEST ? -1 : 1;

    // Initial death dimming — will be taken over by startDeathSequence() once
    // UnitLayer calls it after receiving the unitDied event.
    if (unit.state === UnitState.DIE) {
      this.container.alpha = ALPHA_DIE;
    } else {
      this.container.alpha = ALPHA_ALIVE;
    }

    // Lazy sprite attachment (AnimationManager may not have been ready at construction)
    if (!this._sprite) {
      this._tryAttachSprite(unit);
    }

    // Drive animation transitions
    if (this._sprite) {
      this._syncAnimation(unit);
    }

    // HP bar, shield & level star — hidden when dying
    if (unit.state === UnitState.DIE) {
      this._hpBg.visible = false;
      this._hpFill.visible = false;
      this._shieldContainer.visible = false;
      this._levelStarContainer.visible = false;
    } else {
      this._updateHpBar(unit);
      // Counter-scale shield so it's never mirrored
      this._shieldContainer.scale.x = this.container.scale.x === -1 ? -1 : 1;
      this._updateLevelStar(unit);
    }
  }

  /**
   * Kick off the full death sequence:
   *   1. Play DIE animation (one-shot, freezes on last frame).
   *   2. After animation completes, fade container alpha → 0 over CORPSE_FADE_MS.
   *
   * Called by UnitLayer immediately when `unitDied` fires.
   * The unit's screen position should already be set by the last `update()` call.
   */
  startDeathSequence(unit: Unit): void {
    if (this._deathStarted) return;
    this._deathStarted = true;

    // Hide HP bar and level star immediately
    this._hpBg.visible = false;
    this._hpFill.visible = false;
    this._levelStarContainer.visible = false;

    // Dim to the die-alpha immediately (sim may not have ticked DIE yet)
    this.container.alpha = ALPHA_DIE;

    // Kick off the DIE animation if sprite is available
    if (this._sprite && this._playingState !== UnitState.DIE) {
      this._playState(unit, UnitState.DIE);
    }

    // Schedule corpse fade after the DIE animation plays.
    // 7 frames at 8fps ≈ 875ms. Fade starts after that window.
    const animDurationMs = 900;
    setTimeout(() => {
      gsap.to(this.container, {
        alpha: 0,
        duration: CORPSE_FADE_MS / 1000,
        ease: "power1.in",
      });
    }, animDurationMs);
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
    this.container.addChild(this._body);

    // Small forward-pointing line (flipped by container.scale.x)
    this._direction
      .moveTo(RADIUS - 2, 0)
      .lineTo(RADIUS + 6, 0)
      .stroke({ color: 0xffffff, alpha: 0.8, width: 2 });
    this.container.addChild(this._direction);
  }

  // ---------------------------------------------------------------------------
  // HP bar
  // ---------------------------------------------------------------------------

  private _buildHpBar(unit: Unit): void {
    const barY = getHealthBarY(unit);
    this._hpBg.rect(-BAR_W / 2, barY, BAR_W, BAR_H).fill({ color: HP_BG });
    this.container.addChild(this._hpBg);
    this.container.addChild(this._hpFill);
  }

  // ---------------------------------------------------------------------------
  // Owner shield
  // ---------------------------------------------------------------------------

  private _buildShield(unit: Unit): void {
    const isP1 = unit.owner === "p1";
    const fill   = isP1 ? SHIELD_P1_FILL   : SHIELD_P2_FILL;
    const stroke = isP1 ? SHIELD_P1_STROKE : SHIELD_P2_STROKE;
    const hi     = isP1 ? SHIELD_P1_HI     : SHIELD_P2_HI;

    const pos = getShieldPosition(unit);
    const cx = pos.x;
    const cy = pos.y;
    const hw = SHIELD_W / 2;  // half width
    const hh = SHIELD_H / 2;  // half height

    // Classic kite-shield shape: flat top, tapers to a point at the bottom
    this._shield
      .moveTo(cx - hw, cy - hh)          // top-left
      .lineTo(cx + hw, cy - hh)          // top-right
      .lineTo(cx + hw, cy + hh * 0.3)    // right shoulder
      .lineTo(cx,      cy + hh)          // bottom point
      .lineTo(cx - hw, cy + hh * 0.3)    // left shoulder
      .closePath()
      .fill({ color: fill })
      .moveTo(cx - hw, cy - hh)
      .lineTo(cx + hw, cy - hh)
      .lineTo(cx + hw, cy + hh * 0.3)
      .lineTo(cx,      cy + hh)
      .lineTo(cx - hw, cy + hh * 0.3)
      .closePath()
      .stroke({ color: stroke, width: 1.5 });

    // Subtle highlight on top-left for depth
    this._shield
      .moveTo(cx - hw + 2, cy - hh + 2)
      .lineTo(cx + hw - 2, cy - hh + 2)
      .lineTo(cx + hw - 3, cy - hh + 5)
      .lineTo(cx - hw + 2, cy - hh + 5)
      .closePath()
      .fill({ color: hi, alpha: 0.5 });

    this._shieldContainer.addChild(this._shield);
    this.container.addChild(this._shieldContainer);
  }

  private _buildLevelStar(unit: Unit): void {
    // Star graphic and text start hidden; shown only when level >= 1
    this._levelStarContainer.visible = false;

    // Center the text label on the star
    this._levelText.anchor.set(0.5, 0.5);
    
    // Set position using generic system
    const starPos = getStarPosition(unit);
    this._levelText.position.set(starPos.x, starPos.y);

    this._levelStarContainer.addChild(this._levelStar);
    this._levelStarContainer.addChild(this._levelText);
    this.container.addChild(this._levelStarContainer);
  }

  private _updateLevelStar(unit: Unit): void {
    if (unit.level < 1) {
      this._levelStarContainer.visible = false;
      return;
    }

    this._levelStarContainer.visible = true;

    // Counter-scale so the star is never mirrored regardless of facing direction
    this._levelStarContainer.scale.x = this.container.scale.x === -1 ? -1 : 1;

    // Only redraw when level changes
    if (unit.level !== this._displayedLevel) {
      this._displayedLevel = unit.level;

      // Get star position using generic system
      const starPos = getStarPosition(unit);

      // Draw the 5-pointed star
      this._levelStar.clear();
      const points: number[] = [];
      for (let i = 0; i < STAR_POINTS * 2; i++) {
        const angle = (i * Math.PI) / STAR_POINTS - Math.PI / 2;
        const r = i % 2 === 0 ? STAR_RADIUS_OUTER : STAR_RADIUS_INNER;
        points.push(starPos.x + Math.cos(angle) * r, starPos.y + Math.sin(angle) * r);
      }
      this._levelStar
        .poly(points)
        .fill({ color: STAR_COLOR })
        .stroke({ color: STAR_STROKE, width: 1 });

      this._levelText.text = String(unit.level);
    }
  }

  private _updateHpBar(unit: Unit): void {
    const pct = Math.max(0, unit.hp / unit.maxHp);
    const fillW = BAR_W * pct;
    const hpColor = pct < 0.3 ? HP_CRIT : HP_FILL;
    const barY = getHealthBarY(unit);
    this._hpFill.clear();
    if (fillW > 0) {
      this._hpFill
        .rect(-BAR_W / 2, barY, fillW, BAR_H)
        .fill({ color: hpColor });
    }
  }

  // ---------------------------------------------------------------------------
  // Sprite attachment (deferred until AnimationManager is ready)
  // ---------------------------------------------------------------------------

  private _tryAttachSprite(unit: Unit): void {
    if (!animationManager.isLoaded) return;

    const textures = animationManager.getFrames(unit.type, UnitState.IDLE);
    if (textures.length === 0) return;

    const sprite = new AnimatedSprite(textures);
    // Pivot at feet for correct depth sorting
    sprite.anchor.set(0.5, 0.75);
    
    // Use generic size system from unit definition
    const size = getUnitSize(unit);
    sprite.width = TS * 0.8 * size.width;
    sprite.height = TS * 0.8 * size.height;

    // Configure speed for IDLE
    const idleSet = animationManager.getFrameSet(unit.type, UnitState.IDLE);
    sprite.animationSpeed = idleSet.fps / 60;
    sprite.loop = true;
    sprite.play();

    // Hide placeholder graphics — sprite replaces them
    this._body.visible = false;
    this._direction.visible = false;

    // Insert sprite below HP bar (addChildAt index 0)
    this.container.addChildAt(sprite, 0);
    this._sprite = sprite;
    this._playingState = UnitState.IDLE;
  }

  // ---------------------------------------------------------------------------
  // Animation state machine
  // ---------------------------------------------------------------------------

  private _syncAnimation(unit: Unit): void {
    const desiredState = unit.idleInterruptionTimer > 0 ? UnitState.IDLE : unit.state;
    if (desiredState === this._playingState) return;
    this._playState(unit, desiredState);
  }

  private _playState(unit: Unit, state: UnitState): void {
    const sprite = this._sprite!;

    const frameSet = animationManager.getFrameSet(unit.type, state);
    const textures = animationManager.getFrames(unit.type, state);

    sprite.textures = textures;
    sprite.animationSpeed = frameSet.fps / 60;
    sprite.loop = frameSet.loop;
    this._playingState = state;

    // Wire completion callbacks for one-shot animations
    sprite.onComplete = undefined;

    if (state === UnitState.ATTACK || state === UnitState.CAST) {
      sprite.onComplete = () => {
        // Visually return to IDLE after swing/cast finishes.
        // The sim may have already transitioned to IDLE or MOVE — we follow
        // whatever the sim says in the next update() call, but set playingState
        // to something that forces a re-check.
        this._playingState = null as unknown as UnitState;
      };
    } else if (state === UnitState.DIE) {
      sprite.onComplete = () => {
        // Freeze on last frame of die animation
        sprite.gotoAndStop(sprite.totalFrames - 1);
      };
    }

    sprite.gotoAndPlay(0);
  }
}
