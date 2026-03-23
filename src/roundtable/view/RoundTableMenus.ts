// ---------------------------------------------------------------------------
// Round Table – Menu Screens (polished with atmospheric backgrounds, GSAP)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import gsap from "gsap";
import {
  RTRunState, KnightId, CardInstance,
} from "../types";
import { KNIGHT_DEFS, ALL_KNIGHT_IDS } from "../config/RoundTableKnights";
import { getCardDef, CARD_REGISTRY } from "../config/RoundTableCards";
import { getRelicDef } from "../config/RoundTableRelics";
import { getEventDef } from "../config/RoundTableEvents";
import { getPotionDef } from "../config/RoundTablePotions";
import { RoundTableMetaSystem } from "../systems/RoundTableMetaSystem";
import { hasSavedRun, getRunHistory } from "../state/RoundTableState";

const W = 800;
const H = 600;

// ── Shared helpers ─────────────────────────────────────────────────────────

const mkS = (size: number, fill: number, bold = false, wrap = 0): TextStyle =>
  new TextStyle({
    fontFamily: "monospace", fontSize: size, fill, fontWeight: bold ? "bold" : "normal",
    ...(wrap > 0 ? { wordWrap: true, wordWrapWidth: wrap } : {}),
    dropShadow: { color: 0x000000, blur: 2, distance: 1, alpha: 0.6 },
  });

function drawAtmosphericBg(parent: Container): void {
  const bg = new Graphics();
  // Dark gradient
  for (let i = 0; i < 10; i++) {
    const frac = i / 10;
    const c = Math.round(10 + frac * 16);
    bg.rect(0, frac * H, W, H / 10 + 1);
    bg.fill({ color: (c << 16) | (c << 8) | (c + 10) });
  }
  // Vignette
  bg.rect(0, 0, W, 40);
  bg.fill({ color: 0x000000, alpha: 0.3 });
  bg.rect(0, H - 40, W, 40);
  bg.fill({ color: 0x000000, alpha: 0.3 });
  // Stars
  for (let i = 0; i < 30; i++) {
    bg.circle(Math.random() * W, Math.random() * H, 0.5 + Math.random() * 1.5);
    bg.fill({ color: 0xffffff, alpha: 0.04 + Math.random() * 0.08 });
  }
  parent.addChild(bg);
}

function makeBtn(text: string, x: number, y: number, w: number, h: number, color: number, borderColor: number, onClick: () => void): Container {
  const c = new Container();
  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 7);
  bg.fill({ color, alpha: 0.9 });
  // Highlight
  bg.roundRect(1, 1, w - 2, h * 0.35, 5);
  bg.fill({ color: 0xffffff, alpha: 0.06 });
  bg.roundRect(0, 0, w, h, 7);
  bg.stroke({ color: borderColor, width: 1.5 });
  c.addChild(bg);
  const t = new Text({ text, style: mkS(12, 0xffffff, true) });
  t.anchor.set(0.5);
  t.position.set(w / 2, h / 2);
  c.addChild(t);
  c.position.set(x, y);
  c.eventMode = "static";
  c.cursor = "pointer";
  c.on("pointerdown", onClick);
  c.on("pointerover", () => { c.scale.set(1.04); });
  c.on("pointerout", () => { c.scale.set(1.0); });
  return c;
}

// ═══════════════════════════════════════════════════════════════════════════
// KNIGHT SELECT
// ═══════════════════════════════════════════════════════════════════════════

export class KnightSelectScreen {
  container = new Container();
  onSelect: ((knightId: KnightId, ascension: number) => void) | null = null;
  onBack: (() => void) | null = null;
  onContinueRun: (() => void) | null = null;
  onCompendium: (() => void) | null = null;
  onHistory: (() => void) | null = null;
  onDaily: (() => void) | null = null;

