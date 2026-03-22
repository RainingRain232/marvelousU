// ---------------------------------------------------------------------------
// Coven mode — pause menu
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenState } from "../state/CovenState";
import { CovenConfig } from "../config/CovenConfig";
import { CovenRitualSystem } from "../systems/CovenRitualSystem";

const FONT = "Georgia, serif";
const COL = 0x8855cc;

export class CovenPauseMenu {
  readonly container = new Container();
  private _resumeCallback: (() => void) | null = null;
  private _quitCallback: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }
  setQuitCallback(cb: () => void): void { this._quitCallback = cb; }

  show(state: CovenState, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 460, ph = 480, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x08060a, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: COL, width: 2, alpha: 0.5 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: COL, width: 1, alpha: 0.1 });
    for (const [cx, cy] of [[px + 8, py + 8], [px + pw - 8, py + 8], [px + 8, py + ph - 8], [px + pw - 8, py + ph - 8]])
      panel.circle(cx, cy, 3).fill({ color: COL, alpha: 0.35 });
    this.container.addChild(panel);

    let y = py + 18;

    this._text("PAUSED", sw / 2, y, { fontSize: 24, fill: COL, fontWeight: "bold", letterSpacing: 4 }, true);
    y += 38;
    this._divider(px + 30, px + pw - 30, y); y += 15;

    // Status
    this._text("Status", sw / 2, y, { fontSize: 13, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 20;

    let totalIng = 0; for (const [, v] of state.ingredients) totalIng += v;
    let totalPot = 0; for (const [, v] of state.potions) totalPot += v;
    const ritual = CovenRitualSystem.getProgress(state);

    const stats: [string, string, number][] = [
      ["Day", `${state.day}`, 0xaa88ff],
      ["Health", `${state.health}/${state.maxHealth}`, state.health < 30 ? 0xff4444 : 0xccbbaa],
      ["Mana", `${state.mana}/${state.maxMana}`, 0x6688ff],
      ["Ingredients", `${totalIng}`, 0x88cc88],
      ["Potions", `${totalPot}`, 0x88aaff],
      ["Spells Learned", `${state.learnedSpells.length}`, 0xcc88ff],
      ["Familiars", `${state.familiars.filter(f => f.active).length}`, 0x88aa88],
      ["Creatures Slain", `${state.creaturesSlain}`, 0xff8888],
      ["Ritual Progress", `${ritual.found}/${ritual.needed}`, 0xffd700],
      ["Wild Hunt", `Day ${CovenConfig.WILD_HUNT_DAY} (${CovenConfig.WILD_HUNT_DAY - state.day} left)`, state.day > 20 ? 0xff4444 : 0xccbbaa],
    ];

    for (const [label, value, color] of stats) {
      this._text(label, px + 40, y, { fontSize: 10, fill: 0x887788 });
      const vt = this._text(value, px + pw - 40, y, { fontSize: 10, fill: color, fontWeight: "bold" });
      vt.anchor.set(1, 0);
      y += 16;
    }
    y += 8;
    this._divider(px + 30, px + pw - 30, y); y += 15;

    // Controls
    this._text("Controls", sw / 2, y, { fontSize: 13, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 20;

    const controls: [string, string][] = [
      ["Click hex", "Move & forage"], ["B", "Open cauldron"], ["W", "Place ward (dusk)"],
      ["A / Space", "Attack"], ["F", "Flee"], ["H", "Use potion"],
      ["1-7", "Switch spell"], ["R", "Grand Ritual"], ["Esc", "Resume"],
    ];

    for (const [key, desc] of controls) {
      const kw = Math.max(55, key.length * 7 + 12);
      const badge = new Graphics();
      badge.roundRect(px + 35, y - 1, kw, 15, 3).fill({ color: 0x0a080e, alpha: 0.9 });
      badge.roundRect(px + 35, y - 1, kw, 15, 3).stroke({ color: 0x444433, width: 1 });
      this.container.addChild(badge);
      this._text(key, px + 35 + kw / 2, y, { fontSize: 9, fill: 0xccbb88, fontWeight: "bold" }, true);
      this._text(desc, px + 35 + kw + 8, y, { fontSize: 9, fill: 0x888877 });
      y += 18;
    }
    y += 10;

    // Buttons
    this._button("Resume", sw / 2 - 160, y, 140, 36, 0x44aa44, () => this._resumeCallback?.());
    this._button("Quit to Menu", sw / 2 + 20, y, 140, 36, 0xff6644, () => this._quitCallback?.());

    this._text("Press Escape to resume", sw / 2, y + 44, { fontSize: 9, fill: 0x555544, fontStyle: "italic" }, true);
  }

  private _text(str: string, x: number, y: number, style: Record<string, unknown>, centered = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...style } as TextStyle) });
    if (centered) t.anchor.set(0.5, 0);
    t.position.set(x, y); this.container.addChild(t); return t;
  }

  private _divider(x1: number, x2: number, y: number): void {
    const g = new Graphics();
    g.moveTo(x1, y).lineTo(x2, y).stroke({ color: COL, width: 1, alpha: 0.2 });
    g.circle((x1 + x2) / 2, y, 2).fill({ color: COL, alpha: 0.3 });
    this.container.addChild(g);
  }

  private _button(label: string, x: number, y: number, w: number, h: number, accent: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 5).fill({ color: 0x0a080e, alpha: 0.95 });
    bg.roundRect(x, y, w, h, 5).stroke({ color: accent, width: 2 });
    this.container.addChild(bg);
    const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: accent, fontWeight: "bold" }) });
    t.anchor.set(0.5); t.position.set(x + w / 2, y + h / 2); this.container.addChild(t);
    bg.eventMode = "static"; bg.cursor = "pointer";
    bg.on("pointerover", () => { bg.clear(); bg.roundRect(x, y, w, h, 5).fill({ color: 0x151018, alpha: 0.95 }); bg.roundRect(x, y, w, h, 5).stroke({ color: accent, width: 2.5 }); });
    bg.on("pointerout", () => { bg.clear(); bg.roundRect(x, y, w, h, 5).fill({ color: 0x0a080e, alpha: 0.95 }); bg.roundRect(x, y, w, h, 5).stroke({ color: accent, width: 2 }); });
    bg.on("pointerdown", () => onClick());
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._resumeCallback = null; this._quitCallback = null; this.container.removeChildren(); }
}
