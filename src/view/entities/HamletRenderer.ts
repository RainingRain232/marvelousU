// Procedural hamlet renderer for BuildingView.
//
// Draws a detailed 2×2 tile cozy medieval hamlet village with:
//   • Two half-timbered thatched cottages with brick infill, shuttered windows
//   • Central inn/tavern: larger, two-storey, hanging sign with ale mug icon
//   • Stone village well with tiled roof, winch, rope, bucket
//   • Market stall with striped awning, crates, barrel, produce display
//   • Cobblestone paths winding between buildings, grass patches
//   • 3 chickens pecking (animated head-dip, wandering)
//   • 2 villagers chatting near the well (bobbing, gesturing)
//   • Merchant behind stall (waving arm, fancy vest)
//   • Chimney smoke rising from inn and cottage
//   • Flower boxes under cottage windows, potted herbs
//   • Laundry line between buildings with drying clothes
//   • Lantern by inn door with warm glow
//   • Moss on well stones, ivy on cottage walls
//   • Dog sleeping near inn entrance
//
// All drawing uses PixiJS Graphics. 2×TILE_SIZE wide, 2×TILE_SIZE tall.
// Animations driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const HW = 2 * TS; // 128px
const HH = 2 * TS; // 128px

// --- Palette ---
const COL_THATCH = 0xc4a35a;
const COL_THATCH_DK = 0x9a7a3a;
const COL_THATCH_LT = 0xd8b868;
const COL_WOOD = 0x5d3a1a;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x7a5a3a;
const COL_STONE = 0x8b8878;
const COL_STONE_DK = 0x6b6860;
const COL_STONE_LT = 0xa09d8f;
const COL_MORTAR = 0x7a7668;
const COL_STUCCO = 0xd4c4a4;
const COL_STUCCO_DK = 0xb4a484;
const COL_BRICK = 0xa06040;
const COL_BRICK_DK = 0x804828;
const COL_COBBLE = 0x8a8a7a;
const COL_COBBLE_DK = 0x6a6a5a;
const COL_GRASS = 0x4a6a3a;
const COL_GRASS_LT = 0x5a8a4a;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_GOLD = 0xffd700;
const COL_GLOW = 0xffaa44;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;

// Inn sign
const COL_SIGN = 0x6b3a15;
const COL_SIGN_GOLD = 0xffd700;
const COL_ALE = 0xcc8822;

// Character colors
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd4a880;
const COL_HAIR_BRN = 0x4a3020;
const COL_HAIR_BLD = 0xc8a060;
const COL_CLOTH_B = 0x4466aa;
const COL_CLOTH_R = 0xaa4444;
const COL_CLOTH_G = 0x44aa44;
const COL_APRON = 0xddd8c8;

// Animal colors
const COL_CHICKEN = 0xeedd99;
const COL_CHICKEN_DK = 0xccbb77;
const COL_COMB = 0xcc3333;
const COL_BEAK = 0xdd9922;
const COL_DOG = 0x8a6a40;
const COL_DOG_DK = 0x6a4a28;

// Produce
const COL_APPLE = 0xcc3333;
const COL_CHEESE = 0xddcc44;
const COL_BREAD = 0xd4a848;
const COL_BARREL = 0x6a4420;

// Flowers
const COL_FLOWER_R = 0xdd4466;
const COL_FLOWER_Y = 0xeecc33;
const COL_FLOWER_W = 0xeeeedd;

// Animation timing
const SMOKE_SPEED = 1.5;
const CHICKEN_BOB = 3.5;
const VILLAGER_BOB = 1.8;

// ---------------------------------------------------------------------------
// HamletRenderer
// ---------------------------------------------------------------------------

