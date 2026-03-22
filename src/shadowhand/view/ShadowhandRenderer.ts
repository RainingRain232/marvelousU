// ---------------------------------------------------------------------------
// Shadowhand mode — main map renderer (top-down heist view)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { HeistState, Guard, ThiefUnit } from "../state/ShadowhandState";
import { AlertLevel } from "../state/ShadowhandState";
import { ShadowhandConfig } from "../config/ShadowhandConfig";

const T = ShadowhandConfig.TILE_SIZE;
const TILE_COLORS: Record<string, number> = {
  wall: 0x2a2a2a,
  floor: 0x3a3530,
  door: 0x6a5a3a,
  locked_door: 0x8a4a2a,
  window: 0x4a6a8a,
  trap: 0x3a3530, // looks like floor
  secret_door: 0x2a2a2a, // looks like wall until revealed
  stairs_up: 0x5a5a6a,
  stairs_down: 0x4a4a5a,
  entry_point: 0x2a4a2a,
  loot_spot: 0x3a3530, // sparkle drawn on top
  primary_loot: 0x3a3530, // glowing drawn on top
};

const ALERT_COLORS: Record<AlertLevel, number> = {
  [AlertLevel.UNAWARE]: 0x44aa44,
  [AlertLevel.SUSPICIOUS]: 0xddaa22,
  [AlertLevel.ALARMED]: 0xff3333,
};

export class ShadowhandRenderer {
  readonly container = new Container();
  private _mapGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _fogGfx = new Graphics();
  private _lightGfx = new Graphics();
  private _offsetX = 0;
  private _offsetY = 0;

  init(): void {
    this.container.removeChildren();
    this.container.addChild(this._mapGfx);
    this.container.addChild(this._lightGfx);
    this.container.addChild(this._fogGfx);
    this.container.addChild(this._entityGfx);
  }

  setOffset(x: number, y: number): void {
    this._offsetX = x;
    this._offsetY = y;
  }

  drawMap(heist: HeistState): void {
    const g = this._mapGfx;
    g.clear();
    const map = heist.map;

    for (let y = 0; y < map.height; y++) {
      for (let x = 0; x < map.width; x++) {
        const tile = map.tiles[y][x];
        if (!tile.revealed) continue;

        const px = x * T + this._offsetX;
        const py = y * T + this._offsetY;
        const color = TILE_COLORS[tile.type] ?? 0x2a2a2a;

        g.rect(px, py, T, T).fill({ color });

        // Torch glow
        if (tile.torchSource) {
          g.circle(px + T / 2, py + T / 2, T * 0.3).fill({ color: 0xffaa33, alpha: 0.8 });
          g.circle(px + T / 2, py + T / 2, T * 0.6).fill({ color: 0xff8800, alpha: 0.15 });
        }

        // Loot sparkle
        if (tile.loot && tile.type === "loot_spot") {
          g.circle(px + T / 2, py + T / 2, 3).fill({ color: 0xffdd44, alpha: 0.7 });
          g.circle(px + T / 2 + 3, py + T / 2 - 2, 1.5).fill({ color: 0xffdd44, alpha: 0.4 });
        }

        // Primary loot glow
        if (tile.loot && tile.type === "primary_loot") {
          g.circle(px + T / 2, py + T / 2, T * 0.4).fill({ color: 0xffd700, alpha: 0.3 });
          g.circle(px + T / 2, py + T / 2, 5).fill({ color: 0xffd700, alpha: 0.9 });
        }

        // Entry point marker
        if (tile.type === "entry_point") {
          g.circle(px + T / 2, py + T / 2, T * 0.3).stroke({ color: 0x44ff44, width: 1.5, alpha: 0.6 });
        }

        // Caltrops
        if (tile.caltrops) {
          for (let i = 0; i < 3; i++) {
            const cx = px + 4 + i * 8, cy = py + T / 2 + (i % 2 ? -3 : 3);
            g.moveTo(cx, cy - 3).lineTo(cx + 2, cy + 2).lineTo(cx - 2, cy + 2).closePath().fill({ color: 0x888888, alpha: 0.6 });
          }
        }

        // Smoke overlay
        if (tile.smoke > 0) {
          const alpha = Math.min(0.7, tile.smoke / 4);
          g.rect(px, py, T, T).fill({ color: 0xcccccc, alpha });
        }

        // Trap (visible only if revealed by sapmaster)
        if (tile.type === "trap" && tile.trapArmed) {
          g.moveTo(px + T / 2 - 4, py + T / 2 + 2).lineTo(px + T / 2, py + T / 2 - 4).lineTo(px + T / 2 + 4, py + T / 2 + 2).stroke({ color: 0xff4444, width: 1, alpha: 0.5 });
        }

        // Grid line
        g.rect(px, py, T, T).stroke({ color: 0x1a1a1a, width: 0.5, alpha: 0.15 });
      }
    }
  }

