// ---------------------------------------------------------------------------
// Rift Wizard HUD — HP bar, spell hotbar, level info, spell shop
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RiftWizardState } from "../state/RiftWizardState";
import { RWPhase } from "../state/RiftWizardState";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const LABEL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xcccccc,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffffff,
  fontWeight: "bold",
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xaaaaaa,
});

// ---------------------------------------------------------------------------
// HUD
// ---------------------------------------------------------------------------

export class RiftWizardHUD {
  readonly container = new Container();

  private _bg = new Graphics();
  private _hpBar = new Graphics();
  private _spellBar = new Graphics();
  private _infoText: Text;
  private _levelText: Text;
  private _spText: Text;
  private _turnText: Text;
  private _msgText: Text;
  private _spellTexts: Text[] = [];
  private _consumableText: Text;

  constructor() {
    this._infoText = new Text({ text: "", style: INFO_STYLE });
    this._levelText = new Text({ text: "", style: HEADER_STYLE });
    this._spText = new Text({ text: "", style: LABEL_STYLE });
    this._turnText = new Text({ text: "", style: LABEL_STYLE });
    this._msgText = new Text({ text: "", style: HEADER_STYLE });
    this._consumableText = new Text({ text: "", style: LABEL_STYLE });
  }

  build(): void {
    this.container.removeChildren();

    this.container.addChild(this._bg);
    this.container.addChild(this._hpBar);
    this.container.addChild(this._spellBar);
    this.container.addChild(this._infoText);
    this.container.addChild(this._levelText);
    this.container.addChild(this._spText);
    this.container.addChild(this._turnText);
    this.container.addChild(this._msgText);
    this.container.addChild(this._consumableText);
  }

  update(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const hudY = screenHeight - 80;
    const hudH = 80;

    // Background bar
    this._bg.clear();
    this._bg.rect(0, hudY, screenWidth, hudH);
    this._bg.fill({ color: 0x111111, alpha: 0.9 });

    // HP bar
    this._hpBar.clear();
    const hpBarX = 10;
    const hpBarY = hudY + 8;
    const hpBarW = 150;
    const hpBarH = 14;
    const hpRatio = Math.max(0, state.wizard.hp / state.wizard.maxHp);

    this._hpBar.rect(hpBarX, hpBarY, hpBarW, hpBarH);
    this._hpBar.fill(0x330000);
    this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    this._hpBar.fill(hpRatio > 0.5 ? 0x00cc00 : hpRatio > 0.25 ? 0xcccc00 : 0xcc0000);
    this._hpBar.rect(hpBarX, hpBarY, hpBarW, hpBarH);
    this._hpBar.stroke({ color: 0x666666, width: 1 });

    // Shield bar (overlay)
    if (state.wizard.shields > 0) {
      const shieldRatio = Math.min(1, state.wizard.shields / state.wizard.maxHp);
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
      this._hpBar.fill({ color: 0x44ddff, alpha: 0.4 });
    }

    // HP text
    this._infoText.text = `HP: ${state.wizard.hp}/${state.wizard.maxHp}${state.wizard.shields > 0 ? ` (+${state.wizard.shields})` : ""}`;
    this._infoText.x = hpBarX;
    this._infoText.y = hpBarY + hpBarH + 2;

    // Level/Turn info
    this._levelText.text = `Level ${state.currentLevel + 1}/${25}`;
    this._levelText.x = hpBarX;
    this._levelText.y = hudY + 50;

    this._spText.text = `SP: ${state.skillPoints}`;
    this._spText.x = 170;
    this._spText.y = hudY + 8;

    const enemyCount = state.level.enemies.filter((e) => e.alive).length;
    const spawnerCount = state.level.spawners.filter((s) => s.alive).length;
    this._turnText.text = `Turn ${state.turnNumber} | Enemies: ${enemyCount}${spawnerCount > 0 ? ` | Spawners: ${spawnerCount}` : ""}`;
    this._turnText.x = 170;
    this._turnText.y = hudY + 24;

    // Consumables
    const potions = state.consumables.find((c) => c.type === "health_potion")?.quantity ?? 0;
    const scrolls = state.consumables.find((c) => c.type === "charge_scroll")?.quantity ?? 0;
    this._consumableText.text = `[P]otions: ${potions} | [C]harge Scrolls: ${scrolls}`;
    this._consumableText.x = 170;
    this._consumableText.y = hudY + 40;

    // Spell bar
    this._updateSpellBar(state, screenWidth, hudY);

    // Center message
    this._msgText.text = "";
    if (state.phase === RWPhase.VICTORY) {
      this._msgText.text = "VICTORY! You defeated the final boss!";
    } else if (state.phase === RWPhase.GAME_OVER) {
      this._msgText.text = "GAME OVER - Press R to restart";
    } else if (state.level.cleared && state.currentLevel < 24) {
      this._msgText.text = "Level cleared! Walk to a rift portal.";
    } else if (state.phase === RWPhase.TARGETING) {
      const spell = state.spells[state.selectedSpellIndex];
      this._msgText.text = spell ? `Targeting: ${SPELL_DEFS[spell.defId]?.name ?? "?"} - Arrow keys + Enter | Esc to cancel` : "";
    } else if (state.phase === RWPhase.SPELL_SHOP) {
      this._msgText.text = "SPELL SHOP - Press number to buy | U to upgrade | Enter to continue";
    }
    this._msgText.x = Math.floor(screenWidth / 2);
    this._msgText.y = 10;
    this._msgText.anchor.set(0.5, 0);
  }

