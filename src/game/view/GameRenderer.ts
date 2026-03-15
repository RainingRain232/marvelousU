// ---------------------------------------------------------------------------
// Quest for the Grail — 2D Canvas Renderer (PixiJS)
// Fully overhauled dungeon-crawler visuals: textured tiles, detailed
// character sprites, lighting, fog of war, and particle effects.
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import {
  TileType, GameBalance, FLOOR_THEMES, EnemyCategory,
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
    this._drawLighting(floor, player, sw, sh);
    this._drawEntities(state);
    this._drawFog(floor, sw, sh);
    this._drawFX(sw, sh);
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
        }
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
    const darkAlpha = 0.35;
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

        // Player light radius (~6 tiles)
        const lightRadius = TS * 6;
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

    // Animation phase
    const walkPhase = player.isMoving ? Math.sin(_globalTime * 10) : 0;
    const bobY = player.isMoving ? Math.abs(Math.sin(_globalTime * 10)) * 1.5 : 0;

    // Shadow
    g.ellipse(px, py + 10, 8, 3).fill({ color: 0x000000, alpha: 0.35 });

    // Cape/cloak (behind body)
    const capeWave = Math.sin(_globalTime * 3) * 1.5;
    const capeColor = darken(player.knightDef.color, 0.3);
    if (facing === Direction.UP || facing === Direction.LEFT || facing === Direction.RIGHT) {
      g.moveTo(px - 5, py - 2 - bobY)
        .lineTo(px + 5, py - 2 - bobY)
        .lineTo(px + 4 + capeWave, py + 8)
        .lineTo(px - 4 + capeWave, py + 8)
        .closePath()
        .fill({ color: capeColor, alpha: 0.7 });
    }

    // Legs
    const legSpread = walkPhase * 3;
    const legColor = darken(player.knightDef.color, 0.2);
    // Left leg
    g.rect(px - 4, py + 3 - bobY + legSpread, 3, 7).fill({ color: legColor });
    // Right leg
    g.rect(px + 1, py + 3 - bobY - legSpread, 3, 7).fill({ color: legColor });
    // Boots
    g.rect(px - 5, py + 9 - bobY + legSpread, 4, 2).fill({ color: 0x443322 });
    g.rect(px + 1, py + 9 - bobY - legSpread, 4, 2).fill({ color: 0x443322 });

    // Body / torso
    const bodyColor = player.knightDef.color;
    g.rect(px - 5, py - 5 - bobY, 10, 10).fill({ color: bodyColor });

    // Armor overlay
    if (player.equippedArmor) {
      const armorId = player.equippedArmor.id;
      if (armorId.includes("plate") || armorId.includes("avalon")) {
        // Plate armor: segmented chest
        g.rect(px - 5, py - 5 - bobY, 10, 10).fill({ color: player.equippedArmor.color, alpha: 0.5 });
        g.rect(px - 5, py - 1 - bobY, 10, 1).fill({ color: darken(player.equippedArmor.color, 0.2), alpha: 0.4 });
        g.rect(px - 5, py + 2 - bobY, 10, 1).fill({ color: darken(player.equippedArmor.color, 0.2), alpha: 0.4 });
        // Shoulder plates
        g.rect(px - 7, py - 5 - bobY, 3, 4).fill({ color: player.equippedArmor.color, alpha: 0.6 });
        g.rect(px + 4, py - 5 - bobY, 3, 4).fill({ color: player.equippedArmor.color, alpha: 0.6 });
      } else if (armorId.includes("chain")) {
        // Chainmail: crosshatch pattern overlay
        g.rect(px - 5, py - 5 - bobY, 10, 10).fill({ color: player.equippedArmor.color, alpha: 0.3 });
        for (let i = 0; i < 4; i++) {
          g.rect(px - 4, py - 4 + i * 3 - bobY, 8, 1).fill({ color: 0x999999, alpha: 0.2 });
        }
      } else {
        // Leather / robes
        g.rect(px - 5, py - 5 - bobY, 10, 10).fill({ color: player.equippedArmor.color, alpha: 0.25 });
      }
    }

    // Arms
    const armSwing = player.isMoving ? walkPhase * 2.5 : 0;
    const armColor = darken(bodyColor, 0.1);
    // Left arm
    g.rect(px - 7, py - 3 - bobY - armSwing, 3, 8).fill({ color: armColor });
    // Right arm (weapon arm)
    g.rect(px + 4, py - 3 - bobY + armSwing, 3, 8).fill({ color: armColor });

    // Head
    const headColor = 0xddbb88; // Skin
    g.circle(px, py - 8 - bobY, 5).fill({ color: headColor });
    // Helmet
    g.rect(px - 5, py - 13 - bobY, 10, 5).fill({ color: lighten(bodyColor, 0.1) });
    g.rect(px - 6, py - 9 - bobY, 12, 2).fill({ color: lighten(bodyColor, 0.2) }); // Brim
    // Visor slit / face
    if (facing === Direction.DOWN) {
      g.rect(px - 3, py - 8 - bobY, 6, 1).fill({ color: 0x222222, alpha: 0.7 });
    } else if (facing === Direction.UP) {
      // Helmet back
      g.rect(px - 4, py - 12 - bobY, 8, 4).fill({ color: darken(bodyColor, 0.1) });
    }

    // Weapon
    if (player.equippedWeapon) {
      this._drawPlayerWeapon(g, px, py - bobY, facing, player);
    } else {
      // Default: small sword
      const wx = px + fx * 10 + (facing === Direction.UP || facing === Direction.DOWN ? 6 : 0);
      const wy = py + fy * 10 - bobY - 2;
      g.rect(wx - 1, wy - 5, 2, 10).fill({ color: 0xaaaaaa });
      g.rect(wx - 3, wy, 6, 2).fill({ color: 0x886622 }); // Crossguard
    }

    // HP bar
    const barW = 24;
    const barH = 3;
    const bx = px - barW / 2;
    const by = py - 18 - bobY;
    g.rect(bx - 1, by - 1, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.5 });
    g.rect(bx, by, barW, barH).fill({ color: 0x222222 });
    const hpRatio = player.hp / player.maxHp;
    const hpColor = hpRatio > 0.5 ? 0x22ff22 : hpRatio > 0.25 ? 0xffaa22 : 0xff2222;
    g.rect(bx, by, barW * hpRatio, barH).fill({ color: hpColor });

    // Invulnerability shield
    if (player.statusEffects.some((e) => e.id === "invulnerable")) {
      const shieldPulse = 0.4 + 0.3 * Math.sin(_globalTime * 5);
      g.circle(px, py - bobY, 16).stroke({ color: 0xffd700, width: 2, alpha: shieldPulse });
      g.circle(px, py - bobY, 14).stroke({ color: 0xffffaa, width: 1, alpha: shieldPulse * 0.5 });
    }

    // Status effect visuals on player
    for (const se of player.statusEffects) {
      this._drawStatusEffectOnEntity(g, px, py - bobY, se.id);
    }
  }

  private _drawPlayerWeapon(g: Graphics, px: number, py: number, facing: Direction, player: PlayerState): void {
    const weapon = player.equippedWeapon!;
    const weaponId = weapon.id;
    const wColor = weapon.color;
    const fx = dirX(facing);
    const fy = dirY(facing);

    // Attack animation (brief swing)
    const swingPhase = player.attackCooldown > 0
      ? Math.sin((player.attackCooldown / GameBalance.ATTACK_COOLDOWN_MS) * Math.PI) * 0.8
      : 0;

    if (weaponId.includes("staff") || weaponId === "merlin_staff") {
      // Staff — long vertical line with orb
      const sx = px + (facing === Direction.LEFT ? -8 : 8);
      const sy = py - 6;
      g.rect(sx - 1, sy - 8, 2, 18).fill({ color: 0x664422 });
      // Orb on top
      const orbPulse = 0.5 + 0.5 * Math.sin(_globalTime * 4);
      g.circle(sx, sy - 9, 3).fill({ color: wColor, alpha: 0.7 + orbPulse * 0.3 });
      g.circle(sx, sy - 9, 5).fill({ color: wColor, alpha: 0.1 + orbPulse * 0.1 });
    } else {
      // Sword / blade — angled based on facing
      const baseX = px + fx * 8 + (fy !== 0 ? 6 : 0);
      const baseY = py + fy * 8 - 2;

      // Swing rotation effect
      const swingOffX = facing === Direction.LEFT ? -swingPhase * 6 : swingPhase * 6;
      const swingOffY = Math.abs(fy) > 0 ? swingPhase * 4 : 0;

      // Blade
      if (Math.abs(fy) > 0) {
        // Vertical swing
        g.rect(baseX - 1 + swingOffX, baseY - 8 + swingOffY, 2, 12).fill({ color: wColor });
        // Crossguard
        g.rect(baseX - 3 + swingOffX, baseY + 2 + swingOffY, 6, 2).fill({ color: 0x886622 });
        // Handle
        g.rect(baseX - 1 + swingOffX, baseY + 4 + swingOffY, 2, 3).fill({ color: 0x553311 });
      } else {
        // Horizontal swing
        g.rect(baseX - 6 + swingOffX, baseY - 1 + swingOffY, 12, 2).fill({ color: wColor });
        g.rect(baseX - 1 + swingOffX, baseY - 3 + swingOffY, 2, 6).fill({ color: 0x886622 });
        g.rect(baseX - 1 + swingOffX, baseY + 2 + swingOffY, 2, 3).fill({ color: 0x553311 });
      }

      // Attack slash arc
      if (swingPhase > 0.1) {
        const arcAlpha = swingPhase * 0.5;
        g.moveTo(baseX + fx * 6, baseY + fy * 6 - 6)
          .lineTo(baseX + fx * 14, baseY + fy * 14)
          .lineTo(baseX + fx * 6, baseY + fy * 6 + 6)
          .closePath()
          .fill({ color: 0xffffff, alpha: arcAlpha });
      }

      // Legendary weapon glow
      if (weapon.rarity === "legendary") {
        const glowPulse = 0.3 + 0.2 * Math.sin(_globalTime * 5);
        g.circle(baseX + swingOffX, baseY - 2 + swingOffY, 6).fill({ color: wColor, alpha: glowPulse * 0.3 });
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

    // Boss aura
    if (isBoss) {
      const auraPulse = 0.3 + 0.2 * Math.sin(_globalTime * 2);
      g.circle(ex, ey, size + 8).fill({ color: color, alpha: 0.05 + auraPulse * 0.04 });
      g.circle(ex, ey, size + 4).fill({ color: color, alpha: 0.08 + auraPulse * 0.06 });
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
    // Body
    g.rect(x - 4 * sc, y - 4 * sc, 8 * sc, 8 * sc).fill({ color });
    // Head
    g.circle(x, y - 6 * sc, 3.5 * sc).fill({ color: 0xcc9966 });
    // Hood/bandana
    g.rect(x - 3.5 * sc, y - 9.5 * sc, 7 * sc, 4 * sc).fill({ color: darken(color, 0.2) });
    // Eyes
    g.rect(x - 2 * sc, y - 7 * sc, 1.5 * sc, 1).fill({ color: 0x000000 });
    g.rect(x + 0.5 * sc, y - 7 * sc, 1.5 * sc, 1).fill({ color: 0x000000 });
    // Legs
    g.rect(x - 3 * sc, y + 4 * sc, 2.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
    g.rect(x + 0.5 * sc, y + 4 * sc, 2.5 * sc, 5 * sc).fill({ color: darken(color, 0.15) });
    // Weapon (dagger)
    g.rect(x + 5 * sc, y - 2 * sc, 2, 8 * sc).fill({ color: 0xaaaaaa });
    g.rect(x + 4 * sc, y + 1 * sc, 4, 2).fill({ color: 0x886622 });
  }

  // --- Undead: skeletal/ghostly ---
  private _drawUndeadEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const ghostAlpha = 0.7 + 0.15 * Math.sin(_globalTime * 3 + x);

    // Ghostly body (wispy)
    g.ellipse(x, y, 5 * sc, 7 * sc).fill({ color, alpha: ghostAlpha });
    // Wispy bottom
    for (let i = -2; i <= 2; i++) {
      const wave = Math.sin(_globalTime * 4 + i + x) * 2;
      g.ellipse(x + i * 3 * sc, y + 7 * sc + wave, 2 * sc, 3 * sc).fill({ color, alpha: ghostAlpha * 0.5 });
    }

    // Skull
    g.circle(x, y - 6 * sc, 4 * sc).fill({ color: 0xddddbb, alpha: ghostAlpha });
    // Eye sockets
    g.circle(x - 1.5 * sc, y - 7 * sc, 1.5 * sc).fill({ color: 0x000000 });
    g.circle(x + 1.5 * sc, y - 7 * sc, 1.5 * sc).fill({ color: 0x000000 });
    // Eye glow
    const eyeGlow = 0.5 + 0.3 * Math.sin(_globalTime * 5 + y);
    g.circle(x - 1.5 * sc, y - 7 * sc, 0.8 * sc).fill({ color: 0x44ff44, alpha: eyeGlow });
    g.circle(x + 1.5 * sc, y - 7 * sc, 0.8 * sc).fill({ color: 0x44ff44, alpha: eyeGlow });
    // Jaw
    g.rect(x - 2 * sc, y - 4 * sc, 4 * sc, 1.5 * sc).fill({ color: 0xbbbb99, alpha: ghostAlpha });

    // Rib hints for skeletons
    if (color > 0x888888) {
      for (let i = 0; i < 3; i++) {
        g.rect(x - 3 * sc, y - 2 * sc + i * 2.5 * sc, 6 * sc, 0.8).fill({ color: 0xccccaa, alpha: 0.5 });
      }
    }
  }

  // --- Beast: animal shapes ---
  private _drawBeastEnemy(g: Graphics, x: number, y: number, _s: number, color: number, id: string, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1;

    if (id.includes("wolf")) {
      // Wolf shape: elongated body, pointed head
      g.ellipse(x, y, 7 * sc, 4 * sc).fill({ color });
      // Head
      g.ellipse(x + 6 * sc, y - 2 * sc, 4 * sc, 3 * sc).fill({ color: lighten(color, 0.05) });
      // Snout
      g.ellipse(x + 10 * sc, y - 1 * sc, 2 * sc, 1.5 * sc).fill({ color: darken(color, 0.1) });
      // Eye
      g.circle(x + 7 * sc, y - 3 * sc, 1).fill({ color: 0xffff00 });
      // Ears
      g.moveTo(x + 5 * sc, y - 5 * sc).lineTo(x + 4 * sc, y - 8 * sc).lineTo(x + 7 * sc, y - 5 * sc).closePath().fill({ color });
      g.moveTo(x + 8 * sc, y - 5 * sc).lineTo(x + 7 * sc, y - 8 * sc).lineTo(x + 10 * sc, y - 5 * sc).closePath().fill({ color });
      // Tail
      const tailWave = Math.sin(_globalTime * 3) * 2;
      g.moveTo(x - 7 * sc, y).lineTo(x - 11 * sc, y - 3 * sc + tailWave).lineTo(x - 7 * sc, y - 2 * sc).closePath().fill({ color: darken(color, 0.1) });
      // Legs
      g.rect(x - 4 * sc, y + 3 * sc, 2 * sc, 5 * sc).fill({ color: darken(color, 0.1) });
      g.rect(x + 2 * sc, y + 3 * sc, 2 * sc, 5 * sc).fill({ color: darken(color, 0.1) });
    } else if (id.includes("spider")) {
      // Spider: round body with 8 legs
      g.circle(x, y, 4 * sc).fill({ color });
      g.circle(x, y - 4 * sc, 3 * sc).fill({ color: lighten(color, 0.1) });
      // Eyes (multiple)
      for (let i = -1; i <= 1; i++) {
        g.circle(x + i * 1.5 * sc, y - 5 * sc, 0.8).fill({ color: 0xff0000 });
      }
      // Legs
      const legAnim = Math.sin(_globalTime * 6 + x) * 1.5;
      for (let side = -1; side <= 1; side += 2) {
        for (let leg = 0; leg < 4; leg++) {

          const lx = x + side * (5 + leg) * sc;
          const ly = y + (leg - 1.5) * 2.5 * sc + (leg % 2 === 0 ? legAnim : -legAnim);
          g.moveTo(x + side * 3 * sc, y + (leg - 1.5) * 2 * sc)
            .lineTo(lx, ly - 2 * sc)
            .lineTo(lx + side * 2 * sc, ly + 2 * sc)
            .stroke({ color: darken(color, 0.1), width: 1.2 });
        }
      }
    } else if (id.includes("wyvern")) {
      // Wyvern: winged beast
      g.ellipse(x, y, 6 * sc, 5 * sc).fill({ color });
      // Head
      g.ellipse(x + 5 * sc, y - 4 * sc, 3 * sc, 2.5 * sc).fill({ color: lighten(color, 0.1) });
      g.circle(x + 7 * sc, y - 4.5 * sc, 1).fill({ color: 0xff6600 }); // Eye
      // Wings
      const wingFlap = Math.sin(_globalTime * 4) * 3;
      g.moveTo(x - 3 * sc, y - 2 * sc)
        .lineTo(x - 10 * sc, y - 8 * sc + wingFlap)
        .lineTo(x - 6 * sc, y)
        .closePath()
        .fill({ color: lighten(color, 0.15), alpha: 0.8 });
      g.moveTo(x + 3 * sc, y - 2 * sc)
        .lineTo(x + 10 * sc, y - 8 * sc + wingFlap)
        .lineTo(x + 6 * sc, y)
        .closePath()
        .fill({ color: lighten(color, 0.15), alpha: 0.8 });
      // Tail
      g.moveTo(x - 5 * sc, y + 3 * sc)
        .lineTo(x - 10 * sc, y + 6 * sc + Math.sin(_globalTime * 2) * 2)
        .stroke({ color: darken(color, 0.1), width: 2 });
    } else {
      // Generic beast (troll, etc): large hunched body
      g.ellipse(x, y, 6 * sc, 7 * sc).fill({ color });
      g.circle(x, y - 6 * sc, 4 * sc).fill({ color: lighten(color, 0.08) });
      // Eyes
      g.circle(x - 2 * sc, y - 7 * sc, 1.2).fill({ color: 0xff4400 });
      g.circle(x + 2 * sc, y - 7 * sc, 1.2).fill({ color: 0xff4400 });
      // Arms
      g.rect(x - 7 * sc, y - 2 * sc, 3 * sc, 8 * sc).fill({ color: darken(color, 0.1) });
      g.rect(x + 4 * sc, y - 2 * sc, 3 * sc, 8 * sc).fill({ color: darken(color, 0.1) });
      // Legs
      g.rect(x - 4 * sc, y + 5 * sc, 3 * sc, 4 * sc).fill({ color: darken(color, 0.15) });
      g.rect(x + 1 * sc, y + 5 * sc, 3 * sc, 4 * sc).fill({ color: darken(color, 0.15) });
    }
  }

  // --- Fae: ethereal with wings ---
  private _drawFaeEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    const hover = Math.sin(_globalTime * 3 + x) * 2;

    // Sparkle trail
    for (let i = 0; i < 3; i++) {
      const sx = x + Math.sin(_globalTime * 2 + i * 2) * 6;
      const sy = y + 5 + i * 3 + hover;
      const sparkAlpha = 0.3 - i * 0.08;
      g.circle(sx, sy, 1.5 - i * 0.3).fill({ color: 0xffffff, alpha: sparkAlpha });
    }

    // Wings
    const wingFlutter = Math.sin(_globalTime * 8) * 3;
    g.ellipse(x - 6 * sc, y - 2 * sc + hover + wingFlutter, 5 * sc, 8 * sc)
      .fill({ color: lighten(color, 0.3), alpha: 0.3 });
    g.ellipse(x + 6 * sc, y - 2 * sc + hover - wingFlutter, 5 * sc, 8 * sc)
      .fill({ color: lighten(color, 0.3), alpha: 0.3 });
    // Inner wings
    g.ellipse(x - 4 * sc, y - 1 * sc + hover + wingFlutter * 0.5, 3 * sc, 5 * sc)
      .fill({ color: lighten(color, 0.5), alpha: 0.25 });
    g.ellipse(x + 4 * sc, y - 1 * sc + hover - wingFlutter * 0.5, 3 * sc, 5 * sc)
      .fill({ color: lighten(color, 0.5), alpha: 0.25 });

    // Body (slim, ethereal)
    g.ellipse(x, y + hover, 3 * sc, 6 * sc).fill({ color, alpha: 0.8 });
    // Head
    g.circle(x, y - 6 * sc + hover, 3 * sc).fill({ color: lighten(color, 0.2), alpha: 0.85 });
    // Eyes (glowing)
    g.circle(x - 1 * sc, y - 6.5 * sc + hover, 0.8).fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(x + 1 * sc, y - 6.5 * sc + hover, 0.8).fill({ color: 0xffffff, alpha: 0.9 });

    // Glow aura
    g.circle(x, y + hover, 8 * sc).fill({ color, alpha: 0.06 + 0.03 * Math.sin(_globalTime * 4) });
  }

  // --- Knight: armored humanoid with shield ---
  private _drawKnightEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.4 : 1;
    // Legs
    g.rect(x - 3 * sc, y + 4 * sc, 2.5 * sc, 6 * sc).fill({ color: darken(color, 0.2) });
    g.rect(x + 0.5 * sc, y + 4 * sc, 2.5 * sc, 6 * sc).fill({ color: darken(color, 0.2) });
    // Body (armored)
    g.rect(x - 5 * sc, y - 5 * sc, 10 * sc, 10 * sc).fill({ color });
    // Armor segments
    g.rect(x - 5 * sc, y - 1 * sc, 10 * sc, 1).fill({ color: darken(color, 0.15) });
    g.rect(x - 5 * sc, y + 2 * sc, 10 * sc, 1).fill({ color: darken(color, 0.15) });
    // Shoulder plates
    g.rect(x - 7 * sc, y - 5 * sc, 3 * sc, 5 * sc).fill({ color: lighten(color, 0.1) });
    g.rect(x + 4 * sc, y - 5 * sc, 3 * sc, 5 * sc).fill({ color: lighten(color, 0.1) });
    // Head (helmet)
    g.circle(x, y - 7 * sc, 4 * sc).fill({ color: lighten(color, 0.15) });
    g.rect(x - 4 * sc, y - 5 * sc, 8 * sc, 2 * sc).fill({ color: lighten(color, 0.2) }); // Brim
    g.rect(x - 2 * sc, y - 7 * sc, 4 * sc, 1).fill({ color: 0x111111 }); // Visor
    // Shield (left side)
    g.rect(x - 8 * sc, y - 3 * sc, 4 * sc, 8 * sc).fill({ color: lighten(color, 0.2) });
    g.rect(x - 7 * sc, y - 2 * sc, 2 * sc, 6 * sc).fill({ color: lighten(color, 0.3), alpha: 0.5 }); // Shield highlight
    // Cross on shield
    g.rect(x - 7 * sc, y + 0.5 * sc, 2 * sc, 0.8).fill({ color: 0xcc0000, alpha: 0.6 });
    g.rect(x - 6.3 * sc, y - 1 * sc, 0.8, 3.5 * sc).fill({ color: 0xcc0000, alpha: 0.6 });
    // Sword (right side)
    g.rect(x + 6 * sc, y - 8 * sc, 2, 14 * sc).fill({ color: 0xcccccc });
    g.rect(x + 4 * sc, y - 1 * sc, 6, 2).fill({ color: 0xaa8833 });
  }

  // --- Demon: horned, larger, fire aura ---
  private _drawDemonEnemy(g: Graphics, x: number, y: number, _s: number, color: number, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1.1;
    const fireFlicker = Math.sin(_globalTime * 6 + x) * 1.5;

    // Fire aura
    for (let i = 0; i < 5; i++) {
      const fa = _globalTime * 3 + i * 1.3;
      const fx = x + Math.sin(fa) * 8 * sc;
      const fy = y + Math.cos(fa * 0.7) * 6 * sc;
      g.circle(fx, fy, 3 + Math.sin(fa * 2)).fill({ color: 0xff4400, alpha: 0.08 });
    }

    // Body (large, muscular)
    g.ellipse(x, y, 6 * sc, 8 * sc).fill({ color });
    // Legs
    g.rect(x - 4 * sc, y + 6 * sc, 3 * sc, 5 * sc).fill({ color: darken(color, 0.2) });
    g.rect(x + 1 * sc, y + 6 * sc, 3 * sc, 5 * sc).fill({ color: darken(color, 0.2) });
    // Arms (thick)
    g.rect(x - 8 * sc, y - 3 * sc, 3 * sc, 10 * sc).fill({ color: darken(color, 0.1) });
    g.rect(x + 5 * sc, y - 3 * sc, 3 * sc, 10 * sc).fill({ color: darken(color, 0.1) });
    // Claws
    g.moveTo(x - 8 * sc, y + 6 * sc).lineTo(x - 10 * sc, y + 8 * sc).stroke({ color: 0xccccaa, width: 1 });
    g.moveTo(x + 7 * sc, y + 6 * sc).lineTo(x + 9 * sc, y + 8 * sc).stroke({ color: 0xccccaa, width: 1 });
    // Head
    g.circle(x, y - 8 * sc, 4 * sc).fill({ color: lighten(color, 0.1) });
    // Horns
    g.moveTo(x - 3 * sc, y - 11 * sc).lineTo(x - 6 * sc, y - 16 * sc + fireFlicker).lineTo(x - 1 * sc, y - 11 * sc).closePath().fill({ color: 0x442222 });
    g.moveTo(x + 1 * sc, y - 11 * sc).lineTo(x + 6 * sc, y - 16 * sc + fireFlicker).lineTo(x + 3 * sc, y - 11 * sc).closePath().fill({ color: 0x442222 });
    // Eyes (fiery)
    g.circle(x - 1.5 * sc, y - 9 * sc, 1.2).fill({ color: 0xff2200 });
    g.circle(x + 1.5 * sc, y - 9 * sc, 1.2).fill({ color: 0xff2200 });
    // Mouth
    g.rect(x - 2 * sc, y - 6 * sc, 4 * sc, 1).fill({ color: 0xff4400, alpha: 0.6 });
  }

  // --- Elemental: made of their element ---
  private _drawElementalEnemy(g: Graphics, x: number, y: number, _s: number, color: number, id: string, isBoss: boolean): void {
    const sc = isBoss ? 1.5 : 1;

    if (id.includes("fire")) {
      // Fire elemental: flickering flame shape
      const flicker = Math.sin(_globalTime * 8 + x) * 2;
      const flicker2 = Math.cos(_globalTime * 6 + y) * 1.5;

      // Outer flame
      g.moveTo(x - 6 * sc, y + 6 * sc)
        .lineTo(x - 3 * sc + flicker, y - 8 * sc)
        .lineTo(x + flicker2, y - 12 * sc)
        .lineTo(x + 3 * sc - flicker, y - 8 * sc)
        .lineTo(x + 6 * sc, y + 6 * sc)
        .closePath()
        .fill({ color: 0xff4400, alpha: 0.7 });
      // Inner flame
      g.moveTo(x - 3 * sc, y + 4 * sc)
        .lineTo(x - 1 * sc + flicker * 0.5, y - 5 * sc)
        .lineTo(x + flicker2 * 0.3, y - 9 * sc)
        .lineTo(x + 1 * sc - flicker * 0.5, y - 5 * sc)
        .lineTo(x + 3 * sc, y + 4 * sc)
        .closePath()
        .fill({ color: 0xff8800, alpha: 0.8 });
      // Core
      g.ellipse(x, y, 3 * sc, 4 * sc).fill({ color: 0xffcc44, alpha: 0.9 });
      // Eyes
      g.circle(x - 1.5 * sc, y - 1 * sc, 1).fill({ color: 0xffffff });
      g.circle(x + 1.5 * sc, y - 1 * sc, 1).fill({ color: 0xffffff });
      // Embers
      for (let i = 0; i < 3; i++) {
        const ea = _globalTime * 4 + i * 2;
        const epx = x + Math.sin(ea) * 5 * sc;
        const epy = y - 8 * sc + Math.cos(ea * 1.3) * 3 - i * 2;
        g.circle(epx, epy, 1).fill({ color: 0xffaa22, alpha: 0.5 - i * 0.1 });
      }
    } else {
      // Ice elemental: crystalline
      const shimmer = 0.7 + 0.2 * Math.sin(_globalTime * 3 + x);

      // Crystal body (hexagonal-ish)
      g.moveTo(x, y - 10 * sc)
        .lineTo(x + 5 * sc, y - 5 * sc)
        .lineTo(x + 5 * sc, y + 3 * sc)
        .lineTo(x, y + 7 * sc)
        .lineTo(x - 5 * sc, y + 3 * sc)
        .lineTo(x - 5 * sc, y - 5 * sc)
        .closePath()
        .fill({ color, alpha: shimmer });

      // Crystal facets
      g.moveTo(x, y - 10 * sc).lineTo(x, y + 7 * sc).stroke({ color: lighten(color, 0.3), width: 0.5, alpha: 0.4 });
      g.moveTo(x - 5 * sc, y - 5 * sc).lineTo(x + 5 * sc, y + 3 * sc).stroke({ color: lighten(color, 0.3), width: 0.5, alpha: 0.3 });

      // Inner glow
      g.ellipse(x, y - 2 * sc, 3 * sc, 4 * sc).fill({ color: 0xcceeFF, alpha: 0.3 });

      // Eyes
      g.circle(x - 1.5 * sc, y - 3 * sc, 1).fill({ color: 0xffffff });
      g.circle(x + 1.5 * sc, y - 3 * sc, 1).fill({ color: 0xffffff });

      // Ice crystals floating around
      for (let i = 0; i < 3; i++) {
        const ia = _globalTime * 2 + i * 2.1;
        const ix = x + Math.cos(ia) * 7 * sc;
        const iy = y + Math.sin(ia) * 5 * sc;
        g.rect(ix - 1, iy - 2, 2, 4).fill({ color: 0xaaddff, alpha: 0.4 });
      }
    }
  }

  // --- Generic boss rendering for BOSS category ---
  private _drawGenericBoss(g: Graphics, x: number, y: number, s: number, color: number, id: string): void {
    const sc = 1.5;

    if (id.includes("mordred") || id.includes("black_knight")) {
      // Dark armored knight — use knight drawing at large scale
      this._drawKnightEnemy(g, x, y, s, color, true);
      // Extra dark aura
      const pulse = 0.3 + 0.15 * Math.sin(_globalTime * 2);
      g.circle(x, y, 22).fill({ color: 0x220000, alpha: pulse * 0.1 });
    } else if (id.includes("morgan") || id.includes("oberon")) {
      // Sorcerer/fae boss
      this._drawFaeEnemy(g, x, y, s, color, true);
      // Magic circle at feet
      const magicPulse = 0.3 + 0.2 * Math.sin(_globalTime * 2);
      g.circle(x, y + 4, 16).stroke({ color, width: 1.5, alpha: magicPulse });
      g.circle(x, y + 4, 12).stroke({ color: lighten(color, 0.3), width: 1, alpha: magicPulse * 0.7 });
    } else if (id.includes("beast") || id.includes("questing")) {
      // Chimeric beast — draw large beast
      this._drawBeastEnemy(g, x, y, s, color, id, true);
    } else if (id.includes("green_knight")) {
      this._drawKnightEnemy(g, x, y, s, color, true);
      // Green aura of regeneration
      const pulse = 0.3 + 0.2 * Math.sin(_globalTime * 2.5);
      g.circle(x, y, 20).fill({ color: 0x00ff00, alpha: pulse * 0.06 });
    } else if (id.includes("rience") || id.includes("saxon")) {
      this._drawKnightEnemy(g, x, y, s, color, true);
    } else {
      // Fallback large enemy
      g.ellipse(x, y, 8 * sc, 10 * sc).fill({ color });
      g.circle(x, y - 10 * sc, 5 * sc).fill({ color: lighten(color, 0.15) });
      g.circle(x - 2 * sc, y - 11 * sc, 1.5).fill({ color: 0xff0000 });
      g.circle(x + 2 * sc, y - 11 * sc, 1.5).fill({ color: 0xff0000 });
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
        // Crumble to dust
        for (let p = 0; p < 8; p++) {
          const angle = (p / 8) * Math.PI * 2 + p;
          const dist = progress * 20;
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist + progress * 10;
          g.rect(px - 1, py - 1, 2, 2).fill({ color: 0xccccaa, alpha: alpha * 0.6 });
        }
      } else if (d.category === "fae") {
        // Dissolve to sparkles
        for (let p = 0; p < 10; p++) {
          const angle = (p / 10) * Math.PI * 2;
          const dist = progress * 25;
          const px = d.x + Math.cos(angle + _globalTime) * dist;
          const py = d.y + Math.sin(angle + _globalTime) * dist - progress * 15;
          const sparkle = 0.3 + 0.3 * Math.sin(_globalTime * 8 + p);
          g.circle(px, py, 1.5).fill({ color: 0xffffff, alpha: (alpha * sparkle) });
        }
      } else if (d.category === "beast") {
        // Blood splatter
        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2 + p * 0.5;
          const dist = progress * 15 * (0.5 + tileHash(p, 0, 99) * 0.5);
          const px = d.x + Math.cos(angle) * dist;
          const py = d.y + Math.sin(angle) * dist;
          g.circle(px, py, 2 + tileHash(p, 1, 99) * 2).fill({ color: 0x880000, alpha: alpha * 0.6 });
        }
      } else {
        // Default: expanding ring
        const radius = progress * 25;
        g.circle(d.x, d.y, radius).stroke({ color: 0xff4444, width: 2, alpha });
        // Inner particles
        for (let p = 0; p < 6; p++) {
          const angle = (p / 6) * Math.PI * 2;
          const px = d.x + Math.cos(angle) * radius * 0.7;
          const py = d.y + Math.sin(angle) * radius * 0.7;
          g.circle(px, py, 1.5).fill({ color: 0xff8844, alpha: alpha * 0.5 });
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
