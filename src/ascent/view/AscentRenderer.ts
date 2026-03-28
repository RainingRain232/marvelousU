// ---------------------------------------------------------------------------
// Camelot Ascent – Main PixiJS Renderer
// Draws the game world: background, platforms, player, enemies, pickups, HUD
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import type { AscentState, Platform, Enemy, Projectile, Pickup, AscentPlayer } from "../types";
import { AscentPhase, PlatformType, EnemyType, PickupType } from "../types";
import { loadAscentMeta } from "../state/AscentState";
import { ASCENT_BALANCE as B } from "../config/AscentBalance";

// ---------------------------------------------------------------------------
// Shared text styles
// ---------------------------------------------------------------------------

const SCORE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 3 },
});

const FLOOR_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: "#ffdd57",
  stroke: { color: "#000000", width: 3 },
});

const ZONE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: "#aabbcc",
  stroke: { color: "#000000", width: 2 },
});

const DEATH_TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 36,
  fill: "#ff4444",
  stroke: { color: "#000000", width: 4 },
  align: "center",
});

const DEATH_BODY_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 2 },
  align: "center",
});

const DEATH_PROMPT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: "#aaaaaa",
  align: "center",
});

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 40,
  fill: "#ffd700",
  stroke: { color: "#000000", width: 5 },
  align: "center",
  fontWeight: "bold",
});

const PAUSE_TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 32,
  fill: "#ffffff",
  stroke: { color: "#000000", width: 4 },
  align: "center",
});

const SHOP_HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 15,
  fill: "#ffd700",
  fontWeight: "bold",
  align: "center",
});

// ---------------------------------------------------------------------------
// AscentRenderer
// ---------------------------------------------------------------------------

export class AscentRenderer {
  readonly container = new Container();

  private _bgLayer = new Container();
  private _platformLayer = new Container();
  private _entityLayer = new Container();
  private _fxLayer = new Container();
  private _uiLayer = new Container();

  // Persistent HUD elements
  private _scoreText!: Text;
  private _floorText!: Text;
  private _zoneText!: Text;
  private _coinText!: Text;
  private _hpContainer = new Container();

  // Death overlay
  private _deathOverlay = new Container();
  private _deathBuilt = false;

  // Start screen overlay
  private _startOverlay = new Container();
  private _startBuilt = false;

  // Pause overlay
  private _pauseOverlay = new Container();
  private _pauseBuilt = false;

  // Screen dimensions (updated each render)
  private _sw = 800;
  private _sh = 600;

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  build(screenW: number, screenH: number): void {
    this._sw = screenW;
    this._sh = screenH;

    this.container.removeChildren();

    this._bgLayer = new Container();
    this._platformLayer = new Container();
    this._entityLayer = new Container();
    this._fxLayer = new Container();
    this._uiLayer = new Container();

    this.container.addChild(this._bgLayer);
    this.container.addChild(this._platformLayer);
    this.container.addChild(this._entityLayer);
    this.container.addChild(this._fxLayer);
    this.container.addChild(this._uiLayer);

    // --- HUD ---
    this._scoreText = new Text({ text: "Score: 0", style: SCORE_STYLE });
    this._scoreText.x = screenW - 10;
    this._scoreText.y = 10;
    this._scoreText.anchor.set(1, 0);
    this._uiLayer.addChild(this._scoreText);

    this._floorText = new Text({ text: "Floor 0", style: FLOOR_STYLE });
    this._floorText.anchor.set(0.5, 0);
    this._floorText.x = screenW / 2;
    this._floorText.y = 10;
    this._uiLayer.addChild(this._floorText);

    this._zoneText = new Text({ text: "Stone Tower", style: ZONE_STYLE });
    this._zoneText.anchor.set(0.5, 0);
    this._zoneText.x = screenW / 2;
    this._zoneText.y = 30;
    this._uiLayer.addChild(this._zoneText);

    this._coinText = new Text({ text: "Coins: 0", style: SCORE_STYLE });
    this._coinText.x = screenW - 10;
    this._coinText.y = 34;
    this._coinText.anchor.set(1, 0);
    this._uiLayer.addChild(this._coinText);

    this._hpContainer = new Container();
    this._hpContainer.x = 10;
    this._hpContainer.y = 10;
    this._uiLayer.addChild(this._hpContainer);

    // Death overlay (hidden until needed)
    this._deathOverlay = new Container();
    this._deathOverlay.visible = false;
    this._deathBuilt = false;
    this._uiLayer.addChild(this._deathOverlay);

    // Start screen overlay
    this._startOverlay = new Container();
    this._startOverlay.visible = false;
    this._startBuilt = false;
    this._uiLayer.addChild(this._startOverlay);

    // Pause overlay
    this._pauseOverlay = new Container();
    this._pauseOverlay.visible = false;
    this._pauseBuilt = false;
    this._uiLayer.addChild(this._pauseOverlay);
  }

  // ---------------------------------------------------------------------------
  // Render (called every frame)
  // ---------------------------------------------------------------------------

