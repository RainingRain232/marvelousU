// Renders city icons on the world hex map.
//
// Capital cities use the full CastleRenderer animation.
// Neutral/non-capital cities use the TownRenderer animation.
// Avalon (Morgaine's capital) uses a castle on a mountain background.
// All animated renderers are driven by a shared ticker.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldCity } from "@world/state/WorldCity";
import { hexToPixel, hexKey, hexCorners, type HexPixel } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { CastleRenderer } from "@view/entities/CastleRenderer";
import { TownRenderer } from "@view/entities/TownRenderer";
import { GamePhase } from "@/types";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = WorldBalance.HEX_SIZE;

// Castle is 4×4 tiles @ 64px = 256×256. Scale to fit inside hex.
// Hex width ≈ √3 × HEX_SIZE ≈ 332px. Hex height = 2 × HEX_SIZE = 384px.
// Leave some margin on sides: target ~256px → scale ≈ 1.0 (fits naturally).
const CASTLE_SCALE = (HEX_SIZE * 2 * 0.7) / 256; // ≈ 1.05 → clamp to 1.0
const TOWN_SCALE = (HEX_SIZE * 2 * 0.7) / 192;   // ≈ 1.4

const NAME_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: Math.round(HEX_SIZE * 0.14),
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 3 },
});

const POP_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: Math.round(HEX_SIZE * 0.12),
  fontWeight: "bold",
  fill: 0xffee88,
  stroke: { color: 0x000000, width: 3 },
});

// ---------------------------------------------------------------------------
// Tracked renderer instances for animation
// ---------------------------------------------------------------------------

interface CityEntry {
  container: Container;
  castle?: CastleRenderer;
  town?: TownRenderer;
  isAvalon?: boolean;
}

// ---------------------------------------------------------------------------
// CityView
// ---------------------------------------------------------------------------

export class CityView {
  private _container = new Container();
  private _entries = new Map<string, CityEntry>();
  private _vm: ViewManager | null = null;
  private _tickerCb: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.layers.background.addChild(this._container);

