// Scenario selection screen for campaign mode.
// Layout: code-input bar at top, scrollable scenario card grid on the left,
// detail panel on the right (mirrors RaceSelectScreen structure).
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { SCENARIO_DEFINITIONS } from "@sim/config/CampaignDefs";
import type { ScenarioDef } from "@sim/config/CampaignDefs";
import { campaignState } from "@sim/config/CampaignState";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_SCENARIO_NUM = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SCENARIO_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xaabbcc,
  letterSpacing: 0,
});

const STYLE_LOCKED = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x445566,
  letterSpacing: 1,
});

const STYLE_DETAIL_NUM = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffd700,
  letterSpacing: 2,
});

const STYLE_DETAIL_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_DETAIL_BRIEFING = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaabbcc,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 224,
});

const STYLE_UNLOCK_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88ff88,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_UNLOCK_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88ffaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 224,
});

const STYLE_CODE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x8899bb,
  letterSpacing: 1,
});

const STYLE_CODE_INPUT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 3,
});

const STYLE_CODE_HINT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x556677,
  letterSpacing: 1,
});

const BG_COLOR       = 0x0a0a18;
const BORDER_COLOR   = 0xffd700;
const SEL_BORDER     = 0xffd700;
const NORM_BORDER    = 0x334455;
const LOCKED_BORDER  = 0x1a2a3a;

// Grid layout
const CARD_W     = 145;
const CARD_H     = 72;
const CARD_GAP   = 8;
const GRID_COLS  = 2;
const GRID_PAD   = 14;
const GRID_W     = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + GRID_PAD * 2;

// Detail panel
const DETAIL_W   = 256;
const DETAIL_PAD = 16;

// Code input bar
const CODE_BAR_H = 52;

// Total card dimensions
const CARD_TOTAL_W = GRID_W + DETAIL_W + 24;
const CARD_TOTAL_H = 480;

// ---------------------------------------------------------------------------
// ScenarioSelectScreen
// ---------------------------------------------------------------------------

export class ScenarioSelectScreen {
  readonly container = new Container();

  onBack:     (() => void) | null = null;
  onNext:     (() => void) | null = null;

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _card!: Container;

  // Code input state
  private _codeValue = "";
  private _codeDisplay!: Text;
  private _codeHint!: Text;

  // Grid
  private _gridClip!: Container;
  private _gridContent!: Container;
  private _scrollOffset = 0;
  private _totalGridH = 0;
  private _scrollbarThumb!: Graphics;

  // Cards
  private _cards: Array<{ container: Container; bg: Graphics; def: ScenarioDef }> = [];

  // Selection
  private _selectedNumber = 1;

  // Detail panel refs
  private _detailPanel!: Container;
  private _detailNum!: Text;
  private _detailTitle!: Text;
  private _detailBriefing!: Text;
  private _detailUnlockText!: Text;
  private _detailLockedNote!: Text;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    // Outer card
    const card = new Container();
    this._card = card;
    this.container.addChild(card);

