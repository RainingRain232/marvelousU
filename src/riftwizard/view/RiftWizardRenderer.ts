// ---------------------------------------------------------------------------
// Rift Wizard renderer — tile grid + animated sprites + spell VFX
// ---------------------------------------------------------------------------

import {
  Container,
  Graphics,
  Text,
  TextStyle,
  AnimatedSprite,
  Texture,
} from "pixi.js";
import { UnitState } from "@/types";
import type { RiftWizardState, RWEnemyInstance, RWSummonInstance } from "../state/RiftWizardState";
import {
  RWTileType,
  RWAnimationType,
  type AnimationEvent,
} from "../state/RiftWizardState";
import { RWBalance } from "../config/RiftWizardConfig";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";
import { animationManager } from "@view/animation/AnimationManager";

const TS = RWBalance.TILE_SIZE;

// ---------------------------------------------------------------------------
// Enhanced color palette
// ---------------------------------------------------------------------------

const TILE_COLORS: Record<RWTileType, number> = {
  [RWTileType.WALL]: 0x1a1a2e,
  [RWTileType.FLOOR]: 0x2a2a3a,
  [RWTileType.CORRIDOR]: 0x252535,
  [RWTileType.LAVA]: 0xcc3300,
  [RWTileType.ICE]: 0x3388bb,
  [RWTileType.CHASM]: 0x080810,
  [RWTileType.SHRINE]: 0x3a3020,
  [RWTileType.SPELL_CIRCLE]: 0x2a2050,
  [RWTileType.RIFT_PORTAL]: 0x3a1860,
};

const TILE_ACCENT: Record<RWTileType, number> = {
  [RWTileType.WALL]: 0x0e0e1e,
  [RWTileType.FLOOR]: 0x222230,
  [RWTileType.CORRIDOR]: 0x1e1e2c,
  [RWTileType.LAVA]: 0xff6622,
  [RWTileType.ICE]: 0x66ccee,
  [RWTileType.CHASM]: 0x040408,
  [RWTileType.SHRINE]: 0x554422,
  [RWTileType.SPELL_CIRCLE]: 0x443388,
  [RWTileType.RIFT_PORTAL]: 0x6622aa,
};

const WIZARD_COLOR = 0x4488ff;
const ENEMY_COLOR = 0xcc2222;
const BOSS_COLOR = 0xff4444;
const SUMMON_COLOR = 0x44cc88;
const SPAWNER_COLOR = 0x996633;
const ITEM_COLOR = 0xffcc00;

// ---------------------------------------------------------------------------
// Particle system for ambient effects
// ---------------------------------------------------------------------------

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

// ---------------------------------------------------------------------------
// Active animation state
// ---------------------------------------------------------------------------

interface ActiveAnim {
  event: AnimationEvent;
  elapsed: number;
}

// ---------------------------------------------------------------------------
// Sprite cache for entities
// ---------------------------------------------------------------------------

interface EntitySprite {
  sprite: AnimatedSprite;
  entityId: number;
  lastState: UnitState;
}

// ---------------------------------------------------------------------------
// Renderer
// ---------------------------------------------------------------------------

export class RiftWizardRenderer {
  readonly worldLayer = new Container();

  private _tileGfx = new Graphics();
  private _ambientGfx = new Graphics();
  private _entityGfx = new Graphics();
  private _spriteLayer = new Container();
  private _fxGfx = new Graphics();
  private _fxParticleGfx = new Graphics();
  private _cursorGfx = new Graphics();
  private _dmgNumbers: { x: number; y: number; text: Text; lifetime: number }[] = [];
  private _activeAnims: ActiveAnim[] = [];
  private _particles: Particle[] = [];
  private _time = 0;

  // Sprite caching
  private _enemySprites = new Map<number, EntitySprite>();
  private _summonSprites = new Map<number, EntitySprite>();
  private _wizardSprite: AnimatedSprite | null = null;

  // Screen shake
  private _shakeAmount = 0;
  private _shakeDecay = 0;

  init(): void {
    this.worldLayer.removeChildren();

    this._tileGfx = new Graphics();
    this._ambientGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._spriteLayer = new Container();
    this._fxGfx = new Graphics();
    this._fxParticleGfx = new Graphics();
    this._cursorGfx = new Graphics();

    this.worldLayer.addChild(this._tileGfx);
    this.worldLayer.addChild(this._ambientGfx);
    this.worldLayer.addChild(this._entityGfx);
    this.worldLayer.addChild(this._spriteLayer);
    this.worldLayer.addChild(this._fxGfx);
    this.worldLayer.addChild(this._fxParticleGfx);
    this.worldLayer.addChild(this._cursorGfx);

    this._dmgNumbers = [];
    this._activeAnims = [];
    this._particles = [];
    this._time = 0;
    this._wizardSprite = null;
    this._enemySprites.clear();
    this._summonSprites.clear();
  }

  /** Returns true if animations are still playing. */
  get isAnimating(): boolean {
    return this._activeAnims.length > 0;
  }

  draw(
    state: RiftWizardState,
    screenWidth: number,
    screenHeight: number,
    dt: number,
  ): void {
    this._time += dt;

    // Center the map on screen
    const mapPxW = state.level.width * TS;
    const mapPxH = state.level.height * TS;
    let offsetX = Math.floor((screenWidth - mapPxW) / 2);
    let offsetY = Math.floor((screenHeight - mapPxH) / 2) - 40;

    // Screen shake
    if (this._shakeAmount > 0.5) {
      offsetX += Math.round((Math.random() - 0.5) * this._shakeAmount * 2);
      offsetY += Math.round((Math.random() - 0.5) * this._shakeAmount * 2);
      this._shakeAmount *= (1 - this._shakeDecay * dt * 60);
      if (this._shakeAmount < 0.5) this._shakeAmount = 0;
    }

    this.worldLayer.x = offsetX;
    this.worldLayer.y = offsetY;

    this._drawTiles(state);
    this._drawAmbientEffects(state, dt);
    this._drawEntities(state);
    this._syncSprites(state);
    this._drawTargetCursor(state);
    this._updateAnimations(state, dt);
    this._updateParticles(dt);
    this._updateDamageNumbers(dt);
  }

  // -------------------------------------------------------------------------
  // Tiles - enhanced with wall outlines, ambient glow, texture variation
  // -------------------------------------------------------------------------

