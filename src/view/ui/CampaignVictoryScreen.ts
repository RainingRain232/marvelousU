// Campaign victory overlay — shown when P1 wins a campaign scenario.
// Displays the 4-digit unlock code for the next scenario, lists new unlocks,
// and offers "Return to Menu" or "Return to Campaign" buttons.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { GameState } from "@sim/state/GameState";
import { GameMode, GamePhase } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import { campaignState } from "@sim/config/CampaignState";
import { getScenario } from "@sim/config/CampaignDefs";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_WINNER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 30,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
  dropShadow: { color: 0x000000, blur: 10, distance: 3, angle: Math.PI / 4, alpha: 0.9 },
});

const STYLE_SUBTITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xaabbcc,
  letterSpacing: 2,
});

const STYLE_CODE_HEADER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899bb,
  letterSpacing: 2,
});

const STYLE_CODE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 28,
  fill: 0x88ffaa,
  fontWeight: "bold",
  letterSpacing: 8,
  dropShadow: { color: 0x00aa44, blur: 8, distance: 0, angle: 0, alpha: 0.6 },
});

const STYLE_UNLOCK_HEADER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x88ff88,
  letterSpacing: 2,
  fontWeight: "bold",
});

const STYLE_UNLOCK_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x99ccaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 300,
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 2,
});

// ---------------------------------------------------------------------------
// CampaignVictoryScreen
// ---------------------------------------------------------------------------

export class CampaignVictoryScreen {
  readonly container = new Container();

  onReturnToMenu:     (() => void) | null = null;
  onReturnToCampaign: (() => void) | null = null;

  private _vm!: ViewManager;
  private _overlay!: Graphics;
  private _card!: Container;
  private _cardBg!: Graphics;

  private readonly _CARD_W = 380;
  private _cardH = 360;

  private _winnerText!:   Text;
  private _subtitleText!: Text;
  private _codeHeader!:   Text;
  private _codeText!:     Text;
  private _unlockHeader!: Text;
  private _unlockText!:   Text;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  private _unsubscribers: Array<() => void> = [];
  private _onResize: (() => void) | null = null;

  init(vm: ViewManager, state: GameState): void {
    this._vm = vm;

    this._overlay = new Graphics();
    this.container.addChild(this._overlay);

    this._card = new Container();
    this._cardBg = new Graphics();
    this._card.addChild(this._cardBg);
    this.container.addChild(this._card);

    this._buildCard();

    this.container.visible = false;
    vm.addToLayer("ui", this.container);
    this._layout();
    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);

