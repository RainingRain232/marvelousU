// Procedural house renderer — Variant 1: "Peasant's Cottage"
//
// 1×1 footprint (64×64 tile), visual extends to ~1×2 for animation.
// Draws a cozy medieval stone cottage with:
//   • Stone walls with mortar lines (castle palette)
//   • Thatched roof with chimney and smoke
//   • Arched wooden door with iron hardware
//   • Small window with warm interior glow and flower box
//   • Wooden bench outside the door
//   • Peasant animation: opens door, walks out, sits on bench, goes back in
//   • Small details: moss, wildflowers, stepping stones
//
// All drawing uses PixiJS Graphics. Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const MW = 1 * TS; // 64px wide

// Palette (castle-inspired)
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x8b6530;
const COL_ROOF_DK = 0x5a4020;
const COL_ROOF_LT = 0xa87840;
const COL_WOOD = 0x5a3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_WINDOW = 0x1a1a2e;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_DOOR_INSIDE = 0x1a1208;
const COL_FLOWER_R = 0xdd4466;
const COL_FLOWER_Y = 0xeecc33;
const COL_FLOWER_B = 0x5588cc;

// Character
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd4a880;
const COL_SHIRT = 0x6688aa;
const COL_SHIRT_DK = 0x4a6688;
const COL_PANTS = 0x554433;
const COL_HAIR = 0x5a3a20;
const COL_BOOTS = 0x3d2510;

// Animation timing
const CYCLE = 14.0;           // full peasant cycle
const DOOR_OPEN_T = 1.0;     // time to open door
const WALK_OUT_T = 2.0;      // time to walk to bench
const SIT_T = 7.0;           // time sitting
const WALK_IN_T = 2.0;       // time walking back
const DOOR_CLOSE_T = 1.0;    // time closing door
// Total: 1 + 2 + 7 + 2 + 1 = 13, leaves 1s of idle before next cycle
const SMOKE_SPEED = 1.5;

// Layout
const GROUND_Y = 58;
const ROOF_BASE_Y = 14;
const ROOF_PEAK_Y = -8;
const WALL_L = 6;
const WALL_R = 58;
const DOOR_X = 38;
const DOOR_W = 14;
const DOOR_H = 24;
const BENCH_X = 50;
const BENCH_Y = GROUND_Y - 2;

// ---------------------------------------------------------------------------
// House1Renderer
// ---------------------------------------------------------------------------

export class House1Renderer {
  readonly container = new Container();

  private _base = new Graphics();
  private _building = new Graphics();
  private _roof = new Graphics();
  private _details = new Graphics();
  private _door = new Graphics();
  private _peasant = new Graphics();
  private _effects = new Graphics();

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawBase();
    this._drawBuilding();
    this._drawRoof();
    this._drawDetails();

    this.container.addChild(this._base);
    this.container.addChild(this._building);
    this.container.addChild(this._door);
    this.container.addChild(this._roof);
    this.container.addChild(this._details);
    this.container.addChild(this._peasant);
    this.container.addChild(this._effects);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateDoorAndPeasant(t);
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

    // Dirt path to door
    g.ellipse(DOOR_X + DOOR_W / 2, GROUND_Y + 2, 10, 3).fill({ color: 0x8a7a60 });

    // Stepping stones
    g.ellipse(DOOR_X + DOOR_W / 2 - 2, GROUND_Y + 6, 3, 1.5).fill({ color: COL_STONE_DK });
    g.ellipse(DOOR_X + DOOR_W / 2 + 4, GROUND_Y + 9, 2.5, 1.2).fill({ color: COL_STONE });

    // Wildflowers near base
    const flowers = [
      { x: 4, y: GROUND_Y - 2, col: COL_FLOWER_R },
      { x: 9, y: GROUND_Y - 4, col: COL_FLOWER_Y },
      { x: 60, y: GROUND_Y - 1, col: COL_FLOWER_B },
      { x: 56, y: GROUND_Y - 3, col: COL_FLOWER_Y },
    ];
    for (const f of flowers) {
      g.moveTo(f.x, f.y + 3).lineTo(f.x, f.y).stroke({ color: 0x448833, width: 0.5 });
      g.circle(f.x, f.y, 1.2).fill({ color: f.col });
      g.circle(f.x, f.y, 0.5).fill({ color: 0xffffcc });
    }

