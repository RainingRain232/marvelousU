// ---------------------------------------------------------------------------
// Plague Doctor — renderer (PixiJS) — v4 with abilities, harbinger, weather,
// wave flash, log panel, warn/attack buttons, storm visual, barricade tile,
// threat indicators, warned house indicators
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { PlagueState } from "../state/PlagueState";
import { PlaguePhase, TileType, InfectionLevel, WeatherType } from "../state/PlagueState";
import {
  PlagueConfig, TILE_COLORS, INFECTION_COLORS, INFECTION_LABELS,
  DISTRICT_NAMES, DISTRICT_COLORS, MUTATION_NAMES, RATING_THRESHOLDS,
  WEATHER_INFO,
} from "../config/PlagueConfig";
import { getAvailableActions, getInfectionStats } from "../systems/PlagueSystem";

const TS = PlagueConfig.TILE_SIZE;
const FONT = "Georgia, serif";
function mkStyle(opts: Partial<TextStyle>): TextStyle { return new TextStyle({ fontFamily: FONT, ...opts } as any); }

interface Particle { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; color: number; size: number; }

export class PlagueRenderer {
  container = new Container();
  private _gfx = new Graphics();
  private _uiContainer = new Container();
  private _textCache: Text[] = [];
  private _particles: Particle[] = [];

  // Callbacks
  private _onEndTurn: (() => void) | null = null;
  private _onTreat: (() => void) | null = null;
  private _onGather: (() => void) | null = null;
  private _onCraft: (() => void) | null = null;
  private _onRest: (() => void) | null = null;
  private _onQuarantine: (() => void) | null = null;
  private _onFumigate: (() => void) | null = null;
  private _onKillRat: (() => void) | null = null;
  private _onBuy: ((item: string) => void) | null = null;
  private _onUndo: (() => void) | null = null;
  private _onDismissTutorial: (() => void) | null = null;
  private _onExit: (() => void) | null = null;
  private _onTileClick: ((x: number, y: number) => void) | null = null;
  private _onHover: ((x: number, y: number) => void) | null = null;
  private _onPerkSelect: ((index: number) => void) | null = null;
  private _onEventChoice: ((index: number) => void) | null = null;
  private _onUseAbility: ((id: string) => void) | null = null;
  private _onWarn: (() => void) | null = null;
  private _onAttackHarbinger: (() => void) | null = null;
  private _onToggleLog: (() => void) | null = null;

  private _ox = 0;
  private _oy = 0;

  init(_sw: number, _sh: number): void {
    this.container.removeChildren();
    this._gfx = new Graphics();
    this._uiContainer = new Container();
    this._particles = [];
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiContainer);

