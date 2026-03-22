// ---------------------------------------------------------------------------
// Coven mode — results screen
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CovenState } from "../state/CovenState";
import { CovenConfig } from "../config/CovenConfig";

const FONT = "Georgia, serif";

export class CovenResultsScreen {
  readonly container = new Container();
  private _retryCallback: (() => void) | null = null;
  private _menuCallback: (() => void) | null = null;

  setRetryCallback(cb: () => void): void { this._retryCallback = cb; }
  setMenuCallback(cb: () => void): void { this._menuCallback = cb; }

  show(state: CovenState, sw: number, sh: number): void {
    this.container.removeChildren();
    const isVictory = state.victory;
    const accent = isVictory ? 0x88aaff : 0xff6666;

    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.9 });
    ov.eventMode = "static"; this.container.addChild(ov);

    const pw = 500, ph = 500, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    panel.roundRect(px, py, pw, ph, 10).fill({ color: isVictory ? 0x08081a : 0x180808, alpha: 0.97 });
    // Triple arcane border
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 3, alpha: 0.6 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: accent, width: 1, alpha: 0.15 });
    panel.roundRect(px + 6, py + 6, pw - 12, ph - 12, 8).stroke({ color: accent, width: 0.5, alpha: 0.08 });
    // Corner arcane dots
    for (const [cx, cy] of [[px + 10, py + 10], [px + pw - 10, py + 10], [px + 10, py + ph - 10], [px + pw - 10, py + ph - 10]]) {
      panel.circle(cx, cy, 4).fill({ color: accent, alpha: 0.4 });
      panel.circle(cx, cy, 2).fill({ color: accent, alpha: 0.7 });
    }
    // Center top rune
    panel.circle(sw / 2, py + 6, 3).fill({ color: accent, alpha: 0.3 });
    this.container.addChild(panel);

    let y = py + 22;

    const titleText = isVictory ? "\u2726 THE OTHERWORLD \u2726" : "\u2620 DARKNESS CLAIMS YOU \u2620";
    const title = new Text({ text: titleText, style: new TextStyle({ fontFamily: FONT, fontSize: 26, fill: accent, fontWeight: "bold", letterSpacing: 3 }) });
    title.anchor.set(0.5, 0); title.position.set(sw / 2, y); this.container.addChild(title);
    y += 38;

    const endText = isVictory
      ? "The gate opens. Light — not sunlight, something older — pours through. You step into the Otherworld. Behind you, the mortal realm fades. Morgan le Fay is free."
      : state.day >= CovenConfig.WILD_HUNT_DAY
        ? "The Wild Hunt rides. Spectral hounds bay at the moon. There is nowhere left to run. The forest takes you."
        : "Your body fails. The magic sustaining you gutters and dies. The forest closes in, patient and final. Another witch lost to the dark.";
    const sub = new Text({ text: endText, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: 0xbbaacc, fontStyle: "italic", wordWrap: true, wordWrapWidth: pw - 60, align: "center", lineHeight: 18 }) });
    sub.anchor.set(0.5, 0); sub.position.set(sw / 2, y); this.container.addChild(sub);
    y += sub.height + 20;

    // Stats
    const stats: [string, string, number][] = [
      ["Days Survived", `${state.day}`, 0xffffff],
      ["Creatures Slain", `${state.creaturesSlain}`, 0xff8888],
      ["Potions Brewed", `${state.potionsBrewed}`, 0x88aaff],
      ["Spells Cast", `${state.spellsCast}`, 0xcc88ff],
      ["Ingredients Gathered", `${state.ingredientsGathered}`, 0x88cc88],
      ["Ritual Components", `${state.ritualComponents.length}/${CovenConfig.RITUAL_COMPONENTS_NEEDED}`, 0xffd700],
    ];

    for (const [label, value, color] of stats) {
      const lbl = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0x998899 }) });
      lbl.position.set(px + 50, y); this.container.addChild(lbl);
      const val = new Text({ text: value, style: new TextStyle({ fontFamily: FONT, fontSize: 12, fill: color, fontWeight: "bold" }) });
      val.anchor.set(1, 0); val.position.set(px + pw - 50, y); this.container.addChild(val);
      y += 18;
    }
    y += 10;

    // Score
    const score = state.day * CovenConfig.SCORE_PER_DAY + state.creaturesSlain * CovenConfig.SCORE_PER_CREATURE
      + state.learnedSpells.length * CovenConfig.SCORE_PER_SPELL + state.ritualComponents.length * CovenConfig.SCORE_PER_COMPONENT
      + (state.victory ? CovenConfig.SCORE_VICTORY : 0);

    // Save best run to localStorage for meta-progression
    try {
      const bestKey = "coven_best";
      const prev = JSON.parse(localStorage.getItem(bestKey) ?? "{}");
      const runs = (prev.runs ?? 0) + 1;
      const bestScore = Math.max(prev.bestScore ?? 0, score);
      const bestDay = Math.max(prev.bestDay ?? 0, state.day);
      const totalKills = (prev.totalKills ?? 0) + state.creaturesSlain;
      const victories = (prev.victories ?? 0) + (state.victory ? 1 : 0);
      const meta = { runs, bestScore, bestDay, totalKills, victories };
      localStorage.setItem(bestKey, JSON.stringify(meta));

      // Show meta stats
      stats.push(["", "", 0x000000] as any); // spacer
      stats.push(["Total Runs", `${runs}`, 0x887799]);
      stats.push(["Best Score", `${bestScore}`, 0xffd700]);
      stats.push(["Total Kills (all runs)", `${totalKills}`, 0xff8888]);
      if (victories > 0) stats.push(["Victories", `${victories}`, 0x44ff44]);

      // Unlock notifications
      const unlocks: string[] = [];
      if (runs >= 3 && !(prev.runs >= 3)) unlocks.push("Unlocked: Start with Shadow Bolt spell!");
      if (totalKills >= 20 && !(prev.totalKills >= 20)) unlocks.push("Unlocked: Start with Healing Draught!");
      if (victories >= 1 && !(prev.victories >= 1)) unlocks.push("Unlocked: Hard difficulty available!");
      for (const u of unlocks) {
        const ut = new Text({ text: u, style: new TextStyle({ fontFamily: FONT, fontSize: 11, fill: 0xffdd44, fontWeight: "bold" }) });
        ut.anchor.set(0.5, 0); ut.position.set(sw / 2, y + 18 * stats.length + 10);
        this.container.addChild(ut);
      }
    } catch { /* localStorage not available */ }
    const scoreText = new Text({ text: `Score: ${score}`, style: new TextStyle({ fontFamily: FONT, fontSize: 22, fill: 0xffd700, fontWeight: "bold" }) });
    scoreText.anchor.set(0.5, 0); scoreText.position.set(sw / 2, y); this.container.addChild(scoreText);
    y += 40;

    // Buttons
    const btnW = 140, btnH = 34;
    for (const [label, bx, cb] of [["Try Again", sw / 2 - btnW - 8, this._retryCallback], ["Main Menu", sw / 2 + 8, this._menuCallback]] as const) {
      const bg = new Graphics();
      bg.roundRect(bx, y, btnW, btnH, 4).fill({ color: 0x15130e, alpha: 0.95 });
      bg.roundRect(bx, y, btnW, btnH, 4).stroke({ color: 0x8855cc, width: 2 });
      bg.eventMode = "static"; bg.cursor = "pointer";
      bg.on("pointerdown", () => (cb as (() => void) | null)?.());
      this.container.addChild(bg);
      const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 13, fill: 0x8855cc, fontWeight: "bold" }) });
      t.anchor.set(0.5); t.position.set(bx + btnW / 2, y + btnH / 2); this.container.addChild(t);
    }
  }

  hide(): void { this.container.removeChildren(); }
  cleanup(): void { this._retryCallback = null; this._menuCallback = null; this.container.removeChildren(); }
}
