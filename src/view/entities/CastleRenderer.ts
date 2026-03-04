// Procedural castle renderer for BuildingView.
//
// Draws a detailed 4×4 tile medieval fantasy castle with:
//   • Two tall stone towers (left and right)
//   • Central keep / gatehouse with portcullis
//   • Crenellated walls connecting the towers
//   • Player-colored flags on each tower (waving in the wind)
//   • Princess animation in left tower (PREP phase) — peeks out, waves handkerchief
//   • King animation in right tower (BATTLE phase) — peeks out, waves sword
//   • Stone texture, arrow slits, moss & ivy details
//   • Court Jester (PREP phase) — peeks out from gate, throws ball at guard
//   • Gargoyle statues flanking the gate top
//
// All drawing uses PixiJS Graphics. The castle container is 4×TILE_SIZE wide
// and 4×TILE_SIZE tall. Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64; // tile size
const CW = 4 * TS; // castle width 256px
const CH = 4 * TS; // castle height 256px

// Palette
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WOOD_DK = 0x3d2510;
const COL_PORTCULLIS = 0x444444;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_GLOW = 0x334466;
const COL_WINDOW_FRAME = 0x555555;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_GARGOYLE = 0x6a6a60;
const COL_GARGOYLE_DK = 0x4a4a42;

// Character palettes
const COL_SKIN = 0xf0c8a0;
const COL_HAIR = 0xf0d060;
const COL_DRESS = 0xcc4488;
const COL_DRESS_DK = 0x993366;
const COL_HANKY = 0xffffff;
const COL_KING_SKIN = 0xd4a574;
const COL_CROWN = 0xffd700;
const COL_CROWN_GEM = 0xff2200;
const COL_CROWN_GEM2 = 0x2266ff;
const COL_KING_ARMOR = 0x8899aa;
const COL_KING_CAPE = 0x882244;
const COL_KING_SWORD = 0xc0c8d0;
const COL_JESTER1 = 0xff3344;
const COL_JESTER2 = 0xaa00cc;
const COL_JESTER_BELL = 0xffd700;
const COL_PIGEON = 0xdddddd;
const COL_PIGEON_DK = 0xbbbbbb;
const COL_PIGEON_BEAK = 0xffaa00;
const COL_PIGEON_LEG = 0xcc8800;

// Animation timing
const PRINCESS_CYCLE = 8.0;
const PRINCESS_APPEAR = 2.5;
const KING_CYCLE = 6.0;
const KING_APPEAR = 2.0;
const FLAG_SPEED = 3.0;
const JESTER_CYCLE = 25.0;
const JESTER_APPEAR = 6.0;
const PIGEON_CYCLE = 4.0;

// ---------------------------------------------------------------------------
// CastleRenderer
// ---------------------------------------------------------------------------

export class CastleRenderer {
  readonly container = new Container();

  // Layers
  private _base = new Graphics();
  private _flagL = new Graphics();
  private _flagR = new Graphics();
  private _princessGfx = new Graphics();
  private _kingGfx = new Graphics();
  private _guardsGfx = new Graphics();
  private _zzzGfx = new Graphics();
  private _jesterGfx = new Graphics();
  private _ballGfx = new Graphics();
  private _gateDoorGfx = new Graphics();
  private _pigeon1Gfx = new Graphics();
  private _pigeon2Gfx = new Graphics();

  // Timers
  private _flagTime = 0;
  private _princessTimer = 0;
  private _kingTimer = 0;
  private _jesterTimer = 0;
  private _pigeonTimer = 0;

  // State
  private _playerColor: number;
  private _isWest: boolean;

  constructor(owner: string | null) {
    this._isWest = owner === "p1";
    this._playerColor = getPlayerColor(owner);

    this._drawStaticCastle();
    this._drawFlags();

    this.container.addChild(this._base);
    this.container.addChild(this._flagL);
    this.container.addChild(this._flagR);
    this.container.addChild(this._princessGfx);
    this.container.addChild(this._kingGfx);
    this.container.addChild(this._guardsGfx);
    this.container.addChild(this._zzzGfx);
    this.container.addChild(this._jesterGfx);
    this.container.addChild(this._ballGfx);
    this.container.addChild(this._gateDoorGfx);
    this.container.addChild(this._pigeon1Gfx);
    this.container.addChild(this._pigeon2Gfx);

    this._princessGfx.visible = false;
    this._kingGfx.visible = false;
    this._jesterGfx.visible = false;
    this._ballGfx.visible = false;
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, phase: GamePhase): void {
    this._flagTime += dt * FLAG_SPEED;
    this._updateFlags();

    // 1. Princess (PREP)
    if (phase === GamePhase.PREP) {
      this._princessTimer += dt;
      if (this._princessTimer > PRINCESS_CYCLE)
        this._princessTimer -= PRINCESS_CYCLE;
      const t = this._princessTimer;
      if (t < PRINCESS_APPEAR) {
        this._princessGfx.visible = true;
        this._drawPrincess(t / PRINCESS_APPEAR);
      } else {
        this._princessGfx.visible = false;
      }
      this._kingGfx.visible = false;
    } else {
      // 2. King (BATTLE/RESOLVE)
      this._kingTimer += dt;
      if (this._kingTimer > KING_CYCLE) this._kingTimer -= KING_CYCLE;
      const t = this._kingTimer;
      if (t < KING_APPEAR) {
        this._kingGfx.visible = true;
        this._drawKing(t / KING_APPEAR);
      } else {
        this._kingGfx.visible = false;
      }
      this._princessGfx.visible = false;
    }

    // 3. Guards
    this._updateGuards(phase);

    // 4. Jester (PREP only)
    if (phase === GamePhase.PREP) {
      this._jesterTimer += dt;
      if (this._jesterTimer > JESTER_CYCLE) this._jesterTimer -= JESTER_CYCLE;
      this._updateJester(this._jesterTimer);
    } else {
      this._jesterGfx.visible = false;
      this._ballGfx.visible = false;
      this._updateGate(0);
    }

    // 5. Pigeons on gatehouse
    this._pigeonTimer += dt;
    if (this._pigeonTimer > PIGEON_CYCLE) this._pigeonTimer -= PIGEON_CYCLE;
    this._updatePigeons(this._pigeonTimer);
  }

  // ── Static Drawing ────────────────────────────────────────────────────────