    // Drive castle/town animations
    const cb = () => {
      const dt = vm.app.ticker.deltaMS / 1000;
      for (const entry of this._entries.values()) {
        if (entry.castle) entry.castle.tick(dt, GamePhase.PREP);
        if (entry.town) entry.town.tick(dt, GamePhase.PREP);
      }
    };
    vm.app.ticker.add(cb);
    this._tickerCb = cb;
  }

  destroy(): void {
    if (this._tickerCb && this._vm) {
      this._vm.app.ticker.remove(this._tickerCb);
    }
    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._entries.clear();
  }

  /** Redraw all cities from scratch. Hides enemy cities in fog. */
  drawCities(state: WorldState, localPlayer?: WorldPlayer): void {
    this._container.removeChildren();
    this._entries.clear();

    for (const city of state.cities.values()) {
      // Hide enemy cities that haven't been explored
      if (localPlayer && city.owner !== localPlayer.id) {
        const key = hexKey(city.position.q, city.position.r);
        if (!localPlayer.exploredTiles.has(key)) continue;
      }
      const entry = this._createCityEntry(city);
      this._container.addChild(entry.container);
      this._entries.set(city.id, entry);
    }
  }

  /** Update a single city's visual. */
  updateCity(city: WorldCity): void {
    const existing = this._entries.get(city.id);
    if (existing) {
      existing.container.removeFromParent();
      existing.container.destroy({ children: true });
    }

    const entry = this._createCityEntry(city);
    this._container.addChild(entry.container);
    this._entries.set(city.id, entry);
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _createCityEntry(city: WorldCity): CityEntry {
    // Outer wrapper (unmasked) holds labels + masked content
    const wrapper = new Container();
    const center = hexToPixel(city.position, HEX_SIZE);

    const isMorgaine = city.owner === "morgaine";
    const isCapital = city.isCapital;
    const isAvalon = isMorgaine && isCapital;

    // Masked inner container for castle/town content
    const inner = new Container();
    const mask = new Graphics();
    const corners = hexCorners(center, HEX_SIZE - 2);
    mask.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      mask.lineTo(corners[i].x, corners[i].y);
    }
    mask.closePath();
    mask.fill({ color: 0xffffff });
    inner.addChild(mask);
    inner.mask = mask;
    wrapper.addChild(inner);

    const entry: CityEntry = { container: wrapper };

    if (isAvalon) {
      // Avalon: mountain background (masked) + castle (unmasked to allow overflow)
      this._drawMountainBackground(inner, center);
      const castle = new CastleRenderer("morgaine");
      castle.container.scale.set(CASTLE_SCALE);
      castle.container.position.set(
        center.x - 128 * CASTLE_SCALE,
        center.y - 128 * CASTLE_SCALE + HEX_SIZE * 0.15,
      );
      wrapper.addChild(castle.container);
      entry.castle = castle;
      entry.isAvalon = true;
    } else if (isCapital) {
      // Player capital: castle animation (unmasked to allow overflow)
      const castle = new CastleRenderer(city.owner);
      castle.container.scale.set(CASTLE_SCALE);
      castle.container.position.set(
        center.x - 128 * CASTLE_SCALE,
        center.y - 128 * CASTLE_SCALE + HEX_SIZE * 0.1,
      );
      wrapper.addChild(castle.container);
      entry.castle = castle;
    } else {
      // Non-capital city (neutral or player): town animation
      const town = new TownRenderer(city.owner);
      town.container.scale.set(TOWN_SCALE);
      town.container.position.set(
        center.x - 96 * TOWN_SCALE,
        center.y - 96 * TOWN_SCALE + HEX_SIZE * 0.1,
      );
      wrapper.addChild(town.container);
      entry.town = town;
    }

    // Labels go on the wrapper (unmasked) so they're always visible
    // City name label (below hex)
    const name = new Text({ text: city.name, style: NAME_STYLE });
    name.anchor.set(0.5, 0);
    name.position.set(center.x, center.y + HEX_SIZE * 0.85);
    wrapper.addChild(name);

    // Population badge (top-right)
    const pop = new Text({ text: `${city.population}`, style: POP_STYLE });
    pop.anchor.set(0.5, 0.5);
    pop.position.set(center.x + HEX_SIZE * 0.5, center.y - HEX_SIZE * 0.7);
    wrapper.addChild(pop);

    // Capital star
    if (isCapital && !isAvalon) {
      const star = new Graphics();
      star.star(center.x, center.y - HEX_SIZE * 0.85, 4, 6, 3);
      star.fill({ color: 0xffdd44 });
      star.stroke({ color: 0xaa8800, width: 1 });
      wrapper.addChild(star);
    }

    // Avalon special marker
    if (isAvalon) {
      const star = new Graphics();
      star.star(center.x, center.y - HEX_SIZE * 0.85, 6, 8, 4);
      star.fill({ color: 0xcc44ff });
      star.stroke({ color: 0x6622aa, width: 1 });
      wrapper.addChild(star);
    }

    return entry;
  }

  /** Draw mountain background for Avalon */
  private _drawMountainBackground(c: Container, center: HexPixel): void {
    const g = new Graphics();
    const s = HEX_SIZE;

    // Dark mountain base fill
    const corners = hexCorners(center, HEX_SIZE - 2);
    g.moveTo(corners[0].x, corners[0].y);
    for (let i = 1; i < corners.length; i++) {
      g.lineTo(corners[i].x, corners[i].y);
    }
    g.closePath();
    g.fill({ color: 0x444455 });

    // Back mountain (left)
    g.moveTo(center.x - s * 0.7, center.y + s * 0.6);
    g.lineTo(center.x - s * 0.3, center.y - s * 0.5);
    g.lineTo(center.x + s * 0.1, center.y + s * 0.6);
    g.closePath();
    g.fill({ color: 0x555566, alpha: 0.8 });
    // Snow cap
    g.moveTo(center.x - s * 0.4, center.y - s * 0.2);
    g.lineTo(center.x - s * 0.3, center.y - s * 0.5);
    g.lineTo(center.x - s * 0.2, center.y - s * 0.2);
    g.closePath();
    g.fill({ color: 0xccccdd, alpha: 0.6 });

    // Back mountain (right)
    g.moveTo(center.x + s * 0.1, center.y + s * 0.6);
    g.lineTo(center.x + s * 0.5, center.y - s * 0.4);
    g.lineTo(center.x + s * 0.8, center.y + s * 0.6);
    g.closePath();
    g.fill({ color: 0x5a5a6a, alpha: 0.7 });
    g.moveTo(center.x + s * 0.35, center.y - s * 0.15);
    g.lineTo(center.x + s * 0.5, center.y - s * 0.4);
    g.lineTo(center.x + s * 0.6, center.y - s * 0.15);
    g.closePath();
    g.fill({ color: 0xccccdd, alpha: 0.5 });

    // Main mountain (center, behind castle)
    g.moveTo(center.x - s * 0.5, center.y + s * 0.7);
    g.lineTo(center.x, center.y - s * 0.7);
    g.lineTo(center.x + s * 0.5, center.y + s * 0.7);
    g.closePath();
    g.fill({ color: 0x666677, alpha: 0.8 });
    // Left shadow
    g.moveTo(center.x - s * 0.5, center.y + s * 0.7);
    g.lineTo(center.x, center.y - s * 0.7);
    g.lineTo(center.x - s * 0.15, center.y + s * 0.7);
    g.closePath();
    g.fill({ color: 0x444455, alpha: 0.3 });
    // Snow cap
    g.moveTo(center.x - s * 0.15, center.y - s * 0.35);
    g.lineTo(center.x, center.y - s * 0.7);
    g.lineTo(center.x + s * 0.15, center.y - s * 0.35);
    g.closePath();
    g.fill({ color: 0xddddee, alpha: 0.7 });

    // Rock textures
    for (let i = 0; i < 6; i++) {
      const ry = center.y + s * (-0.1 + i * 0.1);
      const spread = s * (0.1 + i * 0.05);
      g.moveTo(center.x - spread, ry);
      g.lineTo(center.x - spread + s * 0.05, ry - s * 0.03);
      g.stroke({ color: 0x555555, width: 1, alpha: 0.3 });
    }

    // Purple magical glow at base (Morgaine's magic)
    g.ellipse(center.x, center.y + s * 0.3, s * 0.5, s * 0.2);
    g.fill({ color: 0x8844cc, alpha: 0.15 });
    g.ellipse(center.x, center.y + s * 0.3, s * 0.3, s * 0.1);
    g.fill({ color: 0xaa66ee, alpha: 0.1 });

    c.addChild(g);
  }
}

/** Singleton instance. */
export const cityView = new CityView();
