// ---------------------------------------------------------------------------
// Rift Wizard spell shop / upgrade / ability UI (between-level screen)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import { SpellSchool } from "../state/RiftWizardState";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { ABILITY_DEFS } from "../config/RiftWizardAbilityDefs";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";
import {
  getAvailableSpells,
  getAvailableUpgrades,
  getEffectiveSpellCost,
  getEffectiveUpgradeCost,
  getAvailableAbilities,
  getEffectiveAbilityCost,
  learnSpell,
  learnAbility,
  buyUpgrade,
} from "../systems/RiftWizardProgressionSystem";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const FONT = "monospace";

function _style(size: number, color: number, bold = false): TextStyle {
  return new TextStyle({
    fontFamily: FONT,
    fontSize: size,
    fill: color,
    fontWeight: bold ? "bold" : "normal",
  });
}

// ---------------------------------------------------------------------------
// Helper: draw a small school icon polygon
// ---------------------------------------------------------------------------

function drawSchoolIcon(
  g: Graphics, school: SpellSchool,
  cx: number, cy: number, s: number,
  color: number, alpha: number,
): void {
  switch (school) {
    case SpellSchool.FIRE: {
      g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.6, cy + s * 0.4);
      g.lineTo(cx - s * 0.6, cy + s * 0.4); g.closePath();
      g.fill({ color, alpha });
      g.moveTo(cx - s * 0.25, cy); g.lineTo(cx + s * 0.1, cy + s * 0.55);
      g.lineTo(cx - s * 0.5, cy + s * 0.55); g.closePath();
      g.fill({ color, alpha: alpha * 0.6 });
      break;
    }
    case SpellSchool.ICE: {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI) / 3 - Math.PI / 2;
        const ox = cx + Math.cos(a) * s;
        const oy = cy + Math.sin(a) * s;
        const ia = a + Math.PI / 6;
        const ix = cx + Math.cos(ia) * s * 0.45;
        const iy = cy + Math.sin(ia) * s * 0.45;
        if (i === 0) g.moveTo(ox, oy); else g.lineTo(ox, oy);
        g.lineTo(ix, iy);
      }
      g.closePath(); g.fill({ color, alpha });
      break;
    }
    case SpellSchool.LIGHTNING: {
      g.moveTo(cx - s * 0.2, cy - s); g.lineTo(cx + s * 0.4, cy - s * 0.15);
      g.lineTo(cx - s * 0.05, cy); g.lineTo(cx + s * 0.3, cy + s);
      g.lineTo(cx - s * 0.15, cy + s * 0.1); g.lineTo(cx + s * 0.1, cy + s * 0.05);
      g.lineTo(cx - s * 0.4, cy - s * 0.2); g.closePath();
      g.fill({ color, alpha });
      break;
    }
    case SpellSchool.ARCANE: {
      for (let i = 0; i < 6; i++) {
        const a = (i * Math.PI * 2.2) / 6;
        const r = s * 0.35 + (i / 6) * s * 0.55;
        g.circle(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s * 0.14);
        g.fill({ color, alpha: alpha * (0.5 + i / 12) });
      }
      break;
    }
    case SpellSchool.NATURE: {
      g.moveTo(cx, cy - s); g.lineTo(cx + s * 0.55, cy - s * 0.15);
      g.lineTo(cx + s * 0.4, cy + s * 0.45); g.lineTo(cx, cy + s);
      g.lineTo(cx - s * 0.4, cy + s * 0.45); g.lineTo(cx - s * 0.55, cy - s * 0.15);
      g.closePath(); g.fill({ color, alpha });
      break;
    }
    case SpellSchool.DARK: {
      for (let i = 0; i < 5; i++) {
        const a = (i * Math.PI * 2) / 5 - Math.PI / 2;
        const px = cx + Math.cos(a) * s * 0.8;
        const py = cy + Math.sin(a) * s * 0.8;
        if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
      }
      g.closePath(); g.fill({ color, alpha });
      break;
    }
    case SpellSchool.HOLY: {
      g.circle(cx, cy, s * 0.35); g.fill({ color, alpha });
      for (let i = 0; i < 8; i++) {
        const a = (i * Math.PI) / 4;
        g.moveTo(cx + Math.cos(a) * s * 0.45, cy + Math.sin(a) * s * 0.45);
        g.lineTo(cx + Math.cos(a) * s, cy + Math.sin(a) * s);
        g.stroke({ color, width: 1, alpha });
      }
      break;
    }
  }
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PANEL_W = 620;
const PANEL_H = 540;
const ROW_H = 24;
const LIST_TOP = 92;
const LIST_BOT_MARGIN = 90; // reserved for detail panel + help
const MAX_VISIBLE_ROWS = Math.floor((PANEL_H - LIST_TOP - LIST_BOT_MARGIN) / ROW_H);

