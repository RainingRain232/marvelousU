// Armory screen — equip items that boost hero unit stats before game start.
// Layout: left scrollable grid of item cards + right detail panel (like LeaderSelectScreen).
// Contains the final "START GAME" button that actually boots the simulation.
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import {
  ARMORY_ITEMS,
  MAX_EQUIPPED_ITEMS,
  type ArmoryItemDef,
  type ArmoryItemId,
} from "@sim/config/ArmoryItemDefs";

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

const STYLE_ITEM_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xeeeeff,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_ITEM_SYMBOL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffffff,
  fontWeight: "bold",
});

const STYLE_DETAIL_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_DETAIL_DESC = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xaabbcc,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 220,
});

const STYLE_STAT_LABEL = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88ff88,
  letterSpacing: 1,
  fontWeight: "bold",
});

const STYLE_STAT_TEXT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x88ffaa,
  letterSpacing: 0,
  wordWrap: true,
  wordWrapWidth: 220,
});

const STYLE_SLOTS = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x8899bb,
  letterSpacing: 1,
});

const STYLE_LOCKED = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0x556677,
  letterSpacing: 1,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_SELECTED_BORDER = 0xffd700;
const CARD_NORMAL_BORDER = 0x334455;
const CARD_LOCKED_BORDER = 0x222233;

// ---------------------------------------------------------------------------
// Layout constants
// ---------------------------------------------------------------------------

const CARD_W = 100;
const CARD_H = 72;
const CARD_GAP = 8;
const GRID_COLS = 4;
const GRID_PAD = 16;

