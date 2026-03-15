// ---------------------------------------------------------------------------
// Quest for the Grail — HUD (Polished RPG Interface)
// Ornate frames, gradient bars, animated effects, icons, minimap with
// parchment backdrop, radial cooldown sweeps, rarity-colored inventory slots,
// toast notification system, and atmospheric menu screens.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  GameBalance, TileType, FLOOR_THEMES, QUEST_GENRE_DEFS, KNIGHT_DEFS,
  ItemType, ItemRarity, SHOP_ITEMS,
} from "../config/GameConfig";

import { GamePhase, loadRunStats } from "../state/GameState";
import type {
  GrailGameState, PlayerState, FloorState,
} from "../state/GameState";

const FONT = "'Segoe UI', 'Palatino Linotype', serif";
const FONT_FANCY = "'Palatino Linotype', 'Book Antiqua', 'Georgia', serif";
const GOLD_COLOR = 0xffd700;
const GOLD_DARK = 0xb8860b;
const GOLD_LIGHT = 0xffec8b;
const PARCHMENT = 0xd4c5a9;
const PARCHMENT_DARK = 0x8b7d5e;
const PANEL_BG = 0x0e0b07;
const PANEL_BG_ALPHA = 0.85;

// ---------------------------------------------------------------------------
// Animation state persisted across frames
// ---------------------------------------------------------------------------

interface HUDAnimState {
  time: number;
  prevHp: number;
  dmgPreviewHp: number;
  dmgFlashTimer: number;
  prevXp: number;
  xpSparkleTimer: number;
  notificationQueue: NotificationEntry[];
  activeNotifications: ActiveNotification[];
  levelUpTimer: number;
  levelUpLevel: number;
}

interface NotificationEntry {
  text: string;
  color: number;
  type: "info" | "loot" | "levelup" | "warning";
  duration: number;
}

interface ActiveNotification {
  text: string;
  color: number;
  type: "info" | "loot" | "levelup" | "warning";
  timer: number;
  maxTimer: number;
  slideIn: number; // 0..1
}

// ---------------------------------------------------------------------------
// Helper: convert hex number to r,g,b (0-255)
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
// GameHUD
// ---------------------------------------------------------------------------

export class GameHUD {
  readonly container = new Container();

  private _gfx = new Graphics();
  private _texts: Text[] = [];
  private _anim: HUDAnimState = {
    time: 0,
    prevHp: -1,
    dmgPreviewHp: -1,
    dmgFlashTimer: 0,
    prevXp: -1,
    xpSparkleTimer: 0,
    notificationQueue: [],
    activeNotifications: [],
    levelUpTimer: 0,
    levelUpLevel: 0,
  };

  build(): void {
    this.container.addChild(this._gfx);
  }

  // -------------------------------------------------------------------------
  // Update each frame
  // -------------------------------------------------------------------------
  update(state: GrailGameState, sw: number, sh: number, dt: number): void {
    const g = this._gfx;
    g.clear();

    // Remove old texts
    for (const t of this._texts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._texts.length = 0;

    this._anim.time += dt;

    if (state.phase === GamePhase.GENRE_SELECT) {
      this._drawGenreSelect(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.KNIGHT_SELECT) {
      this._drawKnightSelect(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.GAME_OVER) {
      this._drawGameOver(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.VICTORY) {
      this._drawVictory(state, sw, sh);
      return;
    }
    if (state.phase === GamePhase.FLOOR_TRANSITION) {
      this._drawFloorTransition(state, sw, sh);
      return;
    }

    // Playing HUD
    this._drawHPBar(state.player, sw);
    this._drawXPBar(state.player, sw);
    this._drawLevelBadge(state.player);
    this._drawStats(state.player, sw, sh);
    this._drawBuffIndicators(state.player);
    this._drawAbilityCooldown(state.player, sw);
    this._drawFloorInfo(state, sw);
    this._drawMinimap(state.floor, state.player, sw, sh);
    this._drawInventoryBar(state.player, sw, sh);
    this._drawGold(state.player, sw);
    this._drawDashIndicator(state, sw, sh);
    this._drawKillStreak(state, sw, sh);
    this._drawNotifications(sw, sh, dt);

    if (state.phase === GamePhase.INVENTORY) {
      this._drawInventoryScreen(state, sw, sh);
    }
    if (state.phase === GamePhase.SHOP) {
      this._drawShopScreen(state, sw, sh);
    }
    if (state.phase === GamePhase.PAUSED) {
      this._drawPaused(sw, sh);
    }
  }

  // =========================================================================
  //  ORNATE FRAME helpers
  // =========================================================================

  /** Draw an ornate golden frame with corner flourishes */
  private _drawOrnateFrame(
    x: number, y: number, w: number, h: number,
    borderColor = GOLD_COLOR, thickness = 2, cornerSize = 6,
  ): void {
    const g = this._gfx;
    // Outer shadow
    g.roundRect(x - 1, y - 1, w + 2, h + 2, 3)
      .stroke({ color: 0x000000, width: thickness + 2, alpha: 0.5 });
    // Main border
    g.roundRect(x, y, w, h, 2)
      .stroke({ color: borderColor, width: thickness, alpha: 0.9 });
    // Inner highlight
    g.roundRect(x + 1, y + 1, w - 2, h - 2, 1)
      .stroke({ color: GOLD_LIGHT, width: 0.5, alpha: 0.3 });

    // Corner flourishes (small L-shapes)
    const cs = cornerSize;
    const cAlpha = 0.8;
    // Top-left
    g.moveTo(x - 2, y + cs).lineTo(x - 2, y - 2).lineTo(x + cs, y - 2)
      .stroke({ color: borderColor, width: 1.5, alpha: cAlpha });
    // Top-right
    g.moveTo(x + w - cs, y - 2).lineTo(x + w + 2, y - 2).lineTo(x + w + 2, y + cs)
      .stroke({ color: borderColor, width: 1.5, alpha: cAlpha });
    // Bottom-left
    g.moveTo(x - 2, y + h - cs).lineTo(x - 2, y + h + 2).lineTo(x + cs, y + h + 2)
      .stroke({ color: borderColor, width: 1.5, alpha: cAlpha });
    // Bottom-right
    g.moveTo(x + w - cs, y + h + 2).lineTo(x + w + 2, y + h + 2).lineTo(x + w + 2, y + h - cs)
      .stroke({ color: borderColor, width: 1.5, alpha: cAlpha });
  }

  /** Draw a panel background with optional rounded corners */
  private _drawPanel(
    x: number, y: number, w: number, h: number,
    bgColor = PANEL_BG, alpha = PANEL_BG_ALPHA, radius = 4,
  ): void {
    const g = this._gfx;
    // Drop shadow
    g.roundRect(x + 2, y + 2, w, h, radius)
      .fill({ color: 0x000000, alpha: alpha * 0.4 });
    // Main panel
    g.roundRect(x, y, w, h, radius)
      .fill({ color: bgColor, alpha });
  }

  /** Draw a parchment-textured background (simulated with layered rects) */
  private _drawParchmentBG(x: number, y: number, w: number, h: number): void {
    const g = this._gfx;
    g.roundRect(x, y, w, h, 4).fill({ color: PARCHMENT_DARK, alpha: 0.95 });
    g.roundRect(x + 2, y + 2, w - 4, h - 4, 3).fill({ color: PARCHMENT, alpha: 0.9 });
    // Subtle noise lines for texture
    const time = this._anim.time;
    for (let i = 0; i < 8; i++) {
      const ly = y + 4 + ((h - 8) * i) / 8;
      const offset = Math.sin(time * 0.5 + i * 1.7) * 2;
      g.moveTo(x + 6 + offset, ly).lineTo(x + w - 6 + offset, ly)
        .stroke({ color: PARCHMENT_DARK, width: 0.3, alpha: 0.15 });
    }
  }

  // =========================================================================
  //  ICON drawing helpers (vector art via Graphics)
  // =========================================================================

  /** Heart icon for HP */
  private _drawHeartIcon(cx: number, cy: number, size: number, color = 0xff3344): void {
    const g = this._gfx;
    const s = size;
    // Simple heart shape using arcs approximated by lines
    g.moveTo(cx, cy + s * 0.35)
      .lineTo(cx - s * 0.5, cy - s * 0.1)
      .lineTo(cx - s * 0.45, cy - s * 0.4)
      .lineTo(cx - s * 0.25, cy - s * 0.5)
      .lineTo(cx, cy - s * 0.25)
      .lineTo(cx + s * 0.25, cy - s * 0.5)
      .lineTo(cx + s * 0.45, cy - s * 0.4)
      .lineTo(cx + s * 0.5, cy - s * 0.1)
      .closePath()
      .fill({ color, alpha: 0.9 });
  }

  /** Star icon for XP / Crit */
  private _drawStarIcon(cx: number, cy: number, size: number, color = 0x4488ff): void {
    const g = this._gfx;
    const outer = size * 0.5;
    const inner = size * 0.2;
    const points = 5;
    g.moveTo(cx, cy - outer);
    for (let i = 0; i < points; i++) {
      const outerAngle = (Math.PI * 2 * i) / points - Math.PI / 2;
      const innerAngle = outerAngle + Math.PI / points;
      g.lineTo(cx + Math.cos(outerAngle) * outer, cy + Math.sin(outerAngle) * outer);
      g.lineTo(cx + Math.cos(innerAngle) * inner, cy + Math.sin(innerAngle) * inner);
    }
    g.closePath().fill({ color, alpha: 0.9 });
  }

  /** Sword icon for ATK */
  private _drawSwordIcon(cx: number, cy: number, size: number, color = 0xcccccc): void {
    const g = this._gfx;
    const s = size * 0.45;
    // Blade
    g.moveTo(cx, cy - s).lineTo(cx + s * 0.15, cy + s * 0.3)
      .lineTo(cx - s * 0.15, cy + s * 0.3).closePath()
      .fill({ color, alpha: 0.9 });
    // Cross-guard
    g.rect(cx - s * 0.35, cy + s * 0.25, s * 0.7, s * 0.12)
      .fill({ color: GOLD_DARK, alpha: 0.9 });
    // Grip
    g.rect(cx - s * 0.07, cy + s * 0.37, s * 0.14, s * 0.35)
      .fill({ color: 0x664422, alpha: 0.9 });
    // Pommel
    g.circle(cx, cy + s * 0.78, s * 0.1).fill({ color: GOLD_COLOR, alpha: 0.9 });
  }

  /** Shield icon for DEF */
  private _drawShieldIcon(cx: number, cy: number, size: number, color = 0x6688aa): void {
    const g = this._gfx;
    const s = size * 0.45;
    g.moveTo(cx - s * 0.4, cy - s * 0.45)
      .lineTo(cx + s * 0.4, cy - s * 0.45)
      .lineTo(cx + s * 0.45, cy)
      .lineTo(cx, cy + s * 0.55)
      .lineTo(cx - s * 0.45, cy)
      .closePath()
      .fill({ color, alpha: 0.85 });
    // Inner cross
    g.moveTo(cx, cy - s * 0.3).lineTo(cx, cy + s * 0.35)
      .stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });
    g.moveTo(cx - s * 0.25, cy - s * 0.05).lineTo(cx + s * 0.25, cy - s * 0.05)
      .stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });
  }

