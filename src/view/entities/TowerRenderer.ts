// Procedural tower renderer for BuildingView.
//
// Draws a detailed medieval fantasy tower with:
//   • Tapered stone body with brick patterns and buttresses
//   • Pointed conical roof with tile lines and weathervane
//   • Crenellated top below the roof
//   • Player-colored flag at the tip
//   • Hopping green frog at the base
//   • Guard that periodically walks out of a door
//   • Torch bracket with flickering glow
//   • Ivy climbing the walls
//
// All drawing uses PixiJS Graphics. The tower container is 1×TILE_SIZE wide
// and 1×TILE_SIZE tall (standard building footprint).
// Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const TW = 1 * TS; // tower width
const TH = 1 * TS; // tower height

// Palette
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_GLOW = 0x334466;
const COL_WINDOW_FRAME = 0x555555;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_FROG = 0x44aa22;
const COL_FROG_DK = 0x338818;
const COL_FROG_BELLY = 0x88cc66;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_TORCH = 0xffaa33;

// Animation timing
const FLAG_SPEED = 3.2;
const FROG_HOP_INTERVAL = 4.0;
const FROG_HOP_DURATION = 0.6;

// Guard animation states
enum GuardState {
  IDLE = "idle",
  OPENING = "opening",
  WALKING_OUT = "walking_out",
  SITTING = "sitting",
  WALKING_IN = "walking_in",
  CLOSING = "closing",
}

// ---------------------------------------------------------------------------
// TowerRenderer
// ---------------------------------------------------------------------------

