// ---------------------------------------------------------------------------
// Wyrm — PixiJS Renderer (v3)
// Connected wyrm body, floating text pool, death scatter, trail, minimap,
// danger warning, combo timer bar, speed lines, improved visuals.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { WyrmPhase, PickupKind } from "../types";
import type { WyrmState, WyrmMeta } from "../types";
import { WYRM_BALANCE as B, getWyrmColors, getLetterGrade } from "../config/WyrmBalance";
import type { WyrmUpgrades } from "../types";
import { DIR_DX, DIR_DY, distanceToObstacle } from "../systems/WyrmGameSystem";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 52, fill: 0xc9a227,
  fontWeight: "bold", letterSpacing: 6,
  dropShadow: { color: 0x000000, distance: 4, angle: Math.PI / 4, blur: 6, alpha: 0.7 },
});
const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 16, fill: 0x8fbc8f, fontStyle: "italic",
});
const STYLE_CONTROLS = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x667766, lineHeight: 20,
});
const STYLE_META = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 14, fill: 0x888866, lineHeight: 22,
});
const STYLE_HUD = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xdaa520, fontWeight: "bold",
});
const STYLE_HUD_SMALL = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0x8fbc8f,
});
const STYLE_HUD_RIGHT = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xcc88ff, fontWeight: "bold",
});
const STYLE_DEATH_TITLE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 44, fill: 0xff4444, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 3, angle: Math.PI / 4, blur: 4, alpha: 0.7 },
});
const STYLE_DEATH_STAT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 16, fill: 0xcccccc, lineHeight: 24,
});
const STYLE_DEATH_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 20, fill: 0xc9a227, fontWeight: "bold",
});
const STYLE_PAUSE = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 36, fill: 0xdaa520, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 2, angle: Math.PI / 4, blur: 3, alpha: 0.5 },
});
const STYLE_START_PROMPT = new TextStyle({
  fontFamily: "Georgia, serif", fontSize: 22, fill: 0xc9a227, fontWeight: "bold",
});
const STYLE_FLOAT = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffffff, fontWeight: "bold",
  dropShadow: { color: 0x000000, distance: 1, angle: Math.PI / 4, blur: 2, alpha: 0.8 },
});

// ---------------------------------------------------------------------------
// Floating text pool — reuses PixiJS Text objects
// ---------------------------------------------------------------------------

