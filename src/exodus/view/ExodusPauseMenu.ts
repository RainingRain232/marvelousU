// ---------------------------------------------------------------------------
// Exodus mode — pause menu with controls reference
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ExodusState } from "../state/ExodusState";
import { combatReadyMembers } from "../state/ExodusState";
import { ExodusPursuerSystem } from "../systems/ExodusPursuerSystem";
import { ExodusConfig } from "../config/ExodusConfig";

const FONT = "Georgia, serif";
const COL_GOLD = 0xdaa520;
const COL_BG = 0x0a0805;

export class ExodusPauseMenu {
  readonly container = new Container();

  private _resumeCallback: (() => void) | null = null;
  private _quitCallback: (() => void) | null = null;

  setResumeCallback(cb: () => void): void { this._resumeCallback = cb; }
  setQuitCallback(cb: () => void): void { this._quitCallback = cb; }

  show(state: ExodusState, sw: number, sh: number): void {
    this.container.removeChildren();

    // Overlay
    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.82 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    // Main panel
    const pw = 480, ph = 520;
    const px = (sw - pw) / 2, py = (sh - ph) / 2;

    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: COL_BG, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: COL_GOLD, width: 2, alpha: 0.5 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: COL_GOLD, width: 1, alpha: 0.12 });
    // Corner dots
    for (const [cx, cy] of [[px + 8, py + 8], [px + pw - 8, py + 8], [px + 8, py + ph - 8], [px + pw - 8, py + ph - 8]]) {
      panel.circle(cx, cy, 3).fill({ color: COL_GOLD, alpha: 0.4 });
    }
    this.container.addChild(panel);

    let y = py + 18;

    // Title
    this._text("PAUSED", sw / 2, y, { fontSize: 26, fill: COL_GOLD, fontWeight: "bold", letterSpacing: 4 }, true);
    y += 40;
    this._divider(px + 30, px + pw - 30, y);
    y += 15;

    // --- Game state summary ---
    this._text("Journey Status", sw / 2, y, { fontSize: 14, fill: 0xccaa66, fontWeight: "bold" }, true);
    y += 22;

    const fighters = combatReadyMembers(state);
    const dist = state.pursuer.active ? ExodusPursuerSystem.getDistanceToCaravan(state) : -1;
    const fpd = Math.ceil(state.members.length * ExodusConfig.FOOD_PER_PERSON_PER_DAY);
    const daysOfFood = fpd > 0 ? Math.floor(state.food / fpd) : 99;

    const statusLines: [string, string, number][] = [
      ["Day", `${state.day}`, 0xffd700],
      ["Caravan", `${state.members.length} souls (${fighters.length} fighters)`, 0xccbbaa],
      ["Food", `${Math.floor(state.food)} (~${daysOfFood} days)`, state.food <= 20 ? 0xff4444 : 0x88cc88],
      ["Supplies", `${Math.floor(state.supplies)}`, 0x8899cc],
      ["Morale", `${Math.floor(state.morale)}/100`, state.morale <= 25 ? 0xff4444 : 0xccaa66],
      ["Hope", `${Math.floor(state.hope)}/100`, state.hope <= 20 ? 0xff4444 : 0xaa88ff],
      ["Avalon", `${state.distanceToGoal} hexes away`, 0x66ddaa],
    ];
    if (dist >= 0) {
      statusLines.push(["Mordred", `${dist} hexes behind`, dist <= 4 ? 0xff4444 : 0xff8844]);
    }

    for (const [label, value, color] of statusLines) {
      this._text(label, px + 40, y, { fontSize: 11, fill: 0x887766 });
      const vt = this._text(value, px + pw - 40, y, { fontSize: 11, fill: color, fontWeight: "bold" });
      vt.anchor.set(1, 0);
      y += 17;
    }

    y += 10;
    this._divider(px + 30, px + pw - 30, y);
    y += 15;

    // --- Controls reference ---
    this._text("Controls", sw / 2, y, { fontSize: 14, fill: 0xccaa66, fontWeight: "bold" }, true);
    y += 22;

    const controls: [string, string][] = [
      ["Click hex", "Move caravan to adjacent hex"],
      ["1, 2, 3...", "Choose event option"],
      ["Escape", "Pause / Resume"],
    ];

    for (const [key, desc] of controls) {
      // Key badge
      const kw = Math.max(60, key.length * 8 + 16);
      const badge = new Graphics();
      badge.roundRect(px + 35, y - 1, kw, 18, 3).fill({ color: 0x1a1810, alpha: 0.9 });
      badge.roundRect(px + 35, y - 1, kw, 18, 3).stroke({ color: 0x444433, width: 1 });
      this.container.addChild(badge);

      this._text(key, px + 35 + kw / 2, y + 1, { fontSize: 10, fill: 0xddcc88, fontWeight: "bold" }, true);
      this._text(desc, px + 35 + kw + 12, y + 1, { fontSize: 10, fill: 0x998877 });
      y += 24;
    }

    y += 10;
    this._divider(px + 30, px + pw - 30, y);
    y += 18;

    // --- Phase-specific hints ---
    this._text("Tips", sw / 2, y, { fontSize: 14, fill: 0xccaa66, fontWeight: "bold" }, true);
    y += 22;

    const tips = [
      "Scouts reduce ambush chance and increase vision range.",
      "Resting heals wounded and boosts morale, but Mordred advances.",
      "Craftsmen can build upgrades that give permanent bonuses.",
      "Mountains and forests slow Mordred — use terrain to your advantage.",
      "Refugees slow you down but increase your final score significantly.",
    ];
    const tip = tips[state.day % tips.length];
    const tipText = this._text(`"${tip}"`, sw / 2, y, { fontSize: 10, fill: 0x998877, fontStyle: "italic", wordWrap: true, wordWrapWidth: pw - 80, align: "center" }, true);
    y += tipText.height + 20;

    // --- Buttons ---
    const btnY = py + ph - 70;

    this._button("Resume", sw / 2 - 170, btnY, 150, 38, 0x44aa44, () => this._resumeCallback?.());
    this._button("Quit to Menu", sw / 2 + 20, btnY, 150, 38, 0xff6644, () => this._quitCallback?.());

    // Escape hint
    this._text("Press Escape to resume", sw / 2, btnY + 48, { fontSize: 9, fill: 0x666655, fontStyle: "italic" }, true);
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private _text(str: string, x: number, y: number, style: Partial<TextStyle> & Record<string, unknown>, centered = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...style } as TextStyle) });
    if (centered) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _divider(x1: number, x2: number, y: number): void {
    const g = new Graphics();
    g.moveTo(x1, y).lineTo(x2, y).stroke({ color: COL_GOLD, width: 1, alpha: 0.2 });
    const cx = (x1 + x2) / 2;
    g.circle(cx, y, 2).fill({ color: COL_GOLD, alpha: 0.35 });
    this.container.addChild(g);
  }

  private _button(label: string, x: number, y: number, w: number, h: number, accentColor: number, onClick: () => void): void {
    const bg = new Graphics();
    bg.roundRect(x, y, w, h, 5).fill({ color: 0x12100a, alpha: 0.95 });
    bg.roundRect(x, y, w, h, 5).stroke({ color: accentColor, width: 2 });
    this.container.addChild(bg);

    const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 14, fill: accentColor, fontWeight: "bold" }) });
    t.anchor.set(0.5);
    t.position.set(x + w / 2, y + h / 2);
    this.container.addChild(t);

    bg.eventMode = "static";
    bg.cursor = "pointer";
    bg.on("pointerover", () => {
      bg.clear();
      bg.roundRect(x, y, w, h, 5).fill({ color: 0x22201a, alpha: 0.95 });
      bg.roundRect(x, y, w, h, 5).stroke({ color: accentColor, width: 2.5 });
    });
    bg.on("pointerout", () => {
      bg.clear();
      bg.roundRect(x, y, w, h, 5).fill({ color: 0x12100a, alpha: 0.95 });
      bg.roundRect(x, y, w, h, 5).stroke({ color: accentColor, width: 2 });
    });
    bg.on("pointerdown", () => onClick());
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._resumeCallback = null; this._quitCallback = null; this.container.removeChildren(); }
}
