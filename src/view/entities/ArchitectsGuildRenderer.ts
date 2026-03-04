// Procedural Architects Guild renderer for BuildingView.
//
// Draws an impressive 3x2 medieval stone guild hall:
//   • Grand stone facade with tall arched windows
//   • Compass rose / drafting symbol above entrance
//   • Two corner towers with peaked roofs
//   • Multiple architects at work: one at drafting table, one measuring wall
//   • Rolled blueprints and drafting tools on tables
//   • Player-colored banners on towers
//   • Stone buttresses and decorative trim
//
// Animations:
//   - Architect drawing on drafting table (arm movement)
//   - Architect measuring with plumb line (swinging)
//   - Banner waving
//   - Lantern glow pulsing

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

const TS = 64;
const PW = 3 * TS; // 192px wide
const PH = 2 * TS; // 128px tall

// Stone palette (inspired by Castle)
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_MORTAR = 0x9a9688;

// Roof and wood
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_WOOD = 0x6b4a2a;
const COL_WOOD_DK = 0x4a3020;

// Accents
const COL_GOLD_TRIM = 0xc8a83e;
const COL_PARCHMENT = 0xe8d8b0;
const COL_INK = 0x1a1a2e;

// Character colors
const COL_SKIN = 0xe8c8a0;
const COL_CLOTH = 0x5a6a8a;
const COL_CLOTH_DK = 0x3a4a6a;
const COL_HAIR_BROWN = 0x5a3820;
const COL_HAIR_GRAY = 0x8a8888;

export class ArchitectsGuildRenderer {
  readonly container = new Container();

  private _building = new Graphics();
  private _details = new Graphics();
  private _architects = new Graphics();
  private _banners = new Graphics();
  private _props = new Graphics();

  private _time = 0;
  private _ownerColor: number;

  constructor(owner: string | null) {
    this._ownerColor = getPlayerColor(owner);

    this._drawBuilding();
    this._drawDetails();
    this._drawProps();

    this.container.addChild(this._building);
    this.container.addChild(this._details);
    this.container.addChild(this._props);
    this.container.addChild(this._architects);
    this.container.addChild(this._banners);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateArchitects(this._time);
    this._updateBanners(this._time);
  }

