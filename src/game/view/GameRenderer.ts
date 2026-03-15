// ---------------------------------------------------------------------------
// Quest for the Grail — 2D Canvas Renderer (PixiJS)
// Top-down dungeon view with fog of war, tile rendering, entity sprites,
// and visual effects.
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  TileType, GameBalance, FLOOR_THEMES,
} from "../config/GameConfig";
import { Direction } from "../state/GameState";
import type {
  GrailGameState, FloorState,
} from "../state/GameState";

const TS = GameBalance.TILE_SIZE;

// ---------------------------------------------------------------------------
// GameRenderer
// ---------------------------------------------------------------------------

export class GameRenderer {
  readonly worldLayer = new Container();
  private _tileGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _fxGfx = new Graphics();
  private _fogGfx = new Graphics();

  // Pending visual effects
  pendingHits: { x: number; y: number; dmg: number; isCrit: boolean; t: number }[] = [];
  pendingDeaths: { x: number; y: number; t: number }[] = [];
  pendingLoots: { x: number; y: number; text: string; color: number; t: number }[] = [];
  shakeIntensity = 0;
  shakeDuration = 0;

  // Camera
  camX = 0;
  camY = 0;

  init(): void {
    this.worldLayer.addChild(this._tileGfx);
    this.worldLayer.addChild(this._entityGfx);
    this.worldLayer.addChild(this._fogGfx);
    this.worldLayer.addChild(this._fxGfx);
  }

  // -------------------------------------------------------------------------
  // Draw everything for one frame
  // -------------------------------------------------------------------------
  draw(state: GrailGameState, sw: number, sh: number): void {
    const floor = state.floor;
    const player = state.player;

    // Camera follow
    const targetCamX = player.x - sw / 2;
    const targetCamY = player.y - sh / 2;
    this.camX += (targetCamX - this.camX) * GameBalance.CAMERA_LERP;
    this.camY += (targetCamY - this.camY) * GameBalance.CAMERA_LERP;

    // Screen shake
    let shakeOx = 0, shakeOy = 0;
    if (this.shakeDuration > 0) {
      shakeOx = (Math.random() - 0.5) * this.shakeIntensity;
      shakeOy = (Math.random() - 0.5) * this.shakeIntensity;
    }

    this.worldLayer.x = -this.camX + shakeOx;
    this.worldLayer.y = -this.camY + shakeOy;

    this._drawTiles(floor);
    this._drawEntities(state);
    this._drawFog(floor, sw, sh);
    this._drawFX();
  }

