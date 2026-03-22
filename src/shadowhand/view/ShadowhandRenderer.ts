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
          case "secret_door": this._drawWall(g, d, px, py, x, y, map, h); break; // looks like wall
          case "stairs_up": this._drawStairs(g, d, px, py, true); break;
          case "stairs_down": this._drawStairs(g, d, px, py, false); break;
          default: g.rect(px, py, T, T).fill({ color: FLOOR_BASE }); break;
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
    d.moveTo(px + 1, py + 1).lineTo(px + T - 1, py + 1).stroke({ color: 0x454038, width: 0.6, alpha: 0.2 }); // top highlight
    d.moveTo(px + 1, py + 1).lineTo(px + 1, py + T - 1).stroke({ color: 0x454038, width: 0.6, alpha: 0.15 }); // left highlight
    d.moveTo(px + 1, py + T - 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x1a1816, width: 0.6, alpha: 0.2 }); // bottom shadow
    d.moveTo(px + T - 1, py + 1).lineTo(px + T - 1, py + T - 1).stroke({ color: 0x1a1816, width: 0.6, alpha: 0.15 }); // right shadow

    // Bezier crack (organic, not straight)
    if (h > 0.85) {
      const cx1 = px + 3 + h * 6, cy1 = py + 2;
      const cx2 = px + T * 0.4 + h * 4, cy2 = py + T * 0.5;
      d.moveTo(cx1, cy1).bezierCurveTo(cx1 + 3, cy1 + 5, cx2 - 2, cy2 - 3, cx2, cy2).stroke({ color: FLOOR_LO, width: 0.7, alpha: 0.25 });
      // Crack widens slightly at end
      d.moveTo(cx2, cy2).bezierCurveTo(cx2 + 2, cy2 + 4, cx2 + 5, cy2 + 7, cx2 + 3, py + T - 3).stroke({ color: FLOOR_LO, width: 0.5, alpha: 0.18 });
    }

    // Scattered pebbles (2-3 per tile based on hash)
    if (h > 0.6 && h < 0.7) {
      for (let pi = 0; pi < 2; pi++) {
        const ph2 = tileHash(Math.floor(px) + pi, Math.floor(py) + pi);
        const pbx = px + 4 + ph2 * (T - 8);
        const pby = py + 4 + tileHash(Math.floor(py) + pi, Math.floor(px) + pi) * (T - 8);
        d.ellipse(pbx, pby, 1.5 + ph2, 1 + ph2 * 0.5).fill({ color: FLOOR_LO, alpha: 0.25 });
      }
    }

    // Subtle dust spots
    if (h > 0.3 && h < 0.35) {
      d.circle(px + HT + h * 6, py + HT - 2, 3 + h * 3).fill({ color: 0x2e2a26, alpha: 0.1 });
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
      // Lock plate
      d.roundRect(px + T - inset - 7, py + HT - 4, 6, 8, 1).fill({ color: 0x444444 });
      d.roundRect(px + T - inset - 7, py + HT - 4, 6, 8, 1).stroke({ color: 0x333333, width: 0.5 });
      // Keyhole
      d.circle(px + T - inset - 4, py + HT - 1, 1.5).fill({ color: 0x111111 });
      d.rect(px + T - inset - 5, py + HT, 2, 3).fill({ color: 0x111111 });
      // Pulsing lock glow (magic ward)
      const lockPulse = 0.1 + Math.sin(Date.now() / 600) * 0.06;
      d.circle(px + T - inset - 4, py + HT, 6).fill({ color: 0xff3322, alpha: lockPulse });
      d.circle(px + T - inset - 4, py + HT, 3).fill({ color: 0xff6644, alpha: lockPulse * 1.5 });
    } else {
      // Simple handle ring
      d.circle(px + T - inset - 4, py + HT, 2.5).stroke({ color: 0x555555, width: 1 });
      d.circle(px + T - inset - 4, py + HT, 1).fill({ color: 0x444444 });
    }
  }

  private _drawWindow(g: Graphics, d: Graphics, px: number, py: number, h: number): void {
    g.rect(px, py, T, T).fill({ color: WALL_BASE });
    // Window frame
    const inset = 6;
    d.rect(px + inset, py + inset, T - inset * 2, T - inset * 2).fill({ color: WINDOW_GLASS, alpha: 0.6 });
    d.rect(px + inset, py + inset, T - inset * 2, T - inset * 2).stroke({ color: WINDOW_FRAME, width: 1.5 });
    // Cross mullion
    d.moveTo(px + HT, py + inset).lineTo(px + HT, py + T - inset).stroke({ color: WINDOW_FRAME, width: 1 });
    d.moveTo(px + inset, py + HT).lineTo(px + T - inset, py + HT).stroke({ color: WINDOW_FRAME, width: 1 });
    // Moonlight ray
    d.rect(px + inset + 1, py + inset + 1, T - inset * 2 - 2, T - inset * 2 - 2).fill({ color: 0x8899bb, alpha: 0.15 });
    // Glow emanating from window
    for (let r = 1; r <= 3; r++) {
      d.rect(px - r * 3, py - r * 3, T + r * 6, T + r * 6).fill({ color: 0x6688aa, alpha: 0.02 });
    }
  }

  private _drawEntryPoint(g: Graphics, d: Graphics, px: number, py: number, h: number): void {
    g.rect(px, py, T, T).fill({ color: 0x1a2a1a });
    // Archway shape
    d.moveTo(px + 4, py + T).lineTo(px + 4, py + 8).bezierCurveTo(px + 4, py + 2, px + T - 4, py + 2, px + T - 4, py + 8).lineTo(px + T - 4, py + T).stroke({ color: 0x44aa44, width: 1.5, alpha: 0.5 });
    // Arrow pointing in
    d.moveTo(px + HT, py + T - 4).lineTo(px + HT, py + 8).stroke({ color: 0x44ff44, width: 1, alpha: 0.4 });
    d.moveTo(px + HT - 4, py + 14).lineTo(px + HT, py + 8).lineTo(px + HT + 4, py + 14).stroke({ color: 0x44ff44, width: 1, alpha: 0.4 });
    // Pulsing glow
    const pulse = 0.3 + Math.sin(Date.now() / 800) * 0.15;
    d.circle(px + HT, py + HT, T * 0.4).fill({ color: 0x44ff44, alpha: pulse * 0.1 });
  }

  private _drawStairs(g: Graphics, d: Graphics, px: number, py: number, up: boolean): void {
    g.rect(px, py, T, T).fill({ color: 0x3a3a4a });
    const steps = 5;
    for (let i = 0; i < steps; i++) {
      const sy = up ? py + T - (i + 1) * (T / steps) : py + i * (T / steps);
      const sw = T - i * 4;
      d.rect(px + (T - sw) / 2, sy, sw, T / steps - 1).fill({ color: 0x4a4a5a, alpha: 0.6 + i * 0.08 });
    }
    // Arrow
    const ay = up ? py + 6 : py + T - 6;
    const dir = up ? -1 : 1;
    d.moveTo(px + HT, ay).lineTo(px + HT, ay + dir * 8).stroke({ color: 0x8888aa, width: 1, alpha: 0.4 });
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
    // Twinkling star pattern
    for (let i = 0; i < 4; i++) {
      const angle = t + i * Math.PI / 2;
      const dist = 4 + Math.sin(t * 2 + i) * 2;
      const sx = cx + Math.cos(angle) * dist;
      const sy = cy + Math.sin(angle) * dist;
      const size = 1 + Math.sin(t * 3 + i * 1.5) * 0.5;
      d.circle(sx, sy, size).fill({ color: 0xffdd44, alpha: 0.5 + Math.sin(t + i) * 0.3 });
    }
    // Center gem
    d.circle(cx, cy, 3).fill({ color: 0xffdd44, alpha: 0.8 });
    d.circle(cx, cy, 1.5).fill({ color: 0xffffff, alpha: 0.6 });
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
    // Pressure plate lines
    d.rect(cx - 5, cy - 5, 10, 10).stroke({ color: 0xff4444, width: 0.8, alpha: 0.35 });
    // Inner cross
    d.moveTo(cx - 3, cy - 3).lineTo(cx + 3, cy + 3).stroke({ color: 0xff4444, width: 0.5, alpha: 0.3 });
    d.moveTo(cx + 3, cy - 3).lineTo(cx - 3, cy + 3).stroke({ color: 0xff4444, width: 0.5, alpha: 0.3 });
  }

  private _drawCaltrops(d: Graphics, px: number, py: number, h: number): void {
    for (let i = 0; i < 5; i++) {
      const cx = px + 3 + tileHash(i, Math.floor(h * 1000)) * (T - 6);
      const cy = py + 3 + tileHash(Math.floor(h * 1000), i) * (T - 6);
      // Tiny 4-pointed star
      d.moveTo(cx, cy - 2).lineTo(cx + 1, cy).lineTo(cx, cy + 2).lineTo(cx - 1, cy).closePath().fill({ color: 0x999999, alpha: 0.5 });
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
          // Soft fog border: check if adjacent to unrevealed
          let adjFog = false;
          for (const [dx, dy] of [[0, -1], [0, 1], [-1, 0], [1, 0]]) {
            const nx = x + dx, ny = y + dy;
            if (nx < 0 || ny < 0 || nx >= heist.map.width || ny >= heist.map.height) { adjFog = true; break; }
            if (!heist.map.tiles[ny][nx].revealed) { adjFog = true; break; }
          }
          if (adjFog) {
            // Gradient fog edge
            g.rect(px, py, T, T).fill({ color: 0x08080c, alpha: 0.25 });
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

    // Rescue NPC (if rescue objective)
    if (heist.objective.type === "rescue" && !heist.objective.rescued) {
      const npx = heist.objective.npcX * T + this._offsetX + HT;
      const npy = heist.objective.npcY * T + this._offsetY + HT;
      const pulse = 0.5 + Math.sin(Date.now() / 500) * 0.3;
      // Prisoner in chains
      g.circle(npx, npy, 6).fill({ color: 0xaaaa44, alpha: pulse });
      g.circle(npx, npy, 10).stroke({ color: 0xaaaa44, width: 1.5, alpha: pulse * 0.4 });
      // Chains
      g.moveTo(npx - 4, npy + 6).lineTo(npx - 8, npy + 10).stroke({ color: 0x888888, width: 1 });
      g.moveTo(npx + 4, npy + 6).lineTo(npx + 8, npy + 10).stroke({ color: 0x888888, width: 1 });
    }

    // Thieves
    for (const thief of heist.thieves) {
      if (!thief.alive) continue;
      this._drawThief(g, thief);
    }

    // Noise events (animated rings)
    for (const noise of heist.noiseEvents) {
      const px = noise.x * T + this._offsetX + HT;
      const py = noise.y * T + this._offsetY + HT;
      const alpha = Math.min(0.25, noise.timer / 2);
      const r = noise.radius * T;
      g.circle(px, py, r).stroke({ color: 0xffff88, width: 1.5, alpha });
      g.circle(px, py, r * 0.6).stroke({ color: 0xffff88, width: 0.5, alpha: alpha * 0.5 });
    }

    // Particles
    for (const p of heist.particles) {
      const px = p.x * T + this._offsetX + HT;
      const py = p.y * T + this._offsetY + HT;
      const lr = p.life / p.maxLife;
      g.circle(px, py, p.size * lr).fill({ color: p.color, alpha: lr * 0.8 });
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

    g.moveTo(px, py);
    const steps = 16;
    for (let i = 0; i <= steps; i++) {
      const a = guard.angle - halfAngle + (2 * halfAngle * i / steps);
      const fadeR = range * (1 - 0.15 * Math.abs(i - steps / 2) / (steps / 2));
      g.lineTo(px + Math.cos(a) * fadeR, py + Math.sin(a) * fadeR);
    }
    g.closePath();
    g.fill({ color, alpha: 0.07 });
    // Outer edge of cone
    for (let i = 0; i < steps; i++) {
      const a1 = guard.angle - halfAngle + (2 * halfAngle * i / steps);
      const a2 = guard.angle - halfAngle + (2 * halfAngle * (i + 1) / steps);
      g.moveTo(px + Math.cos(a1) * range, py + Math.sin(a1) * range);
      g.lineTo(px + Math.cos(a2) * range, py + Math.sin(a2) * range);
    }
    g.stroke({ color, width: 0.7, alpha: 0.12 });
  }

  private _drawGuard(g: Graphics, guard: Guard): void {
    const px = guard.x * T + this._offsetX + HT;
    const py = guard.y * T + this._offsetY + HT;
    const color = ALERT_COLORS[guard.alertLevel];

    if (guard.stunTimer > 0 || guard.sleepTimer > 0) {
      // Collapsed body
      g.ellipse(px, py + 2, 7, 4).fill({ color: 0x444444, alpha: 0.5 });
      if (guard.sleepTimer > 0) {
        // Animated Z's
        const t = Date.now() / 600;
        for (let i = 0; i < 3; i++) {
          const zy = py - 8 - i * 6 - Math.sin(t + i) * 2;
          const za = 0.6 - i * 0.15;
          const zs = 3 - i * 0.5;
          g.moveTo(px - zs + i * 2, zy).lineTo(px + zs + i * 2, zy).lineTo(px - zs + i * 2, zy - zs).lineTo(px + zs + i * 2, zy - zs).stroke({ color: 0x8888ff, width: 1, alpha: za });
        }
      } else {
        // Stars (stunned)
        for (let i = 0; i < 3; i++) {
          const a = Date.now() / 400 + i * 2.1;
          const sx = px + Math.cos(a) * 8, sy = py - 8 + Math.sin(a) * 4;
          g.circle(sx, sy, 1.5).fill({ color: 0xffff44, alpha: 0.5 });
        }
      }
      return;
    }

    if (guard.isDog) {
      // Dog body (ellipse with legs)
      const da = guard.angle;
      g.ellipse(px, py, 8, 5).fill({ color });
      // Head
      g.circle(px + Math.cos(da) * 6, py + Math.sin(da) * 6, 3.5).fill({ color });
      // Ears
      const ex = px + Math.cos(da) * 9, ey = py + Math.sin(da) * 9;
      g.circle(ex + 2, ey - 2, 1.5).fill({ color: ALERT_COLORS[guard.alertLevel] });
      g.circle(ex - 2, ey - 2, 1.5).fill({ color: ALERT_COLORS[guard.alertLevel] });
      // Tail
      const tx = px - Math.cos(da) * 6, ty = py - Math.sin(da) * 6;
      g.moveTo(tx, ty).bezierCurveTo(tx - 4, ty - 6, tx - 2, ty - 8, tx + 1, ty - 5).stroke({ color, width: 1.5 });
    } else {
      // Human guard — body silhouette
      // Body (torso)
      g.ellipse(px, py + 1, 5, 6).fill({ color });
      // Head
      g.circle(px, py - 6, 4).fill({ color });
      // Shoulders
      g.ellipse(px, py - 1, 7, 3).fill({ color });

      // Helmet crest for elite
      if (guard.isElite) {
        g.moveTo(px, py - 11).lineTo(px, py - 15).stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });
        g.circle(px, py - 15, 1).fill({ color: 0xffffff, alpha: 0.4 });
        g.circle(px, py, 9).stroke({ color: 0xffd700, width: 1, alpha: 0.25 });
      }

      // Direction indicator (spear/weapon)
      const wx = px + Math.cos(guard.angle) * 11;
      const wy = py + Math.sin(guard.angle) * 11;
      g.moveTo(px + Math.cos(guard.angle) * 6, py + Math.sin(guard.angle) * 6);
      g.lineTo(wx, wy);
      g.stroke({ color: 0xaaaaaa, width: 1.5, alpha: 0.6 });
      // Spear tip
      g.circle(wx, wy, 1.5).fill({ color: 0xcccccc, alpha: 0.7 });
    }

    // Alert indicators
    if (guard.alertLevel === AlertLevel.SUSPICIOUS) {
      // Yellow "?"
      g.moveTo(px - 1, py - 16).bezierCurveTo(px - 1, py - 22, px + 4, py - 22, px + 2, py - 18).lineTo(px, py - 14).stroke({ color: 0xffff00, width: 2 });
      g.circle(px, py - 12, 1.5).fill({ color: 0xffff00 });
    } else if (guard.alertLevel === AlertLevel.ALARMED) {
      // Red "!"
      g.moveTo(px, py - 22).lineTo(px, py - 14).stroke({ color: 0xff0000, width: 2.5 });
      g.circle(px, py - 12, 2).fill({ color: 0xff0000 });
      // Pulse
      const pulse = 0.3 + Math.sin(Date.now() / 150) * 0.2;
      g.circle(px, py - 17, 8).fill({ color: 0xff0000, alpha: pulse * 0.1 });
    }
  }

  private _drawThief(g: Graphics, thief: ThiefUnit): void {
    const px = thief.x * T + this._offsetX + HT;
    const py = thief.y * T + this._offsetY + HT;
    const crouching = thief.crouching;

    // Selection ring with glow
    if (thief.selected) {
      const pulse = 0.5 + Math.sin(Date.now() / 400) * 0.2;
      g.circle(px, py, 13).stroke({ color: 0x44ff44, width: 1.5, alpha: pulse * 0.3 });
      g.circle(px, py, 11).stroke({ color: 0x44ff44, width: 2, alpha: pulse });
    }

    const bodyColor = thief.disguised ? 0xcc8844 : thief.shadowMeld ? 0x3322aa : 0x2266cc;
    const bodyAlpha = thief.shadowMeld ? 0.35 : 1.0;

    if (crouching) {
      // Crouching silhouette — compact, lower profile
      g.ellipse(px, py + 2, 6, 4).fill({ color: bodyColor, alpha: bodyAlpha });
      g.circle(px, py - 3, 3.5).fill({ color: bodyColor, alpha: bodyAlpha });
      // Hood
      g.moveTo(px - 4, py - 2).bezierCurveTo(px - 4, py - 8, px + 4, py - 8, px + 4, py - 2).fill({ color: bodyColor, alpha: bodyAlpha * 0.8 });
    } else {
      // Standing silhouette
      g.ellipse(px, py + 1, 5, 6).fill({ color: bodyColor, alpha: bodyAlpha });
      g.circle(px, py - 6, 4).fill({ color: bodyColor, alpha: bodyAlpha });
      // Cloak outline
      g.moveTo(px - 6, py - 2).bezierCurveTo(px - 7, py + 4, px - 5, py + 8, px - 3, py + 8).stroke({ color: bodyColor, width: 1, alpha: bodyAlpha * 0.5 });
      g.moveTo(px + 6, py - 2).bezierCurveTo(px + 7, py + 4, px + 5, py + 8, px + 3, py + 8).stroke({ color: bodyColor, width: 1, alpha: bodyAlpha * 0.5 });
    }

    // Eyes (tiny bright dots)
    if (!thief.shadowMeld) {
      g.circle(px - 1.5, py - 7, 0.8).fill({ color: 0xeeeeff, alpha: bodyAlpha });
      g.circle(px + 1.5, py - 7, 0.8).fill({ color: 0xeeeeff, alpha: bodyAlpha });
    }

    // Disguise effect — noble clothing shimmer
    if (thief.disguised) {
      const shimmer = 0.3 + Math.sin(Date.now() / 300) * 0.15;
      g.circle(px, py, 10).stroke({ color: 0xcc8844, width: 1.5, alpha: shimmer });
      g.circle(px, py, 12).stroke({ color: 0xcc8844, width: 0.5, alpha: shimmer * 0.4 });
    }

    // Shadow meld aura — dark tendrils
    if (thief.shadowMeld) {
      const t = Date.now() / 200;
      for (let i = 0; i < 4; i++) {
        const a = t + i * Math.PI / 2;
        const dist = 8 + Math.sin(t * 2 + i) * 3;
        g.moveTo(px, py);
        g.bezierCurveTo(
          px + Math.cos(a) * dist * 0.5, py + Math.sin(a) * dist * 0.5,
          px + Math.cos(a + 0.3) * dist * 0.8, py + Math.sin(a + 0.3) * dist * 0.8,
          px + Math.cos(a) * dist, py + Math.sin(a) * dist
        );
        g.stroke({ color: 0x3322aa, width: 1.5, alpha: 0.2 });
      }
    }

    // Loot sack
    if (thief.carryingLoot.length > 0) {
      const sx = px + 6, sy = py - 2;
      g.circle(sx, sy, 4).fill({ color: 0x8a7a5a, alpha: bodyAlpha * 0.9 });
      g.moveTo(sx, sy - 4).lineTo(sx, sy - 7).stroke({ color: 0x6a5a3a, width: 1, alpha: bodyAlpha });
      // Gold glint
      g.circle(sx - 1, sy - 1, 1).fill({ color: 0xffd700, alpha: bodyAlpha * 0.6 });
    }

    // HP bar (only when damaged)
    if (thief.hp < thief.maxHp) {
      const bw = 22, bh = 3;
      const bx = px - bw / 2, by = py - (crouching ? 10 : 14);
      g.rect(bx - 0.5, by - 0.5, bw + 1, bh + 1).fill({ color: 0x000000, alpha: 0.5 });
      g.rect(bx, by, bw, bh).fill({ color: 0x331111 });
      const hpRatio = thief.hp / thief.maxHp;
      const hpColor = hpRatio > 0.6 ? 0x44cc44 : hpRatio > 0.3 ? 0xccaa22 : 0xff3333;
      g.rect(bx, by, bw * hpRatio, bh).fill({ color: hpColor });
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
