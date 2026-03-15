// ---------------------------------------------------------------------------
// Quest for the Grail — 2D Canvas Renderer (PixiJS)
// Fully overhauled dungeon-crawler visuals: textured tiles, detailed
// character sprites, lighting, fog of war, and particle effects.
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  TileType, GameBalance, FLOOR_THEMES, EnemyCategory, RoomType,
} from "../config/GameConfig";
import { Direction } from "../state/GameState";
import type {
  GrailGameState, FloorState, EnemyInstance, PlayerState,
} from "../state/GameState";

const TS = GameBalance.TILE_SIZE;

// ---------------------------------------------------------------------------
// Seeded random for deterministic per-tile decoration
// ---------------------------------------------------------------------------
function tileHash(r: number, c: number, seed: number = 0): number {
  let h = (r * 374761393 + c * 668265263 + seed) | 0;
  h = (h ^ (h >> 13)) * 1274126177;
  h = h ^ (h >> 16);
  return (h >>> 0) / 4294967296; // 0..1
}

// ---------------------------------------------------------------------------
// Global animation clock
// ---------------------------------------------------------------------------
let _globalTime = 0;

// ---------------------------------------------------------------------------
// GameRenderer
// ---------------------------------------------------------------------------

export class GameRenderer {
  readonly worldLayer = new Container();
  private _tileGfx = new Graphics();
  private _decorGfx = new Graphics();
  private _lightGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _fxGfx = new Graphics();
  private _fogGfx = new Graphics();
  private _vignetteGfx = new Graphics();

  // Pending visual effects
  pendingHits: { x: number; y: number; dmg: number; isCrit: boolean; t: number; drift: number }[] = [];
  pendingDeaths: { x: number; y: number; t: number; category: string }[] = [];
  pendingLoots: { x: number; y: number; text: string; color: number; t: number }[] = [];
  pendingAttackFx: { x: number; y: number; angle: number; t: number; color: number }[] = [];
  pendingAbilityFx: { x: number; y: number; t: number; radius: number; color: number }[] = [];
  pendingStatusFx: { x: number; y: number; id: string; t: number }[] = [];
  ambientParticles: { x: number; y: number; vx: number; vy: number; life: number; maxLife: number; size: number; color: number; alpha: number }[] = [];

  // Boss phase flash
  pendingBossFlash: { color: number; t: number } | null = null;

  shakeIntensity = 0;
  shakeDuration = 0;

  // Camera
  camX = 0;
  camY = 0;
  camOffsetX = 0;
  camOffsetY = 0;

  // Track floor for ambient spawning
  private _lastFloorNum = -1;

  init(): void {
    this.worldLayer.addChild(this._tileGfx);
    this.worldLayer.addChild(this._decorGfx);
    this.worldLayer.addChild(this._lightGfx);
    this.worldLayer.addChild(this._entityGfx);
    this.worldLayer.addChild(this._fogGfx);
    this.worldLayer.addChild(this._fxGfx);
    this.worldLayer.addChild(this._vignetteGfx);
  }

  // -------------------------------------------------------------------------
  // Draw everything for one frame
  // -------------------------------------------------------------------------
  draw(state: GrailGameState, sw: number, sh: number): void {
    _globalTime += 0.016;
    const floor = state.floor;
    const player = state.player;

    // Camera follow (with arrow-key offset)
    const targetCamX = player.x - sw / 2 + this.camOffsetX;
    const targetCamY = player.y - sh / 2 + this.camOffsetY;
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

    // Spawn ambient particles
    this._spawnAmbientParticles(floor, sw, sh);

    this._drawTiles(floor);
    this._drawDecorations(floor);
    this._drawPoisonTrails(state);
    this._drawLighting(floor, player, sw, sh);
    this._drawEntities(state);
    this._drawProjectiles(state);
    this._drawDashTrail(state);
    this._drawFog(floor, sw, sh);
    this._drawFX(sw, sh);
    this._drawBossFlash(sw, sh);
    this._drawConfusionOverlay(state, sw, sh);
    this._drawAbilityVFX(state);
    this._drawVignette(sw, sh);
  }