  private _drawStaticCastle(): void {
    const g = this._base;
    g.clear();

    const wallY = 60;
    const wallH = CH - wallY - 20;

    // Main Wall
    g.rect(40, wallY, CW - 80, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Wall shadow (left side)
    g.rect(41, wallY + 1, 6, wallH - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
    });
    this._drawBrickPattern(g, 42, wallY + 2, CW - 84, wallH - 4);
    // Stone highlights and shadows on wall
    this._drawStoneVariation(g, 50, wallY + 10, CW - 100, wallH - 20);

    // Towers
    const towerW = 60,
      towerH = CH - 25,
      towerY = 15;
    this._drawTower(g, 8, towerY, towerW, towerH); // Left
    this._drawTower(g, CW - towerW - 8, towerY, towerW, towerH); // Right

    // Gatehouse
    const gateW = 50,
      gateX = CW / 2 - gateW / 2,
      gateH = wallH - 20;
    g.rect(gateX, wallY - 15, gateW, gateH + 35)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    this._drawBrickPattern(g, gateX + 2, wallY - 13, gateW - 4, gateH + 30);
    this._drawStoneVariation(g, gateX + 4, wallY - 8, gateW - 8, gateH + 20);
    this._drawCrenellations(g, gateX, wallY - 15, gateW);

    // Decorative stones on gatehouse top (above crenellations)
    const stoneY = wallY - 28; // above the crenellations (wallY - 15 - 7 - some gap)
    const stoneW = 6;
    const stoneH = 14; // around window glass height (22)
    // 3 stones on left side
    g.rect(gateX + 4, stoneY, stoneW, stoneH).fill({ color: COL_STONE_DK });
    g.rect(gateX + 5, stoneY + 1, stoneW - 2, stoneH - 2).fill({
      color: COL_STONE_LT,
    });
    g.rect(gateX + 14, stoneY - 2, stoneW, stoneH + 2).fill({
      color: COL_STONE_DK,
    });
    g.rect(gateX + 15, stoneY - 1, stoneW - 2, stoneH).fill({
      color: COL_STONE_LT,
    });
    g.rect(gateX + 24, stoneY, stoneW, stoneH).fill({ color: COL_STONE_DK });
    g.rect(gateX + 25, stoneY + 1, stoneW - 2, stoneH - 2).fill({
      color: COL_STONE_LT,
    });
    // 3 stones on right side
    g.rect(gateX + gateW - 10, stoneY, stoneW, stoneH).fill({
      color: COL_STONE_DK,
    });
    g.rect(gateX + gateW - 9, stoneY + 1, stoneW - 2, stoneH - 2).fill({
      color: COL_STONE_LT,
    });
    g.rect(gateX + gateW - 20, stoneY - 2, stoneW, stoneH + 2).fill({
      color: COL_STONE_DK,
    });
    g.rect(gateX + gateW - 19, stoneY - 1, stoneW - 2, stoneH).fill({
      color: COL_STONE_LT,
    });
    g.rect(gateX + gateW - 30, stoneY, stoneW, stoneH).fill({
      color: COL_STONE_DK,
    });
    g.rect(gateX + gateW - 29, stoneY + 1, stoneW - 2, stoneH - 2).fill({
      color: COL_STONE_LT,
    });

    // Gate Arch (Background)
    const archCX = CW / 2,
      archTop = wallY + 20 + 15,
      archW = 28,
      archH = gateH - 20;
    g.rect(archCX - archW / 2, archTop + archH * 0.3, archW, archH * 0.7).fill({
      color: COL_WOOD_DK,
    });
    g.ellipse(archCX, archTop + archH * 0.3, archW / 2, archH * 0.3).fill({
      color: COL_WOOD_DK,
    });
    // Arch stone voussoirs
    for (let va = -0.8; va <= 0.8; va += 0.35) {
      const vx = archCX + Math.sin(va) * (archW / 2 + 2);
      const vy = archTop + archH * 0.3 - Math.cos(va) * (archH * 0.3 + 2);
      g.circle(vx, vy, 2).fill({ color: COL_STONE_LT, alpha: 0.4 });
    }
    // Keystone
    g.moveTo(archCX - 4, archTop + 2)
      .lineTo(archCX, archTop - 4)
      .lineTo(archCX + 4, archTop + 2)
      .closePath()
      .fill({ color: COL_STONE_LT });

    // ── Gargoyles flanking the gate ──
    this._drawGargoyle(g, gateX - 4, wallY - 8, false); // left, facing left
    this._drawGargoyle(g, gateX + gateW + 4, wallY - 8, true); // right, facing right

    // Decorative windows on gatehouse
    const gateWinY = wallY + 14;
    this._drawWindow(g, archCX - 48, gateWinY, 16, 22);
    this._drawWindow(g, archCX + 32, gateWinY, 16, 22);

    // Walkway crenellations & Moss
    this._drawCrenellations(g, 40, wallY - 2, CW - 80);

    // Moss patches
    this._drawMoss(g, 13, towerY + towerH - 15, 14);
    this._drawMoss(g, CW - 22, towerY + towerH - 10, 12);
    this._drawMoss(g, gateX + 3, wallY + gateH + 5, 10);
    this._drawMoss(g, 45, wallY + wallH - 5, 10);
    this._drawMoss(g, CW - 55, wallY + wallH - 8, 8);
    this._drawMoss(g, gateX + gateW - 12, wallY + gateH + 12, 8);
    // Moss on crenellations
    this._drawMoss(g, 55, wallY - 6, 6);
    this._drawMoss(g, CW - 70, wallY - 5, 5);

    // Ivy / climbing vines
    this._drawIvy(g, 42, wallY + 15, wallH - 25);
    this._drawIvy(g, CW - 44, wallY + 20, wallH - 30);
    this._drawIvy(g, gateX + 2, wallY + 5, gateH + 15);
    this._drawIvy(g, gateX + gateW - 4, wallY + 10, gateH + 10);
    // Ivy on towers
    this._drawIvy(g, 12, towerY + 80, 60);
    this._drawIvy(g, CW - 14, towerY + 90, 50);

    this._drawSmallWindow(g, gateX + gateW - 14, wallY - 5);

    // Banner/shield emblems on wall
    this._drawWallBanner(g, 60, wallY + 25);
    this._drawWallBanner(g, CW - 72, wallY + 25);
  }

