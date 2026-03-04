// Elite archery range renderer for BuildingView.
//
// Draws a detailed 4×2 tile elite medieval archery range with:
//   • Imposing dark stone training pavilion with carved stone columns
//   • Gold-trimmed target stands and ornate iron arrow racks with gilt details
//   • Crenellated dark stone back wall with arrow slits and stained-glass rosette
//   • Carved stone columns with gold capitals instead of simple wooden posts
//   • Elaborate dark-tiled roof with gold ridge caps and iron finials
//   • Iron braziers at corners providing warm flickering glow
//   • Decorative stone frieze along the top of the back wall
//   • Elite archer figure with plate armor, better gear
//   • Trophy display: mounted bow, quiver of special arrows, crossed arrows emblem
//   • Player-colored elite banner with gold fringe
//   • Hay bales, sandbags, training dummy (better equipped)
//   • Waving player-colored pennants on gold-capped stone pillars
//   • Ivy climbing the stonework, moss patches on old stone
//
// All drawing uses PixiJS Graphics. The building is 4×TILE_SIZE wide
// and 2×TILE_SIZE tall. Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const PW = 4 * TS; // 256px wide
const PH = 2 * TS; // 128px tall

// --- Darker Palette (~30% darker stones) ---
const COL_STONE = 0x615e53;       // was 0x8b8878
const COL_STONE_LT = 0x706d64;   // was 0xa09d8f
const COL_STONE_DK = 0x4b4943;   // was 0x6b6860
const COL_MORTAR = 0x6b695f;     // was 0x9a9688
const COL_WOOD = 0x4a2a10;       // dark hardwood
const COL_WOOD_DK = 0x321a08;
const COL_WOOD_LT = 0x5a3a1a;
const COL_ROOF = 0x2a1818;       // near-black tiles
const COL_ROOF_DK = 0x1a0c0c;
const COL_ROOF_LT = 0x3e2020;
const COL_WINDOW = 0x0e0e1e;
const COL_WINDOW_FRAME = 0x444444;
const COL_MOSS = 0x3a5a2a;
const COL_IVY = 0x2e4a22;
const COL_IVY_LT = 0x4a6a3a;
const COL_HAY = 0xc9a85c;
const COL_HAY_DK = 0xa88a40;
const COL_SAND = 0xc4b080;
const COL_SKIN = 0xd4a574;
const COL_SKIN_DK = 0xb48a60;
const COL_HAIR_BROWN = 0x3a2018;
const COL_HAIR_BLOND = 0xa88040;
const COL_ARROW_SHAFT = 0x8b7040;
const _COL_ARROWHEAD = 0x888888;
const COL_FLETCHING = 0xeeeeee;
const COL_BOW = 0x5a3a18;
const COL_BOWSTRING = 0xccccbb;
const COL_LANTERN_GLOW = 0xffaa44;
const COL_DUMMY_BODY = 0x886644;
const COL_DUMMY_SACK = 0xaa9966;

// Elite-specific colors
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_GOLD_LT = 0xffe855;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const _COL_IRON_LT = 0x777777;
const COL_ARMOR = 0x8899aa;
const COL_ARMOR_DK = 0x667788;
const COL_ARMOR_LT = 0x99aabb;
const COL_LEATHER = 0x5a3a1a;
const COL_LEATHER_DK = 0x3a2810;
const COL_CLOTH_GREEN = 0x2a5a2a;
const COL_CLOTH_GREEN_DK = 0x1a3a18;
const COL_BRAZIER_GLOW = 0xff6622;
const COL_BRAZIER_BODY = 0x444444;
const COL_COBBLE = 0x5a5a4a;
const COL_COBBLE_DK = 0x3a3a2a;
const COL_GARGOYLE = 0x5a5a50;
const COL_GARGOYLE_DK = 0x3a3a32;

// Animation timing
const ARCHER1_CYCLE = 3.2;
const ARCHER2_CYCLE = 2.6;
const FLAG_SPEED = 3.0;

// ---------------------------------------------------------------------------
// EliteArcheryRangeRenderer
// ---------------------------------------------------------------------------

