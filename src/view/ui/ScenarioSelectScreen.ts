// Scenario selection screen for campaign mode.
// Layout: code-input bar at top, scenario card grid on the left,
// detail panel on the right (matches RaceSelectScreen / LeaderSelectScreen size).
import { Container, Graphics, Text, TextStyle, Sprite, Assets, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { SCENARIO_DEFINITIONS } from "@sim/config/CampaignDefs";
import type { ScenarioDef } from "@sim/config/CampaignDefs";
import { campaignState } from "@sim/config/CampaignState";

// Vite static image imports — leader portraits
import arthurImgUrl from "@/img/arthur.png";
import merlinImgUrl from "@/img/merlin.png";
import guinevereImgUrl from "@/img/queen.png";
import lancelotImgUrl from "@/img/lancelot.png";
import morganImgUrl from "@/img/morgan.png";
import gawainImgUrl from "@/img/gawain.png";
import galahadImgUrl from "@/img/galahad.png";
import nimueImgUrl from "@/img/nimue.png";
import pellinoreImgUrl from "@/img/pellinore.png";
import mordredImgUrl from "@/img/mordred.png";
// Thematic images
import swordImgUrl from "@/img/sword.png";
import throneImgUrl from "@/img/throne.png";
import magicImgUrl from "@/img/magic.png";
import wallsImgUrl from "@/img/walls.png";
import avalonImgUrl from "@/img/avalon.png";
import fairyImgUrl from "@/img/fairy.png";
import undergroundImgUrl from "@/img/underground.png";

/** Map scenario number → image URL (leader portrait or thematic). */
const SCENARIO_IMAGES: Record<number, string> = {
  1: swordImgUrl,          // First Blood
  2: swordImgUrl,          // Firepit Frenzy
  3: swordImgUrl,          // The Barracks
  4: swordImgUrl,          // The Art of War
  5: magicImgUrl,          // The Dark Savant
  6: throneImgUrl,         // The First Skirmish
  7: fairyImgUrl,          // The Long Road (pixies)
  8: arthurImgUrl,         // The Sword in the Stone — Arthur
  9: gawainImgUrl,         // The Green Chapel — Gawain
  10: throneImgUrl,        // The Fisher King's Lands
  11: morganImgUrl,        // Morgan's Bargain — Morgan le Fay
  12: magicImgUrl,         // The Siege Perilous
  13: guinevereImgUrl,     // The Black Knight — Guinevere unlocked
  14: pellinoreImgUrl,     // The Questing Beast — Pellinore
  15: wallsImgUrl,         // The Dolorous Stroke
  16: undergroundImgUrl,   // The Perilous Forest
  17: arthurImgUrl,        // The Tournament at Camelot — Arthur's tournament
  18: galahadImgUrl,       // The Chapel of the Grail — Galahad
  19: lancelotImgUrl,      // Lancelot's Betrayal — Lancelot
  20: avalonImgUrl,        // The Isle of Avalon
  21: galahadImgUrl,       // The Grail War — Grail knights
  22: mordredImgUrl,       // The Walls of Camelot — Mordred besieges
  23: nimueImgUrl,         // The Dragon of the White Tower — Nimue
  24: avalonImgUrl,        // The Road to Avalon
  25: merlinImgUrl,        // The Last Stand — Merlin
};

// ---------------------------------------------------------------------------
// Dimensions — match RaceSelectScreen / LeaderSelectScreen
// ---------------------------------------------------------------------------

const MAIN_W = 1622;
const MAIN_H = 980;
const CORNER_R = 10;

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_SCREEN_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 26,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 4,
});

const STYLE_SCENARIO_NUM = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_SCENARIO_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaabbcc,
  letterSpacing: 0,
});

const STYLE_LOCKED = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x445566,
  letterSpacing: 1,
});

const STYLE_DETAIL_NUM = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffd700,
  letterSpacing: 2,
});

const STYLE_DETAIL_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_DETAIL_BRIEFING = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xaabbcc,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 440,
});

const STYLE_UNLOCK_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x88ff88,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_UNLOCK_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x88ffaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 440,
});