// ---------------------------------------------------------------------------
// Spell Select UI
// ---------------------------------------------------------------------------

export type SpellShopMode = "buy" | "upgrade" | "abilities";

export class RiftWizardSpellSelectUI {
  readonly container = new Container();

  private _bg = new Graphics();
  private _texts: Text[] = [];
  private _mode: SpellShopMode = "buy";
  private _selectedIndex = 0;
  private _scrollOffset = 0;
  private _upgradeSpellIndex = 0;

  onConfirm: (() => void) | null = null;

  build(): void {
    this.container.removeChildren();
    this.container.addChild(this._bg);
  }

  show(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    this._mode = "buy";
    this._selectedIndex = 0;
    this._scrollOffset = 0;
    this._upgradeSpellIndex = 0;
    this._render(state, screenWidth, screenHeight);
    this.container.visible = true;
  }

  hide(): void { this.container.visible = false; }

  handleKey(
    state: RiftWizardState, key: string,
    screenWidth: number, screenHeight: number,
  ): boolean {
    if (key === "Enter" || key === "Escape") {
      this.onConfirm?.();
      return true;
    }

    if (key === "Tab") {
      const modes: SpellShopMode[] = ["buy", "abilities", "upgrade"];
      const idx = modes.indexOf(this._mode);
      this._mode = modes[(idx + 1) % modes.length];
      this._selectedIndex = 0;
      this._scrollOffset = 0;
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowUp" || key === "w") {
      this._selectedIndex = Math.max(0, this._selectedIndex - 1);
      this._ensureVisible();
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowDown" || key === "s") {
      this._selectedIndex++;
      this._ensureVisible();
      this._render(state, screenWidth, screenHeight);
      return true;
    }

    if (key === "ArrowLeft" || key === "a") {
      if (this._mode === "upgrade") {
        this._upgradeSpellIndex = Math.max(0, this._upgradeSpellIndex - 1);
        this._selectedIndex = 0;
        this._scrollOffset = 0;
        this._render(state, screenWidth, screenHeight);
      }
      return true;
    }

    if (key === "ArrowRight" || key === "d") {
      if (this._mode === "upgrade") {
        this._upgradeSpellIndex = Math.min(state.spells.length - 1, this._upgradeSpellIndex + 1);
        this._selectedIndex = 0;
        this._scrollOffset = 0;
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

  private _ensureVisible(): void {
    if (this._selectedIndex < this._scrollOffset) {
      this._scrollOffset = this._selectedIndex;
    }
    if (this._selectedIndex >= this._scrollOffset + MAX_VISIBLE_ROWS) {
      this._scrollOffset = this._selectedIndex - MAX_VISIBLE_ROWS + 1;
    }
  }

  private _tryBuySelected(state: RiftWizardState): void {
    if (this._mode === "buy") {
      const available = getAvailableSpells(state).sort((a, b) => a.spCost - b.spCost);
      if (this._selectedIndex < available.length) {
        learnSpell(state, available[this._selectedIndex].id);
      }
    } else if (this._mode === "abilities") {
      const available = getAvailableAbilities(state).sort((a, b) => a.spCost - b.spCost);
      if (this._selectedIndex < available.length) {
        learnAbility(state, available[this._selectedIndex].id);
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

  // -----------------------------------------------------------------------
  // Main render
  // -----------------------------------------------------------------------

  private _render(
    state: RiftWizardState, screenWidth: number, screenHeight: number,
  ): void {
    for (const t of this._texts) { this.container.removeChild(t); t.destroy(); }
    this._texts = [];
    this._bg.clear();

    const px = Math.floor((screenWidth - PANEL_W) / 2);
    const py = Math.floor((screenHeight - PANEL_H) / 2);

    // --- Background layers ---
    this._bg.rect(px + 4, py + 4, PANEL_W, PANEL_H);
    this._bg.fill({ color: 0x000000, alpha: 0.5 });
    this._bg.rect(px, py, PANEL_W, PANEL_H);
    this._bg.fill({ color: 0x0a0a18, alpha: 0.97 });

    // Subtle grid pattern
    for (let gx = px + 16; gx < px + PANEL_W; gx += 16) {
      this._bg.moveTo(gx, py); this._bg.lineTo(gx, py + PANEL_H);
      this._bg.stroke({ color: 0x111122, width: 0.5, alpha: 0.2 });
    }
    for (let gy = py + 16; gy < py + PANEL_H; gy += 16) {
      this._bg.moveTo(px, gy); this._bg.lineTo(px + PANEL_W, gy);
      this._bg.stroke({ color: 0x111122, width: 0.5, alpha: 0.2 });
    }

    // Header gradient
    this._bg.rect(px, py, PANEL_W, 48);
    this._bg.fill({ color: 0x12122a, alpha: 0.9 });

    // Borders
    this._bg.rect(px, py, PANEL_W, PANEL_H);
    this._bg.stroke({ color: 0x3838aa, width: 2 });
    // Glow line at top
    this._bg.rect(px + 1, py + 1, PANEL_W - 2, 2);
    this._bg.fill({ color: 0x6666dd, alpha: 0.7 });

    // Inner frame
    this._bg.rect(px + 8, py + 8, PANEL_W - 16, PANEL_H - 16);
    this._bg.stroke({ color: 0x222244, width: 0.5, alpha: 0.35 });

    // Corner gems
    for (const [cx, cy] of [[px + 8, py + 8], [px + PANEL_W - 8, py + 8], [px + 8, py + PANEL_H - 8], [px + PANEL_W - 8, py + PANEL_H - 8]]) {
      this._bg.circle(cx, cy, 3);
      this._bg.fill({ color: 0x5555cc, alpha: 0.6 });
      this._bg.circle(cx, cy, 1.5);
      this._bg.fill({ color: 0x8888ff, alpha: 0.4 });
    }

    // --- Title ---
    this._addText("SPELL SHOP", px + 20, py + 13, 20, 0xeeeeff, true);

    // SP display with gem
    const spX = px + PANEL_W - 100;
    this._drawGem(spX, py + 22, 8);
    this._addText(`${state.skillPoints} SP`, spX + 14, py + 14, 15, 0xffcc44, true);

    // --- Tab bar ---
    const tabY = py + 50;
    this._bg.rect(px, tabY, PANEL_W, 32);
    this._bg.fill({ color: 0x0c0c20, alpha: 0.9 });

    const tabs: { label: string; mode: SpellShopMode; w: number }[] = [
      { label: "SPELLS", mode: "buy", w: 100 },
      { label: "ABILITIES", mode: "abilities", w: 110 },
      { label: "UPGRADES", mode: "upgrade", w: 110 },
    ];

    let tabX = px + 10;
    for (const tab of tabs) {
      const active = this._mode === tab.mode;
      // Tab shape
      this._bg.moveTo(tabX, tabY + 32);
      this._bg.lineTo(tabX, tabY + 4);
      this._bg.lineTo(tabX + 4, tabY);
      this._bg.lineTo(tabX + tab.w - 4, tabY);
      this._bg.lineTo(tabX + tab.w, tabY + 4);
      this._bg.lineTo(tabX + tab.w, tabY + 32);
      this._bg.closePath();
      this._bg.fill({ color: active ? 0x1a1a3a : 0x0c0c1a, alpha: active ? 0.95 : 0.6 });
      this._bg.stroke({ color: active ? 0x5555cc : 0x333355, width: 1 });
      if (active) {
        this._bg.rect(tabX + 4, tabY + 28, tab.w - 8, 3);
        this._bg.fill(0x5555cc);
      }
      this._addText(tab.label, tabX + 12, tabY + 8, 12, active ? 0xffffff : 0x666688, active);
      tabX += tab.w + 6;
    }

    // Owned abilities count badge
    if (state.abilities.length > 0) {
      const badgeX = px + 10 + 100 + 6 + 90;
      this._bg.circle(badgeX, tabY + 8, 7);
      this._bg.fill({ color: 0x44aa44, alpha: 0.8 });
      this._addText(`${state.abilities.length}`, badgeX - 3, tabY + 2, 9, 0xffffff, true);
    }

    // --- Help bar ---
    const helpY = py + PANEL_H - 22;
    this._bg.rect(px + 10, helpY - 6, PANEL_W - 20, 1);
    this._bg.fill({ color: 0x333355, alpha: 0.4 });
    this._addText(
      "Tab: switch  |  \u2191\u2193: select  |  Space: buy  |  Enter: continue",
      px + 20, helpY, 10, 0x555577,
    );

    // --- Content area ---
    const listY = py + LIST_TOP;
    if (this._mode === "buy") this._renderBuyMode(state, px, listY, py);
    else if (this._mode === "abilities") this._renderAbilitiesMode(state, px, listY, py);
    else this._renderUpgradeMode(state, px, listY, py);
  }

  // -----------------------------------------------------------------------
  // BUY SPELLS tab
  // -----------------------------------------------------------------------

  private _renderBuyMode(
    state: RiftWizardState, px: number, listY: number, py: number,
  ): void {
    const available = getAvailableSpells(state).sort((a, b) => a.spCost - b.spCost);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, available.length - 1));

    if (available.length === 0) {
      this._addText("All spells learned!", px + 20, listY + 10, 13, 0x44cc44);
      return;
    }

    // Scroll indicator
    if (available.length > MAX_VISIBLE_ROWS) {
      const pct = this._scrollOffset / Math.max(1, available.length - MAX_VISIBLE_ROWS);
      this._drawScrollbar(px + PANEL_W - 18, listY, PANEL_H - LIST_TOP - LIST_BOT_MARGIN, pct);
    }

    const end = Math.min(available.length, this._scrollOffset + MAX_VISIBLE_ROWS);
    for (let i = this._scrollOffset; i < end; i++) {
      const def = available[i];
      const cost = getEffectiveSpellCost(state, def);
      const affordable = state.skillPoints >= cost;
      const selected = i === this._selectedIndex;
      const sc = SCHOOL_COLORS[def.school] ?? 0x888888;
      const rowY = listY + (i - this._scrollOffset) * ROW_H;

      if (selected) {
        this._bg.rect(px + 12, rowY - 2, PANEL_W - 40, ROW_H);
        this._bg.fill({ color: 0x1a1a3a, alpha: 0.9 });
        this._bg.rect(px + 12, rowY - 2, 3, ROW_H);
        this._bg.fill(sc);
        // Subtle glow
        this._bg.rect(px + 15, rowY - 2, PANEL_W - 46, ROW_H);
        this._bg.stroke({ color: sc, width: 0.5, alpha: 0.3 });
      }

      drawSchoolIcon(this._bg, def.school, px + 26, rowY + 9, 5, sc, affordable ? 0.9 : 0.3);
      this._addText(def.name, px + 38, rowY + 1, 12,
        selected ? 0xffffff : affordable ? 0xccccdd : 0x555566, selected);
      this._addText(`${cost} SP`, px + 210, rowY + 2, 11,
        affordable ? 0xffcc44 : 0x664422, true);
      this._addText(def.description.substring(0, 42), px + 268, rowY + 3, 9,
        selected ? 0x9999bb : 0x555566);
    }

    // Detail panel
    if (this._selectedIndex < available.length) {
      this._renderSpellDetail(available[this._selectedIndex], state, px, py);
    }
  }

  // -----------------------------------------------------------------------
  // ABILITIES tab
  // -----------------------------------------------------------------------

  private _renderAbilitiesMode(
    state: RiftWizardState, px: number, listY: number, py: number,
  ): void {
    const available = getAvailableAbilities(state).sort((a, b) => a.spCost - b.spCost);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, available.length - 1));

    // Show owned abilities at top
    if (state.abilities.length > 0) {
      this._addText("Owned:", px + 16, listY, 10, 0x44aa44, true);
      let ox = px + 66;
      for (const id of state.abilities) {
        const def = ABILITY_DEFS[id];
        if (!def) continue;
        const sc = SCHOOL_COLORS[def.school] ?? 0x888888;
        this._bg.roundRect(ox - 2, listY - 2, 10, 14, 2);
        this._bg.fill({ color: sc, alpha: 0.3 });
        drawSchoolIcon(this._bg, def.school, ox + 3, listY + 5, 4, sc, 0.8);
        this._addText(def.name, ox + 12, listY, 9, 0x44aa44);
        ox += 10 + def.name.length * 5.5 + 10;
        if (ox > px + PANEL_W - 40) break;
      }
      listY += 20;
    }

    if (available.length === 0) {
      this._addText("All abilities learned!", px + 20, listY + 10, 13, 0x44cc44);
      return;
    }

    // Section label
    this._addText("Available Abilities:", px + 16, listY, 11, 0x8888aa, true);
    listY += 18;

    if (available.length > MAX_VISIBLE_ROWS - 1) {
      const pct = this._scrollOffset / Math.max(1, available.length - MAX_VISIBLE_ROWS + 1);
      this._drawScrollbar(px + PANEL_W - 18, listY, PANEL_H - LIST_TOP - LIST_BOT_MARGIN - 38, pct);
    }

    const maxRows = MAX_VISIBLE_ROWS - (state.abilities.length > 0 ? 2 : 0);
    const end = Math.min(available.length, this._scrollOffset + maxRows);
    for (let i = this._scrollOffset; i < end; i++) {
      const def = available[i];
      const cost = getEffectiveAbilityCost(state, def);
      const affordable = state.skillPoints >= cost;
      const selected = i === this._selectedIndex;
      const sc = SCHOOL_COLORS[def.school] ?? 0x888888;
      const rowY = listY + (i - this._scrollOffset) * ROW_H;

      if (selected) {
        this._bg.rect(px + 12, rowY - 2, PANEL_W - 40, ROW_H);
        this._bg.fill({ color: 0x1a1a3a, alpha: 0.9 });
        this._bg.rect(px + 12, rowY - 2, 3, ROW_H);
        this._bg.fill(sc);
      }

      // Ability icon: small diamond with school icon inside
      this._bg.moveTo(px + 26, rowY + 2);
      this._bg.lineTo(px + 34, rowY + 10);
      this._bg.lineTo(px + 26, rowY + 18);
      this._bg.lineTo(px + 18, rowY + 10);
      this._bg.closePath();
      this._bg.fill({ color: sc, alpha: affordable ? 0.15 : 0.05 });
      this._bg.stroke({ color: sc, width: 0.5, alpha: affordable ? 0.5 : 0.2 });
      drawSchoolIcon(this._bg, def.school, px + 26, rowY + 10, 4, sc, affordable ? 0.8 : 0.3);

      this._addText(def.name, px + 42, rowY + 1, 12,
        selected ? 0xffffff : affordable ? 0xccccdd : 0x555566, selected);
      this._addText(`${cost} SP`, px + 210, rowY + 2, 11,
        affordable ? 0xffcc44 : 0x664422, true);

      // Trigger tag
      const triggerLabel = this._triggerLabel(def.trigger);
      this._addText(triggerLabel, px + 268, rowY + 2, 9,
        selected ? 0xaa99cc : 0x666688);

      this._addText(def.description.substring(0, 36), px + 360, rowY + 3, 9,
        selected ? 0x9999bb : 0x555566);
    }

    // Detail panel for selected ability
    if (this._selectedIndex < available.length) {
      this._renderAbilityDetail(available[this._selectedIndex], state, px, py);
    }
  }

  private _triggerLabel(trigger: string): string {
    switch (trigger) {
      case "on_spell_cast": return "[On Cast]";
      case "on_fire_cast": return "[Fire Cast]";
      case "on_ice_cast": return "[Ice Cast]";
      case "on_lightning_cast": return "[Ltng Cast]";
      case "on_kill": return "[On Kill]";
      case "on_take_damage": return "[On Hit]";
      case "on_turn_start": return "[Per Turn]";
      case "passive": return "[Passive]";
      default: return "";
    }
  }

  // -----------------------------------------------------------------------
  // UPGRADES tab
  // -----------------------------------------------------------------------

  private _renderUpgradeMode(
    state: RiftWizardState, px: number, listY: number, py: number,
  ): void {
    if (state.spells.length === 0) {
      this._addText("No spells learned yet.", px + 20, listY + 10, 13, 0x666688);
      return;
    }

    this._upgradeSpellIndex = Math.min(this._upgradeSpellIndex, state.spells.length - 1);
    const spell = state.spells[this._upgradeSpellIndex];
    const def = SPELL_DEFS[spell.defId];
    if (!def) return;

    const sc = SCHOOL_COLORS[spell.school] ?? 0x888888;

    // Spell header with navigation
    this._bg.rect(px + 12, listY - 4, PANEL_W - 24, 32);
    this._bg.fill({ color: 0x141430, alpha: 0.8 });
    this._bg.rect(px + 12, listY - 4, 3, 32);
    this._bg.fill(sc);

    this._addText(
      `\u25C0  ${def.name}  (${this._upgradeSpellIndex + 1}/${state.spells.length})  \u25B6`,
      px + 22, listY + 2, 14, sc, true,
    );
    this._addText(
      `Dmg:${spell.damage}  Rng:${spell.range}  AoE:${spell.aoeRadius}  Chg:${spell.charges}/${spell.maxCharges}`,
      px + 300, listY + 4, 10, 0x9999aa,
    );

    listY += 38;

    // Available upgrades
    const upgrades = getAvailableUpgrades(spell);
    this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, upgrades.length - 1));

    if (upgrades.length === 0 && spell.upgrades.length === def.upgrades.length) {
      this._addText("All upgrades purchased!", px + 20, listY, 12, 0x44cc44);
      listY += 22;
    } else if (upgrades.length > 0) {
      this._addText("Available:", px + 16, listY, 10, 0x8888aa, true);
      listY += 16;

      for (let i = 0; i < upgrades.length; i++) {
        const up = upgrades[i];
        const cost = getEffectiveUpgradeCost(state, spell, up);
        const affordable = state.skillPoints >= cost;
        const selected = i === this._selectedIndex;
        const rowY = listY;

        if (selected) {
          this._bg.rect(px + 12, rowY - 2, PANEL_W - 40, ROW_H);
          this._bg.fill({ color: 0x1a2a1a, alpha: 0.8 });
          this._bg.rect(px + 12, rowY - 2, 3, ROW_H);
          this._bg.fill(0x44cc44);
        }

        this._addText(selected ? "\u25B8" : " ", px + 16, rowY + 1, 12, 0x44cc44, true);
        this._addText(up.name, px + 30, rowY + 1, 12,
          selected ? 0xffffff : affordable ? 0xccccdd : 0x555566, selected);
        this._addText(`${cost} SP`, px + 230, rowY + 2, 11,
          affordable ? 0xffcc44 : 0x664422, true);
        this._addText(up.description.substring(0, 38), px + 290, rowY + 3, 9,
          selected ? 0x9999bb : 0x555566);
        listY += ROW_H;
      }
    }

    // Purchased upgrades
    if (spell.upgrades.length > 0) {
      listY += 8;
      this._bg.rect(px + 20, listY, PANEL_W - 40, 1);
      this._bg.fill({ color: 0x335533, alpha: 0.4 });
      listY += 8;
      this._addText("Purchased:", px + 16, listY, 10, 0x44aa44, true);
      listY += 16;

      for (const upId of spell.upgrades) {
        const up = def.upgrades.find((u) => u.id === upId);
        if (!up) continue;
        if (listY > py + PANEL_H - LIST_BOT_MARGIN) break;

        // Checkmark
        this._bg.moveTo(px + 18, listY + 7);
        this._bg.lineTo(px + 21, listY + 11);
        this._bg.lineTo(px + 27, listY + 3);
        this._bg.stroke({ color: 0x66dd66, width: 1.5 });

        this._addText(`${up.name} \u2014 ${up.description}`, px + 34, listY + 1, 10, 0x339933);
        listY += 18;
      }
    }
  }