    // Wooden bench
    // Legs
    g.rect(BENCH_X, BENCH_Y, 1.5, 8).fill({ color: COL_WOOD_DK });
    g.rect(BENCH_X + 10, BENCH_Y, 1.5, 8).fill({ color: COL_WOOD_DK });
    // Seat
    g.rect(BENCH_X - 1, BENCH_Y - 1, 14, 2).fill({ color: COL_WOOD });
    g.rect(BENCH_X - 1, BENCH_Y - 1, 14, 2).stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Back rest
    g.rect(BENCH_X + 10, BENCH_Y - 10, 1.5, 10).fill({ color: COL_WOOD });
    g.rect(BENCH_X - 1, BENCH_Y - 10, 1.5, 10).fill({ color: COL_WOOD });
    g.rect(BENCH_X - 1, BENCH_Y - 10, 14, 1.5).fill({ color: COL_WOOD });
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

    // Left highlight
    g.rect(WALL_L, ROOF_BASE_Y + 2, 3, GROUND_Y - ROOF_BASE_Y - 4)
      .fill({ color: COL_STONE_LT, alpha: 0.25 });

    // Right shadow
    g.rect(WALL_R - 3, ROOF_BASE_Y + 2, 3, GROUND_Y - ROOF_BASE_Y - 4)
      .fill({ color: COL_STONE_DK, alpha: 0.25 });

    // Brick mortar pattern
    for (let row = 0; row < 5; row++) {
      const yy = ROOF_BASE_Y + 4 + row * 8;
      g.moveTo(WALL_L + 2, yy)
        .lineTo(WALL_R - 2, yy)
        .stroke({ color: COL_MORTAR, width: 0.4 });
      const xOff = row % 2 === 0 ? 0 : 7;
      for (let x = WALL_L + 4 + xOff; x < WALL_R - 4; x += 14) {
        g.moveTo(x, yy)
          .lineTo(x, yy + 8)
          .stroke({ color: COL_MORTAR, width: 0.3 });
      }
    }

    // Stone variation
    g.rect(WALL_L + 8, ROOF_BASE_Y + 6, 5, 4).fill({ color: COL_STONE_LT, alpha: 0.15 });
    g.rect(WALL_L + 22, ROOF_BASE_Y + 18, 6, 3).fill({ color: COL_STONE_DK, alpha: 0.15 });
    g.rect(WALL_L + 14, ROOF_BASE_Y + 30, 4, 5).fill({ color: COL_STONE_LT, alpha: 0.12 });

    // Window (left side)
    const winX = WALL_L + 6;
    const winY = ROOF_BASE_Y + 14;
    const winW = 10;
    const winH = 12;

