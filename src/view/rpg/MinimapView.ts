// Minimap overlay for overworld navigation — shows discovered tiles, entities, and party position
import { Container, Graphics } from "pixi.js";
import { OverworldTileType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { OverworldState } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

const MAP_SIZE = 140;
const MAP_MARGIN = 10;
const BORDER_COLOR = 0x333355;
const BG_COLOR = 0x0e0e1a;
const PARTY_COLOR = 0x44aaff;
const TOWN_COLOR = 0xffd700;
const DUNGEON_COLOR = 0xff4444;
const NPC_COLOR = 0x44ff88;
const FOG_COLOR = 0x111122;

const TILE_COLORS: Record<OverworldTileType, number> = {
  [OverworldTileType.GRASS]: 0x2d5a1e,
  [OverworldTileType.FOREST]: 0x1a3d12,
  [OverworldTileType.MOUNTAIN]: 0x555566,
  [OverworldTileType.WATER]: 0x1a3d6e,
  [OverworldTileType.PATH]: 0x8b7355,
  [OverworldTileType.SAND]: 0x9e8c5a,
  [OverworldTileType.SNOW]: 0xccccdd,
};

// ---------------------------------------------------------------------------
// MinimapView
// ---------------------------------------------------------------------------

export class MinimapView {
  private vm!: ViewManager;
  private overworld!: OverworldState;
  private rpg!: RPGState;
  private container = new Container();
  private _unsubs: Array<() => void> = [];

  init(vm: ViewManager, overworld: OverworldState, rpg: RPGState): void {
    this.vm = vm;
    this.overworld = overworld;
    this.rpg = rpg;

    vm.addToLayer("ui", this.container);
    this._draw();

    // Redraw when party moves
    this._unsubs.push(EventBus.on("rpgPartyMoved", () => this._draw()));
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];
    this.vm.removeFromLayer("ui", this.container);
    this.container.destroy({ children: true });
  }

  private _draw(): void {
    this.container.removeChildren();

    const x = MAP_MARGIN;
    const y = this.vm.screenHeight - MAP_SIZE - MAP_MARGIN;

    // Background
    const bg = new Graphics();
    bg.roundRect(x - 2, y - 2, MAP_SIZE + 4, MAP_SIZE + 4, 4);
    bg.fill({ color: BG_COLOR, alpha: 0.9 });
    bg.stroke({ color: BORDER_COLOR, width: 1 });
    this.container.addChild(bg);

    const mapG = new Graphics();

    const ow = this.overworld;
    const pixelPerTile = MAP_SIZE / Math.max(ow.width, ow.height);

    // Draw tiles
    for (let ty = 0; ty < ow.height; ty++) {
      for (let tx = 0; tx < ow.width; tx++) {
        const tile = ow.grid[ty]?.[tx];
        if (!tile) continue;

        const px = x + tx * pixelPerTile;
        const py = y + ty * pixelPerTile;
        const size = Math.max(1, Math.ceil(pixelPerTile));

        if (tile.discovered) {
          mapG.rect(px, py, size, size);
          mapG.fill({ color: TILE_COLORS[tile.type] ?? 0x333333 });
        } else {
          mapG.rect(px, py, size, size);
          mapG.fill({ color: FOG_COLOR });
        }
      }
    }

    this.container.addChild(mapG);

    // Draw entities on discovered tiles
    const entityG = new Graphics();
    for (const entity of ow.entities.values()) {
      const tile = ow.grid[entity.position.y]?.[entity.position.x];
      if (!tile?.discovered) continue;

      const ex = x + entity.position.x * pixelPerTile + pixelPerTile / 2;
      const ey = y + entity.position.y * pixelPerTile + pixelPerTile / 2;
      const r = Math.max(2, pixelPerTile * 0.6);

      switch (entity.type) {
        case "town":
          entityG.rect(ex - r, ey - r, r * 2, r * 2);
          entityG.fill({ color: TOWN_COLOR });
          break;
        case "dungeon_entrance":
          // Small triangle
          entityG.moveTo(ex, ey - r);
          entityG.lineTo(ex + r, ey + r);
          entityG.lineTo(ex - r, ey + r);
          entityG.closePath();
          entityG.fill({ color: DUNGEON_COLOR });
          break;
        case "npc":
          entityG.circle(ex, ey, r * 0.8);
          entityG.fill({ color: NPC_COLOR });
          break;
      }
    }
    this.container.addChild(entityG);

    // Draw party position
    const partyG = new Graphics();
    const px = x + this.rpg.overworldPosition.x * pixelPerTile + pixelPerTile / 2;
    const py = y + this.rpg.overworldPosition.y * pixelPerTile + pixelPerTile / 2;
    partyG.circle(px, py, Math.max(3, pixelPerTile));
    partyG.fill({ color: PARTY_COLOR });
    partyG.stroke({ color: 0xffffff, width: 1 });
    this.container.addChild(partyG);
  }
}
