// ---------------------------------------------------------------------------
// Runeblade — PixiJS Renderer
// Top-down melee combat with elemental rune enchantments
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { RBPhase } from "../types";
import type { RBState, RBMeta, RuneType } from "../types";

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}

import { RB, getRBGrade } from "../config/RunebladeBalance";

// Rune color palette
const RUNE_COLORS: Record<RuneType, number> = {
  fire: 0xff6622,
  ice: 0x44ccff,
  lightning: 0xffdd44,
  shadow: 0xaa44ff,
};

const RUNE_NAMES: Record<RuneType, string> = {
  fire: "FIRE",
  ice: "ICE",
  lightning: "BOLT",
  shadow: "VOID",
};

// Text styles — dark medieval theme with warm torchlight feel
const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0xff6622, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x000000, distance: 4, blur: 10, alpha: 0.9 } });
const STYLE_SUBTITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 15, fill: 0xaa7744, fontStyle: "italic", letterSpacing: 3 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xccaa77, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.6 } });
const STYLE_PROMPT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 18, fill: 0xff8844, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_GRADE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 46, fill: 0xff6622, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 4, blur: 6, alpha: 0.8 } });
const STYLE_STAT = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 14, fill: 0xaaaacc, lineHeight: 22 });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x886644, lineHeight: 16 });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0xff8844, fontWeight: "bold", letterSpacing: 6, dropShadow: { color: 0x000000, distance: 3, blur: 5, alpha: 0.6 } });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.9 } });
const STYLE_RUNE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 13, fill: 0xddaa66, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } });

// Helper: draw a tiny star shape
function g_drawStar(g: Graphics, x: number, y: number, size: number, color: number, alpha: number): void {
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    g.moveTo(x, y).lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size)
      .stroke({ color, width: 1, alpha });
  }
  g.circle(x, y, size * 0.4).fill({ color, alpha: alpha * 0.8 });
}

const FLOAT_POOL = 16;

