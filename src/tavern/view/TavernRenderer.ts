// ---------------------------------------------------------------------------
// Tavern mode — card and table renderer
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { TavernState } from "../state/TavernState";
import { TavernPhase } from "../state/TavernState";
import { SUIT_COLORS, SUIT_SYMBOLS, VALUE_NAMES, cardScore, TavernConfig, type Card } from "../config/TavernConfig";

const CW = TavernConfig.CARD_WIDTH;
const CH = TavernConfig.CARD_HEIGHT;
const FONT = "Georgia, serif";
const COL = 0xcc8844;

export class TavernRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiContainer = new Container();
  private _hitCb: (() => void) | null = null;
  private _standCb: (() => void) | null = null;
  private _doubleCb: (() => void) | null = null;
  private _betCb: ((amount: number) => void) | null = null;
  private _nextCb: (() => void) | null = null;

  setCallbacks(hit: () => void, stand: () => void, double: () => void, bet: (n: number) => void, next: () => void): void {
    this._hitCb = hit; this._standCb = stand; this._doubleCb = double; this._betCb = bet; this._nextCb = next;
  }

  init(sw: number, sh: number): void {
    this.container.removeChildren();
    // Tavern background
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh).fill({ color: 0x1a1208 });
    // Wood plank texture
    for (let py = 0; py < sh; py += 20) {
      bg.moveTo(0, py).lineTo(sw, py).stroke({ color: 0x221a0e, width: 0.4, alpha: 0.15 });
      if (py % 40 === 0) bg.moveTo(sw * 0.3, py).lineTo(sw * 0.3, py + 20).stroke({ color: 0x1a120a, width: 0.3, alpha: 0.1 });
      if (py % 60 === 0) bg.moveTo(sw * 0.7, py).lineTo(sw * 0.7, py + 20).stroke({ color: 0x1a120a, width: 0.3, alpha: 0.1 });
    }
    // Torch glow
    for (const [tx, ty] of [[40, 60], [sw - 40, 60]]) {
      for (let r = 1; r <= 4; r++) bg.circle(tx, ty, r * 50).fill({ color: 0xff8833, alpha: 0.006 / r });
    }
    // Vignette
    for (let v = 0; v < 5; v++) {
      const inset = v * 45;
      bg.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: 0.025 });
      bg.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: 0.025 });
    }
    this.container.addChild(bg);

    // Green felt table area
    const tableX = sw * 0.1, tableY = sh * 0.2, tableW = sw * 0.8, tableH = sh * 0.6;
    const table = new Graphics();
    table.roundRect(tableX - 4, tableY - 4, tableW + 8, tableH + 8, 12).fill({ color: 0x2a1a0a, alpha: 0.6 }); // wood border
    table.roundRect(tableX, tableY, tableW, tableH, 10).fill({ color: 0x1a4a1a, alpha: 0.7 }); // felt
    table.roundRect(tableX, tableY, tableW, tableH, 10).stroke({ color: 0x3a6a3a, width: 1, alpha: 0.2 });
    // Felt texture
    for (let fy = 0; fy < tableH; fy += 8) {
      table.moveTo(tableX + 5, tableY + fy).lineTo(tableX + tableW - 5, tableY + fy).stroke({ color: 0x1a3a1a, width: 0.3, alpha: 0.05 });
    }
    this.container.addChild(table);

    this._gfx = new Graphics();
    this._uiContainer = new Container();
    this.container.addChild(this._gfx);
    this.container.addChild(this._uiContainer);
  }

  draw(state: TavernState, sw: number, sh: number): void {
    this._gfx.clear();
    while (this._uiContainer.children.length > 0) this._uiContainer.removeChildAt(0);

    const cx = sw / 2;
    const g = this._gfx;

    // Dealer label
    this._addText(`${state.opponent.name} ${state.opponent.title}`, cx, sh * 0.22, { fontSize: 12, fill: state.opponent.color, fontWeight: "bold" }, true);

    // Dealer hand
    const dealerScore = state.phase !== TavernPhase.PLAYER_TURN && state.phase !== TavernPhase.BETTING
      ? cardScore(state.dealerHand) : "?";
    this._addText(`${dealerScore}`, cx, sh * 0.25, { fontSize: 14, fill: 0xccddcc }, true);
    this._drawHand(g, state.dealerHand, cx, sh * 0.32);

    // Player hand
    const playerScore = cardScore(state.playerHand);
    this._addText(`Your hand: ${playerScore}`, cx, sh * 0.52, { fontSize: 12, fill: playerScore > 21 ? 0xff4444 : playerScore === 21 ? 0xffd700 : 0xccddcc }, true);
    this._drawHand(g, state.playerHand, cx, sh * 0.58);

    // HUD — top bar
    g.rect(0, 0, sw, 40).fill({ color: 0x0a0806, alpha: 0.8 });
    g.moveTo(0, 40).lineTo(sw, 40).stroke({ color: COL, width: 1, alpha: 0.3 });
    this._addText("\u{1F3BA} TAVERN", 12, 6, { fontSize: 14, fill: COL, fontWeight: "bold", letterSpacing: 3 });
    this._addText(`Gold: ${state.gold}`, 180, 8, { fontSize: 12, fill: 0xffd700 });
    this._addText(`Round: ${state.round}/${state.maxRounds}`, 310, 8, { fontSize: 12, fill: 0xccddcc });
    this._addText(`W:${state.wins} L:${state.losses} P:${state.pushes}`, 460, 8, { fontSize: 11, fill: 0x88aacc });
    this._addText(`Streak: ${state.streak}`, 620, 8, { fontSize: 11, fill: state.streak >= 3 ? 0xffd700 : 0xccddcc });
    this._addText(`Bet: ${state.currentBet}g`, cx, 24, { fontSize: 10, fill: 0xffaa44 }, true);

    // Deck counter
    const remaining = state.deck.length - state.deckIndex;
    this._addText(`Deck: ${remaining}`, sw - 60, 24, { fontSize: 9, fill: 0x887766 });

    // Suit power legend (small, bottom of table)
    this._addText("\u2694+50%win  \u{1F6E1}-30%loss  \u{1F451}+25%win  \u{1F3C6}+5g", cx, sh * 0.73, { fontSize: 7, fill: 0x556655 }, true);

    // Announcements
    for (const ann of state.announcements) {
      const alpha = Math.min(1, ann.timer / 1.5);
      const t = new Text({ text: ann.text, style: new TextStyle({ fontFamily: FONT, fontSize: 24, fill: ann.color, fontWeight: "bold", letterSpacing: 2 }) });
      t.alpha = alpha; t.anchor.set(0.5, 0.5);
      t.position.set(cx, sh * 0.47);
      this._uiContainer.addChild(t);
    }

    // Action buttons
    const btnY = sh * 0.78;
    if (state.phase === TavernPhase.BETTING) {
      // Dynamic bet options including all-in
      const minB = Math.min(state.opponent.minBet, state.gold);
      const betOptions = new Set<number>();
      betOptions.add(minB);
      if (minB * 2 <= state.gold) betOptions.add(minB * 2);
      if (minB * 4 <= state.gold) betOptions.add(minB * 4);
      if (state.gold > minB * 4) betOptions.add(state.gold); // ALL IN
      const bets = [...betOptions].filter(b => b > 0 && b <= state.gold);
      let bx = cx - (bets.length * 58) / 2;
      for (const bet of bets) {
        const isAllIn = bet === state.gold && bet > minB * 2;
        this._button(isAllIn ? `ALL IN\n${bet}g` : `${bet}g`, bx, btnY, 54, 32, isAllIn ? 0xff4444 : 0xffd700, () => this._betCb?.(bet));
        bx += 58;
      }
    } else if (state.phase === TavernPhase.PLAYER_TURN) {
      this._button("HIT", cx - 110, btnY, 65, 34, 0x44cc44, () => this._hitCb?.());
      this._button("STAND", cx - 35, btnY, 70, 34, 0xcc8844, () => this._standCb?.());
      if (state.playerHand.length === 2 && state.gold >= state.currentBet * 2) {
        this._button("DOUBLE", cx + 45, btnY, 75, 34, 0xcc4444, () => this._doubleCb?.());
      }
    } else if (state.phase === TavernPhase.RESULT) {
      this._button("NEXT ROUND", cx - 55, btnY, 110, 34, COL, () => this._nextCb?.());
    }

    // Log (bottom)
    const last3 = state.log.slice(-3);
    for (let li = 0; li < last3.length; li++) {
      this._addText(last3[li], cx, sh * 0.88 + li * 14, { fontSize: 9, fill: 0x887766 }, true);
    }
  }

  private _drawHand(g: Graphics, cards: Card[], cx: number, cy: number): void {
    const totalW = cards.length * (CW + 8) - 8;
    let x = cx - totalW / 2;
    for (const card of cards) {
      this._drawCard(g, card, x, cy);
      x += CW + 8;
    }
  }

  private _drawCard(g: Graphics, card: Card, x: number, y: number): void {
    // Card shadow
    g.roundRect(x + 2, y + 2, CW, CH, 5).fill({ color: 0x000000, alpha: 0.25 });

    if (!card.faceUp) {
      // Card back — ornate pattern
      g.roundRect(x, y, CW, CH, 5).fill({ color: 0x3a2a1a });
      g.roundRect(x, y, CW, CH, 5).stroke({ color: 0x5a4a3a, width: 1.5 });
      g.roundRect(x + 4, y + 4, CW - 8, CH - 8, 3).stroke({ color: 0x5a4a3a, width: 0.5 });
      // Diamond pattern
      g.moveTo(x + CW / 2, y + 10).lineTo(x + CW - 10, y + CH / 2).lineTo(x + CW / 2, y + CH - 10).lineTo(x + 10, y + CH / 2).closePath().stroke({ color: 0x6a5a4a, width: 0.8, alpha: 0.3 });
      g.circle(x + CW / 2, y + CH / 2, 6).fill({ color: 0x5a4a3a, alpha: 0.3 });
      return;
    }

    // Card face
    const sc = SUIT_COLORS[card.suit];
    g.roundRect(x, y, CW, CH, 5).fill({ color: 0xeee8dd });
    g.roundRect(x, y, CW, CH, 5).stroke({ color: 0xccbb99, width: 1.5 });
    // Inner border
    g.roundRect(x + 3, y + 3, CW - 6, CH - 6, 3).stroke({ color: 0xddccaa, width: 0.5 });

    // Value (top-left and bottom-right)
    const valStr = VALUE_NAMES[card.value] ?? `${card.value}`;
    this._addText(valStr, x + 8, y + 4, { fontSize: 14, fill: sc, fontWeight: "bold" });
    this._addText(SUIT_SYMBOLS[card.suit], x + 6, y + 18, { fontSize: 10, fill: sc });
    // Bottom-right (rotated via position)
    this._addText(valStr, x + CW - 8, y + CH - 18, { fontSize: 14, fill: sc, fontWeight: "bold" });
    this._addText(SUIT_SYMBOLS[card.suit], x + CW - 18, y + CH - 30, { fontSize: 10, fill: sc });

    // Center suit symbol (large)
    this._addText(SUIT_SYMBOLS[card.suit], x + CW / 2, y + CH / 2 - 10, { fontSize: 22, fill: sc }, true);

    // Face card decoration
    if (card.value >= 11) {
      g.roundRect(x + 10, y + 15, CW - 20, CH - 30, 3).stroke({ color: sc, width: 0.5, alpha: 0.15 });
    }
  }

  private _addText(str: string, x: number, y: number, opts: Partial<TextStyle>, center = false): void {
    const t = new Text({ text: str, style: new TextStyle({ fontFamily: FONT, ...opts } as any) });
    if (center) t.anchor.set(0.5, 0);
    t.position.set(x, y);
    this._uiContainer.addChild(t);
  }

  private _button(label: string, x: number, y: number, w: number, h: number, color: number, onClick: () => void): void {
    const g = new Graphics();
    g.roundRect(x + 1, y + 1, w, h, 4).fill({ color: 0x000000, alpha: 0.2 });
    g.roundRect(x, y, w, h, 4).fill({ color: 0x0a0a0a, alpha: 0.85 });
    g.roundRect(x, y, w, h, 4).stroke({ color, width: 1.5, alpha: 0.6 });
    g.eventMode = "static"; g.cursor = "pointer";
    g.on("pointerdown", onClick);
    this._uiContainer.addChild(g);
    this._addText(label, x + w / 2, y + h / 2 - 7, { fontSize: 11, fill: color, fontWeight: "bold" }, true);
  }

  destroy(): void { this.container.removeChildren(); this._gfx.destroy(); }
}
