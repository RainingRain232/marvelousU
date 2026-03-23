// ---------------------------------------------------------------------------
// Round Table – HUD (polished top bar with gradients, purity glow, relics)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import { RTRunState } from "../types";
import { KNIGHT_DEFS } from "../config/RoundTableKnights";
import { getRelicDef } from "../config/RoundTableRelics";

const HUD_H = 48;

const mkS = (size: number, fill: number, bold = false): TextStyle =>
  new TextStyle({
    fontFamily: "monospace", fontSize: size, fill, fontWeight: bold ? "bold" : "normal",
    dropShadow: { color: 0x000000, blur: 2, distance: 0, alpha: 0.6 },
  });

export class RoundTableHUD {
  container = new Container();
  onPause: (() => void) | null = null;
  private _bg = new Graphics();

  build(sw: number): void {
    this.container.removeChildren();

    // ── Background panel ──
    this._bg = new Graphics();
    this._bg.rect(0, 0, sw, HUD_H);
    this._bg.fill({ color: 0x0a0a16, alpha: 0.92 });
    // Subtle gradient band
    this._bg.rect(0, HUD_H - 2, sw, 2);
    this._bg.fill({ color: 0x2a2a4a, alpha: 0.5 });
    // Top highlight
    this._bg.rect(0, 0, sw, 1);
    this._bg.fill({ color: 0x333355, alpha: 0.4 });
    this.container.addChild(this._bg);
  }

