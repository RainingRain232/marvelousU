// Pre-battle unit shop screen for Battlefield and Wave modes.
// Players spend a gold budget to assemble an army from race-filtered units.
// Units are organized in columns by building type with hover preview tooltips.

import { AnimatedSprite, Container, Graphics, Text, TextStyle, Texture } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { filterInventoryByRace, getRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { BuildingType, UnitType, UnitState } from "@/types";
import type { CorruptionModifier } from "@sim/systems/GrailCorruptionSystem";
import { animationManager } from "@view/animation/AnimationManager";
import { UNIT_LABELS } from "@view/ui/HoverTooltip";

export type UnitRoster = Array<{ type: UnitType; count: number }>;

// Buildings whose inventories form the purchasable unit pool
const SHOP_BUILDINGS: BuildingType[] = [
  BuildingType.BARRACKS,
  BuildingType.ARCHERY_RANGE,
  BuildingType.STABLES,
  BuildingType.SIEGE_WORKSHOP,
  BuildingType.CREATURE_DEN,
  BuildingType.MAGE_TOWER,
  BuildingType.TEMPLE,
];

/** Human-readable column header labels for each building. */
const BUILDING_LABELS_MAP: Record<string, string> = {
  [BuildingType.BARRACKS]: "BARRACKS",
  [BuildingType.ARCHERY_RANGE]: "ARCHERY",
  [BuildingType.STABLES]: "STABLES",
  [BuildingType.SIEGE_WORKSHOP]: "SIEGE",
  [BuildingType.CREATURE_DEN]: "CREATURES",
  [BuildingType.MAGE_TOWER]: "MAGES",
  [BuildingType.TEMPLE]: "TEMPLE",
};

const BUILDING_COLORS: Record<string, number> = {
  [BuildingType.BARRACKS]: 0xff6644,
  [BuildingType.ARCHERY_RANGE]: 0x66cc44,
  [BuildingType.STABLES]: 0xddaa44,
  [BuildingType.SIEGE_WORKSHOP]: 0x8888aa,
  [BuildingType.CREATURE_DEN]: 0xcc66cc,
  [BuildingType.MAGE_TOWER]: 0x6688ff,
  [BuildingType.TEMPLE]: 0xffdd88,
};

// ---------------------------------------------------------------------------
// Text styles
// ---------------------------------------------------------------------------

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 26,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_GOLD = new TextStyle({
  fontFamily: "monospace",
  fontSize: 18,
  fill: 0xffcc00,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_COL_HEADER = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 1,
});

const STYLE_UNIT_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xccddee,
  letterSpacing: 1,
});

const STYLE_UNIT_COST = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xaabb88,
  letterSpacing: 1,
});

const STYLE_COUNT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffffff,
  fontWeight: "bold",
});

const STYLE_BTN = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xffffff,
  fontWeight: "bold",
  letterSpacing: 1,
});

// Tooltip styles
const STYLE_TT_NAME = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fill: 0xdddddd,
  fontWeight: "bold",
});

const STYLE_TT_STAT = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xbbccdd,
});

const STYLE_TT_DESC = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x99aabb,
  wordWrap: true,
  wordWrapWidth: 210,
});

const STYLE_TT_ABILITY = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0x88cc88,
});

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

// Tooltip panel constants
const TT_W = 240;
const TT_PAD = 10;
const TT_PREVIEW_H = 80;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Categorize units by building type for the given race. */
function getShopUnitsByBuilding(raceId: RaceId): {
  columns: Array<{ building: BuildingType; units: UnitType[] }>;
  factionUnits: UnitType[];
} {
  const seen = new Set<UnitType>();
  const columns: Array<{ building: BuildingType; units: UnitType[] }> = [];

  for (const bt of SHOP_BUILDINGS) {
    const bDef = BUILDING_DEFINITIONS[bt];
    if (!bDef) continue;
    const filtered = filterInventoryByRace(bDef.shopInventory, bt, raceId);
    const units: UnitType[] = [];
    for (const ut of filtered) {
      if (seen.has(ut)) continue;
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      if (uDef.siegeOnly || uDef.diplomatOnly) continue;
      if (ut === UnitType.SETTLER) continue;
      seen.add(ut);
      units.push(ut);
    }
    units.sort((a, b) => (UNIT_DEFINITIONS[a].cost ?? 0) - (UNIT_DEFINITIONS[b].cost ?? 0));
    if (units.length > 0) {
      columns.push({ building: bt, units });
    }
  }

  const factionUnits: UnitType[] = [];
  const race = getRace(raceId);
  if (race) {
    for (const fut of race.factionUnits) {
      if (fut && !seen.has(fut) && UNIT_DEFINITIONS[fut]) {
        seen.add(fut);
        factionUnits.push(fut);
      }
    }
  }

  return { columns, factionUnits };
}

