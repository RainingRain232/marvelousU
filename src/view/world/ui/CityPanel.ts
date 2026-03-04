// City management panel for world mode.
//
// Shows city info, buildings, and recruitment when a city is selected.
// Rendered as a PixiJS panel on the right side of the screen.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import {
  getAvailableBuildings,
  getRecruitableUnits,
  startConstruction,
  queueRecruitment,
} from "@world/systems/CitySystem";
import { getWorldBuildingDef } from "@world/config/WorldBuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { calculateCityYields } from "@world/systems/WorldEconomySystem";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 16,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const SECTION_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 13,
  fontWeight: "bold",
  fill: 0xaaddff,
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xcccccc,
});

const BTN_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

const BORDER = 0x555577;
const PANEL_W = 280;

// ---------------------------------------------------------------------------
// CityPanel
// ---------------------------------------------------------------------------

export class CityPanel {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _city: WorldCity | null = null;
  private _state: WorldState | null = null;
  private _contentContainer = new Container();
  private _screenH = 600;

  /** Called when a unit recruitment order is placed. */
  onRecruit: ((cityId: string, unitType: string, count: number) => void) | null = null;
  /** Called when a building construction is started. */
  onBuild: ((cityId: string, buildingType: string) => void) | null = null;
  /** Called when the panel should close. */
  onClose: (() => void) | null = null;

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this._screenH = vm.screenHeight;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;

