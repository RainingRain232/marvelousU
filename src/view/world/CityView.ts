// Renders city icons on the world hex map.
//
// Each city is drawn as a small castle icon with a population label and
// owner-colored circle. Cities are drawn in a container above the hex grid.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { hexToPixel, type HexPixel } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = WorldBalance.HEX_SIZE;

const PLAYER_COLORS: number[] = [
  0x4466cc, // p1 blue
  0xcc4444, // p2 red
  0x44aa44, // p3 green
  0xccaa22, // p4 yellow
];

const NAME_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
});

const POP_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 8,
  fontWeight: "bold",
  fill: 0xffee88,
  stroke: { color: 0x000000, width: 2 },
});

// ---------------------------------------------------------------------------
// CityView
// ---------------------------------------------------------------------------

export class CityView {
  private _container = new Container();
  private _citySprites = new Map<string, Container>();

  init(vm: ViewManager): void {
    vm.layers.background.addChild(this._container);
  }

  destroy(): void {
    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._citySprites.clear();
  }

  /** Redraw all cities from scratch. */
  drawCities(state: WorldState): void {
    this._container.removeChildren();
    this._citySprites.clear();

    for (const city of state.cities.values()) {
      const sprite = this._createCitySprite(city);
      this._container.addChild(sprite);
      this._citySprites.set(city.id, sprite);
    }
  }

  /** Update a single city's visual. */
  updateCity(city: WorldCity): void {
    const existing = this._citySprites.get(city.id);
    if (existing) {
      existing.removeFromParent();
      existing.destroy({ children: true });
    }

    const sprite = this._createCitySprite(city);
    this._container.addChild(sprite);
    this._citySprites.set(city.id, sprite);
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _createCitySprite(city: WorldCity): Container {
    const c = new Container();
    const center = hexToPixel(city.position, HEX_SIZE);

    // Owner-colored background circle
    const playerIndex = parseInt(city.owner.replace("p", "")) - 1;
    const color = PLAYER_COLORS[playerIndex] ?? 0xffffff;

    const bg = new Graphics();
    bg.circle(0, 0, 12);
    bg.fill({ color, alpha: 0.8 });
    bg.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
    c.addChild(bg);

    // Castle icon (simple tower shape)
    const icon = new Graphics();
    // Base
    icon.rect(-6, -2, 12, 8);
    icon.fill({ color: 0xddccaa });
    // Tower left
    icon.rect(-7, -8, 4, 6);
    icon.fill({ color: 0xccbb99 });
    // Tower right
    icon.rect(3, -8, 4, 6);
    icon.fill({ color: 0xccbb99 });
    // Crenellations
    icon.rect(-7, -10, 2, 2);
    icon.fill({ color: 0xbbaa88 });
    icon.rect(-3, -10, 2, 2);
    icon.fill({ color: 0xbbaa88 });
    icon.rect(3, -10, 2, 2);
    icon.fill({ color: 0xbbaa88 });
    icon.rect(5, -10, 2, 2);
    icon.fill({ color: 0xbbaa88 });
    c.addChild(icon);

    // City name
    const name = new Text({ text: city.name, style: NAME_STYLE });
    name.anchor.set(0.5, 0);
    name.y = 10;
    c.addChild(name);

    // Population badge
    const pop = new Text({ text: `${city.population}`, style: POP_STYLE });
    pop.anchor.set(0.5, 0.5);
    pop.x = 14;
    pop.y = -10;
    c.addChild(pop);

    // Capital star
    if (city.isCapital) {
      const star = new Graphics();
      star.star(0, -14, 4, 3, 2);
      star.fill({ color: 0xffdd44 });
      c.addChild(star);
    }

    c.position.set(center.x, center.y);
    return c;
  }
}

/** Singleton instance. */
export const cityView = new CityView();
