// Renders army icons on the world hex map.
//
// Each non-garrison army is drawn as a shield icon with unit count badge.
// Color matches the owning player. Shows dominant unit type icon.
// Supports movement animation (lerp from old to new position).

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
import { hexToPixel, hexKey } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { TerrainType } from "@world/config/TerrainDefs";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = WorldBalance.HEX_SIZE;
const ANIM_DURATION = 0.25; // seconds for movement lerp
const OFFSET_X = 14;
const OFFSET_Y = -8;

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
// Animation state
// ---------------------------------------------------------------------------

interface ArmyAnim {
  sprite: Container;
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  elapsed: number;
  duration: number;
}

// ---------------------------------------------------------------------------
// ArmyView
// ---------------------------------------------------------------------------

export class ArmyView {
  private _container = new Container();
  private _armySprites = new Map<string, Container>();
  private _anims: ArmyAnim[] = [];
  private _vm: ViewManager | null = null;
  private _tickerCb: (() => void) | null = null;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.layers.background.addChild(this._container);

    // Animation ticker
    const cb = () => {
      const dt = vm.app.ticker.deltaMS / 1000;
      this._updateAnims(dt);
    };
    vm.app.ticker.add(cb);
    this._tickerCb = cb;
  }

  destroy(): void {
    if (this._vm && this._tickerCb) {
      this._vm.app.ticker.remove(this._tickerCb);
    }
    this._container.removeFromParent();
    this._container.destroy({ children: true });
    this._armySprites.clear();
    this._anims = [];
  }

  /** Redraw all armies from scratch. Hides enemy armies in fog. */
  drawArmies(state: WorldState, localPlayer?: WorldPlayer): void {
    this._container.removeChildren();
    this._armySprites.clear();
    this._anims = [];

    for (const army of state.armies.values()) {
      if (army.isGarrison) continue;
      // Hide enemy armies not in the local player's visible tiles
      if (localPlayer && army.owner !== localPlayer.id) {
        const key = hexKey(army.position.q, army.position.r);
        if (!localPlayer.visibleTiles.has(key)) continue;
      }
      const tile = state.grid.getTile(army.position.q, army.position.r);
      const isEmbarked = tile?.terrain === TerrainType.WATER;
      const sprite = this._createArmySprite(army, isEmbarked);
      this._container.addChild(sprite);
      this._armySprites.set(army.id, sprite);
    }
  }

  /** Animate an army moving from one position to another. */
  animateMove(army: WorldArmy, fromQ: number, fromR: number): void {
    const existing = this._armySprites.get(army.id);
    if (!existing) return;

    const from = hexToPixel({ q: fromQ, r: fromR }, HEX_SIZE);
    const to = hexToPixel(army.position, HEX_SIZE);

    this._anims.push({
      sprite: existing,
      fromX: from.x + OFFSET_X,
      fromY: from.y + OFFSET_Y,
      toX: to.x + OFFSET_X,
      toY: to.y + OFFSET_Y,
      elapsed: 0,
      duration: ANIM_DURATION,
    });

    // Start at from position
    existing.position.set(from.x + OFFSET_X, from.y + OFFSET_Y);
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
  // Private — animation
  // -----------------------------------------------------------------------

  private _updateAnims(dt: number): void {
    for (let i = this._anims.length - 1; i >= 0; i--) {
      const a = this._anims[i];
      a.elapsed += dt;
      const t = Math.min(1, a.elapsed / a.duration);
      // Ease out quad
      const ease = 1 - (1 - t) * (1 - t);
      a.sprite.position.set(
        a.fromX + (a.toX - a.fromX) * ease,
        a.fromY + (a.toY - a.fromY) * ease,
      );
      if (t >= 1) {
        this._anims.splice(i, 1);
      }
    }
  }

  // -----------------------------------------------------------------------
  // Private — sprite creation
  // -----------------------------------------------------------------------

  private _createArmySprite(army: WorldArmy, isEmbarked = false): Container {
    const c = new Container();
    const center = hexToPixel(army.position, HEX_SIZE);

    const playerIndex = parseInt(army.owner.replace("p", "")) - 1;
    const color = army.owner === "morgaine" ? 0x8844cc : (PLAYER_COLORS[playerIndex] ?? 0xffffff);

    // Boat hull when embarked on water
    if (isEmbarked) {
      const boat = new Graphics();
      boat.ellipse(0, 6, 12, 5);
      boat.fill({ color: 0x8B4513, alpha: 0.85 });
      boat.stroke({ color: 0x5C2D0A, width: 1 });
      c.addChild(boat);
    }

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

    // Icon based on dominant unit type
    const icon = new Graphics();
    const dominant = _getDominantType(army);
    _drawUnitIcon(icon, dominant);
    c.addChild(icon);

    // Unit count badge
    const total = armyUnitCount(army);
    const countText = new Text({ text: `${total}`, style: COUNT_STYLE });
    countText.anchor.set(0.5, 0.5);
    countText.x = 10;
    countText.y = -8;
    c.addChild(countText);

    c.position.set(center.x + OFFSET_X, center.y + OFFSET_Y);
    return c;
  }
}