  private _drawTower(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    g.rect(x, y, w, h)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1.5 });
    // Left wall shadow
    g.rect(x + 1, y + 1, 5, h - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
    });
    this._drawBrickPattern(g, x + 2, y + 2, w - 4, h - 4);
    this._drawStoneVariation(g, x + 4, y + 10, w - 8, h - 20);

    // Roof with tile lines
    g.moveTo(x - 4, y)
      .lineTo(x + w / 2, y - 28)
      .lineTo(x + w + 4, y)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo(x + w / 2, y - 28)
      .lineTo(x + w + 4, y)
      .lineTo(x + w / 2 + 1, y - 27)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.3 });
    // Roof tile lines
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const ly = y - 28 + frac * 28;
      const halfW = (w / 2 + 4) * frac;
      g.moveTo(x + w / 2 - halfW, ly)
        .lineTo(x + w / 2 + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }
    // Finial
    g.circle(x + w / 2, y - 28, 2).fill({ color: 0xccaa44 });

    this._drawCrenellations(g, x, y, w);

    // Stained glass dragon window — just under the roof, above first stone band
    this._drawDragonWindow(g, x + w / 2 - 20, y + 6, 40, 30);
    // Decorative stone band
    g.rect(x - 1, y + 40, w + 2, 3).fill({ color: COL_STONE_DK });
    // Regular windows below
    this._drawWindow(g, x + w / 2 - 10, y + 50, 20, 26);
    this._drawArrowSlit(g, x + 12, y + 100);
    this._drawArrowSlit(g, x + w - 18, y + 100);
    g.rect(x - 1, y + 125, w + 2, 3).fill({ color: COL_STONE_DK });
    this._drawWindow(g, x + w / 2 - 10, y + 140, 20, 26);

    // Moss on tower base
    this._drawMoss(g, x + 5, y + h - 8, 12);
    this._drawMoss(g, x + w - 15, y + h - 5, 10);
  }

  // ── Stone texture helpers ─────────────────────────────────────────────────

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 10) {
      const offset = (Math.floor(row / 10) % 2) * 15;
      // Horizontal mortar line
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.6, alpha: 0.45 });
      // Vertical mortar joints
      for (let col = offset; col < w; col += 30) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 10)
          .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      }
      // Stone face shading — alternate stones get a lighter top edge
      for (let col = offset; col < w - 10; col += 30) {
        // Top highlight on each stone block
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 28, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.5, alpha: 0.2 });
        // Bottom shadow on each stone block
        g.moveTo(x + col + 1, y + row + 9)
          .lineTo(x + col + 28, y + row + 9)
          .stroke({ color: COL_STONE_DK, width: 0.5, alpha: 0.2 });
      }
    }
  }

  /** Adds lighter and darker stone patches for variation */
  private _drawStoneVariation(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Light stones — more of them and more visible
    const lightStones = [
      [0.1, 0.15],
      [0.6, 0.3],
      [0.25, 0.55],
      [0.8, 0.7],
      [0.4, 0.85],
      [0.15, 0.75],
      [0.7, 0.1],
      [0.5, 0.45],
      [0.35, 0.35],
      [0.9, 0.55],
      [0.05, 0.9],
      [0.65, 0.8],
    ];
    for (const [fx, fy] of lightStones) {
      const sx = x + fx * w;
      const sy = y + fy * h;
      g.rect(sx, sy, 12, 8)
        .fill({ color: COL_STONE_LT, alpha: 0.3 })
        .stroke({ color: COL_STONE_LT, width: 0.3, alpha: 0.15 });
    }
    // Dark stones — more visible
    const darkStones = [
      [0.3, 0.1],
      [0.75, 0.5],
      [0.1, 0.4],
      [0.55, 0.65],
      [0.85, 0.25],
      [0.45, 0.2],
      [0.2, 0.85],
      [0.7, 0.4],
      [0.5, 0.1],
      [0.15, 0.6],
    ];
    for (const [fx, fy] of darkStones) {
      const sx = x + fx * w;
      const sy = y + fy * h;
      g.rect(sx, sy, 12, 8)
        .fill({ color: COL_STONE_DK, alpha: 0.2 })
        .stroke({ color: COL_STONE_DK, width: 0.3, alpha: 0.1 });
    }
  }

  private _drawCrenellations(
    g: Graphics,
    x: number,
    y: number,
    w: number,
  ): void {
    const merlonW = 8,
      merlonH = 7,
      gap = 6,
      step = merlonW + gap;
    for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Cap stone
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
    g.rect(x - 2, y - 2, w + 4, h + 4).fill({ color: COL_WINDOW_FRAME });
    g.rect(x, y, w, h).fill({ color: COL_WINDOW });
    // Arched top
    g.ellipse(x + w / 2, y + 2, w / 2, 5).fill({ color: COL_WINDOW_FRAME });
    g.ellipse(x + w / 2, y + 2, w / 2 - 1.5, 3.5).fill({
      color: COL_WINDOW,
    });
    // Mullions
    g.moveTo(x + w / 2, y + 3)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
    g.moveTo(x, y + h * 0.45)
      .lineTo(x + w, y + h * 0.45)
      .stroke({ color: COL_WINDOW_FRAME, width: 1.5 });
    // Warm interior glow
    g.rect(x + 1, y + 4, w / 2 - 1, h * 0.4 - 2).fill({
      color: COL_WINDOW_GLOW,
      alpha: 0.3,
    });
    g.rect(x + w / 2 + 1, y + h * 0.45 + 1, w / 2 - 2, h * 0.5 - 2).fill({
      color: COL_WINDOW_GLOW,
      alpha: 0.2,
    });
    // Sill
    g.rect(x - 3, y + h + 1, w + 6, 3).fill({ color: COL_STONE_LT });
  }

  private _drawSmallWindow(g: Graphics, x: number, y: number): void {
    g.rect(x - 1, y - 1, 8, 10).fill({ color: COL_STONE_DK });
    g.rect(x, y, 6, 8)
      .fill({ color: COL_WINDOW })
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    g.moveTo(x + 3, y)
      .lineTo(x + 3, y + 8)
      .stroke({ color: COL_WINDOW_FRAME, width: 0.5 });
    g.rect(x - 1, y + 8, 8, 1.5).fill({ color: COL_STONE_LT });
  }

  private _drawArrowSlit(g: Graphics, x: number, y: number): void {
    g.rect(x + 1, y - 1, 4, 16).fill({ color: COL_STONE_DK });
    g.rect(x + 2, y, 2, 14).fill({ color: COL_WINDOW });
    g.rect(x, y + 5, 6, 2).fill({ color: COL_WINDOW });
    g.rect(x + 1, y - 1, 4, 16).stroke({ color: COL_STONE_DK, width: 0.5 });
  }

  /** Stained glass window depicting a red dragon breathing fire, with lead caming. */
  private _drawDragonWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const cx = x + w / 2;
    const cy = y + h / 2;
    const LEAD = 0x222222;

    // ── Window frame — pointed arch shape ──
    const archTop = y + 4;
    g.roundRect(x, y + h * 0.25, w, h * 0.75, 2).fill({ color: COL_WINDOW });
    // Pointed arch top
    g.moveTo(x, y + h * 0.35)
      .bezierCurveTo(x, archTop - 2, cx, y - 2, cx, y)
      .bezierCurveTo(cx, y - 2, x + w, archTop - 2, x + w, y + h * 0.35)
      .fill({ color: COL_WINDOW });

    // ── Sunburst rays — alternating yellow and blue, radiating from dragon center ──
    const numRays = 16;
    const RAY_COLORS = [0xffdd00, 0x2266ff]; // yellow, blue

    // Window corners and their angles from (cx,cy), for proper polygon clipping
    const wCorners = [
      { px: x,     py: y,     ca: Math.atan2(y - cy,     x - cx) },
      { px: x + w, py: y,     ca: Math.atan2(y - cy,     x + w - cx) },
      { px: x + w, py: y + h, ca: Math.atan2(y + h - cy, x + w - cx) },
      { px: x,     py: y + h, ca: Math.atan2(y + h - cy, x - cx) },
    ];

    // Point where a ray at `angle` intersects the bounding box edge
    const getRayEdge = (angle: number): [number, number] => {
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      let t = Infinity;
      if (cos > 1e-9)       t = Math.min(t, (x + w - cx) / cos);
      else if (cos < -1e-9) t = Math.min(t, (x - cx) / cos);
      if (sin > 1e-9)       t = Math.min(t, (y + h - cy) / sin);
      else if (sin < -1e-9) t = Math.min(t, (y - cy) / sin);
      return [cx + t * cos, cy + t * sin];
    };

    for (let i = 0; i < numRays; i++) {
      const a1 = (i / numRays) * Math.PI * 2 - Math.PI / 2;
      const a2 = a1 + (Math.PI * 2) / numRays;
      const [ex1, ey1] = getRayEdge(a1);
      const [ex2, ey2] = getRayEdge(a2);

      // Polygon: center → edge(a1) → [any window corners between a1 and a2] → edge(a2)
      const poly: [number, number][] = [[cx, cy], [ex1, ey1]];
      for (const { px, py, ca } of wCorners) {
        let na = ca;
        while (na < a1) na += Math.PI * 2;
        if (na > a1 && na < a2) poly.push([px, py]);
      }
      poly.push([ex2, ey2]);

      g.moveTo(poly[0][0], poly[0][1]);
      for (let k = 1; k < poly.length; k++) g.lineTo(poly[k][0], poly[k][1]);
      g.closePath().fill({ color: RAY_COLORS[i % 2], alpha: 0.88 });
    }

    // ── Lead caming ray lines — drawn before dragon so dragon covers them ──
    for (let i = 0; i < numRays; i++) {
      const angle = (i / numRays) * Math.PI * 2 - Math.PI / 2;
      const [ex, ey] = getRayEdge(angle);
      g.moveTo(cx, cy)
        .lineTo(ex, ey)
        .stroke({ color: LEAD, width: 0.6 });
    }

    // ── Background glow — warm amber behind fire area, dark blue behind body ──
    g.ellipse(cx + 4, cy - 4, 8, 6).fill({ color: 0x553300, alpha: 0.5 });
    g.ellipse(cx - 3, cy + 4, 6, 8).fill({ color: 0x1a1a3e, alpha: 0.4 });

    // ── Fire / flame area (right-upper) — oranges and yellows ──
    // Large flame plume
    g.moveTo(cx + 2, cy - 2)
      .bezierCurveTo(cx + 6, cy - 10, cx + 10, cy - 8, cx + 9, cy - 2)
      .bezierCurveTo(cx + 11, cy - 6, cx + 8, cy - 12, cx + 5, cy - 4)
      .fill({ color: 0xcc4400, alpha: 0.85 });
    // Inner bright flame
    g.moveTo(cx + 3, cy - 2)
      .bezierCurveTo(cx + 5, cy - 8, cx + 8, cy - 6, cx + 7, cy - 2)
      .fill({ color: 0xff8800, alpha: 0.8 });
    // Hot core
    g.moveTo(cx + 4, cy - 2)
      .bezierCurveTo(cx + 5, cy - 5, cx + 6, cy - 4, cx + 6, cy - 2)
      .fill({ color: 0xffcc00, alpha: 0.7 });

    // ── Dragon silhouette (left-center) — deep red stained glass ──
    const DRAGON_OUTLINE = 0x220000;
    // Body — curved belly
    g.moveTo(cx - 6, cy + 8)
      .bezierCurveTo(cx - 8, cy + 2, cx - 6, cy - 4, cx - 2, cy - 2)
      .lineTo(cx + 1, cy)
      .bezierCurveTo(cx - 2, cy + 4, cx - 4, cy + 6, cx - 6, cy + 8)
      .fill({ color: 0x991111, alpha: 0.9 })
      .stroke({ color: DRAGON_OUTLINE, width: 0.8 });
    // Neck stretching toward fire
    g.moveTo(cx - 2, cy - 2)
      .bezierCurveTo(cx, cy - 6, cx + 1, cy - 4, cx + 2, cy - 2)
      .lineTo(cx + 1, cy)
      .lineTo(cx - 2, cy - 2)
      .fill({ color: 0xbb2222, alpha: 0.85 })
      .stroke({ color: DRAGON_OUTLINE, width: 0.6 });
    // Head — snout pointing right toward flames
    g.ellipse(cx + 2, cy - 3, 3, 2)
      .fill({ color: 0xaa1818, alpha: 0.9 })
      .stroke({ color: DRAGON_OUTLINE, width: 0.7 });
    // Eye
    g.circle(cx + 1.5, cy - 3.5, 0.7).fill({ color: 0xffcc00, alpha: 0.9 });
    // Wing — triangular, sweeping up-left
    g.moveTo(cx - 4, cy)
      .lineTo(cx - 10, cy - 8)
      .lineTo(cx - 3, cy - 4)
      .fill({ color: 0x881111, alpha: 0.75 })
      .stroke({ color: DRAGON_OUTLINE, width: 0.6 });
    // Wing membrane lines
    g.moveTo(cx - 4, cy)
      .lineTo(cx - 8, cy - 6)
      .stroke({ color: LEAD, width: 0.4, alpha: 0.6 });
    g.moveTo(cx - 4, cy - 1)
      .lineTo(cx - 9, cy - 7)
      .stroke({ color: LEAD, width: 0.4, alpha: 0.5 });
    // Tail — curling down
    g.moveTo(cx - 6, cy + 8)
      .bezierCurveTo(cx - 5, cy + 11, cx - 2, cy + 12, cx, cy + 10)
      .stroke({ color: 0x991111, width: 1.5 });
    // Tail tip — pointed
    g.moveTo(cx, cy + 10)
      .lineTo(cx + 1, cy + 8)
      .lineTo(cx - 1, cy + 11)
      .fill({ color: 0x991111, alpha: 0.8 });

    // ── Lead caming — outer arch frame only (marks the window boundary) ──
    g.moveTo(x, y + h * 0.35)
      .bezierCurveTo(x, archTop - 2, cx, y - 2, cx, y)
      .bezierCurveTo(cx, y - 2, x + w, archTop - 2, x + w, y + h * 0.35)
      .stroke({ color: LEAD, width: 1.2 });

    // ── Stone surround / frame ──
    g.rect(x - 1.5, y - 1, w + 3, h + 2).stroke({
      color: COL_STONE_DK,
      width: 1.5,
    });
    // Keystone at top of arch
    g.moveTo(cx - 3, y - 1)
      .lineTo(cx, y - 3)
      .lineTo(cx + 3, y - 1)
      .fill({ color: COL_STONE_LT });
    g.moveTo(cx - 3, y - 1)
      .lineTo(cx, y - 3)
      .lineTo(cx + 3, y - 1)
      .stroke({ color: COL_STONE_DK, width: 0.5 });

    // ── Rectangular glass section border — drawn last to sit on top ──
    // Left side, right side, and top horizontal of the lower glass pane
    const rTop = y + h * 0.25;
    g.moveTo(x, rTop).lineTo(x, y + h).stroke({ color: LEAD, width: 1.2 });
    g.moveTo(x + w, rTop).lineTo(x + w, y + h).stroke({ color: LEAD, width: 1.2 });
    g.moveTo(x, rTop).lineTo(x + w, rTop).stroke({ color: LEAD, width: 1.2 });
  }

  // ── Decorative elements ──────────────────────────────────────────────────

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 3).fill({ color: COL_MOSS, alpha: 0.5 });
    // Small satellite patches
    g.circle(x + 2, y - 1, 2).fill({ color: COL_MOSS, alpha: 0.3 });
    g.circle(x + w - 2, y - 0.5, 1.5).fill({ color: COL_MOSS, alpha: 0.35 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    // Main vine stem
    for (let iy = 0; iy < h; iy += 4) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 1.2).fill({ color: COL_IVY });
    }
    // Leaves branching off
    for (let iy = 3; iy < h; iy += 7) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 14 < 7 ? -1 : 1;
      g.circle(x + wobble + dir * 3.5, y + iy, 2.5).fill({
        color: COL_IVY_LT,
        alpha: 0.75,
      });
      g.circle(x + wobble + dir * 2.5, y + iy + 1, 1.8).fill({
        color: COL_IVY,
        alpha: 0.6,
      });
    }
  }

  /** Draws a gargoyle statue jutting out from the wall */
  private _drawGargoyle(
    g: Graphics,
    x: number,
    y: number,
    facingRight: boolean,
  ): void {
    const dir = facingRight ? 1 : -1;

    // Mounting block (where gargoyle sits on the wall)
    g.rect(x - 5, y + 2, 10, 8)
      .fill({ color: COL_GARGOYLE })
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });

    // Body (hunched forward, jutting out from wall)
    g.moveTo(x, y + 8)
      .lineTo(x + dir * 6, y + 6)
      .lineTo(x + dir * 12, y + 4)
      .lineTo(x + dir * 14, y + 2)
      .lineTo(x + dir * 14, y + 8)
      .lineTo(x + dir * 8, y + 10)
      .lineTo(x, y + 10)
      .closePath()
      .fill({ color: COL_GARGOYLE })
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });

    // Haunches / legs tucked under
    g.moveTo(x + dir * 2, y + 10)
      .lineTo(x + dir * 4, y + 14)
      .lineTo(x + dir * 8, y + 14)
      .lineTo(x + dir * 6, y + 10)
      .closePath()
      .fill({ color: COL_GARGOYLE });
    // Claws gripping the edge
    g.moveTo(x + dir * 4, y + 14)
      .lineTo(x + dir * 3, y + 16)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });
    g.moveTo(x + dir * 6, y + 14)
      .lineTo(x + dir * 5, y + 16)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });
    g.moveTo(x + dir * 8, y + 14)
      .lineTo(x + dir * 7, y + 16)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });

    // Head (beast-like, facing outward)
    const hx = x + dir * 16;
    const hy = y + 1;
    // Skull shape
    g.circle(hx, hy + 2, 5)
      .fill({ color: COL_GARGOYLE })
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
    // Snout/muzzle
    g.moveTo(hx + dir * 4, hy)
      .lineTo(hx + dir * 9, hy + 1)
      .lineTo(hx + dir * 9, hy + 4)
      .lineTo(hx + dir * 4, hy + 4)
      .closePath()
      .fill({ color: COL_GARGOYLE })
      .stroke({ color: COL_GARGOYLE_DK, width: 0.6 });
    // Open mouth (water spout)
    g.rect(hx + dir * 7, hy + 2, dir * 4, 2).fill({ color: 0x333333 });
    // Fangs
    g.moveTo(hx + dir * 6, hy + 1)
      .lineTo(hx + dir * 7, hy + 2.5)
      .lineTo(hx + dir * 5, hy + 1)
      .closePath()
      .fill({ color: COL_STONE_LT });
    g.moveTo(hx + dir * 6, hy + 4)
      .lineTo(hx + dir * 7, hy + 2.5)
      .lineTo(hx + dir * 5, hy + 4)
      .closePath()
      .fill({ color: COL_STONE_LT });
    // Eyes (menacing hollow sockets)
    g.circle(hx + dir * 1, hy, 1.5).fill({ color: 0x222222 });
    g.circle(hx + dir * 1, hy, 0.5).fill({ color: 0x444444 });
    // Brow ridge
    g.moveTo(hx - dir * 1, hy - 2)
      .lineTo(hx + dir * 4, hy - 3)
      .stroke({ color: COL_GARGOYLE_DK, width: 1.5 });
    // Horns
    g.moveTo(hx - dir * 2, hy - 2)
      .bezierCurveTo(
        hx - dir * 4,
        hy - 6,
        hx - dir * 1,
        hy - 8,
        hx + dir * 1,
        hy - 6,
      )
      .stroke({ color: COL_GARGOYLE_DK, width: 1.5 });
    // Ears (pointed)
    g.moveTo(hx - dir * 3, hy)
      .lineTo(hx - dir * 5, hy - 4)
      .lineTo(hx - dir * 2, hy - 1)
      .closePath()
      .fill({ color: COL_GARGOYLE });

    // Wings (folded along the back)
    g.moveTo(x + dir * 2, y + 4)
      .bezierCurveTo(
        x - dir * 2,
        y - 4,
        x + dir * 6,
        y - 8,
        x + dir * 10,
        y - 2,
      )
      .stroke({ color: COL_GARGOYLE_DK, width: 1.2 });
    // Wing membrane lines
    g.moveTo(x + dir * 2, y + 2)
      .lineTo(x + dir * 4, y - 4)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.5, alpha: 0.5 });
    g.moveTo(x + dir * 4, y + 2)
      .lineTo(x + dir * 6, y - 5)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.5, alpha: 0.5 });
    g.moveTo(x + dir * 6, y + 1)
      .lineTo(x + dir * 8, y - 4)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.5, alpha: 0.5 });

    // Tail curling upward
    g.moveTo(x - dir * 2, y + 6)
      .bezierCurveTo(x - dir * 6, y + 4, x - dir * 8, y, x - dir * 6, y - 3)
      .stroke({ color: COL_GARGOYLE_DK, width: 1.5 });
    // Tail tip (pointed)
    g.moveTo(x - dir * 6, y - 3)
      .lineTo(x - dir * 7, y - 5)
      .lineTo(x - dir * 5, y - 4)
      .closePath()
      .fill({ color: COL_GARGOYLE_DK });

    // Weathering/moss on gargoyle
    g.circle(hx - dir * 2, hy + 3, 1.5).fill({
      color: COL_MOSS,
      alpha: 0.3,
    });
    g.circle(x + dir * 8, y + 8, 1).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  /** Draws a decorative wall banner/shield */
  private _drawWallBanner(g: Graphics, x: number, y: number): void {
    // Shield shape
    g.moveTo(x, y)
      .lineTo(x + 12, y)
      .lineTo(x + 12, y + 10)
      .lineTo(x + 6, y + 16)
      .lineTo(x, y + 10)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: 0x444444, width: 1 });
    // Shield boss
    g.circle(x + 6, y + 7, 2)
      .fill({ color: 0xccaa44 })
      .stroke({ color: 0x886622, width: 0.5 });
    // Diagonal stripe
    g.moveTo(x + 2, y + 2)
      .lineTo(x + 10, y + 12)
      .stroke({ color: 0xffffff, width: 2, alpha: 0.3 });
  }

  // ── Flags ─────────────────────────────────────────────────────────────────

  private _drawFlags(): void {
    this._flagL.position.set(8 + 30 + 2, 15 - 28 - 2);
    this._flagR.position.set(CW - 60 - 8 + 30 + 2, 15 - 28 - 2);
  }

  private _updateFlags(): void {
    this._drawFlagShape(this._flagL, this._flagTime);
    this._drawFlagShape(this._flagR, this._flagTime + 1.5);
  }

  private _drawFlagShape(g: Graphics, time: number): void {
    g.clear();
    // Pole
    g.moveTo(0, 0).lineTo(0, -22).stroke({ color: 0x888888, width: 2 });
    // Pole cap
    g.circle(0, -22, 1.5).fill({ color: 0xccaa44 });

    const w1 = Math.sin(time) * 3,
      w2 = Math.sin(time * 1.3 + 1) * 4,
      w3 = Math.sin(time * 0.9 + 2) * 3;
    const fW = 18,
      fH = 12;
    g.moveTo(0, -22)
      .bezierCurveTo(fW * 0.3, -22 + w1, fW * 0.6, -22 + w2, fW, -22 + w3)
      .lineTo(fW, -22 + fH + w3)
      .bezierCurveTo(
        fW * 0.6,
        -22 + fH + w2,
        fW * 0.3,
        -22 + fH + w1,
        0,
        -22 + fH,
      )
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: this._playerColor, width: 0.5 });
    // Emblem on flag
    g.circle(fW / 2, -16 + (w1 + w2) / 3, 2).fill({
      color: 0xffffff,
      alpha: 0.4,
    });
  }

  // ── Characters ────────────────────────────────────────────────────────────

  private _drawPrincess(t: number): void {
    const g = this._princessGfx;
    g.clear();
    const wx = 38,
      wy = 15 + 50 + 6;
    let hY =
      t < 0.2
        ? wy + 18 * (1 - t / 0.2)
        : t > 0.8
          ? wy + 18 * ((t - 0.8) / 0.2)
          : wy;
    if (hY > wy + 18) return;

    // Dress / bodice with detail
    g.rect(wx - 7, hY + 5, 14, 12).fill({ color: COL_DRESS });
    // Dress neckline
    g.moveTo(wx - 5, hY + 5)
      .bezierCurveTo(wx - 3, hY + 8, wx + 3, hY + 8, wx + 5, hY + 5)
      .stroke({ color: COL_DRESS_DK, width: 0.8 });
    // Corset lacing
    for (let ly = hY + 7; ly < hY + 15; ly += 3) {
      g.moveTo(wx - 1, ly)
        .lineTo(wx + 1, ly + 1.5)
        .stroke({ color: COL_DRESS_DK, width: 0.5 });
      g.moveTo(wx + 1, ly)
        .lineTo(wx - 1, ly + 1.5)
        .stroke({ color: COL_DRESS_DK, width: 0.5 });
    }
    // Puffy sleeves
    g.circle(wx - 7, hY + 7, 3).fill({ color: COL_DRESS });
    g.circle(wx + 7, hY + 7, 3).fill({ color: COL_DRESS });
    // Necklace
    g.moveTo(wx - 4, hY + 5)
      .bezierCurveTo(wx - 2, hY + 7, wx + 2, hY + 7, wx + 4, hY + 5)
      .stroke({ color: 0xccaa44, width: 0.8 });
    g.circle(wx, hY + 6.5, 1).fill({ color: COL_CROWN_GEM });

    // Neck
    g.rect(wx - 2, hY + 2, 4, 4).fill({ color: COL_SKIN });

    // Head
    g.circle(wx, hY, 6).fill({ color: COL_SKIN });
    // Eyes
    g.circle(wx - 2, hY - 1, 1).fill({ color: 0x334466 });
    g.circle(wx + 2, hY - 1, 1).fill({ color: 0x334466 });
    g.circle(wx - 2, hY - 1.2, 0.4).fill({ color: 0xffffff }); // glint
    g.circle(wx + 2, hY - 1.2, 0.4).fill({ color: 0xffffff });
    // Eyelashes
    g.moveTo(wx - 3.5, hY - 1.5)
      .lineTo(wx - 1, hY - 2)
      .stroke({ color: 0x333333, width: 0.4 });
    g.moveTo(wx + 3.5, hY - 1.5)
      .lineTo(wx + 1, hY - 2)
      .stroke({ color: 0x333333, width: 0.4 });
    // Nose
    g.moveTo(wx, hY)
      .lineTo(wx + 0.5, hY + 1.5)
      .lineTo(wx - 0.5, hY + 1.5)
      .stroke({ color: 0xd0a880, width: 0.5 });
    // Mouth (small smile)
    g.moveTo(wx - 1.5, hY + 2.5)
      .bezierCurveTo(wx - 0.5, hY + 3.5, wx + 0.5, hY + 3.5, wx + 1.5, hY + 2.5)
      .stroke({ color: 0xcc6666, width: 0.6 });
    // Blush
    g.circle(wx - 3.5, hY + 1, 1.5).fill({ color: 0xff8888, alpha: 0.2 });
    g.circle(wx + 3.5, hY + 1, 1.5).fill({ color: 0xff8888, alpha: 0.2 });

    // Hair (flowing)
    const windTime = this._flagTime;
    const wave1 = Math.sin(windTime * 2) * 2;
    const wave2 = Math.sin(windTime * 2.5 + 1) * 3;
    const wave3 = Math.sin(windTime * 1.8 + 2) * 2;
    // Hair top/crown
    g.ellipse(wx, hY - 2, 7, 5).fill({ color: COL_HAIR });
    // Flowing hair down the side
    g.moveTo(wx + 5, hY)
      .bezierCurveTo(
        wx + 8 + wave1,
        hY + 5,
        wx + 6 + wave2,
        hY + 10,
        wx + 4 + wave3,
        hY + 16,
      )
      .lineTo(wx + 7 + wave3, hY + 16)
      .bezierCurveTo(
        wx + 9 + wave2,
        hY + 10,
        wx + 10 + wave1,
        hY + 5,
        wx + 6,
        hY,
      )
      .closePath()
      .fill({ color: COL_HAIR });
    // Other side of hair
    g.moveTo(wx - 5, hY)
      .bezierCurveTo(
        wx - 7 - wave1 * 0.5,
        hY + 4,
        wx - 6 - wave2 * 0.3,
        hY + 8,
        wx - 5 - wave3 * 0.3,
        hY + 12,
      )
      .lineTo(wx - 7 - wave3 * 0.3, hY + 12)
      .bezierCurveTo(
        wx - 8 - wave2 * 0.3,
        hY + 8,
        wx - 9 - wave1 * 0.5,
        hY + 4,
        wx - 6,
        hY,
      )
      .closePath()
      .fill({ color: COL_HAIR });

    // Tiara/small crown
    g.moveTo(wx - 4, hY - 5)
      .lineTo(wx - 3, hY - 8)
      .lineTo(wx - 1, hY - 6)
      .lineTo(wx, hY - 9)
      .lineTo(wx + 1, hY - 6)
      .lineTo(wx + 3, hY - 8)
      .lineTo(wx + 4, hY - 5)
      .closePath()
      .fill({ color: COL_CROWN });
    g.circle(wx, hY - 7.5, 0.8).fill({ color: COL_CROWN_GEM2 });

    // Waving handkerchief
    if (t > 0.2 && t < 0.8) {
      const wave = Math.sin(((t - 0.2) / 0.6) * Math.PI * 6) * 6;
      // Arm
      g.moveTo(wx + 6, hY + 6)
        .lineTo(wx + 9 + wave * 0.3, hY + 2)
        .stroke({ color: COL_SKIN, width: 2.5 });
      // Hand
      g.circle(wx + 9 + wave * 0.3, hY + 2, 1.5).fill({ color: COL_SKIN });
      // Handkerchief (cloth-like)
      const hkX = wx + 9 + wave * 0.3;
      const hkY = hY - 1;
      g.moveTo(hkX, hkY + 3)
        .bezierCurveTo(
          hkX + 3,
          hkY + wave * 0.2,
          hkX + 5,
          hkY - 1 + wave * 0.15,
          hkX + 7,
          hkY + wave * 0.1,
        )
        .lineTo(hkX + 6, hkY + 4 + wave * 0.1)
        .bezierCurveTo(
          hkX + 4,
          hkY + 5 + wave * 0.15,
          hkX + 2,
          hkY + 4 + wave * 0.2,
          hkX,
          hkY + 3,
        )
        .closePath()
        .fill({ color: COL_HANKY });
      // Lace edge
      g.moveTo(hkX + 1, hkY + 4 + wave * 0.2)
        .lineTo(hkX + 6, hkY + 4 + wave * 0.1)
        .stroke({ color: 0xdddddd, width: 0.5 });
    }
  }

  private _drawKing(t: number): void {
    const g = this._kingGfx;
    g.clear();
    const wx = CW - 38,
      wy = 15 + 50 + 6;
    let hY =
      t < 0.2
        ? wy + 18 * (1 - t / 0.2)
        : t > 0.8
          ? wy + 18 * ((t - 0.8) / 0.2)
          : wy;
    if (hY > wy + 18) return;

    // Cape (behind body)
    g.moveTo(wx - 7, hY + 5)
      .lineTo(wx - 10, hY + 18)
      .lineTo(wx + 10, hY + 18)
      .lineTo(wx + 7, hY + 5)
      .closePath()
      .fill({ color: COL_KING_CAPE });
    // Cape fur trim
    g.moveTo(wx - 7, hY + 5)
      .lineTo(wx + 7, hY + 5)
      .stroke({ color: 0xddccaa, width: 2 });
    // Ermine dots on cape
    for (let ey = hY + 10; ey < hY + 17; ey += 4) {
      g.circle(wx - 4, ey, 0.6).fill({ color: 0x111111 });
      g.circle(wx + 4, ey, 0.6).fill({ color: 0x111111 });
    }

    // Armor body with detail
    g.rect(wx - 6, hY + 5, 12, 12).fill({ color: COL_KING_ARMOR });
    // Chainmail texture
    for (let cy = hY + 7; cy < hY + 15; cy += 2.5) {
      g.moveTo(wx - 5, cy)
        .lineTo(wx + 5, cy)
        .stroke({ color: 0x99aabb, width: 0.3, alpha: 0.5 });
    }
    // Belt with buckle
    g.rect(wx - 6, hY + 12, 12, 2.5).fill({ color: 0x664422 });
    g.rect(wx - 1, hY + 12, 3, 2.5).fill({ color: 0xccaa44 });
    // Royal tabard
    g.rect(wx - 3, hY + 6, 6, 8).fill({
      color: this._playerColor,
      alpha: 0.5,
    });

    // Shoulders / pauldrons
    g.circle(wx - 7, hY + 6, 3).fill({ color: COL_KING_ARMOR });
    g.circle(wx + 7, hY + 6, 3).fill({ color: COL_KING_ARMOR });
    g.circle(wx - 7, hY + 6, 1.5).fill({ color: 0x99aabb, alpha: 0.3 });
    g.circle(wx + 7, hY + 6, 1.5).fill({ color: 0x99aabb, alpha: 0.3 });

    // Neck
    g.rect(wx - 2, hY + 2, 4, 4).fill({ color: COL_KING_SKIN });

    // Head
    g.circle(wx, hY, 6).fill({ color: COL_KING_SKIN });
    // Beard
    g.moveTo(wx - 4, hY + 2)
      .bezierCurveTo(wx - 5, hY + 6, wx - 2, hY + 9, wx, hY + 8)
      .bezierCurveTo(wx + 2, hY + 9, wx + 5, hY + 6, wx + 4, hY + 2)
      .fill({ color: 0x664422 });
    // Mustache
    g.moveTo(wx - 3, hY + 2)
      .bezierCurveTo(wx - 4, hY + 3, wx - 2, hY + 3.5, wx, hY + 3)
      .bezierCurveTo(wx + 2, hY + 3.5, wx + 4, hY + 3, wx + 3, hY + 2)
      .fill({ color: 0x553311 });
    // Eyes — stern
    g.circle(wx - 2, hY - 1, 1).fill({ color: 0x334422 });
    g.circle(wx + 2, hY - 1, 1).fill({ color: 0x334422 });
    g.circle(wx - 2, hY - 1.2, 0.3).fill({ color: 0xffffff });
    g.circle(wx + 2, hY - 1.2, 0.3).fill({ color: 0xffffff });
    // Thick brows
    g.moveTo(wx - 4, hY - 3)
      .lineTo(wx - 1, hY - 2.5)
      .stroke({ color: 0x553311, width: 1 });
    g.moveTo(wx + 4, hY - 3)
      .lineTo(wx + 1, hY - 2.5)
      .stroke({ color: 0x553311, width: 1 });
    // Nose
    g.moveTo(wx, hY)
      .lineTo(wx + 1, hY + 1.5)
      .lineTo(wx - 1, hY + 1.5)
      .stroke({ color: 0xb8915e, width: 0.6 });

    // Crown (more detailed)
    g.moveTo(wx - 5, hY - 4)
      .lineTo(wx - 5, hY - 8)
      .lineTo(wx - 3, hY - 6)
      .lineTo(wx - 1, hY - 10)
      .lineTo(wx, hY - 7)
      .lineTo(wx + 1, hY - 10)
      .lineTo(wx + 3, hY - 6)
      .lineTo(wx + 5, hY - 8)
      .lineTo(wx + 5, hY - 4)
      .closePath()
      .fill({ color: COL_CROWN })
      .stroke({ color: 0xbb9900, width: 0.5 });
    // Crown band
    g.rect(wx - 5, hY - 5, 10, 2).fill({ color: 0xbb9900 });
    // Gems
    g.circle(wx, hY - 8.5, 1.2).fill({ color: COL_CROWN_GEM });
    g.circle(wx - 3, hY - 5.5, 0.8).fill({ color: COL_CROWN_GEM2 });
    g.circle(wx + 3, hY - 5.5, 0.8).fill({ color: COL_CROWN_GEM2 });
    // Gem sparkle
    g.circle(wx + 0.3, hY - 9, 0.3).fill({ color: 0xffffff });

    // Sword-waving arm
    if (t > 0.2 && t < 0.8) {
      const ang = Math.sin(((t - 0.2) / 0.6) * Math.PI * 4) * 0.8;
      // Arm
      g.moveTo(wx + 6, hY + 6)
        .lineTo(wx + 9, hY + 3)
        .stroke({ color: COL_KING_SKIN, width: 2.5 });
      // Gauntlet
      g.circle(wx + 9, hY + 3, 1.5).fill({ color: COL_KING_ARMOR });
      // Sword blade
      const sEndX = wx + 9 + Math.sin(ang) * 18;
      const sEndY = hY + 3 - Math.cos(ang) * 18;
      g.moveTo(wx + 9, hY + 3)
        .lineTo(sEndX, sEndY)
        .stroke({ color: COL_KING_SWORD, width: 2.5 });
      // Sword edge highlight
      g.moveTo(wx + 9, hY + 3)
        .lineTo(sEndX, sEndY)
        .stroke({ color: 0xeeeeff, width: 0.8, alpha: 0.5 });
      // Crossguard
      const cgX = wx + 9 + Math.sin(ang) * 3;
      const cgY = hY + 3 - Math.cos(ang) * 3;
      g.moveTo(cgX - Math.cos(ang) * 4, cgY - Math.sin(ang) * 4)
        .lineTo(cgX + Math.cos(ang) * 4, cgY + Math.sin(ang) * 4)
        .stroke({ color: 0xccaa44, width: 2 });
      // Pommel
      g.circle(
        wx + 9 - Math.sin(ang) * 2,
        hY + 3 + Math.cos(ang) * 2,
        1.5,
      ).fill({
        color: 0xccaa44,
      });
    }
  }

  // ── Guards ────────────────────────────────────────────────────────────────

  private _updateGuards(phase: GamePhase): void {
    const g = this._guardsGfx;
    const z = this._zzzGfx;
    g.clear();
    z.clear();
    const gX = CW / 2,
      gY = CH - 20,
      off = 35,
      panic = phase !== GamePhase.PREP;
    this._drawGuard(g, z, gX - off, gY, 0, panic);
    this._drawGuard(g, z, gX + off, gY, 1, panic);
  }

  private _drawGuard(
    g: Graphics,
    z: Graphics,
    x: number,
    y: number,
    id: number,
    panic: boolean,
  ): void {
    const time = this._flagTime / FLAG_SPEED;
    const breathe = Math.sin(time * 2 + id) * 0.5;
    const snoring = !panic && Math.floor(time * 0.15 + id * 0.5) % 2 === 0;
    let hY = y - 22 + (snoring ? 2 : breathe);
    if (panic) hY += Math.sin(time * 15) * 0.5;

    const facingIn = id === 0 ? 1 : -1; // left guard faces right, right faces left

    // Shadow
    g.ellipse(x, y, 7, 2).fill({ color: 0x000000, alpha: 0.12 });

    // Feet / Boots with detail
    g.rect(x - 5, y - 5, 5, 5).fill({ color: 0x332211 });
    g.rect(x + 1, y - 5, 5, 5).fill({ color: 0x332211 });
    // Boot straps
    g.moveTo(x - 5, y - 3)
      .lineTo(x, y - 3)
      .stroke({ color: 0x221100, width: 0.5 });
    g.moveTo(x + 1, y - 3)
      .lineTo(x + 6, y - 3)
      .stroke({ color: 0x221100, width: 0.5 });

    // Legs
    g.rect(x - 4, y - 9, 4, 5).fill({ color: 0x445566 });
    g.rect(x + 1, y - 9, 4, 5).fill({ color: 0x445566 });

    // Body (tunic + armor)
    g.rect(x - 7, y - 18, 14, 10).fill({ color: 0x556677 });
    // Chainmail texture
    for (let cy = y - 16; cy < y - 10; cy += 2) {
      g.moveTo(x - 6, cy)
        .lineTo(x + 6, cy)
        .stroke({ color: 0x667788, width: 0.3, alpha: 0.5 });
    }
    // Belt
    g.rect(x - 7, y - 10, 14, 2.5).fill({ color: 0x443322 });
    g.circle(x, y - 8.5, 1).fill({ color: 0xccaa44 }); // buckle
    // Chest plate
    g.rect(x - 3, y - 17, 6, 6).fill({ color: 0x8899aa, alpha: 0.4 });
    // Armor highlight
    g.rect(x - 1, y - 16, 2, 4).fill({ color: 0xaabbcc, alpha: 0.25 });

    // Arms
    if (panic) {
      // Arms raised in alarm
      g.moveTo(x - 7, y - 14)
        .lineTo(x - 9, hY + 2)
        .stroke({ color: 0x556677, width: 3 });
      g.moveTo(x + 7, y - 14)
        .lineTo(x + 9, hY + 2)
        .stroke({ color: 0x556677, width: 3 });
      // Hands
      g.circle(x - 9, hY + 2, 1.5).fill({ color: COL_SKIN });
      g.circle(x + 9, hY + 2, 1.5).fill({ color: COL_SKIN });
    } else {
      // Arms relaxed at sides
      g.moveTo(x - 7, y - 14)
        .lineTo(x - 12, y - 8)
        .stroke({ color: 0x556677, width: 3 });
      g.moveTo(x + 7, y - 14)
        .lineTo(x + 12, y - 8)
        .stroke({ color: 0x556677, width: 3 });
      // Gauntlets
      g.circle(x - 12, y - 8, 2).fill({ color: 0x8899aa });
      g.circle(x + 12, y - 8, 2).fill({ color: 0x8899aa });
    }

    // Head
    g.circle(x, hY, 6).fill({ color: 0xbbbbcc });
    // Face (visible through helmet opening)
    g.rect(x - 3, hY - 1, 6, 5).fill({ color: COL_SKIN });
    // Eyes
    if (snoring) {
      // Closed eyes (lines)
      g.moveTo(x - 2.5, hY + 0.5)
        .lineTo(x - 0.5, hY + 0.5)
        .stroke({ color: 0x222222, width: 0.6 });
      g.moveTo(x + 0.5, hY + 0.5)
        .lineTo(x + 2.5, hY + 0.5)
        .stroke({ color: 0x222222, width: 0.6 });
    } else if (panic) {
      // Wide eyes
      g.circle(x - 1.5, hY + 0.5, 1.2).fill({ color: 0xffffff });
      g.circle(x + 1.5, hY + 0.5, 1.2).fill({ color: 0xffffff });
      g.circle(x - 1.5, hY + 0.5, 0.6).fill({ color: 0x222222 });
      g.circle(x + 1.5, hY + 0.5, 0.6).fill({ color: 0x222222 });
    } else {
      g.circle(x - 1.5, hY + 0.5, 0.8).fill({ color: 0x222222 });
      g.circle(x + 1.5, hY + 0.5, 0.8).fill({ color: 0x222222 });
    }
    // Nose
    g.moveTo(x, hY + 1.5)
      .lineTo(x + 0.5, hY + 3)
      .stroke({ color: 0xd0a880, width: 0.5 });
    // Mouth
    if (panic) {
      // Open mouth (shock)
      g.circle(x, hY + 3.5, 1).fill({ color: 0x442222 });
    }

    // Helmet
    g.moveTo(x - 7, hY + 1)
      .lineTo(x, hY - 8)
      .lineTo(x + 7, hY + 1)
      .closePath()
      .fill({ color: 0x777788 });
    // Helmet rim
    g.rect(x - 7, hY, 14, 2).fill({ color: 0x666677 });
    // Nose guard
    g.rect(x - 1, hY, 2, 3).fill({ color: 0x777788 });
    // Helmet crest
    g.moveTo(x, hY - 8)
      .bezierCurveTo(
        x + facingIn * 3,
        hY - 12,
        x + facingIn * 6,
        hY - 10,
        x + facingIn * 4,
        hY - 6,
      )
      .stroke({ color: this._playerColor, width: 2 });

    // Spear
    const pX = x + (id === 0 ? -12 : 12);
    g.moveTo(pX, y)
      .lineTo(pX, y - 48)
      .stroke({ color: COL_WOOD_DK, width: 2 });
    // Spear crossguard
    g.rect(pX - 2, y - 48, 4, 2).fill({ color: 0x555555 });
    // Spearhead
    g.moveTo(pX - 3, y - 50)
      .lineTo(pX, y - 60)
      .lineTo(pX + 3, y - 50)
      .closePath()
      .fill({ color: 0xccddee });
    // Spear blade highlight
    g.moveTo(pX, y - 60)
      .lineTo(pX + 1, y - 52)
      .stroke({ color: 0xeeeeff, width: 0.5, alpha: 0.5 });

    // Shield on arm (non-spear side)
    const shX = x + (id === 0 ? 8 : -8);
    g.moveTo(shX - 4, y - 18)
      .lineTo(shX + 4, y - 18)
      .lineTo(shX + 4, y - 10)
      .lineTo(shX, y - 6)
      .lineTo(shX - 4, y - 10)
      .closePath()
      .fill({ color: this._playerColor })
      .stroke({ color: 0x444444, width: 1 });
    g.circle(shX, y - 13, 1.5).fill({ color: 0xccaa44 });

    // Zzz when snoring
    if (snoring) {
      const life = (time * 0.5 + id * 0.3) % 1.0;
      const zx = x + Math.sin(time * 2) * 4,
        zy = hY - 5 - life * 20;
      z.position.set(zx, zy);
      z.scale.set(0.5 + life * 0.5);
      z.alpha = 1.0 - life;
      z.moveTo(0, 0)
        .lineTo(4, 0)
        .lineTo(0, 4)
        .lineTo(4, 4)
        .stroke({ color: 0xffffff, width: 1 });
    }
  }

  // ── Gate / Portcullis ─────────────────────────────────────────────────────

  private _updateGate(open: number): void {
    const g = this._gateDoorGfx;
    g.clear();
    const aT = 60 + 20 + 15,
      aW = 28,
      aH = CH - 60 - 20 - 20,
      aCX = CW / 2;
    const li = open * aH * 0.8;
    for (let py = aT + aH * 0.1; py < aT + aH; py += 8) {
      const cy = py - li;
      if (cy >= aT)
        g.moveTo(aCX - aW / 2 + 3, cy)
          .lineTo(aCX + aW / 2 - 3, cy)
          .stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
    }
    for (let px = aCX - aW / 2 + 6; px < aCX + aW / 2; px += 8) {
      const sy = Math.max(aT + aH * 0.1 - li, aT),
        ey = aT + aH - 3 - li;
      if (ey > sy)
        g.moveTo(px, sy)
          .lineTo(px, ey)
          .stroke({ color: COL_PORTCULLIS, width: 1.5, alpha: 0.7 });
    }
  }

  // ── Jester ────────────────────────────────────────────────────────────────

  private _updateJester(t: number): void {
    const j = this._jesterGfx,
      b = this._ballGfx;
    j.clear();
    b.clear();
    if (t > JESTER_APPEAR) {
      j.visible = false;
      b.visible = false;
      this._updateGate(0);
      return;
    }
    j.visible = true;
    this._updateGate(1.0);
    const st = t / JESTER_APPEAR,
      gX = CW / 2,
      gY = CH - 22;
    let jX = gX;

    if (st < 0.2) {
      jX = gX - 5 + st * 50;
      this._drawJester(j, jX, gY, st * 50);
    } else if (st < 0.7) {
      jX = gX + 5;
      this._drawJester(j, jX, gY, 0);
      if (st > 0.4 && st < 0.6) {
        b.visible = true;
        const bT = (st - 0.4) / 0.2,
          tx = gX + 35,
          ty = CH - 42;
        const bx = jX + 5 + (tx - (jX + 5)) * bT;
        const by =
          gY - 10 + (ty - (gY - 10)) * bT - Math.sin(bT * Math.PI) * 30;
        this._drawBall(b, bx, by);
      } else {
        b.visible = false;
      }
    } else {
      jX = gX + 5 - (st - 0.7) * 33;
      this._drawJester(j, jX, gY, (st - 0.7) * 33);
      if (st > 0.9) this._updateGate(1.0 - (st - 0.9) * 10);
    }
  }

  private _drawJester(
    g: Graphics,
    x: number,
    y: number,
    walkTime: number,
  ): void {
    const legSwing = walkTime > 0 ? Math.sin(walkTime * 0.8) * 2 : 0;
    const bobble = Math.sin(this._flagTime * 4) * 1.5;

    // Legs (two-toned like body)
    g.rect(x - 3 + legSwing, y - 5, 3, 6).fill({ color: COL_JESTER1 });
    g.rect(x + 1 - legSwing, y - 5, 3, 6).fill({ color: COL_JESTER2 });
    // Pointed shoes with curled toes
    g.moveTo(x - 3 + legSwing, y)
      .lineTo(x - 7 + legSwing, y + 1)
      .bezierCurveTo(
        x - 8 + legSwing,
        y - 1,
        x - 6 + legSwing,
        y - 2,
        x - 3 + legSwing,
        y - 1,
      )
      .fill({ color: COL_JESTER1 });
    g.moveTo(x + 4 - legSwing, y)
      .lineTo(x + 8 - legSwing, y + 1)
      .bezierCurveTo(
        x + 9 - legSwing,
        y - 1,
        x + 7 - legSwing,
        y - 2,
        x + 4 - legSwing,
        y - 1,
      )
      .fill({ color: COL_JESTER2 });
    // Tiny bells on shoe tips
    g.circle(x - 7 + legSwing, y + 1, 1).fill({ color: COL_JESTER_BELL });
    g.circle(x + 8 - legSwing, y + 1, 1).fill({ color: COL_JESTER_BELL });

    // Body (split two-tone)
    g.rect(x - 4, y - 14, 4, 10).fill({ color: COL_JESTER1 });
    g.rect(x, y - 14, 4, 10).fill({ color: COL_JESTER2 });
    // Diamond pattern on tunic
    g.moveTo(x - 2, y - 12)
      .lineTo(x, y - 14)
      .lineTo(x + 2, y - 12)
      .lineTo(x, y - 10)
      .closePath()
      .fill({ color: COL_JESTER_BELL, alpha: 0.5 });
    // Collar ruff (zigzag)
    for (let cx = x - 5; cx < x + 5; cx += 2.5) {
      g.moveTo(cx, y - 14)
        .lineTo(cx + 1.25, y - 16)
        .lineTo(cx + 2.5, y - 14)
        .fill({ color: 0xffffff });
    }
    // Belt with bells
    g.rect(x - 4, y - 6, 8, 1.5).fill({ color: COL_JESTER_BELL });
    g.circle(x - 2, y - 5, 0.8).fill({ color: COL_JESTER_BELL });
    g.circle(x + 2, y - 5, 0.8).fill({ color: COL_JESTER_BELL });

    // Arms (animated, gesturing)
    const armWave = Math.sin(this._flagTime * 3) * 3;
    g.moveTo(x - 4, y - 12)
      .lineTo(x - 8, y - 8 + armWave)
      .stroke({ color: COL_JESTER1, width: 2.5 });
    g.moveTo(x + 4, y - 12)
      .lineTo(x + 8, y - 8 - armWave)
      .stroke({ color: COL_JESTER2, width: 2.5 });
    // Hands
    g.circle(x - 8, y - 8 + armWave, 1.2).fill({ color: COL_SKIN });
    g.circle(x + 8, y - 8 - armWave, 1.2).fill({ color: COL_SKIN });

    // Neck
    g.rect(x - 1.5, y - 16.5, 3, 3).fill({ color: COL_SKIN });

    // Head
    g.circle(x, y - 19, 5).fill({ color: COL_SKIN });
    // Eyes (mischievous)
    g.circle(x - 1.5, y - 19.5, 1).fill({ color: 0x222222 });
    g.circle(x + 1.5, y - 19.5, 1).fill({ color: 0x222222 });
    g.circle(x - 1.5, y - 19.8, 0.3).fill({ color: 0xffffff }); // glint
    g.circle(x + 1.5, y - 19.8, 0.3).fill({ color: 0xffffff });
    // Raised eyebrows
    g.moveTo(x - 3, y - 21.5)
      .bezierCurveTo(x - 2, y - 22.5, x - 1, y - 22, x - 0.5, y - 21)
      .stroke({ color: 0x664422, width: 0.6 });
    g.moveTo(x + 3, y - 21.5)
      .bezierCurveTo(x + 2, y - 22.5, x + 1, y - 22, x + 0.5, y - 21)
      .stroke({ color: 0x664422, width: 0.6 });
    // Wide grin
    g.moveTo(x - 2.5, y - 17.5)
      .bezierCurveTo(x - 1, y - 16, x + 1, y - 16, x + 2.5, y - 17.5)
      .stroke({ color: 0x884444, width: 0.7 });
    // Rosy cheeks
    g.circle(x - 3.5, y - 18, 1.5).fill({ color: 0xff6666, alpha: 0.25 });
    g.circle(x + 3.5, y - 18, 1.5).fill({ color: 0xff6666, alpha: 0.25 });
    // Nose (red clown nose)
    g.circle(x, y - 18.5, 1.2).fill({ color: 0xcc3333 });

    // Jester hat (three-pronged with bells)
    // Left prong
    g.moveTo(x - 4, y - 23)
      .bezierCurveTo(
        x - 8,
        y - 26 + bobble,
        x - 10,
        y - 24 + bobble,
        x - 9,
        y - 22 + bobble,
      )
      .lineTo(x - 3, y - 22)
      .closePath()
      .fill({ color: COL_JESTER1 });
    g.circle(x - 9, y - 22 + bobble, 1.5).fill({ color: COL_JESTER_BELL });
    // Center prong
    g.moveTo(x - 1, y - 23)
      .bezierCurveTo(
        x,
        y - 30 + bobble * 0.5,
        x + 1,
        y - 30 + bobble * 0.5,
        x + 1,
        y - 23,
      )
      .closePath()
      .fill({ color: COL_JESTER2 });
    g.circle(x, y - 30 + bobble * 0.5, 1.5).fill({ color: COL_JESTER_BELL });
    // Right prong
    g.moveTo(x + 4, y - 23)
      .bezierCurveTo(
        x + 8,
        y - 26 - bobble,
        x + 10,
        y - 24 - bobble,
        x + 9,
        y - 22 - bobble,
      )
      .lineTo(x + 3, y - 22)
      .closePath()
      .fill({ color: COL_JESTER1 });
    g.circle(x + 9, y - 22 - bobble, 1.5).fill({ color: COL_JESTER_BELL });
    // Hat band
    g.moveTo(x - 5, y - 23)
      .lineTo(x + 5, y - 23)
      .stroke({ color: COL_JESTER_BELL, width: 1 });
  }

  private _drawBall(g: Graphics, x: number, y: number): void {
    g.circle(x, y, 4)
      .fill({ color: 0xffaa00 })
      .stroke({ color: 0xcc8800, width: 1 });
    // Stripe
    g.moveTo(x - 3, y)
      .bezierCurveTo(x - 2, y - 3, x + 2, y - 3, x + 3, y)
      .stroke({ color: 0xff4400, width: 1 });
    // Highlight
    g.circle(x - 1, y - 1.5, 1).fill({ color: 0xffffff, alpha: 0.4 });
  }

  // ── Pigeons ────────────────────────────────────────────────────────────────

  private _updatePigeons(t: number): void {
    const p1 = this._pigeon1Gfx;
    const p2 = this._pigeon2Gfx;
    p1.clear();
    p2.clear();

    // Pigeons sit on the third stone from left (gateX + 24)
    const wallY = 60;
    const stoneY = wallY - 28;
    const pigeon1BaseX = 132;
    const pigeon1BaseY = stoneY - 2;
    const pigeon2BaseX = 140;
    const pigeon2BaseY = stoneY + 2;

    // Pigeon 1: mostly sits, occasionally flaps wings or turns head
    const p1State = Math.floor(t * 0.8) % 5;
    // Sometimes face center (left towards center at x=128)
    const p1FaceCenter = Math.sin(t * 0.5) > 0.3;
    if (p1State === 0) {
      // Sitting still
      this._drawPigeon(
        p1,
        pigeon1BaseX,
        pigeon1BaseY,
        0,
        0,
        false,
        p1FaceCenter,
      );
    } else if (p1State === 1) {
      // Slight movement
      const hop = Math.sin(t * 8) * 0.5;
      this._drawPigeon(
        p1,
        pigeon1BaseX,
        pigeon1BaseY - hop,
        0,
        0,
        false,
        p1FaceCenter,
      );
    } else if (p1State === 2) {
      // Flapping wings
      const flap = Math.sin(t * 20) * 2;
      this._drawPigeon(
        p1,
        pigeon1BaseX,
        pigeon1BaseY,
        flap,
        0,
        true,
        p1FaceCenter,
      );
    } else if (p1State === 3) {
      // Turning head
      const headTurn = Math.sin(t * 3) * 0.3;
      this._drawPigeon(
        p1,
        pigeon1BaseX,
        pigeon1BaseY,
        0,
        headTurn,
        false,
        p1FaceCenter,
      );
    } else {
      // Facing center
      this._drawPigeon(p1, pigeon1BaseX, pigeon1BaseY, 0, 0, false, true);
    }

    // Pigeon 2: slightly offset timing
    const p2State = Math.floor((t + 1.5) * 0.7) % 5;
    const p2FaceCenter = Math.sin(t * 0.4 + 1) > 0.3;
    if (p2State === 0) {
      this._drawPigeon(
        p2,
        pigeon2BaseX,
        pigeon2BaseY,
        0,
        0,
        false,
        p2FaceCenter,
        true,
      );
    } else if (p2State === 1) {
      const hop = Math.sin((t + 1.5) * 7) * 0.5;
      this._drawPigeon(
        p2,
        pigeon2BaseX,
        pigeon2BaseY - hop,
        0,
        0,
        false,
        p2FaceCenter,
        true,
      );
    } else if (p2State === 2) {
      const flap = Math.sin((t + 1.5) * 18) * 2;
      this._drawPigeon(
        p2,
        pigeon2BaseX,
        pigeon2BaseY,
        flap,
        0,
        true,
        p2FaceCenter,
        true,
      );
    } else if (p2State === 3) {
      const headTurn = Math.sin((t + 1.5) * 2.5) * 0.3;
      this._drawPigeon(
        p2,
        pigeon2BaseX,
        pigeon2BaseY,
        0,
        headTurn,
        false,
        p2FaceCenter,
        true,
      );
    } else {
      // Facing center (right side pigeon faces center = left)
      this._drawPigeon(p2, pigeon2BaseX, pigeon2BaseY, 0, 0, false, true, true);
    }
  }

  private _drawPigeon(
    g: Graphics,
    x: number,
    y: number,
    wingFlap: number,
    headTurn: number,
    isFlapping: boolean,
    faceCenter: boolean = false,
    isRightSide: boolean = false,
  ): void {
    // Determine direction: faceCenter means pigeon faces toward center (x=128)
    // For left side pigeon (x > 128), faceCenter = face left
    // For right side pigeon (x > 128), faceCenter = face left (toward center)
    const facingLeft = isRightSide ? faceCenter : faceCenter;

    // Body (oval)
    const bodyOffsetX = facingLeft ? -1 : 1;
    g.ellipse(x + bodyOffsetX, y - 3, 5, 4).fill({ color: COL_PIGEON });
    g.ellipse(x + bodyOffsetX, y - 3, 4, 3).fill({ color: COL_PIGEON_DK });

    // Head - position based on facing direction
    const headX = facingLeft ? x - 2 + headTurn * 2 : x + 2 + headTurn * 2;
    g.circle(headX, y - 7, 2.5).fill({ color: COL_PIGEON });

    // Eye - position based on facing direction
    const eyeOffsetX = facingLeft ? -0.8 : 0.8;
    g.circle(headX + eyeOffsetX, y - 7.5, 0.6).fill({ color: 0x000000 });
    g.circle(headX + eyeOffsetX + 0.1, y - 7.6, 0.2).fill({ color: 0xffffff });

    // Beak - position based on facing direction
    const beakDir = facingLeft ? 1 : -1;
    g.moveTo(headX + beakDir * 1.5, y - 7)
      .lineTo(headX + beakDir * 3, y - 6.5)
      .lineTo(headX + beakDir * 1.5, y - 6)
      .closePath()
      .fill({ color: COL_PIGEON_BEAK });

    // Wing (or flapping wing)
    const wingOffsetX = facingLeft ? 2 : -2;
    if (isFlapping && wingFlap !== 0) {
      // Wing raised up
      g.ellipse(x + wingOffsetX, y - 5 + wingFlap, 4, 2).fill({
        color: COL_PIGEON_DK,
      });
    } else {
      // Wing folded
      g.ellipse(x + wingOffsetX, y - 4, 4, 2.5).fill({ color: COL_PIGEON_DK });
    }

    // Tail - opposite to facing direction
    const tailOffsetX = facingLeft ? 4 : -4;
    g.ellipse(x - tailOffsetX, y - 2, 2.5, 1.5).fill({ color: COL_PIGEON_DK });

    // Legs (tiny)
    g.moveTo(x - 1, y)
      .lineTo(x - 1, y + 2)
      .stroke({ color: COL_PIGEON_LEG, width: 0.5 });
    g.moveTo(x + 1, y)
      .lineTo(x + 1, y + 2)
      .stroke({ color: COL_PIGEON_LEG, width: 0.5 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
