// Procedural renderer for the Faction Hall building (2×2 tiles, 128×128 px).
//
// Visual concept: a grand stone hall with a large heraldic banner/crest above
// the entrance — a neutral version that can be recolored per-owner.
// Simple animated waving banner.

import { Container, Graphics } from "pixi.js";
import type { PlayerId } from "@/types";

const TS = 64;
const BW = 2 * TS;  // 128
const BH = 2 * TS;  // 128

// Colour palette
const COL_STONE      = 0x706858;
const COL_STONE_LT   = 0x9a8870;
const COL_STONE_DK   = 0x4a3c30;
const COL_MORTAR     = 0x3a3028;
const COL_ROOF       = 0x2a4a6a;   // dark slate-blue roof
const COL_ROOF_HI    = 0x3a6080;
const COL_DOOR       = 0x3a2010;
const COL_DOOR_ARCH  = 0x806040;
const COL_WINDOW     = 0x8899bb;
const COL_WINDOW_GLD = 0xffd060;
const COL_BANNER_P1  = 0x4466cc;
const COL_BANNER_P2  = 0xcc4444;
const COL_BANNER_NEU = 0x888844;
const COL_BANNER_TRM = 0xffd700;
const COL_PILLAR     = 0x887060;

const FLAG_SPEED = 2.5;

export class FactionHallRenderer {
  readonly container = new Container();

  private _banner: Graphics = new Graphics();
  private _bannerTime = 0;
  private _ownerColor: number;

  constructor(owner: PlayerId | null) {
    this._ownerColor = owner === "p1" ? COL_BANNER_P1
                     : owner === "p2" ? COL_BANNER_P2
                     : COL_BANNER_NEU;

    this._drawBuilding();
    this.container.addChild(this._banner);
    this._drawBanner(0);
  }

  tick(dt: number): void {
    this._bannerTime += dt;
    this._drawBanner(this._bannerTime);
  }

  // ---------------------------------------------------------------------------
  // Static geometry
  // ---------------------------------------------------------------------------

  private _drawBuilding(): void {
    const g = new Graphics();

    // Ground / base
    g.fill({ color: COL_STONE_DK });
    g.rect(4, BH - 12, BW - 8, 12);

    // Main hall body
    g.fill({ color: COL_STONE });
    g.rect(8, 38, BW - 16, BH - 50);

    // Stone highlight (left)
    g.fill({ color: COL_STONE_LT });
    g.rect(8, 38, 6, BH - 50);

    // Mortar lines (horizontal)
    g.fill({ color: COL_MORTAR });
    for (let y = 48; y < BH - 14; y += 12) {
      g.rect(8, y, BW - 16, 1);
    }
    // Mortar lines (vertical — offset rows)
    for (let row = 0; row < 8; row++) {
      const xOff = (row % 2 === 0) ? 0 : 16;
      for (let x = 8 + xOff; x < BW - 8; x += 32) {
        g.rect(x, 38 + row * 12, 1, 12);
      }
    }

    // Roof (gabled)
    g.fill({ color: COL_ROOF });
    g.moveTo(4, 38).lineTo(BW / 2, 10).lineTo(BW - 4, 38).fill();
    g.fill({ color: COL_ROOF_HI });
    g.moveTo(BW / 2, 10).lineTo(BW - 4, 38).lineTo(BW - 8, 38).lineTo(BW / 2, 14).fill();

    // Ridge beam
    g.fill({ color: COL_STONE_DK });
    g.rect(BW / 2 - 1, 9, 2, 4);

    // Two pillars flanking door
    g.fill({ color: COL_PILLAR });
    g.rect(20, 60, 8, BH - 72);
    g.rect(BW - 28, 60, 8, BH - 72);
    g.fill({ color: COL_STONE_LT });
    g.rect(21, 60, 2, BH - 72);

    // Door arch
    g.fill({ color: COL_DOOR_ARCH });
    g.arc(BW / 2, 80, 16, Math.PI, 0);
    g.lineTo(BW / 2 + 16, 100);
    g.lineTo(BW / 2 - 16, 100);
    g.closePath().fill();

    // Door
    g.fill({ color: COL_DOOR });
    g.rect(BW / 2 - 10, 80, 20, 36);

    // Door handle
    g.fill({ color: COL_BANNER_TRM });
    g.circle(BW / 2 + 6, 98, 2);

    // Windows (two, above door)
    for (const wx of [32, BW - 44]) {
      g.fill({ color: COL_WINDOW });
      g.roundRect(wx, 50, 14, 18, 3);
      g.fill({ color: COL_WINDOW_GLD });
      g.rect(wx + 7, 50, 1, 18);
      g.rect(wx, 59, 14, 1);
    }

    this.container.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Animated banner (on rooftop pole)
  // ---------------------------------------------------------------------------

  private _drawBanner(t: number): void {
    const b = this._banner;
    b.clear();

    // Flagpole
    b.stroke({ color: COL_STONE_DK, width: 2 });
    b.moveTo(BW / 2, 2).lineTo(BW / 2, 20);

    // Banner wave
    const wave = Math.sin(t * FLAG_SPEED * Math.PI * 2) * 3;
    const bx = BW / 2;
    const by = 4;
    const bw = 18;
    const bh = 10;

    b.fill({ color: this._ownerColor });
    b.moveTo(bx, by)
     .lineTo(bx + bw, by + wave)
     .lineTo(bx + bw, by + bh + wave)
     .lineTo(bx, by + bh)
     .fill();

    // Trim
    b.stroke({ color: COL_BANNER_TRM, width: 1 });
    b.moveTo(bx, by).lineTo(bx + bw, by + wave).lineTo(bx + bw, by + bh + wave).lineTo(bx, by + bh);
  }
}
