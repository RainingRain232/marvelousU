// World mode wiki — tabbed encyclopedia covering units, spells, buildings,
// world buildings, and controls.

import {
  Container, Graphics, Text, TextStyle, Rectangle,
} from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { getAllWorldBuildingDefs } from "@world/config/WorldBuildingDefs";
import type { WorldBuildingDef } from "@world/config/WorldBuildingDefs";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace", fontSize: 29, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 3,
});

const STYLE_TAB = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xaabbcc, fontWeight: "bold",
});

const STYLE_TAB_ACTIVE = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace", fontSize: 16, fill: 0xffd700,
  fontWeight: "bold", letterSpacing: 2,
});

const STYLE_BODY = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xccddee,
  wordWrap: true, wordWrapWidth: 900,
});

const STYLE_BUILDING_NAME = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_BUILDING_STAT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc,
});

const STYLE_BUILDING_EFFECT = new TextStyle({
  fontFamily: "monospace", fontSize: 12, fill: 0x88ffaa,
});

const STYLE_KEY = new TextStyle({
  fontFamily: "monospace", fontSize: 14, fill: 0xffd700, fontWeight: "bold",
});

const STYLE_KEY_DESC = new TextStyle({
  fontFamily: "monospace", fontSize: 13, fill: 0xccddee,
});

// Layout
const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;
const CARD_W = 1000;
const CARD_H = 700;
const CORNER_R = 10;
const TAB_H = 36;

type WikiTab = "units" | "spells" | "buildings" | "world_buildings" | "controls";

const TAB_DEFS: { id: WikiTab; label: string }[] = [
  { id: "units", label: "UNITS" },
  { id: "spells", label: "SPELLS" },
  { id: "buildings", label: "BUILDINGS" },
  { id: "world_buildings", label: "WORLD BUILDINGS" },
  { id: "controls", label: "CONTROLS" },
];

// ---------------------------------------------------------------------------
// Class
// ---------------------------------------------------------------------------

