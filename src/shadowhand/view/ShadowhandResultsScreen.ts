// ---------------------------------------------------------------------------
// Shadowhand mode — polished results screen with combo display & medals
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ShadowhandState } from "../state/ShadowhandState";
import { ShadowhandPhase } from "../state/ShadowhandState";

const FONT = "Georgia, serif";

function drawMedal(g: Graphics, cx: number, cy: number, color: number, label: string, container: Container): void {
  // Ribbon tails (V-shaped with forked ends)
  g.moveTo(cx - 7, cy - 12).lineTo(cx - 4, cy - 4).lineTo(cx, cy - 6).lineTo(cx + 4, cy - 4).lineTo(cx + 7, cy - 12).lineTo(cx + 5, cy - 12).lineTo(cx + 3, cy - 6).lineTo(cx, cy - 8).lineTo(cx - 3, cy - 6).lineTo(cx - 5, cy - 12).closePath().fill({ color: 0x884422, alpha: 0.65 });
  // Ribbon fold highlight
  g.moveTo(cx - 4, cy - 8).lineTo(cx, cy - 6).stroke({ color: 0xaa6633, width: 0.5, alpha: 0.3 });
  // Medal disc (layered for depth)
  g.circle(cx, cy + 3, 11).fill({ color: 0x222222, alpha: 0.4 }); // shadow
  g.circle(cx, cy + 2, 11).fill({ color, alpha: 0.15 }); // outer glow
  g.circle(cx, cy + 2, 10).fill({ color, alpha: 0.7 });
  g.circle(cx, cy + 2, 10).stroke({ color: 0xffffff, width: 1.2, alpha: 0.35 });
  // Inner ring
  g.circle(cx, cy + 2, 7.5).stroke({ color: 0xffffff, width: 0.8, alpha: 0.2 });
  // 5-pointed star (polygon, not circle)
  for (let i = 0; i < 5; i++) {
    const oa = -Math.PI / 2 + i * Math.PI * 2 / 5;
    const ia = oa + Math.PI / 5;
    if (i === 0) g.moveTo(cx + Math.cos(oa) * 5, cy + 2 + Math.sin(oa) * 5);
    else g.lineTo(cx + Math.cos(oa) * 5, cy + 2 + Math.sin(oa) * 5);
    g.lineTo(cx + Math.cos(ia) * 2, cy + 2 + Math.sin(ia) * 2);
  }
  g.closePath().fill({ color: 0xffffff, alpha: 0.4 });
  // Shine highlight
  g.circle(cx - 3, cy - 1, 2).fill({ color: 0xffffff, alpha: 0.15 });
  // Label
  const t = new Text({ text: label, style: new TextStyle({ fontFamily: FONT, fontSize: 7, fill: color, fontWeight: "bold" }) });
  t.anchor.set(0.5, 0); t.position.set(cx, cy + 16);
  container.addChild(t);
}

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

    // Overlay
    const ov = new Graphics();
    ov.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.92 });
    ov.eventMode = "static"; this.container.addChild(ov);

    // Panel
    const pw = 540, ph = 520, px = (sw - pw) / 2, py = (sh - ph) / 2;
    const panel = new Graphics();
    const panelColor = isVictory ? 0x0a0a14 : isGameOver ? 0x140808 : 0x080a08;
    panel.roundRect(px, py, pw, ph, 10).fill({ color: panelColor, alpha: 0.97 });
    // Subtle stone texture inside panel
    for (let row = 0; row < Math.ceil(ph / 20); row++) {
      const ry = py + row * 20;
      const offset = (row % 2) * 25;
      panel.moveTo(px + 10, ry).lineTo(px + pw - 10, ry).stroke({ color: accent, width: 0.3, alpha: 0.03 });
      for (let col = 0; col < Math.ceil(pw / 50) + 1; col++) {
        const ccx = px + col * 50 + offset;
        if (ccx > px + 8 && ccx < px + pw - 8) {
          panel.moveTo(ccx, ry).lineTo(ccx, ry + 20).stroke({ color: accent, width: 0.2, alpha: 0.02 });
        }
      }
    }
    // Triple border
    panel.roundRect(px, py, pw, ph, 10).stroke({ color: accent, width: 3, alpha: 0.6 });
    panel.roundRect(px + 3, py + 3, pw - 6, ph - 6, 9).stroke({ color: accent, width: 1, alpha: 0.15 });
    panel.roundRect(px + 6, py + 6, pw - 12, ph - 12, 8).stroke({ color: accent, width: 0.5, alpha: 0.08 });
    // Corners with L-brackets
    for (const [ccx, ccy] of [[px + 12, py + 12], [px + pw - 12, py + 12], [px + 12, py + ph - 12], [px + pw - 12, py + ph - 12]]) {
      panel.circle(ccx, ccy, 4).fill({ color: accent, alpha: 0.4 });
      panel.circle(ccx, ccy, 2).fill({ color: accent, alpha: 0.7 });
      const dx = ccx < sw / 2 ? 1 : -1, dy = ccy < sh / 2 ? 1 : -1;
      panel.moveTo(ccx, ccy + dy * 8).lineTo(ccx, ccy).lineTo(ccx + dx * 8, ccy).stroke({ color: accent, width: 0.8, alpha: 0.2 });
    }
    // Top center accent
    panel.moveTo(px + pw / 2 - 40, py + 2).lineTo(px + pw / 2 + 40, py + 2).stroke({ color: accent, width: 2, alpha: 0.3 });
    this.container.addChild(panel);

    let y = py + 22;

    // Title
    const titleText = isVictory
      ? "\u2726 THE GRAIL IS YOURS \u2726"
      : isGameOver
        ? "\u2620 THE GUILD FALLS \u2620"
        : "\u2620 HEIST COMPLETE \u2620";
    // Shadow
    this._text(titleText, sw / 2, y + 2, { fontSize: 26, fill: 0x000000, fontWeight: "bold", letterSpacing: 3 }, true);
    this._text(titleText, sw / 2, y, { fontSize: 26, fill: accent, fontWeight: "bold", letterSpacing: 3 }, true);
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
    y += sub.height + 18;

    // Divider
    const divG = new Graphics();
    divG.moveTo(px + 30, y).lineTo(px + pw - 30, y).stroke({ color: accent, width: 0.5, alpha: 0.3 });
    divG.circle(px + pw / 2, y, 3).fill({ color: accent, alpha: 0.3 });
    this.container.addChild(divG);
    y += 12;

    // Stats
    if (heist) {
      let lootVal = 0;
      for (const l of heist.lootCollected) lootVal += l.value;
      const escaped = heist.thieves.filter(t => t.escaped).length;
      const total = heist.thieves.length;
      const mins = Math.floor(heist.elapsedTime / 60);
      const secs = Math.floor(heist.elapsedTime % 60);

      const stats: [string, string, number][] = [
        ["Target", state.currentTarget?.name ?? "Unknown", 0xccddcc],
        ["Loot Value", `${lootVal} gold`, 0xffd700],
        ["Primary Loot", heist.primaryLootTaken ? "Secured!" : "Left behind", heist.primaryLootTaken ? 0x44ff44 : 0xff6644],
        ["Crew Escaped", `${escaped}/${total}`, escaped === total ? 0x44ff44 : 0xffaa44],
        ["Time", `${mins}:${secs.toString().padStart(2, "0")}`, 0xccddcc],
        ["Alerts", heist.reinforcementsSpawned > 0 ? "Reinforcements called!" : heist.globalAlertTimer > 0 ? "Yes" : "None", heist.globalAlertTimer > 0 ? 0xff6644 : 0x44ff44],
      ];

      for (const [label, value, color] of stats) {
        this._text(label, px + 45, y, { fontSize: 11, fill: 0x778877 });
        const vt = this._text(value, px + pw - 45, y, { fontSize: 11, fill: color, fontWeight: "bold" });
        vt.anchor.set(1, 0);
        y += 18;
      }

      y += 6;

      // Combo bonuses section
      const combo = heist.combo;
      const bonuses: [string, number][] = [];
      if (combo.perfectEscape) bonuses.push(["Perfect Escape", 0x44ff44]);
      if (combo.silentTakedowns >= 3) bonuses.push([`Silent Takedown x${combo.silentTakedowns}`, 0xff6644]);
      if (combo.timeTotal > 0 && combo.timeInShadow / combo.timeTotal > 0.8) bonuses.push(["Shadow Master", 0x6644cc]);
      if (combo.torchesExtinguished >= 3) bonuses.push([`Lights Out (${combo.torchesExtinguished})`, 0x4488cc]);

      if (bonuses.length > 0) {
        const bonusDivG = new Graphics();
        bonusDivG.moveTo(px + 60, y).lineTo(px + pw - 60, y).stroke({ color: 0x444444, width: 0.5, alpha: 0.3 });
        this.container.addChild(bonusDivG);
        y += 10;

        this._text("Combo Bonuses", sw / 2, y, { fontSize: 11, fill: 0xccaa88, fontWeight: "bold" }, true);
        y += 16;
        for (const [name, color] of bonuses) {
          this._text(`\u2605 ${name}`, sw / 2, y, { fontSize: 10, fill: color }, true);
          y += 14;
        }
      }

      y += 8;

      // Score + guild stats
      const scoreDivG = new Graphics();
      scoreDivG.moveTo(px + 30, y).lineTo(px + pw - 30, y).stroke({ color: accent, width: 0.5, alpha: 0.2 });
      this.container.addChild(scoreDivG);
      y += 12;

      this._text("Score", px + 45, y, { fontSize: 13, fill: 0xccddcc, fontWeight: "bold" });
      const scoreText = this._text(`${state.score}`, px + pw - 45, y, { fontSize: 16, fill: accent, fontWeight: "bold" });
      scoreText.anchor.set(1, 0);
      y += 22;

      this._text("Reputation", px + 45, y, { fontSize: 10, fill: 0x778877 });
      const repText = this._text(`${state.guild.reputation}`, px + pw - 45, y, { fontSize: 10, fill: 0x88aaff, fontWeight: "bold" });
      repText.anchor.set(1, 0);
      y += 14;

      this._text("Streak", px + 45, y, { fontSize: 10, fill: 0x778877 });
      const streakText = this._text(`${state.guild.currentStreak}`, px + pw - 45, y, { fontSize: 10, fill: state.guild.currentStreak >= 3 ? 0xffd700 : 0xccddcc, fontWeight: "bold" });
      streakText.anchor.set(1, 0);
      y += 18;

      // Medals
      if (bonuses.length > 0 || heist.primaryLootTaken || escaped === total) {
        const medalG = new Graphics();
        let mx = sw / 2 - bonuses.length * 20;
        if (heist.primaryLootTaken) { drawMedal(medalG, mx, y + 10, 0xffd700, "Prize", this.container); mx += 40; }
        if (escaped === total) { drawMedal(medalG, mx, y + 10, 0x44ff44, "All Safe", this.container); mx += 40; }
        if (combo.perfectEscape) { drawMedal(medalG, mx, y + 10, 0x88aaff, "Ghost", this.container); mx += 40; }
        if (combo.silentTakedowns >= 3) { drawMedal(medalG, mx, y + 10, 0xff6644, "Assassin", this.container); mx += 40; }
        this.container.addChild(medalG);
        y += 40;
      }
    }

    y = py + ph - 56;

    // Buttons
    if (!isGameOver && !isVictory) {
      this._fancyButton("CONTINUE", sw / 2 - 90, y, 180, 38, 0x44aa88, () => this._continueCallback?.());
      this._fancyButton("MENU", sw / 2 + 100, y + 4, 80, 30, 0x666655, () => this._menuCallback?.());
    } else {
      this._fancyButton("MAIN MENU", sw / 2 - 70, y, 140, 38, accent, () => this._menuCallback?.());
    }
  }

  hide(): void { this.container.removeChildren(); }

  private _text(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): Text {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this.container.addChild(t);
    return t;
  }

  private _fancyButton(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x, y, w, h, 5).fill({ color: 0x080a08, alpha: 0.85 });
    g.roundRect(x, y, w, h, 5).stroke({ color, width: 2, alpha: 0.6 });
    g.roundRect(x + 1, y + 1, w - 2, h / 2, 5).fill({ color: 0xffffff, alpha: 0.02 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this.container.addChild(g);
    this._text(label, x + w / 2, y + h / 2 - 7, { fontSize: 13, fill: color, fontWeight: "bold", letterSpacing: 2 }, true);
  }
}
