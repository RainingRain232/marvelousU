// Procedural house renderer — Variant 2: "Laundry Day Cottage"
//
// 1×1 footprint (64×64 tile), visual extends to ~1×2 for animation.
// Draws a cozy medieval stone cottage with:
//   • Stone walls with mortar lines (castle palette)
//   • Thatched roof with chimney and smoke
//   • Arched wooden door
//   • Small window with warm interior glow
//   • Clothesline strung from cottage to a wooden pole
//   • Woman animation: carries basket, hangs laundry, sheets billow in wind
//   • Child playing near doorstep (bouncing a ball)
//   • Small details: moss, potted plant, water barrel
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
const COL_ROOF = 0x7a5a30;
const COL_ROOF_DK = 0x5a3a18;
const COL_ROOF_LT = 0x9a7a48;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_IRON = 0x555555;
// (COL_IRON_DK omitted — not used in this variant)
const COL_WINDOW = 0x1a1a2e;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_DOOR_INSIDE = 0x1a1208;

// Characters
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd4a880;
const COL_DRESS = 0xaa5566;
const COL_DRESS_DK = 0x884455;
const COL_APRON = 0xe8ddd0;
const COL_APRON_DK = 0xc8bdb0;
const COL_HAIR_W = 0x8a5030;
const COL_CHILD_SHIRT = 0x66aa77;
const COL_CHILD_PANTS = 0x665544;
const COL_CHILD_HAIR = 0xc8a040;
const COL_BOOTS = 0x3d2510;

// Laundry
const COL_SHEET_WHITE = 0xf0ead8;
const COL_SHEET_BLUE = 0x6688aa;
const COL_ROPE = 0x998866;
const COL_BASKET = 0xb89060;
const COL_BASKET_DK = 0x8a6840;

// Animation
const CYCLE = 16.0;
const HANG_T = 4.0;         // woman hangs laundry
const IDLE_T = 6.0;         // woman watches / rests
const WALK_TO_BASKET_T = 2.0;
const PICK_UP_T = 2.0;
const WALK_BACK_T = 2.0;
const CHILD_BOUNCE = 2.5;
const WIND_SPEED = 2.0;
const SMOKE_SPEED = 1.5;

// Layout
const GROUND_Y = 58;
const ROOF_BASE_Y = 14;
const ROOF_PEAK_Y = -8;
const WALL_L = 6;
const WALL_R = 58;
const DOOR_X = 8;
const DOOR_W = 12;
const DOOR_H = 22;

// Clothesline
const LINE_START_X = WALL_R - 4;
const LINE_START_Y = ROOF_BASE_Y + 8;
const POLE_X = MW - 4;
const POLE_Y = GROUND_Y;
const LINE_END_Y = LINE_START_Y + 2;

// ---------------------------------------------------------------------------
// House2Renderer
// ---------------------------------------------------------------------------

export class House2Renderer {
  readonly container = new Container();

