// Hex hover tooltip for world mode.
//
// Shows terrain info, yields, owner, city/army names when hovering over a hex.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { HexCoord } from "@world/hex/HexCoord";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { armyUnitCount } from "@world/state/WorldArmy";

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const TITLE_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 12,
  fontWeight: "bold",
  fill: 0xffffff,
});

const INFO_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 10,
  fill: 0xaaaaaa,
});

const TOOLTIP_W = 160;

// ---------------------------------------------------------------------------
// WorldHexTooltip
// ---------------------------------------------------------------------------

export class WorldHexTooltip {
  readonly container = new Container();

  private _vm!: ViewManager;
  private _state: WorldState | null = null;
  private _bg = new Graphics();
  private _textContainer = new Container();

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
    this._vm = vm;
    this.container.addChild(this._bg);
    this.container.addChild(this._textContainer);
    this.container.visible = false;

    vm.addToLayer("ui", this.container);

    // Track mouse for positioning
    const canvas = vm.app.canvas as HTMLCanvasElement;
    canvas.addEventListener("pointermove", (e: PointerEvent) => {
      if (this.container.visible) {
        let x = e.clientX + 16;
        let y = e.clientY + 16;
        // Keep on screen
        if (x + TOOLTIP_W > vm.screenWidth) x = e.clientX - TOOLTIP_W - 8;
        if (y + 100 > vm.screenHeight) y = e.clientY - 100;
        this.container.x = x;
        this.container.y = y;
      }
    });
  }

  setState(state: WorldState): void {
    this._state = state;
  }

  /** Show tooltip for the given hex, or hide if null. */
  showForHex(hex: HexCoord | null): void {
    if (!hex || !this._state) {
      this.container.visible = false;
      return;
    }

    const tile = this._state.grid.getTile(hex.q, hex.r);
    if (!tile) {
      this.container.visible = false;
      return;
    }

    this._textContainer.removeChildren();

    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    let y = 6;

    // Terrain name
    const name = new Text({
      text: terrain.name,
      style: TITLE_STYLE,
    });
    name.x = 8;
    name.y = y;
    this._textContainer.addChild(name);
    y += 18;

    // Yields
    const yields = `G:${terrain.goldYield} F:${terrain.foodYield} P:${terrain.productionYield}`;
    const yieldsText = new Text({ text: yields, style: INFO_STYLE });
    yieldsText.x = 8;
    yieldsText.y = y;
    this._textContainer.addChild(yieldsText);
    y += 14;

    // Movement cost
    const moveCost = isFinite(terrain.movementCost)
      ? `Move: ${terrain.movementCost}`
      : "Impassable";
    const moveText = new Text({ text: moveCost, style: INFO_STYLE });
    moveText.x = 8;
    moveText.y = y;
    this._textContainer.addChild(moveText);
    y += 14;

    // Owner
    if (tile.owner) {
      const ownerText = new Text({
        text: `Owner: ${tile.owner}`,
        style: INFO_STYLE,
      });
      ownerText.x = 8;
      ownerText.y = y;
      this._textContainer.addChild(ownerText);
      y += 14;
    }

    // City
    if (tile.cityId) {
      const city = this._state.cities.get(tile.cityId);
      if (city) {
        const cityText = new Text({
          text: `City: ${city.name} (pop ${city.population})`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0xffcc44,
          }),
        });
        cityText.x = 8;
        cityText.y = y;
        this._textContainer.addChild(cityText);
        y += 14;
      }
    }

    // Army
    if (tile.armyId) {
      const army = this._state.armies.get(tile.armyId);
      if (army && !army.isGarrison) {
        const total = armyUnitCount(army);
        const armyText = new Text({
          text: `Army: ${total} units (${army.owner})`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0x44aaff,
          }),
        });
        armyText.x = 8;
        armyText.y = y;
        this._textContainer.addChild(armyText);
        y += 14;
      }
    }

    // Draw background
    this._bg.clear();
    this._bg.roundRect(0, 0, TOOLTIP_W, y + 6, 4);
    this._bg.fill({ color: 0x0a0a20, alpha: 0.92 });
    this._bg.stroke({ color: 0x555577, width: 1 });

    this.container.visible = true;
  }

  destroy(): void {
    this.container.removeFromParent();
    this.container.destroy({ children: true });
  }
}

/** Singleton instance. */
export const worldHexTooltip = new WorldHexTooltip();
