// Archery range renderer for BuildingView.
//
// Draws a detailed 4×2 tile medieval fantasy archery range with:
//   • Open-air stone training pavilion with timber frame and tiled roof
//   • Crenellated stone back wall with arrow slits and stained-glass rosette
//   • Two corner pillars with finials and moss
//   • Three wooden target stands with ring targets at different distances
//   • Two animated archers drawing, aiming, and releasing arrows
//   • A weapons rack with spare bows and a quiver
//   • Hay bales, sand bags, and training dummies
//   • Waving player-colored pennants on the pillars
//   • Ivy climbing the stonework, moss patches on old stone
//   • Warm lantern glow near the entrance
//
// All drawing uses PixiJS Graphics. The building is 4×TILE_SIZE wide
// and 2×TILE_SIZE tall. Animations are driven by `tick(dt, phase)`.

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const PW = 4 * TS; // 256px wide
const PH = 2 * TS; // 128px tall

// --- Palette ---
const COL_STONE = 0x8b8878;
const COL_STONE_LT = 0xa09d8f;
const COL_STONE_DK = 0x6b6860;
const COL_MORTAR = 0x9a9688;
const COL_WOOD = 0x6b4422;
const COL_WOOD_DK = 0x3d2510;
const COL_WOOD_LT = 0x8a6636;
const COL_ROOF = 0x5a2d2d;
const COL_ROOF_DK = 0x3d1515;
const COL_ROOF_LT = 0x6e3838;
const COL_WINDOW = 0x1a1a2e;
const COL_WINDOW_FRAME = 0x555555;
const COL_MOSS = 0x4a6b3a;
const COL_IVY = 0x3a5a2e;
const COL_IVY_LT = 0x5a7a4a;
const COL_HAY = 0xc9a85c;
const COL_HAY_DK = 0xa88a40;
const COL_SAND = 0xd4c090;
const COL_SKIN = 0xf0c8a0;
const COL_SKIN_DK = 0xd0a878;
const COL_HAIR_BROWN = 0x4a3020;
const COL_HAIR_BLOND = 0xb89050;
const COL_CLOTH_GREEN = 0x4a7a3a;
const COL_CLOTH_GREEN_DK = 0x365a28;
const COL_LEATHER = 0x7a5a30;
const COL_LEATHER_DK = 0x5a4020;
const COL_ARROW_SHAFT = 0x8b7040;
const COL_ARROWHEAD = 0x888888;
const COL_FLETCHING = 0xeeeeee;
const COL_BOW = 0x6b4a28;
const COL_BOWSTRING = 0xccccbb;
const COL_LANTERN_GLOW = 0xffaa44;
const COL_LANTERN_BODY = 0x886622;
const COL_DUMMY_BODY = 0x886644;
const COL_DUMMY_SACK = 0xaa9966;

// Animation timing
const ARCHER1_CYCLE = 3.2; // slower, methodical
const ARCHER2_CYCLE = 2.6; // quicker rhythm
const FLAG_SPEED = 3.0;

// ---------------------------------------------------------------------------
// ArcheryRangeRenderer
// ---------------------------------------------------------------------------

export class ArcheryRangeRenderer {
  readonly container = new Container();

  // Graphic layers (back to front)
  private _base = new Graphics(); // Stone walls, ground, roof
  private _targets = new Graphics(); // Target stands
  private _props = new Graphics(); // Hay, weapons rack, dummies
  private _archers = new Graphics(); // Archer bodies
  private _arrows = new Graphics(); // Flying arrows
  private _flagL = new Graphics(); // Left pennant
  private _flagR = new Graphics(); // Right pennant
  private _lantern = new Graphics(); // Lantern glow (pulsing)

  // State
  private _time = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;

    this._drawBase();
    this._drawTargets();
    this._drawProps();
    this._drawFlags(0);
    this._drawLantern(0);

