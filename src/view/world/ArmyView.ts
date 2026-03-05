// Renders army icons on the world hex map.
//
// Each non-garrison army is drawn as a shield icon with unit count badge,
// plus a preview sprite of the most numerous unit type.
// Color matches the owning player. Includes a pulsing glow effect.
// Supports movement animation (lerp from old to new position).

import { Container, Graphics, Text, TextStyle, Sprite } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldArmy } from "@world/state/WorldArmy";
import { armyUnitCount } from "@world/state/WorldArmy";
import { hexToPixel, hexKey } from "@world/hex/HexCoord";
import { WorldBalance } from "@world/config/WorldConfig";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { TerrainType } from "@world/config/TerrainDefs";
import { UnitType, UnitState } from "@/types";
import { animationManager } from "@view/animation/AnimationManager";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HEX_SIZE = WorldBalance.HEX_SIZE;
const ANIM_DURATION = 0.25; // seconds for movement lerp
const OFFSET_X = HEX_SIZE * 0.35;
const OFFSET_Y = HEX_SIZE * -0.2;

const PLAYER_COLORS: number[] = [
  0x4466cc, // p1 blue
  0xcc4444, // p2 red
  0x44aa44, // p3 green
  0xccaa22, // p4 yellow
];

const ICON_SCALE = HEX_SIZE / 32; // Scale all icon elements relative to old hex size

const COUNT_STYLE = new TextStyle({
  fontFamily: "monospace",
  fontSize: 9 * ICON_SCALE,
  fontWeight: "bold",
  fill: 0xffffff,
  stroke: { color: 0x000000, width: 2 * ICON_SCALE },
});

// Glow pulse settings
const GLOW_PERIOD = 3.0; // seconds for one full pulse cycle
const GLOW_MIN_ALPHA = 0.0;
const GLOW_MAX_ALPHA = 0.5;

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

interface GlowEntry {
  glow: Graphics;
  phase: number; // radians, randomised per army for variety
}

// ---------------------------------------------------------------------------
// ArmyView
// ---------------------------------------------------------------------------

export class ArmyView {
  private _container = new Container();
  private _armySprites = new Map<string, Container>();
  private _anims: ArmyAnim[] = [];
  private _glows = new Map<string, GlowEntry>();
  private _vm: ViewManager | null = null;
  private _tickerCb: (() => void) | null = null;
  private _elapsed = 0;