  private _base = new Graphics();
  private _building = new Graphics();
  private _roof = new Graphics();
  private _details = new Graphics();
  private _clothesline = new Graphics();
  private _woman = new Graphics();
  private _child = new Graphics();
  private _effects = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBase();
    this._drawBuilding();
    this._drawRoof();
    this._drawDetails();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._clothesline);
    this.container.addChild(this._roof);
    this.container.addChild(this._details);
    this.container.addChild(this._woman);
    this.container.addChild(this._child);
    this.container.addChild(this._effects);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateClothesline(t);
    this._updateWoman(t);
    this._updateChild(t);
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

    // Dirt path
    g.ellipse(DOOR_X + DOOR_W / 2, GROUND_Y + 2, 8, 2.5).fill({ color: 0x8a7a60 });

    // Clothesline pole (wooden)
    g.rect(POLE_X - 1, LINE_END_Y - 2, 2, POLE_Y - LINE_END_Y + 4)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Pole top cap
    g.rect(POLE_X - 2, LINE_END_Y - 3, 4, 2).fill({ color: COL_WOOD_DK });

    // Water barrel (near door)
    g.moveTo(2, GROUND_Y)
      .lineTo(0, GROUND_Y - 10)
      .lineTo(6, GROUND_Y - 10)
      .lineTo(4, GROUND_Y)
      .closePath()
      .fill({ color: COL_WOOD });
    g.rect(0, GROUND_Y - 7, 6, 1).fill({ color: COL_IRON });
    g.rect(0, GROUND_Y - 4, 6, 1).fill({ color: COL_IRON });
    // Water top
    g.ellipse(3, GROUND_Y - 10, 3, 1).fill({ color: 0x3366aa, alpha: 0.5 });

    // Potted plant (right of door)
    g.moveTo(22, GROUND_Y)
      .lineTo(21, GROUND_Y - 5)
      .lineTo(27, GROUND_Y - 5)
      .lineTo(26, GROUND_Y)
      .closePath()
      .fill({ color: 0xaa6644 });
    // Plant
    g.moveTo(24, GROUND_Y - 5)
      .lineTo(24, GROUND_Y - 10)
      .stroke({ color: 0x448833, width: 0.6 });
    g.circle(23, GROUND_Y - 10, 1.5).fill({ color: 0x448833 });
    g.circle(25, GROUND_Y - 9, 1.5).fill({ color: 0x55aa44 });
    g.circle(24, GROUND_Y - 11, 1).fill({ color: 0xdd4466 });
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

    // Highlight and shadow
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
    g.rect(WALL_L + 20, ROOF_BASE_Y + 6, 5, 4).fill({ color: COL_STONE_LT, alpha: 0.15 });
    g.rect(WALL_L + 8, ROOF_BASE_Y + 22, 6, 3).fill({ color: COL_STONE_DK, alpha: 0.15 });

    // Window (right side)
    const winX = WALL_L + 30;
    const winY = ROOF_BASE_Y + 12;
    const winW = 10;
    const winH = 12;

    g.rect(winX, winY, winW, winH).fill({ color: COL_WINDOW });
    g.arc(winX + winW / 2, winY, winW / 2, Math.PI, 0).fill({ color: COL_WINDOW });
    g.rect(winX, winY, winW, winH).stroke({ color: COL_STONE_DK, width: 0.6 });
    // Mullion
    g.moveTo(winX + winW / 2, winY - 2)
      .lineTo(winX + winW / 2, winY + winH)
      .stroke({ color: COL_WOOD_DK, width: 0.6 });
    g.moveTo(winX, winY + winH / 2)
      .lineTo(winX + winW, winY + winH / 2)
      .stroke({ color: COL_WOOD_DK, width: 0.6 });
    // Shutters
    g.rect(winX - 3, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(winX + winW, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });

    // Door
    const doorY = GROUND_Y - DOOR_H;
    // Frame
    g.rect(DOOR_X - 2, doorY - 2, DOOR_W + 4, DOOR_H + 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    g.arc(DOOR_X + DOOR_W / 2, doorY, DOOR_W / 2 + 1, Math.PI, 0)
      .fill({ color: COL_STONE_LT });
    // Door interior
    g.rect(DOOR_X, doorY, DOOR_W, DOOR_H).fill({ color: COL_DOOR_INSIDE });
    // Door planks
    for (let i = 0; i < 3; i++) {
      g.rect(DOOR_X + 1 + i * 3.5, doorY + 1, 3, DOOR_H - 2)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
    }
    // Iron bands
    g.rect(DOOR_X, doorY + 5, DOOR_W, 1.2).fill({ color: COL_IRON });
    g.rect(DOOR_X, doorY + 13, DOOR_W, 1.2).fill({ color: COL_IRON });
    // Ring pull
    g.circle(DOOR_X + DOOR_W - 3, doorY + DOOR_H / 2, 1.2)
      .stroke({ color: COL_IRON, width: 0.6 });

    // Moss
    for (let i = 0; i < 3; i++) {
      const mx = WALL_L + 4 + i * 8;
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

    // Chimney (right side)
    const chimX = WALL_R - 16;
    const chimW = 7;
    const chimTop = ROOF_PEAK_Y - 2;
    const chimBase = ROOF_BASE_Y - 2;

    g.rect(chimX, chimTop, chimW, chimBase - chimTop)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 0.5 });
    g.rect(chimX - 1, chimTop - 1, chimW + 2, 2).fill({ color: COL_STONE });
    g.moveTo(chimX, chimTop + 4)
      .lineTo(chimX + chimW, chimTop + 4)
      .stroke({ color: COL_MORTAR, width: 0.3 });
  }

  // =========================================================================
  // Static details
  // =========================================================================

  private _drawDetails(): void {
    const g = this._details;

    // Laundry basket (on ground near clothesline)
    const baskX = 40;
    const baskY = GROUND_Y - 1;
    g.moveTo(baskX, baskY)
      .lineTo(baskX - 2, baskY - 8)
      .lineTo(baskX + 10, baskY - 8)
      .lineTo(baskX + 12, baskY)
      .closePath()
      .fill({ color: COL_BASKET })
      .stroke({ color: COL_BASKET_DK, width: 0.4 });
    // Weave pattern
    g.moveTo(baskX, baskY - 3)
      .lineTo(baskX + 12, baskY - 3)
      .stroke({ color: COL_BASKET_DK, width: 0.3 });
    g.moveTo(baskX + 1, baskY - 6)
      .lineTo(baskX + 11, baskY - 6)
      .stroke({ color: COL_BASKET_DK, width: 0.3 });
    // Clothes peeking out
    g.rect(baskX + 1, baskY - 10, 4, 3).fill({ color: COL_SHEET_WHITE });
    g.rect(baskX + 6, baskY - 9, 3, 2).fill({ color: COL_SHEET_BLUE });
  }

  // =========================================================================
  // Clothesline with billowing laundry
  // =========================================================================

  private _updateClothesline(time: number): void {
    const g = this._clothesline;
    g.clear();

    const wind = Math.sin(time * WIND_SPEED) * 2;
    const windFast = Math.sin(time * WIND_SPEED * 1.5 + 0.5) * 1.5;

    // Rope
    const sagMid = 2 + wind * 0.3;
    const midX = (LINE_START_X + POLE_X) / 2;
    const midY = (LINE_START_Y + LINE_END_Y) / 2 + sagMid;
    g.moveTo(LINE_START_X, LINE_START_Y)
      .quadraticCurveTo(midX, midY, POLE_X, LINE_END_Y)
      .stroke({ color: COL_ROPE, width: 0.7 });

    // Laundry items on the line
    const items = [
      { x: LINE_START_X + 6, col: COL_SHEET_WHITE, w: 8, h: 14 },
      { x: LINE_START_X + 18, col: COL_SHEET_BLUE, w: 6, h: 10 },
      { x: LINE_START_X + 28, col: COL_SHEET_WHITE, w: 7, h: 12 },
    ];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      // Calculate line y at this x position
      const t = (item.x - LINE_START_X) / (POLE_X - LINE_START_X);
      const lineY = LINE_START_Y + (LINE_END_Y - LINE_START_Y) * t +
        sagMid * Math.sin(t * Math.PI);

      // Cloth sways with wind
      const sway = (i % 2 === 0 ? wind : windFast) * (1 + i * 0.3);
      const bottomSway = sway * 1.5;

      // Draw cloth as a quadrilateral
      g.moveTo(item.x, lineY)
        .lineTo(item.x + item.w, lineY)
        .lineTo(item.x + item.w + bottomSway, lineY + item.h)
        .lineTo(item.x + bottomSway, lineY + item.h)
        .closePath()
        .fill({ color: item.col });

      // Cloth border/seam
      g.moveTo(item.x, lineY)
        .lineTo(item.x + item.w, lineY)
        .lineTo(item.x + item.w + bottomSway, lineY + item.h)
        .lineTo(item.x + bottomSway, lineY + item.h)
        .closePath()
        .stroke({ color: i === 1 ? 0x5577aa : 0xd8d0c0, width: 0.3 });

      // Clothespins
      g.rect(item.x + 1, lineY - 1, 2, 3).fill({ color: COL_WOOD });
      g.rect(item.x + item.w - 3, lineY - 1, 2, 3).fill({ color: COL_WOOD });
    }
  }

  // =========================================================================
  // Woman character
  // =========================================================================

  private _updateWoman(time: number): void {
    const g = this._woman;
    g.clear();

    const cycle = time % CYCLE;

    // Woman position — stands near clothesline mostly
    let wx = 36;
    const wy = GROUND_Y;
    let armUp = false;

    if (cycle < HANG_T) {
      // Hanging laundry — reach up animation
      wx = LINE_START_X + 6;
      armUp = true;
    } else if (cycle < HANG_T + IDLE_T) {
      // Standing, watching laundry / hands on hips
      wx = LINE_START_X + 2;
    } else if (cycle < HANG_T + IDLE_T + WALK_TO_BASKET_T) {
      // Walking to basket
      const walkPct = (cycle - HANG_T - IDLE_T) / WALK_TO_BASKET_T;
      wx = LINE_START_X + 2 + walkPct * (40 - LINE_START_X - 2);
    } else if (cycle < HANG_T + IDLE_T + WALK_TO_BASKET_T + PICK_UP_T) {
      // Bending to pick up from basket
      wx = 42;
    } else {
      // Walking back
      const walkPct = (cycle - HANG_T - IDLE_T - WALK_TO_BASKET_T - PICK_UP_T) / WALK_BACK_T;
      wx = 42 - walkPct * (42 - LINE_START_X - 6);
    }

    const isWalking = (cycle >= HANG_T + IDLE_T && cycle < HANG_T + IDLE_T + WALK_TO_BASKET_T) ||
      (cycle >= HANG_T + IDLE_T + WALK_TO_BASKET_T + PICK_UP_T);
    const isBending = cycle >= HANG_T + IDLE_T + WALK_TO_BASKET_T &&
      cycle < HANG_T + IDLE_T + WALK_TO_BASKET_T + PICK_UP_T;

    const walkBob = isWalking ? Math.sin(time * 8) * 1 : 0;
    const bend = isBending ? 4 : 0;

    // Dress / skirt
    g.moveTo(wx - 4, wy - 6)
      .lineTo(wx + 5, wy - 6)
      .lineTo(wx + 7, wy + 2)
      .lineTo(wx - 6, wy + 2)
      .closePath()
      .fill({ color: COL_DRESS });
    g.moveTo(wx - 4, wy - 6)
      .lineTo(wx + 5, wy - 6)
      .lineTo(wx + 7, wy + 2)
      .lineTo(wx - 6, wy + 2)
      .closePath()
      .stroke({ color: COL_DRESS_DK, width: 0.3 });

    // Boots peeking under dress
    g.rect(wx - 4, wy + 1, 3, 2).fill({ color: COL_BOOTS });
    g.rect(wx + 2, wy + 1, 3, 2).fill({ color: COL_BOOTS });

    // Body/torso
    g.rect(wx - 4, wy - 18 + walkBob + bend, 9, 12).fill({ color: COL_DRESS });
    // Apron
    g.rect(wx - 3, wy - 14 + walkBob + bend, 7, 8).fill({ color: COL_APRON });
    g.rect(wx - 3, wy - 14 + walkBob + bend, 7, 8).stroke({ color: COL_APRON_DK, width: 0.3 });
    // Apron strings
    g.moveTo(wx - 3, wy - 12 + walkBob + bend)
      .lineTo(wx - 5, wy - 10 + walkBob + bend)
      .stroke({ color: COL_APRON_DK, width: 0.5 });
    g.moveTo(wx + 4, wy - 12 + walkBob + bend)
      .lineTo(wx + 6, wy - 10 + walkBob + bend)
      .stroke({ color: COL_APRON_DK, width: 0.5 });

    // Arms
    if (armUp) {
      const reachCycle = Math.sin(time * 3) * 0.5 + 0.5;
      // Right arm reaching up
      g.moveTo(wx + 5, wy - 16 + walkBob)
        .lineTo(wx + 6, wy - 22 - reachCycle * 4)
        .stroke({ color: COL_DRESS, width: 2.5 });
      g.circle(wx + 6, wy - 23 - reachCycle * 4, 1.2).fill({ color: COL_SKIN });
      // Left arm holding cloth
      g.moveTo(wx - 4, wy - 16 + walkBob)
        .lineTo(wx - 5, wy - 20)
        .stroke({ color: COL_DRESS, width: 2.5 });
      g.circle(wx - 5, wy - 20.5, 1.2).fill({ color: COL_SKIN });
    } else if (isBending) {
      // Arms reaching down
      g.rect(wx - 6, wy - 12 + bend, 2.5, 8).fill({ color: COL_DRESS });
      g.rect(wx + 5, wy - 12 + bend, 2.5, 8).fill({ color: COL_DRESS });
      g.circle(wx - 5, wy - 4 + bend, 1.2).fill({ color: COL_SKIN });
      g.circle(wx + 6, wy - 4 + bend, 1.2).fill({ color: COL_SKIN });
    } else {
      // Hands on hips / relaxed
      const hipSway = Math.sin(time * 1.5) * 0.5;
      g.rect(wx - 6, wy - 16 + walkBob, 2.5, 8).fill({ color: COL_DRESS });
      g.rect(wx + 5, wy - 16 + walkBob + hipSway, 2.5, 8).fill({ color: COL_DRESS });
      g.circle(wx - 5, wy - 8 + walkBob, 1.2).fill({ color: COL_SKIN_DK });
      g.circle(wx + 6, wy - 8 + walkBob + hipSway, 1.2).fill({ color: COL_SKIN_DK });
    }

    // Head
    g.circle(wx, wy - 22 + walkBob + bend, 4.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(wx - 1.5, wy - 22.5 + walkBob + bend, 0.5).fill({ color: 0x222222 });
    g.circle(wx + 1.5, wy - 22.5 + walkBob + bend, 0.5).fill({ color: 0x222222 });
    // Smile
    g.arc(wx, wy - 20.5 + walkBob + bend, 1.2, 0.2, Math.PI - 0.2)
      .stroke({ color: COL_SKIN_DK, width: 0.4 });
    // Hair (bun)
    g.arc(wx, wy - 22 + walkBob + bend, 5, Math.PI + 0.2, -0.2)
      .stroke({ color: COL_HAIR_W, width: 1.8 });
    // Hair bun on top
    g.circle(wx, wy - 27 + walkBob + bend, 2.5).fill({ color: COL_HAIR_W });
    g.circle(wx, wy - 27 + walkBob + bend, 2.5).stroke({ color: 0x6a3820, width: 0.3 });

    // Headscarf
    g.moveTo(wx - 4, wy - 24 + walkBob + bend)
      .lineTo(wx + 4, wy - 24 + walkBob + bend)
      .lineTo(wx + 3, wy - 22 + walkBob + bend)
      .lineTo(wx - 3, wy - 22 + walkBob + bend)
      .closePath()
      .fill({ color: COL_APRON });
  }

  // =========================================================================
  // Child playing near door
  // =========================================================================

  private _updateChild(time: number): void {
    const g = this._child;
    g.clear();

    const cx = 26;
    const cy = GROUND_Y;
    const bounce = Math.abs(Math.sin(time * CHILD_BOUNCE)) * 2;
    const armWave = Math.sin(time * CHILD_BOUNCE * 2) * 3;

    // Ball (bouncing)
    const ballX = cx + 8;
    const ballBounce = Math.abs(Math.sin(time * CHILD_BOUNCE + 1)) * 6;
    g.circle(ballX, cy - 2 - ballBounce, 2).fill({ color: 0xdd4444 });
    g.circle(ballX - 0.5, cy - 3 - ballBounce, 0.5).fill({ color: 0xff8888 });

    // Legs
    g.rect(cx - 2, cy - 2, 2, 4).fill({ color: COL_CHILD_PANTS });
    g.rect(cx + 1, cy - 2, 2, 4).fill({ color: COL_CHILD_PANTS });
    // Boots
    g.rect(cx - 2, cy + 1, 3, 1.5).fill({ color: COL_BOOTS });
    g.rect(cx + 1, cy + 1, 3, 1.5).fill({ color: COL_BOOTS });

    // Body
    g.rect(cx - 3, cy - 12 + bounce, 7, 10).fill({ color: COL_CHILD_SHIRT });
    g.rect(cx - 3, cy - 8 + bounce, 7, 2).fill({ color: 0x559966 });

    // Arms
    g.rect(cx - 5, cy - 12 + bounce + armWave, 2, 6).fill({ color: COL_CHILD_SHIRT });
    g.rect(cx + 4, cy - 12 + bounce - armWave, 2, 6).fill({ color: COL_CHILD_SHIRT });
    // Hands
    g.circle(cx - 4, cy - 6 + bounce + armWave, 1).fill({ color: COL_SKIN });
    g.circle(cx + 5, cy - 6 + bounce - armWave, 1).fill({ color: COL_SKIN });

    // Head
    g.circle(cx, cy - 16 + bounce, 4).fill({ color: COL_SKIN });
    // Eyes (big, childlike)
    g.circle(cx - 1.5, cy - 16.5 + bounce, 0.6).fill({ color: 0x222222 });
    g.circle(cx + 1.5, cy - 16.5 + bounce, 0.6).fill({ color: 0x222222 });
    // Happy mouth
    g.arc(cx, cy - 14.5 + bounce, 1.5, 0, Math.PI)
      .stroke({ color: COL_SKIN_DK, width: 0.4 });
    // Hair (messy, child)
    g.arc(cx, cy - 16 + bounce, 4.5, Math.PI + 0.3, -0.3)
      .stroke({ color: COL_CHILD_HAIR, width: 1.5 });
    // Cowlick
    g.moveTo(cx + 1, cy - 20 + bounce)
      .lineTo(cx + 3, cy - 22 + bounce)
      .stroke({ color: COL_CHILD_HAIR, width: 0.8 });
  }

  // =========================================================================
  // Effects — smoke, window glow
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // Chimney smoke
    const chimX = WALL_R - 12.5;
    const chimTop = ROOF_PEAK_Y - 3;

    for (let i = 0; i < 3; i++) {
      const phase = (time * SMOKE_SPEED + i * 1.1) % 3.5;
      if (phase > 2.0) continue;
      const rise = phase * 7;
      const drift = Math.sin(time * 0.7 + i * 2.5) * 3;
      const size = 2 + phase * 1.2;
      const alpha = 0.25 * (1 - phase / 2.0);
      g.circle(chimX + drift, chimTop - rise, size)
        .fill({ color: 0xaaaaaa, alpha });
    }

    // Window glow
    const winX = WALL_L + 30;
    const winY = ROOF_BASE_Y + 12;
    const glowPulse = 0.2 + Math.sin(time * 1.3) * 0.06;
    g.rect(winX + 1, winY + 1, 8, 10).fill({ color: COL_GLOW, alpha: glowPulse });
    g.circle(winX + 5, winY + 5, 7).fill({ color: COL_GLOW, alpha: glowPulse * 0.12 });
  }
}
