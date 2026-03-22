// ---------------------------------------------------------------------------
// Shadowhand mode — pause menu
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

const FONT = "Georgia, serif";
const COL = 0x44aa88;

export class ShadowhandPauseMenu {
  readonly container = new Container();
  private _resumeCallback: (() => void) | null = null;
  private _quitCallback: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }
  setQuitCallback(cb: () => void): void { this._quitCallback = cb; }

  show(state: ShadowhandState, sw: number, sh: number): void {
    this.container.removeChildren();

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 460, ph = 440, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x06080a, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: COL, width: 2, alpha: 0.5 });
    for (const [cx, cy] of [[px + 8, py + 8], [px + pw - 8, py + 8], [px + 8, py + ph - 8], [px + pw - 8, py + ph - 8]])
      panel.circle(cx, cy, 3).fill({ color: COL, alpha: 0.35 });
    this.container.addChild(panel);

    let y = py + 18;

    this._text("PAUSED", sw / 2, y, { fontSize: 24, fill: COL, fontWeight: "bold", letterSpacing: 4 }, true);
    y += 38;
    this._divider(px + 30, px + pw - 30, y); y += 15;

    // Guild status
    this._text("Guild Status", sw / 2, y, { fontSize: 13, fill: 0xccaa88, fontWeight: "bold" }, true);
    y += 20;

    const heat = state.guild.heat.get("default") ?? 0;
    const stats: [string, string, number][] = [
      ["Gold", `${state.guild.gold}`, 0xffd700],
      ["Reputation", `${state.guild.reputation}`, 0x88aaff],
      ["Tier", `${state.guild.tier}`, 0xccaa88],
      ["Heat", `${heat}/${ShadowhandConfig.MAX_HEAT}`, heat > 60 ? 0xff4444 : heat > 30 ? 0xffaa44 : 0x44aa44],
      ["Day", `${state.guild.day}`, 0xccddcc],
      ["Crew", `${state.guild.roster.filter(c => c.alive && !c.captured).length}/${state.guild.roster.length}`, 0x88ccaa],
      ["Heists Completed", `${state.guild.completedHeists.length}`, 0xaaccaa],
      ["Perfect Heists", `${state.guild.perfectHeists}`, 0xffd700],
    ];

    for (const [label, value, color] of stats) {
      this._text(label, px + 40, y, { fontSize: 10, fill: 0x778877 });
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
      ["Click", "Move / interact"], ["Tab", "Switch thief"], ["C", "Crouch"],
      ["Space", "Pick lock"], ["1-5", "Use ability"], ["+ / -", "Speed"],
      ["Esc", "Resume"],
    ];
    for (const [key, desc] of controls) {
      this._text(key, px + 60, y, { fontSize: 10, fill: COL, fontWeight: "bold" });
      this._text(desc, px + 140, y, { fontSize: 10, fill: 0x888877 });
      y += 14;
    }
    y += 15;

    // Buttons
    this._button("RESUME", sw / 2 - 80, y, 160, 36, COL, () => this._resumeCallback?.());
    y += 48;
    this._button("QUIT", sw / 2 - 60, y, 120, 30, 0x884444, () => this._quitCallback?.());
  }

  hide(): void { this.container.removeChildren(); }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(x1: number, x2: number, y: number): void {
    const g = new Graphics();
    g.moveTo(x1, y).lineTo(x2, y).stroke({ color: COL, width: 0.5, alpha: 0.2 });
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
