// Renders city icons on the world hex map.
//
// Each city is drawn as a small castle icon with a population label and
// owner-colored circle. Cities are drawn in a container above the hex grid.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { hexToPixel, hexKey } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";
import type { WorldPlayer } from "@world/state/WorldPlayer";

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

  /** Redraw all cities from scratch. Hides enemy cities in fog. */
  drawCities(state: WorldState, localPlayer?: WorldPlayer): void {
    this._container.removeChildren();
    this._citySprites.clear();

    for (const city of state.cities.values()) {
      // Hide enemy cities that haven't been explored
      if (localPlayer && city.owner !== localPlayer.id) {
        const key = hexKey(city.position.q, city.position.r);
        if (!localPlayer.exploredTiles.has(key)) continue;
      }
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
    const color = city.owner === "morgaine" ? 0x8844cc : (PLAYER_COLORS[playerIndex] ?? 0xffffff);

    const bg = new Graphics();
    bg.circle(0, 0, 14);
    bg.fill({ color, alpha: 0.6 });
    bg.stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
    c.addChild(bg);

    // Detailed mini-castle (inspired by CastleRenderer)
    const icon = new Graphics();

    // -- Stone palette --
    const COL_STONE = 0x8b8878;
    const COL_STONE_LT = 0xa09d8f;
    const COL_STONE_DK = 0x6b6860;
    const COL_ROOF = 0x5a2d2d;
    const COL_ROOF_DK = 0x3d1515;
    const COL_WINDOW = 0x1a1a2e;
    const COL_WINDOW_GLOW = 0x334466;

    // -- Main wall --
    icon.rect(-8, -1, 16, 8);
    icon.fill({ color: COL_STONE });
    icon.stroke({ color: COL_STONE_DK, width: 0.5 });
    // Wall brick pattern (horizontal mortar lines)
    for (let row = 0; row < 8; row += 3) {
      icon.moveTo(-8, -1 + row).lineTo(8, -1 + row);
      icon.stroke({ color: 0x9a9688, width: 0.3, alpha: 0.4 });
    }
    // Stone variation patches
    icon.rect(-5, 0, 3, 2).fill({ color: COL_STONE_LT, alpha: 0.25 });
    icon.rect(3, 3, 3, 2).fill({ color: COL_STONE_DK, alpha: 0.2 });

    // -- Left tower --
    icon.rect(-10, -9, 6, 16);
    icon.fill({ color: COL_STONE_LT });
    icon.stroke({ color: COL_STONE_DK, width: 0.5 });
    // Tower shadow (left edge)
    icon.rect(-9.5, -8.5, 1.5, 15).fill({ color: COL_STONE_DK, alpha: 0.15 });
    // Tower brick lines
    for (let row = 0; row < 15; row += 3) {
      icon.moveTo(-10, -9 + row).lineTo(-4, -9 + row);
      icon.stroke({ color: 0x9a9688, width: 0.3, alpha: 0.35 });
    }
    // Tower roof (pointed)
    icon.moveTo(-11, -9).lineTo(-7, -15).lineTo(-3, -9).closePath();
    icon.fill({ color: COL_ROOF });
    icon.stroke({ color: COL_ROOF_DK, width: 0.5 });
    // Roof highlight
    icon.moveTo(-7, -15).lineTo(-3, -9).lineTo(-6.5, -14.5).closePath();
    icon.fill({ color: 0x6e3838, alpha: 0.3 });
    // Finial
    icon.circle(-7, -15, 1).fill({ color: 0xccaa44 });
    // Tower window
    icon.rect(-8.5, -6, 3, 4).fill({ color: COL_WINDOW });
    icon.rect(-8, -5.5, 2, 1.5).fill({ color: COL_WINDOW_GLOW, alpha: 0.3 });
    // Window mullion
    icon.moveTo(-7, -6).lineTo(-7, -2);
    icon.stroke({ color: 0x555555, width: 0.5 });
    // Crenellations on tower
    for (let mx = -10; mx < -4; mx += 3) {
      icon.rect(mx, -10.5, 2, 1.5).fill({ color: COL_STONE_LT });
      icon.rect(mx - 0.2, -11, 2.4, 0.8).fill({ color: COL_STONE_DK });
    }

    // -- Right tower --
    icon.rect(4, -9, 6, 16);
    icon.fill({ color: COL_STONE_LT });
    icon.stroke({ color: COL_STONE_DK, width: 0.5 });
    // Tower shadow
    icon.rect(4.5, -8.5, 1.5, 15).fill({ color: COL_STONE_DK, alpha: 0.15 });
    // Tower brick lines
    for (let row = 0; row < 15; row += 3) {
      icon.moveTo(4, -9 + row).lineTo(10, -9 + row);
      icon.stroke({ color: 0x9a9688, width: 0.3, alpha: 0.35 });
    }
    // Tower roof
    icon.moveTo(3, -9).lineTo(7, -15).lineTo(11, -9).closePath();
    icon.fill({ color: COL_ROOF });
    icon.stroke({ color: COL_ROOF_DK, width: 0.5 });
    icon.moveTo(7, -15).lineTo(11, -9).lineTo(7.5, -14.5).closePath();
    icon.fill({ color: 0x6e3838, alpha: 0.3 });
    icon.circle(7, -15, 1).fill({ color: 0xccaa44 });
    // Tower window
    icon.rect(5.5, -6, 3, 4).fill({ color: COL_WINDOW });
    icon.rect(6, -5.5, 2, 1.5).fill({ color: COL_WINDOW_GLOW, alpha: 0.3 });
    icon.moveTo(7, -6).lineTo(7, -2);
    icon.stroke({ color: 0x555555, width: 0.5 });
    // Crenellations on tower
    for (let mx = 4; mx < 10; mx += 3) {
      icon.rect(mx, -10.5, 2, 1.5).fill({ color: COL_STONE_LT });
      icon.rect(mx - 0.2, -11, 2.4, 0.8).fill({ color: COL_STONE_DK });
    }

    // -- Gate (center) --
    icon.rect(-2, 1, 4, 6).fill({ color: 0x3d2510 });
    // Portcullis lines
    for (let gy = 2; gy < 7; gy += 2) {
      icon.moveTo(-1.5, gy).lineTo(1.5, gy);
      icon.stroke({ color: 0x444444, width: 0.5, alpha: 0.6 });
    }
    icon.moveTo(0, 1).lineTo(0, 7);
    icon.stroke({ color: 0x444444, width: 0.5, alpha: 0.6 });
    // Gate arch
    icon.ellipse(0, 1.5, 2, 1.5).fill({ color: COL_STONE_DK });
    icon.ellipse(0, 1.5, 1.5, 1).fill({ color: 0x3d2510 });

    // -- Wall crenellations (center section) --
    for (let mx = -3; mx <= 2; mx += 2.5) {
      icon.rect(mx, -2.5, 1.5, 1.5).fill({ color: COL_STONE_LT });
      icon.rect(mx - 0.2, -3, 1.9, 0.8).fill({ color: COL_STONE_DK });
    }

    // -- Moss patches at base --
    icon.ellipse(-6, 6.5, 3, 1).fill({ color: 0x4a6b3a, alpha: 0.35 });
    icon.ellipse(6, 6, 2.5, 0.8).fill({ color: 0x4a6b3a, alpha: 0.3 });

    // -- Player-colored flag on left tower --
    icon.moveTo(-7, -15).lineTo(-7, -18);
    icon.stroke({ color: 0x555555, width: 0.5 });
    icon.moveTo(-7, -18).lineTo(-4, -17).lineTo(-7, -16).closePath();
    icon.fill({ color, alpha: 0.9 });

    c.addChild(icon);

    // City name
    const name = new Text({ text: city.name, style: NAME_STYLE });
    name.anchor.set(0.5, 0);
    name.y = 10;
    c.addChild(name);

    // Population badge
    const pop = new Text({ text: `${city.population}`, style: POP_STYLE });
    pop.anchor.set(0.5, 0.5);
    pop.x = 16;
    pop.y = -14;
    c.addChild(pop);

    // Capital star
    if (city.isCapital) {
      const star = new Graphics();
      star.star(0, -20, 4, 3, 2);
      star.fill({ color: 0xffdd44 });
      star.stroke({ color: 0xaa8800, width: 0.5 });
      c.addChild(star);
    }

    c.position.set(center.x, center.y);
    return c;
  }
}

/** Singleton instance. */
export const cityView = new CityView();
