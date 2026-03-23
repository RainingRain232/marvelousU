// ---------------------------------------------------------------------------
// Coven mode — event choice screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenEvent } from "../config/CovenEvents";

const FONT = "Georgia, serif";
const COL = 0x8855cc;

export class CovenEventScreen {
  readonly container = new Container();
  private _choiceCallback: ((index: number) => void) | null = null;

  setChoiceCallback(cb: (index: number) => void): void { this._choiceCallback = cb; }

  show(event: CovenEvent, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 500, px = (sw - pw) / 2;
    let py = sh * 0.12;
    const panelH = sh * 0.72;

    const panel = new Graphics();
    panel.roundRect(px - 15, py - 15, pw + 30, panelH, 8).fill({ color: 0x08060a, alpha: 0.97 });
    panel.roundRect(px - 15, py - 15, pw + 30, panelH, 8).stroke({ color: COL, width: 2, alpha: 0.5 });
    panel.roundRect(px - 12, py - 12, pw + 24, panelH - 6, 7).stroke({ color: COL, width: 1, alpha: 0.12 });
    for (const [cx, cy] of [[px - 10, py - 10], [px + pw + 10, py - 10], [px - 10, py + panelH - 20], [px + pw + 10, py + panelH - 20]]) {
      panel.circle(cx, cy, 2.5).fill({ color: COL, alpha: 0.4 });
    }
    this.container.addChild(panel);

    // Title
    const title = new Text({ text: event.title, style: new TextStyle({ fontFamily: FONT, fontSize: 18, fill: COL, fontWeight: "bold", letterSpacing: 1 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, py + 5);
    this.container.addChild(title);

    // Divider
    const line = new Graphics();
    line.moveTo(px + 20, py + 32).lineTo(px + pw - 20, py + 32).stroke({ color: COL, width: 1, alpha: 0.25 });
    line.circle(sw / 2, py + 32, 2).fill({ color: COL, alpha: 0.35 });
    this.container.addChild(line);

    // Description
    const desc = new Text({ text: event.description, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xccbbaa, wordWrap: true, wordWrapWidth: pw - 10, lineHeight: 20 }) });
    desc.position.set(px, py + 42);
    this.container.addChild(desc);

    // Choices
    let cy2 = py + 42 + desc.height + 22;
    for (let i = 0; i < event.choices.length; i++) {
      const choice = event.choices[i];
      const h = 44;
      const bg = new Graphics();
      bg.roundRect(px, cy2, pw, h, 5).fill({ color: 0x12100a, alpha: 0.9 });
      bg.roundRect(px, cy2, pw, h, 5).stroke({ color: 0x444433, width: 1 });
      this.container.addChild(bg);

      const label = new Text({ text: `[${i + 1}] ${choice.label}`, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xccaa88, fontWeight: "bold" }) });
      label.position.set(px + 12, cy2 + 6);
      this.container.addChild(label);

      // Preview outcome hints
      const hints: string[] = [];
      const o = choice.outcome;
      if (o.health && o.health > 0) hints.push(`+${o.health} HP`);
      if (o.health && o.health < 0) hints.push(`${o.health} HP`);
      if (o.mana && o.mana > 0) hints.push(`+${o.mana} mana`);
      if (o.ingredients) hints.push(`+ingredients`);
      if (o.ingredientLoss) hints.push(`-1 ingredient`);
      if (o.revealHexes) hints.push(`reveal ${o.revealHexes} hexes`);

      const hintText = hints.length > 0 ? hints.join(" | ") : "";
      const ht = new Text({ text: hintText, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x887766, fontStyle: "italic" }) });
      ht.position.set(px + 12, cy2 + 25);
      this.container.addChild(ht);

      bg.eventMode = "static"; bg.cursor = "pointer";
      bg.on("pointerover", () => { bg.clear(); bg.roundRect(px, cy2, pw, h, 5).fill({ color: 0x1a180e, alpha: 0.95 }); bg.roundRect(px, cy2, pw, h, 5).stroke({ color: COL, width: 2 }); });
      bg.on("pointerout", () => { bg.clear(); bg.roundRect(px, cy2, pw, h, 5).fill({ color: 0x12100a, alpha: 0.9 }); bg.roundRect(px, cy2, pw, h, 5).stroke({ color: 0x444433, width: 1 }); });
      bg.on("pointerdown", () => this._choiceCallback?.(i));

      cy2 += h + 8;
    }

    // Keyboard hint
    const hint = new Text({ text: `Press 1-${event.choices.length} to choose`, style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x555544, fontStyle: "italic" }) });
    hint.anchor.set(0.5, 0); hint.position.set(sw / 2, cy2 + 5);
    this.container.addChild(hint);
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._choiceCallback = null; this.container.removeChildren(); }
}