    // Window recess
    g.rect(winX, winY, winW, winH).fill({ color: COL_WINDOW });
    // Arch top
    g.arc(winX + winW / 2, winY, winW / 2, Math.PI, 0).fill({ color: COL_WINDOW });
    // Frame
    g.rect(winX, winY, winW, winH).stroke({ color: COL_STONE_DK, width: 0.6 });
    // Mullion cross
    g.moveTo(winX + winW / 2, winY - 2)
      .lineTo(winX + winW / 2, winY + winH)
      .stroke({ color: COL_WOOD_DK, width: 0.6 });
    g.moveTo(winX, winY + winH / 2)
      .lineTo(winX + winW, winY + winH / 2)
      .stroke({ color: COL_WOOD_DK, width: 0.6 });
    // Shutters (open)
    g.rect(winX - 3, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(winX + winW, winY, 3, winH)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });

    // Flower box under window
    g.rect(winX - 2, winY + winH + 1, winW + 4, 3)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    // Little flowers in box
    for (let i = 0; i < 4; i++) {
      const fx = winX + 1 + i * 3;
      const fy = winY + winH;
      g.moveTo(fx, fy + 1).lineTo(fx, fy - 1).stroke({ color: 0x448833, width: 0.4 });
      g.circle(fx, fy - 2, 1).fill({ color: i % 2 === 0 ? COL_FLOWER_R : COL_FLOWER_Y });
    }

    // Moss on lower stones
    for (let i = 0; i < 4; i++) {
      const mx = WALL_L + 2 + i * 5;
      const my = GROUND_Y - 2;
      g.rect(mx, my, 3, 2).fill({ color: COL_MOSS, alpha: 0.4 });
    }
  }

  // =========================================================================
  // Thatched roof
  // =========================================================================

  private _drawRoof(): void {
    const g = this._roof;

    const overhang = 5;

    // Main roof triangle
    g.moveTo(WALL_L - overhang, ROOF_BASE_Y)
      .lineTo(MW / 2, ROOF_PEAK_Y)
      .lineTo(WALL_R + overhang, ROOF_BASE_Y)
      .closePath()
      .fill({ color: COL_ROOF });

    // Right highlight
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

    // Roof outline
    g.moveTo(WALL_L - overhang, ROOF_BASE_Y)
      .lineTo(MW / 2, ROOF_PEAK_Y)
      .lineTo(WALL_R + overhang, ROOF_BASE_Y)
      .stroke({ color: COL_ROOF_DK, width: 0.8 });

    // Chimney (left side)
    const chimX = WALL_L + 10;
    const chimW = 7;
    const chimTop = ROOF_PEAK_Y - 4;
    const chimBase = ROOF_BASE_Y - 2;

    g.rect(chimX, chimTop, chimW, chimBase - chimTop)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE, width: 0.5 });
    // Chimney cap
    g.rect(chimX - 1, chimTop - 1, chimW + 2, 2)
      .fill({ color: COL_STONE });
    // Mortar lines
    g.moveTo(chimX, chimTop + 5)
      .lineTo(chimX + chimW, chimTop + 5)
      .stroke({ color: COL_MORTAR, width: 0.3 });
    g.moveTo(chimX, chimTop + 10)
      .lineTo(chimX + chimW, chimTop + 10)
      .stroke({ color: COL_MORTAR, width: 0.3 });
  }

  // =========================================================================
  // Static details (door frame area)
  // =========================================================================

  private _drawDetails(): void {
    const g = this._details;

    // Door frame (stone arch)
    const doorY = GROUND_Y - DOOR_H;

    g.rect(DOOR_X - 2, doorY - 2, DOOR_W + 4, DOOR_H + 4)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });
    // Arch
    g.arc(DOOR_X + DOOR_W / 2, doorY, DOOR_W / 2 + 1, Math.PI, 0)
      .fill({ color: COL_STONE_LT });

    // Door interior (dark when closed, visible when open)
    g.rect(DOOR_X, doorY, DOOR_W, DOOR_H).fill({ color: COL_DOOR_INSIDE });

    // Small lantern bracket next to door
    const lanX = DOOR_X - 5;
    const lanY = doorY + 4;
    g.moveTo(lanX + 3, lanY).lineTo(lanX, lanY).lineTo(lanX, lanY + 3)
      .stroke({ color: COL_IRON, width: 0.7 });
    // Lantern body
    g.rect(lanX - 1.5, lanY + 3, 3, 4).fill({ color: COL_IRON_DK });
    g.rect(lanX - 0.5, lanY + 4, 1, 2).fill({ color: COL_GLOW, alpha: 0.6 });
  }

  // =========================================================================
  // Animated door and peasant
  // =========================================================================

  private _updateDoorAndPeasant(time: number): void {
    const g = this._door;
    g.clear();

    const pg = this._peasant;
    pg.clear();

    const cycle = time % CYCLE;

    const doorY = GROUND_Y - DOOR_H;

    // Determine animation state
    let doorOpenPct = 0;
    let peasantX = DOOR_X + DOOR_W / 2;
    let peasantVisible = false;
    let peasantSitting = false;

    if (cycle < DOOR_OPEN_T) {
      // Phase 1: Door opening
      doorOpenPct = cycle / DOOR_OPEN_T;
    } else if (cycle < DOOR_OPEN_T + WALK_OUT_T) {
      // Phase 2: Walking out to bench
      doorOpenPct = 1;
      peasantVisible = true;
      const walkPct = (cycle - DOOR_OPEN_T) / WALK_OUT_T;
      peasantX = DOOR_X + DOOR_W / 2 + walkPct * (BENCH_X + 5 - DOOR_X - DOOR_W / 2);
    } else if (cycle < DOOR_OPEN_T + WALK_OUT_T + SIT_T) {
      // Phase 3: Sitting on bench
      doorOpenPct = 1;
      peasantVisible = true;
      peasantSitting = true;
      peasantX = BENCH_X + 5;
    } else if (cycle < DOOR_OPEN_T + WALK_OUT_T + SIT_T + WALK_IN_T) {
      // Phase 4: Walking back
      doorOpenPct = 1;
      peasantVisible = true;
      const walkPct = (cycle - DOOR_OPEN_T - WALK_OUT_T - SIT_T) / WALK_IN_T;
      peasantX = BENCH_X + 5 - walkPct * (BENCH_X + 5 - DOOR_X - DOOR_W / 2);
    } else if (cycle < DOOR_OPEN_T + WALK_OUT_T + SIT_T + WALK_IN_T + DOOR_CLOSE_T) {
      // Phase 5: Door closing
      const closePct = (cycle - DOOR_OPEN_T - WALK_OUT_T - SIT_T - WALK_IN_T) / DOOR_CLOSE_T;
      doorOpenPct = 1 - closePct;
    }
    // else: idle, door closed

    // Draw door
    if (doorOpenPct > 0.01) {
      // Open door (swings inward, shown as narrowing rectangle)
      const openW = DOOR_W * (1 - doorOpenPct * 0.7);
      g.rect(DOOR_X, doorY, openW, DOOR_H)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      // Iron bands
      g.rect(DOOR_X, doorY + 5, openW, 1.2).fill({ color: COL_IRON });
      g.rect(DOOR_X, doorY + 14, openW, 1.2).fill({ color: COL_IRON });
    } else {
      // Closed door
      // Oak planks
      for (let i = 0; i < 3; i++) {
        g.rect(DOOR_X + 1 + i * 4, doorY + 1, 3.5, DOOR_H - 2)
          .fill({ color: COL_WOOD })
          .stroke({ color: COL_WOOD_DK, width: 0.3 });
      }
      // Iron bands
      g.rect(DOOR_X, doorY + 5, DOOR_W, 1.2).fill({ color: COL_IRON });
      g.rect(DOOR_X, doorY + 14, DOOR_W, 1.2).fill({ color: COL_IRON });
      // Ring pull
      g.circle(DOOR_X + DOOR_W - 4, doorY + DOOR_H / 2, 1.5)
        .stroke({ color: COL_IRON, width: 0.7 });
    }

    // Draw peasant
    if (peasantVisible) {
      const px = peasantX;
      const py = GROUND_Y;

      if (peasantSitting) {
        // Sitting pose (on bench)
        const breathe = Math.sin(time * 2) * 0.5;

        // Legs (bent, sitting)
        pg.rect(px - 3, py - 6, 3, 6).fill({ color: COL_PANTS });
        pg.rect(px + 1, py - 6, 3, 6).fill({ color: COL_PANTS });
        // Boots
        pg.rect(px - 4, py - 1, 4, 2).fill({ color: COL_BOOTS });
        pg.rect(px + 1, py - 1, 4, 2).fill({ color: COL_BOOTS });

        // Body (leaning back slightly)
        pg.rect(px - 4, py - 18 + breathe, 9, 12).fill({ color: COL_SHIRT });
        pg.rect(px - 4, py - 14 + breathe, 9, 2).fill({ color: COL_SHIRT_DK });

        // Arms (resting on lap)
        pg.rect(px - 6, py - 14 + breathe, 2.5, 8).fill({ color: COL_SHIRT });
        pg.rect(px + 5, py - 14 + breathe, 2.5, 8).fill({ color: COL_SHIRT });
        // Hands
        pg.circle(px - 5, py - 6 + breathe, 1.3).fill({ color: COL_SKIN_DK });
        pg.circle(px + 6, py - 6 + breathe, 1.3).fill({ color: COL_SKIN_DK });

        // Head
        pg.circle(px, py - 22 + breathe, 4.5).fill({ color: COL_SKIN });
        // Eyes (relaxed / half-closed)
        pg.moveTo(px - 2, py - 22.5 + breathe)
          .lineTo(px - 1, py - 22 + breathe)
          .stroke({ color: 0x222222, width: 0.5 });
        pg.moveTo(px + 1, py - 22.5 + breathe)
          .lineTo(px + 2, py - 22 + breathe)
          .stroke({ color: 0x222222, width: 0.5 });
        // Content smile
        pg.arc(px, py - 20.5 + breathe, 1.5, 0.2, Math.PI - 0.2)
          .stroke({ color: COL_SKIN_DK, width: 0.4 });
        // Hair
        pg.arc(px, py - 22 + breathe, 5, Math.PI + 0.3, -0.3)
          .stroke({ color: COL_HAIR, width: 1.5 });
        // Cap
        pg.rect(px - 5, py - 27 + breathe, 10, 2).fill({ color: COL_PANTS });
        pg.rect(px - 3, py - 30 + breathe, 6, 4).fill({ color: COL_PANTS });
      } else {
        // Walking pose
        const walkBob = Math.sin(time * 8) * 1.5;
        const legSwing = Math.sin(time * 8) * 2;

        // Legs (walking)
        pg.rect(px - 3, py - 4 - legSwing, 3, 6).fill({ color: COL_PANTS });
        pg.rect(px + 1, py - 4 + legSwing, 3, 6).fill({ color: COL_PANTS });
        // Boots
        pg.rect(px - 4, py + 1 - legSwing, 4, 2).fill({ color: COL_BOOTS });
        pg.rect(px + 1, py + 1 + legSwing, 4, 2).fill({ color: COL_BOOTS });

        // Body
        pg.rect(px - 4, py - 18 + walkBob, 9, 14).fill({ color: COL_SHIRT });
        pg.rect(px - 4, py - 12 + walkBob, 9, 2).fill({ color: COL_SHIRT_DK });

        // Arms (swinging)
        const armSwing = Math.sin(time * 8) * 3;
        pg.rect(px - 6, py - 16 + walkBob + armSwing, 2.5, 8).fill({ color: COL_SHIRT });
        pg.rect(px + 5, py - 16 + walkBob - armSwing, 2.5, 8).fill({ color: COL_SHIRT });
        // Hands
        pg.circle(px - 5, py - 8 + walkBob + armSwing, 1.3).fill({ color: COL_SKIN });
        pg.circle(px + 6, py - 8 + walkBob - armSwing, 1.3).fill({ color: COL_SKIN });

        // Head
        pg.circle(px, py - 22 + walkBob, 4.5).fill({ color: COL_SKIN });
        // Eyes
        pg.circle(px - 1.5, py - 22.5 + walkBob, 0.6).fill({ color: 0x222222 });
        pg.circle(px + 1.5, py - 22.5 + walkBob, 0.6).fill({ color: 0x222222 });
        // Hair
        pg.arc(px, py - 22 + walkBob, 5, Math.PI + 0.3, -0.3)
          .stroke({ color: COL_HAIR, width: 1.5 });
        // Cap
        pg.rect(px - 5, py - 27 + walkBob, 10, 2).fill({ color: COL_PANTS });
        pg.rect(px - 3, py - 30 + walkBob, 6, 4).fill({ color: COL_PANTS });
      }
    }
  }

  // =========================================================================
  // Effects — chimney smoke, window glow, lantern flicker
  // =========================================================================

  private _updateEffects(time: number): void {
    const g = this._effects;
    g.clear();

    // Chimney smoke puffs
    const chimX = WALL_L + 13.5;
    const chimTop = ROOF_PEAK_Y - 5;

    for (let i = 0; i < 3; i++) {
      const phase = (time * SMOKE_SPEED + i * 1.2) % 4.0;
      if (phase > 2.5) continue;
      const rise = phase * 8;
      const drift = Math.sin(time * 0.8 + i * 2) * 3;
      const size = 2 + phase * 1.5;
      const alpha = 0.3 * (1 - phase / 2.5);
      g.circle(chimX + drift, chimTop - rise, size)
        .fill({ color: 0xaaaaaa, alpha });
    }

    // Window warm glow (pulsing)
    const winX = WALL_L + 6;
    const winY = ROOF_BASE_Y + 14;
    const glowPulse = 0.2 + Math.sin(time * 1.5) * 0.08;
    g.rect(winX + 1, winY + 1, 8, 10).fill({ color: COL_GLOW, alpha: glowPulse });
    g.circle(winX + 5, winY + 5, 8).fill({ color: COL_GLOW, alpha: glowPulse * 0.15 });

    // Lantern flicker
    const lanX = DOOR_X - 5;
    const lanY = GROUND_Y - DOOR_H + 8;
    const flicker = 0.3 + Math.sin(time * 6) * 0.1 + Math.sin(time * 9.7) * 0.05;
    g.circle(lanX, lanY, 4).fill({ color: COL_GLOW, alpha: flicker * 0.12 });
  }
}