export class WorldWikiScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _mainCard!: Container;
  private _activeTab: WikiTab = "controls";

  // Content containers per tab
  private _contentContainer!: Container;
  private _contentMask!: Graphics;
  private _scrollY = 0;
  private _maxScroll = 0;
  private _contentH = 0;
  private _viewH = 0;

  // Tab buttons for redrawing active state
  private _tabButtons: { id: WikiTab; bg: Graphics; txt: Text }[] = [];

  // Callbacks
  onClose: (() => void) | null = null;
  /** Called when user clicks UNITS/SPELLS/BUILDINGS tab — main.ts opens the corresponding existing screen. */
  onOpenUnits: (() => void) | null = null;
  onOpenSpells: (() => void) | null = null;
  onOpenBuildings: (() => void) | null = null;

  get isVisible(): boolean {
    return this.container.visible;
  }

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._mainCard = new Container();
    this.container.addChild(this._mainCard);

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    vm.app.renderer.on("resize", () => this._layout());
  }

  show(): void {
    this.container.visible = true;
    this._activeTab = "controls";
    this._rebuild();
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // ---------------------------------------------------------------------------
  // Build
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    this._mainCard.removeChildren();
    this._tabButtons = [];
    this._scrollY = 0;

    const card = this._mainCard;

    // Card background
    card.addChild(
      new Graphics()
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .fill({ color: 0x10102a, alpha: 0.97 })
        .roundRect(0, 0, CARD_W, CARD_H, CORNER_R)
        .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
    );

    // Block clicks from passing through
    card.eventMode = "static";

    // Title
    const title = new Text({ text: "ENCYCLOPEDIA", style: STYLE_TITLE });
    title.anchor.set(0.5, 0);
    title.position.set(CARD_W / 2, 14);
    card.addChild(title);

    // Close button
    const closeBtn = this._makeBtn("CLOSE", 80, 30);
    closeBtn.position.set(CARD_W - 100, 16);
    closeBtn.on("pointerdown", () => {
      this.hide();
      this.onClose?.();
    });
    card.addChild(closeBtn);

    // Divider
    card.addChild(
      new Graphics().rect(16, 52, CARD_W - 32, 1).fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Tab bar
    let tabX = 20;
    for (const tabDef of TAB_DEFS) {
      const tabW = tabDef.label.length * 10 + 24;
      const btn = new Container();
      btn.eventMode = "static";
      btn.cursor = "pointer";
      btn.hitArea = new Rectangle(0, 0, tabW, TAB_H);

      const isActive = tabDef.id === this._activeTab;
      const tabBg = new Graphics()
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .fill({ color: isActive ? 0x222255 : 0x151530 })
        .roundRect(0, 0, tabW, TAB_H - 4, 5)
        .stroke({ color: isActive ? BORDER_COLOR : 0x333355, width: 1 });
      btn.addChild(tabBg);

      const txt = new Text({
        text: tabDef.label,
        style: isActive ? STYLE_TAB_ACTIVE : STYLE_TAB,
      });
      txt.anchor.set(0.5, 0.5);
      txt.position.set(tabW / 2, TAB_H / 2 - 2);
      btn.addChild(txt);

      btn.position.set(tabX, 58);
      btn.on("pointerdown", () => this._selectTab(tabDef.id));
      card.addChild(btn);

      this._tabButtons.push({ id: tabDef.id, bg: tabBg, txt });
      tabX += tabW + 6;
    }

    // Content area
    const contentTop = 58 + TAB_H + 6;
    this._viewH = CARD_H - contentTop - 10;

    this._contentMask = new Graphics()
      .rect(16, contentTop, CARD_W - 32, this._viewH)
      .fill({ color: 0xffffff });
    card.addChild(this._contentMask);

    this._contentContainer = new Container();
    this._contentContainer.position.set(24, contentTop);
    this._contentContainer.mask = this._contentMask;
    card.addChild(this._contentContainer);

    // Build content for active tab
    this._buildContent();

    // Scroll
    card.on("wheel", (e: WheelEvent) => {
      if (this._maxScroll <= 0) return;
      this._scrollY = Math.max(0, Math.min(this._maxScroll, this._scrollY + e.deltaY));
      this._contentContainer.position.y = (58 + TAB_H + 6) - this._scrollY;
    });
  }

  private _selectTab(tab: WikiTab): void {
    // For units/spells/buildings, delegate to existing screens
    if (tab === "units") {
      this.hide();
      this.onOpenUnits?.();
      return;
    }
    if (tab === "spells") {
      this.hide();
      this.onOpenSpells?.();
      return;
    }
    if (tab === "buildings") {
      this.hide();
      this.onOpenBuildings?.();
      return;
    }

    this._activeTab = tab;
    this._rebuild();
    this._layout();
  }

  private _buildContent(): void {
    this._contentContainer.removeChildren();
    this._scrollY = 0;

    switch (this._activeTab) {
      case "world_buildings":
        this._buildWorldBuildingsContent();
        break;
      case "controls":
        this._buildControlsContent();
        break;
    }
  }

  // ---------------------------------------------------------------------------
  // World Buildings tab
  // ---------------------------------------------------------------------------

  private _buildWorldBuildingsContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    const sectionTitle = new Text({ text: "WORLD MODE BUILDINGS", style: STYLE_SECTION });
    sectionTitle.position.set(0, cy);
    c.addChild(sectionTitle);
    cy += 28;

    const desc = new Text({
      text: "Buildings that can be constructed in cities during world mode. Each provides per-turn bonuses.",
      style: STYLE_BODY,
    });
    desc.position.set(0, cy);
    c.addChild(desc);
    cy += desc.height + 16;

    const allDefs = getAllWorldBuildingDefs();
    for (const def of allDefs) {
      cy = this._buildWorldBuildingEntry(def, cy);
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  private _buildWorldBuildingEntry(def: WorldBuildingDef, startY: number): number {
    const c = this._contentContainer;
    let cy = startY;

    // Name
    const name = new Text({ text: def.name, style: STYLE_BUILDING_NAME });
    name.position.set(0, cy);
    c.addChild(name);
    cy += 20;

    // Stats line
    const stats: string[] = [];
    if (def.productionCost > 0) stats.push(`Production cost: ${def.productionCost}`);
    if (def.goldBonus) stats.push(`Gold: +${def.goldBonus}`);
    if (def.foodBonus) stats.push(`Food: +${def.foodBonus}`);
    if (def.productionBonus) stats.push(`Production: +${def.productionBonus}`);
    if (def.manaBonus) stats.push(`Mana: +${def.manaBonus}`);
    if (def.scienceBonus) stats.push(`Research: +${def.scienceBonus}`);
    if (stats.length > 0) {
      const statText = new Text({ text: stats.join("  |  "), style: STYLE_BUILDING_STAT });
      statText.position.set(12, cy);
      c.addChild(statText);
      cy += 18;
    }

    // Effect
    const effect = new Text({ text: def.effect, style: STYLE_BUILDING_EFFECT });
    effect.position.set(12, cy);
    c.addChild(effect);
    cy += 18;

    // Unlocks
    if (def.unlocksUnits.length > 0) {
      const unlocks = new Text({
        text: `Unlocks: ${def.unlocksUnits.join(", ")}`,
        style: STYLE_BUILDING_STAT,
      });
      unlocks.position.set(12, cy);
      c.addChild(unlocks);
      cy += 18;
    }

    // Research required
    if (def.researchRequired) {
      const req = new Text({
        text: `Requires: ${def.researchRequired}`,
        style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xcc8844 }),
      });
      req.position.set(12, cy);
      c.addChild(req);
      cy += 18;
    }

    // Separator
    c.addChild(
      new Graphics().rect(0, cy + 2, CARD_W - 60, 1).fill({ color: 0x333355, alpha: 0.5 }),
    );
    cy += 10;

    return cy;
  }

  // ---------------------------------------------------------------------------
  // Controls tab
  // ---------------------------------------------------------------------------

  private _buildControlsContent(): void {
    const c = this._contentContainer;
    let cy = 8;

    const sectionTitle = new Text({ text: "CONTROLS", style: STYLE_SECTION });
    sectionTitle.position.set(0, cy);
    c.addChild(sectionTitle);
    cy += 28;

    const controls: [string, string][] = [
      ["Left Click", "Select city or army, move army to hex"],
      ["Right Click / Drag", "Pan camera"],
      ["Scroll Wheel", "Zoom in/out"],
      ["Arrow Keys", "Move selected army (E/W/NW/SE)"],
      ["Q", "Move selected army NE"],
      ["A", "Move selected army SW"],
      ["E", "End turn"],
      ["Escape", "Close open window or deselect"],
      ["", ""],
      ["RESEARCH button", "Open research / tech tree screen"],
      ["MENU button", "Open in-game menu (save, load, score, etc.)"],
      ["END TURN button", "End your turn (same as E key)"],
    ];

    for (const [key, desc] of controls) {
      if (key === "" && desc === "") {
        cy += 12;
        continue;
      }
      const keyText = new Text({ text: key, style: STYLE_KEY });
      keyText.position.set(20, cy);
      c.addChild(keyText);

      const descText = new Text({ text: desc, style: STYLE_KEY_DESC });
      descText.position.set(240, cy);
      c.addChild(descText);

      cy += 24;
    }

    cy += 16;

    // World mode concepts section
    const conceptsTitle = new Text({ text: "CORE CONCEPTS", style: STYLE_SECTION });
    conceptsTitle.position.set(0, cy);
    c.addChild(conceptsTitle);
    cy += 28;

    const concepts: [string, string][] = [
      ["Cities", "Your cities produce gold, food, mana, and research each turn. Build buildings to boost yields and unlock units."],
      ["Armies", "Recruit units in cities and deploy them as armies. Armies can move, attack enemies, and capture camps."],
      ["Research", "Spend research points to unlock new technologies and magic. Choose between normal tech and magic research."],
      ["Gold", "Used to recruit units, rush constructions, and maintain armies. Each army unit costs maintenance per turn."],
      ["Food", "Feeds your city population. Surplus food leads to population growth; deficit causes starvation."],
      ["Mana", "Magical resource used for casting spells and conjuration. Produced by mage towers and castles."],
      ["Production", "Determines how fast buildings are constructed in cities. Boosted by workshops and tile improvements."],
      ["Fog of War", "Unexplored territory is hidden. Your cities and armies reveal nearby hexes."],
      ["Camps", "Neutral camps scattered on the map. Defeat their defenders to gain rewards like gold, items, or units."],
      ["Victory", "Eliminate all rival players to win. Capture their cities and destroy their armies."],
    ];

    for (const [term, desc] of concepts) {
      const termText = new Text({ text: term, style: STYLE_BUILDING_NAME });
      termText.position.set(0, cy);
      c.addChild(termText);
      cy += 20;

      const descStyle = new TextStyle({
        fontFamily: "monospace", fontSize: 12, fill: 0xaabbcc,
        wordWrap: true, wordWrapWidth: CARD_W - 80,
      });
      const descText = new Text({ text: desc, style: descStyle });
      descText.position.set(12, cy);
      c.addChild(descText);
      cy += descText.height + 12;
    }

    this._contentH = cy;
    this._maxScroll = Math.max(0, this._contentH - this._viewH);
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  private _makeBtn(label: string, w: number, h: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    const bg = new Graphics()
      .roundRect(0, 0, w, h, 6)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, w, h, 6)
      .stroke({ color: 0x4488cc, width: 1.5 });
    btn.addChild(bg);
    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace", fontSize: 13, fill: 0x88bbff, fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(w / 2, h / 2);
    btn.addChild(txt);
    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    return btn;
  }

  private _layout(): void {
    if (!this._vm) return;
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;
    this._bg.clear().rect(0, 0, sw, sh).fill({ color: BG_COLOR, alpha: 0.85 });
    this._bg.eventMode = "static"; // block clicks behind
    this._mainCard.position.set(
      Math.floor((sw - CARD_W) / 2),
      Math.floor((sh - CARD_H) / 2),
    );
  }
}

export const worldWikiScreen = new WorldWikiScreen();
