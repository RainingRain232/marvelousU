// ---------------------------------------------------------------------------
// Terraria – Main tile renderer (PixiJS 2D)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { TB } from "../config/TerrariaBalance";
import { BlockType, BLOCK_DEFS, WallType } from "../config/TerrariaBlockDefs";
import type { TerrariaState } from "../state/TerrariaState";
import { worldToChunkX, worldToLocalX } from "../state/TerrariaChunk";
import type { TerrariaCamera } from "./TerrariaCamera";

const TS = TB.TILE_SIZE;
const CW = TB.CHUNK_W;
const WH = TB.WORLD_HEIGHT;

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class TerrariaRenderer {
  readonly worldLayer = new Container();
  private _skyGfx = new Graphics();
  private _parallaxGfx = new Graphics();
  private _wallLayer = new Container();
  private _blockLayer = new Container();
  private _entityLayer = new Container();
  private _lightOverlay = new Graphics();
  private _cursorGfx = new Graphics();

  // Chunk graphics cache: key = chunk cx
  private _chunkBlockGfx = new Map<number, Graphics>();
  private _chunkWallGfx = new Map<number, Graphics>();

  init(): void {
    this.worldLayer.addChild(this._skyGfx);
    this.worldLayer.addChild(this._parallaxGfx);
    this.worldLayer.addChild(this._wallLayer);
    this.worldLayer.addChild(this._blockLayer);
    this.worldLayer.addChild(this._entityLayer);
    this.worldLayer.addChild(this._lightOverlay);
    this.worldLayer.addChild(this._cursorGfx);
  }

  get entityLayer(): Container { return this._entityLayer; }

  cleanup(): void {
    for (const g of this._chunkBlockGfx.values()) g.destroy();
    for (const g of this._chunkWallGfx.values()) g.destroy();
    this._chunkBlockGfx.clear();
    this._chunkWallGfx.clear();
    this.worldLayer.destroy({ children: true });
  }

  // ---------------------------------------------------------------------------
  // Draw frame
  // ---------------------------------------------------------------------------

  draw(state: TerrariaState, camera: TerrariaCamera): void {
    const sw = camera.screenW;
    const sh = camera.screenH;
    const bounds = camera.getVisibleBounds();

    // Sky background
    this._drawSky(state, sw, sh);

    // Parallax mountains
    this._drawParallax(state, camera, sw, sh);

    // Determine visible chunks
    const minCX = worldToChunkX(Math.max(0, bounds.minX));
    const maxCX = worldToChunkX(Math.min(TB.WORLD_WIDTH - 1, bounds.maxX));

    // Draw walls and blocks for visible chunks
    for (let cx = minCX; cx <= maxCX; cx++) {
      const chunk = state.chunks.get(cx);
      if (!chunk) continue;

      // Walls
      if (chunk.dirty || !this._chunkWallGfx.has(cx)) {
        this._rebuildChunkWalls(cx, state, bounds);
      }
      const wallGfx = this._chunkWallGfx.get(cx)!;
      const wallScreenX = cx * CW * TS - camera.x * TS + sw / 2;
      wallGfx.position.set(wallScreenX, 0);
      wallGfx.visible = true;

      // Blocks
      if (chunk.dirty || !this._chunkBlockGfx.has(cx)) {
        this._rebuildChunkBlocks(cx, state, bounds);
        chunk.dirty = false;
      }
      const blockGfx = this._chunkBlockGfx.get(cx)!;
      blockGfx.position.set(wallScreenX, 0);
      blockGfx.visible = true;
    }

    // Hide off-screen chunk graphics
    for (const [cx, gfx] of this._chunkBlockGfx) {
      if (cx < minCX || cx > maxCX) gfx.visible = false;
    }
    for (const [cx, gfx] of this._chunkWallGfx) {
      if (cx < minCX || cx > maxCX) gfx.visible = false;
    }

    // Light overlay
    this._drawLightOverlay(state, camera, bounds);

    // Block cursor
    this._drawCursor(state, camera);
  }

  // ---------------------------------------------------------------------------
  // Sky
  // ---------------------------------------------------------------------------

  private _drawSky(state: TerrariaState, sw: number, sh: number): void {
    const t = state.timeOfDay;
    // Lerp between night (dark blue) and day (sky blue)
    const dayness = Math.max(0, Math.min(1, Math.sin(t * Math.PI * 2 - Math.PI / 2) * 0.5 + 0.5));
    const r = Math.floor(0x0a + dayness * (0x87 - 0x0a));
    const g = Math.floor(0x0a + dayness * (0xCE - 0x0a));
    const b = Math.floor(0x18 + dayness * (0xEB - 0x18));
    const skyColor = (r << 16) | (g << 8) | b;

    this._skyGfx.clear();
    this._skyGfx.rect(0, 0, sw, sh);
    this._skyGfx.fill(skyColor);
  }

  // ---------------------------------------------------------------------------
  // Parallax
  // ---------------------------------------------------------------------------

  private _drawParallax(state: TerrariaState, camera: TerrariaCamera, sw: number, sh: number): void {
    this._parallaxGfx.clear();

    // Distant mountains (very slow parallax)
    const mountainOffset = -camera.x * 0.1 * TS;
    const baseY = sh * 0.55;
    this._parallaxGfx.moveTo(mountainOffset % (sw * 2), baseY);
    for (let i = 0; i < 20; i++) {
      const mx = (mountainOffset % (sw * 2)) + i * sw / 5;
      const my = baseY - 30 - Math.sin(i * 0.7 + 1.3) * 50 - Math.sin(i * 1.3) * 25;
      this._parallaxGfx.lineTo(mx, my);
    }
    this._parallaxGfx.lineTo(sw * 2 + mountainOffset, baseY);
    this._parallaxGfx.lineTo(sw * 2 + mountainOffset, sh);
    this._parallaxGfx.lineTo(mountainOffset % (sw * 2), sh);
    this._parallaxGfx.closePath();
    this._parallaxGfx.fill({ color: 0x2A3A2A, alpha: 0.4 });

    // Clouds
    const cloudOffset = (state.totalTime * 8) % (sw * 2);
    for (let i = 0; i < 8; i++) {
      const cx = ((i * sw / 4 - cloudOffset) % (sw * 2) + sw * 2) % (sw * 2) - sw / 4;
      const cy = 40 + Math.sin(i * 2.1) * 30;
      this._parallaxGfx.ellipse(cx, cy, 60 + i * 10, 15 + i * 3);
      this._parallaxGfx.fill({ color: 0xFFFFFF, alpha: 0.2 });
    }
  }

  // ---------------------------------------------------------------------------
  // Chunk rendering
  // ---------------------------------------------------------------------------

  private _rebuildChunkBlocks(cx: number, state: TerrariaState, bounds: { minY: number; maxY: number }): void {
    let gfx = this._chunkBlockGfx.get(cx);
    if (!gfx) {
      gfx = new Graphics();
      this._blockLayer.addChild(gfx);
      this._chunkBlockGfx.set(cx, gfx);
    }
    gfx.clear();

    const chunk = state.chunks.get(cx);
    if (!chunk) return;

    const screenH = state.screenH;
    const camY = state.camY;

    for (let lx = 0; lx < CW; lx++) {
      const wx = cx * CW + lx;
      const minY = Math.max(0, bounds.minY);
      const maxY = Math.min(WH - 1, bounds.maxY);
      for (let y = minY; y <= maxY; y++) {
        const bt = chunk.getBlock(lx, y);
        if (bt === BlockType.AIR) continue;
        const def = BLOCK_DEFS[bt];
        if (!def) continue;

        const px = lx * TS;
        const py = (camY - y) * TS + screenH / 2 - TS;

        // Depth-based color darkening (deeper = slightly darker)
        let color = def.color;
        if (def.solid && y < TB.SURFACE_Y) {
          const depthFactor = Math.max(0.55, 1 - (TB.SURFACE_Y - y) / (TB.SURFACE_Y * 1.5));
          color = _darkenColor(color, depthFactor);
        }

        gfx.rect(px, py, TS, TS);
        gfx.fill(color);

        // Block detail texturing
        if (def.solid && !def.transparent) {
          // Top highlight
          gfx.rect(px, py, TS, 1);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.1 });
          // Bottom shadow
          gfx.rect(px, py + TS - 1, TS, 1);
          gfx.fill({ color: 0x000000, alpha: 0.18 });
          // Left edge
          gfx.rect(px, py, 1, TS);
          gfx.fill({ color: 0xFFFFFF, alpha: 0.05 });

          // Procedural noise detail for stone/dirt (subtle pixel dots)
          if (bt === BlockType.STONE || bt === BlockType.COBBLESTONE || bt === BlockType.DIRT) {
            const hash = ((wx * 374761393 + y * 668265263) >>> 0) % 100;
            if (hash < 20) {
              const dotX = px + (hash % 4) * 4 + 2;
              const dotY = py + ((hash * 7) % 4) * 4 + 2;
              gfx.rect(dotX, dotY, 2, 2);
              gfx.fill({ color: hash < 10 ? 0xFFFFFF : 0x000000, alpha: 0.08 });
            }
          }

          // Grass top decoration
          if (bt === BlockType.GRASS) {
            // Little grass blades on top
            for (let gx = 0; gx < TS; gx += 3) {
              const gh = 1 + ((wx * 31 + gx * 17) >>> 0) % 3;
              gfx.rect(px + gx, py - gh, 1, gh);
              gfx.fill({ color: 0x5CBF55, alpha: 0.6 });
            }
          }
        }

        // Special block glow effects
        if (def.lightEmit > 4) {
          gfx.rect(px - 1, py - 1, TS + 2, TS + 2);
          gfx.fill({ color: def.color, alpha: 0.15 });
        }

        // Liquid shimmer
        if (def.liquid) {
          const shimmer = Math.sin((state.totalTime ?? 0) * 2 + wx * 0.5 + y * 0.3) * 0.1;
          gfx.rect(px, py, TS, 2);
          gfx.fill({ color: 0xFFFFFF, alpha: Math.max(0, 0.1 + shimmer) });
        }
      }
    }
  }

  private _rebuildChunkWalls(cx: number, state: TerrariaState, bounds: { minY: number; maxY: number }): void {
    let gfx = this._chunkWallGfx.get(cx);
    if (!gfx) {
      gfx = new Graphics();
      this._wallLayer.addChild(gfx);
      this._chunkWallGfx.set(cx, gfx);
    }
    gfx.clear();

    const chunk = state.chunks.get(cx);
    if (!chunk) return;

    const screenH = state.screenH;
    const camY = state.camY;

    const wallColors: Record<number, number> = {
      [WallType.NONE]: 0,
      [WallType.DIRT_WALL]: 0x453010,
      [WallType.STONE_WALL]: 0x404040,
      [WallType.WOOD_WALL]: 0x604020,
      [WallType.CASTLE_WALL]: 0x505060,
    };

    for (let lx = 0; lx < CW; lx++) {
      const minY = Math.max(0, bounds.minY);
      const maxY = Math.min(WH - 1, bounds.maxY);
      for (let y = minY; y <= maxY; y++) {
        const wt = chunk.getWall(lx, y);
        if (wt === WallType.NONE) continue;
        // Don't draw wall behind solid blocks
        const bt = chunk.getBlock(lx, y);
        if (bt !== BlockType.AIR && BLOCK_DEFS[bt]?.solid && !BLOCK_DEFS[bt]?.transparent) continue;

        const px = lx * TS;
        const py = (camY - y) * TS + screenH / 2 - TS;
        const color = wallColors[wt] ?? 0x333333;

        gfx.rect(px, py, TS, TS);
        gfx.fill({ color, alpha: 0.7 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Light overlay
  // ---------------------------------------------------------------------------

  private _drawLightOverlay(state: TerrariaState, camera: TerrariaCamera, bounds: { minX: number; maxX: number; minY: number; maxY: number }): void {
    this._lightOverlay.clear();

    const minX = Math.max(0, bounds.minX);
    const maxX = Math.min(TB.WORLD_WIDTH - 1, bounds.maxX);
    const minY = Math.max(0, bounds.minY);
    const maxY = Math.min(WH - 1, bounds.maxY);

    for (let wx = minX; wx <= maxX; wx++) {
      for (let wy = minY; wy <= maxY; wy++) {
        const cx = worldToChunkX(wx);
        const chunk = state.chunks.get(cx);
        if (!chunk) continue;
        const lx = worldToLocalX(wx);
        const light = chunk.getLight(lx, wy);
        if (light >= TB.MAX_LIGHT) continue;

        const darkness = (TB.MAX_LIGHT - light) / TB.MAX_LIGHT;
        if (darkness < 0.05) continue;

        const { sx, sy } = camera.worldToScreen(wx, wy + 1);
        this._lightOverlay.rect(sx, sy, TS, TS);
        this._lightOverlay.fill({ color: 0x000000, alpha: darkness * 0.85 });
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Block cursor
  // ---------------------------------------------------------------------------

  private _drawCursor(state: TerrariaState, camera: TerrariaCamera): void {
    this._cursorGfx.clear();
    const mt = state.player.miningTarget;
    if (!mt) return;

    const { sx, sy } = camera.worldToScreen(mt.wx, mt.wy + 1);
    // Selection outline
    this._cursorGfx.rect(sx, sy, TS, TS);
    this._cursorGfx.stroke({ color: 0xFFFFFF, width: 1, alpha: 0.6 });

    // Mining progress overlay
    if (mt.progress > 0) {
      const h = TS * mt.progress;
      this._cursorGfx.rect(sx, sy + TS - h, TS, h);
      this._cursorGfx.fill({ color: 0xFF0000, alpha: 0.3 });
    }
  }

  /** Force all chunks to redraw next frame. */
  markAllDirty(state: TerrariaState): void {
    for (const chunk of state.chunks.values()) {
      chunk.dirty = true;
    }
  }
}