// ---------------------------------------------------------------------------
// Unit type icon helpers
// ---------------------------------------------------------------------------

type UnitCategory = "melee" | "ranged" | "cavalry" | "magic" | "settler" | "mixed";

function _getDominantType(army: WorldArmy): UnitCategory {
  let melee = 0, ranged = 0, cavalry = 0, magic = 0, settler = 0;
  for (const u of army.units) {
    const t = u.unitType;
    if (t === "settler") { settler += u.count; continue; }
    if (t.includes("archer") || t.includes("crossbow") || t.includes("horse_archer")) ranged += u.count;
    else if (t.includes("cavalry") || t.includes("knight") || t.includes("horse")) cavalry += u.count;
    else if (t.includes("mage") || t.includes("wizard") || t.includes("national_mage")) magic += u.count;
    else melee += u.count;
  }
  if (settler > 0 && melee + ranged + cavalry + magic === 0) return "settler";
  const max = Math.max(melee, ranged, cavalry, magic);
  if (max === 0) return "mixed";
  if (max === cavalry) return "cavalry";
  if (max === ranged) return "ranged";
  if (max === magic) return "magic";
  return "melee";
}

function _drawUnitIcon(g: Graphics, category: UnitCategory): void {
  switch (category) {
    case "melee":
      // Sword
      g.moveTo(0, -6);
      g.lineTo(0, 6);
      g.stroke({ color: 0xffffff, width: 2, alpha: 0.8 });
      g.moveTo(-3, -4);
      g.lineTo(3, -4);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
      break;
    case "ranged":
      // Bow
      g.moveTo(-3, -6);
      g.bezierCurveTo(-5, 0, -3, 6, -1, 6);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
      // Arrow
      g.moveTo(-1, 0);
      g.lineTo(5, 0);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
      // Arrowhead
      g.moveTo(3, -2);
      g.lineTo(5, 0);
      g.lineTo(3, 2);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.7 });
      break;
    case "cavalry":
      // Horse head silhouette (simplified)
      g.moveTo(-4, 4);
      g.lineTo(-2, -1);
      g.lineTo(0, -4);
      g.lineTo(3, -5);
      g.lineTo(4, -3);
      g.lineTo(2, -1);
      g.lineTo(3, 3);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.8 });
      break;
    case "magic":
      // Star / sparkle
      g.star(0, 0, 5, 5, 2.5);
      g.fill({ color: 0xffffff, alpha: 0.7 });
      break;
    case "settler":
      // Cart / wagon
      g.rect(-4, -2, 8, 4);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
      g.circle(-2, 3, 2);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
      g.circle(2, 3, 2);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.6 });
      break;
    case "mixed":
    default:
      // Cross
      g.moveTo(0, -5);
      g.lineTo(0, 5);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
      g.moveTo(-5, 0);
      g.lineTo(5, 0);
      g.stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 });
      break;
  }
}

/** Singleton instance. */
export const armyView = new ArmyView();
