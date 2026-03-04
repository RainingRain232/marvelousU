// Procedural mage tower renderer for BuildingView.
//
// Draws "The Arcanum Spire" — a multi-tiered weathered stone tower (~2×2 tiles) with:
//   • Basalt/granite base with dragon-rib flying buttresses
//   • Three entrance types at the base (iron gate, glowing portal, external stairs)
//   • Lancet stained-glass windows with constellation patterns
//   • Detached floating upper spire chunks rotating slowly
//   • Giant focus crystal at the apex in a gold orrery
//   • Bioluminescent mana-garden terrace
//   • Pulsing ley-line runes etched into the stone
//   • Mana-thread arcs connecting floating chunks
//   • Owl familiar perched on a buttress
//   • Localized cloud vortex above the crystal
//
// All drawing uses PixiJS Graphics. Animations driven by tick(dt, phase).

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";
import { getPlayerColor } from "@sim/config/PlayerColors";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — dark stone & arcane glow
const COL_BASALT = 0x3d3a3a;
const COL_BASALT_LT = 0x4e4a4a;
const COL_BASALT_DK = 0x2a2828;
const COL_GRANITE = 0x5a5555;
const COL_GRANITE_DK = 0x3d3838;
const COL_MORTAR = 0x484444;
const COL_WINDOW = 0x1a1a2e;
const COL_PORTAL_BLUE = 0x4488ff;
const COL_IRON = 0x555555;
const COL_IRON_DK = 0x333333;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_MOSS = 0x3a5530;

// Arcane / magic
const COL_RUNE = 0x4488ff;
const COL_MANA_THREAD = 0xddddff;
const COL_CRYSTAL = 0x33ee88;
const COL_CRYSTAL_CORE = 0xaaffcc;
const COL_MANA_PLANT = 0x44ddff;
const COL_MANA_PLANT_DK = 0x2288aa;

// Owl
const COL_OWL = 0x8b7355;
const COL_OWL_BELLY = 0xc8b88a;
const COL_OWL_EYE = 0xffdd00;

// Cloud vortex
const COL_CLOUD = 0x6666aa;
const COL_CLOUD_LT = 0x8888cc;

// Animation timing
const RUNE_PULSE_SPEED = 1.5; // rads/sec for pulsing
const FLOAT_ROTATE_SPEED = 0.3; // rads/sec for chunk rotation
const THREAD_FLICKER = 6.0; // Hz for mana thread shimmer
const CRYSTAL_SPIN = 1.2; // rads/sec for orrery rotation
const CLOUD_SPEED = 0.8; // rads/sec for vortex
const OWL_BLINK_INTERVAL = 5.0; // seconds between blinks
const OWL_BLINK_DURATION = 0.2; // seconds of blink
const PLANT_SWAY_SPEED = 2.0; // rads/sec for plant sway
const PORTAL_PULSE_SPEED = 3.0; // rads/sec for portal glow

// ---------------------------------------------------------------------------
// MageTowerRenderer
// ---------------------------------------------------------------------------

