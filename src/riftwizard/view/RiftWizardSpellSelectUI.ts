// ---------------------------------------------------------------------------
// Rift Wizard spell shop / upgrade UI (between-level screen)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
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
  fontSize: 20,
  fill: 0xffffff,
  fontWeight: "bold",
});

const ITEM_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xcccccc,
});

const SELECTED_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffffff,
  fontWeight: "bold",
});


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
  private _upgradeSpellIndex = 0; // which owned spell to show upgrades for

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

  /** Handle keyboard input. Returns true if consumed. */
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

    // Background
    this._bg.clear();
    const panelW = 500;
    const panelH = 450;
    const px = Math.floor((screenWidth - panelW) / 2);
    const py = Math.floor((screenHeight - panelH) / 2);

    this._bg.rect(px, py, panelW, panelH);
    this._bg.fill({ color: 0x111122, alpha: 0.95 });
    this._bg.rect(px, py, panelW, panelH);
    this._bg.stroke({ color: 0x4444aa, width: 2 });

    // Title
    const title = new Text({
      text: `Spell Shop - SP: ${state.skillPoints}`,
      style: TITLE_STYLE,
    });
    title.x = px + 20;
    title.y = py + 10;
    this.container.addChild(title);
    this._texts.push(title);

    // Tab indicators
    const buyTab = new Text({
      text: this._mode === "buy" ? "[BUY SPELLS]" : " Buy Spells ",
      style: this._mode === "buy" ? SELECTED_STYLE : ITEM_STYLE,
    });
    buyTab.x = px + 20;
    buyTab.y = py + 40;
    this.container.addChild(buyTab);
    this._texts.push(buyTab);

    const upgradeTab = new Text({
      text: this._mode === "upgrade" ? "[UPGRADES]" : " Upgrades ",
      style: this._mode === "upgrade" ? SELECTED_STYLE : ITEM_STYLE,
    });
    upgradeTab.x = px + 160;
    upgradeTab.y = py + 40;
    this.container.addChild(upgradeTab);
    this._texts.push(upgradeTab);

    const helpText = new Text({
      text: "Tab: switch | Up/Down: select | Space: buy | Enter: continue",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x666666 }),
    });
    helpText.x = px + 20;
    helpText.y = py + panelH - 20;
    this.container.addChild(helpText);
    this._texts.push(helpText);

    let listY = py + 65;

    if (this._mode === "buy") {
      const available = getAvailableSpells(state).sort((a, b) => a.spCost - b.spCost);
      this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, available.length - 1));

      for (let i = 0; i < available.length; i++) {
        const def = available[i];
        const cost = getEffectiveSpellCost(state, def);
        const affordable = state.skillPoints >= cost;
        const isSelected = i === this._selectedIndex;

        const line = new Text({
          text: `${isSelected ? ">" : " "} ${def.name} (${cost} SP) - ${def.description}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: isSelected ? 0xffffff : affordable ? 0xcccccc : 0x666666,
            fontWeight: isSelected ? "bold" : "normal",
          }),
        });
        line.x = px + 20;
        line.y = listY;
        this.container.addChild(line);
        this._texts.push(line);

        // School color dot
        this._bg.circle(px + 14, listY + 6, 3);
        this._bg.fill(SCHOOL_COLORS[def.school] ?? 0x888888);

        listY += 18;

        if (listY > py + panelH - 40) break;
      }
    } else {
      // Upgrade mode
      if (state.spells.length === 0) {
        const noSpells = new Text({ text: "No spells learned yet.", style: ITEM_STYLE });
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

      // Show spell name and current stats
      const spellHeader = new Text({
        text: `< ${def.name} (${this._upgradeSpellIndex + 1}/${state.spells.length}) > | Dmg: ${spell.damage} | Range: ${spell.range} | Charges: ${spell.charges}/${spell.maxCharges}`,
        style: SELECTED_STYLE,
      });
      spellHeader.x = px + 20;
      spellHeader.y = listY;
      this.container.addChild(spellHeader);
      this._texts.push(spellHeader);
      listY += 24;

      // List upgrades
      const upgrades = getAvailableUpgrades(spell);
      this._selectedIndex = Math.min(this._selectedIndex, Math.max(0, upgrades.length - 1));

      for (let i = 0; i < upgrades.length; i++) {
        const up = upgrades[i];
        const cost = getEffectiveUpgradeCost(state, spell, up);
        const affordable = state.skillPoints >= cost;
        const isSelected = i === this._selectedIndex;

        const line = new Text({
          text: `${isSelected ? ">" : " "} ${up.name} (${cost} SP) - ${up.description}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: isSelected ? 0xffffff : affordable ? 0xcccccc : 0x666666,
            fontWeight: isSelected ? "bold" : "normal",
          }),
        });
        line.x = px + 20;
        line.y = listY;
        this.container.addChild(line);
        this._texts.push(line);
        listY += 18;
      }

      // Show already purchased upgrades
      if (spell.upgrades.length > 0) {
        listY += 8;
        const owned = new Text({
          text: "Purchased upgrades:",
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x44cc44 }),
        });
        owned.x = px + 20;
        owned.y = listY;
        this.container.addChild(owned);
        this._texts.push(owned);
        listY += 14;

        for (const upId of spell.upgrades) {
          const up = def.upgrades.find((u) => u.id === upId);
          if (!up) continue;
          const line = new Text({
            text: `  + ${up.name}`,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x339933 }),
          });
          line.x = px + 20;
          line.y = listY;
          this.container.addChild(line);
          this._texts.push(line);
          listY += 14;
        }
      }
    }
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
