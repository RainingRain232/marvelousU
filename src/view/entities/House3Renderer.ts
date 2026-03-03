// Procedural house renderer — Variant 3: "Gardener's Cottage"
//
// 1×1 footprint (64×64 tile), visual extends to ~1×2 for animation.
// Draws a cozy medieval stone cottage with:
//   • Stone walls with mortar lines (castle palette)
//   • Thatched roof with chimney and smoke
//   • Central arched wooden door
//   • Two small windows with warm interior glow
//   • Small flower garden with rows of plants in front
//   • Peasant animation: waters garden with watering can, tends plants
//   • Cat sitting on windowsill (tail flick)
//   • Butterflies around the flowers
//   • Wheelbarrow with soil, garden tools leaning on wall
//
// All drawing uses PixiJS Graphics. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const MW = 1 * TS;

// Palette
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x6a5028;
const COL_ROOF_DK = 0x4a3418;
const COL_ROOF_LT = 0x8a7040;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_IRON = 0x555555;
// (COL_IRON_DK omitted — not used in this variant)
const COL_WINDOW = 0x1a1a2e;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_DOOR_INSIDE = 0x1a1208;

// Garden
const COL_SOIL = 0x5a4030;
const COL_SOIL_DK = 0x3a2820;
const COL_PLANT_G = 0x44aa33;
const COL_PLANT_DK = 0x338822;
const COL_FLOWER_R = 0xdd4466;
const COL_FLOWER_Y = 0xeecc33;
const COL_FLOWER_P = 0xaa55cc;
const COL_FLOWER_B = 0x5588cc;
const COL_WATER = 0x5599cc;

// Characters
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd4a880;
const COL_SHIRT = 0x558844;
const COL_SHIRT_DK = 0x446633;
const COL_PANTS = 0x665544;
const COL_HAIR = 0x7a4a2a;
const COL_BOOTS = 0x3d2510;
const COL_HAT = 0xb89060;
const COL_HAT_DK = 0x8a6840;
const COL_CAN = 0x777777;
const COL_CAN_DK = 0x555555;

// Cat
const COL_CAT = 0x444444;
const COL_CAT_LT = 0x666666;
const COL_CAT_EYE = 0x44cc44;

// Butterfly
const COL_BUTTERFLY1 = 0xff8844;
const COL_BUTTERFLY2 = 0x44aaff;

// Animation
const WATER_CYCLE = 10.0;
const WATER_T = 4.0;           // watering
const WALK_T = 2.0;            // walk to next row
const TEND_T = 3.0;            // bending / tending
const CAT_TAIL_SPEED = 1.2;
const BUTTERFLY_SPEED = 1.5;
const SMOKE_SPEED = 1.5;

// Layout
const GROUND_Y = 58;
const ROOF_BASE_Y = 14;
const ROOF_PEAK_Y = -10;
const WALL_L = 6;
const WALL_R = 58;
const DOOR_X = 24;
const DOOR_W = 14;
const DOOR_H = 24;

// Garden area (below the building)
const GARDEN_Y = GROUND_Y + 6;
const GARDEN_ROWS = 3;
const GARDEN_ROW_H = 8;

// ---------------------------------------------------------------------------
// House3Renderer
// ---------------------------------------------------------------------------

export class House3Renderer {
  readonly container = new Container();

