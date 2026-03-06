// Post-battle statistics overlay — shown on RESOLVE phase before/alongside VictoryScreen.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { EventBus } from "@sim/core/EventBus";
import { GamePhase } from "@/types";
import { battleStatsTracker } from "@sim/systems/BattleStatsTracker";
import { UNIT_DISPLAY_NAMES } from "@view/ui/HoverTooltip";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

const CARD_W = 500;
const PAD = 20;
const ROW_H = 22;
const HEADER_H = 48;
const MVP_SECTION_H = 36;
const DURATION_SECTION_H = 28;
const BUTTON_H = 40;
const BUTTON_MARGIN = 16;

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: BORDER_COLOR,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_COL_HEADER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: BORDER_COLOR,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x888899,
});

const STYLE_P1_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffffff,
  fontWeight: "bold",
});

const STYLE_P2_VALUE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x88ccff,
  fontWeight: "bold",
});

const STYLE_MVP = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffdd88,
});

const STYLE_DURATION = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xaabbcc,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

// ---------------------------------------------------------------------------
// Stat row descriptor
// ---------------------------------------------------------------------------

interface StatRow {
  label: string;
  key: keyof import("@sim/systems/BattleStatsTracker").PlayerBattleStats;
}

const STAT_ROWS: StatRow[] = [
  { label: "Units Spawned", key: "unitsSpawned" },
  { label: "Units Lost",    key: "unitsLost"    },
  { label: "Kills",         key: "kills"        },
  { label: "Damage Dealt",  key: "damageDealt"  },
  { label: "Healing Done",  key: "healingDone"  },
  { label: "Gold Spent",    key: "goldSpent"    },
];

// ---------------------------------------------------------------------------
// BattleStatsScreen
// ---------------------------------------------------------------------------

export class BattleStatsScreen {
  readonly container = new Container();

  /** Called when the user clicks CONTINUE. */
  onContinue: (() => void) | null = null;

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Container;
  private _cardBg!: Graphics;
  private _cardH = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    // Full-screen semi-transparent overlay
    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    // Card container
    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();

    vm.app.renderer.on("resize", () => this._layout());

