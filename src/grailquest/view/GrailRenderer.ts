// ---------------------------------------------------------------------------
// Grail Quest — PixiJS Renderer (v2)
// Enhanced visuals: procedural entity sprites, fog of war with exploration,
// camera scrolling, detailed tile rendering with 3D bevels, HUD bars,
// inventory display, minimap, particles, floating text, atmospheric effects.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { GrailPhase, TileType, EntityType, ItemKind } from "../types";
import type { GrailState, GrailMeta } from "../types";
import { GRAIL_BALANCE as B, getLetterGrade } from "../config/GrailBalance";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 52, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 6,
  dropShadow: { color: 0x000000, distance: 5, angle: Math.PI / 4, blur: 8, alpha: 0.9 },
});
const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 17, fill: 0xa0886a,
  fontStyle: "italic", letterSpacing: 2,
});
const STYLE_CONTROLS = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x778877, lineHeight: 19,
});
const STYLE_HUD = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xdddddd, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 3, alpha: 0.7 },
});
const STYLE_HUD_SM = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x999999,
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 2, alpha: 0.5 },
});
const STYLE_MSG = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xcccccc, lineHeight: 17,
});
const STYLE_FLOAT = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 5, alpha: 0.95 },
});
const STYLE_DEATH_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 52, fill: 0xff4444, fontWeight: "bold",
  dropShadow: { color: 0x440000, distance: 4, angle: Math.PI / 4, blur: 8, alpha: 0.9 },
});
const STYLE_VICTORY_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 48, fill: 0xffd700, fontWeight: "bold",
  letterSpacing: 4,
  dropShadow: { color: 0x442200, distance: 5, angle: Math.PI / 4, blur: 8, alpha: 0.9 },
});
const STYLE_STAT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0xdddddd, lineHeight: 24,
});
const STYLE_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 18, fill: 0xc9a227, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_PAUSE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 40, fill: 0xdaa520, fontWeight: "bold",
  letterSpacing: 8,
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 5, alpha: 0.6 },
});
const STYLE_LEVEL_UP = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 32, fill: 0xffdd44, fontWeight: "bold",
  letterSpacing: 4,
  dropShadow: { color: 0x442200, distance: 3, angle: Math.PI / 4, blur: 6, alpha: 0.8 },
});
const STYLE_CHOICE = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xdddddd, lineHeight: 22,
});
const STYLE_UPGRADE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xcccccc, lineHeight: 22,
});
const STYLE_GRADE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 68, fill: 0xffd700, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 4, angle: Math.PI / 4, blur: 6, alpha: 0.8 },
});
const STYLE_META = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0x888866, lineHeight: 22,
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const FLOAT_POOL = 20;

/** Simple spatial hash for per-tile variation. */
function tileHash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) & 0xffff;
}

// ---------------------------------------------------------------------------
// Ambient dust motes
// ---------------------------------------------------------------------------

interface DustMote {
  x: number; y: number; vx: number; vy: number;
  size: number; alpha: number; phase: number;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class GrailRenderer {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _uiGfx = new Graphics();

  // Text objects
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudSmText = new Text({ text: "", style: STYLE_HUD_SM });
  private _msgText = new Text({ text: "", style: STYLE_MSG });
  private _titleText = new Text({ text: "GRAIL QUEST", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Seek the Holy Grail in the catacombs beneath Camelot", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _metaText = new Text({ text: "", style: STYLE_META });
  private _promptText = new Text({ text: "Press ENTER to begin", style: STYLE_PROMPT });
  private _deathTitle = new Text({ text: "FALLEN", style: STYLE_DEATH_TITLE });
  private _victoryTitle = new Text({ text: "THE GRAIL IS FOUND!", style: STYLE_VICTORY_TITLE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _levelUpTitle = new Text({ text: "LEVEL UP!", style: STYLE_LEVEL_UP });
  private _choiceText = new Text({ text: "", style: STYLE_CHOICE });
  private _upgradeText = new Text({ text: "", style: STYLE_UPGRADE });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });

  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();

  private _sw = 0;
  private _sh = 0;
  private _time = 0;

  // Camera (smooth scroll)
  private _camX = 0;
  private _camY = 0;
  private _camTX = 0;
  private _camTY = 0;
  private _camInit = false;

  /** Expose camera position for click-to-tile conversion */
  get camX(): number { return this._camX; }
  get camY(): number { return this._camY; }

  // Dust motes
  private _dust: DustMote[] = [];
  private _dustInit = false;

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  build(sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;

    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    this.container.addChild(this._hudText);
    this.container.addChild(this._hudSmText);
    this.container.addChild(this._msgText);
    this.container.addChild(this._titleText);
    this.container.addChild(this._subtitleText);
    this.container.addChild(this._controlsText);
    this.container.addChild(this._metaText);
    this.container.addChild(this._promptText);
    this.container.addChild(this._deathTitle);
    this.container.addChild(this._victoryTitle);
    this.container.addChild(this._statText);
    this.container.addChild(this._deathPrompt);
    this.container.addChild(this._pauseText);
    this.container.addChild(this._levelUpTitle);
    this.container.addChild(this._choiceText);
    this.container.addChild(this._upgradeText);
    this.container.addChild(this._gradeText);

    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5);
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
  }

  // -----------------------------------------------------------------------
  // Destroy
  // -----------------------------------------------------------------------

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
    this._uiGfx.destroy();
  }

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  render(state: GrailState, sw: number, sh: number, meta: GrailMeta): void {
    this._sw = sw;
    this._sh = sh;
    this._time += 1 / 60;

    this._gfx.clear();
    this._uiGfx.clear();
    this._hideAll();

    switch (state.phase) {
      case GrailPhase.START:
        this._renderStartScreen(state, meta);
        break;
      case GrailPhase.PLAYING:
      case GrailPhase.INVENTORY:
        this._renderGameView(state, meta);
        if (state.phase === GrailPhase.INVENTORY) this._renderInventoryOverlay(state);
        break;
      case GrailPhase.LEVEL_UP:
        this._renderGameView(state, meta);
        this._renderLevelUpScreen(state);
        break;
      case GrailPhase.DEAD:
        this._renderDeathScreen(state, meta);
        break;
      case GrailPhase.VICTORY:
        this._renderVictoryScreen(state, meta);
        break;
      case GrailPhase.PAUSED:
        this._renderGameView(state, meta);
        this._renderPauseScreen();
        break;
    }

    // Screen shake
    if (state.screenShake > 0) {
      const intensity = B.SHAKE_INTENSITY * (state.screenShake / B.SHAKE_DURATION);
      this.container.x = (Math.random() - 0.5) * intensity;
      this.container.y = (Math.random() - 0.5) * intensity;
    } else {
      this.container.x = 0;
      this.container.y = 0;
    }

    // Screen flash
    if (state.screenFlash > 0) {
      this._uiGfx.rect(0, 0, sw, sh).fill({ color: 0xff4444, alpha: state.screenFlash * 0.06 });
    }
  }

  // -----------------------------------------------------------------------
  // Hide all text objects
  // -----------------------------------------------------------------------

  private _hideAll(): void {
    this._titleText.visible = false;
    this._subtitleText.visible = false;
    this._controlsText.visible = false;
    this._metaText.visible = false;
    this._promptText.visible = false;
    this._hudText.visible = false;
    this._hudSmText.visible = false;
    this._msgText.visible = false;
    this._deathTitle.visible = false;
    this._victoryTitle.visible = false;
    this._statText.visible = false;
    this._deathPrompt.visible = false;
    this._pauseText.visible = false;
    this._levelUpTitle.visible = false;
    this._choiceText.visible = false;
    this._upgradeText.visible = false;
    this._gradeText.visible = false;
    for (const ft of this._floatTexts) ft.visible = false;
  }

  // -----------------------------------------------------------------------
  // Camera
  // -----------------------------------------------------------------------

  private _updateCamera(state: GrailState): void {
    const cs = B.CELL_SIZE;
    const mapW = state.dungeon.cols * cs;
    const mapH = state.dungeon.rows * cs;

    this._camTX = state.playerX * cs + cs / 2 - this._sw / 2;
    this._camTY = state.playerY * cs + cs / 2 - this._sh / 2;

    // Clamp so we don't show outside the map
    this._camTX = Math.max(0, Math.min(this._camTX, mapW - this._sw));
    this._camTY = Math.max(0, Math.min(this._camTY, mapH - this._sh));

    if (!this._camInit) {
      this._camX = this._camTX;
      this._camY = this._camTY;
      this._camInit = true;
    } else {
      const lerp = 0.14;
      this._camX += (this._camTX - this._camX) * lerp;
      this._camY += (this._camTY - this._camY) * lerp;
    }
  }

  /** World tile x -> screen x */
  private _wx(tx: number): number { return tx * B.CELL_SIZE - this._camX; }
  /** World tile y -> screen y */
  private _wy(ty: number): number { return ty * B.CELL_SIZE - this._camY; }
  /** Is a screen coordinate within the visible area? */
  private _onScr(sx: number, sy: number): boolean {
    const cs = B.CELL_SIZE;
    return sx > -cs * 2 && sx < this._sw + cs * 2 &&
           sy > -cs * 2 && sy < this._sh + cs * 2;
  }

  // -----------------------------------------------------------------------
  // Dust motes (ambient atmosphere)
  // -----------------------------------------------------------------------

  private _initDust(): void {
    if (this._dustInit) return;
    this._dustInit = true;
    for (let i = 0; i < 35; i++) {
      this._dust.push({
        x: Math.random() * this._sw,
        y: Math.random() * this._sh,
        vx: (Math.random() - 0.5) * 4,
        vy: -Math.random() * 5 - 1,
        size: Math.random() * 1.4 + 0.3,
        alpha: Math.random() * 0.12 + 0.02,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private _drawDust(g: Graphics, dt: number): void {
    this._initDust();
    for (const m of this._dust) {
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      m.x += Math.sin(m.phase + m.y * 0.01) * 0.25;
      m.phase += dt * 0.4;
      if (m.y < -5) { m.y = this._sh + 5; m.x = Math.random() * this._sw; }
      if (m.x < -5) m.x = this._sw + 5;
      if (m.x > this._sw + 5) m.x = -5;
      const fl = 0.6 + Math.sin(m.phase * 2.5) * 0.4;
      g.circle(m.x, m.y, m.size).fill({ color: 0x887755, alpha: m.alpha * fl });
    }
  }

  // =======================================================================
  // START SCREEN
  // =======================================================================

  private _renderStartScreen(_state: GrailState, meta: GrailMeta): void {
    const sw = this._sw, sh = this._sh;
    const cx = sw / 2, cy = sh / 2;
    const t = this._time;
    const g = this._gfx;

    // Dark background
    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);

    // Atmospheric vignette
    const vigW = sw * 0.35;
    g.rect(0, 0, vigW, sh).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(sw - vigW, 0, vigW, sh).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(0, 0, sw, sh * 0.22).fill({ color: 0x000000, alpha: 0.2 });
    g.rect(0, sh * 0.78, sw, sh * 0.22).fill({ color: 0x000000, alpha: 0.2 });

    // Golden glow at center
    g.circle(cx, cy - 60, 180).fill({ color: 0x2a1a04, alpha: 0.12 });
    g.circle(cx, cy - 60, 100).fill({ color: 0x3a2808, alpha: 0.08 });

    // Grail icon
    this._drawGrailIcon(g, cx, cy - 130, 1.8, t);

    // Stone pillars
    this._drawPillar(g, 55, sh * 0.12, sh * 0.76);
    this._drawPillar(g, sw - 55, sh * 0.12, sh * 0.76);

    // Dust motes
    this._drawDust(g, 1 / 60);

    // Title
    this._titleText.visible = true;
    this._titleText.anchor.set(0.5);
    this._titleText.position.set(cx, cy - 40);
    this._titleText.alpha = 0.9 + Math.sin(t * 1.5) * 0.1;

    // Subtitle
    this._subtitleText.visible = true;
    this._subtitleText.anchor.set(0.5);
    this._subtitleText.position.set(cx, cy + 5);

    // Controls
    this._controlsText.visible = true;
    this._controlsText.text =
      "WASD / Arrows \u2014 Move & Attack\n" +
      "Space \u2014 Wait turn\n" +
      "E \u2014 Interact (chests, shrines, stairs)\n" +
      "1-6 \u2014 Use item\n" +
      "Tab \u2014 Inventory\n" +
      "Esc \u2014 Pause / Exit";
    this._controlsText.anchor.set(0.5, 0);
    this._controlsText.position.set(cx, cy + 50);

    // Meta stats
    if (meta.totalRuns > 0) {
      this._metaText.visible = true;
      this._metaText.anchor.set(0.5);
      this._metaText.position.set(cx, cy + 165);
      this._metaText.text = [
        `Runs: ${meta.totalRuns}  |  Best Floor: ${meta.highScore}  |  Kills: ${meta.totalKills}`,
        `Grails found: ${meta.grailsFound}  |  Shards: ${meta.shards}`,
      ].join("\n");
    }

    // Prompt
    this._promptText.visible = true;
    this._promptText.text = "Press ENTER to begin";
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(cx, sh * 0.88);
    this._promptText.alpha = 0.4 + Math.sin(t * 3) * 0.6;
  }

  // =======================================================================
  // GAME VIEW (PLAYING, INVENTORY, background for LEVEL_UP & PAUSED)
  // =======================================================================

  private _renderGameView(state: GrailState, meta: GrailMeta): void {
    const g = this._gfx;
    const sw = this._sw, sh = this._sh;

    this._updateCamera(state);

    // Dark background
    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);

    // Draw tiles
    this._drawTiles(g, state);

    // Draw fog of war
    this._drawFogOfWar(g, state);

    // Draw entities (enemies)
    this._drawEntities(g, state);

    // Draw projectiles
    this._drawProjectiles(g, state);

    // Draw player
    this._drawPlayer(g, state);

    // Draw particles
    this._drawParticles(g, state);

    // Atmospheric effects — ambient dust, fog wisps, water drips
    this._drawAtmosphere(g, state);

    // Draw floating texts
    this._drawFloatTexts(state);

    // UI layer
    this._drawHUD(this._uiGfx, state, meta);
    this._drawMessages(state);
    this._drawMinimap(this._uiGfx, state);
  }

  // -----------------------------------------------------------------------
  // TILES
  // -----------------------------------------------------------------------

  private _drawTiles(g: Graphics, state: GrailState): void {
    const { tiles, cols, rows } = state.dungeon;
    const cs = B.CELL_SIZE;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!state.explored[y][x]) continue;

        const sx = this._wx(x);
        const sy = this._wy(y);
        if (!this._onScr(sx, sy)) continue;

        const tile = tiles[y][x];
        const vis = state.visible[y][x];
        const h = tileHash(x, y);
        const v = (h & 0xff) / 255; // 0..1 variation

        switch (tile) {
          case TileType.FLOOR:
            this._drawFloorTile(g, sx, sy, cs, v, h, vis);
            break;
          case TileType.WALL:
            this._drawWallTile(g, sx, sy, cs, v, h, vis);
            break;
          case TileType.DOOR:
            this._drawDoorTile(g, sx, sy, cs, vis);
            break;
          case TileType.LOCKED_DOOR:
            this._drawLockedDoorTile(g, sx, sy, cs, vis);
            break;
          case TileType.STAIRS_DOWN:
            this._drawStairsTile(g, sx, sy, cs, vis);
            break;
          case TileType.CHEST:
            this._drawChestTile(g, sx, sy, cs, vis);
            break;
          case TileType.SHRINE:
            this._drawShrineTile(g, sx, sy, cs, vis);
            break;
          case TileType.TRAP_SPIKE:
          case TileType.TRAP_PIT:
          case TileType.TRAP_POISON:
            this._drawFloorTile(g, sx, sy, cs, v, h, vis);
            if (vis && state.playerPerception >= 4) {
              this._drawTrapHint(g, sx, sy, cs, tile);
            }
            break;
        }
      }
    }
  }