  drawLightOverlay(heist: HeistState): void {
    const g = this._lightGfx;
    g.clear();

    for (let y = 0; y < heist.map.height; y++) {
      for (let x = 0; x < heist.map.width; x++) {
        const tile = heist.map.tiles[y][x];
        if (!tile.revealed) continue;
        if (tile.type === "wall") continue;

        const px = x * T + this._offsetX;
        const py = y * T + this._offsetY;

        if (!tile.lit) {
          // Dark overlay
          g.rect(px, py, T, T).fill({ color: 0x000000, alpha: 0.55 });
        } else {
          // Subtle warm glow on lit tiles
          g.rect(px, py, T, T).fill({ color: 0xffaa44, alpha: 0.04 });
        }
      }
    }
  }

  drawFog(heist: HeistState): void {
    const g = this._fogGfx;
    g.clear();

    for (let y = 0; y < heist.map.height; y++) {
      for (let x = 0; x < heist.map.width; x++) {
        if (!heist.map.tiles[y][x].revealed) {
          const px = x * T + this._offsetX;
          const py = y * T + this._offsetY;
          g.rect(px, py, T, T).fill({ color: 0x0a0a0a, alpha: 0.95 });
        }
      }
    }
  }

  drawEntities(heist: HeistState): void {
    const g = this._entityGfx;
    g.clear();

    // Draw guard vision cones
    for (const guard of heist.guards) {
      if (guard.stunTimer > 0 || guard.sleepTimer > 0) continue;
      this._drawVisionCone(g, guard);
    }

    // Draw guards
    for (const guard of heist.guards) {
      this._drawGuard(g, guard);
    }

    // Draw thieves
    for (const thief of heist.thieves) {
      if (!thief.alive) continue;
      this._drawThief(g, thief);
    }

    // Draw noise events
    for (const noise of heist.noiseEvents) {
      const px = noise.x * T + this._offsetX + T / 2;
      const py = noise.y * T + this._offsetY + T / 2;
      const alpha = Math.min(0.3, noise.timer / 2);
      g.circle(px, py, noise.radius * T).stroke({ color: 0xffff88, width: 1, alpha });
    }

    // Draw particles
    for (const p of heist.particles) {
      const px = p.x * T + this._offsetX + T / 2;
      const py = p.y * T + this._offsetY + T / 2;
      const lifeRatio = p.life / p.maxLife;
      g.circle(px, py, p.size * lifeRatio).fill({ color: p.color, alpha: lifeRatio * 0.8 });
    }

    // Draw announcements (centered on screen)
    // These are drawn by HUD, but we also add screen shake here
    if (heist.screenShake > 0) {
      this._offsetX += (Math.random() - 0.5) * heist.screenShake;
      this._offsetY += (Math.random() - 0.5) * heist.screenShake;
    }
  }

  private _drawVisionCone(g: Graphics, guard: Guard): void {
    const px = guard.x * T + this._offsetX + T / 2;
    const py = guard.y * T + this._offsetY + T / 2;
    const range = ShadowhandConfig.GUARD_VISION_RANGE * T;
    const halfAngle = ShadowhandConfig.GUARD_VISION_ANGLE;
    const color = ALERT_COLORS[guard.alertLevel];

    // Vision cone as arc
    g.moveTo(px, py);
    const steps = 12;
    for (let i = 0; i <= steps; i++) {
      const a = guard.angle - halfAngle + (2 * halfAngle * i / steps);
      g.lineTo(px + Math.cos(a) * range, py + Math.sin(a) * range);
    }
    g.closePath();
    g.fill({ color, alpha: 0.06 });
    g.stroke({ color, width: 0.5, alpha: 0.15 });
  }

