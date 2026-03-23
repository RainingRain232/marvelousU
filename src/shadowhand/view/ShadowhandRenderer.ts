// ---------------------------------------------------------------------------
// Shadowhand mode — rich procedural map renderer
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { HeistState, Guard, ThiefUnit, MapTile } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

const T = ShadowhandConfig.TILE_SIZE;
const HT = T / 2;

// Seeded deterministic noise for tile variation
function tileHash(x: number, y: number): number {
  let h = x * 374761393 + y * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return ((h ^ (h >> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Color palettes
// ---------------------------------------------------------------------------

const WALL_BASE = 0x252328;
const WALL_HI = 0x3a3640;
const WALL_LO = 0x16141a;
const FLOOR_BASE = 0x3a3530;
const FLOOR_HI = 0x44403a;
const FLOOR_LO = 0x2e2a26;
const DOOR_FRAME = 0x4a3a2a;
const DOOR_WOOD = 0x6a5a3a;
const DOOR_LOCK = 0x8a4a2a;
const WINDOW_FRAME = 0x3a4a5a;
const WINDOW_GLASS = 0x5a7a9a;

const ALERT_COLORS: Record<AlertLevel, number> = {
  [AlertLevel.UNAWARE]: 0x44aa44,
  [AlertLevel.SUSPICIOUS]: 0xddaa22,
  [AlertLevel.ALARMED]: 0xff3333,
};

export class ShadowhandRenderer {
  readonly container = new Container();
  private _mapGfx = new Graphics();
  private _detailGfx = new Graphics(); // procedural tile details
  private _entityGfx = new Graphics();
  private _fogGfx = new Graphics();
  private _lightGfx = new Graphics();
  private _offsetX = 0;
  private _offsetY = 0;
  private _mapDrawn = false;

  init(): void {
    this.container.removeChildren();
    // Atmospheric background layer
    const bgGfx = new Graphics();
    bgGfx.rect(-2000, -2000, 6000, 6000).fill({ color: 0x050508 });
    // Distant castle wall silhouette (static backdrop)
    for (let bx = -500; bx < 3000; bx += 120 + Math.sin(bx * 0.01) * 40) {
      const bh = 30 + Math.sin(bx * 0.03) * 15;
      bgGfx.rect(bx, -200 - bh, 80 + Math.sin(bx * 0.02) * 20, bh).fill({ color: 0x0a0a10, alpha: 0.3 });
      // Battlements
      for (let mx = bx; mx < bx + 80; mx += 12) {
        bgGfx.rect(mx, -200 - bh - 6, 6, 6).fill({ color: 0x0a0a10, alpha: 0.25 });
      }
    }
    // Fog banks at edges
    for (let fy = -100; fy < 2000; fy += 80) {
      const fw = 200 + Math.sin(fy * 0.02) * 100;
      bgGfx.ellipse(-100, fy, fw, 30).fill({ color: 0x0a0a14, alpha: 0.08 });
      bgGfx.ellipse(2500, fy, fw, 30).fill({ color: 0x0a0a14, alpha: 0.08 });
    }
    this.container.addChild(bgGfx);

    this._mapGfx = new Graphics();
    this._detailGfx = new Graphics();
    this._lightGfx = new Graphics();
    this._fogGfx = new Graphics();
    this._entityGfx = new Graphics();
    this.container.addChild(this._mapGfx);
    this.container.addChild(this._detailGfx);
    this.container.addChild(this._lightGfx);
    this.container.addChild(this._fogGfx);
    this.container.addChild(this._entityGfx);
    this._mapDrawn = false;
  }

  setOffset(x: number, y: number): void {
    this._offsetX = x;
    this._offsetY = y;
  }

  // ---------------------------------------------------------------------------
  // Map tiles — rich procedural detail
  // ---------------------------------------------------------------------------

  drawMap(heist: HeistState): void {
    const g = this._mapGfx;
    const d = this._detailGfx;
    g.clear();
    d.clear();
    const map = heist.map;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (!tile.revealed) continue;
        const px = x * T + this._offsetX;
        const py = y * T + this._offsetY;
        const h = tileHash(x, y);

        switch (tile.type) {
          case "wall": this._drawWall(g, d, px, py, x, y, map, h); break;
          case "floor": this._drawFloor(g, d, px, py, h, tile); break;
          case "door": this._drawDoor(g, d, px, py, h, false); break;
          case "locked_door": this._drawDoor(g, d, px, py, h, true); break;
          case "window": this._drawWindow(g, d, px, py, h); break;
          case "entry_point": this._drawEntryPoint(g, d, px, py, h); break;
          case "loot_spot": this._drawFloor(g, d, px, py, h, tile); this._drawLootSparkle(d, px, py); break;
          case "primary_loot": this._drawFloor(g, d, px, py, h, tile); this._drawPrimaryLoot(d, px, py); break;
          case "trap": this._drawFloor(g, d, px, py, h, tile); if (tile.trapArmed) this._drawTrap(d, px, py); break;
          case "secret_door": this._drawWall(g, d, px, py, x, y, map, h); this._drawSecretDoorHint(d, px, py, h); break;
          case "stairs_up": this._drawStairs(g, d, px, py, true); break;
          case "stairs_down": this._drawStairs(g, d, px, py, false); break;
          default: {
            // Unknown tile fallback — warning checkerboard
            g.rect(px, py, T, T).fill({ color: FLOOR_BASE });
            for (let cy = 0; cy < 4; cy++) for (let cx = 0; cx < 4; cx++) {
              if ((cx + cy) % 2 === 0) d.rect(px + cx * 8, py + cy * 8, 8, 8).fill({ color: 0x332233, alpha: 0.2 });
            }
            break;
          }
        }

        // Caltrops overlay
        if (tile.caltrops) this._drawCaltrops(d, px, py, h);

        // Smoke overlay — organic bezier blobs with drift
        if (tile.smoke > 0) {
          const sa = Math.min(0.65, tile.smoke / 4);
          const t = Date.now() / 800;
          // Base haze
          g.rect(px, py, T, T).fill({ color: 0x999999, alpha: sa * 0.2 });
          // Drifting cloud puffs (bezier blobs)
          for (let si = 0; si < 4; si++) {
            const drift = Math.sin(t + si * 1.7 + x) * 3;
            const sx = px + tileHash(x + si, y + 99) * T + drift;
            const sy = py + tileHash(x + 99, y + si) * T + Math.cos(t + si * 2.3) * 2;
            const sr = 5 + tileHash(x + si, y + si) * 8;
            // Organic blob shape
            d.moveTo(sx - sr, sy);
            d.bezierCurveTo(sx - sr, sy - sr * 0.8, sx + sr, sy - sr * 0.8, sx + sr, sy);
            d.bezierCurveTo(sx + sr, sy + sr * 0.8, sx - sr, sy + sr * 0.8, sx - sr, sy);
            d.fill({ color: si < 2 ? 0xcccccc : 0xaaaaaa, alpha: sa * 0.25 });
          }
          // Wispy tendrils at edges
          if (sa > 0.3) {
            const wx = px + HT + Math.sin(t * 1.5 + x) * 6;
            const wy = py + Math.cos(t + y) * 4;
            d.moveTo(wx, wy).bezierCurveTo(wx + 8, wy - 4, wx + 12, wy + 2, wx + 14, wy - 6).stroke({ color: 0xcccccc, width: 1.5, alpha: sa * 0.15 });
          }
        }

        // Torch on wall
        if (tile.torchSource) this._drawTorch(d, px, py, x, y, map);
      }
    }
  }

  private _drawWall(g: Graphics, d: Graphics, px: number, py: number, tx: number, ty: number, map: HeistState["map"], h: number): void {
    // Base wall with slight color variation per tile
    const baseShade = h < 0.3 ? WALL_BASE : h < 0.6 ? 0x282530 : 0x2c2935;
    g.rect(px, py, T, T).fill({ color: baseShade });

    // Stone brick pattern with per-brick shading
    const brickH = T / 3;
    for (let row = 0; row < 3; row++) {
      const by = py + row * brickH;
      const offset = (row % 2) * HT;
      // Individual brick shade variation
      for (let col = 0; col < 2; col++) {
        const bx = px + offset + col * HT;
        const bw = Math.min(HT, px + T - bx);
        if (bw > 0) {
          const brickShade = tileHash(tx * 3 + col, ty * 3 + row) < 0.5 ? 0x2a2730 : 0x262330;
          d.rect(bx + 0.5, by + 0.5, bw - 1, brickH - 1).fill({ color: brickShade, alpha: 0.3 });
        }
      }
      // Mortar lines (horizontal)
      d.moveTo(px, by).lineTo(px + T, by).stroke({ color: WALL_LO, width: 0.8, alpha: 0.45 });
      // Vertical mortar
      d.moveTo(px + offset, by).lineTo(px + offset, by + brickH).stroke({ color: WALL_LO, width: 0.6, alpha: 0.35 });
      if (px + offset + HT <= px + T) {
        d.moveTo(px + offset + HT, by).lineTo(px + offset + HT, by + brickH).stroke({ color: WALL_LO, width: 0.6, alpha: 0.35 });
      }
    }

    // Edge bevels — adjacent-to-floor faces get highlight/shadow
    const adjTop = ty > 0 && map.tiles[ty - 1]?.[tx]?.type !== "wall" && map.tiles[ty - 1]?.[tx]?.type !== "secret_door";
    const adjBot = ty < map.height - 1 && map.tiles[ty + 1]?.[tx]?.type !== "wall" && map.tiles[ty + 1]?.[tx]?.type !== "secret_door";
    const adjLeft = tx > 0 && map.tiles[ty]?.[tx - 1]?.type !== "wall" && map.tiles[ty]?.[tx - 1]?.type !== "secret_door";
    const adjRight = tx < map.width - 1 && map.tiles[ty]?.[tx + 1]?.type !== "wall" && map.tiles[ty]?.[tx + 1]?.type !== "secret_door";

    if (adjTop) {
      d.moveTo(px, py + 1).lineTo(px + T, py + 1).stroke({ color: WALL_HI, width: 1.5, alpha: 0.4 });
      d.moveTo(px, py + 2.5).lineTo(px + T, py + 2.5).stroke({ color: WALL_HI, width: 0.5, alpha: 0.15 });
    }
    if (adjBot) {
      d.moveTo(px, py + T - 1).lineTo(px + T, py + T - 1).stroke({ color: 0x000000, width: 1.5, alpha: 0.35 });
      d.moveTo(px, py + T - 2.5).lineTo(px + T, py + T - 2.5).stroke({ color: 0x000000, width: 0.5, alpha: 0.12 });
    }
    if (adjLeft) {
      d.moveTo(px + 1, py).lineTo(px + 1, py + T).stroke({ color: WALL_HI, width: 1, alpha: 0.2 });
    }
    if (adjRight) {
      d.moveTo(px + T - 1, py).lineTo(px + T - 1, py + T).stroke({ color: 0x000000, width: 1, alpha: 0.2 });
    }

    // Corner shadow where two exposed edges meet
    if (adjBot && adjRight) {
      d.circle(px + T - 2, py + T - 2, 3).fill({ color: 0x000000, alpha: 0.08 });
    }

    // Weathering: moss, cracks, stains
    if (h < 0.1) {
      // Moss patch (organic blob)
      const mx = px + 4 + h * 20, my = py + T * 0.6;
      d.moveTo(mx, my).bezierCurveTo(mx - 3, my - 2, mx - 4, my + 3, mx, my + 4).bezierCurveTo(mx + 4, my + 3, mx + 3, my - 2, mx, my).fill({ color: 0x2a4a2a, alpha: 0.3 });
    }
    if (h > 0.88 && h < 0.95) {
      // Crack line (bezier for organic feel)
      const cx1 = px + 4, cy1 = py + h * 20;
      d.moveTo(cx1, cy1).bezierCurveTo(cx1 + 6, cy1 + 3, cx1 + 10, cy1 + 8, cx1 + T * 0.6, cy1 + T * 0.4).stroke({ color: 0x1a1820, width: 0.8, alpha: 0.35 });
    }
    if (h > 0.4 && h < 0.45) {
      // Water stain (dark drip)
      d.moveTo(px + HT, py).bezierCurveTo(px + HT - 1, py + 6, px + HT + 1, py + 12, px + HT, py + T * 0.6).stroke({ color: 0x1a1a22, width: 1.5, alpha: 0.15 });
    }
  }

  private _drawFloor(g: Graphics, d: Graphics, px: number, py: number, h: number, _tile: MapTile): void {
    // Varied stone floor — 3 shade tiers
    const shade = h < 0.33 ? FLOOR_BASE : h < 0.66 ? FLOOR_HI : 0x3d3832;
    g.rect(px, py, T, T).fill({ color: shade });

    // Stone tile edges with bevel effect
    d.moveTo(px + 1, py + 1).lineTo(px + T - 1, py + 1).stroke({ color: 0x454038, width: 0.6, alpha: 0.2 });
    d.moveTo(px + 1, py + 1).lineTo(px + 1, py + T - 1).stroke({ color: 0x454038, width: 0.6, alpha: 0.15 });
    d.moveTo(px + 1, py + T - 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x1a1816, width: 0.6, alpha: 0.2 });
    d.moveTo(px + T - 1, py + 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x1a1816, width: 0.6, alpha: 0.15 });

    // Inner stone texture — faint diagonal grain
    d.moveTo(px + 3, py + T - 2).lineTo(px + T - 2, py + 3).stroke({ color: FLOOR_LO, width: 0.3, alpha: 0.08 });
    d.moveTo(px + 8, py + T - 2).lineTo(px + T - 2, py + 8).stroke({ color: FLOOR_LO, width: 0.3, alpha: 0.06 });

    // Bezier crack with branching
    if (h > 0.82) {
      const cx1 = px + 3 + h * 6, cy1 = py + 2;
      const cx2 = px + T * 0.4 + h * 4, cy2 = py + T * 0.5;
      d.moveTo(cx1, cy1).bezierCurveTo(cx1 + 3, cy1 + 5, cx2 - 2, cy2 - 3, cx2, cy2).stroke({ color: FLOOR_LO, width: 0.7, alpha: 0.25 });
      d.moveTo(cx2, cy2).bezierCurveTo(cx2 + 2, cy2 + 4, cx2 + 5, cy2 + 7, cx2 + 3, py + T - 3).stroke({ color: FLOOR_LO, width: 0.5, alpha: 0.18 });
      // Branch crack
      d.moveTo(cx2 - 1, cy2 + 1).bezierCurveTo(cx2 - 4, cy2 + 2, cx2 - 6, cy2 + 5, cx2 - 5, cy2 + 8).stroke({ color: FLOOR_LO, width: 0.4, alpha: 0.15 });
    }

    // Scattered pebbles (3-4 per tile)
    if (h > 0.55 && h < 0.72) {
      for (let pi = 0; pi < 3; pi++) {
        const ph2 = tileHash(Math.floor(px) + pi, Math.floor(py) + pi);
        const pbx = px + 4 + ph2 * (T - 8);
        const pby = py + 4 + tileHash(Math.floor(py) + pi, Math.floor(px) + pi) * (T - 8);
        d.ellipse(pbx, pby, 1.5 + ph2, 1 + ph2 * 0.5).fill({ color: FLOOR_LO, alpha: 0.25 });
        // Pebble highlight
        d.circle(pbx - 0.3, pby - 0.3, 0.5).fill({ color: 0x4a4640, alpha: 0.15 });
      }
    }

    // Worn area (lighter patch where foot traffic scuffs stone)
    if (h > 0.15 && h < 0.22) {
      d.ellipse(px + HT, py + HT, T * 0.35, T * 0.25).fill({ color: 0x3e3a36, alpha: 0.12 });
    }

    // Dust spots
    if (h > 0.3 && h < 0.38) {
      d.circle(px + HT + h * 6, py + HT - 2, 3 + h * 3).fill({ color: 0x2e2a26, alpha: 0.1 });
      d.circle(px + 5 + h * 10, py + T - 6, 2).fill({ color: 0x2e2a26, alpha: 0.07 });
    }

    // Occasional stain mark (darker irregular blob)
    if (h > 0.92) {
      d.moveTo(px + 8, py + 10).bezierCurveTo(px + 12, py + 8, px + 18, py + 12, px + 16, py + 16).bezierCurveTo(px + 14, py + 18, px + 8, py + 15, px + 8, py + 10).fill({ color: 0x22201e, alpha: 0.12 });
    }
  }

  private _drawDoor(g: Graphics, d: Graphics, px: number, py: number, _h: number, locked: boolean): void {
    // Stone frame with depth
    g.rect(px, py, T, T).fill({ color: DOOR_FRAME });
    // Frame bevel
    d.moveTo(px + 1, py + 1).lineTo(px + T - 1, py + 1).stroke({ color: 0x5a4a3a, width: 0.8, alpha: 0.35 });
    d.moveTo(px + 1, py + 1).lineTo(px + 1, py + T - 1).stroke({ color: 0x5a4a3a, width: 0.8, alpha: 0.25 });
    d.moveTo(px + 1, py + T - 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x2a1a0a, width: 0.8, alpha: 0.3 });
    d.moveTo(px + T - 1, py + 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x2a1a0a, width: 0.8, alpha: 0.2 });

    // Door panel with wood grain
    const inset = 5;
    const dw = T - inset * 2, dh = T - inset * 2;
    g.rect(px + inset, py + inset, dw, dh).fill({ color: locked ? DOOR_LOCK : DOOR_WOOD });
    // Wood grain lines (horizontal, slight curve via bezier)
    for (let gi = 0; gi < 4; gi++) {
      const gy = py + inset + 3 + gi * (dh / 4);
      const wobble = (gi % 2 ? 1 : -1) * 1.5;
      d.moveTo(px + inset + 2, gy).bezierCurveTo(px + HT - 3, gy + wobble, px + HT + 3, gy - wobble, px + T - inset - 2, gy).stroke({ color: 0x000000, width: 0.4, alpha: 0.15 });
    }
    // Center panel division
    d.moveTo(px + HT, py + inset + 1).lineTo(px + HT, py + T - inset - 1).stroke({ color: 0x000000, width: 1, alpha: 0.2 });
    // Panel highlight (top-left edge)
    d.moveTo(px + inset + 1, py + inset + 1).lineTo(px + T - inset - 1, py + inset + 1).stroke({ color: 0x7a6a4a, width: 0.5, alpha: 0.25 });

    // Iron hinges (detailed)
    for (const hy of [py + 8, py + T - 8]) {
      d.rect(px + inset - 1, hy - 2, 4, 4).fill({ color: 0x444444 });
      d.circle(px + inset + 1, hy, 1).fill({ color: 0x666666 }); // rivet
      d.rect(px + inset - 1, hy - 2, 4, 4).stroke({ color: 0x333333, width: 0.5 });
    }

    // Lock/handle
    if (locked) {
      // Reinforced iron bands across door
      d.moveTo(px + inset + 1, py + inset + 4).lineTo(px + T - inset - 1, py + inset + 4).stroke({ color: 0x3a3a3a, width: 2 });
      d.moveTo(px + inset + 1, py + T - inset - 4).lineTo(px + T - inset - 1, py + T - inset - 4).stroke({ color: 0x3a3a3a, width: 2 });
      // Iron band rivets
      for (const bx of [px + inset + 3, px + HT, px + T - inset - 3]) {
        d.circle(bx, py + inset + 4, 1).fill({ color: 0x555555 });
        d.circle(bx, py + T - inset - 4, 1).fill({ color: 0x555555 });
      }
      // Heavy lock plate
      d.roundRect(px + T - inset - 8, py + HT - 5, 8, 10, 1.5).fill({ color: 0x3a3a3a });
      d.roundRect(px + T - inset - 8, py + HT - 5, 8, 10, 1.5).stroke({ color: 0x4a4a4a, width: 0.8 });
      // Keyhole (larger, more detailed)
      d.circle(px + T - inset - 4, py + HT - 2, 2).fill({ color: 0x0a0a0a });
      d.moveTo(px + T - inset - 5, py + HT).lineTo(px + T - inset - 5, py + HT + 3).lineTo(px + T - inset - 3, py + HT + 3).lineTo(px + T - inset - 3, py + HT).closePath().fill({ color: 0x0a0a0a });
      // Pulsing magic ward glow
      const lockPulse = 0.1 + Math.sin(Date.now() / 600) * 0.06;
      d.circle(px + T - inset - 4, py + HT, 8).fill({ color: 0xff3322, alpha: lockPulse * 0.7 });
      d.circle(px + T - inset - 4, py + HT, 5).fill({ color: 0xff4433, alpha: lockPulse * 1.2 });
      d.circle(px + T - inset - 4, py + HT, 2.5).fill({ color: 0xff6644, alpha: lockPulse * 2 });
      // Ward rune circle
      d.circle(px + HT, py + HT, 8).stroke({ color: 0xff3322, width: 0.5, alpha: lockPulse * 0.5 });
    } else {
      // Handle ring (ornate)
      d.circle(px + T - inset - 4, py + HT, 3).stroke({ color: 0x555555, width: 1.2 });
      d.circle(px + T - inset - 4, py + HT + 3, 1).fill({ color: 0x555555 }); // ring bottom weight
      d.circle(px + T - inset - 4, py + HT - 3, 1.2).fill({ color: 0x666666 }); // mount
    }
  }

  private _drawSecretDoorHint(d: Graphics, px: number, py: number, h: number): void {
    const seam = px + HT + (h - 0.5) * 2;
    const t = Date.now() / 2000;

    // Primary seam crack (vertical bezier with wobble)
    d.moveTo(seam, py + 2).bezierCurveTo(seam + 0.5, py + 8, seam - 0.8, py + HT - 2, seam - 0.3, py + HT).stroke({ color: 0x1a1820, width: 0.7, alpha: 0.22 });
    d.moveTo(seam - 0.3, py + HT).bezierCurveTo(seam + 0.3, py + HT + 3, seam - 0.5, py + T - 8, seam, py + T - 2).stroke({ color: 0x1a1820, width: 0.6, alpha: 0.18 });

    // Secondary micro-cracks branching from seam
    d.moveTo(seam - 0.5, py + 10).bezierCurveTo(seam - 3, py + 11, seam - 5, py + 10, seam - 6, py + 9).stroke({ color: 0x1a1820, width: 0.4, alpha: 0.12 });
    d.moveTo(seam + 0.3, py + T - 10).bezierCurveTo(seam + 2, py + T - 9, seam + 4, py + T - 10, seam + 5, py + T - 12).stroke({ color: 0x1a1820, width: 0.3, alpha: 0.1 });

    // Discolored mortar strip (different color from normal wall)
    d.rect(px + 4, py + T / 3 - 1, HT - 1, 2).fill({ color: 0x2a2530, alpha: 0.12 });
    d.rect(px + HT + 2, py + T * 2 / 3 - 1, HT - 4, 2).fill({ color: 0x282430, alpha: 0.1 });

    // Worn floor patch (larger, more noticeable)
    d.ellipse(px + HT, py + T - 1, 8, 2.5).fill({ color: 0x2e2a26, alpha: 0.1 });
    d.ellipse(px + HT - 2, py + T, 5, 1.5).fill({ color: 0x302c28, alpha: 0.06 });

    // Faint draft wisps (animated air movement, 2 streams)
    const dy1 = Math.sin(t + h * 10) * 2;
    const dy2 = Math.cos(t * 0.7 + h * 5) * 1.5;
    d.moveTo(seam - 1, py + HT - 3 + dy1).bezierCurveTo(seam - 4, py + HT - 5 + dy1, seam - 7, py + HT - 3 + dy1, seam - 10, py + HT - 4 + dy1).stroke({ color: 0x888888, width: 0.3, alpha: 0.06 });
    d.moveTo(seam + 0.5, py + HT + 4 + dy2).bezierCurveTo(seam - 2, py + HT + 2 + dy2, seam - 5, py + HT + 4 + dy2, seam - 8, py + HT + 3 + dy2).stroke({ color: 0x888888, width: 0.3, alpha: 0.05 });

    // Dust motes near crack (2 tiny animated dots)
    for (let mi = 0; mi < 2; mi++) {
      const mx = seam + Math.sin(t * 1.5 + mi * 3) * 4;
      const my = py + HT + Math.cos(t * 1.2 + mi * 2) * 6;
      d.circle(mx, my, 0.5).fill({ color: 0xaaaaaa, alpha: 0.04 + Math.sin(t * 2 + mi) * 0.02 });
    }
  }

  private _drawWindow(g: Graphics, d: Graphics, px: number, py: number, h: number): void {
    // Stone surround
    g.rect(px, py, T, T).fill({ color: WALL_BASE });
    const inset = 5;
    const ww = T - inset * 2, wh = T - inset * 2;
    const wx = px + inset, wy = py + inset;

    // Window recess (darker interior)
    d.rect(wx - 1, wy - 1, ww + 2, wh + 2).fill({ color: 0x0a0a14 });

    // Stone sill (bottom ledge)
    d.rect(wx - 2, wy + wh, ww + 4, 3).fill({ color: 0x3a3640 });
    d.moveTo(wx - 2, wy + wh).lineTo(wx + ww + 2, wy + wh).stroke({ color: 0x4a4650, width: 0.8, alpha: 0.4 });

    // Stone lintel (top)
    d.rect(wx - 2, wy - 3, ww + 4, 3).fill({ color: 0x3a3640 });

    // Leaded glass panes (4 panes with individual tint variation)
    const pw = ww / 2 - 1, ph = wh / 2 - 1;
    const panes = [[wx + 1, wy + 1], [wx + pw + 2, wy + 1], [wx + 1, wy + ph + 2], [wx + pw + 2, wy + ph + 2]];
    for (let pi = 0; pi < 4; pi++) {
      const [ppx, ppy] = panes[pi];
      const tint = tileHash(Math.floor(px) + pi, Math.floor(py) + pi * 3);
      const glassColor = tint < 0.3 ? 0x5577aa : tint < 0.6 ? 0x6688aa : 0x4a6a8a;
      d.rect(ppx, ppy, pw - 1, ph - 1).fill({ color: glassColor, alpha: 0.5 + tint * 0.2 });
      // Subtle diagonal reflection
      d.moveTo(ppx + 1, ppy + ph - 3).lineTo(ppx + pw - 3, ppy + 1).stroke({ color: 0xaabbcc, width: 0.5, alpha: 0.15 + tint * 0.1 });
    }

    // Lead came (dividers between panes)
    d.moveTo(wx + ww / 2, wy).lineTo(wx + ww / 2, wy + wh).stroke({ color: 0x444450, width: 2 });
    d.moveTo(wx, wy + wh / 2).lineTo(wx + ww, wy + wh / 2).stroke({ color: 0x444450, width: 2 });
    // Lead came highlight
    d.moveTo(wx + ww / 2 + 0.5, wy).lineTo(wx + ww / 2 + 0.5, wy + wh).stroke({ color: 0x555560, width: 0.5, alpha: 0.3 });

    // Outer frame with bevel
    d.rect(wx - 1, wy - 1, ww + 2, wh + 2).stroke({ color: WINDOW_FRAME, width: 1.5 });
    d.moveTo(wx - 1, wy - 1).lineTo(wx + ww + 1, wy - 1).stroke({ color: 0x5a6a7a, width: 0.5, alpha: 0.3 }); // top highlight

    // Moonlight cone casting inward (directional glow polygon)
    const glowDist = T * 1.5;
    d.moveTo(wx, wy + wh).lineTo(wx - glowDist * 0.3, wy + wh + glowDist);
    d.lineTo(wx + ww + glowDist * 0.3, wy + wh + glowDist).lineTo(wx + ww, wy + wh);
    d.closePath().fill({ color: 0x6688aa, alpha: 0.03 });

    // Graduated glow from window
    for (let r = 1; r <= 4; r++) {
      const gr = r * 4;
      d.circle(wx + ww / 2, wy + wh / 2, gr + 4).fill({ color: 0x5577aa, alpha: 0.015 / r });
    }

    // Condensation droplets (1-2 tiny dots)
    if (h > 0.7) {
      d.circle(wx + 3, wy + wh - 3, 0.8).fill({ color: 0x8899bb, alpha: 0.3 });
      d.circle(wx + ww - 5, wy + wh - 5, 0.6).fill({ color: 0x8899bb, alpha: 0.25 });
    }
  }

  private _drawEntryPoint(g: Graphics, d: Graphics, px: number, py: number, _h: number): void {
    g.rect(px, py, T, T).fill({ color: 0x141e14 });
    const pulse = 0.4 + Math.sin(Date.now() / 800) * 0.2;

    // Stone arch frame — masonry blocks
    const archL = px + 3, archR = px + T - 3, archTop = py + 4;
    // Left pillar blocks
    for (let bi = 0; bi < 4; bi++) {
      const by = py + 10 + bi * 5.5;
      d.rect(archL - 1, by, 5, 5).fill({ color: 0x3a4a3a, alpha: 0.5 });
      d.rect(archL - 1, by, 5, 5).stroke({ color: 0x2a3a2a, width: 0.4, alpha: 0.3 });
    }
    // Right pillar blocks
    for (let bi = 0; bi < 4; bi++) {
      const by = py + 10 + bi * 5.5;
      d.rect(archR - 4, by, 5, 5).fill({ color: 0x3a4a3a, alpha: 0.5 });
      d.rect(archR - 4, by, 5, 5).stroke({ color: 0x2a3a2a, width: 0.4, alpha: 0.3 });
    }
    // Arch curve (bezier with voussoir stones)
    d.moveTo(archL, py + 10).bezierCurveTo(archL, archTop, archR, archTop, archR, py + 10).stroke({ color: 0x4a5a4a, width: 2, alpha: 0.6 });
    // Inner arch curve
    d.moveTo(archL + 2, py + 10).bezierCurveTo(archL + 2, archTop + 2, archR - 2, archTop + 2, archR - 2, py + 10).stroke({ color: 0x2a3a2a, width: 1, alpha: 0.3 });
    // Keystone (center top — trapezoidal polygon)
    d.moveTo(px + HT - 3, archTop + 1).lineTo(px + HT + 3, archTop + 1).lineTo(px + HT + 2, archTop - 2).lineTo(px + HT - 2, archTop - 2).closePath().fill({ color: 0x5a6a5a, alpha: 0.6 });
    d.moveTo(px + HT - 2, archTop - 2).lineTo(px + HT + 2, archTop - 2).stroke({ color: 0x6a7a6a, width: 0.5, alpha: 0.3 }); // keystone highlight

    // Dark passage interior
    d.moveTo(archL + 3, py + 10).bezierCurveTo(archL + 3, archTop + 4, archR - 3, archTop + 4, archR - 3, py + 10).lineTo(archR - 3, py + T).lineTo(archL + 3, py + T).closePath().fill({ color: 0x0a140a, alpha: 0.5 });

    // Directional arrow polygon
    const ay = py + T - 6;
    d.moveTo(px + HT, py + 10).lineTo(px + HT - 4, ay).lineTo(px + HT - 1.5, ay).lineTo(px + HT - 1.5, py + T - 2).lineTo(px + HT + 1.5, py + T - 2).lineTo(px + HT + 1.5, ay).lineTo(px + HT + 4, ay).closePath().fill({ color: 0x44ff44, alpha: pulse * 0.4 });

    // Pulsing glow rings
    d.circle(px + HT, py + HT, T * 0.35).fill({ color: 0x44ff44, alpha: pulse * 0.06 });
    d.circle(px + HT, py + HT, T * 0.5).fill({ color: 0x44ff44, alpha: pulse * 0.03 });

    // Moss on archway
    d.circle(archL + 1, py + 14, 2).fill({ color: 0x2a4a2a, alpha: 0.25 });
    d.circle(archR - 2, py + 22, 1.5).fill({ color: 0x2a4a2a, alpha: 0.2 });
  }

  private _drawStairs(g: Graphics, d: Graphics, px: number, py: number, up: boolean): void {
    g.rect(px, py, T, T).fill({ color: 0x343040 });
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const sy = up ? py + T - (i + 1) * (T / steps) : py + i * (T / steps);
      const sw = T - i * 3;
      const sx = px + (T - sw) / 2;
      const sh = T / steps - 1;
      // Step face (top surface)
      d.rect(sx, sy, sw, sh).fill({ color: 0x4a4a5a, alpha: 0.6 + i * 0.06 });
      // Step edge highlight (front face visible)
      d.moveTo(sx, sy + sh).lineTo(sx + sw, sy + sh).stroke({ color: 0x5a5a6a, width: 0.8, alpha: 0.3 });
      // Step shadow (underneath)
      d.moveTo(sx, sy).lineTo(sx + sw, sy).stroke({ color: 0x222230, width: 0.6, alpha: 0.3 });
      // Worn edge — subtle irregular line
      if (i > 0) {
        d.moveTo(sx + 2, sy + sh - 0.5).bezierCurveTo(sx + sw * 0.3, sy + sh + 0.5, sx + sw * 0.7, sy + sh - 0.5, sx + sw - 2, sy + sh + 0.3).stroke({ color: 0x3a3a4a, width: 0.5, alpha: 0.2 });
      }
    }
    // Direction arrow polygon
    const ay = up ? py + 5 : py + T - 5;
    const dir = up ? -1 : 1;
    d.moveTo(px + HT, ay + dir * 8).lineTo(px + HT - 3, ay + dir * 3).lineTo(px + HT - 1, ay + dir * 3).lineTo(px + HT - 1, ay).lineTo(px + HT + 1, ay).lineTo(px + HT + 1, ay + dir * 3).lineTo(px + HT + 3, ay + dir * 3).closePath().fill({ color: 0x8888aa, alpha: 0.35 });
  }

  private _drawTorch(d: Graphics, px: number, py: number, tx: number, ty: number, _map: HeistState["map"]): void {
    const cx = px + HT, cy = py + HT;
    const t = Date.now();
    const flicker = Math.sin(t / 150 + tx * 3 + ty * 7) * 1.5;
    const flicker2 = Math.sin(t / 200 + tx * 5 + ty * 3) * 1.0;

    // Graduated glow rings (outer to inner — warm color temperature shift)
    const glowColors = [0x331100, 0x552200, 0x773300, 0xaa4400, 0xcc5500, 0xff7711];
    for (let r = glowColors.length - 1; r >= 0; r--) {
      const radius = (r + 1) * T * 0.55 + Math.sin(t / 400 + r) * 2;
      const alpha = 0.04 + 0.01 * (glowColors.length - r);
      d.circle(cx, cy, radius).fill({ color: glowColors[r], alpha });
    }

    // Torch bracket with iron detail
    d.rect(cx - 2.5, cy - 4, 5, 7).fill({ color: 0x3a2a1a });
    d.rect(cx - 2, cy - 4, 4, 1).fill({ color: 0x5a4a3a, alpha: 0.5 }); // bracket highlight
    d.rect(cx - 1, cy + 2, 2, 2).fill({ color: 0x555555 }); // iron nail

    // Flame — bezier organic shape with 4 layers
    // Outer flame (red)
    d.moveTo(cx - 3 + flicker * 0.2, cy - 3);
    d.bezierCurveTo(cx - 4, cy - 8, cx - 1 + flicker * 0.5, cy - 13, cx + flicker * 0.3, cy - 14);
    d.bezierCurveTo(cx + 1 + flicker * 0.5, cy - 13, cx + 4, cy - 8, cx + 3 + flicker * 0.2, cy - 3);
    d.closePath();
    d.fill({ color: 0xcc3300, alpha: 0.85 });
    // Middle flame (orange)
    d.moveTo(cx - 2 + flicker * 0.3, cy - 4);
    d.bezierCurveTo(cx - 3, cy - 8, cx + flicker * 0.4, cy - 12, cx + flicker * 0.3, cy - 12);
    d.bezierCurveTo(cx + flicker * 0.4, cy - 12, cx + 3, cy - 8, cx + 2 + flicker * 0.3, cy - 4);
    d.closePath();
    d.fill({ color: 0xff8822, alpha: 0.9 });
    // Inner flame (yellow)
    d.moveTo(cx - 1 + flicker2 * 0.2, cy - 5);
    d.bezierCurveTo(cx - 1.5, cy - 8, cx + flicker2 * 0.3, cy - 11, cx + flicker2 * 0.2, cy - 11);
    d.bezierCurveTo(cx + flicker2 * 0.3, cy - 11, cx + 1.5, cy - 8, cx + 1 + flicker2 * 0.2, cy - 5);
    d.closePath();
    d.fill({ color: 0xffcc44, alpha: 0.85 });
    // Core (white-hot)
    d.ellipse(cx + flicker * 0.15, cy - 7, 0.8, 2).fill({ color: 0xffeedd, alpha: 0.6 });

    // Rising embers (animated, time-based positions)
    for (let i = 0; i < 4; i++) {
      const seed = tileHash(tx + i * 7, ty + i * 13);
      const phase = ((t / 1200 + seed * 10) % 1); // 0-1 cycle
      const ex = cx + (seed - 0.5) * 10 + Math.sin(t / 300 + i * 2) * 3;
      const ey = cy - 12 - phase * 18;
      const ea = (1 - phase) * 0.5;
      const es = 1 - phase * 0.6;
      d.circle(ex, ey, es).fill({ color: i < 2 ? 0xffaa33 : 0xff6622, alpha: ea });
    }

    // Light pool on adjacent floor (subtle warm glow at torch base)
    d.ellipse(cx, cy + T * 0.3, T * 0.4, T * 0.15).fill({ color: 0xff8833, alpha: 0.06 });
  }

  private _drawLootSparkle(d: Graphics, px: number, py: number): void {
    const cx = px + HT, cy = py + HT;
    const t = Date.now() / 400;
    // Orbiting 4-pointed star sparkles
    for (let i = 0; i < 4; i++) {
      const angle = t + i * Math.PI / 2;
      const dist = 5 + Math.sin(t * 2 + i) * 2;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const sr = 1.5 + Math.sin(t * 3 + i * 1.5) * 0.5;
      const sa = 0.4 + Math.sin(t + i) * 0.3;
      // 4-pointed star polygon
      d.moveTo(sx, sy - sr * 1.5).lineTo(sx + sr * 0.4, sy - sr * 0.4).lineTo(sx + sr * 1.5, sy).lineTo(sx + sr * 0.4, sy + sr * 0.4);
      d.lineTo(sx, sy + sr * 1.5).lineTo(sx - sr * 0.4, sy + sr * 0.4).lineTo(sx - sr * 1.5, sy).lineTo(sx - sr * 0.4, sy - sr * 0.4);
      d.closePath().fill({ color: 0xffdd44, alpha: sa });
    }
    // Center faceted gem (diamond shape)
    d.moveTo(cx, cy - 4).lineTo(cx + 3, cy).lineTo(cx, cy + 3).lineTo(cx - 3, cy).closePath().fill({ color: 0xffdd44, alpha: 0.8 });
    d.moveTo(cx, cy - 4).lineTo(cx + 3, cy).lineTo(cx, cy - 0.5).closePath().fill({ color: 0xffee88, alpha: 0.5 }); // top facet highlight
    d.moveTo(cx, cy - 4).lineTo(cx - 3, cy).lineTo(cx, cy - 0.5).closePath().fill({ color: 0xccaa22, alpha: 0.3 }); // top facet shadow
    // Sparkle cross
    const sc = 0.3 + Math.sin(t * 4) * 0.2;
    d.moveTo(cx, cy - 6).lineTo(cx, cy + 6).stroke({ color: 0xffffff, width: 0.5, alpha: sc });
    d.moveTo(cx - 5, cy).lineTo(cx + 5, cy).stroke({ color: 0xffffff, width: 0.5, alpha: sc });
  }

  private _drawPrimaryLoot(d: Graphics, px: number, py: number): void {
    const cx = px + HT, cy = py + HT;
    const t = Date.now() / 500;

    // Radiant glow with pulsing
    for (let r = 1; r <= 6; r++) {
      const pulse = Math.sin(t + r * 0.7) * 0.3;
      const radius = r * 5 + Math.sin(t * 1.5 + r) * 2;
      d.circle(cx, cy, radius).fill({ color: r < 3 ? 0xffd700 : 0xffaa00, alpha: (0.06 + pulse * 0.02) / Math.sqrt(r) });
    }

    // Rotating light rays (8 rays, varying length)
    for (let i = 0; i < 8; i++) {
      const angle = t * 0.4 + i * Math.PI / 4;
      const len = 10 + Math.sin(t * 2 + i) * 4;
      d.moveTo(cx + Math.cos(angle) * 4, cy + Math.sin(angle) * 4);
      d.lineTo(cx + Math.cos(angle) * len, cy + Math.sin(angle) * len);
      d.stroke({ color: 0xffd700, width: 0.6 + Math.sin(t + i) * 0.3, alpha: 0.12 });
    }

    // Pedestal
    d.rect(cx - 5, cy + 4, 10, 3).fill({ color: 0x4a4a5a, alpha: 0.6 });
    d.moveTo(cx - 5, cy + 4).lineTo(cx + 5, cy + 4).stroke({ color: 0x6a6a7a, width: 0.5, alpha: 0.4 });

    // Faceted gem (hexagonal with face shading)
    const gemR = 6;
    // Left face (darker)
    d.moveTo(cx, cy - gemR).lineTo(cx - gemR * 0.87, cy - gemR * 0.3).lineTo(cx - gemR * 0.87, cy + gemR * 0.3).lineTo(cx, cy + gemR * 0.6).closePath().fill({ color: 0xcc9900, alpha: 0.9 });
    // Right face (lighter)
    d.moveTo(cx, cy - gemR).lineTo(cx + gemR * 0.87, cy - gemR * 0.3).lineTo(cx + gemR * 0.87, cy + gemR * 0.3).lineTo(cx, cy + gemR * 0.6).closePath().fill({ color: 0xffcc33, alpha: 0.9 });
    // Top face (brightest)
    d.moveTo(cx, cy - gemR).lineTo(cx - gemR * 0.5, cy - gemR * 0.5).lineTo(cx, cy - gemR * 0.2).lineTo(cx + gemR * 0.5, cy - gemR * 0.5).closePath().fill({ color: 0xffee66, alpha: 0.85 });
    // Edge highlights
    d.moveTo(cx, cy - gemR).lineTo(cx + gemR * 0.87, cy - gemR * 0.3).stroke({ color: 0xffffff, width: 0.8, alpha: 0.4 });
    d.moveTo(cx, cy - gemR).lineTo(cx - gemR * 0.87, cy - gemR * 0.3).stroke({ color: 0xffffff, width: 0.5, alpha: 0.2 });
    // Sparkle highlight
    const sparkle = 0.3 + Math.sin(t * 3) * 0.3;
    d.circle(cx - 2, cy - 3, 1.5).fill({ color: 0xffffff, alpha: sparkle });
  }

  private _drawTrap(d: Graphics, px: number, py: number): void {
    const cx = px + HT, cy = py + HT;
    const pulse = 0.25 + Math.sin(Date.now() / 500) * 0.1;
    // Circular pressure plate with teeth
    d.circle(cx, cy, 6).stroke({ color: 0xff4444, width: 0.8, alpha: pulse });
    d.circle(cx, cy, 4).stroke({ color: 0xff4444, width: 0.5, alpha: pulse * 0.7 });
    // Jaw teeth (polygon spikes around edge)
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const ox = cx + Math.cos(a) * 7, oy = cy + Math.sin(a) * 7;
      const la = a - 0.25, ra = a + 0.25;
      d.moveTo(cx + Math.cos(la) * 5, cy + Math.sin(la) * 5).lineTo(ox, oy).lineTo(cx + Math.cos(ra) * 5, cy + Math.sin(ra) * 5).stroke({ color: 0xff4444, width: 0.6, alpha: pulse * 0.6 });
    }
    // Center trigger pin
    d.circle(cx, cy, 1.5).fill({ color: 0xff6644, alpha: pulse });
  }

  private _drawCaltrops(d: Graphics, px: number, py: number, h: number): void {
    for (let i = 0; i < 6; i++) {
      const cx = px + 4 + tileHash(i, Math.floor(h * 1000)) * (T - 8);
      const cy = py + 4 + tileHash(Math.floor(h * 1000), i) * (T - 8);
      const rot = tileHash(i * 3, Math.floor(h * 999)) * Math.PI;
      const s = 2.5 + tileHash(i + 7, Math.floor(h * 500)) * 1.5;
      // 4-pointed barbed caltrop (rotated polygon)
      for (let p = 0; p < 4; p++) {
        const a = rot + p * Math.PI / 2;
        const tipX = cx + Math.cos(a) * s, tipY = cy + Math.sin(a) * s;
        const la = a - 0.3, ra = a + 0.3;
        d.moveTo(cx + Math.cos(la) * s * 0.3, cy + Math.sin(la) * s * 0.3);
        d.lineTo(tipX, tipY);
        d.lineTo(cx + Math.cos(ra) * s * 0.3, cy + Math.sin(ra) * s * 0.3);
        d.stroke({ color: 0xaaaaaa, width: 0.7, alpha: 0.5 });
      }
      // Center junction
      d.circle(cx, cy, 0.8).fill({ color: 0x888888, alpha: 0.5 });
      // Metallic highlight on one spike
      const ha = rot;
      d.moveTo(cx, cy).lineTo(cx + Math.cos(ha) * s * 0.7, cy + Math.sin(ha) * s * 0.7).stroke({ color: 0xcccccc, width: 0.3, alpha: 0.3 });
    }
  }

  // ---------------------------------------------------------------------------
  // Lighting overlay — graduated atmospheric lighting
  // ---------------------------------------------------------------------------

  drawLightOverlay(heist: HeistState): void {
    const g = this._lightGfx;
    g.clear();

    for (let y = 0; y < heist.map.height; y++) {
      for (let x = 0; x < heist.map.width; x++) {
        const tile = heist.map.tiles[y][x];
        if (!tile.revealed || tile.type === "wall") continue;

        const px = x * T + this._offsetX;
        const py = y * T + this._offsetY;

        if (!tile.lit) {
          // Deep shadow with cool blue undertone
          g.rect(px, py, T, T).fill({ color: 0x030308, alpha: 0.58 });
          g.rect(px, py, T, T).fill({ color: 0x0a0a2a, alpha: 0.1 });

          // Check proximity to lit tiles for gradient edge
          let nearLight = false;
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = x + dx, ny = y + dy;
            if (nx >= 0 && ny >= 0 && nx < heist.map.width && ny < heist.map.height) {
              if (heist.map.tiles[ny][nx].lit && heist.map.tiles[ny][nx].type !== "wall") {
                nearLight = true;
                break;
              }
            }
          }
          if (nearLight) {
            // Penumbra — softer shadow at light/dark boundary
            g.rect(px, py, T, T).fill({ color: 0xff8833, alpha: 0.03 });
          }
        } else {
          // Warm torch glow — intensity based on torch proximity
          let torchNearby = tile.torchSource;
          if (!torchNearby) {
            for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0], [-1, -1], [1, -1], [-1, 1], [1, 1]]) {
              const nx = x + dx, ny = y + dy;
              if (nx >= 0 && ny >= 0 && nx < heist.map.width && ny < heist.map.height) {
                if (heist.map.tiles[ny][nx].torchSource) { torchNearby = true; break; }
              }
            }
          }
          if (tile.torchSource) {
            g.rect(px, py, T, T).fill({ color: 0xffaa44, alpha: 0.1 });
          } else if (torchNearby) {
            g.rect(px, py, T, T).fill({ color: 0xffaa44, alpha: 0.06 });
          } else {
            g.rect(px, py, T, T).fill({ color: 0xffaa44, alpha: 0.03 });
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Fog of war — soft edges
  // ---------------------------------------------------------------------------

  drawFog(heist: HeistState): void {
    const g = this._fogGfx;
    g.clear();

    for (let y = 0; y < heist.map.height; y++) {
      for (let x = 0; x < heist.map.width; x++) {
        const px = x * T + this._offsetX;
        const py = y * T + this._offsetY;

        if (!heist.map.tiles[y][x].revealed) {
          g.rect(px, py, T, T).fill({ color: 0x08080c, alpha: 0.95 });
        } else {
          // Detect adjacent fog directions
          const fogTop = (y <= 0 || !heist.map.tiles[y - 1][x].revealed);
          const fogBot = (y >= heist.map.height - 1 || !heist.map.tiles[y + 1][x].revealed);
          const fogLeft = (x <= 0 || !heist.map.tiles[y][x - 1].revealed);
          const fogRight = (x >= heist.map.width - 1 || !heist.map.tiles[y][x + 1].revealed);
          const adjFog = fogTop || fogBot || fogLeft || fogRight;

          if (adjFog) {
            const h = tileHash(x, y);
            const h2 = tileHash(x + 99, y + 77);
            // Base fog tint
            g.rect(px, py, T, T).fill({ color: 0x08080c, alpha: 0.22 });
            // Secondary darker tint closer to fog edge
            g.rect(px, py, T, T).fill({ color: 0x040408, alpha: 0.06 });

            // Directional fog wisps — 2 layers per edge for density
            if (fogTop) {
              g.moveTo(px, py).bezierCurveTo(px + h * T * 0.6 + 4, py + 5, px + T * 0.5, py + 7, px + T, py).lineTo(px + T, py).lineTo(px, py).fill({ color: 0x08080c, alpha: 0.16 });
              g.moveTo(px + 4, py).bezierCurveTo(px + h2 * T * 0.4 + 6, py + 3, px + T * 0.3, py + 4, px + T - 4, py).lineTo(px + T - 4, py).lineTo(px + 4, py).fill({ color: 0x0a0a10, alpha: 0.08 });
              // Wispy tendril
              g.moveTo(px + h * T, py).bezierCurveTo(px + h * T + 3, py + 6, px + h * T - 2, py + 10, px + h * T + 1, py + 12).stroke({ color: 0x0c0c14, width: 2, alpha: 0.06 });
            }
            if (fogBot) {
              g.moveTo(px, py + T).bezierCurveTo(px + h * T * 0.4 + 2, py + T - 6, px + T * 0.6, py + T - 8, px + T, py + T).lineTo(px + T, py + T).lineTo(px, py + T).fill({ color: 0x08080c, alpha: 0.16 });
              g.moveTo(px + 5, py + T).bezierCurveTo(px + h2 * T * 0.5 + 3, py + T - 4, px + T * 0.4, py + T - 5, px + T - 5, py + T).fill({ color: 0x0a0a10, alpha: 0.08 });
            }
            if (fogLeft) {
              g.moveTo(px, py).bezierCurveTo(px + 6, py + T * h * 0.5, px + 8, py + T * 0.6, px, py + T).lineTo(px, py).fill({ color: 0x08080c, alpha: 0.14 });
              g.moveTo(px, py + 4).bezierCurveTo(px + 4, py + T * h2 * 0.4, px + 5, py + T * 0.5, px, py + T - 4).fill({ color: 0x0a0a10, alpha: 0.07 });
              // Tendril
              g.moveTo(px, py + h * T).bezierCurveTo(px + 5, py + h * T - 2, px + 8, py + h * T + 1, px + 10, py + h * T - 1).stroke({ color: 0x0c0c14, width: 1.5, alpha: 0.05 });
            }
            if (fogRight) {
              g.moveTo(px + T, py).bezierCurveTo(px + T - 6, py + T * h * 0.4, px + T - 8, py + T * 0.5, px + T, py + T).lineTo(px + T, py + T).fill({ color: 0x08080c, alpha: 0.14 });
              g.moveTo(px + T, py + 5).bezierCurveTo(px + T - 4, py + T * h2 * 0.5, px + T - 6, py + T * 0.4, px + T, py + T - 5).fill({ color: 0x0a0a10, alpha: 0.07 });
            }

            // Diagonal corner fog (if two adjacent edges have fog)
            if (fogTop && fogLeft) {
              g.moveTo(px, py).bezierCurveTo(px + 4, py + 2, px + 2, py + 4, px, py + 6).lineTo(px, py).fill({ color: 0x06060a, alpha: 0.1 });
            }
            if (fogTop && fogRight) {
              g.moveTo(px + T, py).bezierCurveTo(px + T - 4, py + 2, px + T - 2, py + 4, px + T, py + 6).lineTo(px + T, py).fill({ color: 0x06060a, alpha: 0.1 });
            }
            if (fogBot && fogLeft) {
              g.moveTo(px, py + T).bezierCurveTo(px + 4, py + T - 2, px + 2, py + T - 4, px, py + T - 6).lineTo(px, py + T).fill({ color: 0x06060a, alpha: 0.1 });
            }
            if (fogBot && fogRight) {
              g.moveTo(px + T, py + T).bezierCurveTo(px + T - 4, py + T - 2, px + T - 2, py + T - 4, px + T, py + T - 6).lineTo(px + T, py + T).fill({ color: 0x06060a, alpha: 0.1 });
            }
          }
        }
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Entities — character silhouettes
  // ---------------------------------------------------------------------------

  drawEntities(heist: HeistState): void {
    const g = this._entityGfx;
    g.clear();

    // Vision cones
    for (const guard of heist.guards) {
      if (guard.stunTimer > 0 || guard.sleepTimer > 0) continue;
      this._drawVisionCone(g, guard);
    }

    // Guards
    for (const guard of heist.guards) {
      this._drawGuard(g, guard);
    }

    // Rescue NPC — kneeling prisoner figure
    if (heist.objective.type === "rescue" && !heist.objective.rescued) {
      const npx = heist.objective.npcX * T + this._offsetX + HT;
      const npy = heist.objective.npcY * T + this._offsetY + HT;
      const pulse = 0.5 + Math.sin(Date.now() / 500) * 0.3;

      // Pulsing rescue marker glow
      g.circle(npx, npy, 14).fill({ color: 0xaaaa44, alpha: pulse * 0.05 });
      g.circle(npx, npy, 10).stroke({ color: 0xaaaa44, width: 1.5, alpha: pulse * 0.3 });

      // Kneeling body
      g.moveTo(npx - 3, npy + 2).lineTo(npx - 2, npy - 2).lineTo(npx + 2, npy - 2).lineTo(npx + 3, npy + 2).lineTo(npx + 1, npy + 5).lineTo(npx - 1, npy + 5).closePath().fill({ color: 0x8a8a44, alpha: pulse });
      // Head (bowed)
      g.circle(npx, npy - 5, 3).fill({ color: 0x9a9a55, alpha: pulse });
      // Arms behind back
      g.moveTo(npx - 3, npy).bezierCurveTo(npx - 5, npy + 2, npx - 4, npy + 5, npx - 2, npy + 4).stroke({ color: 0x8a8a44, width: 1.5, alpha: pulse * 0.7 });
      g.moveTo(npx + 3, npy).bezierCurveTo(npx + 5, npy + 2, npx + 4, npy + 5, npx + 2, npy + 4).stroke({ color: 0x8a8a44, width: 1.5, alpha: pulse * 0.7 });
      // Chain links (small connected ovals)
      for (let ci = 0; ci < 4; ci++) {
        const clx = npx - 5 - ci * 2.5, cly = npy + 4 + ci * 1.5;
        g.ellipse(clx, cly, 2, 1.5).stroke({ color: 0x777777, width: 0.8 });
      }
      for (let ci = 0; ci < 4; ci++) {
        const crx = npx + 5 + ci * 2.5, cry = npy + 4 + ci * 1.5;
        g.ellipse(crx, cry, 2, 1.5).stroke({ color: 0x777777, width: 0.8 });
      }
      // Shackle bolts
      g.circle(npx - 3, npy + 3, 1).fill({ color: 0x666666 });
      g.circle(npx + 3, npy + 3, 1).fill({ color: 0x666666 });
    }

    // Thieves
    for (const thief of heist.thieves) {
      if (!thief.alive) continue;
      this._drawThief(g, thief);
    }

    // Noise events — expanding polygon wave rings
    for (const noise of heist.noiseEvents) {
      const npx = noise.x * T + this._offsetX + HT;
      const npy = noise.y * T + this._offsetY + HT;
      const alpha = Math.min(0.25, noise.timer / 2);
      const r = noise.radius * T;
      // Outer ring — polygon with slight irregularity
      const segs = 16;
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        const wobble1 = 1 + Math.sin(a1 * 3 + noise.timer * 4) * 0.08;
        const wobble2 = 1 + Math.sin(a2 * 3 + noise.timer * 4) * 0.08;
        g.moveTo(npx + Math.cos(a1) * r * wobble1, npy + Math.sin(a1) * r * wobble1);
        g.lineTo(npx + Math.cos(a2) * r * wobble2, npy + Math.sin(a2) * r * wobble2);
      }
      g.stroke({ color: 0xffff88, width: 1.5, alpha });
      // Inner ring
      for (let i = 0; i < segs; i++) {
        const a1 = (i / segs) * Math.PI * 2;
        const a2 = ((i + 1) / segs) * Math.PI * 2;
        g.moveTo(npx + Math.cos(a1) * r * 0.5, npy + Math.sin(a1) * r * 0.5);
        g.lineTo(npx + Math.cos(a2) * r * 0.5, npy + Math.sin(a2) * r * 0.5);
      }
      g.stroke({ color: 0xffff88, width: 0.7, alpha: alpha * 0.4 });
      // Sound wave peaks (radial spokes)
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.moveTo(npx + Math.cos(a) * r * 0.3, npy + Math.sin(a) * r * 0.3);
        g.lineTo(npx + Math.cos(a) * r * 0.7, npy + Math.sin(a) * r * 0.7);
        g.stroke({ color: 0xffff88, width: 0.4, alpha: alpha * 0.25 });
      }
    }

    // Particles — with trail effect
    for (const p of heist.particles) {
      const ppx = p.x * T + this._offsetX + HT;
      const ppy = p.y * T + this._offsetY + HT;
      const lr = p.life / p.maxLife;
      // Trail (fainter, offset)
      g.circle(ppx - p.vx * 0.02, ppy - p.vy * 0.02, p.size * lr * 0.6).fill({ color: p.color, alpha: lr * 0.3 });
      // Main particle
      g.circle(ppx, ppy, p.size * lr).fill({ color: p.color, alpha: lr * 0.8 });
    }

    // Ambient dust motes — floating particles in lit areas
    const t = Date.now();
    for (let mi = 0; mi < 20; mi++) {
      const seed = mi * 7919 + 1301;
      const phase = ((t / 4000 + (seed % 1000) / 1000) % 1);
      const mx = ((seed * 16807) % 2147483647) / 2147483647;
      const my = ((seed * 48271) % 2147483647) / 2147483647;
      const dustX = mx * heist.map.width * T + this._offsetX;
      const dustY = my * heist.map.height * T + this._offsetY;
      const drift = Math.sin(t / 2000 + mi * 1.3) * 3;
      const rise = Math.cos(t / 3000 + mi * 0.7) * 2;
      const alpha = 0.08 + Math.sin(t / 1500 + mi * 2.1) * 0.04;
      // Only show motes in roughly lit areas (check tile)
      const tileX = Math.floor((dustX - this._offsetX) / T);
      const tileY = Math.floor((dustY - this._offsetY) / T);
      if (tileX >= 0 && tileX < heist.map.width && tileY >= 0 && tileY < heist.map.height) {
        if (heist.map.tiles[tileY][tileX].lit && heist.map.tiles[tileY][tileX].revealed) {
          g.circle(dustX + drift, dustY + rise, 0.8 + phase * 0.5).fill({ color: 0xffddaa, alpha });
        }
      }
    }

    // Distant torch flicker — orange glow spots that pulse at edges of visible map
    for (let fi = 0; fi < 6; fi++) {
      const fseed = fi * 3571 + 997;
      const fx = ((fseed * 16807) % 2147483647) / 2147483647 * heist.map.width * T + this._offsetX;
      const fy = ((fseed * 48271) % 2147483647) / 2147483647 * heist.map.height * T + this._offsetY;
      const flickerAlpha = 0.02 + Math.sin(t / 300 + fi * 2.3) * 0.015;
      g.circle(fx, fy, 15 + Math.sin(t / 400 + fi) * 5).fill({ color: 0xff8833, alpha: flickerAlpha });
    }

    // Screen shake
    if (heist.screenShake > 0) {
      this._offsetX += (Math.random() - 0.5) * heist.screenShake;
      this._offsetY += (Math.random() - 0.5) * heist.screenShake;
    }
  }

  private _drawVisionCone(g: Graphics, guard: Guard): void {
    const px = guard.x * T + this._offsetX + HT;
    const py = guard.y * T + this._offsetY + HT;
    const range = ShadowhandConfig.GUARD_VISION_RANGE * T;
    const halfAngle = ShadowhandConfig.GUARD_VISION_ANGLE;
    const color = ALERT_COLORS[guard.alertLevel];
    const steps = 20;

    // Layered gradient cone (3 layers: outer faint, mid, inner bright)
    for (let layer = 0; layer < 3; layer++) {
      const layerR = range * (1 - layer * 0.25);
      const layerAlpha = 0.03 + layer * 0.025;
      g.moveTo(px, py);
      for (let i = 0; i <= steps; i++) {
        const a = guard.angle - halfAngle + (2 * halfAngle * i / steps);
        // Slight jagged edge variation per segment
        const jag = 1 + Math.sin(i * 2.7 + guard.angle * 3) * 0.06;
        const fadeR = layerR * (1 - 0.12 * Math.abs(i - steps / 2) / (steps / 2)) * jag;
        g.lineTo(px + Math.cos(a) * fadeR, py + Math.sin(a) * fadeR);
      }
      g.closePath();
      g.fill({ color, alpha: layerAlpha });
    }

    // Outer edge — dashed polygon segments
    for (let i = 0; i < steps; i++) {
      if (i % 2 === 0) { // dashed effect
        const a1 = guard.angle - halfAngle + (2 * halfAngle * i / steps);
        const a2 = guard.angle - halfAngle + (2 * halfAngle * (i + 1) / steps);
        const jag1 = 1 + Math.sin(i * 2.7 + guard.angle * 3) * 0.06;
        const jag2 = 1 + Math.sin((i + 1) * 2.7 + guard.angle * 3) * 0.06;
        g.moveTo(px + Math.cos(a1) * range * jag1, py + Math.sin(a1) * range * jag1);
        g.lineTo(px + Math.cos(a2) * range * jag2, py + Math.sin(a2) * range * jag2);
        g.stroke({ color, width: 0.6, alpha: 0.15 });
      }
    }

    // Center line (facing direction emphasis)
    g.moveTo(px, py).lineTo(px + Math.cos(guard.angle) * range * 0.3, py + Math.sin(guard.angle) * range * 0.3).stroke({ color, width: 0.8, alpha: 0.08 });

    // Peripheral vision arcs (wider, fainter)
    const periAngle = halfAngle * 1.4;
    for (const side of [-1, 1]) {
      const a = guard.angle + side * periAngle;
      g.moveTo(px, py).lineTo(px + Math.cos(a) * range * 0.4, py + Math.sin(a) * range * 0.4).stroke({ color, width: 0.4, alpha: 0.05 });
    }
  }

  private _drawGuard(g: Graphics, guard: Guard): void {
    const px = guard.x * T + this._offsetX + HT;
    const py = guard.y * T + this._offsetY + HT;
    const color = ALERT_COLORS[guard.alertLevel];
    const da = guard.angle;
    const cos = Math.cos(da), sin = Math.sin(da);

    if (guard.stunTimer > 0 || guard.sleepTimer > 0) {
      const isSleeping = guard.sleepTimer > 0;

      if (isSleeping) {
        // SLEEPING — curled up on side, peaceful pose
        // Body curled (C-shape)
        g.moveTo(px - 6, py - 2).bezierCurveTo(px - 7, py + 3, px - 3, py + 6, px + 2, py + 5);
        g.bezierCurveTo(px + 5, py + 4, px + 6, py + 1, px + 4, py - 2);
        g.bezierCurveTo(px + 2, py - 4, px - 4, py - 4, px - 6, py - 2);
        g.fill({ color: 0x444455, alpha: 0.5 });
        // Head resting on arm
        g.circle(px - 4, py - 3, 3.5).fill({ color: 0x555566, alpha: 0.5 });
        // Arm under head
        g.moveTo(px - 7, py - 1).lineTo(px - 4, py - 5).stroke({ color: 0x444455, width: 1.5, alpha: 0.4 });
        // Knees drawn up
        g.moveTo(px + 2, py + 5).bezierCurveTo(px + 5, py + 5, px + 6, py + 2, px + 4, py).stroke({ color: 0x444455, width: 2, alpha: 0.35 });
        // Floating Z's (ascending, growing)
        const t = Date.now() / 600;
        for (let i = 0; i < 3; i++) {
          const zy = py - 10 - i * 7 - Math.sin(t + i) * 2;
          const za = 0.55 - i * 0.12;
          const zs = 3 + i * 0.8;
          g.moveTo(px - zs + i * 2, zy).lineTo(px + zs + i * 2, zy).lineTo(px - zs + i * 2, zy - zs * 1.2).lineTo(px + zs + i * 2, zy - zs * 1.2).stroke({ color: 0x8888ff, width: 1.2, alpha: za });
        }
        // Peaceful aura
        g.circle(px, py, 10).fill({ color: 0x6666aa, alpha: 0.03 });
      } else {
        // STUNNED — face-down crumpled, impact pose
        // Crumpled body (face-down)
        g.moveTo(px - 6, py + 1).bezierCurveTo(px - 4, py - 4, px + 4, py - 3, px + 7, py);
        g.bezierCurveTo(px + 6, py + 4, px - 5, py + 5, px - 6, py + 1);
        g.fill({ color: 0x553333, alpha: 0.5 });
        // Head face-down
        g.ellipse(px + 3, py - 2, 3, 2.5).fill({ color: 0x664444, alpha: 0.45 });
        // Arms splayed outward
        g.moveTo(px - 3, py).lineTo(px - 8, py - 4).stroke({ color: 0x553333, width: 1.5, alpha: 0.4 });
        g.moveTo(px + 4, py + 1).lineTo(px + 8, py - 2).stroke({ color: 0x553333, width: 1.5, alpha: 0.4 });
        // Legs bent awkwardly
        g.moveTo(px - 1, py + 3).lineTo(px - 4, py + 7).stroke({ color: 0x553333, width: 1.5, alpha: 0.35 });
        g.moveTo(px + 2, py + 3).lineTo(px + 6, py + 6).stroke({ color: 0x553333, width: 1.5, alpha: 0.35 });
        // Impact stars orbiting
        for (let i = 0; i < 4; i++) {
          const a = Date.now() / 350 + i * 1.57;
          const sx = px + Math.cos(a) * 10, sy = py - 10 + Math.sin(a) * 4;
          for (let p = 0; p < 5; p++) {
            const pa = -Math.PI / 2 + p * Math.PI * 2 / 5;
            const pb = pa + Math.PI / 5;
            const or = 2.5, ir = 1;
            if (p === 0) g.moveTo(sx + Math.cos(pa) * or, sy + Math.sin(pa) * or);
            else g.lineTo(sx + Math.cos(pa) * or, sy + Math.sin(pa) * or);
            g.lineTo(sx + Math.cos(pb) * ir, sy + Math.sin(pb) * ir);
          }
          g.closePath().fill({ color: 0xffff44, alpha: 0.45 });
        }
        // Red stun haze
        g.circle(px, py - 5, 8).fill({ color: 0xff4444, alpha: 0.04 });
      }
      return;
    }

    if (guard.isDog) {
      // Hound — muscular body polygon
      const hx = px + cos * 5, hy = py + sin * 5; // head offset
      // Body (angled polygon following direction)
      g.moveTo(px - cos * 6 - sin * 4, py - sin * 6 + cos * 4);
      g.bezierCurveTo(px - sin * 5, py + cos * 5, px + sin * 5, py - cos * 5, px + cos * 3 - sin * 3, py + sin * 3 + cos * 3);
      g.bezierCurveTo(px + cos * 5, py + sin * 5, px + cos * 6 + sin * 3, py + sin * 6 - cos * 3, px + cos * 6 - sin * 3, py + sin * 6 + cos * 3);
      g.closePath().fill({ color });
      // Chest (lighter shade)
      g.ellipse(px + cos * 2, py + sin * 2, 4, 3).fill({ color, alpha: 0.7 });
      // Head — wedge-shaped snout polygon
      g.moveTo(hx - sin * 3, hy + cos * 3).lineTo(hx + cos * 5, hy + sin * 5).lineTo(hx + sin * 3, hy - cos * 3).closePath().fill({ color });
      // Jaw line
      g.moveTo(hx + cos * 3 - sin * 2, hy + sin * 3 + cos * 2).lineTo(hx + cos * 5, hy + sin * 5).stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
      // Pointed ears (triangular)
      const ePerp = 3.5;
      g.moveTo(hx - sin * ePerp, hy + cos * ePerp).lineTo(hx + cos * 2 - sin * (ePerp + 3), hy + sin * 2 + cos * (ePerp + 3)).lineTo(hx + cos * 1 - sin * ePerp, hy + sin * 1 + cos * ePerp).closePath().fill({ color });
      g.moveTo(hx + sin * ePerp, hy - cos * ePerp).lineTo(hx + cos * 2 + sin * (ePerp + 3), hy + sin * 2 - cos * (ePerp + 3)).lineTo(hx + cos * 1 + sin * ePerp, hy + sin * 1 - cos * ePerp).closePath().fill({ color });
      // Inner ear
      g.moveTo(hx - sin * (ePerp - 1), hy + cos * (ePerp - 1)).lineTo(hx + cos * 1.5 - sin * (ePerp + 1.5), hy + sin * 1.5 + cos * (ePerp + 1.5)).lineTo(hx + cos * 0.5 - sin * (ePerp - 1), hy + sin * 0.5 + cos * (ePerp - 1)).closePath().fill({ color: 0xaa6666, alpha: 0.4 });
      // Eyes — amber diamonds
      const elx = hx + cos * 2 - sin * 2, ely = hy + sin * 2 + cos * 2;
      const erx = hx + cos * 2 + sin * 2, ery = hy + sin * 2 - cos * 2;
      g.moveTo(elx - 1, ely).lineTo(elx, ely - 1).lineTo(elx + 1, ely).lineTo(elx, ely + 1).closePath().fill({ color: 0xffaa22 });
      g.moveTo(erx - 1, ery).lineTo(erx, ery - 1).lineTo(erx + 1, ery).lineTo(erx, ery + 1).closePath().fill({ color: 0xffaa22 });
      // Tail — feathered bezier with fur strokes
      const tx = px - cos * 7, ty = py - sin * 7;
      g.moveTo(tx, ty).bezierCurveTo(tx - sin * 5, ty + cos * 5, tx - cos * 3 - sin * 8, ty - sin * 3 + cos * 8, tx - cos * 2 - sin * 6, ty - sin * 2 + cos * 6).stroke({ color, width: 2 });
      g.moveTo(tx - cos * 1 - sin * 4, ty - sin * 1 + cos * 4).bezierCurveTo(tx - cos * 3 - sin * 6, ty - sin * 3 + cos * 6, tx - cos * 4 - sin * 7, ty - sin * 4 + cos * 7, tx - cos * 3 - sin * 5, ty - sin * 3 + cos * 5).stroke({ color, width: 1 });
      // Legs (simple strokes)
      g.moveTo(px - sin * 3, py + cos * 3).lineTo(px - sin * 4, py + cos * 4 + 3).stroke({ color, width: 1.5 });
      g.moveTo(px + sin * 3, py - cos * 3).lineTo(px + sin * 4, py - cos * 4 + 3).stroke({ color, width: 1.5 });
    } else {
      // Human guard — armored silhouette
      // Legs (slightly apart)
      g.moveTo(px - 2, py + 4).lineTo(px - 3, py + 9).stroke({ color, width: 2 });
      g.moveTo(px + 2, py + 4).lineTo(px + 3, py + 9).stroke({ color, width: 2 });
      // Boots
      g.ellipse(px - 3, py + 10, 2.5, 1.5).fill({ color: 0x3a2a1a });
      g.ellipse(px + 3, py + 10, 2.5, 1.5).fill({ color: 0x3a2a1a });
      // Torso — armored polygon (wider shoulders, narrow waist)
      g.moveTo(px - 7, py - 2).lineTo(px - 5, py - 6).lineTo(px - 3, py - 8).lineTo(px + 3, py - 8).lineTo(px + 5, py - 6).lineTo(px + 7, py - 2).lineTo(px + 4, py + 4).lineTo(px - 4, py + 4).closePath().fill({ color });
      // Armor plate highlight
      g.moveTo(px - 5, py - 5).lineTo(px - 2, py - 7).lineTo(px + 2, py - 7).lineTo(px + 5, py - 5).stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
      // Belt
      g.moveTo(px - 5, py + 1).lineTo(px + 5, py + 1).stroke({ color: 0x3a2a1a, width: 1.5 });
      g.circle(px, py + 1, 1).fill({ color: 0x666644 }); // buckle
      // Chainmail texture (short horizontal strokes on torso)
      for (let ci = 0; ci < 3; ci++) {
        const cy = py - 4 + ci * 2;
        g.moveTo(px - 3, cy).lineTo(px + 3, cy).stroke({ color: 0xffffff, width: 0.3, alpha: 0.08 });
      }
      // Head — helmeted
      g.circle(px, py - 10, 4).fill({ color }); // helmet base
      // Visor slit
      g.moveTo(px - 2.5, py - 10).lineTo(px + 2.5, py - 10).stroke({ color: 0x111111, width: 1.2 });
      // Helmet rim
      g.moveTo(px - 4, py - 7).bezierCurveTo(px - 5, py - 10, px - 5, py - 14, px, py - 14.5);
      g.bezierCurveTo(px + 5, py - 14, px + 5, py - 10, px + 4, py - 7);
      g.stroke({ color, width: 1 });
      // Nose guard
      g.moveTo(px, py - 14).lineTo(px, py - 9).stroke({ color, width: 1.2 });

      if (guard.isElite) {
        // Plume — feathered crest using bezier polygon
        g.moveTo(px, py - 14).bezierCurveTo(px - 2, py - 18, px - 1, py - 22, px + 1, py - 24);
        g.bezierCurveTo(px + 3, py - 22, px + 4, py - 18, px + 2, py - 14);
        g.closePath().fill({ color: 0xcc2222, alpha: 0.7 });
        // Feather barbs
        g.moveTo(px, py - 16).lineTo(px - 2, py - 18).stroke({ color: 0xaa1111, width: 0.5, alpha: 0.4 });
        g.moveTo(px + 1, py - 18).lineTo(px + 3, py - 20).stroke({ color: 0xaa1111, width: 0.5, alpha: 0.4 });
        // Gold trim on armor
        g.moveTo(px - 7, py - 2).lineTo(px - 5, py - 6).stroke({ color: 0xffd700, width: 0.8, alpha: 0.35 });
        g.moveTo(px + 7, py - 2).lineTo(px + 5, py - 6).stroke({ color: 0xffd700, width: 0.8, alpha: 0.35 });
        // Star emblem on chest
        for (let sp = 0; sp < 5; sp++) {
          const sa = -Math.PI / 2 + sp * Math.PI * 2 / 5;
          const sb = sa + Math.PI / 5;
          if (sp === 0) g.moveTo(px + Math.cos(sa) * 2.5, py - 3 + Math.sin(sa) * 2.5);
          else g.lineTo(px + Math.cos(sa) * 2.5, py - 3 + Math.sin(sa) * 2.5);
          g.lineTo(px + Math.cos(sb) * 1, py - 3 + Math.sin(sb) * 1);
        }
        g.closePath().fill({ color: 0xffd700, alpha: 0.4 });
      }

      // Weapon — spear with barbed head polygon
      const wDist = 12;
      const wx = px + cos * wDist, wy = py + sin * wDist;
      const wsx = px + cos * 5, wsy = py + sin * 5;
      // Shaft
      g.moveTo(wsx, wsy).lineTo(wx, wy).stroke({ color: 0x6a5a3a, width: 1.5 });
      // Spearhead (diamond polygon)
      const tipX = wx + cos * 3, tipY = wy + sin * 3;
      g.moveTo(tipX, tipY);
      g.lineTo(wx - sin * 2, wy + cos * 2);
      g.lineTo(wx - cos * 1, wy - sin * 1);
      g.lineTo(wx + sin * 2, wy - cos * 2);
      g.closePath().fill({ color: 0xaaaaaa });
      g.moveTo(tipX, tipY).lineTo(wx - cos * 1, wy - sin * 1).stroke({ color: 0xcccccc, width: 0.5, alpha: 0.5 }); // edge highlight
    }

    // Alert indicators — rich polygon symbols with animated effects
    if (guard.alertLevel === AlertLevel.SUSPICIOUS) {
      const qx = px, qy = py - 18;
      const qPulse = 0.7 + Math.sin(Date.now() / 400) * 0.2;

      // Backdrop glow (diamond shape)
      g.moveTo(qx, qy - 4).lineTo(qx + 6, qy + 4).lineTo(qx, qy + 12).lineTo(qx - 6, qy + 4).closePath().fill({ color: 0xffff00, alpha: 0.04 });

      // "?" — bold bezier with outline
      g.moveTo(qx - 2.5, qy + 3).bezierCurveTo(qx - 3.5, qy - 3, qx + 3.5, qy - 5, qx + 2.5, qy - 1).bezierCurveTo(qx + 1.5, qy + 1.5, qx + 0.5, qy + 2.5, qx, qy + 5).stroke({ color: 0x222200, width: 3.5 }); // shadow
      g.moveTo(qx - 2.5, qy + 3).bezierCurveTo(qx - 3.5, qy - 3, qx + 3.5, qy - 5, qx + 2.5, qy - 1).bezierCurveTo(qx + 1.5, qy + 1.5, qx + 0.5, qy + 2.5, qx, qy + 5).stroke({ color: 0xffff00, width: 2.5 });

      // Period dot (filled circle with highlight)
      g.circle(qx, qy + 8, 2).fill({ color: 0xffff00, alpha: qPulse });
      g.circle(qx - 0.5, qy + 7.5, 0.8).fill({ color: 0xffffff, alpha: 0.3 }); // highlight

      // Expanding awareness ring
      const ringR = 8 + Math.sin(Date.now() / 300) * 2;
      g.circle(qx, qy + 4, ringR).stroke({ color: 0xffff00, width: 0.5, alpha: 0.08 });
    } else if (guard.alertLevel === AlertLevel.ALARMED) {
      const ex = px, ey = py - 20;
      const pulse = 0.3 + Math.sin(Date.now() / 100) * 0.2;

      // Danger backdrop (hexagonal burst)
      for (let bi = 0; bi < 6; bi++) {
        const ba = bi * Math.PI / 3;
        const br = 8 + Math.sin(Date.now() / 150 + bi) * 2;
        g.moveTo(ex, ey + 5).lineTo(ex + Math.cos(ba) * br, ey + 5 + Math.sin(ba) * br).stroke({ color: 0xff0000, width: 0.5, alpha: pulse * 0.1 });
      }

      // "!" — thick with shadow and outline
      g.roundRect(ex - 2, ey + 0.5, 4, 9, 1).fill({ color: 0x440000 }); // shadow
      g.roundRect(ex - 1.8, ey, 3.6, 8.5, 1).fill({ color: 0xff0000 });
      g.roundRect(ex - 1.8, ey, 3.6, 8.5, 1).stroke({ color: 0xff4444, width: 0.5, alpha: 0.4 }); // highlight
      // Period (larger, pulsing)
      g.circle(ex, ey + 12, 2.5).fill({ color: 0xff0000, alpha: pulse + 0.3 });
      g.circle(ex - 0.5, ey + 11.5, 1).fill({ color: 0xff6666, alpha: 0.3 });

      // Pulsing danger aura rings (3 concentric)
      g.circle(ex, ey + 5, 12).fill({ color: 0xff0000, alpha: pulse * 0.06 });
      g.circle(ex, ey + 5, 8).fill({ color: 0xff0000, alpha: pulse * 0.09 });
      g.circle(ex, ey + 5, 5).fill({ color: 0xff0000, alpha: pulse * 0.12 });
    }
  }

  private _drawThief(g: Graphics, thief: ThiefUnit): void {
    const px = thief.x * T + this._offsetX + HT;
    const py = thief.y * T + this._offsetY + HT;
    const crouching = thief.crouching;
    const t = Date.now();

    // Selection — rotating diamond frame with sparkle particles
    if (thief.selected) {
      const pulse = 0.5 + Math.sin(t / 400) * 0.2;
      const sr = 13;
      const rotOff = t / 8000; // slow rotation

      // Outer glow ring
      g.circle(px, py, sr + 2).fill({ color: 0x44ff44, alpha: pulse * 0.03 });

      // Diamond-cornered polygon frame
      g.moveTo(px, py - sr).lineTo(px + sr * 0.7, py - sr * 0.7).lineTo(px + sr, py).lineTo(px + sr * 0.7, py + sr * 0.7);
      g.lineTo(px, py + sr).lineTo(px - sr * 0.7, py + sr * 0.7).lineTo(px - sr, py).lineTo(px - sr * 0.7, py - sr * 0.7).closePath();
      g.stroke({ color: 0x44ff44, width: 1.5, alpha: pulse });

      // Inner thinner frame
      const ir = sr * 0.85;
      g.moveTo(px, py - ir).lineTo(px + ir * 0.7, py - ir * 0.7).lineTo(px + ir, py).lineTo(px + ir * 0.7, py + ir * 0.7);
      g.lineTo(px, py + ir).lineTo(px - ir * 0.7, py + ir * 0.7).lineTo(px - ir, py).lineTo(px - ir * 0.7, py - ir * 0.7).closePath();
      g.stroke({ color: 0x44ff44, width: 0.5, alpha: pulse * 0.3 });

      // Corner diamonds (4 cardinal)
      for (let ci = 0; ci < 4; ci++) {
        const ca = -Math.PI / 2 + ci * Math.PI / 2;
        const cdx = px + Math.cos(ca) * sr, cdy = py + Math.sin(ca) * sr;
        g.moveTo(cdx, cdy - 2.5).lineTo(cdx + 2.5, cdy).lineTo(cdx, cdy + 2.5).lineTo(cdx - 2.5, cdy).closePath().fill({ color: 0x44ff44, alpha: pulse * 0.6 });
        g.moveTo(cdx, cdy - 1.5).lineTo(cdx + 1.5, cdy).lineTo(cdx, cdy + 1.5).lineTo(cdx - 1.5, cdy).closePath().fill({ color: 0xaaffaa, alpha: pulse * 0.3 });
      }

      // Orbiting sparkle particles (6 tiny stars rotating around)
      for (let si = 0; si < 6; si++) {
        const sa = rotOff + si * Math.PI / 3;
        const sdist = sr + 1 + Math.sin(t / 300 + si * 1.5) * 2;
        const spx = px + Math.cos(sa) * sdist;
        const spy = py + Math.sin(sa) * sdist;
        const sAlpha = 0.3 + Math.sin(t / 200 + si * 2) * 0.2;
        // 4-point micro star
        g.moveTo(spx, spy - 1.5).lineTo(spx + 0.5, spy).lineTo(spx, spy + 1.5).lineTo(spx - 0.5, spy).closePath().fill({ color: 0x88ffaa, alpha: sAlpha });
      }
    }

    const bodyColor = thief.disguised ? 0xcc8844 : thief.shadowMeld ? 0x3322aa : 0x2266cc;
    const bodyAlpha = thief.shadowMeld ? 0.35 : 1.0;
    const darkCloak = thief.shadowMeld ? 0x110022 : 0x1a1a2a;

    if (crouching) {
      // Crouching — hunched polygon figure
      // Bent legs
      g.moveTo(px - 4, py + 3).lineTo(px - 5, py + 6).lineTo(px - 3, py + 8).stroke({ color: bodyColor, width: 2, alpha: bodyAlpha });
      g.moveTo(px + 2, py + 3).lineTo(px + 4, py + 6).lineTo(px + 2, py + 8).stroke({ color: bodyColor, width: 2, alpha: bodyAlpha });
      // Hunched torso polygon
      g.moveTo(px - 5, py + 3).lineTo(px - 4, py - 1).lineTo(px - 2, py - 3).lineTo(px + 3, py - 3).lineTo(px + 5, py - 1).lineTo(px + 4, py + 3).closePath().fill({ color: bodyColor, alpha: bodyAlpha });
      // Hood — pointed polygon
      g.moveTo(px - 4, py - 2).bezierCurveTo(px - 5, py - 6, px - 2, py - 10, px + 1, py - 10);
      g.bezierCurveTo(px + 4, py - 10, px + 5, py - 6, px + 4, py - 2);
      g.closePath().fill({ color: darkCloak, alpha: bodyAlpha * 0.85 });
      // Hood point
      g.moveTo(px + 1, py - 10).bezierCurveTo(px + 2, py - 12, px + 3, py - 11, px + 2, py - 9).stroke({ color: darkCloak, width: 1, alpha: bodyAlpha * 0.6 });
      // Face shadow
      g.ellipse(px, py - 5, 3, 2).fill({ color: 0x000000, alpha: bodyAlpha * 0.3 });
    } else {
      // Standing — full cloaked figure
      // Legs
      g.moveTo(px - 2, py + 5).lineTo(px - 2, py + 10).stroke({ color: bodyColor, width: 2, alpha: bodyAlpha });
      g.moveTo(px + 2, py + 5).lineTo(px + 2, py + 10).stroke({ color: bodyColor, width: 2, alpha: bodyAlpha });
      // Boots (pointed)
      g.moveTo(px - 4, py + 10).lineTo(px - 1, py + 10).lineTo(px - 2, py + 11.5).closePath().fill({ color: 0x2a2a2a, alpha: bodyAlpha });
      g.moveTo(px + 4, py + 10).lineTo(px + 1, py + 10).lineTo(px + 2, py + 11.5).closePath().fill({ color: 0x2a2a2a, alpha: bodyAlpha });
      // Torso
      g.moveTo(px - 5, py - 1).lineTo(px - 3, py - 6).lineTo(px + 3, py - 6).lineTo(px + 5, py - 1).lineTo(px + 3, py + 5).lineTo(px - 3, py + 5).closePath().fill({ color: bodyColor, alpha: bodyAlpha });
      // Cloak — flowing polygon with irregular bottom
      g.moveTo(px - 6, py - 4);
      g.bezierCurveTo(px - 8, py + 2, px - 7, py + 7, px - 4, py + 9);
      g.lineTo(px - 2, py + 8).bezierCurveTo(px - 5, py + 5, px - 6, py + 0, px - 5, py - 3);
      g.closePath().fill({ color: darkCloak, alpha: bodyAlpha * 0.6 });
      g.moveTo(px + 6, py - 4);
      g.bezierCurveTo(px + 8, py + 2, px + 7, py + 7, px + 4, py + 9);
      g.lineTo(px + 2, py + 8).bezierCurveTo(px + 5, py + 5, px + 6, py + 0, px + 5, py - 3);
      g.closePath().fill({ color: darkCloak, alpha: bodyAlpha * 0.6 });
      // Head — hooded
      g.circle(px, py - 8, 4).fill({ color: bodyColor, alpha: bodyAlpha });
      // Hood polygon
      g.moveTo(px - 5, py - 5);
      g.bezierCurveTo(px - 6, py - 9, px - 4, py - 14, px, py - 15);
      g.bezierCurveTo(px + 4, py - 14, px + 6, py - 9, px + 5, py - 5);
      g.closePath().fill({ color: darkCloak, alpha: bodyAlpha * 0.8 });
      // Hood peak
      g.moveTo(px, py - 15).bezierCurveTo(px + 1, py - 17, px + 2, py - 16, px + 1, py - 14).stroke({ color: darkCloak, width: 1, alpha: bodyAlpha * 0.5 });
      // Face shadow void
      g.ellipse(px, py - 8, 3, 2.5).fill({ color: 0x000000, alpha: bodyAlpha * 0.4 });
    }

    // Eyes — almond-shaped in face shadow
    if (!thief.shadowMeld) {
      const ey = crouching ? py - 5 : py - 8;
      g.moveTo(px - 3, ey).bezierCurveTo(px - 2, ey - 1, px - 0.5, ey - 1, px - 0.5, ey).bezierCurveTo(px - 0.5, ey + 0.5, px - 2, ey + 0.5, px - 3, ey).fill({ color: 0xddeeff, alpha: bodyAlpha * 0.8 });
      g.moveTo(px + 3, ey).bezierCurveTo(px + 2, ey - 1, px + 0.5, ey - 1, px + 0.5, ey).bezierCurveTo(px + 0.5, ey + 0.5, px + 2, ey + 0.5, px + 3, ey).fill({ color: 0xddeeff, alpha: bodyAlpha * 0.8 });
    }

    // Disguise — noble clothing overlay with ornate detail
    if (thief.disguised) {
      const shimmer = 0.3 + Math.sin(t / 300) * 0.15;
      // Ruffled collar (scalloped bezier)
      g.moveTo(px - 5, py - 5);
      g.bezierCurveTo(px - 4, py - 8, px - 2, py - 7, px - 1, py - 8);
      g.bezierCurveTo(px, py - 7, px + 1, py - 8, px + 2, py - 7);
      g.bezierCurveTo(px + 3, py - 8, px + 5, py - 7, px + 5, py - 5);
      g.stroke({ color: 0xddbb66, width: 1.2, alpha: shimmer });
      // Collar fill
      g.moveTo(px - 4, py - 6).bezierCurveTo(px - 2, py - 8, px + 2, py - 8, px + 4, py - 6).lineTo(px + 3, py - 4).lineTo(px - 3, py - 4).closePath().fill({ color: 0xddbb66, alpha: shimmer * 0.3 });
      // Sash with fabric folds
      g.moveTo(px - 4, py - 3).lineTo(px + 3, py + 4).stroke({ color: 0xcc3333, width: 2, alpha: shimmer * 0.7 });
      g.moveTo(px - 3.5, py - 2.5).lineTo(px + 3.5, py + 4.5).stroke({ color: 0xdd5555, width: 0.5, alpha: shimmer * 0.3 }); // highlight
      // Belt buckle (ornate rectangle)
      g.rect(px - 1.5, py + 1, 3, 2).fill({ color: 0xffd700, alpha: shimmer });
      g.rect(px - 1.5, py + 1, 3, 2).stroke({ color: 0xeebb00, width: 0.5, alpha: shimmer * 0.5 });
      // Medallion with faceted gem
      g.circle(px, py - 1, 2.5).fill({ color: 0xffd700, alpha: shimmer });
      g.circle(px, py - 1, 2.5).stroke({ color: 0xeebb00, width: 0.5, alpha: shimmer * 0.5 });
      // Gem facets
      g.moveTo(px - 1, py - 2).lineTo(px, py - 1).lineTo(px + 1, py - 2).closePath().fill({ color: 0xff4444, alpha: shimmer * 0.6 }); // ruby
      g.circle(px - 0.5, py - 1.5, 0.5).fill({ color: 0xffffff, alpha: shimmer * 0.3 }); // gem sparkle
      // Outer shimmer rings (2 layers)
      g.circle(px, py, 10).stroke({ color: 0xcc8844, width: 1, alpha: shimmer * 0.3 });
      g.circle(px, py, 12).stroke({ color: 0xcc8844, width: 0.5, alpha: shimmer * 0.15 });
    }

    // Shadow meld — 6 dark tendrils
    if (thief.shadowMeld) {
      for (let i = 0; i < 6; i++) {
        const a = t / 200 + i * Math.PI / 3;
        const dist = 9 + Math.sin(t / 200 * 2 + i) * 3;
        g.moveTo(px, py);
        g.bezierCurveTo(
          px + Math.cos(a) * dist * 0.4, py + Math.sin(a) * dist * 0.4,
          px + Math.cos(a + 0.4) * dist * 0.7, py + Math.sin(a + 0.4) * dist * 0.7,
          px + Math.cos(a) * dist, py + Math.sin(a) * dist
        );
        g.stroke({ color: 0x221144, width: 2 - i * 0.2, alpha: 0.2 });
      }
    }

    // Loot sack — polygon pouch with ties
    if (thief.carryingLoot.length > 0) {
      const sx = px + 7, sy = py - 1;
      // Sack body (bulging polygon)
      g.moveTo(sx - 3, sy - 3).bezierCurveTo(sx - 5, sy, sx - 4, sy + 4, sx, sy + 4);
      g.bezierCurveTo(sx + 4, sy + 4, sx + 5, sy, sx + 3, sy - 3).closePath().fill({ color: 0x7a6a4a, alpha: bodyAlpha * 0.9 });
      // Rope tie
      g.moveTo(sx - 1, sy - 3).lineTo(sx, sy - 6).lineTo(sx + 1, sy - 3).stroke({ color: 0x5a4a2a, width: 1, alpha: bodyAlpha });
      // Bulge stitch
      g.moveTo(sx, sy - 2).lineTo(sx, sy + 2).stroke({ color: 0x5a4a2a, width: 0.5, alpha: bodyAlpha * 0.4 });
      // Gold coins peeking out
      g.circle(sx - 1, sy, 1.2).fill({ color: 0xffd700, alpha: bodyAlpha * 0.6 });
      g.circle(sx + 1, sy + 1, 1).fill({ color: 0xeebb00, alpha: bodyAlpha * 0.5 });
    }

    // HP bar — segmented with riveted frame
    if (thief.hp < thief.maxHp) {
      const bw = 22, bh = 3;
      const bx = px - bw / 2, by = py - (crouching ? 12 : 20);
      // Frame
      g.rect(bx - 1, by - 1, bw + 2, bh + 2).fill({ color: 0x222222, alpha: 0.7 });
      g.rect(bx - 1, by - 1, bw + 2, bh + 2).stroke({ color: 0x444444, width: 0.5 });
      // Background
      g.rect(bx, by, bw, bh).fill({ color: 0x220000 });
      // Fill
      const hpRatio = thief.hp / thief.maxHp;
      const hpColor = hpRatio > 0.6 ? 0x44cc44 : hpRatio > 0.3 ? 0xccaa22 : 0xff3333;
      g.rect(bx, by, bw * hpRatio, bh).fill({ color: hpColor });
      // Critical health pulse
      if (hpRatio <= 0.3) {
        const critPulse = 0.15 + Math.sin(Date.now() / 120) * 0.1;
        g.rect(bx - 2, by - 2, bw + 4, bh + 4).fill({ color: 0xff0000, alpha: critPulse });
      }
      // Segment lines
      for (let si = 1; si < 4; si++) {
        g.moveTo(bx + si * bw / 4, by).lineTo(bx + si * bw / 4, by + bh).stroke({ color: 0x000000, width: 0.5, alpha: 0.3 });
      }
      // Rivets
      g.circle(bx - 0.5, by + bh / 2, 0.8).fill({ color: 0x666666 });
      g.circle(bx + bw + 0.5, by + bh / 2, 0.8).fill({ color: 0x666666 });
    }
  }

  // ---------------------------------------------------------------------------
  // Camera
  // ---------------------------------------------------------------------------

  updateCamera(heist: HeistState, sw: number, sh: number, dt: number): void {
    const selected = heist.thieves.find(t => t.selected && t.alive);
    if (!selected) return;

    const targetX = sw / 2 - selected.x * T;
    const targetY = sh / 2 - selected.y * T;

    const lerpSpeed = 1 - Math.pow(0.001, dt);
    this._offsetX += (targetX - this._offsetX) * lerpSpeed;
    this._offsetY += (targetY - this._offsetY) * lerpSpeed;

    const mapW = heist.map.width * T;
    const mapH = heist.map.height * T;
    this._offsetX = Math.min(0, Math.max(sw - mapW, this._offsetX));
    this._offsetY = Math.min(60, Math.max(sh - mapH - 60, this._offsetY));
  }

  destroy(): void {
    this.container.removeChildren();
    this._mapGfx.destroy();
    this._detailGfx.destroy();
    this._entityGfx.destroy();
    this._fogGfx.destroy();
    this._lightGfx.destroy();
  }
}