export class EliteArcheryRangeRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics();      // Stone walls, ground, roof
  private _targets = new Graphics();    // Target stands
  private _props = new Graphics();      // Hay, weapons rack, dummies, trophies
  private _archers = new Graphics();    // Archer bodies
  private _arrows = new Graphics();     // Flying arrows
  private _flagL = new Graphics();      // Left pennant
  private _flagR = new Graphics();      // Right pennant
  private _braziers = new Graphics();   // Brazier glow (pulsing)

  // State
  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);

    this._drawBase();
    this._drawTargets();
    this._drawProps();
    this._drawFlags(0);
    this._drawBraziers(0);

    this.container.addChild(this._base);
    this.container.addChild(this._targets);
    this.container.addChild(this._props);
    this.container.addChild(this._archers);
    this.container.addChild(this._arrows);
    this.container.addChild(this._flagL);
    this.container.addChild(this._flagR);
    this.container.addChild(this._braziers);
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateArchers(this._time);
    this._drawFlags(this._time);
    this._drawBraziers(this._time);
  }

  // =========================================================================
  // Static base — dark stone walls, elaborate roof, carved columns, ground
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation — cobblestone ──
    g.rect(0, PH - 12, PW, 12).fill({ color: COL_COBBLE });
    // Cobblestone pattern
    for (let cx = 2; cx < PW - 2; cx += 10) {
      for (let cy = PH - 11; cy < PH - 1; cy += 6) {
        const off = (Math.floor(cy / 6) % 2) * 5;
        g.roundRect(cx + off, cy, 8, 5, 1)
          .fill({ color: COL_COBBLE_DK, alpha: 0.3 })
          .stroke({ color: COL_COBBLE_DK, width: 0.3, alpha: 0.4 });
      }
    }
    // Packed sand inside
    g.rect(6, PH - 16, PW - 12, 6).fill({ color: COL_SAND });
    // Scattered pebbles
    const pebbles = [
      [18, PH - 14],
      [55, PH - 13],
      [90, PH - 15],
      [145, PH - 14],
      [200, PH - 13],
      [230, PH - 15],
    ];
    for (const [px, py] of pebbles) {
      g.circle(px, py, 1.2).fill({ color: COL_STONE_DK, alpha: 0.35 });
    }

    // ── Back wall (dark crenellated stone) ──
    const wallX = 6;
    const wallW = PW - 12;
    const wallY = 20;
    const wallH = 55;

    // Main wall body — dark stone
    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(wallX + 1, wallY + 1, 5, wallH - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.2,
    });

    // Brick pattern
    this._drawBrickPattern(g, wallX + 2, wallY + 2, wallW - 4, wallH - 4);
    // Stone variation
    this._drawStoneVariation(g, wallX + 6, wallY + 6, wallW - 12, wallH - 12);

    // Crenellations along the top
    this._drawCrenellations(g, wallX, wallY, wallW);

    // Arrow slits in the back wall
    this._drawArrowSlit(g, wallX + 30, wallY + 18);
    this._drawArrowSlit(g, wallX + wallW - 36, wallY + 18);

    // Stained glass rosette window (center of back wall)
    this._drawRosetteWindow(g, PW / 2, wallY + 25);

    // ── Decorative stone frieze along the top of the wall ──
    this._drawFrieze(g, wallX, wallY, wallW);

    // Decorative stone band across middle of wall (gold-trimmed)
    g.rect(wallX, wallY + wallH - 12, wallW, 3).fill({ color: COL_STONE_DK });
    g.rect(wallX, wallY + wallH - 12, wallW, 1).fill({
      color: COL_GOLD,
      alpha: 0.25,
    });
    g.rect(wallX, wallY + wallH - 10, wallW, 1).fill({
      color: COL_GOLD,
      alpha: 0.15,
    });

    // ── Carved stone columns (replacing wooden posts) ──
    this._drawStoneColumn(g, 4, 8, PH - 18);
    this._drawStoneColumn(g, PW - 14, 8, PH - 18);

    // ── Elaborate dark-tiled roof with gold ridge caps ──
    const roofY = 6;
    const roofLeft = 28;
    const roofRight = PW - 28;
    const mid = (roofLeft + roofRight) / 2;

    // Roof slope — dark tiles
    g.moveTo(roofLeft, roofY + 18)
      .lineTo(mid, roofY)
      .lineTo(roofRight, roofY + 18)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Subtle right-side highlight
    g.moveTo(mid, roofY)
      .lineTo(roofRight, roofY + 18)
      .lineTo(mid + 1, roofY + 1)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.2 });

    // Tile lines on roof
    for (let i = 1; i <= 4; i++) {
      const frac = i / 5;
      const ly = roofY + frac * 18;
      const halfW = ((roofRight - roofLeft) / 2) * frac;
      g.moveTo(mid - halfW, ly)
        .lineTo(mid + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.6 });
    }
    // Vertical tile joints
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      for (let row = 1; row <= 4; row++) {
        const ry = roofY + (row / 5) * 18;
        const halfW = ((roofRight - roofLeft) / 2) * (row / 5);
        const tx = mid - halfW + frac * halfW * 2;
        g.moveTo(tx, ry)
          .lineTo(tx, ry + 3.6)
          .stroke({ color: COL_ROOF_DK, width: 0.3, alpha: 0.4 });
      }
    }

    // Gold ridge cap
    g.moveTo(mid - 30, roofY + 3)
      .lineTo(mid, roofY - 1)
      .lineTo(mid + 30, roofY + 3)
      .stroke({ color: COL_GOLD, width: 2 });
    // Gold ridge finial — ornate
    g.circle(mid, roofY - 1, 3).fill({ color: COL_GOLD });
    g.circle(mid, roofY - 1, 1.5).fill({ color: COL_GOLD_DK });
    // Side finials on ridge
    g.circle(mid - 25, roofY + 2, 2).fill({ color: COL_GOLD, alpha: 0.8 });
    g.circle(mid + 25, roofY + 2, 2).fill({ color: COL_GOLD, alpha: 0.8 });

    // Eaves trim — gold line along roof edge
    g.moveTo(roofLeft - 2, roofY + 19)
      .lineTo(mid, roofY - 1)
      .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.5 });
    g.moveTo(mid, roofY - 1)
      .lineTo(roofRight + 2, roofY + 19)
      .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.5 });

    // ── Carved stone support columns (replacing timber posts) ──
    const posts = [roofLeft + 10, PW / 2 - 20, PW / 2 + 20, roofRight - 10];
    for (const px of posts) {
      this._drawSupportColumn(g, px, roofY + 16, wallY);
    }

    // Cross-braces in dark iron
    g.moveTo(posts[0], roofY + 22)
      .lineTo(posts[1], roofY + 20)
      .stroke({ color: COL_IRON, width: 1.5 });
    g.moveTo(posts[2], roofY + 20)
      .lineTo(posts[3], roofY + 22)
      .stroke({ color: COL_IRON, width: 1.5 });
    // Gold rivets on cross-braces
    g.circle(posts[0] + 3, roofY + 22, 0.8).fill({ color: COL_GOLD });
    g.circle(posts[1] - 3, roofY + 20, 0.8).fill({ color: COL_GOLD });
    g.circle(posts[2] + 3, roofY + 20, 0.8).fill({ color: COL_GOLD });
    g.circle(posts[3] - 3, roofY + 22, 0.8).fill({ color: COL_GOLD });

    // ── Gargoyle heads at roof corners ──
    this._drawGargoyle(g, roofLeft - 2, roofY + 16, -1);
    this._drawGargoyle(g, roofRight + 2, roofY + 16, 1);

    // ── Firing line — worn wooden platform with iron edging ──
    g.rect(55, PH - 32, 80, 4)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_IRON_DK, width: 0.8 });
    // Plank lines
    for (let i = 0; i < 80; i += 16) {
      g.moveTo(55 + i, PH - 32)
        .lineTo(55 + i, PH - 28)
        .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.5 });
    }
    // Iron edge strips
    g.rect(55, PH - 32, 80, 1).fill({ color: COL_IRON, alpha: 0.4 });
    g.rect(55, PH - 29, 80, 1).fill({ color: COL_IRON, alpha: 0.4 });

    // ── Moss and ivy on the stonework ──
    this._drawMoss(g, 10, wallY + wallH - 3, 12);
    this._drawMoss(g, PW - 20, wallY + wallH - 2, 10);
    this._drawMoss(g, 50, wallY - 3, 8);
    this._drawMoss(g, PW - 60, wallY - 4, 7);
    this._drawMoss(g, PW / 2 + 30, wallY - 2, 6);

    // Ivy on left pillar
    this._drawIvy(g, 8, 20, 60);
    // Ivy on right wall corner
    this._drawIvy(g, PW - 10, 25, 50);
    // Ivy on back wall
    this._drawIvy(g, wallX + 15, wallY + 5, 40);
    this._drawIvy(g, wallX + wallW - 18, wallY + 8, 35);
  }

  // =========================================================================
  // Targets — three gold-trimmed stands at different distances
  // =========================================================================

  private _drawTargets(): void {
    const g = this._targets;

    const positions = [
      { x: PW - 35, y: 48 },
      { x: PW - 55, y: 70 },
      { x: PW - 38, y: 90 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];

      // Ornate iron A-frame legs with gold joints
      g.moveTo(p.x - 5, p.y + 20)
        .lineTo(p.x - 1, p.y - 16)
        .stroke({ color: COL_IRON, width: 3 });
      g.moveTo(p.x + 5, p.y + 20)
        .lineTo(p.x + 1, p.y - 16)
        .stroke({ color: COL_IRON, width: 3 });
      // Gold accents at joints
      g.circle(p.x, p.y - 16, 2).fill({ color: COL_GOLD });
      g.circle(p.x - 4, p.y + 20, 1.5).fill({ color: COL_GOLD, alpha: 0.7 });
      g.circle(p.x + 4, p.y + 20, 1.5).fill({ color: COL_GOLD, alpha: 0.7 });
      // Iron cross brace with decorative curl
      g.moveTo(p.x - 4, p.y + 8)
        .lineTo(p.x + 4, p.y + 8)
        .stroke({ color: COL_IRON_DK, width: 1.5 });
      // Small curl at ends of brace
      g.moveTo(p.x - 4, p.y + 8)
        .quadraticCurveTo(p.x - 6, p.y + 6, p.x - 4, p.y + 5)
        .stroke({ color: COL_IRON_DK, width: 0.8 });
      g.moveTo(p.x + 4, p.y + 8)
        .quadraticCurveTo(p.x + 6, p.y + 6, p.x + 4, p.y + 5)
        .stroke({ color: COL_IRON_DK, width: 0.8 });

      // Target face — concentric rings (gold-edged)
      const r = i === 1 ? 14 : 12;
      // Gold rim
      g.circle(p.x, p.y, r + 1.5)
        .fill({ color: COL_GOLD })
        .stroke({ color: COL_GOLD_DK, width: 0.5 });
      // Outer white
      g.circle(p.x, p.y, r)
        .fill({ color: 0xf8f4e8 })
        .stroke({ color: 0xccccbb, width: 1 });
      // Black ring
      g.circle(p.x, p.y, r * 0.78).fill({ color: 0x1a1a1a });
      // Blue ring
      g.circle(p.x, p.y, r * 0.58).fill({ color: 0x2255aa });
      // Red ring
      g.circle(p.x, p.y, r * 0.38).fill({ color: 0xcc2222 });
      // Gold bullseye
      g.circle(p.x, p.y, r * 0.18).fill({ color: COL_GOLD });

      // Stuck arrows from previous shots
      const stuckArrows = [
        { dx: -3, dy: -2 },
        { dx: 5, dy: 1 },
        { dx: -1, dy: 4 },
      ];
      for (let a = 0; a < (i === 1 ? 3 : 2); a++) {
        const sa = stuckArrows[a];
        g.moveTo(p.x + sa.dx, p.y + sa.dy)
          .lineTo(p.x + sa.dx - 8, p.y + sa.dy)
          .stroke({ color: COL_ARROW_SHAFT, width: 1 });
        // Fletching
        g.moveTo(p.x + sa.dx - 7, p.y + sa.dy - 1.5)
          .lineTo(p.x + sa.dx - 9, p.y + sa.dy)
          .lineTo(p.x + sa.dx - 7, p.y + sa.dy + 1.5)
          .fill({ color: COL_FLETCHING, alpha: 0.7 });
      }
    }
  }

  // =========================================================================
  // Props — hay bales, ornate iron arrow rack, trophies, training dummy
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Hay bales (stacked, left side) ──
    g.roundRect(10, PH - 28, 20, 14, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    g.roundRect(28, PH - 26, 18, 12, 2)
      .fill({ color: 0xb89850 })
      .stroke({ color: COL_HAY_DK, width: 1 });
    g.roundRect(14, PH - 40, 18, 14, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    // Hay texture strands
    for (let i = 0; i < 4; i++) {
      g.moveTo(12 + i * 5, PH - 25)
        .lineTo(14 + i * 5, PH - 28)
        .stroke({ color: COL_HAY_DK, width: 0.3, alpha: 0.5 });
    }
    // Loose straw on ground
    g.moveTo(8, PH - 16)
      .lineTo(14, PH - 18)
      .stroke({ color: COL_HAY, width: 0.5, alpha: 0.6 });
    g.moveTo(35, PH - 16)
      .lineTo(42, PH - 17)
      .stroke({ color: COL_HAY, width: 0.5, alpha: 0.5 });

    // ── Ornate iron arrow rack with gilt details ──
    const rackX = 168;
    const rackY = PH - 55;
    // Iron vertical uprights with scrollwork
    g.rect(rackX, rackY, 3, 42)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    g.rect(rackX + 24, rackY, 3, 42)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Iron scrollwork at top of uprights
    g.moveTo(rackX + 1.5, rackY)
      .quadraticCurveTo(rackX - 4, rackY - 6, rackX + 1.5, rackY - 8)
      .stroke({ color: COL_IRON, width: 1.2 });
    g.moveTo(rackX + 25.5, rackY)
      .quadraticCurveTo(rackX + 31, rackY - 6, rackX + 25.5, rackY - 8)
      .stroke({ color: COL_IRON, width: 1.2 });
    // Gold finials on top
    g.circle(rackX + 1.5, rackY - 8, 1.5).fill({ color: COL_GOLD });
    g.circle(rackX + 25.5, rackY - 8, 1.5).fill({ color: COL_GOLD });
    // Horizontal bars — iron with gold caps
    g.rect(rackX, rackY + 8, 27, 2).fill({ color: COL_IRON_DK });
    g.rect(rackX, rackY + 28, 27, 2).fill({ color: COL_IRON_DK });
    // Gold end-caps on bars
    g.circle(rackX, rackY + 9, 1.2).fill({ color: COL_GOLD, alpha: 0.7 });
    g.circle(rackX + 27, rackY + 9, 1.2).fill({ color: COL_GOLD, alpha: 0.7 });
    g.circle(rackX, rackY + 29, 1.2).fill({ color: COL_GOLD, alpha: 0.7 });
    g.circle(rackX + 27, rackY + 29, 1.2).fill({ color: COL_GOLD, alpha: 0.7 });

    // Bows hanging on rack (3 bows — better quality)
    for (let i = 0; i < 3; i++) {
      const bx = rackX + 5 + i * 7;
      g.moveTo(bx, rackY + 10)
        .quadraticCurveTo(bx + 4, rackY + 19, bx, rackY + 28)
        .stroke({ color: COL_BOW, width: 1.8 });
      // String
      g.moveTo(bx, rackY + 10)
        .lineTo(bx, rackY + 28)
        .stroke({ color: COL_BOWSTRING, width: 0.4, alpha: 0.5 });
      // Gold tips on bow limbs
      g.circle(bx, rackY + 10, 0.8).fill({ color: COL_GOLD });
      g.circle(bx, rackY + 28, 0.8).fill({ color: COL_GOLD });
    }

    // ── Ornate quiver with special arrows (leaning against rack) ──
    const qx = rackX + 30;
    const qy = rackY + 12;
    // Quiver body (tooled leather)
    g.moveTo(qx, qy)
      .lineTo(qx + 3, qy + 30)
      .lineTo(qx + 9, qy + 30)
      .lineTo(qx + 7, qy)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 1 });
    // Gold-embossed straps
    g.rect(qx + 1, qy + 8, 7, 2).fill({ color: COL_GOLD, alpha: 0.5 });
    g.rect(qx + 1, qy + 20, 7, 2).fill({ color: COL_GOLD, alpha: 0.5 });
    // Tooling pattern on quiver
    g.rect(qx + 2, qy + 12, 5, 6)
      .stroke({ color: COL_LEATHER_DK, width: 0.4 });
    g.moveTo(qx + 2, qy + 12)
      .lineTo(qx + 7, qy + 18)
      .stroke({ color: COL_LEATHER_DK, width: 0.3, alpha: 0.4 });
    g.moveTo(qx + 7, qy + 12)
      .lineTo(qx + 2, qy + 18)
      .stroke({ color: COL_LEATHER_DK, width: 0.3, alpha: 0.4 });
    // Arrow shafts — gold-tipped special arrows
    for (let i = 0; i < 4; i++) {
      g.moveTo(qx + 2 + i * 1.2, qy)
        .lineTo(qx + 1.5 + i * 1.2, qy - 10)
        .stroke({ color: COL_ARROW_SHAFT, width: 0.8 });
      // Gold arrowheads
      g.moveTo(qx + 0.5 + i * 1.2, qy - 9)
        .lineTo(qx + 1.5 + i * 1.2, qy - 12)
        .lineTo(qx + 2.5 + i * 1.2, qy - 9)
        .fill({ color: COL_GOLD, alpha: 0.8 });
      // Fletching — red feathers
      g.moveTo(qx + 1 + i * 1.2, qy - 1)
        .lineTo(qx + 2.5 + i * 1.2, qy - 3)
        .lineTo(qx + 1 + i * 1.2, qy - 5)
        .stroke({ color: 0xcc2244, width: 0.5, alpha: 0.6 });
    }

    // ── Trophy display (right of quiver — mounted bow and crossed arrows) ──
    const tpx = 148;
    const tpy = 30;
    // Wooden plaque background
    g.roundRect(tpx - 10, tpy - 4, 20, 28, 2)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_GOLD_DK, width: 1 });
    // Mounted ornate bow
    g.moveTo(tpx, tpy + 1)
      .quadraticCurveTo(tpx + 7, tpy + 12, tpx, tpy + 23)
      .stroke({ color: COL_BOW, width: 2 });
    g.moveTo(tpx, tpy + 1)
      .lineTo(tpx, tpy + 23)
      .stroke({ color: COL_BOWSTRING, width: 0.5, alpha: 0.4 });
    // Gold bow tips
    g.circle(tpx, tpy + 1, 1.2).fill({ color: COL_GOLD });
    g.circle(tpx, tpy + 23, 1.2).fill({ color: COL_GOLD });
    // Crossed arrows behind the bow
    g.moveTo(tpx - 6, tpy + 3)
      .lineTo(tpx + 6, tpy + 21)
      .stroke({ color: COL_ARROW_SHAFT, width: 1 });
    g.moveTo(tpx + 6, tpy + 3)
      .lineTo(tpx - 6, tpy + 21)
      .stroke({ color: COL_ARROW_SHAFT, width: 1 });
    // Gold arrowheads on crossed arrows
    g.circle(tpx - 6, tpy + 3, 1).fill({ color: COL_GOLD, alpha: 0.6 });
    g.circle(tpx + 6, tpy + 3, 1).fill({ color: COL_GOLD, alpha: 0.6 });

    // ── Training dummy (right side, near targets) — better equipped ──
    const dx = PW - 80;
    const dy = PH - 52;
    // Iron-reinforced post
    g.rect(dx - 2, dy, 4, 40)
      .fill({ color: COL_IRON })
      .stroke({ color: COL_IRON_DK, width: 0.5 });
    // Cross-arm (iron)
    g.rect(dx - 12, dy + 8, 24, 3).fill({ color: COL_IRON });
    // Sack body (torso) with painted armor target
    g.roundRect(dx - 8, dy - 6, 16, 20, 3)
      .fill({ color: COL_DUMMY_SACK })
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    // Painted target circle on torso
    g.circle(dx, dy + 4, 5)
      .stroke({ color: 0xcc2222, width: 1 });
    g.circle(dx, dy + 4, 2).fill({ color: 0xcc2222, alpha: 0.5 });
    // Head (smaller sack) with helmet outline
    g.circle(dx, dy - 12, 6)
      .fill({ color: COL_DUMMY_SACK })
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    // Crude helmet shape
    g.moveTo(dx - 6, dy - 12)
      .quadraticCurveTo(dx, dy - 20, dx + 6, dy - 12)
      .stroke({ color: COL_IRON, width: 1 });
    // X marks for eyes
    g.moveTo(dx - 3, dy - 14)
      .lineTo(dx - 1, dy - 12)
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    g.moveTo(dx - 1, dy - 14)
      .lineTo(dx - 3, dy - 12)
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    g.moveTo(dx + 1, dy - 14)
      .lineTo(dx + 3, dy - 12)
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    g.moveTo(dx + 3, dy - 14)
      .lineTo(dx + 1, dy - 12)
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    // Arrow stuck in dummy
    g.moveTo(dx - 14, dy + 2)
      .lineTo(dx - 4, dy + 2)
      .stroke({ color: COL_ARROW_SHAFT, width: 1.2 });
    g.moveTo(dx - 13, dy + 0.5)
      .lineTo(dx - 15, dy + 2)
      .lineTo(dx - 13, dy + 3.5)
      .fill({ color: COL_FLETCHING, alpha: 0.7 });

    // ── Sandbags (bottom right, against wall) ──
    const sbx = PW - 30;
    const sby = PH - 24;
    g.roundRect(sbx, sby, 18, 8, 2)
      .fill({ color: 0x998866 })
      .stroke({ color: 0x776644, width: 0.8 });
    g.roundRect(sbx + 4, sby - 7, 16, 8, 2)
      .fill({ color: 0xaa9977 })
      .stroke({ color: 0x776644, width: 0.8 });
    // Tie strings
    g.moveTo(sbx + 8, sby)
      .lineTo(sbx + 8, sby - 2)
      .stroke({ color: 0x665533, width: 0.5 });
  }

  // =========================================================================
  // Animated archers — elite with plate armor
  // =========================================================================

  private _updateArchers(time: number): void {
    const ag = this._archers;
    const fg = this._arrows;
    ag.clear();
    fg.clear();

    const archerDefs = [
      {
        x: 75,
        y: PH - 50,
        cycle: ARCHER1_CYCLE,
        offset: 0,
        targetX: PW - 35,
        targetY: 48,
        hair: COL_HAIR_BROWN,
      },
      {
        x: 115,
        y: PH - 48,
        cycle: ARCHER2_CYCLE,
        offset: 1.3,
        targetX: PW - 55,
        targetY: 70,
        hair: COL_HAIR_BLOND,
      },
    ];

    for (const a of archerDefs) {
      const t = ((time + a.offset) % a.cycle) / a.cycle;

      // Phases: 0-0.3 draw, 0.3-0.4 hold, 0.4-0.42 release, 0.42-1.0 relax
      let bowDraw = 0;
      let released = false;
      let arrowProgress = -1;

      if (t < 0.3) {
        bowDraw = t / 0.3;
      } else if (t < 0.4) {
        bowDraw = 1;
      } else if (t < 0.42) {
        bowDraw = 1 - (t - 0.4) / 0.02;
        released = true;
      } else {
        bowDraw = 0;
        released = true;
        arrowProgress = (t - 0.42) / 0.35;
        if (arrowProgress > 1) arrowProgress = -1;
      }

      // ── Legs (armored greaves) ──
      ag.rect(a.x - 4, a.y + 14, 3, 8).fill({ color: COL_ARMOR_DK });
      ag.rect(a.x + 1, a.y + 14, 3, 8).fill({ color: COL_ARMOR_DK });
      // Greave highlight
      ag.rect(a.x - 3, a.y + 14, 1, 8).fill({ color: COL_ARMOR_LT, alpha: 0.3 });
      ag.rect(a.x + 2, a.y + 14, 1, 8).fill({ color: COL_ARMOR_LT, alpha: 0.3 });
      // Knee guards
      ag.circle(a.x - 2.5, a.y + 14, 2).fill({ color: COL_ARMOR });
      ag.circle(a.x + 2.5, a.y + 14, 2).fill({ color: COL_ARMOR });

      // ── Torso (plate armor over gambeson) ──
      // Gambeson base
      ag.rect(a.x - 5, a.y, 10, 14)
        .fill({ color: COL_CLOTH_GREEN })
        .stroke({ color: COL_CLOTH_GREEN_DK, width: 0.5 });
      // Breastplate overlay
      ag.rect(a.x - 4, a.y + 1, 8, 10)
        .fill({ color: COL_ARMOR })
        .stroke({ color: COL_ARMOR_DK, width: 0.5 });
      // Armor highlight
      ag.rect(a.x - 1, a.y + 2, 3, 8).fill({ color: COL_ARMOR_LT, alpha: 0.2 });
      // Pauldrons (shoulder plates)
      ag.roundRect(a.x - 6, a.y - 1, 5, 5, 1).fill({ color: COL_ARMOR });
      ag.roundRect(a.x + 1, a.y - 1, 5, 5, 1).fill({ color: COL_ARMOR });
      // Gold trim on armor
      ag.rect(a.x - 4, a.y + 1, 8, 1).fill({ color: COL_GOLD, alpha: 0.4 });
      ag.rect(a.x - 4, a.y + 10, 8, 1).fill({ color: COL_GOLD, alpha: 0.3 });
      // Belt with gold buckle
      ag.rect(a.x - 5, a.y + 10, 10, 2).fill({ color: COL_LEATHER });
      ag.circle(a.x, a.y + 11, 1.2).fill({ color: COL_GOLD });

      // ── Head with helmet ──
      ag.circle(a.x, a.y - 5, 5)
        .fill({ color: COL_SKIN })
        .stroke({ color: COL_SKIN_DK, width: 0.5 });
      // Open-face helm (nasal guard style)
      ag.moveTo(a.x - 5, a.y - 4)
        .quadraticCurveTo(a.x, a.y - 13, a.x + 5, a.y - 4)
        .fill({ color: COL_ARMOR });
      // Nasal guard
      ag.rect(a.x - 0.5, a.y - 10, 1, 6).fill({ color: COL_ARMOR_DK });
      // Helm highlight
      ag.moveTo(a.x - 2, a.y - 10)
        .quadraticCurveTo(a.x, a.y - 12, a.x + 2, a.y - 10)
        .stroke({ color: COL_ARMOR_LT, width: 0.5, alpha: 0.5 });
      // Gold trim on helm
      ag.moveTo(a.x - 5, a.y - 4)
        .quadraticCurveTo(a.x, a.y - 13, a.x + 5, a.y - 4)
        .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });
      // Eye (facing right toward targets)
      ag.circle(a.x + 3, a.y - 5, 0.8).fill({ color: 0x222222 });

      // ── Arms + bow ──
      const bowX = a.x + 8;
      const bowY = a.y + 2;
      // Bow arm (armored vambrace)
      ag.moveTo(a.x + 4, a.y + 2)
        .lineTo(bowX + 6, bowY)
        .stroke({ color: COL_ARMOR, width: 2.5 });
      // Vambrace guard
      ag.rect(a.x + 6, a.y + 0.5, 5, 3.5).fill({ color: COL_ARMOR_DK });
      ag.rect(a.x + 6, a.y + 0.5, 5, 1).fill({ color: COL_GOLD, alpha: 0.3 });

      // Bow (elite recurve with gold tips)
      const bend = 4 + bowDraw * 4;
      ag.moveTo(bowX + 8, bowY - 13)
        .quadraticCurveTo(bowX + 8 + bend, bowY, bowX + 8, bowY + 13)
        .stroke({ color: COL_BOW, width: 2.2 });
      // Gold nocks on bow limb tips
      ag.circle(bowX + 8, bowY - 13, 1).fill({ color: COL_GOLD });
      ag.circle(bowX + 8, bowY + 13, 1).fill({ color: COL_GOLD });
      // Bowstring
      const stringPull = bowDraw * 6;
      ag.moveTo(bowX + 8, bowY - 13)
        .lineTo(bowX + 8 - stringPull, bowY)
        .lineTo(bowX + 8, bowY + 13)
        .stroke({ color: COL_BOWSTRING, width: 0.8 });

      // Draw arm (pulling string back — armored)
      const drawArmX = bowX + 8 - stringPull;
      ag.moveTo(a.x + 2, a.y + 3)
        .lineTo(drawArmX, bowY)
        .stroke({ color: COL_ARMOR, width: 2.5 });
      // Glove on draw hand
      ag.circle(drawArmX, bowY, 1.8).fill({ color: COL_LEATHER });

      // Arrow nocked on bowstring (visible during draw/hold)
      if (!released) {
        ag.moveTo(drawArmX, bowY)
          .lineTo(bowX + 14, bowY)
          .stroke({ color: COL_ARROW_SHAFT, width: 1.2 });
        // Gold arrowhead
        ag.moveTo(bowX + 14, bowY - 1.5)
          .lineTo(bowX + 17, bowY)
          .lineTo(bowX + 14, bowY + 1.5)
          .fill({ color: COL_GOLD });
        // Fletching
        ag.moveTo(drawArmX + 1, bowY - 1.5)
          .lineTo(drawArmX - 2, bowY)
          .lineTo(drawArmX + 1, bowY + 1.5)
          .fill({ color: 0xcc2244, alpha: 0.7 });
      }

      // ── Flying arrow ──
      if (arrowProgress >= 0 && arrowProgress <= 1) {
        const startAX = bowX + 14;
        const startAY = bowY;
        const ax = startAX + (a.targetX - startAX) * arrowProgress;
        const ay =
          startAY +
          (a.targetY - startAY) * arrowProgress -
          Math.sin(arrowProgress * Math.PI) * 8;

        // Shaft
        fg.moveTo(ax - 8, ay)
          .lineTo(ax + 4, ay)
          .stroke({ color: COL_ARROW_SHAFT, width: 1.2 });
        // Gold head
        fg.moveTo(ax + 4, ay - 1.5)
          .lineTo(ax + 7, ay)
          .lineTo(ax + 4, ay + 1.5)
          .fill({ color: COL_GOLD });
        // Red fletching
        fg.moveTo(ax - 6, ay - 2)
          .lineTo(ax - 9, ay)
          .lineTo(ax - 6, ay + 2)
          .fill({ color: 0xcc2244, alpha: 0.6 });
      }
    }

    // ── Target recoil on arrow impact ──
    const t1 = ((time + 0) % ARCHER1_CYCLE) / ARCHER1_CYCLE;
    const t2 = ((time + 1.3) % ARCHER2_CYCLE) / ARCHER2_CYCLE;
    const hitTime1 = t1 > 0.77 && t1 < 0.82;
    const hitTime2 = t2 > 0.77 && t2 < 0.82;
    if (hitTime1 || hitTime2) {
      const recoil =
        Math.sin(((hitTime1 ? t1 : t2) - 0.77) / 0.05 * Math.PI) * 2;
      this._targets.position.set(recoil, 0);
    } else {
      this._targets.position.set(0, 0);
    }
  }

  // =========================================================================
  // Flags / pennants — elite banners with gold fringe
  // =========================================================================

  private _drawFlags(time: number): void {
    const positions = [
      { g: this._flagL, x: 10, y: 6 },
      { g: this._flagR, x: PW - 10, y: 6 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const { g, x, y } = positions[i];
      g.clear();

      const wave = Math.sin(time * FLAG_SPEED + i * 2) * 4;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + i * 2 + 1) * 2;

      // Iron pole with gold cap
      g.rect(x - 1, y, 2, 24)
        .fill({ color: COL_IRON })
        .stroke({ color: COL_IRON_DK, width: 0.3 });
      // Gold pole cap (ornate)
      g.circle(x, y, 2).fill({ color: COL_GOLD });
      g.circle(x, y, 1).fill({ color: COL_GOLD_LT });

      // Elite banner (wider, rectangular with swallow-tail)
      const dir = i === 0 ? 1 : -1;
      const bw = 18; // banner width
      const bh = 18; // banner height

      // Banner shape with swallow-tail cut
      g.moveTo(x + dir * 1, y + 3)
        .bezierCurveTo(
          x + dir * (bw * 0.6) + wave,
          y + 4 + wave2,
          x + dir * (bw * 0.8) + wave * 0.8,
          y + 6 + wave2 * 0.5,
          x + dir * bw + wave * 0.6,
          y + 3 + wave2 * 0.3,
        )
        .lineTo(x + dir * (bw - 3) + wave * 0.5, y + bh / 2 + wave2 * 0.3)
        .lineTo(x + dir * bw + wave * 0.4, y + bh + wave2 * 0.2)
        .bezierCurveTo(
          x + dir * (bw * 0.8) + wave * 0.3,
          y + bh - 2 + wave2 * 0.1,
          x + dir * (bw * 0.4) + wave * 0.2,
          y + bh + 1,
          x + dir * 1,
          y + bh + 2,
        )
        .closePath()
        .fill({ color: this._playerColor })
        .stroke({ color: this._playerColor, width: 0.3, alpha: 0.5 });

      // Gold fringe along bottom edge
      for (let f = 0; f < 7; f++) {
        const fx =
          x + dir * (1 + f * 2.5) + wave * (0.6 - f * 0.06);
        const fy = y + bh + 1 + Math.sin(time * 5 + f) * 0.8;
        g.moveTo(fx, fy)
          .lineTo(fx + dir * 0.5, fy + 2.5)
          .stroke({ color: COL_GOLD, width: 0.8 });
      }

      // Gold border line on banner
      g.moveTo(x + dir * 1, y + 3)
        .bezierCurveTo(
          x + dir * (bw * 0.6) + wave,
          y + 4 + wave2,
          x + dir * (bw * 0.8) + wave * 0.8,
          y + 6 + wave2 * 0.5,
          x + dir * bw + wave * 0.6,
          y + 3 + wave2 * 0.3,
        )
        .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.6 });

      // Emblem on banner (crossed arrows)
      const ex = x + dir * 9 + wave * 0.3;
      const ey = y + bh / 2 + 2 + wave2 * 0.2;
      g.moveTo(ex - 3, ey - 3)
        .lineTo(ex + 3, ey + 3)
        .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.6 });
      g.moveTo(ex + 3, ey - 3)
        .lineTo(ex - 3, ey + 3)
        .stroke({ color: COL_GOLD, width: 0.8, alpha: 0.6 });
      g.circle(ex, ey, 2).fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  // =========================================================================
  // Iron braziers at corners (warm pulsing glow)
  // =========================================================================

  private _drawBraziers(time: number): void {
    const g = this._braziers;
    g.clear();

    const pulse1 = 0.6 + Math.sin(time * 2.5) * 0.15;
    const pulse2 = 0.6 + Math.sin(time * 2.5 + 1.5) * 0.15;
    const flicker = Math.sin(time * 8) * 0.1;

    const brazierPositions = [
      { x: 42, y: 28, pulse: pulse1 },
      { x: PW - 42, y: 28, pulse: pulse2 },
    ];

    for (const bp of brazierPositions) {
      const { x: bx, y: by, pulse } = bp;

      // Warm glow
      g.circle(bx, by - 4, 12).fill({
        color: COL_BRAZIER_GLOW,
        alpha: (pulse + flicker) * 0.1,
      });
      g.circle(bx, by - 4, 7).fill({
        color: COL_LANTERN_GLOW,
        alpha: (pulse + flicker) * 0.18,
      });

      // Iron brazier bowl
      g.moveTo(bx - 5, by)
        .lineTo(bx - 3, by + 5)
        .lineTo(bx + 3, by + 5)
        .lineTo(bx + 5, by)
        .closePath()
        .fill({ color: COL_BRAZIER_BODY })
        .stroke({ color: COL_IRON_DK, width: 0.8 });
      // Iron stand legs
      g.moveTo(bx - 3, by + 5)
        .lineTo(bx - 5, by + 12)
        .stroke({ color: COL_IRON, width: 1.2 });
      g.moveTo(bx + 3, by + 5)
        .lineTo(bx + 5, by + 12)
        .stroke({ color: COL_IRON, width: 1.2 });
      g.moveTo(bx, by + 5)
        .lineTo(bx, by + 12)
        .stroke({ color: COL_IRON, width: 1 });
      // Decorative ring on bowl
      g.moveTo(bx - 4, by + 2)
        .lineTo(bx + 4, by + 2)
        .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });

      // Fire in brazier — flickering flames
      const flameH = 4 + Math.sin(time * 6 + bx) * 1.5;
      // Core flame
      g.moveTo(bx - 2, by)
        .quadraticCurveTo(
          bx - 1 + Math.sin(time * 7) * 1,
          by - flameH,
          bx,
          by - flameH - 2,
        )
        .quadraticCurveTo(
          bx + 1 + Math.sin(time * 9) * 0.5,
          by - flameH,
          bx + 2,
          by,
        )
        .closePath()
        .fill({ color: 0xffcc22, alpha: pulse * 0.9 });
      // Inner flame (brighter)
      g.moveTo(bx - 1, by)
        .quadraticCurveTo(bx, by - flameH + 1, bx + 1, by)
        .closePath()
        .fill({ color: 0xffee66, alpha: pulse });
      // Embers/sparks (tiny dots rising)
      const spark1Y = by - flameH - 2 - ((time * 12 + bx) % 8);
      const spark2Y = by - flameH - 1 - ((time * 10 + bx + 3) % 6);
      if (spark1Y > by - 20) {
        g.circle(bx + Math.sin(time * 5) * 2, spark1Y, 0.5).fill({
          color: COL_BRAZIER_GLOW,
          alpha: 0.6,
        });
      }
      if (spark2Y > by - 18) {
        g.circle(bx - 1 + Math.sin(time * 4 + 1) * 1.5, spark2Y, 0.4).fill({
          color: COL_LANTERN_GLOW,
          alpha: 0.5,
        });
      }
    }
  }

  // =========================================================================
  // Stone texture helpers
  // =========================================================================

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
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.35 });
      }
      for (let col = offset; col < w - 8; col += 24) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 20, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.15 });
        g.moveTo(x + col + 1, y + row + 7)
          .lineTo(x + col + 20, y + row + 7)
          .stroke({ color: COL_STONE_DK, width: 0.4, alpha: 0.15 });
      }
    }
  }

  private _drawStoneVariation(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const lightStones = [
      [0.1, 0.15],
      [0.6, 0.3],
      [0.25, 0.6],
      [0.8, 0.75],
      [0.45, 0.45],
      [0.15, 0.85],
      [0.7, 0.1],
    ];
    for (const [fx, fy] of lightStones) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({
        color: COL_STONE_LT,
        alpha: 0.2,
      });
    }
    const darkStones = [
      [0.3, 0.1],
      [0.75, 0.5],
      [0.1, 0.4],
      [0.55, 0.7],
      [0.85, 0.2],
    ];
    for (const [fx, fy] of darkStones) {
      g.rect(x + fx * w, y + fy * h, 10, 6).fill({
        color: COL_STONE_DK,
        alpha: 0.2,
      });
    }
  }

  private _drawCrenellations(
    g: Graphics,
    x: number,
    y: number,
    w: number,
  ): void {
    const merlonW = 7;
    const merlonH = 6;
    const gap = 5;
    const step = merlonW + gap;
    for (let mx = x + 2; mx < x + w - merlonW; mx += step) {
      g.rect(mx, y - merlonH, merlonW, merlonH)
        .fill({ color: COL_STONE })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Dark cap stone
      g.rect(mx - 0.5, y - merlonH - 1.5, merlonW + 1, 2).fill({
        color: COL_STONE_DK,
      });
      // Gold trim on top of merlon
      g.rect(mx, y - merlonH - 1.5, merlonW, 0.8).fill({
        color: COL_GOLD,
        alpha: 0.25,
      });
    }
  }

  private _drawArrowSlit(g: Graphics, x: number, y: number): void {
    g.rect(x + 1, y - 1, 4, 14).fill({ color: COL_STONE_DK });
    g.rect(x + 2, y, 2, 12).fill({ color: COL_WINDOW });
    g.rect(x, y + 4, 6, 2).fill({ color: COL_WINDOW });
    g.rect(x + 1, y - 1, 4, 14).stroke({ color: COL_STONE_DK, width: 0.5 });
    // Iron frame
    g.rect(x + 1, y - 1, 4, 14).stroke({ color: COL_IRON_DK, width: 0.3 });
  }

  private _drawRosetteWindow(g: Graphics, cx: number, cy: number): void {
    const r = 10;

    // Deep stone recess
    g.circle(cx, cy, r + 3).fill({ color: COL_STONE_DK });
    // Gold outer ring
    g.circle(cx, cy, r + 2).stroke({ color: COL_GOLD, width: 1, alpha: 0.4 });
    g.circle(cx, cy, r + 1.5).fill({ color: COL_WINDOW_FRAME });
    g.circle(cx, cy, r).fill({ color: COL_WINDOW });

    // Stained glass panes — richer colors
    const colors = [0xcc2244, 0x2255aa, 0xffd700, 0x22aa55, 0xcc2244, 0x2255aa];
    const numPanes = 6;
    for (let i = 0; i < numPanes; i++) {
      const a1 = (i / numPanes) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / numPanes) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(cx, cy)
        .lineTo(cx + Math.cos(a1) * (r - 1), cy + Math.sin(a1) * (r - 1))
        .lineTo(cx + Math.cos(a2) * (r - 1), cy + Math.sin(a2) * (r - 1))
        .closePath()
        .fill({ color: colors[i], alpha: 0.7 });
    }

    // Lead caming — radial lines
    for (let i = 0; i < numPanes; i++) {
      const a = (i / numPanes) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(cx, cy)
        .lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        .stroke({ color: 0x222222, width: 0.8 });
    }
    // Center boss (gold)
    g.circle(cx, cy, 2.5).fill({ color: COL_GOLD });
    g.circle(cx, cy, 1.5).fill({ color: COL_GOLD_LT });

    // Stone surround
    g.circle(cx, cy, r + 3).stroke({ color: COL_STONE_DK, width: 1.5 });
    // Keystone at top (gold-trimmed)
    g.moveTo(cx - 3, cy - r - 3)
      .lineTo(cx, cy - r - 6)
      .lineTo(cx + 3, cy - r - 3)
      .fill({ color: COL_STONE_LT });
    g.moveTo(cx - 3, cy - r - 3)
      .lineTo(cx, cy - r - 6)
      .lineTo(cx + 3, cy - r - 3)
      .stroke({ color: COL_GOLD, width: 0.5, alpha: 0.5 });
  }

  // =========================================================================
  // Decorative stone frieze along top of wall
  // =========================================================================

  private _drawFrieze(
    g: Graphics,
    wallX: number,
    wallY: number,
    wallW: number,
  ): void {
    const fy = wallY + 2;
    const fh = 5;

    // Frieze band
    g.rect(wallX + 2, fy, wallW - 4, fh).fill({ color: COL_STONE_DK });

    // Repeating carved motif — diamond and circle pattern
    for (let fx = wallX + 8; fx < wallX + wallW - 8; fx += 16) {
      // Diamond shape
      g.moveTo(fx, fy + 1)
        .lineTo(fx + 2.5, fy + fh / 2)
        .lineTo(fx, fy + fh - 1)
        .lineTo(fx - 2.5, fy + fh / 2)
        .closePath()
        .fill({ color: COL_STONE_LT, alpha: 0.3 });

      // Small circle between diamonds
      g.circle(fx + 8, fy + fh / 2, 1.5).fill({
        color: COL_STONE_LT,
        alpha: 0.25,
      });
    }

    // Gold trim lines along top and bottom of frieze
    g.rect(wallX + 2, fy, wallW - 4, 0.8).fill({
      color: COL_GOLD,
      alpha: 0.3,
    });
    g.rect(wallX + 2, fy + fh - 0.8, wallW - 4, 0.8).fill({
      color: COL_GOLD,
      alpha: 0.25,
    });
  }

  // =========================================================================
  // Carved stone column (replaces wooden pillar)
  // =========================================================================

  private _drawStoneColumn(
    g: Graphics,
    x: number,
    y: number,
    h: number,
  ): void {
    // Column shaft — dark stone with fluting
    g.rect(x, y, 10, h)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });

    // Fluting (vertical grooves)
    for (let fx = 2; fx < 9; fx += 3) {
      g.rect(x + fx, y + 6, 1, h - 12).fill({
        color: COL_STONE_DK,
        alpha: 0.2,
      });
    }
    // Left shadow
    g.rect(x + 1, y + 1, 3, h - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
    });

    // Brick pattern on column
    for (let row = 0; row < h; row += 8) {
      g.moveTo(x, y + row)
        .lineTo(x + 10, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
    }

    // Gold capital (top) — ornate
    g.rect(x - 3, y - 3, 16, 5)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.rect(x - 3, y - 3, 16, 1.5).fill({ color: COL_GOLD, alpha: 0.4 });
    // Scroll volutes on capital
    g.moveTo(x - 2, y - 1)
      .quadraticCurveTo(x - 4, y - 4, x - 1, y - 3)
      .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });
    g.moveTo(x + 12, y - 1)
      .quadraticCurveTo(x + 14, y - 4, x + 11, y - 3)
      .stroke({ color: COL_GOLD, width: 0.6, alpha: 0.5 });

    // Base — stepped with gold trim
    g.rect(x - 2, y + h - 3, 14, 5)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    g.rect(x - 2, y + h - 3, 14, 1).fill({ color: COL_GOLD, alpha: 0.3 });

    // Gold finial on top
    g.circle(x + 5, y - 5, 2.5).fill({ color: COL_GOLD });
    g.circle(x + 5, y - 5, 1.2).fill({ color: COL_GOLD_LT });
  }

  // =========================================================================
  // Support column (between roof and wall — stone instead of wood)
  // =========================================================================

  private _drawSupportColumn(
    g: Graphics,
    px: number,
    topY: number,
    bottomY: number,
  ): void {
    const colH = bottomY - topY - 6;

    // Stone shaft
    g.rect(px - 2.5, topY, 5, colH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Fluting
    g.rect(px - 0.5, topY + 3, 1, colH - 6).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
    });
    // Stone texture
    for (let j = 3; j < colH - 4; j += 6) {
      g.moveTo(px - 2, topY + j)
        .lineTo(px + 2, topY + j)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
    }
    // Gold band at top
    g.rect(px - 3, topY, 6, 2).fill({ color: COL_STONE_DK });
    g.rect(px - 3, topY, 6, 0.8).fill({ color: COL_GOLD, alpha: 0.35 });
    // Gold band at bottom
    g.rect(px - 3, topY + colH - 2, 6, 2).fill({ color: COL_STONE_DK });
    g.rect(px - 3, topY + colH - 2, 6, 0.8).fill({
      color: COL_GOLD,
      alpha: 0.3,
    });
  }

  // =========================================================================
  // Gargoyle heads on roof corners
  // =========================================================================

  private _drawGargoyle(
    g: Graphics,
    x: number,
    y: number,
    dir: number,
  ): void {
    // Head/snout jutting out
    g.moveTo(x, y)
      .lineTo(x + dir * 8, y + 2)
      .lineTo(x + dir * 8, y + 6)
      .lineTo(x, y + 7)
      .closePath()
      .fill({ color: COL_GARGOYLE })
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
    // Eye
    g.circle(x + dir * 4, y + 3, 1).fill({ color: 0x882222, alpha: 0.6 });
    // Horns
    g.moveTo(x + dir * 2, y)
      .lineTo(x + dir * 1, y - 3)
      .stroke({ color: COL_GARGOYLE_DK, width: 1 });
    g.moveTo(x + dir * 5, y + 1)
      .lineTo(x + dir * 4, y - 2)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
    // Open mouth
    g.moveTo(x + dir * 6, y + 4)
      .lineTo(x + dir * 9, y + 4)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.6 });
  }

  // =========================================================================
  // Vegetation helpers
  // =========================================================================

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2.5).fill({ color: COL_MOSS, alpha: 0.4 });
    g.circle(x + 2, y - 1, 1.5).fill({ color: COL_MOSS, alpha: 0.25 });
    g.circle(x + w - 2, y - 0.5, 1.2).fill({ color: COL_MOSS, alpha: 0.25 });
  }

  private _drawIvy(g: Graphics, x: number, y: number, h: number): void {
    // Main vine stem
    for (let iy = 0; iy < h; iy += 4) {
      const wobble = Math.sin(iy * 0.6) * 2;
      g.circle(x + wobble, y + iy, 1).fill({ color: COL_IVY });
    }
    // Leaves
    for (let iy = 3; iy < h; iy += 7) {
      const wobble = Math.sin(iy * 0.6) * 2;
      const dir = iy % 14 < 7 ? -1 : 1;
      g.circle(x + wobble + dir * 3, y + iy, 2.2).fill({
        color: COL_IVY_LT,
        alpha: 0.65,
      });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.5).fill({
        color: COL_IVY,
        alpha: 0.5,
      });
    }
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