    this._gfx.eventMode = "static";
    this._gfx.on("pointerdown", (e) => {
      const gx = Math.floor((e.global.x - this._ox) / TS);
      const gy = Math.floor((e.global.y - this._oy) / TS);
      if (this._onTileClick) this._onTileClick(gx, gy);
    });
    this._gfx.on("pointermove", (e) => {
      const gx = Math.floor((e.global.x - this._ox) / TS);
      const gy = Math.floor((e.global.y - this._oy) / TS);
      if (this._onHover) this._onHover(gx, gy);
    });
  }

  setCallbacks(cbs: {
    endTurn: () => void; treat: () => void; gather: () => void; craft: () => void;
    rest: () => void; quarantine: () => void; fumigate: () => void; killRat: () => void;
    buy: (item: string) => void; undo: () => void; exit: () => void;
    tileClick: (x: number, y: number) => void; hover: (x: number, y: number) => void;
    perkSelect: (index: number) => void; eventChoice: (index: number) => void;
    useAbility: (id: string) => void; warn: () => void; attackHarbinger: () => void;
    toggleLog: () => void; dismissTutorial: () => void;
  }): void {
    this._onEndTurn = cbs.endTurn; this._onTreat = cbs.treat; this._onGather = cbs.gather;
    this._onCraft = cbs.craft; this._onRest = cbs.rest; this._onQuarantine = cbs.quarantine;
    this._onFumigate = cbs.fumigate; this._onKillRat = cbs.killRat; this._onBuy = cbs.buy;
    this._onUndo = cbs.undo; this._onExit = cbs.exit; this._onTileClick = cbs.tileClick;
    this._onHover = cbs.hover; this._onPerkSelect = cbs.perkSelect; this._onEventChoice = cbs.eventChoice;
    this._onUseAbility = cbs.useAbility; this._onWarn = cbs.warn;
    this._onAttackHarbinger = cbs.attackHarbinger; this._onToggleLog = cbs.toggleLog;
    this._onDismissTutorial = cbs.dismissTutorial;
  }

  draw(state: PlagueState, sw: number, sh: number, dt: number): void {
    this._gfx.clear();
    this._clearTexts();
    this._tickParticles(dt);
    this._spawnMiasma(state);

    const gridW = state.cols * TS, gridH = state.rows * TS;
    this._ox = Math.floor((sw - gridW) / 2);
    this._oy = 52;
    const ox = this._ox, oy = this._oy;

    let shakeX = 0, shakeY = 0;
    if (state.deathShake > 0) { shakeX = (Math.random() - 0.5) * state.deathShake * 12; shakeY = (Math.random() - 0.5) * state.deathShake * 12; }

    // Day/night tint — shifts based on day
    const dayPhase = (state.day % 3) / 3; // 0..1 cycling
    const nightAlpha = Math.max(0, Math.sin(dayPhase * Math.PI * 2 - Math.PI / 2) * 0.08);

    // Background with grass texture noise
    this._gfx.rect(0, 0, sw, sh).fill({ color: 0x0e0e0a });
    // Grass noise patches outside the grid
    const gridLeft = ox, gridRight = ox + gridW, gridTop = oy, gridBottom = oy + gridH;
    for (let gy = 0; gy < sh; gy += 11) {
      for (let gx = 0; gx < sw; gx += 13) {
        // Skip areas inside the grid
        if (gx >= gridLeft - 2 && gx <= gridRight + 2 && gy >= gridTop - 2 && gy <= gridBottom + 2) continue;
        const hash = ((gx * 7 + gy * 13 + 37) * 2654435761) >>> 0;
        const r = (hash % 100) / 100;
        if (r < 0.45) {
          const shade = 0x0a1a08 + ((hash >> 8) % 3) * 0x010200;
          const sz = 2 + (hash >> 12) % 4;
          this._gfx.circle(gx + (hash % 7) - 3, gy + ((hash >> 4) % 7) - 3, sz).fill({ color: shade, alpha: 0.25 + r * 0.3 });
        }
        if (r > 0.85) {
          // Occasional brighter tuft
          this._gfx.circle(gx, gy, 1.5).fill({ color: 0x1a2a12, alpha: 0.3 });
          this._gfx.circle(gx + 2, gy - 1, 1).fill({ color: 0x162410, alpha: 0.25 });
        }
      }
    }

    // Grid
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        const tx = ox + x * TS + shakeX, ty = oy + y * TS + shakeY;

        if (!tile.revealed && tile.type !== TileType.WALL) {
          // Unrevealed: dark
          this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x080808, alpha: 0.95 });
          continue;
        }

        this._drawTile(state, tile, x, tx, ty);

        // Fog overlay for non-visible revealed tiles
        if (!tile.visible && tile.type !== TileType.WALL) {
          this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x000000, alpha: 0.55 });
          // Show last known infection as a dim indicator
          if (tile.type === TileType.HOUSE && tile.lastSeenInfection > InfectionLevel.HEALTHY && tile.lastSeenInfection < InfectionLevel.DEAD) {
            this._gfx.circle(tx + TS / 2, ty + TS / 2, 4).fill({ color: INFECTION_COLORS[tile.lastSeenInfection], alpha: 0.4 });
          }
        }

        // Warned house indicator
        if (tile.type === TileType.HOUSE && tile.warned > 0 && tile.visible) {
          this._gfx.roundRect(tx + 1, ty + 1, TS - 3, TS - 3, 3)
            .stroke({ color: 0x4488ff, width: 1.5, alpha: 0.4 + Math.sin(state.time * 2) * 0.1 });
          this._addText(`${tile.warned}`, tx + TS - 9, ty + TS - 12, { fontSize: 7, fill: 0x4488ff, fontWeight: "bold" });
        }

        // Threat indicators
        if (tile.visible && tile.type === TileType.HOUSE && tile.infection === InfectionLevel.HEALTHY && tile.threatLevel > 0.3) {
          this._drawThreatIndicators(state, x, y, tx, ty, tile.threatLevel);
        }
      }
    }

    // Movement range
    if (state.phase === PlaguePhase.PLAYING && state.movesLeft > 0) this._drawMoveRange(state, ox + shakeX, oy + shakeY);

    // Path preview
    if (state.movePath.length > 0 && state.phase === PlaguePhase.PLAYING) {
      for (let i = 0; i < Math.min(state.movePath.length, state.movesLeft); i++) {
        const p = state.movePath[i];
        this._gfx.roundRect(ox + p.x * TS + shakeX + 4, oy + p.y * TS + shakeY + 4, TS - 9, TS - 9, 3)
          .stroke({ color: 0x4488ff, width: 2, alpha: 0.5 + Math.sin(state.time * 4) * 0.2 });
      }
    }

    // Rats (only visible ones)
    for (const rat of state.rats) {
      if (rat.x >= 0 && rat.y >= 0 && rat.x < state.cols && rat.y < state.rows && state.grid[rat.y][rat.x].visible) {
        const rx = ox + rat.x * TS + shakeX, ry = oy + rat.y * TS + shakeY;
        const wobble = Math.sin(state.time * 8 + rat.id * 2) * 2;
        this._gfx.circle(rx + TS / 2 + wobble, ry + TS / 2 + 4, 5).fill({ color: 0x665533 });
        this._gfx.circle(rx + TS / 2 + wobble + 4, ry + TS / 2 + 2, 3).fill({ color: 0x554422 });
        this._gfx.circle(rx + TS / 2 + wobble + 6, ry + TS / 2 + 1, 1).fill({ color: 0xff3333 });
        this._gfx.moveTo(rx + TS / 2 + wobble - 5, ry + TS / 2 + 4)
          .quadraticCurveTo(rx + TS / 2 + wobble - 10, ry + TS / 2 - 2, rx + TS / 2 + wobble - 12, ry + TS / 2 + 6)
          .stroke({ color: 0x665533, width: 1.5 });
      }
    }

    // Harbinger
    if (state.harbinger && !state.harbingerDefeated) {
      this._drawHarbinger(state, ox + shakeX, oy + shakeY);
    }

    // Apprentice
    if (state.apprentice) {
      const a = state.apprentice;
      a.animX += (a.x - a.animX) * Math.min(1, dt * 8);
      a.animY += (a.y - a.animY) * Math.min(1, dt * 8);
      const ax = ox + a.animX * TS + shakeX, ay = oy + a.animY * TS + shakeY;
      this._gfx.circle(ax + TS / 2, ay + TS / 2, TS * 0.35).fill({ color: 0x4488ff, alpha: 0.1 });
      this._gfx.ellipse(ax + TS / 2, ay + TS / 2 + 4, 6, 10).fill({ color: 0x334455 });
      this._gfx.circle(ax + TS / 2, ay + TS / 2 - 6, 5).fill({ color: 0xddccaa });
      this._addText("A", ax + TS / 2, ay + 3, { fontSize: 8, fill: 0x4488ff, fontWeight: "bold" }, true);
    }

    // Player
    state.animPx += (state.px - state.animPx) * Math.min(1, dt * PlagueConfig.MOVE_ANIM_SPEED);
    state.animPy += (state.py - state.animPy) * Math.min(1, dt * PlagueConfig.MOVE_ANIM_SPEED);
    this._drawDoctor(ox + state.animPx * TS + shakeX, oy + state.animPy * TS + shakeY, state.time, state.health <= 3);

    // Particles
    for (const p of this._particles) {
      this._gfx.circle(p.x + shakeX, p.y + shakeY, p.size).fill({ color: p.color, alpha: (p.life / p.maxLife) * 0.5 });
    }

    // Hover tooltip
    if (state.hoverX >= 0 && state.hoverX < state.cols && state.hoverY >= 0 && state.hoverY < state.rows) {
      const ht = state.grid[state.hoverY][state.hoverX];
      if (ht.visible && ht.type !== TileType.WALL && ht.type !== TileType.EMPTY) {
        this._drawTooltip(state, ht, state.hoverX, state.hoverY, ox + shakeX, oy + shakeY, sw);
      }
    }

    // Night overlay
    if (nightAlpha > 0) this._gfx.rect(0, 0, sw, sh).fill({ color: 0x0a0a33, alpha: nightAlpha });

    // Storm visual — diagonal rain lines
    if (state.weather === WeatherType.STORM) {
      this._drawStormRain(state, sw, sh);
    }

    // Wave flash overlay
    if (state.waveFlash > 0) {
      const pulseAlpha = state.waveFlash * (0.08 + Math.sin(state.time * 10) * 0.04);
      this._gfx.rect(0, 0, sw, sh).fill({ color: 0xaa2266, alpha: pulseAlpha });
    }

    // HUD
    this._drawHUD(state, sw);

    // Bottom panel
    const bottomY = oy + gridH + 8;
    this._drawActionPanel(state, sw, sh, bottomY);

    // Minimap
    this._drawMinimap(state, sw, bottomY);

    // Log panel
    if (state.showLog) {
      this._drawLogPanel(state, sw, oy, gridH);
    }

    // Combo indicator
    if (state.treatedThisTurn > 1 && state.phase === PlaguePhase.PLAYING) {
      const comboStr = `COMBO x${state.treatedThisTurn}!`;
      this._gfx.roundRect(sw / 2 - 50, oy - 2, 100, 18, 4).fill({ color: 0xffd700, alpha: 0.15 });
      this._addText(comboStr, sw / 2, oy, { fontSize: 11, fill: 0xffd700, fontWeight: "bold" }, true);
    }

    // Announcements
    let ay = oy + gridH - 10;
    for (let i = state.announcements.length - 1; i >= 0; i--) {
      const a = state.announcements[i];
      const alpha = Math.min(1, a.timer / 0.5);
      const fadeY = a.timer < 0.5 ? (1 - a.timer / 0.5) * -8 : 0;
      this._gfx.roundRect(sw / 2 - 170, ay - 13 + fadeY, 340, 19, 4).fill({ color: 0x000000, alpha: 0.7 * alpha });
      this._addText(a.text, sw / 2, ay - 11 + fadeY, { fontSize: 9, fill: a.color }, true);
      ay -= 22;
    }

    // Turn flash
    if (state.turnFlashTimer > 0) this._gfx.rect(0, 0, sw, sh).fill({ color: 0xffffff, alpha: state.turnFlashTimer * 0.08 });

    // Infection tendrils — draw lines from infected houses toward healthy neighbors
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        if (!tile.visible || tile.type !== TileType.HOUSE || tile.infection < InfectionLevel.INFECTED) continue;
        if (tile.quarantined) continue;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, ny = y + dy;
          if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) continue;
          const neighbor = state.grid[ny][nx];
          if (neighbor.type === TileType.HOUSE && neighbor.infection === InfectionLevel.HEALTHY && !neighbor.quarantined) {
            const sx = ox + x * TS + TS / 2 + shakeX, sy2 = oy + y * TS + TS / 2 + shakeY;
            const ex = ox + nx * TS + TS / 2 + shakeX, ey = oy + ny * TS + TS / 2 + shakeY;
            const pulse = 0.15 + Math.sin(state.time * 3 + x * 0.7 + y * 1.3) * 0.1;
            this._gfx.moveTo(sx, sy2).lineTo(ex, ey).stroke({ color: 0xcc3333, width: 1.5, alpha: pulse });
            // Arrow head
            const mx = (sx + ex) / 2, my = (sy2 + ey) / 2;
            this._gfx.circle(mx, my, 2).fill({ color: 0xcc3333, alpha: pulse + 0.1 });
          }
        }
      }
    }

    // Challenge tracker + morale (left sidebar with dark background, below HUD)
    if (state.phase === PlaguePhase.PLAYING && state.challenges.length > 0) {
      const panelH = state.challenges.length * 11 + 18;
      const panelW = 175;
      this._gfx.roundRect(2, 52, panelW, panelH, 3).fill({ color: 0x0a0a08, alpha: 0.85 });

      let cy = 54;
      for (let i = 0; i < state.challenges.length; i++) {
        const c = state.challenges[i];
        const check = c.completed ? "\u2713" : "\u2022";
        const color = c.completed ? 0x44cc44 : 0xaa9977;
        const progress = c.completed ? "DONE" : `${c.current}/${c.target}`;
        this._addText(`${check} ${c.desc} [${progress}]`, 6, cy, { fontSize: 6, fill: color });
        cy += 11;
      }

      // Morale bar (inside the same panel)
      cy += 2;
      const moraleColor = state.morale >= 60 ? 0x44aa44 : state.morale >= 30 ? 0xddaa33 : 0xff4444;
      this._addText("Morale", 6, cy, { fontSize: 6, fill: 0x777766 });
      this._gfx.roundRect(42, cy + 1, 40, 4, 2).fill({ color: 0x222211 });
      this._gfx.roundRect(42, cy + 1, 40 * (state.morale / 100), 4, 2).fill({ color: moraleColor });
      this._addText(`${state.morale}`, 86, cy, { fontSize: 6, fill: moraleColor });
    }

    // Tutorial hints (center of screen, dismissible)
    if (state.tutorialHints.length > 0) {
      const thw = 340, thh = state.tutorialHints.length * 16 + 30;
      const thx = (sw - thw) / 2, thy = sh * 0.15;
      this._gfx.roundRect(thx, thy, thw, thh, 6).fill({ color: 0x111108, alpha: 0.92 });
      this._gfx.roundRect(thx, thy, thw, thh, 6).stroke({ color: 0xccaa55, width: 1, alpha: 0.4 });
      let tty = thy + 6;
      this._addText("TUTORIAL", thx + thw / 2, tty, { fontSize: 10, fill: 0xccaa55, fontWeight: "bold" }, true);
      tty += 16;
      for (const hint of state.tutorialHints) {
        this._addText(hint, thx + 10, tty, { fontSize: 8, fill: 0xbbaa88 });
        tty += 14;
      }
      // Dismiss button
      this._drawButton(thx + thw / 2 - 40, tty + 2, 80, 18, "Got it! (H)", 0xccaa55, true, () => {
        if (this._onDismissTutorial) this._onDismissTutorial();
      });
    }

    // Perk selection overlay
    if (state.phase === PlaguePhase.PERK_SELECT) this._drawPerkOverlay(state, sw, sh);

    // Event choice overlay
    if (state.phase === PlaguePhase.EVENT_CHOICE) this._drawEventOverlay(state, sw, sh);
  }

  // ── Perk selection overlay ─────────────────────────────────────────────────

  private _drawPerkOverlay(state: PlagueState, sw: number, sh: number): void {
    this._gfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    const pw = 380, ph = 50 * state.perkChoices.length + 60;
    const px = (sw - pw) / 2, py = (sh - ph) / 2;
    this._gfx.roundRect(px, py, pw, ph, 8).fill({ color: 0x12100a, alpha: 0.97 });
    this._gfx.roundRect(px, py, pw, ph, 8).stroke({ color: 0xccaa55, width: 2, alpha: 0.6 });

    this._addText("CHOOSE A PERK", sw / 2, py + 12, { fontSize: 14, fill: 0xccaa55, fontWeight: "bold", letterSpacing: 3 }, true);
    this._addText(`Day ${state.day} upgrade`, sw / 2, py + 32, { fontSize: 9, fill: 0x888877 }, true);

    let y = py + 52;
    for (let i = 0; i < state.perkChoices.length; i++) {
      const perk = state.perkChoices[i];
      const bw = pw - 30, bh = 42;
      const bx = px + 15;
      this._drawButton(bx, y, bw, bh, "", perk.color, true, () => {
        if (this._onPerkSelect) this._onPerkSelect(i);
      });
      this._addText(perk.name, bx + 10, y + 6, { fontSize: 11, fill: perk.color, fontWeight: "bold" });
      this._addText(perk.desc, bx + 10, y + 22, { fontSize: 8, fill: 0xaaaaaa });
      this._addText(`[${i + 1}]`, bx + bw - 25, y + 10, { fontSize: 10, fill: 0x666655 });
      y += bh + 6;
    }
  }

  // ── Event choice overlay ───────────────────────────────────────────────────

  private _drawEventOverlay(state: PlagueState, sw: number, sh: number): void {
    if (!state.currentEvent) return;
    const ev = state.currentEvent;

    this._gfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    const pw = 420, choiceH = 32 * ev.choices.length;
    const ph = 110 + choiceH;
    const px = (sw - pw) / 2, py = (sh - ph) / 2;
    this._gfx.roundRect(px, py, pw, ph, 8).fill({ color: 0x12100a, alpha: 0.97 });
    this._gfx.roundRect(px, py, pw, ph, 8).stroke({ color: 0xddaa44, width: 2, alpha: 0.6 });

    this._addText(ev.title, sw / 2, py + 14, { fontSize: 14, fill: 0xddaa44, fontWeight: "bold", letterSpacing: 2 }, true);

    // Word-wrap text
    const maxLineW = pw - 40;
    const words = ev.text.split(" ");
    let line = "", ty = py + 40;
    for (const word of words) {
      const test = line ? line + " " + word : word;
      if (test.length * 5.5 > maxLineW) {
        this._addText(line, sw / 2, ty, { fontSize: 9, fill: 0xbbaa99 }, true);
        ty += 14;
        line = word;
      } else {
        line = test;
      }
    }
    if (line) { this._addText(line, sw / 2, ty, { fontSize: 9, fill: 0xbbaa99 }, true); ty += 14; }

    ty += 8;
    for (let i = 0; i < ev.choices.length; i++) {
      const choice = ev.choices[i];
      const bw = pw - 40, bh = 26;
      const bx = px + 20;
      this._drawButton(bx, ty, bw, bh, `[${i + 1}] ${choice.label}`, 0xddaa44, true, () => {
        if (this._onEventChoice) this._onEventChoice(i);
      });
      ty += bh + 4;
    }
  }

  // ── Tile rendering ─────────────────────────────────────────────────────────

  private _drawTile(state: PlagueState, tile: typeof state.grid[0][0], gx: number, tx: number, ty: number): void {
    const tileInfo = TILE_COLORS[tile.type] ?? TILE_COLORS[0];

    if (tile.type === TileType.WALL) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x555555 });
      // Stone bricks with variation and mortar lines
      for (let sy = 0; sy < TS; sy += 8) {
        const rowIdx = sy / 8;
        const offset = rowIdx % 2 === 0 ? 0 : 10;
        // Horizontal mortar line
        this._gfx.moveTo(tx, ty + sy).lineTo(tx + TS - 1, ty + sy)
          .stroke({ color: 0x3a3a32, width: 0.8, alpha: 0.7 });
        for (let sx = offset; sx < TS - 1; sx += 20) {
          const brickW = Math.min(18, TS - 1 - sx);
          // Stone color variation per brick
          const hash = ((tx + sx) * 31 + (ty + sy) * 17) >>> 0;
          const variation = (hash % 30) - 15;
          const stoneR = Math.max(0, Math.min(255, 0x55 + variation));
          const stoneColor = (stoneR << 16) | (stoneR << 8) | (stoneR - 5);
          this._gfx.rect(tx + sx + 1, ty + sy + 1, brickW - 2, 5).fill({ color: stoneColor, alpha: 0.5 });
          // Vertical mortar between bricks
          this._gfx.moveTo(tx + sx, ty + sy).lineTo(tx + sx, ty + sy + 7)
            .stroke({ color: 0x3a3a32, width: 0.6, alpha: 0.6 });
          // Subtle highlight on top edge of brick
          this._gfx.moveTo(tx + sx + 1, ty + sy + 1).lineTo(tx + sx + brickW - 1, ty + sy + 1)
            .stroke({ color: 0x666666, width: 0.4, alpha: 0.3 });
        }
      }
      return;
    }

    if (tile.type === TileType.ROAD) {
      const distColor = DISTRICT_COLORS[tile.district] ?? 0x504030;
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: distColor, alpha: 0.6 });
      // Cobblestone pattern
      for (let cy = 2; cy < TS - 4; cy += 7) {
        for (let cx = 2 + ((cy / 7) % 2) * 4; cx < TS - 4; cx += 9) {
          const hash = ((tx + cx) * 23 + (ty + cy) * 41) >>> 0;
          const sizeVar = (hash % 3) - 1;
          const cw = 7 + sizeVar, ch = 5 + ((hash >> 4) % 2);
          // Slight color variation per cobble
          const bright = (hash >> 8) % 20 - 10;
          const cobbleAlpha = 0.25 + ((hash >> 12) % 15) / 100;
          this._gfx.roundRect(tx + cx, ty + cy, cw, ch, 1).fill({ color: distColor, alpha: cobbleAlpha });
          this._gfx.roundRect(tx + cx, ty + cy, cw, ch, 1).stroke({ color: 0x333322, width: 0.3, alpha: 0.5 });
          // Highlight on one edge
          if (bright > 0) {
            this._gfx.moveTo(tx + cx + 1, ty + cy + 1).lineTo(tx + cx + cw - 1, ty + cy + 1)
              .stroke({ color: 0x665544, width: 0.3, alpha: 0.25 });
          }
        }
      }
      // Scattered loose stone details
      for (let i = 0; i < 3; i++) {
        const hash2 = ((tx * 7 + ty * 13 + i * 31 + 97) * 2654435761) >>> 0;
        const sx = 3 + (hash2 % (TS - 8));
        const sy = 3 + ((hash2 >> 8) % (TS - 8));
        const sr = 0.8 + ((hash2 >> 16) % 10) / 10;
        if ((hash2 >> 24) % 3 === 0) {
          this._gfx.circle(tx + sx, ty + sy, sr).fill({ color: 0x44392c, alpha: 0.3 });
        }
      }
      return;
    }

    if (tile.type === TileType.BARRICADE) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x443322, alpha: 0.7 });
      // Wooden X-pattern barrier
      this._gfx.moveTo(tx + 4, ty + 4).lineTo(tx + TS - 5, ty + TS - 5)
        .stroke({ color: 0x886644, width: 4, alpha: 0.9 });
      this._gfx.moveTo(tx + TS - 5, ty + 4).lineTo(tx + 4, ty + TS - 5)
        .stroke({ color: 0x886644, width: 4, alpha: 0.9 });
      // Cross beams with lighter highlights
      this._gfx.moveTo(tx + 5, ty + 5).lineTo(tx + TS - 6, ty + TS - 6)
        .stroke({ color: 0xaa8866, width: 1.5, alpha: 0.5 });
      this._gfx.moveTo(tx + TS - 6, ty + 5).lineTo(tx + 5, ty + TS - 6)
        .stroke({ color: 0xaa8866, width: 1.5, alpha: 0.5 });
      // Nail dots at center and corners
      this._gfx.circle(tx + TS / 2, ty + TS / 2, 2).fill({ color: 0x555555, alpha: 0.8 });
      this._gfx.circle(tx + 7, ty + 7, 1.5).fill({ color: 0x555555, alpha: 0.6 });
      this._gfx.circle(tx + TS - 8, ty + 7, 1.5).fill({ color: 0x555555, alpha: 0.6 });
      this._gfx.circle(tx + 7, ty + TS - 8, 1.5).fill({ color: 0x555555, alpha: 0.6 });
      this._gfx.circle(tx + TS - 8, ty + TS - 8, 1.5).fill({ color: 0x555555, alpha: 0.6 });
      return;
    }

    if (tile.type === TileType.HOUSE || tile.type === TileType.CEMETERY) {
      let baseColor = tileInfo.bg;
      baseColor = this._blendColors(baseColor, DISTRICT_COLORS[tile.district] ?? 0, 0.15);
      if (tile.infection > InfectionLevel.HEALTHY) baseColor = INFECTION_COLORS[tile.infection];

      let pulseAlpha = 0.88;
      if (tile.infection === InfectionLevel.DYING) pulseAlpha = 0.7 + Math.sin(state.time * 6) * 0.15;
      else if (tile.infection === InfectionLevel.INFECTED) pulseAlpha = 0.8 + Math.sin(state.time * 3) * 0.08;

      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: baseColor, alpha: pulseAlpha });

      if (tile.type === TileType.HOUSE) {
        this._gfx.moveTo(tx + 4, ty + TS * 0.45).lineTo(tx + TS / 2, ty + 4).lineTo(tx + TS - 5, ty + TS * 0.45).closePath()
          .fill({ color: tile.infection === InfectionLevel.HEALTHY ? 0x664422 : this._darken(baseColor, 0.3), alpha: 0.6 });
        this._gfx.rect(tx + TS / 2 - 3, ty + TS - 14, 6, 10).fill({ color: 0x442200, alpha: 0.5 });
        if (tile.infection >= InfectionLevel.INFECTED) {
          this._gfx.rect(tx + 8, ty + TS * 0.5, 5, 5).fill({ color: 0xffaa33, alpha: 0.4 + Math.sin(state.time * 4 + gx) * 0.2 });
        } else if (tile.infection === InfectionLevel.HEALTHY) {
          this._gfx.rect(tx + 8, ty + TS * 0.5, 5, 5).fill({ color: 0xffdd88, alpha: 0.3 });
        }
        for (let i = 0; i < Math.min(tile.population, 6); i++) {
          this._gfx.circle(tx + 6 + i * 5, ty + TS - 6, 1.5).fill({ color: 0xddddcc, alpha: 0.6 });
        }
        if (tile.infection > InfectionLevel.HEALTHY && tile.infection < InfectionLevel.DEAD) {
          this._addText(INFECTION_LABELS[tile.infection], tx + TS / 2, ty + 1, { fontSize: 7, fill: 0xffffff, fontWeight: "bold" }, true);
        }
      } else {
        this._gfx.rect(tx + TS / 2 - 3, ty + TS * 0.3, 6, 12).fill({ color: 0x777777, alpha: 0.7 });
        this._gfx.roundRect(tx + TS / 2 - 4, ty + TS * 0.25, 8, 6, 2).fill({ color: 0x888888, alpha: 0.7 });
      }

      if (tile.quarantined) {
        this._gfx.moveTo(tx + 2, ty + 2).lineTo(tx + TS - 3, ty + TS - 3).stroke({ color: 0xff2222, width: 2, alpha: 0.6 });
        this._gfx.moveTo(tx + TS - 3, ty + 2).lineTo(tx + 2, ty + TS - 3).stroke({ color: 0xff2222, width: 2, alpha: 0.6 });
      }
      if (tile.fumigated > 0) {
        this._gfx.roundRect(tx + 1, ty + 1, TS - 3, TS - 3, 3).stroke({ color: 0x88ffaa, width: 2, alpha: 0.3 + Math.sin(state.time * 2) * 0.15 });
        this._addText(`${tile.fumigated}`, tx + TS - 8, ty + 2, { fontSize: 7, fill: 0x88ffaa });
      }
      return;
    }

    // Special buildings (well, church, workshop, market)
    if (tile.type === TileType.WELL) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x334433, alpha: 0.7 });
      this._gfx.circle(tx + TS / 2, ty + TS / 2, TS * 0.3).fill({ color: 0x225588, alpha: 0.6 });
      this._gfx.circle(tx + TS / 2, ty + TS / 2, TS * 0.3).stroke({ color: 0x886644, width: 2, alpha: 0.7 });
      this._addText("Herbs", tx + TS / 2, ty + TS - 10, { fontSize: 7, fill: 0x66aa66 }, true);
    } else if (tile.type === TileType.CHURCH) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x887755, alpha: 0.7 });
      this._gfx.rect(tx + TS * 0.3, ty + 6, TS * 0.4, TS * 0.6).fill({ color: 0xaa9966, alpha: 0.5 });
      this._gfx.rect(tx + TS / 2 - 1, ty + 1, 2, 6).fill({ color: 0xddcc88, alpha: 0.8 });
      this._gfx.rect(tx + TS / 2 - 3, ty + 3, 6, 2).fill({ color: 0xddcc88, alpha: 0.8 });
      this._gfx.circle(tx + TS / 2, ty + TS * 0.4, TS * 0.35).fill({ color: 0xffddaa, alpha: 0.06 });
      this._addText("Church", tx + TS / 2, ty + TS - 10, { fontSize: 7, fill: 0xddcc88 }, true);
    } else if (tile.type === TileType.WORKSHOP) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x554422, alpha: 0.7 });
      this._gfx.rect(tx + TS * 0.25, ty + TS * 0.5, TS * 0.5, TS * 0.15).fill({ color: 0x666666, alpha: 0.7 });
      this._gfx.rect(tx + TS * 0.35, ty + TS * 0.35, TS * 0.3, TS * 0.15).fill({ color: 0x777777, alpha: 0.7 });
      this._addText("Workshop", tx + TS / 2, ty + TS - 10, { fontSize: 6, fill: 0xddaa66 }, true);
    } else if (tile.type === TileType.MARKET) {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: 0x775533, alpha: 0.7 });
      this._gfx.rect(tx + 3, ty + 4, TS - 7, TS * 0.25).fill({ color: 0xcc4444, alpha: 0.5 });
      this._gfx.rect(tx + 4, ty + TS * 0.35, TS - 9, 4).fill({ color: 0x886644, alpha: 0.6 });
      this._addText("Market", tx + TS / 2, ty + TS - 10, { fontSize: 7, fill: 0xddcc44 }, true);
    } else {
      this._gfx.rect(tx, ty, TS - 1, TS - 1).fill({ color: tileInfo.bg, alpha: 0.5 });
    }
  }

  // ── Doctor sprite ──────────────────────────────────────────────────────────

  private _drawDoctor(px: number, py: number, time: number, lowHP: boolean): void {
    const cx = px + TS / 2, cy = py + TS / 2, bob = Math.sin(time * 2) * 1.5;
    this._gfx.ellipse(cx, py + TS - 4, 10, 3).fill({ color: 0x000000, alpha: 0.3 });
    this._gfx.circle(cx, cy + bob, TS * 0.45).fill({ color: lowHP ? 0xff4444 : 0x4488ff, alpha: 0.12 + Math.sin(time * 3) * 0.05 });
    this._gfx.ellipse(cx, cy + 6 + bob, 8, 12).fill({ color: 0x1a1a1a });
    this._gfx.ellipse(cx, cy - 8 + bob, 11, 3).fill({ color: 0x111111 });
    this._gfx.rect(cx - 5, cy - 18 + bob, 10, 10).fill({ color: 0x111111 });
    this._gfx.moveTo(cx + 2, cy - 4 + bob).lineTo(cx + 12, cy - 2 + bob).lineTo(cx + 2, cy + 1 + bob).closePath().fill({ color: 0x887755 });
    this._gfx.circle(cx - 1, cy - 5 + bob, 3).fill({ color: 0x333333 });
    this._gfx.circle(cx - 1, cy - 5 + bob, 2).fill({ color: lowHP ? 0xff3333 : 0x88ccff, alpha: 0.8 });
    if (lowHP) this._gfx.circle(cx, cy + bob, TS * 0.5).stroke({ color: 0xff0000, width: 1, alpha: 0.3 + Math.sin(time * 6) * 0.3 });
  }

  // ── Harbinger sprite ───────────────────────────────────────────────────────

  private _drawHarbinger(state: PlagueState, ox: number, oy: number): void {
    const h = state.harbinger!;
    if (h.x < 0 || h.y < 0 || h.x >= state.cols || h.y >= state.rows) return;
    if (!state.grid[h.y][h.x].visible) return;

    h.animX += (h.x - h.animX) * Math.min(1, 0.12);
    h.animY += (h.y - h.animY) * Math.min(1, 0.12);

    const hx = ox + h.animX * TS, hy = oy + h.animY * TS;
    const cx = hx + TS / 2, cy = hy + TS / 2;

    // Pulsing dark aura
    const auraPulse = 0.12 + Math.sin(state.time * 3) * 0.06;
    this._gfx.circle(cx, cy, TS * 0.6).fill({ color: 0x220022, alpha: auraPulse });
    this._gfx.circle(cx, cy, TS * 0.5).fill({ color: 0x110011, alpha: auraPulse * 0.7 });

    // Hovering shadow beneath
    this._gfx.ellipse(cx, hy + TS - 3, 12, 3).fill({ color: 0x000000, alpha: 0.5 });

    // Dark robe (larger than rats)
    const hover = Math.sin(state.time * 2.5) * 2;
    this._gfx.ellipse(cx, cy + 4 + hover, 10, 14).fill({ color: 0x1a0022 });
    this._gfx.ellipse(cx, cy + 4 + hover, 9, 13).fill({ color: 0x220033, alpha: 0.8 });

    // Hood
    this._gfx.circle(cx, cy - 6 + hover, 7).fill({ color: 0x110018 });
    this._gfx.circle(cx, cy - 6 + hover, 6).fill({ color: 0x1a0022 });

    // Glowing red eyes
    const eyeGlow = 0.7 + Math.sin(state.time * 5) * 0.3;
    this._gfx.circle(cx - 3, cy - 6 + hover, 1.5).fill({ color: 0xff0000, alpha: eyeGlow });
    this._gfx.circle(cx + 3, cy - 6 + hover, 1.5).fill({ color: 0xff0000, alpha: eyeGlow });
    // Eye glow halo
    this._gfx.circle(cx - 3, cy - 6 + hover, 3).fill({ color: 0xff0000, alpha: eyeGlow * 0.15 });
    this._gfx.circle(cx + 3, cy - 6 + hover, 3).fill({ color: 0xff0000, alpha: eyeGlow * 0.15 });

    // Stun effect — blue circles
    if (h.stunned > 0) {
      for (let i = 0; i < 3; i++) {
        const angle = state.time * 4 + i * (Math.PI * 2 / 3);
        const sr = 10;
        const sx = cx + Math.cos(angle) * sr;
        const sy = cy - 8 + hover + Math.sin(angle) * sr * 0.5;
        this._gfx.circle(sx, sy, 2.5).fill({ color: 0x4488ff, alpha: 0.6 + Math.sin(state.time * 8 + i) * 0.3 });
      }
      this._addText("STUNNED", cx, hy - 4, { fontSize: 7, fill: 0x4488ff, fontWeight: "bold" }, true);
    }

    // HP bar
    const hpBarW = TS - 8;
    const hpBarH = 3;
    const hpBarX = hx + 4;
    const hpBarY = hy - 6;
    this._gfx.rect(hpBarX, hpBarY, hpBarW, hpBarH).fill({ color: 0x220000, alpha: 0.8 });
    const hpRatio = h.hp / h.maxHp;
    this._gfx.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH).fill({ color: hpRatio > 0.5 ? 0xcc22cc : 0xff2222 });
    this._addText(`${h.hp}/${h.maxHp}`, cx, hpBarY - 9, { fontSize: 7, fill: 0xff66ff }, true);
  }

  // ── Threat indicators ──────────────────────────────────────────────────────

  private _drawThreatIndicators(state: PlagueState, gx: number, gy: number, tx: number, ty: number, threatLevel: number): void {
    const alpha = Math.min(0.8, threatLevel);
    const dirs: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dx, dy] of dirs) {
      const nx = gx + dx, ny = gy + dy;
      if (nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) continue;
      const neighbor = state.grid[ny][nx];
      if (neighbor.type === TileType.HOUSE && neighbor.infection >= InfectionLevel.INFECTED) {
        // Draw small red triangle pointing from the infected neighbor toward this tile
        const cx = tx + TS / 2 - dx * (TS / 2 - 4);
        const cy = ty + TS / 2 - dy * (TS / 2 - 4);
        const size = 4;
        if (dx !== 0) {
          // Horizontal arrow: triangle pointing inward
          const tip = dx > 0 ? -size : size;
          this._gfx
            .moveTo(cx, cy)
            .lineTo(cx + tip, cy - size)
            .lineTo(cx + tip, cy + size)
            .closePath()
            .fill({ color: 0xff2222, alpha });
        } else {
          // Vertical arrow: triangle pointing inward
          const tip = dy > 0 ? -size : size;
          this._gfx
            .moveTo(cx, cy)
            .lineTo(cx - size, cy + tip)
            .lineTo(cx + size, cy + tip)
            .closePath()
            .fill({ color: 0xff2222, alpha });
        }
      }
    }
  }

  // ── Storm visual ───────────────────────────────────────────────────────────

  private _drawStormRain(state: PlagueState, sw: number, sh: number): void {
    const lineCount = 60;
    const t = state.time;
    for (let i = 0; i < lineCount; i++) {
      // Pseudo-random positioning based on index and time
      const seed = (i * 7919 + Math.floor(t * 2) * 31) % 1000;
      const baseX = (seed / 1000) * (sw + 200) - 100;
      const baseY = ((i * 3571 + Math.floor(t * 3) * 97) % 1000) / 1000 * (sh + 100) - 50;
      const len = 12 + (seed % 8);
      this._gfx
        .moveTo(baseX, baseY)
        .lineTo(baseX - 6, baseY + len)
        .stroke({ color: 0x556688, width: 1, alpha: 0.25 + (seed % 100) / 400 });
    }
  }

  // ── Log panel ──────────────────────────────────────────────────────────────

  private _drawLogPanel(state: PlagueState, sw: number, oy: number, gridH: number): void {
    const panelW = 200;
    const panelH = gridH;
    const panelX = sw - panelW - 4;
    const panelY = oy;

    this._gfx.roundRect(panelX, panelY, panelW, panelH, 4).fill({ color: 0x0a0a08, alpha: 0.85 });
    this._gfx.roundRect(panelX, panelY, panelW, panelH, 4).stroke({ color: 0x443322, width: 1, alpha: 0.4 });

    this._addText("EVENT LOG", panelX + panelW / 2, panelY + 4, { fontSize: 9, fill: 0xccaa55, fontWeight: "bold", letterSpacing: 1 }, true);

    const maxLines = 15;
    const startIdx = Math.max(0, state.log.length - maxLines);
    let ly = panelY + 20;
    for (let i = startIdx; i < state.log.length; i++) {
      const entry = state.log[i];
      // Truncate long lines
      const display = entry.length > 30 ? entry.substring(0, 28) + ".." : entry;
      this._addText(display, panelX + 6, ly, { fontSize: 7, fill: 0x999988 });
      ly += 12;
      if (ly > panelY + panelH - 6) break;
    }
  }

  // ── Move range ─────────────────────────────────────────────────────────────

  private _drawMoveRange(state: PlagueState, ox: number, oy: number): void {
    const maxDist = state.movesLeft;
    if (maxDist <= 0) return;
    const visited = new Set<string>();
    const queue: [number, number, number][] = [[state.px, state.py, 0]];
    visited.add(`${state.px},${state.py}`);
    while (queue.length > 0) {
      const [cx, cy, dist] = queue.shift()!;
      if (dist > 0) {
        this._gfx.rect(ox + cx * TS + 1, oy + cy * TS + 1, TS - 3, TS - 3).fill({ color: 0x4488ff, alpha: 0.06 + (1 - dist / (maxDist + 1)) * 0.06 });
      }
      if (dist >= maxDist) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = cx + dx, ny = cy + dy, key = `${nx},${ny}`;
        if (visited.has(key) || nx < 0 || nx >= state.cols || ny < 0 || ny >= state.rows) continue;
        const t = state.grid[ny][nx];
        if (t.type === TileType.WALL || t.type === TileType.EMPTY) continue;
        visited.add(key);
        queue.push([nx, ny, dist + 1]);
      }
    }
  }

  // ── HUD ────────────────────────────────────────────────────────────────────

  private _drawHUD(state: PlagueState, sw: number): void {
    this._gfx.rect(0, 0, sw, 50).fill({ color: 0x0a0806, alpha: 0.95 });
    this._gfx.rect(0, 49, sw, 1).fill({ color: 0x443322, alpha: 0.4 });

    let hx = 10;
    const hy = 5;
    const mutActive = state.day >= state.mutationDay && state.mutationAnnounced;
    this._addText("PLAGUE DOCTOR", hx, hy, { fontSize: 12, fill: mutActive ? 0xff88ff : 0xccaa55, fontWeight: "bold", letterSpacing: 2 });
    hx += 148;

    const dayProgress = state.day / state.maxDays;
    this._addText(`Day ${state.day}/${state.maxDays}`, hx, hy, { fontSize: 10, fill: 0xddddcc });
    this._gfx.rect(hx, hy + 14, 60, 4).fill({ color: 0x222211 });
    this._gfx.rect(hx, hy + 14, 60 * dayProgress, 4).fill({ color: dayProgress > 0.8 ? 0xff6644 : 0xddcc44 });
    hx += 76;

    // HP
    this._addText("HP", hx, hy, { fontSize: 8, fill: 0xff6666 });
    const hpW = 50;
    this._gfx.roundRect(hx + 18, hy + 2, hpW, 7, 3).fill({ color: 0x220808 });
    const hpR = state.health / state.maxHealth;
    this._gfx.roundRect(hx + 18, hy + 2, hpW * hpR, 7, 3).fill({ color: hpR > 0.5 ? 0x44aa44 : hpR > 0.2 ? 0xddaa33 : 0xff3333 });
    this._addText(`${state.health}`, hx + 18 + hpW + 4, hy, { fontSize: 9, fill: 0xdddddd });
    hx += 88;

    const dR = state.deaths / state.maxDeaths;
    this._addText(`Deaths: ${state.deaths}/${state.maxDeaths}`, hx, hy, { fontSize: 10, fill: dR > 0.7 ? 0xff4444 : 0xddddcc });
    hx += 95;
    this._addText(`Cured: ${state.cured}`, hx, hy, { fontSize: 10, fill: 0x44cc44 });
    hx += 75;
    this._addText(`Score: ${state.score}`, hx, hy, { fontSize: 10, fill: 0xddcc44 });

    // Weather indicator (right side of HUD top bar)
    const wi = WEATHER_INFO[state.weather];
    if (wi) {
      const weatherStr = `${wi.icon} ${wi.name}`;
      this._addText(weatherStr, sw - 90, hy, { fontSize: 10, fill: wi.color, fontWeight: "bold" });
      this._addText(wi.desc, sw - 90, hy + 13, { fontSize: 7, fill: wi.color, letterSpacing: 0 });
    }

    // Resources row
    const ry = hy + 20;
    let rx = 10;
    for (const [label, val, color] of [["Herbs", state.herbs, 0x66bb66], ["Rem", state.remedies, 0x44ddcc], ["Masks", state.masks, 0xcccccc], ["Leech", state.leeches, 0xcc8888], ["Gold", state.gold, 0xffd700]] as [string, number, number][]) {
      this._gfx.circle(rx + 4, ry + 5, 3).fill({ color, alpha: 0.7 });
      this._addText(`${label}: ${val}`, rx + 10, ry, { fontSize: 8, fill: color });
      rx += 82;
    }
    this._addText(`Mv: ${state.movesLeft}/${state.maxMoves}`, rx, ry, { fontSize: 8, fill: 0xaaaaff });
    rx += 60;
    this._addText(`Act: ${state.actionsLeft}/${state.maxActions}`, rx, ry, { fontSize: 8, fill: 0xffaaaa });

    if (mutActive) { rx += 70; this._addText(`[${MUTATION_NAMES[state.activeMutation]}]`, rx, ry, { fontSize: 8, fill: 0xff88ff, fontWeight: "bold" }); }

    // Second mutation
    const mut2Active = state.day >= state.secondMutationDay && state.secondMutationAnnounced;
    if (mut2Active) { rx += 70; this._addText(`[${MUTATION_NAMES[state.secondMutation]}]`, rx, ry, { fontSize: 8, fill: 0xff88ff, fontWeight: "bold" }); }

    // Perk icons
    if (state.activePerks.length > 0) {
      this._addText(`Perks: ${state.activePerks.length}`, sw - 90, ry, { fontSize: 8, fill: 0xccaa55 });
    }
    if (state.rats.length > 0) {
      this._addText(`Rats: ${state.rats.length}`, sw - 170, hy, { fontSize: 8, fill: 0xaa7744 });
    }
  }

  // ── Action panel ───────────────────────────────────────────────────────────

  private _drawActionPanel(state: PlagueState, sw: number, sh: number, bottomY: number): void {
    this._gfx.rect(0, bottomY - 2, sw, sh - bottomY + 2).fill({ color: 0x0a0806, alpha: 0.92 });

    if (state.phase === PlaguePhase.PLAYING) {
      const actions = getAvailableActions(state);
      const tile = state.grid[state.py][state.px];
      const by = bottomY + 3;

      // Only show AVAILABLE actions (context-sensitive) — no grayed-out clutter
      const allBtns: [string, string, number, (() => void) | null][] = [
        ["T:Treat", "treat", 0xee8833, this._onTreat],
        ["G:Gather", "gather", 0x44aa44, this._onGather],
        ["C:Craft", "craft", 0x44ddcc, this._onCraft],
        ["R:Rest", "rest", 0xddddaa, this._onRest],
        ["Q:Quarantine", "quarantine", 0xff6644, this._onQuarantine],
        ["N:Warn", "warn", 0x4488ff, this._onWarn],
        ["F:Fumigate", "fumigate", 0xaaddaa, this._onFumigate],
        ["K:Kill Rat", "killrat", 0xaa7744, this._onKillRat],
        ["X:Attack", "attack_harbinger", 0xff44ff, this._onAttackHarbinger],
        ["U:Undo", "undo", 0x88aaff, this._onUndo],
      ];

      let bx = 6;
      for (const [label, actionKey, color, cb] of allBtns) {
        if (!actions.includes(actionKey)) continue; // Only show available buttons
        const bw = label.length * 6 + 10;
        this._drawButton(bx, by, bw, 18, label, color, true, () => { if (cb) cb(); });
        bx += bw + 3;
      }

      // Market buttons (only when at market)
      if (tile.type === TileType.MARKET && state.actionsLeft > 0) {
        if (bx > 6) { this._gfx.rect(bx, by, 1, 18).fill({ color: 0x443322, alpha: 0.4 }); bx += 4; }
        for (const [label, item, price, color] of [["1:Herb", "herbs", PlagueConfig.MARKET_HERB_PRICE, 0x66bb66], ["2:Mask", "mask", PlagueConfig.MARKET_MASK_PRICE, 0xcccccc], ["3:Leech", "leech", PlagueConfig.MARKET_LEECH_PRICE, 0xcc8888], ["4:Rem", "remedy", PlagueConfig.MARKET_REMEDY_PRICE, 0x44ddcc]] as [string, string, number, number][]) {
          const canBuy = state.gold >= price;
          const bw = label.length * 6 + 14;
          this._drawButton(bx, by, bw, 18, `${label} ${price}g`, canBuy ? color : 0x444444, canBuy, () => { if (canBuy && this._onBuy) this._onBuy(item); });
          bx += bw + 3;
        }
      }

      // Right side: End turn + Log toggle
      this._drawButton(sw - 85, by, 78, 18, "ENTER:End", 0x8888cc, true, () => { if (this._onEndTurn) this._onEndTurn(); });
      const logColor = state.showLog ? 0xccaa55 : 0x555544;
      this._drawButton(sw - 85, by + 20, 78, 14, "L:Log", logColor, true, () => { if (this._onToggleLog) this._onToggleLog(); });

      // Ability bar (row 2)
      const abilityY = by + 20;
      this._drawAbilityBar(state, abilityY);

      // Tile info (row 3, compact)
      const tInfo = TILE_COLORS[tile.type] ?? TILE_COLORS[0];
      let info = tInfo.label;
      if (tile.type === TileType.HOUSE) {
        info += ` Pop:${tile.population} ${INFECTION_LABELS[tile.infection]}`;
        if (tile.quarantined) info += " QRNT";
        if (tile.fumigated > 0) info += ` Fum${tile.fumigated}`;
        if (tile.warned > 0) info += ` Warn${tile.warned}`;
      }
      info += ` ${DISTRICT_NAMES[tile.district] ?? ""}`;
      this._addText(info, 6, abilityY + 18, { fontSize: 7, fill: 0x777766 });

    } else if (state.phase === PlaguePhase.WON || state.phase === PlaguePhase.LOST) {
      this._drawGameOver(state, sw, bottomY);
    }
  }

  // ── Ability bar ────────────────────────────────────────────────────────────

  private _drawAbilityBar(state: PlagueState, y: number): void {
    let abx = 8;
    for (let i = 0; i < state.abilities.length; i++) {
      const ability = state.abilities[i];
      const ready = ability.currentCd === 0;
      const cdStr = ready ? "" : ` (${ability.currentCd})`;
      const label = `[${i + 1}] ${ability.name}${cdStr}`;
      const bw = label.length * 6 + 16;
      const color = ready ? ability.color : 0x444444;
      this._drawButton(abx, y, bw, 20, label, color, ready, () => {
        if (ready && this._onUseAbility) this._onUseAbility(ability.id);
      });
      abx += bw + 4;
    }
  }

  // ── Game over ──────────────────────────────────────────────────────────────

  private _drawGameOver(state: PlagueState, sw: number, bottomY: number): void {
    const won = state.phase === PlaguePhase.WON;
    const rating = RATING_THRESHOLDS.find(r => state.score >= r.min) ?? RATING_THRESHOLDS[RATING_THRESHOLDS.length - 1];

    let y = bottomY + 4;
    this._addText(won ? "THE PLAGUE IS VANQUISHED!" : "THE CITY HAS FALLEN...", sw / 2, y, { fontSize: 14, fill: won ? 0x44ff44 : 0xff4444, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 18;

    // Rating badge
    this._gfx.circle(sw / 2 - 70, y + 10, 14).fill({ color: rating.color, alpha: 0.15 });
    this._gfx.circle(sw / 2 - 70, y + 10, 14).stroke({ color: rating.color, width: 2, alpha: 0.7 });
    this._addText(rating.label, sw / 2 - 70, y + 1, { fontSize: 18, fill: rating.color, fontWeight: "bold" }, true);
    this._addText(rating.title, sw / 2 + 10, y + 4, { fontSize: 10, fill: rating.color, fontStyle: "italic" }, true);
    y += 26;

    // Stats in compact 3-column layout
    const col1 = sw / 2 - 160, col2 = sw / 2 - 40, col3 = sw / 2 + 80;
    const stats: [string, string, number, number][] = [
      ["Days", `${state.day}`, 0xddddcc, col1], ["Score", `${state.score}`, 0xffd700, col2], ["Morale", `${state.morale}`, state.morale >= 50 ? 0x44aa44 : 0xff6644, col3],
      ["Cured", `${state.cured}`, 0x44cc44, col1], ["Deaths", `${state.deaths}`, 0xff6644, col2], ["Combo", `x${state.maxCombo}`, 0xffd700, col3],
      ["Rats", `${state.ratsKilled}`, 0xaa7744, col1], ["Perks", `${state.activePerks.length}`, 0xccaa55, col2], ["Perfect", `${state.perfectDays}d`, 0xddcc44, col3],
    ];
    if (state.harbingerDefeated) stats.push(["Harbinger", "Slain!", 0xff66ff, col1]);

    for (let i = 0; i < stats.length; i++) {
      const [label, value, color, colX] = stats[i];
      const rowY = y + Math.floor(i / 3) * 12;
      this._addText(`${label}: `, colX, rowY, { fontSize: 7, fill: 0x888877 });
      this._addText(value, colX + 50, rowY, { fontSize: 7, fill: color, fontWeight: "bold" });
    }
    y += Math.ceil(stats.length / 3) * 12 + 4;

    // Challenges
    if (state.challenges.length > 0) {
      this._addText("Challenges:", col1, y, { fontSize: 7, fill: 0xccaa55, fontWeight: "bold" });
      y += 10;
      for (const c of state.challenges) {
        const check = c.completed ? "\u2713 " : "\u2717 ";
        const color = c.completed ? 0x44cc44 : 0x886655;
        this._addText(`${check}${c.desc}`, col1, y, { fontSize: 7, fill: color });
        y += 10;
      }
      y += 2;
    }

    // Epilogue (narrative summary)
    if (state.epilogueLines.length > 0) {
      this._gfx.rect(col1, y, sw - 2 * (sw / 2 - 160), 1).fill({ color: 0x443322, alpha: 0.3 });
      y += 4;
      for (const line of state.epilogueLines) {
        this._addText(line, sw / 2, y, { fontSize: 7, fill: 0xaa9977, fontStyle: "italic" }, true);
        y += 11;
      }
      y += 2;
    }

    this._drawButton(sw / 2 - 50, y, 100, 22, "PLAY AGAIN", 0xccaa55, true, () => { if (this._onExit) this._onExit(); });
  }

  // ── Minimap ────────────────────────────────────────────────────────────────

  private _drawMinimap(state: PlagueState, sw: number, bottomY: number): void {
    const mmTile = 4, mmW = state.cols * mmTile, mmH = state.rows * mmTile;
    const mmX = sw - mmW - 8, mmY = bottomY + 24;
    this._gfx.roundRect(mmX - 2, mmY - 2, mmW + 4, mmH + 4, 2).fill({ color: 0x111111, alpha: 0.8 });

    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        let color = 0x080808;
        if (!tile.revealed && tile.type !== TileType.WALL) { /* stay dark */ }
        else if (tile.type === TileType.WALL) color = 0x444444;
        else if (tile.type === TileType.ROAD) color = 0x3a3a30;
        else if (tile.type === TileType.HOUSE) color = tile.visible ? INFECTION_COLORS[tile.infection] : (tile.lastSeenInfection > 0 ? INFECTION_COLORS[tile.lastSeenInfection] : 0x556644);
        else if (tile.type === TileType.CEMETERY) color = 0x222222;
        else if (tile.type === TileType.WELL) color = 0x2277aa;
        else if (tile.type === TileType.CHURCH) color = 0xddcc88;
        else if (tile.type === TileType.WORKSHOP) color = 0x885522;
        else if (tile.type === TileType.MARKET) color = 0xddaa44;
        else if (tile.type === TileType.BARRICADE) color = 0x886644;
        this._gfx.rect(mmX + x * mmTile, mmY + y * mmTile, mmTile - 1, mmTile - 1).fill({ color });
      }
    }
    this._gfx.circle(mmX + state.px * mmTile + mmTile / 2, mmY + state.py * mmTile + mmTile / 2, 2).fill({ color: 0x4488ff });
    for (const rat of state.rats) {
      if (state.grid[rat.y]?.[rat.x]?.visible) this._gfx.rect(mmX + rat.x * mmTile, mmY + rat.y * mmTile, mmTile - 1, mmTile - 1).fill({ color: 0xaa6633 });
    }
    if (state.apprentice) this._gfx.circle(mmX + state.apprentice.x * mmTile + mmTile / 2, mmY + state.apprentice.y * mmTile + mmTile / 2, 1.5).fill({ color: 0x4488ff });
    if (state.harbinger && !state.harbingerDefeated && state.grid[state.harbinger.y]?.[state.harbinger.x]?.visible) {
      this._gfx.circle(mmX + state.harbinger.x * mmTile + mmTile / 2, mmY + state.harbinger.y * mmTile + mmTile / 2, 2).fill({ color: 0xff22ff });
    }

    const stats = getInfectionStats(state);
    this._addText(`H:${stats.healthy} R:${stats.rumored} I:${stats.infected} D:${stats.dying}`, mmX, mmY + mmH + 3, { fontSize: 7, fill: 0x888877 });
  }

  // ── Tooltip ────────────────────────────────────────────────────────────────

  private _drawTooltip(state: PlagueState, tile: typeof state.grid[0][0], gx: number, gy: number, ox: number, oy: number, sw: number): void {
    const tInfo = TILE_COLORS[tile.type] ?? TILE_COLORS[0];
    const lines: string[] = [tInfo.label];
    if (tile.type === TileType.HOUSE) {
      lines.push(`Pop: ${tile.population} | ${INFECTION_LABELS[tile.infection]}`);
      if (tile.quarantined) lines.push("QUARANTINED");
      if (tile.fumigated > 0) lines.push(`Fumigated: ${tile.fumigated} turns`);
      if (tile.warned > 0) lines.push(`Warned: ${tile.warned} turns`);
      if (tile.threatLevel > 0.3) lines.push(`Threat: ${Math.round(tile.threatLevel * 100)}%`);
      lines.push(`${DISTRICT_NAMES[tile.district] ?? ""}`);
    } else if (tile.type === TileType.WELL) lines.push("Gather herbs (G)");
    else if (tile.type === TileType.CHURCH) lines.push("Rest to heal (R)");
    else if (tile.type === TileType.WORKSHOP) lines.push("Craft remedies (C)");
    else if (tile.type === TileType.MARKET) lines.push("Buy supplies");
    else if (tile.type === TileType.CEMETERY) lines.push("The dead rest here...");
    else if (tile.type === TileType.BARRICADE) lines.push("Blocks plague spread");
    if (state.rats.some(r => r.x === gx && r.y === gy)) lines.push("RAT! (K to kill)");
    if (state.harbinger && state.harbinger.x === gx && state.harbinger.y === gy) {
      lines.push(`HARBINGER HP: ${state.harbinger.hp}/${state.harbinger.maxHp}`);
      if (state.harbinger.stunned > 0) lines.push(`Stunned: ${state.harbinger.stunned} turns`);
    }

    const tw = 140, th = lines.length * 13 + 6;
    let ttx = ox + gx * TS + TS + 4, tty = oy + gy * TS;
    if (ttx + tw > sw) ttx = ox + gx * TS - tw - 4;
    this._gfx.roundRect(ttx, tty, tw, th, 4).fill({ color: 0x111108, alpha: 0.92 });
    this._gfx.roundRect(ttx, tty, tw, th, 4).stroke({ color: 0x665544, width: 1, alpha: 0.6 });
    for (let i = 0; i < lines.length; i++) {
      this._addText(lines[i], ttx + 6, tty + 3 + i * 13, { fontSize: 8, fill: i === 0 ? 0xddcc88 : 0xaaaaaa, fontWeight: i === 0 ? "bold" : "normal" });
    }
  }

  // ── Particles ──────────────────────────────────────────────────────────────

  private _spawnMiasma(state: PlagueState): void {
    if (this._particles.length > 120) return;
    for (let y = 0; y < state.rows; y++) {
      for (let x = 0; x < state.cols; x++) {
        const tile = state.grid[y][x];
        if (!tile.visible || tile.type !== TileType.HOUSE || tile.infection < InfectionLevel.INFECTED) continue;
        if (Math.random() > (tile.infection === InfectionLevel.DYING ? 0.08 : 0.03)) continue;
        this._particles.push({
          x: this._ox + x * TS + Math.random() * TS, y: this._oy + y * TS + Math.random() * TS,
          vx: (Math.random() - 0.5) * 8, vy: -Math.random() * 15 - 5,
          life: 1.2 + Math.random() * 0.8, maxLife: 1.2 + Math.random() * 0.8,
          color: tile.infection === InfectionLevel.DYING ? 0x882222 : 0x668833, size: 1.5 + Math.random() * 2,
        });
      }
    }
  }

  private _tickParticles(dt: number): void {
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vy *= 0.98; p.life -= dt;
      if (p.life <= 0) this._particles.splice(i, 1);
    }
  }

  // ── UI helpers ─────────────────────────────────────────────────────────────

  private _drawButton(x: number, y: number, w: number, h: number, label: string, color: number, enabled: boolean, onClick: () => void): void {
    const btn = new Graphics();
    btn.roundRect(0, 0, w, h, 4).fill({ color: enabled ? 0x151510 : 0x0a0a08, alpha: 0.9 });
    btn.roundRect(0, 0, w, h, 4).stroke({ color, width: 1, alpha: enabled ? 0.6 : 0.15 });
    btn.position.set(x, y);
    if (enabled) { btn.eventMode = "static"; btn.cursor = "pointer"; btn.on("pointerdown", onClick); }
    this._uiContainer.addChild(btn);
    if (label) {
      const t = new Text({ text: label, style: mkStyle({ fontSize: 8, fill: enabled ? color : 0x444444, fontWeight: "bold" }) });
      t.anchor.set(0.5, 0.5); t.position.set(x + w / 2, y + h / 2); this._uiContainer.addChild(t); this._textCache.push(t);
    }
  }

  private _textPoolIdx = 0;
  private _textPool: Text[] = [];

  private _addText(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): void {
    let t: Text;
    if (this._textPoolIdx < this._textPool.length) {
      // Recycle existing Text object
      t = this._textPool[this._textPoolIdx];
      t.text = str;
      t.style = mkStyle(opts);
      t.visible = true;
      t.anchor.set(center ? 0.5 : 0, 0);
    } else {
      // Create new Text, add to pool
      t = new Text({ text: str, style: mkStyle(opts) });
      if (center) t.anchor.set(0.5, 0);
      this._textPool.push(t);
      this._uiContainer.addChild(t);
    }
    t.position.set(x, y);
    this._textCache.push(t);
    this._textPoolIdx++;
  }

  private _clearTexts(): void {
    // Hide unused pool entries instead of destroying
    for (let i = this._textPoolIdx; i < this._textPool.length; i++) {
      this._textPool[i].visible = false;
    }
    this._textCache = [];
    this._textPoolIdx = 0;
    // Remove all Graphics children (buttons) but keep pooled texts
    for (let i = this._uiContainer.children.length - 1; i >= 0; i--) {
      const child = this._uiContainer.children[i];
      if (child instanceof Graphics) {
        this._uiContainer.removeChildAt(i);
        child.destroy();
      }
    }
  }

  private _blendColors(c1: number, c2: number, t: number): number {
    const r = Math.floor(((c1 >> 16) & 0xff) + (((c2 >> 16) & 0xff) - ((c1 >> 16) & 0xff)) * t);
    const g = Math.floor(((c1 >> 8) & 0xff) + (((c2 >> 8) & 0xff) - ((c1 >> 8) & 0xff)) * t);
    const b = Math.floor((c1 & 0xff) + ((c2 & 0xff) - (c1 & 0xff)) * t);
    return (r << 16) | (g << 8) | b;
  }

  private _darken(c: number, a: number): number {
    return (Math.floor(((c >> 16) & 0xff) * (1 - a)) << 16) | (Math.floor(((c >> 8) & 0xff) * (1 - a)) << 8) | Math.floor((c & 0xff) * (1 - a));
  }

  destroy(): void {
    for (const t of this._textPool) t.destroy();
    this._textPool = [];
    this._textCache = [];
    this._textPoolIdx = 0;
    this._particles = [];
    this.container.destroy({ children: true });
  }
}
