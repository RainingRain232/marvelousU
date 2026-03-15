// ---------------------------------------------------------------------------
// Grail Ball Manager — UI Renderer (PixiJS)
// Medieval manuscript aesthetic with illuminated borders, parchment textures,
// procedural player portraits, radar charts, and screen-based navigation.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  PlayerClass, Formation, TeamInstruction, FacilityType, TrainingType,
  Injury, PlayerDef, TEAM_DEFS, FACILITY_UPGRADES,
  RULES_TEXT,
} from "./GrailManagerConfig";
import type { TeamDef } from "./GrailManagerConfig";
import {
  GMScreen, MatchPhase, GrailManagerState,
  getOverall, getPlayerFullName, hasSave,
} from "./GrailManagerState";

// ---------------------------------------------------------------------------
// Colors / Theme
// ---------------------------------------------------------------------------

const PARCHMENT      = 0xd4c5a9;
const PARCHMENT_DARK = 0x8b7d5e;
const GOLD           = 0xffd700;
const GOLD_DARK      = 0xb8860b;
const DARK_WOOD      = 0x3e2723;
const DARK_BG        = 0x1a1410;
const RED_ACCENT     = 0x8b0000;
const GREEN_GOOD     = 0x2e7d32;
const BLUE_INFO      = 0x1565c0;
const WHITE          = 0xffffff;
const CELTIC_GREEN   = 0x2d5016;
const PANEL_ALPHA    = 0.92;

const FONT = "'Palatino Linotype', 'Book Antiqua', Georgia, serif";
const FONT_MONO = "'Courier New', Courier, monospace";

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------

function hexToRGB(hex: number): [number, number, number] {
  return [(hex >> 16) & 0xff, (hex >> 8) & 0xff, hex & 0xff];
}

function lerpColor(a: number, b: number, t: number): number {
  const [ar, ag, ab] = hexToRGB(a);
  const [br, bg, bb] = hexToRGB(b);
  const r = Math.round(ar + (br - ar) * t);
  const gc = Math.round(ag + (bg - ag) * t);
  const bl = Math.round(ab + (bb - ab) * t);
  return (r << 16) | (gc << 8) | bl;
}


// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------


// ---------------------------------------------------------------------------
// GrailManagerRenderer
// ---------------------------------------------------------------------------

