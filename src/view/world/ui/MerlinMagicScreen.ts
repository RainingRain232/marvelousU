// Merlin's Magic screen — overland spell casting UI.
//
// Full-screen overlay showing all available overland spells organized by category.
// Players can cast spells, see cooldowns, active effects, and mana costs.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import {
  type OverlandSpellId,
  type OverlandSpellDef,
  type OverlandSpellCategory,
  OVERLAND_SPELLS,
  CATEGORY_INFO,
  getSpellsByCategory,
} from "@world/config/OverlandSpellDefs";
import {
  canCastSpell,
  getEffectiveCost,
} from "@world/systems/OverlandSpellSystem";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fontWeight: "bold",
  fill: 0xcc88ff,
});

const SPELL_DESC_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xaaaaaa,
  wordWrap: true,
  wordWrapWidth: 360,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fontWeight: "bold",
  fill: 0xffffff,
});

const MANA_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fontWeight: "bold",
  fill: 0x8888ff,
});

// ---------------------------------------------------------------------------
// Category order
// ---------------------------------------------------------------------------

const CATEGORY_ORDER: OverlandSpellCategory[] = [
  "recon",
  "economy",
  "military",
  "offensive",
  "defensive",
  "strategic",
  "ultimate",
];

// ---------------------------------------------------------------------------
// MerlinMagicScreen
// ---------------------------------------------------------------------------

export class MerlinMagicScreen {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();
  private _scrollY = 0;
  private _maxScroll = 0;

  /** Called when a spell is cast. */
  onCastSpell: ((spellId: OverlandSpellId, targetCityId?: string) => void) | null = null;
  /** Called to select a target for targeted spells. */
  onSelectTarget: ((spellId: OverlandSpellId, targetType: string) => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;

    // Scroll support
    this.container.eventMode = "static";
    this.container.on("wheel", (e: any) => {
      this._scrollY = Math.max(
        -this._maxScroll,
        Math.min(0, this._scrollY - (e.deltaY ?? 0) * 0.5),
      );
      this._content.y = this._scrollY + 0; // offset from top
    });
  }

  show(state: WorldState, playerId = "p1"): void {
    this.container.visible = true;
    this._scrollY = 0;
    this._rebuild(state, playerId);
  }

  hide(): void {
    this.container.visible = false;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(state: WorldState, playerId: string): void {
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    const player = state.players.get(playerId);
    if (!player) return;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x050510, alpha: 0.92 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Title
    const title = new Text({ text: "MERLIN'S MAGIC", style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 16;
    this._content.addChild(title);

    // Mana display
    const manaText = new Text({
      text: `Mana: ${player.mana}`,
      style: MANA_STYLE,
    });
    manaText.x = sw - 160;
    manaText.y = 20;
    this._content.addChild(manaText);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Active spells summary
    let y = 50;
    y = this._buildActiveSpells(state, player, y);

    // Spell list by category
    const spellsByCategory = getSpellsByCategory();
    const colW = Math.min(500, sw - 60);
    const startX = (sw - colW) / 2;

    for (const cat of CATEGORY_ORDER) {
      const spells = spellsByCategory.get(cat);
      if (!spells || spells.length === 0) continue;

      const info = CATEGORY_INFO[cat];

      // Category header
      const catLabel = new Text({
        text: info.label,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 14,
          fontWeight: "bold",
          fill: info.color,
        }),
      });
      catLabel.x = startX;
      catLabel.y = y;
      this._content.addChild(catLabel);

      // Category divider
      const div = new Graphics();
      div.rect(startX, y + 20, colW, 1);
      div.fill({ color: info.color, alpha: 0.3 });
      this._content.addChild(div);
      y += 26;

      // Spells in category
      for (const spell of spells) {
        y = this._buildSpellRow(spell, player, state, startX, y, colW);
      }

      y += 10;
    }

    this._maxScroll = Math.max(0, y - sh + 40);
    this.container.addChild(this._content);
  }

  private _buildActiveSpells(
    state: WorldState,
    player: WorldPlayer,
    y: number,
  ): number {
    const active = Array.from(player.activeSpells.entries());
    if (active.length === 0) return y;

    const label = new Text({
      text: "Active Enchantments:",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: 0x88ff88,
      }),
    });
    label.x = 30;
    label.y = y;
    this._content.addChild(label);
    y += 18;