  private _drawGuard(g: Graphics, guard: Guard): void {
    const px = guard.x * T + this._offsetX + T / 2;
    const py = guard.y * T + this._offsetY + T / 2;
    const color = ALERT_COLORS[guard.alertLevel];
    const size = guard.isDog ? 5 : 7;

    if (guard.stunTimer > 0 || guard.sleepTimer > 0) {
      // Stunned/sleeping — draw X or Z
      g.circle(px, py, size).fill({ color: 0x555555, alpha: 0.5 });
      if (guard.sleepTimer > 0) {
        // Z's
        g.moveTo(px - 3, py - 8).lineTo(px + 3, py - 8).lineTo(px - 3, py - 14).lineTo(px + 3, py - 14).stroke({ color: 0x8888ff, width: 1 });
      }
      return;
    }

    // Guard body
    if (guard.isDog) {
      // Dog shape — ellipse
      g.ellipse(px, py, size + 2, size - 1).fill({ color });
      // Tail
      g.moveTo(px - size, py).bezierCurveTo(px - size - 4, py - 6, px - size - 2, py - 8, px - size + 1, py - 5).stroke({ color, width: 1.5 });
    } else {
      // Human guard — circle + direction indicator
      g.circle(px, py, size).fill({ color });
      if (guard.isElite) {
        g.circle(px, py, size + 2).stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
      }
      // Direction line
      g.moveTo(px, py).lineTo(px + Math.cos(guard.angle) * (size + 4), py + Math.sin(guard.angle) * (size + 4)).stroke({ color: 0xffffff, width: 1.5, alpha: 0.5 });
    }

    // Alert indicator
    if (guard.alertLevel === AlertLevel.SUSPICIOUS) {
      g.moveTo(px, py - size - 8).lineTo(px, py - size - 3).stroke({ color: 0xffff00, width: 2 });
      g.circle(px, py - size - 10, 1.5).fill({ color: 0xffff00 });
    } else if (guard.alertLevel === AlertLevel.ALARMED) {
      g.moveTo(px - 2, py - size - 10).lineTo(px, py - size - 3).lineTo(px + 2, py - size - 10).stroke({ color: 0xff0000, width: 2 });
      g.circle(px, py - size - 12, 1.5).fill({ color: 0xff0000 });
    }
  }

  private _drawThief(g: Graphics, thief: ThiefUnit): void {
    const px = thief.x * T + this._offsetX + T / 2;
    const py = thief.y * T + this._offsetY + T / 2;
    const size = thief.crouching ? 5 : 7;

    // Selection ring
    if (thief.selected) {
      g.circle(px, py, size + 4).stroke({ color: 0x44ff44, width: 2, alpha: 0.7 });
    }

    // Thief body
    const bodyColor = thief.disguised ? 0xcc8844 : thief.shadowMeld ? 0x3322aa : 0x2266cc;
    const bodyAlpha = thief.shadowMeld ? 0.4 : 1.0;
    g.circle(px, py, size).fill({ color: bodyColor, alpha: bodyAlpha });

    // Disguise shimmer
    if (thief.disguised) {
      g.circle(px, py, size + 3).stroke({ color: 0xcc8844, width: 1, alpha: 0.4 + Math.sin(Date.now() / 300) * 0.2 });
    }

    // Shadow meld aura
    if (thief.shadowMeld) {
      g.circle(px, py, size + 4).stroke({ color: 0x3322aa, width: 1.5, alpha: 0.3 + Math.sin(Date.now() / 200) * 0.15 });
    }

    // Carrying loot indicator
    if (thief.carryingLoot.length > 0) {
      g.circle(px + size, py - size, 3).fill({ color: 0xffd700, alpha: 0.8 });
    }

    // Crouching indicator
    if (thief.crouching) {
      g.moveTo(px - size - 2, py + size + 2).lineTo(px + size + 2, py + size + 2).stroke({ color: 0x6688aa, width: 1, alpha: 0.5 });
    }

    // HP bar
    if (thief.hp < thief.maxHp) {
      const bw = 20, bh = 3;
      const bx = px - bw / 2, by = py - size - 8;
      g.rect(bx, by, bw, bh).fill({ color: 0x330000 });
      g.rect(bx, by, bw * (thief.hp / thief.maxHp), bh).fill({ color: 0x44ff44 });
    }
  }

  updateCamera(heist: HeistState, sw: number, sh: number, dt: number): void {
    // Center camera on selected thief
    const selected = heist.thieves.find(t => t.selected && t.alive);
    if (!selected) return;

    const targetX = sw / 2 - selected.x * T;
    const targetY = sh / 2 - selected.y * T;

    // Frame-rate independent smooth lerp
    const lerpSpeed = 1 - Math.pow(0.001, dt);
    this._offsetX += (targetX - this._offsetX) * lerpSpeed;
    this._offsetY += (targetY - this._offsetY) * lerpSpeed;

    // Clamp to map bounds
    const mapW = heist.map.width * T;
    const mapH = heist.map.height * T;
    this._offsetX = Math.min(0, Math.max(sw - mapW, this._offsetX));
    this._offsetY = Math.min(60, Math.max(sh - mapH - 60, this._offsetY)); // Account for HUD
  }

  destroy(): void {
    this.container.removeChildren();
    this._mapGfx.destroy();
    this._entityGfx.destroy();
    this._fogGfx.destroy();
    this._lightGfx.destroy();
  }
}