  private _drawFloorTile(g: Graphics, sx: number, sy: number, cs: number, v: number, h: number, vis: boolean): void {
    // Stone floor with slight variation
    const base = vis ? 0x1a + Math.floor(v * 10) : 0x10;
    const color = (base << 16) | ((base + 2) << 8) | (base + 4);
    g.rect(sx, sy, cs, cs).fill(color);

    // Individual flagstone pattern — slight shade difference per quadrant
    if (vis && cs >= 16) {
      const q1 = ((h >> 2) & 0x03) - 1; // -1..2
      const qCol = (base + q1) & 0xff;
      g.rect(sx + 1, sy + 1, cs / 2 - 1, cs / 2 - 1).fill({ color: (qCol << 16) | (qCol << 8) | (qCol + 2), alpha: 0.15 });
      const q2 = ((h >> 5) & 0x03) - 1;
      const qCol2 = (base + q2) & 0xff;
      g.rect(sx + cs / 2, sy + cs / 2, cs / 2 - 1, cs / 2 - 1).fill({ color: (qCol2 << 16) | (qCol2 << 8) | (qCol2 + 2), alpha: 0.12 });
    }

    // Stone cracks — main crack line
    if ((h & 0x07) === 0 && vis) {
      g.setStrokeStyle({ width: 0.5, color: 0x0a0a12, alpha: 0.3 });
      const cx = sx + (h % 12) + 3;
      const cy = sy + ((h >> 4) % 10) + 3;
      const ex = cx + ((h >> 2) % 7) - 1;
      const ey = cy + ((h >> 6) % 6) + 1;
      g.moveTo(cx, cy).lineTo(ex, ey).stroke();
      // Branch crack
      g.setStrokeStyle({ width: 0.3, color: 0x0a0a12, alpha: 0.2 });
      g.moveTo(ex, ey).lineTo(ex + ((h >> 8) % 4) - 1, ey + ((h >> 10) % 3)).stroke();
    }

    // Secondary hairline cracks on different tiles
    if ((h & 0x0f) === 3 && vis) {
      g.setStrokeStyle({ width: 0.3, color: 0x0e0e18, alpha: 0.18 });
      const cx2 = sx + (h % 10) + 5;
      const cy2 = sy + ((h >> 3) % 8) + 6;
      g.moveTo(cx2, cy2).lineTo(cx2 + 4, cy2 + 2).lineTo(cx2 + 6, cy2 + 1).stroke();
    }

    // Small rubble / scattered stones
    if ((h & 0x1f) === 0 && vis) {
      g.circle(sx + (h % 14) + 3, sy + ((h >> 3) % 14) + 3, 0.9).fill({ color: 0x2a2a32, alpha: 0.35 });
      g.circle(sx + (h % 10) + 6, sy + ((h >> 5) % 10) + 7, 0.6).fill({ color: 0x252530, alpha: 0.25 });
    }
    // Tiny rubble fragments
    if ((h & 0x3f) === 12 && vis) {
      const rx = sx + (h % 16) + 2;
      const ry = sy + ((h >> 4) % 14) + 2;
      g.rect(rx, ry, 1.2, 0.8).fill({ color: 0x333340, alpha: 0.2 });
      g.rect(rx + 2, ry + 1, 0.8, 1).fill({ color: 0x2e2e3a, alpha: 0.18 });
    }

    // Blood stain (rare, dark old blood)
    if ((h & 0x7f) === 42 && vis) {
      const bx = sx + cs * 0.3 + (h % 5);
      const by = sy + cs * 0.35 + ((h >> 3) % 5);
      g.ellipse(bx, by, 2.5, 1.8).fill({ color: 0x3a0808, alpha: 0.25 });
      g.ellipse(bx + 1.5, by + 1, 1.2, 0.9).fill({ color: 0x2a0505, alpha: 0.18 });
    }
    // Splatter blood (different tiles)
    if ((h & 0x7f) === 77 && vis) {
      const bx = sx + cs * 0.5 + (h % 4) - 2;
      const by = sy + cs * 0.5 + ((h >> 2) % 4) - 2;
      g.circle(bx, by, 1.5).fill({ color: 0x350808, alpha: 0.2 });
      g.circle(bx + 2, by - 1, 0.7).fill({ color: 0x300606, alpha: 0.15 });
      g.circle(bx - 1, by + 2, 0.5).fill({ color: 0x300606, alpha: 0.12 });
    }

    // Subtle grid edge (mortar between flagstones)
    if (vis) {
      g.setStrokeStyle({ width: 0.3, color: 0x0e0e18, alpha: 0.18 });
      g.rect(sx, sy, cs, cs).stroke();
      // Cross-mortar within tile
      if ((h & 0x03) === 0) {
        g.setStrokeStyle({ width: 0.2, color: 0x0e0e18, alpha: 0.1 });
        g.moveTo(sx + cs * 0.5, sy + 1).lineTo(sx + cs * 0.5, sy + cs - 1).stroke();
      }
    }
  }

  private _drawWallTile(g: Graphics, sx: number, sy: number, cs: number, v: number, h: number, vis: boolean): void {
    const baseVal = vis ? 0x30 + Math.floor(v * 12) : 0x20;
    const wallColor = (baseVal << 16) | ((baseVal - 4) << 8) | (baseVal + 6);
    g.rect(sx, sy, cs, cs).fill(wallColor);

    // Individual brick pattern with mortar gaps
    if (cs >= 16 && vis) {
      const brickH = Math.floor(cs / 3);
      const mortarW = 0.8;
      // Three rows of bricks
      for (let row = 0; row < 3; row++) {
        const by = sy + row * brickH;
        const offset = (row % 2 === 0) ? 0 : cs * 0.4 + ((h & 0x04) ? 2 : -2);
        // Brick shade variation per row
        const bShade = baseVal + ((h >> (row * 2)) & 0x03) - 1;
        const bCol = ((bShade & 0xff) << 16) | (((bShade - 3) & 0xff) << 8) | ((bShade + 4) & 0xff);

        // Left brick
        const bw1 = cs * 0.45 + ((h >> (row + 3)) & 0x03);
        g.rect(sx + 1, by + 1, bw1 + offset - 1, brickH - mortarW).fill({ color: bCol, alpha: 0.35 });
        // Right brick
        g.rect(sx + bw1 + offset + mortarW, by + 1, cs - bw1 - offset - mortarW - 1, brickH - mortarW).fill({ color: bCol, alpha: 0.3 });

        // Mortar lines (horizontal)
        g.setStrokeStyle({ width: 0.7, color: 0x0c0c14, alpha: 0.4 });
        g.moveTo(sx + 1, by + brickH).lineTo(sx + cs - 1, by + brickH).stroke();
        // Vertical mortar
        const vx = sx + bw1 + offset;
        g.moveTo(vx, by + 1).lineTo(vx, by + brickH).stroke();
      }

      // Brick surface texture — tiny pits and scratches
      if ((h & 0x0f) < 6) {
        g.circle(sx + (h % 14) + 3, sy + ((h >> 4) % 14) + 3, 0.5).fill({ color: 0x0a0a14, alpha: 0.15 });
      }
      if ((h & 0x1f) < 4) {
        g.setStrokeStyle({ width: 0.25, color: 0x0a0a12, alpha: 0.12 });
        const scX = sx + ((h >> 2) % 12) + 4;
        const scY = sy + ((h >> 6) % 10) + 5;
        g.moveTo(scX, scY).lineTo(scX + 3, scY + 1).stroke();
      }
    }

    // 3D bevel
    const bev = 2;
    g.rect(sx, sy, cs, bev).fill({ color: 0x555568, alpha: vis ? 0.45 : 0.2 }); // top highlight
    g.rect(sx, sy, bev, cs).fill({ color: 0x4a4a5c, alpha: vis ? 0.35 : 0.15 }); // left highlight
    g.rect(sx, sy + cs - bev, cs, bev).fill({ color: 0x0c0c14, alpha: vis ? 0.5 : 0.25 }); // bottom shadow
    g.rect(sx + cs - bev, sy, bev, cs).fill({ color: 0x0e0e18, alpha: vis ? 0.4 : 0.2 }); // right shadow

    // Moss stain
    if ((h & 0x1f) === 5 && vis) {
      g.ellipse(sx + (h % 12) + 4, sy + ((h >> 3) % 12) + 4, 2.5, 1.8).fill({ color: 0x1a2a1a, alpha: 0.22 });
      g.circle(sx + (h % 12) + 6, sy + ((h >> 3) % 12) + 5, 1.2).fill({ color: 0x1e3018, alpha: 0.15 });
    }

    // Torch sconce on select wall tiles (1 in ~32)
    if ((h & 0x1f) === 10 && vis) {
      this._drawTorchSconce(g, sx + cs / 2, sy + cs * 0.35, cs);
    }
  }

  /** Animated torch sconce on a wall. */
  private _drawTorchSconce(g: Graphics, tx: number, ty: number, cs: number): void {
    const t = this._time;
    const flicker = Math.sin(t * 8) * 0.15 + Math.sin(t * 13.7) * 0.1 + Math.sin(t * 19.3) * 0.05;

    // Light glow on surrounding area (warm circle)
    const glowR = cs * 1.8;
    const glowA = 0.06 + flicker * 0.02;
    g.circle(tx, ty, glowR).fill({ color: 0x442200, alpha: glowA });
    g.circle(tx, ty, glowR * 0.6).fill({ color: 0x553300, alpha: glowA * 1.3 });
    g.circle(tx, ty, glowR * 0.3).fill({ color: 0x664400, alpha: glowA * 1.5 });

    // Metal bracket
    g.rect(tx - 1.5, ty + 1, 3, 4).fill({ color: 0x444450, alpha: 0.8 });
    g.rect(tx - 0.8, ty + 4, 1.6, 2).fill({ color: 0x3a3a44, alpha: 0.7 });

    // Torch wood
    g.rect(tx - 0.7, ty - 3, 1.4, 5).fill({ color: 0x6a4420, alpha: 0.85 });

    // Flame — multiple layers with flicker
    const fh = 3.5 + flicker * 1.5;
    const fw = 1.8 + flicker * 0.5;
    // Outer flame (orange)
    g.ellipse(tx, ty - 3 - fh * 0.5, fw * 1.1, fh * 0.7).fill({ color: 0xff6600, alpha: 0.45 + flicker * 0.1 });
    // Mid flame (yellow-orange)
    g.ellipse(tx + flicker * 0.5, ty - 3.5 - fh * 0.4, fw * 0.75, fh * 0.55).fill({ color: 0xffaa22, alpha: 0.55 + flicker * 0.1 });
    // Inner flame (bright yellow)
    g.ellipse(tx, ty - 3.5 - fh * 0.3, fw * 0.45, fh * 0.35).fill({ color: 0xffdd44, alpha: 0.6 + flicker * 0.15 });
    // Hot core (white-yellow)
    g.ellipse(tx, ty - 3.5, fw * 0.2, fh * 0.18).fill({ color: 0xffffaa, alpha: 0.5 });

    // Occasional sparks
    const sparkPhase = (t * 7 + tx * 3.7) % 6;
    if (sparkPhase < 1.5) {
      const sy = ty - 6 - sparkPhase * 4;
      const sparkX = tx + Math.sin(t * 11 + tx) * 2;
      g.circle(sparkX, sy, 0.4).fill({ color: 0xffcc44, alpha: 0.4 * (1 - sparkPhase / 1.5) });
    }
  }

  private _drawDoorTile(g: Graphics, sx: number, sy: number, cs: number, vis: boolean): void {
    // Floor beneath
    g.rect(sx, sy, cs, cs).fill(vis ? 0x1c1c28 : 0x121218);
    const pad = 3;
    const alpha = vis ? 1 : 0.5;
    const dw = cs - pad * 2;
    const dh = cs - pad * 2;
    const dx = sx + pad;
    const dy = sy + pad;

    // Stone door frame (thick border)
    g.rect(dx - 1, dy - 1, dw + 2, dh + 2).fill({ color: 0x3a3a48, alpha: 0.6 * alpha });

    // Wooden door panel
    g.rect(dx, dy, dw, dh).fill({ color: B.COLOR_DOOR, alpha });

    // Vertical wood planks
    const plankCount = 3;
    for (let p = 0; p < plankCount; p++) {
      const px = dx + (dw / plankCount) * p;
      const pw = dw / plankCount;
      // Slightly different shade per plank
      const shade = p % 2 === 0 ? 0x7a5510 : 0x6a4a0e;
      g.rect(px + 0.5, dy + 0.5, pw - 1, dh - 1).fill({ color: shade, alpha: 0.2 * alpha });
      // Plank separator line
      if (p > 0) {
        g.setStrokeStyle({ width: 0.5, color: 0x4a3008, alpha: 0.5 * alpha });
        g.moveTo(px, dy + 1).lineTo(px, dy + dh - 1).stroke();
      }
    }

    // Wood grain lines (curved, organic)
    g.setStrokeStyle({ width: 0.3, color: 0x5a3a06, alpha: 0.3 * alpha });
    for (let i = 1; i < 6; i++) {
      const ly = dy + dh * i / 6;
      const wobble = Math.sin(i * 1.7) * 0.6;
      g.moveTo(dx + 1, ly + wobble).lineTo(dx + dw - 1, ly - wobble).stroke();
    }

    // Iron horizontal brace across door
    g.rect(dx + 1, dy + dh * 0.33 - 1, dw - 2, 2).fill({ color: 0x444455, alpha: 0.5 * alpha });
    g.rect(dx + 1, dy + dh * 0.66 - 1, dw - 2, 2).fill({ color: 0x444455, alpha: 0.5 * alpha });

    // Iron hinges (left side, top and bottom)
    if (vis) {
      for (const hy of [dy + dh * 0.2, dy + dh * 0.8]) {
        // Hinge plate
        g.rect(dx - 1, hy - 1.5, 5, 3).fill({ color: 0x555566, alpha: 0.75 });
        // Hinge pin (circle)
        g.circle(dx, hy, 1.2).fill({ color: 0x666677, alpha: 0.8 });
        g.circle(dx, hy, 0.5).fill({ color: 0x333340, alpha: 0.6 });
      }
    }

    // Outer frame stroke
    g.setStrokeStyle({ width: 1.2, color: 0x5a3a08, alpha: 0.6 * alpha });
    g.rect(dx, dy, dw, dh).stroke();

    // Ring handle (iron)
    if (vis) {
      const hx = sx + cs - pad - 4;
      const hy = sy + cs / 2;
      // Handle mount plate
      g.rect(hx - 1.5, hy - 1.5, 3, 3).fill({ color: 0x555560, alpha: 0.7 });
      // Ring
      g.setStrokeStyle({ width: 0.8, color: 0x777788, alpha: 0.7 });
      g.circle(hx, hy + 1.5, 1.5).stroke();
    }
  }

  private _drawLockedDoorTile(g: Graphics, sx: number, sy: number, cs: number, vis: boolean): void {
    this._drawDoorTile(g, sx, sy, cs, vis);
    if (!vis) return;

    // Gold lock
    const lx = sx + cs / 2;
    const ly = sy + cs / 2;
    g.rect(lx - 3, ly - 1, 6, 5).fill(0xdaa520);
    g.setStrokeStyle({ width: 1.2, color: 0xdaa520, alpha: 1 });
    g.moveTo(lx - 2, ly - 1).lineTo(lx - 2, ly - 4).lineTo(lx + 2, ly - 4).lineTo(lx + 2, ly - 1).stroke();
    g.circle(lx, ly + 1, 0.8).fill(0x1a1a0a);
  }

  private _drawStairsTile(g: Graphics, sx: number, sy: number, cs: number, vis: boolean): void {
    const t = this._time;
    // Dark stone floor around the stairwell
    g.rect(sx, sy, cs, cs).fill(vis ? 0x0e0c0a : 0x050404);
    const cx = sx + cs / 2;
    const cy = sy + cs / 2;

    // Stairwell opening — deep dark pit
    g.roundRect(cx - cs * 0.38, cy - cs * 0.35, cs * 0.76, cs * 0.7, 2).fill(0x020202);

    if (vis) {
      // Eerie blue glow emanating from below — pulsing
      const glowPulse = 0.04 + Math.sin(t * 1.8) * 0.025 + Math.sin(t * 3.1) * 0.01;
      g.circle(cx, cy + 2, cs * 0.5).fill({ color: 0x2266cc, alpha: glowPulse });
      g.circle(cx, cy + 3, cs * 0.35).fill({ color: 0x3388dd, alpha: glowPulse * 1.3 });
      g.circle(cx, cy + 4, cs * 0.2).fill({ color: 0x44aaff, alpha: glowPulse * 1.5 });

      // Descending steps with depth illusion — each step darker than the last
      const stepCount = 5;
      for (let i = 0; i < stepCount; i++) {
        const progress = i / stepCount;
        const stepY = cy - cs * 0.28 + i * (cs * 0.12);
        const stepW = cs * 0.6 - i * (cs * 0.06);
        const depth = 1 - progress * 0.7; // fade darker
        const stepShade = Math.floor(0x3a * depth);
        const stepCol = (stepShade << 16) | ((stepShade - 2) << 8) | (stepShade + 2);

        // Step top face
        g.rect(cx - stepW / 2, stepY, stepW, cs * 0.06).fill({ color: stepCol, alpha: 0.7 * depth });
        // Step edge highlight (lighter top edge)
        g.rect(cx - stepW / 2, stepY, stepW, 0.7).fill({ color: 0x555550, alpha: 0.3 * depth });
        // Step face (darker vertical face)
        g.rect(cx - stepW / 2, stepY + cs * 0.06, stepW, cs * 0.04).fill({ color: 0x111110, alpha: 0.5 * depth });

        // Blue light reflecting on each step (stronger on lower steps)
        g.rect(cx - stepW / 2 + 1, stepY + 0.5, stepW - 2, cs * 0.05).fill({ color: 0x2266cc, alpha: glowPulse * progress * 0.8 });
      }

      // Crumbling edge detail
      g.setStrokeStyle({ width: 0.4, color: 0x222220, alpha: 0.3 });
      g.moveTo(cx - cs * 0.36, cy - cs * 0.33).lineTo(cx - cs * 0.32, cy - cs * 0.28).stroke();
      g.moveTo(cx + cs * 0.34, cy - cs * 0.31).lineTo(cx + cs * 0.3, cy - cs * 0.26).stroke();

      // Stone border around the opening
      g.setStrokeStyle({ width: 1, color: 0x2a2a28, alpha: 0.5 });
      g.roundRect(cx - cs * 0.38, cy - cs * 0.35, cs * 0.76, cs * 0.7, 2).stroke();

      // Faint mist wisps rising from below
      for (let i = 0; i < 2; i++) {
        const mPhase = (t * 0.8 + i * 3.14) % 4;
        if (mPhase < 2) {
          const my = cy + cs * 0.15 - mPhase * cs * 0.2;
          const mx = cx + Math.sin(t * 1.3 + i * 2.5) * cs * 0.12;
          g.ellipse(mx, my, 1.5, 0.8).fill({ color: 0x5599dd, alpha: 0.08 * (1 - mPhase / 2) });
        }
      }

      // Down arrow indicator (subtle)
      g.setStrokeStyle({ width: 0.8, color: B.COLOR_STAIRS, alpha: 0.35 + Math.sin(t * 2.5) * 0.15 });
      g.moveTo(cx, cy + cs * 0.22).lineTo(cx - 2.5, cy + cs * 0.14).stroke();
      g.moveTo(cx, cy + cs * 0.22).lineTo(cx + 2.5, cy + cs * 0.14).stroke();
    }
  }

