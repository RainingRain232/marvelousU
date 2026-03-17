import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  PlayerClass, Formation, TeamInstruction, FacilityType, TrainingType,
  Injury, PlayerDef, TEAM_DEFS, FACILITY_UPGRADES, RULES_TEXT,
} from "./GrailManagerConfig";
import type { TeamDef } from "./GrailManagerConfig";
import {
  GMScreen, MatchPhase, GrailManagerState,
  getOverall, getPlayerFullName, hasSave,
} from "./GrailManagerState";

const PARCHMENT = 0xd4c5a9, PARCHMENT_DARK = 0x8b7d5e;
const GOLD = 0xffd700, GOLD_DARK = 0xb8860b;
const DARK_WOOD = 0x3e2723, DARK_BG = 0x1a1410;
const RED_ACCENT = 0x8b0000, GREEN_GOOD = 0x2e7d32, BLUE_INFO = 0x1565c0;
const WHITE = 0xffffff, CELTIC_GREEN = 0x2d5016, PANEL_ALPHA = 0.92;
const BURGUNDY = 0x6b0f2e, FOREST_GREEN = 0x1b4332;
const FONT = "'Palatino Linotype', 'Book Antiqua', Georgia, serif";
const FONT_MONO = "'Courier New', Courier, monospace";

function hexToRGB(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}
function lerpColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = hexToRGB(a), [br, bg, bb] = hexToRGB(b);
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
function seededRng(seed: number, offset: number): number {
  return ((seed * 9301 + offset * 49297) % 233280) / 233280;
}

interface DustMote { x: number; y: number; vx: number; vy: number; size: number; alpha: number; life: number; }
const _dustMotes: DustMote[] = [];
function updateAndDrawDust(g: Graphics, sw: number, sh: number, dt: number): void {
  while (_dustMotes.length < 30) _dustMotes.push({
    x: Math.random() * sw, y: Math.random() * sh,
    vx: (Math.random() - 0.5) * 0.3, vy: -0.1 - Math.random() * 0.2,
    size: 1 + Math.random() * 2, alpha: 0.15 + Math.random() * 0.25, life: Math.random() * 400,
  });
  for (const m of _dustMotes) {
    m.x += m.vx * dt * 30; m.y += m.vy * dt * 30; m.life += dt;
    g.fill({ color: PARCHMENT, alpha: m.alpha * (0.5 + Math.sin(m.life * 2) * 0.5) }).circle(m.x, m.y, m.size).fill();
    if (m.y < -10 || m.x < -10 || m.x > sw + 10) { m.x = Math.random() * sw; m.y = sh + 5; m.life = 0; }
  }
}

