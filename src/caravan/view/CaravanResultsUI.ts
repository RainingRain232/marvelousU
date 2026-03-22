// ---------------------------------------------------------------------------
// Caravan results screen — medieval styled victory/defeat
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { CaravanState } from "../state/CaravanState";
import { RELIC_POOL } from "../config/CaravanRelicDefs";
import { getTownForSegment } from "../config/CaravanTradeDefs";

function drawOrnamentCorner(g: Graphics, x: number, y: number, size: number, color: number, flipX = false, flipY = false): void {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  g.moveTo(x, y).lineTo(x + size * sx, y).stroke({ color, width: 1.5, alpha: 0.5 });
  g.moveTo(x, y).lineTo(x, y + size * sy).stroke({ color, width: 1.5, alpha: 0.5 });
  g.circle(x + 3 * sx, y + 3 * sy, 1.5).fill({ color, alpha: 0.4 });
}

export class CaravanResultsUI {
  readonly container = new Container();

  show(
    state: CaravanState,
    sw: number, sh: number,
    onRestart: () => void,
    onQuit: () => void,
    onNgPlus?: () => void,
  ): void {
    this.container.removeChildren();
    const isVictory = state.victory;
    const accentColor = isVictory ? 0xffd700 : 0xff4444;

    // Background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x040410, alpha: 0.95 });
    bg.circle(sw / 2, sh * 0.35, sh * 0.4).fill({ color: isVictory ? 0x1a1a22 : 0x1a1111, alpha: 0.4 });
    bg.rect(0, 0, sw, 2).fill({ color: accentColor, alpha: 0.2 });
    bg.rect(0, sh - 2, sw, 2).fill({ color: accentColor, alpha: 0.2 });
    this.container.addChild(bg);

    // Title banner
    const bannerG = new Graphics();
    bannerG.roundRect(sw / 2 - 180, 18, 360, 40, 4).fill({ color: 0x111128, alpha: 0.8 });
    bannerG.roundRect(sw / 2 - 180, 18, 360, 40, 4).stroke({ color: accentColor, width: 1, alpha: 0.4 });
    this.container.addChild(bannerG);

    const title = new Text({
      text: isVictory ? "Caravan Delivered!" : "Caravan Lost",
      style: new TextStyle({ fontFamily: "serif", fontSize: 28, fill: accentColor, fontWeight: "bold" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 22);
    this.container.addChild(title);

    // Subtitle
    let subText: string;
    if (isVictory) {
      const dest = getTownForSegment(state.towns, state.totalSegments);
      subText = dest ? `Successfully delivered to ${dest.name}` : "Journey complete";
    } else {
      const reason = state.defeatReason === "hero_died"
        ? "Your hero fell in battle"
        : state.defeatReason === "caravan_destroyed"
          ? "The caravan was destroyed"
          : "Overwhelmed by enemies";
      subText = `${reason} — Segment ${state.segment + 1} of ${state.totalSegments}`;
    }
    const sub = new Text({
      text: subText,
      style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: isVictory ? 0x88ccff : 0xff8888 }),
    });
    sub.anchor.set(0.5, 0);
    sub.position.set(sw / 2, 64);
    this.container.addChild(sub);

    // Hero class + difficulty
    const diffLabel = state.difficulty === "hard" ? " [Hard]" : state.difficulty === "endless" ? " [Endless]" : "";
    const ngLabel = state.ngPlusLevel > 0 ? ` NG+${state.ngPlusLevel}` : "";
    const heroText = new Text({
      text: `${state.player.heroClass.name} Lv.${state.player.level}${diffLabel}${ngLabel}`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: state.player.heroClass.color }),
    });
    heroText.anchor.set(0.5, 0);
    heroText.position.set(sw / 2, 84);
    this.container.addChild(heroText);

    // Score panel
    const panelW = 380;
    const panelX = sw / 2 - panelW / 2;
    let panelY = 106;
    const panelG = new Graphics();
    panelG.roundRect(panelX, panelY, panelW, 200, 6).fill({ color: 0x0a0a1e, alpha: 0.8 });
    panelG.roundRect(panelX, panelY, panelW, 200, 6).stroke({ color: accentColor, width: 1, alpha: 0.25 });
    drawOrnamentCorner(panelG, panelX + 4, panelY + 4, 10, accentColor);
    drawOrnamentCorner(panelG, panelX + panelW - 4, panelY + 4, 10, accentColor, true);
    drawOrnamentCorner(panelG, panelX + 4, panelY + 196, 10, accentColor, false, true);
    drawOrnamentCorner(panelG, panelX + panelW - 4, panelY + 196, 10, accentColor, true, true);
    this.container.addChild(panelG);

    // Score breakdown
    const cargoValue = state.cargo.reduce((sum, c) => sum + c.good.basePrice * c.quantity, 0);
    const segmentScore = state.segmentsCompleted * 200;
    const killScore = state.totalKills * 5;
    const tradeScore = state.totalTradeProfit;
    const goldScore = state.gold;
    const victoryBonus = isVictory ? 500 : 0;
    const totalScore = segmentScore + killScore + tradeScore + goldScore + cargoValue + victoryBonus;

