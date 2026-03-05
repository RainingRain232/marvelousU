// Hex hover tooltip for world mode.
//
// Shows terrain info, yields, owner, city/army names when hovering over a hex.

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import type { ViewManager } from "@view/ViewManager";
import type { WorldState } from "@world/state/WorldState";
import type { WorldPlayer } from "@world/state/WorldPlayer";
import { hexKey, type HexCoord } from "@world/hex/HexCoord";
import { TERRAIN_DEFINITIONS } from "@world/config/TerrainDefs";
import { RESOURCE_DEFINITIONS, IMPROVEMENT_DEFINITIONS } from "@world/config/ResourceDefs";
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

  private _state: WorldState | null = null;
  private _localPlayer: WorldPlayer | null = null;
  private _bg = new Graphics();
  private _textContainer = new Container();

  // -----------------------------------------------------------------------
  // Lifecycle
  // -----------------------------------------------------------------------

  init(vm: ViewManager): void {
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

  setState(state: WorldState, localPlayer?: WorldPlayer): void {
    this._state = state;
    this._localPlayer = localPlayer ?? null;
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

    // Hide tooltip for unexplored tiles
    if (this._localPlayer) {
      const key = hexKey(hex.q, hex.r);
      if (!this._localPlayer.exploredTiles.has(key)) {
        this.container.visible = false;
        return;
      }
    }

    this._textContainer.removeChildren();

    const terrain = TERRAIN_DEFINITIONS[tile.terrain];
    let y = 6;

    // Terrain name
    const terrainName = terrain.type.charAt(0).toUpperCase() + terrain.type.slice(1);
    const name = new Text({
      text: terrainName,
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

    // Resource
    if (tile.resource) {
      const resDef = RESOURCE_DEFINITIONS[tile.resource];
      if (resDef) {
        const resText = new Text({
          text: `Resource: ${resDef.label}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: resDef.color }),
        });
        resText.x = 8;
        resText.y = y;
        this._textContainer.addChild(resText);
        y += 14;
      }
    }

    // Improvement
    if (tile.improvement) {
      const impDef = IMPROVEMENT_DEFINITIONS[tile.improvement];
      if (impDef) {
        const impText = new Text({
          text: `Improved: ${impDef.label}`,
          style: new TextStyle({ fontFamily: "monospace", fontSize: 10, fill: 0x88cc44 }),
        });
        impText.x = 8;
        impText.y = y;
        this._textContainer.addChild(impText);
        y += 14;
      }
    }

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

    // Check if currently visible (not just explored) for dynamic info
    const isCurrentlyVisible = !this._localPlayer ||
      this._localPlayer.visibleTiles.has(hexKey(hex.q, hex.r));

    // City
    if (tile.cityId) {
      const city = this._state.cities.get(tile.cityId);
      if (city && isCurrentlyVisible) {
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

    // Army — show full composition for scouting
    if (tile.armyId && isCurrentlyVisible) {
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

        // Show composition breakdown
        for (const stack of army.units) {
          const unitName = stack.unitType.replace(/_/g, " ");
          const hpInfo = stack.hpPerUnit < 100 ? ` (${stack.hpPerUnit}hp)` : "";
          const compText = new Text({
            text: `  ${stack.count}x ${unitName}${hpInfo}`,
            style: new TextStyle({
              fontFamily: "monospace",
              fontSize: 9,
              fill: 0x88bbdd,
            }),
          });
          compText.x = 8;
          compText.y = y;
          this._textContainer.addChild(compText);
          y += 12;
        }
      }
    }

    // Camp
    if (tile.campId && isCurrentlyVisible) {
      const camp = this._state.camps.get(tile.campId);
      if (camp && !camp.cleared) {
        const tierLabel = camp.tier === 1 ? "Weak" : camp.tier === 2 ? "Moderate" : "Strong";
        const campText = new Text({
          text: `Camp: ${tierLabel} (Tier ${camp.tier})`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: 0xff8844,
          }),
        });
        campText.x = 8;
        campText.y = y;
        this._textContainer.addChild(campText);
        y += 14;
      }
    }

    // Neutral building
    if (tile.neutralBuildingId && isCurrentlyVisible) {
      const nb = this._state.neutralBuildings.get(tile.neutralBuildingId);
      if (nb) {
        const NB_LABELS: Record<string, string> = { farm: "Farm", mill: "Mill", tower: "Tower", mage_tower: "Mage Tower", blacksmith: "Blacksmith", market: "Market", temple: "Temple", embassy: "Embassy", faction_hall: "Faction Hall", stables: "Stables", barracks: "Barracks", elite_barracks: "Elite Barracks", elite_stables: "Elite Stables", elite_hall: "Elite Hall" };
        const typeLabel = NB_LABELS[nb.type] ?? nb.type;
        const ownerLabel = nb.captured ? (nb.owner === "p1" ? " (Yours)" : ` (${nb.owner})`) : " (Neutral)";
        const incomeLabel = (nb.type === "mage_tower" || nb.type === "temple")
          ? `+${nb.manaIncome} mana/turn`
          : `+${nb.goldIncome} gold/turn`;
        const nbText = new Text({
          text: `${typeLabel}${ownerLabel} ${incomeLabel}`,
          style: new TextStyle({
            fontFamily: "monospace",
            fontSize: 10,
            fill: nb.captured ? 0x44cc44 : 0xffaa44,
          }),
        });
        nbText.x = 8;
        nbText.y = y;
        this._textContainer.addChild(nbText);
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