  render(state: AscentState, screenW: number, screenH: number): void {
    this._sw = screenW;
    this._sh = screenH;

    const camY = state.cameraY;

    // --- Clear dynamic layers (fxLayer is NOT cleared — gsap animations manage their own lifecycle) ---
    this._bgLayer.removeChildren();
    this._platformLayer.removeChildren();
    this._entityLayer.removeChildren();

    // --- Background ---
    this._drawBackground(state);

    // --- Platforms ---
    const platZoneIdx = Math.min(Math.floor(state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
    const platTint = B.ZONES[platZoneIdx].platformTint;
    for (const p of state.platforms) {
      if (!p.active) continue;
      const sy = p.y - camY;
      if (sy < -40 || sy > this._sh + 40) continue;
      this._drawPlatform(p, camY, platTint);
    }

    // --- Pickups ---
    for (const pk of state.pickups) {
      if (pk.collected) continue;
      const sy = pk.y - camY;
      if (sy < -30 || sy > this._sh + 30) continue;
      this._drawPickup(pk, camY);
    }

    // --- Enemies ---
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const sy = e.y - camY;
      if (sy < -60 || sy > this._sh + 60) continue;
      this._drawEnemy(e, camY);
    }

    // --- Boss (detailed dragon guardian) ---
    if (state.bossActive && state.bossHp > 0) {
      const bx = this._sw / 2;
      const by = 65;
      const S = 2.2;
      const bG = new Graphics();
      const breathe = Math.sin(state.time * 2) * 2; // breathing animation

      // Aura glow (pulsing)
      const auraPulse = 0.5 + Math.sin(state.time * 3) * 0.3;
      bG.circle(bx, by, 70).fill({ color: 0xff2222, alpha: 0.03 * auraPulse });
      bG.circle(bx, by, 50).fill({ color: 0xff4422, alpha: 0.04 * auraPulse });

      // Tail (S-curve behind body)
      bG.moveTo(bx, by + 16 * S);
      bG.quadraticCurveTo(bx + 20 * S, by + 22 * S, bx + 15 * S, by + 10 * S);
      bG.quadraticCurveTo(bx + 25 * S, by + 5 * S, bx + 18 * S, by + 15 * S);
      bG.stroke({ color: 0x771111, width: 4 });
      // Tail spike
      bG.moveTo(bx + 16 * S, by + 14 * S);
      bG.lineTo(bx + 22 * S, by + 12 * S);
      bG.lineTo(bx + 18 * S, by + 18 * S);
      bG.fill(0x882222);

      // Wings (multi-point membrane with veins)
      for (const side of [-1, 1]) {
        bG.moveTo(bx + side * 22 * S, by - 4);
        bG.lineTo(bx + side * 35 * S, by - 25 * S);
        bG.lineTo(bx + side * 42 * S, by - 22 * S);
        bG.lineTo(bx + side * 38 * S, by - 10 * S);
        bG.lineTo(bx + side * 44 * S, by - 8 * S);
        bG.lineTo(bx + side * 35 * S, by + 2);
        bG.lineTo(bx + side * 18 * S, by + 4);
        bG.closePath();
        bG.fill({ color: 0x661111, alpha: 0.7 });
        // Wing membrane veins
        bG.moveTo(bx + side * 24 * S, by - 2);
        bG.lineTo(bx + side * 38 * S, by - 22 * S);
        bG.stroke({ color: 0x551111, width: 1.5, alpha: 0.4 });
        bG.moveTo(bx + side * 22 * S, by + 2);
        bG.lineTo(bx + side * 42 * S, by - 10 * S);
        bG.stroke({ color: 0x551111, width: 1, alpha: 0.3 });
      }

      // Body (large oval with scale ridges)
      bG.ellipse(bx, by + breathe, 28 * S, 18 * S);
      bG.fill({ color: 0x882222, alpha: 0.9 });
      bG.ellipse(bx, by + breathe, 28 * S, 18 * S);
      bG.stroke({ color: 0x993333, width: 1.5 });
      // Belly scales
      for (let sc = 0; sc < 4; sc++) {
        const scy = by - 8 * S + sc * 5 * S + breathe;
        bG.moveTo(bx - 15 * S, scy);
        bG.lineTo(bx + 15 * S, scy);
        bG.stroke({ color: 0x993333, width: 0.8, alpha: 0.3 });
      }
      // Chest armor plate
      bG.ellipse(bx, by - 2 + breathe, 16 * S, 10 * S);
      bG.fill({ color: 0x992222, alpha: 0.3 });

      // Neck
      bG.moveTo(bx - 6 * S, by - 16 * S + breathe);
      bG.lineTo(bx - 4 * S, by - 24 * S);
      bG.lineTo(bx + 4 * S, by - 24 * S);
      bG.lineTo(bx + 6 * S, by - 16 * S + breathe);
      bG.closePath();
      bG.fill(0x882222);

      // Head
      bG.ellipse(bx, by - 26 * S, 10 * S, 7 * S);
      bG.fill(0x882222);
      bG.ellipse(bx, by - 26 * S, 10 * S, 7 * S);
      bG.stroke({ color: 0x993333, width: 1 });
      // Jaw
      bG.arc(bx, by - 23 * S, 8 * S, 0.3, Math.PI - 0.3);
      bG.stroke({ color: 0x772222, width: 2 });
      // Teeth
      for (let t = 0; t < 5; t++) {
        const tx2 = bx - 6 * S + t * 3 * S;
        bG.moveTo(tx2, by - 22 * S).lineTo(tx2 + 1.5 * S, by - 20 * S).lineTo(tx2 + 3 * S, by - 22 * S);
        bG.fill({ color: 0xddccbb, alpha: 0.5 });
      }
      // Nostrils
      bG.circle(bx - 4 * S, by - 24 * S, 1.5 * S).fill(0x440000);
      bG.circle(bx + 4 * S, by - 24 * S, 1.5 * S).fill(0x440000);

      // Horns (curved, thick)
      for (const side of [-1, 1]) {
        bG.moveTo(bx + side * 8 * S, by - 30 * S);
        bG.quadraticCurveTo(bx + side * 14 * S, by - 42 * S, bx + side * 10 * S, by - 38 * S);
        bG.stroke({ color: 0x664433, width: 3.5 });
        bG.moveTo(bx + side * 8 * S, by - 30 * S);
        bG.quadraticCurveTo(bx + side * 14 * S, by - 42 * S, bx + side * 10 * S, by - 38 * S);
        bG.stroke({ color: 0x886655, width: 1.5, alpha: 0.3 }); // highlight
      }

      // Eyes (glowing, with pupils)
      for (const side of [-1, 1]) {
        const ex = bx + side * 5 * S;
        const ey = by - 28 * S;
        bG.circle(ex, ey, 4 * S).fill({ color: 0xff0000, alpha: 0.15 }); // glow
        bG.circle(ex, ey, 3 * S).fill(0xff2222);
        bG.circle(ex, ey, 3 * S).stroke({ color: 0xff4444, width: 0.8 });
        bG.circle(ex + side * 1, ey, 1.5 * S).fill(0x220000); // pupil
      }

      // Claws (dangling from body)
      for (const side of [-1, 1]) {
        const cx2 = bx + side * 20 * S;
        const cy2 = by + 14 * S;
        bG.moveTo(cx2, cy2).lineTo(cx2 + side * 3, cy2 + 8).stroke({ color: 0x772222, width: 2.5 });
        bG.moveTo(cx2 + side * 3, cy2 + 8).lineTo(cx2 + side * 5, cy2 + 10).stroke({ color: 0x882222, width: 1.5 });
      }

      // HP bar (wider, with frame)
      const hpFrac = state.bossHp / state.bossMaxHp;
      bG.roundRect(bx - 60, by + 26 * S, 120, 10, 3).fill(0x220000);
      bG.roundRect(bx - 60, by + 26 * S, 120, 10, 3).stroke({ color: 0x553333, width: 1 });
      if (hpFrac > 0) {
        bG.roundRect(bx - 59, by + 26 * S + 1, 118 * hpFrac, 8, 2);
        bG.fill({ color: hpFrac > 0.5 ? 0xcc2222 : hpFrac > 0.25 ? 0xccaa22 : 0xff2222 });
        // HP bar shine
        bG.roundRect(bx - 58, by + 26 * S + 2, 116 * hpFrac, 3, 1).fill({ color: 0xffffff, alpha: 0.08 });
      }
      // Boss name
      const bossName = new Text({ text: `TOWER GUARDIAN — Floor ${state.floor}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xff6644, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.8 } }) });
      bossName.anchor.set(0.5, 0);
      bossName.position.set(bx, by + 26 * S + 14);
      bG.addChild(bossName);
      this._entityLayer.addChild(bG);
    }

    // --- Projectiles ---
    for (const proj of state.projectiles) {
      const sy = proj.y - camY;
      if (sy < -20 || sy > this._sh + 20) continue;
      this._drawProjectile(proj, camY);
    }

    // --- Player ---
    this._drawPlayer(state.player, camY, state.time);

    // --- HUD ---
    this._updateHUD(state);

    // --- Death screen ---
    if (state.phase === AscentPhase.DEAD) {
      this._showDeathScreen(state);
    } else {
      this._deathOverlay.visible = false;
      this._deathBuilt = false;
    }

    // --- Start screen ---
    if (state.phase === AscentPhase.START) {
      this._showStartScreen(state);
    } else {
      this._startOverlay.visible = false;
      this._startBuilt = false;
    }

    // --- Pause screen ---
    if (state.phase === AscentPhase.PAUSED) {
      this._showPauseScreen();
    } else {
      this._pauseOverlay.visible = false;
      this._pauseBuilt = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Background
  // ---------------------------------------------------------------------------

  private _drawBackground(state: AscentState): void {
    const g = new Graphics();
    const floor = state.floor;
    const time = state.time;
    const isBoss =
      floor > 0 && floor % B.BOSS_FLOOR_INTERVAL === 0 && state.bossActive;

    // Zone lookup for theming
    const zoneIdx = Math.min(Math.floor(state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
    const zone = B.ZONES[zoneIdx];

    // Sky gradient based on zone
    let topR: number, topG_: number, topB_: number;
    let botR: number, botG_: number, botB_: number;

    if (isBoss) {
      topR = 80; topG_ = 10; topB_ = 10;
      botR = 160; botG_ = 30; botB_ = 20;
    } else {
      topR = zone.skyTop[0];
      topG_ = zone.skyTop[1];
      topB_ = zone.skyTop[2];
      botR = zone.skyBot[0];
      botG_ = zone.skyBot[1];
      botB_ = zone.skyBot[2];
    }

    // Draw sky as gradient stripes
    const stripes = 24;
    const stripeH = this._sh / stripes;
    for (let i = 0; i < stripes; i++) {
      const t = i / (stripes - 1);
      const r = Math.floor(topR + (botR - topR) * t);
      const gr = Math.floor(topG_ + (botG_ - topG_) * t);
      const b = Math.floor(topB_ + (botB_ - topB_) * t);
      const color = (r << 16) | (gr << 8) | b;
      g.rect(0, i * stripeH, this._sw, stripeH + 1).fill(color);
    }

    // --- Distant mountains (very slow parallax) ---
    const mtnParallax = state.cameraY * 0.1;
    const mtnBaseY = this._sh * 0.55 - (mtnParallax % this._sh);
    const mtnColor = isBoss ? 0x3a1515 : 0x1a1a2e;
    const mtnHighlight = isBoss ? 0x4a2020 : 0x252540;
    // Back mountain range
    g.moveTo(0, mtnBaseY + 60);
    g.lineTo(this._sw * 0.08, mtnBaseY + 20);
    g.lineTo(this._sw * 0.15, mtnBaseY + 40);
    g.lineTo(this._sw * 0.25, mtnBaseY - 10);
    g.lineTo(this._sw * 0.33, mtnBaseY + 30);
    g.lineTo(this._sw * 0.42, mtnBaseY + 5);
    g.lineTo(this._sw * 0.50, mtnBaseY - 20);
    g.lineTo(this._sw * 0.58, mtnBaseY + 15);
    g.lineTo(this._sw * 0.67, mtnBaseY - 5);
    g.lineTo(this._sw * 0.75, mtnBaseY + 25);
    g.lineTo(this._sw * 0.83, mtnBaseY - 15);
    g.lineTo(this._sw * 0.92, mtnBaseY + 10);
    g.lineTo(this._sw, mtnBaseY + 50);
    g.lineTo(this._sw, mtnBaseY + 80);
    g.lineTo(0, mtnBaseY + 80);
    g.closePath();
    g.fill({ color: mtnColor, alpha: 0.6 });
    // Snow caps on tallest peaks
    const peaks = [
      { x: this._sw * 0.25, y: mtnBaseY - 10 },
      { x: this._sw * 0.50, y: mtnBaseY - 20 },
      { x: this._sw * 0.83, y: mtnBaseY - 15 },
    ];
    for (const pk of peaks) {
      g.moveTo(pk.x - 8, pk.y + 10);
      g.lineTo(pk.x, pk.y);
      g.lineTo(pk.x + 8, pk.y + 10);
      g.closePath();
      g.fill({ color: mtnHighlight, alpha: 0.5 });
    }

    // --- Floating clouds (subtle, low alpha, slow parallax) ---
    const cloudParallax = state.cameraY * 0.15;
    const cloudSeeds = [
      { cx: this._sw * 0.2, cy: this._sh * 0.15, rx: 40, ry: 12 },
      { cx: this._sw * 0.55, cy: this._sh * 0.08, rx: 55, ry: 14 },
      { cx: this._sw * 0.8, cy: this._sh * 0.22, rx: 35, ry: 10 },
      { cx: this._sw * 0.35, cy: this._sh * 0.30, rx: 28, ry: 9 },
    ];
    for (const c of cloudSeeds) {
      const cy = c.cy - (cloudParallax % (this._sh * 1.5)) + this._sh * 0.3;
      const drift = Math.sin(time * 0.3 + c.cx * 0.01) * 8;
      // Multi-ellipse cloud
      g.ellipse(c.cx + drift, cy, c.rx, c.ry);
      g.fill({ color: 0xffffff, alpha: 0.06 });
      g.ellipse(c.cx + drift - c.rx * 0.4, cy + 2, c.rx * 0.6, c.ry * 0.8);
      g.fill({ color: 0xffffff, alpha: 0.05 });
      g.ellipse(c.cx + drift + c.rx * 0.35, cy + 1, c.rx * 0.5, c.ry * 0.7);
      g.fill({ color: 0xffffff, alpha: 0.05 });
    }

    // --- Tower bricks (parallax background) ---
    const brickColor = isBoss ? 0x4a1a1a : zone.towerColor;
    const brickHighlight = isBoss ? 0x5a2a2a : zone.towerHighlight;
    const brickShadow = isBoss ? 0x300e0e : 0x1e1e2a;
    const parallaxY = state.cameraY * 0.3;
    const brickH = 20;
    const brickW = 40;
    const towerX1 = this._sw * 0.15;
    const towerX2 = this._sw * 0.85;
    const towerW = 60;

    for (let tower = 0; tower < 2; tower++) {
      const tx = tower === 0 ? towerX1 : towerX2;
      const startRow = Math.floor(parallaxY / brickH);
      for (let row = startRow - 2; row < startRow + Math.ceil(this._sh / brickH) + 2; row++) {
        const by = row * brickH - parallaxY;
        const offset = row % 2 === 0 ? 0 : brickW / 2;
        for (let col = 0; col < Math.ceil(towerW / brickW) + 1; col++) {
          const bx = tx - towerW / 2 + col * brickW + offset;
          if (bx > tx + towerW / 2 || bx + brickW < tx - towerW / 2) continue;
          g.rect(bx, by, brickW - 2, brickH - 2).fill(brickColor);
          g.rect(bx, by, brickW - 2, 2).fill(brickHighlight);
          // Bottom shadow line
          g.rect(bx, by + brickH - 4, brickW - 2, 2).fill(brickShadow);
        }
      }

      // --- Arched windows on each tower ---
      const winSpacing = 140;
      const winW = 16;
      const winH = 22;
      const winStartY = parallaxY - (parallaxY % winSpacing) - winSpacing;
      for (let wi = 0; wi < 5; wi++) {
        const wy = winStartY + wi * winSpacing - parallaxY;
        if (wy < -40 || wy > this._sh + 40) continue;
        const wx = tx - winW / 2;
        // Window recess (dark)
        g.rect(wx, wy, winW, winH).fill(0x0a0a15);
        // Arch top (semicircle)
        g.moveTo(wx, wy);
        g.bezierCurveTo(wx, wy - winW * 0.6, wx + winW, wy - winW * 0.6, wx + winW, wy);
        g.fill(0x0a0a15);
        // Window frame
        g.rect(wx - 1, wy, winW + 2, winH).stroke({ color: brickHighlight, width: 1 });
        g.moveTo(wx, wy);
        g.bezierCurveTo(wx, wy - winW * 0.6, wx + winW, wy - winW * 0.6, wx + winW, wy);
        g.stroke({ color: brickHighlight, width: 1 });
        // Faint interior glow
        g.rect(wx + 2, wy + 2, winW - 4, winH - 4).fill({ color: isBoss ? 0xff3300 : 0x334466, alpha: 0.15 });
        // Mullion (vertical bar)
        g.rect(wx + winW / 2 - 1, wy - 4, 2, winH + 4).fill(brickHighlight);
      }

      // --- Torch brackets between windows ---
      const torchSpacing = winSpacing;
      const torchOffsetY = winSpacing * 0.5;
      for (let ti = 0; ti < 4; ti++) {
        const ty = winStartY + ti * torchSpacing + torchOffsetY - parallaxY;
        if (ty < -20 || ty > this._sh + 20) continue;
        const torchSide = tower === 0 ? tx + towerW / 2 - 4 : tx - towerW / 2 - 4;
        // Bracket (small L-shape)
        g.rect(torchSide, ty, 8, 3).fill(0x665544);
        g.rect(torchSide + 3, ty - 6, 3, 9).fill(0x665544);
        // Flame core
        const flameFlicker = Math.sin(time * 8 + ti * 2.5 + tower * 1.7) * 2;
        const fx = torchSide + 4;
        const fy = ty - 8 + flameFlicker;
        g.moveTo(fx, fy - 6);
        g.quadraticCurveTo(fx + 4, fy - 2, fx, fy + 2);
        g.quadraticCurveTo(fx - 4, fy - 2, fx, fy - 6);
        g.fill({ color: 0xff9922, alpha: 0.9 });
        // Inner flame
        g.moveTo(fx, fy - 4);
        g.quadraticCurveTo(fx + 2, fy - 1, fx, fy + 1);
        g.quadraticCurveTo(fx - 2, fy - 1, fx, fy - 4);
        g.fill({ color: 0xffdd44, alpha: 0.9 });
        // Glow
        g.circle(fx, fy - 2, 10).fill({ color: 0xff8800, alpha: 0.08 });
        g.circle(fx, fy - 2, 18).fill({ color: 0xff6600, alpha: 0.04 });
      }

      // --- Vine / ivy strands crawling on tower ---
      const vineSeed = tower * 31;
      for (let vi = 0; vi < 3; vi++) {
        const vineHash = (vineSeed + vi * 47) % 100;
        const vineX = tx - towerW / 2 + 5 + (vineHash % (towerW - 10));
        const vineTopRow = Math.floor(parallaxY / 80) * 80;
        const vineTop = vineTopRow + vi * 80 - parallaxY;
        if (vineTop > this._sh + 20 || vineTop + 60 < -20) continue;
        const vineColor = isBoss ? 0x224411 : 0x2a5522;
        // Main vine stem (wavy line)
        g.moveTo(vineX, vineTop);
        g.quadraticCurveTo(vineX + 4, vineTop + 15, vineX - 2, vineTop + 30);
        g.quadraticCurveTo(vineX + 3, vineTop + 45, vineX - 1, vineTop + 55);
        g.stroke({ color: vineColor, width: 2, alpha: 0.6 });
        // Small leaves
        const leafOffsets = [12, 28, 42];
        for (const lo of leafOffsets) {
          const lx = vineX + (lo % 2 === 0 ? 3 : -3);
          const ly = vineTop + lo;
          g.ellipse(lx + 3, ly, 4, 2).fill({ color: vineColor, alpha: 0.5 });
        }
      }

      // --- Castle flag / banner on top of each tower ---
      const flagBaseY = -parallaxY * 0.3 + 30;
      if (flagBaseY > -60 && flagBaseY < this._sh) {
        const flagX = tx;
        // Flag pole
        g.rect(flagX - 1, flagBaseY - 30, 2, 35).fill(0x888888);
        // Pole finial (small circle)
        g.circle(flagX, flagBaseY - 32, 3).fill(0xaaaaaa);
        // Flapping banner (triangle with wave)
        const flagDir = tower === 0 ? 1 : -1;
        const flutter = Math.sin(time * 4 + tower * Math.PI) * 3;
        const flutter2 = Math.sin(time * 6 + tower * Math.PI) * 2;
        const bannerColor = isBoss ? 0xaa2222 : (tower === 0 ? 0x2244aa : 0xaa8822);
        g.moveTo(flagX, flagBaseY - 28);
        g.quadraticCurveTo(flagX + flagDir * 12, flagBaseY - 22 + flutter, flagX + flagDir * 22, flagBaseY - 18 + flutter2);
        g.lineTo(flagX + flagDir * 18, flagBaseY - 12 + flutter);
        g.quadraticCurveTo(flagX + flagDir * 8, flagBaseY - 16 + flutter2, flagX, flagBaseY - 10);
        g.closePath();
        g.fill({ color: bannerColor, alpha: 0.85 });
        // Banner emblem (small diamond)
        const embX = flagX + flagDir * 10;
        const embY = flagBaseY - 19 + flutter * 0.5;
        g.moveTo(embX, embY - 3);
        g.lineTo(embX + 3, embY);
        g.lineTo(embX, embY + 3);
        g.lineTo(embX - 3, embY);
        g.closePath();
        g.fill({ color: 0xffdd44, alpha: 0.7 });
      }
    }

    // --- Ambient particles that vary by altitude ---
    const zoneIdx = Math.min(Math.floor(state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
    for (let ai = 0; ai < 15; ai++) {
      const ax = ((ai * 173 + time * 15) % (this._sw + 40)) - 20;
      const ay = ((ai * 291 + time * 20 + ai * ai * 7) % (this._sh + 40)) - 20;

      if (zoneIdx <= 1) {
        // Lower zones: falling dust and stone fragments
        g.circle(ax, ay, 0.8 + (ai % 3) * 0.3).fill({ color: 0xaa9977, alpha: 0.06 + Math.sin(time + ai) * 0.03 });
      } else if (zoneIdx <= 3) {
        // Mid zones: embers rising from torches
        const emberY = this._sh - ay;
        g.circle(ax, emberY, 0.6 + (ai % 2) * 0.4).fill({ color: 0xff6622, alpha: 0.08 + Math.sin(time * 3 + ai) * 0.04 });
      } else {
        // High zones: snow / ice crystals drifting down
        const snowDrift = Math.sin(time * 0.8 + ai * 1.5) * 8;
        g.circle(ax + snowDrift, ay, 1 + (ai % 2)).fill({ color: 0xddeeff, alpha: 0.1 + Math.sin(time * 2 + ai) * 0.04 });
      }
    }

    // --- Wind streaks at high altitude ---
    if (zoneIdx >= 3) {
      for (let wi = 0; wi < 5; wi++) {
        const wx = ((wi * 227 + time * 40) % (this._sw + 100)) - 50;
        const wy = 50 + wi * 100 + Math.sin(time + wi) * 30;
        g.moveTo(wx, wy).lineTo(wx - 30 - wi * 5, wy + 2).stroke({ color: 0xccddff, width: 0.5, alpha: 0.06 });
      }
    }

    this._bgLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Platforms
  // ---------------------------------------------------------------------------

  private _drawPlatform(p: Platform, camY: number, zoneTint = 0x888888): void {
    const g = new Graphics();
    const sx = p.x;
    const sy = p.y - camY;
    const w = p.width;
    const h = 12;
    // Blend platform base color with zone tint
    const tintR = (zoneTint >> 16) & 0xff;
    const tintG = (zoneTint >> 8) & 0xff;
    const tintB = zoneTint & 0xff;

    switch (p.type) {
      case PlatformType.NORMAL: {
        // Stone block tinted by zone
        const nr = Math.round(0x77 * 0.6 + tintR * 0.4);
        const ng = Math.round(0x77 * 0.6 + tintG * 0.4);
        const nb = Math.round(0x88 * 0.6 + tintB * 0.4);
        const normColor = (nr << 16) | (ng << 8) | nb;
        const hiR = Math.min(255, nr + 40);
        const hiG = Math.min(255, ng + 40);
        const hiB = Math.min(255, nb + 40);
        const hiColor = (hiR << 16) | (hiG << 8) | hiB;
        g.roundRect(sx, sy, w, h, 2).fill(normColor);
        g.rect(sx + 1, sy + 1, w - 2, 3).fill({ color: hiColor, alpha: 0.3 });
        g.rect(sx + 1, sy + h - 2, w - 2, 1).fill({ color: 0x000000, alpha: 0.15 });
        for (let si = 1; si < Math.floor(w / 25); si++) {
          const lx = sx + si * 25 + (si % 2 ? 5 : 0);
          g.moveTo(lx, sy + 1).lineTo(lx, sy + h - 1).stroke({ color: normColor - 0x222222, width: 0.8, alpha: 0.4 });
        }
        g.roundRect(sx, sy, w, h, 2).stroke({ color: normColor - 0x111111, width: 0.8 });
        break;
      }

      case PlatformType.MOVING: {
        // Blue crystalline platform with glow + directional arrows
        g.roundRect(sx, sy, w, h, 3).fill(0x4477bb);
        g.rect(sx + 2, sy + 1, w - 4, 3).fill({ color: 0x88ccff, alpha: 0.3 });
        g.roundRect(sx, sy, w, h, 3).stroke({ color: 0x66aaee, width: 1 });
        // Glow underneath
        g.roundRect(sx + 4, sy + h, w - 8, 3, 1).fill({ color: 0x4488cc, alpha: 0.15 });
        // Directional arrows
        const midX = sx + w / 2;
        g.moveTo(midX - 10, sy + 7).lineTo(midX - 5, sy + 4).lineTo(midX - 5, sy + 10).fill({ color: 0xffffff, alpha: 0.5 });
        g.moveTo(midX + 10, sy + 7).lineTo(midX + 5, sy + 4).lineTo(midX + 5, sy + 10).fill({ color: 0xffffff, alpha: 0.5 });
        // Center gem
        g.circle(midX, sy + 6, 2).fill(0xaaddff);
        break;
      }

      case PlatformType.CRUMBLING: {
        const alpha = Math.max(0.15, 1 - p.crumbleTimer / B.CRUMBLE_DELAY);
        // Cracked earth/stone
        g.roundRect(sx, sy, w, h, 2).fill({ color: 0x886644, alpha });
        g.rect(sx + 1, sy + 1, w - 2, 2).fill({ color: 0xaa8866, alpha: alpha * 0.3 });
        // Cracks (branching)
        g.moveTo(sx + w * 0.25, sy).lineTo(sx + w * 0.28, sy + 4).lineTo(sx + w * 0.22, sy + h).stroke({ color: 0x332211, width: 1.2, alpha });
        g.moveTo(sx + w * 0.55, sy).lineTo(sx + w * 0.58, sy + 5).lineTo(sx + w * 0.62, sy + h).stroke({ color: 0x332211, width: 1, alpha });
        g.moveTo(sx + w * 0.4, sy + 2).lineTo(sx + w * 0.45, sy + 7).stroke({ color: 0x332211, width: 0.8, alpha });
        g.moveTo(sx + w * 0.75, sy + 1).lineTo(sx + w * 0.72, sy + h - 1).stroke({ color: 0x332211, width: 0.8, alpha });
        // Crumbling fragments at edges
        if (p.crumbleTimer > 0) {
          g.circle(sx + 3, sy + h + 2, 2).fill({ color: 0x886644, alpha: alpha * 0.5 });
          g.circle(sx + w - 4, sy + h + 3, 1.5).fill({ color: 0x886644, alpha: alpha * 0.4 });
        }
        g.roundRect(sx, sy, w, h, 2).stroke({ color: 0x664422, width: 0.6, alpha });
        break;
      }

      case PlatformType.SPIKE:
        // Blood-red base with metallic spikes
        g.roundRect(sx, sy + 5, w, h - 5, 1).fill(0x992222);
        g.rect(sx + 1, sy + 6, w - 2, 2).fill({ color: 0xcc4444, alpha: 0.3 });
        g.roundRect(sx, sy + 5, w, h - 5, 1).stroke({ color: 0xaa3333, width: 0.8 });
        // Metallic spikes with highlights
        {
          const spikeW = 9;
          const spikeCount = Math.floor(w / spikeW);
          for (let i = 0; i < spikeCount; i++) {
            const bx = sx + i * spikeW + 1;
            // Spike body
            g.moveTo(bx, sy + 5).lineTo(bx + spikeW / 2, sy - 3).lineTo(bx + spikeW - 2, sy + 5).closePath().fill(0xcc5555);
            // Highlight edge
            g.moveTo(bx + spikeW / 2, sy - 3).lineTo(bx + spikeW / 2 + 1, sy + 3).stroke({ color: 0xff8888, width: 0.6, alpha: 0.4 });
          }
        }
        break;

      case PlatformType.SPRING:
        // Green base with detailed spring mechanism
        g.roundRect(sx, sy + 2, w, h - 2, 2).fill(0x338833);
        g.rect(sx + 2, sy + 3, w - 4, 2).fill({ color: 0x55cc55, alpha: 0.3 });
        g.roundRect(sx, sy + 2, w, h - 2, 2).stroke({ color: 0x44aa44, width: 0.8 });
        // Spring coil (proper oval loops)
        {
          const coilX = sx + w / 2;
          const coilW = 10;
          // Base plate
          g.rect(coilX - coilW - 2, sy, coilW * 2 + 4, 3).fill(0x66cc44);
          g.rect(coilX - coilW - 2, sy, coilW * 2 + 4, 3).stroke({ color: 0x88ee66, width: 0.6 });
          // Coil loops
          for (let ci = 0; ci < 3; ci++) {
            const cy = sy + 4 + ci * 3;
            g.ellipse(coilX, cy, coilW * (1 - ci * 0.15), 1.5).stroke({ color: 0xccff44, width: 2 });
          }
          // Arrow indicator (up)
          g.moveTo(coilX, sy - 4).lineTo(coilX - 4, sy + 1).lineTo(coilX + 4, sy + 1).closePath().fill({ color: 0xeeff66, alpha: 0.5 });
        }
        break;
    }

    // Zone tint overlay (subtle color wash on all platforms)
    if (zoneTint !== 0x888888) {
      g.roundRect(sx, sy, w, h, 2).fill({ color: zoneTint, alpha: 0.08 });
    }

    this._platformLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Player
  // ---------------------------------------------------------------------------

  private _drawPlayer(player: AscentPlayer, camY: number, time: number): void {
    // Invincibility blink — skip rendering every other frame window
    if (player.invincibleTimer > 0 && Math.floor(time * 10) % 2 === 0) return;

    const g = new Graphics();
    const sx = player.x;
    const sy = player.y - camY;
    const pw = player.width;
    const ph = player.height;
    const dir = player.facing; // 1 = right, -1 = left
    const cx = sx + pw / 2;
    const moving = player.vx !== 0;
    const walkCycle = moving ? Math.sin(time * 12) : 0;
    const walkCycle2 = moving ? Math.cos(time * 12) : 0;

    // --- Speed boost afterimage trail ---
    if (player.speedBoostTimer > 0) {
      for (let trail = 3; trail >= 1; trail--) {
        const trailAlpha = 0.08 * trail;
        const trailOffset = -dir * trail * 6;
        g.circle(cx + trailOffset, sy + ph / 2, pw * 0.4 + trail)
          .fill({ color: 0xffaa00, alpha: trailAlpha });
      }
    }

    // --- Cape (multi-curve flowing shape) ---
    const capeX = dir === 1 ? sx - 1 : sx + pw + 1;
    const capeWind1 = Math.sin(time * 5) * 4;
    const capeWind2 = Math.sin(time * 7 + 1) * 3;
    const capeWind3 = Math.sin(time * 4 + 2) * 5;
    g.moveTo(capeX, sy + 6);
    g.quadraticCurveTo(capeX - dir * 8 + capeWind1, sy + 10, capeX - dir * 5 + capeWind2, sy + 17);
    g.quadraticCurveTo(capeX - dir * 12 + capeWind3, sy + 22, capeX - dir * 8 + capeWind1, sy + 28);
    g.quadraticCurveTo(capeX - dir * 3, sy + 26, capeX, sy + 20);
    g.closePath();
    g.fill({ color: 0xaa2222, alpha: 0.9 });
    // Cape highlight fold
    g.moveTo(capeX, sy + 8);
    g.quadraticCurveTo(capeX - dir * 5 + capeWind1 * 0.5, sy + 14, capeX - dir * 3, sy + 20);
    g.stroke({ color: 0xcc4444, width: 1, alpha: 0.5 });

    // --- Legs (articulated upper/lower + boots) ---
    const hipY = sy + 20;
    const legLength = 5;
    const bootH = 3;

    for (let side = 0; side < 2; side++) {
      const legX = side === 0 ? cx - 4 : cx + 2;
      const swing = side === 0 ? walkCycle * 3 : -walkCycle * 3;
      const kneeSwing = side === 0 ? walkCycle2 * 1.5 : -walkCycle2 * 1.5;
      // Upper leg
      const kneeX = legX + swing * 0.5;
      const kneeY = hipY + legLength;
      g.moveTo(legX + 1, hipY);
      g.lineTo(kneeX + 1, kneeY);
      g.lineTo(kneeX + 4, kneeY);
      g.lineTo(legX + 4, hipY);
      g.closePath();
      g.fill(0x555566);
      // Lower leg
      const footX = kneeX + kneeSwing * 0.3;
      const footY = kneeY + legLength;
      g.moveTo(kneeX + 0.5, kneeY);
      g.lineTo(footX + 0.5, footY);
      g.lineTo(footX + 3.5, footY);
      g.lineTo(kneeX + 3.5, kneeY);
      g.closePath();
      g.fill(0x4a4a5a);
      // Boot
      g.roundRect(footX - 1, footY, 6, bootH, 1).fill(0x3a3a44);
      // Boot cuff
      g.rect(footX - 0.5, footY, 5, 1).fill(0x666677);
    }

    // --- Torso (rounded rect with chest plate + belt) ---
    const torsoY = sy + 9;
    const torsoH = 12;
    // Base torso
    g.roundRect(sx + 2, torsoY, pw - 4, torsoH, 2).fill(0x666677);
    // Chest plate overlay
    g.roundRect(sx + 3, torsoY + 1, pw - 6, 7, 1).fill(0x777788);
    // Chest plate center ridge
    g.rect(cx - 0.5, torsoY + 2, 1, 5).fill(0x8888aa);
    // Belt
    g.rect(sx + 2, torsoY + torsoH - 3, pw - 4, 3).fill(0x554422);
    // Belt buckle
    g.roundRect(cx - 2, torsoY + torsoH - 3, 4, 3, 0.5).fill(0xccaa44);

    // --- Arms (2 segments each side, sword arm forward) ---
    const shoulderY = torsoY + 2;

    // Back arm (opposite to facing direction)
    const backArmX = dir === 1 ? sx + 1 : sx + pw - 3;
    const backElbowX = backArmX - dir * 2;
    const backElbowY = shoulderY + 5;
    const backHandX = backElbowX - dir * 1;
    const backHandY = backElbowY + 5;
    // Upper arm
    g.moveTo(backArmX, shoulderY);
    g.lineTo(backElbowX, backElbowY);
    g.stroke({ color: 0x666677, width: 3 });
    // Forearm
    g.moveTo(backElbowX, backElbowY);
    g.lineTo(backHandX, backHandY);
    g.stroke({ color: 0x555566, width: 2.5 });
    // Gauntlet
    g.circle(backHandX, backHandY, 2).fill(0x777788);

    // Front arm (sword arm, facing direction)
    const frontArmX = dir === 1 ? sx + pw - 2 : sx + 2;
    const frontElbowX = frontArmX + dir * 3;
    const frontElbowY = shoulderY + 4;
    const swordSwing = Math.sin(time * 2) * 0.3;
    const frontHandX = frontElbowX + dir * 3;
    const frontHandY = frontElbowY + 3 + swordSwing;
    // Upper arm
    g.moveTo(frontArmX, shoulderY);
    g.lineTo(frontElbowX, frontElbowY);
    g.stroke({ color: 0x666677, width: 3 });
    // Forearm
    g.moveTo(frontElbowX, frontElbowY);
    g.lineTo(frontHandX, frontHandY);
    g.stroke({ color: 0x555566, width: 2.5 });
    // Gauntlet
    g.circle(frontHandX, frontHandY, 2).fill(0x777788);

    // --- Sword on forward arm ---
    const swordBaseX = frontHandX;
    const swordBaseY = frontHandY;
    const swordAngle = -0.4 + swordSwing;
    const bladeLen = 14;
    const bladeTipX = swordBaseX + Math.cos(swordAngle) * bladeLen * dir;
    const bladeTipY = swordBaseY + Math.sin(swordAngle) * bladeLen;
    // Blade
    g.moveTo(swordBaseX, swordBaseY);
    g.lineTo(bladeTipX, bladeTipY);
    g.stroke({ color: 0xccccdd, width: 2.5 });
    // Blade highlight
    g.moveTo(swordBaseX + dir, swordBaseY - 0.5);
    g.lineTo(bladeTipX, bladeTipY - 0.5);
    g.stroke({ color: 0xeeeeff, width: 0.5, alpha: 0.6 });
    // Crossguard
    const cgX = swordBaseX + dir * 1;
    g.moveTo(cgX, swordBaseY - 3);
    g.lineTo(cgX, swordBaseY + 3);
    g.stroke({ color: 0x8888aa, width: 2 });
    // Pommel
    g.circle(swordBaseX - dir * 2, swordBaseY, 1.5).fill(0xaa8844);

    // --- Helm (detailed with visor, nasal guard, plume) ---
    const helmY = sy;
    const helmH = 10;
    // Main helm shape
    g.roundRect(sx + 1, helmY, pw - 2, helmH, 3).fill(0x999999);
    // Helm top highlight
    g.roundRect(sx + 2, helmY, pw - 4, 3, 2).fill(0xaaaaaa);
    // Visor slit (dark opening)
    const visorX = dir === 1 ? sx + pw - 9 : sx + 3;
    g.rect(visorX, helmY + 4, 6, 2).fill(0x111111);
    // Nasal guard (vertical bar in front of visor)
    const nasalX = dir === 1 ? sx + pw - 5 : sx + 5;
    g.rect(nasalX - 0.5, helmY + 2, 1, 6).fill(0xaaaaaa);
    // Eye glow inside visor (subtle blue dots)
    const eyeBaseX = dir === 1 ? visorX + 1 : visorX + 3;
    g.circle(eyeBaseX, helmY + 5, 0.8).fill({ color: 0x44aaff, alpha: 0.7 });
    g.circle(eyeBaseX + 2.5, helmY + 5, 0.8).fill({ color: 0x44aaff, alpha: 0.7 });
    // Plume (colored feather on top, matching facing direction)
    const plumeColor = 0xcc2244;
    const plumeBase = cx + dir * 2;
    const plumeFlutter = Math.sin(time * 6) * 2;
    g.moveTo(plumeBase, helmY);
    g.quadraticCurveTo(plumeBase - dir * 4 + plumeFlutter, helmY - 8, plumeBase - dir * 10, helmY - 5 + plumeFlutter);
    g.quadraticCurveTo(plumeBase - dir * 6, helmY - 3, plumeBase, helmY + 1);
    g.closePath();
    g.fill({ color: plumeColor, alpha: 0.85 });
    // Plume highlight
    g.moveTo(plumeBase, helmY - 1);
    g.quadraticCurveTo(plumeBase - dir * 3, helmY - 6, plumeBase - dir * 7, helmY - 4);
    g.stroke({ color: 0xff5577, width: 0.5, alpha: 0.6 });

    // --- Wall-slide sparks ---
    if (player.wallSliding) {
      const wallX = player.x <= 0 ? sx : sx + pw;
      for (let si = 0; si < 3; si++) {
        const sparkY = sy + si * 10 + Math.sin(time * 20 + si) * 3;
        g.circle(wallX, sparkY, 1.5).fill({ color: 0xffaa44, alpha: 0.7 - si * 0.2 });
        g.circle(wallX, sparkY, 3).fill({ color: 0xff8822, alpha: 0.15 });
      }
    }

    // --- Shield glow (kite shield outline when active) ---
    if (player.shieldActive) {
      const shX = cx - dir * 6;
      const shY = sy + ph * 0.35;
      // Kite shield outline
      g.moveTo(shX, shY - 8);
      g.lineTo(shX + 7, shY - 3);
      g.lineTo(shX + 6, shY + 4);
      g.lineTo(shX, shY + 10);
      g.lineTo(shX - 6, shY + 4);
      g.lineTo(shX - 7, shY - 3);
      g.closePath();
      g.stroke({ color: 0x44ddff, width: 2, alpha: 0.7 });
      // Inner glow
      g.moveTo(shX, shY - 6);
      g.lineTo(shX + 5, shY - 2);
      g.lineTo(shX + 4, shY + 3);
      g.lineTo(shX, shY + 8);
      g.lineTo(shX - 4, shY + 3);
      g.lineTo(shX - 5, shY - 2);
      g.closePath();
      g.fill({ color: 0x44ddff, alpha: 0.1 });
      // Pulsing outer aura
      const pulseR = 16 + Math.sin(time * 6) * 3;
      g.circle(shX, shY + 1, pulseR).stroke({ color: 0x44ddff, width: 1, alpha: 0.25 });
    }

    this._entityLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Enemies
  // ---------------------------------------------------------------------------

  private _drawEnemy(e: Enemy, camY: number): void {
    const g = new Graphics();
    const sx = e.x;
    const sy = e.y - camY;
    const ew = e.width;
    const eh = e.height;
    const ecx = sx + ew / 2;
    const ecy = sy + eh / 2;
    const eDir = e.vx >= 0 ? 1 : -1;
    const walkAnim = Math.sin(e.x * 0.3) * 2; // pseudo walk cycle from position

    switch (e.type) {
      case EnemyType.PATROL: {
        // --- Full armored patrol knight ---
        // Legs with boots (walk animation)
        const legSwing = walkAnim;
        for (let side = 0; side < 2; side++) {
          const lx = side === 0 ? ecx - 4 : ecx + 1;
          const swing = side === 0 ? legSwing : -legSwing;
          // Upper leg
          g.rect(lx, sy + 16 + swing * 0.3, 4, 5).fill(0x774422);
          // Lower leg
          g.rect(lx, sy + 21 + swing * 0.5, 4, 4).fill(0x663311);
          // Boot
          g.roundRect(lx - 1, sy + 25 + swing * 0.5, 6, 3, 1).fill(0x553322);
        }
        // Small cape behind
        const capeDir = eDir;
        g.moveTo(ecx - capeDir * 2, sy + 8);
        g.quadraticCurveTo(ecx - capeDir * 10, sy + 16 + walkAnim, ecx - capeDir * 6, sy + 24);
        g.lineTo(ecx - capeDir * 2, sy + 18);
        g.closePath();
        g.fill({ color: 0x882222, alpha: 0.8 });
        // Torso with armor
        g.roundRect(sx + 2, sy + 8, ew - 4, 9, 1).fill(0xaa5533);
        // Chest plate
        g.roundRect(sx + 3, sy + 9, ew - 6, 5, 1).fill(0xbb6644);
        // Belt
        g.rect(sx + 2, sy + 15, ew - 4, 2).fill(0x553311);
        // Helm with visor
        g.roundRect(sx + 2, sy, ew - 4, 8, 2).fill(0xcc6644);
        // Helm top ridge
        g.rect(ecx - 1, sy - 1, 2, 3).fill(0xdd7755);
        // Visor slit
        const pVisorX = eDir === 1 ? sx + ew - 8 : sx + 2;
        g.rect(pVisorX, sy + 3, 5, 2).fill(0x331111);
        // Eyes in visor
        g.circle(pVisorX + 1.5, sy + 4, 0.6).fill({ color: 0xff8844, alpha: 0.7 });
        g.circle(pVisorX + 3.5, sy + 4, 0.6).fill({ color: 0xff8844, alpha: 0.7 });
        // Sword in hand
        const swordArmX = ecx + eDir * (ew / 2);
        const swordArmY = sy + 12;
        const sAngle = eDir === 1 ? -0.5 : -2.6;
        const sBladLen = 12;
        g.moveTo(swordArmX, swordArmY);
        g.lineTo(swordArmX + Math.cos(sAngle) * sBladLen, swordArmY + Math.sin(sAngle) * sBladLen);
        g.stroke({ color: 0xcccccc, width: 2 });
        // Crossguard
        g.moveTo(swordArmX + eDir * 1, swordArmY - 2);
        g.lineTo(swordArmX + eDir * 1, swordArmY + 2);
        g.stroke({ color: 0x887766, width: 2 });
        break;
      }

      case EnemyType.ARCHER: {
        // --- Hooded archer figure ---
        // Legs with boots
        for (let side = 0; side < 2; side++) {
          const lx = side === 0 ? ecx - 4 : ecx + 1;
          g.rect(lx, sy + 18, 4, 5).fill(0x226622);
          // Boot
          g.roundRect(lx - 1, sy + 23, 6, 2.5, 1).fill(0x1a4a1a);
        }
        // Body / tunic
        g.roundRect(sx + 1, sy + 8, ew - 2, 11, 1).fill(0x338833);
        // Belt with pouch
        g.rect(sx + 1, sy + 16, ew - 2, 2).fill(0x1a3a1a);
        g.roundRect(ecx + 2, sy + 15, 4, 3, 0.5).fill(0x224422);
        // Hood (larger rounded shape)
        g.roundRect(sx + 1, sy - 1, ew - 2, 10, 4).fill(0x44aa44);
        // Hood shadow / face area
        g.roundRect(sx + 3, sy + 3, ew - 6, 5, 1).fill(0x1a2a1a);
        // Eyes in shadow
        const archEyeX = eDir === 1 ? ecx + 1 : ecx - 3;
        g.circle(archEyeX, sy + 5, 1).fill({ color: 0x88ff88, alpha: 0.6 });
        g.circle(archEyeX + 2.5, sy + 5, 1).fill({ color: 0x88ff88, alpha: 0.6 });
        // Quiver on back
        const quiverX = ecx - eDir * 5;
        g.roundRect(quiverX - 2, sy + 4, 4, 12, 1).fill(0x664422);
        // Arrow tips poking out of quiver
        for (let ai = 0; ai < 3; ai++) {
          const ax = quiverX - 1 + ai * 1.5;
          g.moveTo(ax, sy + 3);
          g.lineTo(ax - 0.8, sy + 1);
          g.lineTo(ax + 0.8, sy + 1);
          g.closePath();
          g.fill(0xaaaaaa);
        }
        // Curved bow (proper arc)
        const bowX = ecx + eDir * (ew / 2 + 3);
        const bowTopY = sy + 3;
        const bowBotY = sy + 17;
        const bowMidY = (bowTopY + bowBotY) / 2;
        const bowCurve = eDir * 7;
        g.moveTo(bowX, bowTopY);
        g.quadraticCurveTo(bowX + bowCurve, bowMidY, bowX, bowBotY);
        g.stroke({ color: 0x885522, width: 2.5 });
        // Bow tips
        g.circle(bowX, bowTopY, 1).fill(0xaa7733);
        g.circle(bowX, bowBotY, 1).fill(0xaa7733);
        // Taut bowstring
        g.moveTo(bowX, bowTopY);
        g.lineTo(bowX + eDir * 1, bowMidY);
        g.lineTo(bowX, bowBotY);
        g.stroke({ color: 0xcccccc, width: 0.8 });
        break;
      }

      case EnemyType.BAT: {
        // --- Detailed bat with membrane wings ---
        const bcx = ecx;
        const bcy = ecy;
        const wingPhase = Math.sin(e.phase);
        const wingFlap = wingPhase * 6;
        const wingFlap2 = Math.sin(e.phase + 0.5) * 4;

        // Wing membrane (4-point shape with veins) - LEFT
        g.moveTo(bcx - 4, bcy);
        g.lineTo(bcx - 10, bcy - 7 + wingFlap);        // wing tip top
        g.lineTo(bcx - 14, bcy - 3 + wingFlap2);       // outer membrane point
        g.lineTo(bcx - 12, bcy + 2 + wingFlap * 0.5);  // lower membrane point
        g.lineTo(bcx - 6, bcy + 3);                     // inner bottom
        g.closePath();
        g.fill({ color: 0x664477, alpha: 0.9 });
        // Wing veins left
        g.moveTo(bcx - 5, bcy);
        g.lineTo(bcx - 12, bcy - 5 + wingFlap * 0.8);
        g.stroke({ color: 0x553366, width: 0.7, alpha: 0.6 });
        g.moveTo(bcx - 5, bcy + 1);
        g.lineTo(bcx - 11, bcy + 1 + wingFlap * 0.4);
        g.stroke({ color: 0x553366, width: 0.5, alpha: 0.5 });

        // Wing membrane - RIGHT (mirrored)
        g.moveTo(bcx + 4, bcy);
        g.lineTo(bcx + 10, bcy - 7 + wingFlap);
        g.lineTo(bcx + 14, bcy - 3 + wingFlap2);
        g.lineTo(bcx + 12, bcy + 2 + wingFlap * 0.5);
        g.lineTo(bcx + 6, bcy + 3);
        g.closePath();
        g.fill({ color: 0x664477, alpha: 0.9 });
        // Wing veins right
        g.moveTo(bcx + 5, bcy);
        g.lineTo(bcx + 12, bcy - 5 + wingFlap * 0.8);
        g.stroke({ color: 0x553366, width: 0.7, alpha: 0.6 });
        g.moveTo(bcx + 5, bcy + 1);
        g.lineTo(bcx + 11, bcy + 1 + wingFlap * 0.4);
        g.stroke({ color: 0x553366, width: 0.5, alpha: 0.5 });

        // Rounder body
        g.ellipse(bcx, bcy, 5, 4).fill(0x553366);
        // Fur texture highlights
        g.ellipse(bcx, bcy - 1, 3, 2).fill({ color: 0x775588, alpha: 0.4 });

        // Ears (pointed)
        g.moveTo(bcx - 3, bcy - 3);
        g.lineTo(bcx - 4, bcy - 7);
        g.lineTo(bcx - 1, bcy - 3);
        g.fill(0x553366);
        g.moveTo(bcx + 3, bcy - 3);
        g.lineTo(bcx + 4, bcy - 7);
        g.lineTo(bcx + 1, bcy - 3);
        g.fill(0x553366);

        // Glowing red eyes
        g.circle(bcx - 2, bcy - 1, 1.2).fill(0xff2222);
        g.circle(bcx + 2, bcy - 1, 1.2).fill(0xff2222);
        // Eye glow
        g.circle(bcx - 2, bcy - 1, 2.5).fill({ color: 0xff0000, alpha: 0.15 });
        g.circle(bcx + 2, bcy - 1, 2.5).fill({ color: 0xff0000, alpha: 0.15 });
        // Eye pupils
        g.circle(bcx - 1.8, bcy - 1, 0.5).fill(0xffffff);
        g.circle(bcx + 2.2, bcy - 1, 0.5).fill(0xffffff);

        // Fangs (small triangles)
        g.moveTo(bcx - 1, bcy + 2);
        g.lineTo(bcx - 1.5, bcy + 4.5);
        g.lineTo(bcx - 0.5, bcy + 2);
        g.fill(0xeeeeee);
        g.moveTo(bcx + 1, bcy + 2);
        g.lineTo(bcx + 1.5, bcy + 4.5);
        g.lineTo(bcx + 0.5, bcy + 2);
        g.fill(0xeeeeee);
        break;
      }

      case EnemyType.BOMBER: {
        // --- Round armored bomber ---
        const bbcx = ecx;
        const bbcy = ecy + 2;
        const radius = ew / 2;

        // Stubby legs
        g.roundRect(bbcx - 5, bbcy + radius - 2, 4, 5, 1).fill(0x333333);
        g.roundRect(bbcx + 1, bbcy + radius - 2, 4, 5, 1).fill(0x333333);
        // Boots
        g.roundRect(bbcx - 6, bbcy + radius + 3, 6, 2, 0.5).fill(0x222222);
        g.roundRect(bbcx, bbcy + radius + 3, 6, 2, 0.5).fill(0x222222);

        // Round armored body
        g.circle(bbcx, bbcy, radius).fill(0x444444);
        // Body highlight (top)
        g.circle(bbcx - 1, bbcy - 2, radius * 0.7).fill({ color: 0x555555, alpha: 0.5 });
        // Armor plate rim
        g.circle(bbcx, bbcy, radius).stroke({ color: 0x555555, width: 1.5 });

        // Rivets around body (8 rivets)
        for (let ri = 0; ri < 8; ri++) {
          const angle = (ri / 8) * Math.PI * 2 - Math.PI / 2;
          const rivX = bbcx + Math.cos(angle) * (radius - 2);
          const rivY = bbcy + Math.sin(angle) * (radius - 2);
          g.circle(rivX, rivY, 1).fill(0x666666);
          g.circle(rivX - 0.3, rivY - 0.3, 0.4).fill(0x777777);
        }

        // Stubby arms
        g.roundRect(bbcx - radius - 3, bbcy - 1, 4, 6, 1).fill(0x3a3a3a);
        g.roundRect(bbcx + radius - 1, bbcy - 1, 4, 6, 1).fill(0x3a3a3a);
        // Hands (small circles)
        g.circle(bbcx - radius - 1, bbcy + 5, 2).fill(0x333333);
        g.circle(bbcx + radius + 1, bbcy + 5, 2).fill(0x333333);

        // Angry expression - angled eye rects
        // Left eye (angled inward-down for anger)
        g.moveTo(bbcx - 5, bbcy - 4);
        g.lineTo(bbcx - 1, bbcy - 2);
        g.lineTo(bbcx - 1, bbcy);
        g.lineTo(bbcx - 5, bbcy - 1);
        g.closePath();
        g.fill(0xffffff);
        // Left pupil
        g.circle(bbcx - 3, bbcy - 2, 1).fill(0x111111);
        // Right eye (angled inward-down)
        g.moveTo(bbcx + 5, bbcy - 4);
        g.lineTo(bbcx + 1, bbcy - 2);
        g.lineTo(bbcx + 1, bbcy);
        g.lineTo(bbcx + 5, bbcy - 1);
        g.closePath();
        g.fill(0xffffff);
        // Right pupil
        g.circle(bbcx + 3, bbcy - 2, 1).fill(0x111111);
        // Angry mouth
        g.moveTo(bbcx - 3, bbcy + 3);
        g.lineTo(bbcx, bbcy + 2);
        g.lineTo(bbcx + 3, bbcy + 3);
        g.stroke({ color: 0x222222, width: 1.5 });

        // Fuse coil (zigzag/spiral from top)
        const fuseBaseX = bbcx;
        const fuseBaseY = bbcy - radius;
        g.moveTo(fuseBaseX, fuseBaseY);
        g.lineTo(fuseBaseX + 2, fuseBaseY - 3);
        g.lineTo(fuseBaseX - 1, fuseBaseY - 5);
        g.lineTo(fuseBaseX + 3, fuseBaseY - 7);
        g.lineTo(fuseBaseX, fuseBaseY - 9);
        g.lineTo(fuseBaseX + 2, fuseBaseY - 11);
        g.stroke({ color: 0xaa6600, width: 1.5 });
        // Fuse spark at tip (bright animated)
        const sparkX = fuseBaseX + 2;
        const sparkY = fuseBaseY - 11;
        g.circle(sparkX, sparkY, 2.5).fill({ color: 0xffdd00, alpha: 0.9 });
        g.circle(sparkX, sparkY, 1.2).fill({ color: 0xffffff, alpha: 0.95 });
        // Spark glow
        g.circle(sparkX, sparkY, 5).fill({ color: 0xffaa00, alpha: 0.15 });
        break;
      }
    }

    this._entityLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Pickups
  // ---------------------------------------------------------------------------

  private _drawPickup(pk: Pickup, camY: number): void {
    const g = new Graphics();
    const sx = pk.x;
    const sy = pk.y - camY + Math.sin(pk.bobPhase) * 3;
    const pulse = 0.85 + Math.sin(pk.bobPhase * 2) * 0.15; // pulsing glow

    switch (pk.type) {
      case PickupType.COIN:
        // Glowing gold coin
        g.circle(sx, sy, 10).fill({ color: 0xffd700, alpha: 0.08 * pulse }); // outer glow
        g.circle(sx, sy, 7).fill({ color: 0xffd700, alpha: 0.12 * pulse }); // mid glow
        g.circle(sx, sy, 5.5).fill(0xeebb00); // coin body
        g.circle(sx, sy, 5.5).stroke({ color: 0xffd700, width: 1 });
        // Inner ring
        g.circle(sx, sy, 3.5).stroke({ color: 0xffee88, width: 0.6, alpha: 0.5 });
        // Dollar/cross mark
        g.rect(sx - 0.5, sy - 3, 1, 6).fill({ color: 0xffee88, alpha: 0.4 });
        g.rect(sx - 2.5, sy - 0.5, 5, 1).fill({ color: 0xffee88, alpha: 0.4 });
        // Shine
        g.circle(sx - 2, sy - 2, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
        break;

      case PickupType.HEART:
        // Glowing red heart (bezier)
        g.circle(sx, sy, 10).fill({ color: 0xff2222, alpha: 0.06 * pulse });
        g.moveTo(sx, sy + 5);
        g.quadraticCurveTo(sx - 8, sy + 1, sx - 7, sy - 3);
        g.quadraticCurveTo(sx - 5, sy - 7, sx, sy - 3);
        g.quadraticCurveTo(sx + 5, sy - 7, sx + 7, sy - 3);
        g.quadraticCurveTo(sx + 8, sy + 1, sx, sy + 5);
        g.closePath();
        g.fill(0xee2222);
        g.stroke({ color: 0xff4444, width: 0.8 });
        // Shine
        g.moveTo(sx - 2, sy - 2);
        g.quadraticCurveTo(sx - 4, sy - 5, sx - 5, sy - 2);
        g.stroke({ color: 0xff8888, width: 1, alpha: 0.5 });
        break;

      case PickupType.DOUBLE_JUMP:
        // Blue orb with double arrows
        g.circle(sx, sy, 9).fill({ color: 0x4488ff, alpha: 0.08 * pulse });
        g.circle(sx, sy, 6).fill(0x5599ee);
        g.circle(sx, sy, 6).stroke({ color: 0x88ccff, width: 1 });
        g.moveTo(sx, sy - 4).lineTo(sx - 3, sy - 1).lineTo(sx + 3, sy - 1).closePath().fill(0xffffff);
        g.moveTo(sx, sy + 0).lineTo(sx - 3, sy + 3).lineTo(sx + 3, sy + 3).closePath().fill({ color: 0xffffff, alpha: 0.6 });
        break;

      case PickupType.SHIELD:
        // Cyan orb with shield shape
        g.circle(sx, sy, 9).fill({ color: 0x44ddff, alpha: 0.08 * pulse });
        g.circle(sx, sy, 6).fill(0x33bbdd);
        g.circle(sx, sy, 6).stroke({ color: 0x66eeff, width: 1 });
        // Kite shield
        g.moveTo(sx, sy - 4).lineTo(sx + 3.5, sy - 2).lineTo(sx + 3, sy + 2).lineTo(sx, sy + 5).lineTo(sx - 3, sy + 2).lineTo(sx - 3.5, sy - 2).closePath();
        g.fill({ color: 0xffffff, alpha: 0.4 });
        g.stroke({ color: 0xffffff, width: 0.8 });
        break;

      case PickupType.SPEED:
        // Orange orb with lightning bolt
        g.circle(sx, sy, 9).fill({ color: 0xffaa00, alpha: 0.08 * pulse });
        g.circle(sx, sy, 6).fill(0xee8800);
        g.circle(sx, sy, 6).stroke({ color: 0xffbb44, width: 1 });
        g.moveTo(sx + 1, sy - 4).lineTo(sx - 2, sy - 0.5).lineTo(sx + 1, sy - 0.5).lineTo(sx - 1, sy + 4).stroke({ color: 0xffffff, width: 1.8 });
        break;

      case PickupType.MAGNET:
        // Purple orb with U-magnet
        g.circle(sx, sy, 9).fill({ color: 0xcc44cc, alpha: 0.08 * pulse });
        g.circle(sx, sy, 6).fill(0xaa33aa);
        g.circle(sx, sy, 6).stroke({ color: 0xdd66dd, width: 1 });
        g.moveTo(sx - 3, sy - 3).lineTo(sx - 3, sy + 1).bezierCurveTo(sx - 3, sy + 4, sx + 3, sy + 4, sx + 3, sy + 1).lineTo(sx + 3, sy - 3);
        g.stroke({ color: 0xffffff, width: 1.8 });
        // Red/blue poles
        g.rect(sx - 4, sy - 4, 2.5, 3).fill({ color: 0xff4444, alpha: 0.6 });
        g.rect(sx + 1.5, sy - 4, 2.5, 3).fill({ color: 0x4444ff, alpha: 0.6 });
        break;
    }

    this._entityLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // Projectiles
  // ---------------------------------------------------------------------------

  private _drawProjectile(proj: Projectile, camY: number): void {
    const g = new Graphics();
    const sx = proj.x;
    const sy = proj.y - camY;

    if (proj.fromPlayer) {
      // Player projectile — glowing energy bolt with trail
      g.circle(sx, sy, 5).fill({ color: 0x44ffff, alpha: 0.12 });
      g.circle(sx, sy, 3).fill({ color: 0x66ffff, alpha: 0.2 });
      g.ellipse(sx, sy, 4, 1.5).fill(0x44ddff);
      g.ellipse(sx, sy, 2, 1).fill({ color: 0xffffff, alpha: 0.7 });
      const tdx = proj.vx > 0 ? -1 : 1;
      g.ellipse(sx + tdx * 4, sy, 3, 1).fill({ color: 0x44ffff, alpha: 0.15 });
      g.ellipse(sx + tdx * 7, sy, 2, 0.8).fill({ color: 0x44ffff, alpha: 0.08 });
    } else if (Math.abs(proj.vy) > Math.abs(proj.vx)) {
      // Bomb — iron ball with rivets + coiled fuse + spark
      g.circle(sx, sy, 6).fill(0x333344);
      g.circle(sx, sy, 6).stroke({ color: 0x555566, width: 1 });
      g.arc(sx, sy, 5, -2.2, -1.2).stroke({ color: 0x666677, width: 1, alpha: 0.4 });
      for (let rv = 0; rv < 4; rv++) {
        const ra = (rv / 4) * Math.PI * 2;
        g.circle(sx + Math.cos(ra) * 4, sy + Math.sin(ra) * 4, 1).fill(0x777788);
      }
      g.moveTo(sx, sy - 6);
      g.quadraticCurveTo(sx + 3, sy - 9, sx + 1, sy - 11);
      g.quadraticCurveTo(sx - 2, sy - 13, sx + 2, sy - 14);
      g.stroke({ color: 0x886644, width: 1.5 });
      g.circle(sx + 2, sy - 14, 3).fill({ color: 0xffaa00, alpha: 0.6 });
      g.circle(sx + 2, sy - 14, 2).fill({ color: 0xffee44, alpha: 0.8 });
      g.circle(sx + 2, sy - 14, 5).fill({ color: 0xff8800, alpha: 0.1 });
    } else {
      // Arrow — shaft + fletching + metallic arrowhead
      const dir = proj.vx > 0 ? 1 : -1;
      g.rect(sx - 6 * dir, sy - 0.8, 12, 1.6).fill(0x8b6914);
      const fx = sx - 5 * dir;
      g.moveTo(fx, sy - 3).lineTo(fx - 3 * dir, sy).lineTo(fx, sy - 0.5).fill({ color: 0xcc4444, alpha: 0.7 });
      g.moveTo(fx, sy + 3).lineTo(fx - 3 * dir, sy).lineTo(fx, sy + 0.5).fill({ color: 0xcc4444, alpha: 0.7 });
      g.moveTo(sx + 6 * dir, sy - 3).lineTo(sx + 10 * dir, sy).lineTo(sx + 6 * dir, sy + 3).closePath().fill(0xbbbbcc);
      g.moveTo(sx + 6 * dir, sy - 3).lineTo(sx + 10 * dir, sy).lineTo(sx + 6 * dir, sy + 3).stroke({ color: 0xddddee, width: 0.5 });
    }

    this._entityLayer.addChild(g);
  }

  // ---------------------------------------------------------------------------
  // HUD
  // ---------------------------------------------------------------------------

  private _updateHUD(state: AscentState): void {
    this._scoreText.text = `Score: ${state.player.score}`;
    this._scoreText.x = this._sw - 10;

    const meta = loadAscentMeta();
    const pastBest = state.floor > meta.bestFloor && meta.bestFloor > 0;
    this._floorText.text = pastBest ? `Floor ${state.floor} ★ NEW BEST` : `Floor ${state.floor}`;
    this._floorText.style.fill = pastBest ? 0xffd700 : 0xffffff;
    this._floorText.x = this._sw / 2;

    const zoneIdx = Math.min(Math.floor(state.floor / B.ZONE_FLOORS), B.ZONES.length - 1);
    this._zoneText.text = B.ZONES[zoneIdx].name;
    this._zoneText.x = this._sw / 2;

    this._coinText.text = `Coins: ${state.player.coins}`;
    this._coinText.x = this._sw - 10;

    // HP hearts (bezier heart shapes)
    this._hpContainer.removeChildren();
    const heartG = new Graphics();
    for (let i = 0; i < state.player.maxHp; i++) {
      const hx = i * 22 + 8;
      const hy = 4;
      const filled = i < state.player.hp;
      const color = filled ? 0xcc2222 : 0x333333;
      const hiColor = filled ? 0xff4444 : 0x444444;
      // Proper bezier heart
      heartG.moveTo(hx, hy);
      heartG.quadraticCurveTo(hx - 5, hy - 8, hx - 9, hy - 2);
      heartG.quadraticCurveTo(hx - 10, hy + 4, hx, hy + 9);
      heartG.quadraticCurveTo(hx + 10, hy + 4, hx + 9, hy - 2);
      heartG.quadraticCurveTo(hx + 5, hy - 8, hx, hy);
      heartG.closePath();
      heartG.fill(color);
      // Outline
      heartG.moveTo(hx, hy);
      heartG.quadraticCurveTo(hx - 5, hy - 8, hx - 9, hy - 2);
      heartG.quadraticCurveTo(hx - 10, hy + 4, hx, hy + 9);
      heartG.quadraticCurveTo(hx + 10, hy + 4, hx + 9, hy - 2);
      heartG.quadraticCurveTo(hx + 5, hy - 8, hx, hy);
      heartG.stroke({ color: hiColor, width: 0.8 });
      // Highlight shine on left lobe
      if (filled) {
        heartG.moveTo(hx - 3, hy - 2);
        heartG.quadraticCurveTo(hx - 6, hy - 5, hx - 7, hy - 1);
        heartG.stroke({ color: 0xff8888, width: 1, alpha: 0.5 });
      }
    }
    this._hpContainer.addChild(heartG);

    // Combo indicator (below hearts when active)
    if (state.player.combo > 1) {
      const comboColors = [0xffffff, 0xffee44, 0xff8844, 0xff4444, 0xff22ff];
      const cc = Math.min(state.player.combo - 2, comboColors.length - 1);
      const comboG = new Graphics();
      const comboW = 60;
      comboG.roundRect(4, 18, comboW, 14, 3).fill({ color: 0x000000, alpha: 0.5 });
      comboG.roundRect(4, 18, comboW, 14, 3).stroke({ color: comboColors[cc], width: 0.8, alpha: 0.6 });
      this._hpContainer.addChild(comboG);
      const comboTxt = new Text({
        text: `${state.player.combo}x`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: comboColors[cc], fontWeight: "bold" }),
      });
      comboTxt.position.set(8, 19);
      this._hpContainer.addChild(comboTxt);
      // Timer bar
      const timerFrac = Math.max(0, state.player.comboTimer / 2.0);
      const timerG = new Graphics();
      timerG.roundRect(30, 20, (comboW - 30) * timerFrac, 8, 2).fill({ color: comboColors[cc], alpha: 0.5 });
      this._hpContainer.addChild(timerG);
    }
  }

  // ---------------------------------------------------------------------------
  // Death screen
  // ---------------------------------------------------------------------------

  private _showDeathScreen(state: AscentState): void {
    if (!this._deathBuilt) {
      this._deathOverlay.removeChildren();
      const cx = this._sw / 2;

      // Dark vignette backdrop
      const bg = new Graphics();
      bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.7 });
      // Red tint at edges
      bg.rect(0, 0, this._sw, 40).fill({ color: 0x880000, alpha: 0.15 });
      bg.rect(0, this._sh - 40, this._sw, 40).fill({ color: 0x880000, alpha: 0.15 });
      this._deathOverlay.addChild(bg);

      // Broken sword icon
      const icon = new Graphics();
      const iy = this._sh * 0.18;
      // Lower blade
      icon.rect(cx - 2, iy + 5, 4, 18).fill(0x888899);
      icon.rect(cx - 0.5, iy + 6, 1, 16).fill({ color: 0xffffff, alpha: 0.12 });
      // Crossguard
      icon.moveTo(cx - 8, iy + 22).lineTo(cx - 10, iy + 24).lineTo(cx - 8, iy + 26).lineTo(cx + 8, iy + 26).lineTo(cx + 10, iy + 24).lineTo(cx + 8, iy + 22).closePath().fill(0x8b6914);
      // Grip + pommel
      icon.rect(cx - 1.5, iy + 26, 3, 8).fill(0x5d3a1a);
      icon.circle(cx, iy + 36, 2.5).fill(0x888888);
      // Broken upper blade (tilted)
      icon.moveTo(cx - 1, iy + 3).lineTo(cx + 5, iy - 14).lineTo(cx + 7, iy - 12).lineTo(cx + 3, iy + 3).closePath().fill(0x777788);
      // Jagged break
      icon.moveTo(cx - 2, iy + 5).lineTo(cx, iy + 2).lineTo(cx + 2, iy + 5).stroke({ color: 0x555566, width: 1.5 });
      // Spark
      icon.circle(cx + 1, iy + 3, 2).fill({ color: 0xffaa44, alpha: 0.5 });
      this._deathOverlay.addChild(icon);

      // Skull emblem
      const sk = new Graphics();
      const sky = this._sh * 0.2 - 20;
      sk.circle(cx, sky, 14).fill({ color: 0x444444, alpha: 0.3 });
      sk.circle(cx, sky, 14).stroke({ color: 0x666666, width: 1, alpha: 0.3 });
      // Skull eye sockets
      sk.circle(cx - 4, sky - 2, 3).fill({ color: 0x222222, alpha: 0.4 });
      sk.circle(cx + 4, sky - 2, 3).fill({ color: 0x222222, alpha: 0.4 });
      sk.ellipse(cx, sky + 4, 3, 1.5).fill({ color: 0x222222, alpha: 0.3 });
      this._deathOverlay.addChild(sk);

      let y = this._sh * 0.35;

      const title = new Text({ text: "FALLEN IN BATTLE", style: DEATH_TITLE_STYLE });
      title.anchor.set(0.5, 0.5);
      title.position.set(cx, y);
      this._deathOverlay.addChild(title);
      // Title underline
      const ul = new Graphics();
      ul.moveTo(cx - 100, y + 18).lineTo(cx + 100, y + 18).stroke({ color: 0xff4444, width: 1, alpha: 0.4 });
      this._deathOverlay.addChild(ul);

      y += 50;
      const isNewBest = state.player.score >= state.highScore && state.player.score > 0;
      const scoreLine = new Text({
        text: `Score: ${state.player.score}${isNewBest ? "  NEW BEST!" : ""}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: isNewBest ? 20 : 18, fill: isNewBest ? 0xffd700 : 0xdddddd, fontWeight: "bold" }),
      });
      scoreLine.anchor.set(0.5, 0.5);
      scoreLine.position.set(cx, y);
      this._deathOverlay.addChild(scoreLine);

      y += 28;
      const floorLine = new Text({ text: `Floor: ${state.floor}`, style: DEATH_BODY_STYLE });
      floorLine.anchor.set(0.5, 0.5);
      floorLine.position.set(cx, y);
      this._deathOverlay.addChild(floorLine);

      y += 28;
      const bestLine = new Text({ text: `Best Score: ${state.highScore}`, style: DEATH_BODY_STYLE });
      bestLine.anchor.set(0.5, 0.5);
      bestLine.position.set(cx, y);
      this._deathOverlay.addChild(bestLine);

      y += 28;
      const mins = Math.floor(state.time / 60);
      const secs = Math.floor(state.time % 60);
      const timeStr = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
      const coinLine = new Text({ text: `Time: ${timeStr}  Coins: ${state.player.coins}  Kills: ${state.enemies.filter(e => !e.alive).length}`, style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xaaaaaa }) });
      coinLine.anchor.set(0.5, 0.5);
      coinLine.position.set(cx, y);
      this._deathOverlay.addChild(coinLine);

      // Highest combo
      if (state.player.highestCombo > 1) {
        y += 22;
        const comboColors = [0xffffff, 0xffee44, 0xff8844, 0xff4444, 0xff22ff];
        const cc = Math.min(state.player.highestCombo - 2, comboColors.length - 1);
        const comboLine = new Text({
          text: `Best Combo: ${state.player.highestCombo}x`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: comboColors[cc], fontWeight: "bold" }),
        });
        comboLine.anchor.set(0.5, 0.5);
        comboLine.position.set(cx, y);
        this._deathOverlay.addChild(comboLine);
      }

      // --- SHOP SECTION ---
      y += 35;
      const meta = loadAscentMeta();

      const shopHeader = new Text({ text: `--- SHOP (${meta.totalCoins} coins) ---`, style: SHOP_HEADER_STYLE });
      shopHeader.anchor.set(0.5, 0.5);
      shopHeader.position.set(cx, y);
      this._deathOverlay.addChild(shopHeader);

      const shopItems = [
        { key: "1", name: "Extra HP (+1)", cost: 100, owned: meta.permanentExtraHp >= 2, current: `${meta.permanentExtraHp}/2` },
        { key: "2", name: "Projectile Attack", cost: 200, owned: meta.unlockedProjectile, current: "" },
        { key: "3", name: "Triple Jump", cost: 150, owned: meta.unlockedTripleJump, current: "" },
        { key: "4", name: "Dash", cost: 250, owned: meta.unlockedDash, current: "" },
      ];

      for (const item of shopItems) {
        y += 20;
        let label: string;
        if (item.owned) {
          label = `[${item.key}] ${item.name} — OWNED${item.current ? ` (${item.current})` : ""}`;
        } else {
          const affordable = meta.totalCoins >= item.cost;
          label = `[${item.key}] ${item.name} — ${item.cost} coins${affordable ? "" : " (need more)"}${item.current ? ` (${item.current})` : ""}`;
        }
        const itemText = new Text({
          text: label,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 13,
            fill: item.owned ? 0x88ff88 : meta.totalCoins >= item.cost ? 0xcccccc : 0x777777,
          }),
        });
        itemText.anchor.set(0.5, 0.5);
        itemText.position.set(cx, y);
        this._deathOverlay.addChild(itemText);
      }

      y += 35;
      const prompt = new Text({ text: "PRESS SPACE TO RESTART", style: DEATH_PROMPT_STYLE });
      prompt.anchor.set(0.5, 0.5);
      prompt.position.set(cx, y);
      this._deathOverlay.addChild(prompt);
      // Pulsing prompt
      gsap.to(prompt, { alpha: 0.4, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });

      this._deathBuilt = true;
    }
    this._deathOverlay.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Start screen
  // ---------------------------------------------------------------------------

  private _showStartScreen(_state: AscentState): void {
    if (!this._startBuilt) {
      this._startOverlay.removeChildren();
      const cx = this._sw / 2;

      // Dark backdrop
      const bg = new Graphics();
      bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.8 });
      this._startOverlay.addChild(bg);

      let y = this._sh * 0.2;

      // Title
      const title = new Text({ text: "CAMELOT\nASCENT", style: TITLE_STYLE });
      title.anchor.set(0.5, 0.5);
      title.position.set(cx, y);
      this._startOverlay.addChild(title);

      // Decorative line
      const line = new Graphics();
      line.moveTo(cx - 120, y + 50).lineTo(cx + 120, y + 50).stroke({ color: 0xffd700, width: 1, alpha: 0.5 });
      this._startOverlay.addChild(line);

      y += 80;

      // High score
      const meta = loadAscentMeta();
      const highScoreText = new Text({
        text: `High Score: ${meta.highScore}   Best Floor: ${meta.bestFloor}`,
        style: DEATH_BODY_STYLE,
      });
      highScoreText.anchor.set(0.5, 0.5);
      highScoreText.position.set(cx, y);
      this._startOverlay.addChild(highScoreText);

      y += 28;
      const statsText = new Text({
        text: `Total Coins: ${meta.totalCoins}   Games: ${meta.gamesPlayed}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xaaaaaa }),
      });
      statsText.anchor.set(0.5, 0.5);
      statsText.position.set(cx, y);
      this._startOverlay.addChild(statsText);

      // Unlockable status
      y += 35;
      const unlocks: string[] = [];
      if (meta.unlockedProjectile) unlocks.push("Projectile");
      if (meta.unlockedTripleJump) unlocks.push("Triple Jump");
      if (meta.unlockedDash) unlocks.push("Dash");
      if (meta.permanentExtraHp > 0) unlocks.push(`+${meta.permanentExtraHp} HP`);

      const unlockText = new Text({
        text: unlocks.length > 0 ? `Unlocked: ${unlocks.join(", ")}` : "No upgrades yet",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: unlocks.length > 0 ? 0x88ff88 : 0x666666 }),
      });
      unlockText.anchor.set(0.5, 0.5);
      unlockText.position.set(cx, y);
      this._startOverlay.addChild(unlockText);

      // Controls hint
      y += 40;
      const controls = new Text({
        text: "ARROWS/WASD: Move   SPACE: Jump   X/J: Attack\nSHIFT: Dash   WALL+SPACE: Wall-Jump   ESC: Pause",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x888888, align: "center" }),
      });
      controls.anchor.set(0.5, 0.5);
      controls.position.set(cx, y);
      this._startOverlay.addChild(controls);

      // Start prompt
      y += 50;
      const prompt = new Text({ text: "PRESS SPACE TO START", style: DEATH_PROMPT_STYLE });
      prompt.anchor.set(0.5, 0.5);
      prompt.position.set(cx, y);
      this._startOverlay.addChild(prompt);
      gsap.to(prompt, { alpha: 0.4, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });

      this._startBuilt = true;
    }
    this._startOverlay.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------

  private _showPauseScreen(): void {
    if (!this._pauseBuilt) {
      this._pauseOverlay.removeChildren();
      const cx = this._sw / 2;

      // Semi-transparent backdrop
      const bg = new Graphics();
      bg.rect(0, 0, this._sw, this._sh).fill({ color: 0x000000, alpha: 0.5 });
      this._pauseOverlay.addChild(bg);

      const title = new Text({ text: "PAUSED", style: PAUSE_TITLE_STYLE });
      title.anchor.set(0.5, 0.5);
      title.position.set(cx, this._sh * 0.4);
      this._pauseOverlay.addChild(title);

      const prompt = new Text({ text: "PRESS ESC TO RESUME", style: DEATH_PROMPT_STYLE });
      prompt.anchor.set(0.5, 0.5);
      prompt.position.set(cx, this._sh * 0.55);
      this._pauseOverlay.addChild(prompt);
      gsap.to(prompt, { alpha: 0.4, duration: 0.6, yoyo: true, repeat: -1, ease: "sine.inOut" });

      this._pauseBuilt = true;
    }
    this._pauseOverlay.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Particle / FX Methods
  // ---------------------------------------------------------------------------

  spawnJumpDust(x: number, screenY: number): void {
    for (let i = 0; i < 4; i++) {
      const p = new Graphics();
      p.circle(0, 0, 2 + Math.random() * 2);
      p.fill({ color: 0x999988, alpha: 0.5 });
      p.position.set(x + (Math.random() - 0.5) * 12, screenY);
      this._fxLayer.addChild(p);
      gsap.to(p, { y: screenY + 10 + Math.random() * 8, x: p.x + (Math.random() - 0.5) * 20, alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(p); } });
    }
  }

  spawnLandDust(x: number, screenY: number): void {
    for (let i = 0; i < 6; i++) {
      const p = new Graphics();
      p.circle(0, 0, 1.5 + Math.random() * 2);
      p.fill({ color: 0xaaa999, alpha: 0.4 });
      p.position.set(x + (Math.random() - 0.5) * 16, screenY);
      this._fxLayer.addChild(p);
      gsap.to(p, { y: screenY - 5 - Math.random() * 10, x: p.x + (Math.random() - 0.5) * 30, alpha: 0, duration: 0.35, onComplete: () => { this._fxLayer.removeChild(p); } });
    }
  }

  spawnCoinCollect(x: number, screenY: number, amount: number): void {
    // Sparkles
    for (let i = 0; i < 5; i++) {
      const s = new Graphics();
      s.circle(0, 0, 1.5);
      s.fill({ color: 0xffd700, alpha: 0.8 });
      s.position.set(x, screenY);
      this._fxLayer.addChild(s);
      const angle = (i / 5) * Math.PI * 2;
      gsap.to(s, { x: x + Math.cos(angle) * 15, y: screenY + Math.sin(angle) * 15, alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(s); } });
    }
    // Score popup
    this.spawnScorePopup(x, screenY, `+${amount}`);
  }

  spawnScorePopup(x: number, screenY: number, text: string): void {
    const txt = new Text({ text, style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.7 } }) });
    txt.anchor.set(0.5);
    txt.position.set(x, screenY);
    txt.scale.set(0.5);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.2, y: 1.2, duration: 0.1, ease: "back.out(3)" });
    gsap.to(txt, { y: screenY - 30, alpha: 0, duration: 0.6, delay: 0.15, onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  spawnDamageFlash(): void {
    const flash = new Graphics();
    flash.rect(0, 0, this._sw, this._sh);
    flash.fill({ color: 0xff0000, alpha: 0.2 });
    this._fxLayer.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.25, onComplete: () => { this._fxLayer.removeChild(flash); } });
  }

  spawnScreenShake(): void {
    const orig = { x: this.container.x, y: this.container.y };
    gsap.to(this.container, { x: orig.x + 5, duration: 0.04, yoyo: true, repeat: 4, ease: "none", onComplete: () => { this.container.x = orig.x; this.container.y = orig.y; } });
  }

  spawnDeathExplosion(x: number, screenY: number): void {
    // Ring
    const ring = new Graphics();
    ring.circle(0, 0, 8);
    ring.stroke({ color: 0xff4444, width: 2 });
    ring.position.set(x, screenY);
    this._fxLayer.addChild(ring);
    gsap.to(ring.scale, { x: 5, y: 5, duration: 0.5, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(ring); } });
    // Debris
    for (let i = 0; i < 10; i++) {
      const d = new Graphics();
      d.rect(-2, -2, 4, 4);
      d.fill({ color: [0xff4444, 0xcc2222, 0x884422, 0xffaa44][i % 4] });
      d.position.set(x, screenY);
      this._fxLayer.addChild(d);
      const angle = (i / 10) * Math.PI * 2;
      gsap.to(d, { x: x + Math.cos(angle) * (30 + Math.random() * 30), y: screenY + Math.sin(angle) * (30 + Math.random() * 30) + 20, rotation: Math.random() * 4, alpha: 0, duration: 0.5 + Math.random() * 0.3, onComplete: () => { this._fxLayer.removeChild(d); } });
    }
  }

  spawnEnemyKill(x: number, screenY: number): void {
    this.spawnScorePopup(x, screenY - 10, "+50");
    for (let i = 0; i < 4; i++) {
      const p = new Graphics();
      p.circle(0, 0, 2);
      p.fill({ color: 0xff8844 });
      p.position.set(x, screenY);
      this._fxLayer.addChild(p);
      gsap.to(p, { x: x + (Math.random() - 0.5) * 30, y: screenY - 10 - Math.random() * 15, alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(p); } });
    }
  }

  // ── Boss Victory Celebration ──

  spawnBossVictory(): void {
    const cx = this._sw / 2;
    const cy = 80;

    // Screen flash (white)
    const flash = new Graphics();
    flash.rect(0, 0, this._sw, this._sh).fill({ color: 0xffffff, alpha: 0.3 });
    this._fxLayer.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.5, onComplete: () => { this._fxLayer.removeChild(flash); } });

    // Expanding golden ring
    const ring = new Graphics();
    ring.circle(0, 0, 15).stroke({ color: 0xffd700, width: 3, alpha: 0.8 });
    ring.position.set(cx, cy);
    this._fxLayer.addChild(ring);
    gsap.to(ring.scale, { x: 8, y: 8, duration: 0.6, ease: "power2.out" });
    gsap.to(ring, { alpha: 0, duration: 0.6, onComplete: () => { this._fxLayer.removeChild(ring); } });

    // Second ring (delayed)
    const ring2 = new Graphics();
    ring2.circle(0, 0, 10).stroke({ color: 0xffaa44, width: 2, alpha: 0.6 });
    ring2.position.set(cx, cy);
    this._fxLayer.addChild(ring2);
    gsap.to(ring2.scale, { x: 6, y: 6, duration: 0.5, delay: 0.1, ease: "power2.out" });
    gsap.to(ring2, { alpha: 0, duration: 0.5, delay: 0.1, onComplete: () => { this._fxLayer.removeChild(ring2); } });

    // Firework particles (golden burst)
    for (let i = 0; i < 20; i++) {
      const angle = (i / 20) * Math.PI * 2;
      const speed = 40 + Math.random() * 60;
      const p = new Graphics();
      p.circle(0, 0, 2 + Math.random() * 2);
      p.fill({ color: [0xffd700, 0xffaa44, 0xff8822, 0xffee88][i % 4] });
      p.position.set(cx, cy);
      this._fxLayer.addChild(p);
      gsap.to(p, {
        x: cx + Math.cos(angle) * speed,
        y: cy + Math.sin(angle) * speed + 15,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: "power2.out",
        onComplete: () => { this._fxLayer.removeChild(p); },
      });
    }

    // "BOSS DEFEATED!" text
    const txt = new Text({
      text: "BOSS DEFEATED!",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 4, distance: 2, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(cx, cy + 50);
    txt.scale.set(0.5);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.3, y: 1.3, duration: 0.2, ease: "back.out(3)" });
    gsap.to(txt, { y: cy + 30, alpha: 0, duration: 1.2, delay: 0.5, ease: "power2.out", onComplete: () => { this._fxLayer.removeChild(txt); } });

    // Score popup
    this.spawnScorePopup(cx, cy + 80, "+500");

    // Screen shake
    this.spawnScreenShake();
  }

  // ── Muzzle Flash (projectile fire) ──

  spawnMuzzleFlash(x: number, screenY: number): void {
    // Bright core flash
    const flash = new Graphics();
    flash.circle(0, 0, 6).fill({ color: 0x44ffff, alpha: 0.6 });
    flash.circle(0, 0, 3).fill({ color: 0xffffff, alpha: 0.8 });
    flash.position.set(x, screenY);
    this._fxLayer.addChild(flash);
    gsap.to(flash.scale, { x: 2, y: 2, duration: 0.1, ease: "power2.out" });
    gsap.to(flash, { alpha: 0, duration: 0.15, onComplete: () => { this._fxLayer.removeChild(flash); } });

    // Spark particles
    for (let i = 0; i < 4; i++) {
      const s = new Graphics();
      s.circle(0, 0, 1.5).fill({ color: [0x44ffff, 0x88ffff, 0xffffff][i % 3] });
      s.position.set(x, screenY);
      this._fxLayer.addChild(s);
      const angle = (Math.random() - 0.5) * 1.5 - (x > this._sw / 2 ? 0 : Math.PI);
      gsap.to(s, {
        x: x + Math.cos(angle) * (10 + Math.random() * 15),
        y: screenY + Math.sin(angle) * (10 + Math.random() * 15),
        alpha: 0, duration: 0.2,
        onComplete: () => { this._fxLayer.removeChild(s); },
      });
    }
  }

  // ── Dash Burst (speed lines + flash) ──

  spawnDashBurst(x: number, screenY: number, dir: number): void {
    // Directional speed lines
    for (let i = 0; i < 5; i++) {
      const line = new Graphics();
      const ly = screenY + (i - 2) * 6;
      const lx = x - dir * 8;
      line.moveTo(lx, ly).lineTo(lx - dir * (15 + Math.random() * 15), ly).stroke({ color: 0x88ccff, width: 1.5 + Math.random(), alpha: 0.5 });
      this._fxLayer.addChild(line);
      gsap.to(line, { alpha: 0, duration: 0.25, delay: i * 0.02, onComplete: () => { this._fxLayer.removeChild(line); } });
    }

    // Burst flash at origin
    const burst = new Graphics();
    burst.circle(x, screenY, 8).fill({ color: 0x88ccff, alpha: 0.3 });
    this._fxLayer.addChild(burst);
    gsap.to(burst.scale, { x: 2.5, y: 1.5, duration: 0.15, ease: "power2.out" });
    gsap.to(burst, { alpha: 0, duration: 0.2, onComplete: () => { this._fxLayer.removeChild(burst); } });

    // Afterimage ghost
    const ghost = new Graphics();
    ghost.roundRect(x - 10, screenY - 14, 20, 28, 4).fill({ color: 0x88ccff, alpha: 0.2 });
    this._fxLayer.addChild(ghost);
    gsap.to(ghost, { x: ghost.x - dir * 30, alpha: 0, duration: 0.3, onComplete: () => { this._fxLayer.removeChild(ghost); } });
  }

  // ── Combo Text ──

  spawnComboText(x: number, screenY: number, combo: number): void {
    const colors = [0xffffff, 0xffee44, 0xff8844, 0xff4444, 0xff22ff];
    const color = colors[Math.min(combo - 2, colors.length - 1)];
    const size = Math.min(12 + combo * 2, 28);
    const txt = new Text({
      text: `${combo}x COMBO!`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: size, fill: color, fontWeight: "bold", dropShadow: { color: 0x000000, blur: 3, distance: 1, alpha: 0.8 } }),
    });
    txt.anchor.set(0.5);
    txt.position.set(x, screenY);
    txt.scale.set(0.4);
    this._fxLayer.addChild(txt);
    gsap.to(txt.scale, { x: 1.4, y: 1.4, duration: 0.15, ease: "back.out(3)" });
    gsap.to(txt, { y: screenY - 35, alpha: 0, duration: 0.8, delay: 0.3, ease: "power2.out", onComplete: () => { this._fxLayer.removeChild(txt); } });
  }

  // ── Fall Speed Lines ──

  spawnFallLines(x: number, screenY: number): void {
    for (let i = 0; i < 3; i++) {
      const line = new Graphics();
      const lx = x + (i - 1) * 8 + (Math.random() - 0.5) * 6;
      line.moveTo(lx, screenY - 12).lineTo(lx + (Math.random() - 0.5) * 3, screenY + 12);
      line.stroke({ color: 0xaabbcc, width: 1.2 + Math.random(), alpha: 0.3 });
      this._fxLayer.addChild(line);
      gsap.to(line, { alpha: 0, duration: 0.15, onComplete: () => { this._fxLayer.removeChild(line); } });
    }
  }

  // ---------------------------------------------------------------------------
  // Cleanup
  // ---------------------------------------------------------------------------

  /** Force the death screen to rebuild on next render (e.g. after shop purchase). */
  invalidateDeathScreen(): void {
    this._deathBuilt = false;
  }

  cleanup(): void {
    this.container.removeChildren();
  }
}
