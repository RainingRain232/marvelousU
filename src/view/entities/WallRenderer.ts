// Procedural wall renderer for BuildingView.
//
// Draws a detailed 1×3 tile (64×192) medieval stone fortification wall with:
//   • Thick ashlar stone wall with brick pattern, mortar, stone variation
//   • Crenellated battlements with proper merlons and crenels (gaps)
//   • Arrow slits in merlons, murder holes on parapet
//   • Reinforced wooden gate/door with iron bands, ring pull, studs
//   • Stone arch above door with voussoirs and keystone
//   • Buttress/pilaster on each side with carved bases
//   • Two wall-mounted iron torch brackets with flickering flames & glow
//   • Moss on lower courses, ivy creeping up one side
//   • Weathering: cracks, chipped stones, soot marks near torches
//   • Rat scurrying along base (animated)
//   • Lookout sentry on parapet (helmet, spear tip visible)
//   • Rising animation on placement (wall slides up from ground)
//
// All drawing uses PixiJS Graphics. 1×TILE_SIZE wide, 3×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const WW = 1 * TS;  // 64px wide
const WH = 3 * TS;  // 192px tall

// --- Palette ---
const COL_STONE = 0x7a756d;
const COL_STONE_DK = 0x5a554d;
const COL_STONE_LT = 0x9a9688;
const COL_MORTAR = 0x6a655d;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_MOSS = 0x3a5a2a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_TORCH = 0xff6622;
const COL_TORCH_CORE = 0xffaa44;
const COL_GLOW = 0xffaa44;
const COL_CRACK = 0x4a4540;
const COL_SOOT = 0x3a3530;
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_SPEAR_TIP = 0xccccdd;
const COL_RAT = 0x6a5a4a;
const COL_RAT_DK = 0x4a3a2a;

// Animation timing
const TORCH_FLICKER = 8.0;
const RAT_SPEED = 0.6;
const SENTRY_SWAY = 1.8;

// ---------------------------------------------------------------------------
// WallRenderer
// ---------------------------------------------------------------------------