    const breakdown = [
      { label: "Segments completed", value: `${state.segmentsCompleted}/${state.totalSegments}`, score: segmentScore },
      { label: "Enemies slain", value: `${state.totalKills}`, score: killScore },
      { label: "Trade profit", value: `${state.totalTradeProfit}g`, score: tradeScore },
      { label: "Gold on hand", value: `${state.gold}g`, score: goldScore },
      { label: "Cargo value", value: `${cargoValue}g`, score: cargoValue },
    ];
    if (isVictory) breakdown.push({ label: "Delivery bonus", value: "", score: victoryBonus });

    let y = panelY + 12;
    for (const item of breakdown) {
      const label = new Text({
        text: item.label,
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0xaaaaaa }),
      });
      label.position.set(panelX + 16, y);
      this.container.addChild(label);

      const val = new Text({
        text: item.value,
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0xcccccc }),
      });
      val.anchor.set(1, 0);
      val.position.set(panelX + panelW - 80, y);
      this.container.addChild(val);

      const score = new Text({
        text: `+${item.score}`,
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: accentColor }),
      });
      score.anchor.set(1, 0);
      score.position.set(panelX + panelW - 16, y);
      this.container.addChild(score);

      y += 20;
    }

    // Separator
    y += 4;
    panelG.moveTo(panelX + 20, y).lineTo(panelX + panelW - 20, y)
      .stroke({ color: accentColor, width: 0.5, alpha: 0.3 });
    // Diamond separator
    const scx = sw / 2;
    panelG.moveTo(scx - 5, y).lineTo(scx, y - 4).lineTo(scx + 5, y).lineTo(scx, y + 4).closePath()
      .fill({ color: accentColor, alpha: 0.3 });
    y += 12;

    // Total score
    const scoreLabel = new Text({
      text: "FINAL SCORE",
      style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0x888899, letterSpacing: 2 }),
    });
    scoreLabel.anchor.set(0.5, 0);
    scoreLabel.position.set(sw / 2, y);
    this.container.addChild(scoreLabel);
    y += 18;

    const scoreValue = new Text({
      text: `${totalScore}`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 28, fill: accentColor, fontWeight: "bold" }),
    });
    scoreValue.anchor.set(0.5, 0);
    scoreValue.position.set(sw / 2, y);
    this.container.addChild(scoreValue);

    // Relics
    if (state.relicIds.length > 0) {
      y = panelY + 210;
      const relicHeader = new Text({
        text: "Relics Collected",
        style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0x888899, letterSpacing: 1 }),
      });
      relicHeader.anchor.set(0.5, 0);
      relicHeader.position.set(sw / 2, y);
      this.container.addChild(relicHeader);
      y += 18;

      let relicX = sw / 2 - (state.relicIds.length * 32) / 2;
      for (const rid of state.relicIds) {
        const relic = RELIC_POOL.find((r) => r.id === rid);
        if (!relic) continue;
        const dot = new Graphics();
        dot.circle(relicX + 12, y + 8, 10).fill({ color: relic.color, alpha: 0.15 });
        dot.circle(relicX + 12, y + 8, 8).stroke({ color: relic.color, width: 1.5, alpha: 0.6 });
        dot.moveTo(relicX + 12, y + 2).lineTo(relicX + 17, y + 8)
          .lineTo(relicX + 12, y + 14).lineTo(relicX + 7, y + 8).closePath()
          .fill({ color: relic.color, alpha: 0.25 });
        this.container.addChild(dot);
        relicX += 32;
      }
    }

    // Buttons
    const btnY = sh - 70;
    if (onNgPlus) {
      // Victory: show 3 buttons
      this.container.addChild(this._makeButton(sw / 2 - 180, btnY, "New Journey", 0x224466, accentColor, onRestart));
      this.container.addChild(this._makeButton(sw / 2 - 55, btnY, "New Game+", 0x442244, 0xff88ff, onNgPlus));
      this.container.addChild(this._makeButton(sw / 2 + 70, btnY, "Quit", 0x442222, 0xff8888, onQuit));
    } else {
      this.container.addChild(this._makeButton(sw / 2 - 130, btnY, "New Journey", 0x224466, accentColor, onRestart));
      this.container.addChild(this._makeButton(sw / 2 + 20, btnY, "Quit", 0x442222, 0xff8888, onQuit));
    }
  }

  hide(): void {
    this.container.removeChildren();
  }

  private _makeButton(x: number, y: number, label: string, bgColor: number, borderColor: number, onClick: () => void): Container {
    const c = new Container();
    const bg = new Graphics()
      .roundRect(0, 0, 110, 34, 5).fill({ color: bgColor })
      .roundRect(0, 0, 110, 34, 5).stroke({ color: borderColor, width: 1, alpha: 0.4 });
    const text = new Text({
      text: label,
      style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0xffffff, fontWeight: "bold" }),
    });
    text.anchor.set(0.5, 0.5);
    text.position.set(55, 17);
    c.addChild(bg, text);
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = "pointer";
    c.on("pointerdown", onClick);
    return c;
  }
}