  /** Boot icon for SPD */
  private _drawBootIcon(cx: number, cy: number, size: number, color = 0x886644): void {
    const g = this._gfx;
    const s = size * 0.4;
    // Boot shape
    g.moveTo(cx - s * 0.15, cy - s * 0.5)
      .lineTo(cx + s * 0.15, cy - s * 0.5)
      .lineTo(cx + s * 0.15, cy + s * 0.1)
      .lineTo(cx + s * 0.5, cy + s * 0.3)
      .lineTo(cx + s * 0.5, cy + s * 0.5)
      .lineTo(cx - s * 0.25, cy + s * 0.5)
      .lineTo(cx - s * 0.25, cy + s * 0.1)
      .lineTo(cx - s * 0.15, cy + s * 0.1)
      .closePath()
      .fill({ color, alpha: 0.85 });
  }

  /** Skull icon */
  private _drawSkullIcon(cx: number, cy: number, size: number, color = 0xccccaa): void {
    const g = this._gfx;
    const s = size * 0.4;
    // Cranium
    g.circle(cx, cy - s * 0.1, s * 0.4).fill({ color, alpha: 0.9 });
    // Jaw
    g.rect(cx - s * 0.25, cy + s * 0.15, s * 0.5, s * 0.2)
      .fill({ color, alpha: 0.8 });
    // Eyes
    g.circle(cx - s * 0.15, cy - s * 0.15, s * 0.08).fill({ color: 0x000000 });
    g.circle(cx + s * 0.15, cy - s * 0.15, s * 0.08).fill({ color: 0x000000 });
  }

  /** Potion bottle icon */
  private _drawPotionIcon(cx: number, cy: number, size: number, color = 0xff4444): void {
    const g = this._gfx;
    const s = size * 0.4;
    // Neck
    g.rect(cx - s * 0.1, cy - s * 0.5, s * 0.2, s * 0.25)
      .fill({ color: 0xaaaaaa, alpha: 0.8 });
    // Body
    g.moveTo(cx - s * 0.1, cy - s * 0.25)
      .lineTo(cx - s * 0.35, cy + s * 0.1)
      .lineTo(cx - s * 0.35, cy + s * 0.45)
      .lineTo(cx + s * 0.35, cy + s * 0.45)
      .lineTo(cx + s * 0.35, cy + s * 0.1)
      .lineTo(cx + s * 0.1, cy - s * 0.25)
      .closePath()
      .fill({ color, alpha: 0.8 });
    // Liquid highlight
    g.rect(cx - s * 0.2, cy + s * 0.15, s * 0.15, s * 0.2)
      .fill({ color: 0xffffff, alpha: 0.2 });
  }

  /** Gold coin icon */
  private _drawCoinIcon(cx: number, cy: number, size: number): void {
    const g = this._gfx;
    const r = size * 0.35;
    g.circle(cx, cy, r).fill({ color: GOLD_COLOR, alpha: 0.9 });
    g.circle(cx, cy, r * 0.7).stroke({ color: GOLD_DARK, width: 1, alpha: 0.6 });
    this._addText("G", cx, cy, size * 0.35, GOLD_DARK, true);
  }

  /** Compass rose for minimap */
  private _drawCompassRose(cx: number, cy: number, size: number): void {
    const g = this._gfx;
    const s = size;
    // N arrow
    g.moveTo(cx, cy - s).lineTo(cx - s * 0.25, cy).lineTo(cx + s * 0.25, cy)
      .closePath().fill({ color: 0xcc2222, alpha: 0.8 });
    // S arrow
    g.moveTo(cx, cy + s).lineTo(cx - s * 0.2, cy).lineTo(cx + s * 0.2, cy)
      .closePath().fill({ color: 0xccccaa, alpha: 0.5 });
    // E/W
    g.moveTo(cx + s, cy).lineTo(cx, cy - s * 0.2).lineTo(cx, cy + s * 0.2)
      .closePath().fill({ color: 0xccccaa, alpha: 0.5 });
    g.moveTo(cx - s, cy).lineTo(cx, cy - s * 0.2).lineTo(cx, cy + s * 0.2)
      .closePath().fill({ color: 0xccccaa, alpha: 0.5 });
    this._addText("N", cx, cy - s - 6, 7, 0xcc2222, true);
  }

  /** Draw item icon based on type */
  private _drawItemIcon(cx: number, cy: number, size: number, itemType: string, color: number): void {
    switch (itemType) {
      case ItemType.WEAPON:
        this._drawSwordIcon(cx, cy, size, color);
        break;
      case ItemType.ARMOR:
        this._drawShieldIcon(cx, cy, size, color);
        break;
      case ItemType.CONSUMABLE:
        this._drawPotionIcon(cx, cy, size, color);
        break;
      case ItemType.RELIC:
        this._drawStarIcon(cx, cy, size, color);
        break;
      default:
        this._drawStarIcon(cx, cy, size, color);
    }
  }

  // =========================================================================
  //  GRADIENT BAR helper (simulated via horizontal slices)
  // =========================================================================

  private _drawGradientBar(
    x: number, y: number, w: number, h: number,
    fillFrac: number, colorA: number, colorB: number,
    radius = 3,
  ): void {
    const g = this._gfx;
    if (fillFrac <= 0) return;
    const fw = w * Math.min(1, fillFrac);
    // Draw in horizontal slices for gradient effect
    const steps = Math.max(1, Math.floor(h / 2));
    for (let i = 0; i < steps; i++) {
      const t = i / Math.max(1, steps - 1);
      // Top half is brighter, bottom half darker
      const brightness = t < 0.5 ? 1.0 : 0.7;
      const color = lerpColor(colorA, colorB, t);
      const [cr, cg, cb] = hexToRGB(color);
      const finalColor = (Math.round(cr * brightness) << 16) |
        (Math.round(cg * brightness) << 8) |
        Math.round(cb * brightness);
      const sy = y + (h * i) / steps;
      const sh2 = h / steps + 0.5;
      if (i === 0) {
        g.roundRect(x, sy, fw, sh2, radius).fill({ color: finalColor });
      } else if (i === steps - 1) {
        g.roundRect(x, sy, fw, sh2, radius).fill({ color: finalColor });
      } else {
        g.rect(x, sy, fw, sh2).fill({ color: finalColor });
      }
    }
    // Top highlight line
    g.roundRect(x + 2, y + 1, Math.max(0, fw - 4), 2, 1)
      .fill({ color: 0xffffff, alpha: 0.2 });
  }

  // =========================================================================
  //  RADIAL SWEEP (clock-wipe) for cooldowns
  // =========================================================================

  private _drawRadialSweep(
    cx: number, cy: number, radius: number,
    fraction: number, color = 0x000000, alpha = 0.6,
  ): void {
    if (fraction <= 0) return;
    if (fraction >= 1) {
      this._gfx.circle(cx, cy, radius).fill({ color, alpha });
      return;
    }
    const g = this._gfx;
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + Math.PI * 2 * fraction;
    g.moveTo(cx, cy);
    // Approximate arc with line segments
    const segments = 24;
    const angleRange = endAngle - startAngle;
    for (let i = 0; i <= segments; i++) {
      const a = startAngle + (angleRange * i) / segments;
      g.lineTo(cx + Math.cos(a) * radius, cy + Math.sin(a) * radius);
    }
    g.closePath().fill({ color, alpha });
  }

  // =========================================================================
  //  DIVIDER (ornate horizontal line)
  // =========================================================================

  private _drawOrnamentDivider(x: number, y: number, w: number, color = GOLD_DARK): void {
    const g = this._gfx;
    g.moveTo(x, y).lineTo(x + w, y).stroke({ color, width: 1, alpha: 0.6 });
    // Center diamond
    const cx = x + w / 2;
    g.moveTo(cx - 4, y).lineTo(cx, y - 3).lineTo(cx + 4, y).lineTo(cx, y + 3)
      .closePath().fill({ color, alpha: 0.7 });
    // End dots
    g.circle(x + 3, y, 1.5).fill({ color, alpha: 0.5 });
    g.circle(x + w - 3, y, 1.5).fill({ color, alpha: 0.5 });
  }

  // =========================================================================
  //  HP BAR — ornate frame, gradient, damage preview, pulsing low HP glow
  // =========================================================================

