// ---------------------------------------------------------------------------
// Coven mode — cauldron (brewing) UI
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenState } from "../state/CovenState";
import type { PotionId } from "../state/CovenState";
import { CovenBrewSystem } from "../systems/CovenBrewSystem";
import { POTION_RECIPES, getIngredientDef } from "../config/CovenRecipes";

const FONT = "Georgia, serif";
const COL_PURPLE = 0x8855cc;

export class CovenCauldronScreen {
  readonly container = new Container();
  private _brewCallback: ((potionId: PotionId) => void) | null = null;
  private _closeCallback: (() => void) | null = null;

  setBrewCallback(cb: (potionId: PotionId) => void): void { this._brewCallback = cb; }
  setCloseCallback(cb: () => void): void { this._closeCallback = cb; }

  show(state: CovenState, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 540, ph = Math.min(sh * 0.85, 560), px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x08060a, alpha: 0.97 });
    // Double arcane border
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: COL_PURPLE, width: 2.5, alpha: 0.5 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 8).stroke({ color: COL_PURPLE, width: 1, alpha: 0.12 });
    // Corner rune dots
    for (const [cx, cy] of [[px + 8, py + 8], [px + pw - 8, py + 8], [px + 8, py + ph - 8], [px + pw - 8, py + ph - 8]]) {
      panel.circle(cx, cy, 3).fill({ color: COL_PURPLE, alpha: 0.35 });
      panel.circle(cx, cy, 1.5).fill({ color: 0xccbbff, alpha: 0.2 });
    }
    this.container.addChild(panel);

    let y = py + 15;
    const title = new Text({ text: "\u2726 The Cauldron \u2726", style: new TextStyle({ fontFamily: FONT, fontSize: 20, fill: COL_PURPLE, fontWeight: "bold", letterSpacing: 2 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, y); this.container.addChild(title);
    y += 28;

    // Decorative divider
    const divider = new Graphics();
    divider.moveTo(px + 40, y).lineTo(px + pw - 40, y).stroke({ color: COL_PURPLE, width: 1, alpha: 0.2 });
    divider.circle(sw / 2, y, 2).fill({ color: COL_PURPLE, alpha: 0.3 });
    this.container.addChild(divider);
    y += 10;

    // Mana display with icon
    const mana = new Text({ text: `\u2B24 Mana: ${state.mana}/${state.maxMana}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0x6688ff, fontWeight: "bold" }) });
    mana.anchor.set(0.5, 0); mana.position.set(sw / 2, y); this.container.addChild(mana);
    y += 22;

    // Recipe list
    for (const recipe of POTION_RECIPES) {
      const canBrew = CovenBrewSystem.canBrew(state, recipe.id);
      const ingText = recipe.ingredients.map((i) => {
        const def = getIngredientDef(i.id);
        const have = state.ingredients.get(i.id) ?? 0;
        return `${def?.name ?? i.id} ${have}/${i.count}`;
      }).join(", ");

      const h = 56;
      const bg = new Graphics();
      bg.roundRect(px + 10, y, pw - 20, h, 4).fill({ color: canBrew ? 0x15130e : 0x0c0c0a, alpha: 0.9 });
      bg.roundRect(px + 10, y, pw - 20, h, 4).stroke({ color: canBrew ? COL_PURPLE : 0x333322, width: canBrew ? 1.5 : 1 });
      this.container.addChild(bg);

      const nameText = new Text({ text: `${recipe.name} (${recipe.manaCost} mana)`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: canBrew ? 0xaa88ff : 0x666655, fontWeight: "bold" }) });
      nameText.position.set(px + 20, y + 5); this.container.addChild(nameText);

      const descText = new Text({ text: recipe.description, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888877 }) });
      descText.position.set(px + 20, y + 22); this.container.addChild(descText);

      const ingLabel = new Text({ text: ingText, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: canBrew ? 0x88cc88 : 0x664444 }) });
      ingLabel.position.set(px + 20, y + 36); this.container.addChild(ingLabel);

      if (canBrew) {
        bg.eventMode = "static"; bg.cursor = "pointer";
        bg.on("pointerover", () => { bg.clear(); bg.roundRect(px + 10, y, pw - 20, h, 4).fill({ color: 0x22201a, alpha: 0.9 }); bg.roundRect(px + 10, y, pw - 20, h, 4).stroke({ color: COL_PURPLE, width: 2 }); });
        bg.on("pointerout", () => { bg.clear(); bg.roundRect(px + 10, y, pw - 20, h, 4).fill({ color: 0x15130e, alpha: 0.9 }); bg.roundRect(px + 10, y, pw - 20, h, 4).stroke({ color: COL_PURPLE, width: 1.5 }); });
        bg.on("pointerdown", () => this._brewCallback?.(recipe.id));
      }

      y += h + 6;
    }

    // Close button
    const btnY = py + ph - 45;
    const btn = new Graphics();
    btn.roundRect(sw / 2 - 80, btnY, 160, 32, 4).fill({ color: 0x12100a, alpha: 0.95 });
    btn.roundRect(sw / 2 - 80, btnY, 160, 32, 4).stroke({ color: COL_PURPLE, width: 2 });
    btn.eventMode = "static"; btn.cursor = "pointer";
    btn.on("pointerdown", () => this._closeCallback?.());
    this.container.addChild(btn);
    const btnT = new Text({ text: "Close [Enter]", style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: COL_PURPLE, fontWeight: "bold" }) });
    btnT.anchor.set(0.5); btnT.position.set(sw / 2, btnY + 16); this.container.addChild(btnT);
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._brewCallback = null; this._closeCallback = null; this.container.removeChildren(); }
}
