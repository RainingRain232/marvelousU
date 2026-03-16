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
    // Inner gradient strip
    this._bg.rect(px, py, panelW, 50);
    this._bg.fill({ color: 0x141430, alpha: 0.8 });
    // Border
    this._bg.rect(px, py, panelW, panelH);
    this._bg.stroke({ color: 0x3333aa, width: 2 });
    // Top accent line
    this._bg.rect(px, py, panelW, 2);
    this._bg.fill({ color: 0x6666cc, alpha: 0.8 });
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

    // SP icon
    this._bg.circle(px + panelW - 90, py + 22, 6);
    this._bg.fill(0xffcc44);
    this._bg.circle(px + panelW - 90, py + 22, 4);
    this._bg.fill(0x0c0c1e);
    this._bg.circle(px + panelW - 90, py + 22, 2);
    this._bg.fill(0xffcc44);

    // Tab bar
    const tabY = py + 50;
    this._bg.rect(px, tabY, panelW, 28);
    this._bg.fill({ color: 0x101024, alpha: 0.8 });
    // Active tab indicator
    if (this._mode === "buy") {
      this._bg.rect(px + 10, tabY + 24, 120, 3);
      this._bg.fill(0x4444cc);
    } else {
      this._bg.rect(px + 150, tabY + 24, 100, 3);
      this._bg.fill(0x4444cc);
    }

    const buyTab = new Text({
      text: "BUY SPELLS",
      style: this._mode === "buy" ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE,
    });
    buyTab.x = px + 20;
    buyTab.y = tabY + 4;
    this.container.addChild(buyTab);
    this._texts.push(buyTab);

    const upgradeTab = new Text({
      text: "UPGRADES",
      style: this._mode === "upgrade" ? TAB_ACTIVE_STYLE : TAB_INACTIVE_STYLE,
    });
    upgradeTab.x = px + 160;
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

      // School color dot
      this._bg.circle(px + 18, listY + 8, 4);
      this._bg.fill({ color: schoolColor, alpha: affordable ? 1 : 0.3 });

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

    // Selected spell detail panel at bottom
    if (this._selectedIndex < available.length) {
      const sel = available[this._selectedIndex];
      const detailY = py + panelH - 80;
      this._bg.rect(px + 10, detailY, panelW - 20, 40);
      this._bg.fill({ color: 0x141428, alpha: 0.8 });
      this._bg.rect(px + 10, detailY, panelW - 20, 40);
      this._bg.stroke({ color: 0x333355, width: 1 });

      const detailText = new Text({
        text: `${sel.name} | Dmg: ${sel.damage} | Range: ${sel.range ?? "-"} | AoE: ${sel.aoeRadius ?? 0} | Charges: ${sel.baseCharges}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xbbbbcc }),
      });
      detailText.x = px + 18;
      detailText.y = detailY + 4;
      this.container.addChild(detailText);
      this._texts.push(detailText);

      const descFull = new Text({
        text: sel.description,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x888899 }),
      });
      descFull.x = px + 18;
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

        // Checkmark
        this._bg.circle(px + 22, listY + 6, 4);
        this._bg.stroke({ color: 0x44aa44, width: 1 });
        this._bg.moveTo(px + 19, listY + 6);
        this._bg.lineTo(px + 21, listY + 8);
        this._bg.lineTo(px + 25, listY + 3);
        this._bg.stroke({ color: 0x44aa44, width: 1.5 });

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
    this._bg.moveTo(x, y + dy * len);
    this._bg.lineTo(x, y);
    this._bg.lineTo(x + dx * len, y);
    this._bg.stroke({ color: 0x6666cc, width: 2 });
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
