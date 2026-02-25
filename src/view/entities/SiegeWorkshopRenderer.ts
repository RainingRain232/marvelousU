// Procedural siege workshop renderer for BuildingView.
//
// Draws a medieval fantasy siege workshop (~2x2 tiles) with:
//   • Stone building with open front (可以看到鐵匠)
//   • Blacksmith working with hammer
//   • Ballistas visible in the workshop
//   • Roof with a raven looking left/right
//   • Detailed medieval fantasy style
//
// All drawing uses PixiJS Graphics.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — stone & medieval
const COL_STONE = 0x6b6560;
const COL_STONE_DK = 0x4a4540;
const COL_STONE_LT = 0x8b8580;
const COL_STONE_MORTAR = 0x555048;
const COL_ROOF = 0x3d2817;
const COL_ROOF_DK = 0x2a1a0f;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3a2510;
const COL_IRON = 0x444444;
const COL_IRON_DK = 0x333333;
const COL_IRON_HOT = 0xff6622;
const COL_FIRE = 0xff4400;
const COL_FIRE_CORE = 0xffff44;
const COL_COAL = 0x1a1a1a;

// Raven
const COL_RAVEN = 0x1a1a1a;
const COL_RAVEN_BEAK = 0xcc8833;
const COL_RAVEN_EYE = 0xffcc00;

// Ballista
const COL_BALLISTA_WOOD = 0x60451e;
const COL_BALLISTA_IRON = 0x666666;

// Animation timing
const HAMMER_SPEED = 4.0;
const FIRE_FLICKER = 8.0;
const RAVEN_LOOK_SPEED = 1.5;
const ANVIL_SPARK_INTERVAL = 0.5;

// ---------------------------------------------------------------------------
// SiegeWorkshopRenderer
// ---------------------------------------------------------------------------

