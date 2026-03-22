// ---------------------------------------------------------------------------
// Caravan relic choice — pick 1 of 3 rewards, medieval styled
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { RelicDef } from "../config/CaravanRelicDefs";

function drawOrnamentCorner(g: Graphics, x: number, y: number, size: number, color: number, flipX = false, flipY = false): void {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  g.moveTo(x, y).lineTo(x + size * sx, y).stroke({ color, width: 1.5, alpha: 0.5 });
  g.moveTo(x, y).lineTo(x, y + size * sy).stroke({ color, width: 1.5, alpha: 0.5 });
  g.circle(x + 3 * sx, y + 3 * sy, 1.5).fill({ color, alpha: 0.4 });
}

export class CaravanRelicUI {
  readonly container = new Container();
  private _chooseCallback: ((relic: RelicDef) => void) | null = null;

  setChooseCallback(cb: (relic: RelicDef) => void): void {
    this._chooseCallback = cb;
  }

  show(choices: RelicDef[], segmentNum: number, sw: number, sh: number): void {
    this.container.removeChildren();

    // Background with radial glow
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x040410, alpha: 0.92 });
    bg.circle(sw / 2, sh / 2, sh * 0.4).fill({ color: 0x151530, alpha: 0.4 });
    bg.circle(sw / 2, sh / 2, sh * 0.25).fill({ color: 0x1a1a40, alpha: 0.3 });
    // Gold top/bottom accents
    bg.rect(0, 0, sw, 2).fill({ color: 0xffd700, alpha: 0.2 });
    bg.rect(0, sh - 2, sw, 2).fill({ color: 0xffd700, alpha: 0.2 });
    this.container.addChild(bg);

    // Title banner
    const bannerG = new Graphics();
    bannerG.roundRect(sw / 2 - 180, 25, 360, 36, 4).fill({ color: 0x111128, alpha: 0.8 });
    bannerG.roundRect(sw / 2 - 180, 25, 360, 36, 4).stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
    this.container.addChild(bannerG);

    const title = new Text({
      text: `Segment ${segmentNum} Complete!`,
      style: new TextStyle({ fontFamily: "serif", fontSize: 22, fill: 0xffd700, fontWeight: "bold" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 30);
    this.container.addChild(title);

    const subtitle = new Text({
      text: "Choose a Relic to Carry Forward",
      style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0x999999, letterSpacing: 1 }),
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(sw / 2, 68);
    this.container.addChild(subtitle);

    // Relic cards
    const cardW = 200;
    const cardH = 220;
    const gap = 28;
    const totalW = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (sw - totalW) / 2;
    const cardY = sh / 2 - cardH / 2 - 10;

    for (let i = 0; i < choices.length; i++) {
      const relic = choices[i];
      const cx = startX + i * (cardW + gap);

      // Card with inner glow
      const card = new Graphics();
      card.roundRect(cx, cardY, cardW, cardH, 8).fill({ color: 0x0e0e22 });
      // Top glow
      card.roundRect(cx + 2, cardY + 2, cardW - 4, 40, 6).fill({ color: relic.color, alpha: 0.06 });
      card.roundRect(cx, cardY, cardW, cardH, 8).stroke({ color: relic.color, width: 1.5, alpha: 0.5 });
      // Ornament corners
      drawOrnamentCorner(card, cx + 5, cardY + 5, 10, relic.color);
      drawOrnamentCorner(card, cx + cardW - 5, cardY + 5, 10, relic.color, true);
      drawOrnamentCorner(card, cx + 5, cardY + cardH - 5, 10, relic.color, false, true);
      drawOrnamentCorner(card, cx + cardW - 5, cardY + cardH - 5, 10, relic.color, true, true);

      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointerover", () => {
        card.clear();
        card.roundRect(cx, cardY, cardW, cardH, 8).fill({ color: 0x14142e });
        card.roundRect(cx + 2, cardY + 2, cardW - 4, 40, 6).fill({ color: relic.color, alpha: 0.1 });
        card.roundRect(cx, cardY, cardW, cardH, 8).stroke({ color: relic.color, width: 2, alpha: 0.8 });
        card.roundRect(cx - 1, cardY - 1, cardW + 2, cardH + 2, 9).stroke({ color: relic.color, width: 1, alpha: 0.2 });
        drawOrnamentCorner(card, cx + 5, cardY + 5, 10, relic.color);
        drawOrnamentCorner(card, cx + cardW - 5, cardY + 5, 10, relic.color, true);
        drawOrnamentCorner(card, cx + 5, cardY + cardH - 5, 10, relic.color, false, true);
        drawOrnamentCorner(card, cx + cardW - 5, cardY + cardH - 5, 10, relic.color, true, true);
      });
      card.on("pointerout", () => {
        card.clear();
        card.roundRect(cx, cardY, cardW, cardH, 8).fill({ color: 0x0e0e22 });
        card.roundRect(cx + 2, cardY + 2, cardW - 4, 40, 6).fill({ color: relic.color, alpha: 0.06 });
        card.roundRect(cx, cardY, cardW, cardH, 8).stroke({ color: relic.color, width: 1.5, alpha: 0.5 });
        drawOrnamentCorner(card, cx + 5, cardY + 5, 10, relic.color);
        drawOrnamentCorner(card, cx + cardW - 5, cardY + 5, 10, relic.color, true);
        drawOrnamentCorner(card, cx + 5, cardY + cardH - 5, 10, relic.color, false, true);
        drawOrnamentCorner(card, cx + cardW - 5, cardY + cardH - 5, 10, relic.color, true, true);
      });
      card.on("pointerdown", () => { this._chooseCallback?.(relic); });
      this.container.addChild(card);

      // Relic icon — glowing ring with inner diamond
      const iconCx = cx + cardW / 2;
      const iconCy = cardY + 42;
      const iconG = new Graphics();
      iconG.circle(iconCx, iconCy, 22).fill({ color: relic.color, alpha: 0.08 });
      iconG.circle(iconCx, iconCy, 18).stroke({ color: relic.color, width: 2, alpha: 0.6 });
      // Inner diamond shape
      iconG.moveTo(iconCx, iconCy - 10).lineTo(iconCx + 8, iconCy)
        .lineTo(iconCx, iconCy + 10).lineTo(iconCx - 8, iconCy).closePath()
        .fill({ color: relic.color, alpha: 0.25 });
      iconG.moveTo(iconCx, iconCy - 10).lineTo(iconCx + 8, iconCy)
        .lineTo(iconCx, iconCy + 10).lineTo(iconCx - 8, iconCy).closePath()
        .stroke({ color: relic.color, width: 1, alpha: 0.5 });
      this.container.addChild(iconG);

      // Relic name
      const name = new Text({
        text: relic.name,
        style: new TextStyle({ fontFamily: "serif", fontSize: 15, fill: relic.color, fontWeight: "bold" }),
      });
      name.anchor.set(0.5, 0);
      name.position.set(iconCx, cardY + 70);
      this.container.addChild(name);

      // Divider
      const divG = new Graphics();
      divG.moveTo(cx + 20, cardY + 92).lineTo(cx + cardW - 20, cardY + 92)
        .stroke({ color: relic.color, width: 0.5, alpha: 0.25 });
      this.container.addChild(divG);

      // Description
      const desc = new Text({
        text: relic.description,
        style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0xcccccc, wordWrap: true, wordWrapWidth: cardW - 30 }),
      });
      desc.anchor.set(0.5, 0);
      desc.position.set(iconCx, cardY + 102);
      this.container.addChild(desc);

      // Choose button
      const btnY = cardY + cardH - 42;
      const btn = new Graphics();
      btn.roundRect(cx + 30, btnY, cardW - 60, 30, 5).fill({ color: relic.color, alpha: 0.1 });
      btn.roundRect(cx + 30, btnY, cardW - 60, 30, 5).stroke({ color: relic.color, width: 1, alpha: 0.5 });
      this.container.addChild(btn);
      const btnText = new Text({
        text: "Choose",
        style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: relic.color, fontWeight: "bold" }),
      });
      btnText.anchor.set(0.5, 0.5);
      btnText.position.set(iconCx, btnY + 15);
      this.container.addChild(btnText);
    }
  }

  hide(): void {
    this.container.removeChildren();
  }
}