  private _drawTiles(state: RiftWizardState): void {
    this._tileGfx.clear();

    // Simple position-based hash for deterministic variation
    const tileHash = (c: number, r: number, seed: number) =>
      ((c * 7 + r * 13 + seed * 31) & 0xffff) / 0xffff;

    // Check if a neighbour is a specific type
    const tileAt = (c: number, r: number): RWTileType | null => {
      if (c < 0 || r < 0 || c >= state.level.width || r >= state.level.height) return null;
      return state.level.tiles[r][c];
    };

    for (let row = 0; row < state.level.height; row++) {
      for (let col = 0; col < state.level.width; col++) {
        const tile = state.level.tiles[row][col];
        const x = col * TS;
        const y = row * TS;

        if (tile === RWTileType.WALL) {
          // --- WALL: base fill ---
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.fill(TILE_COLORS[RWTileType.WALL]);

          // Brick texture: horizontal mortar lines every 8px
          const brickH = 8;
          for (let br = 0; br < TS; br += brickH) {
            // Horizontal mortar line
            this._tileGfx.moveTo(x, y + br);
            this._tileGfx.lineTo(x + TS, y + br);
            this._tileGfx.stroke({ color: 0x12122a, width: 1, alpha: 0.6 });

            // Vertical mortar lines offset by row parity
            const brickRow = Math.floor(br / brickH);
            const offset = (brickRow % 2 === 0) ? 0 : TS / 2;
            for (let bx = offset; bx < TS; bx += TS / 2) {
              if (bx > 0 && bx < TS) {
                this._tileGfx.moveTo(x + bx, y + br);
                this._tileGfx.lineTo(x + bx, y + br + brickH);
                this._tileGfx.stroke({ color: 0x12122a, width: 1, alpha: 0.5 });
              }
            }
          }

          // Inner shadow gradient: darker rects inset
          this._tileGfx.rect(x + 2, y + 2, TS - 4, TS - 4);
          this._tileGfx.fill({ color: 0x0a0a18, alpha: 0.15 });
          this._tileGfx.rect(x + 4, y + 4, TS - 8, TS - 8);
          this._tileGfx.fill({ color: 0x0a0a18, alpha: 0.1 });

          this._drawWallEdges(state, col, row, x, y);

        } else if (tile === RWTileType.CHASM) {
          // --- CHASM: base fill ---
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.fill(TILE_COLORS[RWTileType.CHASM]);

          // Depth lines: concentric rects getting darker toward center
          for (let d = 0; d < 5; d++) {
            const inset = 2 + d * 2;
            const darkAlpha = 0.15 + d * 0.08;
            this._tileGfx.rect(x + inset, y + inset, TS - inset * 2, TS - inset * 2);
            this._tileGfx.fill({ color: 0x020204, alpha: darkAlpha });
          }

          // Subtle inner border for depth (original)
          this._tileGfx.rect(x + 1, y + 1, TS - 2, TS - 2);
          this._tileGfx.stroke({ color: 0x0c0c18, width: 1 });

          // Jagged edges where chasm borders floor tiles
          const directions = [
            { dc: 0, dr: -1, side: "top" },
            { dc: 0, dr: 1, side: "bottom" },
            { dc: -1, dr: 0, side: "left" },
            { dc: 1, dr: 0, side: "right" },
          ] as const;
          for (const dir of directions) {
            const nb = tileAt(col + dir.dc, row + dir.dr);
            if (nb !== null && nb !== RWTileType.CHASM && nb !== RWTileType.WALL) {
              // Draw zigzag jagged edge on that side
              const jagSegments = 8;
              const jagAmp = 3;
              if (dir.side === "top") {
                this._tileGfx.moveTo(x, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + (s / jagSegments) * TS;
                  const sy2 = y + ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s));
                  this._tileGfx.lineTo(sx2, sy2);
                }
                this._tileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else if (dir.side === "bottom") {
                this._tileGfx.moveTo(x, y + TS);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + (s / jagSegments) * TS;
                  const sy2 = y + TS - ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 10));
                  this._tileGfx.lineTo(sx2, sy2);
                }
                this._tileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else if (dir.side === "left") {
                this._tileGfx.moveTo(x, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 20));
                  const sy2 = y + (s / jagSegments) * TS;
                  this._tileGfx.lineTo(sx2, sy2);
                }
                this._tileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else {
                this._tileGfx.moveTo(x + TS, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + TS - ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 30));
                  const sy2 = y + (s / jagSegments) * TS;
                  this._tileGfx.lineTo(sx2, sy2);
                }
                this._tileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              }
            }
          }

        } else if (tile === RWTileType.LAVA) {
          // --- LAVA: base fill ---
          const pulse = 0.7 + 0.3 * Math.sin(this._time * 3 + col * 0.7 + row * 0.5);
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.fill(TILE_COLORS[RWTileType.LAVA]);
          this._tileGfx.rect(x + 2, y + 2, TS - 4, TS - 4);
          this._tileGfx.fill({ color: TILE_ACCENT[RWTileType.LAVA], alpha: pulse * 0.5 });
          // Bright center (original)
          this._tileGfx.rect(x + 6, y + 6, TS - 12, TS - 12);
          this._tileGfx.fill({ color: 0xffaa22, alpha: pulse * 0.3 });

          // Concentric irregular bubbling shapes
          const cx = x + TS / 2;
          const cy = y + TS / 2;
          for (let ring = 0; ring < 3; ring++) {
            const rSize = 4 + ring * 4;
            const wobble = Math.sin(this._time * 4 + ring * 2.1 + col * 1.3) * 2;
            const pts = 6;
            this._tileGfx.moveTo(cx + rSize + wobble, cy);
            for (let p = 1; p <= pts; p++) {
              const angle = (p / pts) * Math.PI * 2;
              const jitter = Math.sin(this._time * 5 + p * 1.7 + row) * 1.5;
              this._tileGfx.lineTo(
                cx + Math.cos(angle) * (rSize + jitter + wobble),
                cy + Math.sin(angle) * (rSize + jitter),
              );
            }
            this._tileGfx.closePath();
            this._tileGfx.fill({ color: 0xff8811, alpha: 0.15 - ring * 0.03 });
          }

          // Hot spots: small bright stars
          for (let hs = 0; hs < 2; hs++) {
            const hx = x + 6 + tileHash(col, row, hs * 3) * (TS - 12);
            const hy = y + 6 + tileHash(col, row, hs * 3 + 1) * (TS - 12);
            const hPulse = 0.5 + 0.5 * Math.sin(this._time * 6 + hs * 3.7 + col);
            this._tileGfx.star(hx, hy, 4, 3 * hPulse, 1.2 * hPulse);
            this._tileGfx.fill({ color: 0xffee44, alpha: hPulse * 0.7 });
          }

          // Dark rock islands: small dark polygons
          const numIslands = Math.floor(tileHash(col, row, 99) * 2);
          for (let isl = 0; isl < numIslands; isl++) {
            const ix = x + 4 + tileHash(col, row, 50 + isl) * (TS - 8);
            const iy = y + 4 + tileHash(col, row, 60 + isl) * (TS - 8);
            this._tileGfx.moveTo(ix, iy - 2);
            this._tileGfx.lineTo(ix + 2.5, iy + 1);
            this._tileGfx.lineTo(ix - 2.5, iy + 1.5);
            this._tileGfx.closePath();
            this._tileGfx.fill({ color: 0x331100, alpha: 0.6 });
          }

        } else if (tile === RWTileType.ICE) {
          // --- ICE: base fill ---
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.fill(TILE_COLORS[RWTileType.ICE]);

          const shimmer = 0.2 + 0.15 * Math.sin(this._time * 2 + col * 1.3 + row * 0.8);
          this._tileGfx.rect(x + 3, y + 3, TS - 6, TS - 6);
          this._tileGfx.fill({ color: 0xaaddff, alpha: shimmer });

          // Original diamond highlight
          const cx = x + TS / 2;
          const cy = y + TS / 2;
          this._tileGfx.moveTo(cx, cy - 4);
          this._tileGfx.lineTo(cx + 4, cy);
          this._tileGfx.lineTo(cx, cy + 4);
          this._tileGfx.lineTo(cx - 4, cy);
          this._tileGfx.closePath();
          this._tileGfx.fill({ color: 0xffffff, alpha: shimmer * 0.5 });

          // Crystalline facets: overlapping diamond/triangle shapes at different angles
          for (let f = 0; f < 4; f++) {
            const fAngle = (f / 4) * Math.PI + tileHash(col, row, f) * 0.5;
            const fSize = 5 + tileHash(col, row, f + 10) * 6;
            const fcx = cx + Math.cos(fAngle * 3) * 4;
            const fcy = cy + Math.sin(fAngle * 3) * 4;
            // Diamond facet
            this._tileGfx.moveTo(fcx, fcy - fSize);
            this._tileGfx.lineTo(fcx + fSize * 0.6, fcy);
            this._tileGfx.lineTo(fcx, fcy + fSize * 0.7);
            this._tileGfx.lineTo(fcx - fSize * 0.6, fcy);
            this._tileGfx.closePath();
            this._tileGfx.stroke({ color: 0x99ccff, width: 1, alpha: 0.2 + shimmer * 0.15 });
          }

          // Frost branching lines from corners
          const corners = [
            { ox: x, oy: y },
            { ox: x + TS, oy: y },
            { ox: x, oy: y + TS },
            { ox: x + TS, oy: y + TS },
          ];
          for (let ci = 0; ci < corners.length; ci++) {
            const c = corners[ci];
            const branchLen = 6 + tileHash(col, row, ci + 20) * 6;
            const branchAngle = Math.atan2(cy - c.oy, cx - c.ox);
            const ex = c.ox + Math.cos(branchAngle) * branchLen;
            const ey = c.oy + Math.sin(branchAngle) * branchLen;
            this._tileGfx.moveTo(c.ox, c.oy);
            this._tileGfx.lineTo(ex, ey);
            this._tileGfx.stroke({ color: 0xcceeff, width: 1, alpha: 0.3 });
            // Sub-branch
            const subAngle = branchAngle + (tileHash(col, row, ci + 30) > 0.5 ? 0.6 : -0.6);
            const subLen = branchLen * 0.5;
            const midX = c.ox + Math.cos(branchAngle) * branchLen * 0.5;
            const midY = c.oy + Math.sin(branchAngle) * branchLen * 0.5;
            this._tileGfx.moveTo(midX, midY);
            this._tileGfx.lineTo(midX + Math.cos(subAngle) * subLen, midY + Math.sin(subAngle) * subLen);
            this._tileGfx.stroke({ color: 0xcceeff, width: 1, alpha: 0.2 });
          }

        } else {
          // --- FLOOR / CORRIDOR: base fill ---
          const color = TILE_COLORS[tile] ?? 0x2a2a3a;
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.fill(color);

          // Subtle noise pattern using position-based hash (original)
          const hash = ((col * 7 + row * 13) % 5);
          if (hash < 2) {
            this._tileGfx.rect(x + 1, y + 1, TS - 2, TS - 2);
            this._tileGfx.fill({ color: TILE_ACCENT[tile] ?? 0x222230, alpha: 0.3 });
          }

          // Grid lines (original)
          this._tileGfx.rect(x, y, TS, TS);
          this._tileGfx.stroke({ color: 0x16162a, width: 1 });

          // Stone flagstone pattern: cross-hatch lines based on position hash
          // Determine stone block layout using hash for variation
          const blockSeed = Math.floor(tileHash(col, row, 0) * 4);
          if (blockSeed === 0) {
            // Horizontal split
            const splitY = y + 10 + Math.floor(tileHash(col, row, 1) * 12);
            this._tileGfx.moveTo(x + 2, splitY);
            this._tileGfx.lineTo(x + TS - 2, splitY);
            this._tileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.5 });
          } else if (blockSeed === 1) {
            // Vertical split
            const splitX = x + 10 + Math.floor(tileHash(col, row, 2) * 12);
            this._tileGfx.moveTo(splitX, y + 2);
            this._tileGfx.lineTo(splitX, y + TS - 2);
            this._tileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.5 });
          } else if (blockSeed === 2) {
            // Cross pattern: both splits
            const splitY = y + 12 + Math.floor(tileHash(col, row, 3) * 8);
            const splitX = x + 12 + Math.floor(tileHash(col, row, 4) * 8);
            this._tileGfx.moveTo(x + 2, splitY);
            this._tileGfx.lineTo(x + TS - 2, splitY);
            this._tileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.4 });
            this._tileGfx.moveTo(splitX, y + 2);
            this._tileGfx.lineTo(splitX, y + TS - 2);
            this._tileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.4 });
          } else {
            // L-shaped crack
            const midX = x + TS / 2 + (tileHash(col, row, 5) - 0.5) * 8;
            const midY = y + TS / 2 + (tileHash(col, row, 6) - 0.5) * 8;
            this._tileGfx.moveTo(x + 3, midY);
            this._tileGfx.lineTo(midX, midY);
            this._tileGfx.lineTo(midX, y + TS - 3);
            this._tileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.45 });
          }

          // Occasional chip/nick marks on some tiles
          if (tileHash(col, row, 7) > 0.65) {
            const chipX = x + 4 + tileHash(col, row, 8) * (TS - 8);
            const chipY = y + 4 + tileHash(col, row, 9) * (TS - 8);
            this._tileGfx.circle(chipX, chipY, 1.5);
            this._tileGfx.fill({ color: 0x16162a, alpha: 0.4 });
          }
        }
      }
    }

    // Draw shrine indicators with ornate pedestals
    for (const shrine of state.level.shrines) {
      if (shrine.used) continue;
      const sx = shrine.col * TS + TS / 2;
      const sy = shrine.row * TS + TS / 2;
      const pulse = 0.5 + 0.3 * Math.sin(this._time * 2);
      const schoolColor = SCHOOL_COLORS[shrine.school];

      // Original outer glow
      this._tileGfx.circle(sx, sy, TS * 0.45);
      this._tileGfx.fill({ color: schoolColor, alpha: pulse * 0.15 });

      // Multi-tiered pedestal base (stacked rects, bottom to top)
      // Tier 1 (widest)
      this._tileGfx.rect(sx - 12, sy + 6, 24, 5);
      this._tileGfx.fill({ color: 0x555544, alpha: 0.8 });
      this._tileGfx.rect(sx - 12, sy + 6, 24, 5);
      this._tileGfx.stroke({ color: 0x777766, width: 1, alpha: 0.6 });
      // Tier 2
      this._tileGfx.rect(sx - 9, sy + 2, 18, 5);
      this._tileGfx.fill({ color: 0x666655, alpha: 0.8 });
      this._tileGfx.rect(sx - 9, sy + 2, 18, 5);
      this._tileGfx.stroke({ color: 0x888877, width: 1, alpha: 0.6 });
      // Tier 3 (narrowest)
      this._tileGfx.rect(sx - 6, sy - 2, 12, 5);
      this._tileGfx.fill({ color: 0x777766, alpha: 0.8 });
      this._tileGfx.rect(sx - 6, sy - 2, 12, 5);
      this._tileGfx.stroke({ color: 0x999988, width: 1, alpha: 0.6 });

      // Glowing gem on top: faceted diamond polygon
      const gemY = sy - 6;
      const gemPulse = 0.6 + 0.4 * Math.sin(this._time * 3);
      // Gem glow halo
      this._tileGfx.circle(sx, gemY, 6);
      this._tileGfx.fill({ color: schoolColor, alpha: gemPulse * 0.3 });
      // Faceted diamond shape
      this._tileGfx.moveTo(sx, gemY - 5);
      this._tileGfx.lineTo(sx + 4, gemY - 1);
      this._tileGfx.lineTo(sx + 3, gemY + 3);
      this._tileGfx.lineTo(sx - 3, gemY + 3);
      this._tileGfx.lineTo(sx - 4, gemY - 1);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: schoolColor, alpha: 0.85 });
      // Gem highlight facet
      this._tileGfx.moveTo(sx, gemY - 5);
      this._tileGfx.lineTo(sx + 2, gemY);
      this._tileGfx.lineTo(sx - 2, gemY);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.3 });

      // Rune symbols around the base: small geometric shapes in a circle
      for (let ri = 0; ri < 6; ri++) {
        const runeAngle = (ri / 6) * Math.PI * 2 + this._time * 0.3;
        const runeR = TS * 0.42;
        const rx = sx + Math.cos(runeAngle) * runeR;
        const ry = sy + Math.sin(runeAngle) * runeR;
        if (ri % 3 === 0) {
          // Small diamond rune
          this._tileGfx.moveTo(rx, ry - 2);
          this._tileGfx.lineTo(rx + 1.5, ry);
          this._tileGfx.lineTo(rx, ry + 2);
          this._tileGfx.lineTo(rx - 1.5, ry);
          this._tileGfx.closePath();
          this._tileGfx.fill({ color: schoolColor, alpha: 0.6 });
        } else if (ri % 3 === 1) {
          // Small triangle rune
          this._tileGfx.moveTo(rx, ry - 2);
          this._tileGfx.lineTo(rx + 2, ry + 1.5);
          this._tileGfx.lineTo(rx - 2, ry + 1.5);
          this._tileGfx.closePath();
          this._tileGfx.fill({ color: schoolColor, alpha: 0.5 });
        } else {
          // Small square rune
          this._tileGfx.rect(rx - 1.5, ry - 1.5, 3, 3);
          this._tileGfx.fill({ color: schoolColor, alpha: 0.5 });
        }
      }

      // Original rune-like ring
      this._tileGfx.circle(sx, sy, TS * 0.38);
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.6 });
    }

    // Draw spell circle indicators with complex magic circle geometry
    for (const circle of state.level.spellCircles) {
      const cx = circle.col * TS + TS / 2;
      const cy = circle.row * TS + TS / 2;
      const schoolColor = SCHOOL_COLORS[circle.school];

      // Original outer ring
      this._tileGfx.circle(cx, cy, TS * 0.42);
      this._tileGfx.stroke({ color: schoolColor, width: 2, alpha: 0.5 });
      // Original inner ring
      this._tileGfx.circle(cx, cy, TS * 0.28);
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.8 });

      // Additional concentric rings with rune tick marks
      this._tileGfx.circle(cx, cy, TS * 0.48);
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.25 });
      this._tileGfx.circle(cx, cy, TS * 0.18);
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.5 });

      // Rune tick marks on outer ring
      for (let t = 0; t < 12; t++) {
        const tickAngle = (t / 12) * Math.PI * 2;
        const innerR = TS * 0.42;
        const outerR = TS * 0.48;
        this._tileGfx.moveTo(cx + Math.cos(tickAngle) * innerR, cy + Math.sin(tickAngle) * innerR);
        this._tileGfx.lineTo(cx + Math.cos(tickAngle) * outerR, cy + Math.sin(tickAngle) * outerR);
        this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.4 });
      }

      // Hexagram (Star of David) pattern inside
      const hexR = TS * 0.25;
      // Triangle 1 (pointing up)
      this._tileGfx.moveTo(cx, cy - hexR);
      this._tileGfx.lineTo(cx + hexR * Math.cos(Math.PI / 6), cy + hexR * Math.sin(Math.PI / 6));
      this._tileGfx.lineTo(cx - hexR * Math.cos(Math.PI / 6), cy + hexR * Math.sin(Math.PI / 6));
      this._tileGfx.closePath();
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.5 });
      // Triangle 2 (pointing down)
      this._tileGfx.moveTo(cx, cy + hexR);
      this._tileGfx.lineTo(cx + hexR * Math.cos(Math.PI / 6), cy - hexR * Math.sin(Math.PI / 6));
      this._tileGfx.lineTo(cx - hexR * Math.cos(Math.PI / 6), cy - hexR * Math.sin(Math.PI / 6));
      this._tileGfx.closePath();
      this._tileGfx.stroke({ color: schoolColor, width: 1, alpha: 0.5 });

      // Cardinal point markers (N, S, E, W)
      const cardR = TS * 0.38;
      for (let ci2 = 0; ci2 < 4; ci2++) {
        const cAngle = (ci2 / 4) * Math.PI * 2 - Math.PI / 2;
        const cpx = cx + Math.cos(cAngle) * cardR;
        const cpy = cy + Math.sin(cAngle) * cardR;
        // Small diamond marker
        this._tileGfx.moveTo(cpx, cpy - 2.5);
        this._tileGfx.lineTo(cpx + 2, cpy);
        this._tileGfx.lineTo(cpx, cpy + 2.5);
        this._tileGfx.lineTo(cpx - 2, cpy);
        this._tileGfx.closePath();
        this._tileGfx.fill({ color: schoolColor, alpha: 0.7 });
      }

      // Original four rotating dots (rune positions)
      for (let i = 0; i < 4; i++) {
        const angle = this._time * 0.5 + (i * Math.PI / 2);
        const dx = Math.cos(angle) * TS * 0.35;
        const dy = Math.sin(angle) * TS * 0.35;
        this._tileGfx.circle(cx + dx, cy + dy, 2);
        this._tileGfx.fill({ color: 0xffffff, alpha: 0.7 });
      }
    }

    // Draw items on ground with elaborate detail and glow halos
    for (const item of state.level.items) {
      if (item.picked) continue;
      const ix = item.col * TS + TS / 2;
      const iy = item.row * TS + TS / 2;
      const bounce = Math.sin(this._time * 3) * 2;
      const itemPulse = 0.5 + 0.5 * Math.sin(this._time * 2.5);

      // Outer glow halo (larger, softer)
      this._tileGfx.circle(ix, iy + bounce, TS * 0.45);
      this._tileGfx.fill({ color: ITEM_COLOR, alpha: 0.06 * itemPulse });
      // Mid glow halo
      this._tileGfx.circle(ix, iy + bounce, TS * 0.35);
      this._tileGfx.fill({ color: ITEM_COLOR, alpha: 0.1 * itemPulse });
      // Original glow
      this._tileGfx.circle(ix, iy + bounce, TS * 0.3);
      this._tileGfx.fill({ color: ITEM_COLOR, alpha: 0.15 });

      // Outer item outline star (slightly larger, semi-transparent)
      this._tileGfx.star(ix, iy + bounce, 4, TS * 0.19, TS * 0.1);
      this._tileGfx.stroke({ color: ITEM_COLOR, width: 1, alpha: 0.4 });

      // Original item shape
      this._tileGfx.star(ix, iy + bounce, 4, TS * 0.15, TS * 0.08);
      this._tileGfx.fill(ITEM_COLOR);

      // Inner bright core
      this._tileGfx.star(ix, iy + bounce, 4, TS * 0.07, TS * 0.04);
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.5 });

      // Sparkle (original + extras)
      this._tileGfx.circle(ix + 3, iy + bounce - 3, 1.5);
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.8 });
      // Second sparkle
      this._tileGfx.circle(ix - 2, iy + bounce + 2, 1);
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.5 * itemPulse });

      // Ring outline around item
      this._tileGfx.circle(ix, iy + bounce, TS * 0.22);
      this._tileGfx.stroke({ color: ITEM_COLOR, width: 1, alpha: 0.3 });
    }
  }

  private _drawWallEdges(
    state: RiftWizardState,
    col: number,
    row: number,
    x: number,
    y: number,
  ): void {
    // Draw lighter edges on wall tiles where they border walkable tiles
    const isFloor = (c: number, r: number) => {
      if (c < 0 || r < 0 || c >= state.level.width || r >= state.level.height) return false;
      const t = state.level.tiles[r][c];
      return t !== RWTileType.WALL && t !== RWTileType.CHASM;
    };

    const edgeColor = 0x2a2a44;
    const edgeMid = 0x222238;
    const edgeDark = 0x18182e;

    // Stepped/beveled edges: 3-pixel wide with gradient (light -> mid -> dark)
    if (isFloor(col, row - 1)) {
      // Top edge: 3-step bevel
      this._tileGfx.rect(x, y, TS, 1);
      this._tileGfx.fill(edgeColor);
      this._tileGfx.rect(x, y + 1, TS, 1);
      this._tileGfx.fill(edgeMid);
      this._tileGfx.rect(x, y + 2, TS, 1);
      this._tileGfx.fill(edgeDark);
      // Corner bevels: small diagonal highlight triangles
      this._tileGfx.moveTo(x, y);
      this._tileGfx.lineTo(x + 3, y);
      this._tileGfx.lineTo(x, y + 3);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: 0x333355, alpha: 0.5 });
      this._tileGfx.moveTo(x + TS, y);
      this._tileGfx.lineTo(x + TS - 3, y);
      this._tileGfx.lineTo(x + TS, y + 3);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: 0x333355, alpha: 0.5 });
    }
    if (isFloor(col, row + 1)) {
      // Bottom edge: 3-step bevel (brighter, floor shadow)
      this._tileGfx.rect(x, y + TS - 3, TS, 1);
      this._tileGfx.fill(edgeDark);
      this._tileGfx.rect(x, y + TS - 2, TS, 1);
      this._tileGfx.fill(edgeMid);
      this._tileGfx.rect(x, y + TS - 1, TS, 1);
      this._tileGfx.fill(0x333350);
      // Corner bevels
      this._tileGfx.moveTo(x, y + TS);
      this._tileGfx.lineTo(x + 3, y + TS);
      this._tileGfx.lineTo(x, y + TS - 3);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: 0x383858, alpha: 0.5 });
      this._tileGfx.moveTo(x + TS, y + TS);
      this._tileGfx.lineTo(x + TS - 3, y + TS);
      this._tileGfx.lineTo(x + TS, y + TS - 3);
      this._tileGfx.closePath();
      this._tileGfx.fill({ color: 0x383858, alpha: 0.5 });
    }
    if (isFloor(col - 1, row)) {
      // Left edge: 3-step bevel
      this._tileGfx.rect(x, y, 1, TS);
      this._tileGfx.fill(edgeColor);
      this._tileGfx.rect(x + 1, y, 1, TS);
      this._tileGfx.fill(edgeMid);
      this._tileGfx.rect(x + 2, y, 1, TS);
      this._tileGfx.fill(edgeDark);
    }
    if (isFloor(col + 1, row)) {
      // Right edge: 3-step bevel
      this._tileGfx.rect(x + TS - 3, y, 1, TS);
      this._tileGfx.fill(edgeDark);
      this._tileGfx.rect(x + TS - 2, y, 1, TS);
      this._tileGfx.fill(edgeMid);
      this._tileGfx.rect(x + TS - 1, y, 1, TS);
      this._tileGfx.fill(edgeColor);
    }
  }

  // -------------------------------------------------------------------------
  // Ambient effects (lava particles, ice mist)
  // -------------------------------------------------------------------------

  private _drawAmbientEffects(state: RiftWizardState, dt: number): void {
    this._ambientGfx.clear();

    // Spawn ambient particles from lava tiles
    if (Math.random() < dt * 8) {
      for (let row = 0; row < state.level.height; row++) {
        for (let col = 0; col < state.level.width; col++) {
          const tile = state.level.tiles[row][col];
          if (tile === RWTileType.LAVA && Math.random() < 0.02) {
            this._particles.push({
              x: col * TS + Math.random() * TS,
              y: row * TS + Math.random() * TS,
              vx: (Math.random() - 0.5) * 8,
              vy: -15 - Math.random() * 20,
              life: 0.6 + Math.random() * 0.4,
              maxLife: 1.0,
              color: Math.random() > 0.5 ? 0xff6622 : 0xffaa22,
              size: 1 + Math.random() * 2,
            });
          }
        }
      }
    }

    // Wizard footstep glow
    const wx = state.wizard.col * TS + TS / 2;
    const wy = state.wizard.row * TS + TS / 2;
    const wizPulse = 0.3 + 0.15 * Math.sin(this._time * 2);
    this._ambientGfx.circle(wx, wy, TS * 0.6);
    this._ambientGfx.fill({ color: WIZARD_COLOR, alpha: wizPulse * 0.1 });
  }

  // -------------------------------------------------------------------------
  // Entities (fallback graphics for when sprites aren't available)
  // -------------------------------------------------------------------------

  private _drawEntities(state: RiftWizardState): void {
    this._entityGfx.clear();

    // Draw rift portals with animated swirl
    for (const portal of state.level.riftPortals) {
      const px = portal.col * TS + TS / 2;
      const py = portal.row * TS + TS / 2;
      const portalColor = SCHOOL_COLORS[portal.theme] ?? 0x9933ff;
      const pulse = 0.6 + 0.4 * Math.sin(this._time * 3);

      // Outer glow
      this._entityGfx.circle(px, py, TS * 0.55);
      this._entityGfx.fill({ color: portalColor, alpha: 0.15 * pulse });
      // Portal body
      this._entityGfx.rect(portal.col * TS + 2, portal.row * TS + 2, TS - 4, TS - 4);
      this._entityGfx.fill({ color: portalColor, alpha: 0.6 });
      // Inner bright core
      this._entityGfx.rect(portal.col * TS + 6, portal.row * TS + 6, TS - 12, TS - 12);
      this._entityGfx.fill({ color: 0xffffff, alpha: 0.2 * pulse });
      // Border
      this._entityGfx.rect(portal.col * TS + 2, portal.row * TS + 2, TS - 4, TS - 4);
      this._entityGfx.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
      // Rotating particles around portal
      for (let i = 0; i < 3; i++) {
        const angle = this._time * 2 + (i * Math.PI * 2 / 3);
        const dx = Math.cos(angle) * TS * 0.35;
        const dy = Math.sin(angle) * TS * 0.35;
        this._entityGfx.circle(px + dx, py + dy, 2);
        this._entityGfx.fill({ color: 0xffffff, alpha: 0.7 });
      }
    }

    // Draw spawners with pulsing glow
    for (const spawner of state.level.spawners) {
      if (!spawner.alive) continue;
      const sx = spawner.col * TS;
      const sy = spawner.row * TS;
      const pulse = 0.5 + 0.3 * Math.sin(this._time * 2);
      // Glow
      this._entityGfx.circle(sx + TS / 2, sy + TS / 2, TS * 0.5);
      this._entityGfx.fill({ color: SPAWNER_COLOR, alpha: 0.15 * pulse });
      // Body
      this._entityGfx.rect(sx + 3, sy + 3, TS - 6, TS - 6);
      this._entityGfx.fill(SPAWNER_COLOR);
      // Top ornament
      this._entityGfx.moveTo(sx + TS / 2, sy);
      this._entityGfx.lineTo(sx + TS / 2 + 5, sy + 6);
      this._entityGfx.lineTo(sx + TS / 2 - 5, sy + 6);
      this._entityGfx.closePath();
      this._entityGfx.fill(0xcc8844);
      // Border
      this._entityGfx.rect(sx + 3, sy + 3, TS - 6, TS - 6);
      this._entityGfx.stroke({ color: 0xaa7733, width: 1 });
      // HP bar
      this._drawHpBar(sx, sy - 5, spawner.hp, spawner.maxHp);
    }

    // Only draw fallback graphics for entities that don't have sprites
    // (sprite rendering is handled in _syncSprites)

    // Draw summons without sprites
    for (const summon of state.level.summons) {
      if (!summon.alive) continue;
      if (this._summonSprites.has(summon.id)) continue;
      this._drawSummonFallback(summon);
    }

    // Draw enemies without sprites
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      if (this._enemySprites.has(enemy.id)) continue;
      this._drawEnemyFallback(enemy);
    }

    // Draw wizard if no sprite
    if (!this._wizardSprite) {
      this._drawWizardFallback(state);
    }

    // Always draw HP bars and status indicators on top of sprites
    this._drawEntityOverlays(state);
  }

  private _drawEnemyFallback(enemy: RWEnemyInstance): void {
    const ex = enemy.col * TS + TS / 2;
    const ey = enemy.row * TS + TS / 2;
    const color = enemy.isBoss ? BOSS_COLOR : (enemy.school ? SCHOOL_COLORS[enemy.school] ?? ENEMY_COLOR : ENEMY_COLOR);

    if (enemy.isBoss) {
      // Boss: larger diamond with inner glow
      const pulse = 0.8 + 0.2 * Math.sin(this._time * 3);
      this._entityGfx.circle(ex, ey, TS * 0.45);
      this._entityGfx.fill({ color, alpha: 0.15 * pulse });
      this._entityGfx.moveTo(ex, ey - TS * 0.4);
      this._entityGfx.lineTo(ex + TS * 0.4, ey);
      this._entityGfx.lineTo(ex, ey + TS * 0.4);
      this._entityGfx.lineTo(ex - TS * 0.4, ey);
      this._entityGfx.closePath();
      this._entityGfx.fill(color);
      // Crown indicator
      this._entityGfx.moveTo(ex - 5, ey - TS * 0.35);
      this._entityGfx.lineTo(ex - 3, ey - TS * 0.45);
      this._entityGfx.lineTo(ex, ey - TS * 0.38);
      this._entityGfx.lineTo(ex + 3, ey - TS * 0.45);
      this._entityGfx.lineTo(ex + 5, ey - TS * 0.35);
      this._entityGfx.stroke({ color: 0xffcc00, width: 1.5 });
    } else {
      // Regular enemy: circle with outline
      this._entityGfx.circle(ex, ey, TS * 0.3);
      this._entityGfx.fill(color);
      this._entityGfx.circle(ex, ey, TS * 0.3);
      this._entityGfx.stroke({ color: 0x000000, width: 1 });
      // Eye dots
      this._entityGfx.circle(ex - 3, ey - 2, 1.5);
      this._entityGfx.fill(0xffffff);
      this._entityGfx.circle(ex + 3, ey - 2, 1.5);
      this._entityGfx.fill(0xffffff);
    }
  }

  private _drawSummonFallback(summon: RWSummonInstance): void {
    const sx = summon.col * TS + TS / 2;
    const sy = summon.row * TS + TS / 2;
    // Summon: outlined circle with nature glow
    this._entityGfx.circle(sx, sy, TS * 0.28);
    this._entityGfx.fill(SUMMON_COLOR);
    this._entityGfx.circle(sx, sy, TS * 0.28);
    this._entityGfx.stroke({ color: 0x66ffaa, width: 1 });
  }

  private _drawWizardFallback(state: RiftWizardState): void {
    const wx = state.wizard.col * TS + TS / 2;
    const wy = state.wizard.row * TS + TS / 2;
    // Body
    this._entityGfx.circle(wx, wy, TS * 0.32);
    this._entityGfx.fill(WIZARD_COLOR);
    this._entityGfx.circle(wx, wy, TS * 0.32);
    this._entityGfx.stroke({ color: 0x6699ff, width: 1 });
    // Hat
    this._entityGfx.moveTo(wx, wy - TS * 0.55);
    this._entityGfx.lineTo(wx + TS * 0.22, wy - TS * 0.15);
    this._entityGfx.lineTo(wx - TS * 0.22, wy - TS * 0.15);
    this._entityGfx.closePath();
    this._entityGfx.fill(WIZARD_COLOR);
    // Hat star
    this._entityGfx.star(wx, wy - TS * 0.35, 4, 3, 1.5);
    this._entityGfx.fill(0xffffff);
  }

  private _drawEntityOverlays(state: RiftWizardState): void {
    // HP bars for all entities
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      this._drawHpBar(enemy.col * TS, enemy.row * TS - 5, enemy.hp, enemy.maxHp);
      // Stun indicator
      if (enemy.stunTurns > 0) {
        const ex = enemy.col * TS + TS / 2;
        const ey = enemy.row * TS + TS / 2;
        this._entityGfx.circle(ex, ey, TS * 0.38);
        this._entityGfx.stroke({ color: 0x88ccff, width: 2, alpha: 0.7 });
        // Stars above head for stun
        for (let i = 0; i < 3; i++) {
          const angle = this._time * 3 + (i * Math.PI * 2 / 3);
          const dx = Math.cos(angle) * 6;
          const dy = Math.sin(angle) * 3;
          this._entityGfx.star(ex + dx, ey - TS * 0.45 + dy, 4, 2, 1);
          this._entityGfx.fill({ color: 0xffff44, alpha: 0.8 });
        }
      }
    }

    for (const summon of state.level.summons) {
      if (!summon.alive) continue;
      this._drawHpBar(summon.col * TS, summon.row * TS - 5, summon.hp, summon.maxHp);
    }

    // Wizard HP bar
    this._drawHpBar(state.wizard.col * TS, state.wizard.row * TS - 7, state.wizard.hp, state.wizard.maxHp);

    // Shield indicator
    if (state.wizard.shields > 0) {
      const wx = state.wizard.col * TS + TS / 2;
      const wy = state.wizard.row * TS + TS / 2;
      const pulse = 0.6 + 0.4 * Math.sin(this._time * 4);
      this._entityGfx.circle(wx, wy, TS * 0.42);
      this._entityGfx.stroke({ color: 0x44ddff, width: 2, alpha: pulse * 0.7 });
    }
  }

  private _drawHpBar(x: number, y: number, hp: number, maxHp: number): void {
    const barWidth = TS - 4;
    const barHeight = 3;
    const ratio = Math.max(0, hp / maxHp);

    // Background with border
    this._entityGfx.rect(x + 2, y, barWidth, barHeight);
    this._entityGfx.fill(0x1a0000);
    this._entityGfx.rect(x + 2, y, barWidth, barHeight);
    this._entityGfx.stroke({ color: 0x333333, width: 0.5 });
    // Fill with gradient-like effect
    const color = ratio > 0.6 ? 0x00cc00 : ratio > 0.3 ? 0xcccc00 : 0xcc0000;
    this._entityGfx.rect(x + 2, y, barWidth * ratio, barHeight);
    this._entityGfx.fill(color);
    // Bright top edge
    if (ratio > 0) {
      this._entityGfx.rect(x + 2, y, barWidth * ratio, 1);
      this._entityGfx.fill({ color: 0xffffff, alpha: 0.3 });
    }
  }

  // -------------------------------------------------------------------------
  // Animated sprite management
  // -------------------------------------------------------------------------

  private _syncSprites(state: RiftWizardState): void {
    if (!animationManager.isLoaded) return;

    // Sync wizard sprite
    this._syncWizardSprite(state);

    // Sync enemy sprites
    const aliveEnemyIds = new Set<number>();
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      aliveEnemyIds.add(enemy.id);
      this._syncEnemySprite(enemy);
    }
    // Remove sprites for dead enemies
    for (const [id, es] of this._enemySprites) {
      if (!aliveEnemyIds.has(id)) {
        this._spriteLayer.removeChild(es.sprite);
        es.sprite.destroy();
        this._enemySprites.delete(id);
      }
    }

    // Sync summon sprites
    const aliveSummonIds = new Set<number>();
    for (const summon of state.level.summons) {
      if (!summon.alive) continue;
      aliveSummonIds.add(summon.id);
      this._syncSummonSprite(summon);
    }
    for (const [id, es] of this._summonSprites) {
      if (!aliveSummonIds.has(id)) {
        this._spriteLayer.removeChild(es.sprite);
        es.sprite.destroy();
        this._summonSprites.delete(id);
      }
    }
  }

  private _syncWizardSprite(state: RiftWizardState): void {
    // Use storm_mage or archmage for wizard visual
    const wizardUnitType = "storm_mage"; // use storm mage as wizard avatar
    let textures: Texture[];
    try {
      textures = animationManager.getFrames(wizardUnitType as any, UnitState.IDLE);
    } catch {
      return; // No sprite available, fallback graphics handles it
    }
    if (!textures || textures.length === 0 || textures[0] === Texture.WHITE) return;

    if (!this._wizardSprite) {
      this._wizardSprite = new AnimatedSprite(textures);
      this._wizardSprite.anchor.set(0.5, 0.75);
      this._wizardSprite.animationSpeed = 0.1;
      this._wizardSprite.loop = true;
      this._wizardSprite.play();
      this._wizardSprite.scale.set(TS / 48 * 0.9);
      this._spriteLayer.addChild(this._wizardSprite);
    }

    this._wizardSprite.x = state.wizard.col * TS + TS / 2;
    this._wizardSprite.y = state.wizard.row * TS + TS * 0.75;
  }

  private _syncEnemySprite(enemy: RWEnemyInstance): void {
    let textures: Texture[];
    try {
      textures = animationManager.getFrames(enemy.unitType, UnitState.IDLE);
    } catch {
      return;
    }
    if (!textures || textures.length === 0 || textures[0] === Texture.WHITE) return;

    let es = this._enemySprites.get(enemy.id);
    if (!es) {
      const sprite = new AnimatedSprite(textures);
      sprite.anchor.set(0.5, 0.75);
      sprite.animationSpeed = 0.1;
      sprite.loop = true;
      sprite.play();
      const scale = enemy.isBoss ? 1.2 : 0.9;
      sprite.scale.set(TS / 48 * scale);
      this._spriteLayer.addChild(sprite);
      es = { sprite, entityId: enemy.id, lastState: UnitState.IDLE };
      this._enemySprites.set(enemy.id, es);
    }

    es.sprite.x = enemy.col * TS + TS / 2;
    es.sprite.y = enemy.row * TS + TS * 0.75;
  }

  private _syncSummonSprite(summon: RWSummonInstance): void {
    let textures: Texture[];
    try {
      textures = animationManager.getFrames(summon.unitType, UnitState.IDLE);
    } catch {
      return;
    }
    if (!textures || textures.length === 0 || textures[0] === Texture.WHITE) return;

    let es = this._summonSprites.get(summon.id);
    if (!es) {
      const sprite = new AnimatedSprite(textures);
      sprite.anchor.set(0.5, 0.75);
      sprite.animationSpeed = 0.1;
      sprite.loop = true;
      sprite.play();
      sprite.scale.set(TS / 48 * 0.85);
      // Slight green tint for summons
      sprite.tint = 0xaaffcc;
      this._spriteLayer.addChild(sprite);
      es = { sprite, entityId: summon.id, lastState: UnitState.IDLE };
      this._summonSprites.set(summon.id, es);
    }

    es.sprite.x = summon.col * TS + TS / 2;
    es.sprite.y = summon.row * TS + TS * 0.75;
  }

  // -------------------------------------------------------------------------
  // Target cursor with enhanced visuals
  // -------------------------------------------------------------------------

  private _drawTargetCursor(state: RiftWizardState): void {
    this._cursorGfx.clear();

    if (state.selectedSpellIndex < 0 || !state.targetCursor) return;

    const spell = state.spells[state.selectedSpellIndex];
    if (!spell) return;

    const tc = state.targetCursor;
    const spellColor = SCHOOL_COLORS[spell.school] ?? 0xff4444;

    // Draw range indicator (subtle)
    const wizPos = { col: state.wizard.col, row: state.wizard.row };
    for (let row = 0; row < state.level.height; row++) {
      for (let col = 0; col < state.level.width; col++) {
        const dist = Math.abs(col - wizPos.col) + Math.abs(row - wizPos.row);
        if (dist <= spell.range && dist > 0) {
          this._cursorGfx.rect(col * TS, row * TS, TS, TS);
          this._cursorGfx.fill({ color: spellColor, alpha: 0.05 });
        }
      }
    }

    // Highlight AoE area
    if (spell.aoeRadius > 0 && spell.aoeRadius < 50) {
      for (let dr = -spell.aoeRadius; dr <= spell.aoeRadius; dr++) {
        for (let dc = -spell.aoeRadius; dc <= spell.aoeRadius; dc++) {
          if (Math.abs(dr) + Math.abs(dc) > spell.aoeRadius) continue;
          const hx = (tc.col + dc) * TS;
          const hy = (tc.row + dr) * TS;
          this._cursorGfx.rect(hx + 1, hy + 1, TS - 2, TS - 2);
          this._cursorGfx.fill({ color: spellColor, alpha: 0.2 });
          this._cursorGfx.rect(hx + 1, hy + 1, TS - 2, TS - 2);
          this._cursorGfx.stroke({ color: spellColor, width: 1, alpha: 0.3 });
        }
      }
    }

    // Animated cursor outline
    const pulse = 0.6 + 0.4 * Math.sin(this._time * 5);
    this._cursorGfx.rect(tc.col * TS + 1, tc.row * TS + 1, TS - 2, TS - 2);
    this._cursorGfx.stroke({ color: 0xffffff, width: 2, alpha: pulse });

    // Corner brackets
    const cx = tc.col * TS;
    const cy = tc.row * TS;
    const b = 6;
    // Top-left
    this._cursorGfx.moveTo(cx, cy + b); this._cursorGfx.lineTo(cx, cy); this._cursorGfx.lineTo(cx + b, cy);
    this._cursorGfx.stroke({ color: spellColor, width: 2 });
    // Top-right
    this._cursorGfx.moveTo(cx + TS - b, cy); this._cursorGfx.lineTo(cx + TS, cy); this._cursorGfx.lineTo(cx + TS, cy + b);
    this._cursorGfx.stroke({ color: spellColor, width: 2 });
    // Bottom-left
    this._cursorGfx.moveTo(cx, cy + TS - b); this._cursorGfx.lineTo(cx, cy + TS); this._cursorGfx.lineTo(cx + b, cy + TS);
    this._cursorGfx.stroke({ color: spellColor, width: 2 });
    // Bottom-right
    this._cursorGfx.moveTo(cx + TS - b, cy + TS); this._cursorGfx.lineTo(cx + TS, cy + TS); this._cursorGfx.lineTo(cx + TS, cy + TS - b);
    this._cursorGfx.stroke({ color: spellColor, width: 2 });

    // Line from wizard to cursor
    const fromX = state.wizard.col * TS + TS / 2;
    const fromY = state.wizard.row * TS + TS / 2;
    const toX = tc.col * TS + TS / 2;
    const toY = tc.row * TS + TS / 2;
    this._cursorGfx.moveTo(fromX, fromY);
    this._cursorGfx.lineTo(toX, toY);
    this._cursorGfx.stroke({ color: spellColor, width: 1, alpha: 0.3 });
  }

  // -------------------------------------------------------------------------
  // VFX animations (enhanced)
  // -------------------------------------------------------------------------

  consumeAnimationQueue(state: RiftWizardState): void {
    for (const event of state.animationQueue) {
      if (event.type === RWAnimationType.DAMAGE_NUMBER) {
        this._spawnDamageNumber(event);
      } else {
        this._activeAnims.push({ event, elapsed: 0 });
        // Screen shake for big hits
        if (event.type === RWAnimationType.EARTHQUAKE) {
          this._shakeAmount = 8;
          this._shakeDecay = 0.15;
        } else if (event.type === RWAnimationType.FIREBALL || event.type === RWAnimationType.ICE_BALL) {
          this._shakeAmount = Math.max(this._shakeAmount, 3);
          this._shakeDecay = 0.2;
        } else if (event.type === RWAnimationType.DEATH) {
          this._shakeAmount = Math.max(this._shakeAmount, 2);
          this._shakeDecay = 0.25;
        }
      }
    }
    state.animationQueue.length = 0;
  }

  private _spawnDamageNumber(event: AnimationEvent): void {
    const amount = event.amount ?? 0;
    const isHeal = amount < 0;
    const style = new TextStyle({
      fontFamily: "monospace",
      fontSize: isHeal ? 14 : Math.min(20, 14 + Math.abs(amount) / 10),
      fill: isHeal ? 0x44ff44 : 0xff4444,
      fontWeight: "bold",
      stroke: { color: 0x000000, width: 3 },
    });
    const text = new Text({ text: `${Math.abs(amount)}`, style });
    text.anchor.set(0.5, 1);
    text.x = event.fromCol * TS + TS / 2;
    text.y = event.fromRow * TS;
    this.worldLayer.addChild(text);
    this._dmgNumbers.push({ x: text.x, y: text.y, text, lifetime: RWBalance.DAMAGE_NUMBER_DURATION });
  }

  private _updateDamageNumbers(dt: number): void {
    for (let i = this._dmgNumbers.length - 1; i >= 0; i--) {
      const dmg = this._dmgNumbers[i];
      dmg.lifetime -= dt;
      dmg.text.y -= 40 * dt;
      dmg.text.alpha = Math.max(0, dmg.lifetime / RWBalance.DAMAGE_NUMBER_DURATION);
      // Scale pop effect
      const age = 1 - (dmg.lifetime / RWBalance.DAMAGE_NUMBER_DURATION);
      const scale = age < 0.2 ? 0.5 + age * 2.5 : 1.0;
      dmg.text.scale.set(scale);
      if (dmg.lifetime <= 0) {
        this.worldLayer.removeChild(dmg.text);
        dmg.text.destroy();
        this._dmgNumbers.splice(i, 1);
      }
    }
  }

  private _updateParticles(dt: number): void {
    this._fxParticleGfx.clear();
    for (let i = this._particles.length - 1; i >= 0; i--) {
      const p = this._particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      const alpha = Math.max(0, p.life / p.maxLife);
      this._fxParticleGfx.circle(p.x, p.y, p.size * alpha);
      this._fxParticleGfx.fill({ color: p.color, alpha });
      if (p.life <= 0) {
        this._particles.splice(i, 1);
      }
    }
  }

  private _updateAnimations(_state: RiftWizardState, dt: number): void {
    this._fxGfx.clear();

    for (let i = this._activeAnims.length - 1; i >= 0; i--) {
      const anim = this._activeAnims[i];
      anim.elapsed += dt;
      const t = Math.min(1, anim.elapsed / anim.event.duration);

      this._drawAnimation(anim.event, t);

      if (t >= 1) {
        this._activeAnims.splice(i, 1);
      }
    }
  }

  private _drawAnimation(event: AnimationEvent, t: number): void {
    const fromX = event.fromCol * TS + TS / 2;
    const fromY = event.fromRow * TS + TS / 2;
    const toX = event.toCol * TS + TS / 2;
    const toY = event.toRow * TS + TS / 2;
    const alpha = 1 - t;

    switch (event.type) {
      case RWAnimationType.FIREBALL:
      case RWAnimationType.ICE_BALL: {
        const color = event.type === RWAnimationType.FIREBALL ? 0xff6600 : 0x44bbff;
        const trailColor = event.type === RWAnimationType.FIREBALL ? 0xff3300 : 0x2288cc;
        if (t < 0.5) {
          const pt = t * 2;
          const px = fromX + (toX - fromX) * pt;
          const py = fromY + (toY - fromY) * pt;
          // Trail
          for (let j = 0; j < 3; j++) {
            const tt = Math.max(0, pt - j * 0.1);
            const tx = fromX + (toX - fromX) * tt;
            const ty = fromY + (toY - fromY) * tt;
            this._fxGfx.circle(tx, ty, 3 - j);
            this._fxGfx.fill({ color: trailColor, alpha: (1 - j * 0.3) * 0.5 });
          }
          // Projectile with glow
          this._fxGfx.circle(px, py, 6);
          this._fxGfx.fill({ color, alpha: 0.3 });
          this._fxGfx.circle(px, py, 4);
          this._fxGfx.fill(color);
          this._fxGfx.circle(px, py, 2);
          this._fxGfx.fill(0xffffff);
        } else {
          const et = (t - 0.5) * 2;
          const radius = et * TS * 1.5;
          // Expanding ring
          this._fxGfx.circle(toX, toY, radius);
          this._fxGfx.fill({ color, alpha: alpha * 0.3 });
          this._fxGfx.circle(toX, toY, radius * 0.7);
          this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.15 });
          // Outer ring
          this._fxGfx.circle(toX, toY, radius);
          this._fxGfx.stroke({ color, width: 2, alpha: alpha * 0.6 });
          // Spawn explosion particles
          if (et < 0.3) {
            for (let j = 0; j < 2; j++) {
              const angle = Math.random() * Math.PI * 2;
              const speed = 30 + Math.random() * 40;
              this._particles.push({
                x: toX, y: toY,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 0.3 + Math.random() * 0.3,
                maxLife: 0.6,
                color: Math.random() > 0.5 ? color : 0xffffff,
                size: 2 + Math.random() * 2,
              });
            }
          }
        }
        break;
      }

      case RWAnimationType.CHAIN_LIGHTNING: {
        if (event.chain && event.chain.length >= 2) {
          for (let j = 0; j < event.chain.length - 1; j++) {
            const a = event.chain[j];
            const b = event.chain[j + 1];
            const ax = a.col * TS + TS / 2;
            const ay = a.row * TS + TS / 2;
            const bx = b.col * TS + TS / 2;
            const by = b.row * TS + TS / 2;
            // Main bolt with multiple segments
            const segments = 4;
            let lastX = ax, lastY = ay;
            for (let s = 1; s <= segments; s++) {
              const frac = s / segments;
              let nx = ax + (bx - ax) * frac;
              let ny = ay + (by - ay) * frac;
              if (s < segments) {
                nx += (Math.random() - 0.5) * 12;
                ny += (Math.random() - 0.5) * 12;
              }
              // Glow line
              this._fxGfx.moveTo(lastX, lastY);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xffff88, width: 4, alpha: alpha * 0.3 });
              // Core line
              this._fxGfx.moveTo(lastX, lastY);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xffff44, width: 2, alpha });
              lastX = nx;
              lastY = ny;
            }
            // Impact flash at each target
            this._fxGfx.circle(bx, by, 5 * alpha);
            this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.5 });
          }
        }
        break;
      }

      case RWAnimationType.MAGIC_MISSILE: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Spiral trail
        const wave = Math.sin(t * 20) * 4;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = -dy / len;
        const ny = dx / len;
        // Glow
        this._fxGfx.circle(px + nx * wave, py + ny * wave, 6);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.3 });
        // Core
        this._fxGfx.circle(px + nx * wave, py + ny * wave, 3);
        this._fxGfx.fill({ color: 0xcc66ff, alpha });
        this._fxGfx.circle(px + nx * wave, py + ny * wave, 1.5);
        this._fxGfx.fill({ color: 0xffffff, alpha });
        break;
      }

      case RWAnimationType.DEATH_BOLT: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Dark bolt with skull-like shape
        this._fxGfx.circle(px, py, 7);
        this._fxGfx.fill({ color: 0x222222, alpha: alpha * 0.5 });
        this._fxGfx.circle(px, py, 4);
        this._fxGfx.fill({ color: 0x444444, alpha });
        this._fxGfx.circle(px, py, 2);
        this._fxGfx.fill({ color: 0x888888, alpha });
        // Dark trail particles
        if (Math.random() < 0.5) {
          this._particles.push({
            x: px, y: py,
            vx: (Math.random() - 0.5) * 15,
            vy: (Math.random() - 0.5) * 15,
            life: 0.2 + Math.random() * 0.2,
            maxLife: 0.4,
            color: 0x333333,
            size: 2,
          });
        }
        break;
      }

      case RWAnimationType.HOLY_LIGHT: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Golden beam
        this._fxGfx.circle(px, py, 8);
        this._fxGfx.fill({ color: 0xffffaa, alpha: alpha * 0.3 });
        this._fxGfx.circle(px, py, 4);
        this._fxGfx.fill({ color: 0xffff88, alpha });
        this._fxGfx.star(px, py, 4, 6, 2);
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.6 });
        break;
      }

      case RWAnimationType.ENEMY_SPELL: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Orange-red enemy projectile
        this._fxGfx.circle(px, py, 5);
        this._fxGfx.fill({ color: 0xff4400, alpha: alpha * 0.4 });
        this._fxGfx.circle(px, py, 3);
        this._fxGfx.fill({ color: 0xff8844, alpha });
        break;
      }

      case RWAnimationType.WARP: {
        // Origin dissolve
        this._fxGfx.circle(fromX, fromY, TS * 0.5 * alpha);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.4 });
        this._fxGfx.circle(fromX, fromY, TS * 0.3 * alpha);
        this._fxGfx.stroke({ color: 0xcc66ff, width: 2, alpha: alpha * 0.6 });
        // Destination materialize
        this._fxGfx.circle(toX, toY, TS * 0.5 * t);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: t * 0.4 });
        this._fxGfx.circle(toX, toY, TS * 0.3 * t);
        this._fxGfx.stroke({ color: 0xcc66ff, width: 2, alpha: t * 0.6 });
        // Sparkles
        for (let i = 0; i < 4; i++) {
          const angle = this._time * 5 + i * Math.PI / 2;
          const r = TS * 0.4 * (t < 0.5 ? alpha : t);
          const cx = (t < 0.5 ? fromX : toX) + Math.cos(angle) * r;
          const cy = (t < 0.5 ? fromY : toY) + Math.sin(angle) * r;
          this._fxGfx.circle(cx, cy, 2);
          this._fxGfx.fill({ color: 0xffffff, alpha: 0.7 });
        }
        break;
      }

      case RWAnimationType.HEAL: {
        // Rising green cross
        this._fxGfx.circle(toX, toY, TS * 0.6 * t);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.2 });
        // Cross shape
        const cs = TS * 0.25 * Math.min(1, t * 3);
        this._fxGfx.rect(toX - cs / 4, toY - cs, cs / 2, cs * 2);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.6 });
        this._fxGfx.rect(toX - cs, toY - cs / 4, cs * 2, cs / 2);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.6 });
        // Sparkles rising
        for (let i = 0; i < 3; i++) {
          const px = toX + (Math.sin(this._time * 4 + i * 2) * 8);
          const py = toY - t * 20 - i * 5;
          this._fxGfx.circle(px, py, 1.5);
          this._fxGfx.fill({ color: 0x88ff88, alpha: alpha * 0.8 });
        }
        break;
      }

      case RWAnimationType.SUMMON: {
        // Magical circle appearing
        this._fxGfx.circle(toX, toY, TS * 0.5 * Math.min(1, t * 2));
        this._fxGfx.stroke({ color: 0x44cc88, width: 2, alpha: alpha * 0.6 });
        this._fxGfx.circle(toX, toY, TS * 0.3 * t);
        this._fxGfx.fill({ color: 0x44cc88, alpha: alpha * 0.3 });
        // Rising column
        this._fxGfx.rect(toX - 3, toY - TS * t, 6, TS * t);
        this._fxGfx.fill({ color: 0x66ffaa, alpha: alpha * 0.2 });
        break;
      }

      case RWAnimationType.FIRE_BREATH:
      case RWAnimationType.FROST_BREATH: {
        const color = event.type === RWAnimationType.FIRE_BREATH ? 0xff6600 : 0x44bbff;
        const innerColor = event.type === RWAnimationType.FIRE_BREATH ? 0xffaa22 : 0xaaddff;
        const dx = toX - fromX;
        const dy = toY - fromY;
        const spread = t * TS * 2;
        // Outer cone
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + dx * t + spread * 0.5, fromY + dy * t - spread * 0.3);
        this._fxGfx.lineTo(fromX + dx * t - spread * 0.5, fromY + dy * t + spread * 0.3);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color, alpha: alpha * 0.4 });
        // Inner cone
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + dx * t * 0.7 + spread * 0.25, fromY + dy * t * 0.7 - spread * 0.15);
        this._fxGfx.lineTo(fromX + dx * t * 0.7 - spread * 0.25, fromY + dy * t * 0.7 + spread * 0.15);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color: innerColor, alpha: alpha * 0.3 });
        // Particles
        if (t < 0.7 && Math.random() < 0.4) {
          this._particles.push({
            x: fromX + dx * t * Math.random(),
            y: fromY + dy * t * Math.random(),
            vx: (Math.random() - 0.5) * 20,
            vy: -10 - Math.random() * 15,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.6,
            color,
            size: 1 + Math.random() * 2,
          });
        }
        break;
      }

      case RWAnimationType.WEB: {
        const r = TS * t * 1.2;
        // Expanding web circle
        this._fxGfx.circle(toX, toY, r);
        this._fxGfx.fill({ color: 0xcccccc, alpha: alpha * 0.2 });
        // Web lines
        for (let i = 0; i < 6; i++) {
          const angle = i * Math.PI / 3;
          this._fxGfx.moveTo(toX, toY);
          this._fxGfx.lineTo(toX + Math.cos(angle) * r, toY + Math.sin(angle) * r);
          this._fxGfx.stroke({ color: 0xdddddd, width: 1, alpha: alpha * 0.5 });
        }
        // Connecting arcs
        this._fxGfx.circle(toX, toY, r * 0.5);
        this._fxGfx.stroke({ color: 0xdddddd, width: 1, alpha: alpha * 0.3 });
        break;
      }

      case RWAnimationType.DISTORTION: {
        // Warping space effect
        this._fxGfx.circle(toX, toY, TS * t * 1.5);
        this._fxGfx.stroke({ color: 0xaa44ff, width: 3, alpha: alpha * 0.6 });
        this._fxGfx.circle(toX, toY, TS * t * 1.0);
        this._fxGfx.stroke({ color: 0xcc66ff, width: 2, alpha: alpha * 0.4 });
        this._fxGfx.circle(toX, toY, TS * t * 0.5);
        this._fxGfx.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.3 });
        break;
      }

      case RWAnimationType.EARTHQUAKE: {
        // Ground cracks radiating outward
        const shakeAlpha = alpha * 0.15;
        this._fxGfx.rect(0, 0, 1000, 800);
        this._fxGfx.fill({ color: 0x886633, alpha: shakeAlpha });
        // Radial cracks
        for (let i = 0; i < 8; i++) {
          const angle = i * Math.PI / 4 + Math.random() * 0.3;
          const len = t * 200;
          this._fxGfx.moveTo(fromX, fromY);
          this._fxGfx.lineTo(
            fromX + Math.cos(angle) * len,
            fromY + Math.sin(angle) * len,
          );
          this._fxGfx.stroke({ color: 0x664422, width: 2, alpha: alpha * 0.5 });
        }
        // Rock particles
        if (t < 0.5 && Math.random() < 0.3) {
          for (let j = 0; j < 3; j++) {
            this._particles.push({
              x: fromX + (Math.random() - 0.5) * 100,
              y: fromY + (Math.random() - 0.5) * 100,
              vx: (Math.random() - 0.5) * 30,
              vy: -20 - Math.random() * 30,
              life: 0.4 + Math.random() * 0.3,
              maxLife: 0.7,
              color: 0x886644,
              size: 2 + Math.random() * 2,
            });
          }
        }
        break;
      }

      case RWAnimationType.FIRE_AURA: {
        const r = TS * 2 * t;
        // Expanding fire ring
        this._fxGfx.circle(fromX, fromY, r);
        this._fxGfx.stroke({ color: 0xff6600, width: 4, alpha: alpha * 0.6 });
        this._fxGfx.circle(fromX, fromY, r * 0.8);
        this._fxGfx.stroke({ color: 0xffaa22, width: 2, alpha: alpha * 0.4 });
        // Fire particles
        if (Math.random() < 0.3) {
          const angle = Math.random() * Math.PI * 2;
          this._particles.push({
            x: fromX + Math.cos(angle) * r,
            y: fromY + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 10,
            life: 0.3,
            maxLife: 0.3,
            color: 0xff6600,
            size: 2,
          });
        }
        break;
      }

      case RWAnimationType.MELEE_HIT: {
        // Quick slash effect
        const slashT = Math.min(1, t * 3);
        // Impact flash
        this._fxGfx.circle(toX, toY, TS * 0.4 * (1 - t));
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.4 });
        // Slash line
        const slashAngle = Math.PI * 0.25;
        const slashLen = TS * 0.5 * slashT;
        this._fxGfx.moveTo(
          toX - Math.cos(slashAngle) * slashLen,
          toY - Math.sin(slashAngle) * slashLen,
        );
        this._fxGfx.lineTo(
          toX + Math.cos(slashAngle) * slashLen,
          toY + Math.sin(slashAngle) * slashLen,
        );
        this._fxGfx.stroke({ color: 0xffffff, width: 3, alpha: alpha * 0.8 });
        // Impact sparks
        if (t < 0.3) {
          for (let j = 0; j < 2; j++) {
            this._particles.push({
              x: toX, y: toY,
              vx: (Math.random() - 0.5) * 40,
              vy: (Math.random() - 0.5) * 40,
              life: 0.15,
              maxLife: 0.15,
              color: 0xffffaa,
              size: 1.5,
            });
          }
        }
        break;
      }

      case RWAnimationType.DEATH: {
        // Entity dissolving
        this._fxGfx.circle(fromX, fromY, TS * 0.35 * alpha);
        this._fxGfx.fill({ color: 0xff0000, alpha: alpha * 0.4 });
        // Death particles dispersing
        if (t < 0.5) {
          for (let j = 0; j < 2; j++) {
            const angle = Math.random() * Math.PI * 2;
            this._particles.push({
              x: fromX, y: fromY,
              vx: Math.cos(angle) * 25,
              vy: Math.sin(angle) * 25 - 10,
              life: 0.3 + Math.random() * 0.3,
              maxLife: 0.6,
              color: Math.random() > 0.5 ? 0xff2222 : 0x882222,
              size: 1.5 + Math.random(),
            });
          }
        }
        break;
      }
    }
  }

  destroy(): void {
    for (const dmg of this._dmgNumbers) {
      this.worldLayer.removeChild(dmg.text);
      dmg.text.destroy();
    }
    this._dmgNumbers = [];
    this._activeAnims = [];
    this._particles = [];

    // Clean up sprites
    if (this._wizardSprite) {
      this._spriteLayer.removeChild(this._wizardSprite);
      this._wizardSprite.destroy();
      this._wizardSprite = null;
    }
    for (const [, es] of this._enemySprites) {
      this._spriteLayer.removeChild(es.sprite);
      es.sprite.destroy();
    }
    this._enemySprites.clear();
    for (const [, es] of this._summonSprites) {
      this._spriteLayer.removeChild(es.sprite);
      es.sprite.destroy();
    }
    this._summonSprites.clear();

    this.worldLayer.removeChildren();
    this._tileGfx.destroy();
    this._ambientGfx.destroy();
    this._entityGfx.destroy();
    this._spriteLayer.destroy();
    this._fxGfx.destroy();
    this._fxParticleGfx.destroy();
    this._cursorGfx.destroy();
  }
}
