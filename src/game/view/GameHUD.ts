// ---------------------------------------------------------------------------
// Quest for the Grail — HUD (Polished RPG Interface)
// Ornate frames, gradient bars, animated effects, icons, minimap with
// parchment backdrop, radial cooldown sweeps, rarity-colored inventory slots,
// toast notification system, and atmospheric menu screens.
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import {
  GameBalance, TileType, FLOOR_THEMES, QUEST_GENRE_DEFS, KNIGHT_DEFS,
  ItemType, ItemRarity, SHOP_ITEMS, ITEM_DEFS,
} from "../config/GameConfig";

import {
  CRAFTING_MATERIALS, CRAFTING_RECIPES, ENCHANTMENT_DEFS,
} from "../config/GameCraftingDefs";
import {
  ARTIFACT_DEFS, ARTIFACT_SET_BONUSES,
} from "../config/GameArtifactDefs";

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
  update(state: GrailGameState, sw: number, sh: number, dt: number, showHelp = false, _floorTransitionTimer = 0): void {
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
    if (state.phase === GamePhase.CRAFTING) {
      this._drawCraftingScreen(state, sw, sh);
    }
    if (state.phase === GamePhase.ENCHANTING) {
      this._drawEnchantingScreen(state, sw, sh);
    }
    if (state.phase === GamePhase.ARTIFACT_LORE) {
      this._drawArtifactLoreScreen(state, sw, sh);
    }

    // Companion HUD (shown during play)
    if (state.companion && state.companion.alive) {
      this._drawCompanionHUD(state, sw, sh);
    }

    // Infinite mode score display
    if (state.isInfiniteMode) {
      this._drawInfiniteScore(state, sw, sh);
    }

    // Material count indicator
    if (state.materials.length > 0 && (state.phase === GamePhase.PLAYING || state.phase === GamePhase.INVENTORY)) {
      this._drawMaterialCount(state, sw, sh);
    }

    // Artifact count indicator
    if (state.artifacts.length > 0 && (state.phase === GamePhase.PLAYING)) {
      this._drawArtifactCount(state, sw, sh);
    }

    // Controls help overlay
    if (showHelp) {
      this._drawHelpOverlay(sw, sh);
    }
  }

  // =========================================================================
  //  ORNATE FRAME helpers
  // =========================================================================

  /** Draw an ornate golden frame with Celtic knotwork corner flourishes */
  private _drawOrnateFrame(
    x: number, y: number, w: number, h: number,
    borderColor = GOLD_COLOR, thickness = 2, cornerSize = 6,
  ): void {
    const g = this._gfx;
    // Outer shadow (deeper for more pop)
    g.roundRect(x - 2, y - 2, w + 4, h + 4, 4)
      .stroke({ color: 0x000000, width: thickness + 3, alpha: 0.4 });
    g.roundRect(x - 1, y - 1, w + 2, h + 2, 3)
      .stroke({ color: 0x000000, width: thickness + 1.5, alpha: 0.55 });
    // Main border
    g.roundRect(x, y, w, h, 2)
      .stroke({ color: borderColor, width: thickness, alpha: 0.9 });
    // Inner highlight (gold leaf shine)
    g.roundRect(x + 1, y + 1, w - 2, h - 2, 1)
      .stroke({ color: GOLD_LIGHT, width: 0.5, alpha: 0.35 });
    // Inner dark line (inset depth)
    g.roundRect(x + 2, y + 2, w - 4, h - 4, 1)
      .stroke({ color: 0x000000, width: 0.3, alpha: 0.15 });

    // Celtic knotwork corner flourishes
    const cs = cornerSize;
    const cAlpha = 0.85;
    const knotColor = borderColor;
    const knotDark = lerpColor(borderColor, 0x000000, 0.35);

    for (const [cx, cy, signX, signY] of [
      [x, y, 1, 1], [x + w, y, -1, 1], [x, y + h, 1, -1], [x + w, y + h, -1, -1]
    ] as [number, number, number, number][]) {
      // L-shape bracket
      g.moveTo(cx - 2 * signX, cy + cs * signY).lineTo(cx - 2 * signX, cy - 2 * signY).lineTo(cx + cs * signX, cy - 2 * signY)
        .stroke({ color: knotColor, width: 1.5, alpha: cAlpha });
      // Celtic knot loop (small interlocking curves)
      const kx = cx + signX * 2;
      const ky = cy + signY * 2;
      // Outer loop
      g.moveTo(kx, ky + signY * 3).lineTo(kx + signX * 4, ky)
        .lineTo(kx, ky - signY * 3)
        .stroke({ color: knotColor, width: 1, alpha: cAlpha * 0.6 });
      // Inner cross loop
      g.moveTo(kx + signX * 1, ky + signY * 2).lineTo(kx + signX * 3, ky - signY * 1)
        .stroke({ color: knotDark, width: 0.6, alpha: cAlpha * 0.4 });
      g.moveTo(kx + signX * 1, ky - signY * 2).lineTo(kx + signX * 3, ky + signY * 1)
        .stroke({ color: knotDark, width: 0.6, alpha: cAlpha * 0.4 });
      // Corner jewel dot
      g.circle(kx + signX * 1.5, ky + signY * 0.5, 1.5).fill({ color: knotColor, alpha: cAlpha * 0.7 });
      g.circle(kx + signX * 1.5, ky + signY * 0.5, 0.7).fill({ color: GOLD_LIGHT, alpha: cAlpha * 0.4 });
    }

    // Optional: mid-edge ornament dots (illuminated manuscript style)
    if (w > 60) {
      const midX = x + w / 2;
      g.circle(midX, y - 1, 1.5).fill({ color: knotColor, alpha: 0.5 });
      g.circle(midX, y + h + 1, 1.5).fill({ color: knotColor, alpha: 0.5 });
    }
    if (h > 40) {
      const midY = y + h / 2;
      g.circle(x - 1, midY, 1.5).fill({ color: knotColor, alpha: 0.5 });
      g.circle(x + w + 1, midY, 1.5).fill({ color: knotColor, alpha: 0.5 });
    }
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

  /** Draw a parchment-textured background (illuminated manuscript style) */
  private _drawParchmentBG(x: number, y: number, w: number, h: number): void {
    const g = this._gfx;
    // Outer shadow for depth
    g.roundRect(x + 2, y + 2, w, h, 5).fill({ color: 0x000000, alpha: 0.25 });
    // Dark border/edge staining
    g.roundRect(x, y, w, h, 4).fill({ color: PARCHMENT_DARK, alpha: 0.95 });
    // Main parchment (slightly inset)
    g.roundRect(x + 2, y + 2, w - 4, h - 4, 3).fill({ color: PARCHMENT, alpha: 0.92 });
    // Lighter center (aged parchment with lighter middle)
    g.roundRect(x + 6, y + 6, w - 12, h - 12, 2).fill({ color: 0xddd4bc, alpha: 0.3 });

    // Subtle noise lines for texture (fiber grain)
    const time = this._anim.time;
    for (let i = 0; i < 10; i++) {
      const ly = y + 4 + ((h - 8) * i) / 10;
      const offset = Math.sin(time * 0.5 + i * 1.7) * 1.5;
      g.moveTo(x + 6 + offset, ly).lineTo(x + w - 6 + offset, ly)
        .stroke({ color: PARCHMENT_DARK, width: 0.25, alpha: 0.12 });
    }

    // Edge staining / foxing (aged spots)
    for (let i = 0; i < 4; i++) {
      const spotX = x + 4 + ((i * 97) % (w - 8));
      const spotY = y + 4 + ((i * 73) % (h - 8));
      g.circle(spotX, spotY, 2 + (i % 3)).fill({ color: 0xb5a88a, alpha: 0.08 + (i % 2) * 0.04 });
    }

    // Illuminated manuscript: decorative margin lines
    if (w > 100 && h > 60) {
      // Inner margin line (thin red/gold rule like medieval manuscripts)
      g.roundRect(x + 8, y + 8, w - 16, h - 16, 1)
        .stroke({ color: GOLD_DARK, width: 0.3, alpha: 0.12 });
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
    // Outer shadow line
    g.moveTo(x, y + 0.5).lineTo(x + w, y + 0.5).stroke({ color: 0x000000, width: 1.5, alpha: 0.15 });
    // Main line
    g.moveTo(x, y).lineTo(x + w, y).stroke({ color, width: 1, alpha: 0.6 });
    // Highlight line above (gold leaf effect)
    g.moveTo(x + 4, y - 0.5).lineTo(x + w - 4, y - 0.5).stroke({ color: GOLD_LIGHT, width: 0.3, alpha: 0.15 });

    // Center diamond with inner detail
    const cx = x + w / 2;
    g.moveTo(cx - 5, y).lineTo(cx, y - 3.5).lineTo(cx + 5, y).lineTo(cx, y + 3.5)
      .closePath().fill({ color, alpha: 0.7 });
    // Inner diamond highlight
    g.moveTo(cx - 2.5, y).lineTo(cx, y - 1.8).lineTo(cx + 2.5, y).lineTo(cx, y + 1.8)
      .closePath().fill({ color: GOLD_LIGHT, alpha: 0.3 });

    // End flourishes (small curled hooks instead of dots)
    // Left end
    g.moveTo(x, y).lineTo(x + 3, y - 2).stroke({ color, width: 0.8, alpha: 0.5 });
    g.moveTo(x, y).lineTo(x + 3, y + 2).stroke({ color, width: 0.8, alpha: 0.5 });
    g.circle(x + 3, y, 1.2).fill({ color, alpha: 0.5 });
    // Right end
    g.moveTo(x + w, y).lineTo(x + w - 3, y - 2).stroke({ color, width: 0.8, alpha: 0.5 });
    g.moveTo(x + w, y).lineTo(x + w - 3, y + 2).stroke({ color, width: 0.8, alpha: 0.5 });
    g.circle(x + w - 3, y, 1.2).fill({ color, alpha: 0.5 });

    // Quarter-way accent dots
    if (w > 80) {
      g.circle(x + w * 0.25, y, 0.8).fill({ color, alpha: 0.35 });
      g.circle(x + w * 0.75, y, 0.8).fill({ color, alpha: 0.35 });
    }
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

    // Animated liquid fill — wave effect on the fill edge
    if (hpFrac > 0.02 && hpFrac < 0.98) {
      const fillW = barW * hpFrac;
      const waveTime = this._anim.time * 4;
      for (let wy = 0; wy < barH; wy += 2) {
        const waveOffset = Math.sin(waveTime + wy * 0.5) * 2;
        const bubbleX = x + fillW + waveOffset - 2;
        if (bubbleX > x && bubbleX < x + barW) {
          g.rect(bubbleX, y + wy, 3, 2).fill({ color: hpColorA, alpha: 0.3 });
        }
      }
    }

    // Bubbling effect inside the bar
    if (hpFrac > 0.05) {
      const fillW = barW * hpFrac;
      for (let b = 0; b < 3; b++) {
        const bubbleT = (this._anim.time * 1.5 + b * 0.7) % 1.2;
        const bubbleX = x + 5 + (fillW - 10) * ((b * 37 % 100) / 100);
        const bubbleY = y + barH - bubbleT * barH * 0.8;
        const bubbleR = 1 + (1 - bubbleT / 1.2) * 1.5;
        const bubbleAlpha = 0.15 * (1 - bubbleT / 1.2);
        if (bubbleX < x + fillW && bubbleY > y) {
          g.circle(bubbleX, bubbleY, bubbleR).fill({ color: 0xffffff, alpha: bubbleAlpha });
        }
      }
    }

    // Glass-like overlay (specular reflection)
    const glassHighlightW = barW * hpFrac;
    if (glassHighlightW > 4) {
      g.roundRect(x + 2, y + 1, glassHighlightW - 4, barH * 0.35, 2)
        .fill({ color: 0xffffff, alpha: 0.12 });
      // Bottom glass reflection (subtle)
      g.roundRect(x + 3, y + barH * 0.7, glassHighlightW - 6, barH * 0.15, 1)
        .fill({ color: 0xffffff, alpha: 0.04 });
    }

    // Pulsing glow at fill edge
    if (hpFrac > 0.02 && hpFrac < 0.98) {
      const edgeX = x + barW * hpFrac;
      const edgePulse = 0.2 + 0.1 * Math.sin(this._anim.time * 5);
      g.rect(edgeX - 2, y, 4, barH).fill({ color: hpColorA, alpha: edgePulse });
    }

    // Low HP pulsing glow with heartbeat effect
    if (hpFrac <= 0.25 && hpFrac > 0) {
      const heartbeat = Math.pow(Math.sin(this._anim.time * 6), 2) * 0.4;
      g.roundRect(x - 3, y - 3, barW + 6, barH + 6, 5)
        .stroke({ color: 0xff2222, width: 2, alpha: heartbeat });
      // Inner red glow
      g.roundRect(x - 1, y - 1, barW + 2, barH + 2, 4)
        .fill({ color: 0xff0000, alpha: heartbeat * 0.06 });
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

    // Glass overlay on XP bar
    const xpFillW = barW * xpFrac;
    if (xpFillW > 3) {
      g.roundRect(x + 1, y + 1, xpFillW - 2, barH * 0.4, 1)
        .fill({ color: 0xffffff, alpha: 0.1 });
    }

    // Animated shimmer traveling along the bar
    const shimmerPos = (this._anim.time * 60) % (barW + 40) - 20;
    if (xpFrac > 0.05 && shimmerPos < xpFillW) {
      g.rect(x + Math.max(0, shimmerPos), y, 12, barH)
        .fill({ color: 0xaaccff, alpha: 0.08 });
    }

    // Sparkle particles when gaining XP (enhanced)
    if (this._anim.xpSparkleTimer > 0) {
      const sparkAlpha = this._anim.xpSparkleTimer;
      const fw = barW * xpFrac;
      for (let i = 0; i < 7; i++) {
        const sx = x + fw - 25 + Math.random() * 30;
        const sy = y + Math.random() * barH;
        const sparkSize = 0.8 + Math.random() * 1.5;
        const sparkColor = i % 2 === 0 ? 0xaaccff : 0xffffff;
        g.circle(sx, sy, sparkSize).fill({ color: sparkColor, alpha: sparkAlpha * 0.7 });
      }
      // Rising sparkles above bar
      for (let i = 0; i < 3; i++) {
        const riseY = y - (1 - this._anim.xpSparkleTimer) * 15 - i * 4;
        const riseX = x + fw - 10 + Math.sin(this._anim.time * 6 + i) * 8;
        g.circle(riseX, riseY, 1).fill({ color: 0x88bbff, alpha: sparkAlpha * 0.5 });
      }
    }

    // Pulsing edge glow at fill point
    if (xpFrac > 0.02 && xpFrac < 0.98) {
      const edgePulse = 0.15 + 0.08 * Math.sin(this._anim.time * 4);
      g.rect(x + xpFillW - 1, y, 2, barH).fill({ color: 0x88bbff, alpha: edgePulse });
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

    // Outer glow (pulsing softly)
    const lvlPulse = 0.12 + 0.05 * Math.sin(this._anim.time * 2);
    g.circle(cx, cy, r + 6).fill({ color: GOLD_COLOR, alpha: lvlPulse });
    g.circle(cx, cy, r + 4).fill({ color: GOLD_COLOR, alpha: lvlPulse * 1.2 });

    // Shadow ring
    g.circle(cx + 1, cy + 1, r + 1).fill({ color: 0x000000, alpha: 0.3 });
    // Dark circle
    g.circle(cx, cy, r).fill({ color: 0x0a0805, alpha: 0.95 });
    // Gold ring (double border for richness)
    g.circle(cx, cy, r).stroke({ color: GOLD_COLOR, width: 2.5, alpha: 0.9 });
    g.circle(cx, cy, r + 1.5).stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.4 });
    // Inner ring
    g.circle(cx, cy, r - 3).stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.5 });

    // Decorative notches around the rim (like a coin edge)
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2;
      const nx = cx + Math.cos(angle) * (r - 0.5);
      const ny = cy + Math.sin(angle) * (r - 0.5);
      g.circle(nx, ny, 0.6).fill({ color: GOLD_LIGHT, alpha: 0.3 });
    }

    // Subtle inner gradient shine
    g.circle(cx - 2, cy - 3, r * 0.5).fill({ color: 0xffffff, alpha: 0.03 });

    // Level number
    this._addText(`${p.level}`, cx, cy, 14, GOLD_COLOR, true);
    // "Lv" label with bracket decoration
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

      // Animated status effect icon
      const icx = bx + size / 2;
      const icy = y + size / 2;
      if (eff.id.includes("atk") || eff.id.includes("buff_atk")) {
        this._drawSwordIcon(icx, icy, 12, 0xff8844);
        // Red power glow pulse
        const atkPulse = 0.15 + 0.1 * Math.sin(this._anim.time * 5 + i);
        g.circle(icx, icy, 7).fill({ color: 0xff4400, alpha: atkPulse });
      } else if (eff.id.includes("def") || eff.id.includes("shield") || eff.id.includes("invulnerable")) {
        this._drawShieldIcon(icx, icy, 12, 0x44aaff);
        // Blue shield shimmer
        const defPulse = 0.12 + 0.08 * Math.sin(this._anim.time * 4 + i * 2);
        g.circle(icx, icy, 7).stroke({ color: 0x44aaff, width: 0.8, alpha: defPulse });
      } else if (eff.id.includes("burn") || eff.id.includes("burning")) {
        // Animated fire icon
        const fireFlicker = Math.sin(this._anim.time * 8 + i) * 0.3;
        g.moveTo(icx - 3, icy + 3).lineTo(icx + fireFlicker, icy - 5).lineTo(icx + 3, icy + 3)
          .closePath().fill({ color: 0xff6622, alpha: 0.8 });
        g.moveTo(icx - 1.5, icy + 2).lineTo(icx + fireFlicker * 0.5, icy - 3).lineTo(icx + 1.5, icy + 2)
          .closePath().fill({ color: 0xffaa44, alpha: 0.9 });
        // Rising flame particles
        for (let f = 0; f < 2; f++) {
          const fT = (this._anim.time * 3 + f * 0.5) % 1;
          g.circle(icx + Math.sin(this._anim.time * 6 + f) * 2, icy - 3 - fT * 6, 0.6)
            .fill({ color: 0xff8800, alpha: 0.4 * (1 - fT) });
        }
      } else if (eff.id.includes("poison") || eff.id.includes("poisoned")) {
        // Animated poison bubbles
        this._drawSkullIcon(icx, icy, 12, 0x88ff44);
        for (let b = 0; b < 3; b++) {
          const bT = (this._anim.time * 1.5 + b * 0.4) % 1;
          const bx2 = icx - 3 + b * 3;
          const by2 = icy + 4 - bT * 10;
          g.circle(bx2, by2, 0.8 + (1 - bT) * 0.6).fill({ color: 0x66ff66, alpha: 0.35 * (1 - bT) });
        }
      } else if (eff.id.includes("freeze") || eff.id.includes("frozen")) {
        // Animated frost crystals
        const crystalRot = this._anim.time * 0.5 + i;
        for (let c2 = 0; c2 < 4; c2++) {
          const cAngle = crystalRot + (c2 / 4) * Math.PI * 2;
          const cx2 = icx + Math.cos(cAngle) * 4;
          const cy2 = icy + Math.sin(cAngle) * 4;
          g.rect(cx2 - 0.5, cy2 - 2, 1, 4).fill({ color: 0x88ccff, alpha: 0.6 });
        }
        g.circle(icx, icy, 2).fill({ color: 0xaaddff, alpha: 0.5 });
      } else {
        this._drawStarIcon(icx, icy, 10, buffColor);
      }

      // Duration timer with background
      g.roundRect(bx + size - 8, y + size - 7, 10, 8, 2).fill({ color: 0x000000, alpha: 0.6 });
      this._addText(`${eff.turnsRemaining}`, bx + size - 3, y + size - 3, 7, 0xffffff, true);
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

    // Enemy blips (pulsing, with threat-level colors)
    const enemyPulse = Math.sin(this._anim.time * 5) * 0.3 + 0.7;

    // Door indicators on minimap
    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        if (floor.tiles[r][c] === TileType.DOOR) {
          const dpx = mx + c * scaleX;
          const dpy = my + r * scaleY;
          g.rect(dpx - 0.5, dpy - 0.5, Math.max(2, scaleX + 1), Math.max(2, scaleY + 1))
            .fill({ color: 0x886633, alpha: 0.8 });
        }
      }
    }

    // Enemy threat level colors on minimap
    for (const e of floor.enemies) {
      if (!e.alive) continue;
      const ec = e.x / GameBalance.TILE_SIZE;
      const er = e.y / GameBalance.TILE_SIZE;
      if (er >= 0 && er < floor.height && ec >= 0 && ec < floor.width &&
          floor.explored[Math.floor(er)]?.[Math.floor(ec)]) {
        // Threat-based coloring: boss=red, champion=orange, normal=yellow-ish
        let color = 0xff9944;
        let dotR = 1.5;
        if (e.def.isBoss) {
          color = 0xff0000;
          dotR = 3;
        } else if (e.maxHp > 100) {
          color = 0xff6622;
          dotR = 2;
        }
        g.circle(mx + ec * scaleX, my + er * scaleY, dotR)
          .fill({ color, alpha: enemyPulse });
        if (e.def.isBoss) {
          g.circle(mx + ec * scaleX, my + er * scaleY, dotR + 2)
            .stroke({ color: 0xff0000, width: 0.6, alpha: enemyPulse * 0.5 });
          // Pulsing ring
          const bossRing = dotR + 2 + Math.sin(this._anim.time * 3) * 1.5;
          g.circle(mx + ec * scaleX, my + er * scaleY, bossRing)
            .stroke({ color: 0xff2222, width: 0.3, alpha: enemyPulse * 0.3 });
        }
      }
    }

    // Player blip as directional arrow (shows facing)
    const playerPulse = Math.sin(this._anim.time * 3) * 0.2 + 0.8;
    const ppx = mx + pc * scaleX;
    const ppy = my + pr * scaleY;
    // Outer glow ring
    g.circle(ppx, ppy, 5).fill({ color: 0x44ff44, alpha: playerPulse * 0.15 });
    // Player dot
    g.circle(ppx, ppy, 2.5).fill({ color: 0x44ff44, alpha: playerPulse });
    // Facing direction arrow
    const facingAngle = player.facing === 0 ? -Math.PI / 2 : // UP
      player.facing === 1 ? Math.PI / 2 : // DOWN
      player.facing === 2 ? Math.PI : 0; // LEFT : RIGHT
    const arrowLen = 5;
    const arrowTipX = ppx + Math.cos(facingAngle) * arrowLen;
    const arrowTipY = ppy + Math.sin(facingAngle) * arrowLen;
    g.moveTo(ppx, ppy).lineTo(arrowTipX, arrowTipY)
      .stroke({ color: 0x66ff66, width: 1.2, alpha: playerPulse * 0.7 });
    // Arrow head
    const headAngle1 = facingAngle + Math.PI * 0.75;
    const headAngle2 = facingAngle - Math.PI * 0.75;
    g.moveTo(arrowTipX, arrowTipY)
      .lineTo(arrowTipX + Math.cos(headAngle1) * 2.5, arrowTipY + Math.sin(headAngle1) * 2.5)
      .stroke({ color: 0x66ff66, width: 0.8, alpha: playerPulse * 0.5 });
    g.moveTo(arrowTipX, arrowTipY)
      .lineTo(arrowTipX + Math.cos(headAngle2) * 2.5, arrowTipY + Math.sin(headAngle2) * 2.5)
      .stroke({ color: 0x66ff66, width: 0.8, alpha: playerPulse * 0.5 });

    // Ornate frame
    this._drawOrnateFrame(mx - 2, my - 2, mapW + 4, mapH + 4, GOLD_DARK, 1.5, 5);

    // Compass rose (enhanced with decorative ring)
    const compassX = mx + mapW - 12;
    const compassY = my + 12;
    g.circle(compassX, compassY, 8).fill({ color: 0x0a0805, alpha: 0.6 });
    g.circle(compassX, compassY, 8).stroke({ color: GOLD_DARK, width: 0.5, alpha: 0.4 });
    this._drawCompassRose(compassX, compassY, 5);

    // Label with decorative underline
    this._addText("MAP", mx + mapW / 2, my - 12, 8, PARCHMENT_DARK, true);
    g.moveTo(mx + mapW / 2 - 12, my - 6).lineTo(mx + mapW / 2 + 12, my - 6)
      .stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.3 });
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

        const time = this._anim.time;
        // Rarity glow with sparkle effects
        if (inv.def.rarity === ItemRarity.LEGENDARY) {
          const pulse = Math.sin(time * 3 + i * 0.5) * 0.15 + 0.25;
          g.roundRect(x - 3, y - 3, slotSize + 6, slotSize + 6, 6)
            .fill({ color: GOLD_COLOR, alpha: pulse * 0.4 });
          g.roundRect(x - 2, y - 2, slotSize + 4, slotSize + 4, 5)
            .fill({ color: GOLD_COLOR, alpha: pulse });
          // Legendary sparkle particles orbiting the slot
          for (let s = 0; s < 4; s++) {
            const sparkAngle = time * 2.5 + s * Math.PI * 0.5 + i * 0.3;
            const sparkR = slotSize * 0.55;
            const sx = x + slotSize / 2 + Math.cos(sparkAngle) * sparkR;
            const sy = y + slotSize / 2 + Math.sin(sparkAngle) * sparkR;
            const twinkle = 0.4 + 0.4 * Math.sin(time * 6 + s * 1.5);
            g.circle(sx, sy, 1.2).fill({ color: 0xffffff, alpha: twinkle });
            g.circle(sx, sy, 2.5).fill({ color: GOLD_COLOR, alpha: twinkle * 0.3 });
          }
        } else if (inv.def.rarity === ItemRarity.RARE) {
          const pulse = Math.sin(time * 2 + i) * 0.1 + 0.15;
          g.roundRect(x - 1, y - 1, slotSize + 2, slotSize + 2, 4)
            .fill({ color: 0x4488ff, alpha: pulse });
          // Rare shimmer (traveling light bar)
          const shimmerY = y + ((time * 30 + i * 12) % (slotSize + 10)) - 5;
          if (shimmerY > y && shimmerY < y + slotSize) {
            g.rect(x + 2, shimmerY, slotSize - 4, 2).fill({ color: 0xaaccff, alpha: 0.15 });
          }
        } else if (inv.def.rarity === ItemRarity.UNCOMMON) {
          const pulse = Math.sin(time * 1.5 + i * 0.8) * 0.06 + 0.08;
          g.roundRect(x - 1, y - 1, slotSize + 2, slotSize + 2, 4)
            .fill({ color: 0x44cc44, alpha: pulse });
        }

        // Item fill with subtle inner gradient
        g.roundRect(x + 2, y + 2, slotSize - 4, slotSize - 4, 2)
          .fill({ color: inv.def.color, alpha: 0.25 });
        // Inner highlight (top-left light)
        g.roundRect(x + 3, y + 3, slotSize - 10, slotSize / 3, 2)
          .fill({ color: 0xffffff, alpha: 0.04 });

        // Item icon with glow halo
        const iconGlow = 0.05 + 0.03 * Math.sin(time * 2 + i);
        g.circle(x + slotSize / 2, y + slotSize / 2, slotSize * 0.25)
          .fill({ color: inv.def.color, alpha: iconGlow });
        this._drawItemIcon(
          x + slotSize / 2, y + slotSize / 2,
          slotSize * 0.6, inv.def.type, inv.def.color,
        );

        // Rarity border
        g.roundRect(x, y, slotSize, slotSize, 4)
          .stroke({ color: rarityColor, width: 1.5, alpha: 0.8 });
        // Inner bevel highlight
        g.roundRect(x + 1, y + 1, slotSize - 2, slotSize - 2, 3)
          .stroke({ color: rarityColor, width: 0.3, alpha: 0.2 });

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

      // Item row bg with subtle rarity tinting
      g.roundRect(listX - 4, iy - 4, panelW / 2 - 40, 32, 3)
        .fill({ color: darkRarity, alpha: 0.15 });
      // Rarity left accent bar
      g.rect(listX - 4, iy - 4, 2, 32).fill({ color: rarityColor, alpha: 0.4 });

      // Item icon with glow for rare+
      if (inv.def.rarity === ItemRarity.LEGENDARY || inv.def.rarity === ItemRarity.RARE) {
        const iconPulse = 0.1 + 0.05 * Math.sin(this._anim.time * 2.5 + i);
        g.circle(listX + 12, iy + 10, 12).fill({ color: rarityColor, alpha: iconPulse });
      }
      this._drawItemIcon(listX + 12, iy + 10, 18, inv.def.type, inv.def.color);

      // Item text
      this._addText(
        `[${i + 1}] ${inv.def.name}${inv.quantity > 1 ? ` x${inv.quantity}` : ""}`,
        listX + 28, iy, 12, rarityColor,
      );
      this._addText(inv.def.desc, listX + 28, iy + 16, 9, 0x7a6a50);

      // Rarity label
      if (inv.def.rarity !== ItemRarity.COMMON) {
        const rarityLabel = inv.def.rarity.charAt(0).toUpperCase() + inv.def.rarity.slice(1);
        this._addText(rarityLabel, listX + panelW / 2 - 65, iy + 16, 7, rarityColor);
      }
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
    const time = this._anim.time;

    // Dark overlay with subtle warmth (candlelit shop feel)
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });
    g.rect(0, 0, sw, sh).fill({ color: 0x331100, alpha: 0.08 });

    // Central parchment panel
    const panelW = Math.min(600, sw - 60);
    const panelH = Math.min(460, sh - 80);
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    // Warm glow behind panel (merchant lantern effect)
    g.ellipse(sw / 2, py - 10, panelW * 0.4, 30).fill({ color: 0xff8800, alpha: 0.04 + 0.02 * Math.sin(time * 2) });

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    // Title with merchant icon (coin purse hint)
    this._drawCoinIcon(sw / 2 - 80, py + 30, 18);
    this._addText("MERCHANT'S WARES", sw / 2, py + 28, 22, 0x3a2a15, true);
    this._drawCoinIcon(sw / 2 + 68, py + 30, 18);
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

        // Row background with alternating shade
        const rowBg = canAfford ? 0x000000 : 0x220000;
        const rowAlpha = i % 2 === 0 ? 0.08 : 0.04;
        g.roundRect(px + 24, iy - 3, panelW - 48, 28, 3).fill({ color: rowBg, alpha: rowAlpha });

        // Affordable item subtle glow on hover-like pulse
        if (canAfford) {
          const itemPulse = Math.sin(time * 1.5 + i * 0.5) * 0.02 + 0.02;
          g.roundRect(px + 24, iy - 3, panelW - 48, 28, 3).fill({ color: GOLD_COLOR, alpha: itemPulse });
        }

        // Key hint badge (more ornate)
        g.roundRect(px + 28, iy, 20, 18, 2).fill({ color: canAfford ? GOLD_COLOR : 0x666655, alpha: 0.2 });
        g.roundRect(px + 28, iy, 20, 18, 2).stroke({ color: canAfford ? GOLD_DARK : 0x444444, width: 0.5, alpha: 0.3 });
        this._addText(`${i + 1}`, px + 38, iy + 9, 10, textColor, true);

        // Item name
        this._addText(item.name, px + 56, iy, 12, textColor);
        // Description
        this._addText(item.desc, px + 56, iy + 14, 9, 0x7a6a50);
        // Cost with coin icon
        this._drawCoinIcon(px + panelW - 80, iy + 8, 12);
        this._addText(`${item.cost}`, px + panelW - 65, iy + 3, 11, costColor);

        // Stat comparison for gear items
        if (item.type === "gear" && item.itemId) {
          const itemDef = ITEM_DEFS[item.itemId];
          if (itemDef && (itemDef.type === "weapon" || itemDef.type === "armor" || itemDef.type === "relic")) {
            const equipped = itemDef.type === "weapon" ? p.equippedWeapon
              : itemDef.type === "armor" ? p.equippedArmor : p.equippedRelic;
            const compX = px + panelW - 130;
            if (itemDef.attackBonus > 0) {
              const diff = itemDef.attackBonus - (equipped?.attackBonus ?? 0);
              const diffColor = diff > 0 ? 0x44cc44 : diff < 0 ? 0xcc4444 : 0x888888;
              const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
              this._addText(`ATK${diffStr}`, compX, iy + 14, 8, diffColor);
            }
            if (itemDef.defenseBonus > 0) {
              const diff = itemDef.defenseBonus - (equipped?.defenseBonus ?? 0);
              const diffColor = diff > 0 ? 0x44cc44 : diff < 0 ? 0xcc4444 : 0x888888;
              const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
              this._addText(`DEF${diffStr}`, compX + 50, iy + 14, 8, diffColor);
            }
          }
        }

        // Affordable indicator (small green checkmark dot)
        if (canAfford) {
          g.circle(px + panelW - 35, iy + 9, 3).fill({ color: 0x44cc44, alpha: 0.3 });
        }

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
    const time = this._anim.time;

    // Full screen dark overlay with vignette effect
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.97 });

    // Animated background — drifting stars / ember particles
    for (let i = 0; i < 40; i++) {
      const seed = i * 137.5;
      const px = ((seed * 7.3 + time * (8 + (i % 5) * 3)) % sw);
      const py = ((seed * 11.7 + time * (3 + (i % 3) * 2)) % sh);
      const twinkle = 0.15 + 0.15 * Math.sin(time * 3 + i * 1.1);
      const size = 0.5 + (i % 3) * 0.4;
      const starColor = i % 4 === 0 ? 0xffd700 : i % 4 === 1 ? 0xffaa44 : i % 4 === 2 ? 0xaa8844 : 0x887744;
      g.circle(px, py, size).fill({ color: starColor, alpha: twinkle });
    }

    // Slow-moving fog wisps across the background
    for (let i = 0; i < 6; i++) {
      const fogX = ((i * 200 + time * 12) % (sw + 200)) - 100;
      const fogY = sh * 0.3 + i * 60 + Math.sin(time * 0.5 + i * 2.1) * 30;
      const fogW = 120 + (i % 3) * 60;
      g.ellipse(fogX, fogY, fogW, 8 + (i % 2) * 4)
        .fill({ color: 0x443322, alpha: 0.03 + 0.015 * Math.sin(time + i) });
    }

    // Top/bottom vignette gradient (multi-layered)
    for (let i = 0; i < 8; i++) {
      const a = 0.35 - i * 0.04;
      g.rect(0, i * 6, sw, 6).fill({ color: 0x000000, alpha: a });
      g.rect(0, sh - (i + 1) * 6, sw, 6).fill({ color: 0x000000, alpha: a * 0.6 });
    }

    // Title golden glow halo
    const titleY = 50;
    const titleGlow = 0.15 + 0.08 * Math.sin(time * 1.5);
    g.ellipse(sw / 2, titleY + 8, 200, 30).fill({ color: GOLD_COLOR, alpha: titleGlow });

    // Title with golden glow
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

      // Card outer glow with animated breathing
      const pulse = Math.sin(time * 2 + i * 0.8) * 0.08 + 0.12;
      g.roundRect(x - 3, y - 3, cardW + 6, cardH + 6, 9)
        .fill({ color: genre.color, alpha: pulse * 0.5 });
      g.roundRect(x - 2, y - 2, cardW + 4, cardH + 4, 8)
        .fill({ color: genre.color, alpha: pulse });

      // Card background
      this._drawParchmentBG(x, y, cardW, cardH);

      // Thematic background pattern (subtle, behind content)
      for (let p = 0; p < 5; p++) {
        const patX = x + 10 + (p * 47) % (cardW - 20);
        const patY = y + 30 + (p * 31) % (cardH - 50);
        g.circle(patX, patY, 12 + p * 3).fill({ color: genre.color, alpha: 0.02 + 0.01 * Math.sin(time + p) });
      }

      // Genre color accent bar with gradient shimmer
      g.roundRect(x, y, cardW, 4, 2).fill({ color: genre.color, alpha: 0.8 });
      const shimmerX = ((time * 80 + i * 60) % (cardW + 40)) - 20;
      g.rect(x + shimmerX, y, 20, 4).fill({ color: 0xffffff, alpha: 0.15 });

      // Genre icon (themed shape) — now with glow halo
      const icx = x + 24;
      const icy = y + 32;
      const iconGlow = 0.08 + 0.05 * Math.sin(time * 2.5 + i);
      g.circle(icx, icy, 16).fill({ color: genre.color, alpha: iconGlow });
      this._drawGenreIcon(icx, icy, 20, i, genre.color);

      // Title with small shadow
      this._addText(genre.label, x + 44, y + 18, 14, 0x2a1a0a);

      // Separator with genre-colored accent
      g.moveTo(x + 10, y + 44).lineTo(x + cardW - 10, y + 44)
        .stroke({ color: PARCHMENT_DARK, width: 0.5, alpha: 0.4 });
      g.moveTo(x + cardW / 2 - 15, y + 44).lineTo(x + cardW / 2 + 15, y + 44)
        .stroke({ color: genre.color, width: 0.8, alpha: 0.3 });

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

    // Infinite mode option
    const infY = sh - 70;
    const infPulse = 0.7 + 0.3 * Math.sin(time * 2.5);
    g.roundRect(sw / 2 - 120, infY - 6, 240, 24, 4).fill({ color: 0x1a0a00, alpha: 0.7 });
    g.roundRect(sw / 2 - 120, infY - 6, 240, 24, 4).stroke({ color: lerpColor(0x886644, 0xffd700, infPulse), width: 1, alpha: 0.6 });
    this._addText("0. Infinite Dungeon (Endless)", sw / 2, infY, 11, lerpColor(0xaa8844, 0xffd700, infPulse), true, FONT_FANCY);

    this._addText("Press 1-6 to select a quest type  |  0 for Infinite", sw / 2, sh - 36, 13, 0x665544, true);
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
    const time = this._anim.time;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.97 });

    // Animated background particles (floating sparks)
    for (let i = 0; i < 30; i++) {
      const seed = i * 191.3;
      const px = ((seed * 5.7 + time * (5 + (i % 4) * 2)) % sw);
      const py = ((seed * 9.3 + time * (2 + (i % 3) * 1.5)) % sh);
      const twinkle = 0.1 + 0.1 * Math.sin(time * 4 + i * 0.9);
      const sparkColor = i % 3 === 0 ? GOLD_COLOR : i % 3 === 1 ? 0xaa8833 : 0x665533;
      g.circle(px, py, 0.4 + (i % 2) * 0.3).fill({ color: sparkColor, alpha: twinkle });
    }

    // Subtle banner behind title
    const genreLabel = state.genre?.label ?? "Quest";
    const genreColor = state.genre?.color ?? GOLD_COLOR;
    g.rect(0, 10, sw, 68).fill({ color: 0x000000, alpha: 0.3 });
    g.rect(0, 10, sw, 1).fill({ color: genreColor, alpha: 0.2 });
    g.rect(0, 77, sw, 1).fill({ color: genreColor, alpha: 0.2 });

    this._addText(genreLabel, sw / 2, 24, 14, genreColor, true);
    // Title glow
    const titleGlow = 0.1 + 0.05 * Math.sin(time * 1.5);
    g.ellipse(sw / 2, 50, 150, 20).fill({ color: GOLD_COLOR, alpha: titleGlow });
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

      // Knight portrait circle with animated glow
      const portraitCX = x + cardW / 2;
      const portraitCY = y + 40;
      const portraitPulse = 0.08 + 0.04 * Math.sin(time * 2 + i * 0.9);
      g.circle(portraitCX, portraitCY, 30).fill({ color: k.color, alpha: portraitPulse });
      g.circle(portraitCX, portraitCY, 26).fill({ color: 0x1a1510, alpha: 0.9 });
      g.circle(portraitCX, portraitCY, 24).fill({ color: k.color, alpha: 0.3 });
      // Knight silhouette (with idle breathing animation)
      const breathOffset = Math.sin(time * 2.5 + i * 1.3) * 0.5;
      this._drawKnightSilhouette(portraitCX, portraitCY + breathOffset, 18, k.color);
      // Animated gleam on portrait border (rotating highlight)
      const gleamAngle = time * 1.5 + i * 0.7;
      const gleamX = portraitCX + Math.cos(gleamAngle) * 25;
      const gleamY = portraitCY + Math.sin(gleamAngle) * 25;
      g.circle(gleamX, gleamY, 3).fill({ color: 0xffffff, alpha: 0.15 });
      g.circle(portraitCX, portraitCY, 26).stroke({ color: k.color, width: 2, alpha: 0.7 });
      g.circle(portraitCX, portraitCY, 27).stroke({ color: lerpColor(k.color, 0xffffff, 0.3), width: 0.5, alpha: 0.25 });

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
    const darkColor = lerpColor(color, 0x000000, 0.3);
    const lightColor = lerpColor(color, 0xffffff, 0.2);
    // Shoulders (drawn first, behind helmet)
    g.moveTo(cx - s * 0.35, cy + s * 0.1).lineTo(cx - s * 0.55, cy + s * 0.5)
      .lineTo(cx + s * 0.55, cy + s * 0.5).lineTo(cx + s * 0.35, cy + s * 0.1)
      .closePath().fill({ color, alpha: 0.4 });
    // Shoulder armor plates (pauldrons)
    g.moveTo(cx - s * 0.35, cy + s * 0.1).lineTo(cx - s * 0.5, cy + s * 0.3)
      .lineTo(cx - s * 0.3, cy + s * 0.35).lineTo(cx - s * 0.25, cy + s * 0.1)
      .closePath().fill({ color: darkColor, alpha: 0.3 });
    g.moveTo(cx + s * 0.35, cy + s * 0.1).lineTo(cx + s * 0.5, cy + s * 0.3)
      .lineTo(cx + s * 0.3, cy + s * 0.35).lineTo(cx + s * 0.25, cy + s * 0.1)
      .closePath().fill({ color: darkColor, alpha: 0.3 });
    // Gorget / neck guard
    g.rect(cx - s * 0.2, cy + s * 0.05, s * 0.4, s * 0.1).fill({ color: darkColor, alpha: 0.25 });
    // Helmet (main shape)
    g.moveTo(cx - s * 0.35, cy + s * 0.1)
      .lineTo(cx - s * 0.4, cy - s * 0.2)
      .lineTo(cx - s * 0.3, cy - s * 0.5)
      .lineTo(cx + s * 0.3, cy - s * 0.5)
      .lineTo(cx + s * 0.4, cy - s * 0.2)
      .lineTo(cx + s * 0.35, cy + s * 0.1)
      .closePath()
      .fill({ color, alpha: 0.7 });
    // Helmet highlight (top-left reflective)
    g.moveTo(cx - s * 0.25, cy - s * 0.45)
      .lineTo(cx - s * 0.1, cy - s * 0.48)
      .lineTo(cx - s * 0.15, cy - s * 0.2)
      .lineTo(cx - s * 0.3, cy - s * 0.15)
      .closePath()
      .fill({ color: lightColor, alpha: 0.2 });
    // Visor slit (wider, with depth)
    g.rect(cx - s * 0.28, cy - s * 0.12, s * 0.56, s * 0.08)
      .fill({ color: 0x000000, alpha: 0.65 });
    // Eye glints in visor
    g.circle(cx - s * 0.1, cy - s * 0.08, s * 0.025).fill({ color: 0xffffff, alpha: 0.3 });
    g.circle(cx + s * 0.1, cy - s * 0.08, s * 0.025).fill({ color: 0xffffff, alpha: 0.3 });
    // Helmet brim detail
    g.rect(cx - s * 0.38, cy - s * 0.02, s * 0.76, s * 0.04).fill({ color: darkColor, alpha: 0.3 });
    // Plume (larger, with motion hint)
    g.moveTo(cx - s * 0.05, cy - s * 0.5).lineTo(cx + s * 0.2, cy - s * 0.85)
      .lineTo(cx + s * 0.08, cy - s * 0.7).lineTo(cx - s * 0.1, cy - s * 0.5)
      .closePath().fill({ color, alpha: 0.55 });
    // Plume secondary layer
    g.moveTo(cx, cy - s * 0.5).lineTo(cx + s * 0.15, cy - s * 0.78)
      .lineTo(cx + s * 0.05, cy - s * 0.65).lineTo(cx - s * 0.03, cy - s * 0.5)
      .closePath().fill({ color: lightColor, alpha: 0.2 });
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
    // Bar track with inner shadow
    g.roundRect(bx, y, barW, barH, 2).fill({ color: 0x1a1510, alpha: 0.6 });
    g.roundRect(bx, y, barW, 1, 1).fill({ color: 0x000000, alpha: 0.2 }); // top shadow
    const frac = Math.min(1, value / maxValue);
    const fillW = barW * frac;
    // Main fill
    g.roundRect(bx, y, fillW, barH, 2).fill({ color, alpha: 0.7 });
    // Top specular highlight
    if (fillW > 2) {
      g.roundRect(bx + 1, y + 1, fillW - 2, 2, 1).fill({ color: 0xffffff, alpha: 0.15 });
    }
    // Fill edge notch (end cap highlight)
    if (fillW > 4) {
      g.rect(bx + fillW - 1, y, 1, barH).fill({ color: lerpColor(color, 0xffffff, 0.3), alpha: 0.25 });
    }
    this._addText(`${value}`, bx + barW + 4, y - 1, 8, 0x6a5a40);
  }

  // =========================================================================
  //  GAME OVER — dramatic red vignette, stats scroll
  // =========================================================================

  private _drawGameOver(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    const time = this._anim.time;

    // Dark red overlay
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0000, alpha: 0.92 });

    // Falling ash/ember particles
    for (let i = 0; i < 25; i++) {
      const seed = i * 113.7;
      const ashX = (seed * 7.1 + time * (3 + (i % 4) * 1.5)) % sw;
      const ashY = (seed * 3.3 + time * (10 + (i % 3) * 5)) % sh;
      const ashAlpha = 0.08 + 0.06 * Math.sin(time * 2 + i);
      const ashColor = i % 3 === 0 ? 0xff4422 : i % 3 === 1 ? 0xaa3311 : 0x882222;
      g.circle(ashX, ashY, 0.5 + (i % 2) * 0.3).fill({ color: ashColor, alpha: ashAlpha });
    }

    // Red vignette edges (multi-layered for depth)
    const vignetteAlpha = 0.3 + Math.sin(time * 1.5) * 0.1;
    for (let layer = 0; layer < 3; layer++) {
      const size = 30 + layer * 15;
      const a = vignetteAlpha * (0.6 - layer * 0.15);
      g.rect(0, 0, sw, size).fill({ color: 0x880000, alpha: a });
      g.rect(0, sh - size, sw, size).fill({ color: 0x880000, alpha: a });
      g.rect(0, 0, size, sh).fill({ color: 0x880000, alpha: a * 0.7 });
      g.rect(sw - size, 0, size, sh).fill({ color: 0x880000, alpha: a * 0.7 });
    }

    // Skull icon with pulsing red glow
    const skullGlow = 0.08 + 0.05 * Math.sin(time * 2);
    g.circle(sw / 2, sh / 2 - 130, 35).fill({ color: 0xff2222, alpha: skullGlow });
    this._drawSkullIcon(sw / 2, sh / 2 - 130, 40, 0x882222);

    // Title with dramatic red glow halo
    g.ellipse(sw / 2, sh / 2 - 88, 160, 25).fill({ color: 0xff2222, alpha: 0.06 + 0.03 * Math.sin(time * 1.5) });
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
    const time = this._anim.time;
    g.rect(0, 0, sw, sh).fill({ color: 0x0a0805, alpha: 0.92 });

    // Floating golden sparkle particles across the screen
    for (let i = 0; i < 50; i++) {
      const seed = i * 157.3;
      const spX = (seed * 5.3 + time * (4 + (i % 5) * 2)) % sw;
      const spY = sh - ((seed * 8.7 + time * (8 + (i % 4) * 3)) % sh);
      const twinkle = 0.12 + 0.12 * Math.sin(time * 5 + i * 0.8);
      const spColor = i % 3 === 0 ? GOLD_COLOR : i % 3 === 1 ? 0xffee88 : 0xffcc44;
      g.circle(spX, spY, 0.5 + (i % 3) * 0.3).fill({ color: spColor, alpha: twinkle });
    }

    // Golden rays emanating from center (more rays, animated brightness)
    const rcx = sw / 2;
    const rcy = sh / 2 - 40;
    const rayCount = 16;
    for (let i = 0; i < rayCount; i++) {
      const angle = (Math.PI * 2 * i) / rayCount + time * 0.12;
      const innerR = 35;
      const outerR = 280;
      const spread = 0.07;
      const alpha = 0.05 + Math.sin(time * 2 + i * 0.5) * 0.03;

      g.moveTo(
        rcx + Math.cos(angle - spread) * innerR,
        rcy + Math.sin(angle - spread) * innerR,
      )
        .lineTo(
          rcx + Math.cos(angle - spread * 2.5) * outerR,
          rcy + Math.sin(angle - spread * 2.5) * outerR,
        )
        .lineTo(
          rcx + Math.cos(angle + spread * 2.5) * outerR,
          rcy + Math.sin(angle + spread * 2.5) * outerR,
        )
        .lineTo(
          rcx + Math.cos(angle + spread) * innerR,
          rcy + Math.sin(angle + spread) * innerR,
        )
        .closePath()
        .fill({ color: GOLD_COLOR, alpha });
    }

    // Central golden glow halo
    g.circle(rcx, rcy, 80).fill({ color: GOLD_COLOR, alpha: 0.04 + 0.02 * Math.sin(time * 1.5) });
    g.circle(rcx, rcy, 50).fill({ color: 0xffee88, alpha: 0.05 + 0.02 * Math.sin(time * 2) });

    // Chalice icon (more detailed, with glow and jewels)
    const chaliceY = sh / 2 - 110;
    // Outer glow
    g.circle(rcx, chaliceY, 40).fill({ color: GOLD_COLOR, alpha: 0.06 + 0.03 * Math.sin(time * 2) });
    g.circle(rcx, chaliceY, 25).fill({ color: 0xffee88, alpha: 0.08 });
    // Cup body
    g.moveTo(rcx - 14, chaliceY - 18).lineTo(rcx + 14, chaliceY - 18)
      .lineTo(rcx + 18, chaliceY + 10).lineTo(rcx - 18, chaliceY + 10)
      .closePath().fill({ color: GOLD_COLOR, alpha: 0.85 });
    // Cup rim highlight
    g.rect(rcx - 14, chaliceY - 18, 28, 3).fill({ color: GOLD_LIGHT, alpha: 0.4 });
    // Cup body specular
    g.rect(rcx - 8, chaliceY - 14, 4, 20).fill({ color: GOLD_LIGHT, alpha: 0.15 });
    // Stem
    g.rect(rcx - 3, chaliceY + 10, 6, 12).fill({ color: GOLD_COLOR, alpha: 0.85 });
    // Base
    g.rect(rcx - 12, chaliceY + 22, 24, 4).fill({ color: GOLD_COLOR, alpha: 0.85 });
    g.rect(rcx - 12, chaliceY + 22, 24, 1).fill({ color: GOLD_LIGHT, alpha: 0.3 });
    // Jewels on cup
    g.circle(rcx, chaliceY - 4, 2.5).fill({ color: 0xff4444, alpha: 0.7 });
    g.circle(rcx, chaliceY - 4, 1.2).fill({ color: 0xffaaaa, alpha: 0.4 });
    g.circle(rcx - 8, chaliceY + 2, 1.8).fill({ color: 0x4488ff, alpha: 0.6 });
    g.circle(rcx + 8, chaliceY + 2, 1.8).fill({ color: 0x44ff88, alpha: 0.6 });
    // Orbiting golden sparkles around chalice
    for (let i = 0; i < 6; i++) {
      const orbitAngle = time * 2.5 + (i / 6) * Math.PI * 2;
      const orbitR = 22 + Math.sin(time * 3 + i) * 3;
      const ox = rcx + Math.cos(orbitAngle) * orbitR;
      const oy = chaliceY + Math.sin(orbitAngle) * orbitR * 0.6;
      g.circle(ox, oy, 1.5).fill({ color: 0xffffcc, alpha: 0.4 + 0.3 * Math.sin(time * 4 + i) });
    }

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

    const panelW = 400;
    const panelH = 310;
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
    sy += 20;

    // Equipment summary
    this._addText("ATK:", statX, sy, 13, statColor); this._addText(`${p.attack}${p.equippedWeapon ? ` (+${p.equippedWeapon.attackBonus})` : ""}`, statValX, sy, 13, 0xcc4444);
    sy += 20;
    this._addText("DEF:", statX, sy, 13, statColor); this._addText(`${p.defense}${p.equippedArmor ? ` (+${p.equippedArmor.defenseBonus})` : ""}`, statValX, sy, 13, 0x4488cc);
    sy += 20;

    // Divider
    g.moveTo(px + 30, sy).lineTo(px + panelW - 30, sy)
      .stroke({ color: GOLD_DARK, width: 1, alpha: 0.3 });
    sy += 12;

    // Equipment names
    const equipColor = 0x5a4a30;
    if (p.equippedWeapon) this._addText(`Weapon: ${p.equippedWeapon.name}`, sw / 2, sy, 11, equipColor, true);
    sy += 16;
    if (p.equippedArmor) this._addText(`Armor: ${p.equippedArmor.name}`, sw / 2, sy, 11, equipColor, true);
    sy += 16;
    if (p.equippedRelic) this._addText(`Relic: ${p.equippedRelic.name}`, sw / 2, sy, 11, equipColor, true);

    // Skip prompt
    const blinkAlpha = 0.4 + Math.sin(this._anim.time * 3) * 0.3;
    this._addText("Press ENTER to continue", sw / 2, py + panelH - 18, 11, lerpColor(0x3a2a15, PARCHMENT, 1 - blinkAlpha), true);
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

      // Panel with gradient-like layering
      g.roundRect(panelX, ny - panelH / 2, panelW, panelH, 4)
        .fill({ color: bgColor, alpha: alpha * 0.88 });
      // Subtle top highlight
      g.roundRect(panelX + 1, ny - panelH / 2 + 1, panelW - 2, panelH * 0.35, 3)
        .fill({ color: 0xffffff, alpha: alpha * 0.04 });
      g.roundRect(panelX, ny - panelH / 2, panelW, panelH, 4)
        .stroke({ color: borderColor, width: 1, alpha: alpha * 0.6 });

      // Type-specific icon badge
      const iconX = panelX + 14;
      const iconY = ny;
      if (n.type === "levelup") {
        this._drawStarIcon(iconX, iconY, 14, GOLD_COLOR);
      } else if (n.type === "loot") {
        this._drawCoinIcon(iconX, iconY, 12);
      } else if (n.type === "warning") {
        this._drawSkullIcon(iconX, iconY, 14, 0xff4444);
      } else {
        // Info: small 'i' circle
        g.circle(iconX, iconY, 5).stroke({ color: n.color, width: 0.8, alpha: alpha * 0.6 });
        this._addText("i", iconX, iconY, 8, n.color, true, alpha);
      }

      // Text (shifted right for icon)
      this._addText(n.text, nx + 8, ny, 13, n.color, true, alpha);

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
    centered = false, fontOrAlpha?: string | number,
  ): void {
    const style = new TextStyle({
      fontFamily: typeof fontOrAlpha === "string" ? fontOrAlpha : (size >= 20 ? FONT_FANCY : FONT),
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
    t.alpha = typeof fontOrAlpha === "number" ? fontOrAlpha : 1;

    if (centered) {
      t.anchor.set(0.5, 0.5);
    }
    t.x = x;
    t.y = y;
    this._texts.push(t);
    this.container.addChild(t);
  }

  // =========================================================================
  //  CRAFTING SCREEN
  // =========================================================================

  private _drawCraftingScreen(state: GrailGameState, sw: number, sh: number): void {
    const g = this._gfx;
    const pw = Math.min(500, sw - 60);
    const ph = Math.min(500, sh - 80);
    const px = (sw - pw) / 2;
    const py = (sh - ph) / 2;

    this._drawParchmentBG(px, py, pw, ph);
    this._drawOrnateFrame(px, py, pw, ph);

    this._addText("Crafting Bench", px + pw / 2, py + 12, 16, 0x442200, true, FONT_FANCY);
    this._drawOrnamentDivider(px + 10, py + 32, pw - 20, GOLD_DARK);

    // Materials summary
    this._addText("Materials:", px + 12, py + 42, 10, 0x442200, false, FONT);
    let matY = py + 56;
    for (const mat of state.materials.slice(0, 6)) {
      const matDef = CRAFTING_MATERIALS[mat.id];
      if (matDef) {
        this._addText(`${matDef.name}: ${mat.quantity}`, px + 20, matY, 9, 0x553311, false, FONT);
        matY += 14;
      }
    }
    if (state.materials.length > 6) {
      this._addText(`...and ${state.materials.length - 6} more`, px + 20, matY, 8, 0x776644, false, FONT);
    }

    // Recipe list
    this._drawOrnamentDivider(px + 10, matY + 10, pw - 20, GOLD_DARK);
    let recY = matY + 24;
    this._addText("Recipes (Enter to craft):", px + 12, recY, 10, 0x442200, false, FONT);
    recY += 16;

    const recipes = CRAFTING_RECIPES;
    const scrollIdx = state.craftingScrollIndex;
    const visible = Math.min(8, recipes.length);
    const startIdx = Math.max(0, scrollIdx - Math.floor(visible / 2));

    for (let i = startIdx; i < Math.min(startIdx + visible, recipes.length); i++) {
      const recipe = recipes[i];
      const canMake = recipe.ingredients.every(ing => {
        const mat = state.materials.find(m => m.id === ing.matId);
        return mat && mat.quantity >= ing.quantity;
      });
      const isSelected = i === scrollIdx;
      const color = isSelected ? 0x442200 : (canMake ? 0x554422 : 0x998877);

      if (isSelected) {
        g.rect(px + 10, recY - 2, pw - 20, 16).fill({ color: 0xccbb99, alpha: 0.3 });
      }

      const prefix = isSelected ? "> " : "  ";
      const suffix = canMake ? "" : " (missing)";
      this._addText(`${prefix}${recipe.name}${suffix}`, px + 16, recY, 9, color, false, FONT);
      recY += 16;
    }

    // Selected recipe details
    if (scrollIdx >= 0 && scrollIdx < recipes.length) {
      const sel = recipes[scrollIdx];
      recY += 8;
      this._addText(sel.desc, px + 16, recY, 8, 0x665533, false, FONT);
      recY += 14;
      this._addText("Requires:", px + 16, recY, 8, 0x665533, false, FONT);
      recY += 12;
      for (const ing of sel.ingredients) {
        const matDef = CRAFTING_MATERIALS[ing.matId];
        const have = state.materials.find(m => m.id === ing.matId)?.quantity ?? 0;
        const color = have >= ing.quantity ? 0x226622 : 0xaa2222;
        this._addText(`  ${matDef?.name ?? ing.matId}: ${have}/${ing.quantity}`, px + 20, recY, 8, color, false, FONT);
        recY += 11;
      }
    }

    this._addText("ESC/E: Close  W/S: Navigate  Enter: Craft", px + pw / 2, py + ph - 14, 8, 0x776655, true, FONT);
  }

  // =========================================================================
  //  ENCHANTING SCREEN
  // =========================================================================

  private _drawEnchantingScreen(state: GrailGameState, sw: number, sh: number): void {
    const pw = Math.min(480, sw - 60);
    const ph = Math.min(450, sh - 80);
    const px = (sw - pw) / 2;
    const py = (sh - ph) / 2;

    this._drawParchmentBG(px, py, pw, ph);
    this._drawOrnateFrame(px, py, pw, ph);

    this._addText("Enchantment Table", px + pw / 2, py + 12, 16, 0x442200, true, FONT_FANCY);
    this._drawOrnamentDivider(px + 10, py + 32, pw - 20, GOLD_DARK);

    // Show inventory items that can be enchanted
    this._addText("Select item (1-9):", px + 12, py + 42, 10, 0x442200, false, FONT);
    let y = py + 58;
    const p = state.player;
    for (let i = 0; i < Math.min(9, p.inventory.length); i++) {
      const inv = p.inventory[i];
      if (inv.def.type === "weapon" || inv.def.type === "armor" || inv.def.type === "relic") {
        this._addText(`${i + 1}. ${inv.def.name} [${inv.def.type}]`, px + 20, y, 9, inv.def.color, false, FONT);
        y += 14;
      }
    }

    // Show available enchantments
    y += 8;
    this._drawOrnamentDivider(px + 10, y, pw - 20, GOLD_DARK);
    y += 14;
    this._addText("Enchantments (A/D to select):", px + 12, y, 10, 0x442200, false, FONT);
    y += 16;

    const enchIdx = state.enchantingScrollIndex % ENCHANTMENT_DEFS.length;
    for (let i = 0; i < ENCHANTMENT_DEFS.length; i++) {
      const ench = ENCHANTMENT_DEFS[i];
      const isSelected = i === enchIdx;
      const color = isSelected ? ench.color : 0x776655;
      const prefix = isSelected ? "> " : "  ";
      this._addText(`${prefix}${ench.name}: ${ench.desc}`, px + 16, y, 9, color, false, FONT);
      y += 14;
    }

    // Show cost of selected enchantment
    if (enchIdx >= 0 && enchIdx < ENCHANTMENT_DEFS.length) {
      const ench = ENCHANTMENT_DEFS[enchIdx];
      y += 6;
      this._addText(`Cost: ${ench.baseCost.map(c => {
        const matDef = CRAFTING_MATERIALS[c.matId];
        return `${matDef?.name ?? c.matId} x${c.quantity}`;
      }).join(", ")}`, px + 16, y, 8, 0x665533, false, FONT);
      y += 12;
      this._addText(`Success rate: ${Math.floor(ench.successRate * 100)}%  Max level: ${ench.maxLevel}`, px + 16, y, 8, 0x665533, false, FONT);
    }

    this._addText("ESC/E: Close  A/D: Enchant  1-9: Apply to item", px + pw / 2, py + ph - 14, 8, 0x776655, true, FONT);
  }

  // =========================================================================
  //  ARTIFACT LORE SCREEN
  // =========================================================================

  private _drawArtifactLoreScreen(state: GrailGameState, sw: number, sh: number): void {
    const pw = Math.min(500, sw - 60);
    const ph = Math.min(420, sh - 80);
    const px = (sw - pw) / 2;
    const py = (sh - ph) / 2;

    this._drawParchmentBG(px, py, pw, ph);
    this._drawOrnateFrame(px, py, pw, ph);

    this._addText("Artifact Collection", px + pw / 2, py + 12, 16, GOLD_COLOR, true, FONT_FANCY);
    this._drawOrnamentDivider(px + 10, py + 32, pw - 20, GOLD_DARK);

    const artId = state.artifactLoreViewing;
    const artDef = artId ? ARTIFACT_DEFS[artId] : null;

    if (artDef) {
      let y = py + 50;
      this._addText(artDef.name, px + pw / 2, y, 14, artDef.color, true, FONT_FANCY);
      y += 22;
      this._addText(artDef.desc, px + 20, y, 10, 0x442200, false, FONT);
      y += 20;
      this._drawOrnamentDivider(px + 30, y, pw - 60, GOLD_DARK);
      y += 14;
      this._addText("Lore:", px + 20, y, 10, 0x553311, false, FONT_FANCY);
      y += 16;

      // Word-wrap lore text
      const words = artDef.lore.split(" ");
      let line = "";
      for (const word of words) {
        if ((line + " " + word).length > 50) {
          this._addText(line, px + 24, y, 9, 0x665544, false, FONT);
          y += 13;
          line = word;
        } else {
          line = line ? line + " " + word : word;
        }
      }
      if (line) {
        this._addText(line, px + 24, y, 9, 0x665544, false, FONT);
        y += 18;
      }

      // Stats
      this._addText("Bonuses:", px + 20, y, 10, 0x442200, false, FONT);
      y += 14;
      if (artDef.attackBonus) this._addText(`  ATK +${artDef.attackBonus}`, px + 24, y, 9, 0xff4444, false, FONT), y += 12;
      if (artDef.defenseBonus) this._addText(`  DEF +${artDef.defenseBonus}`, px + 24, y, 9, 0x4488ff, false, FONT), y += 12;
      if (artDef.hpBonus) this._addText(`  HP +${artDef.hpBonus}`, px + 24, y, 9, 0xff4444, false, FONT), y += 12;
      if (artDef.specialEffect) this._addText(`  Special: ${artDef.specialEffect}`, px + 24, y, 9, 0x8844ff, false, FONT), y += 12;

      // Set bonus info
      if (artDef.setId) {
        const setBonus = ARTIFACT_SET_BONUSES.find(s => s.setId === artDef.setId);
        if (setBonus) {
          y += 8;
          const owned = state.artifacts.filter(a => a.found && setBonus.pieces.includes(a.id)).length;
          this._addText(`Set: ${setBonus.name} (${owned}/${setBonus.pieces.length})`, px + 20, y, 10, setBonus.color, false, FONT_FANCY);
          y += 14;
          for (const bonus of setBonus.bonuses) {
            const active = owned >= bonus.count;
            this._addText(`  ${bonus.count}pc: ${bonus.desc}`, px + 24, y, 8, active ? 0x226622 : 0x998877, false, FONT);
            y += 11;
          }
        }
      }

      // Upgrade hint
      if (artDef.questHint) {
        y += 8;
        this._addText(`Hint: ${artDef.questHint}`, px + 20, y, 8, 0x886644, false, FONT);
      }
    }

    // Navigation
    const artCount = state.artifacts.filter(a => a.found).length;
    this._addText(`A/D: Navigate (${artCount} found)  ESC/L: Close`, px + pw / 2, py + ph - 14, 8, 0x776655, true, FONT);
  }

  // =========================================================================
  //  COMPANION HUD (small panel during gameplay)
  // =========================================================================

  private _drawCompanionHUD(state: GrailGameState, _sw: number, sh: number): void {
    const g = this._gfx;
    const comp = state.companion!;
    const x = 10;
    const y = sh - 120;
    const w = 140;
    const h = 55;

    this._drawPanel(x, y, w, h, PANEL_BG, 0.75);
    this._drawOrnateFrame(x, y, w, h, comp.def.color, 1, 4);

    // Name and class
    this._addText(`${comp.def.name}`, x + 5, y + 4, 9, comp.def.color, false, FONT);
    this._addText(`Lv${comp.level} ${comp.def.companionClass}`, x + w - 5, y + 4, 7, 0xaaaaaa, false, FONT);

    // HP bar
    const hpFrac = comp.hp / comp.maxHp;
    g.roundRect(x + 5, y + 18, w - 10, 8, 2).fill({ color: 0x220000, alpha: 0.6 });
    if (hpFrac > 0) {
      const hpColor = hpFrac > 0.5 ? 0x44aa44 : (hpFrac > 0.25 ? 0xaaaa44 : 0xaa4444);
      g.roundRect(x + 5, y + 18, (w - 10) * hpFrac, 8, 2).fill({ color: hpColor });
    }
    this._addText(`${Math.ceil(comp.hp)}/${comp.maxHp}`, x + w / 2, y + 18, 7, 0xffffff, true, FONT);

    // Loyalty
    const loyaltyColor = comp.loyalty >= 70 ? 0x44ff44 : (comp.loyalty >= 40 ? 0xffaa44 : 0xff4444);
    this._addText(`Loyalty: ${comp.loyalty}%`, x + 5, y + 30, 7, loyaltyColor, false, FONT);

    // Behavior
    this._addText(`[B] ${comp.behavior}`, x + 5, y + 42, 7, 0xaaaaaa, false, FONT);
  }

  // =========================================================================
  //  INFINITE MODE SCORE
  // =========================================================================

  private _drawInfiniteScore(state: GrailGameState, sw: number, _sh: number): void {
    const g = this._gfx;
    const x = sw / 2 - 60;
    const y = 4;
    const w = 120;
    const h = 22;

    g.roundRect(x, y, w, h, 3).fill({ color: PANEL_BG, alpha: 0.7 });
    g.roundRect(x, y, w, h, 3).stroke({ color: GOLD_COLOR, width: 1, alpha: 0.5 });

    this._addText(`SCORE: ${state.infiniteScore}`, x + w / 2, y + 4, 10, GOLD_COLOR, true, FONT);
  }

  // =========================================================================
  //  MATERIAL COUNT INDICATOR
  // =========================================================================

  private _drawMaterialCount(state: GrailGameState, sw: number, sh: number): void {
    const x = sw - 110;
    const y = sh - 65;
    const totalMats = state.materials.reduce((s, m) => s + m.quantity, 0);

    this._addText(`Materials: ${totalMats}`, x, y, 8, 0xaaaaaa, false, FONT);
    this._addText(`[E] at bench to craft`, x, y + 12, 7, 0x888888, false, FONT);
  }

  // =========================================================================
  //  ARTIFACT COUNT INDICATOR
  // =========================================================================

  private _drawArtifactCount(state: GrailGameState, sw: number, sh: number): void {
    const found = state.artifacts.filter(a => a.found).length;
    if (found === 0) return;
    const x = sw - 110;
    const y = sh - 40;
    this._addText(`Artifacts: ${found}  [L] lore`, x, y, 8, GOLD_COLOR, false, FONT);
  }

  // =========================================================================
  //  CONTROLS HELP OVERLAY
  // =========================================================================

  private _drawHelpOverlay(sw: number, sh: number): void {
    const g = this._gfx;
    g.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });

    const panelW = 360;
    const panelH = 380;
    const px = (sw - panelW) / 2;
    const py = (sh - panelH) / 2;

    this._drawParchmentBG(px, py, panelW, panelH);
    this._drawOrnateFrame(px, py, panelW, panelH, GOLD_COLOR, 2, 8);

    this._addText("Controls", sw / 2, py + 24, 22, 0x3a2a15, true);

    g.moveTo(px + 30, py + 44).lineTo(px + panelW - 30, py + 44)
      .stroke({ color: GOLD_DARK, width: 1, alpha: 0.5 });

    const lx = px + 40;
    const rx = px + panelW - 40;
    let y = py + 60;
    const hdrColor = 0x3a2a15;
    const txtColor = 0x5a4a30;
    const step = 22;

    const controls: [string, string][] = [
      ["WASD", "Move"],
      ["SPACE", "Attack"],
      ["Q", "Special Ability"],
      ["SHIFT", "Dash (i-frames)"],
      ["E", "Interact (chests, stairs, NPCs)"],
      ["I", "Inventory"],
      ["P", "Pause"],
      ["B", "Toggle Companion Behavior"],
      ["L", "View Artifact Lore"],
      ["H", "Toggle this Help"],
      ["TAB", "Toggle Buy/Sell in Shop"],
      ["Arrow Keys", "Pan Camera"],
      ["ESC x2", "Quit to Menu"],
    ];

    for (const [key, desc] of controls) {
      this._addText(key, lx, y, 12, hdrColor);
      this._addText(desc, rx, y, 12, txtColor);
      y += step;
    }

    this._addText("Press H to close", sw / 2, py + panelH - 18, 11, 0x7a6a50, true);
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
