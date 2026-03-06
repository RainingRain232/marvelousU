// Renders the overworld tile map, party sprite, entities, and fog of war
import { Container, Graphics, Text } from "pixi.js";
import { OverworldTileType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { OverworldState, OverworldEntity } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Tile colours
// ---------------------------------------------------------------------------

const TILE_COLORS: Record<string, number> = {
  [OverworldTileType.GRASS]: 0x4a8c3f,
  [OverworldTileType.FOREST]: 0x2d6b2d,
  [OverworldTileType.MOUNTAIN]: 0x7a7a7a,
  [OverworldTileType.WATER]: 0x3366aa,
  [OverworldTileType.PATH]: 0xc4a76c,
  [OverworldTileType.SAND]: 0xd4b86a,
  [OverworldTileType.SNOW]: 0xe8e8f0,
};

const ENTITY_COLORS: Record<string, number> = {
  town: 0xffcc00,
  dungeon_entrance: 0xaa3333,
  npc: 0x66aaff,
  chest: 0xffaa00,
  landmark: 0xcccccc,
};

const FOG_COLOR = 0x111122;
const FOG_ALPHA = 0.7;

// ---------------------------------------------------------------------------
// OverworldView
// ---------------------------------------------------------------------------

export class OverworldView {
  private vm!: ViewManager;
  private overworld!: OverworldState;
  rpg!: RPGState;

  private mapContainer = new Container();
  private entityContainer = new Container();
  private fogContainer = new Container();
  private partyGraphic = new Graphics();
  private entityLabels: Text[] = [];

  private _tileGraphics = new Graphics();
  private _fogGraphics = new Graphics();
  private _entityGraphics = new Graphics();

  private _unsubs: Array<() => void> = [];

  private TILE_SIZE = RPGBalance.OVERWORLD_TILE_SIZE;

  init(vm: ViewManager, overworld: OverworldState, rpg: RPGState): void {
    this.vm = vm;
    this.overworld = overworld;
    this.rpg = rpg;

    // Add containers to layers
    this.mapContainer.addChild(this._tileGraphics);
    vm.addToLayer("background", this.mapContainer);

    this.entityContainer.addChild(this._entityGraphics);
    vm.addToLayer("buildings", this.entityContainer);

    this.fogContainer.addChild(this._fogGraphics);
    vm.addToLayer("groundfx", this.fogContainer);

    vm.addToLayer("units", this.partyGraphic);

    // Set map size on camera
    vm.camera.setMapSize(overworld.width, overworld.height);

    // Initial render
    this._drawMap();
    this._drawEntities();
    this._drawFog();
    this._drawParty();
    this._centerCamera();

    // Listen for movement
    const unsub = EventBus.on("rpgPartyMoved", () => {
      this._drawFog();
      this._drawParty();
      this._centerCamera();
    });
    this._unsubs.push(unsub);
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    this.vm.removeFromLayer("background", this.mapContainer);
    this.vm.removeFromLayer("buildings", this.entityContainer);
    this.vm.removeFromLayer("groundfx", this.fogContainer);
    this.vm.removeFromLayer("units", this.partyGraphic);

    for (const label of this.entityLabels) label.destroy();
    this.entityLabels = [];

    this.mapContainer.destroy({ children: true });
    this.entityContainer.destroy({ children: true });
    this.fogContainer.destroy({ children: true });
    this.partyGraphic.destroy();
  }

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  private _drawMap(): void {
    const g = this._tileGraphics;
    g.clear();

    const ts = this.TILE_SIZE;
    for (let y = 0; y < this.overworld.height; y++) {
      for (let x = 0; x < this.overworld.width; x++) {
        const tile = this.overworld.grid[y][x];
        const color = TILE_COLORS[tile.type] ?? 0x333333;
        g.rect(x * ts, y * ts, ts, ts);
        g.fill({ color });
      }
    }
  }

  private _drawEntities(): void {
    const g = this._entityGraphics;
    g.clear();

    const ts = this.TILE_SIZE;
    const halfTs = ts / 2;

    for (const entity of this.overworld.entities.values()) {
      const tile = this.overworld.grid[entity.position.y]?.[entity.position.x];
      if (!tile?.discovered) continue;

      const color = ENTITY_COLORS[entity.type] ?? 0xffffff;
      const cx = entity.position.x * ts + halfTs;
      const cy = entity.position.y * ts + halfTs;

      this._drawEntityMarker(g, entity, cx, cy, halfTs * 0.6, color);

      // Label
      const label = new Text({
        text: entity.name,
        style: {
          fontFamily: "monospace",
          fontSize: 9,
          fill: 0xffffff,
          align: "center",
        },
      });
      label.anchor.set(0.5, 0);
      label.position.set(cx, cy + halfTs * 0.7);
      this.entityContainer.addChild(label);
      this.entityLabels.push(label);
    }
  }

  private _drawEntityMarker(
    g: Graphics,
    entity: OverworldEntity,
    cx: number,
    cy: number,
    radius: number,
    color: number,
  ): void {
    switch (entity.type) {
      case "town":
        // Square for towns
        g.rect(cx - radius, cy - radius, radius * 2, radius * 2);
        g.fill({ color });
        g.stroke({ color: 0xffffff, width: 1 });
        break;
      case "dungeon_entrance":
        // Triangle for dungeons
        g.moveTo(cx, cy - radius);
        g.lineTo(cx + radius, cy + radius);
        g.lineTo(cx - radius, cy + radius);
        g.closePath();
        g.fill({ color });
        g.stroke({ color: 0xff6666, width: 1 });
        break;
      default:
        // Circle for others
        g.circle(cx, cy, radius);
        g.fill({ color });
        break;
    }
  }

  private _drawFog(): void {
    const g = this._fogGraphics;
    g.clear();

    const ts = this.TILE_SIZE;
    for (let y = 0; y < this.overworld.height; y++) {
      for (let x = 0; x < this.overworld.width; x++) {
        const tile = this.overworld.grid[y][x];
        if (!tile.discovered) {
          g.rect(x * ts, y * ts, ts, ts);
          g.fill({ color: FOG_COLOR, alpha: FOG_ALPHA });
        }
      }
    }
  }

  private _drawParty(): void {
    const g = this.partyGraphic;
    g.clear();

    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2;

    // Draw party as a bright circle with direction indicator
    g.circle(px, py, ts * 0.35);
    g.fill({ color: 0x44aaff });
    g.stroke({ color: 0xffffff, width: 2 });

    // Small inner dot
    g.circle(px, py, ts * 0.12);
    g.fill({ color: 0xffffff });
  }

  private _centerCamera(): void {
    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2;

    // Center camera on party
    const visW = this.vm.screenWidth / this.vm.camera.zoom;
    const visH = this.vm.screenHeight / this.vm.camera.zoom;
    this.vm.camera.x = -px + visW / 2;
    this.vm.camera.y = -py + visH / 2;
  }
}
