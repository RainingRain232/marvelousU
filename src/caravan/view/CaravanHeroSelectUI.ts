// ---------------------------------------------------------------------------
// Caravan hero select — medieval-styled character cards
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle, AnimatedSprite } from "pixi.js";
import { UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";
import { HERO_CLASSES } from "../config/CaravanHeroDefs";
import type { HeroClassDef } from "../config/CaravanHeroDefs";

// Shared UI helpers
function drawOrnamentCorner(g: Graphics, x: number, y: number, size: number, color: number, flipX = false, flipY = false): void {
  const sx = flipX ? -1 : 1;
  const sy = flipY ? -1 : 1;
  g.moveTo(x, y).lineTo(x + size * sx, y).stroke({ color, width: 1.5, alpha: 0.5 });
  g.moveTo(x, y).lineTo(x, y + size * sy).stroke({ color, width: 1.5, alpha: 0.5 });
  g.circle(x + 3 * sx, y + 3 * sy, 1.5).fill({ color, alpha: 0.4 });
}

function drawDivider(g: Graphics, x: number, y: number, w: number, color: number): void {
  g.moveTo(x, y).lineTo(x + w, y).stroke({ color, width: 0.5, alpha: 0.3 });
  // Center diamond
  const cx = x + w / 2;
  g.moveTo(cx - 4, y).lineTo(cx, y - 3).lineTo(cx + 4, y).lineTo(cx, y + 3).closePath()
    .fill({ color, alpha: 0.3 });
}

export type CaravanDifficulty = "normal" | "hard" | "endless";

export class CaravanHeroSelectUI {
  readonly container = new Container();
  private _selectCallback: ((heroClass: HeroClassDef, difficulty: CaravanDifficulty) => void) | null = null;
  private _difficulty: CaravanDifficulty = "normal";
  private _ngPlusLevel = 0;

  setSelectCallback(cb: (heroClass: HeroClassDef, difficulty: CaravanDifficulty) => void): void {
    this._selectCallback = cb;
  }

  setNgPlusLevel(level: number): void {
    this._ngPlusLevel = level;
  }

  show(sw: number, sh: number): void {
    this.container.removeChildren();

    // Background with radial gradient effect
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x060612 });
    // Subtle radial glow
    bg.circle(sw / 2, sh * 0.4, sh * 0.6).fill({ color: 0x111133, alpha: 0.4 });
    bg.circle(sw / 2, sh * 0.4, sh * 0.35).fill({ color: 0x151540, alpha: 0.3 });
    // Top and bottom borders
    bg.rect(0, 0, sw, 3).fill({ color: 0xffd700, alpha: 0.15 });
    bg.rect(0, sh - 3, sw, 3).fill({ color: 0xffd700, alpha: 0.15 });
    this.container.addChild(bg);

    // Title banner
    const bannerG = new Graphics();
    bannerG.roundRect(sw / 2 - 200, 12, 400, 42, 4).fill({ color: 0x111128, alpha: 0.8 });
    bannerG.roundRect(sw / 2 - 200, 12, 400, 42, 4).stroke({ color: 0xffd700, width: 1, alpha: 0.3 });
    drawDivider(bannerG, sw / 2 - 180, 52, 360, 0xffd700);
    this.container.addChild(bannerG);

    const title = new Text({
      text: "Choose Your Champion",
      style: new TextStyle({ fontFamily: "serif", fontSize: 26, fill: 0xffd700, fontWeight: "bold" }),
    });
    title.anchor.set(0.5, 0);
    title.position.set(sw / 2, 18);
    this.container.addChild(title);

    const subtitle = new Text({
      text: "Escort a merchant caravan across dangerous lands",
      style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0x888899, letterSpacing: 1 }),
    });
    subtitle.anchor.set(0.5, 0);
    subtitle.position.set(sw / 2, 58);
    this.container.addChild(subtitle);

    // NG+ indicator
    if (this._ngPlusLevel > 0) {
      const ngText = new Text({
        text: `New Game+ ${this._ngPlusLevel} — enemies +${this._ngPlusLevel * 25}% stats`,
        style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: 0xff8844 }),
      });
      ngText.anchor.set(0.5, 0);
      ngText.position.set(sw / 2, 72);
      this.container.addChild(ngText);
    }

    // Difficulty selector
    const diffOptions: { id: CaravanDifficulty; label: string; desc: string; color: number }[] = [
      { id: "normal", label: "Normal", desc: "Standard journey", color: 0x44aa66 },
      { id: "hard", label: "Hard", desc: "Enemies +50% stats", color: 0xcc6633 },
      { id: "endless", label: "Endless", desc: "Infinite segments", color: 0xaa44cc },
    ];
    const diffY = this._ngPlusLevel > 0 ? 86 : 74;
    const diffTotalW = diffOptions.length * 90 + (diffOptions.length - 1) * 8;
    const diffStartX = (sw - diffTotalW) / 2;
    for (let d = 0; d < diffOptions.length; d++) {
      const opt = diffOptions[d];
      const dx = diffStartX + d * 98;
      const selected = this._difficulty === opt.id;
      const btn = new Graphics();
      btn.roundRect(dx, diffY, 86, 22, 4).fill({ color: selected ? opt.color : 0x111122, alpha: selected ? 0.25 : 0.6 });
      btn.roundRect(dx, diffY, 86, 22, 4).stroke({ color: opt.color, width: selected ? 1.5 : 0.5, alpha: selected ? 0.8 : 0.3 });
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.on("pointerdown", () => {
        this._difficulty = opt.id;
        this.show(sw, sh);
      });
      this.container.addChild(btn);
      const label = new Text({
        text: opt.label,
        style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: selected ? opt.color : 0x888899, fontWeight: selected ? "bold" : "normal" }),
      });
      label.anchor.set(0.5, 0.5);
      label.position.set(dx + 43, diffY + 11);
      this.container.addChild(label);
    }

    // Hero cards
    const cardW = 215;
    const cardH = sh - 130;
    const gap = 14;
    const totalW = HERO_CLASSES.length * cardW + (HERO_CLASSES.length - 1) * gap;
    const startX = (sw - totalW) / 2;

    for (let i = 0; i < HERO_CLASSES.length; i++) {
      const hero = HERO_CLASSES[i];
      const cx = startX + i * (cardW + gap);
      const cy = 80;

      // Card background with inner glow
      const card = new Graphics();
      card.roundRect(cx, cy, cardW, cardH, 6).fill({ color: 0x0e0e22 });
      // Inner gradient effect
      card.roundRect(cx + 2, cy + 2, cardW - 4, 50, 4).fill({ color: hero.color, alpha: 0.06 });
      // Border
      card.roundRect(cx, cy, cardW, cardH, 6).stroke({ color: hero.color, width: 1.5, alpha: 0.4 });
      // Ornament corners
      drawOrnamentCorner(card, cx + 4, cy + 4, 12, hero.color);
      drawOrnamentCorner(card, cx + cardW - 4, cy + 4, 12, hero.color, true);
      drawOrnamentCorner(card, cx + 4, cy + cardH - 4, 12, hero.color, false, true);
      drawOrnamentCorner(card, cx + cardW - 4, cy + cardH - 4, 12, hero.color, true, true);

      card.eventMode = "static";
      card.cursor = "pointer";
      card.on("pointerover", () => {
        card.clear();
        card.roundRect(cx, cy, cardW, cardH, 6).fill({ color: 0x12122a });
        card.roundRect(cx + 2, cy + 2, cardW - 4, 50, 4).fill({ color: hero.color, alpha: 0.1 });
        card.roundRect(cx, cy, cardW, cardH, 6).stroke({ color: hero.color, width: 2, alpha: 0.7 });
        // Glow border
        card.roundRect(cx - 1, cy - 1, cardW + 2, cardH + 2, 7).stroke({ color: hero.color, width: 1, alpha: 0.2 });
        drawOrnamentCorner(card, cx + 4, cy + 4, 12, hero.color);
        drawOrnamentCorner(card, cx + cardW - 4, cy + 4, 12, hero.color, true);
        drawOrnamentCorner(card, cx + 4, cy + cardH - 4, 12, hero.color, false, true);
        drawOrnamentCorner(card, cx + cardW - 4, cy + cardH - 4, 12, hero.color, true, true);
      });
      card.on("pointerout", () => {
        card.clear();
        card.roundRect(cx, cy, cardW, cardH, 6).fill({ color: 0x0e0e22 });
        card.roundRect(cx + 2, cy + 2, cardW - 4, 50, 4).fill({ color: hero.color, alpha: 0.06 });
        card.roundRect(cx, cy, cardW, cardH, 6).stroke({ color: hero.color, width: 1.5, alpha: 0.4 });
        drawOrnamentCorner(card, cx + 4, cy + 4, 12, hero.color);
        drawOrnamentCorner(card, cx + cardW - 4, cy + 4, 12, hero.color, true);
        drawOrnamentCorner(card, cx + 4, cy + cardH - 4, 12, hero.color, false, true);
        drawOrnamentCorner(card, cx + cardW - 4, cy + cardH - 4, 12, hero.color, true, true);
      });
      card.on("pointerdown", () => { this._selectCallback?.(hero, this._difficulty); });
      this.container.addChild(card);

      let y = cy + 10;

      // Class name
      const name = new Text({
        text: hero.name,
        style: new TextStyle({ fontFamily: "serif", fontSize: 19, fill: hero.color, fontWeight: "bold" }),
      });
      name.anchor.set(0.5, 0);
      name.position.set(cx + cardW / 2, y);
      this.container.addChild(name);
      y += 26;

      // Animated sprite preview with glow platform
      const previewBg = new Graphics();
      previewBg.ellipse(cx + cardW / 2, y + 32, 32, 10).fill({ color: hero.color, alpha: 0.08 });
      previewBg.ellipse(cx + cardW / 2, y + 32, 24, 7).fill({ color: hero.color, alpha: 0.05 });
      this.container.addChild(previewBg);

      const previewFrames = animationManager.getFrames(hero.unitType, UnitState.IDLE);
      if (previewFrames.length > 0) {
        const preview = new AnimatedSprite(previewFrames);
        preview.animationSpeed = 0.1;
        preview.play();
        preview.anchor.set(0.5, 0.75);
        preview.scale.set(2.2);
        preview.position.set(cx + cardW / 2, y + 28);
        this.container.addChild(preview);
      }
      y += 48;

      // Divider
      const divG = new Graphics();
      drawDivider(divG, cx + 15, y, cardW - 30, hero.color);
      this.container.addChild(divG);
      y += 10;

      // Description
      const desc = new Text({
        text: hero.description,
        style: new TextStyle({ fontFamily: "serif", fontSize: 10, fill: 0x999999, wordWrap: true, wordWrapWidth: cardW - 24 }),
      });
      desc.position.set(cx + 12, y);
      this.container.addChild(desc);
      y += 30;

      // Stats with icons
      const statItems = [
        { icon: "\u2764", label: "HP", value: `${hero.hp}`, color: 0xff6666 },
        { icon: "\u2694", label: "ATK", value: `${hero.atk}`, color: 0xffaa44 },
        { icon: "\u27A4", label: "SPD", value: `${hero.speed}`, color: 0x44ccff },
        { icon: "\u25CE", label: "RNG", value: `${hero.range}`, color: 0x88ff88 },
      ];
      for (const stat of statItems) {
        const row = new Text({
          text: `${stat.icon} ${stat.label}: ${stat.value}`,
          style: new TextStyle({ fontFamily: "serif", fontSize: 11, fill: stat.color }),
        });
        row.position.set(cx + 14, y);
        this.container.addChild(row);
        y += 15;
      }
      y += 6;

      // Abilities section
      const abDivG = new Graphics();
      drawDivider(abDivG, cx + 15, y, cardW - 30, hero.color);
      this.container.addChild(abDivG);
      y += 8;

      const abHeader = new Text({
        text: "Abilities",
        style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: 0xffd700 }),
      });
      abHeader.position.set(cx + 14, y);
      this.container.addChild(abHeader);
      y += 18;

      for (const ab of hero.abilities) {
        // Key badge with ornamental feel
        const badge = new Graphics();
        badge.roundRect(cx + 12, y, 24, 20, 3).fill({ color: ab.color, alpha: 0.15 });
        badge.roundRect(cx + 12, y, 24, 20, 3).stroke({ color: ab.color, width: 1, alpha: 0.6 });
        this.container.addChild(badge);

        const keyText = new Text({
          text: ab.key,
          style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: 0xffffff, fontWeight: "bold" }),
        });
        keyText.anchor.set(0.5, 0.5);
        keyText.position.set(cx + 24, y + 10);
        this.container.addChild(keyText);

        const abName = new Text({
          text: ab.name,
          style: new TextStyle({ fontFamily: "serif", fontSize: 12, fill: ab.color }),
        });
        abName.position.set(cx + 42, y);
        this.container.addChild(abName);

        const abDesc = new Text({
          text: ab.description,
          style: new TextStyle({ fontFamily: "serif", fontSize: 9, fill: 0x777788, wordWrap: true, wordWrapWidth: cardW - 56 }),
        });
        abDesc.position.set(cx + 42, y + 14);
        this.container.addChild(abDesc);

        y += 34;
      }

      // Select button at bottom of card
      const btnY = cy + cardH - 36;
      const btn = new Graphics();
      btn.roundRect(cx + 20, btnY, cardW - 40, 28, 4).fill({ color: hero.color, alpha: 0.12 });
      btn.roundRect(cx + 20, btnY, cardW - 40, 28, 4).stroke({ color: hero.color, width: 1, alpha: 0.5 });
      this.container.addChild(btn);
      const btnText = new Text({
        text: "Select",
        style: new TextStyle({ fontFamily: "serif", fontSize: 13, fill: hero.color, fontWeight: "bold" }),
      });
      btnText.anchor.set(0.5, 0.5);
      btnText.position.set(cx + cardW / 2, btnY + 14);
      this.container.addChild(btnText);
    }
  }

  hide(): void {
    this.container.removeChildren();
  }
}
