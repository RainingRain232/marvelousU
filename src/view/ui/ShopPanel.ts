// Shop overlay — opens when a player clicks an owned building
import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { GameState } from "@sim/state/GameState";
import type { ViewManager } from "@view/ViewManager";
import { EventBus } from "@sim/core/EventBus";
import { addToQueue } from "@sim/systems/SpawnSystem";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { BuildingType, BuildingState, UnitType } from "@/types";
import { buildingPlacer } from "@view/ui/BuildingPlacer";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const PANEL_W = 260;
const PANEL_PAD = 14;
const CORNER_R = 8;

const BG_COLOR = 0x0d0d1e;
const BG_ALPHA = 0.93;
const BORDER_COLOR = 0xffd700;
const BORDER_W = 1.5;

const ROW_H = 40; // height of each item row
const ROW_GAP = 6; // vertical gap between rows
const HEADER_H = 38; // building name area
const SECTION_LABEL_H = 22; // section heading ("UNITS" / "BUILD")
const CLOSE_SIZE = 20;

const MAX_PANEL_H = 400; // maximum total height of the panel
const SCROLL_WIDTH = 10;
const SCROLL_MARGIN = 4;

// Text styles
const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});
const STYLE_SECTION = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x778899,
  letterSpacing: 2,
});
const STYLE_ITEM = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xdddddd,
});
const STYLE_COST = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffd700,
  fontWeight: "bold",
});
const STYLE_COST_UNAFFORDABLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0x885522,
  fontWeight: "bold",
});
const STYLE_SPAWN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x668866,
});
const STYLE_CLOSE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 14,
  fill: 0xaaaaaa,
  fontWeight: "bold",
});
const STYLE_LOCKED = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x886644,
});

// Building display names
const BUILDING_LABELS: Record<BuildingType, string> = {
  [BuildingType.CASTLE]: "Castle",
  [BuildingType.BARRACKS]: "Barracks",
  [BuildingType.STABLES]: "Stables",
  [BuildingType.MAGE_TOWER]: "Mage Tower",
  [BuildingType.ARCHERY_RANGE]: "Archery Range",
  [BuildingType.SIEGE_WORKSHOP]: "Siege Workshop",
  [BuildingType.TOWN]: "Town",
  [BuildingType.CREATURE_DEN]: "Creature Den",
  [BuildingType.TOWER]: "Tower",
  [BuildingType.FARM]: "Farm",
  [BuildingType.HAMLET]: "Hamlet",
  [BuildingType.EMBASSY]: "Embassy",
  [BuildingType.TEMPLE]: "Temple",
};

// Unit display names
const UNIT_LABELS: Record<UnitType, string> = {
  [UnitType.SWORDSMAN]: "Swordsman",
  [UnitType.ARCHER]: "Archer",
  [UnitType.KNIGHT]: "Knight",
  [UnitType.FIRE_MAGE]: "Fire Mage",
  [UnitType.STORM_MAGE]: "Storm Mage",
  [UnitType.PIKEMAN]: "Pikeman",
  [UnitType.SUMMONED]: "Summoned",
  [UnitType.BATTERING_RAM]: "Battering Ram",
  [UnitType.MAGE_HUNTER]: "Mage Hunter",
  [UnitType.SIEGE_HUNTER]: "Siege Hunter",
  [UnitType.SUMMONER]: "Summoner",
  [UnitType.COLD_MAGE]: "Cold Mage",
  [UnitType.SPIDER]: "Spider",
  [UnitType.GLADIATOR]: "Gladiator",
  [UnitType.DIPLOMAT]: "Diplomat",
  [UnitType.DISTORTION_MAGE]: "Distortion Mage",
  [UnitType.VOID_SNAIL]: "Void Snail",
  [UnitType.FAERY_QUEEN]: "Faery Queen",
  [UnitType.GIANT_FROG]: "Giant Frog",
  [UnitType.LONGBOWMAN]: "Longbowman",
  [UnitType.CROSSBOWMAN]: "Crossbowman",
  [UnitType.DEVOURER]: "Devourer",
  [UnitType.HORSE_ARCHER]: "Horse Archer",
  [UnitType.SHORTBOW]: "Shortbow",
  [UnitType.BALLISTA]: "Ballista",
  [UnitType.BOLT_THROWER]: "Bolt Thrower",
  [UnitType.SCOUT_CAVALRY]: "Scout Cavalry",
  [UnitType.LANCER]: "Lancer",
  [UnitType.ELITE_LANCER]: "Elite Lancer",
  [UnitType.KNIGHT_LANCER]: "Knight Lancer",
  [UnitType.MONK]: "Monk",
  [UnitType.CLERIC]: "Cleric",
  [UnitType.SAINT]: "Saint",
};