export class GrailManagerRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _texts: Text[] = [];
  private _time = 0;

  private _hoverZone = "";
  clickZones: { id: string; x: number; y: number; w: number; h: number }[] = [];
  build(): void {
    this.container.addChild(this._gfx);
  }
  update(state: GrailManagerState, sw: number, sh: number, dt: number, mouseX: number, mouseY: number): void {
    this._time += dt;
    const g = this._gfx;
    g.clear();
    for (const t of this._texts) { this.container.removeChild(t); t.destroy(); }
    this._texts.length = 0;
    this.clickZones.length = 0;
    this._drawBackground(g, sw, sh);
    switch (state.screen) {
      case GMScreen.MAIN_MENU:     this._drawMainMenu(g, state, sw, sh); break;
      case GMScreen.NEW_GAME_SETUP: this._drawNewGameSetup(g, state, sw, sh); break;
      case GMScreen.DASHBOARD:     this._drawHeader(g, state, sw, sh); this._drawDashboard(g, state, sw, sh); break;
      case GMScreen.SQUAD:         this._drawHeader(g, state, sw, sh); this._drawSquad(g, state, sw, sh); break;
      case GMScreen.TACTICS:       this._drawHeader(g, state, sw, sh); this._drawTactics(g, state, sw, sh); break;
      case GMScreen.MATCH:         this._drawMatchDay(g, state, sw, sh); break;
      case GMScreen.TRANSFERS:     this._drawHeader(g, state, sw, sh); this._drawTransfers(g, state, sw, sh); break;
      case GMScreen.FACILITIES:    this._drawHeader(g, state, sw, sh); this._drawFacilities(g, state, sw, sh); break;
      case GMScreen.LEAGUE:        this._drawHeader(g, state, sw, sh); this._drawLeague(g, state, sw, sh); break;
      case GMScreen.CUP:           this._drawHeader(g, state, sw, sh); this._drawCup(g, state, sw, sh); break;
      case GMScreen.CALENDAR:      this._drawHeader(g, state, sw, sh); this._drawCalendar(g, state, sw, sh); break;
      case GMScreen.RULES:         this._drawHeader(g, state, sw, sh); this._drawRules(g, state, sw, sh); break;
      case GMScreen.CONTROLS:      this._drawHeader(g, state, sw, sh); this._drawControls(g, state, sw, sh); break;
      case GMScreen.PLAYER_DETAIL: this._drawHeader(g, state, sw, sh); this._drawPlayerDetail(g, state, sw, sh); break;
      case GMScreen.MATCH_RESULT:  this._drawHeader(g, state, sw, sh); this._drawMatchResult(g, state, sw, sh); break;
      case GMScreen.SEASON_END:    this._drawSeasonEnd(g, state, sw, sh); break;
      case GMScreen.SAVE_LOAD:     this._drawHeader(g, state, sw, sh); this._drawSaveLoad(g, state, sw, sh); break;
    }
    updateAndDrawDust(g, sw, sh, dt);
    this._hoverZone = "";
    for (const zone of this.clickZones) {
      if (mouseX >= zone.x && mouseX <= zone.x + zone.w && mouseY >= zone.y && mouseY <= zone.y + zone.h) {
        this._hoverZone = zone.id;
        // Enhanced tactile hover feedback with layered glow
        g.fill({ color: GOLD, alpha: 0.03 }).roundRect(zone.x - 4, zone.y - 4, zone.w + 8, zone.h + 8, 6).fill();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(zone.x - 2, zone.y - 2, zone.w + 4, zone.h + 4, 4).fill();
        g.fill({ color: GOLD, alpha: 0.1 }).roundRect(zone.x, zone.y, zone.w, zone.h, 2).fill();
        // Top-edge highlight for embossed hover feel
        g.fill({ color: WHITE, alpha: 0.04 }).roundRect(zone.x, zone.y, zone.w, zone.h * 0.4, 2).fill();
        g.stroke({ color: GOLD, alpha: 0.35, width: 1.2 }).roundRect(zone.x, zone.y, zone.w, zone.h, 2).stroke();
        g.stroke({ color: GOLD, alpha: 0.1, width: 0.5 }).roundRect(zone.x + 1, zone.y + 1, zone.w - 2, zone.h - 2, 2).stroke();
        break;
      }
    }
  }
  getHoverZone(): string { return this._hoverZone; }
  cleanup(): void {
    for (const t of this._texts) { this.container.removeChild(t); t.destroy(); }
    this._texts.length = 0;
    this._gfx.clear();
  }

  // ---Background — rich parchment with fiber texture, age spots, burned edges, candle glow
  private _drawBackground(g: Graphics, sw: number, sh: number): void {
    g.fill({ color: DARK_BG }).rect(0, 0, sw, sh).fill();
    // Subtle parchment gradient bands with animated shift
    for (let y = 0; y < sh; y += 6) {
      const t = y / sh;
      const wave = Math.sin(t * 14 + this._time * 0.3) * 0.5 + 0.5;
      const c = lerpColor(0x1c1610, 0x28221a, wave);
      g.fill({ color: c, alpha: 0.25 }).rect(0, y, sw, 6).fill();
    }
    // Warm candle light pools at top corners
    g.fill({ color: 0xff8800, alpha: 0.03 }).circle(40, 30, 120).fill();
    g.fill({ color: 0xff8800, alpha: 0.03 }).circle(sw - 40, 30, 120).fill();
    // Paper fiber texture
    const fiberSeed = 42;
    for (let i = 0; i < 60; i++) {
      const fx = seededRng(fiberSeed, i * 3) * sw;
      const fy = seededRng(fiberSeed, i * 3 + 1) * sh;
      const fl = 15 + seededRng(fiberSeed, i * 3 + 2) * 50;
      const angle = seededRng(fiberSeed, i * 7) * Math.PI;
      g.stroke({ color: PARCHMENT, alpha: 0.035, width: 0.5 })
        .moveTo(fx, fy)
        .lineTo(fx + Math.cos(angle) * fl, fy + Math.sin(angle) * fl)
        .stroke();
    }
    // Age spots and stains
    for (let i = 0; i < 16; i++) {
      const ax = seededRng(77, i * 5) * sw;
      const ay = seededRng(77, i * 5 + 1) * sh;
      const ar = 8 + seededRng(77, i * 5 + 2) * 30;
      g.fill({ color: 0x3d2b1f, alpha: 0.05 + seededRng(77, i * 5 + 3) * 0.04 })
        .circle(ax, ay, ar).fill();
    }
    // Water stain ring
    g.stroke({ color: 0x3d2b1f, alpha: 0.03, width: 2 }).circle(sw * 0.7, sh * 0.3, 40).stroke();
    g.stroke({ color: 0x3d2b1f, alpha: 0.02, width: 1.5 }).circle(sw * 0.7, sh * 0.3, 42).stroke();
    // Ink splatter dots
    for (let i = 0; i < 8; i++) {
      const sx = seededRng(99, i * 4) * sw;
      const sy = seededRng(99, i * 4 + 1) * sh;
      const sr = 1.5 + seededRng(99, i * 4 + 2) * 4;
      g.fill({ color: 0x1a0f00, alpha: 0.04 }).circle(sx, sy, sr).fill();
      // Tiny satellite splatters
      for (let j = 0; j < 3; j++) {
        const ox = seededRng(99, i * 4 + j * 10 + 50) * 8 - 4;
        const oy = seededRng(99, i * 4 + j * 10 + 51) * 8 - 4;
        g.fill({ color: 0x1a0f00, alpha: 0.03 }).circle(sx + ox, sy + oy, sr * 0.3).fill();
      }
    }
    // Edge burn / vignette
    const edgeW = 35;
    for (let i = 0; i < edgeW; i++) {
      const a = 0.18 * (1 - i / edgeW);
      g.fill({ color: 0x000000, alpha: a }).rect(0, i, sw, 1).fill();
      g.fill({ color: 0x000000, alpha: a }).rect(0, sh - i - 1, sw, 1).fill();
      g.fill({ color: 0x000000, alpha: a }).rect(i, 0, 1, sh).fill();
      g.fill({ color: 0x000000, alpha: a }).rect(sw - i - 1, 0, 1, sh).fill();
    }
    this._drawCelticCorner(g, 0, 0, 1, 1);
    this._drawCelticCorner(g, sw, 0, -1, 1);
    this._drawCelticCorner(g, 0, sh, 1, -1);
    this._drawCelticCorner(g, sw, sh, -1, -1);
    // Candle flames on both sides
    this._drawCandleFlame(g, 40, 8);
    this._drawCandleFlame(g, sw - 40, 8);
    // Additional side candles for larger screens
    if (sw > 600) {
      this._drawCandleFlame(g, 40, sh * 0.4);
      this._drawCandleFlame(g, sw - 40, sh * 0.4);
    }
  }

  private _drawCandleFlame(g: Graphics, x: number, y: number): void {
    const flicker = Math.sin(this._time * 8) * 2 + Math.sin(this._time * 13) * 1.5;
    const flicker2 = Math.sin(this._time * 11 + x * 0.1) * 1.2;
    const size = 5 + Math.sin(this._time * 6) * 1.5;
    // Ambient glow halo
    g.fill({ color: 0xff6600, alpha: 0.06 }).circle(x, y + 5, size + 20).fill();
    g.fill({ color: 0xff8c00, alpha: 0.12 }).circle(x, y + 3, size + 10).fill();
    // Outer flame
    g.fill({ color: 0xff6600, alpha: 0.3 }).circle(x + flicker2 * 0.3, y + flicker * 0.3, size + 4).fill();
    // Mid flame
    g.fill({ color: 0xff8c00, alpha: 0.45 }).circle(x + flicker2 * 0.2, y + flicker * 0.2, size + 1).fill();
    // Core flame
    g.fill({ color: 0xffcc00, alpha: 0.6 }).circle(x, y + flicker * 0.15, size).fill();
    // Hot center
    g.fill({ color: 0xffffaa, alpha: 0.8 }).circle(x, y, size * 0.4).fill();
    // Candle body
    g.fill({ color: 0xddc890, alpha: 0.6 }).rect(x - 2, y + size + 2, 4, 12).fill();
    g.fill({ color: 0xeeddaa, alpha: 0.3 }).rect(x - 1, y + size + 2, 2, 12).fill();
    // Ember sparks
    for (let i = 0; i < 3; i++) {
      const sparkX = x + Math.sin(this._time * 7 + i * 2.5) * 4;
      const sparkY = y - 3 - Math.abs(Math.sin(this._time * 5 + i * 1.8)) * 8;
      const sparkAlpha = 0.3 + Math.sin(this._time * 9 + i * 3) * 0.2;
      g.fill({ color: 0xffaa44, alpha: sparkAlpha }).circle(sparkX, sparkY, 0.8).fill();
    }
  }

  private _drawCelticCorner(g: Graphics, x: number, y: number, dx: number, dy: number): void {
    const s = 60;
    // Richer background shape
    g.fill({ color: BURGUNDY, alpha: 0.12 });
    g.moveTo(x, y);
    g.lineTo(x + dx * s, y);
    g.lineTo(x + dx * s, y + dy * s * 0.7);
    g.lineTo(x + dx * s * 0.5, y + dy * s);
    g.lineTo(x, y + dy * s * 0.7);
    g.closePath().fill();
    g.fill({ color: GOLD, alpha: 0.03 });
    g.moveTo(x, y);
    g.lineTo(x + dx * s * 0.8, y);
    g.lineTo(x + dx * s * 0.8, y + dy * s * 0.55);
    g.lineTo(x + dx * s * 0.4, y + dy * s * 0.8);
    g.lineTo(x, y + dy * s * 0.55);
    g.closePath().fill();
    // Multi-layered interlacing curves
    for (let i = 0; i < 5; i++) {
      const r = s - i * 10;
      const alpha = 0.35 - i * 0.05;
      // Main arc
      g.stroke({ color: GOLD_DARK, width: 1.5, alpha });
      g.moveTo(x, y + dy * r);
      g.bezierCurveTo(x + dx * r * 0.4, y + dy * r * 0.8, x + dx * r * 0.8, y + dy * r * 0.4, x + dx * r, y);
      g.stroke();
      // Inner parallel arc
      g.stroke({ color: GOLD, width: 0.8, alpha: alpha * 0.5 });
      g.moveTo(x + dx * 3, y + dy * (r - 2));
      g.bezierCurveTo(x + dx * r * 0.42, y + dy * r * 0.76, x + dx * r * 0.76, y + dy * r * 0.42, x + dx * (r - 2), y + dy * 3);
      g.stroke();
      // Cross interlace
      g.stroke({ color: GOLD, width: 1, alpha: alpha * 0.4 });
      g.moveTo(x + dx * 4, y + dy * r);
      g.bezierCurveTo(x + dx * r * 0.5, y + dy * r * 0.5, x + dx * r * 0.5, y + dy * r * 0.5, x + dx * r, y + dy * 4);
      g.stroke();
    }
    // Decorative knot circles at intersections
    g.fill({ color: GOLD, alpha: 0.45 }).circle(x + dx * 6, y + dy * 6, 3.5).fill();
    g.fill({ color: BURGUNDY, alpha: 0.5 }).circle(x + dx * 6, y + dy * 6, 1.8).fill();
    g.fill({ color: GOLD, alpha: 0.25 }).circle(x + dx * 20, y + dy * 20, 2).fill();
    g.fill({ color: GOLD, alpha: 0.2 }).circle(x + dx * 35, y + dy * 10, 1.5).fill();
    g.fill({ color: GOLD, alpha: 0.2 }).circle(x + dx * 10, y + dy * 35, 1.5).fill();
    // Subtle vine tendril
    g.stroke({ color: FOREST_GREEN, alpha: 0.2, width: 1 });
    g.moveTo(x + dx * 8, y + dy * 30);
    g.bezierCurveTo(x + dx * 15, y + dy * 25, x + dx * 20, y + dy * 30, x + dx * 25, y + dy * 20);
    g.stroke();
    g.fill({ color: FOREST_GREEN, alpha: 0.15 }).circle(x + dx * 25, y + dy * 20, 2.5).fill();
  }

  // ---Gold filigree separator line with scrollwork
  private _drawFiligree(g: Graphics, x: number, y: number, w: number): void {
    const cx = x + w / 2;
    // Main line with gradient fade at ends
    g.stroke({ color: GOLD_DARK, width: 1, alpha: 0.5 }).moveTo(x + 10, y).lineTo(x + w - 10, y).stroke();
    g.stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.3 }).moveTo(x, y).lineTo(x + 10, y).stroke();
    g.stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.3 }).moveTo(x + w - 10, y).lineTo(x + w, y).stroke();
    // Central diamond with inner detail
    g.fill({ color: GOLD, alpha: 0.5 });
    g.moveTo(cx, y - 5); g.lineTo(cx + 5, y); g.lineTo(cx, y + 5); g.lineTo(cx - 5, y); g.closePath().fill();
    g.fill({ color: GOLD_DARK, alpha: 0.6 });
    g.moveTo(cx, y - 2.5); g.lineTo(cx + 2.5, y); g.lineTo(cx, y + 2.5); g.lineTo(cx - 2.5, y); g.closePath().fill();
    // Side ornaments
    for (const offset of [-30, -50, 30, 50]) {
      g.fill({ color: GOLD_DARK, alpha: 0.35 }).circle(cx + offset, y, 1.8).fill();
    }
    // Scrollwork curves
    g.stroke({ color: GOLD_DARK, alpha: 0.25, width: 0.8 });
    g.moveTo(cx - 8, y).bezierCurveTo(cx - 15, y - 5, cx - 22, y - 3, cx - 25, y).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.25, width: 0.8 });
    g.moveTo(cx + 8, y).bezierCurveTo(cx + 15, y - 5, cx + 22, y - 3, cx + 25, y).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.8 });
    g.moveTo(cx - 8, y).bezierCurveTo(cx - 15, y + 5, cx - 22, y + 3, cx - 25, y).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.8 });
    g.moveTo(cx + 8, y).bezierCurveTo(cx + 15, y + 5, cx + 22, y + 3, cx + 25, y).stroke();
  }

  // ---Celtic knotwork border around a rect
  private _drawKnotBorder(g: Graphics, x: number, y: number, w: number, h: number): void {
    const step = 24;
    const alpha = 0.2;
    for (let i = x; i < x + w - step; i += step) {
      g.stroke({ color: GOLD_DARK, width: 1, alpha });
      g.moveTo(i, y);
      g.bezierCurveTo(i + step * 0.3, y - 4, i + step * 0.7, y + 4, i + step, y);
      g.stroke();
      g.moveTo(i, y + h);
      g.bezierCurveTo(i + step * 0.3, y + h + 4, i + step * 0.7, y + h - 4, i + step, y + h);
      g.stroke();
    }
    for (let j = y; j < y + h - step; j += step) {
      g.stroke({ color: GOLD_DARK, width: 1, alpha });
      g.moveTo(x, j);
      g.bezierCurveTo(x - 4, j + step * 0.3, x + 4, j + step * 0.7, x, j + step);
      g.stroke();
      g.moveTo(x + w, j);
      g.bezierCurveTo(x + w + 4, j + step * 0.3, x + w - 4, j + step * 0.7, x + w, j + step);
      g.stroke();
    }
  }

  // ---Header / Navigation — leather book tabs with gold highlight, shadow depth, and dividers
  private _drawHeader(g: Graphics, state: GrailManagerState, sw: number, _sh: number): void {
    const hh = 52;
    // Layered header background with gradient warmth
    g.fill({ color: DARK_WOOD, alpha: 0.95 }).rect(0, 0, sw, hh).fill();
    g.fill({ color: BURGUNDY, alpha: 0.08 }).rect(0, 0, sw, hh).fill();
    g.fill({ color: 0xff8800, alpha: 0.02 }).rect(0, 0, sw, hh * 0.4).fill();
    // Bottom shadow line
    g.fill({ color: 0x000000, alpha: 0.15 }).rect(0, hh - 2, sw, 2).fill();
    this._drawFiligree(g, 0, hh, sw);

    const team = state.teams[state.playerTeamId];
    if (team) {
      // Team name with double shadow for prominence
      this._addText(`${team.teamDef.name}`, 14, 0x000000, true, 12, 8);
      this._addText(`${team.teamDef.name}`, 14, 0x000000, true, 11, 7);
      this._addText(`${team.teamDef.name}`, 14, GOLD, true, 10, 6);
      // Gold amount with subtle glow effect
      this._addText(`${state.gold}g`, 12, 0xffd700, false, 10, 28);
      // Divider between info and tabs
      g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.5 }).moveTo(190, 6).lineTo(190, hh - 6).stroke();
      this._addText(`Week ${state.currentWeek} | Season ${state.season}`, 12, PARCHMENT, false, 200, 28);
    }

    const tabs: { label: string; screen: GMScreen; key: string }[] = [
      { label: "1:Home", screen: GMScreen.DASHBOARD, key: "1" },
      { label: "2:Squad", screen: GMScreen.SQUAD, key: "2" },
      { label: "3:Tactics", screen: GMScreen.TACTICS, key: "3" },
      { label: "4:Match", screen: GMScreen.MATCH, key: "4" },
      { label: "5:Transfer", screen: GMScreen.TRANSFERS, key: "5" },
      { label: "6:Facility", screen: GMScreen.FACILITIES, key: "6" },
      { label: "7:League", screen: GMScreen.LEAGUE, key: "7" },
      { label: "8:Cup", screen: GMScreen.CUP, key: "8" },
      { label: "9:Calendar", screen: GMScreen.CALENDAR, key: "9" },
      { label: "0:Rules", screen: GMScreen.RULES, key: "0" },
    ];

    const tabWidth = Math.min(90, (sw - 380) / tabs.length);
    const tabStart = 380;
    for (let i = 0; i < tabs.length; i++) {
      const tx = tabStart + i * tabWidth;
      const active = state.screen === tabs[i].screen;
      const isHover = this._hoverZone === `tab_${tabs[i].screen}`;
      if (active) {
        // Active tab with glow and layered highlight
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(tx - 2, 2, tabWidth, hh - 2, 5).fill();
        g.fill({ color: GOLD_DARK, alpha: 0.35 }).roundRect(tx, 4, tabWidth - 4, hh - 6, 4).fill();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(tx, 4, tabWidth - 4, (hh - 6) * 0.4, 4).fill();
        g.stroke({ color: GOLD, width: 1, alpha: 0.5 }).roundRect(tx, 4, tabWidth - 4, hh - 6, 4).stroke();
        // Active indicator line at bottom
        g.fill({ color: GOLD, alpha: 0.6 }).rect(tx + 4, hh - 3, tabWidth - 12, 2).fill();
      } else if (isHover) {
        g.fill({ color: GOLD_DARK, alpha: 0.18 }).roundRect(tx, 4, tabWidth - 4, hh - 6, 4).fill();
        g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.5 }).roundRect(tx, 4, tabWidth - 4, hh - 6, 4).stroke();
      }
      // Tab divider
      if (i > 0) {
        g.stroke({ color: GOLD_DARK, alpha: 0.1, width: 0.5 }).moveTo(tx, 10).lineTo(tx, hh - 10).stroke();
      }
      const color = active ? GOLD : isHover ? PARCHMENT : PARCHMENT_DARK;
      this._addText(tabs[i].label, 11, color, active, tx + 4, 16);
      this.clickZones.push({ id: `tab_${tabs[i].screen}`, x: tx, y: 0, w: tabWidth, h: hh });
    }
    this._addText("S:Save", 11, PARCHMENT_DARK, false, sw - 60, 16);
    this.clickZones.push({ id: "save_game", x: sw - 65, y: 0, w: 60, h: hh });
  }

  // ---Panel — ornate bordered panels with parchment fill, embossed depth, and corner flourishes
  private _drawPanel(g: Graphics, x: number, y: number, w: number, h: number, title?: string): void {
    // Deep outer shadow for layered depth
    g.fill({ color: 0x000000, alpha: 0.18 }).roundRect(x + 3, y + 3, w, h, 6).fill();
    g.fill({ color: 0x000000, alpha: 0.08 }).roundRect(x + 1, y + 1, w, h, 6).fill();
    // Main panel
    g.fill({ color: DARK_WOOD, alpha: PANEL_ALPHA }).roundRect(x, y, w, h, 6).fill();
    // Richer parchment texture gradient — layered bands
    g.fill({ color: PARCHMENT, alpha: 0.06 }).roundRect(x + 3, y + 3, w - 6, h - 6, 4).fill();
    g.fill({ color: PARCHMENT, alpha: 0.03 }).roundRect(x + 3, y + 3, w * 0.5, h - 6, 4).fill();
    // Horizontal gradient warmth at top
    g.fill({ color: 0xff8800, alpha: 0.02 }).roundRect(x + 3, y + 3, w - 6, h * 0.3, 4).fill();
    // Title bar glow (richer gradient)
    g.fill({ color: BURGUNDY, alpha: 0.07 }).roundRect(x + 3, y + 3, w - 6, 30, 4).fill();
    g.fill({ color: GOLD, alpha: 0.03 }).roundRect(x + 3, y + 3, w - 6, 15, 4).fill();
    // Inner bevel highlight (top-left light)
    g.stroke({ color: PARCHMENT, alpha: 0.1, width: 1 }).moveTo(x + 4, y + h - 4).lineTo(x + 4, y + 4).lineTo(x + w - 4, y + 4).stroke();
    // Inner bevel shadow (bottom-right)
    g.stroke({ color: 0x000000, alpha: 0.12, width: 1 }).moveTo(x + 4, y + h - 4).lineTo(x + w - 4, y + h - 4).lineTo(x + w - 4, y + 4).stroke();
    // Triple border — outer ornate, middle gold, inner subtle
    g.stroke({ color: 0x000000, alpha: 0.2, width: 2 }).roundRect(x - 1, y - 1, w + 2, h + 2, 7).stroke();
    g.stroke({ color: GOLD_DARK, width: 1.5 }).roundRect(x, y, w, h, 6).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.3, width: 0.5 }).roundRect(x + 3, y + 3, w - 6, h - 6, 4).stroke();
    g.stroke({ color: GOLD, alpha: 0.08, width: 0.5 }).roundRect(x + 5, y + 5, w - 10, h - 10, 3).stroke();
    // Corner flourishes
    this._drawCornerFlourish(g, x, y, 1, 1);
    this._drawCornerFlourish(g, x + w, y, -1, 1);
    this._drawCornerFlourish(g, x, y + h, 1, -1);
    this._drawCornerFlourish(g, x + w, y + h, -1, -1);
    this._drawKnotBorder(g, x, y, w, h);
    // Subtle paper/scroll curl shadow at bottom-right corner
    g.fill({ color: 0x000000, alpha: 0.06 });
    g.moveTo(x + w - 20, y + h);
    g.bezierCurveTo(x + w - 12, y + h - 2, x + w - 4, y + h - 8, x + w, y + h - 18);
    g.lineTo(x + w, y + h);
    g.closePath().fill();
    g.stroke({ color: PARCHMENT, alpha: 0.06, width: 0.5 });
    g.moveTo(x + w - 18, y + h);
    g.bezierCurveTo(x + w - 10, y + h - 3, x + w - 5, y + h - 8, x + w, y + h - 16);
    g.stroke();
    // Subtle animated shimmer/gleam on gold border
    const shimmerPos = ((this._time * 0.4) % 1) * (w + h) * 2;
    if (shimmerPos < w) {
      g.fill({ color: GOLD, alpha: 0.08 }).circle(x + shimmerPos, y, 3).fill();
    } else if (shimmerPos < w + h) {
      g.fill({ color: GOLD, alpha: 0.08 }).circle(x + w, y + shimmerPos - w, 3).fill();
    } else if (shimmerPos < w * 2 + h) {
      g.fill({ color: GOLD, alpha: 0.08 }).circle(x + w - (shimmerPos - w - h), y + h, 3).fill();
    } else {
      g.fill({ color: GOLD, alpha: 0.08 }).circle(x, y + h - (shimmerPos - w * 2 - h), 3).fill();
    }
    if (title) {
      g.fill({ color: GOLD_DARK, alpha: 0.22 }).rect(x + 3, y + 3, w - 6, 26).fill();
      g.fill({ color: GOLD, alpha: 0.05 }).rect(x + 3, y + 3, w - 6, 13).fill();
      // Decorative divider below title bar
      g.stroke({ color: GOLD_DARK, alpha: 0.3, width: 0.8 }).moveTo(x + 8, y + 29).lineTo(x + w - 8, y + 29).stroke();
      g.stroke({ color: GOLD, alpha: 0.08, width: 0.5 }).moveTo(x + 8, y + 30).lineTo(x + w - 8, y + 30).stroke();
      this._drawIlluminatedTitle(g, x + 8, y + 4, title);
      // Wax seal on right side of title bar
      if (w > 200) this._drawWaxSeal(g, x + w - 22, y + 3);
    }
  }

  // Small corner flourish for panels
  private _drawCornerFlourish(g: Graphics, x: number, y: number, dx: number, dy: number): void {
    const len = 12;
    // Small curl
    g.stroke({ color: GOLD_DARK, alpha: 0.4, width: 1.2 });
    g.moveTo(x, y + dy * len);
    g.bezierCurveTo(x + dx * 3, y + dy * len * 0.6, x + dx * len * 0.6, y + dy * 3, x + dx * len, y);
    g.stroke();
    // Inner curl
    g.stroke({ color: GOLD, alpha: 0.15, width: 0.6 });
    g.moveTo(x + dx * 1, y + dy * (len - 2));
    g.bezierCurveTo(x + dx * 4, y + dy * len * 0.55, x + dx * len * 0.55, y + dy * 4, x + dx * (len - 2), y + dy * 1);
    g.stroke();
    // Dot at corner
    g.fill({ color: GOLD, alpha: 0.35 }).circle(x + dx * 2, y + dy * 2, 1.5).fill();
  }

  // ---Wax seal decoration
  private _drawWaxSeal(g: Graphics, x: number, y: number): void {
    const r = 10;
    // Wax body with irregular edge
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const wobble = r + Math.sin(angle * 3 + 0.5) * 1.5 + Math.cos(angle * 5) * 0.8;
      if (i === 0) g.moveTo(x + Math.cos(angle) * wobble, y + r + Math.sin(angle) * wobble);
      else g.lineTo(x + Math.cos(angle) * wobble, y + r + Math.sin(angle) * wobble);
    }
    g.closePath();
    g.fill({ color: RED_ACCENT, alpha: 0.7 }).fill();
    // Seal highlight
    g.fill({ color: 0xcc3333, alpha: 0.4 }).circle(x - 2, y + r - 2, r * 0.6).fill();
    // Inner ring
    g.stroke({ color: 0x550000, alpha: 0.5, width: 1 }).circle(x, y + r, r * 0.6).stroke();
    // Cross emblem
    g.stroke({ color: GOLD_DARK, alpha: 0.5, width: 1.5 })
      .moveTo(x, y + r - 4).lineTo(x, y + r + 4).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.5, width: 1.5 })
      .moveTo(x - 4, y + r).lineTo(x + 4, y + r).stroke();
  }

  // ---Illuminated initial letter for panel titles — richer vine and leaf decoration
  private _drawIlluminatedTitle(g: Graphics, x: number, y: number, title: string): void {
    if (title.length === 0) return;
    const initial = title[0];
    const rest = title.substring(1);
    const initSize = 22;
    // Background panel for initial with layered gradient
    g.fill({ color: BURGUNDY, alpha: 0.35 }).roundRect(x - 3, y - 3, initSize + 6, initSize + 6, 3).fill();
    g.fill({ color: GOLD, alpha: 0.08 }).roundRect(x - 3, y - 3, initSize + 6, (initSize + 6) * 0.5, 3).fill();
    g.fill({ color: 0xff6600, alpha: 0.04 }).roundRect(x - 3, y - 3, initSize + 6, initSize + 6, 3).fill();
    // Double frame
    g.stroke({ color: GOLD, alpha: 0.55, width: 1.2 }).roundRect(x - 3, y - 3, initSize + 6, initSize + 6, 3).stroke();
    g.stroke({ color: GOLD, alpha: 0.2, width: 0.5 }).roundRect(x - 1, y - 1, initSize + 2, initSize + 2, 2).stroke();
    // Subtle corner dots on initial frame
    g.fill({ color: GOLD, alpha: 0.4 }).circle(x - 3, y - 3, 1.2).fill();
    g.fill({ color: GOLD, alpha: 0.4 }).circle(x + initSize + 3, y - 3, 1.2).fill();
    g.fill({ color: GOLD, alpha: 0.4 }).circle(x - 3, y + initSize + 3, 1.2).fill();
    g.fill({ color: GOLD, alpha: 0.4 }).circle(x + initSize + 3, y + initSize + 3, 1.2).fill();
    // Decorative vine extending from initial
    g.stroke({ color: FOREST_GREEN, alpha: 0.35, width: 1.2 });
    g.moveTo(x + initSize + 2, y + 6);
    g.bezierCurveTo(x + initSize + 10, y + 1, x + initSize + 16, y + 8, x + initSize + 10, y + 16);
    g.stroke();
    // Second vine tendril
    g.stroke({ color: FOREST_GREEN, alpha: 0.25, width: 0.8 });
    g.moveTo(x + initSize + 10, y + 10);
    g.bezierCurveTo(x + initSize + 18, y + 6, x + initSize + 22, y + 12, x + initSize + 18, y + 18);
    g.stroke();
    // Third vine — longer, more elegant
    g.stroke({ color: FOREST_GREEN, alpha: 0.15, width: 0.6 });
    g.moveTo(x + initSize + 18, y + 14);
    g.bezierCurveTo(x + initSize + 26, y + 10, x + initSize + 32, y + 16, x + initSize + 28, y + 22);
    g.stroke();
    // Leaf decorations (more)
    g.fill({ color: FOREST_GREEN, alpha: 0.25 }).circle(x + initSize + 6, y + 16, 2.5).fill();
    g.fill({ color: FOREST_GREEN, alpha: 0.2 }).circle(x + initSize + 14, y + 4, 2).fill();
    g.fill({ color: FOREST_GREEN, alpha: 0.15 }).circle(x + initSize + 18, y + 18, 1.8).fill();
    g.fill({ color: FOREST_GREEN, alpha: 0.12 }).circle(x + initSize + 26, y + 22, 2).fill();
    // Berry dots
    g.fill({ color: RED_ACCENT, alpha: 0.3 }).circle(x + initSize + 8, y + 3, 1.2).fill();
    g.fill({ color: RED_ACCENT, alpha: 0.25 }).circle(x + initSize + 16, y + 15, 1).fill();
    g.fill({ color: RED_ACCENT, alpha: 0.2 }).circle(x + initSize + 24, y + 10, 1).fill();
    // Drop shadow for initial letter (double shadow for depth)
    this._addText(initial, 17, 0x000000, true, x + 4, y + 2);
    this._addText(initial, 17, 0x000000, true, x + 3, y + 1);
    this._addText(initial, 17, GOLD, true, x + 2, y);
    // Rest of title with letter spacing effect via shadow
    this._addText(rest, 13, 0x000000, true, x + initSize + 9, y + 4);
    this._addText(rest, 13, GOLD, true, x + initSize + 8, y + 3);
  }

  // ---MAIN MENU
  private _drawMainMenu(g: Graphics, _state: GrailManagerState, sw: number, sh: number): void {
    const cx = sw / 2;
    const cy = sh / 2;
    const pulse = Math.sin(this._time * 2) * 0.15 + 0.85;

    // Ornate frame/border around entire menu area
    const frameX = cx - 200, frameY = cy - 210, frameW = 400, frameH = 440;
    g.stroke({ color: GOLD_DARK, alpha: 0.18, width: 2 }).roundRect(frameX - 4, frameY - 4, frameW + 8, frameH + 8, 12).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.12, width: 1 }).roundRect(frameX - 8, frameY - 8, frameW + 16, frameH + 16, 14).stroke();
    g.fill({ color: BURGUNDY, alpha: 0.04 }).roundRect(frameX, frameY, frameW, frameH, 10).fill();
    this._drawKnotBorder(g, frameX, frameY, frameW, frameH);
    this._drawCornerFlourish(g, frameX, frameY, 1, 1);
    this._drawCornerFlourish(g, frameX + frameW, frameY, -1, 1);
    this._drawCornerFlourish(g, frameX, frameY + frameH, 1, -1);
    this._drawCornerFlourish(g, frameX + frameW, frameY + frameH, -1, -1);

    // Radiant background glow
    g.fill({ color: GOLD, alpha: pulse * 0.05 }).circle(cx, cy - 100, 280).fill();
    g.fill({ color: BURGUNDY, alpha: 0.04 }).circle(cx, cy - 100, 220).fill();
    g.fill({ color: GOLD, alpha: pulse * 0.08 }).circle(cx, cy - 120, 180).fill();
    // Decorative circles
    g.stroke({ color: GOLD_DARK, alpha: 0.08, width: 1 }).circle(cx, cy - 100, 200).stroke();
    g.stroke({ color: GOLD_DARK, alpha: 0.06, width: 1 }).circle(cx, cy - 100, 240).stroke();
    // Rotating decorative ring
    const ringAngle = this._time * 0.3;
    for (let i = 0; i < 8; i++) {
      const angle = ringAngle + (i / 8) * Math.PI * 2;
      const rx = cx + Math.cos(angle) * 160;
      const ry = cy - 100 + Math.sin(angle) * 160;
      g.fill({ color: GOLD, alpha: 0.08 }).circle(rx, ry, 4).fill();
    }

    // Dramatic radiant beams emanating from the orb
    for (let i = 0; i < 16; i++) {
      const beamAngle = (i / 16) * Math.PI * 2 + this._time * 0.15;
      const beamLen = 80 + Math.sin(this._time * 1.5 + i * 1.3) * 30;
      const beamAlpha = 0.04 + Math.sin(this._time * 2 + i * 0.8) * 0.025;
      g.stroke({ color: GOLD, alpha: beamAlpha, width: 0.8 })
        .moveTo(cx + Math.cos(beamAngle) * 20, cy - 60 + Math.sin(beamAngle) * 20)
        .lineTo(cx + Math.cos(beamAngle) * beamLen, cy - 60 + Math.sin(beamAngle) * beamLen)
        .stroke();
    }

    // Floating rune/symbol particles around the title text
    const runeSymbols = ["\u2726", "\u2727", "\u2720", "\u2605", "\u2666", "\u2022"];
    for (let i = 0; i < 8; i++) {
      const rx = cx - 160 + seededRng(200, i * 3) * 320;
      const baseY = cy - 190 + seededRng(200, i * 3 + 1) * 60;
      const floatY = baseY + Math.sin(this._time * 1.2 + i * 1.7) * 6;
      const runeAlpha = 0.12 + Math.sin(this._time * 1.8 + i * 2.1) * 0.08;
      const sym = runeSymbols[i % runeSymbols.length];
      this._addText(sym, 8, lerpColor(GOLD, GOLD_DARK, runeAlpha), false, rx, floatY);
    }

    // Title with double shadow
    this._addText("GRAIL BALL", 42, 0x000000, true, cx - 136, cy - 176);
    this._addText("GRAIL BALL", 42, GOLD, true, cx - 140, cy - 180);
    this._addText("MANAGER", 36, 0x000000, true, cx - 101, cy - 126);
    this._addText("MANAGER", 36, GOLD_DARK, true, cx - 105, cy - 130);
    // Enhanced glowing orb (the Grail)
    const orbPulse = Math.sin(this._time * 3) * 3;
    const orbPulse2 = Math.sin(this._time * 2.3) * 2;
    // Outer ethereal glow
    g.fill({ color: GOLD, alpha: 0.06 }).circle(cx, cy - 60, 55 + orbPulse).fill();
    g.fill({ color: GOLD, alpha: 0.12 }).circle(cx, cy - 60, 42 + orbPulse).fill();

    // Chalice/cup silhouette outline around the orb
    g.stroke({ color: GOLD, alpha: 0.18, width: 1.5 });
    g.moveTo(cx - 12, cy - 30);
    g.bezierCurveTo(cx - 18, cy - 38, cx - 20, cy - 50, cx - 16, cy - 62);
    g.bezierCurveTo(cx - 14, cy - 72, cx - 8, cy - 82, cx, cy - 86);
    g.bezierCurveTo(cx + 8, cy - 82, cx + 14, cy - 72, cx + 16, cy - 62);
    g.bezierCurveTo(cx + 20, cy - 50, cx + 18, cy - 38, cx + 12, cy - 30);
    g.stroke();
    // Chalice stem
    g.stroke({ color: GOLD, alpha: 0.14, width: 1.2 })
      .moveTo(cx - 4, cy - 30).lineTo(cx - 4, cy - 22).stroke();
    g.stroke({ color: GOLD, alpha: 0.14, width: 1.2 })
      .moveTo(cx + 4, cy - 30).lineTo(cx + 4, cy - 22).stroke();
    // Chalice base
    g.stroke({ color: GOLD, alpha: 0.14, width: 1.2 })
      .moveTo(cx - 10, cy - 20).lineTo(cx + 10, cy - 20).stroke();
    g.stroke({ color: GOLD, alpha: 0.10, width: 1 })
      .moveTo(cx - 14, cy - 18).lineTo(cx + 14, cy - 18).stroke();

    // Main orb layers
    g.fill({ color: GOLD, alpha: 0.2 }).circle(cx, cy - 60, 34 + orbPulse * 0.5).fill();
    g.fill({ color: 0xffdd55, alpha: 0.35 }).circle(cx, cy - 60, 24 + orbPulse2 * 0.3).fill();
    g.fill({ color: 0xffec8b, alpha: 0.55 }).circle(cx, cy - 60, 16).fill();
    g.fill({ color: WHITE, alpha: 0.75 }).circle(cx, cy - 60, 8).fill();
    // Specular highlight
    g.fill({ color: WHITE, alpha: 0.8 }).circle(cx - 7, cy - 67, 5).fill();
    g.fill({ color: WHITE, alpha: 0.4 }).circle(cx + 4, cy - 55, 3).fill();
    // Orbiting runes
    for (let i = 0; i < 6; i++) {
      const a = this._time * 1.5 + (i / 6) * Math.PI * 2;
      const orx = cx + Math.cos(a) * (30 + orbPulse);
      const ory = cy - 60 + Math.sin(a) * (30 + orbPulse);
      g.fill({ color: GOLD, alpha: 0.25 + Math.sin(this._time * 4 + i) * 0.1 }).circle(orx, ory, 2).fill();
    }
    g.stroke({ color: GOLD, alpha: 0.2, width: 1 }).circle(cx, cy - 60, 30 + orbPulse * 0.5).stroke();
    // Subtitle
    this._addText("A Medieval Fantasy Football Management Game", 14, PARCHMENT, false, cx - 195, cy - 20);
    // Decorative filigree under subtitle
    this._drawFiligree(g, cx - 120, cy - 8, 240);

    const menuItems = [
      { label: "New Game", id: "menu_new", y: cy + 30 },
      { label: "Load Game", id: "menu_load", y: cy + 70 },
      { label: "Controls", id: "menu_controls", y: cy + 110 },
      { label: "Rules & Info", id: "menu_rules", y: cy + 150 },
      { label: "Exit", id: "menu_exit", y: cy + 190 },
    ];
    for (const item of menuItems) {
      const bx = cx - 120;
      const bw = 240;
      const bh = 36;
      const isHover = this._hoverZone === item.id;
      // Hover glow aura
      if (isHover) {
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(bx - 6, item.y - 4, bw + 12, bh + 8, 10).fill();
        g.fill({ color: GOLD, alpha: 0.03 }).roundRect(bx - 10, item.y - 6, bw + 20, bh + 12, 14).fill();
      }
      // Button shadow (deeper when hovered)
      g.fill({ color: 0x000000, alpha: isHover ? 0.18 : 0.12 }).roundRect(bx + 2, item.y + 2, bw, bh, 6).fill();
      // Button body with richer gradient
      g.fill({ color: isHover ? GOLD_DARK : DARK_WOOD, alpha: 0.92 }).roundRect(bx, item.y, bw, bh, 6).fill();
      // Top highlight for embossed look (stronger on hover)
      g.fill({ color: isHover ? GOLD : PARCHMENT, alpha: isHover ? 0.15 : 0.05 }).roundRect(bx, item.y, bw, bh * 0.45, 6).fill();
      // Bottom subtle warmth
      g.fill({ color: 0xff6600, alpha: isHover ? 0.04 : 0.01 }).roundRect(bx, item.y + bh * 0.5, bw, bh * 0.5, 6).fill();
      // Inner bevel
      g.stroke({ color: PARCHMENT, alpha: isHover ? 0.12 : 0.06, width: 0.5 }).moveTo(bx + 4, item.y + 2).lineTo(bx + bw - 4, item.y + 2).stroke();
      // Double border
      g.stroke({ color: isHover ? GOLD : GOLD_DARK, width: 1.5 }).roundRect(bx, item.y, bw, bh, 6).stroke();
      if (isHover) {
        g.stroke({ color: GOLD, alpha: 0.2, width: 0.5 }).roundRect(bx + 2, item.y + 2, bw - 4, bh - 4, 4).stroke();
      }
      // Side ornaments (pulse on hover)
      const ornAlpha = isHover ? 0.5 + Math.sin(this._time * 4) * 0.15 : 0.3;
      g.fill({ color: GOLD_DARK, alpha: ornAlpha }).circle(bx + 12, item.y + bh / 2, isHover ? 2.5 : 2).fill();
      g.fill({ color: GOLD_DARK, alpha: ornAlpha }).circle(bx + bw - 12, item.y + bh / 2, isHover ? 2.5 : 2).fill();
      // Decorative dash lines beside ornaments
      g.stroke({ color: GOLD_DARK, alpha: 0.15, width: 0.5 }).moveTo(bx + 18, item.y + bh / 2).lineTo(bx + 30, item.y + bh / 2).stroke();
      g.stroke({ color: GOLD_DARK, alpha: 0.15, width: 0.5 }).moveTo(bx + bw - 30, item.y + bh / 2).lineTo(bx + bw - 18, item.y + bh / 2).stroke();
      // Text with double shadow for depth
      this._addText(item.label, 16, 0x000000, true, bx + bw / 2 - item.label.length * 4.5 + 1, item.y + 9);
      this._addText(item.label, 16, isHover ? GOLD : PARCHMENT, true, bx + bw / 2 - item.label.length * 4.5, item.y + 8);
      this.clickZones.push({ id: item.id, x: bx, y: item.y, w: bw, h: bh });
    }
    if (hasSave(0)) {
      this._addText("(Save data found)", 11, GREEN_GOOD, false, cx - 55, cy + 105);
    }
    this._addText("Press N for New Game, L for Load, C for Controls, R for Rules, Esc to Exit", 11, PARCHMENT_DARK, false, cx - 255, sh - 40);
  }

  // ---NEW GAME SETUP
  private _drawNewGameSetup(g: Graphics, _state: GrailManagerState, sw: number, _sh: number): void {
    this._addText("Choose Your Club", 28, GOLD, true, sw / 2 - 120, 30);
    this._addText("Press 1-8 to select a team, Esc to go back", 12, PARCHMENT, false, sw / 2 - 160, 65);

    const startY = 90;
    const cardW = Math.min(280, (sw - 60) / 2 - 10);
    const cardH = 100;
    for (let i = 0; i < TEAM_DEFS.length; i++) {
      const def = TEAM_DEFS[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 20 + col * (cardW + 20);
      const y = startY + row * (cardH + 10);
      this._drawPanel(g, x, y, cardW, cardH);
      this._drawMiniCrest(g, x + 12, y + 20, def.color1, def.color2, def.crestColor);
      this._addText(`${i + 1}. ${def.name}`, 14, GOLD, true, x + 50, y + 8);
      this._addText(def.motto, 10, PARCHMENT, false, x + 50, y + 26);
      this._addText(`Style: ${def.style} | Rep: ${def.reputation}`, 10, PARCHMENT_DARK, false, x + 50, y + 42);
      this._addText(`Budget: ${def.budget}g | Wage Cap: ${def.wageBudget}g/wk`, 10, PARCHMENT_DARK, false, x + 50, y + 56);
      this._addText(`Stadium: ${def.stadiumCapacity} seats`, 10, PARCHMENT_DARK, false, x + 50, y + 70);
      this.clickZones.push({ id: `team_${i}`, x, y, w: cardW, h: cardH });
    }
  }

  // ---DASHBOARD
  private _drawDashboard(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    const lw = Math.min(350, sw * 0.45);
    this._drawPanel(g, 10, top, lw, 160, "Club Overview");
    this._drawMiniCrest(g, 24, top + 38, team.teamDef.color1, team.teamDef.color2, team.teamDef.crestColor);
    // Mini crest decoration beside club name
    this._drawMiniCrest(g, 48, top + 34, team.teamDef.color1, team.teamDef.color2, team.teamDef.crestColor);
    this._addText(team.teamDef.name, 16, GOLD, true, 75, top + 34);
    this._addText(`Manager: ${state.managerName}`, 11, PARCHMENT, false, 75, top + 54);
    this._addText(`Gold: ${state.gold}`, 11, 0xffd700, false, 75, top + 70);
    // Decorative divider between gold info and details
    g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.6 }).moveTo(25, top + 84).lineTo(lw - 10, top + 84).stroke();
    this._addText(`Income/Match: ${state.weeklyIncome}g | Wages: ${state.weeklyExpenses}g/wk`, 10, PARCHMENT_DARK, false, 25, top + 88);
    this._addText(`Formation: ${team.formation} | Style: ${team.instruction}`, 10, PARCHMENT_DARK, false, 25, top + 104);
    this._addText(`Squad: ${team.squad.length} players`, 10, PARCHMENT_DARK, false, 25, top + 120);
    this._addText(`Training: ${team.trainingType}`, 10, PARCHMENT_DARK, false, 25, top + 136);

    // Decorative divider between panels
    this._drawFiligree(g, 20, top + 163, lw - 20);

    const leaguePos = state.leagueTable.findIndex(e => e.teamId === state.playerTeamId) + 1;
    this._drawPanel(g, 10, top + 170, lw, 60, "League Standing");
    this._addText(`Position: ${leaguePos || "?"}${leaguePos === 1 ? "st" : leaguePos === 2 ? "nd" : leaguePos === 3 ? "rd" : "th"}`, 14, leaguePos <= 2 ? GREEN_GOOD : WHITE, true, 20, top + 198);
    const entry = state.leagueTable.find(e => e.teamId === state.playerTeamId);
    if (entry) {
      this._addText(`P:${entry.played} W:${entry.won} D:${entry.drawn} L:${entry.lost} Pts:${entry.points}`, 11, PARCHMENT, false, 20, top + 216);
    }

    // Decorative divider between panels
    this._drawFiligree(g, 20, top + 234, lw - 20);

    this._drawPanel(g, 10, top + 240, lw, 80, "Next Match");
    const nextFixture = state.fixtures.find(f => !f.played &&
      (f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId));
    if (nextFixture) {
      const oppId = nextFixture.homeTeamId === state.playerTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId;
      const opp = state.teams[oppId];
      const isHome = nextFixture.homeTeamId === state.playerTeamId;
      this._addText(`Week ${nextFixture.week}: ${isHome ? "HOME" : "AWAY"}`, 11, isHome ? GREEN_GOOD : RED_ACCENT, true, 20, top + 268);
      if (opp) {
        this._drawMiniCrest(g, 20, top + 284, opp.teamDef.color1, opp.teamDef.color2, opp.teamDef.crestColor);
        this._addText(`vs ${opp.teamDef.name}`, 13, WHITE, true, 46, top + 286);
        // Opponent form indicators (W/L mini dots)
        const oppEntry = state.leagueTable.find(e => e.teamId === oppId);
        if (oppEntry && oppEntry.form.length > 0) {
          for (let fi = 0; fi < oppEntry.form.length; fi++) {
            const formColor = oppEntry.form[fi] === "W" ? GREEN_GOOD : oppEntry.form[fi] === "L" ? RED_ACCENT : 0xcccc00;
            g.fill({ color: formColor, alpha: 0.8 }).circle(lw - 20 - (oppEntry.form.length - fi - 1) * 12, top + 292, 4).fill();
            this._addText(oppEntry.form[fi], 6, WHITE, true, lw - 23 - (oppEntry.form.length - fi - 1) * 12, top + 288);
          }
        }
      }
      this._addText("Press Enter or click 'Advance Week' to proceed", 10, PARCHMENT_DARK, false, 20, top + 304);
    } else {
      this._addText("No upcoming matches", 12, PARCHMENT_DARK, false, 20, top + 270);
    }
    const btnX = 10, btnY = top + 330, btnW = lw, btnH = 36;
    const advHover = this._hoverZone === "advance_week";
    // Animated heartbeat/pulse on the Advance Week button
    const advPulse = 1 + Math.sin(this._time * 3.5) * 0.02;
    const advGlow = 0.06 + Math.sin(this._time * 3.5) * 0.04;
    g.fill({ color: GOLD, alpha: advGlow }).roundRect(btnX - 3, btnY - 3, btnW + 6, btnH + 6, 7).fill();
    g.fill({ color: advHover ? GREEN_GOOD : CELTIC_GREEN, alpha: 0.9 }).roundRect(btnX, btnY, btnW, btnH, 5).fill();
    if (advHover) g.fill({ color: WHITE, alpha: 0.06 }).roundRect(btnX, btnY, btnW, btnH * 0.5, 5).fill();
    // Top highlight bevel
    g.fill({ color: WHITE, alpha: 0.06 }).roundRect(btnX + 2, btnY + 1, btnW - 4, btnH * 0.35, 4).fill();
    g.stroke({ color: GOLD_DARK, width: 1.5 }).roundRect(btnX, btnY, btnW, btnH, 5).stroke();
    g.stroke({ color: GOLD, alpha: 0.15 * advPulse, width: 0.5 }).roundRect(btnX + 2, btnY + 2, btnW - 4, btnH - 4, 3).stroke();
    this._addText("Advance Week (Enter)", 14, WHITE, true, btnX + btnW / 2 - 80, btnY + 9);
    this.clickZones.push({ id: "advance_week", x: btnX, y: btnY, w: btnW, h: btnH });
    const rx = lw + 30;
    const rw = sw - rx - 15;
    this._drawPanel(g, rx, top, rw, sh - top - 20, "News & Events");

    const newsY = top + 32;
    const visibleNews = state.news.slice(-Math.floor((sh - top - 60) / 20));
    for (let i = 0; i < visibleNews.length; i++) {
      const n = visibleNews[i];
      const color = n.type === "transfer" ? BLUE_INFO : n.type === "injury" ? RED_ACCENT :
                    n.type === "achievement" ? GOLD : n.type === "youth" ? GREEN_GOOD : PARCHMENT;
      this._addText(`[Wk${n.week}] ${n.text}`, 10, color, false, rx + 10, newsY + i * 18);
    }
  }

  // ---SQUAD
  private _drawSquad(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    const team = state.teams[state.playerTeamId];
    if (!team) return;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Squad");

    const headerY = top + 30;
    const cols = [
      { label: "#", x: 20, w: 25 }, { label: "Name", x: 50, w: 150 },
      { label: "Class", x: 200, w: 80 }, { label: "Age", x: 280, w: 35 },
      { label: "OVR", x: 320, w: 35 }, { label: "ATK", x: 360, w: 35 },
      { label: "DEF", x: 395, w: 35 }, { label: "SPD", x: 430, w: 35 },
      { label: "MAG", x: 465, w: 35 }, { label: "STA", x: 500, w: 35 },
      { label: "MOR", x: 535, w: 35 }, { label: "Form", x: 575, w: 40 },
      { label: "Status", x: 620, w: 80 }, { label: "Wage", x: 705, w: 50 },
    ];
    for (const col of cols) this._addText(col.label, 10, GOLD, true, col.x, headerY);
    this._drawFiligree(g, 20, headerY + 16, sw - 50);

    const sorted = [...team.squad].sort((a, b) => {
      const classOrder: Record<string, number> = { Gatekeeper: 0, Knight: 1, Rogue: 2, Mage: 3 };
      const ca = classOrder[a.class] ?? 4;
      const cb = classOrder[b.class] ?? 4;
      if (ca !== cb) return ca - cb;
      return getOverall(b) - getOverall(a);
    });

    const rowH = 18;
    const maxVisible = Math.floor((sh - top - 80) / rowH);
    const startIdx = state.scrollOffset;
    for (let i = 0; i < Math.min(maxVisible, sorted.length - startIdx); i++) {
      const p = sorted[i + startIdx];
      const ry = headerY + 20 + i * rowH;
      const isStarter = team.startingLineup.includes(p.id);
      const isSub = team.substitutes.includes(p.id);
      const isSelected = state.selectedPlayerId === p.id;
      // Decorative row separator every 5 players
      if (i > 0 && i % 5 === 0) {
        g.stroke({ color: GOLD_DARK, alpha: 0.15, width: 0.5 }).moveTo(20, ry - 3).lineTo(sw - 30, ry - 3).stroke();
        g.fill({ color: GOLD_DARK, alpha: 0.1 }).circle(sw / 2, ry - 3, 1.5).fill();
      }

      if (isSelected) {
        // Dramatic gold-bordered highlight for selected row
        g.fill({ color: GOLD_DARK, alpha: 0.25 }).rect(18, ry - 2, sw - 36, rowH).fill();
        g.fill({ color: GOLD, alpha: 0.05 }).rect(18, ry - 2, sw - 36, rowH * 0.5).fill();
        g.stroke({ color: GOLD, alpha: 0.4, width: 1 }).rect(18, ry - 2, sw - 36, rowH).stroke();
        g.stroke({ color: GOLD, alpha: 0.15, width: 0.5 }).rect(19, ry - 1, sw - 38, rowH - 2).stroke();
      } else if (i % 2 === 0) {
        g.fill({ color: PARCHMENT, alpha: 0.03 }).rect(18, ry - 2, sw - 36, rowH).fill();
      }

      const numColor = isStarter ? GREEN_GOOD : isSub ? BLUE_INFO : PARCHMENT_DARK;
      this._addText(`${i + startIdx + 1}`, 9, numColor, isStarter, 20, ry);
      this._addText(getPlayerFullName(p), 10, WHITE, isStarter, 50, ry);

      const classColors: Record<string, number> = {
        Gatekeeper: 0x8888ff, Knight: 0xff8844, Rogue: 0x44ff88, Mage: 0xcc44ff,
      };
      // Class-colored dot badge next to class name
      const ccol = classColors[p.class] || WHITE;
      g.fill({ color: ccol, alpha: 0.7 }).circle(197, ry + 5, 3).fill();
      g.stroke({ color: ccol, alpha: 0.3, width: 0.5 }).circle(197, ry + 5, 3).stroke();
      this._addText(p.class, 9, ccol, false, 203, ry);
      this._addText(`${p.age}`, 9, p.age >= 30 ? RED_ACCENT : WHITE, false, 280, ry);

      const ovr = getOverall(p);
      const ovrColor = ovr >= 75 ? GREEN_GOOD : ovr >= 55 ? 0xcccc00 : ovr >= 40 ? 0xff8800 : RED_ACCENT;
      this._addText(`${ovr}`, 9, ovrColor, true, 320, ry);
      // Small star ratings for top-rated players
      if (ovr >= 75) {
        const stars = ovr >= 85 ? 3 : ovr >= 80 ? 2 : 1;
        for (let si = 0; si < stars; si++) {
          this._addText("\u2605", 6, GOLD, false, 340 + si * 8, ry);
        }
      }
      this._addStatText(`${p.stats.attack}`, 360, ry, p.stats.attack);
      this._addStatText(`${p.stats.defense}`, 395, ry, p.stats.defense);
      this._addStatText(`${p.stats.speed}`, 430, ry, p.stats.speed);
      this._addStatText(`${p.stats.magic}`, 465, ry, p.stats.magic);
      this._addStatText(`${p.stats.stamina}`, 500, ry, p.stats.stamina);
      this._addStatText(`${p.stats.morale}`, 535, ry, p.stats.morale);

      const formStr = p.form > 0 ? "+" + p.form : p.form < 0 ? String(p.form) : "=";
      const formColor = p.form > 0 ? GREEN_GOOD : p.form < 0 ? RED_ACCENT : PARCHMENT_DARK;
      this._addText(formStr, 9, formColor, false, 580, ry);
      if (p.injury !== Injury.NONE) {
        this._addText(`${p.injury} (${p.injuryWeeks}w)`, 9, RED_ACCENT, false, 620, ry);
      } else if (isStarter) {
        this._addText("Starting", 9, GREEN_GOOD, false, 620, ry);
      } else if (isSub) {
        this._addText("Sub", 9, BLUE_INFO, false, 620, ry);
      } else {
        this._addText("Reserve", 9, PARCHMENT_DARK, false, 620, ry);
      }
      this._addText(`${p.wage}g`, 9, PARCHMENT, false, 705, ry);
      this.clickZones.push({ id: `player_${p.id}`, x: 18, y: ry - 2, w: sw - 36, h: rowH });
    }
    if (sorted.length > maxVisible) {
      this._addText(`Scroll: Up/Down arrows (${startIdx + 1}-${Math.min(startIdx + maxVisible, sorted.length)} of ${sorted.length})`, 10, PARCHMENT_DARK, false, 20, sh - 25);
    }
  }

  private _addStatText(text: string, x: number, y: number, value: number): void {
    const color = value >= 75 ? GREEN_GOOD : value >= 55 ? 0xcccc00 : value >= 40 ? 0xff8800 : RED_ACCENT;
    this._addText(text, 9, color, false, x, y);
  }

  // ---TACTICS
  private _drawTactics(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    const lw = 200;
    this._drawPanel(g, 10, top, lw, sh - top - 10, "Tactics");
    this._addText("Formation:", 12, GOLD, true, 20, top + 30);
    const formations = Object.values(Formation);
    const tacticsPulse = 0.4 + Math.sin(this._time * 3) * 0.15;
    for (let i = 0; i < formations.length; i++) {
      const fy = top + 50 + i * 24;
      const active = team.formation === formations[i];
      g.fill({ color: active ? GOLD_DARK : DARK_WOOD, alpha: 0.5 }).roundRect(20, fy, lw - 20, 20, 3).fill();
      if (active) {
        // Pulsing gold border for active formation
        g.stroke({ color: GOLD, alpha: tacticsPulse, width: 1.5 }).roundRect(20, fy, lw - 20, 20, 3).stroke();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(20, fy, lw - 20, 10, 3).fill();
      }
      this._addText(`${formations[i]}`, 11, active ? GOLD : PARCHMENT, active, 30, fy + 3);
      this.clickZones.push({ id: `formation_${i}`, x: 20, y: fy, w: lw - 20, h: 20 });
    }

    // Decorative separator between Formation and Instructions
    const sepY1 = top + 50 + formations.length * 24 + 6;
    g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.6 }).moveTo(25, sepY1).lineTo(lw - 10, sepY1).stroke();
    g.fill({ color: GOLD_DARK, alpha: 0.25 }).circle(lw / 2 + 5, sepY1, 2).fill();

    const instY = top + 50 + formations.length * 24 + 20;
    this._addText("Team Instructions:", 12, GOLD, true, 20, instY);
    const instructions = Object.values(TeamInstruction);
    for (let i = 0; i < instructions.length; i++) {
      const iy = instY + 20 + i * 24;
      const active = team.instruction === instructions[i];
      g.fill({ color: active ? GOLD_DARK : DARK_WOOD, alpha: 0.5 }).roundRect(20, iy, lw - 20, 20, 3).fill();
      if (active) {
        g.stroke({ color: GOLD, alpha: tacticsPulse, width: 1.5 }).roundRect(20, iy, lw - 20, 20, 3).stroke();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(20, iy, lw - 20, 10, 3).fill();
      }
      this._addText(`${instructions[i]}`, 11, active ? GOLD : PARCHMENT, active, 30, iy + 3);
      this.clickZones.push({ id: `instruction_${i}`, x: 20, y: iy, w: lw - 20, h: 20 });
    }

    // Decorative separator between Instructions and Training
    const sepY2 = instY + 20 + instructions.length * 24 + 6;
    g.stroke({ color: GOLD_DARK, alpha: 0.2, width: 0.6 }).moveTo(25, sepY2).lineTo(lw - 10, sepY2).stroke();
    g.fill({ color: GOLD_DARK, alpha: 0.25 }).circle(lw / 2 + 5, sepY2, 2).fill();

    const trainY = instY + 20 + instructions.length * 24 + 20;
    this._addText("Training:", 12, GOLD, true, 20, trainY);
    const trainings = Object.values(TrainingType);
    for (let i = 0; i < trainings.length; i++) {
      const ty = trainY + 20 + i * 24;
      const active = team.trainingType === trainings[i];
      g.fill({ color: active ? GREEN_GOOD : DARK_WOOD, alpha: 0.5 }).roundRect(20, ty, lw - 20, 20, 3).fill();
      if (active) {
        g.stroke({ color: GOLD, alpha: tacticsPulse, width: 1.5 }).roundRect(20, ty, lw - 20, 20, 3).stroke();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(20, ty, lw - 20, 10, 3).fill();
      }
      this._addText(`${trainings[i]}`, 11, active ? GOLD : PARCHMENT, active, 30, ty + 3);
      this.clickZones.push({ id: `training_${i}`, x: 20, y: ty, w: lw - 20, h: 20 });
    }
    const pitchX = lw + 30;
    const pitchW = sw - pitchX - 20;
    const pitchH = sh - top - 20;
    this._drawPanel(g, pitchX, top, pitchW, pitchH, "Formation View");

    const px = pitchX + 20, py = top + 40, pw = pitchW - 40, ph = pitchH - 60;
    g.fill({ color: 0x1a5c1a, alpha: 0.8 }).roundRect(px, py, pw, ph, 4).fill();
    g.stroke({ color: 0x2a8c2a, width: 1 }).moveTo(px + pw / 2, py).lineTo(px + pw / 2, py + ph).stroke();
    g.stroke({ color: 0x2a8c2a, width: 1 }).circle(px + pw / 2, py + ph / 2, 40).stroke();
    g.stroke({ color: WHITE, width: 2 }).rect(px, py + ph / 2 - 25, 8, 50).stroke();
    g.stroke({ color: WHITE, width: 2 }).rect(px + pw - 8, py + ph / 2 - 25, 8, 50).stroke();

    const parts = team.formation.split("-").map(Number);
    const lineup = team.startingLineup;
    let pidx = 0;
    if (pidx < lineup.length) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      if (p) this._drawPitchPlayer(g, px + 30, py + ph / 2, p, team.teamDef);
      pidx++;
    }
    for (let i = 0; i < parts[0] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      if (p) this._drawPitchPlayer(g, px + pw * 0.25, py + (ph / (parts[0] + 1)) * (i + 1), p, team.teamDef);
      pidx++;
    }
    for (let i = 0; i < parts[1] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      if (p) this._drawPitchPlayer(g, px + pw * 0.5, py + (ph / (parts[1] + 1)) * (i + 1), p, team.teamDef);
      pidx++;
    }
    for (let i = 0; i < parts[2] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      if (p) this._drawPitchPlayer(g, px + pw * 0.75, py + (ph / (parts[2] + 1)) * (i + 1), p, team.teamDef);
      pidx++;
    }
  }

  private _drawPitchPlayer(g: Graphics, x: number, y: number, player: PlayerDef, teamDef: TeamDef): void {
    // Shadow
    g.fill({ color: 0x000000, alpha: 0.15 }).ellipse(x + 1, y + 2, 15, 10).fill();
    // Outer glow
    g.fill({ color: teamDef.color1, alpha: 0.12 }).circle(x, y, 20).fill();
    // Main body
    g.fill({ color: teamDef.color1 }).circle(x, y, 14).fill();
    // Highlight
    g.fill({ color: WHITE, alpha: 0.12 }).circle(x - 3, y - 3, 8).fill();
    // Border
    g.stroke({ color: teamDef.color2, width: 2 }).circle(x, y, 14).stroke();
    g.stroke({ color: WHITE, alpha: 0.2, width: 0.5 }).circle(x, y, 12).stroke();
    const classIcons: Record<string, string> = { Gatekeeper: "GK", Knight: "KN", Rogue: "RG", Mage: "MG" };
    const classSymbols: Record<string, string> = { Gatekeeper: "\u2666", Knight: "\u2694", Rogue: "\u2666", Mage: "\u2605" };
    // Class icon with shadow
    this._addText(classIcons[player.class] || "?", 8, 0x000000, true, x - 6, y - 4);
    this._addText(classIcons[player.class] || "?", 8, WHITE, true, x - 7, y - 5);
    // Small class-specific symbol beside position
    const sym = classSymbols[player.class] || "\u2022";
    this._addText(sym, 6, GOLD, false, x + 8, y - 12);
    this._addText(player.lastName.substring(0, 8), 7, WHITE, false, x - 20, y + 16);
    // Overall rating badge
    const ovr = getOverall(player);
    const ovrColor = ovr >= 75 ? GREEN_GOOD : ovr >= 55 ? 0xcccc00 : 0xff8800;
    g.fill({ color: DARK_WOOD, alpha: 0.8 }).circle(x + 10, y - 10, 7).fill();
    g.fill({ color: ovrColor, alpha: 0.15 }).circle(x + 10, y - 10, 6).fill();
    g.stroke({ color: GOLD_DARK, alpha: 0.5, width: 0.5 }).circle(x + 10, y - 10, 7).stroke();
    this._addText(`${ovr}`, 6, GOLD, true, x + 6, y - 14);
  }

  // ---MATCH DAY — with animated pitch, ball trail, heat map hints
  private _drawMatchDay(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const match = state.liveMatch;
    if (!match) {
      this._drawHeader(g, state, sw, sh);
      this._drawPanel(g, 10, 62, sw - 20, sh - 72, "Match Day");
      this._addText("No match in progress. Advance the week from the Dashboard.", 14, PARCHMENT, false, 30, 100);
      this._addText("Press 1 to return to Dashboard.", 12, PARCHMENT_DARK, false, 30, 130);
      return;
    }

    const homeTeam = state.teams[match.homeTeamId];
    const awayTeam = state.teams[match.awayTeamId];
    if (!homeTeam || !awayTeam) return;
    g.fill({ color: DARK_WOOD, alpha: 0.95 }).rect(0, 0, sw, 70).fill();
    g.fill({ color: BURGUNDY, alpha: 0.06 }).rect(0, 0, sw, 70).fill();
    this._drawFiligree(g, 0, 70, sw);
    // Team crest badges beside team names in score header
    this._drawMiniCrest(g, 20, 15, homeTeam.teamDef.color1, homeTeam.teamDef.color2, homeTeam.teamDef.crestColor);
    this._addText(homeTeam.teamDef.name, 16, WHITE, true, 55, 10);

    const scoreX = sw / 2;
    // Small crest badges flanking the score
    this._drawMiniCrest(g, scoreX - 70, 18, homeTeam.teamDef.color1, homeTeam.teamDef.color2, homeTeam.teamDef.crestColor);
    this._addText(`${match.homeGoals}`, 32, GOLD, true, scoreX - 40, 10);
    this._addText("-", 32, PARCHMENT, true, scoreX - 6, 10);
    this._addText(`${match.awayGoals}`, 32, GOLD, true, scoreX + 20, 10);
    this._drawMiniCrest(g, scoreX + 48, 18, awayTeam.teamDef.color1, awayTeam.teamDef.color2, awayTeam.teamDef.crestColor);
    this._drawMiniCrest(g, sw - 40, 15, awayTeam.teamDef.color1, awayTeam.teamDef.color2, awayTeam.teamDef.crestColor);
    this._addText(awayTeam.teamDef.name, 16, WHITE, true, sw - 200, 10);

    const phaseText = match.phase === MatchPhase.FIRST_HALF ? "1st Half" :
                      match.phase === MatchPhase.HALF_TIME ? "HALF TIME" :
                      match.phase === MatchPhase.SECOND_HALF ? "2nd Half" :
                      match.phase === MatchPhase.FULL_TIME ? "FULL TIME" : "Pre-Match";
    this._addText(`${match.minute}' | ${phaseText}`, 12, GOLD, true, scoreX - 40, 48);
    this._addText(`Weather: ${match.weather}`, 10, PARCHMENT_DARK, false, 55, 50);

    const pitchW = Math.min(400, sw * 0.45);
    const pitchH = sh - 160;
    const pitchX = 10, pitchY = 80;
    this._drawPanel(g, pitchX, pitchY, pitchW, pitchH);
    const fpx = pitchX + 10, fpy = pitchY + 10, fpw = pitchW - 20, fph = pitchH - 20;
    // Richer grass with detailed stripe alternation
    g.fill({ color: 0x1a5c1a, alpha: 0.8 }).rect(fpx, fpy, fpw, fph).fill();
    const stripeW = fpw / 16;
    for (let i = 0; i < 16; i++) {
      if (i % 2 === 0) g.fill({ color: 0x1f6b1f, alpha: 0.12 }).rect(fpx + i * stripeW, fpy, stripeW, fph).fill();
      else g.fill({ color: 0x165a16, alpha: 0.06 }).rect(fpx + i * stripeW, fpy, stripeW, fph).fill();
    }
    // Subtle grass texture pattern (horizontal lines)
    for (let gy = 0; gy < fph; gy += 6) {
      g.stroke({ color: 0x2a8c2a, alpha: 0.04, width: 0.3 }).moveTo(fpx, fpy + gy).lineTo(fpx + fpw, fpy + gy).stroke();
    }
    // Pitch markings
    g.stroke({ color: 0x3a9c3a, width: 1.5 }).moveTo(fpx + fpw / 2, fpy).lineTo(fpx + fpw / 2, fpy + fph).stroke();
    g.stroke({ color: 0x3a9c3a, width: 1.5 }).circle(fpx + fpw / 2, fpy + fph / 2, 25).stroke();
    g.fill({ color: 0x3a9c3a, alpha: 0.4 }).circle(fpx + fpw / 2, fpy + fph / 2, 3).fill();
    // Goals with depth
    g.fill({ color: 0x114411, alpha: 0.4 }).rect(fpx - 2, fpy + fph / 2 - 22, 8, 44).fill();
    g.stroke({ color: WHITE, width: 2 }).rect(fpx, fpy + fph / 2 - 20, 6, 40).stroke();
    g.fill({ color: 0x114411, alpha: 0.4 }).rect(fpx + fpw - 6, fpy + fph / 2 - 22, 8, 44).fill();
    g.stroke({ color: WHITE, width: 2 }).rect(fpx + fpw - 6, fpy + fph / 2 - 20, 6, 40).stroke();
    // Penalty areas
    g.stroke({ color: 0x3a9c3a, width: 0.8 }).rect(fpx, fpy + fph / 2 - 35, 20, 70).stroke();
    g.stroke({ color: 0x3a9c3a, width: 0.8 }).rect(fpx + fpw - 20, fpy + fph / 2 - 35, 20, 70).stroke();
    // Players with trail effect
    for (const [pid, pos] of Object.entries(match.playerPositions)) {
      const dx = fpx + pos.x * fpw;
      const dy = fpy + pos.y * fph;
      const isHomePlayer = match.homeLineup.includes(pid);
      const teamColor = isHomePlayer ? homeTeam.teamDef.color1 : awayTeam.teamDef.color1;
      const r = pos.hasOrb ? 8 : 5;
      // Shadow
      g.fill({ color: 0x000000, alpha: 0.12 }).ellipse(dx + 1, dy + 2, r + 1, r * 0.6).fill();
      // Glow aura
      g.fill({ color: teamColor, alpha: 0.1 }).circle(dx, dy, r + 10).fill();
      g.fill({ color: teamColor, alpha: 0.06 }).circle(dx, dy, r + 6).fill();
      // Body
      g.fill({ color: teamColor }).circle(dx, dy, r).fill();
      // Highlight
      g.fill({ color: WHITE, alpha: 0.2 }).circle(dx - 1, dy - 1, r * 0.5).fill();
      g.stroke({ color: WHITE, width: 0.8 }).circle(dx, dy, r).stroke();
      if (pos.hasOrb) {
        g.fill({ color: GOLD, alpha: 0.9 }).circle(dx, dy, 3).fill();
        g.fill({ color: WHITE, alpha: 0.5 }).circle(dx - 1, dy - 1, 1.5).fill();
        g.stroke({ color: GOLD, alpha: 0.5, width: 1.5 }).circle(dx, dy, r + 4).stroke();
      }
    }
    // Orb with enhanced glow and sparkle trail
    const orbDx = fpx + match.orbX * fpw;
    const orbDy = fpy + match.orbY * fph;
    const orbGlow = 0.3 + Math.sin(this._time * 4) * 0.15;
    // Animated sparkle/glow trail behind the orb
    for (let ti = 0; ti < 6; ti++) {
      const trailAge = ti * 0.08;
      const trailX = orbDx - Math.cos(this._time * 2 + ti * 0.5) * ti * 3;
      const trailY = orbDy - Math.sin(this._time * 1.5 + ti * 0.7) * ti * 2;
      const trailAlpha = (0.2 - trailAge) * (0.5 + Math.sin(this._time * 6 + ti * 1.3) * 0.3);
      if (trailAlpha > 0) {
        g.fill({ color: GOLD, alpha: trailAlpha }).circle(trailX, trailY, 2 - ti * 0.2).fill();
      }
    }
    g.fill({ color: GOLD, alpha: orbGlow * 0.3 }).circle(orbDx, orbDy, 14).fill();
    g.fill({ color: GOLD, alpha: orbGlow * 0.5 }).circle(orbDx, orbDy, 8).fill();
    g.fill({ color: GOLD, alpha: orbGlow * 0.8 }).circle(orbDx, orbDy, 4).fill();
    g.fill({ color: WHITE, alpha: 0.9 }).circle(orbDx, orbDy, 2).fill();
    // Sparkle ring around orb
    for (let i = 0; i < 6; i++) {
      const sa = this._time * 3 + (i / 6) * Math.PI * 2;
      const sr = 6 + Math.sin(this._time * 5 + i) * 2;
      const sparkAlpha = 0.3 + Math.sin(this._time * 7 + i * 2) * 0.15;
      g.fill({ color: GOLD, alpha: sparkAlpha }).circle(orbDx + Math.cos(sa) * sr, orbDy + Math.sin(sa) * sr, 1).fill();
    }
    const statsY = pitchY + pitchH + 5;
    this._drawPanel(g, pitchX, statsY, pitchW, sh - statsY - 10);
    this._addText(`Possession: ${match.homePossession}% - ${100 - match.homePossession}%`, 10, PARCHMENT, false, pitchX + 10, statsY + 8);
    this._addText(`Shots: ${match.homeShots} - ${match.awayShots}`, 10, PARCHMENT, false, pitchX + 10, statsY + 22);
    this._addText(`On Target: ${match.homeShotsOnTarget} - ${match.awayShotsOnTarget}`, 10, PARCHMENT, false, pitchX + 10, statsY + 36);
    this._addText(`Fouls: ${match.homeFouls} - ${match.awayFouls}`, 10, PARCHMENT, false, pitchX + 10, statsY + 50);
    const commX = pitchX + pitchW + 10;
    const commW = sw - commX - 10;
    this._drawPanel(g, commX, pitchY, commW, sh - pitchY - 10, "Commentary");

    const commStartY = pitchY + 32;
    const lineHeight = 20;
    const maxLines = Math.floor((sh - pitchY - 50) / lineHeight);
    const visibleComm = match.commentary.slice(-maxLines);
    for (let i = 0; i < visibleComm.length; i++) {
      const c = visibleComm[i];
      const cy = commStartY + i * lineHeight;
      const color = c.type === "goal" ? GOLD : c.type === "save" ? BLUE_INFO :
                    c.type === "foul" ? RED_ACCENT : c.type === "injury" ? 0xff4444 :
                    c.type === "spell" ? 0xcc44ff :
                    c.type === "halftime" || c.type === "fulltime" ? GOLD :
                    c.type === "penalty" ? 0xff8800 : c.type === "redCard" ? 0xff0000 : PARCHMENT;
      const prefix = c.type === "goal" ? "GOAL! " : "";
      // Banner-style highlight for goal events
      if (c.type === "goal") {
        g.fill({ color: GOLD_DARK, alpha: 0.2 }).roundRect(commX + 6, cy - 2, commW - 16, 18, 3).fill();
        g.fill({ color: GOLD, alpha: 0.06 }).roundRect(commX + 6, cy - 2, commW - 16, 9, 3).fill();
        g.stroke({ color: GOLD, alpha: 0.3, width: 0.8 }).roundRect(commX + 6, cy - 2, commW - 16, 18, 3).stroke();
        // Small gold ornaments on banner
        g.fill({ color: GOLD, alpha: 0.5 }).circle(commX + 10, cy + 7, 1.5).fill();
        g.fill({ color: GOLD, alpha: 0.5 }).circle(commX + commW - 14, cy + 7, 1.5).fill();
      }
      this._addText(`${c.minute}' ${prefix}${c.text}`, 10, color, c.type === "goal", commX + 10, cy);
    }
    const speedY = sh - 35;
    this._addText("Speed: ", 10, PARCHMENT_DARK, false, commX + 10, speedY);
    const speeds = [1, 3, 10];
    for (let i = 0; i < speeds.length; i++) {
      const sx = commX + 60 + i * 50;
      const active = match.speed === speeds[i];
      g.fill({ color: active ? GOLD_DARK : DARK_WOOD, alpha: 0.7 }).roundRect(sx, speedY - 2, 40, 20, 3).fill();
      this._addText(`x${speeds[i]}`, 10, active ? GOLD : PARCHMENT, active, sx + 10, speedY);
      this.clickZones.push({ id: `speed_${speeds[i]}`, x: sx, y: speedY - 2, w: 40, h: 20 });
    }
    if (match.phase === MatchPhase.FULL_TIME) {
      const btnX = commX + commW / 2 - 80;
      const btnY = speedY - 30;
      g.fill({ color: GREEN_GOOD, alpha: 0.9 }).roundRect(btnX, btnY, 160, 26, 4).fill();
      this._addText("Continue (Enter)", 12, WHITE, true, btnX + 25, btnY + 5);
      this.clickZones.push({ id: "match_continue", x: btnX, y: btnY, w: 160, h: 26 });
    }
  }

  // ---TRANSFERS
  private _drawTransfers(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10,
      state.transferWindowOpen ? "Transfer Market (OPEN)" : "Transfer Market (CLOSED)");
    if (!state.transferWindowOpen) {
      this._addText("The transfer window is currently closed.", 14, RED_ACCENT, false, 30, top + 40);
      this._addText("It reopens at the start of next season.", 12, PARCHMENT_DARK, false, 30, top + 60);
      return;
    }
    this._addText(`Your budget: ${state.gold}g`, 12, GOLD, true, 20, top + 30);
    const headerY = top + 50;
    this._addText("Name", 10, GOLD, true, 20, headerY);
    this._addText("Class", 10, GOLD, true, 180, headerY);
    this._addText("Age", 10, GOLD, true, 250, headerY);
    this._addText("OVR", 10, GOLD, true, 290, headerY);
    this._addText("ATK", 10, GOLD, true, 330, headerY);
    this._addText("DEF", 10, GOLD, true, 365, headerY);
    this._addText("SPD", 10, GOLD, true, 400, headerY);
    this._addText("MAG", 10, GOLD, true, 435, headerY);
    this._addText("From", 10, GOLD, true, 475, headerY);
    this._addText("Price", 10, GOLD, true, 570, headerY);
    this._addText("", 10, GOLD, true, 640, headerY);
    this._drawFiligree(g, 20, headerY + 14, sw - 50);

    const rowH = 20;
    const maxVisible = Math.floor((sh - top - 100) / rowH);
    const startIdx = state.scrollOffset;
    for (let i = 0; i < Math.min(maxVisible, state.transferMarket.length - startIdx); i++) {
      const listing = state.transferMarket[i + startIdx];
      const p = listing.player;
      const ry = headerY + 18 + i * rowH;
      if (i % 2 === 0) g.fill({ color: PARCHMENT, alpha: 0.03 }).rect(18, ry - 2, sw - 36, rowH).fill();
      const canAfford = state.gold >= listing.askingPrice;
      this._addText(getPlayerFullName(p), 9, WHITE, false, 20, ry);
      this._addText(p.class, 9, PARCHMENT, false, 180, ry);
      this._addText(`${p.age}`, 9, PARCHMENT, false, 250, ry);
      this._addText(`${getOverall(p)}`, 9, GOLD, true, 290, ry);
      this._addText(`${p.stats.attack}`, 9, PARCHMENT, false, 330, ry);
      this._addText(`${p.stats.defense}`, 9, PARCHMENT, false, 365, ry);
      this._addText(`${p.stats.speed}`, 9, PARCHMENT, false, 400, ry);
      this._addText(`${p.stats.magic}`, 9, PARCHMENT, false, 435, ry);

      const fromName = listing.fromTeamId === "free_agent" ? "Free Agent" :
        (state.teams[listing.fromTeamId]?.teamDef.shortName ?? listing.fromTeamId);
      this._addText(fromName, 9, PARCHMENT_DARK, false, 475, ry);
      this._addText(`${listing.askingPrice}g`, 9, canAfford ? GREEN_GOOD : RED_ACCENT, false, 570, ry);
      if (canAfford) {
        // Enhanced layered Buy button
        g.fill({ color: 0x000000, alpha: 0.1 }).roundRect(641, ry - 1, 50, 16, 3).fill();
        g.fill({ color: GREEN_GOOD, alpha: 0.85 }).roundRect(640, ry - 2, 50, 16, 3).fill();
        g.fill({ color: WHITE, alpha: 0.08 }).roundRect(640, ry - 2, 50, 8, 3).fill();
        g.stroke({ color: GOLD_DARK, alpha: 0.5, width: 0.8 }).roundRect(640, ry - 2, 50, 16, 3).stroke();
        this._addText("Buy", 9, WHITE, true, 655, ry);
        this.clickZones.push({ id: `buy_${i + startIdx}`, x: 640, y: ry - 2, w: 50, h: 16 });
      }
    }
  }

  // ---FACILITIES
  private _drawFacilities(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Facilities & Upgrades");
    this._addText(`Gold: ${state.gold}`, 12, GOLD, true, 20, top + 30);

    const facilityTypes = Object.values(FacilityType);
    const cardH = 80;
    const cardW = Math.min(360, (sw - 50) / 2);
    for (let i = 0; i < facilityTypes.length; i++) {
      const ft = facilityTypes[i];
      const col = i % 2;
      const row = Math.floor(i / 2);
      const x = 20 + col * (cardW + 10);
      const y = top + 50 + row * (cardH + 10);
      const level = state.facilities[ft];
      this._drawPanel(g, x, y, cardW, cardH);
      this._addText(ft, 12, GOLD, true, x + 10, y + 8);
      for (let l = 0; l < 5; l++) {
        const pipX = x + 10 + l * 18;
        const pipY = y + 28;
        const filled = l < level;
        if (filled) g.fill({ color: GOLD, alpha: 0.15 }).circle(pipX + 6, pipY + 6, 9).fill();
        g.fill({ color: filled ? GOLD : DARK_WOOD, alpha: filled ? 0.9 : 0.4 }).circle(pipX + 6, pipY + 6, 6).fill();
        g.stroke({ color: GOLD_DARK, width: 1 }).circle(pipX + 6, pipY + 6, 6).stroke();
      }
      this._addText(`Level ${level}/5`, 10, PARCHMENT, false, x + 105, y + 28);

      const nextUpgrade = FACILITY_UPGRADES.find(u => u.type === ft && u.level === level + 1);
      if (nextUpgrade) {
        this._addText(`Next: ${nextUpgrade.description}`, 9, PARCHMENT_DARK, false, x + 10, y + 48);
        this._addText(`Cost: ${nextUpgrade.cost}g | ${nextUpgrade.weeksToComplete} weeks`, 9, PARCHMENT_DARK, false, x + 10, y + 62);
        const canAfford = state.gold >= nextUpgrade.cost;
        const building = state.constructions.some(c => c.type === ft);
        if (!building && canAfford) {
          // Enhanced layered Build button
          g.fill({ color: 0x000000, alpha: 0.1 }).roundRect(x + cardW - 69, y + 56, 60, 20, 3).fill();
          g.fill({ color: GREEN_GOOD, alpha: 0.85 }).roundRect(x + cardW - 70, y + 55, 60, 20, 3).fill();
          g.fill({ color: WHITE, alpha: 0.08 }).roundRect(x + cardW - 70, y + 55, 60, 10, 3).fill();
          g.stroke({ color: GOLD_DARK, alpha: 0.5, width: 0.8 }).roundRect(x + cardW - 70, y + 55, 60, 20, 3).stroke();
          this._addText("Build", 10, WHITE, true, x + cardW - 58, y + 57);
          this.clickZones.push({ id: `build_${ft}`, x: x + cardW - 70, y: y + 55, w: 60, h: 20 });
        } else if (building) {
          const construction = state.constructions.find(c => c.type === ft);
          this._addText(`Building... (${construction?.weeksRemaining}w)`, 10, BLUE_INFO, false, x + cardW - 120, y + 57);
        }
      } else if (level >= 5) {
        this._addText("MAX LEVEL", 10, GOLD, true, x + 10, y + 55);
      }
    }
  }

  // ---LEAGUE TABLE — ornate gold separators, color-coded rows
  private _drawLeague(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Grail Ball League");

    const headerY = top + 30;
    const colX = { pos: 20, crest: 40, name: 70, p: 230, w: 270, d: 305, l: 340, gf: 375, ga: 415, gd: 455, pts: 500, form: 545 };
    this._addText("#", 10, GOLD, true, colX.pos, headerY);
    this._addText("Team", 10, GOLD, true, colX.name, headerY);
    this._addText("P", 10, GOLD, true, colX.p, headerY);
    this._addText("W", 10, GOLD, true, colX.w, headerY);
    this._addText("D", 10, GOLD, true, colX.d, headerY);
    this._addText("L", 10, GOLD, true, colX.l, headerY);
    this._addText("GF", 10, GOLD, true, colX.gf, headerY);
    this._addText("GA", 10, GOLD, true, colX.ga, headerY);
    this._addText("GD", 10, GOLD, true, colX.gd, headerY);
    this._addText("Pts", 10, GOLD, true, colX.pts, headerY);
    this._addText("Form", 10, GOLD, true, colX.form, headerY);
    this._drawFiligree(g, 20, headerY + 16, sw - 50);
    for (let i = 0; i < state.leagueTable.length; i++) {
      const entry = state.leagueTable[i];
      const team = state.teams[entry.teamId];
      if (!team) continue;

      const ry = headerY + 22 + i * 28;
      const isPlayer = entry.teamId === state.playerTeamId;
      if (isPlayer) g.fill({ color: GOLD_DARK, alpha: 0.15 }).rect(18, ry - 4, sw - 36, 26).fill();
      if (i < 2) g.fill({ color: GREEN_GOOD, alpha: 0.05 }).rect(18, ry - 4, sw - 36, 26).fill();
      if (i > 0) {
        g.stroke({ color: GOLD_DARK, alpha: 0.12, width: 0.5 }).moveTo(20, ry - 5).lineTo(sw - 30, ry - 5).stroke();
      }

      const posColor = i === 0 ? GOLD : i < 2 ? GREEN_GOOD : WHITE;
      this._addText(`${i + 1}`, 11, posColor, i === 0, colX.pos, ry);
      this._drawMiniCrest(g, colX.crest, ry - 2, team.teamDef.color1, team.teamDef.color2, team.teamDef.crestColor);
      this._addText(team.teamDef.name, 11, isPlayer ? GOLD : WHITE, isPlayer, colX.name, ry);
      this._addText(`${entry.played}`, 10, PARCHMENT, false, colX.p, ry);
      this._addText(`${entry.won}`, 10, PARCHMENT, false, colX.w, ry);
      this._addText(`${entry.drawn}`, 10, PARCHMENT, false, colX.d, ry);
      this._addText(`${entry.lost}`, 10, PARCHMENT, false, colX.l, ry);
      this._addText(`${entry.goalsFor}`, 10, PARCHMENT, false, colX.gf, ry);
      this._addText(`${entry.goalsAgainst}`, 10, PARCHMENT, false, colX.ga, ry);
      const gd = entry.goalsFor - entry.goalsAgainst;
      this._addText(`${gd >= 0 ? "+" : ""}${gd}`, 10, gd > 0 ? GREEN_GOOD : gd < 0 ? RED_ACCENT : PARCHMENT, false, colX.gd, ry);
      this._addText(`${entry.points}`, 11, GOLD, true, colX.pts, ry);
      for (let f = 0; f < entry.form.length; f++) {
        const fx = colX.form + f * 14;
        const formColor = entry.form[f] === "W" ? GREEN_GOOD : entry.form[f] === "L" ? RED_ACCENT : 0xcccc00;
        g.fill({ color: formColor }).circle(fx + 5, ry + 5, 5).fill();
        this._addText(entry.form[f], 7, WHITE, true, fx + 2, ry + 1);
      }
    }
  }

  // ---CUP
  private _drawCup(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Camelot Cup");

    const rounds = [
      { name: "Quarter-Finals", matches: state.cupMatches.filter(m => m.round === 0) },
      { name: "Semi-Finals", matches: state.cupMatches.filter(m => m.round === 1) },
      { name: "Final", matches: state.cupMatches.filter(m => m.round === 2) },
    ];

    const bracketX = 30;
    const roundWidth = (sw - 80) / 3;
    for (let r = 0; r < rounds.length; r++) {
      const rx = bracketX + r * roundWidth;
      this._addText(rounds[r].name, 12, GOLD, true, rx, top + 30);
      for (let m = 0; m < rounds[r].matches.length; m++) {
        const match = rounds[r].matches[m];
        const my = top + 60 + m * 80 * (r === 0 ? 1 : r === 1 ? 2 : 4);
        g.fill({ color: DARK_WOOD, alpha: 0.6 }).roundRect(rx, my, roundWidth - 20, 50, 4).fill();
        g.stroke({ color: GOLD_DARK, width: 1 }).roundRect(rx, my, roundWidth - 20, 50, 4).stroke();

        const team1Name = match.team1Id ? (state.teams[match.team1Id]?.teamDef.shortName ?? "TBD") : "TBD";
        const team2Name = match.team2Id ? (state.teams[match.team2Id]?.teamDef.shortName ?? "TBD") : "TBD";

        const t1Color = match.winnerId === match.team1Id ? GOLD : match.played && match.winnerId !== match.team1Id ? PARCHMENT_DARK : WHITE;
        const t2Color = match.winnerId === match.team2Id ? GOLD : match.played && match.winnerId !== match.team2Id ? PARCHMENT_DARK : WHITE;
        this._addText(team1Name, 11, t1Color, match.winnerId === match.team1Id, rx + 8, my + 6);
        this._addText(team2Name, 11, t2Color, match.winnerId === match.team2Id, rx + 8, my + 26);
        if (match.played) {
          this._addText(`${match.team1Goals}`, 11, GOLD, false, rx + roundWidth - 50, my + 6);
          this._addText(`${match.team2Goals}`, 11, GOLD, false, rx + roundWidth - 50, my + 26);
        }
        if (r < 2) {
          g.stroke({ color: GOLD_DARK, width: 1, alpha: 0.4 })
            .moveTo(rx + roundWidth - 20, my + 25)
            .lineTo(rx + roundWidth, my + 25)
            .stroke();
        }
      }
    }
  }

  // ---CALENDAR
  private _drawCalendar(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Season Calendar");

    const cellW = Math.max(50, (sw - 60) / 7);
    const cellH = 28;
    const startY = top + 35;
    for (let w = 1; w <= state.seasonConfig.totalWeeks; w++) {
      const col = (w - 1) % 7;
      const row = Math.floor((w - 1) / 7);
      const x = 20 + col * cellW;
      const y = startY + row * cellH;

      const isCurrent = w === state.currentWeek;
      const isPast = w < state.currentWeek;
      const hasMatch = state.fixtures.some(f => f.week === w &&
        (f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId));
      const hasCup = state.seasonConfig.cupRounds.some(cr => cr.week === w);
      let bgColor = DARK_WOOD;
      let alpha = 0.3;
      if (isCurrent) { bgColor = GOLD_DARK; alpha = 0.5; }
      else if (hasMatch) { bgColor = GREEN_GOOD; alpha = 0.3; }
      else if (hasCup) { bgColor = RED_ACCENT; alpha = 0.3; }
      else if (isPast) { bgColor = PARCHMENT_DARK; alpha = 0.15; }
      g.fill({ color: bgColor, alpha }).rect(x, y, cellW - 2, cellH - 2).fill();
      g.stroke({ color: GOLD_DARK, width: 0.5 }).rect(x, y, cellW - 2, cellH - 2).stroke();
      this._addText(`Wk${w}`, 8, isCurrent ? GOLD : PARCHMENT, isCurrent, x + 3, y + 2);
      if (hasMatch) {
        const fixture = state.fixtures.find(f => f.week === w &&
          (f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId));
        if (fixture) {
          const oppId = fixture.homeTeamId === state.playerTeamId ? fixture.awayTeamId : fixture.homeTeamId;
          const opp = state.teams[oppId];
          const isHome = fixture.homeTeamId === state.playerTeamId;
          this._addText(`${isHome ? "H" : "A"}: ${opp?.teamDef.shortName ?? "?"}`, 7, WHITE, false, x + 3, y + 14);
          if (fixture.played) this._addText(`${fixture.homeGoals}-${fixture.awayGoals}`, 7, GOLD, false, x + cellW - 30, y + 14);
        }
      }
      if (hasCup) this._addText("CUP", 7, 0xff4444, true, x + cellW - 28, y + 2);
    }

    const legendY = startY + Math.ceil(state.seasonConfig.totalWeeks / 7) * cellH + 10;
    g.fill({ color: GREEN_GOOD, alpha: 0.3 }).rect(20, legendY, 12, 12).fill();
    this._addText("League Match", 9, PARCHMENT, false, 36, legendY);
    g.fill({ color: RED_ACCENT, alpha: 0.3 }).rect(120, legendY, 12, 12).fill();
    this._addText("Cup Match", 9, PARCHMENT, false, 136, legendY);
    g.fill({ color: GOLD_DARK, alpha: 0.5 }).rect(210, legendY, 12, 12).fill();
    this._addText("Current Week", 9, PARCHMENT, false, 226, legendY);
  }

  // ---RULES
  private _drawRules(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Rules & Information");

    const lines = RULES_TEXT.split("\n");
    const maxLines = Math.floor((sh - top - 60) / 16);
    const startIdx = state.scrollOffset;
    for (let i = 0; i < Math.min(maxLines, lines.length - startIdx); i++) {
      const line = lines[i + startIdx];
      const isTitle = line.includes("=") || line.includes("\u2554") || line.includes("\u255a") || line.includes("\u2551");
      const isHeader = line.trim().endsWith(":") && !line.startsWith(" ");
      this._addText(line, isTitle ? 11 : 10, isTitle ? GOLD : isHeader ? GOLD_DARK : PARCHMENT, isTitle || isHeader, 25, top + 35 + i * 16, FONT_MONO);
    }
    if (lines.length > maxLines) {
      this._addText(`Scroll: Up/Down (${startIdx + 1}-${Math.min(startIdx + maxLines, lines.length)} of ${lines.length})`, 10, PARCHMENT_DARK, false, 25, sh - 25);
    }
  }

  // ---CONTROLS
  private _drawControls(_g: Graphics, _state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(_g, 10, top, sw - 20, sh - top - 10, "Controls");

    const controls = [
      "KEYBOARD CONTROLS:",
      "",
      "  1-9, 0    —  Navigate screens (Dashboard, Squad, Tactics, etc.)",
      "  S         —  Open Save/Load screen",
      "  C         —  Open Controls screen",
      "  R         —  Open Rules screen",
      "  Escape    —  Go back / Return to menu",
      "  Enter     —  Confirm / Advance",
      "",
      "  Up/Down   —  Scroll lists / Navigate items",
      "  Left/Right—  Cycle options (formation, instructions)",
      "",
      "MATCH DAY:",
      "",
      "  Space     —  Pause/Resume match simulation",
      "  Up/Down   —  Adjust simulation speed",
      "",
      "MOUSE:",
      "",
      "  Click     —  Select buttons, players, and menu items",
      "  Hover     —  Preview information and highlights",
    ];

    for (let i = 0; i < controls.length; i++) {
      const line = controls[i];
      const isHeader = line.endsWith(":");
      this._addText(line, isHeader ? 12 : 10, isHeader ? GOLD : PARCHMENT, isHeader, 25, top + 35 + i * 18, FONT_MONO);
    }

    this._addText("Press Esc to go back", 10, PARCHMENT_DARK, false, 25, sh - 25);
  }

  // ---PLAYER DETAIL — detailed portrait, radar chart with glow, embossed bars
  private _drawPlayerDetail(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    const team = state.teams[state.playerTeamId];
    if (!team || !state.selectedPlayerId) return;
    const player = team.squad.find(p => p.id === state.selectedPlayerId);
    if (!player) return;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10);
    this._drawPlayerPortrait(g, 30, top + 20, player, team.teamDef);

    const infoX = 130;
    this._addText(getPlayerFullName(player), 20, 0x000000, true, infoX + 1, top + 21);
    this._addText(getPlayerFullName(player), 20, GOLD, true, infoX, top + 20);
    this._addText(`${player.class} | Age: ${player.age} | Potential: ${player.potential}`, 12, PARCHMENT, false, infoX, top + 46);
    this._addText(`Trait: ${player.trait}`, 12, BLUE_INFO, false, infoX, top + 64);
    this._addText(`Contract: ${player.contractYears} years | Wage: ${player.wage}g/wk`, 11, PARCHMENT_DARK, false, infoX, top + 82);
    this._addText(`Value: ${player.value}g`, 11, GOLD, false, infoX, top + 98);
    if (player.injury !== Injury.NONE) {
      this._addText(`INJURED: ${player.injury} (${player.injuryWeeks} weeks)`, 12, RED_ACCENT, true, infoX, top + 118);
    }
    this._addText(`Matches: ${player.matchesPlayed} | Goals: ${player.goals} | Assists: ${player.assists}`, 11, PARCHMENT, false, infoX, top + 140);
    this._addText(`Avg Rating: ${player.rating.toFixed(1)}`, 11, PARCHMENT, false, infoX, top + 158);
    const radarX = sw / 2 + 60;
    const radarY = top + 140;
    const radarR = 80;
    this._drawRadarChart(g, radarX, radarY, radarR, player);
    const barX = 30;
    const barY = top + 200;
    const stats: [string, number, number][] = [
      ["Attack", player.stats.attack, 0xff6644],
      ["Defense", player.stats.defense, 0x4488ff],
      ["Speed", player.stats.speed, 0x44ff88],
      ["Magic", player.stats.magic, 0xcc44ff],
      ["Stamina", player.stats.stamina, 0xffcc44],
      ["Morale", player.stats.morale, 0xff44cc],
    ];
    for (let i = 0; i < stats.length; i++) {
      const [label, value, color] = stats[i];
      const sy = barY + i * 26;
      this._addText(label, 10, PARCHMENT, false, barX, sy);
      g.fill({ color: DARK_WOOD, alpha: 0.5 }).rect(barX + 65, sy, 200, 14).fill();
      g.fill({ color, alpha: 0.8 }).rect(barX + 65, sy, (value as number) * 2, 14).fill();
      g.fill({ color: WHITE, alpha: 0.08 }).rect(barX + 65, sy, (value as number) * 2, 7).fill();
      g.stroke({ color: GOLD_DARK, width: 0.5 }).rect(barX + 65, sy, 200, 14).stroke();
      this._addText(`${value}`, 9, WHITE, true, barX + 68, sy + 1);
    }
    this._addText("Press Esc to go back", 10, PARCHMENT_DARK, false, 30, sh - 30);
  }

  // ---Radar Chart — gradient fill, glowing edges
  private _drawRadarChart(g: Graphics, cx: number, cy: number, radius: number, player: PlayerDef): void {
    const stats = [
      { label: "ATK", value: player.stats.attack },
      { label: "DEF", value: player.stats.defense },
      { label: "SPD", value: player.stats.speed },
      { label: "MAG", value: player.stats.magic },
      { label: "STA", value: player.stats.stamina },
      { label: "MOR", value: player.stats.morale },
    ];
    const n = stats.length;
    const angleStep = (Math.PI * 2) / n;
    for (let ring = 1; ring <= 4; ring++) {
      const r = (ring / 4) * radius;
      g.stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 });
      for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
      }
      g.closePath().stroke();
    }
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      g.stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 })
        .moveTo(cx, cy).lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius).stroke();
      const lx = cx + Math.cos(angle) * (radius + 15) - 10;
      const ly = cy + Math.sin(angle) * (radius + 15) - 6;
      this._addText(`${stats[i].label}:${stats[i].value}`, 8, PARCHMENT, false, lx, ly);
    }
    // Helper: trace stat polygon with optional radius offset
    const tracePoly = (extra: number) => {
      for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const r = (stats[i].value / 100) * radius + extra;
        const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
    };
    g.fill({ color: GOLD, alpha: 0.08 }); tracePoly(3); g.fill();
    g.fill({ color: GOLD, alpha: 0.2 }); tracePoly(0); g.fill();
    g.stroke({ color: GOLD, width: 2.5, alpha: 0.4 }); tracePoly(0); g.stroke();
    g.stroke({ color: GOLD, width: 1.5 }); tracePoly(0); g.stroke();
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const r = (stats[i].value / 100) * radius;
      const px = cx + Math.cos(angle) * r, py = cy + Math.sin(angle) * r;
      g.fill({ color: WHITE, alpha: 0.5 }).circle(px, py, 4).fill();
      g.fill({ color: GOLD }).circle(px, py, 3).fill();
    }
  }

  // ---Player Portrait — detailed procedural with shading, hair, headgear
  private _drawPlayerPortrait(g: Graphics, x: number, y: number, player: PlayerDef, teamDef: TeamDef): void {
    const w = 80, h = 100;
    // Frame shadow
    g.fill({ color: 0x000000, alpha: 0.15 }).roundRect(x + 2, y + 2, w, h, 4).fill();
    // Ornate frame
    g.fill({ color: DARK_WOOD, alpha: 0.95 }).roundRect(x, y, w, h, 4).fill();
    // Double border
    g.stroke({ color: GOLD_DARK, width: 2.5 }).roundRect(x, y, w, h, 4).stroke();
    g.stroke({ color: GOLD, alpha: 0.4, width: 1 }).roundRect(x + 2, y + 2, w - 4, h - 4, 3).stroke();
    // Background gradient with team color
    g.fill({ color: teamDef.color1, alpha: 0.25 }).roundRect(x + 3, y + 3, w - 6, h - 6, 3).fill();
    g.fill({ color: teamDef.color1, alpha: 0.12 }).roundRect(x + 3, y + 3, w - 6, (h - 6) * 0.4, 3).fill();
    // Corner ornaments on frame
    g.fill({ color: GOLD, alpha: 0.3 }).circle(x + 4, y + 4, 2).fill();
    g.fill({ color: GOLD, alpha: 0.3 }).circle(x + w - 4, y + 4, 2).fill();
    g.fill({ color: GOLD, alpha: 0.3 }).circle(x + 4, y + h - 4, 2).fill();
    g.fill({ color: GOLD, alpha: 0.3 }).circle(x + w - 4, y + h - 4, 2).fill();

    const cx = x + w / 2;
    const cy = y + h / 2 - 5;
    const seed = player.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const rng = (offset: number) => seededRng(seed, offset);
    const skinColors = [0xffe0bd, 0xf1c27d, 0xd4a574, 0xc68642, 0x8d5524, 0xffdbac, 0xe0ac69];
    const skinColor = skinColors[Math.floor(rng(1) * skinColors.length)];
    const skinShadow = lerpColor(skinColor, 0x000000, 0.25);

    const headW = 18 + rng(2) * 8;
    const headH = 22 + rng(3) * 6;
    const hairStyle = Math.floor(rng(10) * 5); // 0=short, 1=long, 2=bald, 3=braided, 4=medium
    const hairColors = [0x1a0f00, 0x3d2b1f, 0x8b4513, 0xdaa520, 0xa0522d, 0x2f1b14, 0xcc6633];
    const hairColor = hairColors[Math.floor(rng(11) * hairColors.length)];
    if (hairStyle === 1 || hairStyle === 3) {
      g.fill({ color: hairColor, alpha: 0.8 });
      g.moveTo(cx - headW - 2, cy - 5);
      g.lineTo(cx - headW + 2, cy + 25);
      g.lineTo(cx + headW - 2, cy + 25);
      g.lineTo(cx + headW + 2, cy - 5);
      g.closePath().fill();
    }
    g.fill({ color: skinShadow }).ellipse(cx + 1, cy - 7, headW + 1, headH + 1).fill();
    g.fill({ color: skinColor }).ellipse(cx, cy - 8, headW, headH).fill();
    g.fill({ color: WHITE, alpha: 0.06 }).ellipse(cx - 6, cy - 12, headW * 0.5, headH * 0.6).fill();
    if (hairStyle === 0 || hairStyle === 4) {
      g.fill({ color: hairColor })
        .arc(cx, cy - 8, headW + 2, -Math.PI, 0).fill();
    } else if (hairStyle === 3) {
      g.fill({ color: hairColor }).arc(cx, cy - 8, headW + 2, -Math.PI, 0).fill();
      g.stroke({ color: lerpColor(hairColor, 0x000000, 0.3), width: 2 })
        .moveTo(cx + headW, cy - 2).lineTo(cx + headW + 3, cy + 20).stroke();
    }
    const eyeSpread = 6 + rng(4) * 4;
    const eyeY = cy - 12;
    g.fill({ color: WHITE }).ellipse(cx - eyeSpread, eyeY, 4, 3).fill();
    g.fill({ color: WHITE }).ellipse(cx + eyeSpread, eyeY, 4, 3).fill();
    const eyeColors = [0x2244aa, 0x224422, 0x442222, 0x222222, 0x888844, 0x336633];
    const eyeColor = eyeColors[Math.floor(rng(5) * eyeColors.length)];
    g.fill({ color: eyeColor }).circle(cx - eyeSpread, eyeY, 2.5).fill();
    g.fill({ color: eyeColor }).circle(cx + eyeSpread, eyeY, 2.5).fill();
    g.fill({ color: 0x000000 }).circle(cx - eyeSpread, eyeY, 1.2).fill();
    g.fill({ color: 0x000000 }).circle(cx + eyeSpread, eyeY, 1.2).fill();
    g.fill({ color: WHITE, alpha: 0.6 }).circle(cx - eyeSpread - 1, eyeY - 1, 0.8).fill();
    g.fill({ color: WHITE, alpha: 0.6 }).circle(cx + eyeSpread - 1, eyeY - 1, 0.8).fill();
    g.stroke({ color: lerpColor(hairColor, skinColor, 0.3), width: 1.5 })
      .moveTo(cx - eyeSpread - 4, eyeY - 5).lineTo(cx - eyeSpread + 4, eyeY - 4.5).stroke();
    g.stroke({ color: lerpColor(hairColor, skinColor, 0.3), width: 1.5 })
      .moveTo(cx + eyeSpread - 4, eyeY - 4.5).lineTo(cx + eyeSpread + 4, eyeY - 5).stroke();
    g.stroke({ color: skinShadow, width: 1 })
      .moveTo(cx, cy - 6).lineTo(cx - 2 - rng(6) * 2, cy).stroke();
    g.stroke({ color: lerpColor(skinColor, 0x000000, 0.3), width: 1 })
      .moveTo(cx - 4, cy + 4)
      .quadraticCurveTo(cx, cy + 5 + rng(7) * 3, cx + 4, cy + 4)
      .stroke();
    if (rng(20) > 0.5 && player.age > 20) {
      const beardType = Math.floor(rng(21) * 3);
      const beardColor = lerpColor(hairColor, 0x000000, 0.15);
      if (beardType === 0) {
        for (let bi = 0; bi < 8; bi++) {
          const bx = cx - 6 + rng(30 + bi) * 12;
          const by = cy + 2 + rng(40 + bi) * 8;
          g.fill({ color: beardColor, alpha: 0.4 }).circle(bx, by, 0.6).fill();
        }
      } else if (beardType === 1) {
        g.fill({ color: beardColor, alpha: 0.6 }).ellipse(cx, cy + 8, 5, 6).fill();
      } else {
        g.fill({ color: beardColor, alpha: 0.5 });
        g.moveTo(cx - 8, cy + 2); g.quadraticCurveTo(cx, cy + 16, cx + 8, cy + 2); g.closePath().fill();
      }
    }
    switch (player.class) {
      case PlayerClass.GATEKEEPER:
        g.fill({ color: 0x777777 })
          .moveTo(cx - headW - 3, cy - 10).lineTo(cx, cy - headH - 15).lineTo(cx + headW + 3, cy - 10).closePath().fill();
        g.fill({ color: 0x999999, alpha: 0.5 })
          .moveTo(cx - headW - 3, cy - 10).lineTo(cx, cy - headH - 10).lineTo(cx + headW + 3, cy - 10).closePath().fill();
        g.stroke({ color: 0x666666, width: 1 }).moveTo(cx, cy - 8).lineTo(cx, cy + 2).stroke();
        g.stroke({ color: 0x555555, width: 0.5 })
          .moveTo(cx - 6, cy - 5).lineTo(cx + 6, cy - 5).stroke();
        break;
      case PlayerClass.KNIGHT:
        g.fill({ color: 0x999999, alpha: 0.7 }).arc(cx, cy - 8, headW + 4, -Math.PI, 0).fill();
        g.fill({ color: 0xaaaaaa, alpha: 0.3 }).arc(cx, cy - 8, headW + 2, -Math.PI, -Math.PI * 0.5).fill();
        g.stroke({ color: teamDef.color2, width: 2 })
          .moveTo(cx, cy - headH - 5).lineTo(cx, cy - headH + 5)
          .moveTo(cx - 4, cy - headH).lineTo(cx + 4, cy - headH).stroke();
        break;
      case PlayerClass.ROGUE:
        g.fill({ color: 0x2d5016, alpha: 0.8 })
          .moveTo(cx - headW - 5, cy - 5)
          .quadraticCurveTo(cx - 2, cy - headH - 20, cx + headW + 5, cy - 5).fill();
        g.fill({ color: 0x3d6020, alpha: 0.3 })
          .moveTo(cx - headW - 3, cy - 5)
          .quadraticCurveTo(cx, cy - headH - 12, cx + headW, cy - 5).fill();
        break;
      case PlayerClass.MAGE:
        g.fill({ color: teamDef.color1, alpha: 0.8 })
          .moveTo(cx - headW - 2, cy - 10).lineTo(cx + 5, cy - headH - 30).lineTo(cx + headW + 8, cy - 10).closePath().fill();
        g.fill({ color: lerpColor(teamDef.color1, WHITE, 0.15), alpha: 0.3 })
          .moveTo(cx - headW, cy - 10).lineTo(cx + 3, cy - headH - 25).lineTo(cx + 5, cy - 10).closePath().fill();
        g.fill({ color: GOLD }).circle(cx + 3, cy - headH - 10, 3).fill();
        g.fill({ color: WHITE, alpha: 0.6 }).circle(cx + 2, cy - headH - 11, 1).fill();
        break;
    }
    g.fill({ color: lerpColor(teamDef.color1, 0x000000, 0.2) }).rect(cx - 14, cy + 14, 28, 30).fill();
    g.fill({ color: teamDef.color1 }).rect(cx - 13, cy + 14, 26, 29).fill();
    g.fill({ color: WHITE, alpha: 0.06 }).rect(cx - 13, cy + 14, 13, 29).fill();
    g.fill({ color: teamDef.color2 }).rect(cx - 10, cy + 16, 20, 4).fill();
    const ovr = getOverall(player);
    g.fill({ color: DARK_WOOD, alpha: 0.8 }).circle(x + w - 14, y + h - 14, 12).fill();
    g.fill({ color: GOLD, alpha: 0.1 }).circle(x + w - 14, y + h - 14, 11).fill();
    g.stroke({ color: GOLD_DARK, width: 1 }).circle(x + w - 14, y + h - 14, 12).stroke();
    this._addText(`${ovr}`, 9, GOLD, true, x + w - 20, y + h - 19);
  }

  // ---Mini Crest — heraldic shield with divisions and charges
  private _drawMiniCrest(g: Graphics, x: number, y: number, color1: number, color2: number, accent: number): void {
    // Shield shadow
    g.fill({ color: 0x000000, alpha: 0.15 });
    g.moveTo(x + 1, y + 1); g.lineTo(x + 21, y + 1); g.lineTo(x + 21, y + 17);
    g.lineTo(x + 11, y + 25); g.lineTo(x + 1, y + 17); g.closePath().fill();
    // Main shield body
    g.fill({ color: color1 });
    g.moveTo(x, y); g.lineTo(x + 20, y); g.lineTo(x + 20, y + 16);
    g.lineTo(x + 10, y + 24); g.lineTo(x, y + 16); g.closePath().fill();
    // Heraldic division (per pale - split vertically)
    g.fill({ color: color2, alpha: 0.5 });
    g.moveTo(x + 10, y); g.lineTo(x + 20, y); g.lineTo(x + 20, y + 16);
    g.lineTo(x + 10, y + 24); g.closePath().fill();
    // Inner field
    g.fill({ color: color2, alpha: 0.3 });
    g.moveTo(x + 4, y + 3); g.lineTo(x + 16, y + 3); g.lineTo(x + 16, y + 13);
    g.lineTo(x + 10, y + 18); g.lineTo(x + 4, y + 13); g.closePath().fill();
    // Horizontal fess (band)
    g.fill({ color: accent, alpha: 0.3 }).rect(x + 2, y + 8, 16, 3).fill();
    // Central charge (star/circle)
    g.fill({ color: accent, alpha: 0.8 }).circle(x + 10, y + 10, 3.5).fill();
    g.fill({ color: WHITE, alpha: 0.3 }).circle(x + 10, y + 10, 2).fill();
    // Specular highlight
    g.fill({ color: WHITE, alpha: 0.2 }).circle(x + 7, y + 6, 3).fill();
    // Border with double line
    g.stroke({ color: GOLD_DARK, width: 1.2 });
    g.moveTo(x, y); g.lineTo(x + 20, y); g.lineTo(x + 20, y + 16);
    g.lineTo(x + 10, y + 24); g.lineTo(x, y + 16); g.closePath().stroke();
    g.stroke({ color: GOLD, alpha: 0.3, width: 0.5 });
    g.moveTo(x + 1, y + 1); g.lineTo(x + 19, y + 1); g.lineTo(x + 19, y + 15.5);
    g.lineTo(x + 10, y + 23); g.lineTo(x + 1, y + 15.5); g.closePath().stroke();
  }

  // ---MATCH RESULT
  private _drawMatchResult(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    const result = state.lastMatchResult;
    if (!result) return;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Match Result");

    const homeName = state.teams[result.home]?.teamDef.name ?? result.home;
    const awayName = state.teams[result.away]?.teamDef.name ?? result.away;
    this._addText(`${homeName}  ${result.homeGoals} - ${result.awayGoals}  ${awayName}`, 22, GOLD, true, sw / 2 - 200, top + 40);

    const goals = result.commentary.filter(c => c.type === "goal");
    if (goals.length > 0) {
      this._addText("Goals:", 12, GOLD, true, 30, top + 80);
      for (let i = 0; i < Math.min(goals.length, 8); i++) {
        this._addText(`${goals[i].minute}' - ${goals[i].text}`, 10, PARCHMENT, false, 40, top + 98 + i * 16);
      }
    }
    this._addText("Press Enter to continue", 12, PARCHMENT_DARK, false, sw / 2 - 80, sh - 40);
    this.clickZones.push({ id: "result_continue", x: 0, y: sh - 50, w: sw, h: 50 });
  }

  // ---SEASON END
  private _drawSeasonEnd(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const cx = sw / 2;
    this._addText("Season Complete!", 28, GOLD, true, cx - 120, 50);

    const pos = state.leagueTable.findIndex(e => e.teamId === state.playerTeamId) + 1;
    this._addText(`Final League Position: ${pos}`, 18, pos === 1 ? GOLD : WHITE, true, cx - 120, 100);
    if (pos === 1) {
      this._addText("LEAGUE CHAMPIONS!", 24, GOLD, true, cx - 130, 140);
      const pulse = Math.sin(this._time * 3) * 5;
      g.fill({ color: GOLD, alpha: 0.15 }).circle(cx, 210 + pulse, 60).fill();
      g.fill({ color: GOLD, alpha: 0.3 }).circle(cx, 210 + pulse, 40).fill();
      g.fill({ color: GOLD }).circle(cx, 210 + pulse, 25).fill();
      g.fill({ color: WHITE, alpha: 0.3 }).circle(cx - 5, 205 + pulse, 8).fill();
    }

    const cupFinal = state.cupMatches.find(m => m.round === 2 && m.played);
    if (cupFinal && cupFinal.winnerId === state.playerTeamId) {
      this._addText("CAMELOT CUP WINNERS!", 20, GOLD, true, cx - 130, 280);
    }
    this._addText(`Wins: ${state.managerWins} | Draws: ${state.managerDraws} | Losses: ${state.managerLosses}`, 14, PARCHMENT, false, cx - 150, 340);
    this._addText(`Revenue: ${state.seasonRevenue}g | Expenses: ${state.seasonExpenses}g`, 14, PARCHMENT, false, cx - 150, 365);
    this._addText("Press Enter to start next season, Esc to return to menu", 12, PARCHMENT_DARK, false, cx - 200, sh - 40);
    this.clickZones.push({ id: "next_season", x: 0, y: sh - 50, w: sw, h: 50 });
  }

  // ---SAVE/LOAD
  private _drawSaveLoad(g: Graphics, _state: GrailManagerState, sw: number, sh: number): void {
    const top = 62;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Save / Load Game");
    for (let i = 0; i < 3; i++) {
      const y = top + 40 + i * 70;
      const has = hasSave(i);
      this._drawPanel(g, 30, y, sw - 80, 55);
      this._addText(`Slot ${i + 1}: ${has ? "Save data found" : "Empty"}`, 12, has ? WHITE : PARCHMENT_DARK, false, 50, y + 10);
      g.fill({ color: GREEN_GOOD, alpha: 0.7 }).roundRect(sw - 200, y + 8, 60, 20, 3).fill();
      this._addText("Save", 10, WHITE, true, sw - 188, y + 10);
      this.clickZones.push({ id: `save_${i}`, x: sw - 200, y: y + 8, w: 60, h: 20 });
      if (has) {
        g.fill({ color: BLUE_INFO, alpha: 0.7 }).roundRect(sw - 130, y + 8, 60, 20, 3).fill();
        this._addText("Load", 10, WHITE, true, sw - 118, y + 10);
        this.clickZones.push({ id: `load_${i}`, x: sw - 130, y: y + 8, w: 60, h: 20 });
      }
    }
    this._addText("Press Esc to go back", 10, PARCHMENT_DARK, false, 30, sh - 30);
  }

  // ---Text helper — with optional drop shadow for headers
  private _addText(str: string, size: number, color: number, bold: boolean, x: number, y: number, fontFamily = FONT): void {
    const t = new Text({
      text: str,
      style: new TextStyle({
        fontFamily,
        fontSize: size,
        fill: color,
        fontWeight: bold ? "bold" : "normal",
      }),
    });
    t.x = x;
    t.y = y;
    this.container.addChild(t);
    this._texts.push(t);
  }
}
