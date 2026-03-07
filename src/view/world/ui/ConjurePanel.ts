// Conjure panel for world mode — overland spellcasting from army mages.
//
// Shows a list of available conjuration spells filtered by:
//   1. Player's completed magic research (school tier + conjuration tier)
//   2. Highest national mage tier in the army
//   3. Player's mana reserves

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { UPGRADE_DEFINITIONS, type UpgradeDef } from "@sim/config/UpgradeDefs";
import { isSpellMagicUnlocked } from "@world/config/MagicResearchDefs";
import { getArmyMageTier } from "@view/world/ui/ArmyPanel";
import { UnitType } from "@/types";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 15, fontWeight: "bold", fill: 0xcc88ff,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0xffffff,
});

const DISABLED_STYLE = new TextStyle({
  fontFamily: "monospace", fontSize: 11, fill: 0x666666,
});

const BORDER = 0x555577;
const PANEL_W = 280;

// ---------------------------------------------------------------------------
// ConjurePanel
// ---------------------------------------------------------------------------

export class ConjurePanel {
  readonly container = new Container();

  private _contentContainer = new Container();
  private _army: WorldArmy | null = null;
  private _state: WorldState | null = null;

  /** Called when a spell is successfully cast. Passes the upgrade def. */
  onCast: ((spell: UpgradeDef, army: WorldArmy) => void) | null = null;
  /** Called to close the panel. */
  onClose: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(army: WorldArmy, state: WorldState): void {
    this._army = army;
    this._state = state;
    this.container.visible = true;
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._army = null;
    this._state = null;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(): void {
    this._contentContainer.removeFromParent();
    this._contentContainer.destroy({ children: true });
    this._contentContainer = new Container();

    const army = this._army!;
    const state = this._state!;
    const player = state.players.get(army.owner);
    if (!player) return;

    const mageTier = getArmyMageTier(army);
    const spells = _getConjurationSpells();

    // Determine panel height
    let contentH = 56;
    for (let i = 0; i < spells.length; i++) {
      contentH += 42;
    }
    if (spells.length === 0) contentH += 30;
    contentH = Math.max(contentH, 100);

    // Background
    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, contentH, 8);
    bg.fill({ color: 0x0a0a20, alpha: 0.94 });
    bg.stroke({ color: 0x7744aa, width: 1.5 });
    this._contentContainer.addChild(bg);

    let y = 10;

    // Close button
    const closeBtn = _makePanelButton("X", PANEL_W - 30, 8, 20, 20, () => {
      this.onClose?.();
    });
    this._contentContainer.addChild(closeBtn);

    // Title
    const title = new Text({ text: `Conjure (Mage Tier ${mageTier})`, style: TITLE_STYLE });
    title.x = 12;
    title.y = y;
    this._contentContainer.addChild(title);
    y += 20;

    // Mana
    const manaLabel = new Text({
      text: `Mana: ${player.mana}`,
      style: new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0x8888ff }),
    });
    manaLabel.x = 12;
    manaLabel.y = y;
    this._contentContainer.addChild(manaLabel);
    y += 18;

    if (spells.length === 0) {
      const noSpells = new Text({ text: "No spells available", style: DISABLED_STYLE });
      noSpells.x = 12;
      noSpells.y = y;
      this._contentContainer.addChild(noSpells);
    } else {
      for (const spell of spells) {
        const unlocked = _isUnlocked(spell, player, mageTier);
        const canAfford = player.mana >= (spell.manaCost ?? 0);
        const canCast = unlocked && canAfford;

        // Spell row
        const row = new Container();
        row.position.set(12, y);

        const label = spell.summonUnit
          ? _unitLabel(spell.summonUnit)
          : spell.type;
        const tierReq = `T${spell.spellTier} ${spell.spellMagicType}`;
        const costStr = `${spell.manaCost ?? 0} mana`;

        if (canCast) {
          const btn = _makePanelButton(
            `${label} (${tierReq}) - ${costStr}`,
            0, 0, PANEL_W - 24, 36, () => {
              this.onCast?.(spell, army);
            }, 0x222244, 0x7744aa,
          );
          row.addChild(btn);
        } else {
          // Disabled row
          const rowBg = new Graphics();
          rowBg.roundRect(0, 0, PANEL_W - 24, 36, 4);
          rowBg.fill({ color: 0x111122 });
          rowBg.stroke({ color: 0x333344, width: 1 });
          row.addChild(rowBg);

          const txt = new Text({
            text: `${label} (${tierReq}) - ${costStr}`,
            style: DISABLED_STYLE,
          });
          txt.x = 6;
          txt.y = 4;
          row.addChild(txt);

          // Reason
          let reason = "";
          if (!unlocked) reason = "Not researched";
          else if (!canAfford) reason = "Not enough mana";
          const reasonTxt = new Text({
            text: reason,
            style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x884444 }),
          });
          reasonTxt.x = 6;
          reasonTxt.y = 20;
          row.addChild(reasonTxt);
        }

        this._contentContainer.addChild(row);
        y += 42;
      }
    }

    // Center panel on screen
    this._contentContainer.x = 300;
    this._contentContainer.y = 80;

    this.container.addChild(this._contentContainer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all conjuration spells from upgrade defs. */
function _getConjurationSpells(): UpgradeDef[] {
  return Object.values(UPGRADE_DEFINITIONS).filter(
    (d) => d.spellSchool === "conjuration" && d.isSpell,
  );
}

/** Check if a spell is unlocked for the player and within mage tier. */
function _isUnlocked(spell: UpgradeDef, player: WorldPlayer, mageTier: number): boolean {
  if (!spell.spellTier || !spell.spellMagicType) return false;
  if (spell.spellTier > mageTier) return false;
  return isSpellMagicUnlocked(
    player.completedMagicResearch,
    spell.spellMagicType,
    spell.spellTier,
    true,
  );
}

const UNIT_LABELS: Record<string, string> = {
  [UnitType.BAT]: "Bat Swarm",
  [UnitType.SPIDER]: "Spider Brood",
  [UnitType.PIXIE]: "Pixie",
  [UnitType.UNICORN]: "Unicorn",
  [UnitType.TROLL]: "Troll",
  [UnitType.FIRE_ELEMENTAL]: "Fire Elemental",
  [UnitType.ICE_ELEMENTAL]: "Ice Elemental",
  [UnitType.DARK_SAVANT]: "Dark Savant",
  [UnitType.ANGEL]: "Angel",
  [UnitType.CYCLOPS]: "Cyclops",
  [UnitType.RED_DRAGON]: "Fire Drake",
  [UnitType.FROST_DRAGON]: "Ice Drake",
  [UnitType.FIRE_DRAGON]: "Fire Dragon",
  [UnitType.ICE_DRAGON]: "Ice Dragon",
};

function _unitLabel(unitType: string): string {
  return UNIT_LABELS[unitType] ?? unitType;
}

function _makePanelButton(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: () => void,
  fillColor = 0x222244,
  strokeColor = BORDER,
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
  txt.x = 6;
  txt.y = (h - txt.height) / 2;
  btn.addChild(txt);

  btn.position.set(x, y);
  btn.on("pointerdown", onClick);

  return btn;
}

/** Singleton instance. */
export const conjurePanel = new ConjurePanel();
