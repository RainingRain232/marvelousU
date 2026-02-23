// Front-view Royal Stable (Phase 1 Front Elevation)
// -------------------------------------------------
// Renders a decorative front facade: central tower, kennel fence with horse necks,
// right-side gate, lanterns along the fence, and banners on the tower.
// Footprint: 2x2 tiles (128x128 px at 64px tile size).

import { Container, Graphics } from "pixi.js";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { GamePhase } from "@/types";

// Ornate color accents for front view
const COL_WALL_DK = 0xb0894a;
const COL_STONE = 0x9e9e9e;
const COL_STONE_LT = 0xcfcfcf;
const COL_MORTAR = 0xd8d8d8;
// COL_ASH kept for potential crest shading; currently unused

export class FrontViewStablesRenderer {
  readonly container = new Container();
  private _time = 0;
  private _ownerColor: number;

  // Front elements
  private _wall: Graphics = new Graphics();
  private _tower: Graphics = new Graphics();
  private _gate: Graphics = new Graphics();
  private _kennelFence: Graphics = new Graphics();
  private _kennelNecks: Graphics = new Graphics();
  private _lanterns: Graphics = new Graphics();
  private _ambientGlow: Graphics = new Graphics();
  private _banner: Graphics = new Graphics();
  private _crest: Graphics = new Graphics();

  // Constants
  private _PW: number;
  private _PH: number;