  init(vm: ViewManager): void {
    this._vm = vm;
    vm.layers.background.addChild(this._container);

    const cb = () => {
      const dt = vm.app.ticker.deltaMS / 1000;
      this._elapsed += dt;
      this._updateAnims(dt);
      this._updateGlows();
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
    this._glows.clear();
    this._anims = [];
  }

  /** Redraw all armies from scratch. Hides enemy armies in fog. */
  drawArmies(state: WorldState, localPlayer?: WorldPlayer): void {
    this._container.removeChildren();
    this._armySprites.clear();
    this._glows.clear();
    this._anims = [];

    for (const army of state.armies.values()) {
      if (army.isGarrison) continue;
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

    existing.position.set(from.x + OFFSET_X, from.y + OFFSET_Y);
  }

  /** Update a single army's visual. */
  updateArmy(army: WorldArmy): void {
    const existing = this._armySprites.get(army.id);
    if (existing) {
      existing.removeFromParent();
      existing.destroy({ children: true });
    }
    this._glows.delete(army.id);

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
    this._glows.delete(armyId);
  }

  // -----------------------------------------------------------------------
  // Private — animation
  // -----------------------------------------------------------------------

  private _updateAnims(dt: number): void {
    for (let i = this._anims.length - 1; i >= 0; i--) {
      const a = this._anims[i];
      a.elapsed += dt;
      const t = Math.min(1, a.elapsed / a.duration);
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

  private _updateGlows(): void {
    for (const entry of this._glows.values()) {
      const wave = Math.sin(this._elapsed * (2 * Math.PI / GLOW_PERIOD) + entry.phase);
      const alpha = GLOW_MIN_ALPHA + (GLOW_MAX_ALPHA - GLOW_MIN_ALPHA) * (wave * 0.5 + 0.5);
      entry.glow.alpha = alpha;
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

    const sc = ICON_SCALE;

    // Boat hull when embarked on water
    if (isEmbarked) {
      const boat = new Graphics();
      boat.ellipse(0, 6 * sc, 12 * sc, 5 * sc);
      boat.fill({ color: 0x8B4513, alpha: 0.85 });
      boat.stroke({ color: 0x5C2D0A, width: sc });
      c.addChild(boat);
    }

    // Glow effect — drawn behind everything, pulses over time
    const glow = new Graphics();
    glow.circle(0, 0, 16 * sc);
    glow.fill({ color, alpha: 0.4 });
    glow.circle(0, 0, 12 * sc);
    glow.fill({ color: 0xffffff, alpha: 0.15 });
    glow.alpha = 0;
    c.addChild(glow);
    this._glows.set(army.id, { glow, phase: Math.random() * Math.PI * 2 });

    // Shield shape — improved with gradient-like layering
    const shieldShadow = new Graphics();
    shieldShadow.moveTo(1 * sc, -9 * sc);
    shieldShadow.lineTo(9 * sc, -5 * sc);
    shieldShadow.lineTo(9 * sc, 5 * sc);
    shieldShadow.lineTo(1 * sc, 11 * sc);
    shieldShadow.lineTo(-7 * sc, 5 * sc);
    shieldShadow.lineTo(-7 * sc, -5 * sc);
    shieldShadow.closePath();
    shieldShadow.fill({ color: 0x000000, alpha: 0.35 });
    c.addChild(shieldShadow);

    const shield = new Graphics();
    shield.moveTo(0, -10 * sc);
    shield.lineTo(8 * sc, -6 * sc);
    shield.lineTo(8 * sc, 4 * sc);
    shield.lineTo(0, 10 * sc);
    shield.lineTo(-8 * sc, 4 * sc);
    shield.lineTo(-8 * sc, -6 * sc);
    shield.closePath();
    shield.fill({ color });
    shield.stroke({ color: 0xffffff, width: 1.5 * sc, alpha: 0.8 });
    c.addChild(shield);

    // Inner highlight for depth
    const highlight = new Graphics();
    highlight.moveTo(0, -7 * sc);
    highlight.lineTo(5 * sc, -4 * sc);
    highlight.lineTo(5 * sc, 2 * sc);
    highlight.lineTo(0, 6 * sc);
    highlight.lineTo(-5 * sc, 2 * sc);
    highlight.lineTo(-5 * sc, -4 * sc);
    highlight.closePath();
    highlight.fill({ color: 0xffffff, alpha: 0.12 });
    c.addChild(highlight);

    // Unit preview sprite — show the most numerous unit type
    const dominantUnit = _getMostNumerousUnit(army);
    if (dominantUnit) {
      try {
        const frames = animationManager.getFrames(dominantUnit as UnitType, UnitState.IDLE);
        if (frames && frames.length > 0) {
          const preview = new Sprite(frames[0]);
          const iconSize = 20 * sc;
          const scale = iconSize / Math.max(preview.width, preview.height);
          preview.scale.set(scale);
          preview.anchor.set(0.5, 0.5);
          preview.x = -14 * sc;
          preview.y = -2 * sc;
          c.addChild(preview);
        }
      } catch {
        // No sprite available, skip preview
      }
    }

    // Unit count badge with background
    const total = armyUnitCount(army);
    const badgeBg = new Graphics();
    badgeBg.circle(10 * sc, -8 * sc, 7 * sc);
    badgeBg.fill({ color: 0x000000, alpha: 0.6 });
    badgeBg.circle(10 * sc, -8 * sc, 6 * sc);
    badgeBg.fill({ color });
    badgeBg.stroke({ color: 0xffffff, width: sc, alpha: 0.8 });
    c.addChild(badgeBg);

    const countText = new Text({ text: `${total}`, style: COUNT_STYLE });
    countText.anchor.set(0.5, 0.5);
    countText.x = 10 * sc;
    countText.y = -8 * sc;
    c.addChild(countText);

    c.position.set(center.x + OFFSET_X, center.y + OFFSET_Y);
    return c;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Returns the unitType string with the highest count in the army. */
function _getMostNumerousUnit(army: WorldArmy): string | null {
  let best: string | null = null;
  let bestCount = 0;
  for (const u of army.units) {
    if (u.count > bestCount) {
      bestCount = u.count;
      best = u.unitType;
    }
  }
  return best;
}

/** Singleton instance. */
export const armyView = new ArmyView();