    vm.app.renderer.on("resize", (_w: number, h: number) => {
      this._screenH = h;
      if (this._city && this._state) this._rebuild();
    });
  }

  show(city: WorldCity, state: WorldState): void {
    this._city = city;
    this._state = state;
    this.container.visible = true;
    this._rebuild();
  }

  hide(): void {
    this.container.visible = false;
    this._city = null;
    this._state = null;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }

  // -----------------------------------------------------------------------
  // Build panel contents
  // -----------------------------------------------------------------------

  private _rebuild(): void {
    this._contentContainer.removeFromParent();
    this._contentContainer.destroy({ children: true });
    this._contentContainer = new Container();

    const city = this._city!;
    const state = this._state!;

    // Panel background
    const bg = new Graphics();
    bg.roundRect(0, 0, PANEL_W, this._screenH - 20, 8);
    bg.fill({ color: 0x0a0a20, alpha: 0.92 });
    bg.stroke({ color: BORDER, width: 1.5 });
    this._contentContainer.addChild(bg);

    let y = 12;

    // Close button
    const closeBtn = _makeButton("X", PANEL_W - 30, 8, 20, 20, () => {
      this.onClose?.();
    });
    this._contentContainer.addChild(closeBtn);

    // City name
    const title = new Text({ text: city.name, style: TITLE_STYLE });
    title.x = 12;
    title.y = y;
    this._contentContainer.addChild(title);
    y += 24;

    // Info
    const yields = calculateCityYields(city, state);
    const info = [
      `Population: ${city.population}`,
      `Gold/turn: +${yields.gold}  Food/turn: +${yields.food}`,
      `Production/turn: +${yields.production}`,
      city.isUnderSiege ? "UNDER SIEGE" : "",
    ]
      .filter(Boolean)
      .join("\n");

    const infoText = new Text({ text: info, style: INFO_STYLE });
    infoText.x = 12;
    infoText.y = y;
    this._contentContainer.addChild(infoText);
    y += infoText.height + 14;

    // --- Buildings section ---
    const buildLabel = new Text({ text: "Buildings", style: SECTION_STYLE });
    buildLabel.x = 12;
    buildLabel.y = y;
    this._contentContainer.addChild(buildLabel);
    y += 20;

    // Existing buildings
    for (const b of city.buildings) {
      const def = getWorldBuildingDef(b.type);
      const bText = new Text({
        text: `  ${def?.name ?? b.type}`,
        style: INFO_STYLE,
      });
      bText.x = 12;
      bText.y = y;
      this._contentContainer.addChild(bText);
      y += 16;
    }

    // Under construction
    if (city.constructionQueue) {
      const def = getWorldBuildingDef(city.constructionQueue.buildingType as string);
      const progress = Math.floor(
        (city.constructionQueue.invested / city.constructionQueue.cost) * 100,
      );
      const cText = new Text({
        text: `  Building: ${def?.name ?? "?"} (${progress}%)`,
        style: INFO_STYLE,
      });
      cText.x = 12;
      cText.y = y;
      this._contentContainer.addChild(cText);
      y += 16;
    }

    y += 6;

    // Available to build
    if (!city.constructionQueue && !city.isUnderSiege) {
      const available = getAvailableBuildings(city, state);
      for (const def of available.slice(0, 8)) {
        // Show up to 8
        const btn = _makeButton(
          `${def.name} (${def.productionCost}p)`,
          16,
          y,
          PANEL_W - 32,
          22,
          () => {
            this.onBuild?.(city.id, def.type);
          },
        );
        this._contentContainer.addChild(btn);
        y += 26;
      }
    }

    y += 10;

    // --- Recruitment section ---
    const recruitLabel = new Text({ text: "Recruit", style: SECTION_STYLE });
    recruitLabel.x = 12;
    recruitLabel.y = y;
    this._contentContainer.addChild(recruitLabel);
    y += 20;

    // Pending recruitment
    for (const entry of city.recruitmentQueue) {
      const rText = new Text({
        text: `  ${entry.unitType} x${entry.count} (${entry.turnsLeft}t)`,
        style: INFO_STYLE,
      });
      rText.x = 12;
      rText.y = y;
      this._contentContainer.addChild(rText);
      y += 16;
    }

    // Recruitable units
    if (!city.isUnderSiege) {
      const units = getRecruitableUnits(city);
      for (const unitType of units.slice(0, 8)) {
        const unitDef = UNIT_DEFINITIONS[unitType as keyof typeof UNIT_DEFINITIONS];
        if (!unitDef) continue;
        const player = state.players.get(city.owner);
        const affordable = player ? Math.floor(player.gold / unitDef.cost) : 0;
        const label = `${unitType} (${unitDef.cost}g) [max ${affordable}]`;
        const btn = _makeButton(label, 16, y, PANEL_W - 32, 22, () => {
          this.onRecruit?.(city.id, unitType, 1);
        });
        this._contentContainer.addChild(btn);
        y += 26;
      }
    }

    // Garrison info
    y += 10;
    const garrisonLabel = new Text({ text: "Garrison", style: SECTION_STYLE });
    garrisonLabel.x = 12;
    garrisonLabel.y = y;
    this._contentContainer.addChild(garrisonLabel);
    y += 20;

    const garrison = city.garrisonArmyId
      ? state.armies.get(city.garrisonArmyId)
      : null;
    if (garrison && garrison.units.length > 0) {
      for (const u of garrison.units) {
        const gText = new Text({
          text: `  ${u.unitType} x${u.count}`,
          style: INFO_STYLE,
        });
        gText.x = 12;
        gText.y = y;
        this._contentContainer.addChild(gText);
        y += 16;
      }
    } else {
      const emptyText = new Text({ text: "  (empty)", style: INFO_STYLE });
      emptyText.x = 12;
      emptyText.y = y;
      this._contentContainer.addChild(emptyText);
      y += 16;
    }

    // Position panel on right side
    this._contentContainer.x = this._vm.screenWidth - PANEL_W - 10;
    this._contentContainer.y = 10;

    this.container.addChild(this._contentContainer);
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeButton(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: () => void,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 4);
  bg.fill({ color: 0x222244 });
  bg.stroke({ color: BORDER, width: 1 });
  btn.addChild(bg);

  const txt = new Text({ text: label, style: BTN_STYLE });
  txt.x = 6;
  txt.y = (h - txt.height) / 2;
  btn.addChild(txt);

  btn.position.set(x, y);
  btn.on("pointerdown", onClick);

  btn.on("pointerover", () => {
    bg.clear();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x334466 });
    bg.stroke({ color: 0x6688aa, width: 1 });
  });
  btn.on("pointerout", () => {
    bg.clear();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x222244 });
    bg.stroke({ color: BORDER, width: 1 });
  });

  return btn;
}

/** Singleton instance. */
export const cityPanel = new CityPanel();