export class MageTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // static tower body, buttresses, entrances
  private _windows = new Graphics(); // stained glass windows (semi-static, glow animated)
  private _runes = new Graphics(); // pulsing ley-line runes
  private _floatChunks = new Graphics(); // floating upper spire chunks
  private _threads = new Graphics(); // mana thread arcs
  private _crystal = new Graphics(); // apex crystal + orrery
  private _garden = new Graphics(); // mana-plant terrace
  private _owl = new Graphics(); // owl familiar
  private _clouds = new Graphics(); // swirling vortex clouds
  private _portal = new Graphics(); // glowing arched portal

  private _time = 0;
  private _owlTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = getPlayerColor(owner);

    this._drawBase();
    this._drawWindows();
    this._drawGarden();

    this.container.addChild(this._base);
    this.container.addChild(this._portal);
    this.container.addChild(this._windows);
    this.container.addChild(this._runes);
    this.container.addChild(this._garden);
    this.container.addChild(this._floatChunks);
    this.container.addChild(this._threads);
    this.container.addChild(this._crystal);
    this.container.addChild(this._owl);
    this.container.addChild(this._clouds);
  }

  setOwner(owner: string | null): void {
    this._playerColor = getPlayerColor(owner);
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // 1. Pulsing runes
    this._updateRunes(this._time);

    // 2. Floating chunks (slow rotation)
    this._updateFloatingChunks(this._time);

    // 3. Mana threads connecting chunks
    this._updateThreads(this._time);

    // 4. Crystal + orrery spin
    this._updateCrystal(this._time);

    // 5. Cloud vortex
    this._updateClouds(this._time);

    // 6. Owl blink
    this._owlTimer += dt;
    this._updateOwl(this._time);

    // 7. Portal glow pulse
    this._updatePortal(this._time);

    // 8. Garden sway
    this._updateGarden(this._time);
  }

  // ── Base Structure ──────────────────────────────────────────────────────

  private _drawBase(): void {
    const g = this._base;
    const cx = TW / 2;

    // ── Ground platform / stairs ──
    g.rect(10, TH - 10, TW - 20, 10).fill({ color: COL_GRANITE_DK });
    g.rect(6, TH - 6, TW - 12, 6).fill({ color: COL_BASALT_DK });
    // Step lines
    g.moveTo(10, TH - 7)
      .lineTo(TW - 10, TH - 7)
      .stroke({ color: COL_MORTAR, width: 0.5 });

    // ── Main tower body (slightly tapered) ──
    const bodyL = 30;
    const bodyR = TW - 30;
    const bodyTop = 28;
    const bodyBot = TH - 10;
    // Slight taper: narrower at top
    const taperL = bodyL + 4;
    const taperR = bodyR - 4;

    g.moveTo(bodyL, bodyBot)
      .lineTo(taperL, bodyTop)
      .lineTo(taperR, bodyTop)
      .lineTo(bodyR, bodyBot)
      .closePath()
      .fill({ color: COL_BASALT })
      .stroke({ color: COL_BASALT_DK, width: 1.5 });

    // Brick pattern on tower body
    this._drawBrickPattern(
      g,
      bodyL + 2,
      bodyTop + 2,
      bodyR - bodyL - 4,
      bodyBot - bodyTop - 4,
    );

    // ── Weathering / moss patches ──
    g.ellipse(bodyL + 8, bodyBot - 8, 5, 2).fill({
      color: COL_MOSS,
      alpha: 0.4,
    });
    g.ellipse(bodyR - 6, bodyBot - 12, 4, 2).fill({
      color: COL_MOSS,
      alpha: 0.35,
    });

    // ── Dragon-rib flying buttresses ──
    this._drawButtress(g, bodyL, bodyBot, -1); // left
    this._drawButtress(g, bodyR, bodyBot, 1); // right

    // ── Three Entrances at the base ──

    // 1. Iron Gate (left) — heavy mundane door
    const ironGateX = bodyL + 4;
    const ironGateW = 14;
    const ironGateH = 22;
    const ironGateY = bodyBot - ironGateH;
    g.rect(ironGateX, ironGateY, ironGateW, ironGateH)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_IRON, width: 1 });
    // Iron bands
    for (let by = ironGateY + 5; by < bodyBot - 3; by += 7) {
      g.moveTo(ironGateX + 1, by)
        .lineTo(ironGateX + ironGateW - 1, by)
        .stroke({ color: COL_IRON, width: 1, alpha: 0.5 });
    }
    // Ring handle
    g.circle(
      ironGateX + ironGateW - 4,
      ironGateY + ironGateH * 0.5,
      1.5,
    ).stroke({ color: 0x888888, width: 1 });

    // 2. Arched Portal (center) — glowing blue mage entrance (drawn separately for animation)
    this._drawPortalStatic(g, cx);

    // 3. Petitioner's External Stairs (right)
    const stairX = bodyR - 2;
    const stairW = 10;
    const stairSteps = 6;
    const stairStepH = (bodyBot - bodyTop - 30) / stairSteps;
    for (let i = 0; i < stairSteps; i++) {
      const sy = bodyBot - (i + 1) * stairStepH;
      g.rect(stairX, sy, stairW - i * 0.5, stairStepH + 1)
        .fill({ color: COL_GRANITE })
        .stroke({ color: COL_GRANITE_DK, width: 0.3 });
    }
    // Railing
    g.moveTo(stairX + stairW, bodyBot)
      .lineTo(stairX + stairW - 3, bodyTop + 30)
      .stroke({ color: COL_IRON, width: 1.2 });
    // Small balcony platform at top of stairs
    g.rect(stairX - 4, bodyTop + 28, stairW + 6, 4)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 0.5 });

    // ── Cornices / string courses ──
    this._drawCornice(g, bodyL, bodyTop + 30, bodyR - bodyL);
    this._drawCornice(g, bodyL + 2, bodyTop + 60, bodyR - bodyL - 4);

    // ── Owl perch nook on left buttress ──
    // (owl drawn separately for animation)
    this._owl.position.set(bodyL - 16, bodyBot - 40);
  }

  private _drawButtress(
    g: Graphics,
    x: number,
    botY: number,
    dir: number,
  ): void {
    // Dragon-rib style: curved arch from base outward
    const ribW = 18 * dir;
    const ribTop = botY - 55;

    // Main rib arc
    g.moveTo(x, botY)
      .quadraticCurveTo(x + ribW * 0.4, botY - 20, x + ribW * 0.1, ribTop)
      .lineTo(x + ribW * 0.25, ribTop + 5)
      .quadraticCurveTo(x + ribW * 0.5, botY - 15, x + ribW * 0.15, botY)
      .closePath()
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 1 });

    // Secondary smaller rib
    g.moveTo(x, botY - 15)
      .quadraticCurveTo(x + ribW * 0.3, botY - 30, x + ribW * 0.05, botY - 45)
      .stroke({ color: COL_GRANITE_DK, width: 1.5 });

    // Base pedestal
    g.rect(x + (dir > 0 ? 0 : -12), botY - 4, 12, 4).fill({
      color: COL_BASALT_DK,
    });
  }

  private _drawPortalStatic(g: Graphics, cx: number): void {
    // Portal arch frame (static stone part)
    const portalW = 20;
    const portalH = 28;
    const portalY = TH - 10 - portalH;

    // Dark interior
    g.rect(cx - portalW / 2, portalY + 8, portalW, portalH - 8).fill({
      color: 0x0a0a1e,
    });
    g.ellipse(cx, portalY + 8, portalW / 2, 8).fill({ color: 0x0a0a1e });

    // Stone arch frame
    g.moveTo(cx - portalW / 2 - 3, TH - 10)
      .lineTo(cx - portalW / 2 - 3, portalY + 10)
      .quadraticCurveTo(cx, portalY - 6, cx + portalW / 2 + 3, portalY + 10)
      .lineTo(cx + portalW / 2 + 3, TH - 10)
      .stroke({ color: COL_GRANITE, width: 2.5 });

    // Portal initialized to empty — animated glow drawn in _updatePortal
    this._portal.position.set(0, 0);
  }

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 8) {
      const offset = (Math.floor(row / 8) % 2) * 10;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.2 });
      for (let col = offset; col < w; col += 20) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 8)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.2 });
      }
    }
  }

  private _drawCornice(g: Graphics, x: number, y: number, w: number): void {
    g.rect(x - 2, y, w + 4, 3)
      .fill({ color: COL_BASALT_LT })
      .stroke({ color: COL_BASALT_DK, width: 0.4 });
  }

  // ── Windows (stained glass with constellation patterns) ─────────────────

  private _drawWindows(): void {
    const g = this._windows;
    const cx = TW / 2;

    // Two lancet windows on the upper tower
    this._drawLancetWindow(g, cx - 16, 40, 10, 22);
    this._drawLancetWindow(g, cx + 6, 40, 10, 22);

    // Smaller windows on middle section
    this._drawLancetWindow(g, cx - 10, 72, 7, 14);
    this._drawLancetWindow(g, cx + 3, 72, 7, 14);
  }

  private _drawLancetWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    // Dark frame
    g.rect(x - 1, y + 4, w + 2, h - 4).fill({ color: COL_WINDOW });
    // Pointed arch top
    g.moveTo(x - 1, y + 4)
      .quadraticCurveTo(x + w / 2, y - 2, x + w + 1, y + 4)
      .lineTo(x + w + 1, y + 4)
      .lineTo(x - 1, y + 4)
      .closePath()
      .fill({ color: COL_WINDOW });

    // Stained glass fill (faint constellation pattern)
    // Purple-blue background
    g.rect(x, y + 5, w, h - 5).fill({ color: 0x221144, alpha: 0.8 });

    // Star dots (constellation)
    const stars = [
      { dx: 0.2, dy: 0.25 },
      { dx: 0.7, dy: 0.2 },
      { dx: 0.5, dy: 0.5 },
      { dx: 0.3, dy: 0.7 },
      { dx: 0.8, dy: 0.65 },
      { dx: 0.6, dy: 0.85 },
    ];
    for (const s of stars) {
      g.circle(x + w * s.dx, y + 5 + (h - 5) * s.dy, 0.8).fill({
        color: 0xffffcc,
        alpha: 0.8,
      });
    }
    // Connecting lines (constellation lines)
    g.moveTo(x + w * 0.2, y + 5 + (h - 5) * 0.25)
      .lineTo(x + w * 0.5, y + 5 + (h - 5) * 0.5)
      .lineTo(x + w * 0.7, y + 5 + (h - 5) * 0.2)
      .stroke({ color: 0xffffcc, width: 0.4, alpha: 0.4 });
    g.moveTo(x + w * 0.5, y + 5 + (h - 5) * 0.5)
      .lineTo(x + w * 0.3, y + 5 + (h - 5) * 0.7)
      .lineTo(x + w * 0.8, y + 5 + (h - 5) * 0.65)
      .stroke({ color: 0xffffcc, width: 0.4, alpha: 0.4 });

    // Lead frame lines
    g.moveTo(x + w / 2, y + 2)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: 0x333333, width: 0.6, alpha: 0.5 });
    // Stone ledge below window
    g.rect(x - 2, y + h, w + 4, 2).fill({ color: COL_BASALT_DK });
  }

  // ── Ley-line Runes (animated pulse) ────────────────────────────────────

  private _updateRunes(time: number): void {
    const g = this._runes;
    g.clear();

    const pulse = (Math.sin(time * RUNE_PULSE_SPEED) + 1) / 2; // 0..1
    const alpha = 0.3 + pulse * 0.5;
    const cx = TW / 2;

    // Vertical rune strip on left side of tower
    const runeX = 36;
    for (let ry = 36; ry < TH - 20; ry += 18) {
      this._drawRune(g, runeX, ry, alpha);
    }

    // Vertical rune strip on right side of tower
    const runeX2 = TW - 38;
    for (let ry = 40; ry < TH - 20; ry += 18) {
      this._drawRune(g, runeX2, ry, alpha);
    }

    // Central rune above portal
    this._drawRuneCircle(g, cx, TH - 44, 5, alpha);
  }

  private _drawRune(g: Graphics, x: number, y: number, alpha: number): void {
    // Simple geometric rune: diamond with inner cross
    g.moveTo(x, y - 5)
      .lineTo(x + 4, y)
      .lineTo(x, y + 5)
      .lineTo(x - 4, y)
      .closePath()
      .stroke({ color: COL_RUNE, width: 1, alpha });
    g.moveTo(x, y - 3)
      .lineTo(x, y + 3)
      .stroke({ color: COL_RUNE, width: 0.5, alpha: alpha * 0.7 });
    g.moveTo(x - 2, y)
      .lineTo(x + 2, y)
      .stroke({ color: COL_RUNE, width: 0.5, alpha: alpha * 0.7 });
  }

  private _drawRuneCircle(
    g: Graphics,
    x: number,
    y: number,
    r: number,
    alpha: number,
  ): void {
    g.circle(x, y, r).stroke({ color: COL_RUNE, width: 1, alpha });
    g.circle(x, y, r * 0.5).stroke({
      color: COL_RUNE,
      width: 0.5,
      alpha: alpha * 0.6,
    });
    // Radiating dots
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      g.circle(x + Math.cos(a) * (r + 2), y + Math.sin(a) * (r + 2), 0.8).fill({
        color: COL_RUNE,
        alpha: alpha * 0.5,
      });
    }
  }

  // ── Floating Spire Chunks ──────────────────────────────────────────────

  private _updateFloatingChunks(time: number): void {
    const g = this._floatChunks;
    g.clear();

    const cx = TW / 2;
    const baseY = 20; // where the "detached" section starts
    const angle = time * FLOAT_ROTATE_SPEED;

    // Three chunks of the upper spire, rotating slowly
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * Math.PI * 2) / 3;
      const orbitR = 8;
      const ox = cx + Math.cos(a) * orbitR;
      const oy = baseY + Math.sin(a) * 2 + i * 4; // slight vertical offset
      const bob = Math.sin(time * 1.2 + i * 1.5) * 2;

      // Stone chunk
      const cW = 14 - i * 2;
      const cH = 12 - i * 2;
      g.rect(ox - cW / 2, oy - cH / 2 + bob, cW, cH)
        .fill({ color: i === 0 ? COL_BASALT : COL_BASALT_LT })
        .stroke({ color: COL_BASALT_DK, width: 1 });

      // Tiny brick detail on chunks
      if (cW > 8) {
        g.moveTo(ox - cW / 2 + 2, oy + bob)
          .lineTo(ox + cW / 2 - 2, oy + bob)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
      }
    }
  }

  // ── Mana Threads (arcs connecting floating chunks) ──────────────────────

  private _updateThreads(time: number): void {
    const g = this._threads;
    g.clear();

    const cx = TW / 2;
    const baseY = 20;
    const angle = time * FLOAT_ROTATE_SPEED;
    const flicker = (Math.sin(time * THREAD_FLICKER) + 1) / 2;
    const alpha = 0.4 + flicker * 0.4;

    // Draw arcs between each pair of chunks and the crystal
    for (let i = 0; i < 3; i++) {
      const a = angle + (i * Math.PI * 2) / 3;
      const orbitR = 8;
      const ox = cx + Math.cos(a) * orbitR;
      const oy =
        baseY + Math.sin(a) * 2 + i * 4 + Math.sin(time * 1.2 + i * 1.5) * 2;

      // Thread from chunk to crystal (apex at top)
      g.moveTo(ox, oy)
        .quadraticCurveTo(
          cx + Math.sin(time + i) * 3,
          baseY - 14,
          cx,
          baseY - 20,
        )
        .stroke({ color: COL_MANA_THREAD, width: 1.2, alpha });

      // Small spark at junction
      g.circle(ox, oy, 1.5 + flicker).fill({
        color: COL_MANA_THREAD,
        alpha: alpha * 0.6,
      });
    }
  }

  // ── Crystal + Orrery ───────────────────────────────────────────────────

  private _updateCrystal(time: number): void {
    const g = this._crystal;
    g.clear();

    const cx = TW / 2;
    const cy = 0; // top of the tower visual
    const spin = time * CRYSTAL_SPIN;

    // Orrery rings (gold)
    const ringR = 10;
    g.circle(cx, cy, ringR).stroke({ color: COL_GOLD, width: 1.2, alpha: 0.7 });
    g.circle(cx, cy, ringR * 0.65).stroke({
      color: COL_GOLD_DK,
      width: 0.8,
      alpha: 0.5,
    });

    // Orbiting small spheres (planets in orrery)
    for (let i = 0; i < 3; i++) {
      const pa = spin + (i * Math.PI * 2) / 3;
      const px = cx + Math.cos(pa) * ringR;
      const py = cy + Math.sin(pa) * ringR * 0.4; // elliptical for perspective
      g.circle(px, py, 1.5).fill({ color: COL_GOLD });
    }

    // Crystal — uncut faceted gem shape
    const crR = 6;
    const pulse = (Math.sin(time * 2.5) + 1) / 2;
    const crystalAlpha = 0.7 + pulse * 0.3;

    // Hexagonal-ish crystal shape
    const sides = 6;
    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const r = crR + (i % 2 === 0 ? 0 : -1.5); // faceted
      points.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.poly(points)
      .fill({ color: COL_CRYSTAL, alpha: crystalAlpha })
      .stroke({ color: COL_CRYSTAL_CORE, width: 1, alpha: crystalAlpha });

    // Inner glow core
    g.circle(cx, cy, crR * 0.4).fill({
      color: COL_CRYSTAL_CORE,
      alpha: 0.5 + pulse * 0.3,
    });

    // Radial glow halo
    g.circle(cx, cy, ringR + 3).stroke({
      color: COL_CRYSTAL,
      width: 0.8,
      alpha: 0.15 + pulse * 0.1,
    });
  }

  // ── Mana Garden Terrace ─────────────────────────────────────────────────

  private _drawGarden(): void {
    // Static terrace platform (drawn once)
    const g = this._garden;
    const terX = TW - 36;
    const terY = 48;
    const terW = 16;
    const terH = 4;

    // Stone platform
    g.rect(terX, terY, terW, terH)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 0.5 });
    // Support bracket
    g.moveTo(terX, terY + terH)
      .lineTo(terX + 3, terY + terH + 6)
      .lineTo(terX, terY + terH + 6)
      .closePath()
      .fill({ color: COL_GRANITE_DK });
  }

  private _updateGarden(time: number): void {
    // Redraw just the plant part of the garden (terrace is static in _base conceptually but we drew in _garden)
    const g = this._garden;
    g.clear();

    // Re-draw static terrace
    const terX = TW - 36;
    const terY = 48;
    const terW = 16;
    const terH = 4;
    g.rect(terX, terY, terW, terH)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 0.5 });
    g.moveTo(terX, terY + terH)
      .lineTo(terX + 3, terY + terH + 6)
      .lineTo(terX, terY + terH + 6)
      .closePath()
      .fill({ color: COL_GRANITE_DK });

    // Bioluminescent mana-plants swaying
    const plantCount = 4;
    for (let i = 0; i < plantCount; i++) {
      const px = terX + 3 + i * 3.5;
      const sway = Math.sin(time * PLANT_SWAY_SPEED + i * 1.2) * 2;
      const stemH = 6 + (i % 2) * 3;
      const glow = (Math.sin(time * 2 + i * 0.8) + 1) / 2;

      // Stem
      g.moveTo(px, terY)
        .lineTo(px + sway, terY - stemH)
        .stroke({ color: COL_MANA_PLANT_DK, width: 1 });

      // Glowing leaf/bulb at tip
      g.circle(px + sway, terY - stemH, 2).fill({
        color: COL_MANA_PLANT,
        alpha: 0.6 + glow * 0.4,
      });
      // Bright inner core
      g.circle(px + sway, terY - stemH, 0.8).fill({
        color: 0xffffff,
        alpha: 0.3 + glow * 0.3,
      });
    }
  }

  // ── Owl Familiar ───────────────────────────────────────────────────────

  private _updateOwl(time: number): void {
    const g = this._owl;
    g.clear();

    // Owl body (round)
    g.ellipse(0, 0, 5, 6).fill({ color: COL_OWL });
    // Belly
    g.ellipse(0, 2, 3.5, 4).fill({ color: COL_OWL_BELLY });

    // Head
    g.circle(0, -6, 4).fill({ color: COL_OWL });
    // Ear tufts
    g.moveTo(-3, -9)
      .lineTo(-4, -13)
      .lineTo(-1, -10)
      .closePath()
      .fill({ color: COL_OWL });
    g.moveTo(3, -9)
      .lineTo(4, -13)
      .lineTo(1, -10)
      .closePath()
      .fill({ color: COL_OWL });

    // Eyes — blink periodically
    const blinkCycle = this._owlTimer % OWL_BLINK_INTERVAL;
    const isBlinking = blinkCycle > OWL_BLINK_INTERVAL - OWL_BLINK_DURATION;

    if (isBlinking) {
      // Closed eyes (lines)
      g.moveTo(-3.5, -6)
        .lineTo(-0.5, -6)
        .stroke({ color: 0x000000, width: 0.8 });
      g.moveTo(0.5, -6).lineTo(3.5, -6).stroke({ color: 0x000000, width: 0.8 });
    } else {
      // Open eyes
      g.circle(-2, -6, 2).fill({ color: COL_OWL_EYE });
      g.circle(2, -6, 2).fill({ color: COL_OWL_EYE });
      // Pupils (yellow iris)
      g.circle(-2, -6, 1.3).fill({ color: 0x000000 });
      g.circle(2, -6, 1.3).fill({ color: 0x000000 });
      // Bright pupil highlight
      g.circle(-1.5, -6.5, 0.5).fill({ color: 0xffffff, alpha: 0.7 });
      g.circle(2.5, -6.5, 0.5).fill({ color: 0xffffff, alpha: 0.7 });
    }

    // Beak
    g.moveTo(-1, -4.5)
      .lineTo(0, -3)
      .lineTo(1, -4.5)
      .closePath()
      .fill({ color: 0xcc8833 });

    // Feet/talons gripping the buttress
    g.moveTo(-3, 5).lineTo(-4, 8).stroke({ color: 0x666655, width: 1 });
    g.moveTo(-3, 5).lineTo(-2, 8).stroke({ color: 0x666655, width: 1 });
    g.moveTo(3, 5).lineTo(2, 8).stroke({ color: 0x666655, width: 1 });
    g.moveTo(3, 5).lineTo(4, 8).stroke({ color: 0x666655, width: 1 });

    // Subtle body sway (breathing)
    const breathe = Math.sin(time * 1.5) * 0.5;
    this._owl.scale.set(1, 1 + breathe * 0.03);
  }

  // ── Cloud Vortex ───────────────────────────────────────────────────────

  private _updateClouds(time: number): void {
    const g = this._clouds;
    g.clear();

    const cx = TW / 2;
    const cy = -8;
    const spin = time * CLOUD_SPEED;

    // Swirling cloud wisps around the crystal apex
    for (let i = 0; i < 5; i++) {
      const a = spin + (i / 5) * Math.PI * 2;
      const r = 16 + i * 3;
      const cloudX = cx + Math.cos(a) * r;
      const cloudY = cy + Math.sin(a) * r * 0.3;
      const size = 6 + Math.sin(time * 0.8 + i) * 2;
      const alpha = 0.12 + Math.sin(time + i * 1.5) * 0.06;

      g.ellipse(cloudX, cloudY, size, size * 0.5).fill({
        color: COL_CLOUD,
        alpha,
      });
    }

    // Inner brighter wisps (closer to crystal)
    for (let i = 0; i < 3; i++) {
      const a = -spin * 1.5 + (i / 3) * Math.PI * 2;
      const r = 8 + i * 2;
      const cloudX = cx + Math.cos(a) * r;
      const cloudY = cy + Math.sin(a) * r * 0.3;
      const alpha = 0.08 + Math.sin(time * 1.2 + i * 2) * 0.05;

      g.ellipse(cloudX, cloudY, 4, 2).fill({ color: COL_CLOUD_LT, alpha });
    }
  }

  // ── Portal Glow ────────────────────────────────────────────────────────

  private _updatePortal(time: number): void {
    const g = this._portal;
    g.clear();

    const cx = TW / 2;
    const portalW = 18;
    const portalH = 24;
    const portalY = TH - 10 - portalH - 4 + 8;

    const pulse = (Math.sin(time * PORTAL_PULSE_SPEED) + 1) / 2;
    const alpha = 0.3 + pulse * 0.35;

    // Blue glow fill inside the portal arch
    g.rect(cx - portalW / 2 + 1, portalY + 2, portalW - 2, portalH - 2).fill({
      color: COL_PORTAL_BLUE,
      alpha: alpha * 0.4,
    });
    g.ellipse(cx, portalY + 2, portalW / 2 - 1, 6).fill({
      color: COL_PORTAL_BLUE,
      alpha: alpha * 0.4,
    });

    // Rim glow (tinted by owner color)
    g.moveTo(cx - portalW / 2, TH - 10)
      .lineTo(cx - portalW / 2, portalY + 4)
      .quadraticCurveTo(cx, portalY - 8, cx + portalW / 2, portalY + 4)
      .lineTo(cx + portalW / 2, TH - 10)
      .stroke({ color: this._playerColor, width: 2, alpha: alpha * 0.7 });

    // Central bright vertical line (energy pillar)
    g.moveTo(cx, TH - 12)
      .lineTo(cx, portalY + 6)
      .stroke({ color: 0xaaccff, width: 1, alpha: alpha * 0.3 });
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
