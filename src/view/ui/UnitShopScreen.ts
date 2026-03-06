// Pre-battle unit shop screen for Battlefield and Wave modes.
// Players spend a gold budget to assemble an army from race-filtered units.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import { UNIT_DEFINITIONS, computeTier } from "@sim/config/UnitDefinitions";
import { BUILDING_DEFINITIONS } from "@sim/config/BuildingDefs";
import { filterInventoryByRace, getRace } from "@sim/config/RaceDefs";
import type { RaceId } from "@sim/config/RaceDefs";
import { BuildingType, UnitType } from "@/types";
import type { CorruptionModifier } from "@sim/systems/GrailCorruptionSystem";

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

const STYLE_TITLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 22,
  fill: 0xffd700,
  fontWeight: "bold",
  letterSpacing: 2,
});

const STYLE_GOLD = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fill: 0xffcc00,
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

const BG_COLOR = 0x0a0a18;
const BORDER_COLOR = 0xffd700;

/** Get all purchasable unit types for a race, including faction units. */
function getShopUnits(raceId: RaceId): UnitType[] {
  const seen = new Set<UnitType>();
  const result: UnitType[] = [];

  for (const bt of SHOP_BUILDINGS) {
    const bDef = BUILDING_DEFINITIONS[bt];
    if (!bDef) continue;
    const filtered = filterInventoryByRace(bDef.shopInventory, bt, raceId);
    for (const ut of filtered) {
      if (seen.has(ut)) continue;
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      if (uDef.siegeOnly || uDef.diplomatOnly) continue;
      if (ut === UnitType.SETTLER) continue;
      seen.add(ut);
      result.push(ut);
    }
  }

  // Add faction units
  const race = getRace(raceId);
  if (race) {
    for (const fut of race.factionUnits) {
      if (fut && !seen.has(fut) && UNIT_DEFINITIONS[fut]) {
        seen.add(fut);
        result.push(fut);
      }
    }
  }

  // Sort by cost
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

export class UnitShopScreen {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _bg!: Graphics;
  private _card!: Container;
  private _cardW = 520;
  private _cardH = 600;

  // State
  private _gold = 30000;
  private _goldSpent = 0;
  private _units: UnitType[] = [];
  private _counts: Map<UnitType, number> = new Map();
  private _isAIShop = false;
  private _label = "UNIT SHOP";

  // UI refs
  private _goldText!: Text;
  private _titleText!: Text;
  private _unitRows: Container[] = [];
  private _scrollContainer!: Container;
  private _scrollMask!: Graphics;
  private _scrollY = 0;
  private _randomToggleOn = false;
  private _randomToggleBg?: Graphics;
  private _randomToggleLabel?: Text;
  private _startBtn!: Container;
  private _activeModifiers: CorruptionModifier[] = [];

  onDone: ((roster: UnitRoster) => void) | null = null;

  /** Set active corruption modifiers to display in the shop. */
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
    this._goldText.position.set(this._cardW / 2, 44);
    this._card.addChild(this._goldText);

    // Divider
    this._card.addChild(
      new Graphics()
        .rect(16, 68, this._cardW - 32, 1)
        .fill({ color: BORDER_COLOR, alpha: 0.2 }),
    );

    // Scrollable unit list area
    this._scrollContainer = new Container();
    this._scrollContainer.position.set(0, 76);
    this._card.addChild(this._scrollContainer);

    this._scrollMask = new Graphics()
      .rect(0, 76, this._cardW, this._cardH - 76 - 60);
    this._scrollMask.fill({ color: 0xffffff });
    this._card.addChild(this._scrollMask);
    this._scrollContainer.mask = this._scrollMask;

    // Mouse wheel scrolling
    this._card.eventMode = "static";
    this._card.on("wheel", (e: WheelEvent) => {
      this._scrollY -= e.deltaY * 0.5;
      this._clampScroll();
      this._scrollContainer.y = 76 + this._scrollY;
    });

    // START button (positioned at bottom of card)
    this._startBtn = this._makeStartButton();
    this._card.addChild(this._startBtn);

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
    this._units = getShopUnits(raceId);
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
    this._units = getShopUnits(raceId);
    this._rebuild();
    this.container.visible = true;
    this._layout();
  }

  hide(): void {
    this.container.visible = false;
  }

  // -------------------------------------------------------------------------
  // Private
  // -------------------------------------------------------------------------

  private _rebuild(): void {
    // Clear old rows
    for (const r of this._unitRows) {
      this._scrollContainer.removeChild(r);
      r.destroy({ children: true });
    }
    this._unitRows = [];

    this._titleText.text = this._label;
    this._refreshGold();

    // Remove old random toggle if any
    if (this._randomToggleBg?.parent) {
      this._randomToggleBg.parent.parent?.removeChild(this._randomToggleBg.parent);
    }

    const ROW_H = 32;
    const PAD = 16;
    let yOff = 0;

    // AI random toggle row
    if (this._isAIShop) {
      const toggleRow = new Container();
      toggleRow.position.set(PAD, yOff);

      const tW = this._cardW - PAD * 2;
      const tH = 30;
      const tBg = new Graphics();
      toggleRow.addChild(tBg);

      const tLabel = new Text({ text: "", style: STYLE_BTN });
      tLabel.anchor.set(0.5, 0.5);
      tLabel.position.set(tW / 2, tH / 2);
      toggleRow.addChild(tLabel);

      this._randomToggleBg = tBg;
      this._randomToggleLabel = tLabel;
      this._refreshRandomToggle(tW, tH);

      toggleRow.eventMode = "static";
      toggleRow.cursor = "pointer";
      toggleRow.on("pointerdown", () => {
        this._randomToggleOn = !this._randomToggleOn;
        this._refreshRandomToggle(tW, tH);
        if (this._randomToggleOn) {
          this._fillRandomArmy();
        } else {
          this._counts.clear();
          this._goldSpent = 0;
          this._refreshAllRows();
          this._refreshGold();
        }
      });

      this._scrollContainer.addChild(toggleRow);
      this._unitRows.push(toggleRow);
      yOff += tH + 6;
    }

    // Active corruption modifiers display
    if (this._activeModifiers.length > 0) {
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
      modHeaderTxt.position.set(PAD, yOff + 2);
      const modHeaderRow = new Container();
      modHeaderRow.addChild(modHeaderTxt);
      this._scrollContainer.addChild(modHeaderRow);
      this._unitRows.push(modHeaderRow);
      yOff += 18;

      for (const mod of this._activeModifiers) {
        const modRow = new Container();
        modRow.position.set(PAD, yOff);
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
        this._unitRows.push(modRow);
        yOff += 16;
      }
      yOff += 6;
    }

    // Unit rows
    for (const ut of this._units) {
      const uDef = UNIT_DEFINITIONS[ut];
      if (!uDef) continue;
      const cost = uDef.cost ?? 100;
      const tier = uDef.tier ?? computeTier(cost);

      const row = new Container();
      row.position.set(PAD, yOff);

      // Name + cost label
      const nameStr = ut.replace(/_/g, " ").toUpperCase();
      const nameTxt = new Text({
        text: `T${tier} ${nameStr}`,
        style: STYLE_UNIT_NAME,
      });
      nameTxt.position.set(0, 4);
      row.addChild(nameTxt);

      const costTxt = new Text({
        text: `${cost}g`,
        style: STYLE_UNIT_COST,
      });
      costTxt.position.set(0, 18);
      row.addChild(costTxt);

      // Count display
      const countTxt = new Text({
        text: "0",
        style: STYLE_COUNT,
      });
      countTxt.anchor.set(0.5, 0.5);
      countTxt.position.set(this._cardW - PAD * 2 - 80, ROW_H / 2);
      row.addChild(countTxt);

      // Minus button
      const minusBtn = this._makeSmallBtn("-", this._cardW - PAD * 2 - 120, ROW_H / 2);
      minusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (cur > 0) {
          this._counts.set(ut, cur - 1);
          this._goldSpent -= cost;
          countTxt.text = String(cur - 1);
          this._refreshGold();
        }
      });
      row.addChild(minusBtn);

      // Plus button
      const plusBtn = this._makeSmallBtn("+", this._cardW - PAD * 2 - 40, ROW_H / 2);
      plusBtn.on("pointerdown", () => {
        const cur = this._counts.get(ut) ?? 0;
        if (this._goldSpent + cost <= this._gold) {
          this._counts.set(ut, cur + 1);
          this._goldSpent += cost;
          countTxt.text = String(cur + 1);
          this._refreshGold();
        }
      });
      row.addChild(plusBtn);

      // Store ref to countTxt for refreshing
      (row as Container & { _countTxt: Text; _unitType: UnitType })._countTxt = countTxt;
      (row as Container & { _unitType: UnitType })._unitType = ut;

      this._scrollContainer.addChild(row);
      this._unitRows.push(row);
      yOff += ROW_H;
    }

    this._scrollContainer.y = 76;
    this._scrollY = 0;
  }

  private _makeSmallBtn(label: string, x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(x - 14, y - 12);

    const bg = new Graphics()
      .roundRect(0, 0, 28, 24, 4)
      .fill({ color: 0x1a2a3a })
      .roundRect(0, 0, 28, 24, 4)
      .stroke({ color: 0x4488cc, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: label,
      style: new TextStyle({
        fontFamily: "monospace",
        fontSize: 16,
        fill: 0x88ccff,
        fontWeight: "bold",
      }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(14, 12);
    btn.addChild(txt);

    btn.on("pointerover", () => { bg.tint = 0xaaddff; });
    btn.on("pointerout", () => { bg.tint = 0xffffff; });

    return btn;
  }

  private _makeStartButton(): Container {
    const BW = this._cardW - 32;
    const BH = 40;
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";
    btn.position.set(16, this._cardH - 52);

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
        fontSize: 15,
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
    for (const row of this._unitRows) {
      const r = row as Container & { _countTxt?: Text; _unitType?: UnitType };
      if (r._countTxt && r._unitType) {
        r._countTxt.text = String(this._counts.get(r._unitType) ?? 0);
      }
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

    const available = this._units.filter((ut) => {
      const uDef = UNIT_DEFINITIONS[ut];
      return uDef && uDef.cost <= this._gold;
    });
    if (available.length === 0) return;

    // Simple random fill: keep adding random units until budget exhausted
    let remaining = this._gold;
    let safety = 500;
    while (remaining > 0 && safety-- > 0) {
      // Pick a random unit we can afford
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
    const contentH = this._unitRows.length * 32 + (this._isAIShop ? 36 : 0);
    const viewH = this._cardH - 76 - 60;
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