  private _updateSpellBar(
    state: RiftWizardState,
    screenWidth: number,
    hudY: number,
  ): void {
    this._spellBar.clear();

    // Remove old spell texts
    for (const t of this._spellTexts) {
      this.container.removeChild(t);
      t.destroy();
    }
    this._spellTexts = [];

    const spellBarX = Math.floor(screenWidth * 0.45);
    const slotW = 70;
    const slotH = 24;
    const slotY = hudY + 8;

    for (let i = 0; i < state.spells.length && i < 9; i++) {
      const spell = state.spells[i];
      const def = SPELL_DEFS[spell.defId];
      if (!def) continue;

      const sx = spellBarX + i * (slotW + 4);

      // Slot background
      const isSelected = state.selectedSpellIndex === i;
      const isEmpty = spell.charges <= 0;

      this._spellBar.rect(sx, slotY, slotW, slotH);
      this._spellBar.fill({
        color: isSelected ? 0x444488 : isEmpty ? 0x222222 : 0x333333,
      });

      // School color border
      this._spellBar.rect(sx, slotY, slotW, slotH);
      this._spellBar.stroke({
        color: isSelected ? 0xffffff : SCHOOL_COLORS[spell.school] ?? 0x666666,
        width: isSelected ? 2 : 1,
      });

      // Spell text
      const label = `${i + 1}:${def.name.substring(0, 6)} ${spell.charges}`;
      const text = new Text({
        text: label,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: isEmpty ? 0x666666 : 0xffffff,
        }),
      });
      text.x = sx + 2;
      text.y = slotY + 4;
      this.container.addChild(text);
      this._spellTexts.push(text);
    }

    // Second row for charges/damage info of selected spell
    if (state.selectedSpellIndex >= 0 && state.selectedSpellIndex < state.spells.length) {
      const spell = state.spells[state.selectedSpellIndex];
      const def = SPELL_DEFS[spell.defId];
      if (def) {
        const detailText = new Text({
          text: `${def.name} | Dmg: ${spell.damage} | Range: ${spell.range} | AoE: ${spell.aoeRadius} | Charges: ${spell.charges}/${spell.maxCharges}`,
          style: LABEL_STYLE,
        });
        detailText.x = spellBarX;
        detailText.y = slotY + slotH + 4;
        this.container.addChild(detailText);
        this._spellTexts.push(detailText);
      }
    }
  }

  destroy(): void {
    for (const t of this._spellTexts) {
      t.destroy();
    }
    this._spellTexts = [];
    this._infoText.destroy();
    this._levelText.destroy();
    this._spText.destroy();
    this._turnText.destroy();
    this._msgText.destroy();
    this._consumableText.destroy();
    this._bg.destroy();
    this._hpBar.destroy();
    this._spellBar.destroy();
    this.container.removeChildren();
  }
}
