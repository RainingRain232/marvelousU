// ---------------------------------------------------------------------------
// Grail Derby -- PixiJS Renderer
// Draws medieval horse racing: scrolling landscape, track, horses, obstacles,
// pickups, HUD, menu/crash overlays, and particle effects.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { DerbyState } from "../types";
import { loadDerbyMeta } from "../state/DerbyState";
import { DerbyPhase, ObstacleType, PickupType } from "../types";
import { DERBY_BALANCE as B } from "../config/DerbyBalance";

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const SCORE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 3 },
});

const DIST_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: "#ffdd57",
  stroke: { color: "#000000", width: 3 },
});

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 40,
  fill: "#ffd700",
  stroke: { color: "#000000", width: 5 },
  align: "center",
  fontWeight: "bold",
});

const SUBTITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 2 },
  align: "center",
});

const CRASH_TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 36,
  fill: "#ff4444",
  stroke: { color: "#000000", width: 4 },
  align: "center",
});

const CRASH_BODY_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 2 },
  align: "center",
});

const PROMPT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: "#aaaaaa",
  align: "center",
});

const STATUS_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 2 },
});

const PAUSE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 32,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 4 },
  align: "center",
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PLAYER_SCREEN_X = 160;
const LANE_DASH = 0xffffff;

/** Get zone colors based on player distance. */
function getZoneColors(distance: number): { skyTop: number; skyBot: number; ground: number; track: number; tree: number; hill: number; name: string } {
  const zoneIdx = Math.min(Math.floor(distance / B.ZONE_DISTANCE), B.ZONES.length - 1);
  const z = B.ZONES[zoneIdx];
  return { skyTop: z.skyTop, skyBot: z.skyBot, ground: z.ground, track: z.track, tree: z.treeColor, hill: z.hillColor, name: z.name };
}

// Horse colors
const PLAYER_HORSE_COLOR = 0x8b4513;
const PLAYER_KNIGHT_COLOR = 0xc0c0c0;

// ---------------------------------------------------------------------------
// DerbyRenderer
// ---------------------------------------------------------------------------

export class DerbyRenderer {
  readonly container = new Container();
  shopItems: Array<{ name: string; cost: number; max: number; current: number; desc: string }> = [];
  shopCoins = 0;

  private _bgLayer = new Container();
  private _trackLayer = new Container();
  private _entityLayer = new Container();
  private _fxLayer = new Container();
  private _uiLayer = new Container();

  // Background elements
  private _skyGfx = new Graphics();
  private _hillsGfx = new Graphics();
  private _treesGfx = new Graphics();
  private _groundGfx = new Graphics();
  private _cloudsGfx = new Graphics();

  // Track
  private _trackGfx = new Graphics();

  // Entities
  private _playerGfx = new Graphics();
  private _aiGfx = new Graphics();
  private _obstacleGfx = new Graphics();
  private _pickupGfx = new Graphics();

  // HUD
  private _hpContainer = new Container();
  private _scoreText!: Text;
  private _distText!: Text;
  private _staminaGfx = new Graphics();
  private _speedText!: Text;
  private _statusContainer = new Container();

  // Overlays
  private _menuOverlay = new Container();
  private _menuBuilt = false;
  private _crashOverlay = new Container();
  private _crashBuilt = false;
  private _pauseOverlay = new Container();
  private _pauseBuilt = false;

  // Crash overlay texts (for dynamic update)
  private _crashScoreText!: Text;
  private _crashDistText!: Text;
  private _crashCoinsText!: Text;

  // Menu overlay texts
  private _menuBestScoreText!: Text;
  private _menuBestDistText!: Text;

  // FX
  private _fxGfx = new Graphics();

  // Screen dims
  private _sw = 800;
  private _sh = 600;

  // Animation time
  private _time = 0;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  build(screenW: number, screenH: number): void {
    this._sw = screenW;
    this._sh = screenH;

    this.container.removeChildren();

    this._bgLayer = new Container();
    this._trackLayer = new Container();
    this._entityLayer = new Container();
    this._fxLayer = new Container();
    this._uiLayer = new Container();

    this.container.addChild(this._bgLayer);
    this.container.addChild(this._trackLayer);
    this.container.addChild(this._entityLayer);
    this.container.addChild(this._fxLayer);
    this.container.addChild(this._uiLayer);

    // Background graphics
    this._skyGfx = new Graphics();
    this._hillsGfx = new Graphics();
    this._treesGfx = new Graphics();
    this._cloudsGfx = new Graphics();
    this._groundGfx = new Graphics();
    this._bgLayer.addChild(this._skyGfx);
    this._bgLayer.addChild(this._hillsGfx);
    this._bgLayer.addChild(this._treesGfx);
    this._bgLayer.addChild(this._cloudsGfx);
    this._bgLayer.addChild(this._groundGfx);

    // Track
    this._trackGfx = new Graphics();
    this._trackLayer.addChild(this._trackGfx);

    // Entities
    this._obstacleGfx = new Graphics();
    this._pickupGfx = new Graphics();
    this._aiGfx = new Graphics();
    this._playerGfx = new Graphics();
    this._entityLayer.addChild(this._obstacleGfx);
    this._entityLayer.addChild(this._pickupGfx);
    this._entityLayer.addChild(this._aiGfx);
    this._entityLayer.addChild(this._playerGfx);

    // FX
    this._fxGfx = new Graphics();
    this._fxLayer.addChild(this._fxGfx);

    // --- HUD ---
    this._scoreText = new Text({ text: "Score: 0", style: SCORE_STYLE });
    this._scoreText.x = screenW - 10;
    this._scoreText.y = 10;
    this._scoreText.anchor.set(1, 0);
    this._uiLayer.addChild(this._scoreText);

    this._distText = new Text({ text: "0m", style: DIST_STYLE });
    this._distText.anchor.set(0.5, 0);
    this._distText.x = screenW / 2;
    this._distText.y = 10;
    this._uiLayer.addChild(this._distText);

    this._speedText = new Text({ text: "", style: STATUS_STYLE });
    this._speedText.x = 10;
    this._speedText.y = 50;
    this._uiLayer.addChild(this._speedText);

    this._hpContainer = new Container();
    this._hpContainer.x = 10;
    this._hpContainer.y = 10;
    this._uiLayer.addChild(this._hpContainer);

    this._staminaGfx = new Graphics();
    this._staminaGfx.y = screenH - 30;
    this._uiLayer.addChild(this._staminaGfx);

    this._statusContainer = new Container();
    this._statusContainer.x = screenW - 10;
    this._statusContainer.y = 36;
    this._uiLayer.addChild(this._statusContainer);

    // Overlays
    this._menuOverlay = new Container();
    this._menuOverlay.visible = false;
    this._menuBuilt = false;
    this._uiLayer.addChild(this._menuOverlay);

    this._crashOverlay = new Container();
    this._crashOverlay.visible = false;
    this._crashBuilt = false;
    this._uiLayer.addChild(this._crashOverlay);

    this._pauseOverlay = new Container();
    this._pauseOverlay.visible = false;
    this._pauseBuilt = false;
    this._uiLayer.addChild(this._pauseOverlay);
  }

  // ---------------------------------------------------------------------------
  // Render (called every frame)
  // ---------------------------------------------------------------------------

  render(state: DerbyState, sw?: number, sh?: number): void {
    if (sw !== undefined) this._sw = sw;
    if (sh !== undefined) this._sh = sh;
    this._time = state.time;

    this._renderBackground(state);
    this._renderTrack(state);
    this._renderObstacles(state);
    this._renderPickups(state);
    this._renderAIRiders(state);
    this._renderPlayer(state);
    this._renderFX(state);
    this._renderHUD(state);

    // Overlays
    this._menuOverlay.visible = state.phase === DerbyPhase.MENU;
    this._crashOverlay.visible = state.phase === DerbyPhase.CRASHED;
    this._pauseOverlay.visible = state.phase === DerbyPhase.PAUSED;

    if (state.phase === DerbyPhase.MENU) this._renderMenu(state);
    if (state.phase === DerbyPhase.CRASHED) this._renderCrash(state);
    if (state.phase === DerbyPhase.PAUSED) this._renderPause();
  }