export class RunebladeRenderer {
  readonly container = new Container();
  private _gfx = new Graphics(); private _uiGfx = new Graphics();
  private _hudText = new Text({ text: "", style: STYLE_HUD });
  private _titleText = new Text({ text: "RUNEBLADE", style: STYLE_TITLE });
  private _subtitleText = new Text({ text: "Steel and Sorcery", style: STYLE_SUBTITLE });
  private _controlsText = new Text({ text: "", style: STYLE_CONTROLS });
  private _promptText = new Text({ text: "Press SPACE to begin", style: STYLE_PROMPT });
  private _gradeText = new Text({ text: "", style: STYLE_GRADE });
  private _statText = new Text({ text: "", style: STYLE_STAT });
  private _deathPrompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pauseText = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _runeText = new Text({ text: "", style: STYLE_RUNE });
  private _floatTexts: Text[] = [];
  private _floatContainer = new Container();
  private _sw = 0; private _sh = 0;
  private _shopTexts: Text[] = [];
  private _shardText = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } }) });
  private _shopTitle = new Text({ text: "UPGRADES", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: 0xffaa44, fontWeight: "bold", letterSpacing: 3, dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 } }) });
  private _comboText = new Text({ text: "", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 28, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.8 } }) });
  private _bossAnnounce = new Text({ text: "", style: new TextStyle({ fontFamily: "Georgia, serif", fontSize: 30, fill: 0xff2244, fontWeight: "bold", letterSpacing: 5, dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.9 } }) });

  build(sw: number, sh: number): void {
    this._sw = sw; this._sh = sh;
    this.container.addChild(this._gfx); this.container.addChild(this._uiGfx);
    this.container.addChild(this._floatContainer);
    for (const t of [this._hudText, this._titleText, this._subtitleText, this._controlsText,
      this._promptText, this._gradeText, this._statText, this._deathPrompt, this._pauseText, this._runeText]) {
      this.container.addChild(t);
    }
    this._hudText.position.set(10, 8);
    for (let i = 0; i < 5; i++) {
      const t = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xccaa77, dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } }) });
      this._shopTexts.push(t);
      this.container.addChild(t);
    }
    this.container.addChild(this._shardText);
    this.container.addChild(this._shopTitle);
    this.container.addChild(this._comboText);
    this.container.addChild(this._bossAnnounce);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT });
      t.anchor.set(0.5); t.visible = false;
      this._floatTexts.push(t); this._floatContainer.addChild(t);
    }
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); this._uiGfx.destroy(); }

  // ---------------------------------------------------------------------------
  // Main render
  // ---------------------------------------------------------------------------
  render(state: RBState, sw: number, sh: number, meta: RBMeta): void {
    this._sw = sw; this._sh = sh;
    const g = this._gfx; g.clear(); this._uiGfx.clear();
    let shX = 0, shY = 0;
    if (state.screenShake > 0) { const i = RB.SHAKE_INTENSITY * (state.screenShake / RB.SHAKE_DURATION); shX = (Math.random() - 0.5) * i * 2; shY = (Math.random() - 0.5) * i * 2; }
    g.position.set(shX, shY);

    // Dark stone background
    g.rect(-10, -10, sw + 20, sh + 20).fill(0x0a0908);
    // Warm ambient torchlight wash
    const t = state.time;
    g.circle(sw / 2, sh / 2, sw * 0.45).fill({ color: 0x1a1008, alpha: 0.15 + Math.sin(t * 0.8) * 0.03 });
    g.circle(sw * 0.2, sh * 0.2, 180).fill({ color: 0x180c04, alpha: 0.08 + Math.sin(t * 1.1) * 0.02 });
    g.circle(sw * 0.8, sh * 0.8, 160).fill({ color: 0x180c04, alpha: 0.07 + Math.sin(t * 0.9 + 1) * 0.02 });

    if (state.phase === RBPhase.PLAYING || state.phase === RBPhase.PAUSED) {
      this._drawArena(g, state);
      this._drawBloodStains(g, state);
      this._drawHazards(g, state);
      this._drawFireTrails(g, state);
      this._drawPickups(g, state);
      this._drawLightningChains(g, state);
      this._drawSpawnPortals(g, state);
      this._drawEnemies(g, state);
      this._drawBoss(g, state, sw, sh);
      this._drawPlayer(g, state);
      this._drawRuneAmbient(g, state);
      this._drawSlashes(g, state);
      this._drawSlashGhosts(g, state);
      this._drawProjectiles(g, state);
      this._drawParticles(g, state);
      this._drawShockwaves(g, state);
    }

    // Blood moon red tint overlay
    if (state.bloodMoonActive) {
      const bmPulse = 0.06 + Math.sin(state.time * 1.5) * 0.02;
      g.rect(0, 0, sw, sh).fill({ color: 0xff0000, alpha: bmPulse });
    }

    // Screen flash
    if (state.screenFlashTimer > 0) {
      const flashRatio = state.screenFlashTimer / RB.FLASH_DURATION;
      g.rect(0, 0, sw, sh).fill({ color: state.screenFlashColor, alpha: 0.2 * flashRatio });
      g.circle(sw / 2, sh / 2, Math.max(sw, sh) * (1 - flashRatio) * 0.5)
        .stroke({ color: state.screenFlashColor, width: 3, alpha: flashRatio * 0.15 });
    }

    this._drawFloatTexts(state);
    this._drawHUD(state);
    this._drawStartScreen(state, meta);
    this._drawPauseScreen(state);
    this._drawDeathScreen(state, meta);
    this._drawBossAnnounce(state);
  }

  // ---------------------------------------------------------------------------
  // Arena — dark stone floor with tile grid, rune border, corner braziers
  // ---------------------------------------------------------------------------
  private _drawArena(g: Graphics, state: RBState): void {
    const w = state.arenaW, h = state.arenaH, t = state.time;
    const cx = w / 2, cy = h / 2;
    const left = cx - w / 2, top = cy - h / 2;

    // Stone floor tiles (30px alternating shades)
    const tileSize = 30;
    for (let tx = left; tx < left + w; tx += tileSize) {
      for (let ty = top; ty < top + h; ty += tileSize) {
        const txi = Math.floor((tx - left) / tileSize);
        const tyi = Math.floor((ty - top) / tileSize);
        const shade = (txi + tyi) % 2 === 0 ? 0x1a1816 : 0x141210;
        // Subtle variation per tile
        const variation = ((txi * 73 + tyi * 137) % 5) * 0.003;
        g.rect(tx, ty, tileSize, tileSize).fill({ color: shade, alpha: 0.9 + variation });
        // Tile edge lines for grout
        g.moveTo(tx, ty).lineTo(tx + tileSize, ty).stroke({ color: 0x0a0908, width: 0.5, alpha: 0.3 });
        g.moveTo(tx, ty).lineTo(tx, ty + tileSize).stroke({ color: 0x0a0908, width: 0.5, alpha: 0.3 });
      }
    }

    // Rune-inscribed border — glowing symbols along edges
    const borderGlow = 0.3 + Math.sin(t * 1.5) * 0.1;
    g.rect(left, top, w, h).stroke({ color: 0x443322, width: 3, alpha: borderGlow });
    // Outer glow layers
    g.rect(left - 4, top - 4, w + 8, h + 8).stroke({ color: 0xff6622, width: 1, alpha: borderGlow * 0.15 });
    g.rect(left - 8, top - 8, w + 16, h + 16).stroke({ color: 0xff6622, width: 1, alpha: borderGlow * 0.06 });

    // Rune switch border flash
    if (state.runeSwitchTimer > 0) {
      const switchAlpha = state.runeSwitchTimer / 0.4;
      const switchColor = RUNE_COLORS[state.currentRune];
      g.rect(left - 2, top - 2, w + 4, h + 4).stroke({ color: switchColor, width: 4, alpha: switchAlpha * 0.5 });
      g.rect(left - 6, top - 6, w + 12, h + 12).stroke({ color: switchColor, width: 2, alpha: switchAlpha * 0.25 });
    }

    // Rune symbols along each edge
    const runeSpacing = 40;
    const runeAlpha = 0.12 + Math.sin(t * 0.8) * 0.04;
    // Top and bottom edges
    for (let rx = left + runeSpacing; rx < left + w - runeSpacing / 2; rx += runeSpacing) {
      const runeIdx = Math.floor(rx / runeSpacing) % 4;
      const rc = [0xff6622, 0x44ccff, 0xffdd44, 0xaa44ff][runeIdx];
      const ra = runeAlpha + Math.sin(t * 2 + rx * 0.1) * 0.04;
      // Top edge rune glyph (small diamond)
      this._drawRuneGlyph(g, rx, top - 2, 4, rc, ra, t + rx * 0.05);
      // Bottom edge
      this._drawRuneGlyph(g, rx, top + h + 2, 4, rc, ra, t + rx * 0.05 + 1);
    }
    // Left and right edges
    for (let ry = top + runeSpacing; ry < top + h - runeSpacing / 2; ry += runeSpacing) {
      const runeIdx = Math.floor(ry / runeSpacing) % 4;
      const rc = [0xff6622, 0x44ccff, 0xffdd44, 0xaa44ff][runeIdx];
      const ra = runeAlpha + Math.sin(t * 2 + ry * 0.1) * 0.04;
      this._drawRuneGlyph(g, left - 2, ry, 4, rc, ra, t + ry * 0.05);
      this._drawRuneGlyph(g, left + w + 2, ry, 4, rc, ra, t + ry * 0.05 + 1);
    }

    // Corner braziers — flickering fire at 4 corners
    const corners = [
      [left, top], [left + w, top],
      [left, top + h], [left + w, top + h],
    ];
    for (let ci = 0; ci < corners.length; ci++) {
      const [bx, by] = corners[ci];
      const flicker = Math.sin(t * 8 + ci * 2.5) * 0.15 + Math.sin(t * 13 + ci * 1.7) * 0.08;
      // Brazier base
      g.rect(bx - 6, by - 6, 12, 12).fill({ color: 0x332211, alpha: 0.8 });
      g.rect(bx - 4, by - 4, 8, 8).fill({ color: 0x554433, alpha: 0.6 });
      // Fire glow layers
      g.circle(bx, by, 30).fill({ color: 0xff4400, alpha: 0.04 + flicker * 0.02 });
      g.circle(bx, by, 18).fill({ color: 0xff6622, alpha: 0.08 + flicker * 0.04 });
      g.circle(bx, by, 10).fill({ color: 0xffaa44, alpha: 0.12 + flicker * 0.06 });
      // Fire tongues
      for (let fi = 0; fi < 3; fi++) {
        const fAngle = -Math.PI / 2 + (fi - 1) * 0.4 + Math.sin(t * 6 + ci + fi) * 0.3;
        const fLen = 6 + Math.sin(t * 10 + ci * 3 + fi * 2) * 3;
        g.moveTo(bx, by)
          .lineTo(bx + Math.cos(fAngle) * fLen, by + Math.sin(fAngle) * fLen)
          .stroke({ color: 0xffcc44, width: 2, alpha: 0.5 + flicker });
      }
      // Ember sparks rising from brazier
      for (let ei = 0; ei < 2; ei++) {
        const emberY = by - 8 - ((t * 20 + ci * 17 + ei * 31) % 25);
        const emberX = bx + Math.sin(t * 3 + ci + ei * 5) * 5;
        const emberAlpha = Math.max(0, 0.4 - ((t * 20 + ci * 17 + ei * 31) % 25) * 0.016);
        g.circle(emberX, emberY, 1).fill({ color: 0xff8822, alpha: emberAlpha });
      }
    }

    // Ambient torchlight on floor near corners
    for (const [bx, by] of corners) {
      g.circle(bx, by, 60).fill({ color: 0x221108, alpha: 0.06 + Math.sin(t * 2) * 0.01 });
    }
  }

  // Small rune glyph helper — rotating diamond/cross shape
  private _drawRuneGlyph(g: Graphics, x: number, y: number, size: number, color: number, alpha: number, rot: number): void {
    // Rotating diamond
    for (let v = 0; v < 4; v++) {
      const a1 = rot * 0.3 + v * Math.PI / 2;
      const a2 = rot * 0.3 + (v + 1) * Math.PI / 2;
      g.moveTo(x + Math.cos(a1) * size, y + Math.sin(a1) * size)
        .lineTo(x + Math.cos(a2) * size, y + Math.sin(a2) * size)
        .stroke({ color, width: 0.8, alpha });
    }
    // Center dot glow
    g.circle(x, y, size * 0.35).fill({ color, alpha: alpha * 0.6 });
  }

  // ---------------------------------------------------------------------------
  // Player — armored circle with glowing rune sword
  // ---------------------------------------------------------------------------
  private _drawPlayer(g: Graphics, state: RBState): void {
    const px = state.playerX, py = state.playerY, pr = state.playerRadius, t = state.time;
    const aimAngle = state.aimAngle;
    const runeColor = RUNE_COLORS[state.currentRune];

    // Dodge trail
    if (state.dodging) {
      for (let tr = 0; tr < 5; tr++) {
        const trailDist = tr * 6;
        const tx = px - Math.cos(aimAngle) * trailDist;
        const ty = py - Math.sin(aimAngle) * trailDist;
        const trAlpha = (1 - tr / 5) * 0.15;
        g.circle(tx, ty, pr * (1 - tr * 0.12)).fill({ color: runeColor, alpha: trAlpha });
      }
    }

    // Invulnerability flash
    const invFlash = state.invulnTimer > 0 && Math.sin(t * 20) > 0;

    // Player shadow
    g.ellipse(px + 2, py + 4, pr * 1.1, pr * 0.5).fill({ color: 0x000000, alpha: 0.25 });

    // Armor body — layered circle with metal tones
    const bodyAlpha = invFlash ? 0.4 : 0.9;
    g.circle(px, py, pr + 2).fill({ color: 0x222222, alpha: bodyAlpha * 0.5 }); // outer rim
    g.circle(px, py, pr).fill({ color: 0x444444, alpha: bodyAlpha });
    g.circle(px, py, pr * 0.75).fill({ color: 0x555555, alpha: bodyAlpha });
    // Armor highlight
    g.circle(px - pr * 0.2, py - pr * 0.25, pr * 0.35).fill({ color: 0x777777, alpha: bodyAlpha * 0.3 });
    // Facing indicator (visor slit)
    const visorX = px + Math.cos(aimAngle) * pr * 0.4;
    const visorY = py + Math.sin(aimAngle) * pr * 0.4;
    g.circle(visorX, visorY, 2).fill({ color: runeColor, alpha: bodyAlpha * 0.8 });

    // Rune glow aura around player
    g.circle(px, py, pr + 8).fill({ color: runeColor, alpha: 0.04 + Math.sin(t * 2) * 0.015 });
    g.circle(px, py, pr + 4).fill({ color: runeColor, alpha: 0.06 + Math.sin(t * 3) * 0.02 });

    // Glowing rune sword extending from player in aim direction
    const swordLen = pr * 2.8;
    const swordBaseX = px + Math.cos(aimAngle) * pr * 0.6;
    const swordBaseY = py + Math.sin(aimAngle) * pr * 0.6;
    const swordTipX = px + Math.cos(aimAngle) * (pr + swordLen);
    const swordTipY = py + Math.sin(aimAngle) * (pr + swordLen);

    // Sword glow trail (wide, faint)
    g.moveTo(swordBaseX, swordBaseY).lineTo(swordTipX, swordTipY)
      .stroke({ color: runeColor, width: 8, alpha: 0.06 + Math.sin(t * 4) * 0.02 });
    g.moveTo(swordBaseX, swordBaseY).lineTo(swordTipX, swordTipY)
      .stroke({ color: runeColor, width: 4, alpha: 0.15 + Math.sin(t * 4) * 0.05 });
    // Sword blade (bright core)
    g.moveTo(swordBaseX, swordBaseY).lineTo(swordTipX, swordTipY)
      .stroke({ color: 0xcccccc, width: 2, alpha: 0.7 });
    g.moveTo(swordBaseX, swordBaseY).lineTo(swordTipX, swordTipY)
      .stroke({ color: runeColor, width: 1.5, alpha: 0.9 });

    // Sword tip glow
    g.circle(swordTipX, swordTipY, 4).fill({ color: runeColor, alpha: 0.2 + Math.sin(t * 5) * 0.08 });
    g.circle(swordTipX, swordTipY, 2).fill({ color: 0xffffff, alpha: 0.3 });

    // Sword crossguard
    const crossPerp = aimAngle + Math.PI / 2;
    const crossLen = 5;
    const crossX = swordBaseX + Math.cos(aimAngle) * 2;
    const crossY = swordBaseY + Math.sin(aimAngle) * 2;
    g.moveTo(crossX + Math.cos(crossPerp) * crossLen, crossY + Math.sin(crossPerp) * crossLen)
      .lineTo(crossX - Math.cos(crossPerp) * crossLen, crossY - Math.sin(crossPerp) * crossLen)
      .stroke({ color: 0xaa8844, width: 2, alpha: 0.8 });

    // Rune energy particles orbiting sword
    for (let rp = 0; rp < 3; rp++) {
      const rpAngle = t * 4 + rp * Math.PI * 2 / 3;
      const rpDist = 3 + Math.sin(t * 6 + rp) * 1.5;
      const rpProgress = 0.3 + rp * 0.25;
      const rpBaseX = swordBaseX + (swordTipX - swordBaseX) * rpProgress;
      const rpBaseY = swordBaseY + (swordTipY - swordBaseY) * rpProgress;
      const rpx = rpBaseX + Math.cos(rpAngle) * rpDist;
      const rpy = rpBaseY + Math.sin(rpAngle) * rpDist;
      g.circle(rpx, rpy, 1.2).fill({ color: runeColor, alpha: 0.4 + Math.sin(t * 8 + rp) * 0.15 });
    }

    // HP bar below player
    const barW = pr * 2.5, barH = 3;
    const barX = px - barW / 2, barY = py + pr + 8;
    g.rect(barX, barY, barW, barH).fill({ color: 0x000000, alpha: 0.6 });
    const hpRatio = Math.max(0, state.playerHP / state.maxHP);
    const hpColor = hpRatio > 0.5 ? 0x44cc44 : hpRatio > 0.25 ? 0xccaa22 : 0xcc2222;
    g.rect(barX, barY, barW * hpRatio, barH).fill({ color: hpColor, alpha: 0.8 });
  }

  // ---------------------------------------------------------------------------
  // Slashes — arc-shaped effects in rune colors
  // ---------------------------------------------------------------------------
  private _drawSlashes(g: Graphics, state: RBState): void {
    for (const slash of state.slashes) {
      const rc = RUNE_COLORS[slash.rune];
      const progress = slash.life / slash.maxLife;
      const arcAlpha = progress * 0.7;
      const arcRadius = slash.radius;
      const arc = Math.PI / 2; // default 90-degree arc sweep
      const startAngle = slash.angle - arc / 2;
      const endAngle = slash.angle + arc / 2;

      // Outer glow arc
      const segments = 16;
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (endAngle - startAngle) * (i / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
        g.moveTo(slash.x + Math.cos(a1) * (arcRadius - 6), slash.y + Math.sin(a1) * (arcRadius - 6))
          .lineTo(slash.x + Math.cos(a2) * (arcRadius - 6), slash.y + Math.sin(a2) * (arcRadius - 6))
          .stroke({ color: rc, width: 14, alpha: arcAlpha * 0.1 });
      }

      // Main arc
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (endAngle - startAngle) * (i / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
        g.moveTo(slash.x + Math.cos(a1) * arcRadius, slash.y + Math.sin(a1) * arcRadius)
          .lineTo(slash.x + Math.cos(a2) * arcRadius, slash.y + Math.sin(a2) * arcRadius)
          .stroke({ color: rc, width: 4, alpha: arcAlpha * 0.8 });
        // Bright inner edge
        g.moveTo(slash.x + Math.cos(a1) * (arcRadius * 0.85), slash.y + Math.sin(a1) * (arcRadius * 0.85))
          .lineTo(slash.x + Math.cos(a2) * (arcRadius * 0.85), slash.y + Math.sin(a2) * (arcRadius * 0.85))
          .stroke({ color: 0xffffff, width: 1.5, alpha: arcAlpha * 0.4 });
      }

      // Rune-specific slash embellishments
      const t = state.time;
      if (slash.rune === "fire") {
        // Ember particles along arc
        for (let ei = 0; ei < 6; ei++) {
          const ea = startAngle + (endAngle - startAngle) * (ei / 6);
          const er = arcRadius + (Math.random() - 0.5) * 10;
          const ex = slash.x + Math.cos(ea) * er + Math.sin(t * 12 + ei) * 3;
          const ey = slash.y + Math.sin(ea) * er + Math.cos(t * 10 + ei * 2) * 3;
          g.circle(ex, ey, 1.5 + Math.random()).fill({ color: 0xffaa22, alpha: arcAlpha * 0.6 });
        }
      } else if (slash.rune === "ice") {
        // Crystal shard lines radiating outward
        for (let ci = 0; ci < 5; ci++) {
          const ca = startAngle + (endAngle - startAngle) * ((ci + 0.5) / 5);
          const innerR = arcRadius * 0.7;
          const outerR = arcRadius * 1.15;
          g.moveTo(slash.x + Math.cos(ca) * innerR, slash.y + Math.sin(ca) * innerR)
            .lineTo(slash.x + Math.cos(ca + 0.05) * outerR, slash.y + Math.sin(ca + 0.05) * outerR)
            .stroke({ color: 0xaaeeff, width: 1.5, alpha: arcAlpha * 0.5 });
        }
      } else if (slash.rune === "lightning") {
        // Electric sparks — jagged lines along arc
        for (let li = 0; li < 4; li++) {
          const la = startAngle + (endAngle - startAngle) * (li / 4);
          const la2 = startAngle + (endAngle - startAngle) * ((li + 1) / 4);
          const midA = (la + la2) / 2;
          const jitter = (Math.sin(t * 20 + li * 7) * 8);
          g.moveTo(slash.x + Math.cos(la) * arcRadius, slash.y + Math.sin(la) * arcRadius)
            .lineTo(slash.x + Math.cos(midA) * (arcRadius + jitter), slash.y + Math.sin(midA) * (arcRadius + jitter))
            .lineTo(slash.x + Math.cos(la2) * arcRadius, slash.y + Math.sin(la2) * arcRadius)
            .stroke({ color: 0xffffff, width: 1, alpha: arcAlpha * 0.6 });
        }
      } else if (slash.rune === "shadow") {
        // Dark wisps — fading trails inside the arc
        for (let si = 0; si < 5; si++) {
          const sa = startAngle + (endAngle - startAngle) * (si / 5);
          const wispR = arcRadius * (0.6 + Math.sin(t * 5 + si) * 0.2);
          g.circle(slash.x + Math.cos(sa) * wispR, slash.y + Math.sin(sa) * wispR, 4)
            .fill({ color: 0x220044, alpha: arcAlpha * 0.3 });
          g.circle(slash.x + Math.cos(sa) * wispR, slash.y + Math.sin(sa) * wispR, 2)
            .fill({ color: 0xaa44ff, alpha: arcAlpha * 0.2 });
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Enemies — type-specific shapes with HP bars and status effects
  // ---------------------------------------------------------------------------
  private _drawEnemies(g: Graphics, state: RBState): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive) continue;
      const flash = e.flashTimer > 0 && Math.sin(t * 30) > 0;
      const baseColor = flash ? 0xffffff : this._getEnemyColor(e.kind);
      const alpha = flash ? 1 : 0.85;

      // Shadow
      g.ellipse(e.x + 2, e.y + 3, e.radius * 1.1, e.radius * 0.4).fill({ color: 0x000000, alpha: 0.2 });

      if (e.kind === "skeleton") {
        // Bone-white simple humanoid circle with sword indicator
        g.circle(e.x, e.y, e.radius).fill({ color: baseColor, alpha });
        g.circle(e.x, e.y, e.radius * 0.65).fill({ color: 0xccbbaa, alpha: alpha * 0.6 });
        // Eye sockets
        g.circle(e.x - 2, e.y - 2, 1.5).fill({ color: 0x220000, alpha: 0.8 });
        g.circle(e.x + 2, e.y - 2, 1.5).fill({ color: 0x220000, alpha: 0.8 });
        // Sword
        const sAngle = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        g.moveTo(e.x + Math.cos(sAngle) * e.radius, e.y + Math.sin(sAngle) * e.radius)
          .lineTo(e.x + Math.cos(sAngle) * (e.radius + 10), e.y + Math.sin(sAngle) * (e.radius + 10))
          .stroke({ color: 0xaaaaaa, width: 2, alpha: 0.7 });
      } else if (e.kind === "archer") {
        // Brown triangle with bow indicator
        const aAngle = Math.atan2(state.playerY - e.y, state.playerX - e.x);
        for (let v = 0; v < 3; v++) {
          const a1 = aAngle + v * Math.PI * 2 / 3 - Math.PI / 2;
          const a2 = aAngle + ((v + 1) % 3) * Math.PI * 2 / 3 - Math.PI / 2;
          g.moveTo(e.x + Math.cos(a1) * e.radius, e.y + Math.sin(a1) * e.radius)
            .lineTo(e.x + Math.cos(a2) * e.radius, e.y + Math.sin(a2) * e.radius);
        }
        g.closePath().fill({ color: baseColor, alpha });
        // Bow arc
        const bowStart = aAngle - 0.6;
        const bowEnd = aAngle + 0.6;
        for (let bi = 0; bi < 6; bi++) {
          const ba1 = bowStart + (bowEnd - bowStart) * (bi / 6);
          const ba2 = bowStart + (bowEnd - bowStart) * ((bi + 1) / 6);
          g.moveTo(e.x + Math.cos(ba1) * (e.radius + 5), e.y + Math.sin(ba1) * (e.radius + 5))
            .lineTo(e.x + Math.cos(ba2) * (e.radius + 5), e.y + Math.sin(ba2) * (e.radius + 5))
            .stroke({ color: 0x886633, width: 1.5, alpha: 0.7 });
        }
      } else if (e.kind === "knight") {
        // Large dark armored hexagon
        for (let v = 0; v < 6; v++) {
          const a1 = v * Math.PI / 3;
          const a2 = ((v + 1) % 6) * Math.PI / 3;
          g.moveTo(e.x + Math.cos(a1) * e.radius, e.y + Math.sin(a1) * e.radius)
            .lineTo(e.x + Math.cos(a2) * e.radius, e.y + Math.sin(a2) * e.radius);
        }
        g.closePath().fill({ color: baseColor, alpha });
        // Inner armor plate
        for (let v = 0; v < 6; v++) {
          const a1 = v * Math.PI / 3;
          const a2 = ((v + 1) % 6) * Math.PI / 3;
          g.moveTo(e.x + Math.cos(a1) * e.radius * 0.65, e.y + Math.sin(a1) * e.radius * 0.65)
            .lineTo(e.x + Math.cos(a2) * e.radius * 0.65, e.y + Math.sin(a2) * e.radius * 0.65);
        }
        g.closePath().fill({ color: 0x333344, alpha: alpha * 0.7 });
        // Shield emblem glow
        g.circle(e.x, e.y, 3).fill({ color: 0xff2222, alpha: 0.4 + Math.sin(t * 2) * 0.15 });
      } else if (e.kind === "wraith") {
        // Translucent purple ghost shape with phasing effect
        const phase = Math.sin(t * 3 + e.x * 0.1) * 0.15;
        const wraithAlpha = alpha * (0.5 + phase);
        // Ethereal body — wavy circle
        g.circle(e.x, e.y, e.radius * 1.2).fill({ color: 0x220044, alpha: wraithAlpha * 0.3 });
        g.circle(e.x, e.y, e.radius).fill({ color: baseColor, alpha: wraithAlpha });
        // Wispy tendrils below
        for (let wi = 0; wi < 4; wi++) {
          const wAngle = wi * Math.PI / 2 + t * 1.5;
          const wLen = e.radius * 1.4 + Math.sin(t * 4 + wi * 2) * 4;
          g.moveTo(e.x, e.y + e.radius * 0.3)
            .lineTo(e.x + Math.cos(wAngle) * 4, e.y + wLen)
            .stroke({ color: 0x8844cc, width: 1.5, alpha: wraithAlpha * 0.4 });
        }
        // Glowing eyes
        g.circle(e.x - 3, e.y - 2, 1.5).fill({ color: 0xff44ff, alpha: wraithAlpha * 0.9 });
        g.circle(e.x + 3, e.y - 2, 1.5).fill({ color: 0xff44ff, alpha: wraithAlpha * 0.9 });
      } else if (e.kind === "necromancer") {
        // Hooded figure — dark green circle with inner darker circle
        g.circle(e.x, e.y, e.radius + 2).fill({ color: 0x225533, alpha: alpha * 0.4 }); // outer glow
        g.circle(e.x, e.y, e.radius).fill({ color: baseColor, alpha });
        g.circle(e.x, e.y, e.radius * 0.6).fill({ color: 0x224422, alpha: alpha * 0.8 });
        // Hood shape (darker top half)
        g.circle(e.x, e.y - 2, e.radius * 0.85).fill({ color: 0x1a331a, alpha: alpha * 0.5 });
        // Eyes — eerie green glow
        g.circle(e.x - 2, e.y - 1, 1.2).fill({ color: 0x88ff88, alpha: alpha * 0.9 });
        g.circle(e.x + 2, e.y - 1, 1.2).fill({ color: 0x88ff88, alpha: alpha * 0.9 });
        // Raised staff on top
        const staffX = e.x + 4;
        g.moveTo(staffX, e.y + e.radius * 0.5).lineTo(staffX, e.y - e.radius - 10)
          .stroke({ color: 0x664422, width: 2, alpha: 0.8 });
        // Staff orb
        g.circle(staffX, e.y - e.radius - 12, 3).fill({ color: 0x44ff66, alpha: 0.6 + Math.sin(t * 4) * 0.2 });
        g.circle(staffX, e.y - e.radius - 12, 5).fill({ color: 0x44ff66, alpha: 0.1 + Math.sin(t * 4) * 0.05 });
        // Green glow particles orbiting
        for (let oi = 0; oi < 3; oi++) {
          const oAngle = t * 2.5 + oi * Math.PI * 2 / 3;
          const oDist = e.radius + 4 + Math.sin(t * 3 + oi) * 2;
          const ox = e.x + Math.cos(oAngle) * oDist;
          const oy = e.y + Math.sin(oAngle) * oDist;
          g.circle(ox, oy, 1.5).fill({ color: 0x66ff88, alpha: 0.4 + Math.sin(t * 5 + oi * 2) * 0.15 });
        }
        // Summoning pulse when stateTimer is low (about to summon)
        if (e.stateTimer < 1.0) {
          const pulseAlpha = (1.0 - e.stateTimer) * 0.25;
          const pulseR = e.radius + 8 + (1.0 - e.stateTimer) * 12;
          g.circle(e.x, e.y, pulseR).stroke({ color: 0x44ff66, width: 2, alpha: pulseAlpha });
          g.circle(e.x, e.y, pulseR * 0.7).fill({ color: 0x44ff66, alpha: pulseAlpha * 0.1 });
        }
      }

      // Frozen visual — ice crystal overlay
      if (e.frozenTimer > 0) {
        const frozenAlpha = Math.min(0.6, e.frozenTimer * 0.3);
        g.circle(e.x, e.y, e.radius + 3).fill({ color: 0x44ccff, alpha: frozenAlpha * 0.2 });
        g.circle(e.x, e.y, e.radius + 2).stroke({ color: 0x88eeff, width: 1.5, alpha: frozenAlpha });
        // Ice crystal spikes
        for (let ic = 0; ic < 6; ic++) {
          const icA = ic * Math.PI / 3 + t * 0.2;
          g.moveTo(e.x + Math.cos(icA) * e.radius, e.y + Math.sin(icA) * e.radius)
            .lineTo(e.x + Math.cos(icA) * (e.radius + 6), e.y + Math.sin(icA) * (e.radius + 6))
            .stroke({ color: 0xaaeeff, width: 1, alpha: frozenAlpha * 0.7 });
        }
      }

      // Burn effect — orange particles around burning enemies
      if (e.burnTimer > 0) {
        for (let bi = 0; bi < 4; bi++) {
          const bAngle = t * 5 + bi * Math.PI / 2;
          const bDist = e.radius + 2 + Math.sin(t * 8 + bi * 3) * 3;
          const bx = e.x + Math.cos(bAngle) * bDist;
          const by = e.y + Math.sin(bAngle) * bDist - Math.sin(t * 10 + bi) * 4;
          g.circle(bx, by, 1.5).fill({ color: 0xff6622, alpha: 0.5 + Math.sin(t * 12 + bi) * 0.2 });
        }
        // Flame glow
        g.circle(e.x, e.y, e.radius + 4).fill({ color: 0xff4400, alpha: 0.06 });
      }

      // Elite gold border
      if (e.elite) {
        g.circle(e.x, e.y, e.radius + 3).stroke({ color: 0xffd700, width: 2, alpha: 0.7 + Math.sin(t * 4) * 0.15 });
        g.circle(e.x, e.y, e.radius + 5).fill({ color: 0xffd700, alpha: 0.05 });
      }

      // HP bar
      const barW = e.radius * 2.2, barH = 2.5;
      const barX = e.x - barW / 2, barY = e.y - e.radius - 7;
      g.rect(barX, barY, barW, barH).fill({ color: 0x000000, alpha: 0.5 });
      const ehpRatio = Math.max(0, e.hp / e.maxHp);
      g.rect(barX, barY, barW * ehpRatio, barH).fill({ color: e.elite ? 0xffd700 : 0xcc2222, alpha: 0.7 });
    }
  }

  // ---------------------------------------------------------------------------
  // Arena hazards — environmental obstacles drawn on the floor
  // ---------------------------------------------------------------------------
  private _drawHazards(g: Graphics, state: RBState): void {
    const t = state.time;
    for (const h of state.arenaHazards) {
      switch (h.kind) {
        case "spike_pit": {
          // Dark circular pit
          g.circle(h.x, h.y, h.radius).fill({ color: 0x0a0606, alpha: 0.8 });
          g.circle(h.x, h.y, h.radius * 0.85).fill({ color: 0x1a0a0a, alpha: 0.6 });
          // Sharp triangular spikes around rim
          for (let si = 0; si < 8; si++) {
            const sa = si * Math.PI / 4 + t * 0.1;
            const innerR = h.radius * 0.5;
            const outerR = h.radius * 0.9;
            const tipR = h.radius * 0.7;
            const perpOff = 0.15;
            g.moveTo(h.x + Math.cos(sa - perpOff) * innerR, h.y + Math.sin(sa - perpOff) * innerR)
              .lineTo(h.x + Math.cos(sa) * outerR, h.y + Math.sin(sa) * outerR)
              .lineTo(h.x + Math.cos(sa + perpOff) * innerR, h.y + Math.sin(sa + perpOff) * innerR)
              .closePath().fill({ color: 0x444444, alpha: 0.7 });
            // Spike highlight
            g.moveTo(h.x + Math.cos(sa) * tipR, h.y + Math.sin(sa) * tipR)
              .lineTo(h.x + Math.cos(sa) * outerR, h.y + Math.sin(sa) * outerR)
              .stroke({ color: 0x888888, width: 1, alpha: 0.5 });
          }
          // Danger rim
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x442222, width: 1.5, alpha: 0.5 });
          break;
        }
        case "flame_vent": {
          // Grated circle base
          g.circle(h.x, h.y, h.radius).fill({ color: 0x222222, alpha: 0.7 });
          // Grate lines
          for (let gi = 0; gi < 6; gi++) {
            const ga = gi * Math.PI / 3;
            g.moveTo(h.x + Math.cos(ga) * h.radius * 0.3, h.y + Math.sin(ga) * h.radius * 0.3)
              .lineTo(h.x + Math.cos(ga) * h.radius * 0.9, h.y + Math.sin(ga) * h.radius * 0.9)
              .stroke({ color: 0x555555, width: 1.5, alpha: 0.5 });
          }
          g.circle(h.x, h.y, h.radius * 0.3).stroke({ color: 0x555555, width: 1, alpha: 0.4 });
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x663300, width: 1.5, alpha: 0.5 });

          // Fire eruption when active
          if (h.active) {
            // Heat glow
            g.circle(h.x, h.y, h.radius * 1.5).fill({ color: 0xff4400, alpha: 0.06 + Math.sin(t * 8) * 0.02 });
            g.circle(h.x, h.y, h.radius).fill({ color: 0xff6622, alpha: 0.2 + Math.sin(t * 10) * 0.08 });
            g.circle(h.x, h.y, h.radius * 0.6).fill({ color: 0xffaa44, alpha: 0.3 + Math.sin(t * 12) * 0.1 });
            // Fire particles erupting upward
            for (let fi = 0; fi < 5; fi++) {
              const fa = Math.random() * Math.PI * 2;
              const fd = Math.random() * h.radius * 0.8;
              const fy = h.y + Math.sin(fa) * fd - ((t * 40 + fi * 17) % 20);
              const fx = h.x + Math.cos(fa) * fd + Math.sin(t * 6 + fi * 3) * 3;
              const fAlpha = Math.max(0, 0.5 - ((t * 40 + fi * 17) % 20) * 0.025);
              g.circle(fx, fy, 1.5).fill({ color: 0xffcc44, alpha: fAlpha });
            }
          } else {
            // Dormant — faint smoke wisps
            g.circle(h.x, h.y, h.radius * 0.5).fill({ color: 0x332211, alpha: 0.1 });
          }
          break;
        }
        case "ice_patch": {
          // Light blue translucent circle
          g.circle(h.x, h.y, h.radius).fill({ color: 0x88ccff, alpha: 0.12 + Math.sin(t * 1.5) * 0.03 });
          g.circle(h.x, h.y, h.radius * 0.8).fill({ color: 0xaaddff, alpha: 0.08 });
          // Frost pattern — radiating crystal lines
          for (let ci = 0; ci < 6; ci++) {
            const ca = ci * Math.PI / 3 + t * 0.05;
            g.moveTo(h.x, h.y)
              .lineTo(h.x + Math.cos(ca) * h.radius * 0.9, h.y + Math.sin(ca) * h.radius * 0.9)
              .stroke({ color: 0xcceeFF, width: 1, alpha: 0.2 });
            // Branch
            const branchX = h.x + Math.cos(ca) * h.radius * 0.5;
            const branchY = h.y + Math.sin(ca) * h.radius * 0.5;
            g.moveTo(branchX, branchY)
              .lineTo(branchX + Math.cos(ca + 0.5) * h.radius * 0.3, branchY + Math.sin(ca + 0.5) * h.radius * 0.3)
              .stroke({ color: 0xcceeFF, width: 0.8, alpha: 0.15 });
            g.moveTo(branchX, branchY)
              .lineTo(branchX + Math.cos(ca - 0.5) * h.radius * 0.3, branchY + Math.sin(ca - 0.5) * h.radius * 0.3)
              .stroke({ color: 0xcceeFF, width: 0.8, alpha: 0.15 });
          }
          // Outer rim
          g.circle(h.x, h.y, h.radius).stroke({ color: 0x88ddff, width: 1.5, alpha: 0.25 });
          // Sparkle dots
          for (let si = 0; si < 4; si++) {
            const sparkA = t * 0.8 + si * Math.PI / 2;
            const sparkR = h.radius * (0.3 + si * 0.15);
            const sx = h.x + Math.cos(sparkA) * sparkR;
            const sy = h.y + Math.sin(sparkA) * sparkR;
            g.circle(sx, sy, 1).fill({ color: 0xffffff, alpha: 0.3 + Math.sin(t * 5 + si * 2) * 0.15 });
          }
          break;
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Boss — large enemy with health bar, shield bar, phase indicators
  // ---------------------------------------------------------------------------
  private _drawBoss(g: Graphics, state: RBState, sw: number, _sh: number): void {
    const boss = state.boss;
    if (!boss || !boss.alive) return;
    const t = state.time;
    const flash = boss.flashTimer > 0 && Math.sin(t * 30) > 0;

    // Boss shadow
    g.ellipse(boss.x + 3, boss.y + 5, boss.radius * 1.3, boss.radius * 0.5).fill({ color: 0x000000, alpha: 0.3 });

    // Boss body — multi-layered based on kind
    const bossColors: Record<string, number> = {
      dark_knight: 0x2a2a3a,
      lich_king: 0x1a2a1a,
      dragon_wyrm: 0x3a1a1a,
    };
    const bossGlowColors: Record<string, number> = {
      dark_knight: 0xff2244,
      lich_king: 0x44ff66,
      dragon_wyrm: 0xff6622,
    };
    const baseColor = flash ? 0xffffff : bossColors[boss.kind];
    const glowColor = bossGlowColors[boss.kind];

    // Outer aura
    g.circle(boss.x, boss.y, boss.radius + 12).fill({ color: glowColor, alpha: 0.04 + Math.sin(t * 2) * 0.02 });
    g.circle(boss.x, boss.y, boss.radius + 6).fill({ color: glowColor, alpha: 0.08 + Math.sin(t * 3) * 0.03 });

    // Armor layers
    g.circle(boss.x, boss.y, boss.radius + 2).fill({ color: 0x111111, alpha: 0.7 }); // rim
    g.circle(boss.x, boss.y, boss.radius).fill({ color: baseColor, alpha: 0.9 });
    g.circle(boss.x, boss.y, boss.radius * 0.75).fill({ color: flash ? 0xffffff : 0x333344, alpha: 0.7 });

    // Glowing core
    g.circle(boss.x, boss.y, boss.radius * 0.4).fill({ color: glowColor, alpha: 0.5 + Math.sin(t * 4) * 0.2 });
    g.circle(boss.x, boss.y, boss.radius * 0.2).fill({ color: 0xffffff, alpha: 0.3 + Math.sin(t * 6) * 0.1 });

    // Kind-specific details
    if (boss.kind === "dark_knight") {
      // Horned helmet shape
      const faceAngle = Math.atan2(state.playerY - boss.y, state.playerX - boss.x);
      for (let horn = -1; horn <= 1; horn += 2) {
        const hornA = faceAngle + horn * 0.6 - Math.PI;
        g.moveTo(boss.x + Math.cos(hornA) * boss.radius * 0.6, boss.y + Math.sin(hornA) * boss.radius * 0.6)
          .lineTo(boss.x + Math.cos(hornA) * (boss.radius + 12), boss.y + Math.sin(hornA) * (boss.radius + 12))
          .stroke({ color: 0x666666, width: 3, alpha: 0.8 });
      }
      // Red visor
      g.circle(boss.x + Math.cos(faceAngle) * boss.radius * 0.3, boss.y + Math.sin(faceAngle) * boss.radius * 0.3, 3)
        .fill({ color: 0xff2244, alpha: 0.9 });
    } else if (boss.kind === "lich_king") {
      // Crown of green fire
      for (let ci = 0; ci < 5; ci++) {
        const crownA = -Math.PI / 2 + (ci - 2) * 0.35;
        const crownLen = 8 + Math.sin(t * 6 + ci * 2) * 3;
        g.moveTo(boss.x + Math.cos(crownA) * boss.radius, boss.y + Math.sin(crownA) * boss.radius)
          .lineTo(boss.x + Math.cos(crownA) * (boss.radius + crownLen), boss.y + Math.sin(crownA) * (boss.radius + crownLen))
          .stroke({ color: 0x44ff66, width: 2, alpha: 0.6 + Math.sin(t * 8 + ci) * 0.2 });
      }
      // Skull eyes
      g.circle(boss.x - 4, boss.y - 2, 2).fill({ color: 0x44ff66, alpha: 0.8 });
      g.circle(boss.x + 4, boss.y - 2, 2).fill({ color: 0x44ff66, alpha: 0.8 });
    } else if (boss.kind === "dragon_wyrm") {
      // Wings
      for (let wing = -1; wing <= 1; wing += 2) {
        const wingA = Math.PI / 2 * wing;
        for (let wi = 0; wi < 3; wi++) {
          const wa = wingA + (wi - 1) * 0.3 + Math.sin(t * 2) * 0.1;
          const wLen = boss.radius + 10 + wi * 5;
          g.moveTo(boss.x, boss.y)
            .lineTo(boss.x + Math.cos(wa) * wLen, boss.y + Math.sin(wa) * wLen)
            .stroke({ color: 0x442211, width: 2.5 - wi * 0.5, alpha: 0.6 });
        }
      }
      // Fire eyes
      g.circle(boss.x - 5, boss.y - 3, 2.5).fill({ color: 0xff4422, alpha: 0.8 + Math.sin(t * 5) * 0.15 });
      g.circle(boss.x + 5, boss.y - 3, 2.5).fill({ color: 0xff4422, alpha: 0.8 + Math.sin(t * 5 + 1) * 0.15 });
    }

    // Phase indicator — glowing symbols orbiting boss
    for (let pi = 0; pi < 3; pi++) {
      const orbitA = t * 1.5 + pi * Math.PI * 2 / 3;
      const orbitR = boss.radius + 18;
      const ox = boss.x + Math.cos(orbitA) * orbitR;
      const oy = boss.y + Math.sin(orbitA) * orbitR;
      const isActive = pi === boss.phase;
      const pAlpha = isActive ? (0.6 + Math.sin(t * 6) * 0.2) : 0.15;
      g.circle(ox, oy, isActive ? 4 : 2.5).fill({ color: glowColor, alpha: pAlpha });
      if (isActive) {
        g.circle(ox, oy, 7).fill({ color: glowColor, alpha: 0.08 });
      }
    }

    // Attack telegraph effects
    if (boss.kind === "dark_knight" && boss.phase === 1) {
      // Ground slam telegraph — concentric rings
      const slamProgress = 1 - (boss.phaseTimer % 2) / 2;
      if (slamProgress > 0.5) {
        const telegraphR = 100 * ((slamProgress - 0.5) * 2);
        g.circle(boss.x, boss.y, telegraphR).stroke({ color: 0xff4444, width: 2, alpha: 0.2 });
        g.circle(boss.x, boss.y, telegraphR * 0.5).fill({ color: 0xff4444, alpha: 0.03 });
      }
    } else if (boss.kind === "dark_knight" && boss.phase === 0) {
      // Charge aim line
      const chargeA = Math.atan2(state.playerY - boss.y, state.playerX - boss.x);
      g.moveTo(boss.x, boss.y)
        .lineTo(boss.x + Math.cos(chargeA) * 80, boss.y + Math.sin(chargeA) * 80)
        .stroke({ color: 0xff2244, width: 1.5, alpha: 0.15 + Math.sin(t * 8) * 0.08 });
    }

    // Lich king dark zone indicator
    if (boss.kind === "lich_king" && boss.phase === 2) {
      g.circle(boss.x, boss.y, 80).fill({ color: 0x220044, alpha: 0.08 + Math.sin(t * 3) * 0.03 });
      g.circle(boss.x, boss.y, 80).stroke({ color: 0x6622aa, width: 1.5, alpha: 0.2 });
    }

    // Dragon shadow phase (fading)
    if (boss.kind === "dragon_wyrm" && boss.phase === 2) {
      // Boss flickers/fades when in shadow phase
      g.circle(boss.x, boss.y, boss.radius + 8).fill({ color: 0x220044, alpha: 0.1 + Math.sin(t * 6) * 0.06 });
    }

    // --- Health bar at top of screen (wide bar) ---
    const hpBarW = Math.min(300, sw * 0.4);
    const hpBarH = 10;
    const hpBarX = sw / 2 - hpBarW / 2;
    const hpBarY = 44;
    // Background
    g.rect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2).fill({ color: 0x000000, alpha: 0.6 });
    // HP fill
    const hpRatio = Math.max(0, boss.hp / boss.maxHp);
    const hpColor = hpRatio > 0.5 ? 0xcc2222 : hpRatio > 0.25 ? 0xcc6622 : 0xcc2244;
    g.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH).fill({ color: hpColor, alpha: 0.8 });
    // Border
    g.rect(hpBarX, hpBarY, hpBarW, hpBarH).stroke({ color: 0x664444, width: 1, alpha: 0.7 });

    // Shield bar below HP bar (blue)
    const maxShield = boss.kind === "dark_knight" ? 10 : boss.kind === "lich_king" ? 15 : 20;
    const shieldRatio = Math.max(0, boss.shieldHP / maxShield);
    const shieldBarY = hpBarY + hpBarH + 3;
    const shieldBarH = 5;
    g.rect(hpBarX - 1, shieldBarY - 1, hpBarW + 2, shieldBarH + 2).fill({ color: 0x000000, alpha: 0.4 });
    g.rect(hpBarX, shieldBarY, hpBarW * shieldRatio, shieldBarH).fill({ color: 0x4488ff, alpha: 0.7 });
    g.rect(hpBarX, shieldBarY, hpBarW, shieldBarH).stroke({ color: 0x224488, width: 0.5, alpha: 0.5 });

    // Boss name label area (just above HP bar as colored indicator)
    const nameColors: Record<string, number> = {
      dark_knight: 0xff2244,
      lich_king: 0x44ff66,
      dragon_wyrm: 0xff6622,
    };
    const nameColor = nameColors[boss.kind];
    g.rect(hpBarX, hpBarY - 8, hpBarW, 6).fill({ color: nameColor, alpha: 0.2 });
    // Small icon pip for boss type
    g.circle(hpBarX + 6, hpBarY - 5, 3).fill({ color: nameColor, alpha: 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Blood stains — persistent dark-red floor marks where enemies died
  // ---------------------------------------------------------------------------
  private _drawBloodStains(g: Graphics, state: RBState): void {
    for (const stain of state.bloodStains) {
      g.circle(stain.x, stain.y, stain.size).fill({ color: 0x440000, alpha: stain.alpha * 0.5 });
      g.circle(stain.x, stain.y, stain.size * 0.7).fill({ color: 0x660011, alpha: stain.alpha * 0.3 });
      // Splatter dots around main stain
      for (let si = 0; si < 3; si++) {
        const sa = si * Math.PI * 2 / 3 + stain.x * 0.1;
        const sd = stain.size * 0.6 + si * 2;
        g.circle(stain.x + Math.cos(sa) * sd, stain.y + Math.sin(sa) * sd, 1.5)
          .fill({ color: 0x550011, alpha: stain.alpha * 0.25 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Spawn portals — swirling ring effect at enemy spawn locations
  // ---------------------------------------------------------------------------
  private _drawSpawnPortals(g: Graphics, state: RBState): void {
    const t = state.time;
    for (const e of state.enemies) {
      if (!e.alive || e.spawnTimer <= 0) continue;
      const progress = e.spawnTimer / 0.6; // 0.6 is max spawnTimer
      const portalR = e.radius * 2 + (1 - progress) * 10;
      const portalAlpha = progress * 0.6;
      const eColor = this._getEnemyColor(e.kind);

      // Outer swirling ring
      const segments = 12;
      for (let si = 0; si < segments; si++) {
        const a1 = t * 4 + si * Math.PI * 2 / segments;
        const a2 = t * 4 + (si + 1) * Math.PI * 2 / segments;
        g.moveTo(e.x + Math.cos(a1) * portalR, e.y + Math.sin(a1) * portalR)
          .lineTo(e.x + Math.cos(a2) * portalR, e.y + Math.sin(a2) * portalR)
          .stroke({ color: eColor, width: 2, alpha: portalAlpha * (0.5 + Math.sin(t * 8 + si) * 0.3) });
      }
      // Inner glow
      g.circle(e.x, e.y, portalR * 0.6).fill({ color: eColor, alpha: portalAlpha * 0.1 });
      // Center flash
      g.circle(e.x, e.y, portalR * 0.3).fill({ color: 0xffffff, alpha: portalAlpha * 0.15 });
      // Counter-rotating inner ring
      for (let si = 0; si < 8; si++) {
        const a1 = -t * 6 + si * Math.PI * 2 / 8;
        const a2 = -t * 6 + (si + 1) * Math.PI * 2 / 8;
        g.moveTo(e.x + Math.cos(a1) * portalR * 0.5, e.y + Math.sin(a1) * portalR * 0.5)
          .lineTo(e.x + Math.cos(a2) * portalR * 0.5, e.y + Math.sin(a2) * portalR * 0.5)
          .stroke({ color: 0xffffff, width: 1, alpha: portalAlpha * 0.2 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Slash ghosts — lingering fading arcs after slash expires
  // ---------------------------------------------------------------------------
  private _drawSlashGhosts(g: Graphics, state: RBState): void {
    for (const ghost of state.slashGhosts) {
      const rc = RUNE_COLORS[ghost.rune];
      const progress = ghost.life / ghost.maxLife;
      const arcAlpha = progress * 0.35;
      const arcRadius = ghost.radius;
      const arc = Math.PI / 2;
      const startAngle = ghost.angle - arc / 2;
      const endAngle = ghost.angle + arc / 2;
      const segments = 12;

      // Fading outer glow
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (endAngle - startAngle) * (i / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
        g.moveTo(ghost.x + Math.cos(a1) * arcRadius, ghost.y + Math.sin(a1) * arcRadius)
          .lineTo(ghost.x + Math.cos(a2) * arcRadius, ghost.y + Math.sin(a2) * arcRadius)
          .stroke({ color: rc, width: 6, alpha: arcAlpha * 0.15 });
      }
      // Fading core arc
      for (let i = 0; i < segments; i++) {
        const a1 = startAngle + (endAngle - startAngle) * (i / segments);
        const a2 = startAngle + (endAngle - startAngle) * ((i + 1) / segments);
        g.moveTo(ghost.x + Math.cos(a1) * arcRadius, ghost.y + Math.sin(a1) * arcRadius)
          .lineTo(ghost.x + Math.cos(a2) * arcRadius, ghost.y + Math.sin(a2) * arcRadius)
          .stroke({ color: rc, width: 2, alpha: arcAlpha * 0.5 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Rune ambient effects — subtle particles around player per rune
  // ---------------------------------------------------------------------------
  private _drawRuneAmbient(g: Graphics, state: RBState): void {
    for (const p of state.ambientParticles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.6;
      const size = p.size * lifeRatio;
      // Glow
      g.circle(p.x, p.y, size * 2.5).fill({ color: p.color, alpha: alpha * 0.08 });
      // Core
      g.circle(p.x, p.y, size).fill({ color: p.color, alpha });
    }
  }

  private _getEnemyColor(kind: string): number {
    switch (kind) {
      case "skeleton": return 0xddccbb;
      case "archer": return 0x8b6914;
      case "knight": return 0x3a3a4a;
      case "wraith": return 0x7733aa;
      case "necromancer": return 0x44aa66;
      default: return 0xaaaaaa;
    }
  }

  // ---------------------------------------------------------------------------
  // Fire trails — burning patches on ground
  // ---------------------------------------------------------------------------
  private _drawFireTrails(g: Graphics, state: RBState): void {
    const t = state.time;
    for (const trail of state.fireTrails) {
      const lifeRatio = trail.life / trail.maxLife;
      const flickerA = lifeRatio * (0.25 + Math.sin(t * 10 + trail.x * 0.5) * 0.1);
      const flickerB = lifeRatio * (0.15 + Math.sin(t * 8 + trail.y * 0.3) * 0.06);
      // Outer heat glow
      g.circle(trail.x, trail.y, trail.radius * 1.8).fill({ color: 0xff2200, alpha: flickerB * 0.15 });
      // Fire patch
      g.circle(trail.x, trail.y, trail.radius * 1.2).fill({ color: 0xff4400, alpha: flickerA * 0.3 });
      g.circle(trail.x, trail.y, trail.radius * 0.8).fill({ color: 0xff6622, alpha: flickerA * 0.5 });
      g.circle(trail.x, trail.y, trail.radius * 0.4).fill({ color: 0xffaa44, alpha: flickerA * 0.6 });
      // Flickering flame wisps
      for (let fi = 0; fi < 3; fi++) {
        const fAngle = t * 4 + fi * Math.PI * 2 / 3 + trail.x * 0.1;
        const fDist = trail.radius * 0.6 + Math.sin(t * 7 + fi) * trail.radius * 0.3;
        const fx = trail.x + Math.cos(fAngle) * fDist;
        const fy = trail.y + Math.sin(fAngle) * fDist - 2;
        g.circle(fx, fy, 1.2).fill({ color: 0xffcc44, alpha: flickerA * 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Pickups — health, score orbs, rune charges on the arena floor
  // ---------------------------------------------------------------------------
  private _drawPickups(g: Graphics, state: RBState): void {
    // pickups may not exist yet if game hasn't been updated
    if (!state.pickups || state.pickups.length === 0) return;
    const pickups = state.pickups;
    const t = state.time;
    for (const p of pickups) {
      const bob = Math.sin(t * 2.5 + p.x * 0.1) * 3;
      const pulse = 0.6 + Math.sin(t * 3 + p.y * 0.1) * 0.2;

      if (p.kind === "health") {
        // Green glowing cross
        const cx = p.x, cy = p.y + bob;
        const arm = 7;
        const thick = 3;
        g.circle(cx, cy, 14).fill({ color: 0x00ff44, alpha: 0.07 * pulse });
        g.circle(cx, cy, 10).fill({ color: 0x00ff44, alpha: 0.12 * pulse });
        // Cross horizontal
        g.rect(cx - arm, cy - thick / 2, arm * 2, thick).fill({ color: 0x44ff66, alpha: 0.9 });
        // Cross vertical
        g.rect(cx - thick / 2, cy - arm, thick, arm * 2).fill({ color: 0x44ff66, alpha: 0.9 });
        // Bright center
        g.circle(cx, cy, 2).fill({ color: 0xaaffcc, alpha: 0.9 });
        // Outer glow ring
        g.circle(cx, cy, 12).stroke({ color: 0x44ff66, width: 1, alpha: 0.3 * pulse });

      } else if (p.kind === "score_orb") {
        // Golden diamond that rotates
        const cx = p.x, cy = p.y + bob;
        const rot = t * 2;
        const size = 8;
        g.circle(cx, cy, 16).fill({ color: 0xffd700, alpha: 0.06 * pulse });
        g.circle(cx, cy, 11).fill({ color: 0xffd700, alpha: 0.12 * pulse });
        // Rotating diamond (4 vertices)
        const v0x = cx + Math.cos(rot) * size, v0y = cy + Math.sin(rot) * size;
        const v1x = cx + Math.cos(rot + Math.PI / 2) * size * 0.6, v1y = cy + Math.sin(rot + Math.PI / 2) * size * 0.6;
        const v2x = cx + Math.cos(rot + Math.PI) * size, v2y = cy + Math.sin(rot + Math.PI) * size;
        const v3x = cx + Math.cos(rot + 3 * Math.PI / 2) * size * 0.6, v3y = cy + Math.sin(rot + 3 * Math.PI / 2) * size * 0.6;
        g.moveTo(v0x, v0y).lineTo(v1x, v1y).lineTo(v2x, v2y).lineTo(v3x, v3y).closePath()
          .fill({ color: 0xffd700, alpha: 0.85 });
        g.moveTo(v0x, v0y).lineTo(v1x, v1y).lineTo(v2x, v2y).lineTo(v3x, v3y).closePath()
          .stroke({ color: 0xffeeaa, width: 1, alpha: 0.5 });
        g.circle(cx, cy, 2.5).fill({ color: 0xffffff, alpha: 0.7 });
        g.circle(cx, cy, 13).stroke({ color: 0xffd700, width: 1, alpha: 0.25 * pulse });

      } else if (p.kind === "rune_charge") {
        // Purple spinning star
        const cx = p.x, cy = p.y + bob;
        const rot = t * 3;
        const outerR = 9, innerR = 4;
        const points = 5;
        g.circle(cx, cy, 16).fill({ color: 0xaa44ff, alpha: 0.07 * pulse });
        g.circle(cx, cy, 11).fill({ color: 0xaa44ff, alpha: 0.13 * pulse });
        // 5-pointed star
        const starVerts: number[] = [];
        for (let i = 0; i < points * 2; i++) {
          const angle = rot + (i * Math.PI) / points - Math.PI / 2;
          const r = i % 2 === 0 ? outerR : innerR;
          starVerts.push(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
        }
        g.moveTo(starVerts[0], starVerts[1]);
        for (let i = 2; i < starVerts.length; i += 2) {
          g.lineTo(starVerts[i], starVerts[i + 1]);
        }
        g.closePath().fill({ color: 0xcc66ff, alpha: 0.9 });
        g.moveTo(starVerts[0], starVerts[1]);
        for (let i = 2; i < starVerts.length; i += 2) {
          g.lineTo(starVerts[i], starVerts[i + 1]);
        }
        g.closePath().stroke({ color: 0xeeaaff, width: 1, alpha: 0.5 });
        g.circle(cx, cy, 2.5).fill({ color: 0xffffff, alpha: 0.7 });
        g.circle(cx, cy, 13).stroke({ color: 0xaa44ff, width: 1, alpha: 0.25 * pulse });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Lightning chains — bright jagged lines between chain targets
  // ---------------------------------------------------------------------------
  private _drawLightningChains(g: Graphics, state: RBState): void {
    const t = state.time;
    for (const chain of state.lightningChains) {
      const lifeRatio = chain.life / chain.maxLife;
      const alpha = lifeRatio * 0.8;

      const dx = chain.x2 - chain.x1, dy = chain.y2 - chain.y1;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;

      // Jagged bolt segments
      const jagSegs = Math.max(3, Math.floor(dist / 15));
      let prevX = chain.x1, prevY = chain.y1;
      const perpX = -dy / dist, perpY = dx / dist;

      // Wide glow
      g.moveTo(chain.x1, chain.y1).lineTo(chain.x2, chain.y2)
        .stroke({ color: 0xffdd44, width: 8, alpha: alpha * 0.08 });

      for (let j = 1; j <= jagSegs; j++) {
        const progress = j / jagSegs;
        let nx = chain.x1 + dx * progress;
        let ny = chain.y1 + dy * progress;
        if (j < jagSegs) {
          const jitter = (Math.sin(t * 30 + j * 7) * 8 + Math.cos(t * 25 + j * 11) * 5);
          nx += perpX * jitter;
          ny += perpY * jitter;
        }
        // Bright core
        g.moveTo(prevX, prevY).lineTo(nx, ny).stroke({ color: 0xffffff, width: 2, alpha: alpha * 0.9 });
        // Colored glow
        g.moveTo(prevX, prevY).lineTo(nx, ny).stroke({ color: 0xffdd44, width: 4, alpha: alpha * 0.3 });
        prevX = nx; prevY = ny;
      }

      // Impact flash at endpoints
      g.circle(chain.x1, chain.y1, 4).fill({ color: 0xffff88, alpha: alpha * 0.4 });
      g.circle(chain.x2, chain.y2, 6).fill({ color: 0xffff88, alpha: lifeRatio * 0.5 });
    }
  }

  // ---------------------------------------------------------------------------
  // Projectiles — arrows as pointed triangles with trails
  // ---------------------------------------------------------------------------
  private _drawProjectiles(g: Graphics, state: RBState): void {
    for (const proj of state.projectiles) {
      const angle = Math.atan2(proj.vy, proj.vx);
      const len = 8, halfW = 2.5;

      // Trail
      for (let tr = 1; tr <= 4; tr++) {
        const tx = proj.x - Math.cos(angle) * tr * 4;
        const ty = proj.y - Math.sin(angle) * tr * 4;
        g.circle(tx, ty, halfW * (1 - tr * 0.2)).fill({ color: 0x886633, alpha: 0.15 * (1 - tr / 5) });
      }

      // Arrow head (pointed triangle)
      const tipX = proj.x + Math.cos(angle) * len;
      const tipY = proj.y + Math.sin(angle) * len;
      const perpAngle = angle + Math.PI / 2;
      const backX = proj.x - Math.cos(angle) * 3;
      const backY = proj.y - Math.sin(angle) * 3;

      g.moveTo(tipX, tipY)
        .lineTo(backX + Math.cos(perpAngle) * halfW, backY + Math.sin(perpAngle) * halfW)
        .lineTo(backX - Math.cos(perpAngle) * halfW, backY - Math.sin(perpAngle) * halfW)
        .closePath().fill({ color: 0x886644, alpha: 0.85 });
      // Arrow shaft line
      g.moveTo(proj.x, proj.y)
        .lineTo(proj.x - Math.cos(angle) * 8, proj.y - Math.sin(angle) * 8)
        .stroke({ color: 0x664422, width: 1.5, alpha: 0.7 });
      // Arrowhead glint
      g.circle(tipX, tipY, 1).fill({ color: 0xcccccc, alpha: 0.6 });
    }
  }

  // ---------------------------------------------------------------------------
  // Particles — standard renderer with trails and glow
  // ---------------------------------------------------------------------------
  private _drawParticles(g: Graphics, state: RBState): void {
    for (const p of state.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio * 0.8;
      const size = p.size * lifeRatio;

      // Glow layer
      g.circle(p.x, p.y, size * 3).fill({ color: p.color, alpha: alpha * 0.06 });
      g.circle(p.x, p.y, size * 1.8).fill({ color: p.color, alpha: alpha * 0.15 });
      // Core
      g.circle(p.x, p.y, size).fill({ color: p.color, alpha });

      // Motion trail
      if (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5) {
        const trailLen = Math.min(8, Math.sqrt(p.vx * p.vx + p.vy * p.vy) * 0.3);
        const trAngle = Math.atan2(p.vy, p.vx);
        g.moveTo(p.x, p.y)
          .lineTo(p.x - Math.cos(trAngle) * trailLen, p.y - Math.sin(trAngle) * trailLen)
          .stroke({ color: p.color, width: size * 0.8, alpha: alpha * 0.4 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Shockwaves — expanding rings on enemy death
  // ---------------------------------------------------------------------------
  private _drawShockwaves(g: Graphics, state: RBState): void {
    for (const sw of state.shockwaves) {
      const lifeRatio = sw.life / sw.maxLife;
      const alpha = lifeRatio * 0.6;
      // Outer ring
      g.circle(sw.x, sw.y, sw.radius).stroke({ color: sw.color, width: 3, alpha: alpha * 0.6 });
      // Inner glow ring
      g.circle(sw.x, sw.y, sw.radius * 0.7).stroke({ color: 0xffffff, width: 1.5, alpha: alpha * 0.3 });
      // Fading fill
      g.circle(sw.x, sw.y, sw.radius).fill({ color: sw.color, alpha: alpha * 0.05 });
    }
  }

  // ---------------------------------------------------------------------------
  // Float texts — floating score/damage text
  // ---------------------------------------------------------------------------
  private _drawFloatTexts(state: RBState): void {
    for (let i = 0; i < state.floatTexts.length && i < FLOAT_POOL; i++) {
      const ft = state.floatTexts[i];
      const t = this._floatTexts[i];
      if (ft.life <= 0) { t.visible = false; continue; }
      const progress = 1 - ft.life / ft.maxLife;
      t.visible = true;
      t.text = ft.text;
      t.position.set(ft.x, ft.y - progress * 20);
      t.alpha = ft.life / ft.maxLife;
      t.scale.set(ft.scale * (1 + progress * 0.3));
      t.style.fill = ft.color;
    }
    // Hide unused pool entries
    for (let i = state.floatTexts.length; i < FLOAT_POOL; i++) {
      this._floatTexts[i].visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // HUD — score, wave, HP, combo, rune indicator, dodge cooldown
  // ---------------------------------------------------------------------------
  private _drawHUD(state: RBState): void {
    if (state.phase !== RBPhase.PLAYING && state.phase !== RBPhase.PAUSED) {
      this._hudText.visible = false;
      this._runeText.visible = false;
      this._comboText.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh;
    const ui = this._uiGfx;

    // Top bar background
    ui.rect(0, 0, sw, 32).fill({ color: 0x000000, alpha: 0.4 });

    // HUD text — score, wave, HP, combo, ultimate
    const comboStr = state.comboCount > 1 ? `  COMBO x${state.comboCount}` : "";
    const ultStr = state.runeUltCharge >= 100 ? "  [Q] ULT READY" : `  ULT ${Math.floor(state.runeUltCharge)}%`;
    this._hudText.text = `SCORE ${Math.floor(state.score)}   WAVE ${state.wave}   HP ${state.playerHP}/${state.maxHP}${comboStr}${ultStr}`;
    this._hudText.visible = true;

    // Current rune indicator (bottom center)
    const runeColor = RUNE_COLORS[state.currentRune];
    const runeName = RUNE_NAMES[state.currentRune];
    const runeX = sw / 2, runeY = sh - 40;

    // Rune icon background
    ui.circle(runeX, runeY, 18).fill({ color: 0x000000, alpha: 0.5 });
    ui.circle(runeX, runeY, 16).stroke({ color: runeColor, width: 2, alpha: 0.7 });
    // Inner rune glow
    ui.circle(runeX, runeY, 12).fill({ color: runeColor, alpha: 0.15 + Math.sin(state.time * 3) * 0.05 });
    ui.circle(runeX, runeY, 6).fill({ color: runeColor, alpha: 0.4 });
    // Rune symbol (small cross/star)
    for (let rv = 0; rv < 4; rv++) {
      const ra = state.time * 0.5 + rv * Math.PI / 2;
      ui.moveTo(runeX + Math.cos(ra) * 3, runeY + Math.sin(ra) * 3)
        .lineTo(runeX + Math.cos(ra) * 9, runeY + Math.sin(ra) * 9)
        .stroke({ color: runeColor, width: 1.5, alpha: 0.8 });
    }
    // Rune name label
    this._runeText.text = runeName;
    this._runeText.anchor.set(0.5);
    this._runeText.position.set(runeX, runeY + 24);
    this._runeText.style.fill = runeColor;
    this._runeText.visible = true;

    // Rune charges display (4 colored dots below rune icon)
    const chargeY = runeY - 26;
    const runeTypes: RuneType[] = ["fire", "ice", "lightning", "shadow"];
    for (let ci = 0; ci < 4; ci++) {
      const cdx = runeX + (ci - 1.5) * 14;
      const cColor = RUNE_COLORS[runeTypes[ci]];
      const hasCharge = state.runeCharges[runeTypes[ci]] > 0;
      ui.circle(cdx, chargeY, 4).fill({ color: cColor, alpha: hasCharge ? 0.7 : 0.15 });
      if (hasCharge) {
        ui.circle(cdx, chargeY, 6).fill({ color: cColor, alpha: 0.1 });
      }
      // Active rune highlight ring
      if (runeTypes[ci] === state.currentRune) {
        ui.circle(cdx, chargeY, 7).stroke({ color: cColor, width: 1.5, alpha: 0.6 + Math.sin(state.time * 4) * 0.2 });
      }
    }

    // Mastery level indicators next to rune display
    this._drawMasteryIndicators(ui, state, runeX, chargeY);

    // Dodge cooldown arc around player
    if (state.dodgeCooldown > 0) {
      const dodgeRatio = 1 - state.dodgeCooldown / state.dodgeCooldownMax;
      const arcSegs = 20;
      const arcR = state.playerRadius + 14;
      for (let ai = 0; ai < Math.floor(arcSegs * dodgeRatio); ai++) {
        const a1 = -Math.PI / 2 + (ai / arcSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / arcSegs) * Math.PI * 2;
        ui.moveTo(state.playerX + Math.cos(a1) * arcR, state.playerY + Math.sin(a1) * arcR)
          .lineTo(state.playerX + Math.cos(a2) * arcR, state.playerY + Math.sin(a2) * arcR)
          .stroke({ color: 0x44cc44, width: 2, alpha: 0.4 });
      }
    } else {
      // Full dodge ready — subtle ring
      const arcR = state.playerRadius + 14;
      ui.circle(state.playerX, state.playerY, arcR).stroke({ color: 0x44cc44, width: 1, alpha: 0.15 + Math.sin(state.time * 2) * 0.05 });
    }

    // Attack cooldown indicator (small arc below dodge ring)
    if (state.attackCooldown > 0) {
      const atkRatio = 1 - state.attackCooldown / RB.ATTACK_COOLDOWN;
      const atkR = state.playerRadius + 18;
      const atkSegs = 12;
      for (let ai = 0; ai < Math.floor(atkSegs * atkRatio); ai++) {
        const a1 = -Math.PI / 2 + (ai / atkSegs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((ai + 1) / atkSegs) * Math.PI * 2;
        ui.moveTo(state.playerX + Math.cos(a1) * atkR, state.playerY + Math.sin(a1) * atkR)
          .lineTo(state.playerX + Math.cos(a2) * atkR, state.playerY + Math.sin(a2) * atkR)
          .stroke({ color: runeColor, width: 1.5, alpha: 0.3 });
      }
    }

    // Rune ultimate charge indicator — circular arc around player (outer ring)
    const ultR = state.playerRadius + 22;
    const ultRatio = state.runeUltCharge / 100;
    const ultSegs = 24;
    const ultFull = state.runeUltCharge >= 100;
    const ultColor = runeColor;
    const filledSegs = Math.floor(ultSegs * ultRatio);
    for (let ai = 0; ai < filledSegs; ai++) {
      const a1 = -Math.PI / 2 + (ai / ultSegs) * Math.PI * 2;
      const a2 = -Math.PI / 2 + ((ai + 1) / ultSegs) * Math.PI * 2;
      const segAlpha = ultFull ? (0.6 + Math.sin(state.time * 6) * 0.3) : 0.35;
      ui.moveTo(state.playerX + Math.cos(a1) * ultR, state.playerY + Math.sin(a1) * ultR)
        .lineTo(state.playerX + Math.cos(a2) * ultR, state.playerY + Math.sin(a2) * ultR)
        .stroke({ color: ultColor, width: 2.5, alpha: segAlpha });
    }
    // Pulsing glow when full
    if (ultFull) {
      const pulseAlpha = 0.08 + Math.sin(state.time * 6) * 0.06;
      ui.circle(state.playerX, state.playerY, ultR + 4).fill({ color: ultColor, alpha: pulseAlpha });
      ui.circle(state.playerX, state.playerY, ultR).stroke({ color: 0xffffff, width: 1, alpha: 0.15 + Math.sin(state.time * 8) * 0.1 });
    }

    // Active ultimate visual effect
    if (state.ultimateActive !== "") {
      const ultGlow = 0.05 + Math.sin(state.time * 4) * 0.03;
      ui.circle(state.playerX, state.playerY, state.playerRadius + 30).fill({ color: ultColor, alpha: ultGlow });
    }

    // Wave event announcement bar
    if (state.waveEventActive !== "") {
      ui.rect(sw / 2 - 100, 36, 200, 18).fill({ color: 0x000000, alpha: 0.4 });
      const eventColor = state.bloodMoonActive ? 0xff2244 : runeColor;
      ui.rect(sw / 2 - 100, 36, 200, 18).stroke({ color: eventColor, width: 1, alpha: 0.3 });
    }

    // Synergy bonus indicator
    if (state.synergyTimer > 0 && state.synergyBonus) {
      const synAlpha = Math.min(1, state.synergyTimer);
      const synY = 58;
      ui.rect(sw / 2 - 60, synY, 120, 16).fill({ color: 0xffaa00, alpha: synAlpha * 0.2 });
      ui.rect(sw / 2 - 60, synY, 120, 16).stroke({ color: 0xffaa00, width: 1, alpha: synAlpha * 0.5 });
    }

    // Large center-screen combo counter
    if (state.comboCount >= 3) {
      const comboScale = Math.min(2.0, 1.0 + state.comboCount * 0.1);
      const comboAlpha = Math.min(1, state.comboTimer / 1.5) * 0.7;
      const comboColor = state.comboCount >= 10 ? 0xff2244 : state.comboCount >= 5 ? 0xffaa00 : 0xffd700;
      const comboY = 60;
      ui.rect(sw / 2 - 40, comboY - 10, 80, 25).fill({ color: 0x000000, alpha: comboAlpha * 0.3 });
      this._comboText.visible = true;
      this._comboText.text = `${state.comboCount}x`;
      this._comboText.style.fill = comboColor;
      this._comboText.anchor.set(0.5);
      this._comboText.position.set(sw / 2, comboY);
      this._comboText.scale.set(comboScale);
      this._comboText.alpha = comboAlpha;
    } else {
      this._comboText.visible = false;
    }
  }

  // ---------------------------------------------------------------------------
  // Start screen — title with sword icon, rune cycle demo, controls
  // ---------------------------------------------------------------------------
  private _drawStartScreen(state: RBState, meta: RBMeta): void {
    if (state.phase !== RBPhase.START) {
      this._titleText.visible = false; this._subtitleText.visible = false;
      this._controlsText.visible = false; this._promptText.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh, g = this._gfx, t = state.time;

    // Dark overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });

    // Title
    this._titleText.anchor.set(0.5);
    this._titleText.position.set(sw / 2, sh * 0.28);
    this._titleText.visible = true;

    // Sword icon above title — vertical sword with crossguard
    const swordCX = sw / 2, swordCY = sh * 0.17;
    const swordH = 40;
    g.moveTo(swordCX, swordCY - swordH / 2).lineTo(swordCX, swordCY + swordH / 2)
      .stroke({ color: 0xcccccc, width: 3, alpha: 0.8 });
    // Crossguard
    g.moveTo(swordCX - 12, swordCY + 6).lineTo(swordCX + 12, swordCY + 6)
      .stroke({ color: 0xaa8844, width: 3, alpha: 0.7 });
    // Pommel
    g.circle(swordCX, swordCY + swordH / 2 + 4, 3).fill({ color: 0xaa8844, alpha: 0.7 });
    // Blade glow — cycles through rune colors
    const cycleIdx = Math.floor(t * 0.5) % 4;
    const cycleRunes: RuneType[] = ["fire", "ice", "lightning", "shadow"];
    const cycleColor = RUNE_COLORS[cycleRunes[cycleIdx]];
    const nextColor = RUNE_COLORS[cycleRunes[(cycleIdx + 1) % 4]];
    const cycleFrac = (t * 0.5) % 1;
    const bladeGlow = lerpColor(cycleColor, nextColor, cycleFrac);
    g.moveTo(swordCX, swordCY - swordH / 2).lineTo(swordCX, swordCY + 4)
      .stroke({ color: bladeGlow, width: 1.5, alpha: 0.7 + Math.sin(t * 3) * 0.15 });
    g.circle(swordCX, swordCY - swordH / 2, 5).fill({ color: bladeGlow, alpha: 0.12 });

    // Subtitle
    this._subtitleText.anchor.set(0.5);
    this._subtitleText.position.set(sw / 2, sh * 0.34);
    this._subtitleText.visible = true;

    // Animated rune cycle demo — 4 rune dots orbiting
    const demoY = sh * 0.44;
    for (let ri = 0; ri < 4; ri++) {
      const rAngle = t * 0.8 + ri * Math.PI / 2;
      const rx = sw / 2 + Math.cos(rAngle) * 30;
      const ry = demoY + Math.sin(rAngle) * 10;
      const rc = RUNE_COLORS[cycleRunes[ri]];
      g.circle(rx, ry, 5).fill({ color: rc, alpha: 0.6 + Math.sin(t * 2 + ri) * 0.15 });
      g.circle(rx, ry, 9).fill({ color: rc, alpha: 0.08 });
    }

    // Controls text
    this._controlsText.text =
      "WASD — Move\n" +
      "Mouse — Aim\n" +
      "Left Click — Slash\n" +
      "Shift — Dodge\n" +
      "1-4 — Switch Rune\n" +
      "Q — Rune Ultimate\n" +
      "ESC — Pause";
    this._controlsText.anchor.set(0.5);
    this._controlsText.position.set(sw / 2, sh * 0.56);
    this._controlsText.visible = true;

    // High score
    if (meta.highScore > 0) {
      g.rect(sw / 2 - 70, sh * 0.72, 140, 20).fill({ color: 0x000000, alpha: 0.3 });
      // Draw via gfx text approach — handled by float text style inline
    }

    // Press SPACE prompt — pulsing
    this._promptText.anchor.set(0.5);
    this._promptText.position.set(sw / 2, sh * 0.82);
    this._promptText.alpha = 0.5 + Math.sin(t * 2.5) * 0.3;
    this._promptText.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Pause screen
  // ---------------------------------------------------------------------------
  private _drawPauseScreen(state: RBState): void {
    if (state.phase !== RBPhase.PAUSED) { this._pauseText.visible = false; return; }
    const sw = this._sw, sh = this._sh, g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
    this._pauseText.anchor.set(0.5);
    this._pauseText.position.set(sw / 2, sh / 2);
    this._pauseText.visible = true;
  }

  // ---------------------------------------------------------------------------
  // Death screen — grade display with stats
  // ---------------------------------------------------------------------------
  private _drawDeathScreen(state: RBState, meta: RBMeta): void {
    if (state.phase !== RBPhase.DEAD) {
      this._gradeText.visible = false; this._statText.visible = false; this._deathPrompt.visible = false;
      this._shopTitle.visible = false; this._shardText.visible = false;
      for (const t of this._shopTexts) t.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh, g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });

    // Grade
    const grade = getRBGrade(state.score);
    this._gradeText.text = grade;
    this._gradeText.anchor.set(0.5);
    this._gradeText.position.set(sw / 2, sh * 0.28);
    this._gradeText.visible = true;

    // Grade glow ring
    const gradeColor = grade.grade === "S" ? 0xffdd44 : grade.grade === "A" ? 0xff6622 : 0xaaaacc;
    g.circle(sw / 2, sh * 0.28, 40).stroke({ color: gradeColor, width: 2, alpha: 0.3 + Math.sin(state.time * 2) * 0.1 });
    g.circle(sw / 2, sh * 0.28, 50).fill({ color: gradeColor, alpha: 0.04 });

    // Stats
    this._statText.text =
      `Score: ${Math.floor(state.score)}\n` +
      `Wave: ${state.wave}\n` +
      `Enemies Slain: ${state.enemiesKilled}\n` +
      `Best Combo: ${state.comboCount}x\n` +
      `High Score: ${meta.highScore}`;
    this._statText.anchor.set(0.5);
    this._statText.position.set(sw / 2, sh * 0.48);
    this._statText.visible = true;

    // Prompt
    this._deathPrompt.text = "Press SPACE to try again";
    this._deathPrompt.anchor.set(0.5);
    this._deathPrompt.position.set(sw / 2, sh * 0.72);
    this._deathPrompt.alpha = 0.5 + Math.sin(state.time * 2.5) * 0.3;
    this._deathPrompt.visible = true;

    // Upgrade shop panel
    this._drawUpgradeShop(g, state, meta, sw, sh);
  }

  // ---------------------------------------------------------------------------
  // Upgrade shop — shown on death screen
  // ---------------------------------------------------------------------------
  private _drawUpgradeShop(g: Graphics, _state: RBState, meta: RBMeta, sw: number, sh: number): void {
    const shards = meta.shards || 0;
    const upg = meta.upgrades || { maxHP: 0, attackSpeed: 0, dodgeCooldown: 0, runepower: 0, ultCharge: 0 };
    const costs = RB.UPGRADE_COSTS as Record<string, number[]>;

    const panelW = 280, panelH = 190;
    const panelX = sw - panelW - 16, panelY = sh * 0.12;

    // Panel background
    g.rect(panelX, panelY, panelW, panelH).fill({ color: 0x000000, alpha: 0.75 });
    g.rect(panelX, panelY, panelW, panelH).stroke({ color: 0x554422, width: 1.5, alpha: 0.6 });
    // Inner border accent
    g.rect(panelX + 3, panelY + 3, panelW - 6, panelH - 6).stroke({ color: 0x443311, width: 0.5, alpha: 0.4 });

    const upgrades: { key: string; name: string; maxLvl: number }[] = [
      { key: "maxHP", name: "MAX HP", maxLvl: 3 },
      { key: "attackSpeed", name: "ATK SPEED", maxLvl: 3 },
      { key: "dodgeCooldown", name: "DODGE CD", maxLvl: 3 },
      { key: "runepower", name: "RUNEPOWER", maxLvl: 3 },
      { key: "ultCharge", name: "ULT CHARGE", maxLvl: 2 },
    ];

    // Title
    this._shopTitle.visible = true;
    this._shopTitle.anchor.set(0.5, 0);
    this._shopTitle.position.set(panelX + panelW / 2, panelY + 6);

    // Shards count
    this._shardText.visible = true;
    this._shardText.anchor.set(0, 0);
    this._shardText.text = `Shards: ${shards}`;
    this._shardText.position.set(panelX + 10, panelY + 28);

    const lineH = 26;
    const startY = panelY + 46;

    for (let i = 0; i < upgrades.length; i++) {
      const u = upgrades[i];
      const level = (upg as Record<string, number>)[u.key] || 0;
      const maxed = level >= u.maxLvl;
      const cost = maxed ? 0 : (costs[u.key]?.[level] ?? 999);
      const affordable = !maxed && shards >= cost;
      const ly = startY + i * lineH;
      const t = this._shopTexts[i];

      // Row background tint
      const rowColor = maxed ? 0x224422 : affordable ? 0x222200 : 0x110e0a;
      g.rect(panelX + 6, ly - 2, panelW - 12, lineH - 2).fill({ color: rowColor, alpha: 0.4 });

      // Build text: [N] NAME    Lv X/Y    Cost: Z
      const costStr = maxed ? "MAX" : `Cost: ${cost}`;
      const lvStr = `Lv ${level}/${u.maxLvl}`;
      t.text = `[${i + 1}] ${u.name.padEnd(10)}  ${lvStr.padEnd(7)}  ${costStr}`;

      // Color: green for maxed, gold for affordable, gray for too expensive
      const textColor = maxed ? 0x44cc44 : affordable ? 0xffd700 : 0x776655;
      t.style.fill = textColor;
      t.anchor.set(0, 0.5);
      t.position.set(panelX + 10, ly + (lineH - 2) / 2 - 1);
      t.visible = true;
    }
  }

  // ---------------------------------------------------------------------------
  // Boss announcement — dramatic full-screen name display
  // ---------------------------------------------------------------------------
  private _drawBossAnnounce(state: RBState): void {
    if (state.bossAnnounceTimer <= 0 || state.phase !== RBPhase.PLAYING) {
      this._bossAnnounce.visible = false;
      return;
    }
    const sw = this._sw, sh = this._sh;
    const ui = this._uiGfx;
    const bossNames: Record<string, string> = {
      dark_knight: "THE DARK KNIGHT",
      lich_king: "THE LICH KING",
      dragon_wyrm: "THE DRAGON WYRM",
    };
    const bossName = state.boss ? (bossNames[state.boss.kind] ?? state.boss.kind.toUpperCase()) : "";
    if (!bossName) { this._bossAnnounce.visible = false; return; }

    // Fade in then hold then fade out
    const maxTimer = 3.0;
    const fadeIn = Math.min(1, state.bossAnnounceTimer / (maxTimer - 0.3));
    const fadeOut = Math.min(1, (state.bossAnnounceTimer) / 0.8);
    const alpha = Math.min(fadeIn, fadeOut);

    const bandH = 60;
    const bandY = sh / 2 - bandH / 2;
    // Dark overlay band
    ui.rect(0, bandY, sw, bandH).fill({ color: 0x000000, alpha: alpha * 0.7 });
    // Colored edge lines
    const bossGlowColors: Record<string, number> = {
      dark_knight: 0xff2244,
      lich_king: 0x44ff66,
      dragon_wyrm: 0xff6622,
    };
    const glowColor = state.boss ? (bossGlowColors[state.boss.kind] ?? 0xff2244) : 0xff2244;
    ui.rect(0, bandY, sw, 2).fill({ color: glowColor, alpha: alpha * 0.8 });
    ui.rect(0, bandY + bandH - 2, sw, 2).fill({ color: glowColor, alpha: alpha * 0.8 });

    this._bossAnnounce.visible = true;
    this._bossAnnounce.text = bossName;
    this._bossAnnounce.anchor.set(0.5);
    this._bossAnnounce.position.set(sw / 2, sh / 2);
    this._bossAnnounce.alpha = alpha;
    // Subtle scale pulse
    const scale = 1.0 + Math.sin(state.time * 4) * 0.02;
    this._bossAnnounce.scale.set(scale);
  }

  // ---------------------------------------------------------------------------
  // Mastery indicators in HUD
  // ---------------------------------------------------------------------------
  private _drawMasteryIndicators(ui: Graphics, state: RBState, runeX: number, chargeY: number): void {
    const runeTypes: RuneType[] = ["fire", "ice", "lightning", "shadow"];
    for (let ci = 0; ci < 4; ci++) {
      const cdx = runeX + (ci - 1.5) * 14;
      const cColor = RUNE_COLORS[runeTypes[ci]];
      const mastery = state.runeMastery[runeTypes[ci]] || 0;
      if (mastery > 0) {
        // Draw tiny star pips above each rune charge dot
        for (let m = 0; m < Math.min(mastery, 5); m++) {
          const mx = cdx - (mastery - 1) * 2.5 + m * 5;
          const my = chargeY - 10;
          // Tiny star pip
          g_drawStar(ui, mx, my, 2, cColor, 0.7);
        }
      }
    }
  }
}