    for (const [spellId, turnsLeft] of active) {
      const def = OVERLAND_SPELLS[spellId];
      const duration = turnsLeft > 0 ? `(${turnsLeft}t remaining)` : "(permanent)";
      const text = new Text({
        text: `  ${def.name} ${duration}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x66cc66 }),
      });
      text.x = 30;
      text.y = y;
      this._content.addChild(text);
      y += 16;
    }

    // Show alchemy toggle if active
    if (player.alchemyMode) {
      const modeStr = player.alchemyMode === "gold_to_mana"
        ? "Gold → Mana (10g → 5m/turn)"
        : "Mana → Gold (5m → 10g/turn)";
      const alchText = new Text({
        text: `  Alchemy: ${modeStr}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xffcc44 }),
      });
      alchText.x = 30;
      alchText.y = y;
      this._content.addChild(alchText);
      y += 16;

      // Toggle direction button
      const toggleBtn = this._makeBtn(
        "SWITCH DIRECTION",
        200, y - 4, 140, 20,
        () => {
          player.alchemyMode = player.alchemyMode === "gold_to_mana"
            ? "mana_to_gold"
            : "gold_to_mana";
          this._rebuild(state, player.id);
        },
        0x333322,
        0x998844,
      );
      this._content.addChild(toggleBtn);
      y += 24;
    }

    // Spell of Mastery progress
    if (player.masteryProgress > 0) {
      const pct = Math.floor((player.masteryProgress / 20) * 100);
      const masteryText = new Text({
        text: `  Spell of Mastery: ${player.masteryProgress}/20 turns (${pct}%)`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xff44ff }),
      });
      masteryText.x = 30;
      masteryText.y = y;
      this._content.addChild(masteryText);

      // Progress bar
      const barBg = new Graphics();
      barBg.rect(200, y + 2, 200, 8);
      barBg.fill({ color: 0x333333 });
      this._content.addChild(barBg);
      const barFill = new Graphics();
      barFill.rect(200, y + 2, 200 * (player.masteryProgress / 20), 8);
      barFill.fill({ color: 0xff44ff });
      this._content.addChild(barFill);

      y += 20;
    }

    y += 8;
    return y;
  }

  private _buildSpellRow(
    spell: OverlandSpellDef,
    player: WorldPlayer,
    state: WorldState,
    x: number,
    y: number,
    w: number,
  ): number {
    const canCast = canCastSpell(player, spell.id, state);
    const isActive = player.activeSpells.has(spell.id);
    const cooldown = player.spellCooldowns.get(spell.id) ?? 0;
    const cost = getEffectiveCost(player, spell.id, state);

    // Row background
    const rowBg = new Graphics();
    rowBg.roundRect(x, y, w, 52, 4);
    rowBg.fill({ color: isActive ? 0x112211 : 0x111122, alpha: 0.6 });
    rowBg.stroke({ color: isActive ? 0x338833 : 0x333355, width: 1 });
    this._content.addChild(rowBg);

    // Spell name
    const nameText = new Text({
      text: spell.name,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: isActive ? 0x88ff88 : canCast === null ? 0xffffff : 0x888888,
      }),
    });
    nameText.x = x + 8;
    nameText.y = y + 4;
    this._content.addChild(nameText);

    // Cost
    const costText = new Text({
      text: `${cost} mana`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 11,
        fontWeight: "bold",
        fill: player.mana >= cost ? 0x8888ff : 0xff4444,
      }),
    });
    costText.x = x + 140;
    costText.y = y + 4;
    this._content.addChild(costText);

    // Duration / cooldown info
    let statusStr = "";
    if (isActive) {
      const turnsLeft = player.activeSpells.get(spell.id)!;
      statusStr = turnsLeft > 0 ? `Active (${turnsLeft}t)` : "Active";
    } else if (cooldown > 0) {
      statusStr = `Cooldown: ${cooldown}t`;
    }
    if (spell.duration > 0 && !isActive) {
      statusStr += statusStr ? ` | ${spell.duration}t duration` : `${spell.duration}t duration`;
    }

    if (statusStr) {
      const statusText = new Text({
        text: statusStr,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 10,
          fill: isActive ? 0x88ff88 : cooldown > 0 ? 0xff8844 : 0x888888,
        }),
      });
      statusText.x = x + 220;
      statusText.y = y + 4;
      this._content.addChild(statusText);
    }

    // Description
    const descText = new Text({ text: spell.description, style: SPELL_DESC_STYLE });
    descText.x = x + 8;
    descText.y = y + 20;
    this._content.addChild(descText);

    // Cast button
    const btnW = 60;
    const btnLabel = isActive && spell.isToggle ? "STOP" : "CAST";
    const castBtn = this._makeBtn(
      btnLabel,
      x + w - btnW - 8,
      y + 6,
      btnW,
      22,
      () => {
        if (spell.target === "enemy_city") {
          this.onSelectTarget?.(spell.id, "enemy_city");
        } else if (spell.target === "army") {
          this.onSelectTarget?.(spell.id, "army");
        } else {
          this.onCastSpell?.(spell.id);
        }
      },
      canCast === null || (isActive && spell.isToggle) ? 0x223366 : 0x222222,
      canCast === null || (isActive && spell.isToggle) ? 0x4488cc : 0x444444,
    );
    if (canCast !== null && !(isActive && spell.isToggle)) {
      castBtn.alpha = 0.5;
    }
    this._content.addChild(castBtn);

    return y + 56;
  }

  // -----------------------------------------------------------------------
  // UI helpers
  // -----------------------------------------------------------------------

  private _makeClose(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 14,
        fontWeight: "bold",
        fill: 0xff6666,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(12, 12);
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.hide());
    return btn;
  }

  private _makeBtn(
    label: string,
    x: number,
    y: number,
    w: number,
    h: number,
    onClick: () => void,
    fillColor = 0x222244,
    strokeColor = 0x555577,
  ): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: fillColor });
    bg.stroke({ color: strokeColor, width: 1 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: BTN_STYLE });
    txt.x = (w - txt.width) / 2;
    txt.y = (h - txt.height) / 2;
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", onClick);

    btn.on("pointerover", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: 0x334466 });
      bg.stroke({ color: 0x6688aa, width: 1 });
    });
    btn.on("pointerout", () => {
      bg.clear();
      bg.roundRect(0, 0, w, h, 4);
      bg.fill({ color: fillColor });
      bg.stroke({ color: strokeColor, width: 1 });
    });

    return btn;
  }
}

/** Singleton instance. */
export const merlinMagicScreen = new MerlinMagicScreen();