  show(): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    // Title with decorative line
    const title = new Text({ text: "CHOOSE YOUR KNIGHT", style: mkS(24, 0xffd700, true) });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 24);
    this.container.addChild(title);

    const line = new Graphics();
    line.moveTo(W / 2 - 120, 56);
    line.lineTo(W / 2 + 120, 56);
    line.stroke({ color: 0xffd700, width: 1, alpha: 0.4 });
    // End diamonds
    line.moveTo(W / 2 - 124, 56); line.lineTo(W / 2 - 120, 52); line.lineTo(W / 2 - 116, 56); line.lineTo(W / 2 - 120, 60); line.closePath();
    line.fill({ color: 0xffd700, alpha: 0.5 });
    line.moveTo(W / 2 + 116, 56); line.lineTo(W / 2 + 120, 52); line.lineTo(W / 2 + 124, 56); line.lineTo(W / 2 + 120, 60); line.closePath();
    line.fill({ color: 0xffd700, alpha: 0.5 });
    this.container.addChild(line);

    const meta = RoundTableMetaSystem.getMeta();
    const cardW = 140;
    const cardH = 340;
    const spacing = 150;
    const startX = (W - spacing * ALL_KNIGHT_IDS.length) / 2 + spacing / 2;

    for (let i = 0; i < ALL_KNIGHT_IDS.length; i++) {
      const kid = ALL_KNIGHT_IDS[i];
      const knight = KNIGHT_DEFS[kid];
      const unlocked = meta.unlockedKnights.includes(kid);
      const maxAsc = meta.ascensionPerKnight[kid] ?? 0;

      const card = new Container();
      card.position.set(startX + i * spacing - cardW / 2, 75);

      // Card bg
      const cbg = new Graphics();
      cbg.roundRect(0, 0, cardW, cardH, 10);
      cbg.fill({ color: unlocked ? 0x0c0c1a : 0x111111, alpha: 0.95 });
      // Color accent top
      if (unlocked) {
        cbg.roundRect(0, 0, cardW, 6, 10);
        cbg.fill({ color: knight.color, alpha: 0.8 });
        cbg.roundRect(2, 6, cardW - 4, 50, 0);
        cbg.fill({ color: knight.color, alpha: 0.1 });
      }
      cbg.roundRect(0, 0, cardW, cardH, 10);
      cbg.stroke({ color: unlocked ? knight.color : 0x444444, width: 1.8, alpha: unlocked ? 0.8 : 0.4 });
      card.addChild(cbg);

      if (unlocked) {
        // Name
        const n = new Text({ text: knight.name, style: mkS(14, 0xffffff, true) });
        n.anchor.set(0.5, 0); n.position.set(cardW / 2, 14);
        card.addChild(n);

        // Title
        const t = new Text({ text: knight.title, style: mkS(9, knight.color) });
        t.anchor.set(0.5, 0); t.position.set(cardW / 2, 32);
        card.addChild(t);

        // Separator
        const sep = new Graphics();
        sep.moveTo(10, 48); sep.lineTo(cardW - 10, 48);
        sep.stroke({ color: knight.color, width: 0.6, alpha: 0.3 });
        card.addChild(sep);

        // Procedural knight portrait (detailed helm with faceplate)
        const iconG = new Graphics();
        const icx = cardW / 2;
        const icy = 80;
        // Neck/gorget
        iconG.roundRect(icx - 10, icy + 8, 20, 10, 3);
        iconG.fill({ color: 0x556677 });
        // Helm dome (main)
        iconG.roundRect(icx - 14, icy - 16, 28, 30, 8);
        iconG.fill({ color: 0x667788, alpha: 0.9 });
        // Helm rivets (4 dots along top)
        for (let rv = 0; rv < 4; rv++) {
          iconG.circle(icx - 8 + rv * 5.5, icy - 12, 1.2);
          iconG.fill({ color: 0x8899aa, alpha: 0.5 });
        }
        // Brow ridge (horizontal bar above visor)
        iconG.roundRect(icx - 13, icy - 6, 26, 3, 1);
        iconG.fill({ color: 0x778899 });
        // Visor slit (dark with eye glow)
        iconG.rect(icx - 10, icy - 2, 20, 4);
        iconG.fill({ color: 0x181828 });
        // Eye glow inside visor
        iconG.circle(icx - 4, icy, 1.5);
        iconG.fill({ color: knight.color, alpha: 0.6 });
        iconG.circle(icx + 4, icy, 1.5);
        iconG.fill({ color: knight.color, alpha: 0.6 });
        // Nasal guard
        iconG.rect(icx - 1.5, icy - 14, 3, 12);
        iconG.fill({ color: 0x778899 });
        // Cheek plates
        iconG.moveTo(icx - 13, icy - 2);
        iconG.lineTo(icx - 14, icy + 6);
        iconG.lineTo(icx - 10, icy + 10);
        iconG.fill({ color: 0x5a6a7a });
        iconG.moveTo(icx + 13, icy - 2);
        iconG.lineTo(icx + 14, icy + 6);
        iconG.lineTo(icx + 10, icy + 10);
        iconG.fill({ color: 0x5a6a7a });
        // Chin guard
        iconG.arc(icx, icy + 8, 10, 0.3, Math.PI - 0.3);
        iconG.stroke({ color: 0x5a6a7a, width: 2 });
        // Plume (layered curves for volume)
        iconG.moveTo(icx - 2, icy - 16);
        iconG.quadraticCurveTo(icx + 8, icy - 28, icx + 16, icy - 24);
        iconG.quadraticCurveTo(icx + 12, icy - 18, icx + 6, icy - 16);
        iconG.closePath();
        iconG.fill({ color: knight.color, alpha: 0.75 });
        // Plume inner highlight
        iconG.moveTo(icx, icy - 16);
        iconG.quadraticCurveTo(icx + 6, icy - 24, icx + 12, icy - 22);
        iconG.stroke({ color: knight.color, width: 1, alpha: 0.4 });
        // Helm border
        iconG.roundRect(icx - 14, icy - 16, 28, 30, 8);
        iconG.stroke({ color: knight.color, width: 1.5 });
        card.addChild(iconG);

        // HP
        const hp = new Text({ text: `HP: ${knight.maxHp}`, style: mkS(10, 0xcc4444) });
        hp.position.set(10, 110);
        card.addChild(hp);

        // Passive
        const pn = new Text({ text: knight.passiveName, style: mkS(9, 0xaacc88, true) });
        pn.position.set(10, 128);
        card.addChild(pn);
        const pd = new Text({ text: knight.passiveDesc, style: mkS(8, 0x88aa66, false, cardW - 20) });
        pd.position.set(10, 142);
        card.addChild(pd);

        // Description
        const desc = new Text({ text: knight.description, style: mkS(8, 0x888888, false, cardW - 20) });
        desc.position.set(10, 210);
        card.addChild(desc);

        // Ascension selector
        let selectedAsc = 0;
        const ascLabel = new Text({ text: `Ascension: 0`, style: mkS(9, 0xff8844) });
        ascLabel.position.set(10, cardH - 68);
        card.addChild(ascLabel);

        if (maxAsc > 0) {
          // Minus button
          const minusBtn = makeBtn("-", 90, cardH - 70, 20, 18, 0x2a1a1a, 0x884444, () => {
            selectedAsc = Math.max(0, selectedAsc - 1);
            ascLabel.text = `Ascension: ${selectedAsc}`;
          });
          card.addChild(minusBtn);
          // Plus button
          const plusBtn = makeBtn("+", 114, cardH - 70, 20, 18, 0x1a2a1a, 0x448844, () => {
            selectedAsc = Math.min(maxAsc, selectedAsc + 1);
            ascLabel.text = `Ascension: ${selectedAsc}`;
          });
          card.addChild(plusBtn);
        }

        // Select button
        const btn = makeBtn("SELECT", 10, cardH - 38, cardW - 20, 28, 0x1a331a, 0x44aa44, () => {
          this.onSelect?.(kid, selectedAsc);
        });
        card.addChild(btn);

        // Hover effect
        card.eventMode = "static";
        card.on("pointerover", () => { card.y -= 4; });
        card.on("pointerout", () => { card.y += 4; });
      } else {
        // Locked
        const lock = new Graphics();
        lock.circle(cardW / 2, cardH / 2 - 20, 16);
        lock.stroke({ color: 0x555555, width: 2 });
        lock.rect(cardW / 2 - 12, cardH / 2 - 8, 24, 18);
        lock.fill({ color: 0x444444, alpha: 0.5 });
        lock.rect(cardW / 2 - 12, cardH / 2 - 8, 24, 18);
        lock.stroke({ color: 0x555555, width: 1 });
        card.addChild(lock);
        const lt = new Text({ text: "LOCKED", style: mkS(11, 0x555555) });
        lt.anchor.set(0.5); lt.position.set(cardW / 2, cardH / 2 + 20);
        card.addChild(lt);
      }

      this.container.addChild(card);

      // Entrance animation
      card.alpha = 0;
      card.y += 20;
      gsap.to(card, { alpha: 1, y: card.y - 20, duration: 0.4, delay: 0.1 + i * 0.08, ease: "power2.out" });
    }

    // Continue saved run button
    if (hasSavedRun()) {
      const contBtn = makeBtn("CONTINUE RUN", W / 2 - 70, H - 50, 140, 30, 0x1a331a, 0x44aa44, () => this.onContinueRun?.());
      this.container.addChild(contBtn);
    }

    // Back button
    const back = makeBtn("BACK", 20, H - 50, 80, 30, 0x2a1a1a, 0x884444, () => this.onBack?.());
    this.container.addChild(back);

    const compBtn = makeBtn("COMPENDIUM", 120, H - 50, 110, 30, 0x1a1a33, 0x4466cc, () => this.onCompendium?.());
    this.container.addChild(compBtn);

    const histBtn = makeBtn("HISTORY", 250, H - 50, 90, 30, 0x1a2a1a, 0x448844, () => this.onHistory?.());
    this.container.addChild(histBtn);

    const dailyBtn = makeBtn("DAILY", 360, H - 50, 80, 30, 0x2a2a1a, 0xaaaa44, () => this.onDaily?.());
    this.container.addChild(dailyBtn);

    // Stats
    const stats = new Text({
      text: `Runs: ${meta.totalRuns}  Wins: ${meta.totalWins}  Best: ${meta.bestScore}`,
      style: mkS(9, 0x666688),
    });
    stats.anchor.set(0.5);
    stats.position.set(W / 2, H - 24);
    this.container.addChild(stats);

    const goalTxt = new Text({
      text: "Defeat all 3 Act Bosses to find the Holy Grail",
      style: mkS(10, 0x888866),
    });
    goalTxt.anchor.set(0.5);
    goalTxt.position.set(W / 2, H - 10);
    this.container.addChild(goalTxt);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// REWARD SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class RewardScreen {
  container = new Container();
  onCollectGold: (() => void) | null = null;
  onPickCard: ((cardId: string) => void) | null = null;
  onSkipCards: (() => void) | null = null;
  onSingingBowl: (() => void) | null = null;
  onCollectRelic: ((relicId: string) => void) | null = null;
  onCollectPotion: ((potionId: string) => void) | null = null;
  onContinue: (() => void) | null = null;

  show(run: RTRunState): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const title = new Text({ text: "VICTORY", style: mkS(26, 0xffd700, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 24);
    this.container.addChild(title);

    let y = 75;

    // Gold
    if (run.rewardGold > 0) {
      const btn = makeBtn(`Collect ${run.rewardGold} Gold`, W / 2 - 110, y, 220, 32, 0x2a2200, 0xccaa33, () => {
        this.onCollectGold?.();
        btn.visible = false;
      });
      this.container.addChild(btn);
      y += 44;
    }

    // Relics
    for (const relicId of run.rewardRelics) {
      try {
        const rd = getRelicDef(relicId);
        const rc = new Container();
        rc.position.set(W / 2 - 140, y);
        const rbg = new Graphics();
        rbg.roundRect(0, 0, 280, 50, 6);
        rbg.fill({ color: 0x1a1a2a, alpha: 0.9 });
        rbg.roundRect(0, 0, 280, 50, 6);
        rbg.stroke({ color: 0x8866cc, width: 1.2 });
        rc.addChild(rbg);
        const rn = new Text({ text: `Relic: ${rd.name}`, style: mkS(11, 0xcc88ff, true) });
        rn.position.set(10, 6); rc.addChild(rn);
        const rdesc = new Text({ text: rd.description, style: mkS(8, 0x999999, false, 260) });
        rdesc.position.set(10, 24); rc.addChild(rdesc);
        rc.eventMode = "static"; rc.cursor = "pointer";
        rc.on("pointerdown", () => { this.onCollectRelic?.(relicId); rc.visible = false; });
        this.container.addChild(rc);
        y += 58;
      } catch { /* skip */ }
    }

    // Potions
    for (const potId of run.rewardPotions) {
      try {
        const pd = getPotionDef(potId);
        const btn = makeBtn(`Potion: ${pd.name}`, W / 2 - 100, y, 200, 30, 0x1a2a1a, 0x448844, () => {
          this.onCollectPotion?.(potId); btn.visible = false;
        });
        this.container.addChild(btn);
        y += 40;
      } catch { /* skip */ }
    }

    // Card choices
    if (run.rewardCards && run.rewardCards.length > 0) {
      const lbl = new Text({ text: "Choose a card:", style: mkS(13, 0xcccccc) });
      lbl.anchor.set(0.5, 0); lbl.position.set(W / 2, y);
      this.container.addChild(lbl);
      y += 24;

      const cSpacing = 176;
      const cStartX = (W - cSpacing * run.rewardCards.length) / 2;

      for (let i = 0; i < run.rewardCards.length; i++) {
        const cardId = run.rewardCards[i];
        try {
          const cd = getCardDef(cardId);
          const cx = cStartX + i * cSpacing;
          const cc = new Container();
          cc.position.set(cx, y);

          const ccBg = new Graphics();
          ccBg.roundRect(0, 0, 160, 140, 7);
          ccBg.fill({ color: 0x10102a, alpha: 0.95 });
          ccBg.roundRect(0, 0, 160, 140, 7);
          ccBg.stroke({ color: 0x666688, width: 1.2 });
          // Type color accent
          ccBg.roundRect(0, 0, 160, 4, 7);
          ccBg.fill({ color: (cd.type === "strike" ? 0xcc4444 : cd.type === "guard" ? 0x4477bb : cd.type === "spell" ? 0x8844bb : 0x888888), alpha: 0.7 });
          cc.addChild(ccBg);

          const cn = new Text({ text: `${cd.name}`, style: mkS(12, 0xffffff, true) });
          cn.position.set(10, 10); cc.addChild(cn);

          const ccost = new Text({ text: `Cost: ${cd.cost}`, style: mkS(9, 0x8888cc) });
          ccost.position.set(10, 28); cc.addChild(ccost);

          const ctype = new Text({ text: `${cd.type.toUpperCase()} · ${cd.rarity.toUpperCase()}`, style: mkS(8, 0x777799) });
          ctype.position.set(10, 42); cc.addChild(ctype);

          const cdesc = new Text({ text: cd.description, style: mkS(9, 0xbbbbbb, false, 140) });
          cdesc.position.set(10, 60); cc.addChild(cdesc);

          cc.eventMode = "static"; cc.cursor = "pointer";
          cc.on("pointerdown", () => this.onPickCard?.(cardId));
          cc.on("pointerover", () => { cc.y -= 4; cc.scale.set(1.03); });
          cc.on("pointerout", () => { cc.y += 4; cc.scale.set(1.0); });

          this.container.addChild(cc);
        } catch { /* skip */ }
      }
      y += 155;

      const skipLabel = run.relics.includes("ectoplasm") ? "Skip" : "Skip (+12g)";
      const skipBtn = makeBtn(skipLabel, W / 2 - 60, y, 100, 26, 0x2a1a1a, 0x884444, () => this.onSkipCards?.());
      this.container.addChild(skipBtn);

      // Singing Bowl: gain 2 Max HP instead of card
      if (run.relics.includes("singing_bowl")) {
        const bowlBtn = makeBtn("+2 Max HP", W / 2 + 30, y, 100, 26, 0x1a2a33, 0x4488aa, () => this.onSingingBowl?.());
        this.container.addChild(bowlBtn);
      }
    }

    // Continue
    const contBtn = makeBtn("CONTINUE", W / 2 - 60, H - 55, 120, 36, 0x1a331a, 0x44aa44, () => this.onContinue?.());
    this.container.addChild(contBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// EVENT SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class EventScreen {
  container = new Container();
  onChoice: ((choiceIndex: number) => void) | null = null;

  show(run: RTRunState, eventId: string): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const event = getEventDef(eventId);

    // Decorative frame
    const frame = new Graphics();
    frame.roundRect(40, 30, W - 80, H - 60, 12);
    frame.fill({ color: 0x0c0c1a, alpha: 0.6 });
    frame.roundRect(40, 30, W - 80, H - 60, 12);
    frame.stroke({ color: 0x4466aa, width: 1, alpha: 0.3 });
    this.container.addChild(frame);

    const title = new Text({ text: event.title, style: mkS(22, 0xffd700, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 50);
    this.container.addChild(title);

    // Divider
    const div = new Graphics();
    div.moveTo(100, 82); div.lineTo(W - 100, 82);
    div.stroke({ color: 0xffd700, width: 0.8, alpha: 0.3 });
    this.container.addChild(div);

    const desc = new Text({ text: event.description, style: mkS(12, 0xcccccc, false, W - 140) });
    desc.anchor.set(0.5, 0); desc.position.set(W / 2, 95);
    this.container.addChild(desc);

    let y = 180;
    for (let i = 0; i < event.choices.length; i++) {
      const choice = event.choices[i];
      const available = !choice.condition || choice.condition(run);

      const choiceC = new Container();
      choiceC.position.set(60, y);

      const bg = new Graphics();
      bg.roundRect(0, 0, W - 120, 50, 6);
      bg.fill({ color: available ? 0x1a1a33 : 0x111111, alpha: 0.9 });
      bg.roundRect(0, 0, W - 120, 50, 6);
      bg.stroke({ color: available ? 0x4466aa : 0x333333, width: 1, alpha: available ? 0.6 : 0.3 });
      // Number indicator
      bg.circle(20, 25, 12);
      bg.fill({ color: available ? 0x2a2a55 : 0x1a1a1a });
      bg.circle(20, 25, 12);
      bg.stroke({ color: available ? 0x6688cc : 0x444444, width: 1 });
      choiceC.addChild(bg);

      const num = new Text({ text: `${i + 1}`, style: mkS(12, available ? 0x88aaff : 0x555555, true) });
      num.anchor.set(0.5); num.position.set(20, 25);
      choiceC.addChild(num);

      const txt = new Text({ text: choice.text, style: mkS(10, available ? 0xcccccc : 0x666666, false, W - 180) });
      txt.position.set(40, 8);
      choiceC.addChild(txt);

      if (available) {
        choiceC.eventMode = "static";
        choiceC.cursor = "pointer";
        choiceC.on("pointerdown", () => this.onChoice?.(i));
        choiceC.on("pointerover", () => { choiceC.x += 4; });
        choiceC.on("pointerout", () => { choiceC.x -= 4; });
      } else {
        choiceC.alpha = 0.5;
      }

      this.container.addChild(choiceC);
      y += 60;
    }
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// REST SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class RestScreen {
  container = new Container();
  onHeal: (() => void) | null = null;
  onUpgrade: (() => void) | null = null;

  show(run: RTRunState): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    // Campfire glow
    const glow = new Graphics();
    glow.circle(W / 2, 280, 80);
    glow.fill({ color: 0xff6622, alpha: 0.06 });
    glow.circle(W / 2, 280, 50);
    glow.fill({ color: 0xff8844, alpha: 0.08 });
    glow.circle(W / 2, 280, 25);
    glow.fill({ color: 0xffaa66, alpha: 0.1 });
    this.container.addChild(glow);

    // Campfire icon
    const fire = new Graphics();
    const fx = W / 2;
    const fy = 260;
    // Flames
    fire.moveTo(fx - 12, fy + 10);
    fire.quadraticCurveTo(fx - 6, fy - 20, fx, fy - 28);
    fire.quadraticCurveTo(fx + 6, fy - 20, fx + 12, fy + 10);
    fire.closePath();
    fire.fill({ color: 0xff6622, alpha: 0.8 });
    // Inner flame
    fire.moveTo(fx - 6, fy + 8);
    fire.quadraticCurveTo(fx - 2, fy - 10, fx, fy - 16);
    fire.quadraticCurveTo(fx + 2, fy - 10, fx + 6, fy + 8);
    fire.closePath();
    fire.fill({ color: 0xffcc44, alpha: 0.9 });
    // Logs
    fire.moveTo(fx - 18, fy + 12);
    fire.lineTo(fx + 8, fy + 18);
    fire.stroke({ color: 0x6b3a1f, width: 4 });
    fire.moveTo(fx + 18, fy + 12);
    fire.lineTo(fx - 8, fy + 18);
    fire.stroke({ color: 0x5d3a1a, width: 4 });
    this.container.addChild(fire);

    // Fire flicker animation
    gsap.to(fire, { alpha: 0.6, duration: 0.15, yoyo: true, repeat: -1, ease: "none" });
    gsap.to(fire.scale, { x: 1.06, y: 1.08, duration: 0.3, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(glow, { alpha: 0.5, duration: 0.5, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Ember particles
    for (let i = 0; i < 5; i++) {
      const ember = new Graphics();
      ember.circle(0, 0, 1.5);
      ember.fill({ color: [0xff6622, 0xffaa44, 0xffcc66][i % 3], alpha: 0.7 });
      ember.position.set(W / 2 + (Math.random() - 0.5) * 20, 250);
      this.container.addChild(ember);
      const dur = 1.5 + Math.random();
      gsap.to(ember, {
        y: 200 - Math.random() * 60, x: ember.x + (Math.random() - 0.5) * 40,
        alpha: 0, duration: dur, repeat: -1, delay: Math.random() * dur,
        ease: "power1.out",
      });
    }

    const title = new Text({ text: "REST SITE", style: mkS(22, 0xffcc66, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 80);
    this.container.addChild(title);

    const desc = new Text({ text: "The fire crackles. Rest a while, weary knight.", style: mkS(12, 0x999999) });
    desc.anchor.set(0.5, 0); desc.position.set(W / 2, 115);
    this.container.addChild(desc);

    const hasCoffeeDripper = run.relics.includes("coffee_dripper");
    let healPct = 0.3;
    if (run.ascension >= 11) healPct -= 0.05;
    const healAmt = Math.floor(run.maxHp * Math.max(0.1, healPct));

    if (hasCoffeeDripper) {
      // Coffee Dripper: can't rest
      const blockedTxt = new Text({ text: "Coffee Dripper prevents resting!", style: mkS(11, 0xff6644) });
      blockedTxt.anchor.set(0.5, 0);
      blockedTxt.position.set(W / 2, 320);
      this.container.addChild(blockedTxt);
    } else {
      const healBtn = makeBtn(
        `Rest  —  Heal ${healAmt} HP  (${run.hp}/${run.maxHp})`,
        W / 2 - 160, 320, 320, 44, 0x1a2a1a, 0x44aa44, () => this.onHeal?.(),
      );
      this.container.addChild(healBtn);
    }

    const upgradeBtn = makeBtn(
      "Smith  —  Upgrade a card",
      W / 2 - 160, 380, 320, 44, 0x1a1a33, 0x4466cc, () => this.onUpgrade?.(),
    );
    this.container.addChild(upgradeBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// SHOP SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class ShopScreen {
  container = new Container();
  onBuy: ((index: number) => void) | null = null;
  onLeave: (() => void) | null = null;

  show(run: RTRunState): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const title = new Text({ text: "MERCHANT", style: mkS(22, 0xffd700, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 16);
    this.container.addChild(title);

    const goldTxt = new Text({ text: `Gold: ${run.gold}`, style: mkS(14, 0xffd700, true) });
    goldTxt.anchor.set(0.5, 0); goldTxt.position.set(W / 2, 48);
    this.container.addChild(goldTxt);

    if (!run.shop) { this.hide(); return; }

    let y = 80;
    for (let i = 0; i < run.shop.length; i++) {
      const item = run.shop[i];
      if (item.sold) continue;

      let label = "";
      let desc = "";
      let accent = 0x888888;
      switch (item.type) {
        case "card": {
          const cd = getCardDef(item.id);
          label = cd.name;
          desc = cd.description;
          accent = cd.type === "strike" ? 0xcc4444 : cd.type === "guard" ? 0x4477bb : 0x8844bb;
          break;
        }
        case "relic": {
          const rd = getRelicDef(item.id);
          label = rd.name;
          desc = rd.description;
          accent = 0x8866cc;
          break;
        }
        case "potion": {
          const pd = getPotionDef(item.id);
          label = pd.name;
          desc = pd.description;
          accent = 0x44aa66;
          break;
        }
        case "remove_card":
          label = "Remove a Card";
          desc = "Permanently remove one card from your deck.";
          accent = 0xcc4466;
          break;
      }

      const canAfford = run.gold >= item.cost;
      const row = new Container();
      row.position.set(50, y);

      const rowBg = new Graphics();
      rowBg.roundRect(0, 0, W - 100, 48, 6);
      rowBg.fill({ color: canAfford ? 0x14142a : 0x0c0c14, alpha: 0.9 });
      // Accent bar
      rowBg.rect(0, 0, 4, 48);
      rowBg.fill({ color: accent, alpha: canAfford ? 0.7 : 0.2 });
      rowBg.roundRect(0, 0, W - 100, 48, 6);
      rowBg.stroke({ color: canAfford ? 0x444466 : 0x222233, width: 1 });
      row.addChild(rowBg);

      const lTxt = new Text({ text: label, style: mkS(12, canAfford ? 0xffffff : 0x666666, true) });
      lTxt.position.set(14, 6); row.addChild(lTxt);

      const dTxt = new Text({ text: desc, style: mkS(8, 0x888888, false, W - 200) });
      dTxt.position.set(14, 24); row.addChild(dTxt);

      // Price
      const pTxt = new Text({ text: `${item.cost}g`, style: mkS(13, canAfford ? 0xffd700 : 0x666633, true) });
      pTxt.anchor.set(1, 0.5); pTxt.position.set(W - 120, 24);
      row.addChild(pTxt);

      if (canAfford) {
        row.eventMode = "static"; row.cursor = "pointer";
        row.on("pointerdown", () => this.onBuy?.(i));
        row.on("pointerover", () => { row.x += 4; });
        row.on("pointerout", () => { row.x -= 4; });
      }

      this.container.addChild(row);
      y += 54;
    }

    const leaveBtn = makeBtn("LEAVE", W / 2 - 50, H - 50, 100, 34, 0x2a1a1a, 0x884444, () => this.onLeave?.());
    this.container.addChild(leaveBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// GAME OVER / VICTORY SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class GameOverScreen {
  container = new Container();
  onRestart: (() => void) | null = null;
  onMainMenu: (() => void) | null = null;

  show(run: RTRunState, won: boolean, score: number): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    // Victory: golden glow, Defeat: red glow
    const glowColor = won ? 0xffd700 : 0xff2222;
    const g = new Graphics();
    g.circle(W / 2, 200, 120);
    g.fill({ color: glowColor, alpha: 0.04 });
    g.circle(W / 2, 200, 70);
    g.fill({ color: glowColor, alpha: 0.06 });
    this.container.addChild(g);

    const titleText = won ? "THE GRAIL IS FOUND" : "YOUR QUEST ENDS HERE";
    const title = new Text({ text: titleText, style: mkS(26, glowColor, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 50);
    this.container.addChild(title);

    // Grail icon (victory) or broken sword (defeat)
    const icon = new Graphics();
    const ix = W / 2;
    if (won) {
      // Ornate chalice with handles and decorative bands
      // Cup (curved trapezoid)
      icon.moveTo(ix - 16, 118);
      icon.quadraticCurveTo(ix - 18, 125, ix - 14, 148);
      icon.lineTo(ix + 14, 148);
      icon.quadraticCurveTo(ix + 18, 125, ix + 16, 118);
      icon.closePath();
      icon.fill({ color: 0xffd700 });
      icon.stroke({ color: 0xffee88, width: 1 });
      // Cup rim
      icon.ellipse(ix, 118, 17, 4);
      icon.fill({ color: 0xffee88 });
      icon.ellipse(ix, 118, 17, 4);
      icon.stroke({ color: 0xffd700, width: 1 });
      // Decorative band
      icon.moveTo(ix - 15, 132);
      icon.lineTo(ix + 15, 132);
      icon.stroke({ color: 0xddaa22, width: 2 });
      // Gem on front
      icon.circle(ix, 132, 3);
      icon.fill({ color: 0xff4444, alpha: 0.8 });
      icon.circle(ix, 132, 3);
      icon.stroke({ color: 0xffdd88, width: 0.8 });
      // Handles
      icon.moveTo(ix - 14, 126);
      icon.quadraticCurveTo(ix - 24, 126, ix - 22, 138);
      icon.quadraticCurveTo(ix - 20, 145, ix - 14, 142);
      icon.stroke({ color: 0xddbb44, width: 2 });
      icon.moveTo(ix + 14, 126);
      icon.quadraticCurveTo(ix + 24, 126, ix + 22, 138);
      icon.quadraticCurveTo(ix + 20, 145, ix + 14, 142);
      icon.stroke({ color: 0xddbb44, width: 2 });
      // Stem (faceted)
      icon.moveTo(ix - 3, 148);
      icon.lineTo(ix - 2, 152);
      icon.lineTo(ix - 4, 156);
      icon.lineTo(ix + 4, 156);
      icon.lineTo(ix + 2, 152);
      icon.lineTo(ix + 3, 148);
      icon.closePath();
      icon.fill({ color: 0xddbb44 });
      // Base (wide ellipse + rim)
      icon.ellipse(ix, 160, 16, 4);
      icon.fill({ color: 0xddbb44 });
      icon.ellipse(ix, 160, 16, 4);
      icon.stroke({ color: 0xffd700, width: 1 });
      // Holy light glow from cup
      icon.circle(ix, 125, 10);
      icon.fill({ color: 0xffffff, alpha: 0.08 });
    } else {
      // Broken sword with detailed blade, crossguard, and jagged break
      // Lower blade (intact portion)
      icon.moveTo(ix - 3, 128);
      icon.lineTo(ix - 3, 145);
      icon.lineTo(ix + 3, 145);
      icon.lineTo(ix + 3, 128);
      icon.closePath();
      icon.fill({ color: 0x888899 });
      // Blade highlight
      icon.rect(ix + 0.5, 130, 1, 14);
      icon.fill({ color: 0xffffff, alpha: 0.15 });
      // Crossguard (detailed)
      icon.moveTo(ix - 10, 145);
      icon.lineTo(ix - 12, 147);
      icon.lineTo(ix - 10, 149);
      icon.lineTo(ix + 10, 149);
      icon.lineTo(ix + 12, 147);
      icon.lineTo(ix + 10, 145);
      icon.closePath();
      icon.fill({ color: 0x8b6914 });
      icon.stroke({ color: 0xaa8844, width: 0.8 });
      // Grip
      icon.rect(ix - 2, 149, 4, 8);
      icon.fill({ color: 0x5d3a1a });
      // Grip wrap
      icon.moveTo(ix - 2, 151);
      icon.lineTo(ix + 2, 153);
      icon.stroke({ color: 0x8b6914, width: 1, alpha: 0.5 });
      icon.moveTo(ix - 2, 154);
      icon.lineTo(ix + 2, 156);
      icon.stroke({ color: 0x8b6914, width: 1, alpha: 0.5 });
      // Pommel
      icon.circle(ix, 159, 3);
      icon.fill({ color: 0x888888 });
      // Upper blade (broken, tilted away)
      icon.moveTo(ix - 2, 126);
      icon.lineTo(ix + 6, 108);
      icon.lineTo(ix + 9, 106);
      icon.lineTo(ix + 10, 109);
      icon.lineTo(ix + 4, 126);
      icon.closePath();
      icon.fill({ color: 0x777788 });
      // Jagged break edge
      icon.moveTo(ix - 3, 128);
      icon.lineTo(ix - 1, 125);
      icon.lineTo(ix + 1, 128);
      icon.lineTo(ix + 3, 126);
      icon.lineTo(ix + 4, 128);
      icon.stroke({ color: 0x555566, width: 1.5 });
      // Sparks at break point
      icon.circle(ix - 2, 127, 1.5);
      icon.fill({ color: 0xffaa44, alpha: 0.5 });
      icon.circle(ix + 3, 126, 1);
      icon.fill({ color: 0xffcc66, alpha: 0.4 });
    }
    this.container.addChild(icon);

    const knight = KNIGHT_DEFS[run.knightId];
    const stats = [
      `Knight: ${knight.name}`,
      `Act ${run.act}  |  Floor ${run.floor}`,
      `Score: ${score}`,
      `Cards Played: ${run.cardsPlayed}`,
      `Enemies Killed: ${run.enemiesKilled}`,
      `Damage Dealt: ${run.damageDealt}`,
      `Relics: ${run.relics.length}`,
      `Final Purity: ${run.purity}`,
    ];

    let y = 175;
    for (const stat of stats) {
      const st = new Text({ text: stat, style: mkS(12, 0xaaaaaa) });
      st.anchor.set(0.5, 0); st.position.set(W / 2, y);
      this.container.addChild(st);
      y += 22;
    }

    // Final deck display
    const deckTitle = new Text({ text: `Final Deck (${run.deck.length} cards)`, style: mkS(12, 0xaaaacc, true) });
    deckTitle.anchor.set(0.5, 0);
    deckTitle.position.set(W / 2, y + 10);
    this.container.addChild(deckTitle);
    y += 30;

    // Show deck as compact list (3 columns)
    const deckCols = 3;
    const colW = 220;
    const deckStartX = (W - deckCols * colW) / 2;
    for (let di = 0; di < Math.min(run.deck.length, 24); di++) {
      const card = run.deck[di];
      const def = getCardDef(card.defId);
      const col = di % deckCols;
      const row = Math.floor(di / deckCols);
      const dx = deckStartX + col * colW;
      const dy = y + row * 14;
      const cardColor = card.upgraded ? 0x88ff88 : 0xaaaaaa;
      const ct = new Text({ text: `${def.name} (${def.cost >= 0 ? def.cost : "-"})`, style: mkS(8, cardColor) });
      ct.position.set(dx, dy);
      this.container.addChild(ct);
    }
    if (run.deck.length > 24) {
      const more = new Text({ text: `...and ${run.deck.length - 24} more`, style: mkS(8, 0x777777) });
      more.anchor.set(0.5, 0);
      more.position.set(W / 2, y + Math.ceil(24 / deckCols) * 14);
      this.container.addChild(more);
    }

    const restartBtn = makeBtn("NEW RUN", W / 2 - 130, H - 65, 120, 38, 0x1a331a, 0x44aa44, () => this.onRestart?.());
    this.container.addChild(restartBtn);

    const menuBtn = makeBtn("MAIN MENU", W / 2 + 10, H - 65, 120, 38, 0x2a1a1a, 0x884444, () => this.onMainMenu?.());
    this.container.addChild(menuBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD PICKER (upgrade / remove)
// ═══════════════════════════════════════════════════════════════════════════

export class CardPickerScreen {
  container = new Container();
  onPick: ((cardUid: number) => void) | null = null;
  onCancel: (() => void) | null = null;

  show(title: string, cards: CardInstance[]): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const tTxt = new Text({ text: title, style: mkS(20, 0xffd700, true) });
    tTxt.anchor.set(0.5, 0); tTxt.position.set(W / 2, 16);
    this.container.addChild(tTxt);

    const cols = 5;
    const cardW = 140;
    const cardH = 56;
    const sx = 150;
    const sy = 62;
    const startX = (W - cols * sx) / 2 + 10;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const def = getCardDef(card.defId);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * sx;
      const cy = 55 + row * sy;

      const cc = new Container();
      cc.position.set(cx, cy);

      const bg = new Graphics();
      bg.roundRect(0, 0, cardW, cardH, 5);
      bg.fill({ color: 0x14142a, alpha: 0.9 });
      bg.roundRect(0, 0, cardW, cardH, 5);
      bg.stroke({ color: 0x555577, width: 1 });
      cc.addChild(bg);

      const n = new Text({ text: `${def.name} (${def.cost})`, style: mkS(10, 0xffffff, true) });
      n.position.set(8, 6); cc.addChild(n);

      const t = new Text({ text: `${def.type} · ${def.rarity}`, style: mkS(7, 0x777799) });
      t.position.set(8, 22); cc.addChild(t);

      const d = new Text({ text: def.description, style: mkS(7, 0x888888, false, 120) });
      d.position.set(8, 36); cc.addChild(d);

      cc.eventMode = "static"; cc.cursor = "pointer";
      cc.on("pointerdown", () => this.onPick?.(card.uid));
      cc.on("pointerover", () => { cc.scale.set(1.05); });
      cc.on("pointerout", () => { cc.scale.set(1.0); });

      this.container.addChild(cc);
    }

    if (this.onCancel) {
      const cancelBtn = makeBtn("CANCEL", W / 2 - 40, H - 50, 80, 30, 0x2a1a1a, 0x884444, () => this.onCancel?.());
      this.container.addChild(cancelBtn);
    }
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// TREASURE SCREEN
// ═══════════════════════════════════════════════════════════════════════════

export class TreasureScreen {
  container = new Container();
  onContinue: (() => void) | null = null;

  show(relicId: string | null): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    // Chest glow
    const glow = new Graphics();
    glow.circle(W / 2, 200, 60);
    glow.fill({ color: 0xffcc00, alpha: 0.08 });
    glow.circle(W / 2, 200, 35);
    glow.fill({ color: 0xffdd44, alpha: 0.1 });
    this.container.addChild(glow);

    // Chest icon
    const chest = new Graphics();
    const cx = W / 2;
    const cy = 190;
    chest.roundRect(cx - 25, cy - 15, 50, 30, 4);
    chest.fill({ color: 0x8b6914, alpha: 0.9 });
    chest.roundRect(cx - 25, cy - 15, 50, 30, 4);
    chest.stroke({ color: 0xffd700, width: 1.5 });
    // Lid
    chest.roundRect(cx - 28, cy - 25, 56, 14, 4);
    chest.fill({ color: 0x9b7924 });
    chest.roundRect(cx - 28, cy - 25, 56, 14, 4);
    chest.stroke({ color: 0xffd700, width: 1 });
    // Lock
    chest.circle(cx, cy, 5);
    chest.fill({ color: 0xffd700 });
    this.container.addChild(chest);

    // Chest bob + glow pulse
    gsap.to(chest, { y: -4, duration: 1.2, yoyo: true, repeat: -1, ease: "sine.inOut" });
    gsap.to(glow, { alpha: 0.6, duration: 0.8, yoyo: true, repeat: -1, ease: "sine.inOut" });

    // Sparkle particles around chest
    for (let i = 0; i < 8; i++) {
      const spark = new Graphics();
      spark.circle(0, 0, 1.5);
      spark.fill({ color: 0xffd700, alpha: 0.8 });
      const angle = (i / 8) * Math.PI * 2;
      const dist = 40 + Math.random() * 20;
      spark.position.set(W / 2 + Math.cos(angle) * dist, 190 + Math.sin(angle) * dist);
      this.container.addChild(spark);
      gsap.to(spark, { alpha: 0, duration: 0.6 + Math.random() * 0.4, yoyo: true, repeat: -1, delay: Math.random() * 0.8, ease: "sine.inOut" });
    }

    const title = new Text({ text: "TREASURE!", style: mkS(22, 0xffd700, true) });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 100);
    this.container.addChild(title);

    if (relicId) {
      try {
        const rd = getRelicDef(relicId);
        const relicName = new Text({ text: rd.name, style: mkS(16, 0xcc88ff, true) });
        relicName.anchor.set(0.5, 0);
        relicName.position.set(W / 2, 250);
        this.container.addChild(relicName);

        const relicDesc = new Text({ text: rd.description, style: mkS(12, 0xaaaaaa, false, 400) });
        relicDesc.anchor.set(0.5, 0);
        relicDesc.position.set(W / 2, 280);
        this.container.addChild(relicDesc);
      } catch { /* skip */ }
    } else {
      const empty = new Text({ text: "The chest was empty...", style: mkS(14, 0x888888) });
      empty.anchor.set(0.5, 0);
      empty.position.set(W / 2, 260);
      this.container.addChild(empty);
    }

    const contBtn = makeBtn("CONTINUE", W / 2 - 60, H - 60, 120, 36, 0x1a331a, 0x44aa44, () => this.onContinue?.());
    this.container.addChild(contBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// DECK VIEWER (view full deck, discard pile, exhaust pile)
// ═══════════════════════════════════════════════════════════════════════════

export class DeckViewerScreen {
  container = new Container();
  onClose: (() => void) | null = null;

  show(deck: CardInstance[], discard: CardInstance[], exhaust: CardInstance[], tab: "deck" | "discard" | "exhaust" = "deck"): void {
    this.container.removeChildren();
    this.container.visible = true;

    // Semi-transparent overlay
    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    this.container.addChild(bg);

    const title = new Text({ text: tab === "deck" ? "YOUR DECK" : tab === "discard" ? "DISCARD PILE" : "EXHAUST PILE", style: mkS(18, 0xffd700, true) });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 12);
    this.container.addChild(title);

    // Tab buttons
    const tabs: Array<{ label: string; t: "deck" | "discard" | "exhaust"; cards: CardInstance[] }> = [
      { label: `Deck (${deck.length})`, t: "deck", cards: deck },
      { label: `Discard (${discard.length})`, t: "discard", cards: discard },
      { label: `Exhaust (${exhaust.length})`, t: "exhaust", cards: exhaust },
    ];
    for (let i = 0; i < tabs.length; i++) {
      const tb = tabs[i];
      const active = tb.t === tab;
      const tbBtn = makeBtn(tb.label, 120 + i * 200, 40, 170, 26, active ? 0x222244 : 0x111122, active ? 0x6688cc : 0x444466, () => {
        this.show(deck, discard, exhaust, tb.t);
      });
      this.container.addChild(tbBtn);
    }

    // Cards grid
    const cards = tab === "deck" ? deck : tab === "discard" ? discard : exhaust;
    const cols = 6;
    const cardW = 115;
    const cardH = 50;
    const spacingX = 125;
    const spacingY = 56;
    const startX = (W - cols * spacingX) / 2 + 10;
    const startY = 80;

    for (let i = 0; i < cards.length; i++) {
      const card = cards[i];
      const def = getCardDef(card.defId);
      const col = i % cols;
      const row = Math.floor(i / cols);
      const cx = startX + col * spacingX;
      const cy = startY + row * spacingY;

      if (cy > H - 60) break; // don't overflow

      const cc = new Container();
      cc.position.set(cx, cy);

      const typeColor = def.type === "strike" ? 0x8b1a1a : def.type === "guard" ? 0x1a3a6b : def.type === "spell" ? 0x4a1a6b : def.type === "virtue" ? 0x6b5a1a : def.type === "sin" ? 0x3a0a1a : 0x222222;
      const ccBg = new Graphics();
      ccBg.roundRect(0, 0, cardW, cardH, 4);
      ccBg.fill({ color: 0x10102a, alpha: 0.95 });
      ccBg.rect(0, 0, 3, cardH);
      ccBg.fill({ color: typeColor, alpha: 0.7 });
      ccBg.roundRect(0, 0, cardW, cardH, 4);
      ccBg.stroke({ color: 0x444466, width: 0.8 });
      cc.addChild(ccBg);

      const n = new Text({ text: `${def.name}`, style: mkS(9, card.upgraded ? 0x88ff88 : 0xffffff, true) });
      n.position.set(8, 4);
      cc.addChild(n);

      const costTxt = new Text({ text: def.cost >= 0 ? `${def.cost}` : "", style: mkS(9, 0x8888cc, true) });
      costTxt.position.set(cardW - 14, 4);
      cc.addChild(costTxt);

      const t = new Text({ text: def.type.toUpperCase(), style: mkS(7, 0x666688) });
      t.position.set(8, 20);
      cc.addChild(t);

      const d = new Text({ text: def.description, style: mkS(7, 0x777777, false, 120) });
      d.position.set(8, 34);
      cc.addChild(d);

      this.container.addChild(cc);
    }

    // Close button
    const closeBtn = makeBtn("CLOSE", W / 2 - 40, H - 45, 80, 30, 0x2a1a1a, 0x884444, () => this.onClose?.());
    this.container.addChild(closeBtn);
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// PAUSE MENU
// ═══════════════════════════════════════════════════════════════════════════

export class PauseScreen {
  container = new Container();
  onResume: (() => void) | null = null;
  onMainMenu: (() => void) | null = null;
  onViewDeck: (() => void) | null = null;

  show(run: RTRunState): void {
    this.container.removeChildren();
    this.container.visible = true;

    const bg = new Graphics();
    bg.rect(0, 0, W, H);
    bg.fill({ color: 0x000000, alpha: 0.8 });
    this.container.addChild(bg);

    const title = new Text({ text: "PAUSED", style: mkS(24, 0xffd700, true) });
    title.anchor.set(0.5, 0);
    title.position.set(W / 2, 120);
    this.container.addChild(title);

    const knight = KNIGHT_DEFS[run.knightId];
    const info = new Text({ text: `${knight.name} — Act ${run.act}, Floor ${run.floor}`, style: mkS(12, 0x888888) });
    info.anchor.set(0.5, 0);
    info.position.set(W / 2, 160);
    this.container.addChild(info);

    const resumeBtn = makeBtn("RESUME", W / 2 - 70, 220, 140, 38, 0x1a331a, 0x44aa44, () => this.onResume?.());
    this.container.addChild(resumeBtn);

    const deckBtn = makeBtn("VIEW DECK", W / 2 - 70, 275, 140, 38, 0x1a1a33, 0x4466cc, () => this.onViewDeck?.());
    this.container.addChild(deckBtn);

    const menuBtn = makeBtn("ABANDON RUN", W / 2 - 70, 330, 140, 38, 0x2a1a1a, 0x884444, () => this.onMainMenu?.());
    this.container.addChild(menuBtn);

    // Helpful text
    const helpTitle = new Text({ text: "HOW TO PLAY", style: mkS(12, 0xaaaacc, true) });
    helpTitle.anchor.set(0.5, 0);
    helpTitle.position.set(W / 2, 400);
    this.container.addChild(helpTitle);

    const helpLines = [
      "Goal: Defeat all 3 Act Bosses to find the Holy Grail.",
      "Play cards by clicking them, then clicking an enemy target.",
      "Purity (0-100) affects card rewards and the final boss.",
      "Virtue cards raise Purity. Sin cards lower it.",
      "Rest sites let you heal 30% HP or upgrade a card.",
    ];
    for (let i = 0; i < helpLines.length; i++) {
      const hl = new Text({ text: helpLines[i], style: mkS(9, 0x777799, false, 500) });
      hl.anchor.set(0.5, 0);
      hl.position.set(W / 2, 420 + i * 16);
      this.container.addChild(hl);
    }
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// CARD COMPENDIUM
// ═══════════════════════════════════════════════════════════════════════════

export class CompendiumScreen {
  container = new Container();
  onClose: (() => void) | null = null;
  private _page = 0;
  private _filter = "all";

  show(): void { this._render(); }

  private _render(): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const title = new Text({ text: "CARD COMPENDIUM", style: mkS(20, 0xffd700, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 10);
    this.container.addChild(title);

    // Filter tabs
    const filters = ["all", "strike", "guard", "spell", "virtue", "sin", "companion"];
    for (let i = 0; i < filters.length; i++) {
      const f = filters[i];
      const active = this._filter === f;
      const fbtn = makeBtn(f === "companion" ? "Comp" : f.charAt(0).toUpperCase() + f.slice(1),
        20 + i * 110, 36, 102, 22, active ? 0x222244 : 0x111122, active ? 0x6688cc : 0x444466, () => {
          this._filter = f; this._page = 0; this._render();
        });
      this.container.addChild(fbtn);
    }

    // Get cards
    const allCards = Array.from(CARD_REGISTRY.values())
      .filter(c => !c.id.endsWith("+") && c.rarity !== "curse" && c.rarity !== "starter")
      .filter(c => this._filter === "all" || c.type === this._filter)
      .sort((a, b) => {
        const ro: Record<string, number> = { common: 0, uncommon: 1, rare: 2 };
        const d = (ro[a.rarity] ?? 0) - (ro[b.rarity] ?? 0);
        return d !== 0 ? d : a.name.localeCompare(b.name);
      });

    const perPage = 18;
    const totalPages = Math.max(1, Math.ceil(allCards.length / perPage));
    const pageCards = allCards.slice(this._page * perPage, (this._page + 1) * perPage);

    const countTxt = new Text({ text: `${allCards.length} cards  (${this._page + 1}/${totalPages})`, style: mkS(9, 0x777799) });
    countTxt.anchor.set(0.5, 0); countTxt.position.set(W / 2, 62);
    this.container.addChild(countTxt);

    const cols = 3;
    const cw = 240; const ch = 70;
    const sx = 252; const sy = 76;
    const startX = (W - cols * sx) / 2 + 10;
    const typeCol: Record<string, number> = { strike: 0x8b1a1a, guard: 0x1a3a6b, spell: 0x4a1a6b, virtue: 0x6b5a1a, sin: 0x3a0a1a, companion: 0x1a4a2a };

    for (let i = 0; i < pageCards.length; i++) {
      const card = pageCards[i];
      const col = i % cols; const row = Math.floor(i / cols);
      const cx = startX + col * sx; const cy = 80 + row * sy;
      const cc = new Container(); cc.position.set(cx, cy);

      const bg = new Graphics();
      bg.roundRect(0, 0, cw, ch, 5);
      bg.fill({ color: 0x10102a, alpha: 0.95 });
      bg.rect(0, 0, 4, ch);
      bg.fill({ color: typeCol[card.type] ?? 0x333333, alpha: 0.7 });
      bg.roundRect(0, 0, cw, ch, 5);
      bg.stroke({ color: 0x444466, width: 0.8 });
      cc.addChild(bg);

      const n = new Text({ text: card.name, style: mkS(10, 0xffffff, true) });
      n.position.set(10, 4); cc.addChild(n);

      const costT = new Text({ text: card.cost >= 0 ? `${card.cost}` : "-", style: mkS(10, 0x8888cc, true) });
      costT.position.set(cw - 18, 4); cc.addChild(costT);

      const tr = new Text({ text: `${card.type.toUpperCase()} · ${card.rarity.toUpperCase()}${card.knightOnly ? " · " + card.knightOnly.toUpperCase() : ""}`, style: mkS(7, 0x777799) });
      tr.position.set(10, 19); cc.addChild(tr);

      const d = new Text({ text: card.description, style: mkS(8, 0xaaaaaa, false, cw - 20) });
      d.position.set(10, 33); cc.addChild(d);

      let stats = "";
      if (card.damage > 0) stats += `${card.damage}${card.hits > 1 ? "x" + card.hits : ""} dmg  `;
      if (card.block > 0) stats += `${card.block} blk  `;
      if (card.draw > 0) stats += `+${card.draw} draw`;
      if (stats) {
        const st = new Text({ text: stats, style: mkS(7, 0x668888) });
        st.position.set(10, ch - 13); cc.addChild(st);
      }

      this.container.addChild(cc);
    }

    // Pagination
    if (this._page > 0) {
      this.container.addChild(makeBtn("\u25C0 Prev", 30, H - 48, 80, 26, 0x1a1a33, 0x4466cc, () => { this._page--; this._render(); }));
    }
    if (this._page < totalPages - 1) {
      this.container.addChild(makeBtn("Next \u25B6", W - 110, H - 48, 80, 26, 0x1a1a33, 0x4466cc, () => { this._page++; this._render(); }));
    }
    this.container.addChild(makeBtn("CLOSE", W / 2 - 40, H - 48, 80, 26, 0x2a1a1a, 0x884444, () => this.onClose?.()));
  }

  hide(): void { this.container.visible = false; }
}

// ═══════════════════════════════════════════════════════════════════════════
// RUN HISTORY
// ═══════════════════════════════════════════════════════════════════════════

export class RunHistoryScreen {
  container = new Container();
  onClose: (() => void) | null = null;

  show(): void {
    this.container.removeChildren();
    this.container.visible = true;
    drawAtmosphericBg(this.container);

    const title = new Text({ text: "RUN HISTORY", style: mkS(20, 0xffd700, true) });
    title.anchor.set(0.5, 0); title.position.set(W / 2, 12);
    this.container.addChild(title);

    const history = getRunHistory();

    if (history.length === 0) {
      const empty = new Text({ text: "No runs recorded yet.", style: mkS(12, 0x888888) });
      empty.anchor.set(0.5, 0); empty.position.set(W / 2, 60);
      this.container.addChild(empty);
    } else {
      // Header
      const hdr = new Text({ text: "Knight    A   Result     Score  Act/Fl  Purity  Kills  Deck", style: mkS(8, 0x6688aa) });
      hdr.position.set(30, 45);
      this.container.addChild(hdr);

      for (let i = 0; i < Math.min(history.length, 16); i++) {
        const h = history[i];
        const y = 62 + i * 20;
        const wonText = h.won ? "WIN" : "LOSS";
        const wonColor = h.won ? 0x44ff44 : 0xff4444;
        const knightName = (KNIGHT_DEFS[h.knightId as KnightId]?.name ?? h.knightId).substring(0, 8).padEnd(8);
        const line = `${knightName}  A${String(h.ascension).padStart(2)}  ${wonText.padEnd(6)}  ${String(h.score).padStart(5)}  ${h.act}/${String(h.floor).padStart(2)}    ${String(h.purity).padStart(3)}    ${String(h.enemiesKilled).padStart(4)}   ${h.deckSize}`;
        const lt = new Text({ text: line, style: mkS(8, i === 0 ? 0xdddddd : 0xaaaaaa) });
        lt.position.set(30, y);
        this.container.addChild(lt);

        // Result color indicator
        const dot = new Graphics();
        dot.circle(20, y + 5, 3);
        dot.fill({ color: wonColor });
        this.container.addChild(dot);

        // Date
        const date = new Date(h.timestamp);
        const dateStr = `${date.getMonth() + 1}/${date.getDate()}`;
        const dt = new Text({ text: dateStr, style: mkS(7, 0x666688) });
        dt.position.set(W - 50, y);
        this.container.addChild(dt);
      }
    }

    const closeBtn = makeBtn("CLOSE", W / 2 - 40, H - 48, 80, 26, 0x2a1a1a, 0x884444, () => this.onClose?.());
    this.container.addChild(closeBtn);
  }

  hide(): void { this.container.visible = false; }
}
