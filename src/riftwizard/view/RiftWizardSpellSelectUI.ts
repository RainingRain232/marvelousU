// ---------------------------------------------------------------------------
// Rift Wizard spell shop / upgrade UI (between-level screen)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import { SpellSchool } from "../state/RiftWizardState";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";
import {
  getAvailableSpells,
  getAvailableUpgrades,
  getEffectiveSpellCost,
  getEffectiveUpgradeCost,
  learnSpell,
  buyUpgrade,
} from "../systems/RiftWizardProgressionSystem";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffffff,
  fontWeight: "bold",
});

const SP_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffcc44,
  fontWeight: "bold",
});

const TAB_ACTIVE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
});

const TAB_INACTIVE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0x666688,
});

const HELP_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x555577,
});

// ---------------------------------------------------------------------------
// Helper: draw a small school icon polygon
// ---------------------------------------------------------------------------

function drawSchoolIconSmall(g: Graphics, school: SpellSchool, cx: number, cy: number, s: number, color: number, alpha: number): void {
  switch (school) {
    case SpellSchool.FIRE: {
      g.moveTo(cx, cy - s);
      g.lineTo(cx + s * 0.5, cy + s * 0.3);
      g.lineTo(cx - s * 0.5, cy + s * 0.3);
      g.closePath();
      g.fill({ color, alpha });
      g.moveTo(cx - s * 0.3, cy - s * 0.1);
      g.lineTo(cx + s * 0.1, cy + s * 0.6);
      g.lineTo(cx - s * 0.6, cy + s * 0.6);
      g.closePath();
      g.fill({ color, alpha: alpha * 0.65 });
      g.moveTo(cx + s * 0.3, cy - s * 0.1);
      g.lineTo(cx + s * 0.6, cy + s * 0.6);
      g.lineTo(cx - s * 0.1, cy + s * 0.6);
      g.closePath();
      g.fill({ color, alpha: alpha * 0.65 });
      break;
    }
    case SpellSchool.ICE: {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI) / 3 - Math.PI / 2;
        const ox = cx + Math.cos(angle) * s;
        const oy = cy + Math.sin(angle) * s;
        const ia = angle + Math.PI / 6;
        const ix = cx + Math.cos(ia) * s * 0.45;
        const iy = cy + Math.sin(ia) * s * 0.45;
        if (i === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy);
        g.lineTo(ix, iy);
      }
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.LIGHTNING: {
      g.moveTo(cx - s * 0.2, cy - s);
      g.lineTo(cx + s * 0.4, cy - s * 0.15);
      g.lineTo(cx - s * 0.05, cy);
      g.lineTo(cx + s * 0.3, cy + s);
      g.lineTo(cx - s * 0.15, cy + s * 0.1);
      g.lineTo(cx + s * 0.1, cy + s * 0.05);
      g.lineTo(cx - s * 0.4, cy - s * 0.2);
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.ARCANE: {
      for (let i = 0; i < 6; i++) {
        const angle = (i * Math.PI * 2.2) / 6;
        const r = s * 0.35 + (i / 6) * s * 0.55;
        g.circle(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r, s * 0.14);
        g.fill({ color, alpha: alpha * (0.5 + i / 12) });
      }
      break;
    }
    case SpellSchool.NATURE: {
      g.moveTo(cx, cy - s);
      g.lineTo(cx + s * 0.55, cy - s * 0.15);
      g.lineTo(cx + s * 0.4, cy + s * 0.45);
      g.lineTo(cx, cy + s);
      g.lineTo(cx - s * 0.4, cy + s * 0.45);
      g.lineTo(cx - s * 0.55, cy - s * 0.15);
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.DARK: {
      for (let i = 0; i < 5; i++) {
        const angle = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(angle) * s * 0.8;
        const py = cy + Math.sin(angle) * s * 0.8;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.HOLY: {
      g.circle(cx, cy, s * 0.35);
      g.fill({ color, alpha });
      for (let i = 0; i < 8; i++) {
        const angle = (i * Math.PI) / 4;
        g.moveTo(cx + Math.cos(angle) * s * 0.45, cy + Math.sin(angle) * s * 0.45);
        g.lineTo(cx + Math.cos(angle) * s, cy + Math.sin(angle) * s);
        g.stroke({ color, width: 1, alpha });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Spell Select UI
// ---------------------------------------------------------------------------

export type SpellShopMode = "buy" | "upgrade";

export class RiftWizardSpellSelectUI {
  readonly container = new Container();

  private _bg = new Graphics();
  private _texts: Text[] = [];
  private _mode: SpellShopMode = "buy";
  private _selectedIndex = 0;
  private _upgradeSpellIndex = 0;

  /** Callback when player confirms and wants to continue. */
  onConfirm: (() => void) | null = null;

  build(): void {
    this.container.removeChildren();
    this.container.addChild(this._bg);
  }

  show(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    this._mode = "buy";
    this._selectedIndex = 0;
    this._upgradeSpellIndex = 0;
    this._render(state, screenWidth, screenHeight);
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  handleKey(
    state: RiftWizardState,
    key: string,
    screenWidth: number,
    screenHeight: number,
  ): boolean {
    if (key === "Enter" || key === "Escape") {
      this.onConfirm?.();
      return true;
    }

    if (key === "Tab") {
      this._mode = this._mode === "buy" ? "upgrade" : "buy";
      this._selectedIndex = 0;
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowUp" || key === "w") {
      this._selectedIndex = Math.max(0, this._selectedIndex - 1);
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowDown" || key === "s") {
      this._selectedIndex++;
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowLeft" || key === "a") {
      if (this._mode === "upgrade") {
        this._upgradeSpellIndex = Math.max(0, this._upgradeSpellIndex - 1);
        this._selectedIndex = 0;
        this._render(state, screenWidth, screenHeight);
      }
      return true;
    }

    if (key === "ArrowRight" || key === "d") {
      if (this._mode === "upgrade") {
        this._upgradeSpellIndex = Math.min(state.spells.length - 1, this._upgradeSpellIndex + 1);
        this._selectedIndex = 0;
        this._render(state, screenWidth, screenHeight);
      }
      return true;
    }

    if (key === " " || key === "Space") {
      this._tryBuySelected(state);
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    return false;
  }

  private _tryBuySelected(state: RiftWizardState): void {
    if (this._mode === "buy") {
      const available = getAvailableSpells(state);
      const sorted = available.sort((a, b) => a.spCost - b.spCost);
      if (this._selectedIndex < sorted.length) {
        learnSpell(state, sorted[this._selectedIndex].id);
      }
    } else {
      const spell = state.spells[this._upgradeSpellIndex];
      if (!spell) return;
      const upgrades = getAvailableUpgrades(spell);
      if (this._selectedIndex < upgrades.length) {
        buyUpgrade(state, this._upgradeSpellIndex, upgrades[this._selectedIndex].id);
      }
    }
  }

  private _render(
    state: RiftWizardState,
    screenWidth: number,
    screenHeight: number,
  ): void {
    // Clear previous texts
    for (const t of this._texts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._texts = [];

    this._bg.clear();

    const panelW = 560;
    const panelH = 480;
    const px = Math.floor((screenWidth - panelW) / 2);
    const py = Math.floor((screenHeight - panelH) / 2);

    // Panel background with layered effect
    // Outer shadow
    this._bg.rect(px + 3, py + 3, panelW, panelH);
    this._bg.fill({ color: 0x000000, alpha: 0.5 });
    // Main panel
    this._bg.rect(px, py, panelW, panelH);
    this._bg.fill({ color: 0x0c0c1e, alpha: 0.97 });

    // --- Diagonal line pattern in background ---
    for (let d = 0; d < panelW + panelH; d += 20) {
      const x1 = Math.max(0, d - panelH);
      const y1 = Math.min(panelH, d);
      const x2 = Math.min(panelW, d);
      const y2 = Math.max(0, d - panelW);
      this._bg.moveTo(px + x1, py + y1);
      this._bg.lineTo(px + x2, py + y2);
      this._bg.stroke({ color: 0x111125, width: 0.5, alpha: 0.3 });
    }

    // Inner gradient strip
    this._bg.rect(px, py, panelW, 50);
    this._bg.fill({ color: 0x141430, alpha: 0.8 });

    // --- Inner frame lines ---
    this._bg.rect(px + 6, py + 6, panelW - 12, panelH - 12);
    this._bg.stroke({ color: 0x222244, width: 0.5, alpha: 0.4 });

    // Border
    this._bg.rect(px, py, panelW, panelH);
    this._bg.stroke({ color: 0x3333aa, width: 2 });
    // Top accent line
    this._bg.rect(px, py, panelW, 2);
    this._bg.fill({ color: 0x6666cc, alpha: 0.8 });

    // --- Repeating rune-like geometric shapes along borders ---
    const runeSpacing = 24;
    // Top border runes
    for (let rx = px + runeSpacing; rx < px + panelW - runeSpacing / 2; rx += runeSpacing) {
      // Small diamond rune
      this._bg.moveTo(rx, py + 4);
      this._bg.lineTo(rx + 4, py + 8);
      this._bg.lineTo(rx, py + 12);
      this._bg.lineTo(rx - 4, py + 8);
      this._bg.closePath();
      this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.4 });
      // Center dot
      this._bg.circle(rx, py + 8, 1);
      this._bg.fill({ color: 0x5555bb, alpha: 0.3 });
    }
    // Bottom border runes
    for (let rx = px + runeSpacing; rx < px + panelW - runeSpacing / 2; rx += runeSpacing) {
      this._bg.moveTo(rx, py + panelH - 12);
      this._bg.lineTo(rx + 4, py + panelH - 8);
      this._bg.lineTo(rx, py + panelH - 4);
      this._bg.lineTo(rx - 4, py + panelH - 8);
      this._bg.closePath();
      this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.4 });
      this._bg.circle(rx, py + panelH - 8, 1);
      this._bg.fill({ color: 0x5555bb, alpha: 0.3 });
    }
    // Left border runes
    for (let ry = py + runeSpacing; ry < py + panelH - runeSpacing / 2; ry += runeSpacing) {
      this._bg.moveTo(px + 4, ry);
      this._bg.lineTo(px + 8, ry + 4);
      this._bg.lineTo(px + 4, ry + 8);
      this._bg.lineTo(px, ry + 4);
      this._bg.closePath();
      this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.35 });
    }
    // Right border runes
    for (let ry = py + runeSpacing; ry < py + panelH - runeSpacing / 2; ry += runeSpacing) {
      this._bg.moveTo(px + panelW - 4, ry);
      this._bg.lineTo(px + panelW, ry + 4);
      this._bg.lineTo(px + panelW - 4, ry + 8);
      this._bg.lineTo(px + panelW - 8, ry + 4);
      this._bg.closePath();
      this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.35 });
    }

    // Corner decorations
    this._drawCorner(px, py, 1, 1);
    this._drawCorner(px + panelW, py, -1, 1);
    this._drawCorner(px, py + panelH, 1, -1);
    this._drawCorner(px + panelW, py + panelH, -1, -1);

    // Title
    const title = new Text({ text: "SPELL SHOP", style: TITLE_STYLE });
    title.x = px + 20;
    title.y = py + 12;
    this.container.addChild(title);
    this._texts.push(title);

    // SP display
    const spDisplay = new Text({ text: `${state.skillPoints} SP`, style: SP_STYLE });
    spDisplay.x = px + panelW - 80;
    spDisplay.y = py + 14;
    this.container.addChild(spDisplay);
    this._texts.push(spDisplay);

    // --- SP icon: faceted gem polygon with inner star pattern ---
    const gemCx = px + panelW - 90;
    const gemCy = py + 22;
    const gemR = 7;
    // Outer hexagon gem facet
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const gx = gemCx + Math.cos(angle) * gemR;
      const gy = gemCy + Math.sin(angle) * gemR;
      if (i === 0) this._bg.moveTo(gx, gy); else this._bg.lineTo(gx, gy);
    }
    this._bg.closePath();
    this._bg.fill({ color: 0xffcc44, alpha: 0.9 });
    this._bg.stroke({ color: 0xffdd66, width: 1 });
    // Inner facet lines (star pattern connecting alternate vertices)
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 - Math.PI / 6;
      const gx = gemCx + Math.cos(angle) * gemR;
      const gy = gemCy + Math.sin(angle) * gemR;
      this._bg.moveTo(gemCx, gemCy);
      this._bg.lineTo(gx, gy);
      this._bg.stroke({ color: 0x0c0c1e, width: 0.5, alpha: 0.5 });
    }
    // Inner star (3-pointed, rotated)
    for (let i = 0; i < 3; i++) {
      const a1 = (i * Math.PI * 2) / 3 - Math.PI / 2;
      const a2 = ((i + 1) * Math.PI * 2) / 3 - Math.PI / 2;
      this._bg.moveTo(gemCx + Math.cos(a1) * gemR * 0.55, gemCy + Math.sin(a1) * gemR * 0.55);
      this._bg.lineTo(gemCx + Math.cos(a2) * gemR * 0.55, gemCy + Math.sin(a2) * gemR * 0.55);
      this._bg.stroke({ color: 0xffee88, width: 0.5, alpha: 0.6 });
    }
    // Center bright dot
    this._bg.circle(gemCx, gemCy, 1.5);
    this._bg.fill({ color: 0xffffff, alpha: 0.8 });

    // --- Tab bar with shaped tab polygons ---
    const tabY = py + 50;
    this._bg.rect(px, tabY, panelW, 28);
    this._bg.fill({ color: 0x101024, alpha: 0.8 });

    // Shaped tab polygon for "BUY SPELLS" with curved top
    const buyTabX = px + 8;
    const buyTabW = 128;
    const buyTabActive = this._mode === "buy";
    this._bg.moveTo(buyTabX, tabY + 28);
    this._bg.lineTo(buyTabX, tabY + 4);
    this._bg.lineTo(buyTabX + 4, tabY);
    this._bg.lineTo(buyTabX + buyTabW - 4, tabY);
    this._bg.lineTo(buyTabX + buyTabW, tabY + 4);
    this._bg.lineTo(buyTabX + buyTabW, tabY + 28);
    this._bg.closePath();
    this._bg.fill({ color: buyTabActive ? 0x1a1a3a : 0x0e0e1e, alpha: 0.8 });
    this._bg.stroke({ color: buyTabActive ? 0x4444cc : 0x333355, width: 1 });
    // Active tab indicator
    if (buyTabActive) {
      this._bg.rect(buyTabX + 4, tabY + 24, buyTabW - 8, 3);
      this._bg.fill(0x4444cc);
    }
    // Small scroll icon in buy tab
    this._bg.rect(buyTabX + 6, tabY + 6, 5, 8);
    this._bg.stroke({ color: buyTabActive ? 0x8888cc : 0x444466, width: 0.5 });
    this._bg.moveTo(buyTabX + 6, tabY + 6);
    this._bg.lineTo(buyTabX + 11, tabY + 6);
    this._bg.stroke({ color: buyTabActive ? 0x8888cc : 0x444466, width: 0.5 });

    // Shaped tab polygon for "UPGRADES"
    const upTabX = px + 146;
    const upTabW = 110;
    const upTabActive = this._mode === "upgrade";
    this._bg.moveTo(upTabX, tabY + 28);
    this._bg.lineTo(upTabX, tabY + 4);
    this._bg.lineTo(upTabX + 4, tabY);
    this._bg.lineTo(upTabX + upTabW - 4, tabY);
    this._bg.lineTo(upTabX + upTabW, tabY + 4);
    this._bg.lineTo(upTabX + upTabW, tabY + 28);
    this._bg.closePath();
    this._bg.fill({ color: upTabActive ? 0x1a1a3a : 0x0e0e1e, alpha: 0.8 });
    this._bg.stroke({ color: upTabActive ? 0x4444cc : 0x333355, width: 1 });
    if (upTabActive) {
      this._bg.rect(upTabX + 4, tabY + 24, upTabW - 8, 3);
      this._bg.fill(0x4444cc);
    }
    // Small arrow-up icon in upgrade tab
    this._bg.moveTo(upTabX + 8, tabY + 14);
    this._bg.lineTo(upTabX + 11, tabY + 7);
    this._bg.lineTo(upTabX + 14, tabY + 14);
    this._bg.closePath();
    this._bg.fill({ color: upTabActive ? 0x88cc88 : 0x444466, alpha: 0.7 });

    const buyTab = new Text({
      text: "BUY SPELLS",
      style: this._mode === "buy" ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE,
    });
    buyTab.x = px + 24;
    buyTab.y = tabY + 4;
    this.container.addChild(buyTab);
    this._texts.push(buyTab);

    const upgradeTab = new Text({
      text: "UPGRADES",
      style: this._mode === "upgrade" ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE,
    });
    upgradeTab.x = upTabX + 20;
    upgradeTab.y = tabY + 4;
    this.container.addChild(upgradeTab);
    this._texts.push(upgradeTab);

    // Help text
    const helpText = new Text({
      text: "Tab: switch tabs  |  Up/Down: select  |  Space: buy  |  Enter: continue",
      style: HELP_STYLE,
    });
    helpText.x = px + 20;
    helpText.y = py + panelH - 22;
    this.container.addChild(helpText);
    this._texts.push(helpText);

    // Separator above help
    this._bg.rect(px + 10, py + panelH - 30, panelW - 20, 1);
    this._bg.fill({ color: 0x333355, alpha: 0.5 });

    let listY = py + 88;

    if (this._mode === "buy") {
      this._renderBuyMode(state, px, listY, panelW, panelH, py);
    } else {
      this._renderUpgradeMode(state, px, listY, panelW, panelH, py);
    }
  }

  private _renderBuyMode(
    state: RiftWizardState,
    px: number,
    listY: number,
    panelW: number,
    panelH: number,
    py: number,
  ): void {
    const available = getAvailableSpells(state).sort((a, b) => a.spCost - b.spCost);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, available.length - 1));

    if (available.length === 0) {
      const noSpells = new Text({
        text: "No more spells available.",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x666688 }),
      });
      noSpells.x = px + 20;
      noSpells.y = listY;
      this.container.addChild(noSpells);
      this._texts.push(noSpells);
      return;
    }

    for (let i = 0; i < available.length; i++) {
      const def = available[i];
      const cost = getEffectiveSpellCost(state, def);
      const affordable = state.skillPoints >= cost;
      const isSelected = i === this._selectedIndex;
      const schoolColor = SCHOOL_COLORS[def.school] ?? 0x888888;

      // Row background
      if (isSelected) {
        this._bg.rect(px + 4, listY - 2, panelW - 8, 22);
        this._bg.fill({ color: 0x222244, alpha: 0.8 });
        this._bg.rect(px + 4, listY - 2, 3, 22);
        this._bg.fill(schoolColor);
      }

      // --- School-colored icon polygon instead of plain dot ---
      drawSchoolIconSmall(this._bg, def.school, px + 18, listY + 8, 5, schoolColor, affordable ? 0.9 : 0.3);

      // Spell name
      const nameText = new Text({
        text: def.name,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 12,
          fill: isSelected ? 0xffffff : affordable ? 0xccccdd : 0x555566,
          fontWeight: isSelected ? "bold" : "normal",
        }),
      });
      nameText.x = px + 30;
      nameText.y = listY;
      this.container.addChild(nameText);
      this._texts.push(nameText);

      // Cost
      const costText = new Text({
        text: `${cost} SP`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 11,
          fill: affordable ? 0xffcc44 : 0x664422,
          fontWeight: "bold",
        }),
      });
      costText.x = px + 200;
      costText.y = listY + 1;
      this.container.addChild(costText);
      this._texts.push(costText);

      // Description
      const descText = new Text({
        text: def.description.substring(0, 40),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: isSelected ? 0x9999aa : 0x555566,
        }),
      });
      descText.x = px + 260;
      descText.y = listY + 2;
      this.container.addChild(descText);
      this._texts.push(descText);

      listY += 22;

      if (listY > py + panelH - 100) break;
    }

    // --- Selected spell detail panel at bottom with ornate border ---
    if (this._selectedIndex < available.length) {
      const sel = available[this._selectedIndex];
      const detailY = py + panelH - 80;
      const detailX = px + 10;
      const detailW = panelW - 20;
      const detailH = 40;

      this._bg.rect(detailX, detailY, detailW, detailH);
      this._bg.fill({ color: 0x141428, alpha: 0.8 });

      // Ornate border with notched corners
      this._bg.moveTo(detailX + 4, detailY);
      this._bg.lineTo(detailX + detailW - 4, detailY);
      this._bg.lineTo(detailX + detailW, detailY + 4);
      this._bg.lineTo(detailX + detailW, detailY + detailH - 4);
      this._bg.lineTo(detailX + detailW - 4, detailY + detailH);
      this._bg.lineTo(detailX + 4, detailY + detailH);
      this._bg.lineTo(detailX, detailY + detailH - 4);
      this._bg.lineTo(detailX, detailY + 4);
      this._bg.closePath();
      this._bg.stroke({ color: 0x444477, width: 1 });

      // Small corner accents
      this._bg.circle(detailX + 4, detailY + 4, 1.5);
      this._bg.fill({ color: 0x5555aa, alpha: 0.5 });
      this._bg.circle(detailX + detailW - 4, detailY + 4, 1.5);
      this._bg.fill({ color: 0x5555aa, alpha: 0.5 });
      this._bg.circle(detailX + 4, detailY + detailH - 4, 1.5);
      this._bg.fill({ color: 0x5555aa, alpha: 0.5 });
      this._bg.circle(detailX + detailW - 4, detailY + detailH - 4, 1.5);
      this._bg.fill({ color: 0x5555aa, alpha: 0.5 });

      const detailText = new Text({
        text: `${sel.name} | Dmg: ${sel.damage} | Range: ${sel.range ?? "-"} | AoE: ${sel.aoeRadius ?? 0} | Charges: ${sel.baseCharges}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xbbbbcc }),
      });
      detailText.x = detailX + 8;
      detailText.y = detailY + 4;
      this.container.addChild(detailText);
      this._texts.push(detailText);

      const descFull = new Text({
        text: sel.description,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x888899 }),
      });
      descFull.x = detailX + 8;
      descFull.y = detailY + 22;
      this.container.addChild(descFull);
      this._texts.push(descFull);
    }
  }

  private _renderUpgradeMode(
    state: RiftWizardState,
    px: number,
    listY: number,
    panelW: number,
    panelH: number,
    py: number,
  ): void {
    if (state.spells.length === 0) {
      const noSpells = new Text({
        text: "No spells learned yet.",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x666688 }),
      });
      noSpells.x = px + 20;
      noSpells.y = listY;
      this.container.addChild(noSpells);
      this._texts.push(noSpells);
      return;
    }

    this._upgradeSpellIndex = Math.min(this._upgradeSpellIndex, state.spells.length - 1);
    const spell = state.spells[this._upgradeSpellIndex];
    const def = SPELL_DEFS[spell.defId];
    if (!def) return;

    const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x888888;

    // Spell header with navigation
    const headerBg_y = listY - 4;
    this._bg.rect(px + 10, headerBg_y, panelW - 20, 30);
    this._bg.fill({ color: 0x1a1a34, alpha: 0.8 });
    this._bg.rect(px + 10, headerBg_y, 3, 30);
    this._bg.fill(schoolColor);

    const spellHeader = new Text({
      text: `< ${def.name} (${this._upgradeSpellIndex + 1}/${state.spells.length}) >`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 14,
        fill: schoolColor,
        fontWeight: "bold",
      }),
    });
    spellHeader.x = px + 20;
    spellHeader.y = listY;
    this.container.addChild(spellHeader);
    this._texts.push(spellHeader);

    // Current stats
    const statsText = new Text({
      text: `Dmg: ${spell.damage}  Range: ${spell.range}  AoE: ${spell.aoeRadius}  Charges: ${spell.charges}/${spell.maxCharges}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x9999aa }),
    });
    statsText.x = px + 240;
    statsText.y = listY + 2;
    this.container.addChild(statsText);
    this._texts.push(statsText);

    listY += 38;

    // Available upgrades
    const upgrades = getAvailableUpgrades(spell);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, upgrades.length - 1));

    if (upgrades.length === 0) {
      const noUp = new Text({
        text: "All upgrades purchased!",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x44cc44 }),
      });
      noUp.x = px + 20;
      noUp.y = listY;
      this.container.addChild(noUp);
      this._texts.push(noUp);
      listY += 20;
    } else {
      const upLabel = new Text({
        text: "Available Upgrades:",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8888aa }),
      });
      upLabel.x = px + 20;
      upLabel.y = listY;
      this.container.addChild(upLabel);
      this._texts.push(upLabel);
      listY += 18;

      for (let i = 0; i < upgrades.length; i++) {
        const up = upgrades[i];
        const cost = getEffectiveUpgradeCost(state, spell, up);
        const affordable = state.skillPoints >= cost;
        const isSelected = i === this._selectedIndex;

        // Row background
        if (isSelected) {
          this._bg.rect(px + 4, listY - 2, panelW - 8, 22);
          this._bg.fill({ color: 0x222244, alpha: 0.8 });
          this._bg.rect(px + 4, listY - 2, 3, 22);
          this._bg.fill(0x44cc44);
        }

        // Arrow indicator
        const arrow = new Text({
          text: isSelected ? ">" : " ",
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 12,
            fill: 0x44cc44,
            fontWeight: "bold",
          }),
        });
        arrow.x = px + 16;
        arrow.y = listY;
        this.container.addChild(arrow);
        this._texts.push(arrow);

        // Upgrade name
        const nameText = new Text({
          text: up.name,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 12,
            fill: isSelected ? 0xffffff : affordable ? 0xccccdd : 0x555566,
            fontWeight: isSelected ? "bold" : "normal",
          }),
        });
        nameText.x = px + 30;
        nameText.y = listY;
        this.container.addChild(nameText);
        this._texts.push(nameText);

        // Cost
        const costText = new Text({
          text: `${cost} SP`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: affordable ? 0xffcc44 : 0x664422,
            fontWeight: "bold",
          }),
        });
        costText.x = px + 220;
        costText.y = listY + 1;
        this.container.addChild(costText);
        this._texts.push(costText);

        // Description
        const descText = new Text({
          text: up.description.substring(0, 35),
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: isSelected ? 0x9999aa : 0x555566,
          }),
        });
        descText.x = px + 280;
        descText.y = listY + 2;
        this.container.addChild(descText);
        this._texts.push(descText);

        listY += 22;
      }
    }

    // Purchased upgrades
    if (spell.upgrades.length > 0) {
      listY += 10;
      this._bg.rect(px + 20, listY, panelW - 40, 1);
      this._bg.fill({ color: 0x335533, alpha: 0.5 });
      listY += 8;

      const owned = new Text({
        text: "Purchased:",
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x44aa44 }),
      });
      owned.x = px + 20;
      owned.y = listY;
      this.container.addChild(owned);
      this._texts.push(owned);
      listY += 16;

      for (const upId of spell.upgrades) {
        const up = def.upgrades.find((u) => u.id === upId);
        if (!up) continue;

        // --- Decorated checkbox polygon with fancy check shape ---
        const cbx = px + 22;
        const cby = listY + 6;
        const cbr = 5;
        // Decorated box (rounded-corner-like octagon)
        this._bg.moveTo(cbx - cbr, cby - cbr + 2);
        this._bg.lineTo(cbx - cbr + 2, cby - cbr);
        this._bg.lineTo(cbx + cbr - 2, cby - cbr);
        this._bg.lineTo(cbx + cbr, cby - cbr + 2);
        this._bg.lineTo(cbx + cbr, cby + cbr - 2);
        this._bg.lineTo(cbx + cbr - 2, cby + cbr);
        this._bg.lineTo(cbx - cbr + 2, cby + cbr);
        this._bg.lineTo(cbx - cbr, cby + cbr - 2);
        this._bg.closePath();
        this._bg.fill({ color: 0x1a2a1a, alpha: 0.6 });
        this._bg.stroke({ color: 0x44aa44, width: 1 });
        // Small corner dots on the checkbox
        this._bg.circle(cbx - cbr + 2, cby - cbr + 2, 0.8);
        this._bg.fill({ color: 0x44aa44, alpha: 0.4 });
        this._bg.circle(cbx + cbr - 2, cby - cbr + 2, 0.8);
        this._bg.fill({ color: 0x44aa44, alpha: 0.4 });
        // Fancy checkmark (thick, with a flourish)
        this._bg.moveTo(cbx - 3, cby);
        this._bg.lineTo(cbx - 1, cby + 3);
        this._bg.lineTo(cbx + 4, cby - 3);
        this._bg.stroke({ color: 0x66dd66, width: 1.5 });
        // Small flourish dot at check tip
        this._bg.circle(cbx + 4, cby - 3, 1);
        this._bg.fill({ color: 0x66dd66, alpha: 0.6 });

        const line = new Text({
          text: `${up.name} — ${up.description}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x339933 }),
        });
        line.x = px + 34;
        line.y = listY;
        this.container.addChild(line);
        this._texts.push(line);
        listY += 16;

        if (listY > py + panelH - 50) break;
      }
    }
  }

  private _drawCorner(x: number, y: number, dx: number, dy: number): void {
    const len = 10;
    // Main corner L-shape
    this._bg.moveTo(x, y + dy * len);
    this._bg.lineTo(x, y);
    this._bg.lineTo(x + dx * len, y);
    this._bg.stroke({ color: 0x6666cc, width: 2 });

    // --- Spiral curve extensions ---
    // Spiral at the end of horizontal arm
    const spiralX = x + dx * len;
    const spiralR = 3;
    this._bg.moveTo(spiralX, y);
    this._bg.lineTo(spiralX + dx * spiralR, y + dy * spiralR);
    this._bg.lineTo(spiralX + dx * spiralR * 0.3, y + dy * spiralR * 1.2);
    this._bg.stroke({ color: 0x5555bb, width: 1, alpha: 0.7 });
    // Small circle at end of horizontal spiral
    this._bg.circle(spiralX + dx * spiralR * 0.3, y + dy * spiralR * 1.2, 1.5);
    this._bg.fill({ color: 0x6666cc, alpha: 0.6 });

    // Spiral at the end of vertical arm
    const spiralY = y + dy * len;
    this._bg.moveTo(x, spiralY);
    this._bg.lineTo(x + dx * spiralR, spiralY + dy * spiralR);
    this._bg.lineTo(x + dx * spiralR * 1.2, spiralY + dy * spiralR * 0.3);
    this._bg.stroke({ color: 0x5555bb, width: 1, alpha: 0.7 });
    // Small circle at end of vertical spiral
    this._bg.circle(x + dx * spiralR * 1.2, spiralY + dy * spiralR * 0.3, 1.5);
    this._bg.fill({ color: 0x6666cc, alpha: 0.6 });

    // --- Filigree connecting line between the two spiral ends ---
    this._bg.moveTo(spiralX + dx * spiralR * 0.3, y + dy * spiralR * 1.2);
    this._bg.lineTo(x + dx * spiralR * 1.2, spiralY + dy * spiralR * 0.3);
    this._bg.stroke({ color: 0x4444aa, width: 0.5, alpha: 0.4 });

    // Small circle at the corner vertex itself
    this._bg.circle(x, y, 2);
    this._bg.fill({ color: 0x6666cc, alpha: 0.5 });
  }

  destroy(): void {
    for (const t of this._texts) {
      t.destroy();
    }
    this._texts = [];
    this._bg.destroy();
    this.container.removeChildren();
  }
}
