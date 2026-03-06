// City management panel for world mode.
//
// Shows city info, buildings, and recruitment when a city is selected.
// Rendered as a PixiJS panel on the right side of the screen.

import { Container, Graphics, Text, TextStyle, Sprite } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import {
  getAvailableBuildings,
  getRecruitableUnits,
} from "@world/systems/CitySystem";
import { getWorldBuildingDef } from "@world/config/WorldBuildingDefs";
import { UNIT_DEFINITIONS } from "@sim/config/UnitDefinitions";
import { calculateCityYields } from "@world/systems/WorldEconomySystem";
import { UnitType, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";

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

  /** Army creation mode state. */
  private _armyCreationMode = false;
  private _selectedUnits = new Map<string, number>();

  /** Called when a unit recruitment order is placed. */
  onRecruit: ((cityId: string, unitType: string, count: number) => void) | null = null;
  /** Called when a building construction is started. */
  onBuild: ((cityId: string, buildingType: string) => void) | null = null;
  /** Called when the panel should close. */
  onClose: (() => void) | null = null;
  /** Called when the player creates a new army from garrison units. */
  onCreateArmy: ((cityId: string, units: Array<{ unitType: string; count: number }>) => void) | null = null;
  /** Called when the player renames the city. */
  onRename: ((cityId: string, newName: string) => void) | null = null;
  /** Called when the player wants to view the city preview. */
  onViewCity: ((cityId: string) => void) | null = null;
  /** Called when the player wants to consult an advisor. */
  onAskAdvisor: ((advisor: "merlin" | "queen") => void) | null = null;

  /** Rename input state. */
  private _renaming = false;
  private _renameText = "";
  private _renameHandler: ((e: KeyboardEvent) => void) | null = null;

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
    this._armyCreationMode = false;
    this._selectedUnits.clear();
    this._stopRename();
  }

  private _stopRename(): void {
    this._renaming = false;
    this._renameText = "";
    if (this._renameHandler) {
      window.removeEventListener("keydown", this._renameHandler);
      this._renameHandler = null;
    }
  }

  private _startRename(): void {
    if (!this._city) return;
    this._renaming = true;
    this._renameText = this._city.name;
    this._renameHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        this._stopRename();
        this._rebuild();
        return;
      }
      if (e.key === "Enter") {
        const name = this._renameText.trim();
        if (name.length > 0 && this._city) {
          this.onRename?.(this._city.id, name);
        }
        this._stopRename();
        this._rebuild();
        return;
      }
      if (e.key === "Backspace") {
        this._renameText = this._renameText.slice(0, -1);
        this._rebuild();
        return;
      }
      if (e.key.length === 1 && this._renameText.length < 20) {
        this._renameText += e.key;
        this._rebuild();
      }
    };
    window.addEventListener("keydown", this._renameHandler);
    this._rebuild();
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
    bg.roundRect(0, 0, PANEL_W, this._screenH - 70, 8);
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
    if (this._renaming) {
      const inputBg = new Graphics();
      inputBg.roundRect(12, y, PANEL_W - 70, 20, 3);
      inputBg.fill({ color: 0x111133 });
      inputBg.stroke({ color: 0x6688aa, width: 1 });
      this._contentContainer.addChild(inputBg);

      const inputText = new Text({
        text: this._renameText + "_",
        style: TITLE_STYLE,
      });
      inputText.x = 16;
      inputText.y = y;
      this._contentContainer.addChild(inputText);
      y += 24;
    } else {
      const title = new Text({ text: city.name, style: TITLE_STYLE });
      title.x = 12;
      title.y = y;
      this._contentContainer.addChild(title);

      const renameBtn = _makeButton("Rename", PANEL_W - 80, y, 48, 18, () => {
        this._startRename();
      });
      this._contentContainer.addChild(renameBtn);
      y += 24;

      // View City button
      const viewBtn = _makeButton(
        "VIEW CITY",
        16,
        y,
        PANEL_W - 32,
        24,
        () => { this.onViewCity?.(city.id); },
        0x223344,
        0x4488aa,
      );
      this._contentContainer.addChild(viewBtn);
      y += 30;
    }

    if (this._armyCreationMode) {
      y = this._buildArmyCreationView(city, state, y);
    } else {
      y = this._buildNormalView(city, state, y);
    }

    // Position panel on right side
    this._contentContainer.x = this._vm.screenWidth - PANEL_W - 10;
    this._contentContainer.y = 60; // below the HUD bar

    this.container.addChild(this._contentContainer);
  }

  // -----------------------------------------------------------------------
  // Normal city view
  // -----------------------------------------------------------------------

  private _buildNormalView(city: WorldCity, state: WorldState, y: number): number {
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
    y += 18;

    const recruitHint = new Text({
      text: "Shift +5 · Ctrl +10",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x666688 }),
    });
    recruitHint.x = 12;
    recruitHint.y = y;
    this._contentContainer.addChild(recruitHint);
    y += 14;

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
      const units = getRecruitableUnits(city, this._state ?? undefined);
      for (const unitType of units.slice(0, 8)) {
        const unitDef = UNIT_DEFINITIONS[unitType as keyof typeof UNIT_DEFINITIONS];
        if (!unitDef) continue;
        const player = state.players.get(city.owner);
        const affordable = player ? Math.floor(player.gold / unitDef.cost) : 0;
        const label = `${unitType} (${unitDef.cost}g) [max ${affordable}]`;
        const btn = _makeButton(label, 16, y, PANEL_W - 32, 22, (e?: any) => {
          const count = e?.ctrlKey ? 10 : e?.shiftKey ? 5 : 1;
          this.onRecruit?.(city.id, unitType, count);
        });
        this._contentContainer.addChild(btn);
        y += 26;
      }
    }

    // --- Garrison section ---
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
        const icon = _makeUnitIcon(u.unitType, 22);
        if (icon) {
          icon.x = 14;
          icon.y = y;
          this._contentContainer.addChild(icon);
        }
        const gText = new Text({
          text: `${u.unitType} x${u.count}`,
          style: INFO_STYLE,
        });
        gText.x = icon ? 40 : 14;
        gText.y = y + 4;
        this._contentContainer.addChild(gText);
        y += 26;
      }

      y += 6;
      const createBtn = _makeButton(
        "CREATE ARMY",
        16,
        y,
        PANEL_W - 32,
        26,
        () => {
          this._armyCreationMode = true;
          this._selectedUnits.clear();
          this._rebuild();
        },
        0x223344,
        0x44aa66,
      );
      this._contentContainer.addChild(createBtn);
      y += 32;
    } else {
      const emptyText = new Text({ text: "  (empty)", style: INFO_STYLE });
      emptyText.x = 12;
      emptyText.y = y;
      this._contentContainer.addChild(emptyText);
      y += 16;
    }

    // --- Advisor buttons ---
    y += 10;
    const merlinBtn = _makeButton(
      "ASK MERLIN",
      16, y, (PANEL_W - 36) / 2, 24,
      () => { this.onAskAdvisor?.("merlin"); },
      0x1a1a3a, 0x4466aa,
    );
    this._contentContainer.addChild(merlinBtn);

    const queenBtn = _makeButton(
      "ASK QUEEN",
      20 + (PANEL_W - 36) / 2, y, (PANEL_W - 36) / 2, 24,
      () => { this.onAskAdvisor?.("queen"); },
      0x2a1a1a, 0xaa6644,
    );
    this._contentContainer.addChild(queenBtn);
    y += 30;

    return y;
  }

  // -----------------------------------------------------------------------
  // Army creation view
  // -----------------------------------------------------------------------

  private _buildArmyCreationView(city: WorldCity, state: WorldState, y: number): number {
    const garrison = city.garrisonArmyId
      ? state.armies.get(city.garrisonArmyId)
      : null;

    // Header
    const header = new Text({ text: "Create Army", style: SECTION_STYLE });
    header.x = 12;
    header.y = y;
    this._contentContainer.addChild(header);
    y += 20;

    const hint = new Text({
      text: "Shift +5 · Ctrl +10",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 9, fill: 0x666688 }),
    });
    hint.x = 12;
    hint.y = y;
    this._contentContainer.addChild(hint);
    y += 16;

    if (garrison && garrison.units.length > 0) {
      for (const u of garrison.units) {
        const selected = this._selectedUnits.get(u.unitType) ?? 0;

        // Unit icon
        const icon = _makeUnitIcon(u.unitType, 22);
        if (icon) {
          icon.x = 12;
          icon.y = y;
          this._contentContainer.addChild(icon);
        }

        // Unit label
        const label = new Text({
          text: `${u.unitType} x${u.count}`,
          style: INFO_STYLE,
        });
        label.x = icon ? 38 : 12;
        label.y = y + 3;
        this._contentContainer.addChild(label);

        // [-] button
        const minusBtn = _makeButton("-", PANEL_W - 120, y, 28, 22, (e?: any) => {
          const step = e?.ctrlKey ? 10 : e?.shiftKey ? 5 : 1;
          const cur = this._selectedUnits.get(u.unitType) ?? 0;
          this._selectedUnits.set(u.unitType, Math.max(0, cur - step));
          this._rebuild();
        });
        this._contentContainer.addChild(minusBtn);

        // Count display
        const countText = new Text({
          text: `${selected}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffcc44, fontWeight: "bold" }),
        });
        countText.x = PANEL_W - 82;
        countText.y = y + 4;
        this._contentContainer.addChild(countText);

        // [+] button
        const plusBtn = _makeButton("+", PANEL_W - 60, y, 28, 22, (e?: any) => {
          const step = e?.ctrlKey ? 10 : e?.shiftKey ? 5 : 1;
          const cur = this._selectedUnits.get(u.unitType) ?? 0;
          this._selectedUnits.set(u.unitType, Math.min(u.count, cur + step));
          this._rebuild();
        });
        this._contentContainer.addChild(plusBtn);

        y += 28;
      }
    }

    y += 10;

    // CREATE button (only when units selected)
    let totalSelected = 0;
    for (const v of this._selectedUnits.values()) totalSelected += v;

    if (totalSelected > 0) {
      const createBtn = _makeButton(
        `CREATE ARMY (${totalSelected} units)`,
        16,
        y,
        PANEL_W - 32,
        28,
        () => {
          const units = Array.from(this._selectedUnits.entries())
            .filter(([, count]) => count > 0)
            .map(([unitType, count]) => ({ unitType, count }));
          this.onCreateArmy?.(city.id, units);
          this._armyCreationMode = false;
          this._selectedUnits.clear();
        },
        0x224422,
        0x44aa44,
      );
      this._contentContainer.addChild(createBtn);
      y += 34;
    }

    // CANCEL button
    const cancelBtn = _makeButton(
      "CANCEL",
      16,
      y,
      PANEL_W - 32,
      24,
      () => {
        this._armyCreationMode = false;
        this._selectedUnits.clear();
        this._rebuild();
      },
      0x332222,
      0xaa4444,
    );
    this._contentContainer.addChild(cancelBtn);
    y += 30;

    return y;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function _makeUnitIcon(unitType: string, size: number): Sprite | null {
  try {
    const frames = animationManager.getFrames(unitType as UnitType, UnitState.IDLE);
    if (!frames || frames.length === 0) return null;
    const sprite = new Sprite(frames[0]);
    const scale = size / Math.max(sprite.width, sprite.height);
    sprite.scale.set(scale);
    return sprite;
  } catch {
    return null;
  }
}

function _makeButton(
  label: string,
  x: number,
  y: number,
  w: number,
  h: number,
  onClick: (e?: any) => void,
  fillColor = 0x222244,
  strokeColor = BORDER,
): Container {
  const btn = new Container();
  btn.eventMode = "static";
  btn.cursor = "pointer";

  const bg = new Graphics();
  bg.roundRect(0, 0, w, h, 4);
  bg.fill({ color: fillColor });
  bg.stroke({ color: strokeColor, width: 1 });
  btn.addChild(bg);

  const txt = new Text({ text: label, style: BTN_STYLE });
  txt.x = 6;
  txt.y = (h - txt.height) / 2;
  btn.addChild(txt);

  btn.position.set(x, y);
  btn.on("pointerdown", (e: any) => onClick(e));

  btn.on("pointerover", () => {
    bg.clear();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: 0x334466 });
    bg.stroke({ color: 0x6688aa, width: 1 });
  });
  btn.on("pointerout", () => {
    bg.clear();
    bg.roundRect(0, 0, w, h, 4);
    bg.fill({ color: fillColor });
    bg.stroke({ color: strokeColor, width: 1 });
  });

  return btn;
}

/** Singleton instance. */
export const cityPanel = new CityPanel();