export class SiegeWorkshopRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _forge = new Graphics();
  private _blacksmith = new Graphics();
  private _ballistas = new Graphics();
  private _roof = new Graphics();
  private _raven = new Graphics();
  private _sparks = new Graphics();

  private _time = 0;
  private _sparkTimer = 0;

  constructor(_owner: string | null) {
    this._drawBuilding();
    this._drawForge();
    this._drawBallistas();
    this._drawRoof();
    this._drawRaven();

    this.container.addChild(this._building);
    this.container.addChild(this._forge);
    this.container.addChild(this._blacksmith);
    this.container.addChild(this._ballistas);
    this.container.addChild(this._roof);
    this.container.addChild(this._raven);
    this.container.addChild(this._sparks);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    this._updateForge(this._time);
    this._updateBlacksmith(this._time);
    this._updateRaven(this._time);
    this._updateSparks(dt);
  }

  // ── Building ────────────────────────────────────────────────────────────────

  private _drawBuilding(): void {
    const g = this._building;

    // Ground
    g.rect(0, TH - 8, TW, 8).fill({ color: COL_STONE_DK });

    // Left wall
    g.rect(0, 20, 20, TH - 28)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Right wall
    g.rect(TW - 20, 20, 20, TH - 28)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Back wall (visible through open front)
    g.rect(20, 30, TW - 40, TH - 38)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_MORTAR, width: 1 });

    // Stone brick pattern on walls
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 3; col++) {
        const offset = (row % 2) * 8;
        g.rect(4 + col * 18 + offset, 24 + row * 20, 14, 16)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_MORTAR, width: 0.5, alpha: 0.5 });
      }
    }
    for (let row = 0; row < 4; row++) {
      for (let col = 0; col < 2; col++) {
        const offset = (row % 2) * 8;
        g.rect(TW - 18 + col * 18 + offset, 24 + row * 20, 14, 16)
          .fill({ color: COL_STONE_LT })
          .stroke({ color: COL_STONE_MORTAR, width: 0.5, alpha: 0.5 });
      }
    }

    // Stone pillars supporting roof
    g.rect(18, 20, 6, TH - 28)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });
    g.rect(TW - 24, 20, 6, TH - 28)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Stone floor
    g.rect(20, TH - 16, TW - 40, 12)
      .fill({ color: COL_STONE_MORTAR })
      .stroke({ color: COL_STONE_DK, width: 0.5 });

    // Support beam for roof
    g.rect(0, 16, TW, 6).fill({ color: COL_WOOD_DK });
    g.rect(0, 16, TW, 2).fill({ color: COL_WOOD });
  }

  // ── Forge & Fire ────────────────────────────────────────────────────────────

  private _drawForge(): void {
    // Initial draw, will be animated
    this._updateForge(0);
  }

  private _updateForge(time: number): void {
    const g = this._forge;
    g.clear();

    // Forge base (stone hearth)
    const forgeX = 50;
    const forgeY = TH - 20;

    // Hearth back
    g.rect(forgeX - 8, forgeY - 20, 24, 24)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Fire pit
    g.rect(forgeX - 5, forgeY - 15, 18, 18).fill({ color: COL_COAL });

    // Fire with flicker
    const flicker1 = Math.sin(time * FIRE_FLICKER) * 2;
    const flicker2 = Math.sin(time * FIRE_FLICKER * 1.3 + 1) * 1.5;
    const flicker3 = Math.sin(time * FIRE_FLICKER * 0.8 + 2) * 1;

    // Outer flame
    g.moveTo(forgeX, forgeY - 5)
      .quadraticCurveTo(forgeX - 6 + flicker1, forgeY - 18, forgeX, forgeY - 28)
      .quadraticCurveTo(forgeX + 6 + flicker2, forgeY - 18, forgeX, forgeY - 5)
      .fill({ color: COL_FIRE, alpha: 0.8 });

    // Inner flame
    g.moveTo(forgeX, forgeY - 3)
      .quadraticCurveTo(forgeX - 3 + flicker3, forgeY - 12, forgeX, forgeY - 20)
      .quadraticCurveTo(forgeX + 3 + flicker1, forgeY - 12, forgeX, forgeY - 3)
      .fill({ color: COL_FIRE_CORE, alpha: 0.9 });

    // Glowing coals
    g.circle(forgeX - 4, forgeY - 5, 2 + Math.sin(time * 5) * 0.5).fill({
      color: COL_IRON_HOT,
      alpha: 0.7,
    });
    g.circle(forgeX + 3, forgeY - 4, 1.5 + Math.sin(time * 6 + 1) * 0.3).fill({
      color: COL_IRON_HOT,
      alpha: 0.6,
    });
    g.circle(forgeX - 1, forgeY - 8, 2 + Math.sin(time * 4.5 + 2) * 0.4).fill({
      color: COL_FIRE_CORE,
      alpha: 0.5,
    });

    // Anvil
    g.rect(forgeX + 20, forgeY - 10, 12, 14).fill({ color: COL_IRON });
    g.rect(forgeX + 18, forgeY - 14, 16, 4).fill({ color: COL_IRON });
    g.rect(forgeX + 22, forgeY - 16, 8, 2).fill({ color: COL_IRON_DK });

    // Bellows
    g.rect(forgeX - 20, forgeY - 8, 10, 12)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_WOOD, width: 0.5 });
    // Bellows nozzle
    g.moveTo(forgeX - 10, forgeY - 2)
      .lineTo(forgeX - 5, forgeY - 2)
      .stroke({ color: COL_IRON, width: 2 });
  }

  // ── Blacksmith ────────────────────────────────────────────────────────────

  private _updateBlacksmith(time: number): void {
    const g = this._blacksmith;
    g.clear();

    const bx = 60;
    const by = TH - 20;

    // Hammer animation cycle
    const hammerCycle = (time * HAMMER_SPEED) % 1;
    let hammerOffset = 0;

    if (hammerCycle < 0.7) {
      // Swing down
      const swingProgress = hammerCycle / 0.7;
      hammerOffset = Math.sin(swingProgress * Math.PI) * 8;
    }

    // Blacksmith body
    g.ellipse(bx, by - 25, 8, 12)
      .fill({ color: 0x4a3020 })
      .stroke({ color: 0x3a2510, width: 0.5 });

    // Leather apron
    g.rect(bx - 6, by - 28, 12, 18).fill({ color: 0x5a3a1a });

    // Belt
    g.rect(bx - 8, by - 16, 16, 2).fill({ color: 0x3a2510 });

    // Head
    g.circle(bx, by - 38, 6)
      .fill({ color: 0xd4a574 })
      .stroke({ color: 0x8b6914, width: 0.5 });

    // Hair
    g.circle(bx, by - 42, 5).fill({ color: 0x3a2510 });

    // Face
    g.circle(bx - 2, by - 38, 1).fill({ color: 0x2a1a0f });
    g.circle(bx + 2, by - 38, 1).fill({ color: 0x2a1a0f });

    // Arm holding hammer
    const armEndX = bx + 10;
    const armEndY = by - 35 + hammerOffset;
    g.rect(bx + 4, by - 35, 8, 3)
      .fill({ color: 0xd4a574 })
      .stroke({ color: 0x4a3020, width: 0.5 });

    // Hammer handle
    g.moveTo(armEndX, armEndY)
      .lineTo(armEndX + 10, armEndY - 8 + hammerOffset)
      .stroke({ color: COL_WOOD, width: 2.5 });

    // Hammer head
    g.rect(armEndX + 8, armEndY - 12 + hammerOffset, 8, 6)
      .fill({ color: COL_IRON })
      .stroke({ color: 0x333333, width: 0.5 });

    // Other arm (reaching toward anvil)
    g.rect(bx - 8, by - 32, 8, 3)
      .fill({ color: 0xd4a574 })
      .stroke({ color: 0x4a3020, width: 0.5 });
    g.rect(bx - 12, by - 33, 4, 5).fill({ color: 0xd4a574 });

    // Legs
    g.rect(bx - 6, by - 14, 4, 14)
      .fill({ color: 0x3a2510 })
      .stroke({ color: 0x2a1a0f, width: 0.5 });
    g.rect(bx + 2, by - 14, 4, 14)
      .fill({ color: 0x3a2510 })
      .stroke({ color: 0x2a1a0f, width: 0.5 });

    // Boots
    g.rect(bx - 7, by - 2, 6, 3).fill({ color: 0x2a1a0f });
    g.rect(bx + 1, by - 2, 6, 3).fill({ color: 0x2a1a0f });
  }

  // ── Ballistas ─────────────────────────────────────────────────────────────

  private _drawBallistas(): void {
    this._updateBallistas(0);
  }

  private _updateBallistas(_time: number): void {
    const g = this._ballistas;
    g.clear();

    // Ballista 1 (left side)
    this._drawBallista(g, 28, TH - 30);

    // Ballista 2 (right side)
    this._drawBallista(g, TW - 45, TH - 30);
  }

  private _drawBallista(g: Graphics, x: number, y: number): void {
    // Base
    g.rect(x, y, 18, 8).fill({ color: COL_BALLISTA_WOOD });

    // Wheels
    g.circle(x + 3, y + 8, 4).fill({ color: COL_WOOD_DK });
    g.circle(x + 15, y + 8, 4).fill({ color: COL_WOOD_DK });

    // Main frame
    g.rect(x + 2, y - 10, 14, 12).fill({ color: COL_BALLISTA_WOOD });

    // Bow arms
    g.moveTo(x + 9, y - 8)
      .lineTo(x - 2, y - 18)
      .stroke({ color: COL_BALLISTA_IRON, width: 2 });
    g.moveTo(x + 9, y - 8)
      .lineTo(x + 20, y - 18)
      .stroke({ color: COL_BALLISTA_IRON, width: 2 });

    // Bow string
    g.moveTo(x - 2, y - 18)
      .lineTo(x + 20, y - 18)
      .stroke({ color: 0x888888, width: 0.8 });

    // Central nut
    g.circle(x + 9, y - 8, 3).fill({ color: COL_BALLISTA_IRON });
  }

  // ── Roof ─────────────────────────────────────────────────────────────────

  private _drawRoof(): void {
    const g = this._roof;

    // Main roof beams
    g.moveTo(0, 20)
      .lineTo(TW / 2, -10)
      .lineTo(TW, 20)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 2 });

    // Roof tiles pattern
    for (let i = 0; i < 8; i++) {
      const tileX = i * 18;
      g.moveTo(tileX, 20)
        .lineTo(TW / 2, -10)
        .lineTo(tileX + 18, 20)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // Roof overhang
    g.rect(-4, 16, TW + 8, 6)
      .fill({ color: COL_ROOF_DK })
      .stroke({ color: COL_ROOF, width: 1 });

    // Roof support beam (front)
    g.rect(0, 16, TW, 4).fill({ color: COL_WOOD });
    g.rect(0, 16, TW, 1).fill({ color: COL_WOOD_DK });

    // Chimney
    g.rect(TW - 30, -5, 10, 20)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 1 });

    // Smoke from chimney
    // (animated in tick)
  }

  // ── Raven ─────────────────────────────────────────────────────────────────

  private _drawRaven(): void {
    this._raven.position.set(40, -8);
    this._updateRaven(0);
  }

  private _updateRaven(time: number): void {
    const g = this._raven;
    g.clear();

    // Look left/right
    const lookCycle = (time * RAVEN_LOOK_SPEED) % 2;
    let headTurn = 0;
    if (lookCycle < 1) {
      headTurn = Math.sin(lookCycle * Math.PI) * 2;
    } else {
      headTurn = -Math.sin((lookCycle - 1) * Math.PI) * 2;
    }

    // Body
    g.ellipse(0, 0, 8, 6).fill({ color: COL_RAVEN });

    // Tail feathers
    g.moveTo(-8, 0)
      .lineTo(-14, 2)
      .lineTo(-8, 2)
      .closePath()
      .fill({ color: COL_RAVEN });
    g.moveTo(-8, -1)
      .lineTo(-12, -3)
      .lineTo(-8, -2)
      .closePath()
      .fill({ color: 0x333333 });

    // Head (turns left/right)
    g.circle(headTurn, -6, 5).fill({ color: COL_RAVEN });

    // Beak
    g.moveTo(headTurn + 4, -6)
      .lineTo(headTurn + 10, -5)
      .lineTo(headTurn + 4, -4)
      .closePath()
      .fill({ color: COL_RAVEN_BEAK });

    // Eye
    g.circle(headTurn + 2, -7, 1.5).fill({ color: COL_RAVEN_EYE });
    g.circle(headTurn + 2, -7, 0.8).fill({ color: 0x1a1a1a });

    // Legs
    g.moveTo(-2, 5).lineTo(-2, 8).stroke({ color: 0x333333, width: 1 });
    g.moveTo(2, 5).lineTo(2, 8).stroke({ color: 0x333333, width: 1 });

    // Feet
    g.moveTo(-2, 8).lineTo(-4, 10).stroke({ color: 0x333333, width: 1 });
    g.moveTo(-2, 8).lineTo(0, 10).stroke({ color: 0x333333, width: 1 });
    g.moveTo(2, 8).lineTo(0, 10).stroke({ color: 0x333333, width: 1 });
    g.moveTo(2, 8).lineTo(4, 10).stroke({ color: 0x333333, width: 1 });

    // Subtle breathing
    const breathe = Math.sin(time * 2) * 0.5;
    g.scale.set(1 + breathe * 0.02, 1 + breathe * 0.02);
  }

  // ── Sparks ────────────────────────────────────────────────────────────────

  private _updateSparks(dt: number): void {
    this._sparkTimer += dt;

    const g = this._sparks;
    g.clear();

    if (this._sparkTimer > ANVIL_SPARK_INTERVAL) {
      this._sparkTimer = 0;

      const forgeX = 74;
      const forgeY = TH - 30;

      // Draw spark burst
      for (let i = 0; i < 5; i++) {
        const angle = Math.random() * Math.PI - Math.PI;
        const dist = Math.random() * 10 + 5;
        const sx = forgeX + Math.cos(angle) * dist;
        const sy = forgeY + Math.sin(angle) * dist;
        const size = Math.random() * 2 + 1;

        g.circle(sx, sy, size).fill({ color: COL_FIRE_CORE });
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