  private _drawChestTile(g: Graphics, sx: number, sy: number, cs: number, vis: boolean): void {
    g.rect(sx, sy, cs, cs).fill(vis ? 0x1c1c28 : 0x121218);
    const cx = sx + cs / 2;
    const cy = sy + cs / 2;
    const alpha = vis ? 1 : 0.5;
    const t = this._time;

    const cw = cs * 0.6;
    const ch = cs * 0.38;
    const bx = cx - cw / 2;
    const by = cy - ch / 2 + 2;

    // Shadow beneath chest
    if (vis) {
      g.ellipse(cx, cy + ch / 2 + 2, cw * 0.5, 1.5).fill({ color: 0x000000, alpha: 0.25 });
    }

    // Chest body (main box)
    g.rect(bx, by, cw, ch).fill({ color: 0x6a3a10, alpha });
    // Body wood grain
    g.setStrokeStyle({ width: 0.25, color: 0x5a2a08, alpha: 0.25 * alpha });
    for (let i = 1; i < 4; i++) {
      g.moveTo(bx + 1, by + ch * i / 4).lineTo(bx + cw - 1, by + ch * i / 4).stroke();
    }
    // Body highlight (top edge)
    g.rect(bx + 1, by, cw - 2, 1).fill({ color: 0x8a5a20, alpha: 0.3 * alpha });

    // Lid (slightly wider, with curvature suggestion)
    const lidH = ch * 0.35;
    g.rect(bx - 0.5, by - lidH, cw + 1, lidH).fill({ color: 0x7a4a1a, alpha });
    // Lid top highlight
    g.rect(bx, by - lidH, cw, 1).fill({ color: 0x9a6a2a, alpha: 0.35 * alpha });
    // Lid curved top edge
    g.ellipse(cx, by - lidH, cw * 0.5, 1.5).fill({ color: 0x8a5a20, alpha: 0.2 * alpha });

    // Gold corner bands
    const bandAlpha = 0.6 * alpha;
    g.rect(bx, by, 2, ch).fill({ color: B.COLOR_CHEST, alpha: bandAlpha });
    g.rect(bx + cw - 2, by, 2, ch).fill({ color: B.COLOR_CHEST, alpha: bandAlpha });
    // Gold horizontal band across middle
    g.rect(bx, by + ch * 0.45, cw, 1.5).fill({ color: B.COLOR_CHEST, alpha: bandAlpha * 0.8 });

    // Gold trim outline
    g.setStrokeStyle({ width: 0.8, color: B.COLOR_CHEST, alpha: 0.6 * alpha });
    g.rect(bx, by, cw, ch).stroke();
    g.rect(bx - 0.5, by - lidH, cw + 1, lidH).stroke();

    // Clasp / lock
    g.rect(cx - 2, by - 1, 4, 3).fill({ color: B.COLOR_CHEST, alpha });
    g.circle(cx, by + 0.5, 1).fill({ color: 0x2a1a04, alpha: 0.6 * alpha });

    // Gold sparkles (multiple, at different phases)
    if (vis) {
      for (let i = 0; i < 4; i++) {
        const sparkPhase = (t * 3 + i * 1.57) % 3;
        if (sparkPhase < 1.2) {
          const sp = Math.sin(sparkPhase * Math.PI / 1.2);
          const spx = cx + Math.cos(t * 0.5 + i * 1.8) * cw * 0.35;
          const spy = by - lidH * 0.5 - sparkPhase * 3 + Math.sin(i + t) * 1.5;
          const sparkSz = 0.6 + sp * 0.5;
          // Four-point star sparkle
          g.setStrokeStyle({ width: 0.3, color: 0xffd700, alpha: sp * 0.6 });
          g.moveTo(spx - sparkSz, spy).lineTo(spx + sparkSz, spy).stroke();
          g.moveTo(spx, spy - sparkSz).lineTo(spx, spy + sparkSz).stroke();
          g.circle(spx, spy, 0.3).fill({ color: 0xffffaa, alpha: sp * 0.5 });
        }
      }

      // Warm glow around chest
      g.circle(cx, cy, cs * 0.42).fill({ color: 0xffd700, alpha: 0.025 + Math.sin(t * 2) * 0.012 });
    }
  }

  private _drawShrineTile(g: Graphics, sx: number, sy: number, cs: number, vis: boolean): void {
    g.rect(sx, sy, cs, cs).fill(vis ? 0x1c1c30 : 0x121220);
    const cx = sx + cs / 2;
    const cy = sy + cs / 2;
    const t = this._time;

    if (vis) {
      // Holy light beam from above — tapered, semi-transparent
      const beamW = cs * 0.22;
      const beamPulse = 0.04 + Math.sin(t * 1.5) * 0.02;
      g.moveTo(cx - beamW * 1.5, sy).lineTo(cx + beamW * 1.5, sy)
        .lineTo(cx + beamW * 0.3, cy + cs * 0.3).lineTo(cx - beamW * 0.3, cy + cs * 0.3)
        .closePath().fill({ color: 0xddaaff, alpha: beamPulse });
      g.moveTo(cx - beamW, sy).lineTo(cx + beamW, sy)
        .lineTo(cx + beamW * 0.15, cy + cs * 0.25).lineTo(cx - beamW * 0.15, cy + cs * 0.25)
        .closePath().fill({ color: 0xeeccff, alpha: beamPulse * 1.5 });

      // Aura rings
      const pulse = 0.3 + Math.sin(t * 2) * 0.15;
      g.circle(cx, cy, cs * 0.45).fill({ color: B.COLOR_SHRINE, alpha: pulse * 0.1 });
      g.circle(cx, cy, cs * 0.32).fill({ color: B.COLOR_SHRINE, alpha: pulse * 0.15 });

      // Rotating halo around the orb
      const haloR = 5;
      g.setStrokeStyle({ width: 0.5, color: 0xddaaff, alpha: 0.3 + Math.sin(t * 2.5) * 0.1 });
      for (let seg = 0; seg < 8; seg++) {
        const a1 = t * 1.5 + (seg / 8) * Math.PI * 2;
        const a2 = a1 + Math.PI * 2 / 12;
        g.moveTo(cx + Math.cos(a1) * haloR, cy - 4 + Math.sin(a1) * haloR * 0.4)
          .lineTo(cx + Math.cos(a2) * haloR, cy - 4 + Math.sin(a2) * haloR * 0.4).stroke();
      }
    }

    // Pedestal base (wider)
    g.rect(cx - 5, cy + 2, 10, 3).fill({ color: 0x4a4a5a, alpha: vis ? 0.8 : 0.4 });
    // Pedestal column
    g.rect(cx - 3, cy - 2, 6, 5).fill({ color: 0x5a5a6a, alpha: vis ? 0.85 : 0.4 });
    // Pedestal cap
    g.rect(cx - 4, cy - 3, 8, 1.5).fill({ color: 0x666677, alpha: vis ? 0.8 : 0.4 });
    // Pedestal highlight
    g.rect(cx - 2.5, cy - 1, 1, 3).fill({ color: 0x7a7a8a, alpha: vis ? 0.2 : 0.1 });

    // Glowing orb with layered glow
    if (vis) {
      const orbPulse = 0.5 + Math.sin(t * 3) * 0.2;
      g.circle(cx, cy - 4, 3.5).fill({ color: B.COLOR_SHRINE, alpha: orbPulse * 0.25 });
      g.circle(cx, cy - 4, 2.5).fill({ color: B.COLOR_SHRINE, alpha: orbPulse * 0.5 });
      g.circle(cx, cy - 4, 1.5).fill({ color: 0xeeddff, alpha: orbPulse * 0.6 });
      g.circle(cx, cy - 4, 0.7).fill({ color: 0xffffff, alpha: orbPulse * 0.4 });

      // Prayer particles — small crosses rising and fading
      for (let i = 0; i < 5; i++) {
        const pPhase = (t * 0.7 + i * 1.26) % 4;
        if (pPhase < 2.5) {
          const py = cy - 5 - pPhase * 5;
          const px = cx + Math.sin(t * 1.2 + i * 2.5) * 4;
          const pAlpha = 0.25 * (1 - pPhase / 2.5);
          g.setStrokeStyle({ width: 0.3, color: 0xddaaff, alpha: pAlpha });
          g.moveTo(px - 0.8, py).lineTo(px + 0.8, py).stroke();
          g.moveTo(px, py - 0.8).lineTo(px, py + 0.8).stroke();
        }
      }

      // Ground rune circle
      g.setStrokeStyle({ width: 0.3, color: B.COLOR_SHRINE, alpha: 0.12 + Math.sin(t * 1.8) * 0.05 });
      g.circle(cx, cy + 2, cs * 0.35).stroke();
    }
  }

  private _drawTrapHint(g: Graphics, sx: number, sy: number, cs: number, tile: TileType): void {
    const cx = sx + cs / 2;
    const cy = sy + cs / 2;
    g.setStrokeStyle({ width: 0.5, color: B.COLOR_TRAP_SPIKE, alpha: 0.35 });

    switch (tile) {
      case TileType.TRAP_SPIKE:
        g.moveTo(cx - 2, cy - 2).lineTo(cx + 2, cy + 2).stroke();
        g.moveTo(cx + 2, cy - 2).lineTo(cx - 2, cy + 2).stroke();
        break;
      case TileType.TRAP_PIT:
        g.circle(cx, cy, 3).stroke();
        break;
      case TileType.TRAP_POISON:
        g.circle(cx - 1, cy - 1, 0.8).fill({ color: B.COLOR_POISON, alpha: 0.3 });
        g.circle(cx + 1, cy - 1, 0.8).fill({ color: B.COLOR_POISON, alpha: 0.3 });
        break;
    }
  }

  // -----------------------------------------------------------------------
  // FOG OF WAR
  // -----------------------------------------------------------------------