  // -----------------------------------------------------------------------
  // Detail panels
  // -----------------------------------------------------------------------

  private _renderSpellDetail(
    def: import("../config/RiftWizardSpellDefs").SpellDef,
    state: RiftWizardState, px: number, py: number,
  ): void {
    const dY = py + PANEL_H - LIST_BOT_MARGIN + 6;
    const dX = px + 14;
    const dW = PANEL_W - 28;
    const dH = 52;

    this._drawDetailBox(dX, dY, dW, dH, SCHOOL_COLORS[def.school] ?? 0x444477);

    const cost = getEffectiveSpellCost(state, def);
    const stats = [
      def.name,
      `Dmg: ${def.damage}`,
      `Range: ${def.range || "\u221E"}`,
      `AoE: ${def.aoeRadius}`,
      `Charges: ${def.baseCharges}`,
      `Cost: ${cost} SP`,
    ].join("  |  ");
    this._addText(stats, dX + 10, dY + 6, 10, 0xbbbbcc);
    this._addText(def.description, dX + 10, dY + 24, 10, 0x888899);

    // Upgrade count hint
    const upCount = def.upgrades.length;
    if (upCount > 0) {
      this._addText(`${upCount} upgrades available`, dX + dW - 130, dY + 6, 9, 0x6666aa);
    }
  }

