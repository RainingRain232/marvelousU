// ---------------------------------------------------------------------------
// Shadowhand mode — results screen (post-heist)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { ShadowhandPhase } from "../state/ShadowhandState";
const FONT = "Georgia, serif";

export class ShadowhandResultsScreen {
  readonly container = new Container();
  private _continueCallback: (() => void) | null = null;
  private _menuCallback: (() => void) | null = null;

  setContinueCallback(cb: () => void): void { this._continueCallback = cb; }
  setMenuCallback(cb: () => void): void { this._menuCallback = cb; }

  show(state: ShadowhandState, sw: number, sh: number): void {
    this.container.removeChildren();
    const heist = state.heist;
    const isVictory = state.phase === ShadowhandPhase.VICTORY;
    const isGameOver = state.phase === ShadowhandPhase.GAME_OVER;
    const accent = isVictory ? 0xffd700 : isGameOver ? 0xff4444 : 0x44aa88;

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.9 });
    ov.eventMode = "static";
    this.container.addChild(ov);

    const pw = 500, ph = 480, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: 0x080a08, alpha: 0.97 });
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 3, alpha: 0.6 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: accent, width: 1, alpha: 0.15 });
    for (const [cx, cy] of [[px + 10, py + 10], [px + pw - 10, py + 10], [px + 10, py + ph - 10], [px + pw - 10, py + ph - 10]])
      panel.circle(cx, cy, 4).fill({ color: accent, alpha: 0.4 });
    this.container.addChild(panel);

    let y = py + 22;

    // Title
    const titleText = isVictory
      ? "\u2726 THE GRAIL IS YOURS \u2726"
      : isGameOver
        ? "\u2620 THE GUILD FALLS \u2620"
        : "\u2620 HEIST COMPLETE \u2620";
    this._text(titleText, sw / 2, y, { fontSize: 24, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);
    y += 38;

    // Flavor text
    const flavorText = isVictory
      ? "The Grail Fragment gleams in your hands. The Shadowhand has achieved the impossible. Legends will speak of this night."
      : isGameOver
        ? "The last of your crew is taken. The Inquisition has won. The Shadowhand is no more."
        : heist?.primaryLootTaken
          ? "The prize is secured. Your crew melts back into the shadows of Camelot."
          : "You escaped, but the main prize remains behind. Perhaps next time.";
    const sub = new Text({ text: flavorText, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xbbccbb, fontStyle: "italic", wordWrap: true, wordWrapWidth: pw - 60, align: "center", lineHeight: 18 }) });
    sub.anchor.set(0.5, 0); sub.position.set(sw / 2, y); this.container.addChild(sub);
    y += sub.height + 20;

    // Divider
    const divG = new Graphics();
    divG.moveTo(px + 30, y).lineTo(px + pw - 30, y).stroke({ color: accent, width: 0.5, alpha: 0.3 });
    this.container.addChild(divG);
    y += 15;

    // Stats
    if (heist) {
      let lootVal = 0;
      for (const l of heist.lootCollected) lootVal += l.value;
      const survived = heist.thieves.filter(t => t.escaped).length;
      const total = heist.thieves.length;
      const mins = Math.floor(heist.elapsedTime / 60);
      const secs = Math.floor(heist.elapsedTime % 60);

      const stats: [string, string, number][] = [
        ["Target", state.currentTarget?.name ?? "Unknown", 0xccddcc],
        ["Loot Value", `${lootVal} gold`, 0xffd700],
        ["Primary Loot", heist.primaryLootTaken ? "Secured!" : "Left behind", heist.primaryLootTaken ? 0x44ff44 : 0xff6644],
        ["Crew Survived", `${survived}/${total}`, survived === total ? 0x44ff44 : 0xffaa44],
        ["Time", `${mins}:${secs.toString().padStart(2, "0")}`, 0xccddcc],
        ["Alerts Triggered", heist.reinforcementsSpawned > 0 ? "Yes (reinforcements!)" : heist.globalAlertTimer > 0 ? "Yes" : "None", heist.globalAlertTimer > 0 ? 0xff6644 : 0x44ff44],
        ["Score", `${state.score}`, 0x44ccaa],
        ["Guild Reputation", `${state.guild.reputation}`, 0x88aaff],
        ["Guild Tier", `${state.guild.tier}`, 0xccaa88],
      ];

      for (const [label, value, color] of stats) {
        this._text(label, px + 40, y, { fontSize: 10, fill: 0x778877 });
        const vt = this._text(value, px + pw - 40, y, { fontSize: 10, fill: color, fontWeight: "bold" });
        vt.anchor.set(1, 0);
        y += 16;
      }
    }
    y += 15;

    // Buttons
    if (!isGameOver && !isVictory) {
      this._button("CONTINUE", sw / 2 - 90, y, 180, 38, 0x44aa88, () => this._continueCallback?.());
      y += 50;
    }
    this._button("MAIN MENU", sw / 2 - 70, y, 140, 30, 0x666655, () => this._menuCallback?.());
  }

  hide(): void { this.container.removeChildren(); }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
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