const FLOAT_POOL_SIZE = 16;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class WyrmRenderer {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _hudSmallText = new Text({ text: "", style: STYLE_HUD_SMALL });
  private _hudRightText = new Text({ text: "", style: STYLE_HUD_RIGHT });
  private _titleText = new Text({ text: "WYRM", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Control the dragon. Devour everything.", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _metaText = new Text({ text: "", style: STYLE_META });
  private _startPrompt = new Text({ text: "Press SPACE to begin", style: STYLE_START_PROMPT });
  private _deathTitle = new Text({ text: "SLAIN", style: STYLE_DEATH_TITLE });
  private _deathStats = new Text({ text: "", style: STYLE_DEATH_STAT });
  private _deathPrompt = new Text({ text: "SPACE to retry  |  ESC to exit", style: STYLE_DEATH_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });

  // Floating text pool
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  // Shop text labels (4 upgrade slots)
  private _shopTexts: Text[] = [];

  private _sw = 0;
  private _sh = 0;
  private _cellSize = 0;
  private _offsetX = 0;
  private _offsetY = 0;
  private _fireFlicker = 0;

  // ---------------------------------------------------------------------------
  // Build / Destroy
  // ---------------------------------------------------------------------------

  build(sw: number, sh: number): void {
    this._sw = sw;
    this._sh = sh;
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    this.container.addChild(this._hudText);
    this.container.addChild(this._hudSmallText);
    this.container.addChild(this._hudRightText);
    this.container.addChild(this._titleText);
    this.container.addChild(this._subtitleText);
    this.container.addChild(this._controlsText);
    this.container.addChild(this._metaText);
    this.container.addChild(this._startPrompt);
    this.container.addChild(this._deathTitle);
    this.container.addChild(this._deathStats);
    this.container.addChild(this._deathPrompt);
    this.container.addChild(this._pauseText);

    this._hudText.position.set(10, 8);
    this._hudSmallText.position.set(10, 28);

    // Create shop text labels
    for (let i = 0; i < 4; i++) {
      const st = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcccccc }) });
      st.visible = false;
      this._shopTexts.push(st);
      this.container.addChild(st);
    }

    // Create floating text pool
    for (let i = 0; i < FLOAT_POOL_SIZE; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5);
      t.visible = false;
      this._floatTexts.push(t);
      this._floatContainer.addChild(t);
    }
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy();
    this._uiGfx.destroy();
  }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------

  render(state: WyrmState, sw: number, sh: number, meta: WyrmMeta): void {
    this._sw = sw;
    this._sh = sh;

    const margin = 8;
    const availW = sw - margin * 2;
    const availH = sh - margin * 2;
    const cellSize = Math.floor(Math.min(availW / state.cols, availH / state.rows));
    this._cellSize = cellSize;
    this._offsetX = Math.floor((sw - cellSize * state.cols) / 2);
    this._offsetY = Math.floor((sh - cellSize * state.rows) / 2);

    const g = this._gfx;
    g.clear();
    this._uiGfx.clear();

    // Screen shake
    let shakeX = 0, shakeY = 0;
    if (state.screenShake > 0) {
      const intensity = B.SHAKE_INTENSITY * (state.screenShake / B.SHAKE_DURATION);
      shakeX = (Math.random() - 0.5) * intensity * 2;
      shakeY = (Math.random() - 0.5) * intensity * 2;
    }
    this._gfx.position.set(shakeX, shakeY);

    g.rect(-10, -10, sw + 20, sh + 20).fill(B.COLOR_BG);
    this._drawGrass(g, state);
    this._drawGrid(g, state);
    this._drawTrail(g, state);
    this._drawPoisonTiles(g, state);
    this._drawWalls(g, state);
    this._drawTorches(g, state);
    this._drawPickups(g, state);
    this._drawKnights(g, state);
    if (state.boss && state.boss.alive) this._drawBoss(g, state);
    if (state.fireBreathTimer > 0) this._drawFireBreath(g, state);
    this._drawWyrm(g, state);
    this._drawPowerBars(g, state);
    this._drawLungeCooldown(g, state);
    this._drawDeathSegments(g, state);
    this._drawParticles(g, state);
    if (state.speedBoostTimer > 0 && state.phase === WyrmPhase.PLAYING) this._drawSpeedLines(g, state);
    this._drawDangerWarning(g, state);
    if (state.slowMoTimer > 0) this._drawSlowMoVignette(g, state);

    // Screen flash
    if (state.screenFlashTimer > 0) {
      const alpha = 0.25 * (state.screenFlashTimer / B.FLASH_DURATION);
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha });
    }

    // UI layer (no shake)
    this._drawFloatingTexts(state);
    this._drawComboBar(state);
    this._drawMinimap(state);
    this._drawHUD(state, meta);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);

    this._fireFlicker += 0.15;
  }

  // ---------------------------------------------------------------------------
  // Grass
  // ---------------------------------------------------------------------------

  private _drawGrass(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const tuft of state.grassTufts) {
      g.circle(ox + tuft.x * cs, oy + tuft.y * cs, tuft.size * cs)
        .fill({ color: tuft.shade, alpha: 0.4 });
    }
  }

  // ---------------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------------

  private _drawGrid(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    g.setStrokeStyle({ width: 1, color: B.COLOR_GRID, alpha: 0.15 });
    for (let x = 0; x <= state.cols; x++) {
      g.moveTo(ox + x * cs, oy).lineTo(ox + x * cs, oy + state.rows * cs).stroke();
    }
    for (let y = 0; y <= state.rows; y++) {
      g.moveTo(ox, oy + y * cs).lineTo(ox + state.cols * cs, oy + y * cs).stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Trail
  // ---------------------------------------------------------------------------

  private _drawTrail(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    for (const t of state.trail) {
      const alpha = (t.life / t.maxLife) * 0.25;
      g.circle(ox + t.x * cs + half, oy + t.y * cs + half, half * 0.5)
        .fill({ color: t.color, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Walls
  // ---------------------------------------------------------------------------

  private _drawWalls(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const w of state.walls) {
      const isBorder = w.x === 0 || w.x === state.cols - 1 || w.y === 0 || w.y === state.rows - 1;
      const color = isBorder ? 0x3a2a1a : B.COLOR_WALL;
      const wx = ox + w.x * cs;
      const wy = oy + w.y * cs;
      g.rect(wx, wy, cs, cs).fill(color);
      if (cs > 10) {
        g.rect(wx, wy, cs, 2).fill({ color: B.COLOR_WALL_HIGHLIGHT, alpha: 0.5 });
        g.rect(wx, wy, 2, cs).fill({ color: B.COLOR_WALL_HIGHLIGHT, alpha: 0.3 });
      }
      if (cs > 8 && !isBorder) {
        g.setStrokeStyle({ width: 1, color: 0x2a1a0a, alpha: 0.3 });
        g.moveTo(wx, wy + cs / 2).lineTo(wx + cs, wy + cs / 2).stroke();
        g.moveTo(wx + cs / 2, wy).lineTo(wx + cs / 2, wy + cs / 2).stroke();
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------

  private _drawPickups(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;

    for (const p of state.pickups) {
      const drift = this._getPickupDrift(state, p.x, p.y);
      const cx = ox + p.x * cs + half + drift.dx;
      const cy = oy + p.y * cs + half + drift.dy;
      const bob = Math.sin(t * 3 + p.x * 0.7 + p.y * 1.1) * 2;
      const r = half * 0.7;

      if (p.age > B.PICKUP_DESPAWN_TIME - 3 && Math.sin(t * 10) > 0.3) continue;

      switch (p.kind) {
        case PickupKind.SHEEP:
          g.circle(cx, cy + bob, r).fill(B.COLOR_SHEEP);
          g.circle(cx - r * 0.3, cy + bob - r * 0.4, r * 0.3).fill(0x333333);
          g.rect(cx - r * 0.4, cy + bob + r * 0.6, 2, r * 0.3).fill(0x333333);
          g.rect(cx + r * 0.2, cy + bob + r * 0.6, 2, r * 0.3).fill(0x333333);
          break;
        case PickupKind.KNIGHT:
          g.rect(cx - r * 0.6, cy + bob - r, r * 1.2, r * 1.6).fill(B.COLOR_KNIGHT);
          g.rect(cx - r * 0.15, cy + bob - r * 0.7, r * 0.3, r * 1.2).fill(0xaa0000);
          g.rect(cx - r * 0.5, cy + bob - r * 0.1, r * 1.0, r * 0.3).fill(0xaa0000);
          break;
        case PickupKind.TREASURE: {
          g.star(cx, cy + bob, 4, r * 0.4, r, t * 2).fill(B.COLOR_TREASURE);
          const sa = t * 5;
          for (let s = 0; s < 3; s++) {
            const a = sa + s * Math.PI * 2 / 3;
            g.circle(cx + Math.cos(a) * r * 0.8, cy + bob + Math.sin(a) * r * 0.6, 1.5).fill(0xffffff);
          }
          break;
        }
        case PickupKind.POTION:
          g.roundRect(cx - r * 0.4, cy + bob - r * 0.2, r * 0.8, r * 1.0, 3).fill(B.COLOR_POTION);
          g.rect(cx - r * 0.2, cy + bob - r * 0.6, r * 0.4, r * 0.5).fill(0x006699);
          g.circle(cx + r * 0.1, cy + bob + r * 0.1 + Math.sin(t * 6) * 2, 2).fill({ color: 0xffffff, alpha: 0.6 });
          break;
        case PickupKind.FIRE_SCROLL: {
          g.roundRect(cx - r * 0.5, cy + bob - r * 0.4, r * 1.0, r * 0.8, 2).fill(0xeedd99);
          const fy = cy + bob - r * 0.7 + Math.sin(t * 8) * 2;
          g.circle(cx, fy, r * 0.35).fill(B.COLOR_FIRE_SCROLL);
          g.circle(cx, fy - r * 0.2, r * 0.2).fill(0xffaa00);
          break;
        }
        case PickupKind.SHIELD:
          g.circle(cx, cy + bob, r * 0.9).fill({ color: B.COLOR_SHIELD, alpha: 0.3 });
          g.moveTo(cx, cy + bob - r * 0.8)
            .lineTo(cx + r * 0.6, cy + bob - r * 0.3)
            .lineTo(cx + r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx, cy + bob + r * 0.8)
            .lineTo(cx - r * 0.5, cy + bob + r * 0.5)
            .lineTo(cx - r * 0.6, cy + bob - r * 0.3)
            .closePath().fill(B.COLOR_SHIELD);
          g.circle(cx, cy + bob, r * 0.3).fill(0xffffff);
          break;
        case PickupKind.PORTAL:
          // Swirling portal
          g.circle(cx, cy + bob, r * 1.0).fill({ color: B.COLOR_PORTAL, alpha: 0.2 + Math.sin(t * 6) * 0.1 });
          g.circle(cx, cy + bob, r * 0.7).fill({ color: B.COLOR_PORTAL, alpha: 0.4 });
          g.circle(cx, cy + bob, r * 0.35).fill(0xffffff);
          // Orbital dots
          for (let s = 0; s < 4; s++) {
            const a = t * 4 + s * Math.PI / 2;
            g.circle(cx + Math.cos(a) * r * 0.7, cy + bob + Math.sin(a) * r * 0.7, 2).fill(0xcc88ff);
          }
          break;
        case PickupKind.GOLDEN_SHEEP:
          // Glowing golden sheep
          g.circle(cx, cy + bob, r * 1.2).fill({ color: B.COLOR_GOLDEN_SHEEP, alpha: 0.15 + Math.sin(t * 5) * 0.1 });
          g.circle(cx, cy + bob, r).fill(B.COLOR_GOLDEN_SHEEP);
          g.circle(cx - r * 0.3, cy + bob - r * 0.4, r * 0.3).fill(0x8a6a00);
          g.rect(cx - r * 0.4, cy + bob + r * 0.6, 2, r * 0.3).fill(0x8a6a00);
          g.rect(cx + r * 0.2, cy + bob + r * 0.6, 2, r * 0.3).fill(0x8a6a00);
          // Crown
          g.moveTo(cx - r * 0.3, cy + bob - r * 0.9).lineTo(cx - r * 0.1, cy + bob - r * 0.6)
            .lineTo(cx, cy + bob - r * 1.0).lineTo(cx + r * 0.1, cy + bob - r * 0.6)
            .lineTo(cx + r * 0.3, cy + bob - r * 0.9).closePath().fill(0xffd700);
          break;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Roaming knights
  // ---------------------------------------------------------------------------

  private _drawKnights(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;

    for (const k of state.knights) {
      if (!k.alive) continue;
      const cx = ox + k.x * cs + half;
      const cy = oy + k.y * cs + half;
      const r = half * 0.75;

      const kColor = k.chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM;
      g.circle(cx, cy, r).fill(kColor);
      const dx = DIR_DX[k.dir];
      const dy = DIR_DY[k.dir];
      g.rect(cx + dx * r * 0.3 - 3, cy + dy * r * 0.3 - 1, 6, 3).fill(k.chasing ? 0x441111 : 0x222244);
      const swordLen = r * 0.8;
      g.setStrokeStyle({ width: 2, color: k.chasing ? 0xffaaaa : 0xddddee });
      g.moveTo(cx + dx * r * 0.5, cy + dy * r * 0.5)
        .lineTo(cx + dx * (r * 0.5 + swordLen), cy + dy * (r * 0.5 + swordLen)).stroke();

      const glowAlpha = 0.1 + Math.sin(t * (k.chasing ? 8 : 4) + k.x) * 0.05;
      g.circle(cx, cy, r * 1.4).fill({ color: kColor, alpha: glowAlpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Wyrm — connected body with smooth thick lines between segments
  // ---------------------------------------------------------------------------

  private _drawWyrm(g: Graphics, state: WyrmState): void {
    if (state.phase === WyrmPhase.DEAD || state.phase === WyrmPhase.START) return;
    if (state.body.length === 0) return;

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    const frac = state.moveFraction;

    // Compute screen positions for each segment
    const positions: { x: number; y: number }[] = [];
    for (let i = 0; i < state.body.length; i++) {
      const seg = state.body[i];
      let sx: number, sy: number;
      if (i === 0 && state.body.length > 1) {
        const prev = state.body[1];
        sx = ox + (prev.x + (seg.x - prev.x) * frac) * cs + half;
        sy = oy + (prev.y + (seg.y - prev.y) * frac) * cs + half;
      } else {
        sx = ox + seg.x * cs + half;
        sy = oy + seg.y * cs + half;
        // Subtle wave for body
        if (i > 0) {
          const wave = Math.sin(t * 4 + i * 0.5) * 1.0;
          sx += wave * (i % 2 ? 1 : -1) * 0.3;
        }
      }
      positions.push({ x: sx, y: sy });
    }

    const wyrmCol = getWyrmColors(state.length);

    // --- Draw connecting lines between segments (body "spine") ---
    for (let i = state.body.length - 1; i > 0; i--) {
      const from = positions[i];
      const to = positions[i - 1];
      const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
      const lineW = cs * taperFactor;
      const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;
      g.setStrokeStyle({ width: lineW, color, cap: "round" });
      g.moveTo(from.x, from.y).lineTo(to.x, to.y).stroke();
    }

    // --- Draw segment circles on top of lines ---
    for (let i = state.body.length - 1; i >= 0; i--) {
      const { x: cx, y: cy } = positions[i];

      if (i === 0) {
        // Head
        const headR = half * 0.92;

        // Shield aura — multiple rings for multi-hit shields
        if (state.shieldHits > 0) {
          for (let sr = 0; sr < state.shieldHits; sr++) {
            const pulse = 0.12 + Math.sin(t * 6 + sr * 1.5) * 0.06;
            const ringR = headR * (1.6 + sr * 0.4);
            g.circle(cx, cy, ringR).fill({ color: B.COLOR_SHIELD, alpha: pulse });
          }
        }

        const wyrmC = getWyrmColors(state.length);
        g.circle(cx, cy, headR).fill(wyrmC.head);

        // Horns
        const dx = DIR_DX[state.direction];
        const dy = DIR_DY[state.direction];
        const px = -dy;
        const py = dx;
        const hornLen = headR * 0.6;
        g.setStrokeStyle({ width: 2.5, color: 0x8a6a1a, cap: "round" });
        g.moveTo(cx + px * headR * 0.5, cy + py * headR * 0.5)
          .lineTo(cx + px * headR * 0.5 - dx * hornLen, cy + py * headR * 0.5 - dy * hornLen).stroke();
        g.moveTo(cx - px * headR * 0.5, cy - py * headR * 0.5)
          .lineTo(cx - px * headR * 0.5 - dx * hornLen, cy - py * headR * 0.5 - dy * hornLen).stroke();

        // Mouth — opens when food is nearby (within 2 cells ahead)
        const mouthOpen = this._isFoodNearby(state, 2);
        if (mouthOpen) {
          const jawSize = headR * 0.35;
          // Upper jaw
          g.moveTo(cx + dx * headR * 0.6 + px * jawSize, cy + dy * headR * 0.6 + py * jawSize)
            .lineTo(cx + dx * headR * 1.0, cy + dy * headR * 1.0)
            .lineTo(cx + dx * headR * 0.6 - px * jawSize, cy + dy * headR * 0.6 - py * jawSize)
            .closePath().fill(0x8a6a1a);
          // Inner mouth (dark)
          g.circle(cx + dx * headR * 0.55, cy + dy * headR * 0.55, jawSize * 0.6).fill(0x330000);
        }

        // Eyes
        const eyeOff = headR * 0.35;
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6, cy + dy * eyeOff + py * eyeOff * 0.6, 3).fill(0xff0000);
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6, cy + dy * eyeOff - py * eyeOff * 0.6, 3).fill(0xff0000);
        g.circle(cx + dx * eyeOff + px * eyeOff * 0.6 + 1, cy + dy * eyeOff + py * eyeOff * 0.6 - 1, 1).fill(0xffaaaa);
        g.circle(cx + dx * eyeOff - px * eyeOff * 0.6 + 1, cy + dy * eyeOff - py * eyeOff * 0.6 - 1, 1).fill(0xffaaaa);

        if (state.fireBreathTimer > 0) {
          g.circle(cx, cy, headR * 1.5).fill({ color: 0xff6600, alpha: 0.25 + Math.sin(t * 10) * 0.15 });
        }
        if (state.speedBoostTimer > 0) {
          g.circle(cx, cy, headR * 1.3).fill({ color: 0x00ccff, alpha: 0.15 });
        }
      } else {
        // Body circles (on top of the connecting lines for a rounded look)
        const color = i % 2 === 0 ? wyrmCol.body : wyrmCol.bodyAlt;
        const taperFactor = Math.max(0.3, 0.72 - i * 0.004);
        const bodyR = half * taperFactor;
        g.circle(cx, cy, bodyR).fill(color);

        // Scale pattern
        if (cs > 10 && i % 3 === 0) {
          g.circle(cx, cy, bodyR * 0.35).fill({ color: 0x445522, alpha: 0.25 });
        }
        // Shield glow
        if (state.shieldHits > 0 && i % 5 === 0) {
          g.circle(cx, cy, bodyR * 1.3).fill({ color: B.COLOR_SHIELD, alpha: 0.06 });
        }
      }
    }

    // Tail tip — small pointed triangle at the end
    if (state.body.length >= 2) {
      const last = positions[positions.length - 1];
      const prev = positions[positions.length - 2];
      const tdx = last.x - prev.x;
      const tdy = last.y - prev.y;
      const tlen = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
      const nx = tdx / tlen;
      const ny = tdy / tlen;
      const tipLen = half * 0.5;
      g.moveTo(last.x + nx * tipLen, last.y + ny * tipLen)
        .lineTo(last.x - ny * 3, last.y + nx * 3)
        .lineTo(last.x + ny * 3, last.y - nx * 3)
        .closePath().fill(B.COLOR_WYRM_BODY_ALT);
    }
  }

  // ---------------------------------------------------------------------------
  // Death segments (scattered body parts)
  // ---------------------------------------------------------------------------

  private _drawDeathSegments(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;

    for (const seg of state.deathSegments) {
      const alpha = seg.life / B.DEATH_SEGMENT_LIFETIME;
      const px = ox + seg.x * cs + half;
      const py = oy + seg.y * cs + half;
      const r = half * seg.radius * alpha;
      g.circle(px, py, Math.max(r, 2)).fill({ color: seg.color, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Fire breath
  // ---------------------------------------------------------------------------

  private _drawFireBreath(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];

    for (let r = 1; r <= B.FIRE_BREATH_RANGE; r++) {
      const fx = head.x + dx * r;
      const fy = head.y + dy * r;
      const cx = ox + fx * cs + half;
      const cy = oy + fy * cs + half;
      const flicker = Math.sin(this._fireFlicker + r * 2) * 0.15;
      const alpha = (0.7 - r * 0.12) + flicker;
      const radius = half * (1.3 - r * 0.1);
      const px = -dy;
      const py = dx;
      const spread = r * 0.3;

      g.circle(cx, cy, radius * 1.6).fill({ color: 0xff2200, alpha: alpha * 0.2 });
      g.circle(cx + px * spread * cs, cy + py * spread * cs, radius * 0.8).fill({ color: 0xff6600, alpha: alpha * 0.3 });
      g.circle(cx - px * spread * cs, cy - py * spread * cs, radius * 0.8).fill({ color: 0xff6600, alpha: alpha * 0.3 });
      g.circle(cx, cy, radius).fill({ color: 0xff6600, alpha });
      g.circle(cx, cy, radius * 0.5).fill({ color: 0xffcc00, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Speed lines (when boosted)
  // ---------------------------------------------------------------------------

  private _drawSpeedLines(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half;
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];

    g.setStrokeStyle({ width: 1.5, color: 0x00ccff, alpha: 0.4 });
    for (let i = 0; i < 6; i++) {
      const offset = (Math.random() - 0.5) * cs * 2;
      const px = -dy;
      const py = dx;
      const sx = hx + px * offset - dx * cs * (1 + Math.random() * 2);
      const sy = hy + py * offset - dy * cs * (1 + Math.random() * 2);
      g.moveTo(sx, sy).lineTo(sx - dx * cs * 1.5, sy - dy * cs * 1.5).stroke();
    }
  }

  // ---------------------------------------------------------------------------
  // Danger warning (border flashes when heading at a wall)
  // ---------------------------------------------------------------------------

  private _drawDangerWarning(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    const dist = distanceToObstacle(state);
    if (dist > B.DANGER_DISTANCE) return;

    // Intensity increases as distance decreases
    const intensity = 1.0 - (dist - 1) / B.DANGER_DISTANCE;
    const alpha = intensity * 0.3 * (0.5 + Math.sin(state.time * 12) * 0.5);

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const dx = DIR_DX[state.direction];
    const dy = DIR_DY[state.direction];

    // Draw warning stripe on the border wall the wyrm is heading toward
    if (dy === -1) { // heading up
      g.rect(ox, oy, state.cols * cs, 4).fill({ color: B.COLOR_DANGER, alpha });
    } else if (dy === 1) { // heading down
      g.rect(ox, oy + (state.rows - 1) * cs + cs - 4, state.cols * cs, 4).fill({ color: B.COLOR_DANGER, alpha });
    } else if (dx === -1) { // heading left
      g.rect(ox, oy, 4, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha });
    } else if (dx === 1) { // heading right
      g.rect(ox + (state.cols - 1) * cs + cs - 4, oy, 4, state.rows * cs).fill({ color: B.COLOR_DANGER, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Boss knight
  // ---------------------------------------------------------------------------

  private _drawBoss(g: Graphics, state: WyrmState): void {
    const boss = state.boss;
    if (!boss || !boss.alive) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    const cx = ox + boss.x * cs + half;
    const cy = oy + boss.y * cs + half;
    const r = half * 1.1; // bigger than normal knights

    // Danger aura
    const aura = 0.15 + Math.sin(t * 3) * 0.08;
    g.circle(cx, cy, r * 2.0).fill({ color: B.COLOR_BOSS, alpha: aura });

    // Body
    const bodyColor = boss.flashTimer > 0 ? 0xffffff : B.COLOR_BOSS;
    g.circle(cx, cy, r).fill(bodyColor);

    // Helmet
    g.rect(cx - r * 0.4, cy - r * 0.3, r * 0.8, r * 0.2).fill(0x441133);

    // HP bar above
    const barW = cs * 1.2;
    const barH = 4;
    const barX = cx - barW / 2;
    const barY = cy - r - 8;
    g.rect(barX, barY, barW, barH).fill({ color: 0x333333, alpha: 0.8 });
    g.rect(barX, barY, barW * (boss.hp / boss.maxHp), barH).fill(0xff2266);

    // Crown
    g.moveTo(cx - r * 0.4, cy - r * 0.8).lineTo(cx - r * 0.2, cy - r * 0.5)
      .lineTo(cx, cy - r * 0.9).lineTo(cx + r * 0.2, cy - r * 0.5)
      .lineTo(cx + r * 0.4, cy - r * 0.8).closePath().fill(0xffdd44);
  }

  // ---------------------------------------------------------------------------
  // Power-up timer bars near wyrm head
  // ---------------------------------------------------------------------------

  private _drawPowerBars(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    if (state.fireBreathTimer <= 0 && state.speedBoostTimer <= 0 && state.shieldHits <= 0) return;

    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half - half * 1.4; // above head
    const barW = cs * 1.0;
    const barH = 3;
    let yOff = 0;

    if (state.fireBreathTimer > 0) {
      const fill = state.fireBreathTimer / B.FIRE_BREATH_DURATION;
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
      g.rect(hx - barW / 2, hy - yOff, barW * fill, barH).fill({ color: B.COLOR_FIRE_SCROLL, alpha: 0.9 });
      yOff += barH + 2;
    }
    if (state.speedBoostTimer > 0) {
      const fill = state.speedBoostTimer / B.SPEED_BOOST_DURATION;
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: 0x222222, alpha: 0.5 });
      g.rect(hx - barW / 2, hy - yOff, barW * fill, barH).fill({ color: B.COLOR_POTION, alpha: 0.9 });
      yOff += barH + 2;
    }
    if (state.shieldHits > 0) {
      g.rect(hx - barW / 2, hy - yOff, barW, barH).fill({ color: B.COLOR_SHIELD, alpha: 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // Slow-mo vignette
  // ---------------------------------------------------------------------------

  private _drawSlowMoVignette(g: Graphics, state: WyrmState): void {
    const alpha = 0.15 * (state.slowMoTimer / B.SLOW_MO_DURATION);
    const sw = this._sw, sh = this._sh;
    // Dark edges
    g.rect(0, 0, sw, 30).fill({ color: 0x000000, alpha });
    g.rect(0, sh - 30, sw, 30).fill({ color: 0x000000, alpha });
    g.rect(0, 0, 30, sh).fill({ color: 0x000000, alpha });
    g.rect(sw - 30, 0, 30, sh).fill({ color: 0x000000, alpha });
  }

  // ---------------------------------------------------------------------------
  // Helper: check if any pickup/knight is within N cells ahead of wyrm head
  // ---------------------------------------------------------------------------

  private _isFoodNearby(state: WyrmState, range: number): boolean {
    if (state.body.length === 0) return false;
    const head = state.body[0];
    const dx = DIR_DX[state.direction], dy = DIR_DY[state.direction];
    for (let d = 1; d <= range; d++) {
      const nx = head.x + dx * d, ny = head.y + dy * d;
      if (state.pickups.some(p => p.x === nx && p.y === ny)) return true;
      if (state.knights.some(k => k.alive && k.x === nx && k.y === ny)) return true;
    }
    return false;
  }

  // ---------------------------------------------------------------------------
  // Pickup visual drift toward wyrm (magnet effect)
  // ---------------------------------------------------------------------------

  private _getPickupDrift(state: WyrmState, px: number, py: number): { dx: number; dy: number } {
    if (state.body.length === 0) return { dx: 0, dy: 0 };
    const head = state.body[0];
    const ddx = head.x - px, ddy = head.y - py;
    const dist = Math.sqrt(ddx * ddx + ddy * ddy);
    if (dist <= 0 || dist > state.magnetRadius) return { dx: 0, dy: 0 };
    const strength = (1.0 - dist / state.magnetRadius) * 0.3;
    return { dx: (ddx / dist) * strength * this._cellSize, dy: (ddy / dist) * strength * this._cellSize };
  }

  // ---------------------------------------------------------------------------
  // Decorative torches at border corners
  // ---------------------------------------------------------------------------

  private _drawTorches(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const t = state.time;
    const gw = state.cols * cs, gh = state.rows * cs;

    const positions = [
      { x: ox + cs * 1.5, y: oy + cs * 1.5 },
      { x: ox + gw - cs * 1.5, y: oy + cs * 1.5 },
      { x: ox + cs * 1.5, y: oy + gh - cs * 1.5 },
      { x: ox + gw - cs * 1.5, y: oy + gh - cs * 1.5 },
    ];

    for (const pos of positions) {
      // Torch base
      g.rect(pos.x - 2, pos.y - 4, 4, 8).fill(0x5a3a1a);
      // Flame
      const flicker = Math.sin(t * 8 + pos.x * 0.1) * 2;
      g.circle(pos.x, pos.y - 7 + flicker, 4).fill({ color: 0xff6600, alpha: 0.7 });
      g.circle(pos.x, pos.y - 9 + flicker, 2.5).fill({ color: 0xffcc00, alpha: 0.8 });
      // Glow
      g.circle(pos.x, pos.y - 7 + flicker, cs * 0.8).fill({ color: 0xff6600, alpha: 0.04 });
    }
  }

  // ---------------------------------------------------------------------------
  // Poison tiles
  // ---------------------------------------------------------------------------

  private _drawPoisonTiles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const t = state.time;
    for (const p of state.poisonTiles) {
      const cx = ox + p.x * cs + half;
      const cy = oy + p.y * cs + half;
      const pulse = 0.2 + Math.sin(t * 4 + p.x + p.y) * 0.08;
      g.circle(cx, cy, half * 0.8).fill({ color: B.COLOR_POISON, alpha: pulse });
      g.circle(cx, cy, half * 0.4).fill({ color: 0x66cc66, alpha: pulse + 0.1 });
      // Skull-ish mark
      g.circle(cx - 2, cy - 2, 2).fill({ color: 0x224422, alpha: 0.5 });
      g.circle(cx + 2, cy - 2, 2).fill({ color: 0x224422, alpha: 0.5 });
      g.rect(cx - 1, cy + 1, 2, 3).fill({ color: 0x224422, alpha: 0.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Lunge cooldown indicator (near wyrm head)
  // ---------------------------------------------------------------------------

  private _drawLungeCooldown(g: Graphics, state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING) return;
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    const half = cs / 2;
    const head = state.body[0];
    const hx = ox + head.x * cs + half;
    const hy = oy + head.y * cs + half + half * 1.3; // below head

    // Lunge ready indicator
    if (state.lungeCooldown <= 0) {
      // Small glow dot = ready
      g.circle(hx, hy, 3).fill({ color: B.COLOR_LUNGE, alpha: 0.5 + Math.sin(state.time * 6) * 0.3 });
    } else {
      // Cooldown arc
      const fill = 1.0 - state.lungeCooldown / B.LUNGE_COOLDOWN;
      const barW = cs * 0.8;
      g.rect(hx - barW / 2, hy, barW, 2).fill({ color: 0x333333, alpha: 0.4 });
      g.rect(hx - barW / 2, hy, barW * fill, 2).fill({ color: B.COLOR_LUNGE, alpha: 0.7 });
    }

    // Lunge flash overlay
    if (state.lungeFlash > 0) {
      const alpha = 0.3 * (state.lungeFlash / B.LUNGE_FLASH);
      g.circle(hx, hy - half, half * 2).fill({ color: B.COLOR_LUNGE, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Particles
  // ---------------------------------------------------------------------------

  private _drawParticles(g: Graphics, state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;
    for (const p of state.particles) {
      const alpha = p.life / p.maxLife;
      g.circle(ox + p.x * cs + cs / 2, oy + p.y * cs + cs / 2, p.size * alpha)
        .fill({ color: p.color, alpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Floating texts — proper PixiJS Text objects from pool
  // ---------------------------------------------------------------------------

  private _drawFloatingTexts(state: WyrmState): void {
    const cs = this._cellSize;
    const ox = this._offsetX;
    const oy = this._offsetY;

    // Hide all first
    for (const t of this._floatTexts) t.visible = false;

    // Show active texts (most recent first, limited to pool size)
    const active = state.floatingTexts;
    const count = Math.min(active.length, FLOAT_POOL_SIZE);
    for (let i = 0; i < count; i++) {
      const ft = active[active.length - 1 - i]; // most recent first
      const txt = this._floatTexts[i];
      txt.visible = true;
      txt.text = ft.text;
      txt.style.fill = ft.color;
      txt.position.set(ox + ft.x * cs + cs / 2, oy + ft.y * cs);
      const alpha = ft.life / ft.maxLife;
      txt.alpha = alpha;
      txt.scale.set(ft.scale * (0.8 + alpha * 0.2));
    }
  }

  // ---------------------------------------------------------------------------
  // Combo timer bar (below HUD)
  // ---------------------------------------------------------------------------

  private _drawComboBar(state: WyrmState): void {
    if (state.comboCount < 2 || state.comboTimer <= 0) return;

    const ug = this._uiGfx;
    const barW = 140;
    const barH = 5;
    const x = this._sw - 10 - barW;
    const y = 24;
    const fill = state.comboTimer / B.COMBO_WINDOW;

    ug.rect(x, y, barW, barH).fill({ color: 0x333333, alpha: 0.6 });
    ug.rect(x, y, barW * fill, barH).fill({ color: B.COLOR_COMBO, alpha: 0.8 });
  }

  // ---------------------------------------------------------------------------
  // Minimap (bottom-right corner)
  // ---------------------------------------------------------------------------

  private _drawMinimap(state: WyrmState): void {
    if (state.phase !== WyrmPhase.PLAYING && state.phase !== WyrmPhase.PAUSED) return;

    const ug = this._uiGfx;
    const size = B.MINIMAP_SIZE;
    const margin = B.MINIMAP_MARGIN;
    const mx = this._sw - size - margin;
    const my = this._sh - size - margin;
    const scaleX = size / state.cols;
    const scaleY = size / state.rows;

    // Background
    ug.rect(mx, my, size, size).fill({ color: 0x000000, alpha: 0.5 });
    ug.setStrokeStyle({ width: 1, color: 0x444444 });
    ug.rect(mx, my, size, size).stroke();

    // Walls (tiny dots)
    for (const w of state.walls) {
      const isBorder = w.x === 0 || w.x === state.cols - 1 || w.y === 0 || w.y === state.rows - 1;
      if (isBorder) continue;
      ug.rect(mx + w.x * scaleX, my + w.y * scaleY, Math.max(scaleX, 1), Math.max(scaleY, 1))
        .fill({ color: B.COLOR_WALL, alpha: 0.6 });
    }

    // Pickups
    for (const p of state.pickups) {
      let color: number = B.COLOR_SHEEP;
      if (p.kind === PickupKind.TREASURE) color = B.COLOR_TREASURE;
      else if (p.kind === PickupKind.FIRE_SCROLL) color = B.COLOR_FIRE_SCROLL;
      else if (p.kind === PickupKind.POTION) color = B.COLOR_POTION;
      else if (p.kind === PickupKind.SHIELD) color = B.COLOR_SHIELD;
      else if (p.kind === PickupKind.PORTAL) color = B.COLOR_PORTAL;
      else if (p.kind === PickupKind.GOLDEN_SHEEP) color = B.COLOR_GOLDEN_SHEEP;
      ug.circle(mx + p.x * scaleX + scaleX / 2, my + p.y * scaleY + scaleY / 2, 1.5)
        .fill({ color, alpha: 0.8 });
    }

    // Knights (chase = red, roam = blue)
    for (const k of state.knights) {
      if (!k.alive) continue;
      const kc = k.chasing ? B.COLOR_KNIGHT_CHASE : B.COLOR_KNIGHT_ROAM;
      ug.circle(mx + k.x * scaleX + scaleX / 2, my + k.y * scaleY + scaleY / 2, 1.5)
        .fill({ color: kc, alpha: 0.9 });
    }

    // Poison
    for (const p of state.poisonTiles) {
      ug.circle(mx + p.x * scaleX + scaleX / 2, my + p.y * scaleY + scaleY / 2, 1.5)
        .fill({ color: B.COLOR_POISON, alpha: 0.7 });
    }

    // Boss
    if (state.boss && state.boss.alive) {
      ug.circle(mx + state.boss.x * scaleX + scaleX / 2, my + state.boss.y * scaleY + scaleY / 2, 3)
        .fill({ color: B.COLOR_BOSS, alpha: 1.0 });
    }

    // Wyrm body
    const mmColors = getWyrmColors(state.length);
    for (let i = state.body.length - 1; i >= 0; i--) {
      const seg = state.body[i];
      const color = i === 0 ? mmColors.head : mmColors.body;
      const r = i === 0 ? 2.5 : 1.2;
      ug.circle(mx + seg.x * scaleX + scaleX / 2, my + seg.y * scaleY + scaleY / 2, r)
        .fill(color);
    }
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _drawHUD(state: WyrmState, meta: WyrmMeta): void {
    if (state.phase === WyrmPhase.START || state.phase === WyrmPhase.DEAD) {
      this._hudText.visible = false;
      this._hudSmallText.visible = false;
      this._hudRightText.visible = false;
      return;
    }
    this._hudText.visible = true;
    this._hudSmallText.visible = true;
    this._hudRightText.visible = true;

    const score = Math.floor(state.score);
    const hi = Math.max(Math.floor(meta.highScore), score);
    this._hudText.text = `SCORE: ${score}  |  LENGTH: ${state.length}  |  HI: ${hi}`;

    const parts: string[] = [];
    if (state.fireBreathTimer > 0) parts.push(`FIRE: ${state.fireBreathTimer.toFixed(1)}s`);
    if (state.speedBoostTimer > 0) parts.push(`SPEED: ${state.speedBoostTimer.toFixed(1)}s`);
    if (state.shieldHits > 0) parts.push(state.shieldHits > 1 ? `SHIELD x${state.shieldHits}` : "SHIELD");
    parts.push(`WAVE: ${state.wave}`);
    this._hudSmallText.text = parts.join("  |  ");

    if (state.comboCount >= 2) {
      this._hudRightText.text = `${state.comboCount}x COMBO`;
      this._hudRightText.alpha = 0.7 + Math.sin(state.time * 8) * 0.3;
    } else {
      this._hudRightText.text = "";
    }
    this._hudRightText.anchor.set(1, 0);
    this._hudRightText.position.set(this._sw - 10, 8);
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------

  private _drawStartScreen(state: WyrmState, meta: WyrmMeta): void {
    const show = state.phase === WyrmPhase.START;
    this._titleText.visible = show;
    this._subtitleText.visible = show;
    this._controlsText.visible = show;
    this._metaText.visible = show;
    this._startPrompt.visible = show;
    if (!show) return;

    const cx = this._sw / 2;
    const cy = this._sh / 2;
    const g = this._gfx;

    g.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.5 });

    this._titleText.anchor.set(0.5);
    this._titleText.position.set(cx, cy - 100);
    this._subtitleText.anchor.set(0.5);
    this._subtitleText.position.set(cx, cy - 50);

    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(cx, cy + 5);
    this._controlsText.text = [
      "ARROW KEYS / WASD  -  Steer    |    SPACE  -  Lunge forward",
      "Eat sheep, golden sheep, treasure, and roaming knights",
      "Portals teleport you  |  Shields block collisions",
      "Fire scrolls grant dragon breath  |  Avoid poison swamps",
      "Chain eats for combo (up to 8x)  |  Bosses every 5 waves",
      "ESC  -  Pause / Exit    |    Earn coins to buy upgrades",
    ].join("\n");

    if (meta.gamesPlayed > 0) {
      this._metaText.anchor.set(0.5);
      this._metaText.position.set(cx, cy + 120);
      this._metaText.text = [
        `Best: ${meta.highScore}  |  Longest: ${meta.bestLength}  |  Best Combo: ${meta.bestCombo}x`,
        `Games: ${meta.gamesPlayed}  |  Sheep: ${meta.totalSheepEaten}  |  Knights: ${meta.totalKnightsEaten}`,
      ].join("\n");
    } else {
      this._metaText.text = "";
    }

    this._startPrompt.anchor.set(0.5);
    this._startPrompt.position.set(cx, cy + 175);
    this._startPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;

    // Animated demo wyrm — connected body
    const cs = this._cellSize || 20;
    const demoY = cy + 220;
    const segCount = 14;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i < segCount; i++) {
      pts.push({
        x: cx - (segCount / 2) * cs * 0.55 + i * cs * 0.55,
        y: demoY + Math.sin(state.time * 2.5 + i * 0.5) * 14,
      });
    }
    // Connecting lines
    for (let i = segCount - 1; i > 0; i--) {
      const w = Math.max(4, 12 - i * 0.5);
      const color = i % 2 === 0 ? B.COLOR_WYRM_BODY : B.COLOR_WYRM_BODY_ALT;
      g.setStrokeStyle({ width: w, color, cap: "round" });
      g.moveTo(pts[i].x, pts[i].y).lineTo(pts[i - 1].x, pts[i - 1].y).stroke();
    }
    // Segment circles
    for (let i = segCount - 1; i >= 0; i--) {
      const color = i === 0 ? B.COLOR_WYRM_HEAD : (i % 2 === 0 ? B.COLOR_WYRM_BODY : B.COLOR_WYRM_BODY_ALT);
      const r = i === 0 ? 14 : Math.max(5, 12 - i * 0.4);
      g.circle(pts[i].x, pts[i].y, r).fill(color);
      if (i === 0) {
        g.circle(pts[0].x + 5, pts[0].y - 3, 2.5).fill(0xff0000);
        g.circle(pts[0].x + 5, pts[0].y + 3, 2.5).fill(0xff0000);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pause
  // ---------------------------------------------------------------------------

  private _drawPauseScreen(state: WyrmState): void {
    const show = state.phase === WyrmPhase.PAUSED;
    this._pauseText.visible = show;
    if (!show) return;
    this._uiGfx.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.45 });
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(this._sw / 2, this._sh / 2);
    this._pauseText.alpha = 0.7 + Math.sin(state.time * 2) * 0.3;
  }

  // ---------------------------------------------------------------------------
  // Death screen
  // ---------------------------------------------------------------------------

  private _drawDeathScreen(state: WyrmState, meta: WyrmMeta): void {
    const show = state.phase === WyrmPhase.DEAD;
    this._deathTitle.visible = show;
    this._deathStats.visible = show;
    this._deathPrompt.visible = show;
    for (const st of this._shopTexts) st.visible = false;
    if (!show) return;

    const ug = this._uiGfx;
    ug.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.65 });

    const cx = this._sw / 2;
    const cy = this._sh / 2;
    const score = Math.floor(state.score);
    const grade = getLetterGrade(score);
    const isNew = score >= meta.highScore && score > 0;
    const coins = Math.floor(score / 100);

    // Grade letter (large, above title)
    ug.circle(cx, cy - 140, 30).fill({ color: grade.color, alpha: 0.15 });
    // We use the death title to show the grade
    this._deathTitle.anchor.set(0.5);
    this._deathTitle.position.set(cx, cy - 140);
    this._deathTitle.text = `${grade.grade}`;
    this._deathTitle.style.fill = grade.color;

    this._deathStats.anchor.set(0.5);
    this._deathStats.position.set(cx, cy - 50);
    this._deathStats.text = [
      `Score: ${score}${isNew ? "  ** NEW HIGH SCORE! **" : ""}`,
      `Length: ${state.length}  |  Combo: ${state.bestCombo}x  |  Bosses: ${state.bossesKilled}`,
      `Sheep: ${state.sheepEaten}  |  Knights: ${state.knightsEaten}  |  Treasure: ${state.treasureCollected}`,
      `Wave: ${state.wave}  |  Time: ${Math.floor(state.time)}s  |  +${coins} coins`,
    ].join("\n");

    // Upgrade shop with proper text labels
    const shopY = cy + 35;
    const upgrades = meta.upgrades || { extraStartLength: 0, longerFire: 0, fasterLunge: 0, thickerShield: 0 };
    const shopItems = [
      { name: "Start Length +1", key: "extraStartLength" as keyof WyrmUpgrades },
      { name: "Fire Duration +2s", key: "longerFire" as keyof WyrmUpgrades },
      { name: "Lunge Cooldown -1s", key: "fasterLunge" as keyof WyrmUpgrades },
      { name: "Shield x2 Hits", key: "thickerShield" as keyof WyrmUpgrades },
    ];

    // Shop background
    ug.roundRect(cx - 195, shopY - 5, 390, shopItems.length * 20 + 25, 4).fill({ color: 0x111122, alpha: 0.6 });
    ug.roundRect(cx - 195, shopY - 5, 390, 18, 4).fill({ color: 0x222244, alpha: 0.5 });

    for (let i = 0; i < shopItems.length; i++) {
      const item = shopItems[i];
      const costTable = B.UPGRADE_COSTS as Record<string, number[]>;
      const costs = costTable[item.key] || [];
      const level = upgrades[item.key];
      const maxed = level >= costs.length;
      const cost = maxed ? 0 : costs[level];
      const canBuy = !maxed && meta.dragonCoins >= cost;
      const iy = shopY + 20 + i * 20;

      // Level pips
      for (let l = 0; l < costs.length; l++) {
        ug.circle(cx + 120 + l * 14, iy + 2, 4).fill({ color: l < level ? 0x44ff44 : 0x333344, alpha: 0.8 });
      }

      // Text label via shop text pool
      const st = this._shopTexts[i];
      if (st) {
        st.visible = true;
        if (maxed) {
          st.text = `[${i + 1}] ${item.name}  -  MAX`;
          st.style.fill = 0x44ff44;
        } else {
          st.text = `[${i + 1}] ${item.name}  -  ${cost} coins`;
          st.style.fill = canBuy ? 0xeebb33 : 0x666666;
        }
        st.position.set(cx - 185, iy - 6);
      }
    }

    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(cx, cy + 140);
    this._deathPrompt.text = `Coins: ${meta.dragonCoins}  |  SPACE retry  |  1-4 upgrade  |  ESC exit`;
    this._deathPrompt.alpha = 0.6 + Math.sin(state.time * 3) * 0.4;
  }
}