// ---------------------------------------------------------------------------
// ShopPanel
// ---------------------------------------------------------------------------

/**
 * Overlay panel that opens when the player clicks an owned (non-destroyed)
 * building.  Displays:
 *   - Building name + close button
 *   - UNITS section: one row per trainable unit (name, spawn time, cost, buy btn)
 *   - BUILD section (Castle only): one row per blueprint (name, cost, buy btn)
 *
 * Click detection:
 *   The panel attaches a `pointerdown` listener to the canvas on `init`.
 *   It uses `camera.screenToWorld` to find which tile was clicked, then
 *   checks every building's footprint for a hit.
 *
 * Sim interaction:
 *   Buying a unit calls `addToQueue(state, buildingId, unitType)` and
 *   deducts gold from the owning player's `PlayerState`.
 *   Buying a blueprint emits a `buildingBlueprintSelected` notification
 *   (placement mode is handled by BuildingPlacer in a later task).
 */
export class ShopPanel {
  readonly container = new Container();

  onOpen: (() => void) | null = null;
  onClose: (() => void) | null = null;

  private _vm!: ViewManager;
  private _state!: GameState;
  private _localPlayerId = "";

  private _openBuildingId: string | null = null;
  private _rows: Container[] = [];

  // Scrolling
  private _scrollContainer = new Container();
  private _mask = new Graphics();
  private _scrollbarTrack = new Graphics();
  private _scrollbarThumb = new Graphics();
  private _scrollY = 0;
  private _isDragging = false;
  private _dragStartY = 0;
  private _thumbStartY = 0;
  private _contentH = 0;
  private _viewH = 0;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  init(vm: ViewManager, state: GameState, localPlayerId: string): void {
    this._vm = vm;
    this._state = state;
    this._localPlayerId = localPlayerId;

    this.container.visible = false;
    vm.addToLayer("ui", this.container);

    // Setup scroll components
    this._scrollContainer.label = "scrollContent";
    this._scrollContainer.mask = this._mask;
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);

