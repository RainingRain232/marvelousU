// ---------------------------------------------------------------------------
// Shadowhand mode — start screen with story, difficulty, and controls
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandDifficulty } from "../config/ShadowhandConfig";

const FONT = "Georgia, serif";
const COL = 0x44aa88;
const COL_LT = 0x66ccaa;

export class ShadowhandStartScreen {
  readonly container = new Container();
  private _startCallback: ((difficulty: ShadowhandDifficulty) => void) | null = null;
  private _backCallback: (() => void) | null = null;
  private _selectedDifficulty: ShadowhandDifficulty = "journeyman";

  setStartCallback(cb: (d: ShadowhandDifficulty) => void): void { this._startCallback = cb; }
  setBackCallback(cb: () => void): void { this._backCallback = cb; }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x030505 });
    this.container.addChild(bg);

    // Border
    const border = new Graphics();
    border.rect(16, 16, sw - 32, sh - 32).stroke({ color: COL, width: 2, alpha: 0.3 });
    border.rect(22, 22, sw - 44, sh - 44).stroke({ color: COL, width: 1, alpha: 0.12 });
    for (const [cx, cy] of [[24, 24], [sw - 24, 24], [24, sh - 24], [sw - 24, sh - 24]]) {
      border.circle(cx, cy, 4).fill({ color: COL, alpha: 0.35 });
      border.circle(cx, cy, 2).fill({ color: COL_LT, alpha: 0.5 });
    }
    this.container.addChild(border);

    let y = 35;

    // Title
    this._text("\u2620 SHADOWHAND \u2620", sw / 2, y, { fontSize: 34, fill: COL, fontWeight: "bold", letterSpacing: 6 }, true);
    y += 45;

    // Subtitle
    this._text("A Medieval Stealth Heist Game", sw / 2, y, { fontSize: 13, fill: 0x667766, fontStyle: "italic" }, true);
    y += 30;

    // Story
    const storyLines = [
      "You lead the Shadowhand — a guild of thieves in the heart of Camelot.",
      "Plan your heists. Pick your crew. Stick to the shadows.",
      "From merchant houses to the royal palace, every target has its secrets.",
      "Steal enough to fund your ultimate heist: the Grail Vault itself.",
      "But beware — the Inquisition watches. Too much heat and they come for you.",
    ];
    for (const line of storyLines) {
      this._text(line, sw / 2, y, { fontSize: 11, fill: 0x889988, fontStyle: "italic" }, true);
      y += 16;
    }
    y += 15;

    // Divider
    this._divider(sw, y); y += 15;

    // Difficulty
    this._text("Difficulty", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold", letterSpacing: 2 }, true);
    y += 25;

    const diffs: { id: ShadowhandDifficulty; name: string; desc: string; color: number }[] = [
      { id: "apprentice", name: "Apprentice", desc: "Fewer guards, wider shadows, more loot.", color: 0x55aa55 },
      { id: "journeyman", name: "Journeyman", desc: "The intended experience.", color: 0x44aa88 },
      { id: "master", name: "Master", desc: "Elite guards, quick alerts, less gold.", color: 0xff5544 },
    ];

    const dw = 175, dgap = 12;
    const dsx = (sw - (dw * 3 + dgap * 2)) / 2;
    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const x = dsx + i * (dw + dgap);
      const sel = d.id === this._selectedDifficulty;
      this._card(x, y, dw, 68, sel, d.color, () => { this._selectedDifficulty = d.id; this.show(sw, sh); });
      this._text(d.name, x + dw / 2, y + 10, { fontSize: 13, fill: sel ? d.color : 0x666655, fontWeight: "bold" }, true);
      this._text(d.desc, x + 8, y + 30, { fontSize: 9, fill: 0x888877, wordWrap: true, wordWrapWidth: dw - 16 });
    }
    y += 86;

    // Divider
    this._divider(sw, y); y += 15;

    // Controls
    this._text("Controls", sw / 2, y, { fontSize: 13, fill: 0xccaa88, fontWeight: "bold", letterSpacing: 1 }, true);
    y += 22;

    const controls = [
      ["Click", "Move selected thief / interact"],
      ["Tab", "Switch between crew members"],
      ["C", "Toggle crouch (slower but quieter)"],
      ["Space", "Pick lock / interact with door"],
      ["1-5", "Use equipment / ability"],
      ["+ / -", "Speed up / slow down time"],
      ["Esc", "Pause"],
    ];
    for (const [key, desc] of controls) {
      this._text(key, sw / 2 - 60, y, { fontSize: 10, fill: COL_LT, fontWeight: "bold" });
      this._text(desc, sw / 2 + 5, y, { fontSize: 10, fill: 0x888877 });
      y += 15;
    }
    y += 15;

    // Buttons
    this._button("BEGIN HEIST", sw / 2 - 90, y, 180, 38, COL, () => {
      this._startCallback?.(this._selectedDifficulty);
    });
    y += 50;
    this._button("BACK", sw / 2 - 60, y, 120, 30, 0x666655, () => {
      this._backCallback?.();
    });
  }

  hide(): void {
    this.container.removeChildren();
  }

  // -- helpers --

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(sw: number, y: number): void {
    const g = new Graphics();
    g.moveTo(40, y).lineTo(sw - 40, y).stroke({ color: COL, width: 0.5, alpha: 0.2 });
    this.container.addChild(g);
  }

  private _card(x: number, y: number, w: number, h: number, sel: boolean, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: sel ? 0x0a1a0a : 0x080808, alpha: 0.8 });
    g.roundRect(x, y, w, h, 5).stroke({ color: sel ? color : 0x333333, width: sel ? 2 : 1, alpha: sel ? 0.6 : 0.3 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
  }

  private _button(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: 0x0a0a0a, alpha: 0.8 });
    g.roundRect(x, y, w, h, 5).stroke({ color, width: 2, alpha: 0.6 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 7, { fontSize: 13, fill: color, fontWeight: "bold", letterSpacing: 2 }, true);
  }
}
