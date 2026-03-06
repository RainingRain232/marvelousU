// Renders the overworld tile map, party sprite, entities, and fog of war
import { Container, Graphics, Text, AnimatedSprite } from "pixi.js";
import { OverworldTileType, UnitType, UnitState } from "@/types";
import { EventBus } from "@sim/core/EventBus";
import type { ViewManager } from "@view/ViewManager";
import type { OverworldState, OverworldEntity } from "@rpg/state/OverworldState";
import type { RPGState } from "@rpg/state/RPGState";
import { RPGBalance } from "@rpg/config/RPGBalanceConfig";
import { animationManager } from "@view/animation/AnimationManager";

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

const FOG_COLOR = 0x111122;
const FOG_ALPHA = 0.7;

// Town icon colours
const TOWN_WALL = 0x8b7355;
const TOWN_ROOF = 0xaa3333;
const TOWN_DOOR = 0x553322;

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
  private partyContainer = new Container();
  private entityLabels: Text[] = [];

  private _tileGraphics = new Graphics();
  private _fogGraphics = new Graphics();
  private _entityGraphics = new Graphics();

  private _partySprite: AnimatedSprite | null = null;
  private _partyShadow = new Graphics();
  private _partyState: UnitState = UnitState.IDLE;
  private _idleTimer: ReturnType<typeof setTimeout> | null = null;
  private _moveResetTimer: ReturnType<typeof setTimeout> | null = null;

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

    vm.addToLayer("units", this.partyContainer);

    // Set map size on camera
    vm.camera.setMapSize(overworld.width, overworld.height);

    // Create party animated sprite
    this._createPartySprite();

    // Initial render
    this._drawMap();
    this._drawEntities();
    this._drawFog();
    this._updatePartyPosition();
    this._centerCamera();

    // Listen for movement
    this._unsubs.push(EventBus.on("rpgPartyMoved", () => {
      this._drawFog();
      this._updatePartyPosition();
      this._setPartyAnimation(UnitState.MOVE);
      this._centerCamera();

      // Return to idle after short delay
      if (this._moveResetTimer) clearTimeout(this._moveResetTimer);
      this._moveResetTimer = setTimeout(() => {
        this._setPartyAnimation(UnitState.IDLE);
        this._scheduleIdleInterrupt();
      }, 400);
    }));

    // Schedule occasional idle animation
    this._scheduleIdleInterrupt();
  }

  destroy(): void {
    for (const unsub of this._unsubs) unsub();
    this._unsubs = [];

    if (this._idleTimer) clearTimeout(this._idleTimer);
    if (this._moveResetTimer) clearTimeout(this._moveResetTimer);

    this.vm.removeFromLayer("background", this.mapContainer);
    this.vm.removeFromLayer("buildings", this.entityContainer);
    this.vm.removeFromLayer("groundfx", this.fogContainer);
    this.vm.removeFromLayer("units", this.partyContainer);

    for (const label of this.entityLabels) label.destroy();
    this.entityLabels = [];

    this.mapContainer.destroy({ children: true });
    this.entityContainer.destroy({ children: true });
    this.fogContainer.destroy({ children: true });
    this.partyContainer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Party sprite
  // ---------------------------------------------------------------------------

  private _createPartySprite(): void {
    const ts = this.TILE_SIZE;

    // Shadow ellipse
    this._partyShadow.ellipse(0, 4, ts * 0.3, ts * 0.12);
    this._partyShadow.fill({ color: 0x000000, alpha: 0.3 });
    this.partyContainer.addChild(this._partyShadow);

    // Animated sprite using swordsman
    const frames = animationManager.getFrames(UnitType.SWORDSMAN, UnitState.IDLE);
    const frameSet = animationManager.getFrameSet(UnitType.SWORDSMAN, UnitState.IDLE);

    const sprite = new AnimatedSprite(frames);
    sprite.anchor.set(0.5, 0.75);
    sprite.width = ts * 1.0;
    sprite.height = ts * 1.0;
    sprite.animationSpeed = frameSet.fps / 60;
    sprite.loop = true;
    sprite.tint = 0x6699ff; // Blue shield tint
    sprite.play();

    this.partyContainer.addChild(sprite);
    this._partySprite = sprite;
    this._partyState = UnitState.IDLE;
  }

  private _setPartyAnimation(state: UnitState): void {
    if (!this._partySprite || this._partyState === state) return;
    this._partyState = state;

    const frames = animationManager.getFrames(UnitType.SWORDSMAN, state);
    const frameSet = animationManager.getFrameSet(UnitType.SWORDSMAN, state);

    this._partySprite.textures = frames;
    this._partySprite.animationSpeed = frameSet.fps / 60;
    this._partySprite.loop = true;
    this._partySprite.gotoAndPlay(0);
  }

  private _scheduleIdleInterrupt(): void {
    if (this._idleTimer) clearTimeout(this._idleTimer);
    // Occasionally play idle animation variant (every 3-6 seconds)
    const delay = 3000 + Math.random() * 3000;
    this._idleTimer = setTimeout(() => {
      if (this._partyState !== UnitState.MOVE) {
        // Toggle between IDLE state to create visual variety
        this._setPartyAnimation(UnitState.IDLE);
      }
      this._scheduleIdleInterrupt();
    }, delay);
  }

  private _updatePartyPosition(): void {
    const ts = this.TILE_SIZE;
    const px = this.overworld.partyPosition.x * ts + ts / 2;
    const py = this.overworld.partyPosition.y * ts + ts / 2;
    this.partyContainer.position.set(px, py);
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

      const cx = entity.position.x * ts + halfTs;
      const cy = entity.position.y * ts + halfTs;

      this._drawEntityMarker(g, entity, cx, cy, halfTs * 0.6);

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
    r: number,
  ): void {
    switch (entity.type) {
      case "town":
        // Simplified town icon: house shape
        // Building body
        g.rect(cx - r * 0.8, cy - r * 0.3, r * 1.6, r * 1.3);
        g.fill({ color: TOWN_WALL });
        // Roof (triangle)
        g.moveTo(cx - r, cy - r * 0.3);
        g.lineTo(cx, cy - r * 1.1);
        g.lineTo(cx + r, cy - r * 0.3);
        g.closePath();
        g.fill({ color: TOWN_ROOF });
        // Door
        g.rect(cx - r * 0.2, cy + r * 0.2, r * 0.4, r * 0.8);
        g.fill({ color: TOWN_DOOR });
        // Outline
        g.roundRect(cx - r, cy - r * 1.1, r * 2, r * 2.1, 1);
        g.stroke({ color: 0xffffff, width: 1, alpha: 0.4 });
        break;
      case "dungeon_entrance":
        // Triangle for dungeons
        g.moveTo(cx, cy - r);
        g.lineTo(cx + r, cy + r);
        g.lineTo(cx - r, cy + r);
        g.closePath();
        g.fill({ color: 0xaa3333 });
        g.stroke({ color: 0xff6666, width: 1 });
        break;
      case "npc":
        // Small person shape
        g.circle(cx, cy - r * 0.4, r * 0.35);
        g.fill({ color: 0x66aaff });
        g.rect(cx - r * 0.25, cy - r * 0.1, r * 0.5, r * 0.8);
        g.fill({ color: 0x66aaff });
        break;
      case "arcane_library":
        // Star shape for the arcane library
        g.rect(cx - r, cy - r * 0.5, r * 2, r * 1.5);
        g.fill({ color: 0x4422aa });
        // Tower on top
        g.rect(cx - r * 0.3, cy - r * 1.2, r * 0.6, r * 0.8);
        g.fill({ color: 0x6633cc });
        // Glow outline
        g.roundRect(cx - r * 1.1, cy - r * 1.3, r * 2.2, r * 2.9, 2);
        g.stroke({ color: 0xaa66ff, width: 1, alpha: 0.6 });
        break;
      default:
        // Circle for others
        g.circle(cx, cy, r * 0.5);
        g.fill({ color: 0xffaa00 });
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