    this.container.addChild(this._base);
    this.container.addChild(this._targets);
    this.container.addChild(this._props);
    this.container.addChild(this._archers);
    this.container.addChild(this._arrows);
    this.container.addChild(this._flagL);
    this.container.addChild(this._flagR);
    this.container.addChild(this._lantern);
  }

  setOwner(owner: string | null): void {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;
    this._updateArchers(this._time);
    this._drawFlags(this._time);
    this._drawLantern(this._time);
  }

  // =========================================================================
  // Static base — walls, roof, pillars, ground
  // =========================================================================

  private _drawBase(): void {
    const g = this._base;

    // ── Ground / foundation ──
    // Packed-earth floor with stone border
    g.rect(0, PH - 10, PW, 10).fill({ color: 0x7a756d }); // stone foundation
    g.rect(6, PH - 14, PW - 12, 6).fill({ color: COL_SAND }); // sandy ground
    // Scattered pebbles on the ground
    const pebbles = [
      [18, PH - 12],
      [55, PH - 11],
      [90, PH - 13],
      [145, PH - 12],
      [200, PH - 11],
      [230, PH - 13],
    ];
    for (const [px, py] of pebbles) {
      g.circle(px, py, 1).fill({ color: COL_STONE_DK, alpha: 0.3 });
    }

    // ── Back wall (crenellated stone) ──
    const wallX = 6;
    const wallW = PW - 12;
    const wallY = 20;
    const wallH = 55;

    // Main wall body
    g.rect(wallX, wallY, wallW, wallH)
      .fill({ color: COL_STONE })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow on wall
    g.rect(wallX + 1, wallY + 1, 5, wallH - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.15,
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

    // Decorative stone band across middle of wall
    g.rect(wallX, wallY + wallH - 12, wallW, 3).fill({ color: COL_STONE_DK });
    g.rect(wallX, wallY + wallH - 11, wallW, 1).fill({
      color: COL_STONE_LT,
      alpha: 0.3,
    });

    // ── Corner pillars ──
    this._drawPillar(g, 4, 8, PH - 18);
    this._drawPillar(g, PW - 14, 8, PH - 18);

    // ── Timber-frame open roof (covering the archer area) ──
    // Main roof beams
    const roofY = 8;
    const roofLeft = 30;
    const roofRight = PW - 30;

    // Roof slope (left and right angled timbers meeting at ridge)
    g.moveTo(roofLeft, roofY + 16)
      .lineTo((roofLeft + roofRight) / 2, roofY)
      .lineTo(roofRight, roofY + 16)
      .closePath()
      .fill({ color: COL_ROOF })
      .stroke({ color: COL_ROOF_DK, width: 1 });
    // Roof highlight
    g.moveTo((roofLeft + roofRight) / 2, roofY)
      .lineTo(roofRight, roofY + 16)
      .lineTo((roofLeft + roofRight) / 2 + 1, roofY + 1)
      .closePath()
      .fill({ color: COL_ROOF_LT, alpha: 0.25 });

    // Tile lines on roof
    for (let i = 1; i <= 3; i++) {
      const frac = i / 4;
      const ly = roofY + frac * 16;
      const halfW = ((roofRight - roofLeft) / 2) * frac;
      const mid = (roofLeft + roofRight) / 2;
      g.moveTo(mid - halfW, ly)
        .lineTo(mid + halfW, ly)
        .stroke({ color: COL_ROOF_DK, width: 0.5, alpha: 0.5 });
    }

    // Ridge finial
    g.circle((roofLeft + roofRight) / 2, roofY, 2).fill({ color: 0xccaa44 });

    // Support beams (vertical timber posts)
    const posts = [roofLeft + 10, PW / 2 - 20, PW / 2 + 20, roofRight - 10];
    for (const px of posts) {
      g.rect(px - 2, roofY + 14, 4, wallY - roofY - 8)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.5 });
      // Wood grain lines
      for (let j = 3; j < wallY - roofY - 12; j += 6) {
        g.moveTo(px - 1, roofY + 14 + j)
          .lineTo(px + 1, roofY + 14 + j + 3)
          .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.4 });
      }
    }

    // Cross-braces between posts
    g.moveTo(posts[0], roofY + 20)
      .lineTo(posts[1], roofY + 18)
      .stroke({ color: COL_WOOD_DK, width: 1.5 });
    g.moveTo(posts[2], roofY + 18)
      .lineTo(posts[3], roofY + 20)
      .stroke({ color: COL_WOOD_DK, width: 1.5 });

    // ── Firing line — worn wooden platform ──
    g.rect(55, PH - 30, 80, 4)
      .fill({ color: COL_WOOD_LT })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Plank lines
    for (let i = 0; i < 80; i += 16) {
      g.moveTo(55 + i, PH - 30)
        .lineTo(55 + i, PH - 26)
        .stroke({ color: COL_WOOD_DK, width: 0.3, alpha: 0.5 });
    }

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
  // Targets — three stands at different distances
  // =========================================================================

  private _drawTargets(): void {
    const g = this._targets;

    const positions = [
      { x: PW - 35, y: 48 }, // far right, top
      { x: PW - 55, y: 70 }, // middle
      { x: PW - 38, y: 90 }, // far right, bottom
    ];

    for (let i = 0; i < positions.length; i++) {
      const p = positions[i];

      // Wooden stand — A-frame legs
      g.moveTo(p.x - 4, p.y + 20)
        .lineTo(p.x - 1, p.y - 16)
        .stroke({ color: COL_WOOD, width: 2.5 });
      g.moveTo(p.x + 4, p.y + 20)
        .lineTo(p.x + 1, p.y - 16)
        .stroke({ color: COL_WOOD, width: 2.5 });
      // Cross brace
      g.moveTo(p.x - 3, p.y + 8)
        .lineTo(p.x + 3, p.y + 8)
        .stroke({ color: COL_WOOD_DK, width: 1.5 });

      // Target face — concentric rings
      const r = i === 1 ? 14 : 12; // middle target is slightly bigger
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
      g.circle(p.x, p.y, r * 0.18).fill({ color: 0xffd700 });

      // Stuck arrows from previous shots (2-3 per target)
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
  // Props — hay bales, weapons rack, training dummy, quiver, sandbags
  // =========================================================================

  private _drawProps(): void {
    const g = this._props;

    // ── Hay bales (stacked, left side) ──
    // Bottom row
    g.roundRect(10, PH - 28, 20, 14, 2)
      .fill({ color: COL_HAY })
      .stroke({ color: COL_HAY_DK, width: 1 });
    g.roundRect(28, PH - 26, 18, 12, 2)
      .fill({ color: 0xb89850 })
      .stroke({ color: COL_HAY_DK, width: 1 });
    // Top bale
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
    g.moveTo(8, PH - 14)
      .lineTo(14, PH - 16)
      .stroke({ color: COL_HAY, width: 0.5, alpha: 0.6 });
    g.moveTo(35, PH - 14)
      .lineTo(42, PH - 15)
      .stroke({ color: COL_HAY, width: 0.5, alpha: 0.5 });

    // ── Weapons rack (right of hay bales) ──
    const rackX = 168;
    const rackY = PH - 55;
    // Vertical uprights
    g.rect(rackX, rackY, 3, 42)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    g.rect(rackX + 22, rackY, 3, 42)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Horizontal bars
    g.rect(rackX, rackY + 8, 25, 2).fill({ color: COL_WOOD_DK });
    g.rect(rackX, rackY + 28, 25, 2).fill({ color: COL_WOOD_DK });

    // Bows hanging on rack (3 bows)
    for (let i = 0; i < 3; i++) {
      const bx = rackX + 5 + i * 7;
      g.moveTo(bx, rackY + 10)
        .quadraticCurveTo(bx + 4, rackY + 19, bx, rackY + 28)
        .stroke({ color: COL_BOW, width: 1.5 });
      // String
      g.moveTo(bx, rackY + 10)
        .lineTo(bx, rackY + 28)
        .stroke({ color: COL_BOWSTRING, width: 0.4, alpha: 0.5 });
    }

    // ── Quiver with arrows (leaning against rack) ──
    const qx = rackX + 28;
    const qy = rackY + 12;
    // Quiver body (leather cylinder)
    g.moveTo(qx, qy)
      .lineTo(qx + 3, qy + 30)
      .lineTo(qx + 8, qy + 30)
      .lineTo(qx + 6, qy)
      .closePath()
      .fill({ color: COL_LEATHER })
      .stroke({ color: COL_LEATHER_DK, width: 1 });
    // Decorative strap
    g.rect(qx + 1, qy + 8, 6, 2).fill({ color: COL_LEATHER_DK });
    g.rect(qx + 1, qy + 20, 6, 2).fill({ color: COL_LEATHER_DK });
    // Arrow shafts poking out
    for (let i = 0; i < 4; i++) {
      g.moveTo(qx + 2 + i * 1.2, qy)
        .lineTo(qx + 1.5 + i * 1.2, qy - 10)
        .stroke({ color: COL_ARROW_SHAFT, width: 0.8 });
      // Fletching
      g.moveTo(qx + 1 + i * 1.2, qy - 8)
        .lineTo(qx + 2.5 + i * 1.2, qy - 10)
        .lineTo(qx + 1 + i * 1.2, qy - 12)
        .stroke({ color: COL_FLETCHING, width: 0.4, alpha: 0.6 });
    }

    // ── Training dummy (right side, near targets) ──
    const dx = PW - 80;
    const dy = PH - 52;
    // Post
    g.rect(dx - 2, dy, 4, 40)
      .fill({ color: COL_WOOD })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Cross-arm
    g.rect(dx - 12, dy + 8, 24, 3).fill({ color: COL_WOOD });
    // Sack body (torso)
    g.roundRect(dx - 8, dy - 6, 16, 20, 3)
      .fill({ color: COL_DUMMY_SACK })
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
    // Head (smaller sack)
    g.circle(dx, dy - 12, 6)
      .fill({ color: COL_DUMMY_SACK })
      .stroke({ color: COL_DUMMY_BODY, width: 1 });
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
    const sby = PH - 22;
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
  // Animated archers
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
      const t = ((time + a.offset) % a.cycle) / a.cycle; // 0..1 normalised

      // Phases: 0-0.3 draw, 0.3-0.4 hold, 0.4-0.42 release, 0.42-1.0 relax
      let bowDraw = 0;
      let released = false;
      let arrowProgress = -1;

      if (t < 0.3) {
        bowDraw = t / 0.3; // drawing the bow
      } else if (t < 0.4) {
        bowDraw = 1; // holding aim
      } else if (t < 0.42) {
        bowDraw = 1 - (t - 0.4) / 0.02; // snap release
        released = true;
      } else {
        bowDraw = 0;
        released = true;
        arrowProgress = (t - 0.42) / 0.35; // arrow flies
        if (arrowProgress > 1) arrowProgress = -1; // arrow has hit target
      }

      // ── Legs (boots) ──
      ag.rect(a.x - 4, a.y + 14, 3, 8).fill({ color: COL_LEATHER_DK });
      ag.rect(a.x + 1, a.y + 14, 3, 8).fill({ color: COL_LEATHER_DK });
      // Boot tops
      ag.rect(a.x - 4, a.y + 14, 3, 2).fill({ color: COL_LEATHER });

      // ── Torso (tunic) ──
      ag.rect(a.x - 5, a.y, 10, 14)
        .fill({ color: COL_CLOTH_GREEN })
        .stroke({ color: COL_CLOTH_GREEN_DK, width: 0.5 });
      // Belt
      ag.rect(a.x - 5, a.y + 10, 10, 2).fill({ color: COL_LEATHER });
      ag.circle(a.x, a.y + 11, 1).fill({ color: 0xccaa44 }); // buckle

      // ── Head ──
      ag.circle(a.x, a.y - 5, 5)
        .fill({ color: COL_SKIN })
        .stroke({ color: COL_SKIN_DK, width: 0.5 });
      // Hair
      ag.moveTo(a.x - 4, a.y - 8)
        .quadraticCurveTo(a.x, a.y - 12, a.x + 4, a.y - 8)
        .fill({ color: a.hair });
      // Eye (facing right toward targets)
      ag.circle(a.x + 3, a.y - 6, 0.8).fill({ color: 0x222222 });

      // ── Arms + bow ──
      // Back arm (holds bow, extended toward target)
      const bowX = a.x + 8;
      const bowY = a.y + 2;
      // Arm
      ag.moveTo(a.x + 4, a.y + 2)
        .lineTo(bowX + 6, bowY)
        .stroke({ color: COL_SKIN, width: 2 });
      // Bracer on bow arm
      ag.rect(a.x + 6, a.y + 1, 4, 3).fill({ color: COL_LEATHER });

      // Bow
      const bend = 4 + bowDraw * 4;
      ag.moveTo(bowX + 8, bowY - 12)
        .quadraticCurveTo(bowX + 8 + bend, bowY, bowX + 8, bowY + 12)
        .stroke({ color: COL_BOW, width: 2 });
      // Bowstring
      const stringPull = bowDraw * 6;
      ag.moveTo(bowX + 8, bowY - 12)
        .lineTo(bowX + 8 - stringPull, bowY)
        .lineTo(bowX + 8, bowY + 12)
        .stroke({ color: COL_BOWSTRING, width: 0.8 });

      // Draw arm (pulling string back)
      const drawArmX = bowX + 8 - stringPull;
      ag.moveTo(a.x + 2, a.y + 3)
        .lineTo(drawArmX, bowY)
        .stroke({ color: COL_SKIN, width: 2 });
      // Glove on draw hand
      ag.circle(drawArmX, bowY, 1.5).fill({ color: COL_LEATHER });

      // Arrow nocked on bowstring (visible during draw/hold)
      if (!released) {
        ag.moveTo(drawArmX, bowY)
          .lineTo(bowX + 14, bowY)
          .stroke({ color: COL_ARROW_SHAFT, width: 1.2 });
        // Arrowhead
        ag.moveTo(bowX + 14, bowY - 1.5)
          .lineTo(bowX + 17, bowY)
          .lineTo(bowX + 14, bowY + 1.5)
          .fill({ color: COL_ARROWHEAD });
        // Fletching
        ag.moveTo(drawArmX + 1, bowY - 1.5)
          .lineTo(drawArmX - 2, bowY)
          .lineTo(drawArmX + 1, bowY + 1.5)
          .fill({ color: COL_FLETCHING, alpha: 0.7 });
      }

      // ── Flying arrow ──
      if (arrowProgress >= 0 && arrowProgress <= 1) {
        const startAX = bowX + 14;
        const startAY = bowY;
        // Slight arc trajectory
        const ax =
          startAX + (a.targetX - startAX) * arrowProgress;
        const ay =
          startAY +
          (a.targetY - startAY) * arrowProgress -
          Math.sin(arrowProgress * Math.PI) * 8; // parabolic arc

        // Shaft
        fg.moveTo(ax - 8, ay)
          .lineTo(ax + 4, ay)
          .stroke({ color: COL_ARROW_SHAFT, width: 1.2 });
        // Head
        fg.moveTo(ax + 4, ay - 1.5)
          .lineTo(ax + 7, ay)
          .lineTo(ax + 4, ay + 1.5)
          .fill({ color: COL_ARROWHEAD });
        // Fletching
        fg.moveTo(ax - 6, ay - 2)
          .lineTo(ax - 9, ay)
          .lineTo(ax - 6, ay + 2)
          .fill({ color: COL_FLETCHING, alpha: 0.6 });
      }
    }

    // ── Target recoil on arrow impact ──
    const t1 = ((time + 0) % ARCHER1_CYCLE) / ARCHER1_CYCLE;
    const t2 = ((time + 1.3) % ARCHER2_CYCLE) / ARCHER2_CYCLE;
    const hitTime1 = t1 > 0.77 && t1 < 0.82;
    const hitTime2 = t2 > 0.77 && t2 < 0.82;
    if (hitTime1 || hitTime2) {
      const recoil = Math.sin(((hitTime1 ? t1 : t2) - 0.77) / 0.05 * Math.PI) * 2;
      this._targets.position.set(recoil, 0);
    } else {
      this._targets.position.set(0, 0);
    }
  }

  // =========================================================================
  // Flags / pennants
  // =========================================================================

  private _drawFlags(time: number): void {
    const positions = [
      { g: this._flagL, x: 10, y: 8 },
      { g: this._flagR, x: PW - 10, y: 8 },
    ];

    for (let i = 0; i < positions.length; i++) {
      const { g, x, y } = positions[i];
      g.clear();

      const wave = Math.sin(time * FLAG_SPEED + i * 2) * 4;
      const wave2 = Math.sin(time * FLAG_SPEED * 1.3 + i * 2 + 1) * 2;

      // Pole
      g.rect(x - 1, y, 2, 22)
        .fill({ color: COL_WOOD })
        .stroke({ color: COL_WOOD_DK, width: 0.3 });
      // Pole cap
      g.circle(x, y, 1.5).fill({ color: 0xccaa44 });

      // Pennant (triangular, waving)
      const dir = i === 0 ? 1 : -1;
      g.moveTo(x + dir * 1, y + 2)
        .bezierCurveTo(
          x + dir * 12 + wave,
          y + 4 + wave2,
          x + dir * 16 + wave * 0.8,
          y + 8 + wave2 * 0.5,
          x + dir * 2,
          y + 16,
        )
        .lineTo(x + dir * 1, y + 14)
        .closePath()
        .fill({ color: this._playerColor })
        .stroke({ color: this._playerColor, width: 0.3, alpha: 0.5 });

      // Small emblem on pennant
      g.circle(x + dir * 7 + wave * 0.3, y + 8 + wave2 * 0.2, 2).fill({
        color: 0xffffff,
        alpha: 0.4,
      });
    }
  }

  // =========================================================================
  // Lantern (warm pulsing glow)
  // =========================================================================

  private _drawLantern(time: number): void {
    const g = this._lantern;
    g.clear();

    const lx = 50;
    const ly = 30;
    const pulse = 0.6 + Math.sin(time * 2.5) * 0.15;

    // Glow
    g.circle(lx, ly, 8).fill({ color: COL_LANTERN_GLOW, alpha: pulse * 0.15 });
    g.circle(lx, ly, 4).fill({ color: COL_LANTERN_GLOW, alpha: pulse * 0.25 });

    // Lantern body
    g.rect(lx - 2.5, ly - 3, 5, 6)
      .fill({ color: COL_LANTERN_BODY })
      .stroke({ color: COL_WOOD_DK, width: 0.5 });
    // Glass pane
    g.rect(lx - 1.5, ly - 2, 3, 4).fill({
      color: COL_LANTERN_GLOW,
      alpha: pulse,
    });
    // Top cap
    g.moveTo(lx - 3, ly - 3)
      .lineTo(lx, ly - 5)
      .lineTo(lx + 3, ly - 3)
      .closePath()
      .fill({ color: 0x555555 });
    // Hook (hanging from beam)
    g.moveTo(lx, ly - 5)
      .lineTo(lx, ly - 8)
      .stroke({ color: 0x555555, width: 0.8 });
  }

  // =========================================================================
  // Stone texture helpers (inspired by CastleRenderer)
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
      // Horizontal mortar line
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.5, alpha: 0.4 });
      // Vertical mortar joints
      for (let col = offset; col < w; col += 24) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.4, alpha: 0.35 });
      }
      // Stone face highlights
      for (let col = offset; col < w - 8; col += 24) {
        g.moveTo(x + col + 1, y + row + 1)
          .lineTo(x + col + 20, y + row + 1)
          .stroke({ color: COL_STONE_LT, width: 0.4, alpha: 0.2 });
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
        alpha: 0.25,
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
        alpha: 0.18,
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
        .fill({ color: COL_STONE_LT })
        .stroke({ color: COL_STONE_DK, width: 0.5 });
      // Cap stone
      g.rect(mx - 0.5, y - merlonH - 1.5, merlonW + 1, 2).fill({
        color: COL_STONE_DK,
      });
    }
  }

  private _drawArrowSlit(g: Graphics, x: number, y: number): void {
    g.rect(x + 1, y - 1, 4, 14).fill({ color: COL_STONE_DK });
    g.rect(x + 2, y, 2, 12).fill({ color: COL_WINDOW });
    g.rect(x, y + 4, 6, 2).fill({ color: COL_WINDOW });
    g.rect(x + 1, y - 1, 4, 14).stroke({ color: COL_STONE_DK, width: 0.5 });
  }

  private _drawRosetteWindow(g: Graphics, cx: number, cy: number): void {
    const r = 10;

    // Deep stone recess
    g.circle(cx, cy, r + 3).fill({ color: COL_STONE_DK });
    g.circle(cx, cy, r + 1.5).fill({ color: COL_WINDOW_FRAME });
    g.circle(cx, cy, r).fill({ color: COL_WINDOW });

    // Stained glass panes — colored wedges
    const colors = [0xcc2244, 0x2255aa, 0xffd700, 0x22aa55, 0xcc2244, 0x2255aa];
    const numPanes = 6;
    for (let i = 0; i < numPanes; i++) {
      const a1 = (i / numPanes) * Math.PI * 2 - Math.PI / 2;
      const a2 = ((i + 1) / numPanes) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(cx, cy)
        .lineTo(cx + Math.cos(a1) * (r - 1), cy + Math.sin(a1) * (r - 1))
        .lineTo(cx + Math.cos(a2) * (r - 1), cy + Math.sin(a2) * (r - 1))
        .closePath()
        .fill({ color: colors[i], alpha: 0.65 });
    }

    // Lead caming — radial lines
    for (let i = 0; i < numPanes; i++) {
      const a = (i / numPanes) * Math.PI * 2 - Math.PI / 2;
      g.moveTo(cx, cy)
        .lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r)
        .stroke({ color: 0x222222, width: 0.8 });
    }
    // Center boss
    g.circle(cx, cy, 2).fill({ color: COL_STONE_LT });

    // Stone surround
    g.circle(cx, cy, r + 3).stroke({ color: COL_STONE_DK, width: 1.5 });
    // Keystone at top
    g.moveTo(cx - 3, cy - r - 3)
      .lineTo(cx, cy - r - 6)
      .lineTo(cx + 3, cy - r - 3)
      .fill({ color: COL_STONE_LT });
  }

  private _drawMoss(g: Graphics, x: number, y: number, w: number): void {
    g.ellipse(x + w / 2, y, w / 2, 2.5).fill({ color: COL_MOSS, alpha: 0.45 });
    g.circle(x + 2, y - 1, 1.5).fill({ color: COL_MOSS, alpha: 0.3 });
    g.circle(x + w - 2, y - 0.5, 1.2).fill({ color: COL_MOSS, alpha: 0.3 });
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
        alpha: 0.7,
      });
      g.circle(x + wobble + dir * 2, y + iy + 1, 1.5).fill({
        color: COL_IVY,
        alpha: 0.55,
      });
    }
  }

  private _drawPillar(
    g: Graphics,
    x: number,
    y: number,
    h: number,
  ): void {
    // Main shaft
    g.rect(x, y, 10, h)
      .fill({ color: COL_STONE_LT })
      .stroke({ color: COL_STONE_DK, width: 1 });
    // Left shadow
    g.rect(x + 1, y + 1, 3, h - 2).fill({
      color: COL_STONE_DK,
      alpha: 0.12,
    });
    // Brick pattern on pillar
    for (let row = 0; row < h; row += 8) {
      g.moveTo(x, y + row)
        .lineTo(x + 10, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
    }
    // Cap
    g.rect(x - 2, y - 2, 14, 4)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Base
    g.rect(x - 2, y + h - 2, 14, 4)
      .fill({ color: COL_STONE_DK })
      .stroke({ color: COL_STONE_DK, width: 0.5 });
    // Finial
    g.circle(x + 5, y - 4, 2).fill({ color: 0xccaa44 });
  }

  // =========================================================================
  // Cleanup
  // =========================================================================

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