  constructor(owner: string | null) {
    const tile = BalanceConfig.TILE_SIZE;
    this._PW = 2 * tile;
    this._PH = 2 * tile;
    this._ownerColor = owner === "p1" ? 0x4488ff : 0xff4444;

    // Build components (front elevation)
    this._drawWallBase();
    this._drawKennelsAndGate();
    this._drawTowerAndBanner();
    this._drawLanterns();
    // Ambient glow behind the wall
    this.container.addChild(this._ambientGlow);
    this._drawAmbientGlow();

    // Assemble in render order
    this.container.addChild(this._wall);
    this.container.addChild(this._crest);
    this.container.addChild(this._kennelFence);
    this.container.addChild(this._kennelNecks);
    this.container.addChild(this._gate);
    this.container.addChild(this._tower);
    this.container.addChild(this._banner);
    this.container.addChild(this._lanterns);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    // Banner sway
    const sway = Math.sin(this._time * 2) * 3;
    this._banner.x = this._PW / 2 - 6 + sway;
    // Lantern glow pulse handled by alpha in lantern group
    const glow = 0.6 + 0.4 * Math.abs(Math.sin(this._time * 1.5));
    this._lanterns.alpha = glow;
    // Ambient glow subtle pulsation
    this._ambientGlow.alpha = 0.4 + 0.2 * Math.abs(Math.sin(this._time * 0.6));
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // Drawing helpers
  private _drawWallBase(): void {
    // ornate stone facade with blocks and buttresses
    this._wall.clear();
    // Mosaic of two stone tones
    const blockW = 18;
    const blockH = 14;
    for (let y = 20; y < this._PH - 14; y += blockH) {
      for (let x = 6; x < this._PW - 6; x += blockW) {
        const shade =
          (Math.floor(x / blockW) + Math.floor((y - 20) / blockH)) % 2 === 0
            ? COL_STONE
            : COL_STONE_LT;
        this._wall
          .beginFill(shade)
          .drawRect(x, y, blockW - 2, blockH - 2)
          .endFill();
      }
    }
    // Subtle mortar lines overlay (decorative)
    for (let y = 40; y < this._PH - 20; y += 40) {
      this._wall
        .moveTo(6, y)
        .lineTo(this._PW - 6, y)
        .stroke({ color: COL_MORTAR, width: 1, alpha: 0.4 });
    }
    // Buttresses on sides
    this._wall
      .beginFill(COL_WALL_DK)
      .drawRect(0, 20, 12, this._PH - 40)
      .endFill();
    this._wall
      .beginFill(COL_WALL_DK)
      .drawRect(this._PW - 12, 20, 12, this._PH - 40)
      .endFill();
    // Optional subtle decorative arch/window blocks
    const archW = 22,
      archH = 14;
    this._wall
      .beginFill(0x1a1a2e)
      .drawRoundedRect(40, Math.floor(this._PH / 2) - 7, archW, archH, 6)
      .endFill();
    this._wall
      .beginFill(0x1a1a2e)
      .drawRoundedRect(
        this._PW - 40 - archW,
        Math.floor(this._PH / 2) - 7,
        archW,
        archH,
        6,
      )
      .endFill();
  }

  private _drawAmbientGlow(): void {
    const g = this._ambientGlow;
    g.clear();
    const cx = this._PW / 2;
    const cy = 40;
    g.beginFill(0xfff6e0, 0.25).drawCircle(cx, cy, 60).endFill();
    g.beginFill(0xfff6e0, 0.15).drawCircle(cx, cy, 100).endFill();
  }

  private _drawKennelsAndGate(): void {
    // Kennels left: fence embedded into wall
    this._kennelFence.clear();
    this._kennelFence.lineStyle(4, 0x8b5a2b, 1);
    this._kennelFence
      .moveTo(6, this._PH - 40)
      .lineTo(this._PW / 2 - 8, this._PH - 40);
    this._kennelFence
      .moveTo(6, this._PH - 60)
      .lineTo(this._PW / 2 - 8, this._PH - 60);
    this._kennelFence.moveTo(6, this._PH - 40).lineTo(6, this._PH - 60);

    // Kennel neck peeks as arcs (simplified)
    this._kennelNecks.clear();
    this._kennelNecks.lineStyle(3, 0x8b5a2b, 1);
    // Peek left
    this._kennelNecks
      .moveTo(20, this._PH - 60)
      .quadraticCurveTo(28, this._PH - 68, 34, this._PH - 56);
    // Peek center-right
    this._kennelNecks
      .moveTo(this._PW / 2 - 16, this._PH - 60)
      .quadraticCurveTo(
        this._PW / 2 - 8,
        this._PH - 68,
        this._PW / 2 - 2,
        this._PH - 56,
      );

    // Gate on the right wall
    this._gate.clear();
    // Simple gate rectangle for front view (no rounded corners to keep compatibility)
    this._gate
      .lineStyle(2, 0x000000, 1)
      .beginFill(0x6b4b2a)
      .drawRect(this._PW - 80, this._PH - 70, 70, 76)
      .endFill();
  }

  private _drawTowerAndBanner(): void {
    // Central tower above wall
    this._tower.clear();
    const centerX = this._PW / 2;
    const towerW = 60;
    const towerH = 90;
    this._tower
      .beginFill(0xaaaaaa)
      .drawRect(centerX - towerW / 2, 0, towerW, towerH)
      .endFill();
    // Battlements on top
    for (let i = 0; i < 6; i++) {
      this._tower
        .beginFill(0x888888)
        .drawRect(centerX - towerW / 2 + i * (towerW / 6), 0, towerW / 6 - 2, 6)
        .endFill();
    }
    // Banner on the tower (top center)
    this._banner.clear();
    this._banner
      .beginFill(this._ownerColor)
      .drawRect(centerX - 6, 4, 12, 8)
      .endFill();
    // Crest on top of tower
    this._crest.clear();
    const crestW = 14,
      crestH = 18;
    this._crest
      .beginFill(0x9c6a2a)
      .moveTo(centerX, 4)
      .lineTo(centerX - crestW / 2, 4 + crestH / 2)
      .lineTo(centerX, 4 + crestH)
      .lineTo(centerX + crestW / 2, 4 + crestH / 2)
      .closePath()
      .endFill();
  }

  private _drawLanterns(): void {
    this._lanterns.clear();
    // Left end lantern
    this._lanterns
      .beginFill(0x000000)
      .drawRect(8, this._PH - 50, 6, 10)
      .endFill?.();
    // Right end lantern
    this._lanterns
      .beginFill(0x000000)
      .drawRect(this._PW - 14, this._PH - 50, 6, 10)
      .endFill?.();
  }
}
