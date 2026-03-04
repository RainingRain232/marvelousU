// Procedural elite mage tower renderer for BuildingView.
//
// Draws "The Obsidian Arcanum" — a dark, heavily ornamented mage tower (~2×2 tiles) with:
//   • Obsidian-black stone walls with purple mortar glow
//   • Glowing arcane runes carved into the walls (animated purple/blue glow)
//   • Floating arcane orbs orbiting the spire
//   • Elaborate oversized focus crystal at the apex with intense glow + halo
//   • Dark energy wisps rising from the tower body
//   • Ornate gold and silver trim on windows and doorway
//   • Runic circle pattern on the ground around the base
//   • Lightning/energy arcs between floating elements (occasional)
//   • More windows with eldritch light pouring out
//   • Gargoyle-like carved stone guardians on buttresses
//   • Additional floating stone chunks (more dramatic orbits)
//   • Dragon-rib flying buttresses with rune engravings
//   • Localized dark vortex above the crystal
//   • Mana-garden terrace with shadow-bloom plants
//   • Owl familiar with glowing eyes
//
// All drawing uses PixiJS Graphics. Animations driven by tick(dt, phase).

import { Container, Graphics } from "pixi.js";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TS = 64;
const TW = 2 * TS; // 128px wide
const TH = 2 * TS; // 128px tall

// Palette — obsidian stone & arcane glow
const COL_OBSIDIAN = 0x2a2830;
const COL_OBSIDIAN_LT = 0x3a3840;
const COL_OBSIDIAN_DK = 0x1a1820;
const COL_OBSIDIAN_VDK = 0x100e18;
const COL_GRANITE = 0x44404a;
const COL_GRANITE_DK = 0x2a2832;
const COL_MORTAR = 0x302840;
const COL_MORTAR_GLOW = 0x5533aa;
const COL_WINDOW = 0x0e0a20;
const COL_PORTAL_PURPLE = 0x8844ff;
const _COL_IRON = 0x444455;
const COL_IRON_DK = 0x222233;
const COL_GOLD = 0xffd700;
const COL_GOLD_DK = 0xc8a600;
const COL_SILVER = 0xc0c0d0;
const COL_SILVER_DK = 0x8888a0;

// Arcane / magic
const COL_RUNE = 0x8844ff;
const COL_RUNE_BLUE = 0x4488ff;
const COL_MANA_THREAD = 0xbb99ff;
const COL_CRYSTAL = 0x44eeff;
const COL_CRYSTAL_CORE = 0xccffff;
const COL_CRYSTAL_HALO = 0x6644ff;
const COL_ELDRITCH = 0x9966ff;
const COL_ELDRITCH_LT = 0xccaaff;
const COL_WISP = 0x7744cc;
const COL_WISP_LT = 0xaa77ee;
const COL_ORB = 0x6644dd;
const COL_ORB_CORE = 0xddbbff;
const COL_ARC = 0xaabbff;

// Mana garden (shadow-bloom)
const COL_SHADOW_PLANT = 0x6622aa;
const COL_SHADOW_PLANT_DK = 0x331166;
const COL_SHADOW_BLOOM = 0xcc66ff;

// Owl
const COL_OWL = 0x3a3040;
const COL_OWL_BELLY = 0x6a6070;
const COL_OWL_EYE = 0xcc55ff;

// Cloud vortex (dark)
const COL_CLOUD = 0x443366;
const COL_CLOUD_LT = 0x665588;
const COL_CLOUD_DK = 0x221133;

// Gargoyle
const COL_GARGOYLE = 0x383040;
const COL_GARGOYLE_DK = 0x221a2a;
const COL_GARGOYLE_EYE = 0xff3344;

// Runic circle ground
const COL_GROUND_RUNE = 0x5522aa;

// Animation timing
const RUNE_PULSE_SPEED = 1.8; // rads/sec for pulsing
const FLOAT_ROTATE_SPEED = 0.35; // rads/sec for chunk rotation
const THREAD_FLICKER = 7.0; // Hz for mana thread shimmer
const CRYSTAL_SPIN = 1.5; // rads/sec for orrery rotation
const CLOUD_SPEED = 1.0; // rads/sec for vortex
const OWL_BLINK_INTERVAL = 4.5; // seconds between blinks
const OWL_BLINK_DURATION = 0.2; // seconds of blink
const PLANT_SWAY_SPEED = 2.2; // rads/sec for plant sway
const PORTAL_PULSE_SPEED = 3.5; // rads/sec for portal glow
const ORB_ORBIT_SPEED = 0.6; // rads/sec for orbiting orbs
const WISP_SPEED = 1.5; // rads/sec for rising wisps
const ARC_INTERVAL = 3.0; // seconds between lightning arcs
const ARC_DURATION = 0.3; // seconds arc is visible

// ---------------------------------------------------------------------------
// EliteMageTowerRenderer
// ---------------------------------------------------------------------------

export class EliteMageTowerRenderer {
  readonly container = new Container();

  private _base = new Graphics(); // static tower body, buttresses, entrances
  private _groundRunes = new Graphics(); // runic circle on the ground
  private _windows = new Graphics(); // eldritch windows with gold/silver trim
  private _runes = new Graphics(); // pulsing wall runes
  private _floatChunks = new Graphics(); // floating spire chunks
  private _orbs = new Graphics(); // orbiting arcane orbs
  private _threads = new Graphics(); // mana thread arcs
  private _arcs = new Graphics(); // lightning/energy arcs
  private _crystal = new Graphics(); // apex crystal + orrery
  private _wisps = new Graphics(); // dark energy wisps
  private _garden = new Graphics(); // shadow-bloom terrace
  private _gargoyles = new Graphics(); // stone guardians (semi-static)
  private _owl = new Graphics(); // owl familiar
  private _clouds = new Graphics(); // dark swirling vortex
  private _portal = new Graphics(); // glowing arched portal

  private _time = 0;
  private _owlTimer = 0;
  private _playerColor: number;

  constructor(owner: string | null) {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;

    this._drawBase();
    this._drawWindows();
    this._drawGarden();
    this._drawGargoyles();

    this.container.addChild(this._groundRunes);
    this.container.addChild(this._base);
    this.container.addChild(this._portal);
    this.container.addChild(this._windows);
    this.container.addChild(this._runes);
    this.container.addChild(this._gargoyles);
    this.container.addChild(this._garden);
    this.container.addChild(this._wisps);
    this.container.addChild(this._floatChunks);
    this.container.addChild(this._orbs);
    this.container.addChild(this._threads);
    this.container.addChild(this._arcs);
    this.container.addChild(this._crystal);
    this.container.addChild(this._owl);
    this.container.addChild(this._clouds);
  }

  setOwner(owner: string | null): void {
    this._playerColor = owner === "p1" ? 0x4488ff : owner === "p2" ? 0xff4444 : 0xeeeeee;
  }