  // -------------------------------------------------------------------------
  // Tiles
  // -------------------------------------------------------------------------
  private _drawTiles(floor: FloorState): void {
    const g = this._tileGfx;
    g.clear();

    const themeIdx = Math.min(floor.floorNum, FLOOR_THEMES.length - 1);
    const theme = FLOOR_THEMES[themeIdx];

    // Only draw tiles that are explored
    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        const px = c * TS;
        const py = r * TS;

        switch (tile) {
          case TileType.WALL:
            g.rect(px, py, TS, TS).fill({ color: theme.wallColor });
            // Wall edge highlight
            g.rect(px, py, TS, 2).fill({ color: lighten(theme.wallColor, 0.3) });
            break;
          case TileType.FLOOR:
            g.rect(px, py, TS, TS).fill({ color: theme.floorColor });
            // Subtle tile grid
            if ((r + c) % 2 === 0) {
              g.rect(px, py, TS, TS).fill({ color: lighten(theme.floorColor, 0.05) });
            }
            break;
          case TileType.CORRIDOR:
            g.rect(px, py, TS, TS).fill({ color: darken(theme.floorColor, 0.1) });
            break;
          case TileType.DOOR:
            g.rect(px, py, TS, TS).fill({ color: 0x886644 });
            break;
          case TileType.STAIRS_DOWN:
            g.rect(px, py, TS, TS).fill({ color: theme.floorColor });
            // Stairs icon: concentric squares
            g.rect(px + 4, py + 4, TS - 8, TS - 8).fill({ color: 0x44aaff });
            g.rect(px + 8, py + 8, TS - 16, TS - 16).fill({ color: 0x2288dd });
            g.rect(px + 12, py + 12, TS - 24, TS - 24).fill({ color: 0x1166bb });
            break;
          case TileType.TRAP:
            g.rect(px, py, TS, TS).fill({ color: theme.floorColor });
            // Subtle trap indicator (visible on explored tiles)
            g.rect(px + 10, py + 10, TS - 20, TS - 20).fill({ color: 0x553322 });
            break;
          case TileType.TREASURE:
            g.rect(px, py, TS, TS).fill({ color: theme.floorColor });
            // Treasure chest
            g.rect(px + 6, py + 8, TS - 12, TS - 14).fill({ color: 0xccaa44 });
            g.rect(px + 6, py + 8, TS - 12, 4).fill({ color: 0xddbb55 });
            break;
          case TileType.ENTRANCE:
            g.rect(px, py, TS, TS).fill({ color: 0x225522 });
            break;
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Entities (player + enemies)
  // -------------------------------------------------------------------------
  private _drawEntities(state: GrailGameState): void {
    const g = this._entityGfx;
    g.clear();

    const player = state.player;
    const floor = state.floor;

    // Draw enemies
    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      // Only draw if explored
      const ec = Math.floor(enemy.x / TS);
      const er = Math.floor(enemy.y / TS);
      if (ec < 0 || ec >= floor.width || er < 0 || er >= floor.height) continue;
      if (!floor.explored[er][ec]) continue;

      const size = enemy.def.isBoss ? 14 : 8;
      // Body
      g.circle(enemy.x, enemy.y, size).fill({ color: enemy.def.color });
      // Outline
      g.circle(enemy.x, enemy.y, size).stroke({ color: 0x000000, width: 1 });

      // HP bar
      if (enemy.hp < enemy.maxHp) {
        const barW = size * 2.5;
        const barH = 3;
        const bx = enemy.x - barW / 2;
        const by = enemy.y - size - 6;
        g.rect(bx, by, barW, barH).fill({ color: 0x440000 });
        g.rect(bx, by, barW * (enemy.hp / enemy.maxHp), barH).fill({ color: 0xff2222 });
      }

      // Boss crown
      if (enemy.def.isBoss) {
        g.rect(enemy.x - 4, enemy.y - size - 10, 8, 4).fill({ color: 0xffd700 });
      }

      // Stun indicator
      if (enemy.stunTurns > 0) {
        g.circle(enemy.x, enemy.y - size - 12, 3).fill({ color: 0xffff00 });
      }
    }

    // Draw player
    const pSize = 10;
    // Shadow
    g.ellipse(player.x, player.y + 6, pSize, pSize * 0.4).fill({ color: 0x000000, alpha: 0.3 });
    // Body
    g.circle(player.x, player.y, pSize).fill({ color: player.knightDef.color });
    // Armor tint
    if (player.equippedArmor) {
      g.circle(player.x, player.y, pSize - 2).fill({ color: player.equippedArmor.color, alpha: 0.3 });
    }
    // Outline
    g.circle(player.x, player.y, pSize).stroke({ color: 0xffffff, width: 2 });

    // Facing indicator (small triangle)
    const fx = player.x + dirX(player.facing) * 14;
    const fy = player.y + dirY(player.facing) * 14;
    g.circle(fx, fy, 3).fill({ color: 0xffffff });

    // Weapon glow
    if (player.equippedWeapon) {
      const wx = player.x + dirX(player.facing) * 12;
      const wy = player.y + dirY(player.facing) * 12;
      g.circle(wx, wy, 4).fill({ color: player.equippedWeapon.color, alpha: 0.7 });
    }

    // Player HP bar
    {
      const barW = 24;
      const barH = 3;
      const bx = player.x - barW / 2;
      const by = player.y - pSize - 8;
      g.rect(bx, by, barW, barH).fill({ color: 0x222222 });
      g.rect(bx, by, barW * (player.hp / player.maxHp), barH).fill({ color: 0x22ff22 });
    }

    // Invulnerability shield
    if (player.statusEffects.some((e) => e.id === "invulnerable")) {
      g.circle(player.x, player.y, pSize + 4).stroke({ color: 0xffd700, width: 2, alpha: 0.6 });
    }
  }

  // -------------------------------------------------------------------------
  // Fog of War
  // -------------------------------------------------------------------------
  private _drawFog(floor: FloorState, sw: number, sh: number): void {
    const g = this._fogGfx;
    g.clear();

    // Only draw fog for tiles near the camera viewport
    const startCol = Math.max(0, Math.floor(this.camX / TS) - 2);
    const startRow = Math.max(0, Math.floor(this.camY / TS) - 2);
    const endCol = Math.min(floor.width, Math.ceil((this.camX + sw) / TS) + 2);
    const endRow = Math.min(floor.height, Math.ceil((this.camY + sh) / TS) + 2);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (!floor.explored[r][c]) {
          g.rect(c * TS, r * TS, TS, TS).fill({ color: 0x000000 });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Visual Effects
  // -------------------------------------------------------------------------
  private _drawFX(): void {
    const g = this._fxGfx;
    g.clear();

    // Damage numbers
    for (let i = this.pendingHits.length - 1; i >= 0; i--) {
      const hit = this.pendingHits[i];
      hit.t -= 0.016;
      const alpha = Math.max(0, hit.t / 0.6);
      const yOff = (0.6 - hit.t) * 40;
      const color = hit.isCrit ? 0xffdd00 : 0xff4444;
      // Simple colored circle as damage indicator
      g.circle(hit.x, hit.y - yOff, hit.isCrit ? 6 : 4).fill({ color, alpha });
      if (hit.t <= 0) this.pendingHits.splice(i, 1);
    }

    // Death effects
    for (let i = this.pendingDeaths.length - 1; i >= 0; i--) {
      const d = this.pendingDeaths[i];
      d.t -= 0.016;
      const alpha = Math.max(0, d.t / 0.5);
      const radius = (0.5 - d.t) * 30;
      g.circle(d.x, d.y, radius).stroke({ color: 0xff4444, width: 2, alpha });
      if (d.t <= 0) this.pendingDeaths.splice(i, 1);
    }

    // Loot pickup text
    for (let i = this.pendingLoots.length - 1; i >= 0; i--) {
      const l = this.pendingLoots[i];
      l.t -= 0.016;
      const alpha = Math.max(0, l.t / 1.0);
      const yOff = (1.0 - l.t) * 30;
      g.circle(l.x, l.y - yOff, 5).fill({ color: l.color, alpha });
      if (l.t <= 0) this.pendingLoots.splice(i, 1);
    }
  }

  // -------------------------------------------------------------------------
  // Shake
  // -------------------------------------------------------------------------
  shake(intensity: number, duration: number): void {
    this.shakeIntensity = intensity;
    this.shakeDuration = duration;
  }

  updateShake(dt: number): void {
    if (this.shakeDuration > 0) {
      this.shakeDuration -= dt;
      if (this.shakeDuration <= 0) {
        this.shakeIntensity = 0;
        this.shakeDuration = 0;
      }
    }
  }

  // -------------------------------------------------------------------------
  // Cleanup
  // -------------------------------------------------------------------------
  cleanup(): void {
    this._tileGfx.clear();
    this._entityGfx.clear();
    this._fogGfx.clear();
    this._fxGfx.clear();
    this.worldLayer.removeChildren();
    this.pendingHits.length = 0;
    this.pendingDeaths.length = 0;
    this.pendingLoots.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function dirX(d: Direction): number {
  if (d === Direction.LEFT) return -1;
  if (d === Direction.RIGHT) return 1;
  return 0;
}

function dirY(d: Direction): number {
  if (d === Direction.UP) return -1;
  if (d === Direction.DOWN) return 1;
  return 0;
}

function lighten(color: number, amount: number): number {
  const r = Math.min(255, ((color >> 16) & 0xff) + Math.floor(255 * amount));
  const g = Math.min(255, ((color >> 8) & 0xff) + Math.floor(255 * amount));
  const b = Math.min(255, (color & 0xff) + Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}

function darken(color: number, amount: number): number {
  const r = Math.max(0, ((color >> 16) & 0xff) - Math.floor(255 * amount));
  const g = Math.max(0, ((color >> 8) & 0xff) - Math.floor(255 * amount));
  const b = Math.max(0, (color & 0xff) - Math.floor(255 * amount));
  return (r << 16) | (g << 8) | b;
}