export class GrailManagerRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _texts: Text[] = [];
  private _time = 0;

  // Scroll / interaction state read from input
  private _hoverZone = "";
  clickZones: { id: string; x: number; y: number; w: number; h: number }[] = [];

  build(): void {
    this.container.addChild(this._gfx);
  }

  update(state: GrailManagerState, sw: number, sh: number, dt: number, mouseX: number, mouseY: number): void {
    this._time += dt;

    const g = this._gfx;
    g.clear();

    // Remove old texts
    for (const t of this._texts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._texts.length = 0;
    this.clickZones.length = 0;

    // Background
    this._drawBackground(g, sw, sh);

    // Draw current screen
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
      case GMScreen.PLAYER_DETAIL: this._drawHeader(g, state, sw, sh); this._drawPlayerDetail(g, state, sw, sh); break;
      case GMScreen.MATCH_RESULT:  this._drawHeader(g, state, sw, sh); this._drawMatchResult(g, state, sw, sh); break;
      case GMScreen.SEASON_END:    this._drawSeasonEnd(g, state, sw, sh); break;
      case GMScreen.SAVE_LOAD:     this._drawHeader(g, state, sw, sh); this._drawSaveLoad(g, state, sw, sh); break;
    }

    // Hover detection
    this._hoverZone = "";
    for (const zone of this.clickZones) {
      if (mouseX >= zone.x && mouseX <= zone.x + zone.w && mouseY >= zone.y && mouseY <= zone.y + zone.h) {
        this._hoverZone = zone.id;
        // Draw hover highlight
        g.fill({ color: GOLD, alpha: 0.1 }).rect(zone.x, zone.y, zone.w, zone.h).fill();
        break;
      }
    }
  }

  getHoverZone(): string { return this._hoverZone; }

  cleanup(): void {
    for (const t of this._texts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._texts.length = 0;
    this._gfx.clear();
  }

  // -------------------------------------------------------------------------
  // Background
  // -------------------------------------------------------------------------
  private _drawBackground(g: Graphics, sw: number, sh: number): void {
    // Dark wood background
    g.fill({ color: DARK_BG }).rect(0, 0, sw, sh).fill();

    // Parchment texture simulation with gradient bands
    for (let y = 0; y < sh; y += 4) {
      const t = y / sh;
      const c = lerpColor(0x1c1610, 0x241e18, Math.sin(t * 20 + this._time * 0.5) * 0.5 + 0.5);
      g.fill({ color: c, alpha: 0.3 }).rect(0, y, sw, 4).fill();
    }

    // Celtic corner decorations
    this._drawCelticCorner(g, 0, 0, 1, 1);
    this._drawCelticCorner(g, sw, 0, -1, 1);
    this._drawCelticCorner(g, 0, sh, 1, -1);
    this._drawCelticCorner(g, sw, sh, -1, -1);
  }

  private _drawCelticCorner(g: Graphics, x: number, y: number, dx: number, dy: number): void {
    const s = 40;
    g.stroke({ color: GOLD_DARK, width: 2, alpha: 0.4 });
    // Simple spiral/knotwork suggestion
    for (let i = 0; i < 3; i++) {
      const r = s - i * 10;
      g.moveTo(x, y + dy * r);
      g.quadraticCurveTo(x + dx * r * 0.7, y + dy * r * 0.7, x + dx * r, y);
    }
    g.stroke();
  }

  // -------------------------------------------------------------------------
  // Header / Navigation Bar
  // -------------------------------------------------------------------------
  private _drawHeader(g: Graphics, state: GrailManagerState, sw: number, _sh: number): void {
    const hh = 50;
    // Dark header bar
    g.fill({ color: DARK_WOOD, alpha: 0.95 }).rect(0, 0, sw, hh).fill();
    // Gold border
    g.stroke({ color: GOLD_DARK, width: 2 }).moveTo(0, hh).lineTo(sw, hh).stroke();

    // Team name and gold
    const team = state.teams[state.playerTeamId];
    if (team) {
      this._addText(`${team.teamDef.name}`, 14, GOLD, true, 10, 6);
      this._addText(`${state.gold}g`, 12, 0xffd700, false, 10, 28);
      this._addText(`Week ${state.currentWeek} | Season ${state.season}`, 12, PARCHMENT, false, 200, 28);
    }

    // Navigation tabs
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
      const color = active ? GOLD : PARCHMENT_DARK;
      if (active) {
        g.fill({ color: GOLD_DARK, alpha: 0.3 }).rect(tx, 2, tabWidth - 4, hh - 4).fill();
      }
      this._addText(tabs[i].label, 11, color, active, tx + 4, 16);
      this.clickZones.push({ id: `tab_${tabs[i].screen}`, x: tx, y: 0, w: tabWidth, h: hh });
    }

    // Save button
    this._addText("S:Save", 11, PARCHMENT_DARK, false, sw - 60, 16);
    this.clickZones.push({ id: "save_game", x: sw - 65, y: 0, w: 60, h: hh });
  }

  // -------------------------------------------------------------------------
  // Panel helper
  // -------------------------------------------------------------------------
  private _drawPanel(g: Graphics, x: number, y: number, w: number, h: number, title?: string): void {
    // Outer border
    g.fill({ color: DARK_WOOD, alpha: PANEL_ALPHA }).roundRect(x, y, w, h, 6).fill();
    g.stroke({ color: GOLD_DARK, width: 1.5 }).roundRect(x, y, w, h, 6).stroke();
    // Inner parchment
    g.fill({ color: PARCHMENT, alpha: 0.08 }).roundRect(x + 3, y + 3, w - 6, h - 6, 4).fill();

    if (title) {
      g.fill({ color: GOLD_DARK, alpha: 0.2 }).rect(x + 3, y + 3, w - 6, 24).fill();
      this._addText(title, 13, GOLD, true, x + 10, y + 6);
    }
  }

  // -------------------------------------------------------------------------
  // MAIN MENU
  // -------------------------------------------------------------------------
  private _drawMainMenu(g: Graphics, _state: GrailManagerState, sw: number, sh: number): void {
    const cx = sw / 2;
    const cy = sh / 2;

    // Grand title with glow
    const pulse = Math.sin(this._time * 2) * 0.15 + 0.85;
    g.fill({ color: GOLD, alpha: pulse * 0.15 }).circle(cx, cy - 120, 200).fill();

    this._addText("GRAIL BALL", 42, GOLD, true, cx - 140, cy - 180);
    this._addText("MANAGER", 36, GOLD_DARK, true, cx - 105, cy - 130);

    // Decorative orb
    g.fill({ color: GOLD, alpha: 0.3 }).circle(cx, cy - 60, 30).fill();
    g.fill({ color: 0xffec8b, alpha: 0.5 }).circle(cx, cy - 60, 18).fill();
    g.fill({ color: WHITE, alpha: 0.6 }).circle(cx - 6, cy - 66, 6).fill();

    // Tagline
    this._addText("A Medieval Fantasy Football Management Game", 14, PARCHMENT, false, cx - 195, cy - 20);

    // Menu options
    const menuItems = [
      { label: "New Game", id: "menu_new", y: cy + 30 },
      { label: "Load Game", id: "menu_load", y: cy + 70 },
      { label: "Rules & Info", id: "menu_rules", y: cy + 110 },
      { label: "Exit", id: "menu_exit", y: cy + 150 },
    ];

    for (const item of menuItems) {
      const bx = cx - 100;
      const bw = 200;
      const bh = 32;
      const isHover = this._hoverZone === item.id;
      g.fill({ color: isHover ? GOLD_DARK : DARK_WOOD, alpha: 0.85 }).roundRect(bx, item.y, bw, bh, 4).fill();
      g.stroke({ color: GOLD_DARK, width: 1 }).roundRect(bx, item.y, bw, bh, 4).stroke();
      this._addText(item.label, 16, isHover ? GOLD : PARCHMENT, true, bx + bw / 2 - item.label.length * 4.5, item.y + 7);
      this.clickZones.push({ id: item.id, x: bx, y: item.y, w: bw, h: bh });
    }

    // Has save indicator
    if (hasSave(0)) {
      this._addText("(Save data found)", 11, GREEN_GOOD, false, cx - 55, cy + 105);
    }

    // Footer
    this._addText("Press N for New Game, L for Load, R for Rules, Esc to Exit", 11, PARCHMENT_DARK, false, cx - 205, sh - 40);
  }

  // -------------------------------------------------------------------------
  // NEW GAME SETUP
  // -------------------------------------------------------------------------
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

      // Card
      this._drawPanel(g, x, y, cardW, cardH);

      // Team crest (simple shield shape)
      this._drawMiniCrest(g, x + 12, y + 20, def.color1, def.color2, def.crestColor);

      // Team info
      this._addText(`${i + 1}. ${def.name}`, 14, GOLD, true, x + 50, y + 8);
      this._addText(def.motto, 10, PARCHMENT, false, x + 50, y + 26);
      this._addText(`Style: ${def.style} | Rep: ${def.reputation}`, 10, PARCHMENT_DARK, false, x + 50, y + 42);
      this._addText(`Budget: ${def.budget}g | Wage Cap: ${def.wageBudget}g/wk`, 10, PARCHMENT_DARK, false, x + 50, y + 56);
      this._addText(`Stadium: ${def.stadiumCapacity} seats`, 10, PARCHMENT_DARK, false, x + 50, y + 70);

      this.clickZones.push({ id: `team_${i}`, x, y, w: cardW, h: cardH });
    }
  }

  // -------------------------------------------------------------------------
  // DASHBOARD
  // -------------------------------------------------------------------------
  private _drawDashboard(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    // Left column: Team overview
    const lw = Math.min(350, sw * 0.45);
    this._drawPanel(g, 10, top, lw, 160, "Club Overview");
    this._drawMiniCrest(g, 24, top + 38, team.teamDef.color1, team.teamDef.color2, team.teamDef.crestColor);
    this._addText(team.teamDef.name, 16, GOLD, true, 65, top + 34);
    this._addText(`Manager: ${state.managerName}`, 11, PARCHMENT, false, 65, top + 54);
    this._addText(`Gold: ${state.gold}`, 11, 0xffd700, false, 65, top + 70);
    this._addText(`Income/Match: ${state.weeklyIncome}g | Wages: ${state.weeklyExpenses}g/wk`, 10, PARCHMENT_DARK, false, 65, top + 86);
    this._addText(`Formation: ${team.formation} | Style: ${team.instruction}`, 10, PARCHMENT_DARK, false, 65, top + 102);
    this._addText(`Squad: ${team.squad.length} players`, 10, PARCHMENT_DARK, false, 65, top + 118);
    this._addText(`Training: ${team.trainingType}`, 10, PARCHMENT_DARK, false, 65, top + 134);

    // League position
    const leaguePos = state.leagueTable.findIndex(e => e.teamId === state.playerTeamId) + 1;
    this._drawPanel(g, 10, top + 170, lw, 60, "League Standing");
    this._addText(`Position: ${leaguePos || "?"}${leaguePos === 1 ? "st" : leaguePos === 2 ? "nd" : leaguePos === 3 ? "rd" : "th"}`, 14, leaguePos <= 2 ? GREEN_GOOD : WHITE, true, 20, top + 198);
    const entry = state.leagueTable.find(e => e.teamId === state.playerTeamId);
    if (entry) {
      this._addText(`P:${entry.played} W:${entry.won} D:${entry.drawn} L:${entry.lost} Pts:${entry.points}`, 11, PARCHMENT, false, 20, top + 216);
    }

    // Upcoming match
    this._drawPanel(g, 10, top + 240, lw, 80, "Next Match");
    const nextFixture = state.fixtures.find(f => !f.played &&
      (f.homeTeamId === state.playerTeamId || f.awayTeamId === state.playerTeamId));
    if (nextFixture) {
      const oppId = nextFixture.homeTeamId === state.playerTeamId ? nextFixture.awayTeamId : nextFixture.homeTeamId;
      const opp = state.teams[oppId];
      const isHome = nextFixture.homeTeamId === state.playerTeamId;
      this._addText(`Week ${nextFixture.week}: ${isHome ? "HOME" : "AWAY"}`, 11, isHome ? GREEN_GOOD : RED_ACCENT, true, 20, top + 268);
      if (opp) {
        this._addText(`vs ${opp.teamDef.name}`, 13, WHITE, true, 20, top + 286);
      }
      this._addText("Press Enter or click 'Advance Week' to proceed", 10, PARCHMENT_DARK, false, 20, top + 304);
    } else {
      this._addText("No upcoming matches", 12, PARCHMENT_DARK, false, 20, top + 270);
    }

    // Advance week button
    const btnX = 10, btnY = top + 330, btnW = lw, btnH = 36;
    const advHover = this._hoverZone === "advance_week";
    g.fill({ color: advHover ? GREEN_GOOD : CELTIC_GREEN, alpha: 0.9 }).roundRect(btnX, btnY, btnW, btnH, 4).fill();
    g.stroke({ color: GOLD_DARK, width: 1 }).roundRect(btnX, btnY, btnW, btnH, 4).stroke();
    this._addText("Advance Week (Enter)", 14, WHITE, true, btnX + btnW / 2 - 80, btnY + 9);
    this.clickZones.push({ id: "advance_week", x: btnX, y: btnY, w: btnW, h: btnH });

    // Right column: News feed
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

  // -------------------------------------------------------------------------
  // SQUAD
  // -------------------------------------------------------------------------
  private _drawSquad(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Squad");

    // Column headers
    const headerY = top + 30;
    const cols = [
      { label: "#", x: 20, w: 25 },
      { label: "Name", x: 50, w: 150 },
      { label: "Class", x: 200, w: 80 },
      { label: "Age", x: 280, w: 35 },
      { label: "OVR", x: 320, w: 35 },
      { label: "ATK", x: 360, w: 35 },
      { label: "DEF", x: 395, w: 35 },
      { label: "SPD", x: 430, w: 35 },
      { label: "MAG", x: 465, w: 35 },
      { label: "STA", x: 500, w: 35 },
      { label: "MOR", x: 535, w: 35 },
      { label: "Form", x: 575, w: 40 },
      { label: "Status", x: 620, w: 80 },
      { label: "Wage", x: 705, w: 50 },
    ];

    for (const col of cols) {
      this._addText(col.label, 10, GOLD, true, col.x, headerY);
    }
    g.stroke({ color: GOLD_DARK, width: 0.5 }).moveTo(20, headerY + 16).lineTo(sw - 30, headerY + 16).stroke();

    // Player rows
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

      // Row background
      if (isSelected) {
        g.fill({ color: GOLD_DARK, alpha: 0.2 }).rect(18, ry - 2, sw - 36, rowH).fill();
      } else if (i % 2 === 0) {
        g.fill({ color: PARCHMENT, alpha: 0.03 }).rect(18, ry - 2, sw - 36, rowH).fill();
      }

      // Starter indicator
      const numColor = isStarter ? GREEN_GOOD : isSub ? BLUE_INFO : PARCHMENT_DARK;
      this._addText(`${i + startIdx + 1}`, 9, numColor, isStarter, 20, ry);
      this._addText(getPlayerFullName(p), 10, WHITE, isStarter, 50, ry);

      // Class with color
      const classColors: Record<string, number> = {
        Gatekeeper: 0x8888ff, Knight: 0xff8844, Rogue: 0x44ff88, Mage: 0xcc44ff,
      };
      this._addText(p.class, 9, classColors[p.class] || WHITE, false, 200, ry);
      this._addText(`${p.age}`, 9, p.age >= 30 ? RED_ACCENT : WHITE, false, 280, ry);

      const ovr = getOverall(p);
      const ovrColor = ovr >= 75 ? GREEN_GOOD : ovr >= 55 ? 0xcccc00 : ovr >= 40 ? 0xff8800 : RED_ACCENT;
      this._addText(`${ovr}`, 9, ovrColor, true, 320, ry);

      // Stats
      this._addStatText(g, `${p.stats.attack}`, 360, ry, p.stats.attack);
      this._addStatText(g, `${p.stats.defense}`, 395, ry, p.stats.defense);
      this._addStatText(g, `${p.stats.speed}`, 430, ry, p.stats.speed);
      this._addStatText(g, `${p.stats.magic}`, 465, ry, p.stats.magic);
      this._addStatText(g, `${p.stats.stamina}`, 500, ry, p.stats.stamina);
      this._addStatText(g, `${p.stats.morale}`, 535, ry, p.stats.morale);

      // Form arrows
      const formStr = p.form > 0 ? "+" + p.form : p.form < 0 ? String(p.form) : "=";
      const formColor = p.form > 0 ? GREEN_GOOD : p.form < 0 ? RED_ACCENT : PARCHMENT_DARK;
      this._addText(formStr, 9, formColor, false, 580, ry);

      // Status
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

    // Scroll hint
    if (sorted.length > maxVisible) {
      this._addText(`Scroll: Up/Down arrows (${startIdx + 1}-${Math.min(startIdx + maxVisible, sorted.length)} of ${sorted.length})`, 10, PARCHMENT_DARK, false, 20, sh - 25);
    }
  }

  private _addStatText(_g: Graphics, text: string, x: number, y: number, value: number): void {
    const color = value >= 75 ? GREEN_GOOD : value >= 55 ? 0xcccc00 : value >= 40 ? 0xff8800 : RED_ACCENT;
    this._addText(text, 9, color, false, x, y);
  }

  // -------------------------------------------------------------------------
  // TACTICS
  // -------------------------------------------------------------------------
  private _drawTactics(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    const team = state.teams[state.playerTeamId];
    if (!team) return;

    // Left: Formation selector
    const lw = 200;
    this._drawPanel(g, 10, top, lw, sh - top - 10, "Tactics");

    // Formation
    this._addText("Formation:", 12, GOLD, true, 20, top + 30);
    const formations = Object.values(Formation);
    for (let i = 0; i < formations.length; i++) {
      const fy = top + 50 + i * 24;
      const active = team.formation === formations[i];
      const color = active ? GOLD : PARCHMENT;
      g.fill({ color: active ? GOLD_DARK : DARK_WOOD, alpha: 0.5 }).roundRect(20, fy, lw - 20, 20, 3).fill();
      this._addText(`${formations[i]}`, 11, color, active, 30, fy + 3);
      this.clickZones.push({ id: `formation_${i}`, x: 20, y: fy, w: lw - 20, h: 20 });
    }

    // Instructions
    const instY = top + 50 + formations.length * 24 + 20;
    this._addText("Team Instructions:", 12, GOLD, true, 20, instY);
    const instructions = Object.values(TeamInstruction);
    for (let i = 0; i < instructions.length; i++) {
      const iy = instY + 20 + i * 24;
      const active = team.instruction === instructions[i];
      const color = active ? GOLD : PARCHMENT;
      g.fill({ color: active ? GOLD_DARK : DARK_WOOD, alpha: 0.5 }).roundRect(20, iy, lw - 20, 20, 3).fill();
      this._addText(`${instructions[i]}`, 11, color, active, 30, iy + 3);
      this.clickZones.push({ id: `instruction_${i}`, x: 20, y: iy, w: lw - 20, h: 20 });
    }

    // Training
    const trainY = instY + 20 + instructions.length * 24 + 20;
    this._addText("Training:", 12, GOLD, true, 20, trainY);
    const trainings = Object.values(TrainingType);
    for (let i = 0; i < trainings.length; i++) {
      const ty = trainY + 20 + i * 24;
      const active = team.trainingType === trainings[i];
      const color = active ? GOLD : PARCHMENT;
      g.fill({ color: active ? GREEN_GOOD : DARK_WOOD, alpha: 0.5 }).roundRect(20, ty, lw - 20, 20, 3).fill();
      this._addText(`${trainings[i]}`, 11, color, active, 30, ty + 3);
      this.clickZones.push({ id: `training_${i}`, x: 20, y: ty, w: lw - 20, h: 20 });
    }

    // Right: Pitch view with formation
    const pitchX = lw + 30;
    const pitchW = sw - pitchX - 20;
    const pitchH = sh - top - 20;
    this._drawPanel(g, pitchX, top, pitchW, pitchH, "Formation View");

    // Draw pitch
    const px = pitchX + 20;
    const py = top + 40;
    const pw = pitchW - 40;
    const ph = pitchH - 60;

    // Green pitch
    g.fill({ color: 0x1a5c1a, alpha: 0.8 }).roundRect(px, py, pw, ph, 4).fill();
    // Center line
    g.stroke({ color: 0x2a8c2a, width: 1 }).moveTo(px + pw / 2, py).lineTo(px + pw / 2, py + ph).stroke();
    // Center circle
    g.stroke({ color: 0x2a8c2a, width: 1 }).circle(px + pw / 2, py + ph / 2, 40).stroke();
    // Goals
    g.stroke({ color: WHITE, width: 2 }).rect(px, py + ph / 2 - 25, 8, 50).stroke();
    g.stroke({ color: WHITE, width: 2 }).rect(px + pw - 8, py + ph / 2 - 25, 8, 50).stroke();

    // Place players on pitch
    const parts = team.formation.split("-").map(Number);
    const lineup = team.startingLineup;
    let pidx = 0;

    // GK
    if (pidx < lineup.length) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      if (p) this._drawPitchPlayer(g, px + 30, py + ph / 2, p, team.teamDef);
      pidx++;
    }

    // Defense (Knights)
    for (let i = 0; i < parts[0] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      const yPos = py + (ph / (parts[0] + 1)) * (i + 1);
      if (p) this._drawPitchPlayer(g, px + pw * 0.25, yPos, p, team.teamDef);
      pidx++;
    }

    // Midfield (Rogues)
    for (let i = 0; i < parts[1] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      const yPos = py + (ph / (parts[1] + 1)) * (i + 1);
      if (p) this._drawPitchPlayer(g, px + pw * 0.5, yPos, p, team.teamDef);
      pidx++;
    }

    // Attack (Mages)
    for (let i = 0; i < parts[2] && pidx < lineup.length; i++) {
      const p = team.squad.find(pl => pl.id === lineup[pidx]);
      const yPos = py + (ph / (parts[2] + 1)) * (i + 1);
      if (p) this._drawPitchPlayer(g, px + pw * 0.75, yPos, p, team.teamDef);
      pidx++;
    }
  }

  private _drawPitchPlayer(g: Graphics, x: number, y: number, player: PlayerDef, teamDef: TeamDef): void {
    // Circle with team color
    g.fill({ color: teamDef.color1 }).circle(x, y, 14).fill();
    g.stroke({ color: teamDef.color2, width: 2 }).circle(x, y, 14).stroke();

    // Class icon
    const classIcons: Record<string, string> = {
      Gatekeeper: "GK", Knight: "KN", Rogue: "RG", Mage: "MG",
    };
    this._addText(classIcons[player.class] || "?", 8, WHITE, true, x - 7, y - 5);
    this._addText(player.lastName.substring(0, 8), 7, WHITE, false, x - 20, y + 16);
    this._addText(`${getOverall(player)}`, 7, GOLD, true, x - 5, y + 26);
  }

  // -------------------------------------------------------------------------
  // MATCH DAY
  // -------------------------------------------------------------------------
  private _drawMatchDay(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const match = state.liveMatch;
    if (!match) {
      // No match in progress
      this._drawHeader(g, state, sw, sh);
      this._drawPanel(g, 10, 60, sw - 20, sh - 70, "Match Day");
      this._addText("No match in progress. Advance the week from the Dashboard.", 14, PARCHMENT, false, 30, 100);
      this._addText("Press 1 to return to Dashboard.", 12, PARCHMENT_DARK, false, 30, 130);
      return;
    }

    const homeTeam = state.teams[match.homeTeamId];
    const awayTeam = state.teams[match.awayTeamId];
    if (!homeTeam || !awayTeam) return;

    // Score header
    g.fill({ color: DARK_WOOD, alpha: 0.95 }).rect(0, 0, sw, 70).fill();
    g.stroke({ color: GOLD_DARK, width: 2 }).moveTo(0, 70).lineTo(sw, 70).stroke();

    // Home team
    this._drawMiniCrest(g, 20, 15, homeTeam.teamDef.color1, homeTeam.teamDef.color2, homeTeam.teamDef.crestColor);
    this._addText(homeTeam.teamDef.name, 16, WHITE, true, 55, 10);

    // Score
    const scoreX = sw / 2;
    this._addText(`${match.homeGoals}`, 32, GOLD, true, scoreX - 40, 10);
    this._addText("-", 32, PARCHMENT, true, scoreX - 6, 10);
    this._addText(`${match.awayGoals}`, 32, GOLD, true, scoreX + 20, 10);

    // Away team
    this._drawMiniCrest(g, sw - 40, 15, awayTeam.teamDef.color1, awayTeam.teamDef.color2, awayTeam.teamDef.crestColor);
    this._addText(awayTeam.teamDef.name, 16, WHITE, true, sw - 200, 10);

    // Match info
    const phaseText = match.phase === MatchPhase.FIRST_HALF ? "1st Half" :
                      match.phase === MatchPhase.HALF_TIME ? "HALF TIME" :
                      match.phase === MatchPhase.SECOND_HALF ? "2nd Half" :
                      match.phase === MatchPhase.FULL_TIME ? "FULL TIME" : "Pre-Match";
    this._addText(`${match.minute}' | ${phaseText}`, 12, GOLD, true, scoreX - 40, 48);
    this._addText(`Weather: ${match.weather}`, 10, PARCHMENT_DARK, false, 55, 50);

    // Layout: Left = pitch, Right = commentary
    const pitchW = Math.min(400, sw * 0.45);
    const pitchH = sh - 160;
    const pitchX = 10;
    const pitchY = 80;

    // Mini pitch
    this._drawPanel(g, pitchX, pitchY, pitchW, pitchH);
    const fpx = pitchX + 10;
    const fpy = pitchY + 10;
    const fpw = pitchW - 20;
    const fph = pitchH - 20;

    g.fill({ color: 0x1a5c1a, alpha: 0.7 }).rect(fpx, fpy, fpw, fph).fill();
    g.stroke({ color: 0x2a8c2a, width: 1 }).moveTo(fpx + fpw / 2, fpy).lineTo(fpx + fpw / 2, fpy + fph).stroke();
    g.stroke({ color: 0x2a8c2a, width: 1 }).circle(fpx + fpw / 2, fpy + fph / 2, 25).stroke();
    g.stroke({ color: WHITE, width: 1.5 }).rect(fpx, fpy + fph / 2 - 20, 6, 40).stroke();
    g.stroke({ color: WHITE, width: 1.5 }).rect(fpx + fpw - 6, fpy + fph / 2 - 20, 6, 40).stroke();

    // Draw player dots
    for (const [pid, pos] of Object.entries(match.playerPositions)) {
      const dx = fpx + pos.x * fpw;
      const dy = fpy + pos.y * fph;
      const isHomePlayer = match.homeLineup.includes(pid);
      const teamColor = isHomePlayer ? homeTeam.teamDef.color1 : awayTeam.teamDef.color1;
      const r = pos.hasOrb ? 7 : 5;

      g.fill({ color: teamColor }).circle(dx, dy, r).fill();
      g.stroke({ color: WHITE, width: 0.5 }).circle(dx, dy, r).stroke();

      if (pos.hasOrb) {
        g.fill({ color: GOLD, alpha: 0.8 }).circle(dx, dy, 3).fill();
      }
    }

    // Orb trail
    const orbDx = fpx + match.orbX * fpw;
    const orbDy = fpy + match.orbY * fph;
    g.fill({ color: GOLD, alpha: 0.3 + Math.sin(this._time * 4) * 0.15 }).circle(orbDx, orbDy, 4).fill();

    // Stats panel
    const statsY = pitchY + pitchH + 5;
    this._drawPanel(g, pitchX, statsY, pitchW, sh - statsY - 10);
    this._addText(`Possession: ${match.homePossession}% - ${100 - match.homePossession}%`, 10, PARCHMENT, false, pitchX + 10, statsY + 8);
    this._addText(`Shots: ${match.homeShots} - ${match.awayShots}`, 10, PARCHMENT, false, pitchX + 10, statsY + 22);
    this._addText(`On Target: ${match.homeShotsOnTarget} - ${match.awayShotsOnTarget}`, 10, PARCHMENT, false, pitchX + 10, statsY + 36);
    this._addText(`Fouls: ${match.homeFouls} - ${match.awayFouls}`, 10, PARCHMENT, false, pitchX + 10, statsY + 50);

    // Right: Commentary feed
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
      const color = c.type === "goal" ? GOLD :
                    c.type === "save" ? BLUE_INFO :
                    c.type === "foul" ? RED_ACCENT :
                    c.type === "injury" ? 0xff4444 :
                    c.type === "spell" ? 0xcc44ff :
                    c.type === "halftime" || c.type === "fulltime" ? GOLD :
                    c.type === "penalty" ? 0xff8800 :
                    c.type === "redCard" ? 0xff0000 :
                    PARCHMENT;
      const prefix = c.type === "goal" ? "GOAL! " : "";
      this._addText(`${c.minute}' ${prefix}${c.text}`, 10, color, c.type === "goal", commX + 10, cy);
    }

    // Speed controls
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

    // Continue button (when full time)
    if (match.phase === MatchPhase.FULL_TIME) {
      const btnX = commX + commW / 2 - 80;
      const btnY = speedY - 30;
      g.fill({ color: GREEN_GOOD, alpha: 0.9 }).roundRect(btnX, btnY, 160, 26, 4).fill();
      this._addText("Continue (Enter)", 12, WHITE, true, btnX + 25, btnY + 5);
      this.clickZones.push({ id: "match_continue", x: btnX, y: btnY, w: 160, h: 26 });
    }
  }

  // -------------------------------------------------------------------------
  // TRANSFERS
  // -------------------------------------------------------------------------
  private _drawTransfers(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10,
      state.transferWindowOpen ? "Transfer Market (OPEN)" : "Transfer Market (CLOSED)");

    if (!state.transferWindowOpen) {
      this._addText("The transfer window is currently closed.", 14, RED_ACCENT, false, 30, top + 40);
      this._addText("It reopens at the start of next season.", 12, PARCHMENT_DARK, false, 30, top + 60);
      return;
    }

    this._addText(`Your budget: ${state.gold}g`, 12, GOLD, true, 20, top + 30);

    // Column headers
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

    g.stroke({ color: GOLD_DARK, width: 0.5 }).moveTo(20, headerY + 14).lineTo(sw - 30, headerY + 14).stroke();

    const rowH = 20;
    const maxVisible = Math.floor((sh - top - 100) / rowH);
    const startIdx = state.scrollOffset;

    for (let i = 0; i < Math.min(maxVisible, state.transferMarket.length - startIdx); i++) {
      const listing = state.transferMarket[i + startIdx];
      const p = listing.player;
      const ry = headerY + 18 + i * rowH;

      if (i % 2 === 0) {
        g.fill({ color: PARCHMENT, alpha: 0.03 }).rect(18, ry - 2, sw - 36, rowH).fill();
      }

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

      // Buy button
      if (canAfford) {
        g.fill({ color: GREEN_GOOD, alpha: 0.7 }).roundRect(640, ry - 2, 50, 16, 3).fill();
        this._addText("Buy", 9, WHITE, true, 655, ry);
        this.clickZones.push({ id: `buy_${i + startIdx}`, x: 640, y: ry - 2, w: 50, h: 16 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // FACILITIES
  // -------------------------------------------------------------------------
  private _drawFacilities(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
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

      // Level pips
      for (let l = 0; l < 5; l++) {
        const pipX = x + 10 + l * 18;
        const pipY = y + 28;
        const filled = l < level;
        g.fill({ color: filled ? GOLD : DARK_WOOD, alpha: filled ? 0.9 : 0.4 }).circle(pipX + 6, pipY + 6, 6).fill();
        g.stroke({ color: GOLD_DARK, width: 1 }).circle(pipX + 6, pipY + 6, 6).stroke();
      }
      this._addText(`Level ${level}/5`, 10, PARCHMENT, false, x + 105, y + 28);

      // Upgrade info
      const nextUpgrade = FACILITY_UPGRADES.find(u => u.type === ft && u.level === level + 1);
      if (nextUpgrade) {
        this._addText(`Next: ${nextUpgrade.description}`, 9, PARCHMENT_DARK, false, x + 10, y + 48);
        this._addText(`Cost: ${nextUpgrade.cost}g | ${nextUpgrade.weeksToComplete} weeks`, 9, PARCHMENT_DARK, false, x + 10, y + 62);

        const canAfford = state.gold >= nextUpgrade.cost;
        const building = state.constructions.some(c => c.type === ft);
        if (!building && canAfford) {
          g.fill({ color: GREEN_GOOD, alpha: 0.7 }).roundRect(x + cardW - 70, y + 55, 60, 20, 3).fill();
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

  // -------------------------------------------------------------------------
  // LEAGUE TABLE
  // -------------------------------------------------------------------------
  private _drawLeague(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Grail Ball League");

    // Headers
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

    g.stroke({ color: GOLD_DARK, width: 1 }).moveTo(20, headerY + 16).lineTo(sw - 30, headerY + 16).stroke();

    for (let i = 0; i < state.leagueTable.length; i++) {
      const entry = state.leagueTable[i];
      const team = state.teams[entry.teamId];
      if (!team) continue;

      const ry = headerY + 22 + i * 28;
      const isPlayer = entry.teamId === state.playerTeamId;

      // Highlight player team
      if (isPlayer) {
        g.fill({ color: GOLD_DARK, alpha: 0.15 }).rect(18, ry - 4, sw - 36, 26).fill();
      }
      // Top 2 promotion zone
      if (i < 2) {
        g.fill({ color: GREEN_GOOD, alpha: 0.05 }).rect(18, ry - 4, sw - 36, 26).fill();
      }

      const posColor = i === 0 ? GOLD : i < 2 ? GREEN_GOOD : WHITE;
      this._addText(`${i + 1}`, 11, posColor, i === 0, colX.pos, ry);

      // Mini crest
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

      // Form dots
      for (let f = 0; f < entry.form.length; f++) {
        const fx = colX.form + f * 14;
        const formColor = entry.form[f] === "W" ? GREEN_GOOD : entry.form[f] === "L" ? RED_ACCENT : 0xcccc00;
        g.fill({ color: formColor }).circle(fx + 5, ry + 5, 5).fill();
        this._addText(entry.form[f], 7, WHITE, true, fx + 2, ry + 1);
      }
    }
  }

  // -------------------------------------------------------------------------
  // CUP
  // -------------------------------------------------------------------------
  private _drawCup(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Camelot Cup");

    // Draw bracket
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

        // Match box
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

        // Connector lines to next round
        if (r < 2) {
          g.stroke({ color: GOLD_DARK, width: 1, alpha: 0.4 })
            .moveTo(rx + roundWidth - 20, my + 25)
            .lineTo(rx + roundWidth, my + 25)
            .stroke();
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // CALENDAR
  // -------------------------------------------------------------------------
  private _drawCalendar(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Season Calendar");

    const cellW = Math.max(50, (sw - 60) / 7);
    const cellH = 28;
    const startY = top + 35;

    // Draw week numbers
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
          if (fixture.played) {
            this._addText(`${fixture.homeGoals}-${fixture.awayGoals}`, 7, GOLD, false, x + cellW - 30, y + 14);
          }
        }
      }
      if (hasCup) {
        this._addText("CUP", 7, 0xff4444, true, x + cellW - 28, y + 2);
      }
    }

    // Legend
    const legendY = startY + Math.ceil(state.seasonConfig.totalWeeks / 7) * cellH + 10;
    g.fill({ color: GREEN_GOOD, alpha: 0.3 }).rect(20, legendY, 12, 12).fill();
    this._addText("League Match", 9, PARCHMENT, false, 36, legendY);
    g.fill({ color: RED_ACCENT, alpha: 0.3 }).rect(120, legendY, 12, 12).fill();
    this._addText("Cup Match", 9, PARCHMENT, false, 136, legendY);
    g.fill({ color: GOLD_DARK, alpha: 0.5 }).rect(210, legendY, 12, 12).fill();
    this._addText("Current Week", 9, PARCHMENT, false, 226, legendY);
  }

  // -------------------------------------------------------------------------
  // RULES
  // -------------------------------------------------------------------------
  private _drawRules(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Rules & Information");

    const lines = RULES_TEXT.split("\n");
    const maxLines = Math.floor((sh - top - 60) / 16);
    const startIdx = state.scrollOffset;

    for (let i = 0; i < Math.min(maxLines, lines.length - startIdx); i++) {
      const line = lines[i + startIdx];
      const isTitle = line.includes("═") || line.includes("╔") || line.includes("╚") || line.includes("║");
      const isHeader = line.trim().endsWith(":") && !line.startsWith(" ");
      this._addText(line, isTitle ? 11 : 10, isTitle ? GOLD : isHeader ? GOLD_DARK : PARCHMENT, isTitle || isHeader, 25, top + 35 + i * 16, FONT_MONO);
    }

    if (lines.length > maxLines) {
      this._addText(`Scroll: Up/Down (${startIdx + 1}-${Math.min(startIdx + maxLines, lines.length)} of ${lines.length})`, 10, PARCHMENT_DARK, false, 25, sh - 25);
    }
  }

  // -------------------------------------------------------------------------
  // PLAYER DETAIL
  // -------------------------------------------------------------------------
  private _drawPlayerDetail(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    const team = state.teams[state.playerTeamId];
    if (!team || !state.selectedPlayerId) return;

    const player = team.squad.find(p => p.id === state.selectedPlayerId);
    if (!player) return;

    this._drawPanel(g, 10, top, sw - 20, sh - top - 10);

    // Portrait
    this._drawPlayerPortrait(g, 30, top + 20, player, team.teamDef);

    // Name and class
    const infoX = 130;
    this._addText(getPlayerFullName(player), 20, GOLD, true, infoX, top + 20);
    this._addText(`${player.class} | Age: ${player.age} | Potential: ${player.potential}`, 12, PARCHMENT, false, infoX, top + 46);
    this._addText(`Trait: ${player.trait}`, 12, BLUE_INFO, false, infoX, top + 64);
    this._addText(`Contract: ${player.contractYears} years | Wage: ${player.wage}g/wk`, 11, PARCHMENT_DARK, false, infoX, top + 82);
    this._addText(`Value: ${player.value}g`, 11, GOLD, false, infoX, top + 98);

    // Stats
    if (player.injury !== Injury.NONE) {
      this._addText(`INJURED: ${player.injury} (${player.injuryWeeks} weeks)`, 12, RED_ACCENT, true, infoX, top + 118);
    }

    // Season stats
    this._addText(`Matches: ${player.matchesPlayed} | Goals: ${player.goals} | Assists: ${player.assists}`, 11, PARCHMENT, false, infoX, top + 140);
    this._addText(`Avg Rating: ${player.rating.toFixed(1)}`, 11, PARCHMENT, false, infoX, top + 158);

    // Radar chart
    const radarX = sw / 2 + 60;
    const radarY = top + 140;
    const radarR = 80;
    this._drawRadarChart(g, radarX, radarY, radarR, player);

    // Stat bars
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
      g.stroke({ color: GOLD_DARK, width: 0.5 }).rect(barX + 65, sy, 200, 14).stroke();
      this._addText(`${value}`, 9, WHITE, true, barX + 68, sy + 1);
    }

    this._addText("Press Esc to go back", 10, PARCHMENT_DARK, false, 30, sh - 30);
  }

  // -------------------------------------------------------------------------
  // Radar Chart
  // -------------------------------------------------------------------------
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

    // Background rings
    for (let ring = 1; ring <= 4; ring++) {
      const r = (ring / 4) * radius;
      g.stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 });
      for (let i = 0; i < n; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = cx + Math.cos(angle) * r;
        const y = cy + Math.sin(angle) * r;
        if (i === 0) g.moveTo(x, y);
        else g.lineTo(x, y);
      }
      g.closePath().stroke();
    }

    // Axis lines
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      g.stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 })
        .moveTo(cx, cy)
        .lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius)
        .stroke();

      // Labels
      const lx = cx + Math.cos(angle) * (radius + 15) - 10;
      const ly = cy + Math.sin(angle) * (radius + 15) - 6;
      this._addText(`${stats[i].label}:${stats[i].value}`, 8, PARCHMENT, false, lx, ly);
    }

    // Stat polygon
    g.fill({ color: GOLD, alpha: 0.2 });
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const r = (stats[i].value / 100) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath().fill();

    // Stat polygon outline
    g.stroke({ color: GOLD, width: 2 });
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const r = (stats[i].value / 100) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      if (i === 0) g.moveTo(x, y);
      else g.lineTo(x, y);
    }
    g.closePath().stroke();

    // Stat dots
    for (let i = 0; i < n; i++) {
      const angle = i * angleStep - Math.PI / 2;
      const r = (stats[i].value / 100) * radius;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      g.fill({ color: GOLD }).circle(x, y, 3).fill();
    }
  }

  // -------------------------------------------------------------------------
  // Player Portrait (Procedural)
  // -------------------------------------------------------------------------
  private _drawPlayerPortrait(g: Graphics, x: number, y: number, player: PlayerDef, teamDef: TeamDef): void {
    const w = 80;
    const h = 100;

    // Frame
    g.fill({ color: DARK_WOOD, alpha: 0.9 }).roundRect(x, y, w, h, 4).fill();
    g.stroke({ color: GOLD_DARK, width: 2 }).roundRect(x, y, w, h, 4).stroke();

    // Background
    g.fill({ color: teamDef.color1, alpha: 0.3 }).roundRect(x + 3, y + 3, w - 6, h - 6, 3).fill();

    const cx = x + w / 2;
    const cy = y + h / 2 - 5;

    // Seed from player ID for consistency
    const seed = player.id.split("").reduce((s, c) => s + c.charCodeAt(0), 0);
    const rng = (offset: number) => ((seed * 9301 + offset * 49297) % 233280) / 233280;

    // Skin color
    const skinColors = [0xffe0bd, 0xf1c27d, 0xd4a574, 0xc68642, 0x8d5524];
    const skinColor = skinColors[Math.floor(rng(1) * skinColors.length)];

    // Head shape
    const headW = 18 + rng(2) * 8;
    const headH = 22 + rng(3) * 6;
    g.fill({ color: skinColor }).ellipse(cx, cy - 8, headW, headH).fill();

    // Eyes
    const eyeSpread = 6 + rng(4) * 4;
    const eyeY = cy - 12;
    g.fill({ color: WHITE }).ellipse(cx - eyeSpread, eyeY, 4, 3).fill();
    g.fill({ color: WHITE }).ellipse(cx + eyeSpread, eyeY, 4, 3).fill();
    const eyeColors = [0x2244aa, 0x224422, 0x442222, 0x222222, 0x888844];
    const eyeColor = eyeColors[Math.floor(rng(5) * eyeColors.length)];
    g.fill({ color: eyeColor }).circle(cx - eyeSpread, eyeY, 2).fill();
    g.fill({ color: eyeColor }).circle(cx + eyeSpread, eyeY, 2).fill();

    // Nose
    g.stroke({ color: lerpColor(skinColor, 0x000000, 0.2), width: 1 })
      .moveTo(cx, cy - 6)
      .lineTo(cx - 2 - rng(6) * 2, cy)
      .stroke();

    // Mouth
    g.stroke({ color: lerpColor(skinColor, 0x000000, 0.3), width: 1 })
      .moveTo(cx - 4, cy + 4)
      .quadraticCurveTo(cx, cy + 5 + rng(7) * 3, cx + 4, cy + 4)
      .stroke();

    // Headgear based on class
    switch (player.class) {
      case PlayerClass.GATEKEEPER:
        // Helmet
        g.fill({ color: 0x888888 })
          .moveTo(cx - headW - 3, cy - 10)
          .lineTo(cx, cy - headH - 15)
          .lineTo(cx + headW + 3, cy - 10)
          .closePath().fill();
        // Face guard
        g.stroke({ color: 0x666666, width: 1 })
          .moveTo(cx, cy - 8)
          .lineTo(cx, cy + 2)
          .stroke();
        break;
      case PlayerClass.KNIGHT:
        // Chain mail hood
        g.fill({ color: 0x999999, alpha: 0.7 })
          .arc(cx, cy - 8, headW + 4, -Math.PI, 0).fill();
        // Small cross
        g.stroke({ color: teamDef.color2, width: 2 })
          .moveTo(cx, cy - headH - 5)
          .lineTo(cx, cy - headH + 5)
          .moveTo(cx - 4, cy - headH)
          .lineTo(cx + 4, cy - headH)
          .stroke();
        break;
      case PlayerClass.ROGUE:
        // Hood
        g.fill({ color: 0x2d5016, alpha: 0.8 })
          .moveTo(cx - headW - 5, cy - 5)
          .quadraticCurveTo(cx, cy - headH - 18, cx + headW + 5, cy - 5)
          .fill();
        break;
      case PlayerClass.MAGE:
        // Wizard hat
        g.fill({ color: teamDef.color1, alpha: 0.8 })
          .moveTo(cx - headW - 2, cy - 10)
          .lineTo(cx + 5, cy - headH - 30)
          .lineTo(cx + headW + 8, cy - 10)
          .closePath().fill();
        // Star decoration
        g.fill({ color: GOLD })
          .circle(cx + 3, cy - headH - 10, 3).fill();
        break;
    }

    // Body (team colors)
    g.fill({ color: teamDef.color1 })
      .rect(cx - 14, cy + 14, 28, 30).fill();
    g.fill({ color: teamDef.color2 })
      .rect(cx - 10, cy + 16, 20, 4).fill(); // collar stripe

    // Overall badge
    const ovr = getOverall(player);
    g.fill({ color: DARK_WOOD, alpha: 0.8 }).circle(x + w - 14, y + h - 14, 12).fill();
    g.stroke({ color: GOLD_DARK, width: 1 }).circle(x + w - 14, y + h - 14, 12).stroke();
    this._addText(`${ovr}`, 9, GOLD, true, x + w - 20, y + h - 19);
  }

  // -------------------------------------------------------------------------
  // Mini Crest
  // -------------------------------------------------------------------------
  private _drawMiniCrest(g: Graphics, x: number, y: number, color1: number, color2: number, accent: number): void {
    // Shield shape
    g.fill({ color: color1 });
    g.moveTo(x, y);
    g.lineTo(x + 20, y);
    g.lineTo(x + 20, y + 16);
    g.lineTo(x + 10, y + 24);
    g.lineTo(x, y + 16);
    g.closePath().fill();

    // Inner accent
    g.fill({ color: color2, alpha: 0.6 });
    g.moveTo(x + 4, y + 3);
    g.lineTo(x + 16, y + 3);
    g.lineTo(x + 16, y + 13);
    g.lineTo(x + 10, y + 18);
    g.lineTo(x + 4, y + 13);
    g.closePath().fill();

    // Center dot
    g.fill({ color: accent }).circle(x + 10, y + 10, 3).fill();

    // Border
    g.stroke({ color: GOLD_DARK, width: 1 });
    g.moveTo(x, y);
    g.lineTo(x + 20, y);
    g.lineTo(x + 20, y + 16);
    g.lineTo(x + 10, y + 24);
    g.lineTo(x, y + 16);
    g.closePath().stroke();
  }

  // -------------------------------------------------------------------------
  // MATCH RESULT
  // -------------------------------------------------------------------------
  private _drawMatchResult(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    const result = state.lastMatchResult;
    if (!result) return;

    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Match Result");

    const homeName = state.teams[result.home]?.teamDef.name ?? result.home;
    const awayName = state.teams[result.away]?.teamDef.name ?? result.away;

    this._addText(`${homeName}  ${result.homeGoals} - ${result.awayGoals}  ${awayName}`, 22, GOLD, true, sw / 2 - 200, top + 40);

    // Key events
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

  // -------------------------------------------------------------------------
  // SEASON END
  // -------------------------------------------------------------------------
  private _drawSeasonEnd(g: Graphics, state: GrailManagerState, sw: number, sh: number): void {
    const cx = sw / 2;
    this._addText("Season Complete!", 28, GOLD, true, cx - 120, 50);

    // Final league position
    const pos = state.leagueTable.findIndex(e => e.teamId === state.playerTeamId) + 1;
    this._addText(`Final League Position: ${pos}`, 18, pos === 1 ? GOLD : WHITE, true, cx - 120, 100);

    if (pos === 1) {
      this._addText("LEAGUE CHAMPIONS!", 24, GOLD, true, cx - 130, 140);
      // Trophy animation
      const pulse = Math.sin(this._time * 3) * 5;
      g.fill({ color: GOLD, alpha: 0.3 }).circle(cx, 210 + pulse, 50).fill();
      g.fill({ color: GOLD }).circle(cx, 210 + pulse, 25).fill();
    }

    // Cup result
    const cupFinal = state.cupMatches.find(m => m.round === 2 && m.played);
    if (cupFinal && cupFinal.winnerId === state.playerTeamId) {
      this._addText("CAMELOT CUP WINNERS!", 20, GOLD, true, cx - 130, 280);
    }

    // Stats
    this._addText(`Wins: ${state.managerWins} | Draws: ${state.managerDraws} | Losses: ${state.managerLosses}`, 14, PARCHMENT, false, cx - 150, 340);
    this._addText(`Revenue: ${state.seasonRevenue}g | Expenses: ${state.seasonExpenses}g`, 14, PARCHMENT, false, cx - 150, 365);

    this._addText("Press Enter to start next season, Esc to return to menu", 12, PARCHMENT_DARK, false, cx - 200, sh - 40);
    this.clickZones.push({ id: "next_season", x: 0, y: sh - 50, w: sw, h: 50 });
  }

  // -------------------------------------------------------------------------
  // SAVE/LOAD
  // -------------------------------------------------------------------------
  private _drawSaveLoad(g: Graphics, _state: GrailManagerState, sw: number, sh: number): void {
    const top = 60;
    this._drawPanel(g, 10, top, sw - 20, sh - top - 10, "Save / Load Game");

    for (let i = 0; i < 3; i++) {
      const y = top + 40 + i * 70;
      const has = hasSave(i);
      this._drawPanel(g, 30, y, sw - 80, 55);
      this._addText(`Slot ${i + 1}: ${has ? "Save data found" : "Empty"}`, 12, has ? WHITE : PARCHMENT_DARK, false, 50, y + 10);

      // Save button
      g.fill({ color: GREEN_GOOD, alpha: 0.7 }).roundRect(sw - 200, y + 8, 60, 20, 3).fill();
      this._addText("Save", 10, WHITE, true, sw - 188, y + 10);
      this.clickZones.push({ id: `save_${i}`, x: sw - 200, y: y + 8, w: 60, h: 20 });

      // Load button
      if (has) {
        g.fill({ color: BLUE_INFO, alpha: 0.7 }).roundRect(sw - 130, y + 8, 60, 20, 3).fill();
        this._addText("Load", 10, WHITE, true, sw - 118, y + 10);
        this.clickZones.push({ id: `load_${i}`, x: sw - 130, y: y + 8, w: 60, h: 20 });
      }
    }

    this._addText("Press Esc to go back", 10, PARCHMENT_DARK, false, 30, sh - 30);
  }

  // -------------------------------------------------------------------------
  // Text helper
  // -------------------------------------------------------------------------
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
