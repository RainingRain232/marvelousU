// ---------------------------------------------------------------------------
// Duel mode – HUD (health bars, timer, round indicators, combo counter)
// ---------------------------------------------------------------------------

import { Container, Graphics, Text } from "pixi.js";
import type { DuelState } from "../../duel/state/DuelState";

const HP_BAR_WIDTH = 300;
const HP_BAR_HEIGHT = 20;
const HP_BAR_Y = 30;
const HP_BAR_MARGIN = 30;
const TIMER_SIZE = 50;

const COL_HP_BG = 0x222222;
const COL_HP_FILL = 0x22cc44;
const COL_HP_DAMAGE = 0xcc2222;
const COL_HP_LOW = 0xcc8822;
const COL_HP_BORDER = 0xffffff;
const COL_TIMER_BG = 0x333333;
const COL_TEXT = 0xffffff;
const COL_ROUND_WON = 0xffdd00;
const COL_ROUND_LOST = 0x555555;
const COL_COMBO = 0xff6644;

export class DuelHUD {
  readonly container = new Container();

  private _p1Bar = new Graphics();
  private _p2Bar = new Graphics();
  private _timerBg = new Graphics();
  private _timerText: Text;
  private _p1Name: Text;
  private _p2Name: Text;
  private _p1Rounds = new Container();
  private _p2Rounds = new Container();
  private _comboText: Text;
  private _announcementText: Text;

  private _screenW = 0;

  constructor() {
    this._timerText = new Text({
      text: "99",
      style: { fontFamily: "monospace", fontSize: 28, fill: COL_TEXT, fontWeight: "bold" },
    });
    this._p1Name = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 14, fill: COL_TEXT },
    });
    this._p2Name = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 14, fill: COL_TEXT },
    });
    this._comboText = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 20, fill: COL_COMBO, fontWeight: "bold" },
    });
    this._announcementText = new Text({
      text: "",
      style: { fontFamily: "monospace", fontSize: 48, fill: COL_TEXT, fontWeight: "bold",
        stroke: { color: 0x000000, width: 4 } },
    });

    this.container.addChild(
      this._p1Bar,
      this._p2Bar,
      this._timerBg,
      this._timerText,
      this._p1Name,
      this._p2Name,
      this._p1Rounds,
      this._p2Rounds,
      this._comboText,
      this._announcementText,
    );
  }

  build(sw: number, _sh: number, p1Name: string, p2Name: string): void {
    this._screenW = sw;
    this._p1Name.text = p1Name;
    this._p2Name.text = p2Name;

    // Position names
    this._p1Name.position.set(HP_BAR_MARGIN, HP_BAR_Y - 18);
    this._p2Name.position.set(sw - HP_BAR_MARGIN - HP_BAR_WIDTH, HP_BAR_Y - 18);

    // Timer background
    this._timerBg.clear();
    const timerX = (sw - TIMER_SIZE) / 2;
    this._timerBg.roundRect(timerX, HP_BAR_Y - 5, TIMER_SIZE, TIMER_SIZE, 6);
    this._timerBg.fill({ color: COL_TIMER_BG, alpha: 0.8 });
    this._timerBg.stroke({ color: COL_HP_BORDER, width: 2 });

    this._timerText.position.set(sw / 2 - 14, HP_BAR_Y + 5);

    // Announcement centered
    this._announcementText.anchor.set(0.5);
    this._announcementText.position.set(sw / 2, 250);
    this._announcementText.visible = false;

    // Combo text
    this._comboText.visible = false;
  }

  update(state: DuelState): void {
    const sw = this._screenW;
    const [f1, f2] = state.fighters;

    // P1 health bar (left, depletes right-to-left)
    this._p1Bar.clear();
    this._p1Bar.rect(HP_BAR_MARGIN, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this._p1Bar.fill({ color: COL_HP_BG });
    const p1Pct = Math.max(0, f1.hp / f1.maxHp);
    const p1Color = p1Pct < 0.25 ? COL_HP_DAMAGE : p1Pct < 0.5 ? COL_HP_LOW : COL_HP_FILL;
    this._p1Bar.rect(HP_BAR_MARGIN, HP_BAR_Y, HP_BAR_WIDTH * p1Pct, HP_BAR_HEIGHT);
    this._p1Bar.fill({ color: p1Color });
    this._p1Bar.rect(HP_BAR_MARGIN, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this._p1Bar.stroke({ color: COL_HP_BORDER, width: 2 });

    // P2 health bar (right, depletes left-to-right)
    this._p2Bar.clear();
    const p2X = sw - HP_BAR_MARGIN - HP_BAR_WIDTH;
    this._p2Bar.rect(p2X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this._p2Bar.fill({ color: COL_HP_BG });
    const p2Pct = Math.max(0, f2.hp / f2.maxHp);
    const p2Color = p2Pct < 0.25 ? COL_HP_DAMAGE : p2Pct < 0.5 ? COL_HP_LOW : COL_HP_FILL;
    const p2FillW = HP_BAR_WIDTH * p2Pct;
    this._p2Bar.rect(p2X + HP_BAR_WIDTH - p2FillW, HP_BAR_Y, p2FillW, HP_BAR_HEIGHT);
    this._p2Bar.fill({ color: p2Color });
    this._p2Bar.rect(p2X, HP_BAR_Y, HP_BAR_WIDTH, HP_BAR_HEIGHT);
    this._p2Bar.stroke({ color: COL_HP_BORDER, width: 2 });

    // Timer
    const seconds = Math.ceil(state.round.timeRemaining / 60);
    this._timerText.text = String(Math.max(0, seconds));

    // Round indicators
    this._drawRoundDots(this._p1Rounds, HP_BAR_MARGIN, HP_BAR_Y + HP_BAR_HEIGHT + 6, state, 0);
    this._drawRoundDots(this._p2Rounds, sw - HP_BAR_MARGIN - HP_BAR_WIDTH, HP_BAR_Y + HP_BAR_HEIGHT + 6, state, 1);

    // Combo counter
    const activeCombo = f1.comboCount > 1 ? f1 : f2.comboCount > 1 ? f2 : null;
    if (activeCombo && activeCombo.comboCount > 1) {
      this._comboText.visible = true;
      this._comboText.text = `${activeCombo.comboCount} HITS!`;
      // Show near the attacker
      this._comboText.position.set(
        activeCombo.position.x - 30,
        activeCombo.position.y - 130,
      );
    } else {
      this._comboText.visible = false;
    }

    // Announcement
    if (state.announcement) {
      this._announcementText.visible = true;
      this._announcementText.text = state.announcement;
    } else {
      this._announcementText.visible = false;
    }
  }

  private _drawRoundDots(
    container: Container,
    x: number,
    y: number,
    state: DuelState,
    playerId: number,
  ): void {
    container.removeChildren();
    const g = new Graphics();
    const roundsNeeded = Math.ceil(state.bestOf / 2);
    const wins = state.roundResults.filter((w) => w === playerId).length;

    for (let i = 0; i < roundsNeeded; i++) {
      const dotX = x + i * 20 + 8;
      g.circle(dotX, y + 5, 6);
      g.fill({ color: i < wins ? COL_ROUND_WON : COL_ROUND_LOST });
      g.stroke({ color: COL_HP_BORDER, width: 1 });
    }
    container.addChild(g);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