    // React to phase changes — only show if campaign mode and P1 wins
    this._unsubscribers.push(
      EventBus.on("phaseChanged", ({ phase }) => {
        if (phase === GamePhase.RESOLVE && state.gameMode === GameMode.CAMPAIGN) {
          if (state.winnerId === "p1") {
            this._show(state);
          }
        }
      }),
    );
  }

  destroy(): void {
    for (const unsub of this._unsubscribers) unsub();
    this._unsubscribers = [];
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private _buildCard(): void {
    const CW = this._CARD_W;

    let y = 24;

    // Winner text
    this._winnerText = new Text({ text: "VICTORY!", style: STYLE_WINNER });
    this._winnerText.anchor.set(0.5, 0);
    this._winnerText.position.set(CW / 2, y);
    this._card.addChild(this._winnerText);
    y += 44;

    // Subtitle
    this._subtitleText = new Text({ text: "SCENARIO COMPLETE", style: STYLE_SUBTITLE });
    this._subtitleText.anchor.set(0.5, 0);
    this._subtitleText.position.set(CW / 2, y);
    this._card.addChild(this._subtitleText);
    y += 26;

    // Divider
    this._card.addChild(
      new Graphics().rect(24, y, CW - 48, 1).fill({ color: 0xffd700, alpha: 0.3 }),
    );
    y += 12;

    // Code header
    this._codeHeader = new Text({ text: "YOUR UNLOCK CODE", style: STYLE_CODE_HEADER });
    this._codeHeader.anchor.set(0.5, 0);
    this._codeHeader.position.set(CW / 2, y);
    this._card.addChild(this._codeHeader);
    y += 18;

    // Code display
    this._codeText = new Text({ text: "----", style: STYLE_CODE });
    this._codeText.anchor.set(0.5, 0);
    this._codeText.position.set(CW / 2, y);
    this._card.addChild(this._codeText);
    y += 46;

    // Divider
    this._card.addChild(
      new Graphics().rect(24, y, CW - 48, 1).fill({ color: 0x334455, alpha: 0.6 }),
    );
    y += 10;

    // Unlock header
    this._unlockHeader = new Text({ text: "NEW UNLOCKS", style: STYLE_UNLOCK_HEADER });
    this._unlockHeader.position.set(24, y);
    this._card.addChild(this._unlockHeader);
    y += 18;

    // Unlock list
    this._unlockText = new Text({ text: "", style: STYLE_UNLOCK_TEXT });
    this._unlockText.position.set(24, y);
    this._card.addChild(this._unlockText);
    y += 70;

    // Divider
    this._card.addChild(
      new Graphics().rect(24, y, CW - 48, 1).fill({ color: 0x334455, alpha: 0.4 }),
    );
    y += 14;

    // Buttons
    const BW = (CW - 24 * 2 - 12) / 2;
    const BH = 38;

    const menuBtn = this._makeBtn("RETURN TO MENU", BW, BH, false);
    menuBtn.position.set(24, y);
    menuBtn.on("pointerdown", () => { window.location.reload(); });
    this._card.addChild(menuBtn);

    const campaignBtn = this._makeBtn("RETURN TO CAMPAIGN", BW, BH, true);
    campaignBtn.position.set(24 + BW + 12, y);
    campaignBtn.on("pointerdown", () => { this.onReturnToCampaign?.(); });
    this._card.addChild(campaignBtn);

    y += BH + 16;
    this._cardH = y;
    this._drawCardBg();
  }

  private _drawCardBg(): void {
    this._cardBg.clear()
      .roundRect(0, 0, this._CARD_W, this._cardH, 10)
      .fill({ color: 0x0a0a18, alpha: 0.97 })
      .roundRect(0, 0, this._CARD_W, this._cardH, 10)
      .stroke({ color: 0xffd700, alpha: 0.7, width: 2 });
  }

  private _show(state: GameState): void {
    const scenarioNum = state.campaignScenario ?? 1;
    const scenario = getScenario(scenarioNum);

    if (!scenario) {
      this.container.visible = false;
      return;
    }

    // Apply the victory (unlocks units, buildings, etc. and next scenario)
    campaignState.applyVictory(scenarioNum);

    this._subtitleText.text = `SCENARIO ${scenarioNum}: ${scenario.title.toUpperCase()}`;

    if (scenarioNum >= 20) {
      this._codeHeader.text = "CAMPAIGN COMPLETE!";
      this._codeText.text = "----";
      this._codeText.style.fill = 0xffd700;
    } else {
      this._codeHeader.text = "YOUR UNLOCK CODE";
      this._codeText.text = scenario.victoryCode;
      this._codeText.style.fill = 0x88ffaa;
    }

    // Build unlocks text
    const u = scenario.unlocks;
    const parts: string[] = [];
    if (u.units?.length) parts.push("Units: " + u.units.map(_unitLabel).join(", "));
    if (u.buildings?.length) parts.push("Buildings: " + u.buildings.map(_buildingLabel).join(", "));
    if (u.races?.length) parts.push("Races: " + u.races.map(_capitalize).join(", "));
    if (u.leaders?.length) parts.push("Leaders: " + u.leaders.map(_capitalize).join(", "));
    this._unlockText.text = parts.length > 0 ? parts.join("\n") : "Nothing new — the final battle awaits.";

    this.container.visible = true;
  }

  private _makeBtn(label: string, w: number, h: number, primary: boolean): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: primary ? 0x0a2a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({ text: label, style: STYLE_BTN });
    txt.style.fontSize = 11;
    txt.style.fill = primary ? 0x88ffaa : 0x88ccff;
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
    btn.on("pointerout",  () => { bg.tint = 0xffffff; });

    return btn;
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._overlay.clear().rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });

    this._card.position.set(
      Math.floor((sw - this._CARD_W) / 2),
      Math.floor((sh - this._cardH) / 2),
    );
  }
}

// ---------------------------------------------------------------------------
// Label helpers
// ---------------------------------------------------------------------------

function _unitLabel(u: string): string {
  return u.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function _buildingLabel(b: string): string {
  return b.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function _capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export const campaignVictoryScreen = new CampaignVictoryScreen();
