// ---------------------------------------------------------------------------
// Duel mode – main fight rendering view
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { DuelFighterState } from "../../types";
import { DuelBalance } from "../../duel/config/DuelBalanceConfig";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import type { DuelFighter, DuelState } from "../../duel/state/DuelState";

// Fighter placeholder colors
const P1_COLOR = 0x3366cc;
const P2_COLOR = 0xcc3333;
const P1_OUTLINE = 0x5588ee;
const P2_OUTLINE = 0xee5555;

const PROJECTILE_COLORS: Record<string, number> = {
  arcane_bolt: 0x8888ff,
  frost_wave: 0x88ccff,
  power_shot: 0xddbb44,
  backflip_shot: 0xddbb44,
};

// Hit spark
const SPARK_DURATION = 12;

interface HitSpark {
  x: number;
  y: number;
  timer: number;
}

export class DuelFightView {
  readonly container = new Container();

  private _arenaLayer = new Container();
  private _fighterLayer = new Container();
  private _fxLayer = new Container();

  private _p1Gfx = new Graphics();
  private _p2Gfx = new Graphics();
  private _projGfx = new Graphics();
  private _sparkGfx = new Graphics();

  // Shadow graphics
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
    this._drawFighter(this._p1Gfx, state.fighters[0], P1_COLOR, P1_OUTLINE);
    this._drawFighter(this._p2Gfx, state.fighters[1], P2_COLOR, P2_OUTLINE);
    this._drawShadows(state);
    this._drawProjectiles(state);
    this._drawSparks();