  private _drawHPBar(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const barW = 220;
    const barH = 20;
    const x = 40;
    const y = 16;

    // Initialize damage preview tracking
    if (this._anim.prevHp < 0) {
      this._anim.prevHp = p.hp;
      this._anim.dmgPreviewHp = p.hp;
    }

    // Detect damage
    if (p.hp < this._anim.prevHp) {
      this._anim.dmgFlashTimer = 0.4;
      // dmgPreviewHp stays at old value and slides down
    }
    this._anim.prevHp = p.hp;

    // Slide damage preview toward current HP
    if (this._anim.dmgPreviewHp > p.hp) {
      this._anim.dmgPreviewHp = Math.max(p.hp, this._anim.dmgPreviewHp - p.maxHp * 0.02);
    } else {
      this._anim.dmgPreviewHp = p.hp;
    }

    // Flash timer
    if (this._anim.dmgFlashTimer > 0) {
      this._anim.dmgFlashTimer -= 0.016;
    }

    // Heart icon
    this._drawHeartIcon(x - 14, y + barH / 2, 14, 0xff3344);

    // Panel background
    this._drawPanel(x - 2, y - 2, barW + 4, barH + 4, 0x1a0505, 0.9, 4);

    // Dark bar background
    g.roundRect(x, y, barW, barH, 3).fill({ color: 0x220808 });

    const hpFrac = Math.max(0, p.hp / p.maxHp);
    const dmgFrac = Math.max(0, this._anim.dmgPreviewHp / p.maxHp);

    // Damage preview (white/yellow flash bar)
    if (dmgFrac > hpFrac) {
      const flashAlpha = 0.3 + this._anim.dmgFlashTimer * 1.5;
      g.roundRect(x, y, barW * dmgFrac, barH, 3)
        .fill({ color: 0xffffcc, alpha: Math.min(0.8, flashAlpha) });
    }

    // HP gradient bar
    const hpColorA = hpFrac > 0.5 ? 0x44ff44 : hpFrac > 0.25 ? 0xffcc22 : 0xff3322;
    const hpColorB = hpFrac > 0.5 ? 0x116611 : hpFrac > 0.25 ? 0x664400 : 0x661111;
    this._drawGradientBar(x, y, barW, barH, hpFrac, hpColorA, hpColorB, 3);

    // Low HP pulsing glow
    if (hpFrac <= 0.25 && hpFrac > 0) {
      const pulse = Math.sin(this._anim.time * 6) * 0.3 + 0.3;
      g.roundRect(x - 3, y - 3, barW + 6, barH + 6, 5)
        .stroke({ color: 0xff2222, width: 2, alpha: pulse });
    }

    // Ornate golden frame
    this._drawOrnateFrame(x, y, barW, barH, GOLD_COLOR, 1.5, 5);

    // HP text with shadow
    this._addText(
      `${Math.ceil(p.hp)} / ${p.maxHp}`,
      x + barW / 2, y + barH / 2, 12, 0xffffff, true,
    );
  }

  // =========================================================================
  //  XP BAR — blue gradient, sparkle effect
  // =========================================================================

  private _drawXPBar(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const barW = 220;
    const barH = 10;
    const x = 40;
    const y = 42;

    // Detect XP gain
    if (this._anim.prevXp < 0) this._anim.prevXp = p.xp;
    if (p.xp > this._anim.prevXp) {
      this._anim.xpSparkleTimer = 1.0;
    }
    this._anim.prevXp = p.xp;
    if (this._anim.xpSparkleTimer > 0) this._anim.xpSparkleTimer -= 0.016;

    // Star icon
    this._drawStarIcon(x - 14, y + barH / 2, 12, 0x4488ff);

    // Panel
    this._drawPanel(x - 2, y - 2, barW + 4, barH + 4, 0x050510, 0.85, 3);
    g.roundRect(x, y, barW, barH, 2).fill({ color: 0x0a0a22 });

    const xpFrac = Math.min(1, p.xp / p.xpToNext);
    this._drawGradientBar(x, y, barW, barH, xpFrac, 0x6699ff, 0x112266, 2);

    // Sparkle particles when gaining XP
    if (this._anim.xpSparkleTimer > 0) {
      const sparkAlpha = this._anim.xpSparkleTimer;
      const fw = barW * xpFrac;
      for (let i = 0; i < 5; i++) {
        const sx = x + fw - 20 + Math.random() * 25;
        const sy = y + Math.random() * barH;
        g.circle(sx, sy, 1 + Math.random()).fill({ color: 0xaaccff, alpha: sparkAlpha * 0.8 });
      }
    }

    // Frame
    g.roundRect(x, y, barW, barH, 2)
      .stroke({ color: 0x3366aa, width: 1, alpha: 0.6 });
  }

  // =========================================================================
  //  LEVEL BADGE — ornate circular frame
  // =========================================================================