  // ---------------------------------------------------------------------------
  // Background: Sky, hills, trees, clouds, ground (parallax scrolling)
  // ---------------------------------------------------------------------------

  private _renderBackground(state: DerbyState): void {
    const sw = this._sw;
    const sh = this._sh;
    const sx = state.scrollX;
    const zc = getZoneColors(state.player.distance);

    // Sky gradient
    this._skyGfx.clear();
    const skySteps = 8;
    for (let i = 0; i < skySteps; i++) {
      const t = i / skySteps;
      const r = ((zc.skyTop >> 16) & 0xff) + (((zc.skyBot >> 16) & 0xff) - ((zc.skyTop >> 16) & 0xff)) * t;
      const g = ((zc.skyTop >> 8) & 0xff) + (((zc.skyBot >> 8) & 0xff) - ((zc.skyTop >> 8) & 0xff)) * t;
      const b = (zc.skyTop & 0xff) + ((zc.skyBot & 0xff) - (zc.skyTop & 0xff)) * t;
      const color = (Math.floor(r) << 16) | (Math.floor(g) << 8) | Math.floor(b);
      const bandH = 240 / skySteps;
      this._skyGfx.rect(0, i * bandH, sw, bandH + 1).fill(color);
    }

    // Clouds (slow parallax, multi-puff)
    this._cloudsGfx.clear();
    const cloudOffset = (sx * 0.05) % sw;
    for (let i = 0; i < 6; i++) {
      const cx = ((i * 180 - cloudOffset) % (sw + 200)) - 100;
      const cy = 30 + (i % 3) * 35 + Math.sin(i * 1.5) * 15;
      const cw = 45 + i * 8;
      const ch = 13 + i * 3;
      // Shadow underneath
      this._cloudsGfx.ellipse(cx + 3, cy + 4, cw, ch - 2).fill({ color: 0x000000, alpha: 0.03 });
      // Main cloud body (3 overlapping puffs)
      this._cloudsGfx.ellipse(cx - cw * 0.3, cy, cw * 0.6, ch * 0.85).fill({ color: 0xffffff, alpha: 0.45 });
      this._cloudsGfx.ellipse(cx, cy - 3, cw * 0.7, ch).fill({ color: 0xffffff, alpha: 0.55 });
      this._cloudsGfx.ellipse(cx + cw * 0.35, cy - 1, cw * 0.55, ch * 0.8).fill({ color: 0xffffff, alpha: 0.4 });
      // Bright highlight on top
      this._cloudsGfx.ellipse(cx - 5, cy - ch * 0.5, cw * 0.3, ch * 0.35).fill({ color: 0xffffff, alpha: 0.2 });
    }

    // Distant hills (medium parallax)
    this._hillsGfx.clear();
    const hillOffset = (sx * 0.15) % sw;
    for (let i = 0; i < 8; i++) {
      const hx = ((i * 160 - hillOffset) % (sw + 300)) - 150;
      const hy = 220;
      const hw = 120 + (i % 3) * 40;
      const hh = 40 + (i % 2) * 25;
      // Hill shape
      this._hillsGfx.moveTo(hx - hw / 2, hy)
        .quadraticCurveTo(hx, hy - hh, hx + hw / 2, hy)
        .fill(zc.hill);

      // Castle silhouettes on some hills
      if (i % 4 === 0) {
        const castleX = hx;
        const castleY = hy - hh + 5;
        this._hillsGfx
          .rect(castleX - 8, castleY - 20, 16, 20).fill(0x555555)
          .rect(castleX - 12, castleY - 28, 6, 10).fill(0x555555)
          .rect(castleX + 6, castleY - 28, 6, 10).fill(0x555555)
          .rect(castleX - 3, castleY - 35, 6, 12).fill(0x555555);
      }
    }

    // Trees (closer parallax)
    this._treesGfx.clear();
    const treeOffset = (sx * 0.3) % sw;
    for (let i = 0; i < 12; i++) {
      const tx = ((i * 90 - treeOffset) % (sw + 200)) - 100;
      const ty = 260 + (i % 2) * 10;
      // Trunk
      this._treesGfx.rect(tx - 3, ty - 20, 6, 25).fill(0x5c3a1e);
      // Canopy
      this._treesGfx.circle(tx, ty - 28, 14 + (i % 3) * 4).fill(zc.tree);
      this._treesGfx.circle(tx - 8, ty - 22, 10).fill(zc.tree + 0x111111);
      this._treesGfx.circle(tx + 8, ty - 22, 10).fill(zc.tree);
    }

    // Ground
    this._groundGfx.clear();
    this._groundGfx.rect(0, B.GROUND_Y, sw, sh - B.GROUND_Y).fill(zc.ground);
    // Grass border above track
    this._groundGfx.rect(0, 280, sw, 30).fill(zc.ground + 0x060606);
    // Grass border below track
    this._groundGfx.rect(0, B.GROUND_Y - 10, sw, 15).fill(zc.ground + 0x060606);
  }

  // ---------------------------------------------------------------------------
  // Track: 3 lanes with dashed center lines
  // ---------------------------------------------------------------------------