  private _drawFogOfWar(g: Graphics, state: GrailState): void {
    const { cols, rows } = state.dungeon;
    const cs = B.CELL_SIZE;

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const sx = this._wx(x);
        const sy = this._wy(y);
        if (!this._onScr(sx, sy)) continue;

        if (!state.explored[y][x]) {
          // Solid black for unexplored
          g.rect(sx, sy, cs, cs).fill(0x000000);
        } else if (!state.visible[y][x]) {
          // Dark overlay for explored-but-not-visible
          g.rect(sx, sy, cs, cs).fill({ color: B.COLOR_FOG, alpha: 0.6 });
        }
      }
    }
  }

  // -----------------------------------------------------------------------
  // ENTITIES (procedural sprites)
  // -----------------------------------------------------------------------

  private _drawEntities(g: Graphics, state: GrailState): void {
    for (const e of state.entities) {
      if (!e.alive) continue;
      if (!state.visible[e.y]?.[e.x]) continue;

      const cx = this._wx(e.x) + B.CELL_SIZE / 2;
      const cy = this._wy(e.y) + B.CELL_SIZE / 2;
      if (!this._onScr(cx - B.CELL_SIZE / 2, cy - B.CELL_SIZE / 2)) continue;

      switch (e.type) {
        case EntityType.RAT: this._drawRat(g, cx, cy); break;
        case EntityType.SKELETON: this._drawSkeleton(g, cx, cy); break;
        case EntityType.GOBLIN_ARCHER: this._drawGoblinArcher(g, cx, cy); break;
        case EntityType.DARK_KNIGHT: this._drawDarkKnight(g, cx, cy); break;
        case EntityType.WRAITH: this._drawWraith(g, cx, cy); break;
        case EntityType.ENCHANTED_ARMOR: this._drawEnchantedArmor(g, cx, cy); break;
        case EntityType.BOSS: this._drawBossEntity(g, cx, cy); break;
      }

      // HP bar when damaged
      if (e.hp < e.maxHp) {
        this._drawEntityHP(g, cx, cy - B.CELL_SIZE / 2 - 4, e.hp, e.maxHp);
      }

      // Stun stars — spinning orbit with trail
      if (e.stunTimer > 0) {
        const sp = this._time * 6;
        const orbitR = 7;
        const orbitY = cy - B.CELL_SIZE / 2 - 6;
        for (let si = 0; si < 4; si++) {
          const a = sp + si * Math.PI * 0.5;
          const starX = cx + Math.cos(a) * orbitR;
          const starY = orbitY + Math.sin(a * 0.7) * 2;
          // Star trail
          g.circle(starX - Math.cos(a) * 1.5, starY, 0.6).fill({ color: B.COLOR_STUN, alpha: 0.2 });
          // Star shape
          g.star(starX, starY, 4, 1.5, 2, a)
            .fill({ color: B.COLOR_STUN, alpha: 0.75 });
          g.circle(starX, starY, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
        }
        // Dizziness ring
        g.setStrokeStyle({ width: 0.3, color: B.COLOR_STUN, alpha: 0.15 });
        g.circle(cx, orbitY, orbitR).stroke();
      }

      // Poison — rising green bubbles
      if (e.poisonTimer > 0) {
        const pt = this._time;
        for (let bi = 0; bi < 4; bi++) {
          const bPhase = (pt * 1.5 + bi * 0.8) % 2;
          const bx = cx + Math.sin(bi * 2.3 + pt) * 3 - 1;
          const by = cy + B.CELL_SIZE / 2 - 2 - bPhase * 6;
          const bAlpha = 0.5 * (1 - bPhase / 2);
          const bSize = 1.2 - bPhase * 0.3;
          g.circle(bx, by, Math.max(0.3, bSize)).fill({ color: B.COLOR_POISON, alpha: bAlpha });
          // Bubble highlight
          g.circle(bx - 0.3, by - 0.3, Math.max(0.1, bSize * 0.3)).fill({ color: 0xaaffaa, alpha: bAlpha * 0.3 });
        }
        // Green drip at feet
        g.circle(cx - 1, cy + B.CELL_SIZE / 2 - 1, 1.8).fill({ color: B.COLOR_POISON, alpha: 0.3 });
        g.circle(cx + 2, cy + B.CELL_SIZE / 2 - 0.5, 1.2).fill({ color: B.COLOR_POISON, alpha: 0.25 });
      }
    }
  }

  private _drawEntityHP(g: Graphics, cx: number, y: number, hp: number, maxHp: number): void {
    const w = B.CELL_SIZE - 2;
    const h = 2;
    const x = cx - w / 2;
    const ratio = Math.max(0, hp / maxHp);
    g.rect(x, y, w, h).fill({ color: 0x330000, alpha: 0.7 });
    const c = ratio > 0.5 ? 0x44aa44 : ratio > 0.25 ? 0xcc8800 : 0xcc2222;
    g.rect(x, y, w * ratio, h).fill({ color: c, alpha: 0.9 });
  }

  // --- Individual entity drawings ---

  private _drawRat(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.3;
    const t = this._time;
    // Scurrying bob animation
    const bob = Math.sin(t * 12) * 0.5;
    const scurry = Math.cos(t * 12) * 0.3;
    const ry = cy + 1 + bob;

    // Shadow
    g.ellipse(cx, cy + s * 0.7, s * 0.7, s * 0.15).fill({ color: 0x000000, alpha: 0.15 });

    // Tail — longer, curving, animated sway
    const tailSway = Math.sin(t * 8) * 1.5;
    g.setStrokeStyle({ width: 0.6, color: 0x8a6543, alpha: 0.55 });
    g.moveTo(cx - s * 0.7, ry)
      .quadraticCurveTo(cx - s * 1.2, ry - 2 + tailSway, cx - s * 1.5, ry - 4 + tailSway * 0.5)
      .stroke();
    g.setStrokeStyle({ width: 0.4, color: 0x8a6543, alpha: 0.4 });
    g.moveTo(cx - s * 1.5, ry - 4 + tailSway * 0.5)
      .quadraticCurveTo(cx - s * 1.7, ry - 5 + tailSway, cx - s * 1.9, ry - 3 + tailSway)
      .stroke();

    // Hind legs (tiny)
    g.setStrokeStyle({ width: 0.5, color: 0x6a4523, alpha: 0.5 });
    g.moveTo(cx - s * 0.4, ry + s * 0.3).lineTo(cx - s * 0.5, ry + s * 0.6).stroke();
    g.moveTo(cx - s * 0.1, ry + s * 0.35).lineTo(cx - s * 0.15, ry + s * 0.6).stroke();

    // Body — slightly elongated
    g.ellipse(cx + scurry, ry, s * 1.05, s * 0.55).fill(0x7a5533);
    // Fur texture
    g.ellipse(cx + scurry, ry - s * 0.1, s * 0.8, s * 0.35).fill({ color: 0x8a6543, alpha: 0.25 });

    // Front legs
    g.setStrokeStyle({ width: 0.5, color: 0x6a4523, alpha: 0.5 });
    const fLegBob = Math.sin(t * 12 + 1) * 0.5;
    g.moveTo(cx + s * 0.5, ry + s * 0.2).lineTo(cx + s * 0.6, ry + s * 0.55 + fLegBob).stroke();
    g.moveTo(cx + s * 0.7, ry + s * 0.15).lineTo(cx + s * 0.8, ry + s * 0.5 + fLegBob).stroke();

    // Head
    g.ellipse(cx + s * 0.75 + scurry, cy - 0.5 + bob, s * 0.42, s * 0.35).fill(0x8a6543);
    // Snout (pointed)
    g.moveTo(cx + s * 1.05 + scurry, cy - 0.5 + bob)
      .lineTo(cx + s * 1.25 + scurry, cy + bob)
      .lineTo(cx + s * 1.05 + scurry, cy + 0.5 + bob).closePath().fill(0x9a7553);
    // Nose
    g.circle(cx + s * 1.22 + scurry, cy + bob, 0.5).fill(0xcc5566);

    // Whiskers
    g.setStrokeStyle({ width: 0.2, color: 0xaa9977, alpha: 0.4 });
    const whiskerSway = Math.sin(t * 10) * 0.5;
    g.moveTo(cx + s * 1.1 + scurry, cy - 0.5 + bob).lineTo(cx + s * 1.5 + scurry, cy - 2 + bob + whiskerSway).stroke();
    g.moveTo(cx + s * 1.1 + scurry, cy + 0.5 + bob).lineTo(cx + s * 1.5 + scurry, cy + 2 + bob - whiskerSway).stroke();
    g.moveTo(cx + s * 1.1 + scurry, cy + bob).lineTo(cx + s * 1.6 + scurry, cy + bob + whiskerSway * 0.5).stroke();

    // Red eyes
    const eyeFlicker = 0.7 + Math.sin(t * 7) * 0.3;
    g.circle(cx + s * 0.9 + scurry, cy - 1.2 + bob, 0.7).fill({ color: 0xff3333, alpha: eyeFlicker });

    // Ears (rounded, angled)
    g.ellipse(cx + s * 0.5 + scurry, cy - s * 0.5 + bob, 1.2, 1.5).fill(0x9a7553);
    g.ellipse(cx + s * 0.5 + scurry, cy - s * 0.5 + bob, 0.6, 0.8).fill({ color: 0xba8563, alpha: 0.4 });
  }

  private _drawSkeleton(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.35;
    const t = this._time;

    // Skull
    g.circle(cx, cy - s * 0.65, s * 0.5).fill(0xddddcc);
    // Skull highlight
    g.circle(cx - 0.5, cy - s * 0.75, s * 0.25).fill({ color: 0xeeeedd, alpha: 0.2 });
    // Brow ridge
    g.rect(cx - s * 0.35, cy - s * 0.8, s * 0.7, 1).fill({ color: 0xccccbb, alpha: 0.5 });

    // Eye sockets with flickering glow
    g.circle(cx - 1.5, cy - s * 0.73, 1.3).fill(0x0a0a0a);
    g.circle(cx + 1.5, cy - s * 0.73, 1.3).fill(0x0a0a0a);
    const eyeFlicker = 0.4 + Math.sin(t * 6) * 0.25 + Math.sin(t * 13.7) * 0.15;
    g.circle(cx - 1.5, cy - s * 0.73, 0.7).fill({ color: 0xff4422, alpha: eyeFlicker });
    g.circle(cx + 1.5, cy - s * 0.73, 0.7).fill({ color: 0xff4422, alpha: eyeFlicker });
    // Eye glow halo
    g.circle(cx - 1.5, cy - s * 0.73, 2.2).fill({ color: 0xff2200, alpha: eyeFlicker * 0.08 });
    g.circle(cx + 1.5, cy - s * 0.73, 2.2).fill({ color: 0xff2200, alpha: eyeFlicker * 0.08 });

    // Nose hole
    g.moveTo(cx - 0.4, cy - s * 0.58).lineTo(cx, cy - s * 0.52).lineTo(cx + 0.4, cy - s * 0.58).closePath().fill(0x111111);

    // Jaw — separate piece with slight movement
    const jawOpen = Math.sin(t * 3) * 0.5 + 0.5; // 0..1
    const jawY = cy - s * 0.28 + jawOpen * 0.8;
    g.moveTo(cx - 2, jawY).lineTo(cx - 1.8, jawY + 1.5).lineTo(cx + 1.8, jawY + 1.5).lineTo(cx + 2, jawY).closePath().fill(0xccccbb);
    // Teeth along jaw
    g.setStrokeStyle({ width: 0.3, color: 0xbbbbaa, alpha: 0.5 });
    for (let i = -1; i <= 1; i++) {
      g.moveTo(cx + i * 1.2, cy - s * 0.36).lineTo(cx + i * 1.2, jawY + 0.3).stroke();
    }

    // Spine — individual vertebrae
    const spineTop = cy - s * 0.15;
    const spineBot = cy + s * 0.45;
    const vertCount = 5;
    for (let i = 0; i < vertCount; i++) {
      const vy = spineTop + (spineBot - spineTop) * i / (vertCount - 1);
      g.circle(cx, vy, 1).fill({ color: 0xccccbb, alpha: 0.7 });
    }

    // Ribs — curved bone pairs
    g.setStrokeStyle({ width: 0.7, color: 0xbbbbaa, alpha: 0.55 });
    for (let r = 0; r < 3; r++) {
      const ribY = cy + s * (-0.02 + r * 0.12);
      const ribW = 3 - r * 0.4;
      g.moveTo(cx, ribY).quadraticCurveTo(cx - ribW * 0.6, ribY - 0.5, cx - ribW, ribY + 0.3).stroke();
      g.moveTo(cx, ribY).quadraticCurveTo(cx + ribW * 0.6, ribY - 0.5, cx + ribW, ribY + 0.3).stroke();
    }

    // Arms — upper arm bone, elbow joint, forearm bone
    g.setStrokeStyle({ width: 0.8, color: 0xccccbb, alpha: 0.65 });
    // Left arm
    g.moveTo(cx - 2.5, cy - s * 0.02).lineTo(cx - 4, cy + 1).stroke();
    g.circle(cx - 4, cy + 1, 0.5).fill({ color: 0xccccbb, alpha: 0.5 });
    g.moveTo(cx - 4, cy + 1).lineTo(cx - 5.5, cy + 3).stroke();
    // Hand bones
    g.circle(cx - 5.5, cy + 3, 0.7).fill({ color: 0xccccbb, alpha: 0.4 });
    // Right arm
    g.moveTo(cx + 2.5, cy - s * 0.02).lineTo(cx + 4, cy + 1).stroke();
    g.circle(cx + 4, cy + 1, 0.5).fill({ color: 0xccccbb, alpha: 0.5 });
    g.moveTo(cx + 4, cy + 1).lineTo(cx + 5.5, cy + 3).stroke();
    g.circle(cx + 5.5, cy + 3, 0.7).fill({ color: 0xccccbb, alpha: 0.4 });

    // Pelvis
    g.ellipse(cx, cy + s * 0.48, 2, 1).fill({ color: 0xbbbbaa, alpha: 0.5 });

    // Legs — femur, knee joint, tibia
    g.setStrokeStyle({ width: 0.8, color: 0xccccbb, alpha: 0.6 });
    // Left leg
    g.moveTo(cx - 1.2, cy + s * 0.48).lineTo(cx - 2, cy + s * 0.72).stroke();
    g.circle(cx - 2, cy + s * 0.72, 0.5).fill({ color: 0xccccbb, alpha: 0.45 });
    g.moveTo(cx - 2, cy + s * 0.72).lineTo(cx - 2.5, cy + s).stroke();
    // Right leg
    g.moveTo(cx + 1.2, cy + s * 0.48).lineTo(cx + 2, cy + s * 0.72).stroke();
    g.circle(cx + 2, cy + s * 0.72, 0.5).fill({ color: 0xccccbb, alpha: 0.45 });
    g.moveTo(cx + 2, cy + s * 0.72).lineTo(cx + 2.5, cy + s).stroke();
  }

  private _drawGoblinArcher(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.33;
    const t = this._time;

    // Shadow
    g.ellipse(cx, cy + s * 0.9, s * 0.5, s * 0.12).fill({ color: 0x000000, alpha: 0.15 });

    // Legs
    g.rect(cx - s * 0.22, cy + s * 0.35, s * 0.15, s * 0.45).fill(0x2a6622);
    g.rect(cx + s * 0.07, cy + s * 0.35, s * 0.15, s * 0.45).fill(0x2a6622);

    // Body — ragged tunic
    g.ellipse(cx, cy + 1, s * 0.55, s * 0.75).fill(0x338833);
    // Tunic tatter marks
    g.setStrokeStyle({ width: 0.25, color: 0x226622, alpha: 0.3 });
    g.moveTo(cx - s * 0.3, cy + s * 0.5).lineTo(cx - s * 0.35, cy + s * 0.65).stroke();
    g.moveTo(cx + s * 0.2, cy + s * 0.55).lineTo(cx + s * 0.25, cy + s * 0.7).stroke();
    // Belt
    g.rect(cx - s * 0.45, cy + s * 0.1, s * 0.9, 1.2).fill({ color: 0x553311, alpha: 0.5 });

    // Quiver on back (visible behind)
    g.rect(cx - s * 0.55, cy - s * 0.3, s * 0.18, s * 0.9).fill({ color: 0x664422, alpha: 0.6 });
    // Arrow feathers sticking out
    for (let i = 0; i < 3; i++) {
      const ay = cy - s * 0.35 - i * 1.5;
      g.setStrokeStyle({ width: 0.4, color: 0x887755, alpha: 0.5 });
      g.moveTo(cx - s * 0.5, ay).lineTo(cx - s * 0.5, ay - 2).stroke();
      g.moveTo(cx - s * 0.5 - 0.5, ay - 1.5).lineTo(cx - s * 0.5 + 0.5, ay - 1.5).stroke();
    }

    // Head
    g.circle(cx, cy - s * 0.55, s * 0.42).fill(0x44aa44);
    // Warty nose
    g.circle(cx + s * 0.15, cy - s * 0.48, 1).fill({ color: 0x339933, alpha: 0.6 });

    // Pointed hat (cone shaped)
    g.moveTo(cx - s * 0.35, cy - s * 0.7).lineTo(cx, cy - s * 1.4).lineTo(cx + s * 0.35, cy - s * 0.7).closePath().fill(0x553322);
    // Hat brim
    g.ellipse(cx, cy - s * 0.7, s * 0.42, s * 0.1).fill(0x553322);
    // Hat tip droop
    g.setStrokeStyle({ width: 0.5, color: 0x553322, alpha: 0.7 });
    g.moveTo(cx, cy - s * 1.4).quadraticCurveTo(cx + s * 0.3, cy - s * 1.3, cx + s * 0.4, cy - s * 1.15).stroke();

    // Pointed ears (larger, more pronounced)
    g.moveTo(cx - s * 0.4, cy - s * 0.6).lineTo(cx - s * 0.85, cy - s * 0.85).lineTo(cx - s * 0.28, cy - s * 0.48).closePath().fill(0x44aa44);
    g.moveTo(cx + s * 0.4, cy - s * 0.6).lineTo(cx + s * 0.85, cy - s * 0.85).lineTo(cx + s * 0.28, cy - s * 0.48).closePath().fill(0x44aa44);
    // Inner ear
    g.moveTo(cx - s * 0.38, cy - s * 0.58).lineTo(cx - s * 0.7, cy - s * 0.78).lineTo(cx - s * 0.3, cy - s * 0.5).closePath().fill({ color: 0x55bb55, alpha: 0.3 });

    // Yellow eyes with slit pupils
    g.circle(cx - 1.3, cy - s * 0.63, 1).fill(0xffff33);
    g.circle(cx + 1.3, cy - s * 0.63, 1).fill(0xffff33);
    g.ellipse(cx - 1.3, cy - s * 0.63, 0.3, 0.7).fill(0x111100);
    g.ellipse(cx + 1.3, cy - s * 0.63, 0.3, 0.7).fill(0x111100);
    // Mouth — snaggle-toothed grin
    g.setStrokeStyle({ width: 0.3, color: 0x226622, alpha: 0.4 });
    g.moveTo(cx - 1.5, cy - s * 0.4).quadraticCurveTo(cx, cy - s * 0.35, cx + 1.5, cy - s * 0.4).stroke();

    // Bow (drawn back with arrow)
    const bowX = cx + s * 0.9;
    g.setStrokeStyle({ width: 1, color: 0x8a6633, alpha: 0.85 });
    g.moveTo(bowX, cy - s * 0.65).quadraticCurveTo(bowX + 4, cy, bowX, cy + s * 0.65).stroke();
    // Bowstring (drawn back toward hand)
    const drawBack = Math.sin(t * 2) * 0.5 + 1;
    g.setStrokeStyle({ width: 0.35, color: 0xccccaa, alpha: 0.55 });
    g.moveTo(bowX, cy - s * 0.65).lineTo(bowX - drawBack, cy).lineTo(bowX, cy + s * 0.65).stroke();
    // Arrow nocked on string
    g.setStrokeStyle({ width: 0.6, color: 0x887755, alpha: 0.7 });
    g.moveTo(bowX - drawBack - 1, cy).lineTo(bowX + 5, cy).stroke();
    // Arrowhead
    g.moveTo(bowX + 5, cy).lineTo(bowX + 4, cy - 0.8).lineTo(bowX + 6, cy).lineTo(bowX + 4, cy + 0.8).closePath().fill({ color: 0x888899, alpha: 0.6 });
  }

  private _drawDarkKnight(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.38;
    const t = this._time;

    // Shadow
    g.ellipse(cx, cy + s, s * 0.6, s * 0.15).fill({ color: 0x000000, alpha: 0.2 });

    // Red cape flowing behind (drawn first)
    const capeWave = Math.sin(t * 3) * 1;
    g.moveTo(cx - s * 0.35, cy - s * 0.2)
      .lineTo(cx - s * 0.5 + capeWave, cy + s * 0.9)
      .quadraticCurveTo(cx - s * 0.3, cy + s * 1.05 + capeWave * 0.5, cx, cy + s * 0.85)
      .quadraticCurveTo(cx + s * 0.3, cy + s * 1.05 - capeWave * 0.5, cx + s * 0.5 - capeWave, cy + s * 0.9)
      .lineTo(cx + s * 0.35, cy - s * 0.2)
      .closePath().fill({ color: 0x881111, alpha: 0.6 });
    // Cape inner shadow
    g.moveTo(cx - s * 0.25, cy + s * 0.1)
      .quadraticCurveTo(cx, cy + s * 0.5, cx + s * 0.25, cy + s * 0.1)
      .closePath().fill({ color: 0x440808, alpha: 0.2 });

    // Legs — dark plate greaves
    g.rect(cx - s * 0.3, cy + s * 0.45, s * 0.24, s * 0.55).fill(0x1a1a28);
    g.rect(cx + s * 0.06, cy + s * 0.45, s * 0.24, s * 0.55).fill(0x1a1a28);
    // Greave edge highlight
    g.rect(cx - s * 0.29, cy + s * 0.45, s * 0.05, s * 0.5).fill({ color: 0x2a2a3a, alpha: 0.3 });
    g.rect(cx + s * 0.07, cy + s * 0.45, s * 0.05, s * 0.5).fill({ color: 0x2a2a3a, alpha: 0.3 });
    // Sabatons
    g.ellipse(cx - s * 0.18, cy + s, s * 0.15, s * 0.06).fill(0x151522);

    // Armor body — layered dark plate
    g.ellipse(cx, cy + 1, s * 0.65, s * 0.85).fill(0x222233);
    // Chest plate overlay
    g.ellipse(cx, cy - s * 0.05, s * 0.45, s * 0.55).fill({ color: 0x2a2a3a, alpha: 0.4 });
    // Plate edge lines
    g.setStrokeStyle({ width: 0.3, color: 0x333344, alpha: 0.3 });
    g.ellipse(cx, cy + s * 0.15, s * 0.5, s * 0.3).stroke();
    // Dark emblem on chest
    g.circle(cx, cy, 1.5).fill({ color: 0x880000, alpha: 0.35 });

    // Shoulder pauldrons — spiked
    g.ellipse(cx - s * 0.62, cy - s * 0.12, s * 0.3, s * 0.24).fill(0x2a2a3a);
    g.ellipse(cx + s * 0.62, cy - s * 0.12, s * 0.3, s * 0.24).fill(0x2a2a3a);
    // Pauldron spikes
    g.moveTo(cx - s * 0.72, cy - s * 0.25).lineTo(cx - s * 0.8, cy - s * 0.5).lineTo(cx - s * 0.62, cy - s * 0.22).closePath().fill(0x2a2a3a);
    g.moveTo(cx + s * 0.72, cy - s * 0.25).lineTo(cx + s * 0.8, cy - s * 0.5).lineTo(cx + s * 0.62, cy - s * 0.22).closePath().fill(0x2a2a3a);
    // Pauldron edge highlight
    g.ellipse(cx - s * 0.62, cy - s * 0.18, s * 0.28, s * 0.08).fill({ color: 0x333344, alpha: 0.25 });
    g.ellipse(cx + s * 0.62, cy - s * 0.18, s * 0.28, s * 0.08).fill({ color: 0x333344, alpha: 0.25 });

    // Helmet — menacing dark great helm
    g.circle(cx, cy - s * 0.6, s * 0.47).fill(0x1a1a2a);
    // Helmet faceguard
    g.rect(cx - s * 0.2, cy - s * 0.45, s * 0.4, s * 0.2).fill({ color: 0x141422, alpha: 0.5 });
    // Visor slit
    g.rect(cx - s * 0.27, cy - s * 0.66, s * 0.54, 2).fill(0x0a0a14);
    // Red eyes — menacing glow
    const eyeGlow = 0.7 + Math.sin(t * 5) * 0.3;
    g.circle(cx - 2, cy - s * 0.64, 1).fill({ color: 0xff2222, alpha: eyeGlow });
    g.circle(cx + 2, cy - s * 0.64, 1).fill({ color: 0xff2222, alpha: eyeGlow });
    g.circle(cx - 2, cy - s * 0.64, 2.5).fill({ color: 0xff0000, alpha: eyeGlow * 0.08 });
    g.circle(cx + 2, cy - s * 0.64, 2.5).fill({ color: 0xff0000, alpha: eyeGlow * 0.08 });
    // Helmet crest — menacing spike
    g.moveTo(cx, cy - s * 1.1).lineTo(cx - 1.5, cy - s * 0.6).lineTo(cx + 1.5, cy - s * 0.6).closePath().fill(0x1a1a2a);
    // Helmet rivets
    g.circle(cx - s * 0.35, cy - s * 0.55, 0.4).fill({ color: 0x333344, alpha: 0.4 });
    g.circle(cx + s * 0.35, cy - s * 0.55, 0.4).fill({ color: 0x333344, alpha: 0.4 });

    // Sword — dark steel with faint red glow
    const swordX = cx + s * 0.5;
    g.setStrokeStyle({ width: 1.4, color: 0x888899, alpha: 0.9 });
    g.moveTo(swordX, cy - s * 0.3).lineTo(swordX, cy + s * 0.95).stroke();
    // Blade edge gleam
    g.setStrokeStyle({ width: 0.3, color: 0xaaaabb, alpha: 0.3 });
    g.moveTo(swordX + 0.7, cy - s * 0.25).lineTo(swordX + 0.7, cy + s * 0.9).stroke();
    // Crossguard
    g.rect(swordX - s * 0.2, cy - s * 0.3, s * 0.4, 2).fill(0x555566);
    // Sword red glow
    g.circle(swordX, cy + s * 0.3, 3).fill({ color: 0xff2222, alpha: 0.04 + Math.sin(t * 3) * 0.02 });

    // Menacing stance — slight forward lean
  }

  private _drawWraith(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.38;
    const t = this._time;
    const ga = 0.3 + Math.sin(t * 3) * 0.1;
    const undulate = Math.sin(t * 2.5) * 1.5; // slow vertical bob

    const wy = cy + undulate;

    // Outer ethereal glow — layered
    g.circle(cx, wy, s * 1.5).fill({ color: 0x6622aa, alpha: ga * 0.06 });
    g.circle(cx, wy, s * 1.3).fill({ color: 0x7733bb, alpha: ga * 0.1 });

    // Chains dragging below — two chains swaying
    g.setStrokeStyle({ width: 0.5, color: 0x666677, alpha: 0.35 });
    const chainSway1 = Math.sin(t * 2) * 2;
    const chainSway2 = Math.sin(t * 2 + 1.5) * 2;
    // Left chain
    for (let c = 0; c < 4; c++) {
      const cy1 = wy + s * 0.5 + c * 2;
      const cxo = cx - s * 0.3 + chainSway1 * (c * 0.15);
      g.ellipse(cxo, cy1, 1, 1.2).stroke();
    }
    // Right chain
    for (let c = 0; c < 3; c++) {
      const cy1 = wy + s * 0.4 + c * 2;
      const cxo = cx + s * 0.2 + chainSway2 * (c * 0.15);
      g.ellipse(cxo, cy1, 1, 1.2).stroke();
    }

    // Ghostly body — multiple transparent layers for depth
    // Outer wispy layer
    g.moveTo(cx - s * 0.65, wy - s * 0.3)
      .lineTo(cx - s * 0.8, wy + s * 0.35)
      .quadraticCurveTo(cx - s * 0.55, wy + s * 0.65 + Math.sin(t * 4) * 2.5, cx - s * 0.25, wy + s * 0.5)
      .quadraticCurveTo(cx - s * 0.1, wy + s * 0.75 + Math.sin(t * 4 + 0.7) * 2, cx, wy + s * 0.55)
      .quadraticCurveTo(cx + s * 0.1, wy + s * 0.75 + Math.sin(t * 4 + 1.4) * 2, cx + s * 0.25, wy + s * 0.5)
      .quadraticCurveTo(cx + s * 0.55, wy + s * 0.65 + Math.sin(t * 4 + 2.1) * 2.5, cx + s * 0.8, wy + s * 0.35)
      .lineTo(cx + s * 0.65, wy - s * 0.3)
      .quadraticCurveTo(cx, wy - s * 0.85, cx - s * 0.65, wy - s * 0.3)
      .closePath()
      .fill({ color: 0x6633aa, alpha: ga * 0.4 });

    // Core body layer
    g.moveTo(cx - s * 0.5, wy - s * 0.3)
      .lineTo(cx - s * 0.6, wy + s * 0.25)
      .quadraticCurveTo(cx - s * 0.4, wy + s * 0.5 + Math.sin(t * 4) * 2, cx - s * 0.15, wy + s * 0.4)
      .quadraticCurveTo(cx, wy + s * 0.6 + Math.sin(t * 4 + 1) * 2, cx + s * 0.15, wy + s * 0.4)
      .quadraticCurveTo(cx + s * 0.4, wy + s * 0.5 + Math.sin(t * 4 + 2) * 2, cx + s * 0.6, wy + s * 0.25)
      .lineTo(cx + s * 0.5, wy - s * 0.3)
      .quadraticCurveTo(cx, wy - s * 0.75, cx - s * 0.5, wy - s * 0.3)
      .closePath()
      .fill({ color: 0x8844cc, alpha: ga });

    // Inner highlight — ectoplasm glow
    g.ellipse(cx, wy - s * 0.08, s * 0.28, s * 0.38).fill({ color: 0xaa66ee, alpha: ga * 0.35 });
    g.ellipse(cx, wy - s * 0.15, s * 0.15, s * 0.2).fill({ color: 0xcc88ff, alpha: ga * 0.2 });

    // Spectral wisps emanating outward
    for (let i = 0; i < 3; i++) {
      const wispAngle = t * 1.2 + i * 2.1;
      const wispR = s * 0.6 + Math.sin(t * 2 + i) * s * 0.15;
      const wispX = cx + Math.cos(wispAngle) * wispR;
      const wispY = wy - s * 0.1 + Math.sin(wispAngle) * s * 0.3;
      g.circle(wispX, wispY, 1).fill({ color: 0x9955dd, alpha: ga * 0.15 });
    }

    // Hollow eyes — white with eerie glow
    const eyePulse = 0.55 + Math.sin(t * 5) * 0.15;
    g.circle(cx - 2, wy - s * 0.2, 1.5).fill({ color: 0xffffff, alpha: eyePulse });
    g.circle(cx + 2, wy - s * 0.2, 1.5).fill({ color: 0xffffff, alpha: eyePulse });
    // Eye glow
    g.circle(cx - 2, wy - s * 0.2, 3).fill({ color: 0xddddff, alpha: eyePulse * 0.08 });
    g.circle(cx + 2, wy - s * 0.2, 3).fill({ color: 0xddddff, alpha: eyePulse * 0.08 });
    // Mouth — dark void
    g.ellipse(cx, wy + s * 0.05, 1, 0.5).fill({ color: 0x220044, alpha: 0.5 });
  }

  private _drawEnchantedArmor(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.4;
    const t = this._time;
    // Floating animation — bobs up and down
    const floatY = cy + Math.sin(t * 2) * 1.5;

    // Magical aura — concentric pulsing rings
    const runeAlpha = 0.3 + Math.sin(t * 3) * 0.15;
    g.circle(cx, floatY, s * 1.3).fill({ color: 0x4488ff, alpha: 0.04 + Math.sin(t * 2) * 0.02 });
    g.circle(cx, floatY, s * 1.1).fill({ color: 0x5599ff, alpha: 0.05 + Math.sin(t * 2.5) * 0.02 });

    // Shadow on ground (moves with float)
    const shadowScale = 1 - Math.sin(t * 2) * 0.15;
    g.ellipse(cx, cy + s * 0.95, s * 0.45 * shadowScale, s * 0.1).fill({ color: 0x000000, alpha: 0.2 * shadowScale });

    // Gap between legs and body — visible empty space (no body inside)
    // Legs — floating below, gap shows emptiness
    const legGap = 1.5 + Math.sin(t * 2) * 0.5;
    g.rect(cx - s * 0.32, floatY + s * 0.55 + legGap, s * 0.26, s * 0.45).fill(0x777788);
    g.rect(cx + s * 0.06, floatY + s * 0.55 + legGap, s * 0.26, s * 0.45).fill(0x777788);
    // Leg plate edge
    g.rect(cx - s * 0.31, floatY + s * 0.55 + legGap, s * 0.06, s * 0.4).fill({ color: 0x888899, alpha: 0.25 });
    g.rect(cx + s * 0.07, floatY + s * 0.55 + legGap, s * 0.06, s * 0.4).fill({ color: 0x888899, alpha: 0.25 });
    // Sabatons
    g.ellipse(cx - s * 0.19, floatY + s + legGap, s * 0.16, s * 0.06).fill(0x666677);
    g.ellipse(cx + s * 0.19, floatY + s + legGap, s * 0.16, s * 0.06).fill(0x666677);

    // Dark void visible between body and legs (no body inside!)
    g.rect(cx - s * 0.2, floatY + s * 0.48, s * 0.4, s * 0.12 + legGap).fill({ color: 0x050508, alpha: 0.4 });

    // Armor body — polished plate
    g.ellipse(cx, floatY, s * 0.72, s * 0.92).fill(0x888899);
    // Body plate layers
    g.ellipse(cx, floatY - s * 0.08, s * 0.55, s * 0.65).fill({ color: 0x9999aa, alpha: 0.35 });
    // Chest plate highlight
    g.ellipse(cx - s * 0.1, floatY - s * 0.2, s * 0.2, s * 0.3).fill({ color: 0xaaaabb, alpha: 0.15 });
    // Plate edge lines
    g.setStrokeStyle({ width: 0.3, color: 0x6a6a7a, alpha: 0.3 });
    g.ellipse(cx, floatY + s * 0.2, s * 0.5, s * 0.25).stroke();

    // Shoulder pauldrons — ornate
    g.ellipse(cx - s * 0.72, floatY - s * 0.18, s * 0.32, s * 0.27).fill(0x999aaa);
    g.ellipse(cx + s * 0.72, floatY - s * 0.18, s * 0.32, s * 0.27).fill(0x999aaa);
    // Pauldron highlights
    g.ellipse(cx - s * 0.72, floatY - s * 0.24, s * 0.28, s * 0.08).fill({ color: 0xaaaabb, alpha: 0.2 });
    g.ellipse(cx + s * 0.72, floatY - s * 0.24, s * 0.28, s * 0.08).fill({ color: 0xaaaabb, alpha: 0.2 });
    // Rune glow on pauldrons
    g.circle(cx - s * 0.72, floatY - s * 0.18, 1.5).fill({ color: 0x44aaff, alpha: runeAlpha * 0.4 });
    g.circle(cx + s * 0.72, floatY - s * 0.18, 1.5).fill({ color: 0x44aaff, alpha: runeAlpha * 0.4 });

    // Gauntlets (floating, detached from arms)
    g.circle(cx - s * 0.65, floatY + s * 0.3, s * 0.15).fill(0x888899);
    g.circle(cx + s * 0.65, floatY + s * 0.3, s * 0.15).fill(0x888899);

    // Helmet
    g.circle(cx, floatY - s * 0.72, s * 0.42).fill(0x7a7a8a);
    // Helmet top ridge
    g.rect(cx - s * 0.04, floatY - s * 1.12, s * 0.08, s * 0.18).fill({ color: 0x888899, alpha: 0.5 });
    // Visor — dark void visible (no face)
    g.rect(cx - s * 0.24, floatY - s * 0.78, s * 0.48, 3).fill(0x080810);
    // Empty darkness behind visor — key visual: nothing inside
    g.ellipse(cx, floatY - s * 0.72, s * 0.15, s * 0.2).fill({ color: 0x030306, alpha: 0.6 });
    // Faint blue magical mist where a face should be
    g.ellipse(cx, floatY - s * 0.72, s * 0.1, s * 0.12).fill({ color: 0x4488ff, alpha: runeAlpha * 0.2 });

    // Enchanted runes — orbiting around the armor
    for (let i = 0; i < 4; i++) {
      const rAngle = t * 1.5 + i * Math.PI * 0.5;
      const rr = s * 0.85;
      const rx = cx + Math.cos(rAngle) * rr;
      const ry = floatY + Math.sin(rAngle) * rr * 0.5;
      g.circle(rx, ry, 1).fill({ color: 0x44aaff, alpha: runeAlpha * 0.5 });
      g.circle(rx, ry, 2.5).fill({ color: 0x44aaff, alpha: runeAlpha * 0.08 });
    }

    // Central rune on chest
    g.circle(cx, floatY, 2.5).fill({ color: 0x44aaff, alpha: runeAlpha });
    g.setStrokeStyle({ width: 0.5, color: 0x44aaff, alpha: runeAlpha * 0.7 });
    g.moveTo(cx, floatY - 3).lineTo(cx, floatY + 3).stroke();
    g.moveTo(cx - 3, floatY).lineTo(cx + 3, floatY).stroke();
    g.moveTo(cx - 2, floatY - 2).lineTo(cx + 2, floatY + 2).stroke();
    g.moveTo(cx + 2, floatY - 2).lineTo(cx - 2, floatY + 2).stroke();
  }

  private _drawBossEntity(g: Graphics, cx: number, cy: number): void {
    const s = B.CELL_SIZE * 0.5; // Larger than normal enemies
    const t = this._time;

    // Dark aura particles — floating outward
    for (let i = 0; i < 8; i++) {
      const pAngle = t * 0.6 + i * Math.PI * 0.25;
      const pR = s * 1.2 + Math.sin(t * 1.5 + i * 1.7) * s * 0.3;
      const px = cx + Math.cos(pAngle) * pR;
      const py = cy + Math.sin(pAngle) * pR * 0.7;
      const pAlpha = 0.12 + Math.sin(t * 3 + i) * 0.06;
      g.circle(px, py, 1 + Math.sin(t * 2 + i) * 0.5).fill({ color: 0x880000, alpha: pAlpha });
    }

    // Ominous aura — layered with pulsing
    const aa = 0.08 + Math.sin(t * 2) * 0.04;
    g.circle(cx, cy, s * 2).fill({ color: 0x440000, alpha: aa * 0.15 });
    g.circle(cx, cy, s * 1.6).fill({ color: 0x880000, alpha: aa * 0.2 });
    g.circle(cx, cy, s * 1.2).fill({ color: 0xaa0000, alpha: aa });

    // Shadow
    g.ellipse(cx, cy + s * 1.05, s * 0.8, s * 0.15).fill({ color: 0x000000, alpha: 0.3 });

    // Massive body — dark armor
    g.ellipse(cx, cy + 1, s * 0.85, s * 0.98).fill(0x2a0808);
    g.ellipse(cx, cy, s * 0.75, s * 0.85).fill(0x440000);
    g.ellipse(cx, cy - s * 0.06, s * 0.6, s * 0.7).fill({ color: 0x550000, alpha: 0.5 });
    // Armor plate edges
    g.setStrokeStyle({ width: 0.4, color: 0x660000, alpha: 0.3 });
    g.ellipse(cx, cy + s * 0.2, s * 0.65, s * 0.35).stroke();
    // Dark runes on chest
    g.setStrokeStyle({ width: 0.3, color: 0xff2200, alpha: 0.15 + Math.sin(t * 3) * 0.08 });
    g.circle(cx, cy - s * 0.05, s * 0.2).stroke();
    g.moveTo(cx, cy - s * 0.25).lineTo(cx, cy + s * 0.15).stroke();

    // Massive shoulder spikes
    g.moveTo(cx - s * 0.7, cy - s * 0.2).lineTo(cx - s * 0.95, cy - s * 0.85).lineTo(cx - s * 0.48, cy - s * 0.1).closePath().fill(0x330000);
    g.moveTo(cx + s * 0.7, cy - s * 0.2).lineTo(cx + s * 0.95, cy - s * 0.85).lineTo(cx + s * 0.48, cy - s * 0.1).closePath().fill(0x330000);
    // Secondary spikes
    g.moveTo(cx - s * 0.55, cy - s * 0.25).lineTo(cx - s * 0.65, cy - s * 0.6).lineTo(cx - s * 0.4, cy - s * 0.15).closePath().fill({ color: 0x440000, alpha: 0.7 });
    g.moveTo(cx + s * 0.55, cy - s * 0.25).lineTo(cx + s * 0.65, cy - s * 0.6).lineTo(cx + s * 0.4, cy - s * 0.15).closePath().fill({ color: 0x440000, alpha: 0.7 });
    // Spike tips glow
    g.circle(cx - s * 0.95, cy - s * 0.85, 1).fill({ color: 0xff4400, alpha: 0.15 + Math.sin(t * 4) * 0.1 });
    g.circle(cx + s * 0.95, cy - s * 0.85, 1).fill({ color: 0xff4400, alpha: 0.15 + Math.sin(t * 4 + 1) * 0.1 });

    // Legs — thick, armored
    g.rect(cx - s * 0.35, cy + s * 0.55, s * 0.28, s * 0.5).fill(0x220000);
    g.rect(cx + s * 0.07, cy + s * 0.55, s * 0.28, s * 0.5).fill(0x220000);

    // Head — demonic
    g.circle(cx, cy - s * 0.68, s * 0.42).fill(0x220000);
    // Horns (optional phase detail, adds at phase 2+)
    g.moveTo(cx - s * 0.3, cy - s * 0.85).quadraticCurveTo(cx - s * 0.5, cy - s * 1.3, cx - s * 0.15, cy - s * 1.1).stroke();
    g.moveTo(cx + s * 0.3, cy - s * 0.85).quadraticCurveTo(cx + s * 0.5, cy - s * 1.3, cx + s * 0.15, cy - s * 1.1).stroke();
    g.setStrokeStyle({ width: 1, color: 0x330000, alpha: 0.7 });
    g.moveTo(cx - s * 0.3, cy - s * 0.85).quadraticCurveTo(cx - s * 0.5, cy - s * 1.3, cx - s * 0.15, cy - s * 1.1).stroke();
    g.moveTo(cx + s * 0.3, cy - s * 0.85).quadraticCurveTo(cx + s * 0.5, cy - s * 1.3, cx + s * 0.15, cy - s * 1.1).stroke();

    // Flaming crown — animated fire on each point
    const crY = cy - s * 1.08;
    g.moveTo(cx - s * 0.32, crY + 3).lineTo(cx - s * 0.25, crY - 2).lineTo(cx - s * 0.1, crY + 1)
      .lineTo(cx, crY - 5).lineTo(cx + s * 0.1, crY + 1).lineTo(cx + s * 0.25, crY - 2)
      .lineTo(cx + s * 0.32, crY + 3).closePath().fill(0xdaa520);
    // Crown highlight
    g.rect(cx - s * 0.3, crY + 1, s * 0.6, 1).fill({ color: 0xeecc44, alpha: 0.3 });
    // Crown gems — pulsing
    g.circle(cx, crY - 4, 1.2).fill({ color: 0xff2222, alpha: 0.7 + Math.sin(t * 5) * 0.3 });
    g.circle(cx - s * 0.2, crY - 1, 0.8).fill({ color: 0x4444ff, alpha: 0.7 + Math.sin(t * 5 + 1) * 0.2 });
    g.circle(cx + s * 0.2, crY - 1, 0.8).fill({ color: 0x44ff44, alpha: 0.7 + Math.sin(t * 5 + 2) * 0.2 });

    // Flames on crown points
    const flamePoints = [
      { x: cx - s * 0.25, y: crY - 2 },
      { x: cx, y: crY - 5 },
      { x: cx + s * 0.25, y: crY - 2 },
    ];
    for (const fp of flamePoints) {
      const flicker = Math.sin(t * 8 + fp.x) * 0.8;
      const fh = 2.5 + flicker;
      g.ellipse(fp.x, fp.y - fh * 0.5, 1.2 + flicker * 0.3, fh * 0.5).fill({ color: 0xff6600, alpha: 0.35 + flicker * 0.05 });
      g.ellipse(fp.x, fp.y - fh * 0.4, 0.7, fh * 0.3).fill({ color: 0xffaa22, alpha: 0.4 });
      g.ellipse(fp.x, fp.y - fh * 0.3, 0.4, fh * 0.2).fill({ color: 0xffdd66, alpha: 0.35 });
    }

    // Glowing eyes — intense, pulsing
    const eg = 0.7 + Math.sin(t * 4) * 0.3;
    g.circle(cx - 2.8, cy - s * 0.72, 2).fill({ color: 0xff4400, alpha: eg });
    g.circle(cx + 2.8, cy - s * 0.72, 2).fill({ color: 0xff4400, alpha: eg });
    // Eye fire trail
    g.circle(cx - 2.8, cy - s * 0.72, 4).fill({ color: 0xff2200, alpha: eg * 0.12 });
    g.circle(cx + 2.8, cy - s * 0.72, 4).fill({ color: 0xff2200, alpha: eg * 0.12 });
    // Glowing mouth
    g.ellipse(cx, cy - s * 0.52, 1.5, 0.8).fill({ color: 0xff3300, alpha: eg * 0.3 });
  }

  // -----------------------------------------------------------------------
  // PLAYER
  // -----------------------------------------------------------------------

  private _drawPlayer(g: Graphics, state: GrailState): void {
    const cx = this._wx(state.playerX) + B.CELL_SIZE / 2;
    const cy = this._wy(state.playerY) + B.CELL_SIZE / 2;
    const t = this._time;
    const s = B.CELL_SIZE * 0.38;
    const hpR = state.playerHp / state.playerMaxHp;

    // Color: gold when healthy, red when low
    const bodyCol = hpR > 0.5 ? 0xc9a227 : hpR > 0.25 ? 0xcc6622 : 0xcc2222;
    const armorCol = hpR > 0.5 ? 0x888899 : hpR > 0.25 ? 0x886644 : 0x884444;
    const armorHighlight = hpR > 0.5 ? 0x9999aa : hpR > 0.25 ? 0x997755 : 0x995555;
    const armorShadow = hpR > 0.5 ? 0x666677 : hpR > 0.25 ? 0x664433 : 0x663333;

    // Footstep dust when recently moved
    if (state.lastMoveDir && (state.lastMoveDir.dx !== 0 || state.lastMoveDir.dy !== 0)) {
      const dustPhase = (t * 4) % 2;
      if (dustPhase < 0.8) {
        const dustAlpha = 0.15 * (1 - dustPhase / 0.8);
        const dox = -state.lastMoveDir.dx * 2;
        const doy = -state.lastMoveDir.dy * 2;
        g.circle(cx + dox - 1, cy + s * 0.8 + doy, 1.2).fill({ color: 0x887766, alpha: dustAlpha });
        g.circle(cx + dox + 1.5, cy + s * 0.75 + doy, 0.9).fill({ color: 0x887766, alpha: dustAlpha * 0.7 });
        g.circle(cx + dox, cy + s * 0.9 + doy, 0.6).fill({ color: 0x887766, alpha: dustAlpha * 0.5 });
      }
    }

    // Pulsing glow
    g.circle(cx, cy, s * 1.4).fill({ color: bodyCol, alpha: 0.06 + Math.sin(t * 2) * 0.03 });

    // Shield (left side) — heater shield shape with heraldic detail
    if (state.shieldCharges > 0) {
      // Shield body — pointed bottom
      g.moveTo(cx - s * 0.85, cy - s * 0.25).lineTo(cx - s * 0.85, cy + s * 0.2)
        .lineTo(cx - s * 0.6, cy + s * 0.55).lineTo(cx - s * 0.35, cy + s * 0.2)
        .lineTo(cx - s * 0.35, cy - s * 0.25).closePath().fill({ color: B.COLOR_SHIELD, alpha: 0.5 });
      // Shield border
      g.setStrokeStyle({ width: 0.8, color: 0x88aaff, alpha: 0.65 });
      g.moveTo(cx - s * 0.85, cy - s * 0.25).lineTo(cx - s * 0.85, cy + s * 0.2)
        .lineTo(cx - s * 0.6, cy + s * 0.55).lineTo(cx - s * 0.35, cy + s * 0.2)
        .lineTo(cx - s * 0.35, cy - s * 0.25).closePath().stroke();
      // Heraldic cross on shield
      g.setStrokeStyle({ width: 0.7, color: 0xffffff, alpha: 0.4 });
      g.moveTo(cx - s * 0.6, cy - s * 0.15).lineTo(cx - s * 0.6, cy + s * 0.4).stroke();
      g.moveTo(cx - s * 0.78, cy + s * 0.05).lineTo(cx - s * 0.42, cy + s * 0.05).stroke();
      // Shield highlight (top edge)
      g.rect(cx - s * 0.83, cy - s * 0.25, s * 0.48, 1).fill({ color: 0xaaccff, alpha: 0.2 });
    } else {
      // Worn wooden shield
      g.moveTo(cx - s * 0.78, cy - s * 0.2).lineTo(cx - s * 0.78, cy + s * 0.15)
        .lineTo(cx - s * 0.55, cy + s * 0.45).lineTo(cx - s * 0.32, cy + s * 0.15)
        .lineTo(cx - s * 0.32, cy - s * 0.2).closePath().fill({ color: 0x555566, alpha: 0.45 });
      g.setStrokeStyle({ width: 0.6, color: 0x444455, alpha: 0.4 });
      g.moveTo(cx - s * 0.78, cy - s * 0.2).lineTo(cx - s * 0.78, cy + s * 0.15)
        .lineTo(cx - s * 0.55, cy + s * 0.45).lineTo(cx - s * 0.32, cy + s * 0.15)
        .lineTo(cx - s * 0.32, cy - s * 0.2).closePath().stroke();
      // Faded cross
      g.setStrokeStyle({ width: 0.4, color: 0x777788, alpha: 0.2 });
      g.moveTo(cx - s * 0.55, cy - s * 0.1).lineTo(cx - s * 0.55, cy + s * 0.3).stroke();
      g.moveTo(cx - s * 0.7, cy + s * 0.05).lineTo(cx - s * 0.4, cy + s * 0.05).stroke();
    }

    // Legs with greaves (draw before body so body overlaps)
    g.rect(cx - s * 0.24, cy + s * 0.42, s * 0.2, s * 0.48).fill(armorCol);
    g.rect(cx + s * 0.04, cy + s * 0.42, s * 0.2, s * 0.48).fill(armorCol);
    // Greave highlight
    g.rect(cx - s * 0.23, cy + s * 0.42, s * 0.06, s * 0.44).fill({ color: armorHighlight, alpha: 0.2 });
    g.rect(cx + s * 0.05, cy + s * 0.42, s * 0.06, s * 0.44).fill({ color: armorHighlight, alpha: 0.2 });
    // Knee guard
    g.circle(cx - s * 0.14, cy + s * 0.44, s * 0.1).fill({ color: armorHighlight, alpha: 0.3 });
    g.circle(cx + s * 0.14, cy + s * 0.44, s * 0.1).fill({ color: armorHighlight, alpha: 0.3 });
    // Sabatons (feet)
    g.ellipse(cx - s * 0.14, cy + s * 0.9, s * 0.14, s * 0.06).fill({ color: armorShadow, alpha: 0.7 });
    g.ellipse(cx + s * 0.14, cy + s * 0.9, s * 0.14, s * 0.06).fill({ color: armorShadow, alpha: 0.7 });

    // Body armor — layered plates
    g.ellipse(cx, cy + 1, s * 0.52, s * 0.72).fill(armorCol);
    // Tabard / surcoat over armor (colored cloth)
    g.moveTo(cx - s * 0.25, cy - s * 0.2).lineTo(cx + s * 0.25, cy - s * 0.2)
      .lineTo(cx + s * 0.3, cy + s * 0.45).lineTo(cx - s * 0.3, cy + s * 0.45).closePath()
      .fill({ color: bodyCol, alpha: 0.45 });
    // Tabard cross emblem
    g.setStrokeStyle({ width: 0.5, color: 0xffffff, alpha: 0.2 });
    g.moveTo(cx, cy - s * 0.1).lineTo(cx, cy + s * 0.35).stroke();
    g.moveTo(cx - s * 0.12, cy + s * 0.08).lineTo(cx + s * 0.12, cy + s * 0.08).stroke();
    // Chest plate highlight (light from above)
    g.ellipse(cx, cy - s * 0.1, s * 0.25, s * 0.2).fill({ color: armorHighlight, alpha: 0.15 });
    // Shoulder pauldrons (articulated plates)
    g.ellipse(cx - s * 0.45, cy - s * 0.12, s * 0.2, s * 0.18).fill(armorCol);
    g.ellipse(cx + s * 0.45, cy - s * 0.12, s * 0.2, s * 0.18).fill(armorCol);
    g.ellipse(cx - s * 0.45, cy - s * 0.15, s * 0.18, s * 0.08).fill({ color: armorHighlight, alpha: 0.25 });
    g.ellipse(cx + s * 0.45, cy - s * 0.15, s * 0.18, s * 0.08).fill({ color: armorHighlight, alpha: 0.25 });
    // Gorget (neck guard)
    g.rect(cx - s * 0.18, cy - s * 0.28, s * 0.36, s * 0.1).fill({ color: armorShadow, alpha: 0.5 });

    // Helmet — great helm style
    g.circle(cx, cy - s * 0.5, s * 0.4).fill(armorCol);
    // Helmet top ridge
    g.rect(cx - s * 0.03, cy - s * 0.9, s * 0.06, s * 0.2).fill({ color: armorHighlight, alpha: 0.35 });
    // Visor with breathing holes
    g.rect(cx - s * 0.24, cy - s * 0.56, s * 0.48, s * 0.14).fill({ color: 0x0a0a18, alpha: 0.7 });
    // Visor slots detail
    g.rect(cx - s * 0.2, cy - s * 0.54, s * 0.08, s * 0.08).fill({ color: 0x050510, alpha: 0.5 });
    g.rect(cx + s * 0.12, cy - s * 0.54, s * 0.08, s * 0.08).fill({ color: 0x050510, alpha: 0.5 });
    // Helmet side rivets
    g.circle(cx - s * 0.32, cy - s * 0.45, 0.5).fill({ color: armorHighlight, alpha: 0.3 });
    g.circle(cx + s * 0.32, cy - s * 0.45, 0.5).fill({ color: armorHighlight, alpha: 0.3 });
    // Plume (flowing, color matches health)
    g.moveTo(cx, cy - s * 0.9).quadraticCurveTo(cx + s * 0.15 + Math.sin(t * 3) * 1, cy - s * 0.7, cx + s * 0.05, cy - s * 0.5)
      .lineTo(cx - s * 0.05, cy - s * 0.5).quadraticCurveTo(cx - s * 0.1 + Math.sin(t * 3 + 0.5) * 0.5, cy - s * 0.72, cx, cy - s * 0.9)
      .closePath().fill({ color: bodyCol, alpha: 0.85 });

    // Eyes through visor — glowing
    const eyeCol = hpR > 0.25 ? 0xffffff : 0xff4444;
    const eyeGlow = 0.65 + Math.sin(t * 4) * 0.1;
    g.circle(cx - 1.5, cy - s * 0.53, 0.8).fill({ color: eyeCol, alpha: eyeGlow });
    g.circle(cx + 1.5, cy - s * 0.53, 0.8).fill({ color: eyeCol, alpha: eyeGlow });
    // Eye glow halo
    g.circle(cx - 1.5, cy - s * 0.53, 1.8).fill({ color: eyeCol, alpha: eyeGlow * 0.1 });
    g.circle(cx + 1.5, cy - s * 0.53, 1.8).fill({ color: eyeCol, alpha: eyeGlow * 0.1 });

    // Weapon (right side)
    this._drawWeapon(g, cx + s * 0.45, cy - s * 0.15, state);

    // Speed effect
    if (state.speedTurns > 0) {
      const sa = 0.12 + Math.sin(t * 6) * 0.05;
      g.circle(cx - 3, cy, s * 0.45).fill({ color: 0x44ffff, alpha: sa });
      g.circle(cx + 3, cy, s * 0.45).fill({ color: 0x44ffff, alpha: sa * 0.7 });
      // Speed lines
      for (let i = 0; i < 3; i++) {
        const ly = cy - s * 0.3 + i * s * 0.3;
        g.setStrokeStyle({ width: 0.3, color: 0x44ffff, alpha: sa * 0.5 });
        g.moveTo(cx - s * 0.8 - i * 2, ly).lineTo(cx - s * 1.3 - i, ly).stroke();
      }
    }

    // Phoenix feather relic glow
    if (state.relic.id === "phoenix_feather" && !state.phoenixUsed) {
      g.circle(cx, cy, s * 1.1).fill({ color: 0xff6600, alpha: 0.07 + Math.sin(t * 3) * 0.04 });
      // Feather-like sparks
      for (let i = 0; i < 3; i++) {
        const fPhase = (t * 2 + i * 2.1) % 3;
        if (fPhase < 1.5) {
          const fx = cx + Math.sin(t + i * 2) * s * 0.8;
          const fy = cy - fPhase * 4 + Math.cos(t * 1.5 + i) * 2;
          g.circle(fx, fy, 0.5).fill({ color: 0xff8800, alpha: 0.3 * (1 - fPhase / 1.5) });
        }
      }
    }
  }

  private _drawWeapon(g: Graphics, wx: number, wy: number, state: GrailState): void {
    const t = this._time;
    switch (state.weapon.id) {
      case "rusty_sword":
        // Rusty, pitted blade
        g.setStrokeStyle({ width: 1.5, color: 0x887766, alpha: 0.85 });
        g.moveTo(wx, wy).lineTo(wx, wy + 8).stroke();
        // Blade edge highlight
        g.setStrokeStyle({ width: 0.3, color: 0x998877, alpha: 0.3 });
        g.moveTo(wx + 0.7, wy + 1).lineTo(wx + 0.7, wy + 7).stroke();
        // Crossguard
        g.rect(wx - 2, wy - 0.5, 4, 1.5).fill(0x665544);
        // Grip wrap
        g.rect(wx - 0.7, wy - 2.5, 1.4, 2).fill(0x553322);
        g.setStrokeStyle({ width: 0.3, color: 0x443311, alpha: 0.4 });
        g.moveTo(wx - 0.5, wy - 2).lineTo(wx + 0.5, wy - 1.5).stroke();
        // Rust spots
        g.circle(wx + 0.3, wy + 3, 0.4).fill({ color: 0x664422, alpha: 0.3 });
        g.circle(wx - 0.2, wy + 6, 0.3).fill({ color: 0x664422, alpha: 0.25 });
        break;
      case "knights_blade":
        // Clean steel blade with fuller
        g.setStrokeStyle({ width: 1.8, color: 0xaaaabc, alpha: 0.9 });
        g.moveTo(wx, wy - 1).lineTo(wx, wy + 10).stroke();
        // Fuller (groove down center)
        g.setStrokeStyle({ width: 0.4, color: 0x8888aa, alpha: 0.35 });
        g.moveTo(wx, wy).lineTo(wx, wy + 8).stroke();
        // Blade edge gleam
        g.setStrokeStyle({ width: 0.3, color: 0xccccdd, alpha: 0.3 });
        g.moveTo(wx + 0.8, wy).lineTo(wx + 0.8, wy + 9).stroke();
        // Crossguard with quillons
        g.rect(wx - 2.5, wy - 1.5, 5, 2).fill(0x886633);
        g.circle(wx - 2.5, wy - 0.5, 0.7).fill(0x886633);
        g.circle(wx + 2.5, wy - 0.5, 0.7).fill(0x886633);
        // Pommel
        g.circle(wx, wy - 2.5, 1.5).fill(0x886633);
        g.circle(wx, wy - 2.5, 0.6).fill({ color: 0xddaa44, alpha: 0.4 });
        break;
      case "excalibur_shard":
        // Glowing golden blade
        g.setStrokeStyle({ width: 2, color: 0xffd700, alpha: 0.9 });
        g.moveTo(wx, wy - 2).lineTo(wx, wy + 11).stroke();
        // Blade glow aura
        g.circle(wx, wy + 5, 5).fill({ color: 0xffd700, alpha: 0.06 + Math.sin(t * 3) * 0.04 });
        // Energy along blade edge
        const excGlow = 0.15 + Math.sin(t * 5) * 0.08;
        g.setStrokeStyle({ width: 0.4, color: 0xffffaa, alpha: excGlow });
        g.moveTo(wx + 1, wy - 1).lineTo(wx + 1, wy + 10).stroke();
        g.moveTo(wx - 1, wy).lineTo(wx - 1, wy + 9).stroke();
        // Ornate crossguard with wings
        g.moveTo(wx - 3.5, wy - 2).lineTo(wx - 2, wy - 3).lineTo(wx, wy - 2).closePath().fill(0xc9a227);
        g.moveTo(wx + 3.5, wy - 2).lineTo(wx + 2, wy - 3).lineTo(wx, wy - 2).closePath().fill(0xc9a227);
        // Pommel gem
        g.circle(wx, wy - 3.5, 1.5).fill(0xc9a227);
        g.circle(wx, wy - 3.5, 0.8).fill({ color: 0xffffff, alpha: 0.35 + Math.sin(t * 4) * 0.15 });
        // Sparkles along blade
        const sparkY = wy + ((t * 8) % 13);
        g.circle(wx + Math.sin(t * 7) * 0.5, sparkY, 0.4).fill({ color: 0xffffcc, alpha: 0.5 });
        break;
      case "morgul_mace":
        // Dark spiked mace with evil glow
        g.setStrokeStyle({ width: 1.5, color: 0x555566, alpha: 0.9 });
        g.moveTo(wx, wy).lineTo(wx, wy + 8).stroke();
        // Grip wrapping
        g.setStrokeStyle({ width: 0.3, color: 0x333340, alpha: 0.4 });
        for (let i = 0; i < 3; i++) {
          g.moveTo(wx - 0.7, wy + i * 2.5).lineTo(wx + 0.7, wy + i * 2.5 + 1).stroke();
        }
        // Mace head
        g.circle(wx, wy + 10, 3).fill(0x444455);
        g.circle(wx, wy + 10, 2).fill({ color: 0x555566, alpha: 0.4 });
        // Sharp spikes
        for (let i = 0; i < 6; i++) {
          const a = i * Math.PI / 3 + t * 0.3;
          const spLen = 2.2;
          g.moveTo(wx + Math.cos(a) * 3, wy + 10 + Math.sin(a) * 3)
            .lineTo(wx + Math.cos(a) * (3 + spLen), wy + 10 + Math.sin(a) * (3 + spLen))
            .lineTo(wx + Math.cos(a + 0.15) * 2.8, wy + 10 + Math.sin(a + 0.15) * 2.8)
            .closePath().fill({ color: 0x333344, alpha: 0.8 });
        }
        // Dark glow
        g.circle(wx, wy + 10, 5).fill({ color: 0x440044, alpha: 0.05 + Math.sin(t * 2) * 0.03 });
        break;
      case "holy_lance":
        // Long ornate lance with holy gleam
        g.setStrokeStyle({ width: 1.5, color: 0x999aaa, alpha: 0.9 });
        g.moveTo(wx, wy - 3).lineTo(wx, wy + 12).stroke();
        // Lance head — elongated diamond
        g.moveTo(wx, wy + 15).lineTo(wx - 2, wy + 11).lineTo(wx, wy + 10).lineTo(wx + 2, wy + 11).closePath().fill(0xccccdd);
        // Lance head highlight
        g.setStrokeStyle({ width: 0.3, color: 0xeeeeff, alpha: 0.3 });
        g.moveTo(wx, wy + 14).lineTo(wx + 0.5, wy + 11).stroke();
        // Vamplate (hand guard)
        g.ellipse(wx, wy, 2, 1.2).fill({ color: 0x888899, alpha: 0.6 });
        // Holy gleam at tip
        g.circle(wx, wy + 14, 3).fill({ color: 0xffffff, alpha: 0.04 + Math.sin(t * 2.5) * 0.03 });
        // Pennant (small flag)
        g.moveTo(wx + 0.7, wy - 2).lineTo(wx + 4, wy - 3.5 + Math.sin(t * 4) * 0.5)
          .lineTo(wx + 0.7, wy - 4).closePath().fill({ color: 0xcc2222, alpha: 0.6 });
        break;
      default:
        g.setStrokeStyle({ width: 1, color: 0x888888, alpha: 0.8 });
        g.moveTo(wx, wy).lineTo(wx, wy + 7).stroke();
        g.rect(wx - 1.5, wy, 3, 1).fill(0x666666);
        break;
    }
  }

  // -----------------------------------------------------------------------
  // PROJECTILES
  // -----------------------------------------------------------------------

  private _drawProjectiles(g: Graphics, state: GrailState): void {
    for (const p of state.projectiles) {
      if (!p.alive) continue;
      const sx = this._wx(p.x) + B.CELL_SIZE / 2;
      const sy = this._wy(p.y) + B.CELL_SIZE / 2;
      if (!this._onScr(sx, sy)) continue;

      const angle = Math.atan2(p.dy, p.dx);
      // Arrow shaft
      g.setStrokeStyle({ width: 1, color: 0xccaa77, alpha: 0.9 });
      g.moveTo(sx - Math.cos(angle) * 3.5, sy - Math.sin(angle) * 3.5)
        .lineTo(sx + Math.cos(angle) * 3.5, sy + Math.sin(angle) * 3.5).stroke();
      // Arrowhead
      g.circle(sx + Math.cos(angle) * 3.5, sy + Math.sin(angle) * 3.5, 1.1).fill(0x887755);
      // Trail
      g.circle(sx - Math.cos(angle) * 2.5, sy - Math.sin(angle) * 2.5, 0.8).fill({ color: 0xccaa77, alpha: 0.25 });
    }
  }

  // -----------------------------------------------------------------------
  // PARTICLES
  // -----------------------------------------------------------------------

  private _drawParticles(g: Graphics, state: GrailState): void {
    for (const p of state.particles) {
      if (p.life <= 0) continue;
      const sx = this._wx(p.x) + B.CELL_SIZE / 2;
      const sy = this._wy(p.y) + B.CELL_SIZE / 2;
      const alpha = (p.life / p.maxLife) * 0.8;
      const size = p.size * (p.life / p.maxLife);
      if (size < 0.2) continue;

      if (alpha > 0.3) {
        g.circle(sx, sy, size * 2).fill({ color: p.color, alpha: alpha * 0.12 });
      }
      g.circle(sx, sy, size).fill({ color: p.color, alpha });
    }
  }

  // -----------------------------------------------------------------------
  // ATMOSPHERIC EFFECTS
  // -----------------------------------------------------------------------

  private _drawAtmosphere(g: Graphics, state: GrailState): void {
    const t = this._time;
    const cs = B.CELL_SIZE;

    // Torchlight warmth — warm overlay on tiles near torch walls
    // Check visible wall tiles that have torches (tileHash & 0x1f === 10)
    const { tiles, cols, rows } = state.dungeon;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!state.visible[y][x]) continue;
        if (tiles[y][x] !== TileType.WALL) continue;
        const h = tileHash(x, y);
        if ((h & 0x1f) !== 10) continue;

        const torchSX = this._wx(x) + cs / 2;
        const torchSY = this._wy(y) + cs * 0.35;
        if (!this._onScr(torchSX, torchSY)) continue;

        // Warm light pool on surrounding floor tiles
        const flicker = Math.sin(t * 8 + x) * 0.01 + Math.sin(t * 13.7 + y) * 0.005;
        const warmR = cs * 2.5;
        g.circle(torchSX, torchSY, warmR).fill({ color: 0x442200, alpha: 0.03 + flicker });
        g.circle(torchSX, torchSY, warmR * 0.6).fill({ color: 0x553300, alpha: 0.025 + flicker });
      }
    }

    // Ambient dust motes in visible lit areas (near player)
    const pcx = this._wx(state.playerX) + cs / 2;
    const pcy = this._wy(state.playerY) + cs / 2;
    for (let i = 0; i < 6; i++) {
      const dustPhase = (t * 0.3 + i * 1.7) % 5;
      const dx = pcx + Math.sin(t * 0.4 + i * 2.1) * cs * 3;
      const dy = pcy - dustPhase * cs * 0.8 + cs * 2;
      const dustAlpha = 0.06 * (1 - Math.abs(dustPhase - 2.5) / 2.5);
      if (dustAlpha > 0.01) {
        g.circle(dx, dy, 0.6).fill({ color: 0xaa9966, alpha: dustAlpha });
      }
    }

    // Fog wisps in darker areas (away from player)
    for (let i = 0; i < 3; i++) {
      const fogPhase = (t * 0.2 + i * 3.3) % 8;
      const fx = pcx + Math.cos(t * 0.15 + i * 2.5) * cs * 5;
      const fy = pcy + Math.sin(t * 0.1 + i * 1.8) * cs * 4;
      const fogAlpha = 0.04 * Math.sin(fogPhase * Math.PI / 8);
      if (fogAlpha > 0.005) {
        g.ellipse(fx, fy, cs * 0.8, cs * 0.3).fill({ color: 0x334455, alpha: fogAlpha });
      }
    }

    // Occasional water drip particle
    const dripPhase = (t * 0.5) % 4;
    if (dripPhase < 0.5) {
      const dripX = pcx + Math.sin(t * 0.7) * cs * 2;
      const dripY = pcy - cs * 2 + dripPhase * cs * 3;
      const dripAlpha = 0.15 * (1 - dripPhase / 0.5);
      g.circle(dripX, dripY, 0.5).fill({ color: 0x5588aa, alpha: dripAlpha });
      // Splash at bottom
      if (dripPhase > 0.35) {
        const splashA = (dripPhase - 0.35) / 0.15;
        g.circle(dripX - 1, dripY + 1, 0.3).fill({ color: 0x5588aa, alpha: dripAlpha * splashA });
        g.circle(dripX + 1, dripY + 0.5, 0.3).fill({ color: 0x5588aa, alpha: dripAlpha * splashA * 0.7 });
      }
    }
  }

  // -----------------------------------------------------------------------
  // FLOATING TEXTS
  // -----------------------------------------------------------------------

  private _drawFloatTexts(state: GrailState): void {
    for (let i = 0; i < this._floatTexts.length && i < state.floatTexts.length; i++) {
      const ft = state.floatTexts[i];
      if (!ft || ft.timer <= 0) continue;

      const tx = this._wx(ft.x) + B.CELL_SIZE / 2;
      const progress = 1 - ft.timer / ft.maxTimer;
      const ty = this._wy(ft.y) - progress * 20;

      const txt = this._floatTexts[i];
      txt.visible = true;
      txt.text = ft.text;
      txt.style.fill = ft.color;
      txt.position.set(tx, ty);
      txt.alpha = Math.min(ft.timer / ft.maxTimer * 2, 1);
    }
  }

  // -----------------------------------------------------------------------
  // HUD
  // -----------------------------------------------------------------------

  private _drawHUD(ug: Graphics, state: GrailState, _meta: GrailMeta): void {
    const sw = this._sw;

    // --- HP bar (top-left) ---
    const hpX = 10, hpY = 10, hpW = 130, hpH = 12;
    const hpR = Math.max(0, state.playerHp / state.playerMaxHp);

    ug.roundRect(hpX, hpY, hpW, hpH, 3).fill({ color: 0x111111, alpha: 0.8 });
    if (hpR > 0) {
      const hpC = hpR > 0.5 ? 0x44aa44 : hpR > 0.25 ? 0xcc8800 : 0xcc2222;
      ug.roundRect(hpX + 1, hpY + 1, (hpW - 2) * hpR, hpH - 2, 2).fill(hpC);
      ug.rect(hpX + 2, hpY + 2, (hpW - 4) * hpR, 2).fill({ color: 0xffffff, alpha: 0.12 });
    }
    ug.setStrokeStyle({ width: 0.8, color: 0x555555, alpha: 0.5 });
    ug.roundRect(hpX, hpY, hpW, hpH, 3).stroke();

    // --- XP bar (below HP) ---
    const xpY = hpY + hpH + 3;
    const xpR = state.playerXpToNext > 0 ? Math.min(state.playerXp / state.playerXpToNext, 1) : 1;
    ug.roundRect(hpX, xpY, hpW, 5, 2).fill({ color: 0x111111, alpha: 0.7 });
    if (xpR > 0) {
      ug.roundRect(hpX + 1, xpY + 1, (hpW - 2) * xpR, 3, 1).fill({ color: B.COLOR_XP, alpha: 0.65 });
    }

    // HP/Level text
    this._hudText.visible = true;
    this._hudText.position.set(hpX + 3, hpY - 1);
    this._hudText.text = `HP ${state.playerHp}/${state.playerMaxHp}`;

    this._hudSmText.visible = true;
    this._hudSmText.position.set(hpX, xpY + 7);
    this._hudSmText.text = `Lv${state.playerLevel} XP${state.playerXp}/${state.playerXpToNext} ATK${state.playerAttack + state.weapon.damage} DEF${state.playerDefense + state.armor.defense}`;

    // --- Top-center: Floor / Turn ---
    const floorStr = `Floor ${state.floor}/${B.MAX_FLOORS}  Turn ${state.turnCount}`;
    const floorW = floorStr.length * 7.5;
    const floorX = (sw - floorW) / 2;
    ug.roundRect(floorX - 6, 6, floorW + 12, 18, 4).fill({ color: 0x111111, alpha: 0.6 });
    // We'll use statText for floor display
    this._statText.visible = true;
    this._statText.text = floorStr;
    this._statText.style.fill = 0xddddaa;
    this._statText.style.fontSize = 13;
    this._statText.anchor.set(0.5, 0);
    this._statText.position.set(sw / 2, 7);

    // --- Top-right: Gold / Keys ---
    const goldStr = `Gold: ${state.gold}  Keys: ${state.keys}`;
    const goldW = goldStr.length * 7;
    ug.roundRect(sw - goldW - 16, 6, goldW + 10, 18, 4).fill({ color: 0x111111, alpha: 0.6 });
    // Gold icon
    ug.circle(sw - goldW - 10, 15, 3).fill({ color: B.COLOR_GOLD, alpha: 0.5 });
    // Use upgradeText for gold display
    this._upgradeText.visible = true;
    this._upgradeText.text = goldStr;
    this._upgradeText.style.fill = B.COLOR_GOLD;
    this._upgradeText.style.fontSize = 12;
    this._upgradeText.anchor.set(1, 0);
    this._upgradeText.position.set(sw - 10, 8);

    // --- Bottom: Inventory bar ---
    this._drawInventoryBar(ug, state);

    // --- Equipment display (bottom-left) ---
    this._drawEquipInfo(ug, state);
  }

  private _drawInventoryBar(ug: Graphics, state: GrailState): void {
    const sw = this._sw, sh = this._sh;
    const slotCount = state.inventory.length;
    const slotSz = 26;
    const gap = 3;
    const totalW = slotCount * (slotSz + gap) - gap;
    const sx = (sw - totalW) / 2;
    const sy = sh - slotSz - 10;

    for (let i = 0; i < slotCount; i++) {
      const x = sx + i * (slotSz + gap);
      const item = state.inventory[i];

      ug.roundRect(x, sy, slotSz, slotSz, 3).fill({ color: 0x1a1a22, alpha: 0.8 });
      ug.setStrokeStyle({ width: 0.8, color: item ? 0x555566 : 0x333344, alpha: 0.5 });
      ug.roundRect(x, sy, slotSz, slotSz, 3).stroke();

      if (item) {
        this._drawItemIcon(ug, x + slotSz / 2, sy + slotSz / 2, item.kind);
        // Count pip
        if (item.count > 1) {
          ug.roundRect(x + slotSz - 9, sy + slotSz - 9, 9, 9, 2).fill({ color: 0x222244, alpha: 0.85 });
          for (let c = 0; c < Math.min(item.count, 3); c++) {
            ug.circle(x + slotSz - 5 + (c - 1) * 3, sy + slotSz - 5, 0.8).fill(0xdddddd);
          }
        }
      }
    }
  }

  private _drawItemIcon(g: Graphics, cx: number, cy: number, kind: ItemKind): void {
    switch (kind) {
      case ItemKind.HEALING_POTION:
        g.rect(cx - 2, cy - 3, 4, 2).fill(0xaa8866);
        g.roundRect(cx - 3.5, cy - 1, 7, 7, 1.5).fill(0xcc3333);
        g.rect(cx - 2.5, cy, 5, 1.5).fill({ color: 0xff5555, alpha: 0.4 });
        break;
      case ItemKind.FIREBALL_SCROLL:
        g.rect(cx - 3.5, cy - 3.5, 7, 8).fill(0xcc8833);
        g.circle(cx, cy, 1.8).fill({ color: 0xff4400, alpha: 0.65 });
        break;
      case ItemKind.REVEAL_SCROLL:
        g.rect(cx - 3.5, cy - 3.5, 7, 8).fill(0x4466aa);
        g.ellipse(cx, cy, 2.5, 1.2).fill({ color: 0xaaccff, alpha: 0.5 });
        break;
      case ItemKind.SHIELD_CHARM:
        g.moveTo(cx, cy - 4.5).lineTo(cx + 3.5, cy).lineTo(cx, cy + 4.5).lineTo(cx - 3.5, cy).closePath().fill(0x4488ff);
        g.circle(cx, cy, 1.2).fill({ color: 0xffffff, alpha: 0.25 });
        break;
      case ItemKind.SPEED_POTION:
        g.rect(cx - 2, cy - 3, 4, 2).fill(0xaa8866);
        g.roundRect(cx - 3.5, cy - 1, 7, 7, 1.5).fill(0xaacc33);
        g.setStrokeStyle({ width: 0.6, color: 0xffff00, alpha: 0.6 });
        g.moveTo(cx - 1, cy - 1).lineTo(cx + 1, cy + 1).lineTo(cx - 1, cy + 3).stroke();
        break;
      case ItemKind.TELEPORT_SCROLL:
        g.rect(cx - 3.5, cy - 3.5, 7, 8).fill(0x7744aa);
        g.setStrokeStyle({ width: 0.5, color: 0xaa66ff, alpha: 0.5 });
        g.circle(cx, cy, 2).stroke();
        break;
      case ItemKind.KEY:
        g.setStrokeStyle({ width: 1, color: B.COLOR_GOLD, alpha: 0.9 });
        g.circle(cx - 1.5, cy - 1.5, 2.5).stroke();
        g.moveTo(cx + 0.5, cy + 0.5).lineTo(cx + 4, cy + 4).stroke();
        g.moveTo(cx + 2.5, cy + 2.5).lineTo(cx + 4.5, cy + 2.5).stroke();
        break;
    }
  }

  private _drawEquipInfo(ug: Graphics, state: GrailState): void {
    const sh = this._sh;
    const ey = sh - 58;

    ug.roundRect(8, ey, 110, 16, 3).fill({ color: 0x111111, alpha: 0.55 });
    ug.roundRect(8, ey + 18, 110, 16, 3).fill({ color: 0x111111, alpha: 0.55 });

    // Weapon icon
    ug.setStrokeStyle({ width: 0.8, color: 0xaaaaaa, alpha: 0.5 });
    ug.moveTo(14, ey + 3).lineTo(14, ey + 13).stroke();
    ug.rect(12, ey + 3, 4, 1).fill(0x888888);

    // Armor icon
    ug.ellipse(14, ey + 26, 2.5, 3.5).fill({ color: 0x666677, alpha: 0.4 });

    // Relic row (if equipped)
    if (state.relic.id !== "none") {
      ug.roundRect(8, ey + 36, 110, 16, 3).fill({ color: 0x111122, alpha: 0.55 });
      ug.moveTo(14, ey + 40).lineTo(16.5, ey + 44).lineTo(14, ey + 48).lineTo(11.5, ey + 44).closePath()
        .fill({ color: 0x8844cc, alpha: 0.4 });
    }
  }

  // -----------------------------------------------------------------------
  // MESSAGES
  // -----------------------------------------------------------------------

  private _drawMessages(state: GrailState): void {
    if (state.messages.length === 0) return;

    const msgs = state.messages.slice(-B.MAX_MESSAGES);
    const startY = this._sh / 2 + 20;

    this._uiGfx.roundRect(6, startY - 4, 210, msgs.length * 15 + 8, 3).fill({ color: 0x0a0a12, alpha: 0.6 });

    this._msgText.visible = true;
    this._msgText.text = msgs.map(m => m.text).join("\n");
    this._msgText.position.set(10, startY);
    if (msgs.length > 0) {
      this._msgText.style.fill = msgs[msgs.length - 1].color;
    }
  }

  // -----------------------------------------------------------------------
  // MINIMAP
  // -----------------------------------------------------------------------

  private _drawMinimap(ug: Graphics, state: GrailState): void {
    const size = B.MINIMAP_SIZE;
    const margin = B.MINIMAP_MARGIN;
    const cellSz = B.MINIMAP_CELL;
    const mx = this._sw - size - margin;
    const my = margin;
    const { cols, rows } = state.dungeon;

    ug.roundRect(mx - 3, my - 3, size + 6, size + 6, 3).fill({ color: 0x000000, alpha: 0.6 });
    ug.setStrokeStyle({ width: 0.5, color: 0x333355, alpha: 0.3 });
    ug.roundRect(mx - 3, my - 3, size + 6, size + 6, 3).stroke();

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!state.explored[y][x]) continue;
        const tile = state.dungeon.tiles[y][x];
        if (tile === TileType.WALL) {
          ug.rect(mx + x * cellSz, my + y * cellSz, cellSz, cellSz).fill(B.COLOR_MINIMAP_WALL);
        } else if (state.visible[y][x]) {
          ug.rect(mx + x * cellSz, my + y * cellSz, cellSz, cellSz).fill({ color: 0x1a1a2e, alpha: 0.4 });
        }
      }
    }

    // Stairs
    ug.rect(mx + state.dungeon.stairsX * cellSz, my + state.dungeon.stairsY * cellSz, cellSz, cellSz)
      .fill(B.COLOR_MINIMAP_STAIRS);

    // Enemies
    for (const e of state.entities) {
      if (!e.alive || !state.visible[e.y]?.[e.x]) continue;
      ug.rect(mx + e.x * cellSz, my + e.y * cellSz, cellSz, cellSz).fill(B.COLOR_MINIMAP_ENEMY);
    }

    // Player
    ug.rect(mx + state.playerX * cellSz, my + state.playerY * cellSz, cellSz + 1, cellSz + 1)
      .fill(B.COLOR_MINIMAP_PLAYER);
  }

  // -----------------------------------------------------------------------
  // INVENTORY OVERLAY
  // -----------------------------------------------------------------------

  private _renderInventoryOverlay(state: GrailState): void {
    const sw = this._sw, sh = this._sh;
    this._uiGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });

    this._levelUpTitle.visible = true;
    this._levelUpTitle.text = "INVENTORY";
    this._levelUpTitle.style.fill = 0x44aaff;
    this._levelUpTitle.anchor.set(0.5);
    this._levelUpTitle.position.set(sw / 2, sh * 0.15);

    const lines: string[] = [];
    lines.push(`Weapon: ${state.weapon.name} (dmg ${state.weapon.damage}${state.weapon.range > 1 ? " rng " + state.weapon.range : ""}${state.weapon.effect ? " [" + state.weapon.effect + "]" : ""})`);
    lines.push(`Armor: ${state.armor.name} (def ${state.armor.defense}${state.armor.perceptionMod ? " per " + state.armor.perceptionMod : ""})`);
    lines.push(`Relic: ${state.relic.name}${state.relic.desc ? " \u2014 " + state.relic.desc : ""}`);
    lines.push("");
    for (let i = 0; i < state.inventory.length; i++) {
      const slot = state.inventory[i];
      if (slot) {
        lines.push(`[${i + 1}] ${slot.kind.replace(/_/g, " ")} x${slot.count}`);
      } else {
        lines.push(`[${i + 1}] (empty)`);
      }
    }
    lines.push("");
    lines.push("Press 1-6 to use | Tab to close");

    this._choiceText.visible = true;
    this._choiceText.text = lines.join("\n");
    this._choiceText.anchor.set(0.5, 0);
    this._choiceText.position.set(sw / 2, sh * 0.25);
  }

  // -----------------------------------------------------------------------
  // LEVEL UP SCREEN
  // -----------------------------------------------------------------------

  private _renderLevelUpScreen(state: GrailState): void {
    const sw = this._sw, sh = this._sh;
    const cx = sw / 2, cy = sh / 2;
    const t = this._time;

    this._uiGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });

    // Glow
    this._uiGfx.circle(cx, cy - 60, 70).fill({ color: 0xffdd44, alpha: 0.04 + Math.sin(t * 3) * 0.02 });

    this._levelUpTitle.visible = true;
    this._levelUpTitle.text = "LEVEL UP!";
    this._levelUpTitle.style.fill = B.COLOR_LEVEL_UP;
    this._levelUpTitle.anchor.set(0.5);
    this._levelUpTitle.position.set(cx, cy - 80);
    this._levelUpTitle.alpha = 0.8 + Math.sin(t * 4) * 0.2;

    // Draw choice cards
    const choices = state.levelUpChoices;
    const cardW = 130;
    const cardH = 50;
    const gap = 16;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = cx - totalW / 2;

    for (let i = 0; i < choices.length && i < 3; i++) {
      const cardX = startX + i * (cardW + gap);
      const cardY = cy - 20;

      // Card background
      this._uiGfx.roundRect(cardX, cardY, cardW, cardH, 5).fill({ color: 0x1a1a2a, alpha: 0.9 });
      this._uiGfx.setStrokeStyle({ width: 1.2, color: B.COLOR_LEVEL_UP, alpha: 0.5 });
      this._uiGfx.roundRect(cardX, cardY, cardW, cardH, 5).stroke();

      // Number badge
      this._uiGfx.circle(cardX + cardW / 2, cardY + 14, 9).fill({ color: 0x222244, alpha: 0.8 });
      this._uiGfx.setStrokeStyle({ width: 0.6, color: B.COLOR_LEVEL_UP, alpha: 0.35 });
      this._uiGfx.circle(cardX + cardW / 2, cardY + 14, 9).stroke();

      // Shimmer
      const shimmer = Math.sin(t * 3 + i * 1.2) * 0.025;
      if (shimmer > 0) {
        this._uiGfx.roundRect(cardX + 2, cardY + 2, cardW - 4, cardH - 4, 3).fill({ color: 0xffdd44, alpha: shimmer });
      }
    }

    // Choice text
    const lines = choices.map((c, i) => `[${i + 1}]  ${c}`);
    this._choiceText.visible = true;
    this._choiceText.text = lines.join("\n");
    this._choiceText.anchor.set(0.5, 0);
    this._choiceText.position.set(cx, cy + 40);

    // Prompt
    this._promptText.visible = true;
    this._promptText.text = "Press 1-3 to choose";
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(cx, cy + 110);
    this._promptText.style.fill = B.COLOR_LEVEL_UP;
    this._promptText.alpha = 0.5 + Math.sin(t * 3) * 0.5;
  }

  // -----------------------------------------------------------------------
  // DEATH SCREEN
  // -----------------------------------------------------------------------

  private _renderDeathScreen(state: GrailState, meta: GrailMeta): void {
    const sw = this._sw, sh = this._sh;
    const cx = sw / 2, cy = sh / 2;
    const t = this._time;
    const g = this._gfx;

    // Dark blood-tinted background
    g.rect(0, 0, sw, sh).fill(0x0a0008);

    // Vignette
    g.rect(0, 0, sw * 0.28, sh).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(sw * 0.72, 0, sw * 0.28, sh).fill({ color: 0x000000, alpha: 0.3 });

    // Red pulse
    g.circle(cx, cy - 80, 180).fill({ color: 0x330000, alpha: 0.03 + Math.sin(t * 1.5) * 0.02 });

    // Dust
    this._drawDust(g, 1 / 60);

    // Title
    this._deathTitle.visible = true;
    this._deathTitle.text = "FALLEN";
    this._deathTitle.anchor.set(0.5);
    this._deathTitle.position.set(cx, sh * 0.1);

    // Grade
    const gradeInfo = getLetterGrade(state.floor);
    this._gradeText.visible = true;
    this._gradeText.anchor.set(0.5);
    this._gradeText.position.set(cx, sh * 0.2);
    this._gradeText.text = gradeInfo.grade;
    this._gradeText.style.fill = gradeInfo.color;

    // Stats
    this._statText.visible = true;
    this._statText.text =
      `Floor Reached: ${state.floor}  |  Enemies Slain: ${state.enemiesKilled}\n` +
      `Chests: ${state.chestsOpened}  |  Traps: ${state.trapsTriggered}\n` +
      `Damage Dealt: ${state.damageDealt}  |  Damage Taken: ${state.damageTaken}\n` +
      `Items Used: ${state.itemsUsed}  |  Turns: ${state.turnCount}\n` +
      `Gold: ${state.gold}`;
    this._statText.style.fill = 0xdddddd;
    this._statText.style.fontSize = 14;
    this._statText.anchor.set(0.5, 0);
    this._statText.position.set(cx, sh * 0.3);

    // Shards earned
    const shards = B.SHARDS_BASE_PER_RUN + state.floor * B.SHARDS_PER_FLOOR + Math.floor(state.enemiesKilled / 10) * B.SHARDS_PER_10_KILLS;

    // Upgrades shop
    const upKeys = ["sturdierStart", "sharperBlade", "trapSense", "luckyFind", "deepPockets", "squireBlessing"] as const;
    const upNames = ["Sturdier Start (+2 HP)", "Sharper Blade (+1 ATK)", "Trap Sense (+1 PER)", "Lucky Find (+10%)", "Deep Pockets (+1 slot)", "Squire's Blessing"];

    // Shop background
    const shopY = sh * 0.54;
    const shopH = upKeys.length * 20 + 26;
    this._uiGfx.roundRect(cx - 185, shopY - 6, 370, shopH, 5).fill({ color: 0x0a0a1e, alpha: 0.7 });
    this._uiGfx.setStrokeStyle({ width: 0.8, color: 0x333355, alpha: 0.35 });
    this._uiGfx.roundRect(cx - 185, shopY - 6, 370, shopH, 5).stroke();
    // Title bar
    this._uiGfx.roundRect(cx - 185, shopY - 6, 370, 16, 5).fill({ color: 0x222244, alpha: 0.5 });

    const shopLines: string[] = [];
    for (let i = 0; i < upKeys.length; i++) {
      const key = upKeys[i];
      const costs = (B.UPGRADE_COSTS as Record<string, number[]>)[key];
      const lvl = meta.upgrades[key];
      const maxLvl = costs.length;
      const cost = lvl < maxLvl ? costs[lvl] : -1;
      const canBuy = cost >= 0 && meta.shards >= cost;

      // Level pips
      for (let l = 0; l < maxLvl; l++) {
        const pipColor = l < lvl ? 0x44ff44 : 0x222233;
        const py = shopY + 18 + i * 20;
        this._uiGfx.circle(cx + 115 + l * 13, py, 3.5).fill({ color: 0x000000, alpha: 0.3 });
        this._uiGfx.circle(cx + 115 + l * 13, py, 3).fill({ color: pipColor, alpha: 0.75 });
        if (l < lvl) {
          this._uiGfx.circle(cx + 115 + l * 13, py - 0.5, 1.5).fill({ color: 0xffffff, alpha: 0.15 });
        }
      }

      // Highlight buyable
      if (canBuy) {
        this._uiGfx.roundRect(cx - 180, shopY + 10 + i * 20, 360, 16, 2).fill({ color: 0xeebb33, alpha: 0.03 });
      }

      const costStr = cost >= 0 ? `${cost} shards` : "MAX";
      shopLines.push(`[${i + 1}] ${upNames[i]} Lv${lvl}/${maxLvl}  ${costStr}`);
    }

    this._upgradeText.visible = true;
    this._upgradeText.text = `UPGRADES  |  Shards: ${meta.shards} (+${shards})\n` + shopLines.join("\n");
    this._upgradeText.style.fill = 0xcccccc;
    this._upgradeText.style.fontSize = 12;
    this._upgradeText.anchor.set(0.5, 0);
    this._upgradeText.position.set(cx, shopY - 4);

    // Prompt
    this._deathPrompt.visible = true;
    this._deathPrompt.text = "ENTER \u2014 New Run  |  1-6 \u2014 Buy Upgrade  |  ESC \u2014 Exit";
    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(cx, sh * 0.92);
    this._deathPrompt.alpha = 0.5 + Math.sin(t * 3) * 0.5;
  }

  // -----------------------------------------------------------------------
  // VICTORY SCREEN
  // -----------------------------------------------------------------------

  private _renderVictoryScreen(state: GrailState, _meta: GrailMeta): void {
    const sw = this._sw, sh = this._sh;
    const cx = sw / 2, cy = sh / 2;
    const t = this._time;
    const g = this._gfx;

    // Dark golden background
    g.rect(0, 0, sw, sh).fill(0x0a0a06);

    // Radial golden glow
    const ga = 0.05 + Math.sin(t * 1.2) * 0.03;
    g.circle(cx, cy - 100, 240).fill({ color: 0x4a3a08, alpha: ga });
    g.circle(cx, cy - 100, 160).fill({ color: 0x6a5a10, alpha: ga });
    g.circle(cx, cy - 100, 90).fill({ color: 0x8a7a18, alpha: ga });

    // Dust
    this._drawDust(g, 1 / 60);

    // Grail icon (large)
    this._drawGrailIcon(g, cx, cy - 130, 2.5, t);

    // Light rays
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + t * 0.3;
      const rayLen = 75 + Math.sin(t * 2 + i) * 18;
      const ra = 0.03 + Math.sin(t * 1.5 + i * 0.5) * 0.015;
      g.setStrokeStyle({ width: 1.8, color: 0xffd700, alpha: ra });
      g.moveTo(cx + Math.cos(angle) * 22, cy - 130 + Math.sin(angle) * 22)
        .lineTo(cx + Math.cos(angle) * rayLen, cy - 130 + Math.sin(angle) * rayLen).stroke();
    }

    // Title
    this._victoryTitle.visible = true;
    this._victoryTitle.anchor.set(0.5);
    this._victoryTitle.position.set(cx, cy - 40);
    this._victoryTitle.alpha = 0.85 + Math.sin(t * 2) * 0.15;

    // Grade S+
    this._gradeText.visible = true;
    this._gradeText.anchor.set(0.5);
    this._gradeText.position.set(cx, cy + 15);
    this._gradeText.text = "S+";
    this._gradeText.style.fill = 0xffd700;

    // Stats
    const bonusShards = B.SHARDS_GRAIL_BONUS + state.floor * B.SHARDS_PER_FLOOR + Math.floor(state.enemiesKilled / 10) * B.SHARDS_PER_10_KILLS;
    this._statText.visible = true;
    this._statText.text =
      `Enemies Vanquished: ${state.enemiesKilled}  |  Turns: ${state.turnCount}\n` +
      `Gold: ${state.gold}  |  Chests: ${state.chestsOpened}  |  Items Used: ${state.itemsUsed}\n` +
      `Damage Dealt: ${state.damageDealt}  |  Damage Taken: ${state.damageTaken}\n` +
      `Bonus Shards: +${bonusShards}`;
    this._statText.style.fill = 0xdddddd;
    this._statText.style.fontSize = 14;
    this._statText.anchor.set(0.5, 0);
    this._statText.position.set(cx, cy + 70);

    // Prompt
    this._deathPrompt.visible = true;
    this._deathPrompt.text = "Press ENTER for new run  |  ESC to exit";
    this._deathPrompt.style.fill = 0xffd700;
    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(cx, sh * 0.88);
    this._deathPrompt.alpha = 0.4 + Math.sin(t * 3) * 0.6;
  }

  // -----------------------------------------------------------------------
  // PAUSE SCREEN
  // -----------------------------------------------------------------------

  private _renderPauseScreen(): void {
    const sw = this._sw, sh = this._sh;
    this._uiGfx.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });

    this._pauseText.visible = true;
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(sw / 2, sh * 0.4);
    this._pauseText.alpha = 0.7 + Math.sin(this._time * 2) * 0.3;

    this._promptText.visible = true;
    this._promptText.text = "ESC \u2014 Resume  |  Q \u2014 Exit";
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(sw / 2, sh * 0.55);
  }

  // -----------------------------------------------------------------------
  // Decorative helpers
  // -----------------------------------------------------------------------

  private _drawGrailIcon(g: Graphics, cx: number, cy: number, sc: number, t: number): void {
    // Outer glow
    const ga = 0.1 + Math.sin(t * 2) * 0.05;
    g.circle(cx, cy, 16 * sc).fill({ color: 0xffd700, alpha: ga * 0.25 });
    g.circle(cx, cy, 10 * sc).fill({ color: 0xffd700, alpha: ga });

    // Cup body
    g.moveTo(cx - 7 * sc, cy - 4 * sc)
      .lineTo(cx - 5 * sc, cy + 7 * sc)
      .quadraticCurveTo(cx, cy + 10 * sc, cx + 5 * sc, cy + 7 * sc)
      .lineTo(cx + 7 * sc, cy - 4 * sc)
      .quadraticCurveTo(cx, cy - 6 * sc, cx - 7 * sc, cy - 4 * sc)
      .closePath().fill(0xc9a227);

    // Rim highlight
    g.moveTo(cx - 7 * sc, cy - 4 * sc)
      .quadraticCurveTo(cx, cy - 6 * sc, cx + 7 * sc, cy - 4 * sc)
      .quadraticCurveTo(cx, cy - 2.5 * sc, cx - 7 * sc, cy - 4 * sc)
      .closePath().fill({ color: 0xffd700, alpha: 0.45 });

    // Stem
    g.rect(cx - 1.2 * sc, cy + 7 * sc, 2.4 * sc, 4.5 * sc).fill(0xb8921e);

    // Base
    g.ellipse(cx, cy + 12.5 * sc, 4.5 * sc, 1.8 * sc).fill(0xc9a227);

    // Gem
    g.circle(cx, cy + 1 * sc, 1.8 * sc).fill(0xff4444);
    g.circle(cx, cy + 1 * sc, 1 * sc).fill({ color: 0xffffff, alpha: 0.25 });

    // Cross
    g.setStrokeStyle({ width: 0.7 * sc, color: 0xffd700, alpha: 0.5 });
    g.moveTo(cx, cy - 2.5 * sc).lineTo(cx, cy + 4.5 * sc).stroke();
    g.moveTo(cx - 2.5 * sc, cy + 1 * sc).lineTo(cx + 2.5 * sc, cy + 1 * sc).stroke();
  }

  private _drawPillar(g: Graphics, x: number, topY: number, height: number): void {
    const w = 18;
    // Shaft
    g.rect(x - w / 2, topY, w, height).fill({ color: 0x222228, alpha: 0.35 });
    // Highlight
    g.rect(x - w / 2, topY, 1.5, height).fill({ color: 0x333340, alpha: 0.25 });
    // Shadow
    g.rect(x + w / 2 - 1.5, topY, 1.5, height).fill({ color: 0x0a0a10, alpha: 0.25 });
    // Capital
    g.rect(x - w / 2 - 3, topY - 5, w + 6, 5).fill({ color: 0x2a2a32, alpha: 0.35 });
    // Base
    g.rect(x - w / 2 - 3, topY + height, w + 6, 5).fill({ color: 0x2a2a32, alpha: 0.35 });
  }
}