export class HamletRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _ground = new Graphics();      // Grass, cobblestones, paths
  private _buildings = new Graphics();   // Cottages, inn
  private _well = new Graphics();        // Village well
  private _market = new Graphics();      // Market stall, goods
  private _laundry = new Graphics();     // Laundry line (static)
  private _innSign = new Graphics();     // Swinging inn sign
  private _chickens = new Graphics();    // Pecking chickens
  private _dog = new Graphics();         // Sleeping dog
  private _villagers = new Graphics();   // Village folk
  private _smoke = new Graphics();       // Chimney smoke

  private _time = 0;

  constructor(_owner: string | null) {
    this._drawGround();
    this._drawBuildings();
    this._drawWell();
    this._drawMarket();
    this._drawLaundry();

    this.container.addChild(this._ground);
    this.container.addChild(this._buildings);
    this.container.addChild(this._well);
    this.container.addChild(this._market);
    this.container.addChild(this._laundry);
    this.container.addChild(this._innSign);
    this.container.addChild(this._chickens);
    this.container.addChild(this._dog);
    this.container.addChild(this._villagers);
    this.container.addChild(this._smoke);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    const t = this._time;

    this._updateSmoke(t);
    this._updateChickens(t);
    this._updateDog(t);
    this._updateVillagers(t);
    this._updateSign(t);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // =========================================================================
  // Ground
  // =========================================================================

  private _drawGround(): void {
    const g = this._ground;

    // Base grass
    g.rect(0, 0, HW, HH).fill({ color: COL_GRASS });

    // Grass variation patches
    for (let i = 0; i < 12; i++) {
      const gx = (i * 31 + 7) % HW;
      const gy = (i * 47 + 13) % HH;
      g.ellipse(gx, gy, 6 + (i % 3) * 2, 3 + (i % 2)).fill({ color: COL_GRASS_LT, alpha: 0.25 });
    }

    // Cobblestone paths
    this._drawCobblePath(g, 30, HH, 40, HH - 50, 14);
    this._drawCobblePath(g, 80, HH, 90, HH - 50, 12);
    this._drawCobblePath(g, 40, HH - 50, 90, HH - 50, 10);

    // Central paved area around well
    g.ellipse(64, HH - 50, 22, 14).fill({ color: COL_COBBLE });
    // Cobble detail in well area
    for (let i = 0; i < 8; i++) {
      const cx = 52 + (i % 4) * 8;
      const cy = HH - 56 + Math.floor(i / 4) * 8;
      g.roundRect(cx, cy, 6, 5, 1)
        .fill({ color: i % 3 === 0 ? COL_COBBLE_DK : COL_COBBLE })
        .stroke({ color: COL_STONE_DK, width: 0.2 });
    }
  }

  private _drawCobblePath(
    g: Graphics, x1: number, y1: number, x2: number, y2: number, w: number,
  ): void {
    const steps = 8;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      const wobble = Math.sin(i * 1.5) * 2;
      g.ellipse(x + wobble, y, w / 2 + Math.sin(i * 2) * 2, 4).fill({ color: COL_COBBLE });
    }
  }

  // =========================================================================
  // Buildings — cottages + inn
  // =========================================================================

  private _drawBuildings(): void {
    const g = this._buildings;

    // Cottage 1 (left back)
    this._drawCottage(g, 4, 30, 30, 38);

    // Cottage 2 (right back)
    this._drawCottage(g, 92, 34, 28, 34);

    // Inn/Tavern (centre back — larger)
    this._drawInn(g, 36, 18, 52, 52);
  }

  private _drawCottage(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    // ── Stucco walls ──
    g.rect(x, y, w, h).fill({ color: COL_STUCCO });
    g.rect(x, y, w, h).stroke({ color: COL_WOOD_DK, width: 0.5 });

    // ── Half-timber frame ──
    // Vertical timbers
    g.rect(x + 1, y, 2, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 3, y, 2, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w / 2 - 1, y, 2, h).fill({ color: COL_WOOD_DK });
    // Horizontal beam
    g.rect(x, y + h * 0.4, w, 2).fill({ color: COL_WOOD_DK });
    // Cross braces
    g.moveTo(x + 3, y + 2).lineTo(x + w / 2 - 1, y + h * 0.4).stroke({ color: COL_WOOD_DK, width: 1 });
    g.moveTo(x + w / 2 + 1, y + 2).lineTo(x + w - 3, y + h * 0.4).stroke({ color: COL_WOOD_DK, width: 1 });

    // ── Brick infill patches ──
    for (let row = 0; row < 2; row++) {
      for (let col = 0; col < 2; col++) {
        const bx = x + 4 + col * (w / 2);
        const by = y + 4 + row * (h * 0.2);
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) {
            g.rect(bx + c * 5 + (r % 2) * 2, by + r * 4, 4, 3).fill({
              color: (r + c) % 2 === 0 ? COL_BRICK : COL_BRICK_DK,
              alpha: 0.3,
            });
          }
        }
      }
    }

    // ── Door ──
    const dw = 8;
    const dh = 16;
    const dx = x + w / 2 - dw / 2;
    const dy = y + h - dh;
    g.rect(dx, dy, dw, dh).fill({ color: COL_WOOD });
    g.rect(dx + 1, dy + 1, dw - 2, dh - 2).fill({ color: COL_WOOD_LT });
    g.rect(dx, dy + 5, dw, 1).fill({ color: COL_IRON });
    g.rect(dx, dy + 11, dw, 1).fill({ color: COL_IRON });
    g.circle(dx + dw - 2, dy + dh / 2, 1).fill({ color: COL_IRON_DK });

    // ── Windows (two, with shutters) ──
    for (const wx of [x + 4, x + w - 12]) {
      g.rect(wx, y + 10, 8, 8).fill({ color: 0x2a2a3e });
      g.moveTo(wx + 4, y + 10).lineTo(wx + 4, y + 18).stroke({ color: COL_WOOD_DK, width: 0.4 });
      g.moveTo(wx, y + 14).lineTo(wx + 8, y + 14).stroke({ color: COL_WOOD_DK, width: 0.4 });
      g.rect(wx, y + 10, 8, 8).stroke({ color: COL_WOOD_DK, width: 0.5 });
      // Open shutters
      g.rect(wx - 2, y + 10, 2, 8).fill({ color: COL_WOOD_LT });
      g.rect(wx + 8, y + 10, 2, 8).fill({ color: COL_WOOD_LT });
    }

    // ── Flower box under first window ──
    g.rect(x + 3, y + 19, 10, 2).fill({ color: COL_WOOD });
    for (let i = 0; i < 4; i++) {
      const fx = x + 4 + i * 2.5;
      g.moveTo(fx, y + 19).lineTo(fx, y + 16).stroke({ color: 0x448833, width: 0.4 });
      g.circle(fx, y + 15.5, 1).fill({
        color: [COL_FLOWER_R, COL_FLOWER_Y, COL_FLOWER_W, COL_FLOWER_R][i],
      });
    }

    // ── Thatched roof ──
    g.moveTo(x - 4, y)
      .quadraticCurveTo(x + w / 2, y - 16, x + w + 4, y)
      .closePath()
      .fill({ color: COL_THATCH });
    g.moveTo(x - 4, y)
      .quadraticCurveTo(x + w / 2, y - 16, x + w + 4, y)
      .stroke({ color: COL_THATCH_DK, width: 0.8 });
    // Thatch texture lines
    for (let i = 0; i < 4; i++) {
      const t = (i + 1) / 5;
      const ly = y - 16 * (1 - t * t);
      g.moveTo(x - 2 + t * 3, ly).lineTo(x + w + 2 - t * 3, ly)
        .stroke({ color: COL_THATCH_DK, width: 0.3 });
    }
    // Ridge thatch
    g.moveTo(x + 2, y - 14).lineTo(x + w - 2, y - 14)
      .stroke({ color: COL_THATCH_LT, width: 1.5 });

    // ── Chimney ──
    g.rect(x + w - 10, y - 14, 6, 12).fill({ color: COL_STONE_DK });
    g.rect(x + w - 10, y - 14, 6, 12).stroke({ color: COL_MORTAR, width: 0.3 });
    g.rect(x + w - 11, y - 15, 8, 2).fill({ color: COL_STONE });

    // ── Ivy on wall ──
    this._drawIvy(g, x + 1, y + 8, 20);
  }

  private _drawInn(
    g: Graphics, x: number, y: number, w: number, h: number,
  ): void {
    // ── Two-storey stucco walls ──
    g.rect(x, y, w, h).fill({ color: COL_STUCCO });
    g.rect(x, y, w, h).stroke({ color: COL_WOOD_DK, width: 0.8 });

    // ── Half-timber frame (more elaborate) ──
    // Vertical
    g.rect(x + 2, y, 3, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w / 3, y, 3, h).fill({ color: COL_WOOD_DK });
    g.rect(x + (w * 2) / 3, y, 3, h).fill({ color: COL_WOOD_DK });
    g.rect(x + w - 5, y, 3, h).fill({ color: COL_WOOD_DK });
    // Horizontal floor beam
    g.rect(x, y + h * 0.45, w, 3).fill({ color: COL_WOOD });
    // Cross braces (upper storey)
    g.moveTo(x + 5, y + 3).lineTo(x + w / 3, y + h * 0.45).stroke({ color: COL_WOOD_DK, width: 1 });
    g.moveTo(x + w / 3 + 3, y + 3).lineTo(x + (w * 2) / 3, y + h * 0.45).stroke({ color: COL_WOOD_DK, width: 1 });
    g.moveTo(x + (w * 2) / 3 + 3, y + 3).lineTo(x + w - 5, y + h * 0.45).stroke({ color: COL_WOOD_DK, width: 1 });

    // ── Brick infill between timbers ──
    for (let panel = 0; panel < 3; panel++) {
      const px = x + 6 + panel * (w / 3);
      for (let r = 0; r < 3; r++) {
        for (let c = 0; c < 3; c++) {
          g.rect(px + c * 4 + (r % 2) * 2, y + 5 + r * 5, 3, 4).fill({
            color: (r + c) % 2 === 0 ? COL_BRICK : COL_BRICK_DK,
            alpha: 0.25,
          });
        }
      }
    }

    // ── Upper windows (3, with shutters) ──
    for (let i = 0; i < 3; i++) {
      const wx = x + 8 + i * (w / 3);
      g.rect(wx, y + 8, 10, 10).fill({ color: 0x2a2a3e });
      g.moveTo(wx + 5, y + 8).lineTo(wx + 5, y + 18).stroke({ color: COL_WOOD_DK, width: 0.4 });
      g.moveTo(wx, y + 13).lineTo(wx + 10, y + 13).stroke({ color: COL_WOOD_DK, width: 0.4 });
      g.rect(wx, y + 8, 10, 10).stroke({ color: COL_WOOD_DK, width: 0.5 });
      // Shutters
      g.rect(wx - 2, y + 8, 2, 10).fill({ color: COL_WOOD_LT });
      g.rect(wx + 10, y + 8, 2, 10).fill({ color: COL_WOOD_LT });
    }

    // ── Tavern door (large, arched) ──
    const dw = 18;
    const dh = 28;
    const dx = x + w / 2 - dw / 2;
    const dy = y + h - dh;
    // Frame
    g.rect(dx - 2, dy - 2, dw + 4, dh + 2).fill({ color: COL_WOOD });
    g.moveTo(dx - 1, dy).arc(dx + dw / 2, dy, dw / 2 + 1, Math.PI, 0).fill({ color: COL_WOOD });
    // Door recess
    g.rect(dx, dy, dw, dh).fill({ color: 0x1a1208 });
    // Left door half
    g.rect(dx + 1, dy + 1, dw / 2 - 2, dh - 2).fill({ color: COL_WOOD_LT });
    // Right door half
    g.rect(dx + dw / 2 + 1, dy + 1, dw / 2 - 2, dh - 2).fill({ color: COL_WOOD_LT });
    // Iron bands
    g.rect(dx, dy + 6, dw, 1.5).fill({ color: COL_IRON });
    g.rect(dx, dy + 16, dw, 1.5).fill({ color: COL_IRON });
    // Handle
    g.circle(dx + dw / 2 + 3, dy + dh / 2, 1.5).fill({ color: COL_IRON_DK });

    // ── Lower windows (flanking door) ──
    for (const wx of [x + 6, x + w - 16]) {
      g.rect(wx, y + h * 0.5 + 4, 10, 10).fill({ color: 0x2a2a3e });
      g.rect(wx, y + h * 0.5 + 4, 10, 10).stroke({ color: COL_WOOD_DK, width: 0.5 });
      // Warm interior glow
      g.rect(wx + 1, y + h * 0.5 + 5, 8, 8).fill({ color: COL_GLOW, alpha: 0.15 });
    }

    // ── Thatched roof (larger) ──
    g.moveTo(x - 6, y)
      .quadraticCurveTo(x + w / 2, y - 22, x + w + 6, y)
      .closePath()
      .fill({ color: COL_THATCH });
    g.moveTo(x - 6, y)
      .quadraticCurveTo(x + w / 2, y - 22, x + w + 6, y)
      .stroke({ color: COL_THATCH_DK, width: 1 });
    // Texture lines
    for (let i = 0; i < 5; i++) {
      const t = (i + 1) / 6;
      const ly = y - 22 * (1 - t * t);
      g.moveTo(x - 4 + t * 4, ly).lineTo(x + w + 4 - t * 4, ly)
        .stroke({ color: COL_THATCH_DK, width: 0.3 });
    }
    g.moveTo(x + 4, y - 20).lineTo(x + w - 4, y - 20)
      .stroke({ color: COL_THATCH_LT, width: 2 });

    // ── Chimney (larger, stone) ──
    g.rect(x + w - 14, y - 20, 8, 18).fill({ color: COL_STONE_DK });
    g.rect(x + w - 14, y - 20, 8, 18).stroke({ color: COL_MORTAR, width: 0.3 });
    g.rect(x + w - 15, y - 21, 10, 2).fill({ color: COL_STONE });
    // Mortar lines on chimney
    g.rect(x + w - 12, y - 16, 4, 0.5).fill({ color: COL_MORTAR });
    g.rect(x + w - 12, y - 10, 4, 0.5).fill({ color: COL_MORTAR });

    // ── Lantern by inn door ──
    const lx = dx - 6;
    const ly = dy + 2;
    g.rect(lx, ly, 1.5, 6).fill({ color: COL_IRON });
    g.moveTo(lx - 2, ly + 6).lineTo(lx + 3, ly + 6).stroke({ color: COL_IRON, width: 0.6 });
    g.moveTo(lx - 2, ly + 6)
      .lineTo(lx - 2.5, ly + 12)
      .lineTo(lx + 3.5, ly + 12)
      .lineTo(lx + 3, ly + 6)
      .closePath()
      .fill({ color: COL_GLOW, alpha: 0.3 });

    // ── Sign bracket (pole) ──
    g.rect(x - 4, y + 22, 2, 18).fill({ color: COL_WOOD });
    g.moveTo(x - 3, y + 22).lineTo(x + 2, y + 18).stroke({ color: COL_IRON, width: 0.6 });

    // ── Moss on lower wall ──
    this._drawMoss(g, x + 2, y + h - 4, 6);
    this._drawMoss(g, x + w - 10, y + h - 3, 4);
  }

  // =========================================================================
  // Village well
  // =========================================================================

  private _drawWell(): void {
    const g = this._well;

    const wx = 64;
    const wy = HH - 50;

    // ── Stone well base (circular) ──
    g.ellipse(wx, wy, 12, 7).fill({ color: COL_STONE });
    g.ellipse(wx, wy, 12, 7).stroke({ color: COL_STONE_DK, width: 0.5 });
    g.ellipse(wx, wy, 10, 5.5).fill({ color: COL_STONE_DK });
    // Stone block detail
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const sx = wx + Math.cos(a) * 10;
      const sy = wy + Math.sin(a) * 5.5;
      g.rect(sx - 2, sy - 1.5, 4, 3)
        .fill({ color: i % 2 === 0 ? COL_STONE_LT : COL_STONE })
        .stroke({ color: COL_MORTAR, width: 0.2 });
    }

    // ── Well posts ──
    g.rect(wx - 8, wy - 22, 3, 24)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.rect(wx + 5, wy - 22, 3, 24)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.3 });

    // ── Small tiled roof ──
    g.moveTo(wx - 12, wy - 22)
      .lineTo(wx, wy - 32)
      .lineTo(wx + 12, wy - 22)
      .closePath()
      .fill({ color: COL_THATCH });
    g.moveTo(wx - 12, wy - 22)
      .lineTo(wx, wy - 32)
      .lineTo(wx + 12, wy - 22)
      .stroke({ color: COL_THATCH_DK, width: 0.5 });

    // ── Winch / crossbar ──
    g.rect(wx - 6, wy - 20, 12, 2).fill({ color: COL_WOOD_DK });
    // Winch handle
    g.moveTo(wx + 6, wy - 19).lineTo(wx + 9, wy - 17).stroke({ color: COL_IRON, width: 1 });
    g.circle(wx + 9, wy - 17, 1).fill({ color: COL_IRON });

    // ── Rope ──
    g.moveTo(wx, wy - 19).lineTo(wx, wy - 10).stroke({ color: COL_WOOD_LT, width: 0.6 });

    // ── Bucket ──
    g.moveTo(wx - 2, wy - 10)
      .lineTo(wx - 3, wy - 4)
      .lineTo(wx + 3, wy - 4)
      .lineTo(wx + 2, wy - 10)
      .closePath()
      .fill({ color: COL_WOOD });
    g.rect(wx - 3, wy - 7, 6, 0.8).fill({ color: COL_IRON });
    // Bucket handle
    g.moveTo(wx - 2, wy - 10).arc(wx, wy - 10, 2, Math.PI, 0).stroke({ color: COL_IRON_DK, width: 0.5 });

    // ── Moss on well stones ──
    this._drawMoss(g, wx - 10, wy + 2, 5);
    this._drawMoss(g, wx + 4, wy + 3, 4);
  }

  // =========================================================================
  // Market stall
  // =========================================================================

  private _drawMarket(): void {
    const g = this._market;

    const mx = 94;
    const my = HH - 38;
    const mw = 28;
    const mh = 16;

    // ── Stall counter ──
    g.rect(mx, my, mw, mh)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Plank lines
    g.rect(mx, my + 5, mw, 0.5).fill({ color: COL_WOOD_DK });
    g.rect(mx, my + 10, mw, 0.5).fill({ color: COL_WOOD_DK });

    // ── Support poles ──
    g.rect(mx, my - 18, 2, 18).fill({ color: COL_WOOD_DK });
    g.rect(mx + mw - 2, my - 18, 2, 18).fill({ color: COL_WOOD_DK });

    // ── Striped awning ──
    for (let i = 0; i < 4; i++) {
      g.rect(mx - 2, my - 18 + i * 4, mw + 4, 4).fill({
        color: i % 2 === 0 ? COL_CLOTH_R : COL_APRON,
      });
    }
    // Awning scallop edge
    for (let i = 0; i < 7; i++) {
      g.moveTo(mx + 4 + i * 4, my - 2).arc(mx + 2 + i * 4, my - 2, 2, 0, Math.PI).fill({ color: COL_CLOTH_R });
    }

    // ── Produce display ──
    // Apples (pile)
    for (const pos of [{ x: mx + 4, y: my + 3 }, { x: mx + 7, y: my + 2 }, { x: mx + 5.5, y: my + 1 }]) {
      g.circle(pos.x, pos.y, 2).fill({ color: COL_APPLE });
      g.circle(pos.x - 0.5, pos.y - 0.5, 0.5).fill({ color: 0xff6666, alpha: 0.5 });
    }
    // Bread loaves
    g.ellipse(mx + 14, my + 3, 3, 2).fill({ color: COL_BREAD });
    g.ellipse(mx + 14, my + 2.5, 2.5, 1.5).fill({ color: 0xe8c060 });
    g.ellipse(mx + 20, my + 3, 2.5, 1.8).fill({ color: COL_BREAD });
    // Cheese wheel
    g.ellipse(mx + 24, my + 3, 3, 2).fill({ color: COL_CHEESE });
    g.ellipse(mx + 24, my + 2, 2, 1).fill({ color: 0xeedd66, alpha: 0.5 });

    // ── Barrel beside stall ──
    g.moveTo(mx + mw + 2, my + mh - 12)
      .lineTo(mx + mw + 1, my + mh)
      .lineTo(mx + mw + 9, my + mh)
      .lineTo(mx + mw + 8, my + mh - 12)
      .closePath()
      .fill({ color: COL_BARREL });
    g.rect(mx + mw + 1, my + mh - 8, 8, 1).fill({ color: COL_IRON });
    g.rect(mx + mw + 1, my + mh - 3, 8, 1).fill({ color: COL_IRON });

    // ── Wooden crate ──
    g.rect(mx - 6, my + 4, 8, 8).fill({ color: COL_WOOD_LT });
    g.rect(mx - 6, my + 4, 8, 8).stroke({ color: COL_WOOD_DK, width: 0.4 });
    g.moveTo(mx - 6, my + 8).lineTo(mx + 2, my + 8).stroke({ color: COL_WOOD_DK, width: 0.3 });
    g.moveTo(mx - 2, my + 4).lineTo(mx - 2, my + 12).stroke({ color: COL_WOOD_DK, width: 0.3 });
  }

  // =========================================================================
  // Laundry line
  // =========================================================================

  private _drawLaundry(): void {
    const g = this._laundry;

    // Line between cottage 1 and inn
    const lx1 = 32;
    const ly1 = 28;
    const lx2 = 40;
    const ly2 = 26;

    g.moveTo(lx1, ly1).lineTo(lx2, ly2).stroke({ color: COL_WOOD_LT, width: 0.4 });

    // Hanging clothes
    const clothes = [
      { x: 33, col: COL_CLOTH_B, w: 3, h: 4 },
      { x: 36, col: COL_APRON, w: 2, h: 5 },
      { x: 38, col: COL_CLOTH_R, w: 3, h: 3 },
    ];
    for (const c of clothes) {
      const cy = ly1 + ((c.x - lx1) / (lx2 - lx1)) * (ly2 - ly1) + 1;
      g.rect(c.x - c.w / 2, cy, c.w, c.h).fill({ color: c.col });
      g.rect(c.x - c.w / 2, cy, c.w, c.h).stroke({ color: COL_STUCCO_DK, width: 0.2 });
    }
  }

  // =========================================================================
  // Animated inn sign
  // =========================================================================

  private _updateSign(time: number): void {
    const g = this._innSign;
    g.clear();

    const sx = 32;
    const sy = 38;
    const swing = Math.sin(time * 1.5) * 2;

    // Chain links
    g.moveTo(sx, sy - 4).lineTo(sx + 1, sy).stroke({ color: COL_IRON, width: 0.5 });
    g.moveTo(sx + 14, sy - 4).lineTo(sx + 13, sy).stroke({ color: COL_IRON, width: 0.5 });

    // Sign board
    g.roundRect(sx, sy + swing * 0.3, 14, 10, 1)
      .fill({ color: COL_SIGN })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });

    // Ale mug icon
    const mux = sx + 5;
    const muy = sy + 2 + swing * 0.3;
    // Mug body
    g.rect(mux, muy, 5, 5).fill({ color: COL_SIGN_GOLD });
    // Handle
    g.moveTo(mux + 5, muy + 0.5).arc(mux + 5, muy + 2.5, 2, -Math.PI / 2, Math.PI / 2).stroke({ color: COL_SIGN_GOLD, width: 0.6 });
    // Foam
    g.ellipse(mux + 2.5, muy, 3, 1).fill({ color: COL_APRON });

    // Gold trim
    g.roundRect(sx + 1, sy + 1 + swing * 0.3, 12, 8, 0.5).stroke({ color: COL_ALE, width: 0.3 });
  }

  // =========================================================================
  // Chimney smoke
  // =========================================================================

  private _updateSmoke(time: number): void {
    const g = this._smoke;
    g.clear();

    // Smoke from inn chimney
    this._drawSmokeColumn(g, 82, 0, time, 0);
    // Smoke from cottage 1 chimney
    this._drawSmokeColumn(g, 24, 14, time, 1.5);
  }

  private _drawSmokeColumn(
    g: Graphics, x: number, baseY: number, time: number, offset: number,
  ): void {
    for (let i = 0; i < 4; i++) {
      const phase = ((time + offset) * SMOKE_SPEED + i * 0.7) % 3.5;
      if (phase > 2.8) continue;
      const rise = phase * 8;
      const drift = Math.sin((time + offset) * 0.8 + i * 2) * 4;
      const size = 2.5 + phase * 1.5;
      const alpha = 0.2 * (1 - phase / 2.8);
      g.circle(x + drift, baseY - rise, size).fill({ color: 0x999999, alpha });
    }
  }

  // =========================================================================
  // Chickens
  // =========================================================================

  private _updateChickens(time: number): void {
    const g = this._chickens;
    g.clear();

    const chickens = [
      { x: 22 + Math.sin(time * 0.5) * 5, y: HH - 8 },
      { x: 52 + Math.sin(time * 0.7 + 1) * 4, y: HH - 12 },
      { x: 105 + Math.sin(time * 0.4 + 2) * 3, y: HH - 6 },
    ];

    for (let i = 0; i < chickens.length; i++) {
      const c = chickens[i];
      const bob = Math.sin(time * CHICKEN_BOB + i * 2.5) * 0.8;
      const peck = Math.sin(time * CHICKEN_BOB * 1.5 + i * 3);
      const headDip = peck > 0.7 ? 1.5 : 0;
      const cy = c.y + bob;

      // Body
      g.ellipse(c.x, cy, 3.5, 2.2).fill({ color: COL_CHICKEN });
      g.ellipse(c.x + 0.5, cy + 0.3, 2.5, 1.2).fill({ color: COL_CHICKEN_DK });
      // Wing
      g.ellipse(c.x + 1, cy - 0.5, 2, 1.5).fill({ color: COL_CHICKEN_DK });
      // Head
      g.circle(c.x - 2.5, cy - 2.5 + headDip, 1.5).fill({ color: COL_CHICKEN });
      // Comb
      g.moveTo(c.x - 3, cy - 4 + headDip)
        .lineTo(c.x - 2.5, cy - 5 + headDip)
        .lineTo(c.x - 2, cy - 4 + headDip)
        .fill({ color: COL_COMB });
      // Beak
      g.moveTo(c.x - 3.5, cy - 2 + headDip)
        .lineTo(c.x - 5, cy - 1.5 + headDip)
        .lineTo(c.x - 3.5, cy - 1.2 + headDip)
        .fill({ color: COL_BEAK });
      // Eye
      g.circle(c.x - 3, cy - 3 + headDip, 0.3).fill({ color: 0x111111 });
      // Tail
      g.moveTo(c.x + 3.5, cy)
        .lineTo(c.x + 5.5, cy - 2)
        .lineTo(c.x + 5.5, cy + 0.5)
        .closePath()
        .fill({ color: COL_CHICKEN_DK });
      // Feet
      g.moveTo(c.x - 1, cy + 2).lineTo(c.x - 1, cy + 3.5).stroke({ color: COL_BEAK, width: 0.3 });
      g.moveTo(c.x + 1, cy + 2).lineTo(c.x + 1, cy + 3.5).stroke({ color: COL_BEAK, width: 0.3 });
    }
  }

  // =========================================================================
  // Sleeping dog
  // =========================================================================

  private _updateDog(time: number): void {
    const g = this._dog;
    g.clear();

    const dx = 70;
    const dy = HH - 38;
    const breathe = Math.sin(time * 1.5) * 0.3;

    // Body (lying down)
    g.ellipse(dx, dy + breathe, 5, 2.5).fill({ color: COL_DOG });
    // Darker back
    g.ellipse(dx + 0.5, dy - 0.5 + breathe, 4, 1.5).fill({ color: COL_DOG_DK });
    // Head (resting on paws)
    g.ellipse(dx + 4, dy - 0.5 + breathe, 3, 2).fill({ color: COL_DOG });
    // Ear (floppy)
    g.ellipse(dx + 5, dy + 0.5 + breathe, 1.5, 2).fill({ color: COL_DOG_DK });
    // Nose
    g.circle(dx + 6.5, dy + breathe, 0.6).fill({ color: 0x222222 });
    // Closed eye (sleeping)
    g.moveTo(dx + 3.5, dy - 1.5 + breathe).lineTo(dx + 5, dy - 1 + breathe)
      .stroke({ color: 0x222222, width: 0.3 });
    // Tail (curled)
    g.moveTo(dx - 5, dy + breathe)
      .quadraticCurveTo(dx - 7, dy - 2, dx - 6, dy - 3)
      .stroke({ color: COL_DOG, width: 1 });
    // Front paws
    g.ellipse(dx + 6, dy + 1.5 + breathe, 1.5, 0.8).fill({ color: COL_DOG });
  }

  // =========================================================================
  // Villagers
  // =========================================================================

  private _updateVillagers(time: number): void {
    const g = this._villagers;
    g.clear();

    // Villager 1 (woman near well, blue dress)
    const v1x = 55;
    const v1y = HH - 30;
    const bob1 = Math.sin(time * VILLAGER_BOB) * 0.5;
    this._drawVillagerWoman(g, v1x, v1y + bob1, time);

    // Villager 2 (man chatting, hat)
    const v2x = 75;
    const v2y = HH - 32;
    const bob2 = Math.sin(time * VILLAGER_BOB + 1) * 0.5;
    this._drawVillagerMan(g, v2x, v2y + bob2, time + 1);

    // Merchant at stall
    this._drawMerchant(g, 102, HH - 34, time);
  }

  private _drawVillagerWoman(
    g: Graphics, x: number, y: number, time: number,
  ): void {
    const gesture = Math.sin(time * 2) * 1.5;

    // Dress (long)
    g.moveTo(x - 4, y - 8)
      .lineTo(x + 4, y - 8)
      .lineTo(x + 6, y + 6)
      .lineTo(x - 6, y + 6)
      .closePath()
      .fill({ color: COL_CLOTH_B });
    // Apron
    g.rect(x - 3, y - 4, 6, 8).fill({ color: COL_APRON });
    // Arms
    g.rect(x - 6, y - 8 + gesture, 2.5, 6).fill({ color: COL_CLOTH_B });
    g.rect(x + 4, y - 8 - gesture, 2.5, 6).fill({ color: COL_CLOTH_B });
    // Hands
    g.circle(x - 5, y - 2 + gesture, 1.2).fill({ color: COL_SKIN });
    g.circle(x + 5, y - 2 - gesture, 1.2).fill({ color: COL_SKIN });
    // Head
    g.circle(x, y - 12, 3.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(x - 1, y - 12.5, 0.4).fill({ color: 0x222222 });
    g.circle(x + 1, y - 12.5, 0.4).fill({ color: 0x222222 });
    // Hair (long, braided)
    g.moveTo(x + 4 * Math.cos(Math.PI + 0.3), y - 12 + 4 * Math.sin(Math.PI + 0.3)).arc(x, y - 12, 4, Math.PI + 0.3, -0.3).stroke({ color: COL_HAIR_BLD, width: 1.5 });
    g.moveTo(x + 3, y - 10).lineTo(x + 3, y - 4).stroke({ color: COL_HAIR_BLD, width: 1 });
    // Headband
    g.rect(x - 3.5, y - 14, 7, 1).fill({ color: COL_CLOTH_R });
    // Feet
    g.rect(x - 4, y + 5, 3, 1.5).fill({ color: COL_WOOD_DK });
    g.rect(x + 1, y + 5, 3, 1.5).fill({ color: COL_WOOD_DK });
  }

  private _drawVillagerMan(
    g: Graphics, x: number, y: number, time: number,
  ): void {
    const gesture = Math.sin(time * 1.6) * 1;

    // Body (tunic)
    g.rect(x - 3, y - 10, 7, 10).fill({ color: COL_CLOTH_G });
    // Belt
    g.rect(x - 3, y - 4, 7, 1.5).fill({ color: COL_WOOD });
    // Arms
    g.rect(x - 5, y - 10 + gesture, 2.5, 7).fill({ color: COL_CLOTH_G });
    g.rect(x + 4, y - 10 - gesture, 2.5, 7).fill({ color: COL_CLOTH_G });
    // Hands
    g.circle(x - 4, y - 3 + gesture, 1.2).fill({ color: COL_SKIN_DK });
    g.circle(x + 5, y - 3 - gesture, 1.2).fill({ color: COL_SKIN_DK });
    // Legs
    g.rect(x - 2, y, 2.5, 6).fill({ color: COL_WOOD_LT });
    g.rect(x + 1, y, 2.5, 6).fill({ color: COL_WOOD_LT });
    // Boots
    g.rect(x - 3, y + 5, 3, 2).fill({ color: COL_WOOD_DK });
    g.rect(x + 1, y + 5, 3, 2).fill({ color: COL_WOOD_DK });
    // Head
    g.circle(x + 0.5, y - 14, 3.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(x - 0.5, y - 14.5, 0.4).fill({ color: 0x222222 });
    g.circle(x + 1.5, y - 14.5, 0.4).fill({ color: 0x222222 });
    // Beard
    g.moveTo(x - 1, y - 12)
      .lineTo(x + 2, y - 12)
      .lineTo(x + 1, y - 10)
      .lineTo(x, y - 10)
      .closePath()
      .fill({ color: COL_HAIR_BRN });
    // Hair
    g.moveTo(x + 0.5 + 4 * Math.cos(Math.PI + 0.3), y - 14 + 4 * Math.sin(Math.PI + 0.3)).arc(x + 0.5, y - 14, 4, Math.PI + 0.3, -0.3).stroke({ color: COL_HAIR_BRN, width: 1.2 });
    // Hat
    g.rect(x - 3.5, y - 18.5, 8, 2).fill({ color: COL_WOOD_LT });
    g.rect(x - 2, y - 21, 5, 3.5).fill({ color: COL_WOOD_LT });
  }

  private _drawMerchant(
    g: Graphics, x: number, y: number, time: number,
  ): void {
    const bob = Math.sin(time * VILLAGER_BOB + 2) * 0.5;
    const wave = Math.sin(time * 2) * 2;

    // Body (fancy vest)
    g.rect(x - 4, y - 10 + bob, 8, 12).fill({ color: COL_CLOTH_G });
    // Gold vest trim
    g.rect(x - 2, y - 8 + bob, 4, 2).fill({ color: COL_GOLD });
    // Arms
    g.rect(x - 6, y - 10 + bob, 2.5, 7).fill({ color: COL_CLOTH_G });
    g.rect(x + 4, y - 8 + bob + wave, 6, 2).fill({ color: COL_SKIN }); // waving arm
    // Legs
    g.rect(x - 2, y + bob + 2, 2, 6).fill({ color: COL_WOOD_LT });
    g.rect(x + 1, y + bob + 2, 2, 6).fill({ color: COL_WOOD_LT });
    // Head
    g.circle(x, y - 14 + bob, 3.5).fill({ color: COL_SKIN });
    // Eyes
    g.circle(x - 1, y - 14.5 + bob, 0.4).fill({ color: 0x222222 });
    g.circle(x + 1, y - 14.5 + bob, 0.4).fill({ color: 0x222222 });
    // Moustache
    g.moveTo(x - 2, y - 12.5 + bob).lineTo(x, y - 12 + bob).lineTo(x + 2, y - 12.5 + bob)
      .stroke({ color: COL_HAIR_BRN, width: 0.6 });
    // Cap
    g.rect(x - 4, y - 18 + bob, 8, 2.5).fill({ color: COL_CLOTH_R });
    g.rect(x - 3, y - 20 + bob, 6, 3).fill({ color: COL_CLOTH_R });
    // Boots
    g.rect(x - 3, y + bob + 7, 3, 2).fill({ color: COL_WOOD_DK });
    g.rect(x + 1, y + bob + 7, 3, 2).fill({ color: COL_WOOD_DK });
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
    for (let i = 0; i < h; i++) {
      const dx = Math.sin(i * 0.8) * 2;
      g.rect(x + dx, y + i, 1, 1.5).fill({ color: COL_IVY, alpha: 0.6 });
    }
    for (let i = 3; i < h; i += 4) {
      const dx = Math.sin(i * 0.8) * 2;
      const leafDir = i % 8 < 4 ? -1 : 1;
      g.ellipse(x + dx + leafDir * 2.5, y + i, 2, 1.5).fill({ color: COL_IVY_LT, alpha: 0.5 });
    }
  }
}
