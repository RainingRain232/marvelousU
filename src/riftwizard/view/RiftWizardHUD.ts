// ---------------------------------------------------------------------------
// Rift Wizard HUD — HP bar, spell hotbar, level info, status messages
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
  fill: 0xbbbbcc,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffffff,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 3 },
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xddddee,
});

const STAT_VALUE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaaaacc,
});

const MSG_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffffff,
  fontWeight: "bold",
  stroke: { color: 0x000000, width: 4 },
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
  private _tooltipText: Text;

  constructor() {
    this._infoText = new Text({ text: "", style: INFO_STYLE });
    this._levelText = new Text({ text: "", style: HEADER_STYLE });
    this._spText = new Text({ text: "", style: LABEL_STYLE });
    this._turnText = new Text({ text: "", style: STAT_VALUE_STYLE });
    this._msgText = new Text({ text: "", style: MSG_STYLE });
    this._consumableText = new Text({ text: "", style: LABEL_STYLE });
    this._tooltipText = new Text({ text: "", style: STAT_VALUE_STYLE });
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
    this.container.addChild(this._tooltipText);
  }

  update(state: RiftWizardState, screenWidth: number, screenHeight: number): void {
    const hudH = 90;
    const hudY = screenHeight - hudH;

    // Background bar with gradient-like effect
    this._bg.clear();
    // Dark base
    this._bg.rect(0, hudY, screenWidth, hudH);
    this._bg.fill({ color: 0x0a0a14, alpha: 0.95 });
    // Top border line
    this._bg.rect(0, hudY, screenWidth, 2);
    this._bg.fill({ color: 0x333366, alpha: 0.8 });
    // Subtle gradient strip
    this._bg.rect(0, hudY + 2, screenWidth, 3);
    this._bg.fill({ color: 0x1a1a2e, alpha: 0.6 });

    // --- Left section: HP + Level ---
    const leftX = 12;

    // HP bar (wider, with better styling)
    this._hpBar.clear();
    const hpBarX = leftX;
    const hpBarY = hudY + 10;
    const hpBarW = 180;
    const hpBarH = 16;
    const hpRatio = Math.max(0, state.wizard.hp / state.wizard.maxHp);

    // HP bar background
    this._hpBar.rect(hpBarX - 1, hpBarY - 1, hpBarW + 2, hpBarH + 2);
    this._hpBar.fill(0x0a0a0a);
    this._hpBar.rect(hpBarX, hpBarY, hpBarW, hpBarH);
    this._hpBar.fill(0x220000);

    // HP fill
    const hpColor = hpRatio > 0.6 ? 0x00bb00 : hpRatio > 0.3 ? 0xbbbb00 : 0xcc2200;
    const hpHighlight = hpRatio > 0.6 ? 0x22dd22 : hpRatio > 0.3 ? 0xdddd22 : 0xee4422;
    this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, hpBarH);
    this._hpBar.fill(hpColor);
    // Highlight strip on top
    if (hpRatio > 0) {
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * hpRatio, 3);
      this._hpBar.fill({ color: hpHighlight, alpha: 0.4 });
    }

    // Border
    this._hpBar.rect(hpBarX, hpBarY, hpBarW, hpBarH);
    this._hpBar.stroke({ color: 0x444466, width: 1 });

    // Shield bar overlay
    if (state.wizard.shields > 0) {
      const shieldRatio = Math.min(1, state.wizard.shields / state.wizard.maxHp);
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
      this._hpBar.fill({ color: 0x44ddff, alpha: 0.35 });
      this._hpBar.rect(hpBarX, hpBarY, hpBarW * shieldRatio, hpBarH);
      this._hpBar.stroke({ color: 0x44ddff, width: 1, alpha: 0.5 });
    }

    // HP text on bar
    const hpStr = `${state.wizard.hp}/${state.wizard.maxHp}${state.wizard.shields > 0 ? ` +${state.wizard.shields}` : ""}`;
    this._infoText.text = hpStr;
    this._infoText.x = hpBarX + hpBarW / 2 - this._infoText.width / 2;
    this._infoText.y = hpBarY + 1;

    // Level info
    this._levelText.text = `Level ${state.currentLevel + 1}/25`;
    this._levelText.x = leftX;
    this._levelText.y = hudY + 32;

    // SP display with icon-like styling
    this._spText.text = `SP: ${state.skillPoints}`;
    this._spText.style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 13,
      fill: 0xffcc44,
      fontWeight: "bold",
    });
    this._spText.x = leftX;
    this._spText.y = hudY + 55;

    // --- Middle section: Turn + Enemy info ---
    const midX = 200;
    const enemyCount = state.level.enemies.filter((e) => e.alive).length;
    const spawnerCount = state.level.spawners.filter((s) => s.alive).length;
    this._turnText.text = `Turn ${state.turnNumber}`;
    this._turnText.x = midX;
    this._turnText.y = hudY + 10;

    // Enemy/spawner count with color coding
    let enemyStr = `Enemies: ${enemyCount}`;
    if (spawnerCount > 0) enemyStr += `  Spawners: ${spawnerCount}`;
    this._consumableText.text = enemyStr;
    this._consumableText.style = new TextStyle({
      fontFamily: "monospace",
      fontSize: 11,
      fill: enemyCount > 0 ? 0xcc6666 : 0x66cc66,
    });
    this._consumableText.x = midX;
    this._consumableText.y = hudY + 26;

    // Consumables
    const potions = state.consumables.find((c) => c.type === "health_potion")?.quantity ?? 0;
    const scrolls = state.consumables.find((c) => c.type === "charge_scroll")?.quantity ?? 0;
    this._tooltipText.text = `[P] Potions: ${potions}  [C] Scrolls: ${scrolls}`;
    this._tooltipText.x = midX;
    this._tooltipText.y = hudY + 42;

    // --- Right section: Spell bar ---
    this._updateSpellBar(state, screenWidth, hudY);

    // --- Center message ---
    this._msgText.text = "";
    if (state.phase === RWPhase.VICTORY) {
      this._msgText.text = "VICTORY! You conquered all 25 levels!";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 22,
        fill: 0xffdd44,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      });
    } else if (state.phase === RWPhase.GAME_OVER) {
      this._msgText.text = "GAME OVER — [R] Restart  [Esc] Exit";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 18,
        fill: 0xff4444,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 },
      });
    } else if (state.level.cleared && state.currentLevel < 24) {
      this._msgText.text = "Level Cleared! Walk to a rift portal.";
      this._msgText.style = new TextStyle({
        fontFamily: "monospace",
        fontSize: 16,
        fill: 0x44ff88,
        fontWeight: "bold",
        stroke: { color: 0x000000, width: 3 },
      });
    } else if (state.phase === RWPhase.TARGETING) {
      const spell = state.spells[state.selectedSpellIndex];
      if (spell) {
        const def = SPELL_DEFS[spell.defId];
        this._msgText.text = `Targeting: ${def?.name ?? "?"} — Arrows + Enter | Esc cancel`;
        this._msgText.style = new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fill: SCHOOL_COLORS[spell.school] ?? 0xffffff,
          fontWeight: "bold",
          stroke: { color: 0x000000, width: 3 },
        });
      }
    } else if (state.phase === RWPhase.SPELL_SHOP) {
      this._msgText.text = "";
    }
    this._msgText.x = Math.floor(screenWidth / 2);
    this._msgText.y = 12;
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

    if (state.spells.length === 0) return;

    const slotW = 56;
    const slotH = 36;
    const slotGap = 4;
    const totalW = state.spells.length * (slotW + slotGap) - slotGap;
    const spellBarX = Math.max(360, Math.floor(screenWidth - totalW - 12));
    const slotY = hudY + 8;

    for (let i = 0; i < state.spells.length && i < 9; i++) {
      const spell = state.spells[i];
      const def = SPELL_DEFS[spell.defId];
      if (!def) continue;

      const sx = spellBarX + i * (slotW + slotGap);
      const isSelected = state.selectedSpellIndex === i;
      const isEmpty = spell.charges <= 0;
      const schoolColor = SCHOOL_COLORS[spell.school] ?? 0x666666;

      // Slot background
      this._spellBar.rect(sx, slotY, slotW, slotH);
      this._spellBar.fill({
        color: isSelected ? 0x222244 : isEmpty ? 0x111118 : 0x181828,
      });

      // School color accent bar on left
      this._spellBar.rect(sx, slotY, 3, slotH);
      this._spellBar.fill({ color: schoolColor, alpha: isEmpty ? 0.3 : 0.8 });

      // Selection glow
      if (isSelected) {
        this._spellBar.rect(sx - 1, slotY - 1, slotW + 2, slotH + 2);
        this._spellBar.stroke({ color: 0xffffff, width: 2 });
        // Inner glow
        this._spellBar.rect(sx, slotY, slotW, slotH);
        this._spellBar.fill({ color: schoolColor, alpha: 0.1 });
      } else {
        // Normal border
        this._spellBar.rect(sx, slotY, slotW, slotH);
        this._spellBar.stroke({
          color: isEmpty ? 0x222233 : schoolColor,
          width: 1,
          alpha: isEmpty ? 0.5 : 0.6,
        });
      }

      // Key number
      const keyText = new Text({
        text: `${i + 1}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: isSelected ? 0xffffff : 0x666688,
          fontWeight: "bold",
        }),
      });
      keyText.x = sx + 5;
      keyText.y = slotY + 2;
      this.container.addChild(keyText);
      this._spellTexts.push(keyText);

      // Spell name (abbreviated)
      const nameText = new Text({
        text: def.name.substring(0, 7),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: isEmpty ? 0x444455 : isSelected ? 0xffffff : 0xbbbbcc,
        }),
      });
      nameText.x = sx + 16;
      nameText.y = slotY + 2;
      this.container.addChild(nameText);
      this._spellTexts.push(nameText);

      // Charges display
      const chargeColor = isEmpty ? 0x663333 : spell.charges <= 3 ? 0xcccc44 : 0x88cc88;
      const chargeText = new Text({
        text: `${spell.charges}/${spell.maxCharges}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: chargeColor,
        }),
      });
      chargeText.x = sx + 16;
      chargeText.y = slotY + 14;
      this.container.addChild(chargeText);
      this._spellTexts.push(chargeText);

      // Damage/range mini-info
      const miniText = new Text({
        text: `${spell.damage}dmg r${spell.range}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 8,
          fill: 0x666688,
        }),
      });
      miniText.x = sx + 5;
      miniText.y = slotY + 26;
      this.container.addChild(miniText);
      this._spellTexts.push(miniText);
    }

    // Selected spell detail row below spell bar
    if (state.selectedSpellIndex >= 0 && state.selectedSpellIndex < state.spells.length) {
      const spell = state.spells[state.selectedSpellIndex];
      const def = SPELL_DEFS[spell.defId];
      if (def) {
        const schoolColor = SCHOOL_COLORS[spell.school] ?? 0xffffff;
        const detailText = new Text({
          text: `${def.name} | Dmg: ${spell.damage} | Range: ${spell.range} | AoE: ${spell.aoeRadius} | Charges: ${spell.charges}/${spell.maxCharges}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 11,
            fill: schoolColor,
          }),
        });
        detailText.x = spellBarX;
        detailText.y = slotY + slotH + 6;
        this.container.addChild(detailText);
        this._spellTexts.push(detailText);

        // Description
        const descText = new Text({
          text: def.description,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 9,
            fill: 0x888899,
          }),
        });
        descText.x = spellBarX;
        descText.y = slotY + slotH + 20;
        this.container.addChild(descText);
        this._spellTexts.push(descText);
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
    this._tooltipText.destroy();
    this._bg.destroy();
    this._hpBar.destroy();
    this._spellBar.destroy();
    this.container.removeChildren();
  }
}