  update(run: RTRunState, sw: number): void {
    while (this.container.children.length > 1) {
      this.container.removeChildAt(this.container.children.length - 1);
    }

    const knight = KNIGHT_DEFS[run.knightId];
    const cy = HUD_H / 2;

    // ── Knight name with colored accent ──
    const accentBar = new Graphics();
    accentBar.rect(0, 0, 4, HUD_H);
    accentBar.fill({ color: knight.color });
    this.container.addChild(accentBar);

    const nameTxt = new Text({ text: knight.name.toUpperCase(), style: mkS(12, knight.color, true) });
    nameTxt.position.set(12, 6);
    this.container.addChild(nameTxt);

    // ── HP bar ──
    const hpX = 120;
    const hpW = 120;
    const hpH = 12;
    const hpY = cy - hpH / 2;
    const hpFrac = Math.max(0, run.hp / run.maxHp);

    const hpBg = new Graphics();
    hpBg.roundRect(hpX, hpY, hpW, hpH, 3);
    hpBg.fill({ color: 0x220808, alpha: 0.9 });
    hpBg.roundRect(hpX, hpY, hpW, hpH, 3);
    hpBg.stroke({ color: 0x441111, width: 0.8 });
    this.container.addChild(hpBg);

    if (hpFrac > 0) {
      const hpColor = hpFrac > 0.5 ? 0xcc2222 : hpFrac > 0.25 ? 0xccaa22 : 0xff2222;
      const hpFill = new Graphics();
      hpFill.roundRect(hpX + 1, hpY + 1, (hpW - 2) * hpFrac, hpH - 2, 2);
      hpFill.fill({ color: hpColor });
      // Shine
      hpFill.roundRect(hpX + 2, hpY + 2, (hpW - 4) * hpFrac, 3, 1);
      hpFill.fill({ color: 0xffffff, alpha: 0.1 });
      this.container.addChild(hpFill);
    }

    const hpTxt = new Text({ text: `${run.hp}/${run.maxHp}`, style: mkS(9, 0xffcccc, true) });
    hpTxt.anchor.set(0.5, 0.5);
    hpTxt.position.set(hpX + hpW / 2, cy);
    this.container.addChild(hpTxt);

    // HP icon (detailed heart with highlight + outline)
    const heart = new Graphics();
    const hx = hpX - 7;
    const hy = cy;
    // Outer glow
    heart.moveTo(hx, hy - 2);
    heart.quadraticCurveTo(hx - 8, hy - 10, hx - 12, hy - 3);
    heart.quadraticCurveTo(hx - 13, hy + 4, hx, hy + 9);
    heart.quadraticCurveTo(hx + 13, hy + 4, hx + 12, hy - 3);
    heart.quadraticCurveTo(hx + 8, hy - 10, hx, hy - 2);
    heart.closePath();
    heart.fill({ color: 0xff2222, alpha: 0.15 });
    // Main heart shape (bezier curves for smooth lobes)
    heart.moveTo(hx, hy - 1);
    heart.quadraticCurveTo(hx - 6, hy - 9, hx - 10, hy - 2);
    heart.quadraticCurveTo(hx - 11, hy + 3, hx, hy + 7);
    heart.quadraticCurveTo(hx + 11, hy + 3, hx + 10, hy - 2);
    heart.quadraticCurveTo(hx + 6, hy - 9, hx, hy - 1);
    heart.closePath();
    heart.fill({ color: 0xcc2222 });
    // Outline
    heart.moveTo(hx, hy - 1);
    heart.quadraticCurveTo(hx - 6, hy - 9, hx - 10, hy - 2);
    heart.quadraticCurveTo(hx - 11, hy + 3, hx, hy + 7);
    heart.quadraticCurveTo(hx + 11, hy + 3, hx + 10, hy - 2);
    heart.quadraticCurveTo(hx + 6, hy - 9, hx, hy - 1);
    heart.stroke({ color: 0xee4444, width: 0.8 });
    // Highlight (upper-left lobe shine)
    heart.moveTo(hx - 4, hy - 3);
    heart.quadraticCurveTo(hx - 7, hy - 6, hx - 8, hy - 2);
    heart.stroke({ color: 0xff8888, width: 1.2, alpha: 0.5 });
    this.container.addChild(heart);

    // ── Gold ──
    const goldX = 260;
    const goldIcon = new Graphics();
    goldIcon.circle(goldX, cy, 6);
    goldIcon.fill({ color: 0xffd700 });
    goldIcon.circle(goldX, cy, 6);
    goldIcon.stroke({ color: 0xffee88, width: 0.8 });
    this.container.addChild(goldIcon);
    const goldTxt = new Text({ text: `${run.gold}`, style: mkS(12, 0xffd700, true) });
    goldTxt.position.set(goldX + 10, 6);
    this.container.addChild(goldTxt);

    // ── Purity meter ──
    const purX = 340;
    const purW = 80;
    const purH = 10;
    const purY = cy - purH / 2 + 6;
    const purityFrac = run.purity / 100;
    const purityColor = run.purity >= 75 ? 0xffdd44 : run.purity <= 25 ? 0x8800cc : 0x888888;

    const purLabel = new Text({ text: "PURITY", style: mkS(7, 0x777799) });
    purLabel.position.set(purX, 2);
    this.container.addChild(purLabel);

    const purBg = new Graphics();
    purBg.roundRect(purX, purY, purW, purH, 3);
    purBg.fill({ color: 0x111122, alpha: 0.9 });
    purBg.roundRect(purX, purY, purW, purH, 3);
    purBg.stroke({ color: 0x333344, width: 0.6 });
    this.container.addChild(purBg);

    const purFill = new Graphics();
    purFill.roundRect(purX + 1, purY + 1, (purW - 2) * purityFrac, purH - 2, 2);
    purFill.fill({ color: purityColor, alpha: 0.8 });
    this.container.addChild(purFill);

    // Purity glow (if at threshold — animated pulse)
    if (run.purity >= 75 || run.purity <= 25) {
      const purGlow = new Graphics();
      purGlow.roundRect(purX - 3, purY - 3, purW + 6, purH + 6, 6);
      purGlow.fill({ color: purityColor, alpha: 0.12 });
      purGlow.roundRect(purX - 6, purY - 6, purW + 12, purH + 12, 8);
      purGlow.fill({ color: purityColor, alpha: 0.05 });
      this.container.addChild(purGlow);
      gsap.to(purGlow, { alpha: 0.3, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }

    const purNum = new Text({ text: `${run.purity}`, style: mkS(9, purityColor, true) });
    purNum.anchor.set(0.5, 0.5);
    purNum.position.set(purX + purW / 2, purY + purH / 2);
    this.container.addChild(purNum);

    // HP warning pulse when low
    if (hpFrac > 0 && hpFrac <= 0.25) {
      gsap.to(heart, { alpha: 0.4, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
    }

    // ── Act / Floor ──
    const floorTxt = new Text({ text: `Act ${run.act}  Floor ${run.floor}`, style: mkS(10, 0x8888aa) });
    floorTxt.position.set(440, cy - 6);
    this.container.addChild(floorTxt);

    // ── Score + Deck ──
    const scoreTxt = new Text({ text: `Score ${run.score}`, style: mkS(9, 0x888866) });
    scoreTxt.position.set(540, 4);
    this.container.addChild(scoreTxt);
    const deckTxt = new Text({ text: `Deck ${run.deck.length}`, style: mkS(9, 0x8888aa) });
    deckTxt.position.set(540, 18);
    this.container.addChild(deckTxt);

    // ── Relics (compact icons with hover tooltip) ──
    let rx = 640;
    for (const relicId of run.relics) {
      try {
        const rd = getRelicDef(relicId);
        const relicC = new Container();
        relicC.position.set(rx, 8);
        const rGfx = new Graphics();
        rGfx.roundRect(0, 0, 22, 22, 4);
        rGfx.fill({ color: 0x1a1a2a, alpha: 0.85 });
        rGfx.roundRect(0, 0, 22, 22, 4);
        rGfx.stroke({ color: 0x555577, width: 0.8 });
        relicC.addChild(rGfx);
        const rTxt = new Text({ text: rd.name.charAt(0).toUpperCase(), style: mkS(10, 0xffaa44, true) });
        rTxt.anchor.set(0.5);
        rTxt.position.set(11, 11);
        relicC.addChild(rTxt);

        // Hover tooltip
        relicC.eventMode = "static";
        relicC.cursor = "pointer";
        relicC.on("pointerover", () => {
          // Remove old tooltip
          const old = this.container.getChildByLabel("relic_tooltip");
          if (old) this.container.removeChild(old);
          // Create tooltip
          const tip = new Container();
          tip.label = "relic_tooltip";
          const tipW = 220;
          const tipH = 52;
          const tipX = Math.min(rx, sw - tipW - 8);
          tip.position.set(tipX, HUD_H + 4);
          const tipBg = new Graphics();
          tipBg.roundRect(0, 0, tipW, tipH, 6);
          tipBg.fill({ color: 0x0c0c1a, alpha: 0.95 });
          tipBg.roundRect(0, 0, tipW, tipH, 6);
          tipBg.stroke({ color: 0x555577, width: 1 });
          tip.addChild(tipBg);
          const tipName = new Text({ text: rd.name, style: mkS(10, 0xffaa44, true) });
          tipName.position.set(8, 6);
          tip.addChild(tipName);
          const tipDesc = new Text({ text: rd.description, style: new TextStyle({
            fontFamily: "monospace", fontSize: 8, fill: 0xaaaaaa, wordWrap: true, wordWrapWidth: tipW - 16,
          })});
          tipDesc.position.set(8, 22);
          tip.addChild(tipDesc);
          this.container.addChild(tip);
        });
        relicC.on("pointerout", () => {
          const old = this.container.getChildByLabel("relic_tooltip");
          if (old) this.container.removeChild(old);
        });

        this.container.addChild(relicC);
        rx += 24;
      } catch { /* skip unknown */ }
    }

    // ── Ascension badge ──
    if (run.ascension > 0) {
      const ascBg = new Graphics();
      ascBg.roundRect(sw - 92, 12, 36, 22, 4);
      ascBg.fill({ color: 0x2a0a0a, alpha: 0.9 });
      ascBg.roundRect(sw - 92, 12, 36, 22, 4);
      ascBg.stroke({ color: 0xff4444, width: 0.8 });
      this.container.addChild(ascBg);
      const ascTxt = new Text({ text: `A${run.ascension}`, style: mkS(10, 0xff4444, true) });
      ascTxt.anchor.set(0.5);
      ascTxt.position.set(sw - 74, 23);
      this.container.addChild(ascTxt);
    }

    // ── Pause/Menu button ──
    const menuBtnC = new Container();
    menuBtnC.position.set(sw - 46, 12);
    const menuBtnBg = new Graphics();
    menuBtnBg.roundRect(0, 0, 36, 22, 4);
    menuBtnBg.fill({ color: 0x1a1a2a, alpha: 0.85 });
    menuBtnBg.roundRect(0, 0, 36, 22, 4);
    menuBtnBg.stroke({ color: 0x555577, width: 0.8 });
    menuBtnC.addChild(menuBtnBg);
    const menuBtnTxt = new Text({ text: "\u2261", style: mkS(14, 0xaaaacc, true) });
    menuBtnTxt.anchor.set(0.5);
    menuBtnTxt.position.set(18, 11);
    menuBtnC.addChild(menuBtnTxt);
    menuBtnC.eventMode = "static";
    menuBtnC.cursor = "pointer";
    menuBtnC.on("pointerdown", () => this.onPause?.());
    this.container.addChild(menuBtnC);
  }

  destroy(): void {
    this.container.removeChildren();
  }
}