export class TowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // tower body, static details
  private _flag = new Graphics(); // waving flag at the top
  private _frog = new Graphics(); // hopping frog mascot
  private _door = new Graphics(); // side door
  private _guard = new Graphics(); // animated guard
  private _torch = new Graphics(); // torch glow (animated)

  private _flagTime = 0;
  private _frogTimer = 0;
  private _frogY0 = 0;
  private _time = 0;

  private _guardState: GuardState = GuardState.IDLE;
  private _guardTimer = 0;
  private _nextGuardActionTime = 10 + Math.random() * 10;

  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    this._drawStaticTower();
    this._drawFlag();
    this._frogY0 = TH - 6;
    this._frog.position.set(TW / 2 - 4, this._frogY0);
    this._drawFrog();
    this._drawDoorGraphics();
    this._drawGuardGraphics(0, false);

    this.container.addChild(this._base);
    this.container.addChild(this._door);
    this.container.addChild(this._guard);
    this.container.addChild(this._torch);
    this.container.addChild(this._flag);
    this.container.addChild(this._frog);

    this._frogY0 = TH - 6;
    this._frog.position.set(TW / 2 - 4, this._frogY0);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // Flag
    this._flagTime += dt * FLAG_SPEED;
    this._updateFlag(this._flagTime);

    // Frog
    this._frogTimer += dt;
    if (this._frogTimer > FROG_HOP_INTERVAL) {
      const hopT = this._frogTimer - FROG_HOP_INTERVAL;
      if (hopT < FROG_HOP_DURATION) {
        const progress = hopT / FROG_HOP_DURATION;
        const hopH = 15;
        const jump = Math.sin(progress * Math.PI) * hopH;
        this._frog.y = this._frogY0 - jump;
        const scale = 1 + Math.sin(progress * Math.PI) * 0.3;
        this._frog.scale.set(1 / scale, scale);
      } else {
        this._frogTimer = 0;
        this._frog.y = this._frogY0;
        this._frog.scale.set(1);
      }
    }

    // Guard Animation State Machine
    this._updateGuard(dt);

    // Torch flicker
    this._updateTorch(this._time);
  }

  // -------------------------------------------------------------------------
  // Guard state machine
  // -------------------------------------------------------------------------

  private _updateGuard(dt: number): void {
    this._guardTimer += dt;

    switch (this._guardState) {
      case GuardState.IDLE:
        if (this._guardTimer >= this._nextGuardActionTime) {
          this._guardState = GuardState.OPENING;
          this._guardTimer = 0;
          this._door.visible = true;
          this._door.scale.set(0, 1);
          this._guard.visible = false;
        }
        break;

      case GuardState.OPENING: {
        const openP = Math.min(1, this._guardTimer / 0.5);
        this._door.scale.set(openP, 1);
        if (openP >= 1) {
          this._guardState = GuardState.WALKING_OUT;
          this._guardTimer = 0;
          this._guard.visible = true;
          this._guard.alpha = 0;
        }
        break;
      }

      case GuardState.WALKING_OUT: {
        const walkOutP = Math.min(1, this._guardTimer / 1.0);
        this._guard.alpha = Math.min(1, walkOutP * 2);
        this._guard.x = TW - 16 - walkOutP * 14;
        this._drawGuardGraphics(this._guardTimer, false);
        if (walkOutP >= 1) {
          this._guardState = GuardState.SITTING;
          this._guardTimer = 0;
          this._nextGuardActionTime = 3 + Math.random() * 4;
          this._drawGuardGraphics(0, true);
        }
        break;
      }

      case GuardState.SITTING: {
        const breathe = Math.sin(this._guardTimer * 2) * 0.5;
        this._guard.scale.set(1, 1 + breathe * 0.1);
        if (this._guardTimer >= this._nextGuardActionTime) {
          this._guardState = GuardState.WALKING_IN;
          this._guardTimer = 0;
        }
        break;
      }

      case GuardState.WALKING_IN: {
        const walkInP = Math.min(1, this._guardTimer / 1.0);
        this._guard.alpha = Math.max(0, 1 - walkInP * 2);
        this._guard.x = TW - 30 + walkInP * 14;
        this._drawGuardGraphics(this._guardTimer, false);
        if (walkInP >= 1) {
          this._guardState = GuardState.CLOSING;
          this._guardTimer = 0;
          this._guard.visible = false;
        }
        break;
      }

      case GuardState.CLOSING: {
        const closeP = Math.min(1, this._guardTimer / 0.5);
        this._door.scale.set(1 - closeP, 1);
        if (closeP >= 1) {
          this._guardState = GuardState.IDLE;
          this._guardTimer = 0;
          this._nextGuardActionTime = 10 + Math.random() * 10;
          this._door.visible = false;
        }
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Static drawing
  // -------------------------------------------------------------------------

  private _drawStaticTower(): void {
    const g = this._base;

    const bX = 12;
    const bW = TW - 24;
    const bH = TH + 20;
    const bY = TH - bH + 10;

    // ── Foundation / base stones ──
    g.rect(bX - 3, TH - 6, bW + 6, 6)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: 0x444444, width: 1 });
    // Foundation stone lines
    g.moveTo(bX - 2, TH - 3)
      .lineTo(bX + bW + 2, TH - 3)
      .stroke({ color: 0x444444, width: 0.4, alpha: 0.5 });

    // ── Buttresses (left and right) ──
    // Left buttress
    g.moveTo(bX, TH - 6)
      .lineTo(bX - 5, TH - 6)
      .lineTo(bX, bY + bH * 0.5)
      .closePath()
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Right buttress
    g.moveTo(bX + bW, TH - 6)
      .lineTo(bX + bW + 5, TH - 6)
      .lineTo(bX + bW, bY + bH * 0.5)
      .closePath()
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });

    // ── Tower Body ──
    g.rect(bX, bY, bW, bH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1.5 });

    // Left wall shadow
    g.rect(bX + 1, bY + 1, 4, bH - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
    });

    // Brick pattern
    this._drawBrickPattern(g, bX + 2, bY + 2, bW - 4, bH - 4);

    // ── Horizontal stone band (decorative) ──
    g.rect(bX - 1, bY + 30, bW + 2, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.rect(bX - 1, bY + 60, bW + 2, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.5 });

    // ── Crenellations ──
    this._drawCrenellations(g, bX - 2, bY, bW + 4);

    // ── Roof ──
    const rH = 35;
    const rY = bY - rH + 4;
    // Roof body
    g.moveTo(bX - 6, bY + 4)
      .lineTo(TW / 2, rY)
      .lineTo(bX + bW + 6, bY + 4)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });

    // Roof highlight (right slope lighter)
    g.moveTo(TW / 2, rY)
      .lineTo(bX + bW + 6, bY + 4)
      .lineTo(TW / 2 + 1, rY + 1)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.3 });

    // Roof tile lines
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = rY + frac * (rH - 4);
      const halfW = (bW / 2 + 6) * frac;
      g.moveTo(TW / 2 - halfW, ly)
        .lineTo(TW / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // ── Weathervane at top ──
    g.moveTo(TW / 2, rY)
      .lineTo(TW / 2, rY - 8)
      .stroke({ color: 0x888888, width: 1 });
    // Crossbar
    g.moveTo(TW / 2 - 4, rY - 6)
      .lineTo(TW / 2 + 4, rY - 6)
      .stroke({ color: 0x888888, width: 0.8 });
    // Arrow
    g.moveTo(TW / 2 + 4, rY - 6)
      .lineTo(TW / 2 + 6, rY - 7)
      .lineTo(TW / 2 + 4, rY - 5)
      .closePath()
      .fill({ color: 0x888888 });
    // Finial ball
    g.circle(TW / 2, rY - 8, 1.5).fill({ color: 0xccaa44 });

    // ── Main Window (arched) ──
    this._drawWindow(g, TW / 2 - 8, bY + 22, 16, 20);

    // ── Small arrow-slit windows ──
    this._drawArrowSlit(g, bX + 5, bY + 55);
    this._drawArrowSlit(g, bX + bW - 9, bY + 55);

    // ── Lower windows (small square) ──
    this._drawSmallWindow(g, bX + 6, bY + 72);
    this._drawSmallWindow(g, bX + bW - 12, bY + 72);

    // ── Torch bracket (left side) ──
    const torchX = bX - 2;
    const torchY = bY + 45;
    // Bracket arm
    g.moveTo(torchX, torchY)
      .lineTo(torchX - 6, torchY - 2)
      .stroke({ color: 0x444444, width: 1.5 });
    g.moveTo(torchX, torchY + 3)
      .lineTo(torchX - 4, torchY - 1)
      .stroke({ color: 0x444444, width: 1 });
    // Torch body
    g.rect(torchX - 8, torchY - 6, 4, 8).fill({ color: COL_WOOD });
    g.rect(torchX - 8, torchY - 6, 4, 2).fill({ color: COL_WOOD_DK });
    // Store torch position for animated glow
    this._torch.position.set(torchX - 6, torchY - 8);

    // ── Ivy / climbing vines ──
    this._drawIvy(g, bX + bW - 3, bY + 35, 18);
    this._drawIvy(g, bX + 1, TH - 18, 12);

    // ── Moss at base ──
    this._drawMoss(g, bX + 4, TH - 6, 10);
    this._drawMoss(g, bX + bW - 10, TH - 7, 8);
    this._drawMoss(g, bX + bW / 2 - 3, TH - 5, 6);

    // ── Door frame (static arch, door itself is separate) ──
    const doorFrameX = TW - 18;
    const doorFrameY = TH - 24;
    g.rect(doorFrameX - 2, doorFrameY - 2, 18, 26).fill({
      color: COL_STONE_DK,
    });
    // Arch over door
    g.moveTo(doorFrameX - 2, doorFrameY)
      .bezierCurveTo(
        doorFrameX - 2,
        doorFrameY - 10,
        doorFrameX + 16,
        doorFrameY - 10,
        doorFrameX + 16,
        doorFrameY,
      )
      .fill({ color: COL_STONE_DK });
    // Keystone
    g.rect(doorFrameX + 5, doorFrameY - 9, 4, 5).fill({
      color: COL_STONE_LT,
    });
  }

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 12;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });

      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
      }
    }

    // Occasional individual stone highlight/shadow for texture
    const stones = [
      [4, 10],
      [20, 30],
      [8, 50],
      [24, 68],
      [12, 78],
    ];
    for (const [sx, sy] of stones) {
      if (sx < w && sy < h) {
        g.rect(x + sx, y + sy, 8, 6).fill({
          color: COL_STONE_LT,
          alpha: 0.15,
        });
      }
    }
    const darkStones = [
      [16, 20],
      [6, 40],
      [22, 58],
      [10, 70],
    ];
    for (const [sx, sy] of darkStones) {
      if (sx < w && sy < h) {
        g.rect(x + sx, y + sy, 8, 6).fill({
          color: COL_STONE_DK,
          alpha: 0.1,
        });
      }
    }
  }

  private _drawCrenellations(
    g: Graphics,
    x: number,
    y: number,
    w: number,
  ): void {
    const merlonW = 6;
    const merlonH = 6;
    const gap = 4;
    const step = merlonW + gap;
    for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Cap stone on top of each merlon
      g.rect(mx - 0.5, y - merlonH - 1.5, merlonW + 1, 2).fill({
        color: COL_STONE_DK,
      });
    }
  }

  private _drawWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Deep recess
    g.rect(x - 3, y - 3, w + 6, h + 6).fill({ color: COL_STONE_DK });
    // Frame
    g.rect(x - 1, y - 1, w + 2, h + 2).fill({ color: COL_WINDOW_FRAME });
    // Window glass
    g.rect(x, y, w, h).fill({ color: COL_WINDOW });
    // Arched top
    g.moveTo(x, y + 2)
      .bezierCurveTo(x, y - 6, x + w, y - 6, x + w, y + 2)
      .fill({ color: COL_WINDOW_FRAME });
    g.moveTo(x + 1, y + 2)
      .bezierCurveTo(x + 1, y - 5, x + w - 1, y - 5, x + w - 1, y + 2)
      .fill({ color: COL_WINDOW });

    // Glass pane divisions (cross)
    g.moveTo(x + w / 2, y)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });
    g.moveTo(x, y + h / 2)
      .lineTo(x + w, y + h / 2)
      .stroke({ color: COL_WINDOW_FRAME, width: 1 });

    // Warm glow in panes
    g.rect(x + 1, y + 1, w / 2 - 1, h / 2 - 1).fill({
      color: COL_WINDOW_GLOW,
      alpha: 0.3,
    });
    g.rect(x + w / 2 + 1, y + h / 2 + 1, w / 2 - 2, h / 2 - 2).fill({
      color: COL_WINDOW_GLOW,
      alpha: 0.2,
    });

    // Sill
    g.rect(x - 4, y + h, w + 8, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
  }

  private _drawSmallWindow(g: Graphics, x: number, y: number): void {
    g.rect(x - 1, y - 1, 8, 14).fill({ color: COL_STONE_DK });
    g.rect(x, y, 6, 12)
      .fill({ color: COL_WINDOW })
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    // Cross divider
    g.moveTo(x + 3, y)
      .lineTo(x + 3, y + 12)
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    g.moveTo(x, y + 6)
      .lineTo(x + 6, y + 6)
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    // Sill
    g.rect(x - 1, y + 12, 8, 2).fill({ color: COL_STONE_LT });
  }

  private _drawArrowSlit(g: Graphics, x: number, y: number): void {
    // Vertical slit
    g.rect(x + 1, y, 2, 10).fill({ color: 0x111111 });
    // Horizontal cross
    g.rect(x - 1, y + 4, 6, 2).fill({ color: 0x111111 });
    // Stone frame
    g.rect(x, y - 1, 4, 12).stroke({ color: COL_STONE_DK, width: 0.5 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    // Main vine stem
    for (let iy = 0; iy < h; iy += 3) {
      const wobble = Math.sin(iy * 0.8) * 2;
      g.circle(x + wobble, y + iy, 1.2).fill({ color: COL_IVY });
    }
    // Leaves branching off
    for (let iy = 2; iy < h; iy += 5) {
      const wobble = Math.sin(iy * 0.8) * 2;
      const dir = iy % 10 < 5 ? -1 : 1;
      g.circle(x + wobble + dir * 3, y + iy, 2).fill({
        color: COL_IVY_LT,
        alpha: 0.8,
      });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.5).fill({
        color: COL_IVY,
        alpha: 0.7,
      });
    }
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2.5).fill({
      color: COL_MOSS,
      alpha: 0.5,
    });
    // Small moss patches
    g.circle(x + 2, y - 1, 1.5).fill({ color: COL_MOSS, alpha: 0.3 });
    g.circle(x + w - 2, y - 0.5, 1).fill({ color: COL_MOSS, alpha: 0.4 });
  }

  // -------------------------------------------------------------------------
  // Animated elements
  // -------------------------------------------------------------------------

  private _drawFlag(): void {
    const bY = TH - (TH + 20) + 10;
    const rH = 35;
    this._flag.position.set(TW / 2, bY - rH + 4);
  }

  private _updateFlag(time: number): void {
    const g = this._flag;
    g.clear();

    // Pole (positioned above weathervane)
    g.moveTo(0, -8).lineTo(0, -22).stroke({ color: 0x999999, width: 1.5 });
    // Pole cap
    g.circle(0, -22, 1.2).fill({ color: 0xccaa44 });

    // Waving flag with cloth-like curve
    const w1 = Math.sin(time) * 2;
    const w2 = Math.sin(time * 1.4 + 0.8) * 3;
    const w3 = Math.sin(time * 0.8 + 1.5) * 2;
    const fW = 14;

    g.moveTo(0, -22)
      .bezierCurveTo(
        fW * 0.3,
        -22 + w1,
        fW * 0.7,
        -22 + w2,
        fW,
        -22 + w3,
      )
      .lineTo(fW, -12 + w3)
      .bezierCurveTo(
        fW * 0.7,
        -12 + w2,
        fW * 0.3,
        -12 + w1,
        0,
        -12,
      )
      .closePath()
      .fill({ color: this._playerColor });

    // Flag emblem (small shield/crest shape)
    const eX = 7;
    const eY = -17 + (w1 + w2) / 2;
    g.moveTo(eX - 2, eY - 2)
      .lineTo(eX + 2, eY - 2)
      .lineTo(eX + 2, eY + 1)
      .lineTo(eX, eY + 3)
      .lineTo(eX - 2, eY + 1)
      .closePath()
      .fill({ color: 0xffffff, alpha: 0.5 });
  }

  private _updateTorch(time: number): void {
    const g = this._torch;
    g.clear();

    // Flickering flame
    const flicker1 = Math.sin(time * 8) * 1.5;
    const flicker2 = Math.sin(time * 12 + 1) * 1;
    const flicker3 = Math.sin(time * 6 + 2) * 0.5;

    // Outer glow
    g.circle(0, -2 + flicker3, 6).fill({ color: COL_TORCH, alpha: 0.1 });
    g.circle(0, -1, 4).fill({ color: COL_TORCH, alpha: 0.08 });

    // Flame core
    g.moveTo(-2, 0)
      .bezierCurveTo(
        -2 + flicker1,
        -4,
        1 + flicker2,
        -6,
        0,
        -8 + flicker1,
      )
      .bezierCurveTo(
        1 + flicker2,
        -6,
        2 + flicker1,
        -4,
        2,
        0,
      )
      .closePath()
      .fill({ color: COL_TORCH, alpha: 0.8 });

    // Inner bright core
    g.moveTo(-1, 0)
      .bezierCurveTo(
        -0.5 + flicker2 * 0.5,
        -2,
        0.5 + flicker1 * 0.3,
        -3,
        0,
        -5 + flicker2,
      )
      .bezierCurveTo(
        0.5 + flicker1 * 0.3,
        -3,
        1 + flicker2 * 0.5,
        -2,
        1,
        0,
      )
      .closePath()
      .fill({ color: 0xffdd66, alpha: 0.9 });

    // Hot white tip
    g.circle(0 + flicker2 * 0.3, -3 + flicker1 * 0.3, 1).fill({
      color: 0xffffcc,
      alpha: 0.7,
    });
  }

  private _drawFrog(): void {
    const g = this._frog;
    g.clear();

    // Shadow
    g.ellipse(0, 4, 5, 1.5).fill({ color: 0x000000, alpha: 0.15 });

    // Back legs (behind body)
    g.moveTo(-4, 1)
      .bezierCurveTo(-7, 2, -7, 5, -5, 5)
      .stroke({ color: COL_FROG_DK, width: 2.5 });
    g.moveTo(4, 1)
      .bezierCurveTo(7, 2, 7, 5, 5, 5)
      .stroke({ color: COL_FROG_DK, width: 2.5 });
    // Feet (webbed)
    g.moveTo(-6, 5)
      .lineTo(-8, 5.5)
      .stroke({ color: COL_FROG_DK, width: 1 });
    g.moveTo(-5, 5)
      .lineTo(-6, 6)
      .stroke({ color: COL_FROG_DK, width: 1 });
    g.moveTo(6, 5)
      .lineTo(8, 5.5)
      .stroke({ color: COL_FROG_DK, width: 1 });
    g.moveTo(5, 5)
      .lineTo(6, 6)
      .stroke({ color: COL_FROG_DK, width: 1 });

    // Body
    g.ellipse(0, 0, 5, 3.5).fill({ color: COL_FROG });
    // Belly stripe
    g.ellipse(0, 1, 3, 2).fill({ color: COL_FROG_BELLY, alpha: 0.5 });
    // Spots on back
    g.circle(-2, -1, 1).fill({ color: COL_FROG_DK, alpha: 0.3 });
    g.circle(1.5, -0.5, 0.8).fill({ color: COL_FROG_DK, alpha: 0.3 });
    g.circle(0, -1.5, 0.6).fill({ color: COL_FROG_DK, alpha: 0.25 });

    // Front legs
    g.moveTo(-3, 2)
      .lineTo(-4, 3.5)
      .stroke({ color: COL_FROG, width: 1.5 });
    g.moveTo(3, 2)
      .lineTo(4, 3.5)
      .stroke({ color: COL_FROG, width: 1.5 });

    // Eyes (protruding)
    // Left eye
    g.circle(-2.5, -3, 2).fill({ color: COL_FROG });
    g.circle(-2.5, -3.2, 1.8).fill({ color: 0xeeeedd });
    g.circle(-2.5, -3.5, 0.8).fill({ color: 0x000000 });
    g.circle(-2.2, -3.8, 0.3).fill({ color: 0xffffff }); // eye glint
    // Right eye
    g.circle(2.5, -3, 2).fill({ color: COL_FROG });
    g.circle(2.5, -3.2, 1.8).fill({ color: 0xeeeedd });
    g.circle(2.5, -3.5, 0.8).fill({ color: 0x000000 });
    g.circle(2.8, -3.8, 0.3).fill({ color: 0xffffff }); // eye glint

    // Mouth line
    g.moveTo(-3, 0.5)
      .bezierCurveTo(-1, 1.5, 1, 1.5, 3, 0.5)
      .stroke({ color: COL_FROG_DK, width: 0.5 });
    // Nostrils
    g.circle(-1, -1.5, 0.3).fill({ color: COL_FROG_DK });
    g.circle(1, -1.5, 0.3).fill({ color: COL_FROG_DK });

    g.pivot.set(0, 4);
  }

  private _drawDoorGraphics(): void {
    const dg = this._door;
    dg.clear();

    // Door body
    dg.rect(0, 0, 14, 22)
      .fill({ color: 0x4d3319 })
      .stroke({ color: 0x2d1f0f, width: 2 });
    // Plank lines
    dg.moveTo(5, 0)
      .lineTo(5, 22)
      .stroke({ color: 0x3d2510, width: 0.5 });
    dg.moveTo(10, 0)
      .lineTo(10, 22)
      .stroke({ color: 0x3d2510, width: 0.5 });
    // Iron bands
    dg.rect(0, 4, 14, 2.5)
      .fill({ color: 0x333333, alpha: 0.6 })
      .stroke({ color: 0x222222, width: 0.3 });
    dg.rect(0, 16, 14, 2.5)
      .fill({ color: 0x333333, alpha: 0.6 })
      .stroke({ color: 0x222222, width: 0.3 });
    // Iron studs
    for (const [sx, sy] of [
      [2, 5],
      [7, 5],
      [12, 5],
      [2, 17],
      [7, 17],
      [12, 17],
    ] as [number, number][]) {
      dg.circle(sx, sy, 0.8).fill({ color: 0x555555 });
    }
    // Door handle (ring)
    dg.circle(3, 11, 2)
      .stroke({ color: 0xaaaaaa, width: 1.2 });
    dg.circle(3, 11, 0.5).fill({ color: 0xaaaaaa }); // mounting point
    // Arched top
    dg.moveTo(0, 0)
      .lineTo(7, -6)
      .lineTo(14, 0)
      .closePath()
      .fill({ color: 0x4d3319 });
    dg.moveTo(0, 0)
      .lineTo(7, -6)
      .lineTo(14, 0)
      .stroke({ color: 0x2d1f0f, width: 1.5 });
    // Plank lines in arch
    dg.moveTo(5, -2)
      .lineTo(6, -5)
      .stroke({ color: 0x3d2510, width: 0.5 });
    dg.moveTo(10, -2)
      .lineTo(8, -5)
      .stroke({ color: 0x3d2510, width: 0.5 });

    dg.position.set(TW - 16, TH - 20);
    dg.visible = false;
  }

  private _drawGuardGraphics(walkTime: number, isSitting: boolean): void {
    const COL_ARMOR = 0xa9a9a9;
    const COL_METAL = 0xd3d3d3;
    const COL_SKIN = 0xffdbac;

    const gg = this._guard;
    gg.clear();

    const bob = walkTime > 0 ? Math.abs(Math.sin(walkTime * 10)) * 2 : 0;
    const legSwing = walkTime > 0 ? Math.sin(walkTime * 10) * 3 : 0;

    // Shadow
    gg.ellipse(0, 2, 6, 1.5).fill({ color: 0x000000, alpha: 0.15 });

    // Legs
    if (!isSitting) {
      gg.rect(-4 + legSwing, -2 - bob, 3, 4).fill({ color: 0x333333 });
      gg.rect(1 - legSwing, -2 - bob, 3, 4).fill({ color: 0x333333 });
      // Boots
      gg.rect(-5 + legSwing, 1 - bob, 4, 2).fill({ color: 0x2a1a0a });
      gg.rect(0 - legSwing, 1 - bob, 4, 2).fill({ color: 0x2a1a0a });
    } else {
      gg.rect(-5, -2, 5, 3).fill({ color: 0x333333 });
      gg.rect(0, -2, 5, 3).fill({ color: 0x333333 });
      gg.rect(-6, 0, 5, 2).fill({ color: 0x2a1a0a });
      gg.rect(0, 0, 5, 2).fill({ color: 0x2a1a0a });
    }

    // Body (tunic + armor)
    gg.rect(-5, -10 - bob, 10, 10).fill({ color: this._playerColor });
    // Chainmail
    gg.rect(-4, -9 - bob, 8, 8).fill({ color: COL_ARMOR });
    // Armor highlight
    gg.rect(-2, -8 - bob, 2, 4).fill({ color: COL_METAL, alpha: 0.4 });
    // Belt
    gg.rect(-5, -3 - bob, 10, 2).fill({ color: 0x664422 });
    gg.circle(0, -2 - bob, 1).fill({ color: 0xccaa44 }); // buckle

    // Arms
    if (!isSitting) {
      const armSwing = Math.sin(walkTime * 10 + Math.PI) * 2;
      gg.rect(-7, -8 - bob + armSwing, 3, 6).fill({ color: COL_ARMOR });
      gg.rect(4, -8 - bob - armSwing, 3, 6).fill({ color: COL_ARMOR });
      // Hands
      gg.circle(-6, -2 - bob + armSwing, 1.2).fill({ color: COL_SKIN });
      gg.circle(6, -2 - bob - armSwing, 1.2).fill({ color: COL_SKIN });
    } else {
      gg.rect(-7, -8, 3, 6).fill({ color: COL_ARMOR });
      gg.rect(4, -8, 3, 6).fill({ color: COL_ARMOR });
      gg.circle(-6, -2, 1.2).fill({ color: COL_SKIN });
      gg.circle(6, -2, 1.2).fill({ color: COL_SKIN });
    }

    // Head
    gg.circle(0, -14 - bob, 4.5).fill({ color: COL_SKIN });
    // Eyes
    gg.circle(-1.5, -14.5 - bob, 0.6).fill({ color: 0x222222 });
    gg.circle(1.5, -14.5 - bob, 0.6).fill({ color: 0x222222 });
    // Mouth
    if (isSitting) {
      // Neutral
      gg.moveTo(-1.5, -12 - bob)
        .lineTo(1.5, -12 - bob)
        .stroke({ color: 0x884444, width: 0.5 });
    }

    // Helmet
    gg.moveTo(-5, -15 - bob)
      .lineTo(0, -22 - bob)
      .lineTo(5, -15 - bob)
      .closePath()
      .fill({ color: 0x777777 });
    // Helmet rim
    gg.rect(-5, -15 - bob, 10, 2.5).fill({ color: 0x666666 });
    // Nose guard
    gg.rect(-0.5, -15 - bob, 1.5, 3).fill({ color: 0x777777 });
    // Helmet crest/plume
    gg.moveTo(0, -22 - bob)
      .bezierCurveTo(3, -24 - bob, 6, -22 - bob, 4, -18 - bob)
      .stroke({ color: this._playerColor, width: 2 });

    // Spear
    gg.moveTo(6, -18 - bob)
      .lineTo(6, 4 - bob)
      .stroke({ color: 0x555555, width: 2 });
    // Spear tip
    gg.moveTo(4.5, -18 - bob)
      .lineTo(6, -25 - bob)
      .lineTo(7.5, -18 - bob)
      .closePath()
      .fill({ color: COL_METAL });
    // Spear crossguard
    gg.rect(4, -18 - bob, 4, 1.5).fill({ color: 0x555555 });

    if (this._guardState === GuardState.IDLE) {
      gg.position.set(TW - 16, TH - 8);
      gg.visible = false;
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