  private _drawLevelBadge(p: PlayerState): void {
    const g = this._gfx;
    const cx = 276;
    const cy = 28;
    const r = 16;

    // Outer glow
    g.circle(cx, cy, r + 4).fill({ color: GOLD_COLOR, alpha: 0.15 });
    // Dark circle
    g.circle(cx, cy, r).fill({ color: 0x0a0805, alpha: 0.95 });
    // Gold ring
    g.circle(cx, cy, r).stroke({ color: GOLD_COLOR, width: 2, alpha: 0.9 });
    // Inner ring
    g.circle(cx, cy, r - 3).stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.5 });

    // Level number
    this._addText(`${p.level}`, cx, cy, 14, GOLD_COLOR, true);
    // "Lv" label
    this._addText("Lv", cx, cy - r - 6, 8, 0x887766, true);
  }

  // =========================================================================
  //  STATS — with icons
  // =========================================================================

  private _drawStats(p: PlayerState, _sw: number, _sh: number): void {
    const x = 16;
    let y = 60;

    // Knight name with panel
    this._drawPanel(x - 4, y - 2, 260, 18, PANEL_BG, 0.7, 3);
    this._addText(`${p.knightDef.name} — ${p.knightDef.title}`, x, y + 6, 11, p.knightDef.color);
    y += 22;

    // Stats row with icons
    const statY = y + 6;
    let sx = x + 4;
    const gap = 64;

    // ATK
    this._drawSwordIcon(sx + 6, statY, 14, 0xcccccc);
    this._addText(`${p.attack}`, sx + 16, statY - 2, 10, 0xddccaa);
    sx += gap;

    // DEF
    this._drawShieldIcon(sx + 6, statY, 14, 0x6688aa);
    this._addText(`${p.defense}`, sx + 16, statY - 2, 10, 0xddccaa);
    sx += gap;

    // SPD
    this._drawBootIcon(sx + 6, statY, 14, 0x886644);
    this._addText(`${p.speed}`, sx + 16, statY - 2, 10, 0xddccaa);
    sx += gap;

    // CRIT
    this._drawStarIcon(sx + 6, statY, 12, 0xffcc44);
    this._addText(`${Math.round(p.critChance * 100)}%`, sx + 16, statY - 2, 10, 0xddccaa);
  }

  // =========================================================================
  //  BUFF INDICATORS — small glowing icons with duration
  // =========================================================================

  private _drawBuffIndicators(p: PlayerState): void {
    const g = this._gfx;
    const startX = 16;
    const y = 98;
    const size = 18;
    const gap = 4;

    if (p.statusEffects.length === 0) return;

    for (let i = 0; i < p.statusEffects.length; i++) {
      const eff = p.statusEffects[i];
      const bx = startX + i * (size + gap);

      // Glow
      const pulse = Math.sin(this._anim.time * 4 + i) * 0.15 + 0.3;
      const isDebuff = eff.id.includes("burn") || eff.id.includes("poison") || eff.id.includes("freeze");
      const buffColor = isDebuff ? 0xff3322 : 0x44ff44;
      g.roundRect(bx - 1, y - 1, size + 2, size + 2, 3)
        .fill({ color: buffColor, alpha: pulse });

      // Icon background
      g.roundRect(bx, y, size, size, 2).fill({ color: 0x111111, alpha: 0.9 });
      g.roundRect(bx, y, size, size, 2).stroke({ color: buffColor, width: 1, alpha: 0.7 });

      // Effect icon (simplified)
      const icx = bx + size / 2;
      const icy = y + size / 2;
      if (eff.id.includes("atk") || eff.id.includes("buff_atk")) {
        this._drawSwordIcon(icx, icy, 12, 0xff8844);
      } else if (eff.id.includes("def") || eff.id.includes("shield") || eff.id.includes("invulnerable")) {
        this._drawShieldIcon(icx, icy, 12, 0x44aaff);
      } else if (eff.id.includes("poison") || eff.id.includes("burn")) {
        this._drawSkullIcon(icx, icy, 12, 0x88ff44);
      } else {
        this._drawStarIcon(icx, icy, 10, buffColor);
      }

      // Duration timer
      this._addText(`${eff.turnsRemaining}`, bx + size - 2, y + size - 3, 7, 0xffffff);
    }
  }

  // =========================================================================
  //  ABILITY COOLDOWN — radial sweep, pulsing glow when ready
  // =========================================================================

  private _drawAbilityCooldown(p: PlayerState, _sw: number): void {
    const g = this._gfx;
    const x = 16;
    const y = 120;
    const ability = p.knightDef.ability;
    const iconSize = 36;
    const panelW = 180;
    const panelH = 42;

    // Panel background
    this._drawPanel(x, y, panelW, panelH, 0x0a0a18, 0.9, 5);

    // Ability icon area
    const icx = x + iconSize / 2 + 4;
    const icy = y + panelH / 2;

    // Element color from knight
    const elemColor = p.knightDef.color;

    // Icon background circle
    g.circle(icx, icy, iconSize / 2 + 1).fill({ color: 0x000000, alpha: 0.8 });
    g.circle(icx, icy, iconSize / 2 - 1).fill({ color: elemColor, alpha: 0.25 });

    // Simple ability icon (star shape in element color)
    this._drawStarIcon(icx, icy, iconSize * 0.6, elemColor);

    if (p.abilityCooldown <= 0) {
      // READY — pulsing glow
      const pulse = Math.sin(this._anim.time * 4) * 0.2 + 0.4;
      g.circle(icx, icy, iconSize / 2 + 3)
        .stroke({ color: elemColor, width: 2, alpha: pulse });
      g.circle(icx, icy, iconSize / 2 + 5)
        .stroke({ color: elemColor, width: 1, alpha: pulse * 0.5 });

      // Text
      this._addText(ability.name, x + iconSize + 10, y + 10, 11, 0xccddff);
      this._addText("[Q] READY", x + iconSize + 10, y + 26, 10, 0x88ffaa);
    } else {
      // Cooldown — radial sweep overlay
      const cdFrac = p.abilityCooldown / ability.cooldown;
      this._drawRadialSweep(icx, icy, iconSize / 2, cdFrac, 0x000000, 0.7);

      // Cooldown border
      g.circle(icx, icy, iconSize / 2).stroke({ color: 0x334455, width: 1.5, alpha: 0.7 });

      // Text
      this._addText(ability.name, x + iconSize + 10, y + 10, 11, 0x667788);
      this._addText(`[Q] ${Math.ceil(p.abilityCooldown)}s`, x + iconSize + 10, y + 26, 10, 0x556677);
    }

    // Frame around icon
    g.circle(icx, icy, iconSize / 2)
      .stroke({ color: GOLD_DARK, width: 1.5, alpha: 0.6 });
  }

  // =========================================================================
  //  FLOOR INFO — scroll/banner style
  // =========================================================================

  private _drawFloorInfo(state: GrailGameState, sw: number): void {
    const g = this._gfx;
    const themeIdx = Math.min(state.currentFloor, FLOOR_THEMES.length - 1);
    const theme = FLOOR_THEMES[themeIdx];
    const panelW = 200;
    const panelH = 68;
    const x = sw - panelW - 16;
    const y = 12;

    // Parchment-style banner
    this._drawParchmentBG(x, y, panelW, panelH);

    // Ornate top and bottom edges
    this._drawOrnamentDivider(x + 10, y + 2, panelW - 20, GOLD_DARK);
    this._drawOrnamentDivider(x + 10, y + panelH - 2, panelW - 20, GOLD_DARK);

    // Floor theme icon (colored diamond)
    const iconX = x + 16;
    const iconY = y + 20;
    g.moveTo(iconX, iconY - 6).lineTo(iconX + 6, iconY).lineTo(iconX, iconY + 6)
      .lineTo(iconX - 6, iconY).closePath()
      .fill({ color: theme.wallColor, alpha: 0.9 });

    // Floor text
    this._addText(
      `Floor ${state.currentFloor + 1} / ${state.totalFloors}`,
      x + 34, y + 14, 14, 0x3a2f1a,
    );
    this._addText(theme.name, x + 34, y + 32, 11, 0x5a4a30);

    // Enemy count with skull
    const alive = state.floor.enemies.filter((e) => e.alive).length;
    this._drawSkullIcon(x + 24, y + 52, 14, alive > 0 ? 0x884444 : 0x448844);
    this._addText(
      `${alive} remaining`,
      x + 38, y + 46, 10, alive > 0 ? 0x884433 : 0x338833,
    );
  }

  // =========================================================================
  //  MINIMAP — parchment bg, ornate frame, compass, animated blips
  // =========================================================================

  private _drawMinimap(floor: FloorState, player: PlayerState, sw: number, sh: number): void {
    const g = this._gfx;
    const mapW = 140;
    const mapH = 105;
    const mx = sw - mapW - 16;
    const my = sh - mapH - 50;

    // Parchment background
    this._drawParchmentBG(mx - 6, my - 6, mapW + 12, mapH + 12);

    // Dark map area
    g.rect(mx, my, mapW, mapH).fill({ color: 0x1a1610, alpha: 0.85 });

    const scaleX = mapW / floor.width;
    const scaleY = mapH / floor.height;

    // Tiles
    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        if (tile === TileType.WALL) continue;
        let color = 0x4a4435;
        if (tile === TileType.STAIRS_DOWN) color = 0x44aaff;
        else if (tile === TileType.ENTRANCE) color = 0x22aa22;
        else if (tile === TileType.TREASURE) color = 0xccaa44;
        else if (tile === TileType.TRAP) color = 0x664422;
        else if (tile === TileType.SHOP) color = 0xffaa22;
        else if (tile === TileType.VINE) color = 0x337722;
        else if (tile === TileType.ICE) color = 0x88bbdd;
        else if (tile === TileType.LAVA) color = 0xff4400;
        else if (tile === TileType.ILLUSION) color = 0x8844ff;
        else if (tile === TileType.SHRINE) color = 0x88ffaa;
        else color = 0x5a5440;

        const px = mx + c * scaleX;
        const py = my + r * scaleY;
        g.rect(px, py, Math.max(1, scaleX), Math.max(1, scaleY)).fill({ color });
      }
    }

    // Fog of war overlay for unexplored area (dark)
    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (floor.explored[r][c]) continue;
        const px = mx + c * scaleX;
        const py = my + r * scaleY;
        g.rect(px, py, Math.max(1, scaleX), Math.max(1, scaleY))
          .fill({ color: 0x0a0805, alpha: 0.8 });
      }
    }

    // Player viewport rectangle
    const viewTilesW = 25; // approximate viewport in tiles
    const viewTilesH = 18;
    const pc = player.x / GameBalance.TILE_SIZE;
    const pr = player.y / GameBalance.TILE_SIZE;
    const vpx = mx + (pc - viewTilesW / 2) * scaleX;
    const vpy = my + (pr - viewTilesH / 2) * scaleY;
    const vpw = viewTilesW * scaleX;
    const vph = viewTilesH * scaleY;
    g.rect(
      Math.max(mx, vpx), Math.max(my, vpy),
      Math.min(vpw, mapW), Math.min(vph, mapH),
    ).stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });

    // Enemy blips (pulsing)
    const enemyPulse = Math.sin(this._anim.time * 5) * 0.3 + 0.7;
    for (const e of floor.enemies) {
      if (!e.alive) continue;
      const ec = e.x / GameBalance.TILE_SIZE;
      const er = e.y / GameBalance.TILE_SIZE;
      if (er >= 0 && er < floor.height && ec >= 0 && ec < floor.width &&
          floor.explored[Math.floor(er)]?.[Math.floor(ec)]) {
        const color = e.def.isBoss ? 0xff0000 : 0xff6644;
        const dotR = e.def.isBoss ? 2.5 : 1.5;
        g.circle(mx + ec * scaleX, my + er * scaleY, dotR)
          .fill({ color, alpha: enemyPulse });
        if (e.def.isBoss) {
          g.circle(mx + ec * scaleX, my + er * scaleY, dotR + 1.5)
            .stroke({ color: 0xff0000, width: 0.5, alpha: enemyPulse * 0.5 });
        }
      }
    }

    // Player blip (animated, green with glow)
    const playerPulse = Math.sin(this._anim.time * 3) * 0.2 + 0.8;
    const ppx = mx + pc * scaleX;
    const ppy = my + pr * scaleY;
    g.circle(ppx, ppy, 3).fill({ color: 0x44ff44, alpha: playerPulse });
    g.circle(ppx, ppy, 5).stroke({ color: 0x44ff44, width: 0.5, alpha: playerPulse * 0.4 });

    // Ornate frame
    this._drawOrnateFrame(mx - 2, my - 2, mapW + 4, mapH + 4, GOLD_DARK, 1.5, 5);

    // Compass rose (top-right of minimap)
    this._drawCompassRose(mx + mapW - 10, my + 10, 5);

    // Label
    this._addText("MAP", mx + mapW / 2, my - 12, 8, PARCHMENT_DARK, true);
  }

  // =========================================================================
  //  INVENTORY BAR — ornate rarity-colored slots, item icons
  // =========================================================================

  private _drawInventoryBar(p: PlayerState, sw: number, sh: number): void {
    const g = this._gfx;
    const slotSize = 36;
    const gap = 4;
    const maxSlots = GameBalance.MAX_INVENTORY_SIZE;
    const totalW = maxSlots * (slotSize + gap);
    const startX = (sw - totalW) / 2;
    const y = sh - slotSize - 16;

    // Background panel
    this._drawPanel(startX - 8, y - 6, totalW + 16, slotSize + 12, 0x0a0805, 0.8, 6);

    for (let i = 0; i < maxSlots; i++) {
      const x = startX + i * (slotSize + gap);

      // Slot background
      g.roundRect(x, y, slotSize, slotSize, 4).fill({ color: 0x15120e, alpha: 0.9 });

      if (i < p.inventory.length) {
        const inv = p.inventory[i];
        const rarityColor = this._getRarityBorderColor(inv.def.rarity);

        // Rarity glow
        if (inv.def.rarity === ItemRarity.LEGENDARY) {
          const pulse = Math.sin(this._anim.time * 3 + i * 0.5) * 0.15 + 0.25;
          g.roundRect(x - 2, y - 2, slotSize + 4, slotSize + 4, 5)
            .fill({ color: GOLD_COLOR, alpha: pulse });
        } else if (inv.def.rarity === ItemRarity.RARE) {
          const pulse = Math.sin(this._anim.time * 2 + i) * 0.1 + 0.15;
          g.roundRect(x - 1, y - 1, slotSize + 2, slotSize + 2, 4)
            .fill({ color: 0x4488ff, alpha: pulse });
        }

        // Item fill
        g.roundRect(x + 2, y + 2, slotSize - 4, slotSize - 4, 2)
          .fill({ color: inv.def.color, alpha: 0.25 });

        // Item icon
        this._drawItemIcon(
          x + slotSize / 2, y + slotSize / 2,
          slotSize * 0.6, inv.def.type, inv.def.color,
        );

        // Rarity border
        g.roundRect(x, y, slotSize, slotSize, 4)
          .stroke({ color: rarityColor, width: 1.5, alpha: 0.8 });

        // Quantity badge
        if (inv.quantity > 1) {
          g.roundRect(x + slotSize - 12, y + slotSize - 10, 12, 10, 2)
            .fill({ color: 0x000000, alpha: 0.7 });
          this._addText(`${inv.quantity}`, x + slotSize - 6, y + slotSize - 5, 8, 0xffffff, true);
        }
      } else {
        // Empty slot
        g.roundRect(x, y, slotSize, slotSize, 4)
          .stroke({ color: 0x332a1e, width: 1, alpha: 0.5 });
      }
    }

    // Equipped slots area (left of inventory)
    const eqAreaX = startX - 135;
    const eqSlots = [
      { label: "WPN", icon: "weapon" as const, item: p.equippedWeapon },
      { label: "ARM", icon: "armor" as const, item: p.equippedArmor },
      { label: "RLC", icon: "relic" as const, item: p.equippedRelic },
    ];

    this._drawPanel(eqAreaX - 6, y - 20, 118, slotSize + 26, 0x0a0805, 0.8, 5);
    this._addText("EQUIPPED", eqAreaX + 50, y - 14, 8, GOLD_DARK, true);

    for (let i = 0; i < eqSlots.length; i++) {
      const eq = eqSlots[i];
      const ex = eqAreaX + i * (slotSize + gap);

      g.roundRect(ex, y, slotSize, slotSize, 4).fill({ color: 0x15120e, alpha: 0.9 });

      if (eq.item) {
        const rarityColor = this._getRarityBorderColor(eq.item.rarity);
        // Equipped glow
        const pulse = Math.sin(this._anim.time * 2.5 + i) * 0.12 + 0.2;
        g.roundRect(ex - 1, y - 1, slotSize + 2, slotSize + 2, 5)
          .fill({ color: rarityColor, alpha: pulse });

        g.roundRect(ex + 2, y + 2, slotSize - 4, slotSize - 4, 2)
          .fill({ color: eq.item.color, alpha: 0.3 });

        this._drawItemIcon(
          ex + slotSize / 2, y + slotSize / 2,
          slotSize * 0.6, eq.item.type, eq.item.color,
        );

        g.roundRect(ex, y, slotSize, slotSize, 4)
          .stroke({ color: rarityColor, width: 1.5, alpha: 0.8 });
      } else {
        g.roundRect(ex, y, slotSize, slotSize, 4)
          .stroke({ color: 0x443322, width: 1, alpha: 0.4 });
        // Placeholder icon
        const placeholderColor = 0x332a1e;
        if (i === 0) this._drawSwordIcon(ex + slotSize / 2, y + slotSize / 2, slotSize * 0.4, placeholderColor);
        else if (i === 1) this._drawShieldIcon(ex + slotSize / 2, y + slotSize / 2, slotSize * 0.4, placeholderColor);
        else this._drawStarIcon(ex + slotSize / 2, y + slotSize / 2, slotSize * 0.35, placeholderColor);
      }

      this._addText(eq.label, ex + slotSize / 2, y - 8, 7, 0x887766, true);
    }

    // Key hints bar
    this._drawPanel((sw - 480) / 2, sh - 10, 480, 14, 0x0a0805, 0.5, 3);
    this._addText(
      "[I] Inventory    [E] Interact/Shop    [Q] Ability    [WASD] Move    [SPACE] Attack",
      sw / 2, sh - 4, 8, 0x665544, true,
    );
  }

  private _getRarityBorderColor(rarity: string): number {
    switch (rarity) {
      case ItemRarity.COMMON: return 0x888888;
      case ItemRarity.UNCOMMON: return 0x44cc44;
      case ItemRarity.RARE: return 0x4488ff;
      case ItemRarity.LEGENDARY: return GOLD_COLOR;
      default: return 0x666666;
    }
  }

  // =========================================================================
  //  GOLD display
  // =========================================================================

  private _drawGold(p: PlayerState, sw: number): void {
    const x = sw - 210;
    const y = 84;
    this._drawPanel(x - 4, y - 4, 80, 20, 0x0a0805, 0.7, 3);
    this._drawCoinIcon(x + 8, y + 6, 14);
    this._addText(`${p.gold}`, x + 22, y + 1, 12, GOLD_COLOR);
  }

  // =========================================================================
  //  INVENTORY SCREEN (full overlay) — parchment style
  // =========================================================================

  private _drawInventoryScreen(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    const p = state.player;

    // Dark overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });

    // Central parchment panel
    const panelW = Math.min(700, sw - 60);
    const panelH = Math.min(500, sh - 80);
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    // Title
    this._addText("INVENTORY", sw / 2, py + 28, 22, 0x3a2a15, true);
    this._drawOrnamentDivider(px + 30, py + 48, panelW - 60, GOLD_DARK);

    this._addText("Press number key to equip/use. ESC to close.", sw / 2, py + 60, 11, 0x7a6a50, true);

    // Items list (left side)
    const listX = px + 30;
    let iy = py + 82;

    for (let i = 0; i < p.inventory.length; i++) {
      const inv = p.inventory[i];
      const rarityColor = GameBalance.RARITY_COLORS[inv.def.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0x555555;
      const darkRarity = lerpColor(rarityColor, 0x000000, 0.5);

      // Item row bg
      g.roundRect(listX - 4, iy - 4, panelW / 2 - 40, 32, 3)
        .fill({ color: darkRarity, alpha: 0.15 });

      // Item icon
      this._drawItemIcon(listX + 12, iy + 10, 18, inv.def.type, inv.def.color);

      // Item text
      this._addText(
        `[${i + 1}] ${inv.def.name}${inv.quantity > 1 ? ` x${inv.quantity}` : ""}`,
        listX + 28, iy, 12, rarityColor,
      );
      this._addText(inv.def.desc, listX + 28, iy + 16, 9, 0x7a6a50);
      iy += 38;
    }

    if (p.inventory.length === 0) {
      this._addText("Your pack is empty.", px + panelW / 4, py + 120, 13, 0x8a7a60, true);
    }

    // Divider between lists
    const divX = px + panelW / 2;
    g.moveTo(divX, py + 55).lineTo(divX, py + panelH - 20)
      .stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.3 });

    // Equipped items (right side)
    const eqX = divX + 20;
    let ey = py + 82;

    this._addText("Equipped", eqX, ey, 14, 0x4a3a20);
    this._drawOrnamentDivider(eqX, ey + 18, panelW / 2 - 60, GOLD_DARK);
    ey += 30;

    const equipped = [
      { label: "Weapon", item: p.equippedWeapon, type: ItemType.WEAPON },
      { label: "Armor", item: p.equippedArmor, type: ItemType.ARMOR },
      { label: "Relic", item: p.equippedRelic, type: ItemType.RELIC },
    ];

    for (const eq of equipped) {
      this._drawItemIcon(eqX + 12, ey + 8, 18, eq.type, eq.item?.color ?? 0x444444);
      const rarityColor = eq.item ?
        (GameBalance.RARITY_COLORS[eq.item.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa) :
        0x666655;
      this._addText(
        `${eq.label}: ${eq.item?.name ?? "None"}`,
        eqX + 28, ey + 2, 12, rarityColor,
      );
      if (eq.item) {
        const bonuses: string[] = [];
        if (eq.item.attackBonus) bonuses.push(`+${eq.item.attackBonus} ATK`);
        if (eq.item.defenseBonus) bonuses.push(`+${eq.item.defenseBonus} DEF`);
        if (eq.item.hpBonus) bonuses.push(`+${eq.item.hpBonus} HP`);
        if (eq.item.speedBonus) bonuses.push(`${eq.item.speedBonus > 0 ? "+" : ""}${eq.item.speedBonus} SPD`);
        if (bonuses.length > 0) {
          this._addText(bonuses.join("  "), eqX + 28, ey + 17, 9, 0x7a6a50);
        }
      }
      ey += 36;
    }
  }

  // =========================================================================
  //  SHOP SCREEN — buy/sell interface
  // =========================================================================

  private _drawShopScreen(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    const p = state.player;

    // Dark overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });

    // Central parchment panel
    const panelW = Math.min(600, sw - 60);
    const panelH = Math.min(460, sh - 80);
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    // Title
    this._addText("MERCHANT'S WARES", sw / 2, py + 28, 22, 0x3a2a15, true);
    this._drawOrnamentDivider(px + 30, py + 48, panelW - 60, GOLD_DARK);

    // Gold display
    this._drawCoinIcon(px + 40, py + 64, 16);
    this._addText(`Gold: ${p.gold}`, px + 56, py + 58, 14, GOLD_COLOR);

    // Tab indicator
    const buyColor = !state.shopSellMode ? 0xffd700 : 0x887766;
    const sellColor = state.shopSellMode ? 0xffd700 : 0x887766;
    this._addText("[TAB] to switch mode", sw / 2, py + 60, 10, 0x7a6a50, true);
    this._addText("BUY", px + panelW / 2 - 40, py + 76, 14, buyColor, true);
    this._addText("SELL", px + panelW / 2 + 40, py + 76, 14, sellColor, true);
    // Underline active
    if (!state.shopSellMode) {
      g.rect(px + panelW / 2 - 55, py + 86, 30, 2).fill({ color: GOLD_COLOR, alpha: 0.8 });
    } else {
      g.rect(px + panelW / 2 + 25, py + 86, 30, 2).fill({ color: GOLD_COLOR, alpha: 0.8 });
    }

    this._drawOrnamentDivider(px + 30, py + 92, panelW - 60, GOLD_DARK);

    let iy = py + 106;

    if (!state.shopSellMode) {
      // BUY mode
      for (let i = 0; i < SHOP_ITEMS.length && i < 9; i++) {
        const item = SHOP_ITEMS[i];
        const canAfford = p.gold >= item.cost;
        const textColor = canAfford ? 0x3a2a15 : 0x995544;
        const costColor = canAfford ? GOLD_COLOR : 0x884422;

        // Row background
        const rowBg = canAfford ? 0x000000 : 0x220000;
        g.roundRect(px + 24, iy - 3, panelW - 48, 28, 3).fill({ color: rowBg, alpha: 0.08 });

        // Key hint
        g.roundRect(px + 28, iy, 20, 18, 2).fill({ color: canAfford ? GOLD_COLOR : 0x666655, alpha: 0.2 });
        this._addText(`${i + 1}`, px + 38, iy + 9, 10, textColor, true);

        // Item name
        this._addText(item.name, px + 56, iy, 12, textColor);
        // Description
        this._addText(item.desc, px + 56, iy + 14, 9, 0x7a6a50);
        // Cost
        this._drawCoinIcon(px + panelW - 80, iy + 8, 12);
        this._addText(`${item.cost}`, px + panelW - 65, iy + 3, 11, costColor);

        iy += 32;
      }
    } else {
      // SELL mode
      if (p.inventory.length === 0) {
        this._addText("Nothing to sell.", sw / 2, py + 140, 14, 0x8a7a60, true);
      }

      for (let i = 0; i < p.inventory.length && i < 9; i++) {
        const inv = p.inventory[i];
        const baseValues: Record<string, number> = {
          common: 10, uncommon: 30, rare: 70, legendary: 150,
        };
        const baseVal = baseValues[inv.def.rarity] || 10;
        const sellPrice = Math.floor(baseVal * 0.7);

        const rarityColor = GameBalance.RARITY_COLORS[inv.def.rarity as keyof typeof GameBalance.RARITY_COLORS] ?? 0xaaaaaa;

        g.roundRect(px + 24, iy - 3, panelW - 48, 28, 3).fill({ color: 0x000000, alpha: 0.08 });

        // Key hint
        g.roundRect(px + 28, iy, 20, 18, 2).fill({ color: rarityColor, alpha: 0.2 });
        this._addText(`${i + 1}`, px + 38, iy + 9, 10, 0x3a2a15, true);

        // Item icon
        this._drawItemIcon(px + 58, iy + 9, 16, inv.def.type, inv.def.color);

        // Item name
        this._addText(
          `${inv.def.name}${inv.quantity > 1 ? ` x${inv.quantity}` : ""}`,
          px + 72, iy, 12, rarityColor,
        );
        this._addText(inv.def.desc, px + 72, iy + 14, 9, 0x7a6a50);

        // Sell price
        this._drawCoinIcon(px + panelW - 80, iy + 8, 12);
        this._addText(`${sellPrice}`, px + panelW - 65, iy + 3, 11, GOLD_COLOR);

        iy += 32;
      }
    }

    // Footer
    this._addText("Press ESC or E to close", sw / 2, py + panelH - 18, 11, 0x7a6a50, true);
  }

  // =========================================================================
  //  GENRE SELECT — parchment bg, genre cards with thematic art
  // =========================================================================

  private _drawGenreSelect(_state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;

    // Full screen dark overlay with vignette effect
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.97 });

    // Top vignette gradient (simulated)
    for (let i = 0; i < 5; i++) {
      g.rect(0, i * 4, sw, 4).fill({ color: 0x000000, alpha: 0.3 - i * 0.06 });
    }

    // Title with golden glow
    const titleY = 50;
    this._addText("QUEST FOR THE GRAIL", sw / 2, titleY, 32, GOLD_COLOR, true);
    this._drawOrnamentDivider(sw / 2 - 150, titleY + 22, 300, GOLD_COLOR);
    this._addText("Choose Your Quest", sw / 2, titleY + 38, 16, 0xaa9977, true);

    const genres = QUEST_GENRE_DEFS;
    const cols = 3;
    const cardW = 230;
    const cardH = 140;
    const gap = 20;
    const startX = (sw - (cols * cardW + (cols - 1) * gap)) / 2;
    const startY = titleY + 70;

    for (let i = 0; i < genres.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const genre = genres[i];

      // Card with hover-like glow
      const pulse = Math.sin(this._anim.time * 2 + i * 0.8) * 0.08 + 0.12;
      g.roundRect(x - 2, y - 2, cardW + 4, cardH + 4, 8)
        .fill({ color: genre.color, alpha: pulse });

      // Card background
      this._drawParchmentBG(x, y, cardW, cardH);

      // Genre color accent bar
      g.roundRect(x, y, cardW, 4, 2).fill({ color: genre.color, alpha: 0.8 });

      // Genre icon (themed shape)
      const icx = x + 24;
      const icy = y + 32;
      this._drawGenreIcon(icx, icy, 20, i, genre.color);

      // Title
      this._addText(genre.label, x + 44, y + 18, 14, 0x2a1a0a);

      // Separator
      g.moveTo(x + 10, y + 44).lineTo(x + cardW - 10, y + 44)
        .stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.4 });

      // Word wrap the description
      const words = genre.desc.split(" ");
      let line = "";
      let ly = y + 54;
      for (const w of words) {
        if ((line + " " + w).length > 32) {
          this._addText(line.trim(), x + cardW / 2, ly, 10, 0x6a5a40, true);
          ly += 14;
          line = w;
        } else {
          line += " " + w;
        }
      }
      if (line.trim()) this._addText(line.trim(), x + cardW / 2, ly, 10, 0x6a5a40, true);

      // Key hint badge
      g.roundRect(x + cardW / 2 - 14, y + cardH - 24, 28, 18, 4)
        .fill({ color: genre.color, alpha: 0.2 });
      g.roundRect(x + cardW / 2 - 14, y + cardH - 24, 28, 18, 4)
        .stroke({ color: genre.color, width: 1, alpha: 0.5 });
      this._addText(`${i + 1}`, x + cardW / 2, y + cardH - 15, 12, 0x3a2a15, true);
    }

    this._addText("Press 1-6 to select a quest type", sw / 2, sh - 36, 13, 0x665544, true);
  }

  private _drawGenreIcon(cx: number, cy: number, size: number, index: number, color: number): void {
    const g = this._gfx;
    const s = size * 0.4;
    switch (index) {
      case 0: // Classic — chalice
        g.moveTo(cx - s * 0.3, cy - s * 0.4).lineTo(cx + s * 0.3, cy - s * 0.4)
          .lineTo(cx + s * 0.4, cy + s * 0.2).lineTo(cx - s * 0.4, cy + s * 0.2)
          .closePath().fill({ color, alpha: 0.7 });
        g.rect(cx - s * 0.08, cy + s * 0.2, s * 0.16, s * 0.25).fill({ color, alpha: 0.7 });
        g.rect(cx - s * 0.25, cy + s * 0.45, s * 0.5, s * 0.08).fill({ color, alpha: 0.7 });
        break;
      case 1: // Dark — skull
        this._drawSkullIcon(cx, cy, size, color);
        break;
      case 2: // Crusade — cross
        g.rect(cx - s * 0.1, cy - s * 0.5, s * 0.2, s * 1).fill({ color, alpha: 0.7 });
        g.rect(cx - s * 0.35, cy - s * 0.15, s * 0.7, s * 0.2).fill({ color, alpha: 0.7 });
        break;
      case 3: // Fae — leaf/spiral
        this._drawStarIcon(cx, cy, size, color);
        break;
      case 4: // Siege — castle
        g.rect(cx - s * 0.35, cy - s * 0.1, s * 0.7, s * 0.6).fill({ color, alpha: 0.7 });
        g.rect(cx - s * 0.45, cy - s * 0.35, s * 0.2, s * 0.45).fill({ color, alpha: 0.7 });
        g.rect(cx + s * 0.25, cy - s * 0.35, s * 0.2, s * 0.45).fill({ color, alpha: 0.7 });
        // Battlements
        g.rect(cx - s * 0.45, cy - s * 0.5, s * 0.08, s * 0.15).fill({ color, alpha: 0.7 });
        g.rect(cx - s * 0.3, cy - s * 0.5, s * 0.08, s * 0.15).fill({ color, alpha: 0.7 });
        g.rect(cx + s * 0.25, cy - s * 0.5, s * 0.08, s * 0.15).fill({ color, alpha: 0.7 });
        g.rect(cx + s * 0.38, cy - s * 0.5, s * 0.08, s * 0.15).fill({ color, alpha: 0.7 });
        break;
      case 5: // Legends — shield
        this._drawShieldIcon(cx, cy, size, color);
        break;
    }
  }

  // =========================================================================
  //  KNIGHT SELECT — character portraits, stat bars
  // =========================================================================

  private _drawKnightSelect(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.97 });

    const genreLabel = state.genre?.label ?? "Quest";
    this._addText(genreLabel, sw / 2, 24, 14, state.genre?.color ?? GOLD_COLOR, true);
    this._addText("Choose Your Knight", sw / 2, 48, 24, GOLD_COLOR, true);
    this._drawOrnamentDivider(sw / 2 - 120, 66, 240, GOLD_COLOR);

    const knights = KNIGHT_DEFS;
    const cols = 4;
    const cardW = 190;
    const cardH = 220;
    const gap = 16;
    const startX = (sw - (cols * cardW + (cols - 1) * gap)) / 2;
    const startY = 84;

    for (let i = 0; i < knights.length; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const x = startX + col * (cardW + gap);
      const y = startY + row * (cardH + gap);
      const k = knights[i];
      const locked = !state.unlockedKnights.includes(k.id);

      if (locked) {
        // Locked card — darker, no details
        this._drawPanel(x, y, cardW, cardH, 0x0a0a0a, 0.9, 6);
        g.roundRect(x, y, cardW, cardH, 6).stroke({ color: 0x333333, width: 1.5 });

        // Locked portrait silhouette
        g.circle(x + cardW / 2, y + 42, 24).fill({ color: 0x1a1a1a });
        g.circle(x + cardW / 2, y + 42, 24).stroke({ color: 0x333333, width: 1 });
        this._addText("?", x + cardW / 2, y + 42, 20, 0x444444, true);
        this._addText("LOCKED", x + cardW / 2, y + 80, 12, 0x555555, true);
        continue;
      }

      // Card glow
      const pulse = Math.sin(this._anim.time * 1.5 + i * 0.7) * 0.06 + 0.1;
      g.roundRect(x - 2, y - 2, cardW + 4, cardH + 4, 8)
        .fill({ color: k.color, alpha: pulse });

      // Card background
      this._drawParchmentBG(x, y, cardW, cardH);
      g.roundRect(x, y, cardW, 4, 2).fill({ color: k.color, alpha: 0.7 });

      // Knight portrait circle
      g.circle(x + cardW / 2, y + 40, 26).fill({ color: 0x1a1510, alpha: 0.9 });
      g.circle(x + cardW / 2, y + 40, 24).fill({ color: k.color, alpha: 0.3 });
      // Knight silhouette (helmet shape)
      this._drawKnightSilhouette(x + cardW / 2, y + 40, 18, k.color);
      g.circle(x + cardW / 2, y + 40, 26).stroke({ color: k.color, width: 2, alpha: 0.7 });

      // Name and title
      this._addText(k.name, x + cardW / 2, y + 74, 14, 0x3a2a15, true);
      this._addText(k.title, x + cardW / 2, y + 90, 9, 0x7a6a50, true);

      // Stat bars (mini)
      const barX = x + 20;
      const barW = cardW - 40;
      let by = y + 104;

      this._drawMiniStatBar(barX, by, barW, "HP", k.hp, 150, 0x44cc44);
      by += 14;
      this._drawMiniStatBar(barX, by, barW, "ATK", k.attack, 30, 0xff6644);
      by += 14;
      this._drawMiniStatBar(barX, by, barW, "DEF", k.defense, 25, 0x4488cc);
      by += 14;
      this._drawMiniStatBar(barX, by, barW, "SPD", k.speed, 6, 0xaacc44);
      by += 14;
      this._drawMiniStatBar(barX, by, barW, "CRT", Math.round(k.critChance * 100), 30, 0xffcc44);

      // Ability
      by += 18;
      g.moveTo(x + 10, by - 6).lineTo(x + cardW - 10, by - 6)
        .stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 });
      this._addText(k.ability.name, x + cardW / 2, by, 10, 0x3366aa, true);

      // Ability desc word wrap
      const words = k.ability.desc.split(" ");
      let line = "";
      let ly = by + 14;
      for (const w of words) {
        if ((line + " " + w).length > 26) {
          this._addText(line.trim(), x + cardW / 2, ly, 8, 0x7a6a50, true);
          ly += 11;
          line = w;
        } else {
          line += " " + w;
        }
      }
      if (line.trim()) this._addText(line.trim(), x + cardW / 2, ly, 8, 0x7a6a50, true);

      // Key hint badge
      g.roundRect(x + cardW / 2 - 12, y + cardH - 20, 24, 16, 3)
        .fill({ color: k.color, alpha: 0.2 });
      g.roundRect(x + cardW / 2 - 12, y + cardH - 20, 24, 16, 3)
        .stroke({ color: k.color, width: 1, alpha: 0.4 });
      this._addText(`${i + 1}`, x + cardW / 2, y + cardH - 12, 10, 0x3a2a15, true);
    }

    this._addText("Press 1-8 to select (ESC to go back)", sw / 2, sh - 32, 13, 0x665544, true);
  }

  private _drawKnightSilhouette(cx: number, cy: number, size: number, color: number): void {
    const g = this._gfx;
    const s = size;
    // Helmet
    g.moveTo(cx - s * 0.35, cy + s * 0.1)
      .lineTo(cx - s * 0.4, cy - s * 0.2)
      .lineTo(cx - s * 0.3, cy - s * 0.5)
      .lineTo(cx + s * 0.3, cy - s * 0.5)
      .lineTo(cx + s * 0.4, cy - s * 0.2)
      .lineTo(cx + s * 0.35, cy + s * 0.1)
      .closePath()
      .fill({ color, alpha: 0.7 });
    // Visor slit
    g.rect(cx - s * 0.25, cy - s * 0.1, s * 0.5, s * 0.06)
      .fill({ color: 0x000000, alpha: 0.6 });
    // Plume
    g.moveTo(cx, cy - s * 0.5).lineTo(cx + s * 0.15, cy - s * 0.8)
      .lineTo(cx - s * 0.1, cy - s * 0.5)
      .closePath().fill({ color, alpha: 0.5 });
    // Shoulders
    g.moveTo(cx - s * 0.35, cy + s * 0.1).lineTo(cx - s * 0.55, cy + s * 0.5)
      .lineTo(cx + s * 0.55, cy + s * 0.5).lineTo(cx + s * 0.35, cy + s * 0.1)
      .closePath().fill({ color, alpha: 0.4 });
  }

  private _drawMiniStatBar(
    x: number, y: number, maxW: number,
    label: string, value: number, maxValue: number, color: number,
  ): void {
    const g = this._gfx;
    const labelW = 28;
    const barH = 8;
    const barW = maxW - labelW - 30;
    const bx = x + labelW;

    this._addText(label, x, y - 1, 8, 0x6a5a40);
    g.roundRect(bx, y, barW, barH, 2).fill({ color: 0x1a1510, alpha: 0.6 });
    const frac = Math.min(1, value / maxValue);
    g.roundRect(bx, y, barW * frac, barH, 2).fill({ color, alpha: 0.7 });
    this._addText(`${value}`, bx + barW + 4, y - 1, 8, 0x6a5a40);
  }

  // =========================================================================
  //  GAME OVER — dramatic red vignette, stats scroll
  // =========================================================================

  private _drawGameOver(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;

    // Dark red overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0000, alpha: 0.92 });

    // Red vignette edges
    const vignetteAlpha = 0.3 + Math.sin(this._anim.time * 1.5) * 0.1;
    g.rect(0, 0, sw, 40).fill({ color: 0x880000, alpha: vignetteAlpha * 0.5 });
    g.rect(0, sh - 40, sw, 40).fill({ color: 0x880000, alpha: vignetteAlpha * 0.5 });
    g.rect(0, 0, 40, sh).fill({ color: 0x880000, alpha: vignetteAlpha * 0.3 });
    g.rect(sw - 40, 0, 40, sh).fill({ color: 0x880000, alpha: vignetteAlpha * 0.3 });

    // Skull icon
    this._drawSkullIcon(sw / 2, sh / 2 - 130, 40, 0x882222);

    // Title
    this._addText("FALLEN IN BATTLE", sw / 2, sh / 2 - 90, 32, 0xff2222, true);
    this._drawOrnamentDivider(sw / 2 - 120, sh / 2 - 68, 240, 0x882222);

    // Stats scroll panel
    const panelW = 360;
    const panelH = 200;
    const px = (sw - panelW) / 2;
    const py = sh / 2 - 54;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, 0x882222, 1.5, 6);

    this._addText(
      `${state.player.knightDef.name} has perished on Floor ${state.currentFloor + 1}`,
      sw / 2, py + 20, 14, 0x5a3a20, true,
    );

    this._drawOrnamentDivider(px + 20, py + 36, panelW - 40, 0x8a6a4a);

    // Stats with icons
    const statY = py + 52;
    this._drawSwordIcon(sw / 2 - 120, statY, 14, 0x884444);
    this._addText(`Kills: ${state.totalKills}`, sw / 2 - 105, statY - 5, 12, 0x5a4a30);

    this._drawCoinIcon(sw / 2 - 20, statY, 14);
    this._addText(`Gold: ${state.totalGold}`, sw / 2 - 5, statY - 5, 12, 0x5a4a30);

    this._drawStarIcon(sw / 2 + 80, statY, 14, 0x4466aa);
    this._addText(`Level: ${state.player.level}`, sw / 2 + 95, statY - 5, 12, 0x5a4a30);

    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    this._addText(
      `Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      sw / 2, py + 90, 11, 0x7a6a50, true,
    );

    if (state.killedBosses.length > 0) {
      this._addText(
        `Bosses Slain: ${state.killedBosses.length}`,
        sw / 2, py + 108, 11, 0x884433, true,
      );
    }

    // Career stats section
    this._drawOrnamentDivider(px + 30, py + 124, panelW - 60, 0x8a6a4a);
    this._addText("Career", sw / 2, py + 134, 11, 0x6a5a40, true);
    const career = loadRunStats();
    this._addText(
      `Runs: ${career.totalRuns}  |  Victories: ${career.totalVictories}  |  Best Floor: ${career.bestFloor}`,
      sw / 2, py + 152, 10, 0x7a6a50, true,
    );
    this._addText(
      `All-time Kills: ${career.totalKillsAllTime}  |  Bosses Found: ${career.bossesDefeated.length}`,
      sw / 2, py + 168, 10, 0x7a6a50, true,
    );
    if (career.fastestVictoryMs < Infinity) {
      const best = Math.floor(career.fastestVictoryMs / 1000);
      this._addText(
        `Fastest Win: ${Math.floor(best / 60)}m ${best % 60}s`,
        sw / 2, py + 184, 10, 0x7a6a50, true,
      );
    }

    this._addText(
      "Press ENTER to try again  |  ESC to exit",
      sw / 2, py + panelH + 24, 14, 0x887766, true,
    );
  }

  // =========================================================================
  //  VICTORY — golden rays, achievement summary
  // =========================================================================

  private _drawVictory(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.92 });

    // Golden rays emanating from center
    const rcx = sw / 2;
    const rcy = sh / 2 - 40;
    const rayCount = 12;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount + this._anim.time * 0.15;
      const innerR = 40;
      const outerR = 250;
      const spread = 0.08;
      const alpha = 0.06 + Math.sin(this._anim.time * 2 + i) * 0.03;

      g.moveTo(
        rcx + Math.cos(angle - spread) * innerR,
        rcy + Math.sin(angle - spread) * innerR,
      )
        .lineTo(
          rcx + Math.cos(angle - spread * 2) * outerR,
          rcy + Math.sin(angle - spread * 2) * outerR,
        )
        .lineTo(
          rcx + Math.cos(angle + spread * 2) * outerR,
          rcy + Math.sin(angle + spread * 2) * outerR,
        )
        .lineTo(
          rcx + Math.cos(angle + spread) * innerR,
          rcy + Math.sin(angle + spread) * innerR,
        )
        .closePath()
        .fill({ color: GOLD_COLOR, alpha });
    }

    // Chalice icon
    const chaliceY = sh / 2 - 110;
    g.moveTo(rcx - 12, chaliceY - 15).lineTo(rcx + 12, chaliceY - 15)
      .lineTo(rcx + 16, chaliceY + 8).lineTo(rcx - 16, chaliceY + 8)
      .closePath().fill({ color: GOLD_COLOR, alpha: 0.8 });
    g.rect(rcx - 3, chaliceY + 8, 6, 10).fill({ color: GOLD_COLOR, alpha: 0.8 });
    g.rect(rcx - 10, chaliceY + 18, 20, 4).fill({ color: GOLD_COLOR, alpha: 0.8 });
    // Glow
    g.circle(rcx, chaliceY, 30).fill({ color: GOLD_COLOR, alpha: 0.08 });

    this._addText("THE GRAIL IS FOUND!", sw / 2, sh / 2 - 60, 32, GOLD_COLOR, true);
    this._drawOrnamentDivider(sw / 2 - 140, sh / 2 - 38, 280, GOLD_COLOR);

    // Achievement scroll
    const panelW = 380;
    const panelH = 210;
    const px = (sw - panelW) / 2;
    const py = sh / 2 - 22;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    this._addText(
      `${state.player.knightDef.name} has completed the quest!`,
      sw / 2, py + 20, 14, 0x4a3a15, true,
    );

    this._drawOrnamentDivider(px + 20, py + 36, panelW - 40, GOLD_DARK);

    // Stats
    const statY = py + 54;
    this._drawSwordIcon(sw / 2 - 120, statY, 14, 0xaaaa44);
    this._addText(`Kills: ${state.totalKills}`, sw / 2 - 105, statY - 5, 12, 0x5a4a30);

    this._drawCoinIcon(sw / 2 - 20, statY, 14);
    this._addText(`Gold: ${state.totalGold}`, sw / 2 - 5, statY - 5, 12, 0x5a4a30);

    this._drawStarIcon(sw / 2 + 80, statY, 14, 0x4466aa);
    this._addText(`Level: ${state.player.level}`, sw / 2 + 95, statY - 5, 12, 0x5a4a30);

    this._drawSkullIcon(sw / 2 - 40, statY + 28, 14, 0x884444);
    this._addText(
      `Bosses Slain: ${state.killedBosses.length}`,
      sw / 2 - 20, statY + 22, 12, 0x884433,
    );

    const elapsed = Math.floor((Date.now() - state.startTime) / 1000);
    this._addText(
      `Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`,
      sw / 2, py + 110, 11, 0x7a6a50, true,
    );

    if (state.foundRelics.length > 0) {
      this._addText(
        `Relics Found: ${state.foundRelics.length}`,
        sw / 2, py + 128, 11, GOLD_DARK, true,
      );
    }

    // Career stats section
    this._drawOrnamentDivider(px + 30, py + 144, panelW - 60, GOLD_DARK);
    this._addText("Career", sw / 2, py + 154, 11, GOLD_DARK, true);
    const career = loadRunStats();
    this._addText(
      `Total Victories: ${career.totalVictories}  |  Best Level: ${career.highestLevel}  |  Genres: ${career.genresCompleted.length}/6`,
      sw / 2, py + 172, 10, 0x7a6a50, true,
    );
    if (career.fastestVictoryMs < Infinity) {
      const best = Math.floor(career.fastestVictoryMs / 1000);
      this._addText(
        `Fastest Win: ${Math.floor(best / 60)}m ${best % 60}s  |  All-time Kills: ${career.totalKillsAllTime}`,
        sw / 2, py + 188, 10, 0x7a6a50, true,
      );
    }

    this._addText(
      "Press ENTER to play again  |  ESC to exit",
      sw / 2, py + panelH + 24, 14, 0x887766, true,
    );
  }

  // =========================================================================
  //  PAUSED — frosted overlay
  // =========================================================================

  private _drawPaused(sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });

    // Central panel
    const panelW = 280;
    const panelH = 100;
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_DARK, 1.5, 6);

    this._addText("PAUSED", sw / 2, sh / 2 - 8, 26, 0x3a2a15, true);
    this._addText("Press P to resume  |  ESC to exit", sw / 2, sh / 2 + 22, 12, 0x7a6a50, true);
  }

  // =========================================================================
  //  FLOOR TRANSITION SCREEN
  // =========================================================================

  private _drawFloorTransition(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });

    const panelW = 360;
    const panelH = 200;
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    const p = state.player;
    const nextFloor = state.currentFloor + 1;
    const themeName = nextFloor < 8
      ? ["Castle Dungeons", "Enchanted Forest", "Crimson Crypts", "Frozen Depths", "Volcanic Tunnels", "Faerie Hollows", "Abyssal Halls", "The Final Keep"][Math.min(nextFloor, 7)]
      : "The Depths";

    this._addText(`Floor ${nextFloor + 1}`, sw / 2, py + 28, 24, 0x3a2a15, true);
    this._addText(themeName, sw / 2, py + 55, 16, 0x7a6a50, true);

    // Divider
    g.moveTo(px + 30, py + 72).lineTo(px + panelW - 30, py + 72)
      .stroke({ color: GOLD_DARK, width: 1, alpha: 0.5 });

    // Run stats so far
    const statX = px + 40;
    const statValX = px + panelW - 40;
    let sy = py + 88;
    const statColor = 0x3a2a15;
    const valColor = 0x5a4a30;

    this._addText("Kills:", statX, sy, 13, statColor); this._addText(`${state.totalKills}`, statValX, sy, 13, valColor);
    sy += 20;
    this._addText("Gold:", statX, sy, 13, statColor); this._addText(`${p.gold}`, statValX, sy, 13, valColor);
    sy += 20;
    this._addText("Level:", statX, sy, 13, statColor); this._addText(`${p.level}`, statValX, sy, 13, valColor);
    sy += 20;
    const hpPct = Math.floor((p.hp / p.maxHp) * 100);
    const hpColor = hpPct > 60 ? 0x44aa44 : hpPct > 30 ? 0xaaaa22 : 0xaa3322;
    this._addText("HP:", statX, sy, 13, statColor); this._addText(`${Math.ceil(p.hp)} / ${p.maxHp} (${hpPct}%)`, statValX, sy, 13, hpColor);
  }

  // =========================================================================
  //  DASH COOLDOWN INDICATOR
  // =========================================================================

  private _drawDashIndicator(state: GrailGameState, _sw: number, sh: number): void {
    const g = this._gfx;
    const dashReady = state.dashCooldown <= 0;
    const x = 18;
    const y = sh - 50;

    // Small circular indicator
    const radius = 12;
    g.circle(x, y, radius + 1).fill({ color: 0x000000, alpha: 0.5 });

    if (dashReady) {
      const pulse = 0.5 + Math.sin(this._anim.time * 4) * 0.3;
      g.circle(x, y, radius).fill({ color: 0x44ccff, alpha: pulse });
      this._addText("DASH", x, y + 18, 8, 0x44ccff, true);
    } else {
      // Cooldown sweep
      const cdPct = Math.max(0, state.dashCooldown / 0.8); // 0.8 = DASH_COOLDOWN
      g.circle(x, y, radius).fill({ color: 0x222233, alpha: 0.8 });
      // Sweep arc for remaining cooldown
      if (cdPct > 0) {
        g.moveTo(x, y);
        g.arc(x, y, radius, -Math.PI / 2, -Math.PI / 2 + (1 - cdPct) * Math.PI * 2);
        g.lineTo(x, y);
        g.fill({ color: 0x44ccff, alpha: 0.4 });
      }
      this._addText("SHIFT", x, y + 18, 7, 0x556677, true);
    }
  }

  // =========================================================================
  //  KILL STREAK INDICATOR
  // =========================================================================

  private _drawKillStreak(state: GrailGameState, sw: number, _sh: number): void {
    if (state.killStreakCount < 2) return;

    const g = this._gfx;
    const streak = state.killStreakCount;
    const timeLeft = state.killStreakTimer;
    const fadeAlpha = Math.min(1, timeLeft / 0.5); // fade out in last 0.5s

    // Position below floor info
    const x = sw - 110;
    const y = 100;

    // Glow intensity based on streak
    const glowIntensity = Math.min(1, streak / 10);
    const streakColor = streak >= 8 ? 0xff4444 : streak >= 5 ? 0xffaa22 : streak >= 3 ? 0xffdd44 : 0xffffff;

    // Pulsing background
    const pulse = 0.7 + Math.sin(this._anim.time * 6) * 0.3;
    g.roundRect(x - 40, y - 12, 80, 28, 4)
      .fill({ color: 0x000000, alpha: fadeAlpha * 0.6 });
    g.roundRect(x - 40, y - 12, 80, 28, 4)
      .stroke({ color: streakColor, width: 1, alpha: fadeAlpha * pulse * glowIntensity });

    const label = streak >= 8 ? "RAMPAGE" : streak >= 5 ? "FRENZY" : "STREAK";
    this._addText(`${label} x${streak}`, x, y + 2, 12, streakColor, true, fadeAlpha);
  }

  // =========================================================================
  //  NOTIFICATION SYSTEM — toast notifications
  // =========================================================================

  showNotification(text: string, color: number, duration: number = 2.5): void {
    // Determine type from color/content heuristic
    let type: "info" | "loot" | "levelup" | "warning" = "info";
    if (text.toLowerCase().includes("level")) type = "levelup";
    else if (text.toLowerCase().includes("found") || text.toLowerCase().includes("picked")) type = "loot";
    else if (color === 0xff2222 || color === 0xff4444 || text.toLowerCase().includes("trap") || text.toLowerCase().includes("damage")) type = "warning";

    this._anim.activeNotifications.push({
      text,
      color,
      type,
      timer: duration,
      maxTimer: duration,
      slideIn: 0,
    });

    // Cap at 5 active notifications
    if (this._anim.activeNotifications.length > 5) {
      this._anim.activeNotifications.shift();
    }
  }

  private _drawNotifications(sw: number, _sh: number, dt: number): void {
    const notifs = this._anim.activeNotifications;
    let i = 0;
    while (i < notifs.length) {
      const n = notifs[i];
      n.timer -= dt;
      if (n.timer <= 0) {
        notifs.splice(i, 1);
        continue;
      }

      // Slide in animation
      n.slideIn = Math.min(1, n.slideIn + dt * 5);

      const fadeIn = Math.min(1, n.slideIn);
      const fadeOut = Math.min(1, n.timer / 0.5);
      const alpha = Math.min(fadeIn, fadeOut);

      // Position: slide from right
      const targetX = sw / 2;
      const startXPos = sw + 100;
      const nx = startXPos + (targetX - startXPos) * this._easeOutCubic(n.slideIn);
      const ny = 130 + i * 32;

      const g = this._gfx;

      // Background panel
      const panelW = Math.max(200, n.text.length * 8 + 40);
      const panelH = 26;
      const panelX = nx - panelW / 2;

      // Type-specific styling
      let bgColor = 0x111111;
      let borderColor = n.color;
      let glowColor = n.color;

      if (n.type === "levelup") {
        bgColor = 0x1a1505;
        borderColor = GOLD_COLOR;
        glowColor = GOLD_COLOR;
        // Golden burst particles
        if (n.slideIn < 0.5) {
          const burst = (1 - n.slideIn * 2);
          for (let p = 0; p < 6; p++) {
            const angle = (Math.PI * 2 * p) / 6 + this._anim.time;
            const dist = 30 * burst;
            g.circle(nx + Math.cos(angle) * dist, ny + Math.sin(angle) * dist, 2 * burst)
              .fill({ color: GOLD_COLOR, alpha: burst * 0.6 });
          }
        }
      } else if (n.type === "warning") {
        bgColor = 0x1a0505;
        borderColor = 0xff3322;
        glowColor = 0xff2222;
      } else if (n.type === "loot") {
        bgColor = 0x0a0a15;
      }

      // Glow
      g.roundRect(panelX - 2, ny - panelH / 2 - 2, panelW + 4, panelH + 4, 6)
        .fill({ color: glowColor, alpha: alpha * 0.12 });

      // Panel
      g.roundRect(panelX, ny - panelH / 2, panelW, panelH, 4)
        .fill({ color: bgColor, alpha: alpha * 0.85 });
      g.roundRect(panelX, ny - panelH / 2, panelW, panelH, 4)
        .stroke({ color: borderColor, width: 1, alpha: alpha * 0.6 });

      // Text
      this._addText(n.text, nx, ny, 13, n.color, true, alpha);

      i++;
    }
  }

  private _easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  // =========================================================================
  //  TEXT HELPER
  // =========================================================================

  private _addText(
    str: string, x: number, y: number, size: number, color: number,
    centered = false, alpha = 1,
  ): void {
    const style = new TextStyle({
      fontFamily: size >= 20 ? FONT_FANCY : FONT,
      fontSize: size,
      fill: color,
      align: centered ? "center" : "left",
      dropShadow: size >= 14 ? {
        alpha: 0.4,
        angle: Math.PI / 4,
        blur: 2,
        distance: 1,
        color: 0x000000,
      } : undefined,
    });
    const t = new Text({ text: str, style });
    t.alpha = alpha;
    if (centered) {
      t.anchor.set(0.5, 0.5);
    }
    t.x = x;
    t.y = y;
    this._texts.push(t);
    this.container.addChild(t);
  }

  // =========================================================================
  //  CLEANUP
  // =========================================================================

  cleanup(): void {
    this._gfx.clear();
    for (const t of this._texts) {
      t.destroy();
    }
    this._texts.length = 0;
    this.container.removeChildren();
  }
}