export class WallRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _wall = new Graphics();       // Stone wall, buttresses, door
  private _details = new Graphics();    // Moss, ivy, cracks, weathering
  private _torches = new Graphics();    // Torch flames
  private _sentry = new Graphics();     // Lookout sentry on parapet
  private _rat = new Graphics();        // Scurrying rat

  private _time = 0;
  private _wallY = WH;
  private _targetY = 0;
  private _rising = true;

  constructor() {
    this._drawWall();
    this._drawDetails();

    this.container.addChild(this._wall);
    this.container.addChild(this._details);
    this.container.addChild(this._torches);
    this.container.addChild(this._sentry);
    this.container.addChild(this._rat);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // Rising animation
    if (this._rising) {
      this._wallY -= dt * 120;
      if (this._wallY <= this._targetY) {
        this._wallY = this._targetY;
        this._rising = false;
      }
      this._wall.position.y = this._wallY;
      this._details.position.y = this._wallY;
      this._torches.position.y = this._wallY;
      this._sentry.position.y = this._wallY;
      this._rat.position.y = this._wallY;
    }

    this._updateTorches(this._time);
    this._updateSentry(this._time);
    this._updateRat(this._time);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Main wall structure
  // =========================================================================

  private _drawWall(): void {
    const g = this._wall;

    const bx = 6;
    const bw = WW - 12;
    const by = 0;
    const bh = WH;

    // ── Foundation / base stones (darker, larger) ──
    g.rect(bx - 2, bh - 20, bw + 4, 20).fill({ color: COL_STONE_DK });
    g.rect(bx - 2, bh - 20, bw + 4, 20).stroke({ color: COL_STONE_DK, width: 0.5 });
    // Foundation block lines
    for (let i = 0; i < 3; i++) {
      const fy = bh - 18 + i * 7;
      g.moveTo(bx - 2, fy).lineTo(bx + bw + 2, fy).stroke({ color: COL_MORTAR, width: 0.5 });
    }

    // ── Main wall body ──
    g.rect(bx, by + 10, bw, bh - 30).fill({ color: COL_STONE });
    g.rect(bx, by + 10, bw, bh - 30).stroke({ color: COL_STONE_DK, width: 1 });

    // ── Ashlar brick pattern ──
    const brickH = 12;
    const rows = Math.floor((bh - 30) / brickH);
    for (let row = 0; row < rows; row++) {
      const yy = by + 10 + row * brickH;
      // Horizontal mortar
      g.moveTo(bx, yy).lineTo(bx + bw, yy).stroke({ color: COL_MORTAR, width: 0.5 });
      // Vertical mortar (offset rows)
      const xOff = row % 2 === 0 ? 0 : 12;
      for (let x = bx + xOff; x < bx + bw; x += 24) {
        g.moveTo(x, yy).lineTo(x, yy + brickH).stroke({ color: COL_MORTAR, width: 0.4 });
      }
    }

    // ── Stone variation (subtle colour patches) ──
    for (let i = 0; i < 8; i++) {
      const sx = bx + 3 + ((i * 31 + 7) % (bw - 6));
      const sy = by + 14 + ((i * 47 + 13) % (bh - 50));
      const sw = 6 + (i % 3) * 3;
      const sh = 5 + (i % 2) * 3;
      const col = i % 3 === 0 ? COL_STONE_LT : COL_STONE_DK;
      g.rect(sx, sy, sw, sh).fill({ color: col, alpha: 0.2 });
    }

    // ── Left buttress/pilaster ──
    g.rect(bx - 4, by + 20, 6, bh - 40).fill({ color: COL_STONE_DK });
    g.rect(bx - 4, by + 20, 2, bh - 40).fill({ color: COL_STONE });
    // Buttress cap
    g.rect(bx - 5, by + 18, 8, 3).fill({ color: COL_STONE_LT });
    // Buttress base
    g.rect(bx - 5, bh - 22, 8, 3).fill({ color: COL_STONE_LT });

    // ── Right buttress/pilaster ──
    g.rect(bx + bw - 2, by + 20, 6, bh - 40).fill({ color: COL_STONE_DK });
    g.rect(bx + bw + 2, by + 20, 2, bh - 40).fill({ color: COL_STONE });
    g.rect(bx + bw - 3, by + 18, 8, 3).fill({ color: COL_STONE_LT });
    g.rect(bx + bw - 3, bh - 22, 8, 3).fill({ color: COL_STONE_LT });

    // ── Crenellated battlements ──
    const merlonW = 10;
    const merlonH = 10;
    const crenelW = 8;
    // Parapet walk
    g.rect(bx - 4, by + 8, bw + 8, 4).fill({ color: COL_STONE_LT });
    g.rect(bx - 4, by + 8, bw + 8, 4).stroke({ color: COL_STONE_DK, width: 0.3 });

    // Merlons
    const merlons = [
      { x: bx - 2 },
      { x: bx + bw - merlonW + 2 },
    ];
    for (const m of merlons) {
      g.rect(m.x, by - 2, merlonW, merlonH + 2)
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Arrow slit in merlon
      g.rect(m.x + merlonW / 2 - 1, by + 1, 2, 5).fill({ color: COL_IRON_DK });
      g.rect(m.x + merlonW / 2 - 2.5, by + 3, 5, 1).fill({ color: COL_IRON_DK });
      // Stone cap on merlon
      g.rect(m.x - 1, by - 3, merlonW + 2, 2).fill({ color: COL_STONE });
    }

    // Centre crenel (gap between merlons)
    // Crenel floor visible
    g.rect(bx + merlonW - 2, by + 8, crenelW + 4, 2).fill({ color: COL_STONE_DK });
    // Murder hole
    g.circle(WW / 2, by + 9, 2).fill({ color: 0x1a1a1a });

    // ── Stone arch above door ──
    const doorCx = WW / 2;
    const doorTopY = bh - 72;
    const archR = 10;
    // Voussoir stones
    for (let i = 0; i < 5; i++) {
      const a = Math.PI + (i / 4) * Math.PI;
      const a2 = Math.PI + ((i + 1) / 4) * Math.PI;
      g.moveTo(doorCx + Math.cos(a) * (archR - 3), doorTopY + Math.sin(a) * (archR - 3))
        .lineTo(doorCx + Math.cos(a) * archR, doorTopY + Math.sin(a) * archR)
        .lineTo(doorCx + Math.cos(a2) * archR, doorTopY + Math.sin(a2) * archR)
        .lineTo(doorCx + Math.cos(a2) * (archR - 3), doorTopY + Math.sin(a2) * (archR - 3))
        .closePath()
        .fill({ color: i % 2 === 0 ? COL_STONE_LT : COL_STONE })
        .stroke({ color: COL_MORTAR, width: 0.3 });
    }
    // Keystone
    g.moveTo(doorCx - 2, doorTopY - archR - 1)
      .lineTo(doorCx + 2, doorTopY - archR - 1)
      .lineTo(doorCx + 1.5, doorTopY - archR + 3)
      .lineTo(doorCx - 1.5, doorTopY - archR + 3)
      .closePath()
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });

    // ── Reinforced wooden gate ──
    const doorW = 16;
    const doorH = 42;
    const doorX = WW / 2 - doorW / 2;
    const doorY = bh - doorH - 20;

    // Door recess
    g.rect(doorX - 1, doorY, doorW + 2, doorH + 1).fill({ color: 0x1a1208 });

    // Oak door planks
    g.rect(doorX, doorY, doorW, doorH).fill({ color: COL_WOOD });
    // Vertical planks
    for (let i = 0; i < 3; i++) {
      g.rect(doorX + 2 + i * 5, doorY + 2, 4, doorH - 4).fill({ color: COL_WOOD_LT });
      g.rect(doorX + 2 + i * 5, doorY + 2, 4, doorH - 4).stroke({ color: COL_WOOD_DK, width: 0.3 });
    }

    // Iron bands (horizontal reinforcements)
    for (let i = 0; i < 4; i++) {
      const bandY = doorY + 4 + i * 10;
      g.rect(doorX, bandY, doorW, 2).fill({ color: COL_IRON });
      // Corner studs
      g.circle(doorX + 2, bandY + 1, 1).fill({ color: COL_IRON_DK });
      g.circle(doorX + doorW - 2, bandY + 1, 1).fill({ color: COL_IRON_DK });
    }

    // Iron ring pull
    g.circle(doorX + doorW - 5, doorY + doorH / 2, 2.5)
      .stroke({ color: COL_IRON, width: 1 });
    g.circle(doorX + doorW - 5, doorY + doorH / 2 - 2.5, 0.8)
      .fill({ color: COL_IRON_DK });

    // Door threshold
    g.rect(doorX - 2, doorY + doorH, doorW + 4, 3)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_MORTAR, width: 0.3 });

    // ── Torch brackets (iron, on wall face) ──
    for (const tx of [bx + 3, bx + bw - 6]) {
      const ty = by + 40;
      g.rect(tx, ty, 3, 2).fill({ color: COL_IRON });
      g.rect(tx, ty - 8, 3, 10).fill({ color: COL_IRON_DK });
      g.rect(tx + 0.5, ty - 10, 2, 3).fill({ color: COL_WOOD_DK });
    }
  }

  // =========================================================================
  // Details — moss, ivy, cracks, weathering
  // =========================================================================

  private _drawDetails(): void {
    const g = this._details;

    const bx = 6;
    const bw = WW - 12;

    // ── Moss on lower courses ──
    this._drawMoss(g, bx + 2, WH - 22, 8);
    this._drawMoss(g, bx + bw - 12, WH - 20, 6);
    this._drawMoss(g, bx + 4, WH - 42, 4);

    // ── Ivy creeping up left side ──
    this._drawIvy(g, bx + 1, 30, 80);

    // ── Cracks in stone ──
    // Crack 1 (diagonal, mid-wall)
    g.moveTo(bx + 8, 60)
      .lineTo(bx + 12, 68)
      .lineTo(bx + 10, 75)
      .stroke({ color: COL_CRACK, width: 0.6 });
    // Crack 2 (small, near door)
    g.moveTo(bx + bw - 6, 100)
      .lineTo(bx + bw - 4, 106)
      .stroke({ color: COL_CRACK, width: 0.5 });
    // Crack 3 (hairline, upper)
    g.moveTo(bx + 14, 35)
      .lineTo(bx + 18, 42)
      .lineTo(bx + 16, 46)
      .stroke({ color: COL_CRACK, width: 0.3 });

    // ── Chipped stone patches ──
    g.rect(bx + 3, 50, 4, 3).fill({ color: COL_STONE_DK, alpha: 0.4 });
    g.rect(bx + bw - 8, 80, 5, 3).fill({ color: COL_STONE_DK, alpha: 0.3 });

    // ── Soot marks near torch positions ──
    g.ellipse(bx + 4, 28, 4, 6).fill({ color: COL_SOOT, alpha: 0.15 });
    g.ellipse(bx + bw - 5, 28, 4, 6).fill({ color: COL_SOOT, alpha: 0.15 });

    // ── Weathering stains (water streaks) ──
    g.moveTo(bx + 16, 14).lineTo(bx + 15, 50).stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.2 });
    g.moveTo(bx + bw - 10, 14).lineTo(bx + bw - 11, 55).stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.2 });
  }

  // =========================================================================
  // Torch flames (animated)
  // =========================================================================

  private _updateTorches(time: number): void {
    const g = this._torches;
    g.clear();

    const bx = 6;
    const bw = WW - 12;

    const positions = [
      { x: bx + 4, y: 30 },
      { x: bx + bw - 5, y: 30 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const pos = positions[i];
      const flick = Math.sin(time * TORCH_FLICKER + i * 2.5);
      const flick2 = Math.cos(time * TORCH_FLICKER * 1.3 + i * 1.7);

      // Outer flame
      const fh = 6 + flick * 1.5;
      g.moveTo(pos.x - 2, pos.y)
        .quadraticCurveTo(pos.x + flick2 * 0.8, pos.y - fh, pos.x + 2, pos.y)
        .fill({ color: COL_TORCH, alpha: 0.85 });

      // Inner flame
      g.moveTo(pos.x - 1, pos.y)
        .quadraticCurveTo(pos.x - flick2 * 0.4, pos.y - fh + 2, pos.x + 1, pos.y)
        .fill({ color: COL_TORCH_CORE });

      // Core
      g.circle(pos.x, pos.y - 2, 1).fill({ color: 0xffffff, alpha: 0.5 });

      // Glow halo
      g.circle(pos.x, pos.y - 2, 8).fill({
        color: COL_GLOW,
        alpha: 0.06 + flick * 0.02,
      });

      // Sparks (2 per torch)
      for (let s = 0; s < 2; s++) {
        const sparkPhase = (time * 1.5 + i * 1.2 + s * 0.7) % 1.5;
        if (sparkPhase > 1.0) continue;
        const rise = sparkPhase * 10;
        const drift = Math.sin(time * 3 + s * 4 + i) * 2;
        const alpha = 0.6 * (1 - sparkPhase);
        g.circle(pos.x + drift, pos.y - 4 - rise, 0.5).fill({
          color: 0xffcc00,
          alpha,
        });
      }
    }
  }

  // =========================================================================
  // Sentry on parapet (lookout)
  // =========================================================================

  private _updateSentry(time: number): void {
    const g = this._sentry;
    g.clear();

    const sx = WW / 2;
    const sy = 6;
    const sway = Math.sin(time * SENTRY_SWAY) * 0.5;

    // Only visible above merlons — just helmet and spear tip
    // Helmet dome
    g.arc(sx + sway, sy, 4, Math.PI, 0).fill({ color: COL_ARMOR_DK });
    g.rect(sx - 4 + sway, sy, 8, 3).fill({ color: COL_ARMOR });
    // Helmet visor slit
    g.rect(sx - 2.5 + sway, sy + 1, 5, 1).fill({ color: 0x1a1a1a });
    // Nose guard
    g.rect(sx - 0.3 + sway, sy, 0.6, 2.5).fill({ color: COL_ARMOR_DK });

    // Spear tip poking up beside helmet
    const spearX = sx + 6;
    g.moveTo(spearX, sy + 4).lineTo(spearX, sy - 8).stroke({ color: COL_WOOD_DK, width: 1.2 });
    g.moveTo(spearX - 1.5, sy - 8)
      .lineTo(spearX, sy - 13)
      .lineTo(spearX + 1.5, sy - 8)
      .closePath()
      .fill({ color: COL_SPEAR_TIP });
  }

  // =========================================================================
  // Scurrying rat
  // =========================================================================

  private _updateRat(time: number): void {
    const g = this._rat;
    g.clear();

    // Rat runs back and forth along the base
    const cycle = (time * RAT_SPEED) % 4.0;
    let rx: number;
    let dir: number;
    if (cycle < 2.0) {
      // Moving right
      rx = 8 + (cycle / 2.0) * (WW - 24);
      dir = 1;
    } else {
      // Moving left
      rx = WW - 16 - ((cycle - 2.0) / 2.0) * (WW - 24);
      dir = -1;
    }
    const ry = WH - 22;

    // Legs (scurry animation)
    const legPhase = Math.sin(time * 16) * 1.5;
    g.moveTo(rx - 1, ry + 2).lineTo(rx - 2 + legPhase * 0.3, ry + 4)
      .stroke({ color: COL_RAT_DK, width: 0.4 });
    g.moveTo(rx + 1, ry + 2).lineTo(rx + 2 - legPhase * 0.3, ry + 4)
      .stroke({ color: COL_RAT_DK, width: 0.4 });

    // Body
    g.ellipse(rx, ry, 3.5, 2).fill({ color: COL_RAT });
    // Belly
    g.ellipse(rx, ry + 0.5, 2.5, 1).fill({ color: COL_RAT_DK });

    // Head
    g.ellipse(rx + dir * 3.5, ry - 0.5, 2, 1.5).fill({ color: COL_RAT });
    // Ear
    g.circle(rx + dir * 2.5, ry - 2, 1).fill({ color: COL_RAT_DK });
    // Eye
    g.circle(rx + dir * 4.5, ry - 1, 0.5).fill({ color: 0x111111 });
    // Nose
    g.circle(rx + dir * 5.5, ry, 0.4).fill({ color: 0xff8888 });
    // Whiskers
    g.moveTo(rx + dir * 5, ry).lineTo(rx + dir * 7, ry - 1).stroke({ color: COL_RAT_DK, width: 0.2 });
    g.moveTo(rx + dir * 5, ry + 0.5).lineTo(rx + dir * 7, ry + 1).stroke({ color: COL_RAT_DK, width: 0.2 });

    // Tail
    g.moveTo(rx - dir * 3, ry)
      .quadraticCurveTo(rx - dir * 6, ry - 2, rx - dir * 8, ry + 1)
      .stroke({ color: COL_RAT_DK, width: 0.5 });
  }

  // =========================================================================
  // Helpers
  // =========================================================================

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    for (let i = 0; i < w; i++) {
      const h = 1 + Math.sin(i * 2.3) * 1.5;
      g.rect(x + i * 1.2, y - h, 1.2, h + 0.5).fill({ color: COL_MOSS, alpha: 0.55 });
    }
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    // Main vine
    for (let i = 0; i < h; i++) {
      const dx = Math.sin(i * 0.8) * 2;
      g.rect(x + dx, y + i, 1, 1.5).fill({ color: COL_IVY, alpha: 0.6 });
    }
    // Leaves
    for (let i = 3; i < h; i += 4) {
      const dx = Math.sin(i * 0.8) * 2;
      const leafDir = i % 8 < 4 ? -1 : 1;
      g.ellipse(x + dx + leafDir * 2.5, y + i, 2, 1.5).fill({ color: COL_IVY_LT, alpha: 0.5 });
    }
  }
}
