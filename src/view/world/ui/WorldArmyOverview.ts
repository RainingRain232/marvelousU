// Army overview screen — shows all player armies and their unit composition.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 20,
  fontWeight: "bold",
  fill: 0xffcc44,
});

const HEADER_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fontWeight: "bold",
  fill: 0xaaaacc,
});

const CELL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0xffffff,
});

const GARRISON_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x88aacc,
});

// ---------------------------------------------------------------------------
// WorldArmyOverview
// ---------------------------------------------------------------------------

export class WorldArmyOverview {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.addToLayer("ui", this.container);
    this.container.visible = false;
  }

  show(state: WorldState): void {
    this.container.visible = true;
    this._rebuild(state);
  }

  hide(): void {
    this.container.visible = false;
  }

  get isVisible(): boolean {
    return this.container.visible;
  }

  // -----------------------------------------------------------------------
  // Build
  // -----------------------------------------------------------------------

  private _rebuild(state: WorldState): void {
    this._content.removeFromParent();
    this._content.destroy({ children: true });
    this._content = new Container();

    const sw = this._vm.screenWidth;
    const sh = this._vm.screenHeight;

    // Backdrop
    const bg = new Graphics();
    bg.rect(0, 0, sw, sh);
    bg.fill({ color: 0x000000, alpha: 0.85 });
    bg.eventMode = "static";
    this._content.addChild(bg);

    // Title
    const title = new Text({ text: "ARMIES", style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 20;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Gather player armies
    const fieldArmies: WorldArmy[] = [];
    const garrisons: WorldArmy[] = [];
    for (const army of state.armies.values()) {
      if (army.owner === "p1") {
        if (army.isGarrison) garrisons.push(army);
        else fieldArmies.push(army);
      }
    }

    // Table layout
    const columns = ["Army", "Position", "Units", "Composition", "Movement"];
    const colWidths = [80, 90, 60, 340, 100];
    const rowH = 28;
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const tableX = Math.max(20, (sw - totalW) / 2);
    let tableY = 60;

    // --- Field Armies section ---
    const fieldLabel = new Text({
      text: `FIELD ARMIES (${fieldArmies.length})`,
      style: HEADER_STYLE,
    });
    fieldLabel.x = tableX;
    fieldLabel.y = tableY;
    this._content.addChild(fieldLabel);
    tableY += 22;

    // Header
    let hx = tableX;
    for (let c = 0; c < columns.length; c++) {
      const h = new Text({ text: columns[c], style: HEADER_STYLE });
      h.x = hx;
      h.y = tableY;
      this._content.addChild(h);
      hx += colWidths[c];
    }

    const div = new Graphics();
    div.rect(tableX, tableY + 16, totalW, 1);
    div.fill({ color: 0x555577 });
    this._content.addChild(div);
    tableY += 22;

    if (fieldArmies.length === 0) {
      const none = new Text({ text: "No field armies.", style: CELL_STYLE });
      none.x = tableX;
      none.y = tableY;
      this._content.addChild(none);
      tableY += rowH;
    }

    for (const army of fieldArmies) {
      this._drawArmyRow(army, tableX, tableY, colWidths, CELL_STYLE);
      tableY += rowH;
    }

    // --- Garrisons section ---
    tableY += 12;
    const garLabel = new Text({
      text: `GARRISONS (${garrisons.length})`,
      style: HEADER_STYLE,
    });
    garLabel.x = tableX;
    garLabel.y = tableY;
    this._content.addChild(garLabel);
    tableY += 22;

    // Header
    hx = tableX;
    const garColumns = ["City", "Position", "Units", "Composition", ""];
    for (let c = 0; c < garColumns.length; c++) {
      if (!garColumns[c]) continue;
      const h = new Text({ text: garColumns[c], style: HEADER_STYLE });
      h.x = hx;
      h.y = tableY;
      this._content.addChild(h);
      hx += colWidths[c];
    }

    const div2 = new Graphics();
    div2.rect(tableX, tableY + 16, totalW, 1);
    div2.fill({ color: 0x555577 });
    this._content.addChild(div2);
    tableY += 22;

    if (garrisons.length === 0) {
      const none = new Text({ text: "No garrisons.", style: GARRISON_STYLE });
      none.x = tableX;
      none.y = tableY;
      this._content.addChild(none);
      tableY += rowH;
    }

    for (const army of garrisons) {
      // Find which city this garrison belongs to
      let cityName = "Unknown";
      for (const city of state.cities.values()) {
        if (city.garrisonArmyId === army.id) {
          cityName = city.name;
          break;
        }
      }
      this._drawGarrisonRow(army, cityName, tableX, tableY, colWidths);
      tableY += rowH;
    }

    // Totals
    tableY += 12;
    let totalUnits = 0;
    for (const army of state.armies.values()) {
      if (army.owner === "p1") totalUnits += armyUnitCount(army);
    }
    const totalText = new Text({
      text: `Total units: ${totalUnits}  |  Field armies: ${fieldArmies.length}  |  Garrisons: ${garrisons.length}`,
      style: HEADER_STYLE,
    });
    totalText.x = tableX;
    totalText.y = tableY;
    this._content.addChild(totalText);

    this.container.addChild(this._content);
  }

  private _drawArmyRow(army: WorldArmy, x: number, y: number, colWidths: number[], style: TextStyle): void {
    const count = armyUnitCount(army);
    const comp = army.units.map((u) => `${u.count}x ${_formatUnit(u.unitType)}`).join(", ");
    const move = `${army.movementPoints}/${army.maxMovementPoints}`;

    const values = [army.name, `(${army.position.q}, ${army.position.r})`, `${count}`, comp, move];

    let cx = x;
    for (let c = 0; c < values.length; c++) {
      const t = new Text({ text: values[c], style });
      t.x = cx;
      t.y = y;
      this._content.addChild(t);
      cx += colWidths[c];
    }

    const sep = new Graphics();
    sep.rect(x, y + 20, colWidths.reduce((a, b) => a + b, 0), 1);
    sep.fill({ color: 0x333344, alpha: 0.4 });
    this._content.addChild(sep);
  }

  private _drawGarrisonRow(army: WorldArmy, cityName: string, x: number, y: number, colWidths: number[]): void {
    const count = armyUnitCount(army);
    const comp = army.units.map((u) => `${u.count}x ${_formatUnit(u.unitType)}`).join(", ");

    const values = [cityName, `(${army.position.q}, ${army.position.r})`, `${count}`, comp];

    let cx = x;
    for (let c = 0; c < values.length; c++) {
      const t = new Text({ text: values[c], style: GARRISON_STYLE });
      t.x = cx;
      t.y = y;
      this._content.addChild(t);
      cx += colWidths[c];
    }

    const sep = new Graphics();
    sep.rect(x, y + 20, colWidths.reduce((a, b) => a + b, 0), 1);
    sep.fill({ color: 0x333344, alpha: 0.4 });
    this._content.addChild(sep);
  }

  private _makeClose(x: number, y: number): Container {
    const btn = new Container();
    btn.eventMode = "static";
    btn.cursor = "pointer";

    const bg = new Graphics();
    bg.roundRect(0, 0, 24, 24, 4);
    bg.fill({ color: 0x333344 });
    bg.stroke({ color: 0x555577, width: 1 });
    btn.addChild(bg);

    const txt = new Text({
      text: "X",
      style: new TextStyle({ fontFamily: "monospace", fontSize: 14, fontWeight: "bold", fill: 0xff6666 }),
    });
    txt.anchor.set(0.5, 0.5);
    txt.position.set(12, 12);
    btn.addChild(txt);

    btn.position.set(x, y);
    btn.on("pointerdown", () => this.hide());
    return btn;
  }
}

function _formatUnit(s: string): string {
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export const worldArmyOverview = new WorldArmyOverview();