    // Screen shake on hit freeze
    if (state.slowdownFrames > 0) {
      const shake = (Math.random() - 0.5) * 4;
      this.container.position.set(shake, (Math.random() - 0.5) * 3);
    } else {
      this.container.position.set(0, 0);
    }
  }

  /** Spawn a hit spark effect at the given position. */
  addSpark(x: number, y: number): void {
    this._sparks.push({ x, y, timer: SPARK_DURATION });
  }

  private _drawFighter(
    g: Graphics,
    fighter: DuelFighter,
    color: number,
    outline: number,
  ): void {
    g.clear();

    const x = fighter.position.x;
    const y = fighter.position.y;
    const isCrouching =
      fighter.state === DuelFighterState.CROUCH ||
      fighter.state === DuelFighterState.CROUCH_IDLE ||
      fighter.state === DuelFighterState.BLOCK_CROUCH;
    const bodyH = isCrouching ? DuelBalance.CROUCH_HURTBOX_H : DuelBalance.STAND_HURTBOX_H;
    const bodyW = DuelBalance.STAND_HURTBOX_W;
    const dir = fighter.facingRight ? 1 : -1;

    const charDef = DUEL_CHARACTERS[fighter.characterId];

    // Fighter body
    switch (fighter.state) {
      case DuelFighterState.KNOCKDOWN:
      case DuelFighterState.DEFEAT: {
        // Lying down
        g.roundRect(x - bodyH / 2, y - 15, bodyH, 15, 3);
        g.fill({ color, alpha: 0.7 });
        g.stroke({ color: outline, width: 1.5 });
        break;
      }

      case DuelFighterState.HIT_STUN:
      case DuelFighterState.GRABBED: {
        // Recoiling
        const lean = dir * -5;
        g.roundRect(x - bodyW / 2 + lean, y - bodyH, bodyW, bodyH, 4);
        g.fill({ color: 0xffffff, alpha: 0.3 });
        g.roundRect(x - bodyW / 2 + lean, y - bodyH, bodyW, bodyH, 4);
        g.fill({ color, alpha: 0.8 });
        g.stroke({ color: 0xff4444, width: 2 });
        break;
      }

      case DuelFighterState.BLOCK_STAND:
      case DuelFighterState.BLOCK_CROUCH: {
        // Blocking stance with shield/guard
        g.roundRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);
        g.fill({ color, alpha: 0.9 });
        g.stroke({ color: 0xffdd44, width: 2 });
        // Guard indicator
        g.rect(x + dir * 15, y - bodyH + 10, 5, bodyH - 20);
        g.fill({ color: 0xffdd44, alpha: 0.6 });
        break;
      }

      case DuelFighterState.ATTACK:
      case DuelFighterState.GRAB: {
        // Attacking - show body + weapon extension
        g.roundRect(x - bodyW / 2, y - bodyH, bodyW, bodyH, 4);
        g.fill({ color });
        g.stroke({ color: outline, width: 1.5 });

        // Show hitbox as weapon extension
        const move =
          charDef.normals[fighter.currentMove ?? ""] ??
          charDef.specials[fighter.currentMove ?? ""] ??
          (fighter.currentMove === "grab" ? charDef.grab : null);

        if (move && fighter.moveFrame >= move.startup && fighter.moveFrame < move.startup + move.active) {
          const hbX = x + dir * move.hitbox.x;
          const hbY = y + move.hitbox.y;
          const hbW = move.hitbox.width;
          const hbH = move.hitbox.height;
          // Weapon glow
          const weaponColor = charDef.fighterType === "mage" ? 0x8888ff :
            charDef.fighterType === "archer" ? 0xddbb44 : 0xccccdd;
          if (dir > 0) {
            g.rect(hbX, hbY, hbW, hbH);
          } else {
            g.rect(hbX - hbW, hbY, hbW, hbH);
          }
          g.fill({ color: weaponColor, alpha: 0.4 });
          g.stroke({ color: weaponColor, width: 1, alpha: 0.7 });
        }
        break;
      }

      case DuelFighterState.VICTORY: {
        // Victory pose
        g.roundRect(x - bodyW / 2, y - bodyH - 5, bodyW, bodyH, 4);
        g.fill({ color });
        g.stroke({ color: 0xffdd44, width: 2 });
        // Raised arm
        g.rect(x + dir * 5, y - bodyH - 25, 6, 25);
        g.fill({ color });
        break;
      }

      default: {
        // Standard standing/walking/jumping
        const offsetY = fighter.grounded ? 0 : 0;
        g.roundRect(x - bodyW / 2, y - bodyH + offsetY, bodyW, bodyH, 4);
        g.fill({ color });
        g.stroke({ color: outline, width: 1.5 });

        // Head
        g.circle(x, y - bodyH - 6 + offsetY, 8);
        g.fill({ color });
        g.stroke({ color: outline, width: 1 });

        // Weapon indicator based on type
        if (charDef.fighterType === "sword") {
          // Sword
          g.moveTo(x + dir * 18, y - bodyH + 20);
          g.lineTo(x + dir * 35, y - bodyH + 5);
          g.stroke({ color: 0xccccdd, width: 3 });
          // Shield
          g.roundRect(x - dir * 15, y - bodyH + 15, 10, 20, 2);
          g.fill({ color: 0x8b4513 });
        } else if (charDef.fighterType === "mage") {
          // Staff
          g.moveTo(x + dir * 15, y - bodyH - 10);
          g.lineTo(x + dir * 15, y);
          g.stroke({ color: 0x8b4513, width: 3 });
          // Crystal
          g.circle(x + dir * 15, y - bodyH - 14, 4);
          g.fill({ color: 0x8888ff, alpha: 0.8 });
        } else if (charDef.fighterType === "archer") {
          // Bow
          g.moveTo(x + dir * 20, y - bodyH + 10);
          g.quadraticCurveTo(x + dir * 30, y - bodyH / 2, x + dir * 20, y - 10);
          g.stroke({ color: 0x8b4513, width: 2 });
          // String
          g.moveTo(x + dir * 20, y - bodyH + 10);
          g.lineTo(x + dir * 20, y - 10);
          g.stroke({ color: 0xcccccc, width: 0.8 });
        }
        break;
      }
    }

    // Invincibility flash
    if (fighter.invincibleFrames > 0 && fighter.invincibleFrames % 4 < 2) {
      g.alpha = 0.5;
    } else {
      g.alpha = 1;
    }
  }

  private _drawShadows(state: DuelState): void {
    this._shadowGfx.clear();
    for (const f of state.fighters) {
      const floorY = DuelBalance.STAGE_FLOOR_Y;
      const shadowScale = f.grounded ? 1 : 0.7;
      this._shadowGfx.ellipse(f.position.x, floorY + 2, 20 * shadowScale, 5 * shadowScale);
      this._shadowGfx.fill({ color: 0x000000, alpha: 0.25 });
    }
  }

  private _drawProjectiles(state: DuelState): void {
    this._projGfx.clear();
    for (const proj of state.projectiles) {
      const color = PROJECTILE_COLORS[proj.moveId] ?? 0xff8844;
      const x = proj.position.x;
      const y = proj.position.y;
      const w = proj.hitbox.width;
      const h = proj.hitbox.height;

      // Glow
      this._projGfx.circle(x, y, w * 0.8);
      this._projGfx.fill({ color, alpha: 0.2 });

      // Core
      this._projGfx.ellipse(x, y, w / 2, h / 2);
      this._projGfx.fill({ color, alpha: 0.8 });
      this._projGfx.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });

      // Trail
      const trailDir = proj.velocity.x > 0 ? -1 : 1;
      this._projGfx.moveTo(x, y - h / 4);
      this._projGfx.lineTo(x + trailDir * w, y);
      this._projGfx.lineTo(x, y + h / 4);
      this._projGfx.fill({ color, alpha: 0.3 });
    }
  }

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
      const size = 8 + (1 - t) * 12;

      // Burst lines
      for (let j = 0; j < 6; j++) {
        const angle = (j / 6) * Math.PI * 2;
        const r = size * (1 - t);
        this._sparkGfx.moveTo(spark.x, spark.y);
        this._sparkGfx.lineTo(
          spark.x + Math.cos(angle) * r,
          spark.y + Math.sin(angle) * r,
        );
        this._sparkGfx.stroke({ color: 0xffff88, width: 2, alpha: t });
      }

      // Center flash
      this._sparkGfx.circle(spark.x, spark.y, 4 * t);
      this._sparkGfx.fill({ color: 0xffffff, alpha: t * 0.8 });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
