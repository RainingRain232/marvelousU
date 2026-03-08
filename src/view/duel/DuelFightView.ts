// ---------------------------------------------------------------------------
// Duel mode – main fight rendering view (skeleton-based)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { DuelFighterState } from "../../types";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import type { DuelFighter, DuelState } from "../../duel/state/DuelState";
import {
  drawFighterSkeleton,
  drawFighterShadow,
  type FighterPose,
  type FighterPalette,
  type DrawFighterOptions,
} from "./DuelSkeletonRenderer";
import { ARTHUR_PALETTE, ARTHUR_POSES, drawArthurExtras, drawArthurBackExtras } from "./DuelArthurPoses";
import { MERLIN_PALETTE, MERLIN_POSES, drawMerlinExtras } from "./DuelMerlinPoses";
import { ELAINE_PALETTE, ELAINE_POSES, drawElaineExtras } from "./DuelElainePoses";

// ---- Character data lookup -------------------------------------------------

const PALETTES: Record<string, FighterPalette> = {
  arthur: ARTHUR_PALETTE,
  merlin: MERLIN_PALETTE,
  elaine: ELAINE_PALETTE,
};

const POSES: Record<string, Record<string, FighterPose[]>> = {
  arthur: ARTHUR_POSES,
  merlin: MERLIN_POSES,
  elaine: ELAINE_POSES,
};