const DETAIL_W = 260;
const DETAIL_PAD = 16;

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class ArmoryScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;

  /** Currently selected items (max MAX_EQUIPPED_ITEMS). */
  private _selectedIds: ArmoryItemId[] = [];

  /** Set of item IDs that are available (unlocked). null = all unlocked (non-campaign). */
  private _unlockedIds: Set<ArmoryItemId> | null = null;

  /** Currently highlighted card (for detail panel). */
  private _focusedId: ArmoryItemId = ARMORY_ITEMS[0].id;

  // Card entries
  private _cards: Array<{
    id: ArmoryItemId;
    bg: Graphics;
    container: Container;
    locked: boolean;
  }> = [];

  // Detail panel elements
  private _detailPanel!: Container;
  private _detailName!: Text;
  private _detailDesc!: Text;
  private _detailStats!: Text;
  private _detailIcon!: Graphics;
  private _detailIconSymbol!: Text;

  // Slots label
  private _slotsLabel!: Text;

  // Main layout container
  private _mainCard!: Container;
  private _mainCardW = 0;

  // Scrollable grid
  private _gridScroll!: Container;
  private _gridMask!: Graphics;
  private _gridScrollY = 0;
  private _gridContentH = 0;
  private _gridViewH = 0;

  // Callbacks
  onStartGame: (() => void) | null = null;
  onBack: (() => void) | null = null;

  private _nextBtn!: Container;

  /** Returns the currently equipped item IDs. */
  get selectedItems(): ArmoryItemId[] {
    return [...this._selectedIds];
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._buildUI();

    vm.addToLayer("ui", this.container);
    this._layout();
    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
  }

  hide(): void {
    this.container.visible = false;
  }

  /**
   * Set which items are available. Pass null to unlock all (standard/roguelike mode).
   * Also clears any selections that are no longer valid.
   */
  setUnlockedItems(ids: ArmoryItemId[] | null): void {
    this._unlockedIds = ids ? new Set(ids) : null;
    // Clear any selections that are now locked
    this._selectedIds = this._selectedIds.filter(
      (id) => !this._unlockedIds || this._unlockedIds.has(id),
    );
    this._rebuildCards();
    this._updateSlotsLabel();
    this._updateDetail();
  }

  // ---------------------------------------------------------------------------
  // Build UI
  // ---------------------------------------------------------------------------

  private _buildUI(): void {
    const gridW = GRID_COLS * CARD_W + (GRID_COLS - 1) * CARD_GAP + GRID_PAD * 2;
    const totalW = gridW + DETAIL_W + 24;

    const mainCard = new Container();
    mainCard.addChild(
      new Graphics()
        .roundRect(0, 0, totalW, 500, 8)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, totalW, 500, 8)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );
    this._mainCard = mainCard;
    this._mainCardW = totalW;
    this.container.addChild(mainCard);

    // Title
    const title = new Text({ text: "ARMORY", style: STYLE_SCREEN_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(totalW / 2, 14);
    mainCard.addChild(title);

    // Divider
    mainCard.addChild(
      new Graphics().rect(16, 48, totalW - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Back button
    const backBtn = this._makeNavBtn("< BACK", 80, 28);
    backBtn.position.set(16, 14);
    backBtn.on("pointerdown", () => this.onBack?.());
    mainCard.addChild(backBtn);

    // Slots label (top-right)
    this._slotsLabel = new Text({ text: "", style: STYLE_SLOTS });
    this._slotsLabel.anchor.set(1, 0.5);
    this._slotsLabel.position.set(totalW - 20, 28);
    mainCard.addChild(this._slotsLabel);
    this._updateSlotsLabel();

    // --- Grid area (left) ---
    this._gridScroll = new Container();
    this._gridScroll.position.set(GRID_PAD, 60);

    this._buildCards();

    mainCard.addChild(this._gridScroll);

    // Mask for scroll
    this._gridMask = new Graphics();
    mainCard.addChild(this._gridMask);
    this._gridScroll.mask = this._gridMask;

    // Wheel scroll
    this._gridScroll.eventMode = "static";
    this._gridScroll.on("wheel", (e) => this._onGridWheel(e));

    // --- Detail panel (right) ---
    const detailX = gridW + 8;
    this._detailPanel = new Container();
    this._detailPanel.position.set(detailX, 60);
    mainCard.addChild(this._detailPanel);

    this._buildDetailPanel();

    // --- Start game button ---
    const nextBtn = this._makeNavBtn("START GAME", 160, 34, true);
    nextBtn.on("pointerdown", () => this.onStartGame?.());
    this._nextBtn = nextBtn;
    mainCard.addChild(nextBtn);

    // Focus first item
    this._focusItem(ARMORY_ITEMS[0].id);
  }

  private _buildCards(): void {
    this._gridScroll.removeChildren();
    this._cards = [];

    for (let i = 0; i < ARMORY_ITEMS.length; i++) {
      const item = ARMORY_ITEMS[i];
      const col = i % GRID_COLS;
      const row = Math.floor(i / GRID_COLS);
      const cx = col * (CARD_W + CARD_GAP);
      const cy = row * (CARD_H + CARD_GAP);

      const locked = this._isLocked(item.id);
      const card = this._makeItemCard(item, cx, cy, locked);
      this._gridScroll.addChild(card.container);
      this._cards.push(card);
    }

    const rows = Math.ceil(ARMORY_ITEMS.length / GRID_COLS);
    this._gridContentH = rows * (CARD_H + CARD_GAP) - CARD_GAP + 8;
  }

  private _rebuildCards(): void {
    this._buildCards();
    // Re-apply selection highlights
    for (const card of this._cards) {
      const selected = this._selectedIds.includes(card.id);
      const focused = card.id === this._focusedId;
      this._refreshCard(card.bg, selected, focused, card.locked);
    }
  }

  private _makeItemCard(
    item: ArmoryItemDef,
    x: number,
    y: number,
    locked: boolean,
  ): { id: ArmoryItemId; bg: Graphics; container: Container; locked: boolean } {
    const c = new Container();
    c.position.set(x, y);
    c.eventMode = "static";
    c.cursor = locked ? "default" : "pointer";

    const bg = new Graphics();
    c.addChild(bg);

    // Icon area
    const iconBg = new Graphics()
      .roundRect(6, 6, CARD_W - 12, CARD_H - 28, 3)
      .fill({ color: locked ? 0x111118 : item.iconColor, alpha: locked ? 0.5 : 0.3 });
    c.addChild(iconBg);

    const symbol = new Text({
      text: locked ? "?" : item.iconSymbol,
      style: new TextStyle({
        ...STYLE_ITEM_SYMBOL,
        fill: locked ? 0x334455 : 0xffffff,
      }),
    });
    symbol.anchor.set(0.5, 0.5);
    symbol.position.set(CARD_W / 2, (CARD_H - 22) / 2 + 6);
    c.addChild(symbol);

    const nameText = new Text({
      text: locked ? "LOCKED" : item.name.toUpperCase(),
      style: locked
        ? STYLE_LOCKED
        : STYLE_ITEM_NAME,
    });
    nameText.anchor.set(0.5, 0);
    nameText.position.set(CARD_W / 2, CARD_H - 20);
    c.addChild(nameText);

    this._refreshCard(bg, false, false, locked);

    c.on("pointerdown", () => {
      if (locked) return;
      this._focusItem(item.id);
      this._toggleSelect(item.id);
    });

    return { id: item.id, bg, container: c, locked };
  }

  private _buildDetailPanel(): void {
    const dp = this._detailPanel;
    dp.removeChildren();

    const pw = DETAIL_W - DETAIL_PAD;

    const panelBg = new Graphics()
      .roundRect(0, 0, pw, 380, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.8 })
      .roundRect(0, 0, pw, 380, 6)
      .stroke({ color: 0x334466, width: 1 });
    dp.addChild(panelBg);

    // Icon area
    this._detailIcon = new Graphics()
      .roundRect(8, 8, pw - 16, 80, 4)
      .fill({ color: 0x151525 });
    dp.addChild(this._detailIcon);

    this._detailIconSymbol = new Text({
      text: "",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 40,
        fill: 0xffd700,
        fontWeight: "bold",
      }),
    });
    this._detailIconSymbol.anchor.set(0.5, 0.5);
    this._detailIconSymbol.position.set(pw / 2, 48);
    dp.addChild(this._detailIconSymbol);

    // Name
    this._detailName = new Text({ text: "", style: STYLE_DETAIL_NAME });
    this._detailName.anchor.set(0.5, 0);
    this._detailName.position.set(pw / 2, 96);
    dp.addChild(this._detailName);

    // Divider
    dp.addChild(
      new Graphics().rect(8, 120, pw - 16, 1).fill({ color: 0x334466 }),
    );

    // Description label
    const descLabel = new Text({
      text: "DESCRIPTION",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 9,
        fill: 0x556677,
        letterSpacing: 2,
      }),
    });
    descLabel.position.set(10, 128);
    dp.addChild(descLabel);

    this._detailDesc = new Text({ text: "", style: STYLE_DETAIL_DESC });
    this._detailDesc.position.set(10, 142);
    dp.addChild(this._detailDesc);

    // Divider
    dp.addChild(
      new Graphics().rect(8, 200, pw - 16, 1).fill({ color: 0x334466 }),
    );

    // Stats
    const statsLabel = new Text({ text: "BONUSES", style: STYLE_STAT_LABEL });
    statsLabel.position.set(10, 208);
    dp.addChild(statsLabel);

    this._detailStats = new Text({ text: "", style: STYLE_STAT_TEXT });
    this._detailStats.position.set(10, 224);
    dp.addChild(this._detailStats);
  }

  // ---------------------------------------------------------------------------
  // Selection logic
  // ---------------------------------------------------------------------------

  private _isLocked(id: ArmoryItemId): boolean {
    if (!this._unlockedIds) return false;
    return !this._unlockedIds.has(id);
  }

  private _focusItem(id: ArmoryItemId): void {
    const prev = this._focusedId;
    this._focusedId = id;

    // Refresh previous and new focus card borders
    for (const card of this._cards) {
      if (card.id === prev || card.id === id) {
        const selected = this._selectedIds.includes(card.id);
        const focused = card.id === id;
        this._refreshCard(card.bg, selected, focused, card.locked);
      }
    }

    this._updateDetail();
  }

  private _toggleSelect(id: ArmoryItemId): void {
    const idx = this._selectedIds.indexOf(id);
    if (idx >= 0) {
      // Deselect
      this._selectedIds.splice(idx, 1);
    } else if (this._selectedIds.length < MAX_EQUIPPED_ITEMS) {
      // Select
      this._selectedIds.push(id);
    } else {
      // At max — replace the oldest selection
      this._selectedIds.shift();
      this._selectedIds.push(id);
    }

    // Refresh all cards for selection state
    for (const card of this._cards) {
      const selected = this._selectedIds.includes(card.id);
      const focused = card.id === this._focusedId;
      this._refreshCard(card.bg, selected, focused, card.locked);
    }
    this._updateSlotsLabel();
  }

  private _refreshCard(bg: Graphics, selected: boolean, focused: boolean, locked: boolean): void {
    bg.clear();
    let borderColor = CARD_NORMAL_BORDER;
    let fillColor = 0x10101e;
    let borderWidth = 1;

    if (locked) {
      borderColor = CARD_LOCKED_BORDER;
      fillColor = 0x0a0a14;
    } else if (selected) {
      borderColor = CARD_SELECTED_BORDER;
      fillColor = 0x1a1e32;
      borderWidth = 2;
    } else if (focused) {
      borderColor = 0x6688aa;
      fillColor = 0x141828;
      borderWidth = 1.5;
    }

    bg
      .roundRect(0, 0, CARD_W, CARD_H, 6)
      .fill({ color: fillColor })
      .roundRect(0, 0, CARD_W, CARD_H, 6)
      .stroke({ color: borderColor, width: borderWidth });
  }

  private _updateDetail(): void {
    const item = ARMORY_ITEMS.find((i) => i.id === this._focusedId);
    if (!item) return;

    const locked = this._isLocked(item.id);

    this._detailIconSymbol.text = locked ? "?" : item.iconSymbol;
    this._detailName.text = locked ? "LOCKED" : item.name.toUpperCase();
    this._detailDesc.text = locked
      ? "This item has not been unlocked yet. Complete more campaign scenarios to unlock it."
      : item.description;

    // Build stat lines
    if (locked) {
      this._detailStats.text = "???";
    } else {
      const lines: string[] = [];
      if (item.atkBonus > 0) lines.push(`+${item.atkBonus} Attack`);
      if (item.atkBonus < 0) lines.push(`${item.atkBonus} Attack`);
      if (item.hpBonus > 0) lines.push(`+${item.hpBonus} Health`);
      if (item.hpBonus < 0) lines.push(`${item.hpBonus} Health`);
      if (item.speedBonus > 0) lines.push(`+${item.speedBonus} Speed`);
      if (item.speedBonus < 0) lines.push(`${item.speedBonus} Speed`);
      if (item.rangeBonus > 0) lines.push(`+${item.rangeBonus} Range`);
      if (item.rangeBonus < 0) lines.push(`${item.rangeBonus} Range`);
      this._detailStats.text = lines.length > 0 ? lines.join("\n") : "No bonuses";
    }

    // Update icon bg color
    const pw = DETAIL_W - DETAIL_PAD;
    this._detailIcon.clear();
    this._detailIcon
      .roundRect(8, 8, pw - 16, 80, 4)
      .fill({ color: locked ? 0x111118 : item.iconColor, alpha: locked ? 0.5 : 0.2 });
  }

  private _updateSlotsLabel(): void {
    this._slotsLabel.text = `SLOTS: ${this._selectedIds.length}/${MAX_EQUIPPED_ITEMS}`;
  }

  // ---------------------------------------------------------------------------
  // Scroll
  // ---------------------------------------------------------------------------

  private _onGridWheel(e: any): void {
    const maxScroll = Math.max(0, this._gridContentH - this._gridViewH);
    this._gridScrollY = Math.max(0, Math.min(maxScroll, this._gridScrollY + e.deltaY * 0.5));
    this._gridScroll.position.y = 60 - this._gridScrollY;
  }

  // ---------------------------------------------------------------------------
  // Navigation buttons
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
        fontSize: primary ? 13 : 11,
        fill: primary ? 0x88ffaa : 0x88bbff,
        fontWeight: "bold",
        letterSpacing: 1,
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = primary ? 0xaaffcc : 0xaaddff; });
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

    const cardH = Math.min(540, sh - 60);
    const gridViewH = cardH - 60 - 60;
    this._gridViewH = gridViewH;

    // Rebuild main card background
    const mc = this._mainCard;
    const bg = mc.children[0] as Graphics;
    bg.clear();
    bg
      .roundRect(0, 0, this._mainCardW, cardH, 8)
      .fill({ color: 0x10102a, alpha: 0.97 })
      .roundRect(0, 0, this._mainCardW, cardH, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 });

    // Update grid mask
    this._gridMask.clear();
    this._gridMask
      .rect(GRID_PAD, 60, GRID_COLS * (CARD_W + CARD_GAP), gridViewH)
      .fill({ color: 0xffffff });

    // Position start button
    this._nextBtn.position.set(this._mainCardW - 176, cardH - 50);

    // Center card on screen
    mc.position.set(
      Math.floor((sw - this._mainCardW) / 2),
      Math.floor((sh - cardH) / 2),
    );
  }
}

export const armoryScreen = new ArmoryScreen();
