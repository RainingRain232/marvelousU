// ---------------------------------------------------------------------------
// Coven mode — start screen with story intro, difficulty, and controls
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenDifficulty } from "../config/CovenConfig";

const FONT = "Georgia, serif";
const COL = 0x8855cc;
const COL_LT = 0xaa88ee;

export class CovenStartScreen {
  readonly container = new Container();
  private _startCallback: ((difficulty: CovenDifficulty) => void) | null = null;
  private _backCallback: (() => void) | null = null;
  private _selectedDifficulty: CovenDifficulty = "normal";

  setStartCallback(cb: (d: CovenDifficulty) => void): void { this._startCallback = cb; }
  setBackCallback(cb: () => void): void { this._backCallback = cb; }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Dark background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x050308 });
    this.container.addChild(bg);

    // Arcane double border
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
    this._text("\u2726 COVEN \u2726", sw / 2, y, { fontSize: 34, fill: COL, fontWeight: "bold", letterSpacing: 6 }, true);
    y += 45;

    // Subtitle
    this._text("A Witch's Survival Horror Roguelike", sw / 2, y, { fontSize: 13, fill: 0x887799, fontStyle: "italic" }, true);
    y += 30;

    // Story
    const storyLines = [
      "You are Morgan le Fay. Exiled from Camelot.",
      "The inquisitors hunt anyone who wields magic.",
      "Survive in the dark forest. Brew potions. Cast spells.",
      "Gather the five ritual components before the Wild Hunt rides.",
      "Escape to the Otherworld... or perish in darkness.",
    ];
    for (const line of storyLines) {
      this._text(line, sw / 2, y, { fontSize: 11, fill: 0x998888, fontStyle: "italic" }, true);
      y += 16;
    }
    y += 15;

    // Divider
    this._divider(sw, y); y += 15;

    // Difficulty
    this._text("Difficulty", sw / 2, y, { fontSize: 14, fill: 0xccaa88, fontWeight: "bold", letterSpacing: 2 }, true);
    y += 25;

    const diffs: { id: CovenDifficulty; name: string; desc: string; color: number }[] = [
      { id: "easy", name: "Apprentice", desc: "More health, more mana, slower inquisitors.", color: 0x55aa55 },
      { id: "normal", name: "Witch", desc: "The intended experience.", color: 0xaa88cc },
      { id: "hard", name: "Archwitch", desc: "Less health, less mana, relentless pursuit.", color: 0xff5544 },
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
      ["Click hex", "Move & forage for ingredients"],
      ["B", "Open cauldron to brew potions"],
      ["W", "Place a ward during dusk"],
      ["A / Space", "Attack in combat"],
      ["F", "Flee from combat"],
      ["H", "Use healing/mana potion"],
      ["1-7", "Switch active spell"],
      ["R", "Perform Grand Ritual (on ley line)"],
      ["Esc", "Pause / Resume"],
    ];

    const ctrlX1 = sw / 2 - 180, ctrlX2 = sw / 2 + 10;
    const half = Math.ceil(controls.length / 2);
    for (let i = 0; i < controls.length; i++) {
      const [key, desc] = controls[i];
      const col = i < half ? ctrlX1 : ctrlX2;
      const row = i < half ? i : i - half;
      const ky = y + row * 20;

      // Key badge
      const kw = Math.max(50, key.length * 7 + 12);
      const badge = new Graphics();
      badge.roundRect(col, ky - 1, kw, 16, 3).fill({ color: 0x0a080e, alpha: 0.9 });
      badge.roundRect(col, ky - 1, kw, 16, 3).stroke({ color: 0x444433, width: 1 });
      this.container.addChild(badge);
      this._text(key, col + kw / 2, ky + 1, { fontSize: 9, fill: 0xccbb88, fontWeight: "bold" }, true);
      this._text(desc, col + kw + 8, ky + 1, { fontSize: 9, fill: 0x888877 });
    }
    y += half * 20 + 15;

    // Game loop explanation
    this._text("Day cycle: Forage \u2192 Brew \u2192 Dusk (wards) \u2192 Night (survive) \u2192 Dawn", sw / 2, y, { fontSize: 9, fill: 0x666655, fontStyle: "italic" }, true);
    y += 22;

    // Begin button
    const bw = 220, bh = 44, bx = sw / 2 - bw / 2;
    this._card(bx, y, bw, bh, true, 0x44aa44, () => this._startCallback?.(this._selectedDifficulty));
    this._text("Enter the Forest", sw / 2, y + bh / 2, { fontSize: 16, fill: COL_LT, fontWeight: "bold" }, true);
    y += bh + 14;

    // Back
    const back = this._text("\u2190 Back to Camelot", sw / 2, y, { fontSize: 11, fill: 0x776677 }, true);
    back.eventMode = "static"; back.cursor = "pointer";
    back.on("pointerdown", () => this._backCallback?.());
  }

  private _text(str: string, x: number, y: number, style: Record<string, unknown>, centered = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...style } as TextStyle) });
    if (centered) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(sw: number, y: number): void {
    const g = new Graphics();
    g.moveTo(sw / 2 - 200, y).lineTo(sw / 2 + 200, y).stroke({ color: COL, width: 1, alpha: 0.2 });
    g.circle(sw / 2, y, 2.5).fill({ color: COL, alpha: 0.35 });
    g.circle(sw / 2 - 40, y, 1.5).fill({ color: COL, alpha: 0.15 });
    g.circle(sw / 2 + 40, y, 1.5).fill({ color: COL, alpha: 0.15 });
    this.container.addChild(g);
  }

  private _card(x: number, y: number, w: number, h: number, sel: boolean, accent: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 5).fill({ color: sel ? 0x0e0a14 : 0x080608, alpha: 0.95 });
    if (sel) bg.roundRect(x + 2, y + 2, w - 4, h - 4, 4).stroke({ color: accent, width: 1, alpha: 0.15 });
    bg.roundRect(x, y, w, h, 5).stroke({ color: sel ? accent : 0x333322, width: sel ? 2 : 1 });
    if (sel) for (const [cx, cy] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) bg.circle(cx, cy, 2).fill({ color: accent, alpha: 0.4 });
    bg.eventMode = "static"; bg.cursor = "pointer";
    bg.on("pointerover", () => { bg.clear(); bg.roundRect(x, y, w, h, 5).fill({ color: 0x151018, alpha: 0.95 }); bg.roundRect(x, y, w, h, 5).stroke({ color: accent, width: 2 }); });
    bg.on("pointerout", () => { bg.clear(); bg.roundRect(x, y, w, h, 5).fill({ color: sel ? 0x0e0a14 : 0x080608, alpha: 0.95 }); bg.roundRect(x, y, w, h, 5).stroke({ color: sel ? accent : 0x333322, width: sel ? 2 : 1 }); });
    bg.on("pointerdown", () => onClick());
    this.container.addChild(bg);
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._startCallback = null; this._backCallback = null; this.container.removeChildren(); }
}