  private _base = new Graphics();
  private _building = new Graphics();
  private _roof = new Graphics();
  private _garden = new Graphics();
  private _details = new Graphics();
  private _peasant = new Graphics();
  private _cat = new Graphics();
  private _butterflies = new Graphics();
  private _effects = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBase();
    this._drawBuilding();
    this._drawRoof();
    this._drawDetails();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._garden);
    this.container.addChild(this._roof);
    this.container.addChild(this._details);
    this.container.addChild(this._peasant);
    this.container.addChild(this._cat);
    this.container.addChild(this._butterflies);
    this.container.addChild(this._effects);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateGarden(t);
    this._updatePeasant(t);
    this._updateCat(t);
    this._updateButterflies(t);
    this._updateEffects(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground / base
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // Ground
    g.rect(0, GROUND_Y, MW, 10).fill({ color: 0x6b6050 });

    // Garden bed area (brown soil)
    g.rect(2, GARDEN_Y, MW - 4, GARDEN_ROWS * GARDEN_ROW_H + 4)
      .fill({ color: COL_SOIL })
      .stroke({ color: COL_SOIL_DK, width: 0.5 });

    // Garden row furrows
    for (let r = 0; r < GARDEN_ROWS; r++) {
      const ry = GARDEN_Y + 2 + r * GARDEN_ROW_H;
      g.rect(4, ry, MW - 8, 2).fill({ color: COL_SOIL_DK });
    }

    // Small stone border around garden
    for (let i = 0; i < 8; i++) {
      g.ellipse(4 + i * 7.5, GARDEN_Y - 1, 3, 1.5).fill({ color: COL_STONE_DK });
      g.ellipse(4 + i * 7.5, GARDEN_Y + GARDEN_ROWS * GARDEN_ROW_H + 4, 3, 1.5)
        .fill({ color: COL_STONE_DK });
    }

    // Stepping stone path to door
    g.ellipse(DOOR_X + DOOR_W / 2, GROUND_Y + 2, 4, 1.5).fill({ color: COL_STONE });
    g.ellipse(DOOR_X + DOOR_W / 2 - 3, GROUND_Y + 5, 3, 1.2).fill({ color: COL_STONE_DK });
  }

  // =========================================================================
  // Stone cottage walls
  // =========================================================================

  private _drawBuilding(): void {
    const g = this._building;

    // Wall body
    g.rect(WALL_L, ROOF_BASE_Y, WALL_R - WALL_L, GROUND_Y - ROOF_BASE_Y)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });

    // Highlight & shadow
    g.rect(WALL_L, ROOF_BASE_Y + 2, 3, GROUND_Y - ROOF_BASE_Y - 4)
      .fill({ color: COL_STONE_LT, alpha: 0.25 });
    g.rect(WALL_R - 3, ROOF_BASE_Y + 2, 3, GROUND_Y - ROOF_BASE_Y - 4)
      .fill({ color: COL_STONE_DK, alpha: 0.25 });

    // Brick mortar
    for (let row = 0; row < 5; row++) {
      const yy = ROOF_BASE_Y + 4 + row * 8;
      g.moveTo(WALL_L + 2, yy)
        .lineTo(WALL_R - 2, yy)
        .stroke({ color: COL_MORTAR, width: 0.4 });
      const xOff = row % 2 === 0 ? 0 : 7;
      for (let x = WALL_L + 4 + xOff; x < WALL_R - 4; x += 14) {
        g.moveTo(x, yy).lineTo(x, yy + 8).stroke({ color: COL_MORTAR, width: 0.3 });
      }
    }

    // Stone variation
    g.rect(WALL_L + 6, ROOF_BASE_Y + 10, 4, 3).fill({ color: COL_STONE_LT, alpha: 0.15 });
    g.rect(WALL_L + 28, ROOF_BASE_Y + 20, 5, 4).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Left window
    const winLX = WALL_L + 3;
    const winY = ROOF_BASE_Y + 14;
    const winW = 8;
    const winH = 10;

    g.rect(winLX, winY, winW, winH).fill({ color: COL_WINDOW });
    g.moveTo(winLX, winY).arc(winLX + winW / 2, winY, winW / 2, Math.PI, 0).fill({ color: COL_WINDOW });
    g.rect(winLX, winY, winW, winH).stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(winLX + winW / 2, winY - 1)
      .lineTo(winLX + winW / 2, winY + winH)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Right window
    const winRX = WALL_R - 11;
    g.rect(winRX, winY, winW, winH).fill({ color: COL_WINDOW });
    g.moveTo(winRX, winY).arc(winRX + winW / 2, winY, winW / 2, Math.PI, 0).fill({ color: COL_WINDOW });
    g.rect(winRX, winY, winW, winH).stroke({ color: COL_STONE_DK, width: 0.5 });
    g.moveTo(winRX + winW / 2, winY - 1)
      .lineTo(winRX + winW / 2, winY + winH)
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Central door
    const doorY = GROUND_Y - DOOR_H;
    // Frame
    g.rect(DOOR_X - 2, doorY - 2, DOOR_W + 4, DOOR_H + 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    g.moveTo(DOOR_X - 1, doorY).arc(DOOR_X + DOOR_W / 2, doorY, DOOR_W / 2 + 1, Math.PI, 0)
      .fill({ color: COL_STONE_LT });
    // Door recess
    g.rect(DOOR_X, doorY, DOOR_W, DOOR_H).fill({ color: COL_DOOR_INSIDE });
    // Door planks
    for (let i = 0; i < 3; i++) {
      g.rect(DOOR_X + 1 + i * 4, doorY + 1, 3.5, DOOR_H - 2)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
    }
    // Iron bands
    g.rect(DOOR_X, doorY + 5, DOOR_W, 1.2).fill({ color: COL_IRON });
    g.rect(DOOR_X, doorY + 14, DOOR_W, 1.2).fill({ color: COL_IRON });
    // Ring pull
    g.circle(DOOR_X + DOOR_W - 4, doorY + DOOR_H / 2, 1.3)
      .stroke({ color: COL_IRON, width: 0.6 });

    // Moss
    for (let i = 0; i < 3; i++) {
      const mx = WALL_L + 2 + i * 10;
      g.rect(mx, GROUND_Y - 2, 3, 2).fill({ color: COL_MOSS, alpha: 0.4 });
    }
  }

  // =========================================================================
  // Thatched roof
  // =========================================================================

  private _drawRoof(): void {
    const g = this._roof;

    const overhang = 5;

    g.moveTo(WALL_L - overhang, ROOF_BASE_Y)
      .lineTo(MW / 2, ROOF_PEAK_Y)
      .lineTo(WALL_R + overhang, ROOF_BASE_Y)
      .closePath()
      .fill({ color: COL_ROOF });

    // Highlight
    g.moveTo(MW / 2, ROOF_PEAK_Y)
      .lineTo(WALL_R + overhang, ROOF_BASE_Y)
      .lineTo(WALL_R + overhang - 3, ROOF_BASE_Y)
      .lineTo(MW / 2, ROOF_PEAK_Y + 3)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.4 });

    // Thatch lines
    for (let i = 1; i <= 4; i++) {
      const t = i / 5;
      const ly = ROOF_PEAK_Y + (ROOF_BASE_Y - ROOF_PEAK_Y) * t;
      const lw = (WALL_R - WALL_L + overhang * 2) * t / 2;
      g.moveTo(MW / 2 - lw, ly)
        .lineTo(MW / 2 + lw, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5 });
    }

    // Outline
    g.moveTo(WALL_L - overhang, ROOF_BASE_Y)
      .lineTo(MW / 2, ROOF_PEAK_Y)
      .lineTo(WALL_R + overhang, ROOF_BASE_Y)
      .stroke({ color: COL_ROOF_DK, width: 0.8 });

    // Chimney (center-left)
    const chimX = MW / 2 - 8;
    const chimW = 6;
    const chimTop = ROOF_PEAK_Y - 2;
    const chimBase = ROOF_BASE_Y - 4;

    g.rect(chimX, chimTop, chimW, chimBase - chimTop)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 0.5 });
    g.rect(chimX - 1, chimTop - 1, chimW + 2, 2).fill({ color: COL_STONE });
    g.moveTo(chimX, chimTop + 4)
      .lineTo(chimX + chimW, chimTop + 4)
      .stroke({ color: COL_MORTAR, width: 0.3 });
  }

  // =========================================================================
  // Static details — wheelbarrow, tools
  // =========================================================================

  private _drawDetails(): void {
    const g = this._details;

    // Wheelbarrow (left side)
    const wbX = 2;
    const wbY = GROUND_Y;
    // Barrel body
    g.moveTo(wbX, wbY - 2)
      .lineTo(wbX - 1, wbY - 8)
      .lineTo(wbX + 10, wbY - 8)
      .lineTo(wbX + 12, wbY - 2)
      .closePath()
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.4 });
    // Soil in wheelbarrow
    g.moveTo(wbX, wbY - 8)
      .lineTo(wbX + 10, wbY - 8)
      .lineTo(wbX + 9, wbY - 10)
      .lineTo(wbX + 1, wbY - 10)
      .closePath()
      .fill({ color: COL_SOIL });
    // Wheel
    g.circle(wbX + 6, wbY, 2).fill({ color: COL_WOOD_DK });
    g.circle(wbX + 6, wbY, 2).stroke({ color: COL_IRON, width: 0.5 });
    g.circle(wbX + 6, wbY, 0.5).fill({ color: COL_IRON });
    // Handle
    g.moveTo(wbX + 10, wbY - 4)
      .lineTo(wbX + 16, wbY - 2)
      .stroke({ color: COL_WOOD, width: 1 });

    // Garden trowel leaning on wall
    const toolX = WALL_R + 1;
    const toolY = GROUND_Y;
    g.moveTo(toolX, toolY)
      .lineTo(toolX - 2, toolY - 14)
      .stroke({ color: COL_WOOD, width: 1 });
    g.moveTo(toolX - 3, toolY - 14)
      .lineTo(toolX - 1, toolY - 14)
      .lineTo(toolX - 2, toolY - 18)
      .closePath()
      .fill({ color: COL_IRON });

    // Watering can (resting near garden)
    const canX = 50;
    const canY = GROUND_Y;
    g.moveTo(canX, canY)
      .lineTo(canX, canY - 6)
      .lineTo(canX + 8, canY - 6)
      .lineTo(canX + 8, canY)
      .closePath()
      .fill({ color: COL_CAN });
    g.rect(canX, canY - 6, 8, 6).stroke({ color: COL_CAN_DK, width: 0.3 });
    // Spout
    g.moveTo(canX + 8, canY - 4)
      .lineTo(canX + 12, canY - 8)
      .stroke({ color: COL_CAN, width: 1.2 });
    // Handle
    g.moveTo(canX + 1, canY - 8).arc(canX + 4, canY - 8, 3, Math.PI, 0).stroke({ color: COL_CAN_DK, width: 0.8 });
  }

  // =========================================================================
  // Garden plants (animated — gentle sway)
  // =========================================================================

  private _updateGarden(time: number): void {
    const g = this._garden;
    g.clear();

    const sway = Math.sin(time * 1.2) * 1;

    // Draw plants in garden rows
    const plantColors = [COL_FLOWER_R, COL_FLOWER_Y, COL_FLOWER_P, COL_FLOWER_B];

    for (let row = 0; row < GARDEN_ROWS; row++) {
      const ry = GARDEN_Y + 3 + row * GARDEN_ROW_H;

      for (let col = 0; col < 6; col++) {
        const px = 8 + col * 9;
        const plantSway = sway * (0.5 + (col % 3) * 0.3);

        // Stem
        g.moveTo(px, ry + 4)
          .lineTo(px + plantSway, ry - 2)
          .stroke({ color: COL_PLANT_DK, width: 0.6 });

        // Leaves
        g.ellipse(px + plantSway - 1.5, ry, 2, 1).fill({ color: COL_PLANT_G });
        g.ellipse(px + plantSway + 1.5, ry + 1, 2, 1).fill({ color: COL_PLANT_DK });

        // Flower on some plants
        if ((row + col) % 2 === 0) {
          const flowerCol = plantColors[(row + col) % plantColors.length];
          g.circle(px + plantSway, ry - 3, 1.5).fill({ color: flowerCol });
          g.circle(px + plantSway, ry - 3, 0.5).fill({ color: 0xffffcc });
        }
      }
    }
  }

  // =========================================================================
  // Peasant gardener
  // =========================================================================

  private _updatePeasant(time: number): void {
    const g = this._peasant;
    g.clear();

    const cycle = time % WATER_CYCLE;

    let px = 20;
    const py = GROUND_Y;
    let isWatering = false;
    let isBending = false;
    let isWalking = false;

    if (cycle < WATER_T) {
      // Watering (standing near garden, pouring water)
      px = 14;
      isWatering = true;
    } else if (cycle < WATER_T + WALK_T) {
      // Walking to next spot
      const walkPct = (cycle - WATER_T) / WALK_T;
      px = 14 + walkPct * 26;
      isWalking = true;
    } else if (cycle < WATER_T + WALK_T + TEND_T) {
      // Tending plants (bending)
      px = 40;
      isBending = true;
    } else {
      // Rest / standing
      px = 40;
    }

    const walkBob = isWalking ? Math.sin(time * 8) * 1 : 0;
    const breathe = Math.sin(time * 2) * 0.4;
    const bend = isBending ? Math.sin(time * 2) * 3 + 3 : 0;
    const legSwing = isWalking ? Math.sin(time * 8) * 2 : 0;

    // Legs
    g.rect(px - 3, py - 4 - legSwing, 3, 6).fill({ color: COL_PANTS });
    g.rect(px + 1, py - 4 + legSwing, 3, 6).fill({ color: COL_PANTS });
    // Boots
    g.rect(px - 4, py + 1 - legSwing, 4, 2).fill({ color: COL_BOOTS });
    g.rect(px + 1, py + 1 + legSwing, 4, 2).fill({ color: COL_BOOTS });

    // Body
    g.rect(px - 4, py - 18 + walkBob + bend + breathe, 9, 14)
      .fill({ color: COL_SHIRT });
    g.rect(px - 4, py - 12 + walkBob + bend + breathe, 9, 2)
      .fill({ color: COL_SHIRT_DK });

    // Arms
    if (isWatering) {
      // Right arm holding watering can (tilted)
      const pourCycle = Math.sin(time * 2.5) * 0.3 + 0.3;
      g.moveTo(px + 5, py - 16 + breathe)
        .lineTo(px + 10, py - 12 + breathe + pourCycle * 3)
        .stroke({ color: COL_SHIRT, width: 2.5 });
      g.circle(px + 10, py - 11 + breathe + pourCycle * 3, 1.2).fill({ color: COL_SKIN });

      // Watering can in hand
      const canX = px + 8;
      const canY = py - 10 + breathe + pourCycle * 3;
      g.rect(canX, canY, 6, 4).fill({ color: COL_CAN });
      g.rect(canX, canY, 6, 4).stroke({ color: COL_CAN_DK, width: 0.3 });
      // Spout
      g.moveTo(canX + 6, canY + 1)
        .lineTo(canX + 10, canY - 2)
        .stroke({ color: COL_CAN, width: 1 });

      // Water drops
      for (let i = 0; i < 3; i++) {
        const dropPhase = (time * 4 + i * 0.8) % 1.5;
        if (dropPhase > 1.0) continue;
        const dropY = canY - 2 + dropPhase * 16;
        const dropX = canX + 10 + (dropPhase * 2);
        const alpha = 0.5 * (1 - dropPhase / 1.0);
        g.circle(dropX, dropY, 0.8).fill({ color: COL_WATER, alpha });
      }

      // Left arm relaxed
      g.rect(px - 6, py - 16 + breathe, 2.5, 8).fill({ color: COL_SHIRT });
      g.circle(px - 5, py - 8 + breathe, 1.2).fill({ color: COL_SKIN_DK });
    } else if (isBending) {
      // Both arms reaching down
      g.rect(px - 6, py - 12 + bend, 2.5, 8).fill({ color: COL_SHIRT });
      g.rect(px + 5, py - 12 + bend, 2.5, 8).fill({ color: COL_SHIRT });
      g.circle(px - 5, py - 4 + bend, 1.2).fill({ color: COL_SKIN });
      g.circle(px + 6, py - 4 + bend, 1.2).fill({ color: COL_SKIN });
    } else {
      // Arms at sides / walking
      const armSwing = isWalking ? Math.sin(time * 8) * 3 : 0;
      g.rect(px - 6, py - 16 + walkBob + armSwing, 2.5, 8).fill({ color: COL_SHIRT });
      g.rect(px + 5, py - 16 + walkBob - armSwing, 2.5, 8).fill({ color: COL_SHIRT });
      g.circle(px - 5, py - 8 + walkBob + armSwing, 1.2).fill({ color: COL_SKIN });
      g.circle(px + 6, py - 8 + walkBob - armSwing, 1.2).fill({ color: COL_SKIN });
    }

    // Head
    const headBob = walkBob + bend * 0.5 + breathe;
    g.circle(px, py - 22 + headBob, 4.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(px - 1.5, py - 22.5 + headBob, 0.5).fill({ color: 0x222222 });
    g.circle(px + 1.5, py - 22.5 + headBob, 0.5).fill({ color: 0x222222 });
    // Nose
    g.moveTo(px, py - 21 + headBob)
      .lineTo(px + 1, py - 20 + headBob)
      .stroke({ color: COL_SKIN_DK, width: 0.5 });
    // Smile
    if (!isBending) {
      g.moveTo(px + 1.2 * Math.cos(0.2), py - 20 + headBob + 1.2 * Math.sin(0.2))
        .arc(px, py - 20 + headBob, 1.2, 0.2, Math.PI - 0.2)
        .stroke({ color: COL_SKIN_DK, width: 0.4 });
    }
    // Hair
    g.moveTo(px + 5 * Math.cos(Math.PI + 0.3), py - 22 + headBob + 5 * Math.sin(Math.PI + 0.3))
      .arc(px, py - 22 + headBob, 5, Math.PI + 0.3, -0.3)
      .stroke({ color: COL_HAIR, width: 1.5 });

    // Straw hat (wide brim)
    g.rect(px - 7, py - 28 + headBob, 14, 2).fill({ color: COL_HAT });
    g.rect(px - 7, py - 28 + headBob, 14, 2).stroke({ color: COL_HAT_DK, width: 0.3 });
    g.rect(px - 4, py - 32 + headBob, 8, 5).fill({ color: COL_HAT });
    g.rect(px - 4, py - 32 + headBob, 8, 5).stroke({ color: COL_HAT_DK, width: 0.3 });
    // Hat band
    g.rect(px - 4, py - 28 + headBob, 8, 1).fill({ color: COL_PLANT_DK });
  }

  // =========================================================================
  // Cat on windowsill
  // =========================================================================

  private _updateCat(time: number): void {
    const g = this._cat;
    g.clear();

    // Cat sits on the right window sill
    const winRX = WALL_R - 11;
    const winY = ROOF_BASE_Y + 14;
    const catX = winRX + 4;
    const catY = winY + 9;

    const tailFlick = Math.sin(time * CAT_TAIL_SPEED) * 3;
    const earTwitch = Math.sin(time * 3.5) > 0.8 ? 0.5 : 0;

    // Body (sitting)
    g.ellipse(catX, catY, 3.5, 2.5).fill({ color: COL_CAT });
    // Chest (lighter)
    g.ellipse(catX - 1, catY - 0.5, 1.5, 2).fill({ color: COL_CAT_LT });
    // Head
    g.circle(catX - 2, catY - 3, 2.5).fill({ color: COL_CAT });
    // Ears
    g.moveTo(catX - 4, catY - 4 - earTwitch)
      .lineTo(catX - 4.5, catY - 7 - earTwitch)
      .lineTo(catX - 3, catY - 5 - earTwitch)
      .fill({ color: COL_CAT });
    g.moveTo(catX - 1, catY - 4 - earTwitch)
      .lineTo(catX - 0.5, catY - 7 - earTwitch)
      .lineTo(catX + 0.5, catY - 5 - earTwitch)
      .fill({ color: COL_CAT });
    // Inner ears
    g.moveTo(catX - 3.5, catY - 5 - earTwitch)
      .lineTo(catX - 4, catY - 6.5 - earTwitch)
      .lineTo(catX - 3, catY - 5.5 - earTwitch)
      .fill({ color: 0xff8888 });

    // Eyes (alert, looking out)
    g.circle(catX - 3, catY - 3.5, 0.8).fill({ color: COL_CAT_EYE });
    g.circle(catX - 1, catY - 3.5, 0.8).fill({ color: COL_CAT_EYE });
    // Pupils (slitted)
    g.ellipse(catX - 3, catY - 3.5, 0.3, 0.6).fill({ color: 0x111111 });
    g.ellipse(catX - 1, catY - 3.5, 0.3, 0.6).fill({ color: 0x111111 });
    // Nose
    g.moveTo(catX - 2, catY - 2.5)
      .lineTo(catX - 2.3, catY - 2)
      .lineTo(catX - 1.7, catY - 2)
      .closePath()
      .fill({ color: 0xff8888 });
    // Whiskers
    g.moveTo(catX - 4, catY - 2.5)
      .lineTo(catX - 7, catY - 3)
      .stroke({ color: COL_CAT_LT, width: 0.2 });
    g.moveTo(catX - 4, catY - 2)
      .lineTo(catX - 7, catY - 1.5)
      .stroke({ color: COL_CAT_LT, width: 0.2 });
    g.moveTo(catX, catY - 2.5)
      .lineTo(catX + 3, catY - 3)
      .stroke({ color: COL_CAT_LT, width: 0.2 });
    g.moveTo(catX, catY - 2)
      .lineTo(catX + 3, catY - 1.5)
      .stroke({ color: COL_CAT_LT, width: 0.2 });

    // Tail (curling upward, flicking)
    g.moveTo(catX + 3, catY)
      .quadraticCurveTo(catX + 5, catY - 2 + tailFlick, catX + 4, catY - 5 + tailFlick)
      .stroke({ color: COL_CAT, width: 1.2 });

    // Front paws (hanging off sill)
    g.ellipse(catX - 3, catY + 2, 1, 0.6).fill({ color: COL_CAT });
    g.ellipse(catX - 1, catY + 2, 1, 0.6).fill({ color: COL_CAT });
  }

  // =========================================================================
  // Butterflies
  // =========================================================================

  private _updateButterflies(time: number): void {
    const g = this._butterflies;
    g.clear();

    const butterflies = [
      { baseX: 20, baseY: GARDEN_Y - 4, col: COL_BUTTERFLY1, phase: 0 },
      { baseX: 45, baseY: GARDEN_Y - 2, col: COL_BUTTERFLY2, phase: 2.5 },
    ];

    for (const b of butterflies) {
      const t = time * BUTTERFLY_SPEED + b.phase;
      const bx = b.baseX + Math.sin(t * 0.7) * 10;
      const by = b.baseY + Math.cos(t * 0.5) * 4 - 3;
      const wingFlap = Math.sin(t * 6) * 0.5 + 0.5;
      const wingSpread = wingFlap * 2.5;

      // Wings (two triangles)
      g.moveTo(bx, by)
        .lineTo(bx - wingSpread, by - 1.5)
        .lineTo(bx - wingSpread * 0.5, by + 1)
        .closePath()
        .fill({ color: b.col, alpha: 0.7 });
      g.moveTo(bx, by)
        .lineTo(bx + wingSpread, by - 1.5)
        .lineTo(bx + wingSpread * 0.5, by + 1)
        .closePath()
        .fill({ color: b.col, alpha: 0.7 });

      // Body
      g.ellipse(bx, by, 0.5, 1).fill({ color: 0x222222 });
    }
  }

  // =========================================================================
  // Effects — smoke, window glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // Chimney smoke
    const chimX = MW / 2 - 5;
    const chimTop = ROOF_PEAK_Y - 3;

    for (let i = 0; i < 3; i++) {
      const phase = (time * SMOKE_SPEED + i * 1.0) % 3.5;
      if (phase > 2.0) continue;
      const rise = phase * 7;
      const drift = Math.sin(time * 0.8 + i * 2) * 2.5;
      const size = 1.8 + phase * 1.3;
      const alpha = 0.25 * (1 - phase / 2.0);
      g.circle(chimX + drift, chimTop - rise, size)
        .fill({ color: 0xaaaaaa, alpha });
    }

    // Window glow (both windows)
    const winLX = WALL_L + 3;
    const winRX = WALL_R - 11;
    const winY = ROOF_BASE_Y + 14;
    const glowPulse = 0.18 + Math.sin(time * 1.4) * 0.06;

    g.rect(winLX + 1, winY + 1, 6, 8).fill({ color: COL_GLOW, alpha: glowPulse });
    g.circle(winLX + 4, winY + 5, 6).fill({ color: COL_GLOW, alpha: glowPulse * 0.1 });

    g.rect(winRX + 1, winY + 1, 6, 8).fill({ color: COL_GLOW, alpha: glowPulse * 0.7 });
    g.circle(winRX + 4, winY + 5, 6).fill({ color: COL_GLOW, alpha: glowPulse * 0.08 });
  }
}
