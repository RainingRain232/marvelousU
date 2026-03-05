// Score overview screen — compares all players' resources, cities, units, etc.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
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
  fontSize: 12,
  fontWeight: "bold",
  fill: 0xaaaacc,
});

const CELL_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fill: 0xffffff,
});

const PLAYER_COLORS: number[] = [0x4488ff, 0xff4444, 0x44cc44, 0xffaa22];

// ---------------------------------------------------------------------------
// WorldScoreScreen
// ---------------------------------------------------------------------------

export class WorldScoreScreen {
  readonly container = new Container();
  private _vm!: ViewManager;
  private _content = new Container();

  onClose: (() => void) | null = null;

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
    const title = new Text({ text: "SCORE", style: TITLE_STYLE });
    title.x = (sw - title.width) / 2;
    title.y = 20;
    this._content.addChild(title);

    // Close button
    this._content.addChild(this._makeClose(sw - 40, 10));

    // Gather stats per player
    const players = state.playerOrder
      .map((pid) => state.players.get(pid)!)
      .filter((p) => p);

    const stats = players.map((p) => this._gatherStats(state, p));

    // Table layout
    const columns = ["Player", "Gold", "Food", "Cities", "Territory", "Units", "Armies", "Research"];
    const colW = 110;
    const rowH = 32;
    const tableX = Math.max(30, (sw - colW * columns.length) / 2);
    const tableY = 70;

    // Header row
    for (let c = 0; c < columns.length; c++) {
      const h = new Text({ text: columns[c], style: HEADER_STYLE });
      h.x = tableX + c * colW;
      h.y = tableY;
      this._content.addChild(h);
    }

    // Divider
    const divider = new Graphics();
    divider.rect(tableX, tableY + 22, colW * columns.length, 1);
    divider.fill({ color: 0x555577 });
    this._content.addChild(divider);

    // Player rows
    for (let r = 0; r < players.length; r++) {
      const p = players[r];
      const s = stats[r];
      const y = tableY + 30 + r * rowH;
      const color = PLAYER_COLORS[r % PLAYER_COLORS.length];

      const nameStyle = new TextStyle({
        fontFamily: "monospace",
        fontSize: 12,
        fontWeight: "bold",
        fill: color,
      });

      const label = p.isAI ? `${p.id} (AI)` : `${p.id} (You)`;
      const alive = p.isAlive ? "" : " [DEAD]";
      const values = [
        label + alive,
        `${s.gold}`,
        `${s.food}`,
        `${s.cities}`,
        `${s.territory}`,
        `${s.totalUnits}`,
        `${s.armies}`,
        `${s.completedResearch}`,
      ];

      for (let c = 0; c < values.length; c++) {
        const t = new Text({
          text: values[c],
          style: c === 0 ? nameStyle : CELL_STYLE,
        });
        t.x = tableX + c * colW;
        t.y = y;
        this._content.addChild(t);
      }

      // Row separator
      const sep = new Graphics();
      sep.rect(tableX, y + 24, colW * columns.length, 1);
      sep.fill({ color: 0x333344, alpha: 0.5 });
      this._content.addChild(sep);
    }

    this.container.addChild(this._content);
  }

  private _gatherStats(state: WorldState, player: WorldPlayer) {
    let cities = 0;
    let territory = 0;
    for (const city of state.cities.values()) {
      if (city.owner === player.id) {
        cities++;
        territory += city.territory.length;
      }
    }

    let totalUnits = 0;
    let armies = 0;
    for (const army of state.armies.values()) {
      if (army.owner === player.id) {
        totalUnits += armyUnitCount(army);
        if (!army.isGarrison) armies++;
      }
    }

    return {
      gold: player.gold,
      food: player.food,
      cities,
      territory,
      totalUnits,
      armies,
      completedResearch: player.completedResearch.size,
    };
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

export const worldScoreScreen = new WorldScoreScreen();