  private _renderAbilityDetail(
    def: import("../config/RiftWizardAbilityDefs").AbilityDef,
    state: RiftWizardState, px: number, py: number,
  ): void {
    const dY = py + PANEL_H - LIST_BOT_MARGIN + 6;
    const dX = px + 14;
    const dW = PANEL_W - 28;
    const dH = 52;

    this._drawDetailBox(dX, dY, dW, dH, SCHOOL_COLORS[def.school] ?? 0x444477);

    const cost = getEffectiveAbilityCost(state, def);
    this._addText(
      `${def.name}  |  ${this._triggerLabel(def.trigger)}  |  ${def.school.toUpperCase()} school  |  ${cost} SP`,
      dX + 10, dY + 6, 10, 0xbbbbcc,
    );
    this._addText(def.description, dX + 10, dY + 24, 10, 0x888899);
  }

  // -----------------------------------------------------------------------
  // Drawing helpers
  // -----------------------------------------------------------------------

  private _addText(
    text: string, x: number, y: number,
    size: number, color: number, bold = false,
  ): Text {
    const t = new Text({ text, style: _style(size, color, bold) });
    t.x = x; t.y = y;
    this.container.addChild(t);
    this._texts.push(t);
    return t;
  }

  private _drawGem(cx: number, cy: number, r: number): void {
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      const gx = cx + Math.cos(a) * r;
      const gy = cy + Math.sin(a) * r;
      if (i === 0) this._bg.moveTo(gx, gy); else this._bg.lineTo(gx, gy);
    }
    this._bg.closePath();
    this._bg.fill({ color: 0xffcc44, alpha: 0.9 });
    this._bg.stroke({ color: 0xffdd66, width: 1 });
    for (let i = 0; i < 6; i++) {
      const a = (i * Math.PI) / 3 - Math.PI / 6;
      this._bg.moveTo(cx, cy);
      this._bg.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
      this._bg.stroke({ color: 0x0c0c1e, width: 0.5, alpha: 0.4 });
    }
    this._bg.circle(cx, cy, 1.5);
    this._bg.fill({ color: 0xffffff, alpha: 0.7 });
  }

  private _drawDetailBox(
    x: number, y: number, w: number, h: number, accentColor: number,
  ): void {
    this._bg.rect(x, y, w, h);
    this._bg.fill({ color: 0x10102a, alpha: 0.9 });
    // Notched corners
    this._bg.moveTo(x + 4, y);
    this._bg.lineTo(x + w - 4, y);
    this._bg.lineTo(x + w, y + 4);
    this._bg.lineTo(x + w, y + h - 4);
    this._bg.lineTo(x + w - 4, y + h);
    this._bg.lineTo(x + 4, y + h);
    this._bg.lineTo(x, y + h - 4);
    this._bg.lineTo(x, y + 4);
    this._bg.closePath();
    this._bg.stroke({ color: accentColor, width: 1, alpha: 0.6 });
    // Corner dots
    for (const [cx, cy] of [[x + 4, y + 4], [x + w - 4, y + 4], [x + 4, y + h - 4], [x + w - 4, y + h - 4]]) {
      this._bg.circle(cx, cy, 1.5);
      this._bg.fill({ color: accentColor, alpha: 0.4 });
    }
  }

  private _drawScrollbar(x: number, y: number, h: number, pct: number): void {
    // Track
    this._bg.rect(x, y, 4, h);
    this._bg.fill({ color: 0x222244, alpha: 0.4 });
    // Thumb
    const thumbH = Math.max(12, h * 0.3);
    const thumbY = y + pct * (h - thumbH);
    this._bg.rect(x, thumbY, 4, thumbH);
    this._bg.fill({ color: 0x5555aa, alpha: 0.7 });
  }

  destroy(): void {
    for (const t of this._texts) t.destroy();
    this._texts = [];
    this._bg.destroy();
    this.container.removeChildren();
  }
}