    // Show when battle resolves
    EventBus.on("phaseChanged", ({ phase }) => {
      if (phase === GamePhase.RESOLVE) {
        this._show(state);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Private — build / show card
  // ---------------------------------------------------------------------------

  private _show(state: GameState): void {
    // Clear any previous content (keep cardBg as first child)
    while (this._card.children.length > 1) {
      this._card.removeChildAt(1);
    }

    const stats = battleStatsTracker.getStats();
    const p1Stats = stats.perPlayer.get("p1");
    const p2Stats = stats.perPlayer.get("p2");

    const durationSec = Math.floor(state.tick / 60);

    let y = PAD;

    // --- Title ---
    const title = new Text({ text: "BATTLE STATISTICS", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, y);
    this._card.addChild(title);
    y += HEADER_H;

    // --- Column headers ---
    const COL_P1_X = PAD + 10;
    const COL_LABEL_X = CARD_W / 2;
    const COL_P2_X = CARD_W - PAD - 10;

    const p1Header = new Text({ text: "PLAYER 1", style: STYLE_COL_HEADER });
    p1Header.anchor.set(0, 0.5);
    p1Header.position.set(COL_P1_X, y);
    this._card.addChild(p1Header);

    const vsLabel = new Text({ text: "VS", style: STYLE_COL_HEADER });
    vsLabel.anchor.set(0.5, 0.5);
    vsLabel.position.set(COL_LABEL_X, y);
    this._card.addChild(vsLabel);

    const p2Header = new Text({ text: "PLAYER 2", style: STYLE_COL_HEADER });
    p2Header.anchor.set(1, 0.5);
    p2Header.position.set(COL_P2_X, y);
    this._card.addChild(p2Header);

    y += ROW_H + 4;

    // Divider line
    const divider = new Graphics()
      .rect(PAD, y, CARD_W - PAD * 2, 1)
      .fill({ color: BORDER_COLOR, alpha: 0.3 });
    this._card.addChild(divider);
    y += 8;

    // --- Stat rows ---
    for (const row of STAT_ROWS) {
      const p1Val = p1Stats ? (p1Stats[row.key] as number) : 0;
      const p2Val = p2Stats ? (p2Stats[row.key] as number) : 0;

      // P1 value (left-aligned)
      const p1Text = new Text({ text: String(p1Val), style: STYLE_P1_VALUE });
      p1Text.anchor.set(0, 0.5);
      p1Text.position.set(COL_P1_X, y + ROW_H / 2);
      this._card.addChild(p1Text);

      // Center label
      const labelText = new Text({ text: row.label, style: STYLE_LABEL });
      labelText.anchor.set(0.5, 0.5);
      labelText.position.set(COL_LABEL_X, y + ROW_H / 2);
      this._card.addChild(labelText);

      // P2 value (right-aligned)
      const p2Text = new Text({ text: String(p2Val), style: STYLE_P2_VALUE });
      p2Text.anchor.set(1, 0.5);
      p2Text.position.set(COL_P2_X, y + ROW_H / 2);
      this._card.addChild(p2Text);

      y += ROW_H;
    }

    y += 8;

    // Divider
    const div2 = new Graphics()
      .rect(PAD, y, CARD_W - PAD * 2, 1)
      .fill({ color: BORDER_COLOR, alpha: 0.2 });
    this._card.addChild(div2);
    y += 10;

    // --- MVP row ---
    const p1Mvp = battleStatsTracker.getMVP("p1");
    const p2Mvp = battleStatsTracker.getMVP("p2");

    const p1MvpName = p1Mvp ? (UNIT_DISPLAY_NAMES[p1Mvp] ?? String(p1Mvp)) : "—";
    const p2MvpName = p2Mvp ? (UNIT_DISPLAY_NAMES[p2Mvp] ?? String(p2Mvp)) : "—";

    const p1MvpText = new Text({ text: `MVP: ${p1MvpName}`, style: STYLE_MVP });
    p1MvpText.anchor.set(0, 0.5);
    p1MvpText.position.set(COL_P1_X, y + MVP_SECTION_H / 2);
    this._card.addChild(p1MvpText);

    const p2MvpText = new Text({ text: `MVP: ${p2MvpName}`, style: STYLE_MVP });
    p2MvpText.anchor.set(1, 0.5);
    p2MvpText.position.set(COL_P2_X, y + MVP_SECTION_H / 2);
    this._card.addChild(p2MvpText);

    y += MVP_SECTION_H;

    // --- Duration ---
    const durText = new Text({
      text: `Battle Duration: ${durationSec}s`,
      style: STYLE_DURATION,
    });
    durText.anchor.set(0.5, 0.5);
    durText.position.set(CARD_W / 2, y + DURATION_SECTION_H / 2);
    this._card.addChild(durText);
    y += DURATION_SECTION_H + 8;

    // Divider
    const div3 = new Graphics()
      .rect(PAD, y, CARD_W - PAD * 2, 1)
      .fill({ color: BORDER_COLOR, alpha: 0.2 });
    this._card.addChild(div3);
    y += BUTTON_MARGIN;

    // --- CONTINUE button ---
    const BW = CARD_W - PAD * 2;
    const continueBtn = new Container();
    continueBtn.eventMode = "static";
    continueBtn.cursor = "pointer";
    continueBtn.position.set(PAD, y);

    const btnBg = new Graphics()
      .roundRect(0, 0, BW, BUTTON_H, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, BW, BUTTON_H, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    continueBtn.addChild(btnBg);

    const btnLabel = new Text({ text: "CONTINUE", style: STYLE_BTN });
    btnLabel.style.fill = 0x88ccff;
    btnLabel.anchor.set(0.5, 0.5);
    btnLabel.position.set(BW / 2, BUTTON_H / 2);
    continueBtn.addChild(btnLabel);

    continueBtn.on("pointerover", () => { btnBg.tint = 0xaaddff; });
    continueBtn.on("pointerout",  () => { btnBg.tint = 0xffffff; });
    continueBtn.on("pointerdown", () => {
      this.container.visible = false;
      this.onContinue?.();
    });

    this._card.addChild(continueBtn);
    y += BUTTON_H + PAD;

    // --- Draw card background ---
    this._cardH = y;
    this._drawCard(this._cardH);

    this.container.visible = true;
    this._layout();
  }

  private _drawCard(h: number): void {
    this._cardBg.clear();
    this._cardBg
      .roundRect(0, 0, CARD_W, h, 10)
      .fill({ color: BG_COLOR, alpha: 0.97 })
      .roundRect(0, 0, CARD_W, h, 10)
      .stroke({ color: BORDER_COLOR, alpha: 0.65, width: 2 });
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear();
    this._overlay.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });

    this._card.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - this._cardH) / 2),
    );
  }
}

export const battleStatsScreen = new BattleStatsScreen();