  // -------------------------------------------------------------------------
  // TILES — textured floors, stone walls, detailed doors/stairs/traps/chests
  // -------------------------------------------------------------------------
  private _drawTiles(floor: FloorState): void {
    const g = this._tileGfx;
    g.clear();

    const themeIdx = Math.min(floor.floorNum, FLOOR_THEMES.length - 1);
    const theme = FLOOR_THEMES[themeIdx];

    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        const px = c * TS;
        const py = r * TS;

        switch (tile) {
          case TileType.WALL:
            this._drawWallTile(g, px, py, theme.wallColor, r, c);
            break;
          case TileType.FLOOR:
            this._drawFloorTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.CORRIDOR:
            this._drawCorridorTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.DOOR:
            this._drawDoorTile(g, px, py, r, c);
            break;
          case TileType.STAIRS_DOWN:
            this._drawStairsTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.TRAP:
            this._drawTrapTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.TREASURE:
            this._drawTreasureTile(g, px, py, theme.floorColor, r, c, floor);
            break;
          case TileType.ENTRANCE:
            this._drawEntranceTile(g, px, py, r, c);
            break;
          case TileType.SHOP:
            this._drawShopTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.VINE:
            this._drawVineTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.ICE:
            this._drawIceTile(g, px, py, r, c);
            break;
          case TileType.LAVA:
            this._drawLavaTile(g, px, py, r, c);
            break;
          case TileType.ILLUSION:
            this._drawIllusionTile(g, px, py, theme.floorColor, r, c);
            break;
          case TileType.SHRINE:
            this._drawShrineTile(g, px, py, theme.floorColor, r, c);
            break;
        }
      }
    }

    // Draw burning trails
    for (const trail of floor.burningTrails) {
      if (trail.row >= 0 && trail.row < floor.height && trail.col >= 0 && trail.col < floor.width) {
        if (floor.explored[trail.row][trail.col]) {
          const bpx = trail.col * TS;
          const bpy = trail.row * TS;
          const flicker = 0.3 + 0.2 * Math.sin(_globalTime * 6 + trail.col + trail.row);
          g.rect(bpx, bpy, TS, TS).fill({ color: 0xff4400, alpha: flicker * 0.3 });
          g.rect(bpx + 4, bpy + 4, TS - 8, TS - 8).fill({ color: 0xff8800, alpha: flicker * 0.2 });
        }
      }
    }

    // Draw room type visual cues (borders/glows for special rooms)
    for (const room of floor.rooms) {
      if (room.type === RoomType.NORMAL) continue;
      const rc = Math.floor(room.x + room.w / 2);
      const rr = Math.floor(room.y + room.h / 2);
      if (rr < 0 || rr >= floor.height || rc < 0 || rc >= floor.width) continue;
      if (!floor.explored[rr][rc]) continue;

      const rpx = room.x * TS;
      const rpy = room.y * TS;
      const rpw = room.w * TS;
      const rph = room.h * TS;
      const pulse = 0.3 + 0.2 * Math.sin(_globalTime * 2);

      if (room.type === RoomType.SHRINE) {
        g.rect(rpx, rpy, rpw, rph).stroke({ color: 0x88ffaa, width: 1, alpha: pulse * 0.4 });
      } else if (room.type === RoomType.CHAMPION_ARENA) {
        g.rect(rpx, rpy, rpw, rph).stroke({ color: 0xff4444, width: 1.5, alpha: pulse * 0.5 });
      } else if (room.type === RoomType.TREASURE_VAULT) {
        g.rect(rpx, rpy, rpw, rph).stroke({ color: 0xffd700, width: 1, alpha: pulse * 0.4 });
      } else if (room.type === RoomType.SECRET) {
        g.rect(rpx, rpy, rpw, rph).stroke({ color: 0x8844ff, width: 1, alpha: pulse * 0.3 });
      }
    }
  }

  // --- Wall: stone blocks with mortar lines and top highlight ---
  private _drawWallTile(g: Graphics, px: number, py: number, wallColor: number, r: number, c: number): void {
    // Base wall
    g.rect(px, py, TS, TS).fill({ color: wallColor });

    // Stone block pattern — 2 rows of bricks, offset
    const mortar = darken(wallColor, 0.25);
    const blockH = TS / 2;
    for (let row = 0; row < 2; row++) {
      const by = py + row * blockH;
      const offset = row % 2 === 0 ? 0 : TS / 3;
      // Horizontal mortar line
      g.rect(px, by, TS, 1).fill({ color: mortar });
      // Vertical mortar lines
      for (let bx = offset; bx < TS; bx += TS / 2) {
        g.rect(px + bx, by, 1, blockH).fill({ color: mortar });
      }
    }

    // Random stone variation
    const h = tileHash(r, c, 1);
    if (h > 0.7) {
      const cx = px + (h * 20) % TS;
      const cy = py + (h * 30) % TS;
      g.circle(cx, cy, 2).fill({ color: darken(wallColor, 0.15), alpha: 0.5 });
    }

    // Top edge highlight (3D look)
    g.rect(px, py, TS, 2).fill({ color: lighten(wallColor, 0.3) });
    // Bottom shadow
    g.rect(px, py + TS - 2, TS, 2).fill({ color: darken(wallColor, 0.3) });
    // Left highlight
    g.rect(px, py, 1, TS).fill({ color: lighten(wallColor, 0.15) });
    // Right shadow
    g.rect(px + TS - 1, py, 1, TS).fill({ color: darken(wallColor, 0.2) });
  }

  // --- Floor: stone tile pattern with cracks ---
  private _drawFloorTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    // Checkerboard base
    const shade = (r + c) % 2 === 0 ? lighten(floorColor, 0.04) : floorColor;
    g.rect(px, py, TS, TS).fill({ color: shade });

    // Tile border grooves
    g.rect(px, py, TS, 1).fill({ color: darken(floorColor, 0.15) });
    g.rect(px, py, 1, TS).fill({ color: darken(floorColor, 0.15) });

    // Random cracks
    const h = tileHash(r, c, 7);
    if (h > 0.75) {
      const crackColor = darken(floorColor, 0.2);
      const sx = px + (h * 100 % 20) + 4;
      const sy = py + (h * 200 % 20) + 4;
      // Crack as a few small line segments
      g.rect(sx, sy, 6, 1).fill({ color: crackColor, alpha: 0.6 });
      g.rect(sx + 5, sy, 1, 5).fill({ color: crackColor, alpha: 0.5 });
    }
    if (h > 0.88) {
      // Extra crack
      const sx2 = px + 14 + (h * 50 % 10);
      const sy2 = py + 10 + (h * 80 % 12);
      g.rect(sx2, sy2, 1, 8).fill({ color: darken(floorColor, 0.18), alpha: 0.5 });
      g.rect(sx2 - 2, sy2 + 7, 5, 1).fill({ color: darken(floorColor, 0.18), alpha: 0.4 });
    }
  }

  // --- Corridor: worn stone with scuff marks ---
  private _drawCorridorTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    const corColor = darken(floorColor, 0.08);
    g.rect(px, py, TS, TS).fill({ color: corColor });

    // Tile border
    g.rect(px, py, TS, 1).fill({ color: darken(corColor, 0.12) });
    g.rect(px, py, 1, TS).fill({ color: darken(corColor, 0.12) });

    // Worn center path (lighter strip down middle)
    g.rect(px + 8, py, TS - 16, TS).fill({ color: lighten(corColor, 0.06), alpha: 0.5 });
    g.rect(px, py + 8, TS, TS - 16).fill({ color: lighten(corColor, 0.06), alpha: 0.5 });

    // Scuff marks
    const h = tileHash(r, c, 3);
    if (h > 0.6) {
      const sx = px + (h * 50 % 24) + 4;
      const sy = py + (h * 70 % 24) + 4;
      g.rect(sx, sy, 4, 1).fill({ color: darken(corColor, 0.1), alpha: 0.4 });
    }
    if (h > 0.8) {
      const sx = px + 10 + (h * 30 % 14);
      const sy = py + 14 + (h * 40 % 12);
      g.rect(sx, sy, 3, 1).fill({ color: darken(corColor, 0.08), alpha: 0.3 });
    }
  }

  // --- Door: wooden planks with iron bands and handle ---
  private _drawDoorTile(g: Graphics, px: number, py: number, _r: number, _c: number): void {
    // Door frame (dark stone)
    g.rect(px, py, TS, TS).fill({ color: 0x333333 });

    // Wooden door body
    const dx = px + 4, dy = py + 2, dw = TS - 8, dh = TS - 4;
    g.rect(dx, dy, dw, dh).fill({ color: 0x7a5230 });

    // Wood plank lines
    const plankW = dw / 3;
    for (let i = 1; i < 3; i++) {
      g.rect(dx + plankW * i, dy, 1, dh).fill({ color: 0x5a3a1e });
    }

    // Horizontal iron bands
    g.rect(dx, dy + 4, dw, 3).fill({ color: 0x555555 });
    g.rect(dx, dy + dh - 7, dw, 3).fill({ color: 0x555555 });
    // Iron band rivets
    for (let i = 0; i < 3; i++) {
      const rx = dx + 3 + i * (dw / 3);
      g.circle(rx, dy + 5.5, 1.5).fill({ color: 0x777777 });
      g.circle(rx, dy + dh - 5.5, 1.5).fill({ color: 0x777777 });
    }

    // Door handle (right side)
    g.circle(dx + dw - 5, dy + dh / 2, 2.5).fill({ color: 0x888888 });
    g.circle(dx + dw - 5, dy + dh / 2, 1.5).fill({ color: 0x666666 });

    // Wood grain highlights
    g.rect(dx + 2, dy + 8, 1, dh - 16).fill({ color: 0x8a6240, alpha: 0.4 });
    g.rect(dx + plankW + 3, dy + 10, 1, dh - 20).fill({ color: 0x8a6240, alpha: 0.3 });
  }

  // --- Stairs: actual steps going down ---
  private _drawStairsTile(g: Graphics, px: number, py: number, floorColor: number, _r: number, _c: number): void {
    g.rect(px, py, TS, TS).fill({ color: floorColor });

    const stepCount = 5;
    const stepH = TS / stepCount;
    for (let i = 0; i < stepCount; i++) {
      const sx = px + 2 + i * 2;
      const sy = py + i * stepH;
      const sw = TS - 4 - i * 4;
      const shade = darken(0x5577aa, i * 0.08);
      g.rect(sx, sy, sw, stepH - 1).fill({ color: shade });
      // Step edge highlight
      g.rect(sx, sy, sw, 1).fill({ color: lighten(shade, 0.25) });
      // Step side shadow
      g.rect(sx + sw - 1, sy, 1, stepH - 1).fill({ color: darken(shade, 0.2) });
    }

    // Downward arrow glow
    const cx = px + TS / 2;
    const cy = py + TS / 2;
    const pulse = 0.5 + 0.5 * Math.sin(_globalTime * 3);
    g.circle(cx, cy, 6).fill({ color: 0x44aaff, alpha: 0.15 + pulse * 0.15 });
    // Arrow
    g.moveTo(cx - 4, cy - 3).lineTo(cx, cy + 4).lineTo(cx + 4, cy - 3).closePath().fill({ color: 0x88ccff, alpha: 0.6 + pulse * 0.3 });
  }

  // --- Trap: pressure plate with subtle lines ---
  private _drawTrapTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    // Draw as normal floor first
    this._drawFloorTile(g, px, py, floorColor, r, c);

    // Pressure plate outline (subtle)
    const inset = 6;
    const plateColor = darken(floorColor, 0.12);
    g.rect(px + inset, py + inset, TS - inset * 2, TS - inset * 2).stroke({ color: plateColor, width: 1 });

    // Slightly discolored center
    g.rect(px + inset + 2, py + inset + 2, TS - inset * 2 - 4, TS - inset * 2 - 4)
      .fill({ color: darken(floorColor, 0.05), alpha: 0.5 });

    // Corner holes (mechanism visible)
    const holeColor = darken(floorColor, 0.3);
    g.circle(px + inset + 1, py + inset + 1, 1).fill({ color: holeColor });
    g.circle(px + TS - inset - 1, py + inset + 1, 1).fill({ color: holeColor });
    g.circle(px + inset + 1, py + TS - inset - 1, 1).fill({ color: holeColor });
    g.circle(px + TS - inset - 1, py + TS - inset - 1, 1).fill({ color: holeColor });
  }

  // --- Treasure: detailed chest with lid, lock, bands, golden glow ---
  private _drawTreasureTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number, floor: FloorState): void {
    this._drawFloorTile(g, px, py, floorColor, r, c);

    const isOpened = floor.treasures.some(t => t.col === c && t.row === r && t.opened);

    // Golden glow aura (pulsing)
    if (!isOpened) {
      const pulse = 0.5 + 0.5 * Math.sin(_globalTime * 2.5);
      g.circle(px + TS / 2, py + TS / 2, 14).fill({ color: 0xffd700, alpha: 0.06 + pulse * 0.06 });
      g.circle(px + TS / 2, py + TS / 2, 10).fill({ color: 0xffd700, alpha: 0.08 + pulse * 0.08 });
    }

    // Chest body
    const cx = px + 5, cy = py + 10, cw = TS - 10, ch = TS - 14;
    const bodyColor = isOpened ? 0x886633 : 0xaa7733;
    g.rect(cx, cy, cw, ch).fill({ color: bodyColor });

    // Metal bands (horizontal)
    g.rect(cx, cy + 2, cw, 2).fill({ color: 0x888844 });
    g.rect(cx, cy + ch - 4, cw, 2).fill({ color: 0x888844 });

    // Lid
    if (isOpened) {
      // Open lid (angled back)
      g.rect(cx, cy - 4, cw, 5).fill({ color: lighten(bodyColor, 0.1) });
      g.rect(cx, cy - 4, cw, 1).fill({ color: 0x888844 });
    } else {
      // Closed lid (rounded top)
      g.rect(cx, cy, cw, 4).fill({ color: lighten(bodyColor, 0.15) });
      g.rect(cx, cy, cw, 1).fill({ color: lighten(bodyColor, 0.3) });
      // Lock
      g.rect(cx + cw / 2 - 2, cy + 4, 4, 4).fill({ color: 0xccaa00 });
      g.circle(cx + cw / 2, cy + 6, 1).fill({ color: 0x332200 });
    }

    // Side shadow
    g.rect(cx + cw - 1, cy, 1, ch).fill({ color: darken(bodyColor, 0.2) });
    // Bottom shadow
    g.rect(cx, cy + ch, cw, 2).fill({ color: 0x000000, alpha: 0.3 });
  }

  // --- Entrance: stone archway ---
  private _drawEntranceTile(g: Graphics, px: number, py: number, _r: number, _c: number): void {
    g.rect(px, py, TS, TS).fill({ color: 0x225522 });

    // Stone arch
    g.rect(px, py, 4, TS).fill({ color: 0x555555 });
    g.rect(px + TS - 4, py, 4, TS).fill({ color: 0x555555 });
    g.rect(px, py, TS, 4).fill({ color: 0x666666 });

    // Arch keystone
    g.rect(px + TS / 2 - 3, py, 6, 5).fill({ color: 0x777777 });

    // Green mossy glow
    const pulse = 0.5 + 0.5 * Math.sin(_globalTime * 1.5);
    g.circle(px + TS / 2, py + TS / 2, 8).fill({ color: 0x44ff66, alpha: 0.08 + pulse * 0.06 });
  }

  // --- Shop: merchant stall tile ---
  private _drawShopTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    this._drawFloorTile(g, px, py, floorColor, r, c);
    // Stall base
    g.rect(px + 2, py + 6, TS - 4, TS - 8).fill({ color: 0x7a5230 });
    g.rect(px + 2, py + 6, TS - 4, 3).fill({ color: 0x8a6240 }); // counter top
    // Awning
    g.rect(px, py, TS, 6).fill({ color: 0xcc4444 });
    g.rect(px, py + 5, TS, 1).fill({ color: 0xaa3333 });
    // Merchant head
    g.circle(px + TS / 2, py + 12, 4).fill({ color: 0xddbb88 });
    // Merchant hat
    g.rect(px + TS / 2 - 5, py + 7, 10, 3).fill({ color: 0x664422 });
    g.rect(px + TS / 2 - 3, py + 4, 6, 4).fill({ color: 0x664422 });
    // Gold coins on counter
    const pulse = 0.6 + 0.3 * Math.sin(_globalTime * 3);
    g.circle(px + 8, py + 20, 2).fill({ color: 0xffd700, alpha: pulse });
    g.circle(px + 14, py + 19, 2).fill({ color: 0xffd700, alpha: pulse });
    g.circle(px + 20, py + 20, 2).fill({ color: 0xffd700, alpha: pulse });
    // Glow
    g.circle(px + TS / 2, py + TS / 2, 14).fill({ color: 0xffd700, alpha: 0.06 + pulse * 0.04 });
  }

  // --- Vine tile (Enchanted Forest) ---
  private _drawVineTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    this._drawFloorTile(g, px, py, floorColor, r, c);
    const h = tileHash(r, c, 77);
    // Green vine overlay
    g.rect(px, py, TS, TS).fill({ color: 0x225511, alpha: 0.25 });
    // Vine strands
    for (let i = 0; i < 3; i++) {
      const vx = px + 4 + (h * 100 + i * 10) % 20;
      const vy = py + 2;
      const wave = Math.sin(_globalTime * 2 + i + c) * 2;
      g.moveTo(vx, vy).lineTo(vx + wave, vy + TS / 2).lineTo(vx - wave, vy + TS)
        .stroke({ color: 0x337722, width: 1.5, alpha: 0.6 });
    }
    // Thorns
    g.circle(px + 10, py + 12, 1.5).fill({ color: 0x553311, alpha: 0.7 });
    g.circle(px + 22, py + 20, 1.5).fill({ color: 0x553311, alpha: 0.7 });
    // Danger pulse
    const pulse = Math.sin(_globalTime * 4) * 0.05 + 0.05;
    g.rect(px, py, TS, TS).fill({ color: 0x44ff00, alpha: pulse });
  }

  // --- Ice tile (Frozen Depths) ---
  private _drawIceTile(g: Graphics, px: number, py: number, _r: number, _c: number): void {
    // Ice base
    g.rect(px, py, TS, TS).fill({ color: 0x88bbdd });
    // Shimmer
    const shimmer = 0.6 + 0.2 * Math.sin(_globalTime * 3 + px * 0.1);
    g.rect(px + 2, py + 2, TS - 4, TS - 4).fill({ color: 0xaaddff, alpha: shimmer * 0.4 });
    // Frost patterns
    g.moveTo(px + 4, py + TS / 2).lineTo(px + TS / 2, py + 4).stroke({ color: 0xcceeFF, width: 0.5, alpha: 0.5 });
    g.moveTo(px + TS - 4, py + TS / 2).lineTo(px + TS / 2, py + TS - 4).stroke({ color: 0xcceeFF, width: 0.5, alpha: 0.5 });
    // Highlight streak
    g.rect(px + 6, py + 4, 8, 2).fill({ color: 0xffffff, alpha: 0.3 });
  }

  // --- Lava tile (Volcanic Tunnels) ---
  private _drawLavaTile(g: Graphics, px: number, py: number, _r: number, _c: number): void {
    // Lava base
    g.rect(px, py, TS, TS).fill({ color: 0xaa2200 });
    // Bubbling animation
    const bubble = Math.sin(_globalTime * 4 + px * 0.2) * 0.3 + 0.7;
    g.rect(px + 2, py + 2, TS - 4, TS - 4).fill({ color: 0xff4400, alpha: bubble * 0.6 });
    g.rect(px + 6, py + 6, TS - 12, TS - 12).fill({ color: 0xff8800, alpha: bubble * 0.4 });
    // Bright spots
    const b1 = Math.sin(_globalTime * 6 + py * 0.3) * 0.3 + 0.5;
    g.circle(px + 10, py + 10, 3).fill({ color: 0xffcc00, alpha: b1 * 0.5 });
    g.circle(px + 22, py + 18, 2.5).fill({ color: 0xffaa00, alpha: b1 * 0.4 });
    // Heat haze glow
    g.rect(px, py, TS, TS).fill({ color: 0xff6600, alpha: 0.1 });
  }

  // --- Illusion tile (Faerie Hollows) ---
  private _drawIllusionTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    this._drawFloorTile(g, px, py, floorColor, r, c);
    // Shimmer overlay that shifts
    const shift = Math.sin(_globalTime * 2 + r * 3 + c * 7) * 0.15 + 0.15;
    g.rect(px, py, TS, TS).fill({ color: 0x8844ff, alpha: shift });
    // Sparkle dots
    for (let i = 0; i < 3; i++) {
      const sx = px + 4 + ((Math.sin(_globalTime * 3 + i * 2 + c) + 1) * 0.5) * (TS - 8);
      const sy = py + 4 + ((Math.cos(_globalTime * 2 + i * 3 + r) + 1) * 0.5) * (TS - 8);
      g.circle(sx, sy, 1).fill({ color: 0xffffff, alpha: 0.3 + Math.sin(_globalTime * 5 + i) * 0.2 });
    }
  }

  // --- Shrine tile ---
  private _drawShrineTile(g: Graphics, px: number, py: number, floorColor: number, r: number, c: number): void {
    this._drawFloorTile(g, px, py, floorColor, r, c);
    // Altar base
    g.rect(px + 6, py + 14, TS - 12, TS - 16).fill({ color: 0x888888 });
    g.rect(px + 4, py + 12, TS - 8, 3).fill({ color: 0x999999 }); // altar top
    // Glowing orb
    const pulse = 0.4 + 0.3 * Math.sin(_globalTime * 2.5);
    g.circle(px + TS / 2, py + 10, 5).fill({ color: 0x88ffaa, alpha: pulse });
    g.circle(px + TS / 2, py + 10, 8).fill({ color: 0x88ffaa, alpha: pulse * 0.2 });
    // Light rays
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + _globalTime * 0.5;
      const rx = px + TS / 2 + Math.cos(angle) * 10;
      const ry = py + 10 + Math.sin(angle) * 10;
      g.circle(rx, ry, 1).fill({ color: 0xaaffcc, alpha: pulse * 0.5 });
    }
  }

  // -------------------------------------------------------------------------
  // DECORATIONS — torches, pillars, moss, puddles, blood, cobwebs, rubble
  // -------------------------------------------------------------------------
  private _drawDecorations(floor: FloorState): void {
    const g = this._decorGfx;
    g.clear();

    const themeIdx = Math.min(floor.floorNum, FLOOR_THEMES.length - 1);
    const theme = FLOOR_THEMES[themeIdx];

    for (let r = 0; r < floor.height; r++) {
      for (let c = 0; c < floor.width; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        const px = c * TS;
        const py = r * TS;
        const h = tileHash(r, c, 42);

        // Wall torches: every ~7 wall tiles adjacent to floor
        if (tile === TileType.WALL && h > 0.85) {
          const hasFloorBelow = r + 1 < floor.height && (floor.tiles[r + 1][c] === TileType.FLOOR || floor.tiles[r + 1][c] === TileType.CORRIDOR);
          if (hasFloorBelow) {
            this._drawTorch(g, px + TS / 2, py + TS - 2);
          }
        }

        // Floor decorations
        if (tile === TileType.FLOOR || tile === TileType.CORRIDOR) {
          // Moss on floor near walls
          if (h > 0.7 && h < 0.78) {
            const isNearWall = this._hasAdjacentWall(floor, r, c);
            if (isNearWall) {
              this._drawMoss(g, px, py, h);
            }
          }

          // Puddles
          if (h > 0.92 && h < 0.96) {
            this._drawPuddle(g, px, py, h);
          }

          // Blood stains
          if (h > 0.96 && h < 0.98) {
            this._drawBloodStain(g, px, py, h);
          }

          // Rubble/debris
          if (h > 0.56 && h < 0.60) {
            this._drawRubble(g, px, py, h, theme.wallColor);
          }

          // Cobwebs in corners near walls
          if (h > 0.45 && h < 0.48) {
            const isCorner = this._isCornerNearWall(floor, r, c);
            if (isCorner) {
              this._drawCobweb(g, px, py, h);
            }
          }
        }

        // Pillars in room corners (floor tiles at room edges)
        if (tile === TileType.FLOOR && h > 0.98) {
          this._drawPillar(g, px, py, theme.wallColor);
        }
      }
    }
  }

  private _drawTorch(g: Graphics, tx: number, ty: number): void {
    // Bracket
    g.rect(tx - 1, ty - 6, 2, 6).fill({ color: 0x666666 });

    // Flame (animated)
    const flicker = Math.sin(_globalTime * 8 + tx) * 0.3 + 0.7;
    const flicker2 = Math.cos(_globalTime * 12 + ty) * 0.2;

    // Outer glow
    g.circle(tx, ty - 8, 8).fill({ color: 0xff6600, alpha: 0.08 * flicker });
    g.circle(tx, ty - 8, 5).fill({ color: 0xff8800, alpha: 0.12 * flicker });

    // Flame body
    g.ellipse(tx + flicker2, ty - 9, 2.5, 4).fill({ color: 0xff6622, alpha: 0.9 });
    g.ellipse(tx + flicker2 * 0.5, ty - 10, 1.5, 3).fill({ color: 0xffaa44, alpha: 0.95 });
    g.ellipse(tx, ty - 10.5, 0.8, 1.5).fill({ color: 0xffee88, alpha: 1.0 });
  }

  private _drawMoss(g: Graphics, px: number, py: number, h: number): void {
    const mx = px + (h * 100 % 20) + 2;
    const my = py + (h * 200 % 20) + 2;
    g.circle(mx, my, 3).fill({ color: 0x335522, alpha: 0.4 });
    g.circle(mx + 3, my + 1, 2).fill({ color: 0x446633, alpha: 0.35 });
    g.circle(mx - 1, my + 2, 2.5).fill({ color: 0x2a4a1a, alpha: 0.3 });
  }

  private _drawPuddle(g: Graphics, px: number, py: number, h: number): void {
    const wx = px + 8 + (h * 300 % 12);
    const wy = py + 10 + (h * 400 % 10);
    const shimmer = 0.3 + 0.1 * Math.sin(_globalTime * 2 + h * 20);
    g.ellipse(wx, wy, 5, 3).fill({ color: 0x334466, alpha: shimmer });
    g.ellipse(wx - 1, wy - 0.5, 2, 1).fill({ color: 0x556688, alpha: shimmer * 0.7 });
  }

  private _drawBloodStain(g: Graphics, px: number, py: number, h: number): void {
    const bx = px + 8 + (h * 500 % 14);
    const by = py + 8 + (h * 600 % 14);
    g.circle(bx, by, 3).fill({ color: 0x551111, alpha: 0.35 });
    g.circle(bx + 2, by + 2, 2).fill({ color: 0x441010, alpha: 0.25 });
    g.circle(bx - 1, by + 3, 1.5).fill({ color: 0x661515, alpha: 0.2 });
  }

  private _drawRubble(g: Graphics, px: number, py: number, h: number, wallColor: number): void {
    const rx = px + 6 + (h * 700 % 18);
    const ry = py + 16 + (h * 800 % 10);
    const col = darken(wallColor, 0.1);
    g.rect(rx, ry, 3, 2).fill({ color: col, alpha: 0.5 });
    g.rect(rx - 3, ry + 1, 2, 2).fill({ color: darken(col, 0.1), alpha: 0.4 });
    g.circle(rx + 4, ry + 1, 1.5).fill({ color: lighten(col, 0.1), alpha: 0.4 });
  }

  private _drawCobweb(g: Graphics, px: number, py: number, _h: number): void {
    // Simple cobweb in top-left corner
    const alpha = 0.2;
    const col = 0xcccccc;
    g.moveTo(px, py).lineTo(px + 10, py + 10).stroke({ color: col, width: 0.5, alpha });
    g.moveTo(px, py + 5).lineTo(px + 8, py + 8).stroke({ color: col, width: 0.5, alpha: alpha * 0.8 });
    g.moveTo(px + 5, py).lineTo(px + 8, py + 8).stroke({ color: col, width: 0.5, alpha: alpha * 0.8 });
    // Cross strand
    g.moveTo(px + 2, py + 4).lineTo(px + 7, py + 3).stroke({ color: col, width: 0.5, alpha: alpha * 0.6 });
  }

  private _drawPillar(g: Graphics, px: number, py: number, wallColor: number): void {
    const cx = px + TS / 2;
    const cy = py + TS / 2;
    // Base
    g.rect(cx - 5, cy + 4, 10, 4).fill({ color: darken(wallColor, 0.1) });
    // Shaft
    g.rect(cx - 4, cy - 6, 8, 14).fill({ color: lighten(wallColor, 0.1) });
    // Highlight
    g.rect(cx - 2, cy - 6, 2, 14).fill({ color: lighten(wallColor, 0.25), alpha: 0.5 });
    // Capital
    g.rect(cx - 5, cy - 8, 10, 3).fill({ color: lighten(wallColor, 0.05) });
  }

  private _hasAdjacentWall(floor: FloorState, r: number, c: number): boolean {
    const dirs = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < floor.height && nc >= 0 && nc < floor.width) {
        if (floor.tiles[nr][nc] === TileType.WALL) return true;
      }
    }
    return false;
  }

  private _isCornerNearWall(floor: FloorState, r: number, c: number): boolean {
    // Check if wall is diagonally adjacent
    const diags = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    for (const [dr, dc] of diags) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < floor.height && nc >= 0 && nc < floor.width) {
        if (floor.tiles[nr][nc] === TileType.WALL) return true;
      }
    }
    return false;
  }

  // -------------------------------------------------------------------------
  // LIGHTING — player radial light, torch glow, boss/treasure room ambience
  // -------------------------------------------------------------------------
  private _drawLighting(floor: FloorState, player: PlayerState, sw: number, sh: number): void {
    const g = this._lightGfx;
    g.clear();

    // Darken the whole visible area first (ambient darkness overlay)
    // Abyssal Halls: darkness grows over time, making everything gloomier
    const abyssalDarknessBoost = floor.darknessTimer > 0 ? Math.min(0.3, floor.darknessTimer * 0.005) : 0;
    const darkAlpha = 0.35 + abyssalDarknessBoost;
    const startCol = Math.max(0, Math.floor(this.camX / TS) - 2);
    const startRow = Math.max(0, Math.floor(this.camY / TS) - 2);
    const endCol = Math.min(floor.width, Math.ceil((this.camX + sw) / TS) + 2);
    const endRow = Math.min(floor.height, Math.ceil((this.camY + sh) / TS) + 2);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (!floor.explored[r][c]) continue;
        const tile = floor.tiles[r][c];
        if (tile === TileType.WALL) continue;

        const px = c * TS + TS / 2;
        const py = r * TS + TS / 2;

        // Distance from player
        const dx = px - player.x;
        const dy = py - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Player light radius (~6 tiles, shrinks in Abyssal Halls)
        const baseRadius = 6;
        const darknessReduction = floor.darknessTimer ? Math.min(3.5, floor.darknessTimer * 0.03) : 0;
        const lightRadius = TS * Math.max(2, baseRadius - darknessReduction);
        let lightAmount = Math.max(0, 1 - dist / lightRadius);
        lightAmount = lightAmount * lightAmount; // Quadratic falloff

        // Torch contributions
        let torchLight = 0;
        // Check nearby tiles for torches
        for (let tr = r - 3; tr <= r + 3; tr++) {
          for (let tc = c - 3; tc <= c + 3; tc++) {
            if (tr < 0 || tr >= floor.height || tc < 0 || tc >= floor.width) continue;
            if (floor.tiles[tr][tc] === TileType.WALL && tileHash(tr, tc, 42) > 0.85) {
              const hasFloorBelow = tr + 1 < floor.height &&
                (floor.tiles[tr + 1][tc] === TileType.FLOOR || floor.tiles[tr + 1][tc] === TileType.CORRIDOR);
              if (hasFloorBelow) {
                const tdx = px - (tc * TS + TS / 2);
                const tdy = py - (tr * TS + TS);
                const tdist = Math.sqrt(tdx * tdx + tdy * tdy);
                const flicker = 0.8 + 0.2 * Math.sin(_globalTime * 6 + tc * 3 + tr * 7);
                torchLight += Math.max(0, 1 - tdist / (TS * 3.5)) * flicker * 0.4;
              }
            }
          }
        }

        // Treasure room glow
        let treasureGlow = 0;
        if (tile === TileType.TREASURE || (tile === TileType.FLOOR && tileHash(r, c, 99) > 0.97)) {
          treasureGlow = 0.1;
        }

        const totalLight = Math.min(1, lightAmount + torchLight + treasureGlow);
        const darknessAlpha = darkAlpha * (1 - totalLight);

        if (darknessAlpha > 0.01) {
          g.rect(c * TS, r * TS, TS, TS).fill({ color: 0x000011, alpha: darknessAlpha });
        }
      }
    }

    // Boss room ominous glow: find bosses and add colored light
    for (const enemy of floor.enemies) {
      if (!enemy.alive || !enemy.def.isBoss) continue;
      const ec = Math.floor(enemy.x / TS);
      const er = Math.floor(enemy.y / TS);
      if (ec < 0 || ec >= floor.width || er < 0 || er >= floor.height) continue;
      if (!floor.explored[er][ec]) continue;
      const pulse = 0.4 + 0.2 * Math.sin(_globalTime * 1.5);
      g.circle(enemy.x, enemy.y, TS * 4).fill({ color: enemy.def.color, alpha: 0.04 * pulse });
      g.circle(enemy.x, enemy.y, TS * 2.5).fill({ color: enemy.def.color, alpha: 0.06 * pulse });
    }
  }

  // -------------------------------------------------------------------------
  // ENTITIES — detailed player and enemy rendering
  // -------------------------------------------------------------------------
  private _drawEntities(state: GrailGameState): void {
    const g = this._entityGfx;
    g.clear();

    const player = state.player;
    const floor = state.floor;

    // Draw enemies
    for (const enemy of floor.enemies) {
      if (!enemy.alive) continue;
      const ec = Math.floor(enemy.x / TS);
      const er = Math.floor(enemy.y / TS);
      if (ec < 0 || ec >= floor.width || er < 0 || er >= floor.height) continue;
      if (!floor.explored[er][ec]) continue;

      this._drawEnemy(g, enemy);
    }

    // Draw player on top
    this._drawPlayer(g, player);
  }

  // --- Detailed player character ---
  private _drawPlayer(g: Graphics, player: PlayerState): void {
    const px = player.x;
    const py = player.y;
    const facing = player.facing;
    const fx = dirX(facing);
    const fy = dirY(facing);
    const bodyColor = player.knightDef.color;

    // Animation phase
    const walkPhase = player.isMoving ? Math.sin(_globalTime * 10) : 0;
    const bobY = player.isMoving ? Math.abs(Math.sin(_globalTime * 10)) * 1.5 : 0;
    const breathe = Math.sin(_globalTime * 2.5) * 0.5; // Idle breathing

    // Ground glow (knight color underfoot)
    g.circle(px, py + 10, 10).fill({ color: bodyColor, alpha: 0.06 + 0.02 * Math.sin(_globalTime * 3) });

    // Shadow (perspective-corrected)
    g.ellipse(px, py + 11, 9, 3.5).fill({ color: 0x000000, alpha: 0.4 });
    g.ellipse(px, py + 11, 6, 2).fill({ color: 0x000000, alpha: 0.15 });

    // Cape/cloak (behind body, flowing with movement and wind)
    const capeWave = Math.sin(_globalTime * 3) * 1.5;
    const capeWave2 = Math.sin(_globalTime * 4.3 + 1) * 1;
    const capeColor = darken(bodyColor, 0.35);
    const capeHighlight = darken(bodyColor, 0.2);
    if (facing === Direction.UP || facing === Direction.LEFT || facing === Direction.RIGHT) {
      // Outer cape
      g.moveTo(px - 6, py - 3 - bobY)
        .lineTo(px + 6, py - 3 - bobY)
        .lineTo(px + 5 + capeWave, py + 10)
        .lineTo(px + 2 + capeWave2, py + 12)
        .lineTo(px - 2 + capeWave, py + 12)
        .lineTo(px - 5 + capeWave2, py + 10)
        .closePath()
        .fill({ color: capeColor, alpha: 0.75 });
      // Cape inner fold
      g.moveTo(px - 2, py - 1 - bobY)
        .lineTo(px + 2, py - 1 - bobY)
        .lineTo(px + 1 + capeWave * 0.5, py + 9)
        .lineTo(px - 1 + capeWave2 * 0.5, py + 9)
        .closePath()
        .fill({ color: capeHighlight, alpha: 0.25 });
      // Cape clasp
      g.circle(px, py - 3 - bobY, 1.5).fill({ color: 0xddaa33, alpha: 0.8 });
    }

    // Legs with armor detail
    const legSpread = walkPhase * 3;
    const legColor = darken(bodyColor, 0.2);
    const bootColor = 0x3a2a18;
    // Left leg
    g.rect(px - 4, py + 3 - bobY + legSpread, 3, 7).fill({ color: legColor });
    g.rect(px - 4, py + 3 - bobY + legSpread, 3, 1).fill({ color: lighten(legColor, 0.15), alpha: 0.4 }); // knee guard
    // Right leg
    g.rect(px + 1, py + 3 - bobY - legSpread, 3, 7).fill({ color: legColor });
    g.rect(px + 1, py + 3 - bobY - legSpread, 3, 1).fill({ color: lighten(legColor, 0.15), alpha: 0.4 });
    // Boots with soles
    g.rect(px - 5, py + 9 - bobY + legSpread, 5, 3).fill({ color: bootColor });
    g.rect(px - 5, py + 11 - bobY + legSpread, 5, 1).fill({ color: 0x221100 }); // sole
    g.rect(px, py + 9 - bobY - legSpread, 5, 3).fill({ color: bootColor });
    g.rect(px, py + 11 - bobY - legSpread, 5, 1).fill({ color: 0x221100 }); // sole

    // Body / torso with depth
    g.rect(px - 5, py - 5 - bobY - breathe, 10, 10).fill({ color: bodyColor });
    // Torso center line (surcoat detail)
    g.rect(px - 0.5, py - 4 - bobY - breathe, 1, 8).fill({ color: darken(bodyColor, 0.1), alpha: 0.3 });
    // Belt
    g.rect(px - 5, py + 3 - bobY - breathe, 10, 2).fill({ color: 0x553311 });
    g.circle(px, py + 4 - bobY - breathe, 1.2).fill({ color: 0xccaa44 }); // buckle

    // Armor overlay with more detail
    if (player.equippedArmor) {
      const armorId = player.equippedArmor.id;
      const ac = player.equippedArmor.color;
      if (armorId.includes("plate") || armorId.includes("avalon")) {
        // Plate armor: segmented chest with highlights
        g.rect(px - 5, py - 5 - bobY - breathe, 10, 10).fill({ color: ac, alpha: 0.5 });
        g.rect(px - 5, py - 1 - bobY - breathe, 10, 1).fill({ color: darken(ac, 0.2), alpha: 0.4 });
        g.rect(px - 5, py + 2 - bobY - breathe, 10, 1).fill({ color: darken(ac, 0.2), alpha: 0.4 });
        // Chest plate highlight
        g.rect(px - 3, py - 4 - bobY - breathe, 2, 3).fill({ color: lighten(ac, 0.3), alpha: 0.2 });
        // Shoulder plates with rivets
        g.rect(px - 8, py - 6 - bobY - breathe, 4, 5).fill({ color: ac, alpha: 0.65 });
        g.rect(px + 4, py - 6 - bobY - breathe, 4, 5).fill({ color: ac, alpha: 0.65 });
        g.circle(px - 6, py - 4 - bobY - breathe, 0.7).fill({ color: 0xcccc88, alpha: 0.5 }); // rivet
        g.circle(px + 6, py - 4 - bobY - breathe, 0.7).fill({ color: 0xcccc88, alpha: 0.5 }); // rivet
        // Gorget (neck guard)
        g.rect(px - 4, py - 6 - bobY - breathe, 8, 2).fill({ color: ac, alpha: 0.4 });
      } else if (armorId.includes("chain")) {
        // Chainmail: crosshatch pattern overlay
        g.rect(px - 5, py - 5 - bobY - breathe, 10, 10).fill({ color: ac, alpha: 0.3 });
        for (let i = 0; i < 5; i++) {
          g.rect(px - 4, py - 4 + i * 2.5 - bobY - breathe, 8, 0.8).fill({ color: 0x999999, alpha: 0.25 });
        }
        // Chain coif hint
        g.rect(px - 4, py - 6 - bobY - breathe, 8, 2).fill({ color: 0x888888, alpha: 0.2 });
      } else {
        // Leather / robes with texture
        g.rect(px - 5, py - 5 - bobY - breathe, 10, 10).fill({ color: ac, alpha: 0.25 });
        // Lacing detail
        for (let i = 0; i < 3; i++) {
          g.circle(px, py - 3 + i * 3 - bobY - breathe, 0.5).fill({ color: darken(ac, 0.3), alpha: 0.3 });
        }
      }
    }

    // Arms with elbow joints
    const armSwing = player.isMoving ? walkPhase * 2.5 : 0;
    const armColor = darken(bodyColor, 0.1);
    // Left arm (upper + forearm)
    g.rect(px - 8, py - 4 - bobY - armSwing - breathe, 3, 5).fill({ color: armColor });
    g.rect(px - 8, py + 1 - bobY - armSwing - breathe, 3, 4).fill({ color: darken(armColor, 0.05) });
    g.circle(px - 8, py + 5 - bobY - armSwing - breathe, 1.5).fill({ color: 0xddbb88 }); // hand
    // Right arm (weapon arm)
    g.rect(px + 5, py - 4 - bobY + armSwing - breathe, 3, 5).fill({ color: armColor });
    g.rect(px + 5, py + 1 - bobY + armSwing - breathe, 3, 4).fill({ color: darken(armColor, 0.05) });
    g.circle(px + 8, py + 5 - bobY + armSwing - breathe, 1.5).fill({ color: 0xddbb88 }); // hand

    // Gauntlet detail on arms if plate
    if (player.equippedArmor && (player.equippedArmor.id.includes("plate") || player.equippedArmor.id.includes("avalon"))) {
      g.rect(px - 8, py + 1 - bobY - armSwing - breathe, 3, 3).fill({ color: player.equippedArmor.color, alpha: 0.4 });
      g.rect(px + 5, py + 1 - bobY + armSwing - breathe, 3, 3).fill({ color: player.equippedArmor.color, alpha: 0.4 });
    }

    // Head with more detail
    const headColor = 0xddbb88;
    g.circle(px, py - 8 - bobY - breathe, 5).fill({ color: headColor });
    // Neck
    g.rect(px - 2, py - 5 - bobY - breathe, 4, 2).fill({ color: darken(headColor, 0.05) });

    // Helmet (detailed)
    const helmColor = lighten(bodyColor, 0.1);
    const helmLight = lighten(bodyColor, 0.25);
    g.rect(px - 5, py - 13 - bobY - breathe, 10, 6).fill({ color: helmColor });
    g.rect(px - 6, py - 9 - bobY - breathe, 12, 2.5).fill({ color: helmLight }); // Brim
    // Helmet dome highlight
    g.rect(px - 2, py - 13 - bobY - breathe, 4, 2).fill({ color: helmLight, alpha: 0.3 });
    // Helmet crest/plume
    g.rect(px - 1, py - 15 - bobY - breathe, 2, 3).fill({ color: darken(bodyColor, 0.1) });
    const plumeWave = Math.sin(_globalTime * 4) * 1;
    g.moveTo(px, py - 15 - bobY - breathe)
      .lineTo(px - 1 + plumeWave, py - 19 - bobY - breathe)
      .lineTo(px + 2 + plumeWave, py - 18 - bobY - breathe)
      .lineTo(px + 1, py - 15 - bobY - breathe)
      .closePath()
      .fill({ color: bodyColor, alpha: 0.7 });
    // Visor/face
    if (facing === Direction.DOWN) {
      g.rect(px - 3, py - 8 - bobY - breathe, 6, 1.5).fill({ color: 0x111111, alpha: 0.75 });
      // Eye glint
      g.circle(px - 1.5, py - 7.5 - bobY - breathe, 0.5).fill({ color: 0xffffff, alpha: 0.3 });
      g.circle(px + 1.5, py - 7.5 - bobY - breathe, 0.5).fill({ color: 0xffffff, alpha: 0.3 });
    } else if (facing === Direction.UP) {
      g.rect(px - 4, py - 12 - bobY - breathe, 8, 5).fill({ color: darken(bodyColor, 0.1) });
    } else {
      // Side profile visor
      const side = facing === Direction.LEFT ? -1 : 1;
      g.rect(px + side * 2, py - 8 - bobY - breathe, 3, 1.5).fill({ color: 0x111111, alpha: 0.6 });
    }

    // Weapon
    if (player.equippedWeapon) {
      this._drawPlayerWeapon(g, px, py - bobY - breathe, facing, player);
    } else {
      const wx = px + fx * 10 + (facing === Direction.UP || facing === Direction.DOWN ? 6 : 0);
      const wy = py + fy * 10 - bobY - breathe - 2;
      g.rect(wx - 1, wy - 6, 2, 12).fill({ color: 0xbbbbbb });
      g.rect(wx - 1, wy - 6, 2, 1).fill({ color: 0xeeeedd, alpha: 0.5 }); // blade tip highlight
      g.rect(wx - 3, wy + 1, 6, 2).fill({ color: 0x886622 });
      g.rect(wx - 1, wy + 3, 2, 3).fill({ color: 0x553311 });
    }

    // HP bar with gradient and border
    const barW = 26;
    const barH = 3;
    const bx = px - barW / 2;
    const by = py - 22 - bobY - breathe;
    g.rect(bx - 1, by - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.6 });
    g.rect(bx, by, barW, barH).fill({ color: 0x220000 });
    const hpRatio = player.hp / player.maxHp;
    const hpColor = hpRatio > 0.5 ? 0x22ff22 : hpRatio > 0.25 ? 0xffaa22 : 0xff2222;
    const hpHighlight = hpRatio > 0.5 ? 0x88ff88 : hpRatio > 0.25 ? 0xffdd66 : 0xff6644;
    g.rect(bx, by, barW * hpRatio, barH).fill({ color: hpColor });
    g.rect(bx, by, barW * hpRatio, 1).fill({ color: hpHighlight, alpha: 0.3 }); // top highlight
    // Low HP pulsing border
    if (hpRatio <= 0.25 && hpRatio > 0) {
      const pulse = Math.sin(_globalTime * 6) * 0.3 + 0.3;
      g.rect(bx - 2, by - 2, barW + 4, barH + 4).stroke({ color: 0xff2222, width: 1, alpha: pulse });
    }

    // Invulnerability shield with hexagonal facets
    if (player.statusEffects.some((e) => e.id === "invulnerable")) {
      const shieldPulse = 0.4 + 0.3 * Math.sin(_globalTime * 5);
      g.circle(px, py - bobY - breathe, 17).stroke({ color: 0xffd700, width: 2, alpha: shieldPulse });
      g.circle(px, py - bobY - breathe, 15).stroke({ color: 0xffffaa, width: 1, alpha: shieldPulse * 0.5 });
      // Hexagonal facets
      for (let i = 0; i < 6; i++) {
        const ang = (i / 6) * Math.PI * 2 + _globalTime * 0.5;
        const hx = px + Math.cos(ang) * 14;
        const hy = py - bobY - breathe + Math.sin(ang) * 14;
        g.rect(hx - 1.5, hy - 1.5, 3, 3).fill({ color: 0xffd700, alpha: shieldPulse * 0.4 });
      }
    }

    // Buff ATK indicator (red glow on arms)
    if (player.statusEffects.some((e) => e.id === "buff_atk")) {
      const buffPulse = 0.2 + 0.15 * Math.sin(_globalTime * 4);
      g.circle(px + 6, py - bobY - breathe, 5).fill({ color: 0xff4400, alpha: buffPulse });
      g.circle(px - 6, py - bobY - breathe, 5).fill({ color: 0xff4400, alpha: buffPulse });
    }

    // Status effect visuals on player
    for (const se of player.statusEffects) {
      this._drawStatusEffectOnEntity(g, px, py - bobY - breathe, se.id);
    }
  }

  private _drawPlayerWeapon(g: Graphics, px: number, py: number, facing: Direction, player: PlayerState): void {
    const weapon = player.equippedWeapon!;
    const weaponId = weapon.id;
    const wColor = weapon.color;
    const fx = dirX(facing);
    const fy = dirY(facing);
    const isLegendary = weapon.rarity === "legendary";
    const isRare = weapon.rarity === "rare" || isLegendary;

    // Attack animation (brief swing)
    const swingPhase = player.attackCooldown > 0
      ? Math.sin((player.attackCooldown / GameBalance.ATTACK_COOLDOWN_MS) * Math.PI) * 0.8
      : 0;

    if (weaponId.includes("staff") || weaponId === "merlin_staff") {
      // Staff — detailed wood shaft with carved runes, ornate head, glowing orb
      const side = facing === Direction.LEFT ? -1 : 1;
      const sx = px + side * 8;
      const sy = py - 6;
      const staffSwing = swingPhase * side * 3;

      // Staff shadow
      g.ellipse(sx + staffSwing, py + 10, 3, 1.5).fill({ color: 0x000000, alpha: 0.2 });

      // Shaft (tapered, lighter center grain)
      g.rect(sx - 1.5 + staffSwing, sy - 8, 3, 20).fill({ color: 0x664422 });
      g.rect(sx - 0.5 + staffSwing, sy - 7, 1, 18).fill({ color: 0x7a5533, alpha: 0.5 }); // wood grain highlight

      // Carved rune marks on shaft
      for (let i = 0; i < 3; i++) {
        const ry = sy + 2 + i * 5;
        const runeGlow = 0.2 + 0.15 * Math.sin(_globalTime * 3 + i * 2);
        g.rect(sx - 1 + staffSwing, ry, 2, 1.5).fill({ color: wColor, alpha: runeGlow });
      }

      // Staff head — ornate prongs holding orb
      const headY = sy - 9;
      // Left prong
      g.moveTo(sx - 1.5 + staffSwing, headY + 2).lineTo(sx - 3 + staffSwing, headY - 3).lineTo(sx - 1 + staffSwing, headY - 1).closePath().fill({ color: 0x886633 });
      // Right prong
      g.moveTo(sx + 1.5 + staffSwing, headY + 2).lineTo(sx + 3 + staffSwing, headY - 3).lineTo(sx + 1 + staffSwing, headY - 1).closePath().fill({ color: 0x886633 });

      // Orb with layered glow
      const orbPulse = 0.5 + 0.5 * Math.sin(_globalTime * 4);
      const orbY = headY - 2;
      g.circle(sx + staffSwing, orbY, 7).fill({ color: wColor, alpha: 0.06 + orbPulse * 0.06 }); // Outer glow
      g.circle(sx + staffSwing, orbY, 5).fill({ color: wColor, alpha: 0.12 + orbPulse * 0.1 }); // Mid glow
      g.circle(sx + staffSwing, orbY, 3).fill({ color: wColor, alpha: 0.7 + orbPulse * 0.3 }); // Orb body
      g.circle(sx + staffSwing, orbY, 1.8).fill({ color: lighten(wColor, 0.4), alpha: 0.8 }); // Inner bright
      // Specular highlight
      g.circle(sx - 1 + staffSwing, orbY - 1, 0.8).fill({ color: 0xffffff, alpha: 0.6 });

      // Orbiting energy wisps
      for (let i = 0; i < 3; i++) {
        const wa = _globalTime * 3 + i * (Math.PI * 2 / 3);
        const wx = sx + staffSwing + Math.cos(wa) * 5;
        const wy = orbY + Math.sin(wa) * 3;
        g.circle(wx, wy, 0.8).fill({ color: lighten(wColor, 0.3), alpha: 0.4 + 0.2 * Math.sin(wa * 2) });
      }

      // Legendary staff: trailing energy particles
      if (isLegendary) {
        for (let i = 0; i < 4; i++) {
          const pa = _globalTime * 2 + i * 1.5;
          const ppx = sx + staffSwing + Math.sin(pa) * 8;
          const ppy = orbY + Math.cos(pa * 0.7) * 6 - i * 2;
          g.circle(ppx, ppy, 1).fill({ color: wColor, alpha: 0.25 - i * 0.05 });
        }
      }

      // Butt cap
      g.rect(sx - 2 + staffSwing, sy + 11, 4, 2).fill({ color: 0x888866 });

    } else {
      // Sword / blade — detailed with fuller, edge highlights, pommel, guard detail
      const baseX = px + fx * 8 + (fy !== 0 ? 6 : 0);
      const baseY = py + fy * 8 - 2;

      const swingOffX = facing === Direction.LEFT ? -swingPhase * 6 : swingPhase * 6;
      const swingOffY = Math.abs(fy) > 0 ? swingPhase * 4 : 0;
      const bx = baseX + swingOffX;
      const by = baseY + swingOffY;

      const bladeLight = lighten(wColor, 0.3);
      const bladeDark = darken(wColor, 0.15);
      const guardColor = isRare ? 0xccaa33 : 0x886622;
      const guardLight = lighten(guardColor, 0.2);
      const handleColor = 0x553311;
      const handleWrap = isRare ? 0x664422 : 0x442211;
      const pommelColor = isRare ? 0xddbb44 : 0x777755;

      if (Math.abs(fy) > 0) {
        // Vertical orientation (facing up/down)
        // Blade body
        g.moveTo(bx - 1.5, by + 2).lineTo(bx, by - 10).lineTo(bx + 1.5, by + 2).closePath().fill({ color: wColor });
        // Blade edge highlights
        g.moveTo(bx - 1, by + 1).lineTo(bx, by - 9).stroke({ color: bladeLight, width: 0.5, alpha: 0.5 });
        // Fuller (groove down center)
        g.moveTo(bx, by - 7).lineTo(bx, by + 0).stroke({ color: bladeDark, width: 0.7, alpha: 0.4 });
        // Blade tip glint
        g.circle(bx, by - 9.5, 0.7).fill({ color: 0xffffff, alpha: 0.5 });

        // Crossguard
        g.rect(bx - 4, by + 1.5, 8, 2.5).fill({ color: guardColor });
        g.rect(bx - 4, by + 1.5, 8, 0.8).fill({ color: guardLight, alpha: 0.4 }); // top highlight
        // Guard terminals (curled ends)
        g.circle(bx - 4, by + 2.5, 1.2).fill({ color: guardColor });
        g.circle(bx + 4, by + 2.5, 1.2).fill({ color: guardColor });

        // Handle with leather wrap pattern
        g.rect(bx - 1, by + 4, 2, 4).fill({ color: handleColor });
        for (let i = 0; i < 3; i++) {
          g.rect(bx - 1.2, by + 4.5 + i * 1.2, 2.4, 0.6).fill({ color: handleWrap, alpha: 0.5 });
        }

        // Pommel
        g.circle(bx, by + 8.5, 1.5).fill({ color: pommelColor });
        g.circle(bx - 0.3, by + 8.2, 0.5).fill({ color: lighten(pommelColor, 0.3), alpha: 0.5 }); // specular

        // Rare gem in guard
        if (isRare) {
          g.circle(bx, by + 2.5, 1).fill({ color: wColor, alpha: 0.8 });
          g.circle(bx, by + 2.5, 0.4).fill({ color: 0xffffff, alpha: 0.5 });
        }
      } else {
        // Horizontal orientation (facing left/right)
        const dir = facing === Direction.LEFT ? -1 : 1;
        // Blade body (tapered)
        g.moveTo(bx - dir * 2, by - 1.5).lineTo(bx + dir * 10, by).lineTo(bx - dir * 2, by + 1.5).closePath().fill({ color: wColor });
        // Edge highlight
        g.moveTo(bx - dir * 1, by - 1).lineTo(bx + dir * 9, by).stroke({ color: bladeLight, width: 0.5, alpha: 0.5 });
        // Fuller
        g.moveTo(bx + dir * 1, by).lineTo(bx + dir * 7, by).stroke({ color: bladeDark, width: 0.7, alpha: 0.4 });
        // Tip glint
        g.circle(bx + dir * 9.5, by, 0.7).fill({ color: 0xffffff, alpha: 0.5 });

        // Crossguard
        g.rect(bx - dir * 2.5, by - 4, 2.5, 8).fill({ color: guardColor });
        // Guard terminals
        g.circle(bx - dir * 1.5, by - 4, 1.2).fill({ color: guardColor });
        g.circle(bx - dir * 1.5, by + 4, 1.2).fill({ color: guardColor });

        // Handle
        g.rect(bx - dir * 5, by - 1, 3, 2).fill({ color: handleColor });
        for (let i = 0; i < 2; i++) {
          g.rect(bx - dir * 4.5 + i * 1.2 * -dir, by - 1.2, 0.6, 2.4).fill({ color: handleWrap, alpha: 0.5 });
        }

        // Pommel
        g.circle(bx - dir * 6, by, 1.5).fill({ color: pommelColor });

        // Rare gem
        if (isRare) {
          g.circle(bx - dir * 1.5, by, 1).fill({ color: wColor, alpha: 0.8 });
        }
      }

      // Attack slash arc (enhanced with speed lines)
      if (swingPhase > 0.1) {
        const arcAlpha = swingPhase * 0.5;
        // Main slash arc
        g.moveTo(bx + fx * 4, by + fy * 4 - 6)
          .lineTo(bx + fx * 14, by + fy * 14)
          .lineTo(bx + fx * 4, by + fy * 4 + 6)
          .closePath()
          .fill({ color: 0xffffff, alpha: arcAlpha });
        // Speed lines
        for (let i = 0; i < 3; i++) {
          const angle = Math.atan2(fy, fx) + (i - 1) * 0.3;
          const len = 8 + i * 4;
          g.moveTo(bx + Math.cos(angle) * 6, by + Math.sin(angle) * 6)
            .lineTo(bx + Math.cos(angle) * len, by + Math.sin(angle) * len)
            .stroke({ color: 0xffffff, width: 1, alpha: arcAlpha * 0.4 });
        }
      }

      // Legendary weapon glow + trailing particles
      if (isLegendary) {
        const glowPulse = 0.3 + 0.2 * Math.sin(_globalTime * 5);
        g.circle(bx, by - 4, 8).fill({ color: wColor, alpha: glowPulse * 0.2 });
        g.circle(bx, by - 4, 5).fill({ color: wColor, alpha: glowPulse * 0.15 });
        // Blade edge glow
        if (Math.abs(fy) > 0) {
          g.rect(bx - 2, by - 8, 4, 10).fill({ color: wColor, alpha: glowPulse * 0.1 });
        } else {
          const dir = facing === Direction.LEFT ? -1 : 1;
          g.rect(bx, by - 2, dir * 10, 4).fill({ color: wColor, alpha: glowPulse * 0.1 });
        }
      }
    }
  }

  // --- Detailed enemy rendering by category ---
  private _drawEnemy(g: Graphics, enemy: EnemyInstance): void {
    const ex = enemy.x;
    const ey = enemy.y;
    const cat = enemy.def.category;
    const isBoss = !!enemy.def.isBoss;
    const color = enemy.def.color;
    const size = isBoss ? 14 : 8;

    // Shadow
    g.ellipse(ex, ey + size + 2, size * 0.8, size * 0.25).fill({ color: 0x000000, alpha: 0.3 });

    // Boss aura (changes with phase)
    if (isBoss) {
      const auraPulse = 0.3 + 0.2 * Math.sin(_globalTime * 2);
      let auraColor = color;
      let auraIntensity = 1;
      if (enemy.bossEnraged) {
        auraColor = 0xff2200;
        auraIntensity = 1.5;
      } else if (enemy.bossPhase >= 2) {
        auraColor = 0xff4400;
        auraIntensity = 1.3;
      } else if (enemy.bossPhase >= 1) {
        auraColor = lighten(color, 0.2);
        auraIntensity = 1.15;
      }
      g.circle(ex, ey, size + 8).fill({ color: auraColor, alpha: (0.05 + auraPulse * 0.04) * auraIntensity });
      g.circle(ex, ey, size + 4).fill({ color: auraColor, alpha: (0.08 + auraPulse * 0.06) * auraIntensity });
      // Rally buff indicator
      if (enemy.rallyDamageBuff > 0) {
        g.circle(ex, ey, size + 6).stroke({ color: 0xff8800, width: 1, alpha: 0.4 + 0.2 * Math.sin(_globalTime * 4) });
      }
    }
    // Rally buff for non-bosses
    if (!isBoss && enemy.rallyDamageBuff > 0) {
      g.circle(ex, ey, size + 4).stroke({ color: 0xff8800, width: 1, alpha: 0.3 + 0.15 * Math.sin(_globalTime * 4) });
    }

    switch (cat) {
      case EnemyCategory.BANDIT:
        this._drawBanditEnemy(g, ex, ey, size, color, isBoss);
        break;
      case EnemyCategory.UNDEAD:
        this._drawUndeadEnemy(g, ex, ey, size, color, isBoss);
        break;
      case EnemyCategory.BEAST:
        this._drawBeastEnemy(g, ex, ey, size, color, enemy.def.id, isBoss);
        break;
      case EnemyCategory.FAE:
        this._drawFaeEnemy(g, ex, ey, size, color, isBoss);
        break;
      case EnemyCategory.KNIGHT:
        this._drawKnightEnemy(g, ex, ey, size, color, isBoss);
        break;
      case EnemyCategory.DEMON:
        this._drawDemonEnemy(g, ex, ey, size, color, isBoss);
        break;
      case EnemyCategory.ELEMENTAL:
        this._drawElementalEnemy(g, ex, ey, size, color, enemy.def.id, isBoss);
        break;
      case EnemyCategory.BOSS:
        // Generic boss — draw based on boss id hints
        this._drawGenericBoss(g, ex, ey, size, color, enemy.def.id);
        break;
      default:
        // Fallback
        g.circle(ex, ey, size).fill({ color });
        break;
    }

    // HP bar
    if (enemy.hp < enemy.maxHp) {
      const barW = size * 2.5;
      const barH = 3;
      const bx = ex - barW / 2;
      const by = ey - size - 8;
      g.rect(bx - 1, by - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.5 });
      g.rect(bx, by, barW, barH).fill({ color: 0x440000 });
      g.rect(bx, by, barW * (enemy.hp / enemy.maxHp), barH).fill({ color: isBoss ? 0xff6600 : 0xff2222 });
    }

    // Boss crown/indicator
    if (isBoss) {
      const crownY = ey - size - 12;
      // Crown
      g.moveTo(ex - 6, crownY + 4)
        .lineTo(ex - 6, crownY)
        .lineTo(ex - 3, crownY + 2)
        .lineTo(ex, crownY - 1)
        .lineTo(ex + 3, crownY + 2)
        .lineTo(ex + 6, crownY)
        .lineTo(ex + 6, crownY + 4)
        .closePath()
        .fill({ color: 0xffd700 });
      // Jewels on crown
      g.circle(ex, crownY, 1.5).fill({ color: 0xff2222 });
    }

    // Stun indicator (orbiting stars)
    if (enemy.stunTurns > 0) {
      for (let i = 0; i < 3; i++) {
        const angle = _globalTime * 4 + (i * Math.PI * 2) / 3;
        const sx = ex + Math.cos(angle) * (size + 4);
        const sy = ey - size - 4 + Math.sin(angle) * 3;
        drawStar(g, sx, sy, 4, 2.5, 1.2).fill({ color: 0xffff00, alpha: 0.8 });
      }
    }

    // Status effects
    for (const se of enemy.statusEffects) {
      this._drawStatusEffectOnEntity(g, ex, ey, se.id);
    }
  }

  // --- Bandit: humanoid with weapon ---
  private _drawBanditEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const breathe = Math.sin(_globalTime * 2.5 + x) * 0.4;
    const walkPhase = Math.sin(_globalTime * 4 + y) * 1.5;
    const skinColor = 0xcc9966;

    // Legs with boots (animated walk)
    const legSwing = walkPhase * sc;
    g.rect(x - 3 * sc, y + 4 * sc - legSwing, 2.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
    g.rect(x + 0.5 * sc, y + 4 * sc + legSwing, 2.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
    // Boots
    g.rect(x - 3.5 * sc, y + 8 * sc - legSwing, 3.5 * sc, 2 * sc).fill({ color: 0x443322 });
    g.rect(x + 0 * sc, y + 8 * sc + legSwing, 3.5 * sc, 2 * sc).fill({ color: 0x443322 });

    // Body (tunic)
    g.rect(x - 4 * sc, y - 4 * sc - breathe, 8 * sc, 9 * sc).fill({ color });
    // Belt
    g.rect(x - 4 * sc, y + 2 * sc - breathe, 8 * sc, 1.5 * sc).fill({ color: 0x553311 });
    g.circle(x, y + 2.8 * sc - breathe, 0.8).fill({ color: 0xccaa44 }); // buckle
    // Tunic collar / neckline
    g.moveTo(x - 2 * sc, y - 4 * sc - breathe).lineTo(x, y - 2 * sc - breathe).lineTo(x + 2 * sc, y - 4 * sc - breathe)
      .closePath().fill({ color: darken(color, 0.1) });

    // Arms (animated with weapon swipe)
    const armSwing = walkPhase * 0.5;
    g.rect(x - 6 * sc, y - 3 * sc - breathe - armSwing, 2.5 * sc, 7 * sc).fill({ color: darken(color, 0.08) });
    g.rect(x + 3.5 * sc, y - 3 * sc - breathe + armSwing, 2.5 * sc, 7 * sc).fill({ color: darken(color, 0.08) });
    // Hands
    g.circle(x - 5 * sc, y + 4 * sc - breathe - armSwing, 1.3 * sc).fill({ color: skinColor });
    g.circle(x + 5 * sc, y + 4 * sc - breathe + armSwing, 1.3 * sc).fill({ color: skinColor });

    // Head
    g.circle(x, y - 6 * sc - breathe, 3.5 * sc).fill({ color: skinColor });
    // Hood/bandana with folds
    g.rect(x - 3.5 * sc, y - 9.5 * sc - breathe, 7 * sc, 4 * sc).fill({ color: darken(color, 0.2) });
    g.moveTo(x - 3.5 * sc, y - 5.5 * sc - breathe).lineTo(x - 5 * sc, y - 4 * sc - breathe).lineTo(x - 3.5 * sc, y - 4 * sc - breathe)
      .closePath().fill({ color: darken(color, 0.25) }); // hood flap
    // Bandana knot at back
    g.circle(x + 3.5 * sc, y - 7 * sc - breathe, 1 * sc).fill({ color: darken(color, 0.15) });

    // Face: menacing eyes + scar
    g.rect(x - 2 * sc, y - 7 * sc - breathe, 1.5 * sc, 1.2).fill({ color: 0x000000 });
    g.rect(x + 0.5 * sc, y - 7 * sc - breathe, 1.5 * sc, 1.2).fill({ color: 0x000000 });
    // Glint in eyes
    g.circle(x - 1.3 * sc, y - 6.8 * sc - breathe, 0.3).fill({ color: 0xffffff, alpha: 0.4 });
    g.circle(x + 1.3 * sc, y - 6.8 * sc - breathe, 0.3).fill({ color: 0xffffff, alpha: 0.4 });
    // Scar (boss bandits)
    if (isBoss) {
      g.moveTo(x - 1 * sc, y - 8 * sc - breathe).lineTo(x + 1 * sc, y - 5.5 * sc - breathe)
        .stroke({ color: 0x993333, width: 0.8, alpha: 0.6 });
    }

    // Weapon (dagger with proper blade)
    const dagX = x + 5.5 * sc;
    const dagY = y - 2 * sc - breathe + armSwing;
    g.moveTo(dagX, dagY - 5 * sc).lineTo(dagX + 1, dagY + 3 * sc).lineTo(dagX - 1, dagY + 3 * sc).closePath().fill({ color: 0xbbbbbb });
    g.moveTo(dagX, dagY - 4 * sc).lineTo(dagX, dagY + 2 * sc).stroke({ color: 0xdddddd, width: 0.4, alpha: 0.4 }); // fuller
    g.rect(dagX - 2, dagY + 2.5 * sc, 4, 1.5).fill({ color: 0x886622 }); // guard
    g.rect(dagX - 0.8, dagY + 4 * sc, 1.6, 2.5 * sc).fill({ color: 0x553311 }); // handle

    // Boss: shoulder armor
    if (isBoss) {
      g.rect(x - 7 * sc, y - 4 * sc - breathe, 3 * sc, 3 * sc).fill({ color: 0x666666 });
      g.rect(x + 4 * sc, y - 4 * sc - breathe, 3 * sc, 3 * sc).fill({ color: 0x666666 });
      g.rect(x - 7 * sc, y - 4 * sc - breathe, 3 * sc, 0.8).fill({ color: 0x888888, alpha: 0.5 });
      g.rect(x + 4 * sc, y - 4 * sc - breathe, 3 * sc, 0.8).fill({ color: 0x888888, alpha: 0.5 });
    }
  }

  // --- Undead: skeletal/ghostly ---
  private _drawUndeadEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const ghostAlpha = 0.7 + 0.15 * Math.sin(_globalTime * 3 + x);
    const sway = Math.sin(_globalTime * 2 + x * 0.5) * 1.5;
    const isGhost = color < 0x888888; // darker = more ghostly

    // Soul energy dripping down
    for (let i = 0; i < 3; i++) {
      const dripT = (_globalTime * 1.5 + i * 0.7) % 2;
      const dripY = y + 8 * sc + dripT * 8;
      const dripAlpha = Math.max(0, ghostAlpha * 0.3 * (1 - dripT / 2));
      g.circle(x + (i - 1) * 3 * sc + sway, dripY, 1).fill({ color, alpha: dripAlpha });
    }

    // Ghostly body (wispy, swaying)
    g.ellipse(x + sway * 0.5, y, 5 * sc, 7 * sc).fill({ color, alpha: ghostAlpha });
    // Tattered robes / wispy bottom
    for (let i = -2; i <= 2; i++) {
      const wave = Math.sin(_globalTime * 4 + i + x) * 2.5;
      const tendrilAlpha = ghostAlpha * (0.35 + Math.abs(i) * 0.05);
      g.ellipse(x + i * 3 * sc + sway, y + 7 * sc + wave, 2.2 * sc, 3.5 * sc).fill({ color, alpha: tendrilAlpha });
      // Extra wisp tips
      g.ellipse(x + i * 3 * sc + sway + wave * 0.5, y + 10 * sc + wave, 1 * sc, 2 * sc)
        .fill({ color: lighten(color, 0.15), alpha: tendrilAlpha * 0.4 });
    }

    if (!isGhost) {
      // Skeleton: visible ribcage and spine
      // Spine
      g.rect(x - 0.5 + sway * 0.5, y - 4 * sc, 1, 8 * sc).fill({ color: 0xccccaa, alpha: ghostAlpha * 0.6 });
      // Ribs (curved)
      for (let i = 0; i < 4; i++) {
        const ribY = y - 2.5 * sc + i * 2.2 * sc;
        const ribW = 3 - Math.abs(i - 1.5) * 0.5;
        g.moveTo(x + sway * 0.5, ribY).lineTo(x - ribW * sc + sway * 0.5, ribY + 1)
          .stroke({ color: 0xccccaa, width: 0.8, alpha: ghostAlpha * 0.5 });
        g.moveTo(x + sway * 0.5, ribY).lineTo(x + ribW * sc + sway * 0.5, ribY + 1)
          .stroke({ color: 0xccccaa, width: 0.8, alpha: ghostAlpha * 0.5 });
      }
      // Arm bones
      g.moveTo(x - 4 * sc + sway * 0.5, y - 3 * sc).lineTo(x - 6 * sc + sway, y + 2 * sc)
        .stroke({ color: 0xccccaa, width: 1, alpha: ghostAlpha * 0.5 });
      g.moveTo(x + 4 * sc + sway * 0.5, y - 3 * sc).lineTo(x + 6 * sc + sway, y + 2 * sc)
        .stroke({ color: 0xccccaa, width: 1, alpha: ghostAlpha * 0.5 });
      // Bony hands
      g.circle(x - 6 * sc + sway, y + 2.5 * sc, 1.2).fill({ color: 0xbbbb99, alpha: ghostAlpha * 0.5 });
      g.circle(x + 6 * sc + sway, y + 2.5 * sc, 1.2).fill({ color: 0xbbbb99, alpha: ghostAlpha * 0.5 });
    }

    // Skull (detailed)
    const skullX = x + sway * 0.3;
    g.circle(skullX, y - 6 * sc, 4 * sc).fill({ color: 0xddddbb, alpha: ghostAlpha });
    // Cranium highlight
    g.circle(skullX - 0.5 * sc, y - 7.5 * sc, 2 * sc).fill({ color: 0xeeeedd, alpha: ghostAlpha * 0.2 });
    // Brow ridge
    g.rect(skullX - 3 * sc, y - 7.5 * sc, 6 * sc, 1 * sc).fill({ color: darken(0xddddbb, 0.1), alpha: ghostAlpha * 0.5 });
    // Eye sockets (deeper)
    g.circle(skullX - 1.5 * sc, y - 7 * sc, 1.6 * sc).fill({ color: 0x111111 });
    g.circle(skullX + 1.5 * sc, y - 7 * sc, 1.6 * sc).fill({ color: 0x111111 });
    // Eye glow (flickering)
    const eyeGlow = 0.5 + 0.3 * Math.sin(_globalTime * 5 + y);
    const eyeColor = isGhost ? 0x66aaff : 0x44ff44;
    g.circle(skullX - 1.5 * sc, y - 7 * sc, 0.9 * sc).fill({ color: eyeColor, alpha: eyeGlow });
    g.circle(skullX + 1.5 * sc, y - 7 * sc, 0.9 * sc).fill({ color: eyeColor, alpha: eyeGlow });
    // Eye glow haze
    g.circle(skullX - 1.5 * sc, y - 7 * sc, 2.5 * sc).fill({ color: eyeColor, alpha: eyeGlow * 0.1 });
    g.circle(skullX + 1.5 * sc, y - 7 * sc, 2.5 * sc).fill({ color: eyeColor, alpha: eyeGlow * 0.1 });
    // Nasal cavity
    g.moveTo(skullX, y - 5.5 * sc).lineTo(skullX - 0.5 * sc, y - 4.5 * sc).lineTo(skullX + 0.5 * sc, y - 4.5 * sc)
      .closePath().fill({ color: 0x222211, alpha: ghostAlpha * 0.5 });
    // Jaw with teeth
    g.rect(skullX - 2.5 * sc, y - 4 * sc, 5 * sc, 1.5 * sc).fill({ color: 0xbbbb99, alpha: ghostAlpha });
    // Individual teeth
    for (let i = 0; i < 4; i++) {
      g.rect(skullX - 1.8 * sc + i * 1 * sc, y - 4 * sc, 0.6 * sc, 1).fill({ color: 0xeeeecc, alpha: ghostAlpha * 0.6 });
    }

    // Boss: tattered crown + glowing runes
    if (isBoss) {
      // Ghostly crown
      g.moveTo(skullX - 4 * sc, y - 9 * sc).lineTo(skullX - 3 * sc, y - 12 * sc)
        .lineTo(skullX - 1 * sc, y - 10 * sc).lineTo(skullX, y - 13 * sc)
        .lineTo(skullX + 1 * sc, y - 10 * sc).lineTo(skullX + 3 * sc, y - 12 * sc)
        .lineTo(skullX + 4 * sc, y - 9 * sc).closePath()
        .fill({ color: 0x887744, alpha: ghostAlpha * 0.7 });
      // Rune glow on body
      const runeGlow = 0.3 + 0.2 * Math.sin(_globalTime * 3);
      g.circle(x + sway * 0.5, y - 1 * sc, 2).fill({ color: eyeColor, alpha: runeGlow * 0.4 });
      g.circle(x + sway * 0.5, y + 2 * sc, 1.5).fill({ color: eyeColor, alpha: runeGlow * 0.3 });
    }
  }

  // --- Beast: animal shapes ---
  private _drawBeastEnemy(g: Graphics, x: number, y: number, _s: number, color: number, id: string, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1;
    const breathe = Math.sin(_globalTime * 3 + x) * 0.5;

    if (id.includes("wolf")) {
      const runPhase = Math.sin(_globalTime * 6 + x) * 2;
      // Body (muscular, slightly arched)
      g.ellipse(x, y + breathe, 7 * sc, 4.5 * sc).fill({ color });
      // Belly lighter shade
      g.ellipse(x, y + 1.5 * sc + breathe, 5 * sc, 2 * sc).fill({ color: lighten(color, 0.08), alpha: 0.5 });
      // Haunches (rear muscle definition)
      g.ellipse(x - 4 * sc, y - 0.5 * sc + breathe, 4 * sc, 3.5 * sc).fill({ color: darken(color, 0.03) });

      // Legs (animated gallop)
      const frontLeg = runPhase;
      const backLeg = -runPhase;
      // Front legs
      g.rect(x + 3 * sc, y + 3 * sc + frontLeg, 1.8 * sc, 5 * sc).fill({ color: darken(color, 0.1) });
      g.rect(x + 5 * sc, y + 3 * sc - frontLeg * 0.5, 1.8 * sc, 5 * sc).fill({ color: darken(color, 0.08) });
      // Back legs (thicker thigh)
      g.rect(x - 5 * sc, y + 2 * sc + backLeg, 2 * sc, 5.5 * sc).fill({ color: darken(color, 0.1) });
      g.rect(x - 3 * sc, y + 2 * sc - backLeg * 0.5, 2 * sc, 5.5 * sc).fill({ color: darken(color, 0.08) });
      // Paws
      g.ellipse(x + 3.5 * sc, y + 8 * sc + frontLeg, 1.5 * sc, 0.8 * sc).fill({ color: darken(color, 0.15) });
      g.ellipse(x - 4.5 * sc, y + 7.5 * sc + backLeg, 1.5 * sc, 0.8 * sc).fill({ color: darken(color, 0.15) });

      // Head (detailed muzzle)
      g.ellipse(x + 6 * sc, y - 2 * sc + breathe, 4 * sc, 3.2 * sc).fill({ color: lighten(color, 0.05) });
      // Muzzle
      g.ellipse(x + 10 * sc, y - 1 * sc + breathe, 2.5 * sc, 1.8 * sc).fill({ color: darken(color, 0.1) });
      // Nose
      g.circle(x + 11.5 * sc, y - 1.5 * sc + breathe, 0.8).fill({ color: 0x222222 });
      // Open mouth (snarling)
      g.moveTo(x + 9 * sc, y + 0 * sc + breathe).lineTo(x + 11 * sc, y + 0.5 * sc + breathe)
        .lineTo(x + 9 * sc, y + 1 * sc + breathe).closePath().fill({ color: 0x882222, alpha: 0.6 });
      // Fangs
      g.rect(x + 9.5 * sc, y - 0.3 * sc + breathe, 0.5, 1.2 * sc).fill({ color: 0xeeeeee, alpha: 0.7 });
      g.rect(x + 10.5 * sc, y - 0.3 * sc + breathe, 0.5, 1 * sc).fill({ color: 0xeeeeee, alpha: 0.7 });
      // Eye (glowing, predatory)
      g.circle(x + 7 * sc, y - 3.2 * sc + breathe, 1.2).fill({ color: 0xffff00 });
      g.circle(x + 7 * sc, y - 3.2 * sc + breathe, 0.5).fill({ color: 0x000000 }); // pupil slit
      // Ears (perked)
      g.moveTo(x + 5 * sc, y - 5 * sc + breathe).lineTo(x + 4 * sc, y - 8.5 * sc + breathe).lineTo(x + 7 * sc, y - 5 * sc + breathe).closePath().fill({ color });
      g.moveTo(x + 8 * sc, y - 5 * sc + breathe).lineTo(x + 7 * sc, y - 8.5 * sc + breathe).lineTo(x + 10 * sc, y - 5 * sc + breathe).closePath().fill({ color });
      // Inner ear
      g.moveTo(x + 5.5 * sc, y - 5.5 * sc + breathe).lineTo(x + 4.8 * sc, y - 7.5 * sc + breathe).lineTo(x + 6.5 * sc, y - 5.5 * sc + breathe)
        .closePath().fill({ color: 0xcc8877, alpha: 0.4 });
      // Tail (bushy, animated)
      const tailWave = Math.sin(_globalTime * 3) * 2.5;
      g.moveTo(x - 7 * sc, y + breathe).lineTo(x - 12 * sc, y - 4 * sc + tailWave)
        .lineTo(x - 10 * sc, y - 2 * sc + tailWave).lineTo(x - 7 * sc, y - 1 * sc + breathe).closePath()
        .fill({ color: darken(color, 0.05) });
      // Tail tip lighter
      g.circle(x - 11.5 * sc, y - 3.5 * sc + tailWave, 1.5 * sc).fill({ color: lighten(color, 0.1), alpha: 0.5 });

      // Fur texture lines on body
      for (let i = 0; i < 4; i++) {
        const fx = x - 3 * sc + i * 3 * sc;
        const fy = y - 2 * sc + breathe;
        g.moveTo(fx, fy).lineTo(fx + 1, fy + 2 * sc).stroke({ color: darken(color, 0.08), width: 0.5, alpha: 0.4 });
      }

    } else if (id.includes("spider")) {
      // Spider: detailed abdomen, cephalothorax, multiple eyes, articulated legs
      const legAnim = Math.sin(_globalTime * 6 + x) * 2;

      // Abdomen (larger rear)
      g.ellipse(x - 1 * sc, y + 1 * sc, 4.5 * sc, 4 * sc).fill({ color });
      // Abdomen pattern (markings)
      g.ellipse(x - 1 * sc, y + 0.5 * sc, 2 * sc, 2 * sc).fill({ color: lighten(color, 0.15), alpha: 0.4 });
      g.circle(x - 1 * sc, y + 2.5 * sc, 1 * sc).fill({ color: lighten(color, 0.1), alpha: 0.3 });
      // Spinneret (rear)
      g.ellipse(x - 4 * sc, y + 3 * sc, 1 * sc, 0.8 * sc).fill({ color: darken(color, 0.1) });

      // Cephalothorax (front, slightly smaller)
      g.ellipse(x + 2 * sc, y - 3 * sc, 3.2 * sc, 2.8 * sc).fill({ color: lighten(color, 0.08) });
      // Chelicerae (fangs)
      g.moveTo(x + 3 * sc, y - 1.5 * sc).lineTo(x + 2 * sc, y + 0.5 * sc).stroke({ color: 0x553322, width: 1.2 });
      g.moveTo(x + 4 * sc, y - 1.5 * sc).lineTo(x + 5 * sc, y + 0.5 * sc).stroke({ color: 0x553322, width: 1.2 });
      // Fang tips (venomous green)
      g.circle(x + 2 * sc, y + 0.5 * sc, 0.5).fill({ color: 0x44ff44, alpha: 0.6 });
      g.circle(x + 5 * sc, y + 0.5 * sc, 0.5).fill({ color: 0x44ff44, alpha: 0.6 });

      // Eyes (8 eyes, multiple sizes)
      const eyePositions = [
        [-0.5, -4.5, 0.9], [1.5, -4.5, 0.9],  // principal eyes (large)
        [-1.5, -4, 0.6], [2.5, -4, 0.6],        // secondary
        [-2, -3.5, 0.4], [3, -3.5, 0.4],        // lateral
        [0, -5, 0.5], [1, -5, 0.5],             // top pair
      ];
      for (const [ex, ey, er] of eyePositions) {
        g.circle(x + ex * sc, y + ey * sc, er * sc).fill({ color: 0xff0000 });
        g.circle(x + ex * sc - 0.15, y + ey * sc - 0.15, er * sc * 0.3).fill({ color: 0xff6666, alpha: 0.5 });
      }

      // Legs (8 articulated legs with joints)
      for (let side = -1; side <= 1; side += 2) {
        for (let leg = 0; leg < 4; leg++) {
          const phase = (leg % 2 === 0 ? legAnim : -legAnim) * (1 + leg * 0.1);
          const baseX = x + side * 2 * sc;
          const baseY = y + (leg - 1.5) * 1.8 * sc;
          // First segment (coxa/femur)
          const midX = baseX + side * (5 + leg * 0.8) * sc;
          const midY = baseY - 3 * sc + phase * 0.5;
          // Second segment (tibia/tarsus)
          const tipX = midX + side * 3 * sc;
          const tipY = midY + 4 * sc + phase;

          g.moveTo(baseX, baseY).lineTo(midX, midY).stroke({ color: darken(color, 0.05), width: 1.5 });
          g.moveTo(midX, midY).lineTo(tipX, tipY).stroke({ color: darken(color, 0.1), width: 1.2 });
          // Joint dots
          g.circle(midX, midY, 0.8).fill({ color: darken(color, 0.15) });
        }
      }

      // Boss: web silk trail
      if (isBoss) {
        for (let i = 0; i < 3; i++) {
          const wa = _globalTime * 1.5 + i * 1.2;
          const wx = x + Math.sin(wa) * 10 * sc;
          const wy = y + 6 * sc + Math.cos(wa) * 4;
          g.moveTo(x - 4 * sc, y + 3 * sc).lineTo(wx, wy).stroke({ color: 0xcccccc, width: 0.3, alpha: 0.2 });
        }
      }

    } else if (id.includes("wyvern")) {
      const wingFlap = Math.sin(_globalTime * 4) * 4;
      const hover = Math.sin(_globalTime * 2.5) * 1.5;

      // Body (scaled, muscular)
      g.ellipse(x, y + hover, 6 * sc, 5 * sc).fill({ color });
      // Scale texture
      for (let i = 0; i < 3; i++) {
        const sy = y - 2 * sc + i * 2.5 * sc + hover;
        g.ellipse(x, sy, 5 * sc, 0.8 * sc).stroke({ color: darken(color, 0.1), width: 0.4, alpha: 0.4 });
      }
      // Underbelly (lighter)
      g.ellipse(x, y + 2 * sc + hover, 3 * sc, 3 * sc).fill({ color: lighten(color, 0.12), alpha: 0.4 });

      // Neck
      g.moveTo(x + 3 * sc, y - 3 * sc + hover).lineTo(x + 5 * sc, y - 5 * sc + hover)
        .lineTo(x + 4 * sc, y - 2 * sc + hover).closePath().fill({ color: lighten(color, 0.05) });
      // Head (more draconic)
      g.ellipse(x + 6 * sc, y - 5 * sc + hover, 3.5 * sc, 2.5 * sc).fill({ color: lighten(color, 0.08) });
      // Horns
      g.moveTo(x + 5 * sc, y - 7 * sc + hover).lineTo(x + 4 * sc, y - 10 * sc + hover).lineTo(x + 6 * sc, y - 7 * sc + hover)
        .closePath().fill({ color: darken(color, 0.2) });
      g.moveTo(x + 7 * sc, y - 7 * sc + hover).lineTo(x + 8 * sc, y - 10 * sc + hover).lineTo(x + 8.5 * sc, y - 7 * sc + hover)
        .closePath().fill({ color: darken(color, 0.2) });
      // Eye (slitted, fiery)
      g.circle(x + 7.5 * sc, y - 5.5 * sc + hover, 1.2).fill({ color: 0xff6600 });
      g.rect(x + 7 * sc, y - 5.7 * sc + hover, 1.2, 0.4).fill({ color: 0x000000 }); // slit pupil
      // Jaws (slightly open, fire glow)
      g.moveTo(x + 8 * sc, y - 4 * sc + hover).lineTo(x + 10 * sc, y - 4 * sc + hover)
        .lineTo(x + 9 * sc, y - 3 * sc + hover).closePath().fill({ color: darken(color, 0.1) });
      // Fire breath hint
      const fireGlow = 0.2 + 0.15 * Math.sin(_globalTime * 6);
      g.circle(x + 9 * sc, y - 3.5 * sc + hover, 2).fill({ color: 0xff4400, alpha: fireGlow });

      // Wings (detailed membrane with bone structure)
      for (const side of [-1, 1]) {
        const wingX = x + side * 3 * sc;
        const wingTipX = x + side * 12 * sc;
        const wingTipY = y - 9 * sc + wingFlap * side + hover;
        const wingMidY = y - 5 * sc + wingFlap * side * 0.5 + hover;
        // Wing membrane
        g.moveTo(wingX, y - 2 * sc + hover)
          .lineTo(wingTipX, wingTipY)
          .lineTo(x + side * 8 * sc, wingMidY)
          .lineTo(x + side * 6 * sc, y + hover)
          .closePath()
          .fill({ color: lighten(color, 0.12), alpha: 0.7 });
        // Wing bone/finger
        g.moveTo(wingX, y - 2 * sc + hover).lineTo(wingTipX, wingTipY)
          .stroke({ color: darken(color, 0.1), width: 1 });
        g.moveTo(wingX, y - 1 * sc + hover).lineTo(x + side * 8 * sc, wingMidY)
          .stroke({ color: darken(color, 0.1), width: 0.8 });
        // Claw at wing tip
        g.circle(wingTipX, wingTipY, 1).fill({ color: 0x444444 });
      }

      // Tail (long, sinuous with barbed tip)
      const tailWave1 = Math.sin(_globalTime * 2) * 3;
      const tailWave2 = Math.sin(_globalTime * 2.5) * 2;
      g.moveTo(x - 5 * sc, y + 3 * sc + hover)
        .lineTo(x - 8 * sc, y + 5 * sc + tailWave1 + hover)
        .lineTo(x - 11 * sc, y + 4 * sc + tailWave2 + hover)
        .stroke({ color: darken(color, 0.08), width: 2.5 });
      // Barbed tail tip
      g.moveTo(x - 11 * sc, y + 4 * sc + tailWave2 + hover)
        .lineTo(x - 13 * sc, y + 2 * sc + tailWave2 + hover)
        .lineTo(x - 12 * sc, y + 5 * sc + tailWave2 + hover)
        .closePath().fill({ color: darken(color, 0.15) });

      // Clawed feet
      g.rect(x - 2 * sc, y + 4 * sc + hover, 2 * sc, 3 * sc).fill({ color: darken(color, 0.1) });
      g.rect(x + 1 * sc, y + 4 * sc + hover, 2 * sc, 3 * sc).fill({ color: darken(color, 0.1) });

    } else {
      // Generic beast (troll, etc): large hunched body with more detail
      const walkBob = Math.sin(_globalTime * 3 + y) * 1;
      // Legs (thick, stumpy)
      g.rect(x - 4 * sc, y + 5 * sc + walkBob, 3.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
      g.rect(x + 0.5 * sc, y + 5 * sc - walkBob, 3.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
      // Feet
      g.ellipse(x - 2.5 * sc, y + 10 * sc + walkBob, 2.5 * sc, 1 * sc).fill({ color: darken(color, 0.2) });
      g.ellipse(x + 2 * sc, y + 10 * sc - walkBob, 2.5 * sc, 1 * sc).fill({ color: darken(color, 0.2) });

      // Body (hunched, massive)
      g.ellipse(x, y + breathe, 7 * sc, 8 * sc).fill({ color });
      // Belly
      g.ellipse(x, y + 2 * sc + breathe, 5 * sc, 4 * sc).fill({ color: lighten(color, 0.06), alpha: 0.4 });

      // Arms (long, dangling, gorilla-like)
      const armSwing = Math.sin(_globalTime * 3 + x) * 2;
      g.rect(x - 8 * sc, y - 2 * sc + breathe - armSwing, 3.5 * sc, 10 * sc).fill({ color: darken(color, 0.08) });
      g.rect(x + 4.5 * sc, y - 2 * sc + breathe + armSwing, 3.5 * sc, 10 * sc).fill({ color: darken(color, 0.08) });
      // Fists (large)
      g.circle(x - 7 * sc, y + 8 * sc + breathe - armSwing, 2.5 * sc).fill({ color: darken(color, 0.12) });
      g.circle(x + 6 * sc, y + 8 * sc + breathe + armSwing, 2.5 * sc).fill({ color: darken(color, 0.12) });

      // Head (small relative to body, brutish)
      g.circle(x, y - 6 * sc + breathe, 4.5 * sc).fill({ color: lighten(color, 0.08) });
      // Brow ridge
      g.rect(x - 4 * sc, y - 8 * sc + breathe, 8 * sc, 2 * sc).fill({ color: darken(color, 0.05) });
      // Eyes (beady, glowing)
      g.circle(x - 2 * sc, y - 7 * sc + breathe, 1.3).fill({ color: 0xff4400 });
      g.circle(x + 2 * sc, y - 7 * sc + breathe, 1.3).fill({ color: 0xff4400 });
      g.circle(x - 2 * sc, y - 7 * sc + breathe, 0.5).fill({ color: 0x000000 }); // pupil
      g.circle(x + 2 * sc, y - 7 * sc + breathe, 0.5).fill({ color: 0x000000 });
      // Mouth / tusks
      g.rect(x - 2 * sc, y - 4 * sc + breathe, 4 * sc, 1.5).fill({ color: 0x553322, alpha: 0.6 });
      g.rect(x - 2.5 * sc, y - 5 * sc + breathe, 1, 2 * sc).fill({ color: 0xddddaa, alpha: 0.7 }); // left tusk
      g.rect(x + 1.5 * sc, y - 5 * sc + breathe, 1, 2 * sc).fill({ color: 0xddddaa, alpha: 0.7 }); // right tusk

      // Boss: war paint + scars
      if (isBoss) {
        g.rect(x - 3 * sc, y - 7.5 * sc + breathe, 6 * sc, 0.8).fill({ color: 0xff2222, alpha: 0.4 });
        g.moveTo(x - 3 * sc, y - 2 * sc + breathe).lineTo(x + 2 * sc, y + 3 * sc + breathe)
          .stroke({ color: 0x994444, width: 0.8, alpha: 0.4 });
      }
    }
  }

  // --- Fae: ethereal with wings ---
  private _drawFaeEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const hover = Math.sin(_globalTime * 3 + x) * 2.5;
    const drift = Math.sin(_globalTime * 1.5 + y) * 1;

    // Sparkle trail (longer, more varied)
    for (let i = 0; i < 5; i++) {
      const sx = x + Math.sin(_globalTime * 2 + i * 1.7) * 7 + drift;
      const sy = y + 4 + i * 3 + hover;
      const sparkAlpha = (0.35 - i * 0.06) * (0.5 + 0.5 * Math.sin(_globalTime * 6 + i * 2));
      g.circle(sx, sy, 1.5 - i * 0.2).fill({ color: 0xffffff, alpha: sparkAlpha });
    }

    // Outer glow aura (ambient magic)
    const auraGlow = 0.06 + 0.04 * Math.sin(_globalTime * 4);
    g.circle(x + drift, y + hover, 12 * sc).fill({ color, alpha: auraGlow });
    g.circle(x + drift, y + hover, 8 * sc).fill({ color: lighten(color, 0.2), alpha: auraGlow * 0.8 });

    // Wings (detailed butterfly-like with vein patterns)
    const wingFlutter = Math.sin(_globalTime * 8) * 3.5;
    const wingColor = lighten(color, 0.3);
    const wingInner = lighten(color, 0.5);
    for (const side of [-1, 1]) {
      const wf = wingFlutter * side;
      // Upper wing
      g.ellipse(x + side * 6 * sc + drift, y - 3 * sc + hover + wf, 5 * sc, 7 * sc)
        .fill({ color: wingColor, alpha: 0.3 });
      // Lower wing (smaller)
      g.ellipse(x + side * 5 * sc + drift, y + 2 * sc + hover + wf * 0.7, 3.5 * sc, 5 * sc)
        .fill({ color: wingColor, alpha: 0.25 });
      // Inner pattern (veins)
      g.ellipse(x + side * 5 * sc + drift, y - 3 * sc + hover + wf * 0.5, 3 * sc, 4.5 * sc)
        .fill({ color: wingInner, alpha: 0.2 });
      // Wing vein lines
      g.moveTo(x + drift, y - 2 * sc + hover).lineTo(x + side * 8 * sc + drift, y - 6 * sc + hover + wf)
        .stroke({ color: wingInner, width: 0.4, alpha: 0.3 });
      g.moveTo(x + drift, y + hover).lineTo(x + side * 7 * sc + drift, y - 1 * sc + hover + wf)
        .stroke({ color: wingInner, width: 0.4, alpha: 0.25 });
      // Wing sparkle dots
      const dotAlpha = 0.3 + 0.2 * Math.sin(_globalTime * 5 + side);
      g.circle(x + side * 6 * sc + drift, y - 4 * sc + hover + wf, 1).fill({ color: 0xffffff, alpha: dotAlpha });
      g.circle(x + side * 4 * sc + drift, y + 1 * sc + hover + wf * 0.7, 0.8).fill({ color: 0xffffff, alpha: dotAlpha * 0.7 });
    }

    // Body (slim, ethereal robes)
    g.ellipse(x + drift, y + hover, 3 * sc, 6 * sc).fill({ color, alpha: 0.8 });
    // Flowing robe bottom
    for (let i = -1; i <= 1; i++) {
      const robeWave = Math.sin(_globalTime * 3 + i * 2) * 1.5;
      g.ellipse(x + i * 2 * sc + drift, y + 6 * sc + hover + robeWave, 2 * sc, 2.5 * sc)
        .fill({ color, alpha: 0.4 });
    }
    // Chest sigil / ornament
    g.circle(x + drift, y - 1 * sc + hover, 1.2 * sc).fill({ color: lighten(color, 0.4), alpha: 0.4 });

    // Arms (graceful, thin)
    const armGrace = Math.sin(_globalTime * 2 + x) * 2;
    g.moveTo(x - 2 * sc + drift, y - 2 * sc + hover).lineTo(x - 5 * sc + drift, y + 2 * sc + hover + armGrace)
      .stroke({ color, width: 1.5, alpha: 0.7 });
    g.moveTo(x + 2 * sc + drift, y - 2 * sc + hover).lineTo(x + 5 * sc + drift, y + 2 * sc + hover - armGrace)
      .stroke({ color, width: 1.5, alpha: 0.7 });
    // Hands (glowing)
    g.circle(x - 5 * sc + drift, y + 2 * sc + hover + armGrace, 1).fill({ color: lighten(color, 0.3), alpha: 0.6 });
    g.circle(x + 5 * sc + drift, y + 2 * sc + hover - armGrace, 1).fill({ color: lighten(color, 0.3), alpha: 0.6 });

    // Head (luminous, slightly pointed features)
    g.circle(x + drift, y - 6 * sc + hover, 3.2 * sc).fill({ color: lighten(color, 0.2), alpha: 0.85 });
    // Pointed ears
    g.moveTo(x - 3 * sc + drift, y - 6 * sc + hover).lineTo(x - 5 * sc + drift, y - 8 * sc + hover)
      .lineTo(x - 2 * sc + drift, y - 7 * sc + hover).closePath().fill({ color: lighten(color, 0.15), alpha: 0.7 });
    g.moveTo(x + 3 * sc + drift, y - 6 * sc + hover).lineTo(x + 5 * sc + drift, y - 8 * sc + hover)
      .lineTo(x + 2 * sc + drift, y - 7 * sc + hover).closePath().fill({ color: lighten(color, 0.15), alpha: 0.7 });
    // Eyes (large, glowing, almond-shaped)
    g.ellipse(x - 1.2 * sc + drift, y - 6.5 * sc + hover, 1.2, 0.7).fill({ color: 0xffffff, alpha: 0.9 });
    g.ellipse(x + 1.2 * sc + drift, y - 6.5 * sc + hover, 1.2, 0.7).fill({ color: 0xffffff, alpha: 0.9 });
    // Eye glow haze
    g.circle(x - 1.2 * sc + drift, y - 6.5 * sc + hover, 2).fill({ color: 0xffffff, alpha: 0.08 });
    g.circle(x + 1.2 * sc + drift, y - 6.5 * sc + hover, 2).fill({ color: 0xffffff, alpha: 0.08 });
    // Hair / crown of flowers/thorns (boss)
    if (isBoss) {
      for (let i = 0; i < 5; i++) {
        const crownAngle = (i / 5) * Math.PI - Math.PI * 0.1;
        const cx = x + drift + Math.cos(crownAngle) * 4 * sc;
        const cy = y - 7 * sc + hover + Math.sin(crownAngle) * 2 * sc;
        g.circle(cx, cy, 1.2).fill({ color: lighten(color, 0.4), alpha: 0.6 });
        g.circle(cx, cy, 0.5).fill({ color: 0xffffff, alpha: 0.4 });
      }
    }

    // Orbiting magic motes
    for (let i = 0; i < 3; i++) {
      const moteAngle = _globalTime * 2 + i * (Math.PI * 2 / 3);
      const mx = x + drift + Math.cos(moteAngle) * 10 * sc;
      const my = y + hover + Math.sin(moteAngle) * 6 * sc;
      g.circle(mx, my, 1).fill({ color: lighten(color, 0.4), alpha: 0.3 + 0.15 * Math.sin(moteAngle * 2) });
    }
  }

  // --- Knight: armored humanoid with shield ---
  private _drawKnightEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const breathe = Math.sin(_globalTime * 2.2 + x) * 0.4;
    const walkPhase = Math.sin(_globalTime * 3.5 + y) * 1;
    const armorLight = lighten(color, 0.15);
    const armorDark = darken(color, 0.2);

    // Legs with greaves (animated walk)
    g.rect(x - 3 * sc, y + 4 * sc - walkPhase, 2.8 * sc, 6 * sc).fill({ color: armorDark });
    g.rect(x + 0.2 * sc, y + 4 * sc + walkPhase, 2.8 * sc, 6 * sc).fill({ color: armorDark });
    // Knee guards
    g.rect(x - 3.5 * sc, y + 4 * sc - walkPhase, 3.5 * sc, 2 * sc).fill({ color: armorLight, alpha: 0.4 });
    g.rect(x - 0.3 * sc, y + 4 * sc + walkPhase, 3.5 * sc, 2 * sc).fill({ color: armorLight, alpha: 0.4 });
    // Sabatons (armored boots)
    g.rect(x - 4 * sc, y + 9 * sc - walkPhase, 4 * sc, 2 * sc).fill({ color: armorDark });
    g.rect(x - 0.5 * sc, y + 9 * sc + walkPhase, 4 * sc, 2 * sc).fill({ color: armorDark });

    // Body (cuirass with detail)
    g.rect(x - 5 * sc, y - 5 * sc - breathe, 10 * sc, 10 * sc).fill({ color });
    // Chest plate highlight
    g.rect(x - 3 * sc, y - 4 * sc - breathe, 6 * sc, 4 * sc).fill({ color: armorLight, alpha: 0.15 });
    // Armor segment lines
    g.rect(x - 5 * sc, y - 1 * sc - breathe, 10 * sc, 0.8).fill({ color: armorDark });
    g.rect(x - 5 * sc, y + 2 * sc - breathe, 10 * sc, 0.8).fill({ color: armorDark });
    // Center line (surcoat)
    g.rect(x - 0.4, y - 4 * sc - breathe, 0.8, 8 * sc).fill({ color: armorDark, alpha: 0.3 });
    // Belt with buckle
    g.rect(x - 5 * sc, y + 3.5 * sc - breathe, 10 * sc, 1.5 * sc).fill({ color: 0x553311 });
    g.circle(x, y + 4.2 * sc - breathe, 0.8).fill({ color: 0xccaa44 });
    // Rivets along chest
    for (let i = 0; i < 3; i++) {
      g.circle(x - 4 * sc, y - 3 * sc + i * 2.5 * sc - breathe, 0.4).fill({ color: armorLight, alpha: 0.5 });
      g.circle(x + 4 * sc, y - 3 * sc + i * 2.5 * sc - breathe, 0.4).fill({ color: armorLight, alpha: 0.5 });
    }

    // Shoulder plates (pauldrons with layered plates)
    for (const side of [-1, 1]) {
      const sx = x + side * 5.5 * sc;
      g.rect(sx - 1.5 * sc, y - 5 * sc - breathe, 3.5 * sc, 5 * sc).fill({ color: armorLight });
      // Plate layers
      g.rect(sx - 1.5 * sc, y - 3 * sc - breathe, 3.5 * sc, 0.5).fill({ color: armorDark, alpha: 0.4 });
      g.rect(sx - 1.5 * sc, y - 1 * sc - breathe, 3.5 * sc, 0.5).fill({ color: armorDark, alpha: 0.4 });
      // Top highlight
      g.rect(sx - 1 * sc, y - 5 * sc - breathe, 2.5 * sc, 0.8).fill({ color: lighten(color, 0.25), alpha: 0.3 });
    }

    // Head (great helm with detail)
    g.circle(x, y - 7 * sc - breathe, 4.2 * sc).fill({ color: armorLight });
    // Helm dome highlight
    g.circle(x - 0.5 * sc, y - 8.5 * sc - breathe, 2 * sc).fill({ color: lighten(color, 0.25), alpha: 0.2 });
    // Brim
    g.rect(x - 4.5 * sc, y - 5 * sc - breathe, 9 * sc, 2.2 * sc).fill({ color: lighten(color, 0.2) });
    // Visor slit (T-shaped)
    g.rect(x - 2.5 * sc, y - 7 * sc - breathe, 5 * sc, 1).fill({ color: 0x111111 });
    g.rect(x - 0.3, y - 7.5 * sc - breathe, 0.6, 2.5 * sc).fill({ color: 0x111111, alpha: 0.6 });
    // Eye glints behind visor
    g.circle(x - 1 * sc, y - 7 * sc - breathe, 0.4).fill({ color: 0xaaaaff, alpha: 0.3 });
    g.circle(x + 1 * sc, y - 7 * sc - breathe, 0.4).fill({ color: 0xaaaaff, alpha: 0.3 });
    // Plume/crest
    if (isBoss) {
      const plumeWave = Math.sin(_globalTime * 4) * 1;
      g.moveTo(x, y - 11 * sc - breathe).lineTo(x - 1 + plumeWave, y - 15 * sc - breathe)
        .lineTo(x + 2 + plumeWave, y - 14 * sc - breathe).lineTo(x + 1, y - 11 * sc - breathe)
        .closePath().fill({ color: darken(color, 0.1), alpha: 0.7 });
    }

    // Shield (left side, kite shield shape)
    const shieldX = x - 7 * sc;
    const shieldColor = lighten(color, 0.2);
    g.moveTo(shieldX, y - 4 * sc - breathe).lineTo(shieldX + 4 * sc, y - 4 * sc - breathe)
      .lineTo(shieldX + 4 * sc, y + 2 * sc - breathe).lineTo(shieldX + 2 * sc, y + 5 * sc - breathe)
      .lineTo(shieldX, y + 2 * sc - breathe).closePath().fill({ color: shieldColor });
    // Shield highlight
    g.rect(shieldX + 0.5 * sc, y - 3 * sc - breathe, 1.5 * sc, 6 * sc).fill({ color: lighten(shieldColor, 0.15), alpha: 0.3 });
    // Shield emblem (cross)
    const embX = shieldX + 2 * sc;
    g.rect(embX - 1, y - 1 * sc - breathe, 2, 4 * sc).fill({ color: 0xcc0000, alpha: 0.6 });
    g.rect(embX - 2 * sc, y + 0.5 * sc - breathe, 4 * sc, 1).fill({ color: 0xcc0000, alpha: 0.6 });
    // Shield boss (center metal disc)
    g.circle(embX, y + 0.5 * sc - breathe, 1 * sc).fill({ color: 0x888888, alpha: 0.4 });

    // Sword (right side, detailed)
    const swordX = x + 6.5 * sc;
    // Blade
    g.moveTo(swordX, y - 10 * sc - breathe).lineTo(swordX + 1, y + 0 - breathe).lineTo(swordX - 1, y + 0 - breathe)
      .closePath().fill({ color: 0xcccccc });
    // Edge highlight
    g.moveTo(swordX - 0.3, y - 9 * sc - breathe).lineTo(swordX - 0.3, y - 1 * sc - breathe)
      .stroke({ color: 0xeeeeee, width: 0.3, alpha: 0.4 });
    // Crossguard
    g.rect(swordX - 3, y - 1 * sc - breathe, 6, 2).fill({ color: 0xaa8833 });
    // Handle
    g.rect(swordX - 0.8, y + 1 * sc - breathe, 1.6, 3 * sc).fill({ color: 0x553311 });
    // Pommel
    g.circle(swordX, y + 4.5 * sc - breathe, 1).fill({ color: 0xaa8833 });
  }

  // --- Demon: horned, larger, fire aura ---
  private _drawDemonEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1.1;
    const fireFlicker = Math.sin(_globalTime * 6 + x) * 1.5;
    const breathe = Math.sin(_globalTime * 2 + x) * 0.6;
    const armSwing = Math.sin(_globalTime * 2.5 + y) * 2;

    // Fire aura (more intense, layered)
    for (let i = 0; i < 8; i++) {
      const fa = _globalTime * 3 + i * 0.9;
      const fx = x + Math.sin(fa) * 9 * sc;
      const fy = y + Math.cos(fa * 0.7) * 7 * sc;
      const fireSize = 2.5 + Math.sin(fa * 2) * 1.5;
      const fireColor = i % 3 === 0 ? 0xff2200 : i % 3 === 1 ? 0xff6600 : 0xff4400;
      g.circle(fx, fy, fireSize).fill({ color: fireColor, alpha: 0.06 + 0.03 * Math.sin(fa) });
    }
    // Ground fire (below feet)
    for (let i = 0; i < 3; i++) {
      const gfx = x + (i - 1) * 4 * sc;
      const gfFlicker = Math.sin(_globalTime * 8 + i * 2) * 2;
      g.moveTo(gfx - 2, y + 11 * sc).lineTo(gfx, y + 7 * sc + gfFlicker).lineTo(gfx + 2, y + 11 * sc)
        .closePath().fill({ color: 0xff4400, alpha: 0.15 });
    }

    // Legs (digitigrade, hooved)
    const walkPhase = Math.sin(_globalTime * 3 + x) * 1.5;
    g.rect(x - 4 * sc, y + 5 * sc - walkPhase, 3 * sc, 4 * sc).fill({ color: darken(color, 0.15) });
    g.rect(x + 1 * sc, y + 5 * sc + walkPhase, 3 * sc, 4 * sc).fill({ color: darken(color, 0.15) });
    // Reversed knee joint
    g.rect(x - 3.5 * sc, y + 8 * sc - walkPhase, 2 * sc, 3 * sc).fill({ color: darken(color, 0.2) });
    g.rect(x + 1.5 * sc, y + 8 * sc + walkPhase, 2 * sc, 3 * sc).fill({ color: darken(color, 0.2) });
    // Hooves
    g.rect(x - 4 * sc, y + 10.5 * sc - walkPhase, 3 * sc, 1.5 * sc).fill({ color: 0x222222 });
    g.rect(x + 1 * sc, y + 10.5 * sc + walkPhase, 3 * sc, 1.5 * sc).fill({ color: 0x222222 });

    // Body (large, muscular, V-taper)
    g.ellipse(x, y + breathe, 6 * sc, 8 * sc).fill({ color });
    // Chest muscles
    g.ellipse(x - 2 * sc, y - 2 * sc + breathe, 3 * sc, 3.5 * sc).fill({ color: lighten(color, 0.05), alpha: 0.3 });
    g.ellipse(x + 2 * sc, y - 2 * sc + breathe, 3 * sc, 3.5 * sc).fill({ color: lighten(color, 0.05), alpha: 0.3 });
    // Abdominal lines
    for (let i = 0; i < 3; i++) {
      g.rect(x - 2 * sc, y + i * 2 * sc + breathe, 4 * sc, 0.5).fill({ color: darken(color, 0.1), alpha: 0.3 });
    }
    // Glowing rune/sigil on chest
    const runeGlow = 0.3 + 0.2 * Math.sin(_globalTime * 3);
    g.circle(x, y - 1 * sc + breathe, 2 * sc).stroke({ color: 0xff4400, width: 0.8, alpha: runeGlow });

    // Arms (thick, muscular with claws)
    g.rect(x - 8 * sc, y - 3 * sc + breathe - armSwing, 3.5 * sc, 10 * sc).fill({ color: darken(color, 0.08) });
    g.rect(x + 4.5 * sc, y - 3 * sc + breathe + armSwing, 3.5 * sc, 10 * sc).fill({ color: darken(color, 0.08) });
    // Forearm spikes
    g.moveTo(x - 7 * sc, y + 2 * sc + breathe - armSwing).lineTo(x - 9 * sc, y + 0 * sc + breathe - armSwing)
      .lineTo(x - 7 * sc, y + 3 * sc + breathe - armSwing).closePath().fill({ color: 0x442222 });
    g.moveTo(x + 6 * sc, y + 2 * sc + breathe + armSwing).lineTo(x + 8 * sc, y + 0 * sc + breathe + armSwing)
      .lineTo(x + 6 * sc, y + 3 * sc + breathe + armSwing).closePath().fill({ color: 0x442222 });
    // Claws (3 per hand)
    for (let i = -1; i <= 1; i++) {
      g.moveTo(x - 7 * sc, y + 7 * sc + breathe - armSwing)
        .lineTo(x - 9 * sc + i * 1.5, y + 9 * sc + breathe - armSwing)
        .stroke({ color: 0xccccaa, width: 0.8 });
      g.moveTo(x + 6 * sc, y + 7 * sc + breathe + armSwing)
        .lineTo(x + 8 * sc + i * 1.5, y + 9 * sc + breathe + armSwing)
        .stroke({ color: 0xccccaa, width: 0.8 });
    }

    // Head (angular, menacing)
    g.circle(x, y - 8 * sc + breathe, 4.2 * sc).fill({ color: lighten(color, 0.1) });
    // Brow ridge (heavy)
    g.rect(x - 4 * sc, y - 10 * sc + breathe, 8 * sc, 2 * sc).fill({ color: darken(color, 0.05) });
    // Horns (curved, detailed with ridges)
    for (const side of [-1, 1]) {
      const hornBaseX = x + side * 3 * sc;
      const hornTipX = x + side * 7 * sc;
      const hornTipY = y - 17 * sc + fireFlicker + breathe;
      g.moveTo(hornBaseX, y - 11 * sc + breathe)
        .lineTo(hornTipX, hornTipY)
        .lineTo(hornBaseX + side * 1 * sc, y - 11 * sc + breathe)
        .closePath().fill({ color: 0x442222 });
      // Horn ridges
      for (let i = 0; i < 3; i++) {
        const t = 0.2 + i * 0.25;
        const rx = hornBaseX + (hornTipX - hornBaseX) * t;
        const ry = y - 11 * sc + breathe + (hornTipY - y + 11 * sc - breathe) * t;
        g.circle(rx, ry, 0.6 - i * 0.1).fill({ color: 0x553333, alpha: 0.5 });
      }
    }

    // Eyes (slitted, fiery glow)
    for (const side of [-1, 1]) {
      const eyeX = x + side * 1.5 * sc;
      const eyeY = y - 9 * sc + breathe;
      g.ellipse(eyeX, eyeY, 1.5, 1).fill({ color: 0xff2200 });
      g.rect(eyeX - 0.3, eyeY - 0.8, 0.6, 1.6).fill({ color: 0x000000, alpha: 0.5 }); // slit pupil
      // Eye glow
      g.circle(eyeX, eyeY, 3).fill({ color: 0xff2200, alpha: 0.08 });
    }

    // Mouth (snarling, with fangs)
    g.rect(x - 2.5 * sc, y - 6 * sc + breathe, 5 * sc, 1.5).fill({ color: 0x331111, alpha: 0.7 });
    // Fangs
    g.rect(x - 2 * sc, y - 6 * sc + breathe, 0.6, 1.5 * sc).fill({ color: 0xeeeecc, alpha: 0.7 });
    g.rect(x + 1.5 * sc, y - 6 * sc + breathe, 0.6, 1.5 * sc).fill({ color: 0xeeeecc, alpha: 0.7 });
    // Fire breath hint (for bosses)
    if (isBoss) {
      const fbGlow = 0.15 + 0.1 * Math.sin(_globalTime * 5);
      g.circle(x, y - 5 * sc + breathe, 3).fill({ color: 0xff4400, alpha: fbGlow });
    }

    // Tail (sinuous, barbed)
    const tailWave1 = Math.sin(_globalTime * 2.5) * 3;
    const tailWave2 = Math.sin(_globalTime * 3) * 2;
    g.moveTo(x, y + 6 * sc + breathe)
      .lineTo(x - 6 * sc, y + 10 * sc + tailWave1)
      .lineTo(x - 10 * sc, y + 8 * sc + tailWave2)
      .stroke({ color: darken(color, 0.1), width: 2 });
    // Tail barb
    g.moveTo(x - 10 * sc, y + 8 * sc + tailWave2)
      .lineTo(x - 12 * sc, y + 6 * sc + tailWave2)
      .lineTo(x - 11 * sc, y + 9 * sc + tailWave2)
      .closePath().fill({ color: 0x442222 });
  }

  // --- Elemental: made of their element ---
  private _drawElementalEnemy(g: Graphics, x: number, y: number, _s: number, color: number, id: string, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1;

    if (id.includes("fire")) {
      const flicker = Math.sin(_globalTime * 8 + x) * 2;
      const flicker2 = Math.cos(_globalTime * 6 + y) * 1.5;
      const flicker3 = Math.sin(_globalTime * 10 + x * 0.5) * 1;

      // Heat distortion ground ring
      const heatPulse = 0.1 + 0.05 * Math.sin(_globalTime * 4);
      g.circle(x, y + 6 * sc, 8 * sc).fill({ color: 0xff4400, alpha: heatPulse });

      // Outer flame (layered for depth)
      g.moveTo(x - 7 * sc, y + 7 * sc)
        .lineTo(x - 4 * sc + flicker, y - 6 * sc)
        .lineTo(x - 1 * sc + flicker3, y - 10 * sc)
        .lineTo(x + flicker2, y - 14 * sc)
        .lineTo(x + 2 * sc - flicker3, y - 10 * sc)
        .lineTo(x + 4 * sc - flicker, y - 6 * sc)
        .lineTo(x + 7 * sc, y + 7 * sc)
        .closePath()
        .fill({ color: 0xff2200, alpha: 0.5 });
      // Mid flame
      g.moveTo(x - 5 * sc, y + 5 * sc)
        .lineTo(x - 3 * sc + flicker * 0.7, y - 7 * sc)
        .lineTo(x + flicker2 * 0.5, y - 12 * sc)
        .lineTo(x + 3 * sc - flicker * 0.7, y - 7 * sc)
        .lineTo(x + 5 * sc, y + 5 * sc)
        .closePath()
        .fill({ color: 0xff4400, alpha: 0.65 });
      // Inner flame
      g.moveTo(x - 3 * sc, y + 4 * sc)
        .lineTo(x - 1 * sc + flicker * 0.4, y - 5 * sc)
        .lineTo(x + flicker2 * 0.2, y - 9 * sc)
        .lineTo(x + 1 * sc - flicker * 0.4, y - 5 * sc)
        .lineTo(x + 3 * sc, y + 4 * sc)
        .closePath()
        .fill({ color: 0xff8800, alpha: 0.8 });
      // Side flame wisps
      for (const side of [-1, 1]) {
        const wispPhase = Math.sin(_globalTime * 7 + side * 3) * 2;
        g.moveTo(x + side * 4 * sc, y + 2 * sc)
          .lineTo(x + side * 8 * sc + wispPhase, y - 4 * sc)
          .lineTo(x + side * 5 * sc, y + 1 * sc)
          .closePath().fill({ color: 0xff6600, alpha: 0.35 });
      }

      // Core (bright, pulsing)
      const coreGlow = 0.85 + 0.15 * Math.sin(_globalTime * 5);
      g.ellipse(x, y, 3 * sc, 4 * sc).fill({ color: 0xffdd44, alpha: coreGlow });
      g.ellipse(x, y - 1 * sc, 2 * sc, 2.5 * sc).fill({ color: 0xffffaa, alpha: coreGlow * 0.6 });
      // Core specular
      g.circle(x - 0.5 * sc, y - 1.5 * sc, 1 * sc).fill({ color: 0xffffff, alpha: 0.3 });

      // Eyes (white-hot)
      g.ellipse(x - 1.5 * sc, y - 1 * sc, 1.2, 0.8).fill({ color: 0xffffff });
      g.ellipse(x + 1.5 * sc, y - 1 * sc, 1.2, 0.8).fill({ color: 0xffffff });

      // Embers (more, varied)
      for (let i = 0; i < 6; i++) {
        const ea = _globalTime * (3 + i * 0.5) + i * 1.3;
        const epx = x + Math.sin(ea) * 6 * sc;
        const epy = y - 6 * sc + Math.cos(ea * 1.3) * 5 - i * 2;
        const emberSize = 0.8 + Math.sin(ea * 2) * 0.5;
        g.circle(epx, epy, emberSize).fill({ color: i % 2 === 0 ? 0xffaa22 : 0xff6600, alpha: 0.5 - i * 0.06 });
      }

      // Smoke wisps above
      for (let i = 0; i < 2; i++) {
        const smokeT = (_globalTime * 0.8 + i * 0.5) % 2;
        const smokeY = y - 14 * sc - smokeT * 10;
        const smokeAlpha = Math.max(0, 0.15 * (1 - smokeT / 2));
        g.circle(x + Math.sin(_globalTime + i) * 3, smokeY, 2 + smokeT).fill({ color: 0x444444, alpha: smokeAlpha });
      }

    } else {
      // Ice elemental: crystalline golem
      const shimmer = 0.75 + 0.2 * Math.sin(_globalTime * 3 + x);
      const breathe = Math.sin(_globalTime * 2 + x) * 0.5;

      // Frost ground effect
      g.circle(x, y + 7 * sc, 8 * sc).fill({ color: 0xaaddff, alpha: 0.06 + 0.03 * Math.sin(_globalTime * 2) });

      // Crystal body (multi-faceted)
      // Main crystal column
      g.moveTo(x, y - 12 * sc + breathe)
        .lineTo(x + 5 * sc, y - 6 * sc + breathe)
        .lineTo(x + 5 * sc, y + 3 * sc + breathe)
        .lineTo(x + 2 * sc, y + 7 * sc + breathe)
        .lineTo(x - 2 * sc, y + 7 * sc + breathe)
        .lineTo(x - 5 * sc, y + 3 * sc + breathe)
        .lineTo(x - 5 * sc, y - 6 * sc + breathe)
        .closePath()
        .fill({ color, alpha: shimmer });

      // Right facet (lighter for 3D effect)
      g.moveTo(x, y - 12 * sc + breathe)
        .lineTo(x + 5 * sc, y - 6 * sc + breathe)
        .lineTo(x + 5 * sc, y + 3 * sc + breathe)
        .lineTo(x + 2 * sc, y + 7 * sc + breathe)
        .lineTo(x, y + 5 * sc + breathe)
        .lineTo(x, y - 12 * sc + breathe)
        .closePath()
        .fill({ color: lighten(color, 0.15), alpha: shimmer * 0.3 });

      // Crystal facet lines
      g.moveTo(x, y - 12 * sc + breathe).lineTo(x, y + 5 * sc + breathe)
        .stroke({ color: lighten(color, 0.3), width: 0.6, alpha: 0.5 });
      g.moveTo(x - 5 * sc, y - 6 * sc + breathe).lineTo(x + 2 * sc, y + 7 * sc + breathe)
        .stroke({ color: lighten(color, 0.3), width: 0.4, alpha: 0.3 });
      g.moveTo(x + 5 * sc, y - 6 * sc + breathe).lineTo(x - 2 * sc, y + 7 * sc + breathe)
        .stroke({ color: lighten(color, 0.3), width: 0.4, alpha: 0.3 });

      // Shoulder crystal protrusions
      for (const side of [-1, 1]) {
        g.moveTo(x + side * 4 * sc, y - 4 * sc + breathe)
          .lineTo(x + side * 8 * sc, y - 7 * sc + breathe)
          .lineTo(x + side * 5 * sc, y - 2 * sc + breathe)
          .closePath().fill({ color: lighten(color, 0.1), alpha: shimmer * 0.8 });
      }

      // Inner glow core (pulsing)
      const coreGlow = 0.3 + 0.15 * Math.sin(_globalTime * 3);
      g.ellipse(x, y - 2 * sc + breathe, 3 * sc, 4 * sc).fill({ color: 0xcceeFF, alpha: coreGlow });
      g.circle(x, y - 3 * sc + breathe, 1.5 * sc).fill({ color: 0xeeffff, alpha: coreGlow * 0.5 });

      // Eyes (piercing cold blue)
      g.ellipse(x - 1.5 * sc, y - 4 * sc + breathe, 1.2, 0.8).fill({ color: 0xffffff });
      g.ellipse(x + 1.5 * sc, y - 4 * sc + breathe, 1.2, 0.8).fill({ color: 0xffffff });
      // Eye glow
      g.circle(x - 1.5 * sc, y - 4 * sc + breathe, 2.5).fill({ color: 0x88ccff, alpha: 0.1 });
      g.circle(x + 1.5 * sc, y - 4 * sc + breathe, 2.5).fill({ color: 0x88ccff, alpha: 0.1 });

      // Floating ice crystal shards (orbiting)
      for (let i = 0; i < 4; i++) {
        const ia = _globalTime * 2 + i * (Math.PI / 2);
        const ix = x + Math.cos(ia) * 8 * sc;
        const iy = y + Math.sin(ia) * 5 * sc + breathe;
        // Rotated shard (diamond shape)
        const sr = 1.5 + Math.sin(ia * 3) * 0.5;
        g.moveTo(ix, iy - sr * 1.5).lineTo(ix + sr, iy).lineTo(ix, iy + sr * 1.5).lineTo(ix - sr, iy)
          .closePath().fill({ color: 0xaaddff, alpha: 0.5 });
        // Shard glint
        g.circle(ix - 0.2, iy - sr * 0.5, 0.3).fill({ color: 0xffffff, alpha: 0.4 });
      }

      // Frost particles falling
      for (let i = 0; i < 3; i++) {
        const frostT = (_globalTime * 1.2 + i * 0.8) % 2;
        const frostY = y - 8 * sc + frostT * 15;
        const frostX = x + Math.sin(_globalTime * 2 + i * 2) * 6 * sc;
        g.circle(frostX, frostY, 0.8).fill({ color: 0xccddff, alpha: 0.3 * (1 - frostT / 2) });
      }
    }
  }

  // --- Generic boss rendering for BOSS category ---
  private _drawGenericBoss(g: Graphics, x: number, y: number, s: number, color: number, id: string): void {
    const sc = 1.5;

    if (id.includes("mordred") || id.includes("black_knight")) {
      this._drawKnightEnemy(g, x, y, s, color, true);
      // Dark corruption aura (tendrils of shadow)
      const pulse = 0.3 + 0.15 * Math.sin(_globalTime * 2);
      g.circle(x, y, 24).fill({ color: 0x110011, alpha: pulse * 0.08 });
      g.circle(x, y, 18).fill({ color: 0x220022, alpha: pulse * 0.06 });
      // Shadow tendrils
      for (let i = 0; i < 4; i++) {
        const ta = _globalTime * 1.5 + i * (Math.PI / 2);
        const tx = x + Math.cos(ta) * 20;
        const ty = y + Math.sin(ta) * 15;
        g.moveTo(x, y + 4).lineTo(tx, ty).stroke({ color: 0x220022, width: 1.5, alpha: pulse * 0.15 });
      }
      // Red eye slits (through helmet visor)
      const eyeGlow = 0.4 + 0.3 * Math.sin(_globalTime * 4);
      g.circle(x - 1, y - 10, 1).fill({ color: 0xff0000, alpha: eyeGlow });
      g.circle(x + 1, y - 10, 1).fill({ color: 0xff0000, alpha: eyeGlow });
    } else if (id.includes("morgan") || id.includes("oberon")) {
      this._drawFaeEnemy(g, x, y, s, color, true);
      // Arcane magic circle at feet (rotating rune ring)
      const magicPulse = 0.3 + 0.2 * Math.sin(_globalTime * 2);
      g.circle(x, y + 4, 18).stroke({ color, width: 1.5, alpha: magicPulse });
      g.circle(x, y + 4, 14).stroke({ color: lighten(color, 0.3), width: 1, alpha: magicPulse * 0.7 });
      // Rotating rune marks on circle
      for (let i = 0; i < 6; i++) {
        const ra = _globalTime * 0.8 + i * (Math.PI / 3);
        const rx = x + Math.cos(ra) * 16;
        const ry = y + 4 + Math.sin(ra) * 16;
        g.rect(rx - 1, ry - 1, 2, 2).fill({ color: lighten(color, 0.4), alpha: magicPulse * 0.5 });
      }
      // Floating spell orbs
      for (let i = 0; i < 3; i++) {
        const oa = _globalTime * 1.5 + i * (Math.PI * 2 / 3);
        const ox = x + Math.cos(oa) * 22;
        const oy = y + Math.sin(oa) * 12;
        g.circle(ox, oy, 2.5).fill({ color: lighten(color, 0.3), alpha: 0.4 + 0.2 * Math.sin(oa * 2) });
        g.circle(ox, oy, 4).fill({ color, alpha: 0.08 });
      }
    } else if (id.includes("beast") || id.includes("questing")) {
      this._drawBeastEnemy(g, x, y, s, color, id, true);
      // Poison drip trail effect for questing beast
      if (id.includes("questing")) {
        for (let i = 0; i < 4; i++) {
          const dripT = (_globalTime * 1.5 + i * 0.6) % 2;
          const dripY = y + 10 + dripT * 8;
          g.circle(x + (i - 1.5) * 5, dripY, 1.5 - dripT * 0.5)
            .fill({ color: 0x44ff44, alpha: 0.3 * (1 - dripT / 2) });
        }
      }
    } else if (id.includes("green_knight")) {
      this._drawKnightEnemy(g, x, y, s, color, true);
      // Green regeneration aura with leafy particles
      const pulse = 0.3 + 0.2 * Math.sin(_globalTime * 2.5);
      g.circle(x, y, 22).fill({ color: 0x00ff00, alpha: pulse * 0.05 });
      g.circle(x, y, 16).fill({ color: 0x22ff44, alpha: pulse * 0.04 });
      // Floating leaf particles
      for (let i = 0; i < 4; i++) {
        const la = _globalTime * 1.2 + i * 1.5;
        const lx = x + Math.sin(la) * 18;
        const ly = y + Math.cos(la * 0.8) * 12;
        g.ellipse(lx, ly, 1.5, 0.8).fill({ color: 0x44aa22, alpha: 0.3 + 0.15 * Math.sin(la * 2) });
      }
      // Healing sparkles rising
      for (let i = 0; i < 2; i++) {
        const healT = (_globalTime + i * 0.7) % 2;
        const hy = y - healT * 15;
        g.circle(x + Math.sin(_globalTime * 3 + i) * 6, hy, 1)
          .fill({ color: 0x88ff88, alpha: 0.3 * (1 - healT / 2) });
      }
    } else if (id.includes("rience") || id.includes("saxon")) {
      this._drawKnightEnemy(g, x, y, s, color, true);
      // War banner / battle standard effect
      if (id.includes("rience")) {
        // Summoner king: orbiting minion silhouettes
        for (let i = 0; i < 3; i++) {
          const ma = _globalTime * 1 + i * (Math.PI * 2 / 3);
          const mx = x + Math.cos(ma) * 25;
          const my = y + Math.sin(ma) * 15;
          const mAlpha = 0.15 + 0.08 * Math.sin(ma * 2);
          g.circle(mx, my, 4).fill({ color, alpha: mAlpha });
          g.circle(mx, my - 4, 2.5).fill({ color: lighten(color, 0.1), alpha: mAlpha });
        }
      } else {
        // Saxon: berserker rage sparks
        const ragePulse = 0.2 + 0.1 * Math.sin(_globalTime * 5);
        for (let i = 0; i < 5; i++) {
          const sa = _globalTime * 4 + i * 1.2;
          const sx = x + Math.sin(sa) * 15;
          const sy = y + Math.cos(sa * 0.8) * 10;
          g.circle(sx, sy, 1).fill({ color: 0xff4400, alpha: ragePulse });
        }
      }
    } else {
      // Fallback large enemy (more detailed)
      const breathe = Math.sin(_globalTime * 2) * 0.5;
      g.ellipse(x, y + breathe, 8 * sc, 10 * sc).fill({ color });
      // Body highlight
      g.ellipse(x - 1, y - 2 + breathe, 5 * sc, 6 * sc).fill({ color: lighten(color, 0.08), alpha: 0.3 });
      // Head
      g.circle(x, y - 10 * sc + breathe, 5 * sc).fill({ color: lighten(color, 0.15) });
      // Menacing eyes
      g.ellipse(x - 2 * sc, y - 11 * sc + breathe, 1.8, 1.2).fill({ color: 0xff0000 });
      g.ellipse(x + 2 * sc, y - 11 * sc + breathe, 1.8, 1.2).fill({ color: 0xff0000 });
      g.circle(x - 2 * sc, y - 11 * sc + breathe, 0.6).fill({ color: 0x000000 });
      g.circle(x + 2 * sc, y - 11 * sc + breathe, 0.6).fill({ color: 0x000000 });
      // Ominous aura
      const auraP = 0.3 + 0.15 * Math.sin(_globalTime * 2);
      g.circle(x, y, 16 * sc).fill({ color, alpha: auraP * 0.05 });
    }
  }

  // --- Status effect visuals on any entity ---
  private _drawStatusEffectOnEntity(g: Graphics, x: number, y: number, effectId: string): void {
    if (effectId === "poison" || effectId === "poisoned") {
      // Green dripping
      for (let i = 0; i < 3; i++) {
        const drip = (_globalTime * 2 + i * 0.8) % 2;
        const dy = drip * 10;
        const alpha = Math.max(0, 1 - drip);
        g.circle(x - 4 + i * 4, y + 6 + dy, 1.5).fill({ color: 0x44ff44, alpha: alpha * 0.6 });
      }
    } else if (effectId === "burn" || effectId === "burning") {
      // Flickering orange
      for (let i = 0; i < 3; i++) {
        const fa = _globalTime * 5 + i * 2;
        const fx = x + Math.sin(fa) * 5;
        const fy = y - 4 + Math.cos(fa * 1.5) * 4;
        g.circle(fx, fy, 2).fill({ color: 0xff6600, alpha: 0.3 + 0.2 * Math.sin(fa) });
      }
    } else if (effectId === "stun" || effectId === "stunned") {
      // Orbiting stars
      for (let i = 0; i < 3; i++) {
        const angle = _globalTime * 4 + (i * Math.PI * 2) / 3;
        const sx = x + Math.cos(angle) * 10;
        const sy = y - 12 + Math.sin(angle) * 3;
        drawStar(g, sx, sy, 4, 2, 1).fill({ color: 0xffff00, alpha: 0.7 });
      }
    } else if (effectId === "freeze" || effectId === "frozen") {
      // Ice crystals
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2 + _globalTime * 0.5;
        const ix = x + Math.cos(angle) * 8;
        const iy = y + Math.sin(angle) * 8;
        g.rect(ix - 1, iy - 3, 2, 6).fill({ color: 0x88ccff, alpha: 0.5 });
      }
    } else if (effectId === "buff_atk") {
      // Red upward arrows
      const pulse = 0.5 + 0.3 * Math.sin(_globalTime * 4);
      g.moveTo(x - 3, y - 16).lineTo(x, y - 20).lineTo(x + 3, y - 16).closePath().fill({ color: 0xff4444, alpha: pulse });
    } else if (effectId === "invulnerable") {
      // Handled separately for player, but in case enemies get it:
      const shieldPulse = 0.3 + 0.2 * Math.sin(_globalTime * 5);
      g.circle(x, y, 14).stroke({ color: 0xffd700, width: 2, alpha: shieldPulse });
    }
  }

  // -------------------------------------------------------------------------
  // FOG OF WAR — smooth gradient edges, noise texture
  // -------------------------------------------------------------------------
  private _drawFog(floor: FloorState, sw: number, sh: number): void {
    const g = this._fogGfx;
    g.clear();

    const startCol = Math.max(0, Math.floor(this.camX / TS) - 2);
    const startRow = Math.max(0, Math.floor(this.camY / TS) - 2);
    const endCol = Math.min(floor.width, Math.ceil((this.camX + sw) / TS) + 2);
    const endRow = Math.min(floor.height, Math.ceil((this.camY + sh) / TS) + 2);

    for (let r = startRow; r < endRow; r++) {
      for (let c = startCol; c < endCol; c++) {
        if (!floor.explored[r][c]) {
          const px = c * TS;
          const py = r * TS;

          // Full darkness
          g.rect(px, py, TS, TS).fill({ color: 0x000000 });

          // Noise / smoke texture on fog
          const h = tileHash(r, c, 55);
          if (h > 0.5) {
            const noiseAlpha = 0.03 + h * 0.04;
            const nx = px + (h * 100 % TS);
            const ny = py + (h * 200 % TS);
            g.circle(nx, ny, 4 + h * 6).fill({ color: 0x111122, alpha: noiseAlpha });
          }
        } else {
          // Smooth edge fade: check if adjacent to unexplored
          const px = c * TS;
          const py = r * TS;
          let edgeFade = false;

          // Check all 8 neighbors
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (dr === 0 && dc === 0) continue;
              const nr = r + dr, nc = c + dc;
              if (nr < 0 || nr >= floor.height || nc < 0 || nc >= floor.width) {
                edgeFade = true;
                break;
              }
              if (!floor.explored[nr][nc]) {
                edgeFade = true;
                break;
              }
            }
            if (edgeFade) break;
          }

          if (edgeFade) {
            // Gradient darkness at explored edges
            g.rect(px, py, TS, TS).fill({ color: 0x000000, alpha: 0.3 });

            // Directional fade (heavier toward unexplored side)
            if (r > 0 && !floor.explored[r - 1]?.[c]) {
              g.rect(px, py, TS, TS / 3).fill({ color: 0x000000, alpha: 0.25 });
            }
            if (r < floor.height - 1 && !floor.explored[r + 1]?.[c]) {
              g.rect(px, py + TS * 2 / 3, TS, TS / 3).fill({ color: 0x000000, alpha: 0.25 });
            }
            if (c > 0 && !floor.explored[r]?.[c - 1]) {
              g.rect(px, py, TS / 3, TS).fill({ color: 0x000000, alpha: 0.25 });
            }
            if (c < floor.width - 1 && !floor.explored[r]?.[c + 1]) {
              g.rect(px + TS * 2 / 3, py, TS / 3, TS).fill({ color: 0x000000, alpha: 0.25 });
            }
          }
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // VISUAL EFFECTS — damage numbers, death effects, loot, abilities, particles
  // -------------------------------------------------------------------------
  private _drawFX(_sw: number, _sh: number): void {
    const g = this._fxGfx;
    g.clear();

    // Ambient particles
    this._drawAmbientParticles(g);

    // Attack effect arcs
    for (let i = this.pendingAttackFx.length - 1; i >= 0; i--) {
      const fx = this.pendingAttackFx[i];
      fx.t -= 0.016;
      const progress = 1 - fx.t / 0.3;
      const alpha = Math.max(0, 1 - progress);

      // Slash arc
      const arcLen = 0.8;
      const startAngle = fx.angle - arcLen / 2;
      const endAngle = fx.angle + arcLen / 2;
      const r = 12 + progress * 8;
      for (let a = 0; a < 8; a++) {
        const t = a / 8;
        const angle = startAngle + t * (endAngle - startAngle);
        const px = fx.x + Math.cos(angle) * r;
        const py = fx.y + Math.sin(angle) * r;
        g.circle(px, py, 1.5 - t * 0.1).fill({ color: fx.color, alpha: alpha * (1 - t * 0.3) });
      }

      if (fx.t <= 0) this.pendingAttackFx.splice(i, 1);
    }

    // Ability effects (magic circles)
    for (let i = this.pendingAbilityFx.length - 1; i >= 0; i--) {
      const ab = this.pendingAbilityFx[i];
      ab.t -= 0.016;
      const progress = 1 - ab.t / 0.5;
      const alpha = Math.max(0, 1 - progress * progress);
      const radius = ab.radius * (0.5 + progress * 0.5);

      // Magic circle
      g.circle(ab.x, ab.y, radius).stroke({ color: ab.color, width: 2, alpha });
      g.circle(ab.x, ab.y, radius * 0.6).stroke({ color: lighten(ab.color, 0.3), width: 1, alpha: alpha * 0.6 });

      // Inner rune-like marks
      for (let r = 0; r < 6; r++) {
        const angle = (r / 6) * Math.PI * 2 + _globalTime * 2;
        const rx = ab.x + Math.cos(angle) * radius * 0.4;
        const ry = ab.y + Math.sin(angle) * radius * 0.4;
        g.rect(rx - 1, ry - 1, 2, 2).fill({ color: ab.color, alpha: alpha * 0.5 });
      }

      // Particle burst
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        const dist = radius * progress;
        const px = ab.x + Math.cos(angle) * dist;
        const py = ab.y + Math.sin(angle) * dist;
        g.circle(px, py, 1.5 * (1 - progress)).fill({ color: lighten(ab.color, 0.5), alpha: alpha * 0.7 });
      }

      if (ab.t <= 0) this.pendingAbilityFx.splice(i, 1);
    }

    // Damage numbers (pop-in, float up, color-coded, outlined)
    for (let i = this.pendingHits.length - 1; i >= 0; i--) {
      const hit = this.pendingHits[i];
      hit.t -= 0.016;
      const lifeRatio = hit.t / 0.8;
      const alpha = Math.max(0, lifeRatio);
      const yOff = (0.8 - hit.t) * 35;
      const xDrift = hit.drift * (0.8 - hit.t) * 15;

      // Scale pop-in
      const popScale = hit.t > 0.65 ? 1 + (hit.t - 0.65) * 4 : 1;

      const color = hit.isCrit ? 0xffdd00 : 0xff4444;
      const size = (hit.isCrit ? 7 : 5) * popScale;

      // Outline (dark border)
      g.circle(hit.x + xDrift, hit.y - yOff, size + 1.5).fill({ color: 0x000000, alpha: alpha * 0.7 });
      // Main circle
      g.circle(hit.x + xDrift, hit.y - yOff, size).fill({ color, alpha });

      // Crit burst
      if (hit.isCrit && hit.t > 0.5) {
        const burstAlpha = (hit.t - 0.5) * 3;
        drawStar(g, hit.x + xDrift, hit.y - yOff, 4, size + 3, size - 1).fill({ color: 0xffff88, alpha: burstAlpha * 0.4 });
      }

      if (hit.t <= 0) this.pendingHits.splice(i, 1);
    }

    // Death effects (per category)
    for (let i = this.pendingDeaths.length - 1; i >= 0; i--) {
      const d = this.pendingDeaths[i];
      d.t -= 0.016;
      const progress = 1 - d.t / 0.6;
      const alpha = Math.max(0, 1 - progress);

      if (d.category === "undead") {
        // Crumble to dust + soul escaping upward
        for (let p = 0; p < 12; p++) {
          const angle = (p / 12) * Math.PI * 2 + p * 0.3;
          const dist = progress * 22;
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist + progress * 12;
          const boneSize = 1 + tileHash(p, 0, 33) * 1.5;
          g.rect(px - boneSize / 2, py - boneSize / 2, boneSize, boneSize)
            .fill({ color: p % 3 === 0 ? 0xddddbb : 0xccccaa, alpha: alpha * 0.6 });
        }
        // Soul wisp rising
        const soulY = d.y - progress * 30;
        const soulX = d.x + Math.sin(progress * 6) * 5;
        g.circle(soulX, soulY, 4 * (1 - progress)).fill({ color: 0x66ff88, alpha: alpha * 0.4 });
        g.circle(soulX, soulY, 2 * (1 - progress)).fill({ color: 0xaaffcc, alpha: alpha * 0.3 });
        // Ghostly trail below soul
        for (let t = 0; t < 3; t++) {
          const ty = soulY + t * 5;
          g.circle(soulX + Math.sin(progress * 4 + t) * 2, ty, 2 * (1 - progress) - t * 0.3)
            .fill({ color: 0x66ff88, alpha: alpha * 0.15 * (1 - t * 0.3) });
        }
      } else if (d.category === "fae") {
        // Dissolve to sparkles + magic burst ring
        // Expanding magic ring
        const ringRadius = progress * 30;
        g.circle(d.x, d.y, ringRadius).stroke({ color: 0xaaffcc, width: 1.5, alpha: alpha * 0.4 });
        // Sparkle cloud (rising, spreading)
        for (let p = 0; p < 14; p++) {
          const angle = (p / 14) * Math.PI * 2;
          const dist = progress * 28 * (0.5 + tileHash(p, 0, 77) * 0.5);
          const px = d.x + Math.cos(angle + _globalTime * 1.5) * dist;
          const py = d.y + Math.sin(angle + _globalTime * 1.5) * dist - progress * 18;
          const sparkle = 0.4 + 0.4 * Math.sin(_globalTime * 8 + p * 1.3);
          const sparkColor = p % 3 === 0 ? 0xffddff : p % 3 === 1 ? 0xddffdd : 0xffffff;
          g.circle(px, py, 1.8 - progress).fill({ color: sparkColor, alpha: alpha * sparkle });
        }
        // Central implosion flash
        if (progress < 0.3) {
          const flashAlpha = (0.3 - progress) / 0.3;
          g.circle(d.x, d.y, 8 * (1 - progress * 3)).fill({ color: 0xffffff, alpha: flashAlpha * 0.5 });
        }
      } else if (d.category === "beast") {
        // Blood splatter + bone fragments
        for (let p = 0; p < 10; p++) {
          const angle = (p / 10) * Math.PI * 2 + p * 0.4;
          const speed = 0.5 + tileHash(p, 0, 99) * 0.5;
          const dist = progress * 18 * speed;
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist + progress * progress * 15; // gravity
          const size = 1.5 + tileHash(p, 1, 99) * 2;
          const bloodColor = p % 2 === 0 ? 0x880000 : 0xaa1111;
          g.circle(px, py, size).fill({ color: bloodColor, alpha: alpha * 0.6 });
        }
        // Ground blood pool (expanding)
        g.ellipse(d.x, d.y + 6, progress * 12, progress * 4).fill({ color: 0x550000, alpha: alpha * 0.35 });
        // Fur tufts
        for (let p = 0; p < 4; p++) {
          const angle = (p / 4) * Math.PI * 2 + 0.5;
          const dist = progress * 12;
          const fx = d.x + Math.cos(angle) * dist;
          const fy = d.y + Math.sin(angle) * dist - progress * 5 + progress * progress * 15;
          g.rect(fx - 1, fy - 1.5, 2, 3).fill({ color: 0x886644, alpha: alpha * 0.4 });
        }
      } else if (d.category === "demon") {
        // Hellfire explosion + dark smoke
        const burstRadius = progress * 30;
        // Fire burst
        g.circle(d.x, d.y, burstRadius).fill({ color: 0xff4400, alpha: alpha * 0.15 });
        g.circle(d.x, d.y, burstRadius * 0.6).fill({ color: 0xff8800, alpha: alpha * 0.2 });
        // Flame tongues
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2 + progress * 2;
          const dist = burstRadius * (0.5 + 0.5 * Math.sin(angle * 3));
          const fx = d.x + Math.cos(angle) * dist;
          const fy = d.y + Math.sin(angle) * dist;
          const flameColor = p % 2 === 0 ? 0xff6600 : 0xff2200;
          g.circle(fx, fy, 2.5 * (1 - progress)).fill({ color: flameColor, alpha: alpha * 0.5 });
        }
        // Dark smoke rising
        for (let p = 0; p < 4; p++) {
          const smokeT = progress + p * 0.15;
          if (smokeT < 1) {
            const sx = d.x + Math.sin(smokeT * 5 + p) * 8;
            const sy = d.y - smokeT * 25;
            g.circle(sx, sy, 3 + smokeT * 3).fill({ color: 0x222222, alpha: (1 - smokeT) * 0.2 });
          }
        }
      } else if (d.category === "knight") {
        // Armor shattering — metal fragments flying
        for (let p = 0; p < 10; p++) {
          const angle = (p / 10) * Math.PI * 2 + p * 0.7;
          const speed = 0.4 + tileHash(p, 0, 55) * 0.6;
          const dist = progress * 22 * speed;
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist + progress * progress * 10;
          const fragSize = 1.5 + tileHash(p, 1, 55) * 2;
          const metalColor = p % 3 === 0 ? 0x999999 : p % 3 === 1 ? 0x777777 : 0xaaaaaa;
          g.rect(px - fragSize / 2, py - fragSize / 2, fragSize, fragSize * 0.6)
            .fill({ color: metalColor, alpha: alpha * 0.7 });
        }
        // Metal sparks
        for (let p = 0; p < 5; p++) {
          const sa = progress * 8 + p * 1.5;
          const sx = d.x + Math.sin(sa) * progress * 15;
          const sy = d.y + Math.cos(sa * 0.7) * progress * 10 - progress * 8;
          g.circle(sx, sy, 0.8).fill({ color: 0xffffaa, alpha: alpha * 0.6 });
        }
        // Impact flash
        if (progress < 0.2) {
          g.circle(d.x, d.y, 10 * (1 - progress * 5)).fill({ color: 0xffffff, alpha: (0.2 - progress) * 3 });
        }
      } else if (d.category === "elemental") {
        // Elemental dissipation — energy scattering
        const dissRadius = progress * 28;
        // Energy ring
        g.circle(d.x, d.y, dissRadius).stroke({ color: 0x88aaff, width: 2, alpha: alpha * 0.5 });
        g.circle(d.x, d.y, dissRadius * 0.5).stroke({ color: 0xaaccff, width: 1, alpha: alpha * 0.3 });
        // Crystal shards / energy fragments
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2;
          const dist = dissRadius * (0.3 + 0.7 * tileHash(p, 0, 44));
          const px = d.x + Math.cos(angle + progress) * dist;
          const py = d.y + Math.sin(angle + progress) * dist;
          g.moveTo(px, py - 2).lineTo(px + 1.5, py).lineTo(px, py + 2).lineTo(px - 1.5, py)
            .closePath().fill({ color: 0xaaddff, alpha: alpha * 0.5 });
        }
        // Central energy burst
        g.circle(d.x, d.y, 5 * (1 - progress)).fill({ color: 0xffffff, alpha: alpha * 0.4 });
      } else {
        // Default: expanding ring + shrapnel particles
        const radius = progress * 28;
        g.circle(d.x, d.y, radius).stroke({ color: 0xff4444, width: 2, alpha });
        g.circle(d.x, d.y, radius * 0.7).stroke({ color: 0xff6644, width: 1, alpha: alpha * 0.5 });
        // Scattered particles with gravity
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2 + p * 0.3;
          const dist = radius * 0.8 * (0.5 + tileHash(p, 0, 22) * 0.5);
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist + progress * progress * 8;
          g.circle(px, py, 1.5 * (1 - progress * 0.5)).fill({ color: 0xff8844, alpha: alpha * 0.5 });
        }
        // Central flash
        if (progress < 0.15) {
          g.circle(d.x, d.y, 8 * (1 - progress * 6)).fill({ color: 0xffffff, alpha: (0.15 - progress) * 5 });
        }
      }

      if (d.t <= 0) this.pendingDeaths.splice(i, 1);
    }

    // Status effect particles
    for (let i = this.pendingStatusFx.length - 1; i >= 0; i--) {
      const sf = this.pendingStatusFx[i];
      sf.t -= 0.016;
      const alpha = Math.max(0, sf.t / 1.0);

      if (sf.id === "heal" || sf.id === "grail_heal") {
        // Healing sparkles rising
        for (let p = 0; p < 5; p++) {
          const rise = (1.0 - sf.t) * 20 + p * 4;
          const sway = Math.sin(_globalTime * 3 + p) * 5;
          g.circle(sf.x + sway, sf.y - rise, 1.5).fill({ color: 0x44ff44, alpha: alpha * 0.6 });
        }
      }

      if (sf.t <= 0) this.pendingStatusFx.splice(i, 1);
    }

    // Loot pickup effects
    for (let i = this.pendingLoots.length - 1; i >= 0; i--) {
      const l = this.pendingLoots[i];
      l.t -= 0.016;
      const alpha = Math.max(0, l.t / 1.0);
      const yOff = (1.0 - l.t) * 25;
      const popScale = l.t > 0.8 ? 1 + (l.t - 0.8) * 5 : 1;

      // Sparkle trail
      for (let s = 0; s < 3; s++) {
        const sy = l.y - yOff + s * 4;
        const sx = l.x + Math.sin(_globalTime * 5 + s) * 3;
        g.circle(sx, sy, 1).fill({ color: 0xffffff, alpha: alpha * 0.3 * (1 - s * 0.2) });
      }

      // Item glow
      const size = 5 * popScale;
      g.circle(l.x, l.y - yOff, size + 2).fill({ color: l.color, alpha: alpha * 0.2 });
      g.circle(l.x, l.y - yOff, size).fill({ color: l.color, alpha });

      if (l.t <= 0) this.pendingLoots.splice(i, 1);
    }
  }

  // --- Ambient particles (dust motes, embers, snowflakes) ---
  private _spawnAmbientParticles(floor: FloorState, sw: number, sh: number): void {
    // Reset particles on floor change
    if (floor.floorNum !== this._lastFloorNum) {
      this.ambientParticles.length = 0;
      this._lastFloorNum = floor.floorNum;
    }

    // Limit particle count
    if (this.ambientParticles.length < 30 && Math.random() < 0.15) {
      const themeIdx = Math.min(floor.floorNum, FLOOR_THEMES.length - 1);
      const themeName = FLOOR_THEMES[themeIdx].name.toLowerCase();

      let color = 0x888888;
      let size = 1 + Math.random() * 1.5;
      let vy = -5 - Math.random() * 10;
      let vx = (Math.random() - 0.5) * 8;
      let life = 3 + Math.random() * 3;
      let alpha = 0.15 + Math.random() * 0.15;

      if (themeName.includes("volcanic") || themeName.includes("crimson")) {
        // Embers
        color = Math.random() > 0.5 ? 0xff6622 : 0xff4400;
        vy = -10 - Math.random() * 15;
        alpha = 0.2 + Math.random() * 0.2;
      } else if (themeName.includes("frozen")) {
        // Snowflakes
        color = 0xccddff;
        vy = 5 + Math.random() * 8;
        vx = (Math.random() - 0.5) * 12;
        size = 1.5 + Math.random() * 1;
        alpha = 0.2 + Math.random() * 0.15;
      } else if (themeName.includes("faerie") || themeName.includes("fae")) {
        // Sparkles
        color = Math.random() > 0.5 ? 0x88ffaa : 0xaaffcc;
        vy = (Math.random() - 0.5) * 6;
        vx = (Math.random() - 0.5) * 6;
        alpha = 0.15 + Math.random() * 0.2;
        size = 1 + Math.random();
      } else {
        // Dust motes
        color = 0x999988;
        vy = (Math.random() - 0.5) * 4;
        vx = (Math.random() - 0.5) * 6;
        alpha = 0.08 + Math.random() * 0.1;
      }

      this.ambientParticles.push({
        x: this.camX + Math.random() * sw,
        y: this.camY + Math.random() * sh,
        vx, vy,
        life, maxLife: life,
        size, color, alpha,
      });
    }

    // Update particles
    for (let i = this.ambientParticles.length - 1; i >= 0; i--) {
      const p = this.ambientParticles[i];
      p.x += p.vx * 0.016;
      p.y += p.vy * 0.016;
      p.life -= 0.016;
      if (p.life <= 0) {
        this.ambientParticles.splice(i, 1);
      }
    }
  }

  private _drawAmbientParticles(g: Graphics): void {
    for (const p of this.ambientParticles) {
      const lifeRatio = p.life / p.maxLife;
      const fadeAlpha = p.alpha * (lifeRatio < 0.3 ? lifeRatio / 0.3 : lifeRatio > 0.8 ? (1 - lifeRatio) / 0.2 : 1);
      g.circle(p.x, p.y, p.size).fill({ color: p.color, alpha: fadeAlpha });
    }
  }

  // -------------------------------------------------------------------------
  // ABILITY VFX — per-knight visual effects
  // -------------------------------------------------------------------------
  private _drawDashTrail(state: GrailGameState): void {
    if (state.dashTimer <= 0) return;
    const g = this._fxGfx;
    const p = state.player;
    const trailLen = 4;
    const alpha = state.dashTimer / 0.12; // fade with dash duration

    for (let i = 1; i <= trailLen; i++) {
      const t = i / trailLen;
      const tx = p.x - state.dashDx * i * 8;
      const ty = p.y - state.dashDy * i * 8;
      const a = alpha * (1 - t) * 0.5;
      g.circle(tx, ty, 6 - t * 2).fill({ color: 0x44ccff, alpha: a });
    }
    // Dash flash on player
    g.circle(p.x, p.y, 10).fill({ color: 0x88eeff, alpha: alpha * 0.3 });
  }

  private _drawAbilityVFX(state: GrailGameState): void {
    const vfx = state.activeAbilityVfx;
    if (!vfx) return;

    const g = this._fxGfx;
    const t = vfx.timer;
    const progress = 1 - t / 0.8;
    const alpha = Math.max(0, 1 - progress * progress);
    const px = state.player.x;
    const py = state.player.y;

    switch (vfx.knightId) {
      case "arthur": {
        // Sovereign Strike: Golden Excalibur glow radiating outward, stun shown as frozen aura
        const radius = 20 + progress * 40;
        g.circle(px, py, radius).fill({ color: 0xffd700, alpha: alpha * 0.15 });
        g.circle(px, py, radius * 0.7).fill({ color: 0xffee88, alpha: alpha * 0.2 });
        // Excalibur slash arcs
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + _globalTime * 3;
          const rx = px + Math.cos(angle) * radius * 0.8;
          const ry = py + Math.sin(angle) * radius * 0.8;
          g.circle(rx, ry, 3 * (1 - progress)).fill({ color: 0xffd700, alpha: alpha * 0.6 });
        }
        // Stun aura (frozen blue rings on hit enemies)
        if (progress > 0.3 && progress < 0.8) {
          g.circle(px, py, radius * 1.1).stroke({ color: 0x88ccff, width: 2, alpha: alpha * 0.4 });
        }
        break;
      }
      case "lancelot": {
        // Lake's Fury: Multi-slash with water droplet trails
        for (let i = 0; i < 5; i++) {
          const slashPhase = (progress * 5 + i) % 1;
          const angle = (i / 5) * Math.PI * 0.6 - Math.PI * 0.3 + Math.sin(_globalTime * 10) * 0.2;
          const dist = 15 + slashPhase * 25;
          const facing = state.player.facing;
          const baseAngle = facing === Direction.UP ? -Math.PI / 2 : facing === Direction.DOWN ? Math.PI / 2 :
            facing === Direction.LEFT ? Math.PI : 0;
          const sx = px + Math.cos(baseAngle + angle) * dist;
          const sy = py + Math.sin(baseAngle + angle) * dist;
          // Slash line
          g.moveTo(px, py).lineTo(sx, sy).stroke({ color: 0x4488ff, width: 2, alpha: alpha * 0.5 * (1 - slashPhase) });
          // Water droplet
          g.circle(sx, sy, 2 * (1 - slashPhase)).fill({ color: 0x66aaff, alpha: alpha * 0.6 });
        }
        break;
      }
      case "gawain": {
        // Solar Might: Intensifying golden aura
        const auraSize = 15 + progress * 30;
        const intensity = 0.5 + progress * 0.5;
        g.circle(px, py, auraSize).fill({ color: 0xffcc00, alpha: alpha * 0.1 * intensity });
        g.circle(px, py, auraSize * 0.7).fill({ color: 0xffdd44, alpha: alpha * 0.15 * intensity });
        g.circle(px, py, auraSize * 0.4).fill({ color: 0xffee88, alpha: alpha * 0.2 * intensity });
        // Sun rays
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2 + _globalTime * 1.5;
          const innerR = auraSize * 0.3;
          const outerR = auraSize;
          g.moveTo(px + Math.cos(angle) * innerR, py + Math.sin(angle) * innerR)
            .lineTo(px + Math.cos(angle) * outerR, py + Math.sin(angle) * outerR)
            .stroke({ color: 0xffdd44, width: 1.5, alpha: alpha * 0.3 * intensity });
        }
        break;
      }
      case "percival": {
        // Grail's Blessing: Radiant white light heal, sparkle purge effect
        const healRadius = 20 + progress * 25;
        g.circle(px, py, healRadius).fill({ color: 0xffffff, alpha: alpha * 0.12 });
        g.circle(px, py, healRadius * 0.6).fill({ color: 0xeeeeff, alpha: alpha * 0.18 });
        // Rising sparkles
        for (let i = 0; i < 10; i++) {
          const sx = px + (Math.sin(_globalTime * 4 + i * 1.7) * healRadius * 0.7);
          const sy = py - progress * 30 - i * 3;
          const sparkAlpha = alpha * (0.3 + 0.2 * Math.sin(_globalTime * 8 + i));
          g.circle(sx, sy, 1.5).fill({ color: 0xffffff, alpha: sparkAlpha });
        }
        // Purge effect (dark particles flying outward)
        if (progress > 0.2) {
          for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const dist = (progress - 0.2) * 50;
            g.circle(px + Math.cos(angle) * dist, py + Math.sin(angle) * dist, 2 * (1 - progress))
              .fill({ color: 0x8844aa, alpha: alpha * 0.3 });
          }
        }
        break;
      }
      case "galahad": {
        // Divine Shield: Visible shield bubble that shatters on hit
        const shieldRadius = 18 - progress * 3;
        const shieldAlpha = alpha * 0.35;
        g.circle(px, py, shieldRadius).stroke({ color: 0xffd700, width: 3, alpha: shieldAlpha });
        g.circle(px, py, shieldRadius - 2).stroke({ color: 0xffffaa, width: 1.5, alpha: shieldAlpha * 0.7 });
        // Hexagonal facets
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + _globalTime;
          const nx = px + Math.cos(angle) * shieldRadius;
          const ny = py + Math.sin(angle) * shieldRadius;
          g.circle(nx, ny, 2).fill({ color: 0xffffff, alpha: shieldAlpha * 0.5 });
        }
        // Shatter effect at end
        if (progress > 0.7) {
          const shatterP = (progress - 0.7) / 0.3;
          for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + i * 0.5;
            const dist = shieldRadius + shatterP * 20;
            g.rect(px + Math.cos(angle) * dist - 1.5, py + Math.sin(angle) * dist - 1.5, 3, 3)
              .fill({ color: 0xffd700, alpha: (1 - shatterP) * 0.6 });
          }
        }
        break;
      }
      case "tristan": {
        // Heartseeker: Fast stab motion, poison drip on target
        const facing = state.player.facing;
        const bAngle = facing === Direction.UP ? -Math.PI / 2 : facing === Direction.DOWN ? Math.PI / 2 :
          facing === Direction.LEFT ? Math.PI : 0;
        const stabDist = 10 + progress * 30;
        const tipX = px + Math.cos(bAngle) * stabDist;
        const tipY = py + Math.sin(bAngle) * stabDist;
        // Stab line
        g.moveTo(px, py).lineTo(tipX, tipY).stroke({ color: 0xff4466, width: 2, alpha: alpha * 0.7 });
        // Tip flash
        g.circle(tipX, tipY, 4 * (1 - progress)).fill({ color: 0xff6688, alpha: alpha * 0.8 });
        // Poison drips trailing
        for (let i = 0; i < 4; i++) {
          const dripProgress = (progress + i * 0.15) % 1;
          const dx = tipX + (Math.random() - 0.5) * 6;
          const dy = tipY + dripProgress * 15;
          g.circle(dx, dy, 1.5).fill({ color: 0x44ff44, alpha: alpha * 0.4 * (1 - dripProgress) });
        }
        break;
      }
      case "kay": {
        // Burning Hands: Fire cone eruption, targets ignite
        const facing = state.player.facing;
        const bAngle = facing === Direction.UP ? -Math.PI / 2 : facing === Direction.DOWN ? Math.PI / 2 :
          facing === Direction.LEFT ? Math.PI : 0;
        const coneLen = 20 + progress * 50;
        const coneSpread = 0.6;
        // Fire cone particles
        for (let i = 0; i < 15; i++) {
          const pAngle = bAngle + (Math.random() - 0.5) * coneSpread;
          const dist = Math.random() * coneLen;
          const fx = px + Math.cos(pAngle) * dist;
          const fy = py + Math.sin(pAngle) * dist;
          const fireColor = Math.random() > 0.5 ? 0xff6622 : 0xff8844;
          const pSize = 2 + Math.random() * 3 * (1 - progress);
          g.circle(fx, fy, pSize).fill({ color: fireColor, alpha: alpha * (0.3 + Math.random() * 0.3) });
        }
        // Cone outline
        const leftX = px + Math.cos(bAngle - coneSpread) * coneLen;
        const leftY = py + Math.sin(bAngle - coneSpread) * coneLen;
        const rightX = px + Math.cos(bAngle + coneSpread) * coneLen;
        const rightY = py + Math.sin(bAngle + coneSpread) * coneLen;
        g.moveTo(px, py).lineTo(leftX, leftY).lineTo(rightX, rightY).closePath()
          .fill({ color: 0xff4400, alpha: alpha * 0.08 });
        break;
      }
      case "bedivere": {
        // Last Stand: Red glow, counterattack flash
        const glowRadius = 14 + Math.sin(_globalTime * 8) * 4;
        g.circle(px, py, glowRadius).fill({ color: 0xff2222, alpha: alpha * 0.2 });
        g.circle(px, py, glowRadius * 0.6).fill({ color: 0xff4444, alpha: alpha * 0.15 });
        // Counter flash (white burst)
        if (progress > 0.3 && progress < 0.6) {
          const flashAlpha = (1 - Math.abs(progress - 0.45) / 0.15) * alpha;
          g.circle(px, py, 30).fill({ color: 0xffffff, alpha: flashAlpha * 0.25 });
          // Slash marks
          for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + _globalTime * 2;
            const sx = px + Math.cos(angle) * 20;
            const sy = py + Math.sin(angle) * 20;
            g.moveTo(px, py).lineTo(sx, sy).stroke({ color: 0xff4444, width: 2, alpha: flashAlpha * 0.6 });
          }
        }
        break;
      }
    }
  }

  // -------------------------------------------------------------------------
  // VIGNETTE — darkened screen edges
  // -------------------------------------------------------------------------
  private _drawVignette(sw: number, sh: number): void {
    const g = this._vignetteGfx;
    g.clear();

    // Position vignette in screen space (undo world transform)
    g.x = this.camX;
    g.y = this.camY;

    // Edge darkening bars
    const edgeSize = 60;
    const alpha = 0.25;

    // Top edge
    g.rect(0, 0, sw, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.6 });
    g.rect(0, 0, sw, edgeSize / 2).fill({ color: 0x000000, alpha: alpha * 0.3 });

    // Bottom edge
    g.rect(0, sh - edgeSize, sw, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.6 });
    g.rect(0, sh - edgeSize / 2, sw, edgeSize / 2).fill({ color: 0x000000, alpha: alpha * 0.3 });

    // Left edge
    g.rect(0, 0, edgeSize, sh).fill({ color: 0x000000, alpha: alpha * 0.5 });
    g.rect(0, 0, edgeSize / 2, sh).fill({ color: 0x000000, alpha: alpha * 0.25 });

    // Right edge
    g.rect(sw - edgeSize, 0, edgeSize, sh).fill({ color: 0x000000, alpha: alpha * 0.5 });
    g.rect(sw - edgeSize / 2, 0, edgeSize / 2, sh).fill({ color: 0x000000, alpha: alpha * 0.25 });

    // Corners (extra dark)
    g.rect(0, 0, edgeSize, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.3 });
    g.rect(sw - edgeSize, 0, edgeSize, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.3 });
    g.rect(0, sh - edgeSize, edgeSize, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.3 });
    g.rect(sw - edgeSize, sh - edgeSize, edgeSize, edgeSize).fill({ color: 0x000000, alpha: alpha * 0.3 });
  }

  // -------------------------------------------------------------------------
  // PROJECTILES — colored circles with trails
  // -------------------------------------------------------------------------
  private _drawProjectiles(state: GrailGameState): void {
    const g = this._entityGfx;
    for (const proj of state.floor.projectiles) {
      // Trail (3 fading circles behind the projectile)
      const speed = Math.sqrt(proj.vx * proj.vx + proj.vy * proj.vy);
      if (speed > 0) {
        const nx = proj.vx / speed;
        const ny = proj.vy / speed;
        for (let i = 1; i <= 3; i++) {
          const tx = proj.x - nx * i * 4;
          const ty = proj.y - ny * i * 4;
          const trailAlpha = 0.4 - i * 0.1;
          const trailSize = 3 - i * 0.5;
          g.circle(tx, ty, trailSize).fill({ color: proj.color, alpha: trailAlpha });
        }
      }
      // Main projectile
      g.circle(proj.x, proj.y, 4).fill({ color: proj.color, alpha: 0.9 });
      // Bright center
      g.circle(proj.x, proj.y, 2).fill({ color: lighten(proj.color, 0.4), alpha: 1.0 });
      // Glow
      g.circle(proj.x, proj.y, 7).fill({ color: proj.color, alpha: 0.15 });
    }
  }

  // -------------------------------------------------------------------------
  // POISON TRAILS — green bubbling ground tiles
  // -------------------------------------------------------------------------
  private _drawPoisonTrails(state: GrailGameState): void {
    const g = this._decorGfx;
    for (const trail of state.floor.poisonTrails) {
      const px = trail.col * TS;
      const py = trail.row * TS;
      const fadeAlpha = Math.min(1, trail.timer / 2) * 0.35;
      // Green toxic puddle
      g.rect(px + 2, py + 2, TS - 4, TS - 4).fill({ color: 0x22aa22, alpha: fadeAlpha });
      // Bubbles
      const bubble1 = Math.sin(_globalTime * 4 + trail.col * 3) * 0.5 + 0.5;
      const bubble2 = Math.cos(_globalTime * 3 + trail.row * 5) * 0.5 + 0.5;
      g.circle(px + 8 + bubble1 * 16, py + 10 + bubble2 * 12, 2).fill({ color: 0x44ff44, alpha: fadeAlpha * 0.8 });
      g.circle(px + 20 - bubble2 * 10, py + 6 + bubble1 * 18, 1.5).fill({ color: 0x66ff66, alpha: fadeAlpha * 0.6 });
    }

    // Burning trails — orange/red fire effect
    for (const trail of state.floor.burningTrails) {
      const px = trail.col * TS;
      const py = trail.row * TS;
      const fadeAlpha = Math.min(1, trail.timer / 2) * 0.4;
      // Fire base
      g.rect(px + 2, py + 2, TS - 4, TS - 4).fill({ color: 0xff4400, alpha: fadeAlpha * 0.5 });
      // Flickering flames
      const flicker1 = Math.sin(_globalTime * 8 + trail.col * 5) * 0.5 + 0.5;
      const flicker2 = Math.cos(_globalTime * 6 + trail.row * 7) * 0.5 + 0.5;
      g.circle(px + 6 + flicker1 * 20, py + 4 + flicker2 * 14, 3).fill({ color: 0xff8800, alpha: fadeAlpha * 0.7 });
      g.circle(px + 16 - flicker2 * 12, py + 8 + flicker1 * 16, 2.5).fill({ color: 0xffcc00, alpha: fadeAlpha * 0.5 });
      g.circle(px + 12, py + TS / 2 - flicker1 * 8, 2).fill({ color: 0xff2200, alpha: fadeAlpha * 0.6 });
    }

    // Reanimation spots — glowing green circles where undead will rise
    for (const entry of state.floor.reanimationQueue) {
      const rx = entry.x;
      const ry = entry.y;
      const progress = 1 - Math.max(0, entry.timer / 10); // 0..1 as timer counts down
      const pulseAlpha = 0.1 + progress * 0.3 + Math.sin(_globalTime * 4) * 0.05;
      const radius = 8 + progress * 10;
      // Ominous green glow
      g.circle(rx, ry, radius).fill({ color: 0x00ff44, alpha: pulseAlpha * 0.3 });
      g.circle(rx, ry, radius * 0.6).fill({ color: 0x44ff88, alpha: pulseAlpha * 0.5 });
      // Rising bone particles
      if (progress > 0.5) {
        const boneY = ry - (progress - 0.5) * 20;
        g.circle(rx - 4, boneY, 1.5).fill({ color: 0xccccaa, alpha: pulseAlpha });
        g.circle(rx + 4, boneY - 3, 1.5).fill({ color: 0xccccaa, alpha: pulseAlpha * 0.8 });
        g.circle(rx, boneY - 6, 1).fill({ color: 0xddddbb, alpha: pulseAlpha * 0.6 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // BOSS PHASE FLASH — full screen color flash on boss phase transition
  // -------------------------------------------------------------------------
  private _drawBossFlash(sw: number, sh: number): void {
    if (!this.pendingBossFlash) return;
    const flash = this.pendingBossFlash;
    flash.t -= 0.016;
    if (flash.t <= 0) {
      this.pendingBossFlash = null;
      return;
    }
    const alpha = flash.t / 0.6 * 0.3;
    const g = this._fxGfx;
    // Draw flash in screen space
    g.rect(this.camX, this.camY, sw, sh).fill({ color: flash.color, alpha });
  }

  // -------------------------------------------------------------------------
  // CONFUSION OVERLAY — swirling effect when player is confused
  // -------------------------------------------------------------------------
  private _drawConfusionOverlay(state: GrailGameState, sw: number, sh: number): void {
    if (state.player.confusionTimer <= 0) return;
    const g = this._fxGfx;
    const alpha = Math.min(0.15, state.player.confusionTimer * 0.1);
    // Purple overlay
    g.rect(this.camX, this.camY, sw, sh).fill({ color: 0x8800ff, alpha });
    // Swirling stars around player
    const px = state.player.x;
    const py = state.player.y;
    for (let i = 0; i < 5; i++) {
      const angle = _globalTime * 3 + (i * Math.PI * 2) / 5;
      const sx = px + Math.cos(angle) * 20;
      const sy = py - 10 + Math.sin(angle) * 8;
      g.circle(sx, sy, 2).fill({ color: 0xff88ff, alpha: 0.6 });
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
    this._decorGfx.clear();
    this._lightGfx.clear();
    this._entityGfx.clear();
    this._fogGfx.clear();
    this._fxGfx.clear();
    this._vignetteGfx.clear();
    this.worldLayer.removeChildren();
    this.pendingHits.length = 0;
    this.pendingDeaths.length = 0;
    this.pendingLoots.length = 0;
    this.pendingAttackFx.length = 0;
    this.pendingAbilityFx.length = 0;
    this.pendingBossFlash = null;
    this.pendingStatusFx.length = 0;
    this.ambientParticles.length = 0;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Draw a 4-pointed star shape (PixiJS v8 Graphics has no .star()) */
function drawStar(g: Graphics, cx: number, cy: number, points: number, outerR: number, innerR: number): Graphics {
  const step = Math.PI / points;
  g.moveTo(cx, cy - outerR);
  for (let i = 1; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const angle = i * step - Math.PI / 2;
    g.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
  }
  return g.closePath();
}

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
