// Renders dungeon floors with fog of war and party token
import { Container, Graphics, Text } from "pixi.js";
import { DungeonTileType } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { DungeonState, DungeonFloor } from "@rpg/state/DungeonState";
import type { RPGState } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";

// ---------------------------------------------------------------------------
// Tile colours
// ---------------------------------------------------------------------------

const DUNGEON_COLORS: Record<string, number> = {
  [DungeonTileType.WALL]: 0x222233,
  [DungeonTileType.FLOOR]: 0x555566,
  [DungeonTileType.DOOR]: 0x886644,
  [DungeonTileType.STAIRS_DOWN]: 0x338833,
  [DungeonTileType.STAIRS_UP]: 0x3388aa,
  [DungeonTileType.CHEST]: 0xddaa33,
  [DungeonTileType.TRAP]: 0xaa3333,
};

// ---------------------------------------------------------------------------
// DungeonView
// ---------------------------------------------------------------------------

export class DungeonView {
  private vm!: ViewManager;
  private dungeon!: DungeonState;
  _rpg!: RPGState;

  private mapContainer = new Container();
  private partyGraphic = new Graphics();
  private fogContainer = new Container();
  private uiContainer = new Container();

  private _tileGraphics = new Graphics();
  private _fogGraphics = new Graphics();
  private _floorLabel!: Text;

  private _unsubs: Array<() => void> = [];
  private TILE_SIZE = RPGBalance.DUNGEON_TILE_SIZE;

  init(vm: ViewManager, dungeon: DungeonState, rpg: RPGState): void {
    this.vm = vm;
    this.dungeon = dungeon;
    this._rpg = rpg;

    this.mapContainer.addChild(this._tileGraphics);
    vm.addToLayer("background", this.mapContainer);

    this.fogContainer.addChild(this._fogGraphics);
    vm.addToLayer("groundfx", this.fogContainer);

    vm.addToLayer("units", this.partyGraphic);

    this._floorLabel = new Text({
      text: `Floor ${dungeon.currentFloor + 1}`,
      style: { fontFamily: "monospace", fontSize: 14, fill: 0xffffff },
    });
    this._floorLabel.position.set(10, 10);
    this.uiContainer.addChild(this._floorLabel);
    vm.addToLayer("ui", this.uiContainer);

    // Set camera for dungeon
    const floor = this._currentFloor();
    if (floor) {
      vm.camera.setMapSize(floor.width, floor.height);
    }

    this._drawFloor();
    this._drawFog();
    this._drawParty();
    this._centerCamera();

    // Listen for movement and floor changes
    this._unsubs.push(EventBus.on("rpgPartyMoved", () => {
      this._updateVisibility();
      this._drawFog();
      this._drawParty();
      this._centerCamera();
    }));

    this._unsubs.push(EventBus.on("rpgDungeonFloorChanged", (e) => {
      this._floorLabel.text = `Floor ${e.floor + 1}`;
      this._drawFloor();
      this._drawFog();
      this._drawParty();
      this._centerCamera();
    }));
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    this.vm.removeFromLayer("background", this.mapContainer);
    this.vm.removeFromLayer("groundfx", this.fogContainer);
    this.vm.removeFromLayer("units", this.partyGraphic);
    this.vm.removeFromLayer("ui", this.uiContainer);

    this.mapContainer.destroy({ children: true });
    this.fogContainer.destroy({ children: true });
    this.partyGraphic.destroy();
    this.uiContainer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Drawing
  // ---------------------------------------------------------------------------

  private _currentFloor(): DungeonFloor | null {
    return this.dungeon.floors[this.dungeon.currentFloor] ?? null;
  }

  private _drawFloor(): void {
    const g = this._tileGraphics;
    g.clear();

    const floor = this._currentFloor();
    if (!floor) return;

    const ts = this.TILE_SIZE;
    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const tile = floor.grid[y][x];
        if (!tile.revealed && !tile.visible) continue;

        const color = DUNGEON_COLORS[tile.type] ?? 0x333333;
        const alpha = tile.visible ? 1.0 : 0.5;
        g.rect(x * ts, y * ts, ts, ts);
        g.fill({ color, alpha });

        // Grid lines
        g.rect(x * ts, y * ts, ts, ts);
        g.stroke({ color: 0x333344, width: 0.5 });
      }
    }
  }

  private _drawFog(): void {
    const g = this._fogGraphics;
    g.clear();

    const floor = this._currentFloor();
    if (!floor) return;

    const ts = this.TILE_SIZE;
    for (let y = 0; y < floor.height; y++) {
      for (let x = 0; x < floor.width; x++) {
        const tile = floor.grid[y][x];
        if (!tile.revealed && !tile.visible) {
          g.rect(x * ts, y * ts, ts, ts);
          g.fill({ color: 0x000000, alpha: 0.95 });
        } else if (tile.revealed && !tile.visible) {
          g.rect(x * ts, y * ts, ts, ts);
          g.fill({ color: 0x000000, alpha: 0.5 });
        }
      }
    }
  }

  private _drawParty(): void {
    const g = this.partyGraphic;
    g.clear();

    const ts = this.TILE_SIZE;
    const px = this.dungeon.partyPosition.x * ts + ts / 2;
    const py = this.dungeon.partyPosition.y * ts + ts / 2;

    g.circle(px, py, ts * 0.35);
    g.fill({ color: 0x44aaff });
    g.stroke({ color: 0xffffff, width: 2 });

    g.circle(px, py, ts * 0.12);
    g.fill({ color: 0xffffff });
  }

  private _centerCamera(): void {
    const ts = this.TILE_SIZE;
    const px = this.dungeon.partyPosition.x * ts + ts / 2;
    const py = this.dungeon.partyPosition.y * ts + ts / 2;

    const visW = this.vm.screenWidth / this.vm.camera.zoom;
    const visH = this.vm.screenHeight / this.vm.camera.zoom;
    this.vm.camera.x = -px + visW / 2;
    this.vm.camera.y = -py + visH / 2;
  }

  private _updateVisibility(): void {
    const floor = this._currentFloor();
    if (!floor) return;

    const pos = this.dungeon.partyPosition;
    const radius = RPGBalance.DUNGEON_SIGHT_RADIUS;

    // Clear all visibility
    for (const row of floor.grid) {
      for (const tile of row) {
        tile.visible = false;
      }
    }

    // Reveal around party (simple radius check)
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        if (dx * dx + dy * dy > radius * radius) continue;
        const tx = pos.x + dx;
        const ty = pos.y + dy;
        if (tx < 0 || tx >= floor.width || ty < 0 || ty >= floor.height) continue;

        // Simple line-of-sight: check if path to tile is blocked by walls
        if (this._hasLineOfSight(floor, pos.x, pos.y, tx, ty)) {
          floor.grid[ty][tx].visible = true;
          floor.grid[ty][tx].revealed = true;
        }
      }
    }
  }

  private _hasLineOfSight(
    floor: DungeonFloor,
    x0: number, y0: number,
    x1: number, y1: number,
  ): boolean {
    // Bresenham line check
    let dx = Math.abs(x1 - x0);
    let dy = Math.abs(y1 - y0);
    let x = x0;
    let y = y0;
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      if (x === x1 && y === y1) return true;

      const tile = floor.grid[y]?.[x];
      if (!tile) return false;
      if (tile.type === DungeonTileType.WALL && !(x === x1 && y === y1)) return false;

      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; x += sx; }
      if (e2 < dx) { err += dx; y += sy; }
    }
  }
}
