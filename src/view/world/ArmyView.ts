// Renders army icons on the world hex map.
//
// Each non-garrison army is drawn as a shield icon with unit count badge.
// Color matches the owning player.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
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

const COUNT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9,
  fontWeight: "bold",
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 },
});

// ---------------------------------------------------------------------------
// ArmyView
// ---------------------------------------------------------------------------

export class ArmyView {
  private _container = new Container();
  private _armySprites = new Map<string, Container>();

  init(vm: ViewManager): void {
    vm.layers.background.addChild(this._container);
  }

  destroy(): void {
    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._armySprites.clear();
  }

  /** Redraw all armies from scratch. Hides enemy armies in fog. */
  drawArmies(state: WorldState, localPlayer?: WorldPlayer): void {
    this._container.removeChildren();
    this._armySprites.clear();

    for (const army of state.armies.values()) {
      if (army.isGarrison) continue;
      // Hide enemy armies not in the local player's visible tiles
      if (localPlayer && army.owner !== localPlayer.id) {
        const key = hexKey(army.position.q, army.position.r);
        if (!localPlayer.visibleTiles.has(key)) continue;
      }
      const sprite = this._createArmySprite(army);
      this._container.addChild(sprite);
      this._armySprites.set(army.id, sprite);
    }
  }

  /** Update a single army's visual. */
  updateArmy(army: WorldArmy): void {
    const existing = this._armySprites.get(army.id);
    if (existing) {
      existing.removeFromParent();
      existing.destroy({ children: true });
    }

    if (army.isGarrison) {
      this._armySprites.delete(army.id);
      return;
    }

    const sprite = this._createArmySprite(army);
    this._container.addChild(sprite);
    this._armySprites.set(army.id, sprite);
  }

  /** Remove a destroyed army. */
  removeArmy(armyId: string): void {
    const existing = this._armySprites.get(armyId);
    if (existing) {
      existing.removeFromParent();
      existing.destroy({ children: true });
      this._armySprites.delete(armyId);
    }
  }

  // -----------------------------------------------------------------------
  // Private
  // -----------------------------------------------------------------------

  private _createArmySprite(army: WorldArmy): Container {
    const c = new Container();
    const center = hexToPixel(army.position, HEX_SIZE);

    const playerIndex = parseInt(army.owner.replace("p", "")) - 1;
    const color = PLAYER_COLORS[playerIndex] ?? 0xffffff;

    // Shield shape
    const shield = new Graphics();
    shield.moveTo(0, -10);
    shield.lineTo(8, -6);
    shield.lineTo(8, 4);
    shield.lineTo(0, 10);
    shield.lineTo(-8, 4);
    shield.lineTo(-8, -6);
    shield.closePath();
    shield.fill({ color });
    shield.stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
    c.addChild(shield);

    // Sword icon (simple line)
    const sword = new Graphics();
    sword.moveTo(0, -6);
    sword.lineTo(0, 6);
    sword.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
    sword.moveTo(-3, -4);
    sword.lineTo(3, -4);
    sword.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
    c.addChild(sword);

    // Unit count badge
    const total = armyUnitCount(army);
    const countText = new Text({ text: `${total}`, style: COUNT_STYLE });
    countText.anchor.set(0.5, 0.5);
    countText.x = 10;
    countText.y = -8;
    c.addChild(countText);

    // Offset slightly from city center if on same hex as a city
    c.position.set(center.x + 14, center.y - 8);
    return c;
  }
}

/** Singleton instance. */
export const armyView = new ArmyView();
