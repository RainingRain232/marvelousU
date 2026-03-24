// ---------------------------------------------------------------------------
// Exodus mode — polished start screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusDifficulty } from "../config/ExodusConfig";

const FONT = "Georgia, serif";
const COL_GOLD = 0xdaa520;
const COL_BG = 0x08060a;

export interface CaravanPreset {
  id: string; name: string; description: string;
  knights: number; soldiers: number; archers: number; healers: number;
  scouts: number; craftsmen: number; peasants: number; refugees: number;
  bonusFood: number; bonusSupplies: number;
}

export const CARAVAN_PRESETS: CaravanPreset[] = [
  { id: "balanced", name: "The Last March", description: "A balanced exodus. Soldiers, craftsmen, and refugees — a cross-section of Camelot's survivors.",
    knights: 4, soldiers: 8, archers: 4, healers: 2, scouts: 2, craftsmen: 2, peasants: 6, refugees: 4, bonusFood: 0, bonusSupplies: 0 },
  { id: "military", name: "The Broken Vanguard", description: "What remains of Camelot's army. Elite fighters but few civilians. Fast and deadly — but who are you saving?",
    knights: 6, soldiers: 12, archers: 6, healers: 1, scouts: 3, craftsmen: 1, peasants: 2, refugees: 0, bonusFood: -10, bonusSupplies: 10 },
  { id: "civilians", name: "The People's March", description: "Hundreds of civilians with a thin guard. Slow, hungry, vulnerable — but every soul matters.",
    knights: 2, soldiers: 4, archers: 2, healers: 3, scouts: 1, craftsmen: 3, peasants: 10, refugees: 12, bonusFood: 20, bonusSupplies: -10 },
  { id: "mages", name: "The Mage Circle", description: "A small band of Camelot's arcane scholars. Few in number but carrying powerful knowledge.",
    knights: 2, soldiers: 4, archers: 2, healers: 4, scouts: 2, craftsmen: 1, peasants: 2, refugees: 0, bonusFood: -15, bonusSupplies: 5 },
];

export class ExodusStartScreen {
  readonly container = new Container();
  private _startCallback: ((d: ExodusDifficulty, p: CaravanPreset) => void) | null = null;
  private _backCallback: (() => void) | null = null;
  private _selectedDifficulty: ExodusDifficulty = "normal";
  private _selectedPresetIndex = 0;