  private _renderTrack(state: DerbyState): void {
    const sw = this._sw;
    const sx = state.scrollX;
    const g = this._trackGfx;
    g.clear();
    const zc = getZoneColors(state.player.distance);

    const trackTop = B.LANE_Y_START - B.LANE_SPACING / 2 - 10;
    const trackBottom = B.LANE_Y_START + (B.LANE_COUNT - 1) * B.LANE_SPACING + B.LANE_SPACING / 2 + 10;
    const trackH = trackBottom - trackTop;

    // Track surface
    g.rect(0, trackTop, sw, trackH).fill(zc.track);

    // Track borders
    g.rect(0, trackTop, sw, 3).fill(0x654321);
    g.rect(0, trackBottom - 3, sw, 3).fill(0x654321);

    // Lane dividers (dashed white lines)
    const dashLen = 30;
    const gapLen = 20;
    const dashOffset = sx % (dashLen + gapLen);

    for (let lane = 1; lane < B.LANE_COUNT; lane++) {
      const lineY = B.LANE_Y_START + lane * B.LANE_SPACING - B.LANE_SPACING / 2;
      let dx = -dashOffset;
      while (dx < sw) {
        const x1 = Math.max(0, dx);
        const x2 = Math.min(sw, dx + dashLen);
        if (x2 > x1) {
          g.rect(x1, lineY - 1, x2 - x1, 2).fill({ color: LANE_DASH, alpha: 0.6 });
        }
        dx += dashLen + gapLen;
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Player horse + knight
  // ---------------------------------------------------------------------------

  private _renderPlayer(state: DerbyState): void {
    const g = this._playerGfx;
    g.clear();

    const p = state.player;
    const px = PLAYER_SCREEN_X;
    const py = p.laneY;
    const t = this._time;

    // Invincible blink
    if (p.invincibleTimer > 0 && Math.floor(t * 10) % 2 === 0) return;

    // Speed trail when boosted
    if (p.boostTimer > 0) {
      for (let i = 1; i <= 4; i++) {
        const alpha = 0.3 - i * 0.06;
        g.ellipse(px - i * 15, py, 20, 12).fill({ color: 0xffaa00, alpha });
      }
    }

    this._drawHorse(g, px, py, PLAYER_HORSE_COLOR, t, 1.0);

    // Knight on top
    const knightY = py - B.HORSE_HEIGHT / 2 - 12;

    // Body armor
    g.rect(px - 6, knightY - 14, 12, 18).fill(PLAYER_KNIGHT_COLOR);
    // Helm
    g.rect(px - 5, knightY - 22, 10, 10).fill(0x888888);
    // Visor slit
    g.rect(px - 3, knightY - 18, 8, 2).fill(0x333333);
    // Plume
    g.moveTo(px + 5, knightY - 22)
      .lineTo(px + 5, knightY - 30)
      .lineTo(px - 2, knightY - 26)
      .fill(0xcc2222);

    // Lance (when active)
    if (p.lanceTimer > 0) {
      g.rect(px + 20, knightY - 10, 50, 3).fill(0x8b4513);
      // Lance tip
      g.moveTo(px + 70, knightY - 10)
        .lineTo(px + 80, knightY - 8.5)
        .lineTo(px + 70, knightY - 7)
        .fill(0xaaaaaa);
    }

    // Shield glow (when active)
    if (p.shieldTimer > 0) {
      const shieldAlpha = 0.3 + Math.sin(t * 6) * 0.15;
      g.circle(px, py - 10, 35).fill({ color: 0x4488ff, alpha: shieldAlpha });
      g.circle(px, py - 10, 35).stroke({ color: 0x6699ff, width: 2, alpha: 0.7 });
    }

    // Magnet indicator
    if (p.magnetTimer > 0) {
      const magnetAlpha = 0.15 + Math.sin(t * 4) * 0.1;
      g.circle(px, py, B.MAGNET_RANGE).stroke({ color: 0xffff00, width: 1, alpha: magnetAlpha });
    }
  }

  // ---------------------------------------------------------------------------
  // Draw a horse (shared between player and AI)
  // ---------------------------------------------------------------------------

  private _drawHorse(
    g: Graphics,
    x: number,
    y: number,
    color: number,
    time: number,
    scale: number,
  ): void {
    const hw = B.HORSE_WIDTH * scale / 2;
    const hh = B.HORSE_HEIGHT * scale / 2;

    // Body (rounded rectangle approximation via ellipse)
    g.ellipse(x, y, hw, hh).fill(color);

    // Head
    const headX = x + hw + 8 * scale;
    const headY = y - hh * 0.6;
    g.ellipse(headX, headY, 10 * scale, 7 * scale).fill(color);
    // Eye
    g.circle(headX + 5 * scale, headY - 2 * scale, 2 * scale).fill(0x000000);
    // Ear
    g.ellipse(headX + 2 * scale, headY - 8 * scale, 3 * scale, 5 * scale).fill(color);

    // Legs (animated gallop cycle)
    const legPhase = time * 12;
    const legLen = 18 * scale;
    const legW = 4 * scale;
    const legBaseY = y + hh - 2;

    // Front legs
    const fl1Angle = Math.sin(legPhase) * 0.6;
    const fl2Angle = Math.sin(legPhase + Math.PI) * 0.6;
    this._drawLeg(g, x + hw * 0.5, legBaseY, fl1Angle, legLen, legW, color);
    this._drawLeg(g, x + hw * 0.3, legBaseY, fl2Angle, legLen, legW, color);

    // Hind legs
    const hl1Angle = Math.sin(legPhase + Math.PI * 0.5) * 0.6;
    const hl2Angle = Math.sin(legPhase + Math.PI * 1.5) * 0.6;
    this._drawLeg(g, x - hw * 0.3, legBaseY, hl1Angle, legLen, legW, color);
    this._drawLeg(g, x - hw * 0.5, legBaseY, hl2Angle, legLen, legW, color);

    // Tail
    const tailX = x - hw - 5 * scale;
    const tailWave = Math.sin(time * 5) * 8;
    g.moveTo(tailX, y - 5)
      .quadraticCurveTo(tailX - 15 * scale + tailWave, y - 15 * scale, tailX - 10 * scale, y + 5)
      .stroke({ color, width: 3 * scale });

    // Mane
    for (let i = 0; i < 4; i++) {
      const mx = x + hw * 0.2 - i * 6 * scale;
      const my = y - hh - 2;
      const maneWave = Math.sin(time * 6 + i) * 3;
      g.moveTo(mx, my)
        .lineTo(mx + maneWave, my - 10 * scale)
        .stroke({ color: darkenColor(color, 0.7), width: 2 * scale });
    }
  }

  private _drawLeg(
    g: Graphics,
    x: number,
    y: number,
    angle: number,
    length: number,
    width: number,
    color: number,
  ): void {
    const ex = x + Math.sin(angle) * length;
    const ey = y + Math.cos(angle) * length;
    g.moveTo(x, y).lineTo(ex, ey).stroke({ color, width });
    // Hoof
    g.circle(ex, ey + 1, width * 0.6).fill(0x333333);
  }

  // ---------------------------------------------------------------------------
  // AI riders
  // ---------------------------------------------------------------------------

  private _renderAIRiders(state: DerbyState): void {
    const g = this._aiGfx;
    g.clear();

    for (const rider of state.aiRiders) {
      if (!rider.alive) continue;

      const screenX = PLAYER_SCREEN_X + rider.x;
      // Off-screen? Skip
      if (screenX < -80 || screenX > this._sw + 80) continue;

      const ry = B.LANE_Y_START + rider.lane * B.LANE_SPACING;
      this._drawHorse(g, screenX, ry, rider.color, this._time, 0.85);

      // Simple rider on top
      const riderY = ry - B.HORSE_HEIGHT * 0.85 / 2 - 8;
      g.rect(screenX - 4, riderY - 10, 8, 14).fill(rider.color);
      g.circle(screenX, riderY - 14, 5).fill(darkenColor(rider.color, 0.8));
    }
  }

  // ---------------------------------------------------------------------------
  // Obstacles
  // ---------------------------------------------------------------------------

  private _renderObstacles(state: DerbyState): void {
    const g = this._obstacleGfx;
    g.clear();

    for (const obs of state.obstacles) {
      if (!obs.active) continue;
      const screenX = obs.x - state.scrollX;
      if (screenX < -80 || screenX > this._sw + 80) continue;

      const oy = B.LANE_Y_START + obs.lane * B.LANE_SPACING;

      switch (obs.type) {
        case ObstacleType.FENCE:
          this._drawFence(g, screenX, oy);
          break;
        case ObstacleType.ROCK:
          this._drawRock(g, screenX, oy);
          break;
        case ObstacleType.MUD:
          this._drawMud(g, screenX, oy);
          break;
        case ObstacleType.BARREL:
          this._drawBarrel(g, screenX, oy);
          break;
        case ObstacleType.KNIGHT:
          this._drawEnemyKnight(g, screenX, oy);
          break;
        case ObstacleType.CART:
          this._drawCart(g, screenX, oy);
          break;
      }
    }
  }

  private _drawFence(g: Graphics, x: number, y: number): void {
    // Shadow beneath
    g.ellipse(x, y + 10, 16, 4).fill({ color: 0x000000, alpha: 0.15 });
    // Vertical posts (tapered, with grain detail)
    for (const px of [x - 12, x + 8]) {
      g.rect(px, y - 26, 5, 36).fill(0x7a4e2c);
      // Wood highlight (left edge)
      g.rect(px, y - 26, 1.5, 36).fill({ color: 0xa07040, alpha: 0.4 });
      // Wood shadow (right edge)
      g.rect(px + 3.5, y - 26, 1.5, 36).fill({ color: 0x5a3a1a, alpha: 0.3 });
      // Pointed top
      g.moveTo(px, y - 26).lineTo(px + 2.5, y - 30).lineTo(px + 5, y - 26).fill(0x7a4e2c);
      // Grain lines
      g.moveTo(px + 1, y - 22).lineTo(px + 2, y + 6).stroke({ color: 0x6a3e1c, width: 0.5, alpha: 0.3 });
      // Nail/peg at rail intersections
      g.circle(px + 2.5, y - 16, 1.5).fill({ color: 0x555555, alpha: 0.5 });
      g.circle(px + 2.5, y - 6, 1.5).fill({ color: 0x555555, alpha: 0.5 });
    }
    // Horizontal rails (with slight bevel)
    for (const ry of [y - 18, y - 6]) {
      g.rect(x - 15, ry, 30, 5).fill(0x9a6840);
      // Top highlight
      g.rect(x - 15, ry, 30, 1.5).fill({ color: 0xb08050, alpha: 0.35 });
      // Bottom shadow
      g.rect(x - 15, ry + 3.5, 30, 1.5).fill({ color: 0x6a4020, alpha: 0.3 });
    }
  }

  private _drawRock(g: Graphics, x: number, y: number): void {
    // Ground shadow
    g.ellipse(x, y + 10, 16, 5).fill({ color: 0x000000, alpha: 0.2 });
    // Main rock body (irregular polygon)
    g.moveTo(x - 14, y + 8)
      .lineTo(x - 16, y - 4)
      .lineTo(x - 10, y - 12)
      .lineTo(x - 4, y - 15)
      .lineTo(x + 6, y - 13)
      .lineTo(x + 12, y - 6)
      .lineTo(x + 15, y + 2)
      .lineTo(x + 10, y + 10)
      .closePath()
      .fill(0x666677);
    // Rock border
    g.moveTo(x - 14, y + 8)
      .lineTo(x - 16, y - 4)
      .lineTo(x - 10, y - 12)
      .lineTo(x - 4, y - 15)
      .lineTo(x + 6, y - 13)
      .lineTo(x + 12, y - 6)
      .lineTo(x + 15, y + 2)
      .lineTo(x + 10, y + 10)
      .closePath()
      .stroke({ color: 0x555566, width: 1 });
    // Top-face highlight (lighter upper surface)
    g.moveTo(x - 10, y - 12)
      .lineTo(x - 4, y - 15)
      .lineTo(x + 6, y - 13)
      .lineTo(x + 2, y - 6)
      .lineTo(x - 6, y - 5)
      .closePath()
      .fill({ color: 0x8888aa, alpha: 0.45 });
    // Shadow face (darker right side)
    g.moveTo(x + 6, y - 13)
      .lineTo(x + 12, y - 6)
      .lineTo(x + 15, y + 2)
      .lineTo(x + 10, y + 10)
      .lineTo(x + 4, y + 2)
      .closePath()
      .fill({ color: 0x444455, alpha: 0.3 });
    // Crack lines
    g.moveTo(x - 6, y - 10).lineTo(x - 2, y + 2).stroke({ color: 0x555566, width: 0.8, alpha: 0.4 });
    g.moveTo(x + 3, y - 8).lineTo(x + 6, y + 4).stroke({ color: 0x555566, width: 0.6, alpha: 0.3 });
    // Moss spots
    g.circle(x - 8, y + 4, 3).fill({ color: 0x4a6a3a, alpha: 0.25 });
    g.circle(x + 2, y + 6, 2).fill({ color: 0x4a6a3a, alpha: 0.2 });
  }

  private _drawMud(g: Graphics, x: number, y: number): void {
    // Shadow beneath puddle
    g.ellipse(x, y + 8, 32, 10).fill({ color: 0x2a1a0a, alpha: 0.25 });
    // Outer puddle (darker rim)
    g.ellipse(x, y + 5, 30, 11).fill(0x4a3020);
    // Main puddle body
    g.ellipse(x, y + 4, 26, 9).fill(0x5c4033);
    // Lighter inner (wet surface)
    g.ellipse(x - 2, y + 2, 18, 6).fill({ color: 0x6b4f3a, alpha: 0.8 });
    // Specular reflection (light hitting wet surface)
    g.ellipse(x - 6, y, 8, 3).fill({ color: 0x8a7a6a, alpha: 0.3 });
    g.ellipse(x + 4, y - 1, 5, 2).fill({ color: 0x9a8a7a, alpha: 0.2 });
    // Mud bubbles (3 with varied sizes)
    g.circle(x - 10, y + 2, 3).fill({ color: 0x7a5c45, alpha: 0.6 });
    g.circle(x - 10, y + 2, 3).stroke({ color: 0x8a6c55, width: 0.6, alpha: 0.4 });
    g.circle(x + 8, y + 4, 2.5).fill({ color: 0x7a5c45, alpha: 0.5 });
    g.circle(x + 8, y + 4, 2.5).stroke({ color: 0x8a6c55, width: 0.5, alpha: 0.3 });
    g.circle(x + 2, y + 1, 2).fill({ color: 0x7a5c45, alpha: 0.4 });
    // Ripple rings
    g.ellipse(x - 4, y + 3, 6, 2).stroke({ color: 0x8a7a6a, width: 0.6, alpha: 0.2 });
    g.ellipse(x + 6, y + 5, 5, 1.5).stroke({ color: 0x8a7a6a, width: 0.5, alpha: 0.15 });
    // Splash marks at edges
    g.circle(x - 18, y + 6, 1.5).fill({ color: 0x5c4033, alpha: 0.3 });
    g.circle(x + 20, y + 7, 1).fill({ color: 0x5c4033, alpha: 0.25 });
  }

  private _drawBarrel(g: Graphics, x: number, y: number): void {
    // Brown circle/cylinder
    g.ellipse(x, y, 12, 16).fill(0x8b5a2b);
    // Metal bands
    g.ellipse(x, y - 8, 12, 3).stroke({ color: 0x666666, width: 2 });
    g.ellipse(x, y + 8, 12, 3).stroke({ color: 0x666666, width: 2 });
    // Highlight
    g.ellipse(x - 4, y - 2, 3, 10).fill({ color: 0xa07040, alpha: 0.5 });
  }

  private _drawEnemyKnight(g: Graphics, x: number, y: number): void {
    // Red enemy rider with lance
    const horseColor = 0x4a3728;
    // Small horse body
    g.ellipse(x, y, 22, 14).fill(horseColor);
    // Head
    g.ellipse(x + 20, y - 8, 7, 5).fill(horseColor);
    // Legs
    const legPhase = this._time * 10;
    for (let i = 0; i < 4; i++) {
      const lx = x - 10 + i * 7;
      const angle = Math.sin(legPhase + i * Math.PI / 2) * 0.5;
      const ey = y + 14 + Math.cos(angle) * 12;
      g.moveTo(lx, y + 12).lineTo(lx + Math.sin(angle) * 12, ey)
        .stroke({ color: horseColor, width: 3 });
    }
    // Rider
    g.rect(x - 4, y - 22, 8, 14).fill(0xcc2222);
    g.circle(x, y - 26, 5).fill(0xaa1111);
    // Enemy lance
    g.rect(x - 30, y - 18, 40, 3).fill(0x8b4513);
    g.moveTo(x - 30, y - 18)
      .lineTo(x - 38, y - 16.5)
      .lineTo(x - 30, y - 15)
      .fill(0xaaaaaa);
  }

  private _drawCart(g: Graphics, x: number, y: number): void {
    // Wide wooden cart
    g.rect(x - 35, y - 15, 70, 25).fill(0x8b6914);
    // Wheels
    g.circle(x - 25, y + 12, 8).fill(0x5c4033);
    g.circle(x - 25, y + 12, 3).fill(0x8b6914);
    g.circle(x + 25, y + 12, 8).fill(0x5c4033);
    g.circle(x + 25, y + 12, 3).fill(0x8b6914);
    // Planks
    g.rect(x - 33, y - 12, 66, 3).fill(0xa07b28);
    g.rect(x - 33, y - 2, 66, 3).fill(0xa07b28);
    // Side rail
    g.rect(x - 35, y - 20, 3, 12).fill(0x6b5010);
    g.rect(x + 32, y - 20, 3, 12).fill(0x6b5010);
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------

  private _renderPickups(state: DerbyState): void {
    const g = this._pickupGfx;
    g.clear();
    const t = this._time;

    for (const pk of state.pickups) {
      if (pk.collected) continue;
      const screenX = pk.x - state.scrollX;
      if (screenX < -40 || screenX > this._sw + 40) continue;

      const py = B.LANE_Y_START + pk.lane * B.LANE_SPACING;
      const bob = Math.sin(t * 4 + pk.x * 0.01) * 3;

      switch (pk.type) {
        case PickupType.COIN:
          this._drawCoin(g, screenX, py + bob);
          break;
        case PickupType.SPEED_BOOST:
          this._drawOrb(g, screenX, py + bob, 0xff6600, "B");
          break;
        case PickupType.SHIELD:
          this._drawOrb(g, screenX, py + bob, 0x4488ff, "S");
          break;
        case PickupType.LANCE:
          this._drawOrb(g, screenX, py + bob, 0xcc4444, "L");
          break;
        case PickupType.MAGNET:
          this._drawOrb(g, screenX, py + bob, 0xffff00, "M");
          break;
      }
    }
  }

  private _drawCoin(g: Graphics, x: number, y: number): void {
    // Golden circle with shine
    g.circle(x, y, 8).fill(0xffd700);
    g.circle(x, y, 8).stroke({ color: 0xdaa520, width: 1.5 });
    // Inner detail
    g.circle(x, y, 5).stroke({ color: 0xeec900, width: 1 });
    // Shine
    g.circle(x - 2, y - 2, 2).fill({ color: 0xffffff, alpha: 0.7 });
  }

  private _drawOrb(g: Graphics, x: number, y: number, color: number, _letter: string): void {
    // Colored orb with glow
    const glowAlpha = 0.2 + Math.sin(this._time * 5) * 0.1;
    g.circle(x, y, 14).fill({ color, alpha: glowAlpha });
    g.circle(x, y, 10).fill(color);
    g.circle(x, y, 10).stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
    // Shine
    g.circle(x - 3, y - 3, 3).fill({ color: 0xffffff, alpha: 0.5 });
  }

  // ---------------------------------------------------------------------------
  // FX: particles managed via gsap
  // ---------------------------------------------------------------------------

  private _renderFX(_state: DerbyState): void {
    // FX graphics are cleared each frame; gsap-animated particles manage themselves
    this._fxGfx.clear();
  }

  // --- Public FX spawn methods (called from DerbyGame) ---

  spawnCoinCollect(x: number, y: number): void {
    // Sparkle particles
    for (let i = 0; i < 6; i++) {
      const spark = new Graphics();
      spark.circle(0, 0, 2 + Math.random() * 2).fill(0xffd700);
      spark.x = x;
      spark.y = y;
      this._fxLayer.addChild(spark);
      gsap.to(spark, {
        x: x + (Math.random() - 0.5) * 40,
        y: y + (Math.random() - 0.5) * 40,
        alpha: 0,
        duration: 0.4 + Math.random() * 0.2,
        onComplete: () => { this._fxLayer.removeChild(spark); spark.destroy(); },
      });
    }
  }

  spawnCrashExplosion(x: number, y: number): void {
    for (let i = 0; i < 12; i++) {
      const p = new Graphics();
      const size = 3 + Math.random() * 5;
      const color = Math.random() < 0.5 ? 0xff4400 : 0xffaa00;
      p.circle(0, 0, size).fill(color);
      p.x = x;
      p.y = y;
      this._fxLayer.addChild(p);
      gsap.to(p, {
        x: x + (Math.random() - 0.5) * 80,
        y: y + (Math.random() - 0.5) * 80,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.3,
        onComplete: () => { this._fxLayer.removeChild(p); p.destroy(); },
      });
    }
  }

  spawnBoostFlash(): void {
    const flash = new Graphics();
    flash.rect(0, 0, this._sw, this._sh).fill({ color: 0xffaa00, alpha: 0.3 });
    this._fxLayer.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      duration: 0.3,
      onComplete: () => { this._fxLayer.removeChild(flash); flash.destroy(); },
    });
  }

  spawnJoustSparks(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const spark = new Graphics();
      spark.circle(0, 0, 2).fill(0xffff88);
      spark.x = x;
      spark.y = y;
      this._fxLayer.addChild(spark);
      const angle = Math.random() * Math.PI * 2;
      const dist = 20 + Math.random() * 30;
      gsap.to(spark, {
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        alpha: 0,
        duration: 0.3 + Math.random() * 0.2,
        onComplete: () => { this._fxLayer.removeChild(spark); spark.destroy(); },
      });
    }
  }

  spawnHorseTumble(x: number, y: number): void {
    // Animated tumbling horse silhouette
    const tumble = new Graphics();
    // Horse body
    tumble.ellipse(0, 0, 25, 12).fill({ color: 0x8b6914, alpha: 0.8 });
    // Knight on top
    tumble.roundRect(-8, -18, 16, 14, 3).fill({ color: 0x667788, alpha: 0.7 });
    // Legs (stiff, sticking out)
    tumble.rect(-20, 8, 6, 12).fill({ color: 0x7a5a14, alpha: 0.7 });
    tumble.rect(14, 8, 6, 12).fill({ color: 0x7a5a14, alpha: 0.7 });
    tumble.rect(-12, 10, 6, 10).fill({ color: 0x7a5a14, alpha: 0.6 });
    tumble.rect(6, 10, 6, 10).fill({ color: 0x7a5a14, alpha: 0.6 });
    tumble.position.set(x, y);
    this._fxLayer.addChild(tumble);

    // Tumble: rotate + fly upward + sideways + fade
    gsap.to(tumble, {
      x: x + 60,
      y: y - 40,
      rotation: Math.PI * 2.5,
      duration: 0.8,
      ease: "power2.out",
    });
    gsap.to(tumble, {
      y: y + 30,
      duration: 0.4,
      delay: 0.8,
      ease: "power2.in",
    });
    gsap.to(tumble, {
      alpha: 0,
      duration: 0.3,
      delay: 1.0,
      onComplete: () => { this._fxLayer.removeChild(tumble); },
    });

    // Debris (helmet, shield pieces)
    const debrisColors = [0x667788, 0x8b6914, 0xaa8844, 0x554433];
    for (let i = 0; i < 6; i++) {
      const d = new Graphics();
      d.rect(-2, -2, 4 + Math.random() * 4, 3 + Math.random() * 3).fill(debrisColors[i % debrisColors.length]);
      d.position.set(x, y);
      this._fxLayer.addChild(d);
      const angle = -Math.PI * 0.3 + Math.random() * Math.PI * 0.6; // upward arc
      const speed = 30 + Math.random() * 50;
      gsap.to(d, {
        x: x + Math.cos(angle) * speed,
        y: y + Math.sin(angle) * speed + 30, // gravity
        rotation: Math.random() * 6,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.3,
        onComplete: () => { this._fxLayer.removeChild(d); },
      });
    }
  }

  spawnShieldBreak(x: number, y: number): void {
    // Expanding cyan ring (shield shattering)
    const ring = new Graphics();
    ring.circle(0, 0, 20).stroke({ color: 0x44ddff, width: 2.5, alpha: 0.8 });
    ring.position.set(x, y);
    this._fxLayer.addChild(ring);
    gsap.to(ring.scale, { x: 3, y: 3, duration: 0.4, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.4, onComplete: () => { this._fxLayer.removeChild(ring); } });

    // Shard fragments (blue glass pieces flying outward)
    for (let i = 0; i < 8; i++) {
      const shard = new Graphics();
      shard.moveTo(0, -3).lineTo(2, 0).lineTo(0, 4).lineTo(-2, 0).closePath();
      shard.fill({ color: [0x44ddff, 0x66eeff, 0x88ffff, 0xaaffff][i % 4], alpha: 0.7 });
      shard.position.set(x, y);
      this._fxLayer.addChild(shard);
      const angle = (i / 8) * Math.PI * 2;
      gsap.to(shard, {
        x: x + Math.cos(angle) * (25 + Math.random() * 20),
        y: y + Math.sin(angle) * (25 + Math.random() * 20),
        rotation: Math.random() * 4,
        alpha: 0,
        duration: 0.4 + Math.random() * 0.2,
        onComplete: () => { this._fxLayer.removeChild(shard); },
      });
    }

    // "SHIELD!" text
    const txt = new Text({
      text: "SHIELD!",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0x44ddff, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(x, y - 25);
    this._fxLayer.addChild(txt);
    gsap.to(txt, { y: y - 45, alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  spawnMudSplash(x: number, y: number): void {
    // Brown screen tint flash
    const tint = new Graphics();
    tint.rect(0, 0, this._sw, this._sh).fill({ color: 0x5c4033, alpha: 0.15 });
    this._fxLayer.addChild(tint);
    gsap.to(tint, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(tint); } });

    // Mud splatter particles
    for (let i = 0; i < 6; i++) {
      const splat = new Graphics();
      splat.circle(0, 0, 2 + Math.random() * 3).fill({ color: [0x5c4033, 0x7a5c45, 0x6b4f3a][i % 3], alpha: 0.6 });
      splat.position.set(x + (Math.random() - 0.5) * 30, y);
      this._fxLayer.addChild(splat);
      gsap.to(splat, {
        x: splat.x + (Math.random() - 0.5) * 40,
        y: y - 10 - Math.random() * 20,
        alpha: 0,
        duration: 0.35 + Math.random() * 0.2,
        onComplete: () => { this._fxLayer.removeChild(splat); },
      });
    }

    // "SLOW!" text
    const txt = new Text({
      text: "SLOW!",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaa8866, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(x, y - 20);
    this._fxLayer.addChild(txt);
    gsap.to(txt, { y: y - 40, alpha: 0, duration: 0.4, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  spawnComboText(x: number, y: number, text: string): void {
    const txt = new Text({
      text,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(x, y);
    txt.scale.set(0.5);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.1, y: 1.1, duration: 0.1, ease: "back.out(2)" });
    gsap.to(txt, { y: y - 20, alpha: 0, duration: 0.5, delay: 0.1, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  spawnMilestone(km: number): void {
    const cx = this._sw / 2;
    const cy = this._sh * 0.3;
    // Flash
    const flash = new Graphics();
    flash.rect(0, 0, this._sw, this._sh).fill({ color: 0xffd700, alpha: 0.12 });
    this._fxLayer.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(flash); } });
    // Text
    const txt = new Text({
      text: `${km},000m!`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 26, fill: 0xffd700, fontWeight: "bold",
        dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(cx, cy);
    txt.scale.set(0.4);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.3, y: 1.3, duration: 0.2, ease: "back.out(3)" });
    gsap.to(txt, { y: cy - 30, alpha: 0, duration: 1.2, delay: 0.4, onComplete: () => { this._fxLayer.removeChild(txt); } });
    // Screen shake
    const orig = { x: this.container.x, y: this.container.y };
    gsap.to(this.container, { x: orig.x + 4, duration: 0.04, yoyo: true, repeat: 4, ease: "none",
      onComplete: () => { this.container.x = orig.x; this.container.y = orig.y; } });
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _renderHUD(state: DerbyState): void {
    const p = state.player;
    const sw = this._sw;

    // Score
    this._scoreText.text = `Score: ${p.score}`;
    this._scoreText.x = sw - 10;

    // Distance + new best indicator
    const currentDist = Math.floor(p.distance / 10);
    const pastBest = state.bestDistance > 0 && currentDist > Math.floor(state.bestDistance / 10);
    const zoneInfo = getZoneColors(p.distance);
    const zoneLabel = pastBest ? `${currentDist}m ★ NEW BEST` : `${currentDist}m — ${zoneInfo.name}`;
    this._distText.text = zoneLabel;
    this._distText.style.fill = pastBest ? 0xffd700 : 0xffffff;
    this._distText.x = sw / 2;

    // Speed indicator
    this._speedText.text = `${Math.floor(p.speed)} px/s`;

    // HP hearts
    this._hpContainer.removeChildren();
    for (let i = 0; i < p.maxHp; i++) {
      const heart = new Graphics();
      const hColor = i < p.hp ? 0xff2222 : 0x444444;
      // Heart shape (two circles + triangle)
      heart.circle(-4, -4, 5).fill(hColor);
      heart.circle(4, -4, 5).fill(hColor);
      heart.moveTo(-9, -3).lineTo(0, 8).lineTo(9, -3).fill(hColor);
      heart.x = i * 26 + 12;
      heart.y = 14;
      this._hpContainer.addChild(heart);
    }

    // Stamina bar
    const stamG = this._staminaGfx;
    stamG.clear();
    const barW = 200;
    const barH = 12;
    const barX = (sw - barW) / 2;
    const barY = this._sh - 30;
    stamG.y = 0;
    // Background
    stamG.rect(barX, barY, barW, barH).fill(0x333333);
    // Fill
    const stamRatio = p.stamina / p.maxStamina;
    const stamColor = p.sprinting ? 0xff8800 : 0x44cc44;
    stamG.rect(barX, barY, barW * stamRatio, barH).fill(stamColor);
    // Border
    stamG.rect(barX, barY, barW, barH).stroke({ color: 0x888888, width: 1 });
    // Label
    const stamLabel = new Text({
      text: `Stamina ${Math.floor(p.stamina)}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: "#ffffff" }),
    });
    stamLabel.anchor.set(0.5, 0.5);
    stamLabel.x = barX + barW / 2;
    stamLabel.y = barY + barH / 2;
    // We append the label text directly; since stamina bar is redrawn, we just
    // let the text be part of the staminaGfx container (it's a Graphics).
    // Actually, Text can't be child of Graphics easily. We'll skip inline text
    // and just draw the bar.

    // Status icons (top-right area, below score)
    this._statusContainer.removeChildren();
    let statusY = 0;
    if (p.shieldTimer > 0) {
      const t = new Text({ text: `Shield ${p.shieldTimer.toFixed(1)}s`, style: STATUS_STYLE });
      t.anchor.set(1, 0);
      t.y = statusY;
      this._statusContainer.addChild(t);
      statusY += 16;
    }
    if (p.boostTimer > 0) {
      const t = new Text({ text: `Boost ${p.boostTimer.toFixed(1)}s`, style: STATUS_STYLE });
      t.anchor.set(1, 0);
      t.y = statusY;
      this._statusContainer.addChild(t);
      statusY += 16;
    }
    if (p.lanceTimer > 0) {
      const t = new Text({ text: `Lance ${p.lanceTimer.toFixed(1)}s`, style: STATUS_STYLE });
      t.anchor.set(1, 0);
      t.y = statusY;
      this._statusContainer.addChild(t);
      statusY += 16;
    }
    if (p.magnetTimer > 0) {
      const t = new Text({ text: `Magnet ${p.magnetTimer.toFixed(1)}s`, style: STATUS_STYLE });
      t.anchor.set(1, 0);
      t.y = statusY;
      this._statusContainer.addChild(t);
      statusY += 16;
    }

    // ── Position radar (top-left, below HP) ──
    const radarX = 10;
    const radarY = 40;
    const radarW = 120;
    const radarH = 10;
    const radarG = new Graphics();
    radarG.roundRect(radarX, radarY, radarW, radarH, 3).fill({ color: 0x000000, alpha: 0.4 });
    radarG.roundRect(radarX, radarY, radarW, radarH, 3).stroke({ color: 0x555555, width: 0.8 });
    // Player position (always centered)
    const playerDot = radarX + radarW / 2;
    radarG.circle(playerDot, radarY + radarH / 2, 3).fill(0xffd700);
    // AI rider positions (relative to player)
    for (const ai of state.aiRiders) {
      if (!ai.alive) continue;
      const relX = (ai.x / 400); // scale relative offset
      const dotX = Math.max(radarX + 4, Math.min(radarX + radarW - 4, playerDot + relX * 30));
      radarG.circle(dotX, radarY + radarH / 2, 2.5).fill(ai.color);
    }
    this._uiLayer.addChild(radarG);

    // Coin streak display
    if (p.coinStreak > 2) {
      const mult = Math.min(1 + p.coinStreak * 0.25, 5).toFixed(1);
      const streakTxt = new Text({
        text: `${mult}x`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold" }),
      });
      streakTxt.position.set(radarX, radarY + 16);
      this._uiLayer.addChild(streakTxt);
    }
  }

  // ---------------------------------------------------------------------------
  // Menu overlay
  // ---------------------------------------------------------------------------

  private _renderMenu(state: DerbyState): void {
    if (!this._menuBuilt) {
      this._buildMenu(state);
      this._menuBuilt = true;
    }
    // Update dynamic text
    this._menuBestScoreText.text = `Best Score: ${state.highScore}`;
    this._menuBestDistText.text = `Best Distance: ${Math.floor(state.bestDistance / 10)}m`;
  }

  private _buildMenu(state: DerbyState): void {
    this._menuOverlay.removeChildren();
    const sw = this._sw;
    const sh = this._sh;

    // Dim background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
    this._menuOverlay.addChild(bg);

    // Title
    const title = new Text({ text: "GRAIL DERBY", style: TITLE_STYLE });
    title.anchor.set(0.5, 0.5);
    title.x = sw / 2;
    title.y = sh / 2 - 100;
    this._menuOverlay.addChild(title);

    // Subtitle
    const sub = new Text({
      text: "A Medieval Horse Racing Game",
      style: SUBTITLE_STYLE,
    });
    sub.anchor.set(0.5, 0.5);
    sub.x = sw / 2;
    sub.y = sh / 2 - 55;
    this._menuOverlay.addChild(sub);

    // Best score / distance
    this._menuBestScoreText = new Text({
      text: `Best Score: ${state.highScore}`,
      style: SUBTITLE_STYLE,
    });
    this._menuBestScoreText.anchor.set(0.5, 0.5);
    this._menuBestScoreText.x = sw / 2;
    this._menuBestScoreText.y = sh / 2 - 15;
    this._menuOverlay.addChild(this._menuBestScoreText);

    this._menuBestDistText = new Text({
      text: `Best Distance: ${Math.floor(state.bestDistance / 10)}m`,
      style: SUBTITLE_STYLE,
    });
    this._menuBestDistText.anchor.set(0.5, 0.5);
    this._menuBestDistText.x = sw / 2;
    this._menuBestDistText.y = sh / 2 + 15;
    this._menuOverlay.addChild(this._menuBestDistText);

    // Total stats
    const meta = loadDerbyMeta();
    if (meta.totalRaces > 0) {
      const statsTxt = new Text({
        text: `Races: ${meta.totalRaces}  Total Coins: ${meta.totalCoins}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x888888 }),
      });
      statsTxt.anchor.set(0.5, 0.5);
      statsTxt.x = sw / 2;
      statsTxt.y = sh / 2 + 38;
      this._menuOverlay.addChild(statsTxt);
    }

    // Upgrade summary (if any purchased)
    if (this.shopItems.length > 0) {
      const owned = this.shopItems.filter(it => it.current > 0);
      if (owned.length > 0) {
        const upgradeStr = owned.map(it => `${it.name} Lv${it.current}`).join("  ");
        const upgTxt = new Text({
          text: upgradeStr,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x66aa66 }),
        });
        upgTxt.anchor.set(0.5, 0.5);
        upgTxt.x = sw / 2;
        upgTxt.y = sh / 2 + 52;
        this._menuOverlay.addChild(upgTxt);
      }
    }

    // Prompt
    const prompt = new Text({
      text: "PRESS SPACE TO RACE",
      style: PROMPT_STYLE,
    });
    prompt.anchor.set(0.5, 0.5);
    prompt.x = sw / 2;
    prompt.y = sh / 2 + 60;
    this._menuOverlay.addChild(prompt);
    // Blink
    gsap.to(prompt, { alpha: 0.3, duration: 0.7, yoyo: true, repeat: -1 });

    // Controls
    const controls = new Text({
      text:
        "Controls:\n" +
        "UP / DOWN - Switch Lane\n" +
        "SHIFT - Sprint\n" +
        "ESC - Pause",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fill: "#aaaaaa",
        align: "center",
        lineHeight: 18,
      }),
    });
    controls.anchor.set(0.5, 0.5);
    controls.x = sw / 2;
    controls.y = sh / 2 + 130;
    this._menuOverlay.addChild(controls);

    // Decorative horse silhouettes
    const deco = new Graphics();
    // Left horse silhouette
    this._drawHorseSilhouette(deco, sw / 2 - 160, sh / 2 - 95, 0xffd700);
    // Right horse silhouette
    this._drawHorseSilhouette(deco, sw / 2 + 160, sh / 2 - 95, 0xffd700);
    this._menuOverlay.addChild(deco);
  }

  private _drawHorseSilhouette(g: Graphics, x: number, y: number, color: number): void {
    const a = 0.25;
    // Body
    g.ellipse(x, y, 22, 13).fill({ color, alpha: a });
    // Neck
    g.moveTo(x + 14, y - 6);
    g.quadraticCurveTo(x + 20, y - 16, x + 22, y - 18);
    g.lineTo(x + 18, y - 16);
    g.lineTo(x + 12, y - 4);
    g.closePath();
    g.fill({ color, alpha: a });
    // Head
    g.ellipse(x + 23, y - 20, 7, 5).fill({ color, alpha: a });
    // Ear
    g.moveTo(x + 22, y - 24);
    g.lineTo(x + 24, y - 30);
    g.lineTo(x + 26, y - 24);
    g.fill({ color, alpha: a * 0.8 });
    // Legs (4 in gallop pose)
    g.moveTo(x - 10, y + 10).lineTo(x - 16, y + 24).stroke({ color, width: 2.5, alpha: a });
    g.moveTo(x - 4, y + 10).lineTo(x - 2, y + 24).stroke({ color, width: 2.5, alpha: a });
    g.moveTo(x + 6, y + 10).lineTo(x + 12, y + 24).stroke({ color, width: 2.5, alpha: a });
    g.moveTo(x + 12, y + 10).lineTo(x + 18, y + 20).stroke({ color, width: 2.5, alpha: a });
    // Tail
    g.moveTo(x - 18, y - 2);
    g.quadraticCurveTo(x - 28, y - 10, x - 24, y - 16);
    g.stroke({ color, width: 2, alpha: a });
    // Mane
    g.moveTo(x + 14, y - 10).lineTo(x + 10, y - 16).stroke({ color, width: 1.5, alpha: a * 0.7 });
    g.moveTo(x + 16, y - 12).lineTo(x + 12, y - 20).stroke({ color, width: 1.5, alpha: a * 0.7 });
    // Knight rider silhouette on top
    g.roundRect(x - 2, y - 18, 10, 12, 2).fill({ color, alpha: a * 0.7 });
    g.roundRect(x, y - 24, 6, 8, 2).fill({ color, alpha: a * 0.6 }); // helm
  }

  // ---------------------------------------------------------------------------
  // Crash overlay
  // ---------------------------------------------------------------------------

  private _renderCrash(state: DerbyState): void {
    if (!this._crashBuilt) {
      this._buildCrash(state);
      this._crashBuilt = true;
    }
    this._crashScoreText.text = `Score: ${state.player.score}`;
    const mins = Math.floor(state.time / 60);
    const secs = Math.floor(state.time % 60);
    const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    this._crashDistText.text = `Distance: ${Math.floor(state.player.distance / 10)}m  Time: ${timeStr}`;
    const streakStr = state.player.bestStreak > 1 ? `  Best Combo: ${state.player.bestStreak}x` : "";
    this._crashCoinsText.text = `Coins: ${state.player.coins}${streakStr}`;
  }

  private _buildCrash(state: DerbyState): void {
    this._crashOverlay.removeChildren();
    const sw = this._sw;
    const sh = this._sh;
    const cx = sw / 2;

    // Dark overlay with red vignette
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.7 });
    bg.rect(0, 0, sw, 30).fill({ color: 0x880000, alpha: 0.12 });
    bg.rect(0, sh - 30, sw, 30).fill({ color: 0x880000, alpha: 0.12 });
    this._crashOverlay.addChild(bg);

    // Wreckage art: broken horseshoe + scattered debris
    const deco = new Graphics();
    const iy = sh / 2 - 110;
    // Broken horseshoe
    deco.arc(cx, iy, 16, -Math.PI * 0.8, -Math.PI * 0.2).stroke({ color: 0x888888, width: 4, alpha: 0.5 });
    deco.arc(cx, iy, 16, 0.2, Math.PI * 0.8).stroke({ color: 0x888888, width: 4, alpha: 0.5 });
    // Gap in horseshoe (broken)
    deco.circle(cx + 10, iy + 12, 2).fill({ color: 0xffaa44, alpha: 0.3 }); // spark
    deco.circle(cx - 10, iy + 12, 1.5).fill({ color: 0xffaa44, alpha: 0.25 });
    // Scattered debris around horseshoe
    for (let i = 0; i < 6; i++) {
      const dx = cx + (Math.random() - 0.5) * 80;
      const dy = iy + (Math.random() - 0.5) * 40;
      const size = 1.5 + Math.random() * 2;
      deco.rect(dx, dy, size, size).fill({ color: [0x8b6914, 0x667788, 0x554433, 0xaa8844][i % 4], alpha: 0.2 + Math.random() * 0.15 });
    }
    // Dust cloud silhouettes
    deco.ellipse(cx - 40, iy + 15, 20, 8).fill({ color: 0x886644, alpha: 0.08 });
    deco.ellipse(cx + 35, iy + 12, 18, 7).fill({ color: 0x886644, alpha: 0.06 });
    // Divider line
    deco.moveTo(cx - 100, sh / 2 - 82).lineTo(cx + 100, sh / 2 - 82).stroke({ color: 0xff4444, width: 0.8, alpha: 0.3 });
    this._crashOverlay.addChild(deco);

    const title = new Text({ text: "CRASHED!", style: CRASH_TITLE_STYLE });
    title.anchor.set(0.5, 0.5);
    title.x = cx;
    title.y = sh / 2 - 70;
    this._crashOverlay.addChild(title);

    this._crashScoreText = new Text({ text: `Score: ${state.player.score}`, style: CRASH_BODY_STYLE });
    this._crashScoreText.anchor.set(0.5, 0.5);
    this._crashScoreText.x = sw / 2;
    this._crashScoreText.y = sh / 2 - 20;
    this._crashOverlay.addChild(this._crashScoreText);

    this._crashDistText = new Text({
      text: `Distance: ${Math.floor(state.player.distance / 10)}m`,
      style: CRASH_BODY_STYLE,
    });
    this._crashDistText.anchor.set(0.5, 0.5);
    this._crashDistText.x = sw / 2;
    this._crashDistText.y = sh / 2 + 10;
    this._crashOverlay.addChild(this._crashDistText);

    this._crashCoinsText = new Text({ text: `Coins: ${state.player.coins}`, style: CRASH_BODY_STYLE });
    this._crashCoinsText.anchor.set(0.5, 0.5);
    this._crashCoinsText.x = sw / 2;
    this._crashCoinsText.y = sh / 2 + 40;
    this._crashOverlay.addChild(this._crashCoinsText);

    // --- SHOP SECTION ---
    if (this.shopItems.length > 0) {
      let shopY = sh / 2 + 70;
      const shopHeader = new Text({
        text: `UPGRADES (${this.shopCoins} coins)`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffd700, fontWeight: "bold" }),
      });
      shopHeader.anchor.set(0.5, 0);
      shopHeader.x = sw / 2;
      shopHeader.y = shopY;
      this._crashOverlay.addChild(shopHeader);
      shopY += 18;

      for (let i = 0; i < this.shopItems.length; i++) {
        const item = this.shopItems[i];
        const owned = item.current >= item.max;
        const canAfford = this.shopCoins >= item.cost && !owned;
        const label = owned ? `${i + 1}. ${item.name} — OWNED` : `${i + 1}. ${item.name} (${item.cost}c) ${item.desc} [${item.current}/${item.max}]`;
        const color = owned ? 0x44aa44 : canAfford ? 0xffffff : 0x666666;
        const shopTxt = new Text({
          text: label,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: color }),
        });
        shopTxt.anchor.set(0.5, 0);
        shopTxt.x = sw / 2;
        shopTxt.y = shopY;
        this._crashOverlay.addChild(shopTxt);
        shopY += 15;
      }
    }

    const prompt = new Text({ text: "PRESS SPACE TO RESTART", style: PROMPT_STYLE });
    prompt.anchor.set(0.5, 0.5);
    prompt.x = sw / 2;
    prompt.y = sh / 2 + 165;
    this._crashOverlay.addChild(prompt);
    gsap.to(prompt, { alpha: 0.3, duration: 0.7, yoyo: true, repeat: -1 });
  }

  // ---------------------------------------------------------------------------
  // Pause overlay
  // ---------------------------------------------------------------------------

  private _renderPause(): void {
    if (!this._pauseBuilt) {
      this._buildPause();
      this._pauseBuilt = true;
    }
  }

  private _buildPause(): void {
    this._pauseOverlay.removeChildren();
    const sw = this._sw;
    const sh = this._sh;

    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
    this._pauseOverlay.addChild(bg);

    const title = new Text({ text: "PAUSED", style: PAUSE_STYLE });
    title.anchor.set(0.5, 0.5);
    title.x = sw / 2;
    title.y = sh / 2;
    this._pauseOverlay.addChild(title);

    const sub = new Text({ text: "Press ESC to resume", style: PROMPT_STYLE });
    sub.anchor.set(0.5, 0.5);
    sub.x = sw / 2;
    sub.y = sh / 2 + 40;
    this._pauseOverlay.addChild(sub);
  }

  // ---------------------------------------------------------------------------
  // Rebuild overlays (call after restart to reset the built flags)
  // ---------------------------------------------------------------------------

  resetOverlays(): void {
    this._menuBuilt = false;
    this._crashBuilt = false;
    this._pauseBuilt = false;
    this._menuOverlay.removeChildren();
    this._crashOverlay.removeChildren();
    this._pauseOverlay.removeChildren();
  }
}

// ---------------------------------------------------------------------------
// Utility: darken a hex color
// ---------------------------------------------------------------------------

function darkenColor(color: number, factor: number): number {
  const r = Math.floor(((color >> 16) & 0xff) * factor);
  const g = Math.floor(((color >> 8) & 0xff) * factor);
  const b = Math.floor((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