const STYLE_CODE_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x8899bb,
  letterSpacing: 1,
});

const STYLE_CODE_INPUT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 4,
});

const STYLE_CODE_HINT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x556677,
  letterSpacing: 1,
});

const BG_COLOR       = 0x0a0a18;
const BORDER_COLOR   = 0xffd700;
const SEL_BORDER     = 0xffd700;
const NORM_BORDER    = 0x334455;
const LOCKED_BORDER  = 0x1a2a3a;

// Grid layout — 5 columns so 25 scenarios fit in 5 rows (no scroll needed)
const CARD_W     = 185;
const CARD_H     = 82;
const CARD_GAP   = 10;
const GRID_COLS  = 5;
const GRID_PAD   = 16;
const GRID_W     = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + GRID_PAD * 2;

// Detail panel — fills the right side
const DETAIL_W   = MAIN_W - GRID_W - 60;
const DETAIL_PAD = 20;

// Code input bar
const CODE_BAR_H = 52;

// Header / footer heights
const HEADER_H   = 60;
const FOOTER_H   = 68;
const FOOTER_Y   = MAIN_H - FOOTER_H;

// Content area between header and footer
const CONTENT_Y  = HEADER_H + CODE_BAR_H + 16;
const CONTENT_H  = FOOTER_Y - CONTENT_Y - 8;

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
  private _detailPortrait!: Container;
  private _detailNum!: Text;
  private _detailTitle!: Text;
  private _detailBriefing!: Text;
  private _detailUnlockText!: Text;
  private _detailLockedNote!: Text;
  private _onResize: (() => void) | null = null;
  private _onKeydown: ((e: KeyboardEvent) => void) | null = null;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    const card = new Container();
    this._card = card;
    this.container.addChild(card);

    this._buildCard(card);

    vm.addToLayer("ui", this.container);
    this._layout();
    this._onResize = () => this._layout();
    vm.app.renderer.on("resize", this._onResize);
  }

  show(): void {
    this.container.visible = true;
    this._refreshCards();
    this._selectScenario(this._selectedNumber, false);
  }

  hide(): void {
    this.container.visible = false;
  }

  destroy(): void {
    if (this._onResize) {
      this._vm.app.renderer.off("resize", this._onResize);
      this._onResize = null;
    }
    if (this._onKeydown) {
      window.removeEventListener("keydown", this._onKeydown);
      this._onKeydown = null;
    }
    this.container.destroy({ children: true });
  }

  get selectedScenario(): number {
    return this._selectedNumber;
  }

  // ---------------------------------------------------------------------------
  // Card construction
  // ---------------------------------------------------------------------------

  private _buildCard(card: Container): void {
    // Main background panel
    card.addChild(
      new Graphics()
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, MAIN_W, MAIN_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Title
    const title = new Text({ text: "CAMPAIGN", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(MAIN_W / 2, 16);
    card.addChild(title);

    // Divider below title
    card.addChild(
      new Graphics()
        .rect(26, HEADER_H - 4, MAIN_W - 52, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Code input bar
    this._buildCodeBar(card, 26, HEADER_H + 4, MAIN_W - 52);

    // Divider below code bar
    card.addChild(
      new Graphics()
        .rect(26, CONTENT_Y - 8, MAIN_W - 52, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Scenario grid (left side)
    this._buildGrid(card, 26, CONTENT_Y, CONTENT_H);

    // Detail panel (right side)
    this._buildDetail(card, 26 + GRID_W + 12, CONTENT_Y, CONTENT_H);

    // Scrollbar track (only visible if grid overflows)
    const SBX = 26 + GRID_W - 6;
    const trackBg = new Graphics()
      .rect(SBX, CONTENT_Y, 4, CONTENT_H)
      .fill({ color: 0x1a2233 });
    card.addChild(trackBg);

    this._scrollbarThumb = new Graphics();
    card.addChild(this._scrollbarThumb);
    this._updateScrollbar(SBX, CONTENT_Y, CONTENT_H);

    // Footer divider
    card.addChild(
      new Graphics()
        .rect(26, FOOTER_Y, MAIN_W - 52, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.15 }),
    );

    // Back button (footer left)
    const backBtn = this._makeNavBtn("< BACK", 120, 36);
    backBtn.position.set(26, MAIN_H - 54);
    backBtn.on("pointerdown", () => this.onBack?.());
    card.addChild(backBtn);

    // Start button (footer right)
    const nextBtn = this._makeNavBtn("START >", 140, 36, true);
    nextBtn.position.set(MAIN_W - 166, MAIN_H - 54);
    nextBtn.on("pointerdown", () => this._onStartClicked());
    card.addChild(nextBtn);
  }

  // ---------------------------------------------------------------------------
  // Code input bar
  // ---------------------------------------------------------------------------

  private _buildCodeBar(parent: Container, x: number, y: number, _w: number): void {
    const barContainer = new Container();
    barContainer.position.set(x, y);
    parent.addChild(barContainer);

    const label = new Text({ text: "ENTER CODE:", style: STYLE_CODE_LABEL });
    label.position.set(0, 6);
    barContainer.addChild(label);

    const inputW = 140;
    const inputH = 34;
    const inputBg = new Graphics()
      .roundRect(0, 0, inputW, inputH, 4)
      .fill({ color: 0x111122 })
      .roundRect(0, 0, inputW, inputH, 4)
      .stroke({ color: 0x334466, width: 1.5 });
    inputBg.position.set(label.width + 16, 0);
    barContainer.addChild(inputBg);

    this._codeDisplay = new Text({ text: "____", style: STYLE_CODE_INPUT });
    this._codeDisplay.anchor.set(0.5, 0.5);
    this._codeDisplay.position.set(inputBg.x + inputW / 2, inputH / 2);
    barContainer.addChild(this._codeDisplay);

    const redeemBtn = this._makeNavBtn("REDEEM", 100, 32, true);
    redeemBtn.position.set(label.width + 16 + inputW + 14, 1);
    redeemBtn.on("pointerdown", () => this._redeemCode());
    barContainer.addChild(redeemBtn);

    this._codeHint = new Text({ text: "Type a 4-digit code to unlock scenarios", style: STYLE_CODE_HINT });
    this._codeHint.position.set(0, 38);
    barContainer.addChild(this._codeHint);

    this._onKeydown = (e: KeyboardEvent) => {
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
    };
    window.addEventListener("keydown", this._onKeydown);
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
    if (this._codeValue === "9999") {
      campaignState.unlockAll();
      this._codeHint.text = "All scenarios and units unlocked!";
      this._codeHint.style.fill = 0xffdd44;
      this._refreshCards();
      this._codeValue = "";
      this._updateCodeDisplay();
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
    const clipMask = new Graphics().rect(x, y, GRID_W, h).fill({ color: 0xffffff });
    parent.addChild(clipMask);

    this._gridClip = new Container();
    this._gridClip.position.set(x, y);
    this._gridClip.mask = clipMask;
    parent.addChild(this._gridClip);

    this._gridContent = new Container();
    this._gridClip.addChild(this._gridContent);

    this._populateGrid();

    // Wheel scroll (only needed if grid overflows)
    this._gridClip.eventMode = "static";
    this._gridClip.hitArea = { contains: (px: number, py: number) =>
      px >= 0 && px <= GRID_W && py >= 0 && py <= h } as unknown as import("pixi.js").IHitArea;
    this._gridClip.on("wheel", (e: WheelEvent) => {
      const maxScroll = Math.max(0, this._totalGridH - h);
      this._scrollOffset = Math.max(0, Math.min(maxScroll, this._scrollOffset + e.deltaY * 0.4));
      this._gridContent.y = -this._scrollOffset;
      this._updateScrollbar(26 + GRID_W - 6, this._gridClip.y, h);
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
      numText.position.set(12, 10);
      cardContainer.addChild(numText);

      if (unlocked) {
        const titleText = new Text({ text: def.title, style: STYLE_SCENARIO_TITLE });
        titleText.position.set(12, 32);
        titleText.style.wordWrap = true;
        titleText.style.wordWrapWidth = CARD_W - 24;
        cardContainer.addChild(titleText);
      } else {
        const lockedText = new Text({ text: "LOCKED", style: STYLE_LOCKED });
        lockedText.position.set(12, 34);
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

    const panelBg = new Graphics()
      .roundRect(0, 0, DETAIL_W, h, 6)
      .fill({ color: 0x0a1220 })
      .roundRect(0, 0, DETAIL_W, h, 6)
      .stroke({ color: 0x223344, width: 1 });
    this._detailPanel.addChild(panelBg);

    let py = DETAIL_PAD;

    // Portrait area — gold-bordered frame at the top
    const PORTRAIT_W = DETAIL_W - DETAIL_PAD * 2;
    const PORTRAIT_H = 260;
    const portraitFrame = new Graphics()
      .roundRect(DETAIL_PAD, py, PORTRAIT_W, PORTRAIT_H, 6)
      .fill({ color: 0x080e1a })
      .roundRect(DETAIL_PAD, py, PORTRAIT_W, PORTRAIT_H, 6)
      .stroke({ color: 0xffd700, alpha: 0.4, width: 1.5 });
    this._detailPanel.addChild(portraitFrame);

    this._detailPortrait = new Container();
    this._detailPortrait.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailPortrait);

    // Clip mask for portrait so it doesn't overflow the frame
    const portraitMask = new Graphics()
      .roundRect(DETAIL_PAD, py, PORTRAIT_W, PORTRAIT_H, 6)
      .fill({ color: 0xffffff });
    this._detailPanel.addChild(portraitMask);
    this._detailPortrait.mask = portraitMask;

    py += PORTRAIT_H + 14;

    this._detailNum = new Text({ text: "SCENARIO 1", style: STYLE_DETAIL_NUM });
    this._detailNum.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailNum);
    py += 26;

    this._detailTitle = new Text({ text: "", style: STYLE_DETAIL_TITLE });
    this._detailTitle.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailTitle);
    py += 36;

    // Accent divider
    this._detailPanel.addChild(
      new Graphics()
        .rect(DETAIL_PAD, py, DETAIL_W - DETAIL_PAD * 2, 1)
        .fill({ color: 0xffd700, alpha: 0.25 }),
    );
    py += 12;

    this._detailBriefing = new Text({ text: "", style: STYLE_DETAIL_BRIEFING });
    this._detailBriefing.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(this._detailBriefing);
    py += 140;

    // Unlocks section
    const unlockLabel = new Text({ text: "VICTORY UNLOCKS", style: STYLE_UNLOCK_LABEL });
    unlockLabel.position.set(DETAIL_PAD, py);
    this._detailPanel.addChild(unlockLabel);
    py += 20;

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

    // Update portrait
    this._detailPortrait.removeChildren();
    const imgUrl = SCENARIO_IMAGES[def.number];
    if (imgUrl) {
      const PORTRAIT_W = DETAIL_W - DETAIL_PAD * 2;
      const PORTRAIT_H = 260;
      Assets.load(imgUrl).then((tex: Texture) => {
        if (this._selectedNumber !== def.number) return; // selection changed
        const sprite = new Sprite(tex);
        // Scale to fill width, center vertically
        const scale = Math.max(PORTRAIT_W / tex.width, PORTRAIT_H / tex.height);
        sprite.width = tex.width * scale;
        sprite.height = tex.height * scale;
        sprite.x = (PORTRAIT_W - sprite.width) / 2;
        sprite.y = (PORTRAIT_H - sprite.height) / 2;
        this._detailPortrait.addChild(sprite);
      });
    }

    // Update detail panel
    this._detailNum.text = `SCENARIO ${def.number}`;
    this._detailTitle.text = def.title;
    this._detailBriefing.text = def.briefing;

    const unlocked = campaignState.isScenarioUnlocked(def.number);
    if (unlocked) {
      this._detailLockedNote.text = "";
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
        fontSize: 13,
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
      Math.floor((sw - MAIN_W) / 2),
      Math.floor((sh - MAIN_H) / 2),
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