  setStartCallback(cb: (d: ExodusDifficulty, p: CaravanPreset) => void): void { this._startCallback = cb; }
  setBackCallback(cb: () => void): void { this._backCallback = cb; }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Background with warm tone
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: COL_BG });
    this.container.addChild(bg);

    // Decorative double border
    const border = new Graphics();
    border.rect(16, 16, sw - 32, sh - 32).stroke({ color: COL_GOLD, width: 2, alpha: 0.35 });
    border.rect(22, 22, sw - 44, sh - 44).stroke({ color: COL_GOLD, width: 1, alpha: 0.15 });
    // Corner ornaments
    for (const [cx, cy] of [[24, 24], [sw - 24, 24], [24, sh - 24], [sw - 24, sh - 24]]) {
      border.circle(cx, cy, 4).fill({ color: COL_GOLD, alpha: 0.4 });
      border.circle(cx, cy, 2).fill({ color: COL_GOLD, alpha: 0.7 });
    }
    this.container.addChild(border);

    let y = 36;

    // Title
    this._text("THE EXODUS", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 32, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 4 }), 0.5);
    y += 42;

    // Subtitle
    this._text("Camelot has fallen. Lead the survivors westward to the shores of Avalon.", sw / 2, y,
      new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0x998877, fontStyle: "italic", wordWrap: true, wordWrapWidth: 480, align: "center" }), 0.5);
    y += 40;

    // Decorative divider
    this._divider(sw, y); y += 12;

    // --- Difficulty ---
    this._text("Difficulty", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 15, fill: 0xccaa66, fontWeight: "bold", letterSpacing: 2 }), 0.5);
    y += 26;

    const diffs: { id: ExodusDifficulty; name: string; desc: string; color: number }[] = [
      { id: "easy", name: "Pilgrimage", desc: "More food, slower pursuer. A gentler journey.", color: 0x55aa55 },
      { id: "normal", name: "Exodus", desc: "The intended experience. Every choice matters.", color: 0xddaa44 },
      { id: "hard", name: "Mordred's Wrath", desc: "Scarce food, relentless pursuit. For veterans.", color: 0xff5544 },
    ];

    const dw = 175, dgap = 12;
    const dsx = (sw - (dw * 3 + dgap * 2)) / 2;
    for (let i = 0; i < diffs.length; i++) {
      const d = diffs[i];
      const x = dsx + i * (dw + dgap);
      const sel = d.id === this._selectedDifficulty;
      this._card(x, y, dw, 72, sel, d.color, () => { this._selectedDifficulty = d.id; this.show(sw, sh); });
      this._text(d.name, x + dw / 2, y + 10, new TextStyle({ fontFamily: FONT, fontSize: 13, fill: sel ? d.color : 0x777766, fontWeight: "bold" }), 0.5);
      this._text(d.desc, x + 8, y + 30, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x999888, wordWrap: true, wordWrapWidth: dw - 16 }));
    }
    y += 90;

    // --- Caravan ---
    this._text("Caravan", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 15, fill: 0xccaa66, fontWeight: "bold", letterSpacing: 2 }), 0.5);
    y += 26;

    const pw = 215, ph = 120, pgap = 10;
    const totalPW = CARAVAN_PRESETS.length * pw + (CARAVAN_PRESETS.length - 1) * pgap;
    const psx = (sw - totalPW) / 2;

    for (let i = 0; i < CARAVAN_PRESETS.length; i++) {
      const p = CARAVAN_PRESETS[i];
      const x = psx + i * (pw + pgap);
      const sel = i === this._selectedPresetIndex;
      this._card(x, y, pw, ph, sel, COL_GOLD, () => { this._selectedPresetIndex = i; this.show(sw, sh); });
      this._text(p.name, x + pw / 2, y + 8, new TextStyle({ fontFamily: FONT, fontSize: 12, fill: sel ? 0xffd700 : 0x887766, fontWeight: "bold" }), 0.5);
      this._text(p.description, x + 8, y + 26, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x888877, wordWrap: true, wordWrapWidth: pw - 16 }));

      const total = p.knights + p.soldiers + p.archers + p.healers + p.scouts + p.craftsmen + p.peasants + p.refugees;
      const fighters = p.knights + p.soldiers + p.archers;
      this._text(`${total} souls \u2022 ${fighters} fighters \u2022 ${p.refugees} refugees`, x + 8, y + ph - 16,
        new TextStyle({ fontFamily: FONT, fontSize: 8, fill: sel ? 0xaaaaaa : 0x666655 }));
    }
    y += ph + 28;

    // --- Begin button ---
    // --- How to Play ---
    this._divider(sw, y); y += 12;
    this._text("How to Play", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0xccaa66, fontWeight: "bold", letterSpacing: 1 }), 0.5);
    y += 20;

    const howToPlayLeft = [
      ["\u2022 Click", "highlighted hexes to march your caravan westward"],
      ["\u2022 Manage", "food, supplies, morale and hope to survive"],
      ["\u2022 Choose", "wisely during events — every decision has consequences"],
    ];
    const howToPlayRight = [
      ["\u2022 Rest", "at camp to heal wounded, or forage for food"],
      ["\u2022 Outrun", "Mordred's host — he grows stronger each day"],
      ["\u2022 Reach", "Avalon before hope runs out"],
    ];

    const htpX1 = sw / 2 - 240, htpX2 = sw / 2 + 10;
    for (let i = 0; i < howToPlayLeft.length; i++) {
      const [label, desc] = howToPlayLeft[i];
      this._text(label, htpX1, y + i * 16, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xddcc88, fontWeight: "bold" }));
      this._text(desc, htpX1 + 46, y + i * 16, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x998877 }));
    }
    for (let i = 0; i < howToPlayRight.length; i++) {
      const [label, desc] = howToPlayRight[i];
      this._text(label, htpX2, y + i * 16, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0xddcc88, fontWeight: "bold" }));
      this._text(desc, htpX2 + 52, y + i * 16, new TextStyle({ fontFamily: FONT, fontSize: 9, fill: 0x998877 }));
    }
    y += 52;

    // Controls reference
    const controlsLine = "Controls:  Click = Move  |  1-3 = Event choices  |  Esc = Pause  |  Enter = Break camp";
    this._text(controlsLine, sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 8, fill: 0x666655 }), 0.5);
    y += 20;

    // --- Begin button ---
    const bw = 220, bh = 44, bx = sw / 2 - bw / 2;
    this._card(bx, y, bw, bh, true, 0x44aa44, () => this._startCallback?.(this._selectedDifficulty, CARAVAN_PRESETS[this._selectedPresetIndex]));
    this._text("Begin the Exodus", sw / 2, y + bh / 2, new TextStyle({ fontFamily: FONT, fontSize: 16, fill: 0xffd700, fontWeight: "bold" }), 0.5);
    y += bh + 14;

    // Back
    const back = this._text("\u2190 Back to Camelot", sw / 2, y, new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x887766 }), 0.5);
    back.eventMode = "static";
    back.cursor = "pointer";
    back.on("pointerdown", () => this._backCallback?.());
  }

  // -------------------------------------------------------------------------

  private _text(str: string, x: number, y: number, style: TextStyle, anchorX = 0): Text {
    const t = new Text({ text: str, style });
    t.anchor.set(anchorX, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(sw: number, y: number): void {
    const g = new Graphics();
    const cx = sw / 2;
    g.moveTo(cx - 200, y).lineTo(cx + 200, y).stroke({ color: COL_GOLD, width: 1, alpha: 0.25 });
    g.circle(cx, y, 2.5).fill({ color: COL_GOLD, alpha: 0.4 });
    g.circle(cx - 40, y, 1.5).fill({ color: COL_GOLD, alpha: 0.2 });
    g.circle(cx + 40, y, 1.5).fill({ color: COL_GOLD, alpha: 0.2 });
    this.container.addChild(g);
  }

  private _card(x: number, y: number, w: number, h: number, selected: boolean, accentColor: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 5).fill({ color: selected ? 0x1a1810 : 0x0e0d0a, alpha: 0.95 });
    if (selected) {
      bg.roundRect(x + 2, y + 2, w - 4, h - 4, 4).stroke({ color: accentColor, width: 1, alpha: 0.2 });
    }
    bg.roundRect(x, y, w, h, 5).stroke({ color: selected ? accentColor : 0x333322, width: selected ? 2 : 1 });
    if (selected) {
      for (const [cx, cy] of [[x + 5, y + 5], [x + w - 5, y + 5], [x + 5, y + h - 5], [x + w - 5, y + h - 5]]) {
        bg.circle(cx, cy, 2).fill({ color: accentColor, alpha: 0.5 });
      }
    }
    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear();
      bg.roundRect(x, y, w, h, 5).fill({ color: 0x22201a, alpha: 0.95 });
      bg.roundRect(x, y, w, h, 5).stroke({ color: accentColor, width: 2 });
    });
    bg.on("pointerout", () => {
      bg.clear();
      bg.roundRect(x, y, w, h, 5).fill({ color: selected ? 0x1a1810 : 0x0e0d0a, alpha: 0.95 });
      bg.roundRect(x, y, w, h, 5).stroke({ color: selected ? accentColor : 0x333322, width: selected ? 2 : 1 });
    });
    bg.on("pointerdown", () => onClick());
    this.container.addChild(bg);
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._startCallback = null; this._backCallback = null; this.container.removeChildren(); }
}