/** Get flat list of all shop units (for random army, AI, etc.) */
function getShopUnits(raceId: RaceId): UnitType[] {
  const { columns, factionUnits } = getShopUnitsByBuilding(raceId);
  const result: UnitType[] = [];
  for (const col of columns) result.push(...col.units);
  result.push(...factionUnits);
  result.sort((a, b) => (UNIT_DEFINITIONS[a].cost ?? 0) - (UNIT_DEFINITIONS[b].cost ?? 0));
  return result;
}

function makePanel(w: number, h: number): Container {
  const c = new Container();
  c.addChild(
    new Graphics()
      .roundRect(0, 0, w, h, 8)
      .fill({ color: 0x10102a, alpha: 0.95 })
      .roundRect(0, 0, w, h, 8)
      .stroke({ color: BORDER_COLOR, alpha: 0.4, width: 1.5 }),
  );
  return c;
}

// ---------------------------------------------------------------------------
// Row layout: [ Name  Cost |  -  count  + ]
// The +/- and count are right-aligned in the row.
// ---------------------------------------------------------------------------

const ROW_H = 30;
const BTN_AREA_W = 90; // width reserved for  -  count  +

// ---------------------------------------------------------------------------
// UnitShopScreen
// ---------------------------------------------------------------------------

export class UnitShopScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _card!: Container;
  private _cardW = 1400;
  private _cardH = 820;

  // State
  private _gold = 30000;
  private _goldSpent = 0;
  private _allUnits: UnitType[] = [];
  private _counts: Map<UnitType, number> = new Map();
  private _isAIShop = false;
  private _label = "UNIT SHOP";
  private _raceId: RaceId = "man" as RaceId;

  // UI refs
  private _goldText!: Text;
  private _titleText!: Text;
  private _contentContainer!: Container;
  private _scrollContainer!: Container;
  private _scrollMask!: Graphics;
  private _scrollY = 0;
  private _randomToggleOn = false;
  private _randomToggleBg?: Graphics;
  private _randomToggleLabel?: Text;
  private _startBtn!: Container;
  private _activeModifiers: CorruptionModifier[] = [];
  private _dynamicChildren: Container[] = [];
  private _countTexts: Map<UnitType, Text> = new Map();

  // Tooltip
  private _tooltip!: Container;
  private _tooltipBg!: Graphics;
  private _tooltipPreview!: Container;
  private _tooltipStats!: Container;
  private _tooltipSprite: AnimatedSprite | null = null;
  private _activeTooltipUnit: UnitType | null = null;

  onDone: ((roster: UnitRoster) => void) | null = null;

  setCorruptionModifiers(modifiers: CorruptionModifier[]): void {
    this._activeModifiers = modifiers;
  }

  init(vm: ViewManager): void {
    this._vm = vm;

    this._bg = new Graphics();
    this.container.addChild(this._bg);

    this._card = makePanel(this._cardW, this._cardH);
    this.container.addChild(this._card);

    // Title
    this._titleText = new Text({ text: this._label, style: STYLE_TITLE });
    this._titleText.anchor.set(0.5, 0);
    this._titleText.position.set(this._cardW / 2, 14);
    this._card.addChild(this._titleText);

    // Gold display
    this._goldText = new Text({ text: "", style: STYLE_GOLD });
    this._goldText.anchor.set(0.5, 0);
    this._goldText.position.set(this._cardW / 2, 48);
    this._card.addChild(this._goldText);

    // Divider
    this._card.addChild(
      new Graphics()
        .rect(16, 76, this._cardW - 32, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Content area (scrollable)
    this._contentContainer = new Container();
    this._card.addChild(this._contentContainer);

    this._scrollContainer = new Container();
    this._scrollContainer.position.set(0, 84);
    this._contentContainer.addChild(this._scrollContainer);

    this._scrollMask = new Graphics()
      .rect(0, 84, this._cardW, this._cardH - 84 - 60);
    this._scrollMask.fill({ color: 0xffffff });
    this._contentContainer.addChild(this._scrollMask);
    this._scrollContainer.mask = this._scrollMask;

    // Mouse wheel scrolling
    this._card.eventMode = "static";
    this._card.on("wheel", (e: WheelEvent) => {
      this._scrollY -= e.deltaY * 0.5;
      this._clampScroll();
      this._scrollContainer.y = 84 + this._scrollY;
    });

    // START button
    this._startBtn = this._makeStartButton();
    this._card.addChild(this._startBtn);

    // Tooltip (lives on the main container, above the card)
    this._tooltip = new Container();
    this._tooltip.visible = false;
    this._tooltipBg = new Graphics();
    this._tooltip.addChild(this._tooltipBg);
    this._tooltipPreview = new Container();
    this._tooltip.addChild(this._tooltipPreview);
    this._tooltipStats = new Container();
    this._tooltipStats.position.set(0, TT_PREVIEW_H);
    this._tooltip.addChild(this._tooltipStats);
    this.container.addChild(this._tooltip);

    vm.addToLayer("ui", this.container);
    this.container.visible = false;

    vm.app.renderer.on("resize", () => this._layout());
  }

  show(raceId: RaceId, gold: number, label?: string): void {
    this._gold = gold;
    this._goldSpent = 0;
    this._isAIShop = false;
    this._label = label ?? "UNIT SHOP";
    this._randomToggleOn = false;
    this._scrollY = 0;
    this._counts.clear();
    this._raceId = raceId;
    this._allUnits = getShopUnits(raceId);
    this._hideTooltip();
    this._rebuild();
    this.container.visible = true;
    this._layout();
  }

  showAIShop(raceId: RaceId, gold: number): void {
    this._gold = gold;
    this._goldSpent = 0;
    this._isAIShop = true;
    this._label = "AI ARMY SHOP";
    this._randomToggleOn = false;
    this._scrollY = 0;
    this._counts.clear();
    this._raceId = raceId;
    this._allUnits = getShopUnits(raceId);
    this._hideTooltip();
    this._rebuild();
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this._hideTooltip();
    this.container.visible = false;
  }

  // -------------------------------------------------------------------------
  // Rebuild
  // -------------------------------------------------------------------------

  private _rebuild(): void {
    for (const c of this._dynamicChildren) {
      c.parent?.removeChild(c);
      c.destroy({ children: true });
    }
    this._dynamicChildren = [];
    this._countTexts.clear();

    this._titleText.text = this._label;
    this._refreshGold();

    const PAD = 20;
    let topY = 0;

    // AI random toggle row
    if (this._isAIShop) {
      const toggleRow = this._buildRandomToggle(this._cardW - PAD * 2);
      toggleRow.position.set(PAD, topY);
      this._scrollContainer.addChild(toggleRow);
      this._dynamicChildren.push(toggleRow);
      topY += 36;
    }

    // Active corruption modifiers
    if (this._activeModifiers.length > 0) {
      topY = this._buildCorruptionSection(PAD, topY);
    }

    // Build columns by building type
    const { columns, factionUnits } = getShopUnitsByBuilding(this._raceId);

    const totalColumns = columns.length + (factionUnits.length > 0 ? 1 : 0);
    const availW = this._cardW - PAD * 2;
    const COL_W = Math.min(200, Math.floor(availW / Math.max(totalColumns, 1)));
    const COL_GAP = totalColumns > 1
      ? Math.floor((availW - COL_W * totalColumns) / (totalColumns - 1))
      : 0;

    let colX = PAD;

    for (const col of columns) {
      const colContainer = this._buildColumn(
        BUILDING_LABELS_MAP[col.building] ?? col.building,
        col.units,
        COL_W,
        BUILDING_COLORS[col.building] ?? 0xaaaaaa,
      );
      colContainer.position.set(colX, topY);
      this._scrollContainer.addChild(colContainer);
      this._dynamicChildren.push(colContainer);
      colX += COL_W + COL_GAP;
    }

    // Faction units column
    if (factionUnits.length > 0) {
      const race = getRace(this._raceId);
      const raceName = race ? race.name.toUpperCase() : "FACTION";
      const factionCol = this._buildColumn(
        raceName,
        factionUnits,
        COL_W,
        race?.accentColor ?? 0xffaa44,
      );
      factionCol.position.set(colX, topY);
      this._scrollContainer.addChild(factionCol);
      this._dynamicChildren.push(factionCol);
    }

    this._scrollContainer.y = 84;
    this._scrollY = 0;
  }

  // -------------------------------------------------------------------------
  // Column builder
  // -------------------------------------------------------------------------

  private _buildColumn(
    headerLabel: string,
    units: UnitType[],
    colW: number,
    headerColor: number,
  ): Container {
    const col = new Container();
    let y = 0;

    // Column header
    const headerBg = new Graphics()
      .roundRect(0, 0, colW, 26, 4)
      .fill({ color: headerColor, alpha: 0.15 })
      .roundRect(0, 0, colW, 26, 4)
      .stroke({ color: headerColor, alpha: 0.5, width: 1 });
    headerBg.position.set(0, y);
    col.addChild(headerBg);

    const headerTxt = new Text({
      text: headerLabel,
      style: { ...STYLE_COL_HEADER, fill: headerColor } as TextStyle,
    });
    headerTxt.anchor.set(0.5, 0.5);
    headerTxt.position.set(colW / 2, y + 13);
    col.addChild(headerTxt);
    y += 30;

    // Unit rows
    for (const ut of units) {
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      const cost = uDef.cost ?? 100;
      const tier = uDef.tier ?? computeTier(cost);

      const row = new Container();
      row.position.set(0, y);
      row.eventMode = "static";
      row.cursor = "pointer";

      // Row background
      const rowBg = new Graphics()
        .roundRect(0, 0, colW, ROW_H - 2, 3)
        .fill({ color: 0x111122, alpha: 0.5 });
      row.addChild(rowBg);

      // Left side: name + cost
      const nameLabel = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");
      const nameTxt = new Text({
        text: `T${tier} ${nameLabel}`,
        style: STYLE_UNIT_NAME,
      });
      nameTxt.position.set(4, 2);
      row.addChild(nameTxt);

      const costTxt = new Text({
        text: `${cost}g`,
        style: STYLE_UNIT_COST,
      });
      costTxt.position.set(4, 15);
      row.addChild(costTxt);

      // Right side: [ - ] count [ + ]
      const rightX = colW - BTN_AREA_W;

      const minusBtn = this._makeSmallBtn("-", rightX + 14, ROW_H / 2);
      row.addChild(minusBtn);

      const countTxt = new Text({ text: "0", style: STYLE_COUNT });
      countTxt.anchor.set(0.5, 0.5);
      countTxt.position.set(rightX + BTN_AREA_W / 2, ROW_H / 2);
      row.addChild(countTxt);
      this._countTexts.set(ut, countTxt);

      const plusBtn = this._makeSmallBtn("+", rightX + BTN_AREA_W - 14, ROW_H / 2);
      row.addChild(plusBtn);

      // Wire up +/- buttons
      minusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (cur > 0) {
          this._counts.set(ut, cur - 1);
          this._goldSpent -= cost;
          countTxt.text = String(cur - 1);
          this._refreshGold();
        }
      });

      plusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (this._goldSpent + cost <= this._gold) {
          this._counts.set(ut, cur + 1);
          this._goldSpent += cost;
          countTxt.text = String(cur + 1);
          this._refreshGold();
        }
      });

      // Hover for tooltip
      row.on("pointerover", (e) => {
        rowBg.clear()
          .roundRect(0, 0, colW, ROW_H - 2, 3)
          .fill({ color: 0x1a2244, alpha: 0.8 });
        this._showTooltip(ut, e.globalX, e.globalY);
      });
      row.on("pointermove", (e) => {
        if (this._activeTooltipUnit === ut) {
          this._positionTooltip(e.globalX, e.globalY);
        }
      });
      row.on("pointerout", () => {
        rowBg.clear()
          .roundRect(0, 0, colW, ROW_H - 2, 3)
          .fill({ color: 0x111122, alpha: 0.5 });
        this._hideTooltip();
      });

      col.addChild(row);
      y += ROW_H;
    }

    return col;
  }

  // -------------------------------------------------------------------------
  // Tooltip
  // -------------------------------------------------------------------------

  private _showTooltip(ut: UnitType, gx: number, gy: number): void {
    this._activeTooltipUnit = ut;
    const def = UNIT_DEFINITIONS[ut];
    if (!def) return;

    // Clear previous content
    this._tooltipPreview.removeChildren();
    this._tooltipStats.removeChildren();
    if (this._tooltipSprite) {
      this._tooltipSprite.stop();
      this._tooltipSprite = null;
    }

    // Animated preview sprite
    const frames = animationManager.getFrames(ut, UnitState.IDLE);
    if (frames.length > 0 && frames[0] !== Texture.WHITE) {
      const sprite = new AnimatedSprite(frames);
      sprite.anchor.set(0.5, 0.5);
      sprite.width = 56;
      sprite.height = 56;
      sprite.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      const frameSet = animationManager.getFrameSet(ut, UnitState.IDLE);
      sprite.animationSpeed = frameSet.fps / 60;
      sprite.loop = true;
      sprite.play();
      this._tooltipSprite = sprite;
      this._tooltipPreview.addChild(sprite);
    } else {
      // Fallback: circle with letter
      const g = new Graphics()
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22)
        .fill({ color: 0x334466 })
        .circle(TT_W / 2, TT_PREVIEW_H / 2, 22)
        .stroke({ color: 0x5588aa, width: 1 });
      this._tooltipPreview.addChild(g);
      const letter = new Text({
        text: (UNIT_LABELS[ut] ?? ut).charAt(0),
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 18,
          fill: 0xdddddd,
          fontWeight: "bold",
        }),
      });
      letter.anchor.set(0.5, 0.5);
      letter.position.set(TT_W / 2, TT_PREVIEW_H / 2);
      this._tooltipPreview.addChild(letter);
    }

    // Stats
    let sy = TT_PAD;
    const tier = def.tier ?? computeTier(def.cost);
    const nameLabel = UNIT_LABELS[ut] ?? ut.replace(/_/g, " ");

    const nameTxt = new Text({ text: `${nameLabel}  T${tier}`, style: STYLE_TT_NAME });
    nameTxt.position.set(TT_PAD, sy);
    this._tooltipStats.addChild(nameTxt);
    sy += 18;

    // Description
    if (def.description) {
      const descTxt = new Text({ text: def.description, style: STYLE_TT_DESC });
      descTxt.position.set(TT_PAD, sy);
      this._tooltipStats.addChild(descTxt);
      sy += descTxt.height + 6;
    }

    // HP, ATK, SPD
    const line1 = new Text({
      text: `HP:${def.hp}  ATK:${def.atk}  SPD:${def.speed.toFixed(1)}`,
      style: STYLE_TT_STAT,
    });
    line1.position.set(TT_PAD, sy);
    this._tooltipStats.addChild(line1);
    sy += 14;

    // Range, Attack Speed, Cost
    const line2 = new Text({
      text: `RNG:${def.range}  AS:${def.attackSpeed}  COST:${def.cost}g`,
      style: STYLE_TT_STAT,
    });
    line2.position.set(TT_PAD, sy);
    this._tooltipStats.addChild(line2);
    sy += 14;

    // Spawn time
    const line3 = new Text({
      text: `Spawn: ${def.spawnTime}s`,
      style: STYLE_TT_STAT,
    });
    line3.position.set(TT_PAD, sy);
    this._tooltipStats.addChild(line3);
    sy += 14;

    // Abilities
    if (def.abilityTypes.length > 0) {
      const abilTxt = new Text({
        text: def.abilityTypes.join(", "),
        style: STYLE_TT_ABILITY,
      });
      abilTxt.position.set(TT_PAD, sy);
      this._tooltipStats.addChild(abilTxt);
      sy += 14;
    }

    // Tags (charge, healer, siege, etc.)
    const tags: string[] = [];
    if (def.isChargeUnit) tags.push("Charge");
    if (def.isHealer) tags.push("Healer");
    if (def.siegeOnly) tags.push("Siege Only");
    if (tags.length > 0) {
      const tagTxt = new Text({
        text: tags.join(" | "),
        style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0xccaa66 }),
      });
      tagTxt.position.set(TT_PAD, sy);
      this._tooltipStats.addChild(tagTxt);
      sy += 14;
    }

    // Draw background
    const totalH = TT_PREVIEW_H + sy + TT_PAD;
    this._tooltipBg.clear()
      .roundRect(0, 0, TT_W, totalH, 6)
      .fill({ color: 0x0d0d1e, alpha: 0.95 })
      .roundRect(0, 0, TT_W, totalH, 6)
      .stroke({ color: BORDER_COLOR, alpha: 0.55, width: 1.5 });

    this._positionTooltip(gx, gy);
    this._tooltip.visible = true;
  }

  private _positionTooltip(gx: number, gy: number): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Position to the right of cursor, flip if near edge
    let tx = gx + 16;
    let ty = gy - 20;

    if (tx + TT_W > sw - 10) tx = gx - TT_W - 16;
    if (ty < 10) ty = 10;
    // Estimate tooltip height
    const ttH = this._tooltipBg.height || 200;
    if (ty + ttH > sh - 10) ty = sh - ttH - 10;

    this._tooltip.position.set(tx, ty);
  }

  private _hideTooltip(): void {
    this._tooltip.visible = false;
    this._activeTooltipUnit = null;
    if (this._tooltipSprite) {
      this._tooltipSprite.stop();
      this._tooltipSprite = null;
    }
    this._tooltipPreview.removeChildren();
    this._tooltipStats.removeChildren();
  }

  // -------------------------------------------------------------------------
  // Small +/- buttons
  // -------------------------------------------------------------------------

  private _makeSmallBtn(label: string, cx: number, cy: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bw = 24;
    const bh = 22;
    btn.position.set(cx - bw / 2, cy - bh / 2);

    const bg = new Graphics()
      .roundRect(0, 0, bw, bh, 4)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, bw, bh, 4)
      .stroke({ color: 0x4488cc, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 15,
        fill: 0x88ccff,
        fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(bw / 2, bh / 2);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
  }

  // -------------------------------------------------------------------------
  // Random toggle, corruption section, start button
  // -------------------------------------------------------------------------

  private _buildRandomToggle(w: number): Container {
    const toggleRow = new Container();
    const tH = 30;

    const tBg = new Graphics();
    toggleRow.addChild(tBg);

    const tLabel = new Text({ text: "", style: STYLE_BTN });
    tLabel.anchor.set(0.5, 0.5);
    tLabel.position.set(w / 2, tH / 2);
    toggleRow.addChild(tLabel);

    this._randomToggleBg = tBg;
    this._randomToggleLabel = tLabel;
    this._refreshRandomToggle(w, tH);

    toggleRow.eventMode = "static";
    toggleRow.cursor = "pointer";
    toggleRow.on("pointerdown", () => {
      this._randomToggleOn = !this._randomToggleOn;
      this._refreshRandomToggle(w, tH);
      if (this._randomToggleOn) {
        this._fillRandomArmy();
      } else {
        this._counts.clear();
        this._goldSpent = 0;
        this._refreshAllRows();
        this._refreshGold();
      }
    });

    return toggleRow;
  }

  private _buildCorruptionSection(pad: number, startY: number): number {
    let y = startY;

    const modHeaderTxt = new Text({
      text: `ACTIVE CORRUPTION (${this._activeModifiers.length}):`,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 10,
        fill: 0xcc88ff,
        fontWeight: "bold",
        letterSpacing: 1,
      }),
    });
    modHeaderTxt.position.set(pad, y + 2);
    const modHeaderRow = new Container();
    modHeaderRow.addChild(modHeaderTxt);
    this._scrollContainer.addChild(modHeaderRow);
    this._dynamicChildren.push(modHeaderRow);
    y += 18;

    for (const mod of this._activeModifiers) {
      const modRow = new Container();
      modRow.position.set(pad, y);
      const modTxt = new Text({
        text: `  ${mod.name} — ${mod.description}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: 9,
          fill: 0xaa77dd,
          letterSpacing: 1,
        }),
      });
      modTxt.position.set(0, 2);
      modRow.addChild(modTxt);
      this._scrollContainer.addChild(modRow);
      this._dynamicChildren.push(modRow);
      y += 16;
    }
    y += 6;
    return y;
  }

  private _makeStartButton(): Container {
    const BW = this._cardW - 32;
    const BH = 44;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(16, this._cardH - 56);

    const bg = new Graphics()
      .roundRect(0, 0, BW, BH, 6)
      .fill({ color: 0x1a3a1a })
      .roundRect(0, 0, BW, BH, 6)
      .stroke({ color: 0x44aa66, width: 2 });
    btn.addChild(bg);

    const lbl = new Text({
      text: "START BATTLE  >",
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 17,
        fill: 0x88ffaa,
        fontWeight: "bold",
        letterSpacing: 2,
      }),
    });
    lbl.anchor.set(0.5, 0.5);
    lbl.position.set(BW / 2, BH / 2);
    btn.addChild(lbl);

    btn.on("pointerover", () => { bg.tint = 0xaaffcc; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });
    btn.on("pointerdown", () => {
      const roster = this._buildRoster();
      this.onDone?.(roster);
    });

    return btn;
  }

  // -------------------------------------------------------------------------
  // Roster & gold helpers
  // -------------------------------------------------------------------------

  private _buildRoster(): UnitRoster {
    const roster: UnitRoster = [];
    for (const [ut, count] of this._counts) {
      if (count > 0) {
        roster.push({ type: ut, count });
      }
    }
    return roster;
  }

  private _refreshGold(): void {
    const remaining = this._gold - this._goldSpent;
    this._goldText.text = `GOLD: ${remaining} / ${this._gold}`;
  }

  private _refreshAllRows(): void {
    for (const [ut, txt] of this._countTexts) {
      txt.text = String(this._counts.get(ut) ?? 0);
    }
  }

  private _refreshRandomToggle(w: number, h: number): void {
    if (!this._randomToggleBg || !this._randomToggleLabel) return;
    const on = this._randomToggleOn;
    this._randomToggleBg.clear();
    this._randomToggleBg
      .roundRect(0, 0, w, h, 4)
      .fill({ color: on ? 0x1a3a1a : 0x2a1a1a })
      .roundRect(0, 0, w, h, 4)
      .stroke({ color: on ? 0x44aa66 : 0xaa4444, width: 1.5 });
    this._randomToggleLabel.text = on
      ? "RANDOM ARMY: ON  [click to disable]"
      : "RANDOM ARMY: OFF  [click to enable]";
    this._randomToggleLabel.style.fill = on ? 0x88ffaa : 0xff8888;
  }

  private _fillRandomArmy(): void {
    this._counts.clear();
    this._goldSpent = 0;

    const available = this._allUnits.filter((ut) => {
      const uDef = UNIT_DEFINITIONS[ut];
      return uDef && uDef.cost <= this._gold;
    });
    if (available.length === 0) return;

    let remaining = this._gold;
    let safety = 500;
    while (remaining > 0 && safety-- > 0) {
      const affordable = available.filter((ut) => (UNIT_DEFINITIONS[ut].cost ?? 100) <= remaining);
      if (affordable.length === 0) break;
      const pick = affordable[Math.floor(Math.random() * affordable.length)];
      const cost = UNIT_DEFINITIONS[pick].cost ?? 100;
      this._counts.set(pick, (this._counts.get(pick) ?? 0) + 1);
      this._goldSpent += cost;
      remaining -= cost;
    }

    this._refreshAllRows();
    this._refreshGold();
  }

  private _clampScroll(): void {
    const { columns, factionUnits } = getShopUnitsByBuilding(this._raceId);
    let maxUnits = 0;
    for (const col of columns) {
      if (col.units.length > maxUnits) maxUnits = col.units.length;
    }
    if (factionUnits.length > maxUnits) maxUnits = factionUnits.length;

    const topExtra = (this._isAIShop ? 36 : 0) + (this._activeModifiers.length > 0 ? 18 + this._activeModifiers.length * 16 + 6 : 0);
    const contentH = topExtra + 30 + maxUnits * ROW_H;
    const viewH = this._cardH - 84 - 60;
    const minScroll = Math.min(0, viewH - contentH);
    this._scrollY = Math.max(minScroll, Math.min(0, this._scrollY));
  }

  private _layout(): void {
    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    this._bg.clear();
    this._bg.rect(0, 0, sw, sh).fill({ color: BG_COLOR });

    this._card.position.set(
      Math.floor((sw - this._cardW) / 2),
      Math.floor((sh - this._cardH) / 2),
    );
  }
}

export const unitShopScreen = new UnitShopScreen();