  tick(dt: number, _phase: GamePhase): void {
    this._time += dt;

    // 1. Ground runic circle
    this._updateGroundRunes(this._time);

    // 2. Pulsing wall runes
    this._updateRunes(this._time);

    // 3. Floating chunks (slow rotation)
    this._updateFloatingChunks(this._time);

    // 4. Orbiting arcane orbs
    this._updateOrbs(this._time);

    // 5. Mana threads connecting chunks
    this._updateThreads(this._time);

    // 6. Lightning/energy arcs
    this._updateArcs(this._time);

    // 7. Crystal + orrery spin
    this._updateCrystal(this._time);

    // 8. Dark energy wisps
    this._updateWisps(this._time);

    // 9. Cloud vortex
    this._updateClouds(this._time);

    // 10. Owl blink
    this._owlTimer += dt;
    this._updateOwl(this._time);

    // 11. Portal glow pulse
    this._updatePortal(this._time);

    // 12. Garden sway
    this._updateGarden(this._time);
  }

  // ── Base Structure ──────────────────────────────────────────────────────

  private _drawBase(): void {
    const g = this._base;
    const cx = TW / 2;

    // ── Ground platform / stairs ──
    g.rect(8, TH - 12, TW - 16, 12).fill({ color: COL_OBSIDIAN_DK });
    g.rect(4, TH - 6, TW - 8, 6).fill({ color: COL_OBSIDIAN_VDK });
    // Step lines with faint purple mortar glow
    g.moveTo(8, TH - 8)
      .lineTo(TW - 8, TH - 8)
      .stroke({ color: COL_MORTAR_GLOW, width: 0.5, alpha: 0.3 });
    g.moveTo(6, TH - 4)
      .lineTo(TW - 6, TH - 4)
      .stroke({ color: COL_MORTAR_GLOW, width: 0.4, alpha: 0.2 });

    // ── Main tower body (slightly tapered, taller feel) ──
    const bodyL = 28;
    const bodyR = TW - 28;
    const bodyTop = 24;
    const bodyBot = TH - 12;
    // Slight taper: narrower at top
    const taperL = bodyL + 5;
    const taperR = bodyR - 5;

    g.moveTo(bodyL, bodyBot)
      .lineTo(taperL, bodyTop)
      .lineTo(taperR, bodyTop)
      .lineTo(bodyR, bodyBot)
      .closePath()
      .fill({ color: COL_OBSIDIAN })
      .stroke({ color: COL_OBSIDIAN_DK, width: 1.5 });

    // Brick pattern on tower body with faint glowing mortar
    this._drawBrickPattern(
      g,
      bodyL + 2,
      bodyTop + 2,
      bodyR - bodyL - 4,
      bodyBot - bodyTop - 4,
    );

    // ── Weathering / dark crystalline patches ──
    g.ellipse(bodyL + 8, bodyBot - 10, 5, 2).fill({
      color: COL_OBSIDIAN_VDK,
      alpha: 0.5,
    });
    g.ellipse(bodyR - 7, bodyBot - 14, 4, 2).fill({
      color: 0x221830,
      alpha: 0.4,
    });
    // Faint purple cracks
    g.moveTo(bodyL + 12, bodyBot - 5)
      .lineTo(bodyL + 15, bodyBot - 18)
      .stroke({ color: COL_MORTAR_GLOW, width: 0.4, alpha: 0.2 });
    g.moveTo(bodyR - 10, bodyBot - 8)
      .lineTo(bodyR - 14, bodyBot - 22)
      .stroke({ color: COL_MORTAR_GLOW, width: 0.4, alpha: 0.15 });

    // ── Dragon-rib flying buttresses ──
    this._drawButtress(g, bodyL, bodyBot, -1);
    this._drawButtress(g, bodyR, bodyBot, 1);

    // ── Entrances at the base ──

    // 1. Ornate Iron Gate (left) with silver trim
    const ironGateX = bodyL + 3;
    const ironGateW = 14;
    const ironGateH = 24;
    const ironGateY = bodyBot - ironGateH;
    g.rect(ironGateX, ironGateY, ironGateW, ironGateH)
      .fill({ color: COL_IRON_DK })
      .stroke({ color: COL_SILVER_DK, width: 1 });
    // Silver bands
    for (let by = ironGateY + 5; by < bodyBot - 3; by += 6) {
      g.moveTo(ironGateX + 1, by)
        .lineTo(ironGateX + ironGateW - 1, by)
        .stroke({ color: COL_SILVER, width: 0.8, alpha: 0.5 });
    }
    // Ornate ring handle (gold)
    g.circle(
      ironGateX + ironGateW - 4,
      ironGateY + ironGateH * 0.5,
      2,
    ).stroke({ color: COL_GOLD, width: 1.2 });
    // Rune on door
    g.circle(
      ironGateX + ironGateW / 2,
      ironGateY + 6,
      3,
    ).stroke({ color: COL_RUNE, width: 0.6, alpha: 0.4 });

    // 2. Arched Portal (center) — glowing purple mage entrance
    this._drawPortalStatic(g, cx);

    // 3. Ornate External Stairs (right) with gold railing
    const stairX = bodyR - 2;
    const stairW = 11;
    const stairSteps = 7;
    const stairStepH = (bodyBot - bodyTop - 28) / stairSteps;
    for (let i = 0; i < stairSteps; i++) {
      const sy = bodyBot - (i + 1) * stairStepH;
      g.rect(stairX, sy, stairW - i * 0.5, stairStepH + 1)
        .fill({ color: COL_GRANITE })
        .stroke({ color: COL_GRANITE_DK, width: 0.3 });
    }
    // Gold railing
    g.moveTo(stairX + stairW, bodyBot)
      .lineTo(stairX + stairW - 3, bodyTop + 28)
      .stroke({ color: COL_GOLD_DK, width: 1.4 });
    // Gold finial at top
    g.circle(stairX + stairW - 3, bodyTop + 27, 1.5).fill({
      color: COL_GOLD,
    });
    // Balcony platform with gold trim
    g.rect(stairX - 4, bodyTop + 25, stairW + 7, 4)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GOLD_DK, width: 0.7 });

    // ── Cornices / string courses with gold inlay ──
    this._drawCornice(g, bodyL, bodyTop + 28, bodyR - bodyL);
    this._drawCornice(g, bodyL + 2, bodyTop + 58, bodyR - bodyL - 4);

    // ── Pointed spire cap above main body ──
    g.moveTo(taperL + 4, bodyTop)
      .lineTo(cx, bodyTop - 10)
      .lineTo(taperR - 4, bodyTop)
      .closePath()
      .fill({ color: COL_OBSIDIAN_DK })
      .stroke({ color: COL_OBSIDIAN_VDK, width: 1 });
    // Gold spire trim
    g.moveTo(cx - 2, bodyTop - 8)
      .lineTo(cx, bodyTop - 12)
      .lineTo(cx + 2, bodyTop - 8)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.8 });

    // ── Owl perch nook ──
    this._owl.position.set(bodyL - 18, bodyBot - 42);
  }

  private _drawButtress(
    g: Graphics,
    x: number,
    botY: number,
    dir: number,
  ): void {
    const ribW = 20 * dir;
    const ribTop = botY - 60;

    // Main rib arc
    g.moveTo(x, botY)
      .quadraticCurveTo(x + ribW * 0.4, botY - 22, x + ribW * 0.1, ribTop)
      .lineTo(x + ribW * 0.25, ribTop + 5)
      .quadraticCurveTo(x + ribW * 0.5, botY - 17, x + ribW * 0.15, botY)
      .closePath()
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 1 });

    // Secondary smaller rib
    g.moveTo(x, botY - 18)
      .quadraticCurveTo(x + ribW * 0.3, botY - 34, x + ribW * 0.05, botY - 50)
      .stroke({ color: COL_GRANITE_DK, width: 1.5 });

    // Rune engravings on buttress
    const runeY1 = botY - 30;
    const runeY2 = botY - 45;
    const runeOffX = x + ribW * 0.12;
    g.moveTo(runeOffX - 2, runeY1)
      .lineTo(runeOffX + 2, runeY1)
      .stroke({ color: COL_RUNE, width: 0.6, alpha: 0.3 });
    g.moveTo(runeOffX, runeY1 - 2)
      .lineTo(runeOffX, runeY1 + 2)
      .stroke({ color: COL_RUNE, width: 0.6, alpha: 0.3 });
    g.circle(runeOffX, runeY2, 2).stroke({
      color: COL_RUNE,
      width: 0.5,
      alpha: 0.25,
    });

    // Base pedestal
    g.rect(x + (dir > 0 ? 0 : -14), botY - 4, 14, 4).fill({
      color: COL_OBSIDIAN_DK,
    });
  }

  private _drawPortalStatic(g: Graphics, cx: number): void {
    const portalW = 22;
    const portalH = 30;
    const portalY = TH - 12 - portalH;

    // Dark interior
    g.rect(cx - portalW / 2, portalY + 8, portalW, portalH - 8).fill({
      color: 0x060410,
    });
    g.ellipse(cx, portalY + 8, portalW / 2, 8).fill({ color: 0x060410 });

    // Stone arch frame with gold trim
    g.moveTo(cx - portalW / 2 - 3, TH - 12)
      .lineTo(cx - portalW / 2 - 3, portalY + 10)
      .quadraticCurveTo(cx, portalY - 8, cx + portalW / 2 + 3, portalY + 10)
      .lineTo(cx + portalW / 2 + 3, TH - 12)
      .stroke({ color: COL_GRANITE, width: 2.5 });
    // Outer gold accent
    g.moveTo(cx - portalW / 2 - 5, TH - 12)
      .lineTo(cx - portalW / 2 - 5, portalY + 12)
      .quadraticCurveTo(cx, portalY - 10, cx + portalW / 2 + 5, portalY + 12)
      .lineTo(cx + portalW / 2 + 5, TH - 12)
      .stroke({ color: COL_GOLD_DK, width: 1, alpha: 0.6 });
    // Keystone at arch apex
    g.moveTo(cx - 3, portalY - 4)
      .lineTo(cx, portalY - 8)
      .lineTo(cx + 3, portalY - 4)
      .closePath()
      .fill({ color: COL_GOLD, alpha: 0.7 });

    this._portal.position.set(0, 0);
  }

  private _drawBrickPattern(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    for (let row = 0; row < h; row += 7) {
      const offset = (Math.floor(row / 7) % 2) * 9;
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
      // Faint purple glow in mortar lines
      g.moveTo(x, y + row)
        .lineTo(x + w, y + row)
        .stroke({ color: COL_MORTAR_GLOW, width: 0.2, alpha: 0.08 });
      for (let col = offset; col < w; col += 18) {
        g.moveTo(x + col, y + row)
          .lineTo(x + col, y + row + 7)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.25 });
      }
    }
  }

  private _drawCornice(g: Graphics, x: number, y: number, w: number): void {
    g.rect(x - 2, y, w + 4, 3)
      .fill({ color: COL_OBSIDIAN_LT })
      .stroke({ color: COL_OBSIDIAN_DK, width: 0.4 });
    // Gold inlay strip
    g.rect(x, y + 1, w, 1).fill({ color: COL_GOLD_DK, alpha: 0.3 });
  }

  // ── Gargoyle Stone Guardians ─────────────────────────────────────────────

  private _drawGargoyles(): void {
    const g = this._gargoyles;
    const bodyL = 28;
    const bodyR = TW - 28;
    const bodyBot = TH - 12;

    // Left gargoyle perched on left buttress
    this._drawGargoyle(g, bodyL - 10, bodyBot - 52, -1);
    // Right gargoyle perched on right buttress
    this._drawGargoyle(g, bodyR + 10, bodyBot - 52, 1);
  }

  private _drawGargoyle(
    g: Graphics,
    x: number,
    y: number,
    dir: number,
  ): void {
    // Body: hunched forward
    g.ellipse(x, y, 5, 4).fill({ color: COL_GARGOYLE });
    // Head
    g.circle(x + 4 * dir, y - 3, 3).fill({ color: COL_GARGOYLE });
    // Snout
    g.moveTo(x + 4 * dir, y - 4)
      .lineTo(x + 8 * dir, y - 3)
      .lineTo(x + 4 * dir, y - 2)
      .closePath()
      .fill({ color: COL_GARGOYLE_DK });
    // Horns
    g.moveTo(x + 2 * dir, y - 5)
      .lineTo(x + 1 * dir, y - 9)
      .stroke({ color: COL_GARGOYLE_DK, width: 1.2 });
    g.moveTo(x + 5 * dir, y - 5)
      .lineTo(x + 6 * dir, y - 9)
      .stroke({ color: COL_GARGOYLE_DK, width: 1.2 });
    // Wing stubs
    g.moveTo(x - 2 * dir, y - 2)
      .lineTo(x - 6 * dir, y - 6)
      .lineTo(x - 4 * dir, y)
      .closePath()
      .fill({ color: COL_GARGOYLE, alpha: 0.8 })
      .stroke({ color: COL_GARGOYLE_DK, width: 0.5 });
    // Eyes (glowing red)
    g.circle(x + 3 * dir, y - 4, 0.8).fill({ color: COL_GARGOYLE_EYE });
    g.circle(x + 5 * dir, y - 4, 0.8).fill({ color: COL_GARGOYLE_EYE });
    // Talons gripping stone
    g.moveTo(x - 3, y + 3)
      .lineTo(x - 4, y + 6)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
    g.moveTo(x - 1, y + 3)
      .lineTo(x - 1, y + 6)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
    g.moveTo(x + 2, y + 3)
      .lineTo(x + 3, y + 6)
      .stroke({ color: COL_GARGOYLE_DK, width: 0.8 });
  }

  // ── Windows (eldritch glow with gold/silver trim) ─────────────────────

  private _drawWindows(): void {
    const g = this._windows;
    const cx = TW / 2;

    // Upper tier — two large lancet windows
    this._drawLancetWindow(g, cx - 18, 36, 11, 24);
    this._drawLancetWindow(g, cx + 7, 36, 11, 24);

    // Middle tier — two smaller windows
    this._drawLancetWindow(g, cx - 12, 68, 8, 16);
    this._drawLancetWindow(g, cx + 4, 68, 8, 16);

    // Lower tier — small slit windows at base area
    this._drawSlitWindow(g, cx - 20, 90, 4, 10);
    this._drawSlitWindow(g, cx + 16, 90, 4, 10);
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
      .quadraticCurveTo(x + w / 2, y - 3, x + w + 1, y + 4)
      .lineTo(x + w + 1, y + 4)
      .lineTo(x - 1, y + 4)
      .closePath()
      .fill({ color: COL_WINDOW });

    // Eldritch purple-violet inner glow
    g.rect(x, y + 5, w, h - 5).fill({ color: 0x1a0833, alpha: 0.9 });
    // Glowing eldritch light
    g.rect(x + 1, y + 6, w - 2, h - 7).fill({
      color: COL_ELDRITCH,
      alpha: 0.2,
    });

    // Eldritch rune symbol inside window
    const wcx = x + w / 2;
    const wcy = y + 5 + (h - 5) / 2;
    g.circle(wcx, wcy, Math.min(w, h - 5) * 0.25).stroke({
      color: COL_ELDRITCH_LT,
      width: 0.6,
      alpha: 0.4,
    });
    // Inner vertical line
    g.moveTo(wcx, wcy - 4)
      .lineTo(wcx, wcy + 4)
      .stroke({ color: COL_ELDRITCH_LT, width: 0.4, alpha: 0.35 });

    // Star dots (eldritch constellation)
    const stars = [
      { dx: 0.2, dy: 0.2 },
      { dx: 0.8, dy: 0.15 },
      { dx: 0.5, dy: 0.45 },
      { dx: 0.25, dy: 0.7 },
      { dx: 0.75, dy: 0.65 },
      { dx: 0.6, dy: 0.88 },
      { dx: 0.15, dy: 0.5 },
      { dx: 0.85, dy: 0.4 },
    ];
    for (const s of stars) {
      g.circle(x + w * s.dx, y + 5 + (h - 5) * s.dy, 0.7).fill({
        color: COL_ELDRITCH_LT,
        alpha: 0.7,
      });
    }

    // Lead frame lines
    g.moveTo(x + w / 2, y + 2)
      .lineTo(x + w / 2, y + h)
      .stroke({ color: 0x222233, width: 0.6, alpha: 0.5 });
    // Gold trim frame
    g.moveTo(x - 2, y + h)
      .lineTo(x - 2, y + 4)
      .quadraticCurveTo(x + w / 2, y - 4, x + w + 2, y + 4)
      .lineTo(x + w + 2, y + h)
      .stroke({ color: COL_GOLD_DK, width: 0.8, alpha: 0.5 });
    // Silver inner trim
    g.moveTo(x, y + h - 1)
      .lineTo(x, y + 5)
      .stroke({ color: COL_SILVER, width: 0.4, alpha: 0.3 });
    g.moveTo(x + w, y + h - 1)
      .lineTo(x + w, y + 5)
      .stroke({ color: COL_SILVER, width: 0.4, alpha: 0.3 });

    // Stone ledge below window
    g.rect(x - 3, y + h, w + 6, 2).fill({ color: COL_OBSIDIAN_DK });
    // Gold ledge accent
    g.rect(x - 2, y + h, w + 4, 1).fill({ color: COL_GOLD_DK, alpha: 0.25 });
  }

  private _drawSlitWindow(
    g: Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    g.rect(x, y, w, h).fill({ color: COL_WINDOW });
    // Eldritch glow inside
    g.rect(x + 0.5, y + 0.5, w - 1, h - 1).fill({
      color: COL_ELDRITCH,
      alpha: 0.25,
    });
    // Silver trim
    g.rect(x - 0.5, y - 0.5, w + 1, h + 1).stroke({
      color: COL_SILVER_DK,
      width: 0.5,
      alpha: 0.4,
    });
  }

  // ── Runic Circle on the Ground ────────────────────────────────────────

  private _updateGroundRunes(time: number): void {
    const g = this._groundRunes;
    g.clear();

    const cx = TW / 2;
    const cy = TH - 4;
    const pulse = (Math.sin(time * RUNE_PULSE_SPEED * 0.6) + 1) / 2;
    const alpha = 0.15 + pulse * 0.2;

    // Outer circle
    g.ellipse(cx, cy, 56, 5).stroke({
      color: COL_GROUND_RUNE,
      width: 1,
      alpha,
    });
    // Inner circle
    g.ellipse(cx, cy, 44, 4).stroke({
      color: COL_GROUND_RUNE,
      width: 0.7,
      alpha: alpha * 0.8,
    });

    // Rune marks around the circle
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2 + time * 0.1;
      const rx = cx + Math.cos(a) * 50;
      const ry = cy + Math.sin(a) * 4.5;
      // Small rune diamond
      g.moveTo(rx, ry - 2)
        .lineTo(rx + 1.5, ry)
        .lineTo(rx, ry + 2)
        .lineTo(rx - 1.5, ry)
        .closePath()
        .fill({ color: COL_GROUND_RUNE, alpha: alpha * 0.7 });
    }

    // Cross pattern inside the circle
    g.moveTo(cx - 36, cy)
      .lineTo(cx + 36, cy)
      .stroke({ color: COL_GROUND_RUNE, width: 0.5, alpha: alpha * 0.4 });
    g.moveTo(cx, cy - 3)
      .lineTo(cx, cy + 3)
      .stroke({ color: COL_GROUND_RUNE, width: 0.5, alpha: alpha * 0.4 });

    // Diagonal cross
    g.moveTo(cx - 28, cy - 2.5)
      .lineTo(cx + 28, cy + 2.5)
      .stroke({ color: COL_GROUND_RUNE, width: 0.3, alpha: alpha * 0.3 });
    g.moveTo(cx + 28, cy - 2.5)
      .lineTo(cx - 28, cy + 2.5)
      .stroke({ color: COL_GROUND_RUNE, width: 0.3, alpha: alpha * 0.3 });
  }

  // ── Ley-line Runes (animated pulse) ────────────────────────────────────

  private _updateRunes(time: number): void {
    const g = this._runes;
    g.clear();

    const pulse = (Math.sin(time * RUNE_PULSE_SPEED) + 1) / 2;
    const alpha = 0.35 + pulse * 0.55;
    const cx = TW / 2;

    // Secondary color cycle between purple and blue
    const colorBlend = (Math.sin(time * RUNE_PULSE_SPEED * 0.7) + 1) / 2;

    // Vertical rune strip on left side of tower
    const runeX = 34;
    for (let ry = 32; ry < TH - 24; ry += 14) {
      this._drawRune(g, runeX, ry, alpha, colorBlend);
    }

    // Vertical rune strip on right side of tower
    const runeX2 = TW - 36;
    for (let ry = 36; ry < TH - 24; ry += 14) {
      this._drawRune(g, runeX2, ry, alpha, colorBlend);
    }

    // Central rune above portal (larger, more ornate)
    this._drawRuneCircle(g, cx, TH - 48, 6, alpha);

    // Additional runes on the spire section
    this._drawRune(g, cx - 6, 28, alpha * 0.8, colorBlend);
    this._drawRune(g, cx + 6, 30, alpha * 0.8, colorBlend);
  }

  private _drawRune(
    g: Graphics,
    x: number,
    y: number,
    alpha: number,
    blend: number,
  ): void {
    // Blend between purple and blue rune color
    const color = blend > 0.5 ? COL_RUNE : COL_RUNE_BLUE;

    // Diamond with inner cross and corner dots
    g.moveTo(x, y - 5)
      .lineTo(x + 4, y)
      .lineTo(x, y + 5)
      .lineTo(x - 4, y)
      .closePath()
      .stroke({ color, width: 1, alpha });
    g.moveTo(x, y - 3)
      .lineTo(x, y + 3)
      .stroke({ color, width: 0.5, alpha: alpha * 0.7 });
    g.moveTo(x - 2, y)
      .lineTo(x + 2, y)
      .stroke({ color, width: 0.5, alpha: alpha * 0.7 });

    // Corner accent dots
    g.circle(x, y - 5, 0.6).fill({ color, alpha: alpha * 0.5 });
    g.circle(x, y + 5, 0.6).fill({ color, alpha: alpha * 0.5 });
    g.circle(x - 4, y, 0.6).fill({ color, alpha: alpha * 0.5 });
    g.circle(x + 4, y, 0.6).fill({ color, alpha: alpha * 0.5 });
  }

  private _drawRuneCircle(
    g: Graphics,
    x: number,
    y: number,
    r: number,
    alpha: number,
  ): void {
    g.circle(x, y, r).stroke({ color: COL_RUNE, width: 1.2, alpha });
    g.circle(x, y, r * 0.55).stroke({
      color: COL_RUNE_BLUE,
      width: 0.7,
      alpha: alpha * 0.7,
    });
    // Radiating dots
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.circle(x + Math.cos(a) * (r + 2.5), y + Math.sin(a) * (r + 2.5), 0.9).fill({
        color: COL_RUNE,
        alpha: alpha * 0.5,
      });
    }
    // Inner arcane symbol
    g.moveTo(x, y - r * 0.4)
      .lineTo(x + r * 0.35, y + r * 0.2)
      .lineTo(x - r * 0.35, y + r * 0.2)
      .closePath()
      .stroke({ color: COL_RUNE_BLUE, width: 0.6, alpha: alpha * 0.4 });
  }

  // ── Floating Spire Chunks (more dramatic) ──────────────────────────────

  private _updateFloatingChunks(time: number): void {
    const g = this._floatChunks;
    g.clear();

    const cx = TW / 2;
    const baseY = 16;
    const angle = time * FLOAT_ROTATE_SPEED;

    // Five chunks (more than the base version's 3)
    for (let i = 0; i < 5; i++) {
      const a = angle + (i * Math.PI * 2) / 5;
      const orbitR = 10 + (i % 2) * 4;
      const ox = cx + Math.cos(a) * orbitR;
      const oy = baseY + Math.sin(a) * 3 + i * 3;
      const bob = Math.sin(time * 1.4 + i * 1.3) * 2.5;

      // Stone chunk
      const cW = 15 - i * 1.5;
      const cH = 13 - i * 1.5;
      g.rect(ox - cW / 2, oy - cH / 2 + bob, cW, cH)
        .fill({ color: i % 2 === 0 ? COL_OBSIDIAN : COL_OBSIDIAN_LT })
        .stroke({ color: COL_OBSIDIAN_DK, width: 1 });

      // Rune mark on each chunk
      g.circle(ox, oy + bob, 2).stroke({
        color: COL_RUNE,
        width: 0.5,
        alpha: 0.3 + (Math.sin(time * 2 + i) + 1) * 0.15,
      });

      // Tiny brick detail on larger chunks
      if (cW > 10) {
        g.moveTo(ox - cW / 2 + 2, oy + bob)
          .lineTo(ox + cW / 2 - 2, oy + bob)
          .stroke({ color: COL_MORTAR, width: 0.3, alpha: 0.3 });
      }

      // Purple glow edge on bottom of chunk
      g.moveTo(ox - cW / 2 + 1, oy + cH / 2 + bob)
        .lineTo(ox + cW / 2 - 1, oy + cH / 2 + bob)
        .stroke({ color: COL_RUNE, width: 0.6, alpha: 0.15 });
    }
  }

  // ── Orbiting Arcane Orbs ────────────────────────────────────────────────

  private _updateOrbs(time: number): void {
    const g = this._orbs;
    g.clear();

    const cx = TW / 2;
    const cy = 8;

    // Four orbiting orbs at different heights and speeds
    for (let i = 0; i < 4; i++) {
      const speed = ORB_ORBIT_SPEED * (1 + i * 0.15);
      const a = time * speed + (i * Math.PI * 2) / 4;
      const orbitRx = 20 + i * 5;
      const orbitRy = 4 + i * 2;
      const orbY = cy + i * 6;

      const ox = cx + Math.cos(a) * orbitRx;
      const oy = orbY + Math.sin(a) * orbitRy;

      const pulse = (Math.sin(time * 3 + i * 1.5) + 1) / 2;
      const orbR = 2 + pulse * 0.8;

      // Outer glow
      g.circle(ox, oy, orbR + 2).fill({
        color: COL_ORB,
        alpha: 0.15 + pulse * 0.1,
      });
      // Orb body
      g.circle(ox, oy, orbR).fill({
        color: COL_ORB,
        alpha: 0.7 + pulse * 0.3,
      });
      // Bright core
      g.circle(ox, oy, orbR * 0.4).fill({
        color: COL_ORB_CORE,
        alpha: 0.6 + pulse * 0.4,
      });
    }
  }

  // ── Mana Threads (arcs connecting floating chunks) ──────────────────────

  private _updateThreads(time: number): void {
    const g = this._threads;
    g.clear();

    const cx = TW / 2;
    const baseY = 16;
    const angle = time * FLOAT_ROTATE_SPEED;
    const flicker = (Math.sin(time * THREAD_FLICKER) + 1) / 2;
    const alpha = 0.4 + flicker * 0.45;

    // Draw arcs between each chunk and the crystal
    for (let i = 0; i < 5; i++) {
      const a = angle + (i * Math.PI * 2) / 5;
      const orbitR = 10 + (i % 2) * 4;
      const ox = cx + Math.cos(a) * orbitR;
      const oy =
        baseY +
        Math.sin(a) * 3 +
        i * 3 +
        Math.sin(time * 1.4 + i * 1.3) * 2.5;

      // Thread from chunk to crystal apex
      g.moveTo(ox, oy)
        .quadraticCurveTo(
          cx + Math.sin(time + i) * 4,
          baseY - 16,
          cx,
          baseY - 24,
        )
        .stroke({ color: COL_MANA_THREAD, width: 1.2, alpha });

      // Spark at junction
      g.circle(ox, oy, 1.5 + flicker).fill({
        color: COL_MANA_THREAD,
        alpha: alpha * 0.5,
      });
    }

    // Inter-chunk threads (between adjacent chunks)
    for (let i = 0; i < 5; i++) {
      const j = (i + 1) % 5;
      const ai = angle + (i * Math.PI * 2) / 5;
      const aj = angle + (j * Math.PI * 2) / 5;
      const ri = 10 + (i % 2) * 4;
      const rj = 10 + (j % 2) * 4;

      const x1 = cx + Math.cos(ai) * ri;
      const y1 =
        baseY +
        Math.sin(ai) * 3 +
        i * 3 +
        Math.sin(time * 1.4 + i * 1.3) * 2.5;
      const x2 = cx + Math.cos(aj) * rj;
      const y2 =
        baseY +
        Math.sin(aj) * 3 +
        j * 3 +
        Math.sin(time * 1.4 + j * 1.3) * 2.5;

      g.moveTo(x1, y1)
        .lineTo(x2, y2)
        .stroke({ color: COL_MANA_THREAD, width: 0.5, alpha: alpha * 0.3 });
    }
  }

  // ── Lightning / Energy Arcs ──────────────────────────────────────────────

  private _updateArcs(time: number): void {
    const g = this._arcs;
    g.clear();

    const cx = TW / 2;
    const cycle = time % ARC_INTERVAL;

    // Only draw arcs during the brief visible window
    if (cycle > ARC_DURATION) return;

    const arcAlpha = 0.5 + (1 - cycle / ARC_DURATION) * 0.5;

    // Arc from crystal to a floating chunk
    const targetIdx = Math.floor(time / ARC_INTERVAL) % 5;
    const angle = time * FLOAT_ROTATE_SPEED;
    const a = angle + (targetIdx * Math.PI * 2) / 5;
    const orbitR = 10 + (targetIdx % 2) * 4;
    const ox = cx + Math.cos(a) * orbitR;
    const baseY = 16;
    const oy =
      baseY +
      Math.sin(a) * 3 +
      targetIdx * 3 +
      Math.sin(time * 1.4 + targetIdx * 1.3) * 2.5;

    // Jagged lightning path from crystal down to chunk
    const startX = cx;
    const startY = baseY - 24;
    const segments = 5;
    let px = startX;
    let py = startY;

    g.moveTo(px, py);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const tx = startX + (ox - startX) * t;
      const ty = startY + (oy - startY) * t;
      // Add jitter for lightning look
      const jx = (Math.sin(time * 40 + i * 7.3) * 4) * (1 - t);
      const jy = (Math.cos(time * 35 + i * 5.1) * 3) * (1 - t);
      px = tx + jx;
      py = ty + jy;
      g.lineTo(px, py);
    }
    g.stroke({ color: COL_ARC, width: 1.5, alpha: arcAlpha });

    // Secondary thinner arc alongside
    px = startX;
    py = startY;
    g.moveTo(px, py);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const tx = startX + (ox - startX) * t;
      const ty = startY + (oy - startY) * t;
      const jx = (Math.cos(time * 38 + i * 9.1) * 3) * (1 - t);
      const jy = (Math.sin(time * 42 + i * 6.3) * 2) * (1 - t);
      px = tx + jx;
      py = ty + jy;
      g.lineTo(px, py);
    }
    g.stroke({ color: 0xffffff, width: 0.6, alpha: arcAlpha * 0.5 });

    // Bright flash at origin
    g.circle(startX, startY, 3 + arcAlpha * 2).fill({
      color: 0xffffff,
      alpha: arcAlpha * 0.3,
    });
  }

  // ── Crystal + Orrery (larger, brighter) ─────────────────────────────────

  private _updateCrystal(time: number): void {
    const g = this._crystal;
    g.clear();

    const cx = TW / 2;
    const cy = -4;
    const spin = time * CRYSTAL_SPIN;

    // Outer orrery rings (gold, double ring)
    const ringR = 13;
    g.circle(cx, cy, ringR).stroke({ color: COL_GOLD, width: 1.4, alpha: 0.7 });
    g.circle(cx, cy, ringR * 0.7).stroke({
      color: COL_GOLD_DK,
      width: 0.9,
      alpha: 0.5,
    });
    // Third inner ring (silver)
    g.circle(cx, cy, ringR * 0.4).stroke({
      color: COL_SILVER,
      width: 0.6,
      alpha: 0.4,
    });

    // Orbiting small spheres (orrery planets)
    for (let i = 0; i < 4; i++) {
      const pa = spin + (i * Math.PI * 2) / 4;
      const pr = i % 2 === 0 ? ringR : ringR * 0.7;
      const px = cx + Math.cos(pa) * pr;
      const py = cy + Math.sin(pa) * pr * 0.4;
      g.circle(px, py, 1.8).fill({ color: COL_GOLD });
    }

    // Crystal — larger faceted gem
    const crR = 8;
    const pulse = (Math.sin(time * 2.8) + 1) / 2;
    const crystalAlpha = 0.75 + pulse * 0.25;

    // Octagonal crystal shape
    const sides = 8;
    const points: number[] = [];
    for (let i = 0; i < sides; i++) {
      const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
      const r = crR + (i % 2 === 0 ? 0 : -2);
      points.push(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    g.poly(points)
      .fill({ color: COL_CRYSTAL, alpha: crystalAlpha })
      .stroke({ color: COL_CRYSTAL_CORE, width: 1.2, alpha: crystalAlpha });

    // Inner glow core (brighter than base)
    g.circle(cx, cy, crR * 0.45).fill({
      color: COL_CRYSTAL_CORE,
      alpha: 0.55 + pulse * 0.35,
    });
    // Tiny bright center
    g.circle(cx, cy, crR * 0.15).fill({
      color: 0xffffff,
      alpha: 0.5 + pulse * 0.4,
    });

    // Radial glow halo (larger, more dramatic)
    g.circle(cx, cy, ringR + 5).stroke({
      color: COL_CRYSTAL_HALO,
      width: 1.2,
      alpha: 0.12 + pulse * 0.12,
    });
    g.circle(cx, cy, ringR + 8).stroke({
      color: COL_CRYSTAL_HALO,
      width: 0.6,
      alpha: 0.06 + pulse * 0.06,
    });

    // Rays emanating from crystal (4 directional)
    for (let i = 0; i < 4; i++) {
      const ra = (i / 4) * Math.PI * 2 + time * 0.3;
      const rx = Math.cos(ra);
      const ry = Math.sin(ra);
      g.moveTo(cx + rx * crR, cy + ry * crR)
        .lineTo(cx + rx * (ringR + 6), cy + ry * (ringR + 6))
        .stroke({
          color: COL_CRYSTAL_CORE,
          width: 0.6,
          alpha: 0.15 + pulse * 0.1,
        });
    }
  }

  // ── Dark Energy Wisps ──────────────────────────────────────────────────

  private _updateWisps(time: number): void {
    const g = this._wisps;
    g.clear();

    const cx = TW / 2;
    const _bodyTop = 24;
    const bodyBot = TH - 12;

    // Rising wisps from different points on the tower
    const wispSources = [
      { x: cx - 12, y: bodyBot - 20 },
      { x: cx + 10, y: bodyBot - 30 },
      { x: cx - 5, y: bodyBot - 50 },
      { x: cx + 8, y: bodyBot - 15 },
      { x: cx, y: bodyBot - 40 },
      { x: cx - 15, y: bodyBot - 45 },
      { x: cx + 14, y: bodyBot - 55 },
    ];

    for (let i = 0; i < wispSources.length; i++) {
      const src = wispSources[i];
      const phase = time * WISP_SPEED + i * 1.7;
      const cycle = phase % 4.0; // 4-second cycle per wisp
      const progress = cycle / 4.0; // 0..1

      if (progress > 0.9) continue; // brief gap between cycles

      const fadeIn = Math.min(progress * 4, 1);
      const fadeOut = Math.max(0, 1 - (progress - 0.6) / 0.3);
      const alpha = Math.min(fadeIn, fadeOut) * 0.4;

      const rise = progress * 30;
      const drift = Math.sin(phase * 2.5) * 5;

      const wx = src.x + drift;
      const wy = src.y - rise;

      // Wisp trail (curved upward)
      g.moveTo(src.x, src.y)
        .quadraticCurveTo(
          src.x + drift * 0.5,
          src.y - rise * 0.5,
          wx,
          wy,
        )
        .stroke({ color: COL_WISP, width: 1.5, alpha: alpha * 0.6 });

      // Wisp head (soft glow)
      g.circle(wx, wy, 2 + progress).fill({
        color: COL_WISP_LT,
        alpha,
      });
      g.circle(wx, wy, 1).fill({
        color: 0xffffff,
        alpha: alpha * 0.5,
      });
    }
  }

  // ── Mana Garden Terrace (shadow-bloom) ──────────────────────────────────

  private _drawGarden(): void {
    const g = this._garden;
    const terX = TW - 38;
    const terY = 44;
    const terW = 18;
    const terH = 4;

    // Dark stone platform
    g.rect(terX, terY, terW, terH)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 0.5 });
    // Support bracket
    g.moveTo(terX, terY + terH)
      .lineTo(terX + 3, terY + terH + 7)
      .lineTo(terX, terY + terH + 7)
      .closePath()
      .fill({ color: COL_GRANITE_DK });
    // Gold trim on platform edge
    g.rect(terX, terY, terW, 1).fill({ color: COL_GOLD_DK, alpha: 0.25 });
  }

  private _updateGarden(time: number): void {
    const g = this._garden;
    g.clear();

    // Re-draw static terrace
    const terX = TW - 38;
    const terY = 44;
    const terW = 18;
    const terH = 4;
    g.rect(terX, terY, terW, terH)
      .fill({ color: COL_GRANITE })
      .stroke({ color: COL_GRANITE_DK, width: 0.5 });
    g.moveTo(terX, terY + terH)
      .lineTo(terX + 3, terY + terH + 7)
      .lineTo(terX, terY + terH + 7)
      .closePath()
      .fill({ color: COL_GRANITE_DK });
    g.rect(terX, terY, terW, 1).fill({ color: COL_GOLD_DK, alpha: 0.25 });

    // Shadow-bloom plants (dark purple with glowing tips)
    const plantCount = 5;
    for (let i = 0; i < plantCount; i++) {
      const px = terX + 2 + i * 3.2;
      const sway = Math.sin(time * PLANT_SWAY_SPEED + i * 1.1) * 2;
      const stemH = 7 + (i % 2) * 3;
      const glow = (Math.sin(time * 2.5 + i * 0.9) + 1) / 2;

      // Dark stem
      g.moveTo(px, terY)
        .lineTo(px + sway, terY - stemH)
        .stroke({ color: COL_SHADOW_PLANT_DK, width: 1.2 });

      // Glowing shadow-bloom at tip
      g.circle(px + sway, terY - stemH, 2.2).fill({
        color: COL_SHADOW_BLOOM,
        alpha: 0.5 + glow * 0.5,
      });
      g.circle(px + sway, terY - stemH, 1).fill({
        color: 0xffffff,
        alpha: 0.2 + glow * 0.3,
      });
      // Outer glow aura
      g.circle(px + sway, terY - stemH, 3.5).fill({
        color: COL_SHADOW_PLANT,
        alpha: 0.1 + glow * 0.1,
      });
    }
  }

  // ── Owl Familiar (dark plumage, glowing eyes) ───────────────────────────

  private _updateOwl(time: number): void {
    const g = this._owl;
    g.clear();

    // Owl body (dark plumage)
    g.ellipse(0, 0, 5, 6).fill({ color: COL_OWL });
    // Belly
    g.ellipse(0, 2, 3.5, 4).fill({ color: COL_OWL_BELLY });

    // Head
    g.circle(0, -6, 4).fill({ color: COL_OWL });
    // Ear tufts (more angular, shadow owl)
    g.moveTo(-3, -9)
      .lineTo(-5, -14)
      .lineTo(-1, -10)
      .closePath()
      .fill({ color: COL_OWL });
    g.moveTo(3, -9)
      .lineTo(5, -14)
      .lineTo(1, -10)
      .closePath()
      .fill({ color: COL_OWL });

    // Eyes — blink periodically (glowing purple)
    const blinkCycle = this._owlTimer % OWL_BLINK_INTERVAL;
    const isBlinking = blinkCycle > OWL_BLINK_INTERVAL - OWL_BLINK_DURATION;
    const eyeGlow = (Math.sin(time * 2) + 1) / 2;

    if (isBlinking) {
      g.moveTo(-3.5, -6)
        .lineTo(-0.5, -6)
        .stroke({ color: COL_OWL_EYE, width: 0.8, alpha: 0.5 });
      g.moveTo(0.5, -6)
        .lineTo(3.5, -6)
        .stroke({ color: COL_OWL_EYE, width: 0.8, alpha: 0.5 });
    } else {
      // Glowing purple eyes
      g.circle(-2, -6, 2.2).fill({
        color: COL_OWL_EYE,
        alpha: 0.7 + eyeGlow * 0.3,
      });
      g.circle(2, -6, 2.2).fill({
        color: COL_OWL_EYE,
        alpha: 0.7 + eyeGlow * 0.3,
      });
      // Bright pupil cores
      g.circle(-2, -6, 1).fill({
        color: 0xffffff,
        alpha: 0.5 + eyeGlow * 0.3,
      });
      g.circle(2, -6, 1).fill({
        color: 0xffffff,
        alpha: 0.5 + eyeGlow * 0.3,
      });
      // Eye glow aura
      g.circle(-2, -6, 3).fill({
        color: COL_OWL_EYE,
        alpha: 0.1 + eyeGlow * 0.08,
      });
      g.circle(2, -6, 3).fill({
        color: COL_OWL_EYE,
        alpha: 0.1 + eyeGlow * 0.08,
      });
    }

    // Beak
    g.moveTo(-1, -4.5)
      .lineTo(0, -3)
      .lineTo(1, -4.5)
      .closePath()
      .fill({ color: 0x665544 });

    // Feet/talons
    g.moveTo(-3, 5).lineTo(-4, 8).stroke({ color: 0x443344, width: 1 });
    g.moveTo(-3, 5).lineTo(-2, 8).stroke({ color: 0x443344, width: 1 });
    g.moveTo(3, 5).lineTo(2, 8).stroke({ color: 0x443344, width: 1 });
    g.moveTo(3, 5).lineTo(4, 8).stroke({ color: 0x443344, width: 1 });

    // Subtle body sway (breathing)
    const breathe = Math.sin(time * 1.5) * 0.5;
    this._owl.scale.set(1, 1 + breathe * 0.03);
  }

  // ── Dark Cloud Vortex ────────────────────────────────────────────────────

  private _updateClouds(time: number): void {
    const g = this._clouds;
    g.clear();

    const cx = TW / 2;
    const cy = -10;
    const spin = time * CLOUD_SPEED;

    // Dark swirling cloud wisps around the crystal apex (more and denser)
    for (let i = 0; i < 7; i++) {
      const a = spin + (i / 7) * Math.PI * 2;
      const r = 18 + i * 3;
      const cloudX = cx + Math.cos(a) * r;
      const cloudY = cy + Math.sin(a) * r * 0.3;
      const size = 7 + Math.sin(time * 0.9 + i) * 2.5;
      const alpha = 0.14 + Math.sin(time + i * 1.3) * 0.07;

      g.ellipse(cloudX, cloudY, size, size * 0.5).fill({
        color: COL_CLOUD_DK,
        alpha,
      });
    }

    // Mid-layer wisps
    for (let i = 0; i < 5; i++) {
      const a = -spin * 0.8 + (i / 5) * Math.PI * 2;
      const r = 12 + i * 3;
      const cloudX = cx + Math.cos(a) * r;
      const cloudY = cy + Math.sin(a) * r * 0.3;
      const alpha = 0.1 + Math.sin(time * 1.1 + i * 1.8) * 0.06;

      g.ellipse(cloudX, cloudY, 5, 2.5).fill({ color: COL_CLOUD, alpha });
    }

    // Inner bright/purple wisps (closer to crystal)
    for (let i = 0; i < 4; i++) {
      const a = -spin * 1.6 + (i / 4) * Math.PI * 2;
      const r = 7 + i * 2;
      const cloudX = cx + Math.cos(a) * r;
      const cloudY = cy + Math.sin(a) * r * 0.25;
      const alpha = 0.08 + Math.sin(time * 1.3 + i * 2.2) * 0.05;

      g.ellipse(cloudX, cloudY, 4, 1.8).fill({ color: COL_CLOUD_LT, alpha });
    }
  }

  // ── Portal Glow ──────────────────────────────────────────────────────────

  private _updatePortal(time: number): void {
    const g = this._portal;
    g.clear();

    const cx = TW / 2;
    const portalW = 20;
    const portalH = 26;
    const portalY = TH - 12 - portalH - 4 + 8;

    const pulse = (Math.sin(time * PORTAL_PULSE_SPEED) + 1) / 2;
    const alpha = 0.35 + pulse * 0.4;

    // Purple glow fill inside the portal arch
    g.rect(cx - portalW / 2 + 1, portalY + 2, portalW - 2, portalH - 2).fill({
      color: COL_PORTAL_PURPLE,
      alpha: alpha * 0.35,
    });
    g.ellipse(cx, portalY + 2, portalW / 2 - 1, 6).fill({
      color: COL_PORTAL_PURPLE,
      alpha: alpha * 0.35,
    });

    // Swirling energy inside portal
    const swirl1 = time * 2.5;
    for (let i = 0; i < 3; i++) {
      const sa = swirl1 + (i * Math.PI * 2) / 3;
      const sx = cx + Math.cos(sa) * 5;
      const sy = portalY + portalH * 0.4 + Math.sin(sa) * 4;
      g.circle(sx, sy, 2).fill({
        color: COL_ELDRITCH_LT,
        alpha: alpha * 0.2,
      });
    }

    // Rim glow (tinted by owner color)
    g.moveTo(cx - portalW / 2, TH - 12)
      .lineTo(cx - portalW / 2, portalY + 4)
      .quadraticCurveTo(cx, portalY - 10, cx + portalW / 2, portalY + 4)
      .lineTo(cx + portalW / 2, TH - 12)
      .stroke({ color: this._playerColor, width: 2, alpha: alpha * 0.7 });

    // Secondary outer glow rim (purple)
    g.moveTo(cx - portalW / 2 - 2, TH - 12)
      .lineTo(cx - portalW / 2 - 2, portalY + 6)
      .quadraticCurveTo(cx, portalY - 12, cx + portalW / 2 + 2, portalY + 6)
      .lineTo(cx + portalW / 2 + 2, TH - 12)
      .stroke({ color: COL_PORTAL_PURPLE, width: 1, alpha: alpha * 0.3 });

    // Central bright vertical line (energy pillar)
    g.moveTo(cx, TH - 14)
      .lineTo(cx, portalY + 6)
      .stroke({ color: COL_ELDRITCH_LT, width: 1.2, alpha: alpha * 0.35 });

    // Sparks drifting upward from portal
    for (let i = 0; i < 3; i++) {
      const sparkPhase = (time * 1.5 + i * 1.3) % 2.0;
      const sparkY = portalY + portalH * 0.3 - sparkPhase * 10;
      const sparkX = cx + Math.sin(time * 3 + i * 2) * 4;
      const sparkAlpha = Math.max(0, 1 - sparkPhase) * alpha * 0.4;
      g.circle(sparkX, sparkY, 0.8).fill({
        color: 0xffffff,
        alpha: sparkAlpha,
      });
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