    this._scrollbarTrack.label = "scrollTrack";
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    this.container.eventMode = "static";
    this.container.on("wheel", (e) => {
      if (!this.container.visible || this._contentH <= this._viewH) return;
      this._scrollY = Math.max(0, Math.min(this._contentH - this._viewH, this._scrollY + e.deltaY));
      this._applyScroll();
    });
  }

  setPlayerId(playerId: string): void {
    this._localPlayerId = playerId;
    this.close();
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Open / close
  // ---------------------------------------------------------------------------

  open(buildingId: string): void {
    this._openBuildingId = buildingId;
    this._rebuild();
    this.container.visible = true;
    this.onOpen?.();
  }

  close(): void {
    const wasOpen = this._openBuildingId !== null;
    this._openBuildingId = null;
    this.container.visible = false;
    if (wasOpen) this.onClose?.();
  }

  /** Call from vm.onUpdate so gold-affordability tints stay current. */
  readonly update = (_state: GameState): void => {
    // Refresh cost colors to reflect current gold; only when panel is open
    if (!this.container.visible || !this._openBuildingId) return;
    this._updateAffordability();
  };

  // ---------------------------------------------------------------------------
  // Panel construction
  // ---------------------------------------------------------------------------

  private _rebuild(): void {
    // Clear dynamic rows, but keep persistent scroll components
    this._rows = [];
    this._scrollContainer.removeChildren();
    this.container.removeChildren();

    const building = this._openBuildingId
      ? this._state.buildings.get(this._openBuildingId)
      : null;
    if (!building) return;

    // Persistent components must be re-added because we called removeChildren() on container
    this.container.addChild(this._scrollContainer);
    this.container.addChild(this._mask);
    this.container.addChild(this._scrollbarTrack);
    this.container.addChild(this._scrollbarThumb);

    const unitRows = building.shopInventory.length;
    const bpRows = building.blueprints.length;
    const unitSectionH = unitRows > 0 ? SECTION_LABEL_H + unitRows * (ROW_H + ROW_GAP) : 0;
    const bpSectionH = bpRows > 0 ? SECTION_LABEL_H + bpRows * (ROW_H + ROW_GAP) : 0;

    // contentH is the total height needed for the scrollable part
    this._contentH = unitSectionH + bpSectionH + PANEL_PAD;
    const totalH = HEADER_H + this._contentH;

    this._viewH = Math.min(MAX_PANEL_H, totalH);
    const scrollableH = this._viewH - HEADER_H;

    // Background + border
    const bg = new Graphics()
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .fill({ color: BG_COLOR, alpha: BG_ALPHA })
      .roundRect(0, 0, PANEL_W, this._viewH, CORNER_R)
      .stroke({ color: BORDER_COLOR, alpha: 0.55, width: BORDER_W });
    this.container.addChildAt(bg, 0);

    // Title
    const title = new Text({
      text: BUILDING_LABELS[building.type],
      style: STYLE_TITLE,
    });
    title.position.set(PANEL_PAD, 10);
    this.container.addChild(title);

    // Close button
    const closeBtn = new Text({ text: "✕", style: STYLE_CLOSE });
    closeBtn.position.set(PANEL_W - CLOSE_SIZE - 6, 8);
    closeBtn.eventMode = "static";
    closeBtn.cursor = "pointer";
    closeBtn.on("pointerdown", (e) => {
      e.stopPropagation();
      this.close();
    });
    this.container.addChild(closeBtn);

    // Divider under header (fixed)
    const divider = new Graphics()
      .rect(PANEL_PAD, HEADER_H - 4, PANEL_W - PANEL_PAD * 2, 1)
      .fill({ color: 0x334455 });
    this.container.addChild(divider);

    // Mask setup
    this._mask.clear()
      .rect(0, HEADER_H, PANEL_W, scrollableH)
      .fill({ color: 0x000000 });

    let cursorY = 0;

    // ---- UNITS section ----
    if (unitRows > 0) {
      const label = new Text({ text: "TRAIN", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (const unitType of building.shopInventory) {
        const row = this._makeUnitRow(building.id, unitType, cursorY);
        this._scrollContainer.addChild(row);
        this._rows.push(row);
        cursorY += ROW_H + ROW_GAP;
      }
    }

    // ---- BUILD section (Castle only) ----
    if (bpRows > 0) {
      const label = new Text({ text: "BUILD", style: STYLE_SECTION });
      label.position.set(PANEL_PAD, cursorY + 4);
      this._scrollContainer.addChild(label);
      cursorY += SECTION_LABEL_H;

      for (const bpType of building.blueprints) {
        const row = this._makeBlueprintRow(bpType, cursorY);
        this._scrollContainer.addChild(row);
        this._rows.push(row);
        cursorY += ROW_H + ROW_GAP;
      }
    }

    this._scrollContainer.position.y = HEADER_H;

    // Setup scrollbar
    const hasScroll = this._contentH > scrollableH;
    this._scrollbarTrack.visible = hasScroll;
    this._scrollbarThumb.visible = hasScroll;

    if (hasScroll) {
      const trackX = PANEL_W - SCROLL_WIDTH - SCROLL_MARGIN;
      const trackY = HEADER_H + SCROLL_MARGIN;
      const trackH = scrollableH - SCROLL_MARGIN * 2;

      this._scrollbarTrack.clear()
        .roundRect(0, 0, SCROLL_WIDTH, trackH, SCROLL_WIDTH / 2)
        .fill({ color: 0x000000, alpha: 0.3 });
      this._scrollbarTrack.position.set(trackX, trackY);

      const thumbH = Math.max(20, (scrollableH / this._contentH) * trackH);
      this._scrollbarThumb.clear()
        .roundRect(0, 0, SCROLL_WIDTH, thumbH, SCROLL_WIDTH / 2)
        .fill({ color: 0x556677 });
      this._scrollbarThumb.position.x = trackX;

      this._scrollbarThumb.eventMode = "static";
      this._scrollbarThumb.cursor = "pointer";
      this._scrollbarThumb.removeAllListeners();
      this._scrollbarThumb.on("pointerdown", (e) => this._onThumbDragStart(e));
    }

    // Reset scroll
    this._scrollY = 0;
    this._applyScroll();

    // Position panel: bottom-left of screen with padding
    const screenH = this._vm.screenHeight;
    this.container.position.set(PANEL_PAD, screenH - this._viewH - PANEL_PAD);

    this._updateAffordability();
  }

  private _applyScroll(): void {
    const scrollableH = this._viewH - HEADER_H;
    const maxScroll = Math.max(0, this._contentH - scrollableH);
    this._scrollY = Math.max(0, Math.min(maxScroll, this._scrollY));

    this._scrollContainer.position.y = HEADER_H - this._scrollY;

    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const thumbY = maxScroll > 0
      ? (this._scrollY / maxScroll) * maxThumbY
      : 0;

    this._scrollbarThumb.position.y = HEADER_H + SCROLL_MARGIN + thumbY;
  }

  private _onThumbDragStart(e: any): void {
    e.stopPropagation();
    this._isDragging = true;
    this._dragStartY = e.global.y;
    this._thumbStartY = this._scrollY;

    // Use stage for global move/up
    const stage = this._vm.app.stage;
    stage.on("pointermove", (e) => this._onThumbDragMove(e));
    stage.on("pointerup", () => this._onThumbDragEnd());
    stage.on("pointerupoutside", () => this._onThumbDragEnd());
  }

  private _onThumbDragMove(e: any): void {
    if (!this._isDragging) return;

    const deltaY = e.global.y - this._dragStartY;
    const scrollableH = this._viewH - HEADER_H;
    const trackH = scrollableH - SCROLL_MARGIN * 2;
    const thumbH = this._scrollbarThumb.height;
    const maxThumbY = trackH - thumbH;
    const maxScroll = Math.max(0, this._contentH - scrollableH);

    if (maxThumbY > 0) {
      const scrollDelta = (deltaY / maxThumbY) * maxScroll;
      this._scrollY = this._thumbStartY + scrollDelta;
      this._applyScroll();
    }
  }

  private _onThumbDragEnd(): void {
    this._isDragging = false;
    const stage = this._vm.app.stage;
    stage.off("pointermove");
    stage.off("pointerup");
    stage.off("pointerupoutside");
  }

  // ---------------------------------------------------------------------------
  // Row factories
  // ---------------------------------------------------------------------------

  private _makeUnitRow(
    buildingId: string,
    unitType: UnitType,
    y: number,
  ): Container {
    const row = new Container();
    row.position.y = y;

    // Row background (highlight on hover)
    const rowBg = new Graphics()
      .rect(PANEL_PAD - 4, 0, PANEL_W - (PANEL_PAD - 4) * 2, ROW_H)
      .fill({ color: 0x111122, alpha: 0 });
    rowBg.eventMode = "static";
    rowBg.on("pointerover", () => (rowBg.tint = 0x334466));
    rowBg.on("pointerout", () => (rowBg.tint = 0xffffff));
    row.addChild(rowBg);

    const def = UNIT_DEFINITIONS[unitType];

    // Unit name
    const name = new Text({ text: UNIT_LABELS[unitType], style: STYLE_ITEM });
    name.position.set(PANEL_PAD, 4);
    row.addChild(name);

    // Spawn time
    const spawnInfo = new Text({
      text: `${def.spawnTime}s`,
      style: STYLE_SPAWN,
    });
    spawnInfo.position.set(PANEL_PAD, 22);
    row.addChild(spawnInfo);

    // Cost label (updated in _updateAffordability)
    const costText = new Text({ text: `${def.cost}g`, style: STYLE_COST });
    costText.label = `cost_${unitType}`;
    costText.position.set(PANEL_W - 90, 12);
    row.addChild(costText);

    // Buy button
    const btn = this._makeButton("BUY", PANEL_W - 52, 6, () => {
      this._buyUnit(buildingId, unitType);
    });
    row.addChild(btn);

    return row;
  }

  private _makeBlueprintRow(bpType: BuildingType, y: number): Container {
    const row = new Container();
    row.position.y = y;

    // Row background
    const rowBg = new Graphics()
      .rect(PANEL_PAD - 4, 0, PANEL_W - (PANEL_PAD - 4) * 2, ROW_H)
      .fill({ color: 0x111122, alpha: 0 });
    rowBg.eventMode = "static";
    rowBg.on("pointerover", () => (rowBg.tint = 0x334466));
    rowBg.on("pointerout", () => (rowBg.tint = 0xffffff));
    row.addChild(rowBg);

    const def = BUILDING_DEFINITIONS[bpType];

    // Check build constraints for this player
    const maxCount = def.maxCount;
    const prereq = def.prerequisite;
    const ownedCount = maxCount !== undefined
      ? this._countOwnedType(bpType)
      : 0;
    const prereqCount = prereq ? this._countOwnedType(prereq.type) : 0;
    const atMax = maxCount !== undefined && ownedCount >= maxCount;
    const prereqMet = !prereq || prereqCount >= prereq.minCount;
    const locked = atMax || !prereqMet;

    // Building name (dim when locked)
    const name = new Text({
      text: BUILDING_LABELS[bpType],
      style: locked ? new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x667788 }) : STYLE_ITEM,
    });
    name.position.set(PANEL_PAD, 4);
    row.addChild(name);

    // Sub-line: footprint + count/lock info
    let subText = `${def.footprint.w}×${def.footprint.h}`;
    if (maxCount !== undefined) subText += `  ${ownedCount}/${maxCount}`;
    if (!prereqMet) subText += `  needs ${prereq!.minCount} ${BUILDING_LABELS[prereq!.type]}`;
    const footprintInfo = new Text({ text: subText, style: locked ? STYLE_LOCKED : STYLE_SPAWN });
    footprintInfo.position.set(PANEL_PAD, 22);
    row.addChild(footprintInfo);

    // Cost label
    const costText = new Text({ text: `${def.cost}g`, style: STYLE_COST });
    costText.label = `cost_bp_${bpType}`;
    costText.position.set(PANEL_W - 90, 12);
    row.addChild(costText);

    // Buy button — disabled when locked
    const btn = this._makeButton(
      atMax ? "MAX" : !prereqMet ? "LOCK" : "BUY",
      PANEL_W - 52,
      6,
      locked ? () => { } : () => { this._buyBlueprint(bpType); },
    );
    if (locked) btn.alpha = 0.4;
    row.addChild(btn);

    return row;
  }

  // ---------------------------------------------------------------------------
  // Button helper
  // ---------------------------------------------------------------------------

  private _makeButton(
    label: string,
    x: number,
    y: number,
    onClick: () => void,
  ): Container {
    const btn = new Container();
    btn.position.set(x, y);
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const W = 42;
    const H = ROW_H - 12;

    const bg = new Graphics()
      .roundRect(0, 0, W, H, 4)
      .fill({ color: 0x225533 })
      .roundRect(0, 0, W, H, 4)
      .stroke({ color: 0x44aa66, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 11,
        fill: 0xaaffbb,
        fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(W / 2, H / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => (bg.tint = 0xbbffcc));
    btn.on("pointerout", () => (bg.tint = 0xffffff));
    btn.on("pointerdown", (e) => {
      e.stopPropagation();
      onClick();
    });

    return btn;
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  /** Count active buildings of a given type owned by the local player. */
  private _countOwnedType(type: BuildingType): number {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return 0;
    let count = 0;
    for (const id of player.ownedBuildings) {
      const b = this._state.buildings.get(id);
      if (b && b.type === type && b.state !== BuildingState.DESTROYED) count++;
    }
    return count;
  }

  // ---------------------------------------------------------------------------
  // Sim commands
  // ---------------------------------------------------------------------------

  private _buyUnit(buildingId: string, unitType: UnitType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const cost = UNIT_DEFINITIONS[unitType].cost;
    if (player.gold < cost) return;

    player.gold -= cost;
    addToQueue(this._state, buildingId, unitType);

    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this._updateAffordability();
  }

  private _buyBlueprint(bpType: BuildingType): void {
    const player = this._state.players.get(this._localPlayerId);
    if (!player) return;
    const cost = BUILDING_DEFINITIONS[bpType].cost;
    if (player.gold < cost) return;

    // Deduct gold then hand off to BuildingPlacer for placement
    player.gold -= cost;
    EventBus.emit("goldChanged", {
      playerId: this._localPlayerId,
      amount: player.gold,
    });

    this.close();
    buildingPlacer.activate(bpType);
  }

  // ---------------------------------------------------------------------------
  // Affordability tints
  // ---------------------------------------------------------------------------

  private _updateAffordability(): void {
    const player = this._state.players.get(this._localPlayerId);
    const gold = player?.gold ?? 0;
    const building = this._openBuildingId
      ? this._state.buildings.get(this._openBuildingId)
      : null;
    if (!building) return;

    for (const unitType of building.shopInventory) {
      const cost = UNIT_DEFINITIONS[unitType].cost;
      const costNode = this.container.getChildByName(
        `cost_${unitType}`,
        true,
      ) as Text | null;
      if (costNode) {
        costNode.style = cost <= gold ? STYLE_COST : STYLE_COST_UNAFFORDABLE;
      }
    }

    for (const bpType of building.blueprints) {
      const cost = BUILDING_DEFINITIONS[bpType].cost;
      const costNode = this.container.getChildByName(
        `cost_bp_${bpType}`,
        true,
      ) as Text | null;
      if (costNode) {
        costNode.style = cost <= gold ? STYLE_COST : STYLE_COST_UNAFFORDABLE;
      }
    }
  }
}

export const shopPanel = new ShopPanel();
