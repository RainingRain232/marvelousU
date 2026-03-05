// National overview screen — shows all owned cities and what they are producing.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
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

const IDLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 11,
  fill: 0x888888,
  fontStyle: "italic",
});

// ---------------------------------------------------------------------------
// WorldNationalScreen
// ---------------------------------------------------------------------------

export class WorldNationalScreen {
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
    const title = new Text({ text: "CITIES", style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 20;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Gather player cities
    const cities: WorldCity[] = [];
    for (const city of state.cities.values()) {
      if (city.owner === "p1") cities.push(city);
    }

    if (cities.length === 0) {
      const noCity = new Text({ text: "No cities.", style: CELL_STYLE });
      noCity.x = (sw - noCity.width) / 2;
      noCity.y = 80;
      this._content.addChild(noCity);
      this.container.addChild(this._content);
      return;
    }

    // Table columns
    const columns = ["City", "Pop", "Food", "Buildings", "Constructing", "Recruiting", "Garrison"];
    const colWidths = [120, 50, 60, 160, 160, 160, 80];
    const rowH = 28;
    const totalW = colWidths.reduce((a, b) => a + b, 0);
    const tableX = Math.max(20, (sw - totalW) / 2);
    const tableY = 60;

    // Header
    let hx = tableX;
    for (let c = 0; c < columns.length; c++) {
      const h = new Text({ text: columns[c], style: HEADER_STYLE });
      h.x = hx;
      h.y = tableY;
      this._content.addChild(h);
      hx += colWidths[c];
    }

    // Divider
    const div = new Graphics();
    div.rect(tableX, tableY + 18, totalW, 1);
    div.fill({ color: 0x555577 });
    this._content.addChild(div);

    // Rows
    for (let r = 0; r < cities.length; r++) {
      const city = cities[r];
      const y = tableY + 26 + r * rowH;

      // Garrison count
      let garrisonCount = 0;
      if (city.garrisonArmyId) {
        const g = state.armies.get(city.garrisonArmyId);
        if (g) garrisonCount = armyUnitCount(g);
      }

      // Construction status
      let constructing = "Idle";
      let constructStyle = IDLE_STYLE;
      if (city.constructionQueue) {
        const q = city.constructionQueue;
        const pct = Math.floor((q.invested / q.cost) * 100);
        constructing = `${q.buildingType} (${pct}%)`;
        constructStyle = CELL_STYLE;
      }

      // Recruiting status
      let recruiting = "None";
      let recruitStyle = IDLE_STYLE;
      if (city.recruitmentQueue.length > 0) {
        const parts = city.recruitmentQueue.map(
          (e) => `${e.count}x ${_formatUnit(e.unitType)} (${e.turnsLeft}t)`,
        );
        recruiting = parts.join(", ");
        recruitStyle = CELL_STYLE;
      }

      const buildingNames = city.buildings.map((b) => _formatUnit(b.type)).join(", ") || "None";

      const values = [
        { text: `${city.name}${city.isCapital ? " *" : ""}`, style: CELL_STYLE },
        { text: `${city.population}`, style: CELL_STYLE },
        { text: `${city.foodStockpile}`, style: CELL_STYLE },
        { text: buildingNames, style: CELL_STYLE },
        { text: constructing, style: constructStyle },
        { text: recruiting, style: recruitStyle },
        { text: `${garrisonCount}`, style: CELL_STYLE },
      ];

      let cx = tableX;
      for (let c = 0; c < values.length; c++) {
        const t = new Text({ text: values[c].text, style: values[c].style });
        t.x = cx;
        t.y = y;
        // Clip text if it exceeds column width
        if (t.width > colWidths[c] - 8) {
          t.style.wordWrap = true;
          t.style.wordWrapWidth = colWidths[c] - 8;
        }
        this._content.addChild(t);
        cx += colWidths[c];
      }

      // Row separator
      const sep = new Graphics();
      sep.rect(tableX, y + 20, totalW, 1);
      sep.fill({ color: 0x333344, alpha: 0.4 });
      this._content.addChild(sep);
    }

    this.container.addChild(this._content);
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

export const worldNationalScreen = new WorldNationalScreen();