    this._buildCard(card);

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._refreshCards();
    this._selectScenario(this._selectedNumber, false);
  }

  hide(): void {
    this.container.visible = false;
  }

  get selectedScenario(): number {
    return this._selectedNumber;
  }

  // ---------------------------------------------------------------------------
  // Card construction
  // ---------------------------------------------------------------------------

  private _buildCard(card: Container): void {
    const CW = CARD_TOTAL_W;
    const CH = CARD_TOTAL_H;

    card.addChild(
      new Graphics()
        .roundRect(0, 0, CW, CH, 8)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CW, CH, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 80, 28);
    backBtn.position.set(16, 14);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Title
    const title = new Text({ text: "CAMPAIGN", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CW / 2, 12);
    card.addChild(title);

    // Next button
    const nextBtn = this._makeNavBtn("START >", 90, 28, true);
    nextBtn.position.set(CW - 106, 14);
    nextBtn.on("pointerdown", () => this._onStartClicked());
    card.addChild(nextBtn);

    // Divider below title
    card.addChild(
      new Graphics()
        .rect(16, 48, CW - 32, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Code input bar
    this._buildCodeBar(card, 16, 56, CW - 32);

    // Divider below code bar
    const codeDivY = 56 + CODE_BAR_H + 4;
    card.addChild(
      new Graphics()
        .rect(16, codeDivY, CW - 32, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    const contentY = codeDivY + 8;
    const contentH = CH - contentY - 8;

    // Scrollable grid
    this._buildGrid(card, 16, contentY, contentH);

    // Detail panel
    this._buildDetail(card, 16 + GRID_W + 8, contentY, contentH);

    // Scrollbar track
    const SBX = 16 + GRID_W - 6;
    const trackBg = new Graphics()
      .rect(SBX, contentY, 4, contentH)
      .fill({ color: 0x1a2233 });
    card.addChild(trackBg);

    this._scrollbarThumb = new Graphics();
    card.addChild(this._scrollbarThumb);
    this._updateScrollbar(SBX, contentY, contentH);
  }

  // ---------------------------------------------------------------------------
  // Code input bar
  // ---------------------------------------------------------------------------

  private _buildCodeBar(parent: Container, x: number, y: number, _w: number): void {
    const barContainer = new Container();
    barContainer.position.set(x, y);
    parent.addChild(barContainer);

    // Label
    const label = new Text({ text: "ENTER CODE:", style: STYLE_CODE_LABEL });
    label.position.set(0, 4);
    barContainer.addChild(label);

    // Input box background
    const inputW = 120;
    const inputH = 30;
    const inputBg = new Graphics()
      .roundRect(0, 0, inputW, inputH, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, inputW, inputH, 4)
      .stroke({ color: 0x334466, width: 1.5 });
    inputBg.position.set(label.width + 12, 0);
    barContainer.addChild(inputBg);

    this._codeDisplay = new Text({ text: "____", style: STYLE_CODE_INPUT });
    this._codeDisplay.anchor.set(0.5, 0.5);
    this._codeDisplay.position.set(inputBg.x + inputW / 2, inputH / 2);
    barContainer.addChild(this._codeDisplay);

    // Redeem button
    const redeemBtn = this._makeNavBtn("REDEEM", 80, 28, true);
    redeemBtn.position.set(label.width + 12 + inputW + 10, 1);
    redeemBtn.on("pointerdown", () => this._redeemCode());
    barContainer.addChild(redeemBtn);

    // Hint text
    this._codeHint = new Text({ text: "Type a 4-digit code to unlock scenarios", style: STYLE_CODE_HINT });
    this._codeHint.position.set(0, 34);
    barContainer.addChild(this._codeHint);

    // Keyboard listener (added to window while screen is visible)
    window.addEventListener("keydown", (e) => {
      if (!this.container.visible) return;
      if (e.key >= "0" && e.key <= "9" && this._codeValue.length < 4) {
        this._codeValue += e.key;
        this._updateCodeDisplay();
      } else if (e.key === "Backspace") {
        this._codeValue = this._codeValue.slice(0, -1);
        this._updateCodeDisplay();
      } else if (e.key === "Enter") {
        this._redeemCode();
      }
    });
  }

  private _updateCodeDisplay(): void {
    const display = this._codeValue.padEnd(4, "_");
    this._codeDisplay.text = display;
  }

  private _redeemCode(): void {
    if (this._codeValue.length !== 4) {
      this._codeHint.text = "Enter all 4 digits first.";
      this._codeHint.style.fill = 0xff6644;
      return;
    }
    const result = campaignState.redeemCode(this._codeValue);
    if (!result) {
      this._codeHint.text = "Invalid code. Try again.";
      this._codeHint.style.fill = 0xff4444;
    } else {
      this._codeHint.text = `Unlocked: Scenario ${result.number + 1} and new units!`;
      this._codeHint.style.fill = 0x88ff88;
      this._refreshCards();
    }
    this._codeValue = "";
    this._updateCodeDisplay();
  }

  // ---------------------------------------------------------------------------
  // Grid
  // ---------------------------------------------------------------------------

  private _buildGrid(parent: Container, x: number, y: number, h: number): void {
    // Clip container
    const clipMask = new Graphics().rect(x, y, GRID_W, h).fill({ color: 0xffffff });
    parent.addChild(clipMask);

    this._gridClip = new Container();
    this._gridClip.position.set(x, y);
    this._gridClip.mask = clipMask;
    parent.addChild(this._gridClip);

    this._gridContent = new Container();
    this._gridClip.addChild(this._gridContent);

    this._populateGrid();

    // Wheel scroll
    this._gridClip.eventMode = "static";
    this._gridClip.hitArea = { contains: (px: number, py: number) =>
      px >= 0 && px <= GRID_W && py >= 0 && py <= h } as unknown as import("pixi.js").IHitArea;
    this._gridClip.on("wheel", (e: WheelEvent) => {
      this._scrollOffset = Math.max(
        0,
        Math.min(
          this._totalGridH - h,
          this._scrollOffset + e.deltaY * 0.4,
        ),
      );
      this._gridContent.y = -this._scrollOffset;
      this._updateScrollbar(16 + GRID_W - 6, this._gridClip.y, h);
    });
  }

  private _populateGrid(): void {
    this._gridContent.removeChildren();
    this._cards = [];

    let row = 0;
    let col = 0;

    for (const def of SCENARIO_DEFINITIONS) {
      const unlocked = campaignState.isScenarioUnlocked(def.number);
      const cx = GRID_PAD + col * (CARD_W + CARD_GAP);
      const cy = GRID_PAD + row * (CARD_H + CARD_GAP);

      const cardContainer = new Container();
      cardContainer.position.set(cx, cy);

      const border = def.number === this._selectedNumber ? SEL_BORDER : (unlocked ? NORM_BORDER : LOCKED_BORDER);
      const cardBg = new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .fill({ color: 0x0d1525 })
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .stroke({ color: border, width: 1.5 });
      cardContainer.addChild(cardBg);

      // Scenario number
      const numText = new Text({ text: `#${def.number}`, style: STYLE_SCENARIO_NUM });
      numText.position.set(10, 10);
      cardContainer.addChild(numText);

      if (unlocked) {
        const titleText = new Text({ text: def.title, style: STYLE_SCENARIO_TITLE });
        titleText.position.set(10, 30);
        titleText.style.wordWrap = true;
        titleText.style.wordWrapWidth = CARD_W - 20;
        cardContainer.addChild(titleText);
      } else {
        const lockedText = new Text({ text: "LOCKED", style: STYLE_LOCKED });
        lockedText.position.set(10, 30);
        cardContainer.addChild(lockedText);
      }

      if (unlocked) {
        cardContainer.eventMode = "static";
        cardContainer.cursor = "pointer";
        cardContainer.on("pointerdown", () => this._selectScenario(def.number, true));
        cardContainer.on("pointerover", () => {
          if (def.number !== this._selectedNumber) {
            cardBg.clear()
              .roundRect(0, 0, CARD_W, CARD_H, 6)
              .fill({ color: 0x111a2e })
              .roundRect(0, 0, CARD_W, CARD_H, 6)
              .stroke({ color: 0x4488cc, width: 1.5 });
          }
        });
        cardContainer.on("pointerout", () => {
          if (def.number !== this._selectedNumber) {
            cardBg.clear()
              .roundRect(0, 0, CARD_W, CARD_H, 6)
              .fill({ color: 0x0d1525 })
              .roundRect(0, 0, CARD_W, CARD_H, 6)
              .stroke({ color: NORM_BORDER, width: 1.5 });
          }
        });
      }

      this._gridContent.addChild(cardContainer);
      this._cards.push({ container: cardContainer, bg: cardBg, def });

      col++;
      if (col >= GRID_COLS) {
        col = 0;
        row++;
      }
    }

    const rows = Math.ceil(SCENARIO_DEFINITIONS.length / GRID_COLS);
    this._totalGridH = GRID_PAD + rows * (CARD_H + CARD_GAP) + GRID_PAD;
  }

  private _refreshCards(): void {
    this._populateGrid();
  }

  // ---------------------------------------------------------------------------
  // Detail panel
  // ---------------------------------------------------------------------------

  private _buildDetail(parent: Container, x: number, y: number, h: number): void {
    this._detailPanel = new Container();
    this._detailPanel.position.set(x, y);
    parent.addChild(this._detailPanel);

    // Panel background
    const panelBg = new Graphics()
      .roundRect(0, 0, DETAIL_W, h, 6)
      .fill({ color: 0x0a1220 })
      .roundRect(0, 0, DETAIL_W, h, 6)
      .stroke({ color: 0x223344, width: 1 });
    this._detailPanel.addChild(panelBg);

    let py = DETAIL_PAD;

    this._detailNum = new Text({ text: "SCENARIO 1", style: STYLE_DETAIL_NUM });
    this._detailNum.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailNum);
    py += 22;

    this._detailTitle = new Text({ text: "", style: STYLE_DETAIL_TITLE });
    this._detailTitle.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailTitle);
    py += 28;

    // Accent divider
    this._detailPanel.addChild(
      new Graphics()
        .rect(DETAIL_PAD, py, DETAIL_W - DETAIL_PAD * 2, 1)
        .fill({ color: 0xffd700, alpha: 0.25 }),
    );
    py += 8;

    this._detailBriefing = new Text({ text: "", style: STYLE_DETAIL_BRIEFING });
    this._detailBriefing.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailBriefing);
    py += 120;

    // Unlocks section
    const unlockLabel = new Text({ text: "VICTORY UNLOCKS", style: STYLE_UNLOCK_LABEL });
    unlockLabel.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(unlockLabel);
    py += 16;

    this._detailUnlockText = new Text({ text: "", style: STYLE_UNLOCK_TEXT });
    this._detailUnlockText.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailUnlockText);
    py += 60;

    this._detailLockedNote = new Text({ text: "", style: STYLE_CODE_HINT });
    this._detailLockedNote.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailLockedNote);
  }

  // ---------------------------------------------------------------------------
  // Selection
  // ---------------------------------------------------------------------------

  private _selectScenario(number: number, save: boolean): void {
    this._selectedNumber = number;
    const def = SCENARIO_DEFINITIONS.find((s) => s.number === number);
    if (!def) return;

    if (save) campaignState.setLastScenario(number);

    // Update card borders
    for (const c of this._cards) {
      const unlocked = campaignState.isScenarioUnlocked(c.def.number);
      const sel = c.def.number === number;
      const border = sel ? SEL_BORDER : (unlocked ? NORM_BORDER : LOCKED_BORDER);
      c.bg.clear()
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .fill({ color: sel ? 0x0e1c34 : 0x0d1525 })
        .roundRect(0, 0, CARD_W, CARD_H, 6)
        .stroke({ color: border, width: sel ? 2 : 1.5 });
    }

    // Update detail panel
    this._detailNum.text = `SCENARIO ${def.number}`;
    this._detailTitle.text = def.title;
    this._detailBriefing.text = def.briefing;

    const unlocked = campaignState.isScenarioUnlocked(def.number);
    if (unlocked) {
      this._detailLockedNote.text = "";
      // Build unlock description
      const parts: string[] = [];
      if (def.unlocks.units?.length) {
        parts.push("Units: " + def.unlocks.units.map((u) => _unitLabel(u)).join(", "));
      }
      if (def.unlocks.buildings?.length) {
        parts.push("Buildings: " + def.unlocks.buildings.map((b) => _buildingLabel(b)).join(", "));
      }
      if (def.unlocks.races?.length) {
        parts.push("Races: " + def.unlocks.races.map((r) => _capitalize(r)).join(", "));
      }
      if (def.unlocks.leaders?.length) {
        parts.push("Leaders: " + def.unlocks.leaders.map((l) => _capitalize(l)).join(", "));
      }
      this._detailUnlockText.text = parts.length > 0 ? parts.join("\n") : "—";
    } else {
      this._detailUnlockText.text = "???";
      this._detailLockedNote.text = "Complete previous scenarios to unlock.";
    }
  }

  private _onStartClicked(): void {
    if (!campaignState.isScenarioUnlocked(this._selectedNumber)) return;
    campaignState.setLastScenario(this._selectedNumber);
    this.onNext?.();
  }

  // ---------------------------------------------------------------------------
  // Scrollbar
  // ---------------------------------------------------------------------------

  private _updateScrollbar(sbx: number, trackY: number, trackH: number): void {
    this._scrollbarThumb.clear();
    if (this._totalGridH <= trackH) return;
    const ratio = trackH / this._totalGridH;
    const thumbH = Math.max(20, ratio * trackH);
    const thumbY = trackY + (this._scrollOffset / this._totalGridH) * trackH;
    this._scrollbarThumb
      .roundRect(sbx, thumbY, 4, thumbH, 2)
      .fill({ color: 0x4488cc, alpha: 0.7 });
  }

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  private _makeNavBtn(label: string, w: number, h: number, primary = false): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: primary ? 0x1a3a1a : 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: primary ? 0x44aa66 : 0x4488cc, width: 1.5 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 11,
        fill: primary ? 0x88ffaa : 0x88bbff,
        fontWeight: "bold",
        letterSpacing: 1,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
  }

  // ---------------------------------------------------------------------------
  // Layout
  // ---------------------------------------------------------------------------

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    this._card.position.set(
      Math.floor((sw - CARD_TOTAL_W) / 2),
      Math.floor((sh - CARD_TOTAL_H) / 2),
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

export const scenarioSelectScreen = new ScenarioSelectScreen();
