// ---------------------------------------------------------------------------
// Exodus mode — polished event screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusEvent, ExodusChoice, ExodusOutcome } from "../state/ExodusState";

const FONT = "Georgia, serif";
const COL_GOLD = 0xdaa520;
const COL_BG = 0x100e0a;

const STYLE_TITLE = new TextStyle({ fontFamily: FONT, fontSize: 20, fill: 0xffd700, fontWeight: "bold", letterSpacing: 1 });
const STYLE_DESC = new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xccbbaa, wordWrap: true, wordWrapWidth: 470, lineHeight: 21 });
const STYLE_OUTCOME = new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xbbccbb, wordWrap: true, wordWrapWidth: 470, lineHeight: 20, fontStyle: "italic" });

export class ExodusEventScreen {
  readonly container = new Container();
  private _choiceCallback: ((index: number) => void) | null = null;
  private _continueCallback: (() => void) | null = null;

  setChoiceCallback(cb: (index: number) => void): void { this._choiceCallback = cb; }
  setContinueCallback(cb: () => void): void { this._continueCallback = cb; }

  showEvent(event: ExodusEvent, sw: number, sh: number): void {
    this.container.removeChildren();

    // Overlay
    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    // Panel
    const pw = 530, px = (sw - pw) / 2;
    let py = sh * 0.08;
    const panelH = sh * 0.8;

    const panel = new Graphics();
    panel.roundRect(px - 15, py - 15, pw + 30, panelH + 10, 8).fill({ color: COL_BG, alpha: 0.97 });
    // Double border
    panel.roundRect(px - 15, py - 15, pw + 30, panelH + 10, 8).stroke({ color: COL_GOLD, width: 2, alpha: 0.6 });
    panel.roundRect(px - 12, py - 12, pw + 24, panelH + 4, 7).stroke({ color: COL_GOLD, width: 1, alpha: 0.15 });
    // Corner dots
    for (const [cx, cy] of [[px - 10, py - 10], [px + pw + 10, py - 10], [px - 10, py + panelH - 5], [px + pw + 10, py + panelH - 5]]) {
      panel.circle(cx, cy, 3).fill({ color: COL_GOLD, alpha: 0.5 });
    }
    this.container.addChild(panel);

    // Title
    const title = new Text({ text: event.title, style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, py + 5);
    this.container.addChild(title);

    // Decorative line under title
    const line = new Graphics();
    const lx = px + 20;
    line.moveTo(lx, py + 35).lineTo(px + pw - 20, py + 35).stroke({ color: COL_GOLD, width: 1, alpha: 0.3 });
    line.circle(sw / 2, py + 35, 2).fill({ color: COL_GOLD, alpha: 0.4 });
    this.container.addChild(line);

    // Description
    const desc = new Text({ text: event.description, style: STYLE_DESC });
    desc.position.set(px + 5, py + 48);
    this.container.addChild(desc);

    // Choices
    let cy = py + 48 + desc.height + 25;
    for (let i = 0; i < event.choices.length; i++) {
      cy = this._drawChoice(event.choices[i], i, px, cy, pw, sw);
    }

    // Keyboard hint
    const hint = new Text({
      text: "Press 1-" + event.choices.length + " to choose",
      style: new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x666655, fontStyle: "italic" }),
    });
    hint.anchor.set(0.5, 0);
    hint.position.set(sw / 2, cy + 5);
    this.container.addChild(hint);
  }

  showOutcome(outcome: ExodusOutcome, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.8 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 520, px = (sw - pw) / 2, py = sh * 0.22;

    const panel = new Graphics();
    panel.roundRect(px - 15, py - 15, pw + 30, 280, 8).fill({ color: COL_BG, alpha: 0.97 });
    panel.roundRect(px - 15, py - 15, pw + 30, 280, 8).stroke({ color: COL_GOLD, width: 2, alpha: 0.5 });
    this.container.addChild(panel);

    // Outcome text
    const text = new Text({ text: outcome.text, style: STYLE_OUTCOME });
    text.position.set(px, py);
    this.container.addChild(text);

    // Changes summary
    const parts: string[] = [];
    if (outcome.food) parts.push(`Food ${outcome.food > 0 ? "+" : ""}${outcome.food}`);
    if (outcome.supplies) parts.push(`Supplies ${outcome.supplies > 0 ? "+" : ""}${outcome.supplies}`);
    if (outcome.morale) parts.push(`Morale ${outcome.morale > 0 ? "+" : ""}${outcome.morale}`);
    if (outcome.hope) parts.push(`Hope ${outcome.hope > 0 ? "+" : ""}${outcome.hope}`);
    if (outcome.memberGain) for (const { role, count } of outcome.memberGain) parts.push(`+${count} ${role}`);
    if (outcome.memberLoss) parts.push(`-${outcome.memberLoss} lost`);
    if (outcome.combat) parts.push("Combat!");
    if (outcome.pursuerDelay) parts.push(`Pursuer delayed ${outcome.pursuerDelay}d`);
    if (outcome.relicId) parts.push("Relic found!");

    if (parts.length > 0) {
      const summary = new Text({
        text: parts.join("  \u2022  "),
        style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0xddaa55 }),
      });
      summary.position.set(px, py + text.height + 18);
      this.container.addChild(summary);
    }

    // Continue button
    const btnY = py + 200;
    this._button("Continue", sw / 2, btnY, 170, 34, () => this._continueCallback?.());
  }

  // -------------------------------------------------------------------------

  private _drawChoice(choice: ExodusChoice, index: number, px: number, y: number, maxW: number, sw: number): number {
    const h = 52;
    const bg = new Graphics();
    bg.roundRect(px, y, maxW, h, 5).fill({ color: 0x15130e, alpha: 0.9 });
    bg.roundRect(px, y, maxW, h, 5).stroke({ color: 0x444433, width: 1 });
    this.container.addChild(bg);

    const label = new Text({
      text: `[${index + 1}] ${choice.label}`,
      style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xddcc88, fontWeight: "bold" }),
    });
    label.position.set(px + 12, y + 6);
    this.container.addChild(label);

    const desc = new Text({
      text: choice.description,
      style: new TextStyle({ fontFamily: FONT, fontSize: 10, fill: 0x998877, wordWrap: true, wordWrapWidth: maxW - 24 }),
    });
    desc.position.set(px + 12, y + 25);
    this.container.addChild(desc);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear();
      bg.roundRect(px, y, maxW, h, 5).fill({ color: 0x22201a, alpha: 0.95 });
      bg.roundRect(px, y, maxW, h, 5).stroke({ color: COL_GOLD, width: 2 });
    });
    bg.on("pointerout", () => {
      bg.clear();
      bg.roundRect(px, y, maxW, h, 5).fill({ color: 0x15130e, alpha: 0.9 });
      bg.roundRect(px, y, maxW, h, 5).stroke({ color: 0x444433, width: 1 });
    });
    bg.on("pointerdown", () => this._choiceCallback?.(index));

    return y + h + 10;
  }

  private _button(label: string, cx: number, y: number, w: number, h: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(cx - w / 2, y, w, h, 4).fill({ color: 0x1a180e, alpha: 0.95 });
    bg.roundRect(cx - w / 2, y, w, h, 4).stroke({ color: COL_GOLD, width: 2 });
    this.container.addChild(bg);

    const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: COL_GOLD, fontWeight: "bold" }) });
    t.anchor.set(0.5);
    t.position.set(cx, y + h / 2);
    this.container.addChild(t);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear();
      bg.roundRect(cx - w / 2, y, w, h, 4).fill({ color: 0x2a2818, alpha: 0.95 });
      bg.roundRect(cx - w / 2, y, w, h, 4).stroke({ color: 0xffd700, width: 2 });
    });
    bg.on("pointerout", () => {
      bg.clear();
      bg.roundRect(cx - w / 2, y, w, h, 4).fill({ color: 0x1a180e, alpha: 0.95 });
      bg.roundRect(cx - w / 2, y, w, h, 4).stroke({ color: COL_GOLD, width: 2 });
    });
    bg.on("pointerdown", () => onClick());
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._choiceCallback = null; this._continueCallback = null; this.container.removeChildren(); }
}
