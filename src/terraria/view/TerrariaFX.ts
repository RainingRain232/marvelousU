// ---------------------------------------------------------------------------
// Terraria – Particle & ambient effects system
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import type { TerrariaCamera } from "./TerrariaCamera";
import type { TerrariaState } from "../state/TerrariaState";
import { TB } from "../config/TerrariaBalance";

// ---------------------------------------------------------------------------

interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  color: number;
  life: number;
  maxLife: number;
  size: number;
  type: "square" | "circle" | "trail";
  gravity: number; // per-particle gravity multiplier
}

const MAX_PARTICLES = 400;

export class TerrariaFX {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _particles: Particle[] = [];
  private _ambientTimer = 0;

  constructor() {
    this.container.addChild(this._gfx);
  }

  // ---------------------------------------------------------------------------
  // Action particles
  // ---------------------------------------------------------------------------

  spawnMiningParticles(wx: number, wy: number, color: number, count = 8): void {
    for (let i = 0; i < count; i++) {
      this._spawn({
        x: wx + 0.3 + Math.random() * 0.4, y: wy + 0.3 + Math.random() * 0.4,
        vx: (Math.random() - 0.5) * 7, vy: Math.random() * 5 + 2,
        color, life: 0.4 + Math.random() * 0.5, maxLife: 0.9,
        size: 1.5 + Math.random() * 2, type: "square", gravity: 12,
      });
    }
  }

  spawnHitParticles(wx: number, wy: number, count = 10): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this._spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed,
        color: 0xFF3333 + (Math.floor(Math.random() * 0x44) << 8),
        life: 0.2 + Math.random() * 0.4, maxLife: 0.6,
        size: 1.5 + Math.random() * 2, type: "circle", gravity: 6,
      });
    }
  }

  spawnBlockPlaceParticles(wx: number, wy: number, color: number): void {
    for (let i = 0; i < 5; i++) {
      this._spawn({
        x: wx + 0.5, y: wy + 0.5,
        vx: (Math.random() - 0.5) * 4, vy: Math.random() * 3,
        color, life: 0.3 + Math.random() * 0.3, maxLife: 0.6,
        size: 1 + Math.random(), type: "square", gravity: 8,
      });
    }
  }

  spawnPickupParticles(wx: number, wy: number, color: number): void {
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      this._spawn({
        x: wx, y: wy,
        vx: Math.cos(angle) * 2.5, vy: Math.sin(angle) * 2.5 + 2,
        color, life: 0.3 + Math.random() * 0.2, maxLife: 0.5,
        size: 1 + Math.random(), type: "circle", gravity: 4,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Ambient particles (called each frame from game loop)
  // ---------------------------------------------------------------------------

  updateAmbient(state: TerrariaState, camera: TerrariaCamera, dt: number): void {
    this._ambientTimer += dt;
    if (this._ambientTimer < 0.15) return;
    this._ambientTimer = 0;
    if (this._particles.length > MAX_PARTICLES * 0.8) return;

    const p = state.player;
    const bounds = camera.getVisibleBounds();
    const isNight = state.timeOfDay > 0.75 || state.timeOfDay < 0.25;
    const isUnderground = p.y < TB.SURFACE_Y;

    // Underground dust motes
    if (isUnderground) {
      const dustX = bounds.minX + Math.random() * (bounds.maxX - bounds.minX);
      const dustY = bounds.minY + Math.random() * (bounds.maxY - bounds.minY);
      if (dustY < TB.SURFACE_Y && dustY > 5) {
        const depthColor = dustY < TB.CAVERN_Y ? 0x6644AA : dustY < TB.UNDERGROUND_Y ? 0x888877 : 0x998866;
        this._spawn({
          x: dustX, y: dustY,
          vx: (Math.random() - 0.5) * 0.3, vy: -0.2 - Math.random() * 0.3,
          color: depthColor, life: 3 + Math.random() * 4, maxLife: 7,
          size: 1 + Math.random() * 0.5, type: "circle", gravity: -0.3,
        });
      }
    }

    // Surface night fireflies
    if (!isUnderground && isNight && Math.random() < 0.3) {
      const ffX = p.x + (Math.random() - 0.5) * 30;
      const ffY = TB.SEA_LEVEL + 2 + Math.random() * 10;
      this._spawn({
        x: ffX, y: ffY,
        vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.5,
        color: 0xAAFF44, life: 2 + Math.random() * 3, maxLife: 5,
        size: 1.5, type: "circle", gravity: 0,
      });
    }

    // Falling leaves near trees (daytime, surface)
    if (!isUnderground && !isNight && Math.random() < 0.15) {
      const leafX = p.x + (Math.random() - 0.5) * 25;
      const leafY = TB.SEA_LEVEL + 8 + Math.random() * 10;
      this._spawn({
        x: leafX, y: leafY,
        vx: 0.5 + Math.random() * 1, vy: -0.3,
        color: Math.random() > 0.5 ? 0x44AA33 : 0xCC8822,
        life: 3 + Math.random() * 3, maxLife: 6,
        size: 1.5, type: "trail", gravity: 1.5,
      });
    }

    // Lava steam (near underworld)
    if (p.y < TB.UNDERWORLD_Y + 15 && Math.random() < 0.4) {
      const steamX = p.x + (Math.random() - 0.5) * 20;
      this._spawn({
        x: steamX, y: TB.UNDERWORLD_Y + Math.random() * 5,
        vx: (Math.random() - 0.5) * 0.5, vy: 0.5 + Math.random() * 1,
        color: 0xFF6633, life: 1 + Math.random() * 2, maxLife: 3,
        size: 2 + Math.random(), type: "circle", gravity: -1,
      });
    }
  }

  // ---------------------------------------------------------------------------
  // Update
  // ---------------------------------------------------------------------------

  update(dt: number): void {
    for (const p of this._particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy -= p.gravity * dt;
      p.life -= dt;
      // Slight drag
      p.vx *= 0.99;
    }
    this._particles = this._particles.filter(p => p.life > 0);
  }

  // ---------------------------------------------------------------------------
  // Draw
  // ---------------------------------------------------------------------------

  draw(camera: TerrariaCamera): void {
    this._gfx.clear();
    for (const p of this._particles) {
      const { sx, sy } = camera.worldToScreen(p.x, p.y);
      const alpha = Math.max(0, p.life / p.maxLife);
      const fade = alpha * alpha; // quadratic fade for nicer look

      if (p.type === "circle") {
        this._gfx.circle(sx, sy, p.size * (0.5 + fade * 0.5));
        this._gfx.fill({ color: p.color, alpha: fade * 0.8 });
        // Glow for fireflies/steam
        if (p.maxLife > 2) {
          this._gfx.circle(sx, sy, p.size * 2);
          this._gfx.fill({ color: p.color, alpha: fade * 0.15 });
        }
      } else if (p.type === "trail") {
        // Leaf-like trail: draw a small arc
        const trailLen = Math.abs(p.vx) * 2;
        this._gfx.moveTo(sx - trailLen, sy);
        this._gfx.quadraticCurveTo(sx, sy - 1.5, sx + trailLen, sy + 0.5);
        this._gfx.stroke({ color: p.color, width: p.size * 0.8, alpha: fade * 0.7 });
      } else {
        // Square
        const s = p.size * (0.5 + fade * 0.5);
        this._gfx.rect(sx - s / 2, sy - s / 2, s, s);
        this._gfx.fill({ color: p.color, alpha: fade * 0.85 });
      }
    }
  }

  // ---------------------------------------------------------------------------

  private _spawn(p: Particle): void {
    if (this._particles.length < MAX_PARTICLES) this._particles.push(p);
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