  private _drawBuilding(): void {
    const g = this._building;

    // Ground / foundation
    g.rect(0, PH - 6, PW, 6).fill({ color: 0x7a756d });

    // Main stone facade
    const wallX = 18;
    const wallW = PW - 36;
    const wallY = 28;
    const wallH = PH - wallY - 10;

    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Stone brick pattern
    for (let row = 0; row < 5; row++) {
      const offset = (row % 2) * 12;
      for (let col = 0; col < 7; col++) {
        g.rect(wallX + 3 + col * 20 + offset, wallY + 3 + row * 14, 16, 11)
          .fill({ color: row % 2 === 0 ? COL_STONE_LT : COL_MORTAR })
          .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.4 });
      }
    }

    // Buttresses
    g.rect(wallX - 5, wallY + 10, 6, wallH - 10).fill({ color: COL_STONE_DK });
    g.rect(wallX + wallW - 1, wallY + 10, 6, wallH - 10).fill({
      color: COL_STONE_DK,
    });

    // Central grand archway entrance
    const doorW = 26;
    const doorH = 40;
    const doorX = PW / 2 - doorW / 2;
    const doorY = PH - doorH - 6;

    g.moveTo(doorX, doorY + doorH)
      .lineTo(doorX, doorY + 10)
      .quadraticCurveTo(doorX + doorW / 2, doorY - 6, doorX + doorW, doorY + 10)
      .lineTo(doorX + doorW, doorY + doorH)
      .closePath()
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: 0x3a2510, width: 2 });

    // Wooden doors
    g.rect(doorX + 3, doorY + 16, 9, 22)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3a2510, width: 1 });
    g.rect(doorX + doorW - 12, doorY + 16, 9, 22)
      .fill({ color: COL_WOOD })
      .stroke({ color: 0x3a2510, width: 1 });

    // Door handles
    g.circle(doorX + 10, doorY + 28, 1.5).fill({ color: COL_GOLD_TRIM });
    g.circle(doorX + doorW - 10, doorY + 28, 1.5).fill({ color: COL_GOLD_TRIM });

    // Tall arched windows (3 on each side of door)
    const windowPositions = [wallX + 12, wallX + 35, PW - wallX - 50, PW - wallX - 27];
    for (const wx of windowPositions) {
      const wy = wallY + 12;
      g.moveTo(wx, wy + 22)
        .lineTo(wx, wy + 6)
        .quadraticCurveTo(wx + 8, wy - 2, wx + 16, wy + 6)
        .lineTo(wx + 16, wy + 22)
        .closePath()
        .fill({ color: 0x1a1a2e });
      // Window frame
      g.moveTo(wx + 1, wy + 20)
        .lineTo(wx + 1, wy + 7)
        .quadraticCurveTo(wx + 8, wy + 1, wx + 15, wy + 7)
        .lineTo(wx + 15, wy + 20)
        .closePath()
        .fill({ color: 0x2a2a40, alpha: 0.6 });
      // Warm window glow
      g.rect(wx + 3, wy + 10, 10, 10).fill({ color: 0x664422, alpha: 0.3 });
    }

    // Main roof — steep pitched
    g.moveTo(14, 30)
      .lineTo(PW / 2, 10)
      .lineTo(PW - 14, 30)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1.5 });

    // Roof ridge detail
    g.moveTo(PW / 2 - 30, 22)
      .lineTo(PW / 2, 12)
      .lineTo(PW / 2 + 30, 22)
      .stroke({ color: COL_GOLD_TRIM, width: 1, alpha: 0.6 });

    // Crenellations along top of wall
    for (let i = 0; i < 10; i++) {
      g.rect(wallX + 3 + i * 15, wallY - 5, 9, 5)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
    }

    // Left corner tower
    g.rect(2, 18, 22, 62)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Tower peaked roof
    g.moveTo(0, 20)
      .quadraticCurveTo(13, 4, 26, 20)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Tower window
    g.moveTo(8, 40)
      .lineTo(8, 35)
      .quadraticCurveTo(13, 31, 18, 35)
      .lineTo(18, 40)
      .closePath()
      .fill({ color: 0x1a1a2e });

    // Right corner tower
    g.rect(PW - 24, 18, 22, 62)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 1 });
    g.moveTo(PW - 26, 20)
      .quadraticCurveTo(PW - 13, 4, PW, 20)
      .closePath()
      .fill({ color: COL_ROOF_DK });
    // Tower window
    g.moveTo(PW - 18, 40)
      .lineTo(PW - 18, 35)
      .quadraticCurveTo(PW - 13, 31, PW - 8, 35)
      .lineTo(PW - 8, 40)
      .closePath()
      .fill({ color: 0x1a1a2e });
  }

  private _drawDetails(): void {
    const g = this._details;

    // Compass rose / drafting symbol above entrance
    const cx = PW / 2;
    const cy = 38;
    const r = 8;

    // Circle
    g.circle(cx, cy, r)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_GOLD_TRIM, width: 1.5 });

    // Compass points (N/S/E/W)
    g.moveTo(cx, cy - r + 1)
      .lineTo(cx + 2, cy)
      .lineTo(cx, cy - 3)
      .lineTo(cx - 2, cy)
      .closePath()
      .fill({ color: COL_GOLD_TRIM }); // N arrow
    g.moveTo(cx, cy + r - 1)
      .lineTo(cx + 2, cy)
      .lineTo(cx, cy + 3)
      .lineTo(cx - 2, cy)
      .closePath()
      .fill({ color: COL_STONE_DK }); // S arrow
    g.moveTo(cx + r - 1, cy)
      .lineTo(cx, cy + 2)
      .lineTo(cx + 3, cy)
      .lineTo(cx, cy - 2)
      .closePath()
      .fill({ color: COL_GOLD_TRIM }); // E
    g.moveTo(cx - r + 1, cy)
      .lineTo(cx, cy + 2)
      .lineTo(cx - 3, cy)
      .lineTo(cx, cy - 2)
      .closePath()
      .fill({ color: COL_STONE_DK }); // W

    // Gold trim line above door
    g.rect(PW / 2 - 20, PH - 48, 40, 2).fill({ color: COL_GOLD_TRIM, alpha: 0.7 });

    // Decorative stone frieze below roofline
    for (let i = 0; i < 8; i++) {
      g.circle(30 + i * 18, 28, 2).fill({ color: COL_STONE_LT });
    }

    // Guild plaque above entrance
    g.rect(PW / 2 - 18, PH - 54, 36, 8)
      .fill({ color: COL_WOOD_DK })
      .stroke({ color: COL_GOLD_TRIM, width: 0.8 });
  }

  private _drawProps(): void {
    const g = this._props;

    // Drafting table (left side, in front of building)
    const tableX = 30;
    const tableY = PH - 22;
    // Table top
    g.rect(tableX, tableY, 24, 3)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.8 });
    // Table legs
    g.rect(tableX + 2, tableY + 3, 2, 10).fill({ color: COL_WOOD_DK });
    g.rect(tableX + 20, tableY + 3, 2, 10).fill({ color: COL_WOOD_DK });

    // Blueprint roll on table
    g.rect(tableX + 4, tableY - 2, 16, 3)
      .fill({ color: COL_PARCHMENT })
      .stroke({ color: 0xc0b890, width: 0.5 });
    // Blue lines on blueprint
    g.rect(tableX + 6, tableY - 1.5, 3, 1.5).fill({ color: 0x4466aa, alpha: 0.5 });
    g.rect(tableX + 11, tableY - 1.5, 5, 1.5).fill({ color: 0x4466aa, alpha: 0.5 });

    // Measuring tools (right side)
    const toolX = PW - 55;
    const toolY = PH - 18;
    // T-square
    g.moveTo(toolX, toolY)
      .lineTo(toolX + 20, toolY)
      .stroke({ color: COL_WOOD, width: 1.5 });
    g.moveTo(toolX, toolY - 4)
      .lineTo(toolX, toolY + 4)
      .stroke({ color: COL_WOOD, width: 1.5 });

    // Rolled blueprints (stacked near right side)
    g.ellipse(PW - 30, PH - 12, 5, 2.5)
      .fill({ color: COL_PARCHMENT })
      .stroke({ color: 0xc0b890, width: 0.5 });
    g.ellipse(PW - 22, PH - 10, 5, 2.5)
      .fill({ color: 0xd8c8a0 })
      .stroke({ color: 0xc0b890, width: 0.5 });

    // Stone blocks being worked on (near entrance)
    g.rect(PW / 2 + 22, PH - 14, 10, 8)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.8 });
    g.rect(PW / 2 + 24, PH - 20, 8, 6)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.8 });

    // Lanterns on towers
    g.rect(10, 50, 3, 6).fill({ color: 0x333333 });
    g.circle(11.5, 49, 4).fill({ color: 0x443311 });
    g.circle(11.5, 49, 2.5).fill({ color: 0xffaa44, alpha: 0.7 });

    g.rect(PW - 13, 50, 3, 6).fill({ color: 0x333333 });
    g.circle(PW - 11.5, 49, 4).fill({ color: 0x443311 });
    g.circle(PW - 11.5, 49, 2.5).fill({ color: 0xffaa44, alpha: 0.7 });
  }

  private _updateArchitects(time: number): void {
    const g = this._architects;
    g.clear();

    // --- Architect 1: at drafting table (left side) ---
    const a1x = 42;
    const a1y = PH - 26;
    const drawMotion = Math.sin(time * 2.5) * 2;

    // Body (leaning slightly over table)
    g.rect(a1x - 3, a1y - 12, 6, 12).fill({ color: COL_CLOTH });
    // Head
    g.circle(a1x, a1y - 16, 3.5).fill({ color: COL_SKIN });
    // Hair
    g.circle(a1x, a1y - 18.5, 2.5).fill({ color: COL_HAIR_BROWN });
    // Drawing arm (moves back and forth)
    g.moveTo(a1x + 3, a1y - 10)
      .lineTo(a1x + 8 + drawMotion, a1y - 6)
      .stroke({ color: COL_SKIN, width: 2 });
    // Quill in hand
    g.moveTo(a1x + 8 + drawMotion, a1y - 6)
      .lineTo(a1x + 10 + drawMotion, a1y - 10)
      .stroke({ color: COL_INK, width: 1 });
    // Other arm resting
    g.moveTo(a1x - 3, a1y - 10)
      .lineTo(a1x - 6, a1y - 5)
      .stroke({ color: COL_SKIN, width: 2 });
    // Legs
    g.rect(a1x - 2, a1y, 2, 5).fill({ color: COL_CLOTH_DK });
    g.rect(a1x + 1, a1y, 2, 5).fill({ color: COL_CLOTH_DK });

    // --- Architect 2: measuring / inspecting stone blocks (right side) ---
    const a2x = PW / 2 + 30;
    const a2y = PH - 24;
    const measureSwing = Math.sin(time * 1.8) * 1.5;
    const lookBob = Math.sin(time * 1.2) * 0.5;

    // Body
    g.rect(a2x - 3, a2y - 12 + lookBob, 6, 12).fill({ color: COL_CLOTH_DK });
    // Head
    g.circle(a2x, a2y - 16 + lookBob, 3.5).fill({ color: COL_SKIN });
    // Gray hair (master architect)
    g.circle(a2x, a2y - 18.5 + lookBob, 2.5).fill({ color: COL_HAIR_GRAY });
    // Arm holding plumb line
    g.moveTo(a2x + 3, a2y - 10 + lookBob)
      .lineTo(a2x + 8, a2y - 14 + lookBob)
      .stroke({ color: COL_SKIN, width: 2 });
    // Plumb line (swinging)
    g.moveTo(a2x + 8, a2y - 14 + lookBob)
      .lineTo(a2x + 8 + measureSwing, a2y - 2)
      .stroke({ color: 0x666666, width: 0.8 });
    // Plumb weight
    g.circle(a2x + 8 + measureSwing, a2y - 1, 1.5).fill({ color: 0x888888 });
    // Other arm at side
    g.moveTo(a2x - 3, a2y - 10 + lookBob)
      .lineTo(a2x - 6, a2y - 4 + lookBob)
      .stroke({ color: COL_SKIN, width: 2 });
    // Legs
    g.rect(a2x - 2, a2y + lookBob, 2, 5).fill({ color: 0x3a3a50 });
    g.rect(a2x + 1, a2y + lookBob, 2, 5).fill({ color: 0x3a3a50 });

    // --- Architect 3: carrying blueprint (near entrance, small) ---
    const a3x = PW / 2 - 18;
    const a3y = PH - 12;
    const walkOffset = Math.sin(time * 3) * 1;

    // Body
    g.rect(a3x - 2, a3y - 8 + walkOffset * 0.2, 4, 8).fill({ color: 0x6a5a4a });
    // Head
    g.circle(a3x, a3y - 11 + walkOffset * 0.2, 2.5).fill({ color: COL_SKIN });
    // Hair
    g.circle(a3x, a3y - 13 + walkOffset * 0.2, 2).fill({ color: 0x3a2810 });
    // Carrying rolled blueprint
    g.moveTo(a3x + 2, a3y - 6 + walkOffset * 0.2)
      .lineTo(a3x + 7, a3y - 8 + walkOffset * 0.2)
      .stroke({ color: COL_PARCHMENT, width: 2.5 });
    // Legs (walking motion)
    g.rect(a3x - 1, a3y + walkOffset * 0.2, 1.5, 4).fill({ color: 0x4a3a2a });
    g.rect(a3x + 0.5, a3y - walkOffset * 0.2, 1.5, 4).fill({ color: 0x4a3a2a });
  }

  private _updateBanners(time: number): void {
    const g = this._banners;
    g.clear();

    // Left tower banner
    const wave1 = Math.sin(time * 2.5) * 3;
    g.rect(8, 16, 2, 10).fill({ color: COL_WOOD });
    g.moveTo(10, 16)
      .bezierCurveTo(18 + wave1, 18, 22 + wave1, 26, 10, 28)
      .closePath()
      .fill({ color: this._ownerColor });

    // Right tower banner
    const wave2 = Math.sin(time * 2.5 + 1) * 3;
    g.rect(PW - 10, 16, 2, 10).fill({ color: COL_WOOD });
    g.moveTo(PW - 8, 16)
      .bezierCurveTo(PW - 16 + wave2, 18, PW - 20 + wave2, 26, PW - 8, 28)
      .closePath()
      .fill({ color: this._ownerColor });

    // Center roof pennant
    const wave3 = Math.sin(time * 3) * 2;
    g.rect(PW / 2 - 1, 10, 2, 6).fill({ color: COL_WOOD });
    g.moveTo(PW / 2 + 1, 10)
      .bezierCurveTo(PW / 2 + 7 + wave3, 12, PW / 2 + 9 + wave3, 16, PW / 2 + 1, 17)
      .closePath()
      .fill({ color: COL_GOLD_TRIM });

    // Lantern glow pulsing
    const glowAlpha = 0.4 + Math.sin(time * 2) * 0.15;
    g.circle(11.5, 49, 6).fill({ color: 0xffaa44, alpha: glowAlpha * 0.2 });
    g.circle(PW - 11.5, 49, 6).fill({ color: 0xffaa44, alpha: glowAlpha * 0.2 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