const EXTRAS: Record<string, (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void> = {
  arthur: drawArthurExtras,
  merlin: drawMerlinExtras,
  elaine: drawElaineExtras,
};

const BACK_EXTRAS: Record<string, (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void> = {
  arthur: drawArthurBackExtras,
};

// ---- Projectile colors -----------------------------------------------------

const PROJECTILE_COLORS: Record<string, number> = {
  arcane_bolt: 0x8888ff,
  frost_wave: 0x88ccff,
  power_shot: 0xddbb44,
  backflip_shot: 0xddbb44,
};

// ---- Hit spark -------------------------------------------------------------

const SPARK_DURATION = 15;

interface HitSpark {
  x: number;
  y: number;
  timer: number;
}

// ---- Fight view class ------------------------------------------------------

export class DuelFightView {
  readonly container = new Container();

  private _arenaLayer = new Container();
  private _fighterLayer = new Container();
  private _fxLayer = new Container();

  private _p1Gfx = new Graphics();
  private _p2Gfx = new Graphics();
  private _projGfx = new Graphics();
  private _sparkGfx = new Graphics();
  private _shadowGfx = new Graphics();

  private _sparks: HitSpark[] = [];

  constructor() {
    this.container.addChild(this._arenaLayer);
    this.container.addChild(this._shadowGfx);
    this.container.addChild(this._fighterLayer);
    this.container.addChild(this._fxLayer);

    this._fighterLayer.addChild(this._p1Gfx);
    this._fighterLayer.addChild(this._p2Gfx);
    this._fxLayer.addChild(this._projGfx);
    this._fxLayer.addChild(this._sparkGfx);
  }

  get arenaLayer(): Container {
    return this._arenaLayer;
  }

  init(_sw: number, _sh: number): void {
    this._sparks = [];
  }

  /** Call each display frame to render current state. */
  update(state: DuelState): void {
    this._drawFighter(this._p1Gfx, state.fighters[0], state);
    this._drawFighter(this._p2Gfx, state.fighters[1], state);
    this._drawShadows(state);
    this._drawProjectiles(state);
    this._drawSparks();

    // Screen shake on hit freeze
    if (state.slowdownFrames > 0) {
      const shake = (Math.random() - 0.5) * 6;
      this.container.position.set(shake, (Math.random() - 0.5) * 4);
    } else {
      this.container.position.set(0, 0);
    }
  }

  /** Spawn a hit spark effect at the given position. */
  addSpark(x: number, y: number): void {
    this._sparks.push({ x, y, timer: SPARK_DURATION });
  }

  // ---- Fighter drawing -----------------------------------------------------

  private _drawFighter(
    g: Graphics,
    fighter: DuelFighter,
    _state: DuelState,
  ): void {
    g.clear();

    const charId = fighter.characterId;
    const palette = PALETTES[charId];
    const poses = POSES[charId];
    const extras = EXTRAS[charId];

    if (!palette || !poses) return;

    // Determine which pose to use
    const poseKey = this._getPoseKey(fighter);
    const poseFrames = poses[poseKey] ?? poses["idle"];
    if (!poseFrames || poseFrames.length === 0) return;

    // Determine frame index based on state timer / move frame
    const frameIdx = Math.min(
      this._getFrameIndex(fighter, poseFrames),
      poseFrames.length - 1,
    );
    const currentPose = poseFrames[frameIdx];
    if (!currentPose) return;

    // Position and flip the graphics
    g.position.set(fighter.position.x, fighter.position.y);
    g.scale.x = fighter.facingRight ? 1 : -1;

    // Flash effect on hit
    const isHitFlash = fighter.state === DuelFighterState.HIT_STUN &&
      fighter.hitstunFrames % 4 < 2;

    // Invincibility flicker
    if (fighter.invincibleFrames > 0 && fighter.invincibleFrames % 4 < 2) {
      g.alpha = 0.4;
    } else {
      g.alpha = 1;
    }

    const backExtras = BACK_EXTRAS[charId];
    const opts: DrawFighterOptions = {
      pose: currentPose,
      palette,
      isFlashing: isHitFlash,
      flashColor: 0xffffff,
      helmeted: charId === "arthur",
      helmColor: 0x888899,
      drawBackExtras: backExtras,
      drawExtras: extras,
    };

    drawFighterSkeleton(g, opts);
  }

  /** Map fighter state to pose key. */
  private _getPoseKey(fighter: DuelFighter): string {
    switch (fighter.state) {
      case DuelFighterState.IDLE:
        return "idle";
      case DuelFighterState.WALK_FORWARD:
        return "walk_forward";
      case DuelFighterState.WALK_BACK:
        return "walk_back";
      case DuelFighterState.CROUCH:
      case DuelFighterState.CROUCH_IDLE:
        return "crouch";
      case DuelFighterState.JUMP:
      case DuelFighterState.JUMP_FORWARD:
      case DuelFighterState.JUMP_BACK:
        return "jump";
      case DuelFighterState.BLOCK_STAND:
        return "block_stand";
      case DuelFighterState.BLOCK_CROUCH:
        return "block_crouch";
      case DuelFighterState.DASH_FORWARD:
        return "walk_forward"; // reuse walk pose for dash
      case DuelFighterState.DASH_BACK:
        return "walk_back";
      case DuelFighterState.HIT_STUN:
      case DuelFighterState.GRABBED:
        return "hit_stun";
      case DuelFighterState.KNOCKDOWN:
        return "knockdown";
      case DuelFighterState.GET_UP:
        return "get_up";
      case DuelFighterState.VICTORY:
        return "victory";
      case DuelFighterState.DEFEAT:
        return "defeat";
      case DuelFighterState.ATTACK:
        // Use the current move name as pose key
        return fighter.currentMove ?? "idle";
      case DuelFighterState.GRAB:
        return "grab";
      default:
        return "idle";
    }
  }

  /** Calculate frame index for animation. */
  private _getFrameIndex(fighter: DuelFighter, frames: FighterPose[]): number {
    if (frames.length <= 1) return 0;

    switch (fighter.state) {
      case DuelFighterState.ATTACK:
      case DuelFighterState.GRAB: {
        // Map moveFrame to pose frames based on startup/active/recovery
        const charDef = DUEL_CHARACTERS[fighter.characterId];
        const move =
          charDef.normals[fighter.currentMove ?? ""] ??
          charDef.specials[fighter.currentMove ?? ""] ??
          (fighter.currentMove === "grab" ? charDef.grab : null);

        if (move) {
          const totalFrames = move.startup + move.active + move.recovery;
          const progress = Math.min(fighter.moveFrame / totalFrames, 0.999);
          return Math.floor(progress * frames.length);
        }
        return 0;
      }

      case DuelFighterState.IDLE:
      case DuelFighterState.WALK_FORWARD:
      case DuelFighterState.WALK_BACK: {
        // Loop based on stateTimer / frameCount
        const animSpeed = fighter.state === DuelFighterState.IDLE ? 12 : 8;
        return Math.floor(fighter.stateTimer / animSpeed) % frames.length;
      }

      case DuelFighterState.DASH_FORWARD:
      case DuelFighterState.DASH_BACK: {
        // Fast cycle through walk frames during dash
        return Math.floor(fighter.stateTimer / 3) % frames.length;
      }

      case DuelFighterState.KNOCKDOWN:
      case DuelFighterState.GET_UP:
      case DuelFighterState.HIT_STUN: {
        // Progress through frames based on stateTimer
        const maxTimer = fighter.state === DuelFighterState.KNOCKDOWN ? 40 :
          fighter.state === DuelFighterState.GET_UP ? 20 :
          (fighter.hitstunFrames + fighter.stateTimer);
        if (maxTimer <= 0) return 0;
        const progress = Math.min(fighter.stateTimer / maxTimer, 0.999);
        return Math.max(0, Math.floor(progress * frames.length));
      }

      default:
        return 0;
    }
  }

  // ---- Shadows --------------------------------------------------------------

  private _drawShadows(state: DuelState): void {
    this._shadowGfx.clear();
    for (const f of state.fighters) {
      drawFighterShadow(this._shadowGfx, f.position.x, state.stageFloorY, f.grounded);
    }
  }

  // ---- Projectiles ----------------------------------------------------------

  private _drawProjectiles(state: DuelState): void {
    this._projGfx.clear();
    for (const proj of state.projectiles) {
      const color = PROJECTILE_COLORS[proj.moveId] ?? 0xff8844;
      const x = proj.position.x;
      const y = proj.position.y;
      const w = proj.hitbox.width;
      const h = proj.hitbox.height;

      // Outer glow
      this._projGfx.circle(x, y, w * 1.2);
      this._projGfx.fill({ color, alpha: 0.15 });

      // Mid glow
      this._projGfx.circle(x, y, w * 0.8);
      this._projGfx.fill({ color, alpha: 0.3 });

      // Core
      this._projGfx.ellipse(x, y, w / 2, h / 2);
      this._projGfx.fill({ color, alpha: 0.9 });
      this._projGfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });

      // Inner bright
      this._projGfx.circle(x, y, w * 0.2);
      this._projGfx.fill({ color: 0xffffff, alpha: 0.8 });

      // Trail
      const trailDir = proj.velocity.x > 0 ? -1 : 1;
      this._projGfx.moveTo(x, y - h / 3);
      this._projGfx.lineTo(x + trailDir * w * 1.5, y);
      this._projGfx.lineTo(x, y + h / 3);
      this._projGfx.fill({ color, alpha: 0.25 });
    }
  }

  // ---- Hit sparks -----------------------------------------------------------

  private _drawSparks(): void {
    this._sparkGfx.clear();
    for (let i = this._sparks.length - 1; i >= 0; i--) {
      const spark = this._sparks[i];
      spark.timer--;
      if (spark.timer <= 0) {
        this._sparks.splice(i, 1);
        continue;
      }

      const t = spark.timer / SPARK_DURATION;
      const size = 12 + (1 - t) * 20;

      // Starburst rays
      const rayCount = 8;
      for (let j = 0; j < rayCount; j++) {
        const angle = (j / rayCount) * Math.PI * 2 + (1 - t) * 2;
        const innerR = size * 0.3 * (1 - t);
        const outerR = size * (1 - t * 0.3);
        this._sparkGfx.moveTo(
          spark.x + Math.cos(angle) * innerR,
          spark.y + Math.sin(angle) * innerR,
        );
        this._sparkGfx.lineTo(
          spark.x + Math.cos(angle) * outerR,
          spark.y + Math.sin(angle) * outerR,
        );
        this._sparkGfx.stroke({ color: 0xffff88, width: 3, alpha: t });
      }

      // Orange outer glow
      this._sparkGfx.circle(spark.x, spark.y, size * 0.6 * t);
      this._sparkGfx.fill({ color: 0xff8800, alpha: t * 0.4 });

      // White center flash
      this._sparkGfx.circle(spark.x, spark.y, 5 * t);
      this._sparkGfx.fill({ color: 0xffffff, alpha: t * 0.9 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
