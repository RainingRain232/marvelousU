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
  RWPhase,
  type AnimationEvent,
} from "../state/RiftWizardState";
import { RWBalance } from "../config/RiftWizardConfig";
import { SCHOOL_COLORS } from "../config/RiftWizardShrineDefs";
import { SPELL_DEFS } from "../config/RiftWizardSpellDefs";
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
  private _statusOverlayGfx = new Graphics();
  private _telegraphGfx = new Graphics();
  private _cursorGfx = new Graphics();
  private _dmgNumbers: { x: number; y: number; text: Text; lifetime: number }[] = [];
  private _activeAnims: ActiveAnim[] = [];
  private _particles: Particle[] = [];
  private _time = 0;

  // Sprite caching
  private _enemySprites = new Map<number, EntitySprite>();
  private _summonSprites = new Map<number, EntitySprite>();
  private _wizardSprite: AnimatedSprite | null = null;

  // Tile caching
  private _staticTileGfx = new Graphics();
  private _tileCacheDirty = true;
  private _cachedLevelId = -1;

  // Persistent ground decals
  private _groundDecals: { col: number; row: number; type: string; color: number; age: number; maxAge: number }[] = [];

  // Screen shake
  private _shakeAmount = 0;
  private _shakeDecay = 0;

  // Level transition overlay
  private _transitionAlpha = 0;
  private _transitionDir: "in" | "out" | "none" = "none";

  init(): void {
    this.worldLayer.removeChildren();

    this._staticTileGfx = new Graphics();
    this._tileGfx = new Graphics();
    this._ambientGfx = new Graphics();
    this._entityGfx = new Graphics();
    this._spriteLayer = new Container();
    this._fxGfx = new Graphics();
    this._fxParticleGfx = new Graphics();
    this._statusOverlayGfx = new Graphics();
    this._telegraphGfx = new Graphics();
    this._cursorGfx = new Graphics();

    this.worldLayer.addChild(this._staticTileGfx);
    this.worldLayer.addChild(this._tileGfx);
    this.worldLayer.addChild(this._ambientGfx);
    this.worldLayer.addChild(this._telegraphGfx);
    this.worldLayer.addChild(this._entityGfx);
    this.worldLayer.addChild(this._spriteLayer);
    this.worldLayer.addChild(this._statusOverlayGfx);
    this.worldLayer.addChild(this._fxGfx);
    this.worldLayer.addChild(this._fxParticleGfx);
    this.worldLayer.addChild(this._cursorGfx);

    this._dmgNumbers = [];
    this._activeAnims = [];
    this._particles = [];
    this._groundDecals = [];
    this._time = 0;
    this._tileCacheDirty = true;
    this._cachedLevelId = -1;
    this._wizardSprite = null;
    this._enemySprites.clear();
    this._summonSprites.clear();
  }

  addGroundDecal(col: number, row: number, type: string, color: number, duration: number = 5): void {
    this._groundDecals.push({ col, row, type, color, age: 0, maxAge: duration });
  }

  /** Returns true if animations are still playing. */
  get isAnimating(): boolean {
    return this._activeAnims.length > 0;
  }

  /** Start a level transition fade effect. */
  startTransition(dir: "in" | "out"): void {
    this._transitionDir = dir;
    this._transitionAlpha = dir === "out" ? 0 : 1;
  }

  /** Returns true if a level transition is in progress. */
  get isTransitioning(): boolean {
    return this._transitionDir !== "none";
  }

  /** Mark the static tile cache as needing a redraw. */
  invalidateTileCache(): void {
    this._tileCacheDirty = true;
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
    this._drawTelegraphedTiles(state);
    this._drawEntities(state);
    this._syncSprites(state);
    this._drawStatusOverlays(state);
    this._drawTargetCursor(state);
    this._drawSpellPreview(state);
    this._updateAnimations(state, dt);
    this._updateParticles(dt);
    this._updateDamageNumbers(dt);

    // Level transition overlay
    if (this._transitionDir !== "none") {
      if (this._transitionDir === "out") {
        this._transitionAlpha = Math.min(1, this._transitionAlpha + dt * 2);
        if (this._transitionAlpha >= 1) this._transitionDir = "none";
      } else {
        this._transitionAlpha = Math.max(0, this._transitionAlpha - dt * 2);
        if (this._transitionAlpha <= 0) this._transitionDir = "none";
      }
      // Draw full-screen black overlay with current alpha
      this._fxGfx.rect(-this.worldLayer.x, -this.worldLayer.y, screenWidth, screenHeight);
      this._fxGfx.fill({ color: 0x000000, alpha: this._transitionAlpha });
      // Optional: draw a portal swirl effect in the center during transition
      if (this._transitionAlpha > 0.2) {
        const cx = (screenWidth / 2) - this.worldLayer.x;
        const cy = (screenHeight / 2) - this.worldLayer.y;
        const r = (1 - this._transitionAlpha) * 200 + 20;
        for (let i = 0; i < 6; i++) {
          const angle = this._time * 3 + (i * Math.PI / 3);
          const dx = Math.cos(angle) * r;
          const dy = Math.sin(angle) * r;
          this._fxGfx.circle(cx + dx, cy + dy, 4 * this._transitionAlpha);
          this._fxGfx.fill({ color: 0x9933ff, alpha: this._transitionAlpha * 0.5 });
        }
        // Central portal ring
        this._fxGfx.circle(cx, cy, r * 0.5);
        this._fxGfx.stroke({ color: 0xaa44ff, width: 2, alpha: this._transitionAlpha * 0.6 });
      }
    }

    // Boss level atmospheric effect
    if (state.currentLevel !== undefined) {
      const bossLevels = [4, 9, 14, 19, 24];
      if (bossLevels.includes(state.currentLevel)) {
        // Subtle red/purple vignette on boss levels
        const vignetteAlpha = 0.03 + 0.01 * Math.sin(this._time * 2);
        // Top vignette
        this._fxGfx.rect(-this.worldLayer.x, -this.worldLayer.y, screenWidth, 40);
        this._fxGfx.fill({ color: 0x440000, alpha: vignetteAlpha });
        // Bottom vignette
        this._fxGfx.rect(-this.worldLayer.x, -this.worldLayer.y + screenHeight - 40, screenWidth, 40);
        this._fxGfx.fill({ color: 0x440000, alpha: vignetteAlpha });
        // Side vignettes
        this._fxGfx.rect(-this.worldLayer.x, -this.worldLayer.y, 30, screenHeight);
        this._fxGfx.fill({ color: 0x440000, alpha: vignetteAlpha * 0.7 });
        this._fxGfx.rect(-this.worldLayer.x + screenWidth - 30, -this.worldLayer.y, 30, screenHeight);
        this._fxGfx.fill({ color: 0x440000, alpha: vignetteAlpha * 0.7 });
      }
    }
  }

  // -------------------------------------------------------------------------
  // Tiles - enhanced with wall outlines, ambient glow, texture variation
  // -------------------------------------------------------------------------

  private _drawTiles(state: RiftWizardState): void {
    // Determine if the static tile cache needs a redraw
    const levelChanged = state.currentLevel !== this._cachedLevelId;
    const needStaticRedraw = this._tileCacheDirty || levelChanged;

    // Always clear and redraw dynamic/animated tiles
    this._tileGfx.clear();

    // Simple position-based hash for deterministic variation
    const tileHash = (c: number, r: number, seed: number) =>
      ((c * 7 + r * 13 + seed * 31) & 0xffff) / 0xffff;

    // Check if a neighbour is a specific type
    const tileAt = (c: number, r: number): RWTileType | null => {
      if (c < 0 || r < 0 || c >= state.level.width || r >= state.level.height) return null;
      return state.level.tiles[r][c];
    };

    if (needStaticRedraw) {
      this._staticTileGfx.clear();
    }

    for (let row = 0; row < state.level.height; row++) {
      for (let col = 0; col < state.level.width; col++) {
        const tile = state.level.tiles[row][col];
        const x = col * TS;
        const y = row * TS;

        if (tile === RWTileType.WALL) {
          if (!needStaticRedraw) continue;
          // --- WALL: base fill --- (static)
          this._staticTileGfx.rect(x, y, TS, TS);
          this._staticTileGfx.fill(TILE_COLORS[RWTileType.WALL]);

          // Brick texture: horizontal mortar lines every 8px
          const brickH = 8;
          for (let br = 0; br < TS; br += brickH) {
            // Horizontal mortar line
            this._staticTileGfx.moveTo(x, y + br);
            this._staticTileGfx.lineTo(x + TS, y + br);
            this._staticTileGfx.stroke({ color: 0x12122a, width: 1, alpha: 0.6 });

            // Vertical mortar lines offset by row parity
            const brickRow = Math.floor(br / brickH);
            const offset = (brickRow % 2 === 0) ? 0 : TS / 2;
            for (let bx = offset; bx < TS; bx += TS / 2) {
              if (bx > 0 && bx < TS) {
                this._staticTileGfx.moveTo(x + bx, y + br);
                this._staticTileGfx.lineTo(x + bx, y + br + brickH);
                this._staticTileGfx.stroke({ color: 0x12122a, width: 1, alpha: 0.5 });
              }
            }
          }

          // Inner shadow gradient: darker rects inset
          this._staticTileGfx.rect(x + 2, y + 2, TS - 4, TS - 4);
          this._staticTileGfx.fill({ color: 0x0a0a18, alpha: 0.15 });
          this._staticTileGfx.rect(x + 4, y + 4, TS - 8, TS - 8);
          this._staticTileGfx.fill({ color: 0x0a0a18, alpha: 0.1 });

          // Irregular stone outlines: on some bricks, draw slightly irregular polygon outlines
          const wallHash = tileHash(col, row, 100);
          if (wallHash > 0.55) {
            // Pick a brick position based on hash
            const ibRow = Math.floor(tileHash(col, row, 101) * 3);
            const ibOff = (ibRow % 2 === 0) ? 0 : TS / 4;
            const ibx = x + ibOff + Math.floor(tileHash(col, row, 102) * 2) * (TS / 2);
            const iby = y + ibRow * 8;
            const ibw = TS / 2 - 1;
            const ibh = 7;
            // Irregular polygon (6 vertices instead of 4 for a non-rectangular stone)
            const jt1 = (tileHash(col, row, 103) - 0.5) * 3;
            const jt2 = (tileHash(col, row, 104) - 0.5) * 2;
            this._staticTileGfx.moveTo(ibx + 1 + jt1, iby + 1);
            this._staticTileGfx.lineTo(ibx + ibw * 0.5, iby + jt2);
            this._staticTileGfx.lineTo(ibx + ibw - 1, iby + 1 - jt1);
            this._staticTileGfx.lineTo(ibx + ibw - 1 + jt2, iby + ibh - 1);
            this._staticTileGfx.lineTo(ibx + ibw * 0.5, iby + ibh - jt2);
            this._staticTileGfx.lineTo(ibx + 1, iby + ibh - 1 + jt1);
            this._staticTileGfx.closePath();
            this._staticTileGfx.stroke({ color: 0x222244, width: 0.7, alpha: 0.5 });
          }

          // Cracks: on occasional bricks, draw a branching crack (zigzag line that splits)
          if (wallHash > 0.78) {
            const crackStartX = x + 4 + tileHash(col, row, 110) * (TS - 8);
            const crackStartY = y + 4 + tileHash(col, row, 111) * (TS - 8);
            const crackAngle = tileHash(col, row, 112) * Math.PI;
            const crackLen = 4 + tileHash(col, row, 113) * 5;
            const crMidX = crackStartX + Math.cos(crackAngle) * crackLen * 0.5 + (tileHash(col, row, 114) - 0.5) * 3;
            const crMidY = crackStartY + Math.sin(crackAngle) * crackLen * 0.5;
            const crEndX = crackStartX + Math.cos(crackAngle) * crackLen;
            const crEndY = crackStartY + Math.sin(crackAngle) * crackLen;
            // Main crack
            this._staticTileGfx.moveTo(crackStartX, crackStartY);
            this._staticTileGfx.lineTo(crMidX, crMidY);
            this._staticTileGfx.lineTo(crEndX, crEndY);
            this._staticTileGfx.stroke({ color: 0x080810, width: 0.8, alpha: 0.6 });
            // Branch split
            const brAngle = crackAngle + (tileHash(col, row, 115) > 0.5 ? 0.7 : -0.7);
            const brLen = crackLen * 0.4;
            this._staticTileGfx.moveTo(crMidX, crMidY);
            this._staticTileGfx.lineTo(crMidX + Math.cos(brAngle) * brLen, crMidY + Math.sin(brAngle) * brLen);
            this._staticTileGfx.stroke({ color: 0x080810, width: 0.5, alpha: 0.4 });
          }

          // Moss patches: on walls adjacent to floor, draw small green cluster polygons near bottom
          {
            let hasFloorBelow = false;
            if (row + 1 < state.level.height) {
              const belowTile = state.level.tiles[row + 1][col];
              if (belowTile === RWTileType.FLOOR || belowTile === RWTileType.CORRIDOR) {
                hasFloorBelow = true;
              }
            }
            if (hasFloorBelow && tileHash(col, row, 120) > 0.4) {
              const mossCount = 2 + Math.floor(tileHash(col, row, 121) * 3);
              for (let mi = 0; mi < mossCount; mi++) {
                const mx = x + 3 + tileHash(col, row, 122 + mi) * (TS - 6);
                const my = y + TS - 3 - tileHash(col, row, 130 + mi) * 4;
                const mr = 1.5 + tileHash(col, row, 140 + mi) * 1.5;
                // Irregular oval/circle cluster
                this._staticTileGfx.circle(mx, my, mr);
                this._staticTileGfx.fill({ color: 0x2a5522, alpha: 0.4 });
                this._staticTileGfx.circle(mx + 1.2, my - 0.8, mr * 0.7);
                this._staticTileGfx.fill({ color: 0x336622, alpha: 0.3 });
              }
            }
          }

          this._drawWallEdges(state, col, row, x, y);

        } else if (tile === RWTileType.CHASM) {
          if (!needStaticRedraw) continue;
          // --- CHASM: base fill --- (static)
          this._staticTileGfx.rect(x, y, TS, TS);
          this._staticTileGfx.fill(TILE_COLORS[RWTileType.CHASM]);

          // Depth lines: concentric rects getting darker toward center
          for (let d = 0; d < 5; d++) {
            const inset = 2 + d * 2;
            const darkAlpha = 0.15 + d * 0.08;
            this._staticTileGfx.rect(x + inset, y + inset, TS - inset * 2, TS - inset * 2);
            this._staticTileGfx.fill({ color: 0x020204, alpha: darkAlpha });
          }

          // Subtle inner border for depth (original)
          this._staticTileGfx.rect(x + 1, y + 1, TS - 2, TS - 2);
          this._staticTileGfx.stroke({ color: 0x0c0c18, width: 1 });

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
                this._staticTileGfx.moveTo(x, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + (s / jagSegments) * TS;
                  const sy2 = y + ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s));
                  this._staticTileGfx.lineTo(sx2, sy2);
                }
                this._staticTileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else if (dir.side === "bottom") {
                this._staticTileGfx.moveTo(x, y + TS);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + (s / jagSegments) * TS;
                  const sy2 = y + TS - ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 10));
                  this._staticTileGfx.lineTo(sx2, sy2);
                }
                this._staticTileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else if (dir.side === "left") {
                this._staticTileGfx.moveTo(x, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 20));
                  const sy2 = y + (s / jagSegments) * TS;
                  this._staticTileGfx.lineTo(sx2, sy2);
                }
                this._staticTileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
              } else {
                this._staticTileGfx.moveTo(x + TS, y);
                for (let s = 1; s <= jagSegments; s++) {
                  const sx2 = x + TS - ((s % 2 === 0) ? 0 : jagAmp * tileHash(col, row, s + 30));
                  const sy2 = y + (s / jagSegments) * TS;
                  this._staticTileGfx.lineTo(sx2, sy2);
                }
                this._staticTileGfx.stroke({ color: 0x1a1a30, width: 1, alpha: 0.8 });
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
          if (!needStaticRedraw) continue;
          // --- FLOOR / CORRIDOR: base fill --- (static)
          const color = TILE_COLORS[tile] ?? 0x2a2a3a;
          this._staticTileGfx.rect(x, y, TS, TS);
          this._staticTileGfx.fill(color);

          // Subtle noise pattern using position-based hash (original)
          const hash = ((col * 7 + row * 13) % 5);
          if (hash < 2) {
            this._staticTileGfx.rect(x + 1, y + 1, TS - 2, TS - 2);
            this._staticTileGfx.fill({ color: TILE_ACCENT[tile] ?? 0x222230, alpha: 0.3 });
          }

          // Grid lines (original)
          this._staticTileGfx.rect(x, y, TS, TS);
          this._staticTileGfx.stroke({ color: 0x16162a, width: 1 });

          // Stone flagstone pattern: cross-hatch lines based on position hash
          // Determine stone block layout using hash for variation
          const blockSeed = Math.floor(tileHash(col, row, 0) * 4);
          if (blockSeed === 0) {
            // Horizontal split
            const splitY = y + 10 + Math.floor(tileHash(col, row, 1) * 12);
            this._staticTileGfx.moveTo(x + 2, splitY);
            this._staticTileGfx.lineTo(x + TS - 2, splitY);
            this._staticTileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.5 });
          } else if (blockSeed === 1) {
            // Vertical split
            const splitX = x + 10 + Math.floor(tileHash(col, row, 2) * 12);
            this._staticTileGfx.moveTo(splitX, y + 2);
            this._staticTileGfx.lineTo(splitX, y + TS - 2);
            this._staticTileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.5 });
          } else if (blockSeed === 2) {
            // Cross pattern: both splits
            const splitY = y + 12 + Math.floor(tileHash(col, row, 3) * 8);
            const splitX = x + 12 + Math.floor(tileHash(col, row, 4) * 8);
            this._staticTileGfx.moveTo(x + 2, splitY);
            this._staticTileGfx.lineTo(x + TS - 2, splitY);
            this._staticTileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.4 });
            this._staticTileGfx.moveTo(splitX, y + 2);
            this._staticTileGfx.lineTo(splitX, y + TS - 2);
            this._staticTileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.4 });
          } else {
            // L-shaped crack
            const midX = x + TS / 2 + (tileHash(col, row, 5) - 0.5) * 8;
            const midY = y + TS / 2 + (tileHash(col, row, 6) - 0.5) * 8;
            this._staticTileGfx.moveTo(x + 3, midY);
            this._staticTileGfx.lineTo(midX, midY);
            this._staticTileGfx.lineTo(midX, y + TS - 3);
            this._staticTileGfx.stroke({ color: 0x1a1a2e, width: 1, alpha: 0.45 });
          }

          // Occasional chip/nick marks on some tiles
          if (tileHash(col, row, 7) > 0.65) {
            const chipX = x + 4 + tileHash(col, row, 8) * (TS - 8);
            const chipY = y + 4 + tileHash(col, row, 9) * (TS - 8);
            this._staticTileGfx.circle(chipX, chipY, 1.5);
            this._staticTileGfx.fill({ color: 0x16162a, alpha: 0.4 });
          }
        }
      }
    }

    // Mark static tile cache as clean after redraw
    if (needStaticRedraw) {
      this._tileCacheDirty = false;
      this._cachedLevelId = state.currentLevel;
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

      const ig = this._tileGfx;
      const iby = iy + bounce;

      if (item.type === "health_potion") {
        // Flask/bottle shape: cork, narrow neck, rounded top, wider body
        const bw = TS * 0.16; // body half-width
        const bh = TS * 0.22; // body height
        const nw = TS * 0.06; // neck half-width
        const nh = TS * 0.08; // neck height
        const bodyTop = iby - bh * 0.2;
        const bodyBot = iby + bh;
        const neckTop = bodyTop - nh;
        // Cork (small rect at top)
        ig.rect(ix - nw * 1.2, neckTop - 3, nw * 2.4, 3);
        ig.fill(0x997744);
        ig.rect(ix - nw * 1.2, neckTop - 3, nw * 2.4, 3);
        ig.stroke({ color: 0x664422, width: 0.5 });
        // Neck
        ig.rect(ix - nw, neckTop, nw * 2, nh);
        ig.fill(0xddddcc);
        ig.rect(ix - nw, neckTop, nw * 2, nh);
        ig.stroke({ color: 0xaaaaaa, width: 0.5 });
        // Bottle body (pentagon-ish with rounded top via segments)
        ig.moveTo(ix - nw, bodyTop);
        ig.lineTo(ix - bw, bodyTop + bh * 0.2);
        ig.lineTo(ix - bw, bodyBot);
        ig.lineTo(ix + bw, bodyBot);
        ig.lineTo(ix + bw, bodyTop + bh * 0.2);
        ig.lineTo(ix + nw, bodyTop);
        ig.closePath();
        ig.fill(0xddddcc);
        ig.moveTo(ix - nw, bodyTop);
        ig.lineTo(ix - bw, bodyTop + bh * 0.2);
        ig.lineTo(ix - bw, bodyBot);
        ig.lineTo(ix + bw, bodyBot);
        ig.lineTo(ix + bw, bodyTop + bh * 0.2);
        ig.lineTo(ix + nw, bodyTop);
        ig.closePath();
        ig.stroke({ color: 0x999999, width: 0.7 });
        // Red liquid fill inside (smaller polygon)
        const liqTop = bodyTop + bh * 0.45;
        ig.moveTo(ix - bw + 1, liqTop);
        ig.lineTo(ix - bw + 1, bodyBot - 1);
        ig.lineTo(ix + bw - 1, bodyBot - 1);
        ig.lineTo(ix + bw - 1, liqTop);
        // Wavy liquid surface
        ig.lineTo(ix + bw * 0.3, liqTop - 1);
        ig.lineTo(ix - bw * 0.3, liqTop + 1);
        ig.closePath();
        ig.fill({ color: 0xcc2222, alpha: 0.85 });
        // Glass highlight
        ig.moveTo(ix - bw + 2, bodyTop + bh * 0.3);
        ig.lineTo(ix - bw + 2, bodyBot - 2);
        ig.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });
      } else if (item.type === "charge_scroll") {
        // Scroll shape: rolled cylinders at top/bottom, parchment body
        const sw = TS * 0.14; // scroll half-width
        const sh = TS * 0.22; // scroll height
        const rollR = 2.5;
        // Parchment body (rectangle with slightly curved short edges)
        ig.rect(ix - sw, iby - sh + rollR, sw * 2, sh * 2 - rollR * 2);
        ig.fill(0xeeddaa);
        ig.rect(ix - sw, iby - sh + rollR, sw * 2, sh * 2 - rollR * 2);
        ig.stroke({ color: 0xaa9966, width: 0.5 });
        // Top roll (ellipse as polygon)
        for (let ri = 0; ri <= 10; ri++) {
          const ra = (ri / 10) * Math.PI * 2;
          const rx = ix + Math.cos(ra) * (sw + 1);
          const ry = iby - sh + rollR + Math.sin(ra) * rollR;
          if (ri === 0) ig.moveTo(rx, ry);
          else ig.lineTo(rx, ry);
        }
        ig.closePath();
        ig.fill(0xddcc88);
        ig.stroke({ color: 0xaa9966, width: 0.5 });
        // Bottom roll (ellipse as polygon)
        for (let ri = 0; ri <= 10; ri++) {
          const ra = (ri / 10) * Math.PI * 2;
          const rx = ix + Math.cos(ra) * (sw + 1);
          const ry = iby + sh - rollR + Math.sin(ra) * rollR;
          if (ri === 0) ig.moveTo(rx, ry);
          else ig.lineTo(rx, ry);
        }
        ig.closePath();
        ig.fill(0xddcc88);
        ig.stroke({ color: 0xaa9966, width: 0.5 });
        // Tiny rune lines inside
        for (let rl = 0; rl < 4; rl++) {
          const rly = iby - sh * 0.5 + rl * sh * 0.3;
          ig.moveTo(ix - sw * 0.6, rly);
          ig.lineTo(ix + sw * 0.6, rly);
          ig.stroke({ color: 0x6644aa, width: 0.5, alpha: 0.5 });
        }
      } else if (item.type === "shield_scroll") {
        // Shield shape: 5-point shield polygon (curved top, pointed bottom)
        const shW = TS * 0.16;
        const shH = TS * 0.28;
        ig.moveTo(ix, iby + shH); // bottom point
        ig.lineTo(ix - shW, iby + shH * 0.15);
        ig.lineTo(ix - shW, iby - shH * 0.4);
        // Curved top (arc segments)
        ig.lineTo(ix - shW * 0.6, iby - shH * 0.7);
        ig.lineTo(ix, iby - shH * 0.8);
        ig.lineTo(ix + shW * 0.6, iby - shH * 0.7);
        ig.lineTo(ix + shW, iby - shH * 0.4);
        ig.lineTo(ix + shW, iby + shH * 0.15);
        ig.closePath();
        ig.fill(0xddddcc);
        ig.moveTo(ix, iby + shH);
        ig.lineTo(ix - shW, iby + shH * 0.15);
        ig.lineTo(ix - shW, iby - shH * 0.4);
        ig.lineTo(ix - shW * 0.6, iby - shH * 0.7);
        ig.lineTo(ix, iby - shH * 0.8);
        ig.lineTo(ix + shW * 0.6, iby - shH * 0.7);
        ig.lineTo(ix + shW, iby - shH * 0.4);
        ig.lineTo(ix + shW, iby + shH * 0.15);
        ig.closePath();
        ig.stroke({ color: 0x8888aa, width: 0.7 });
        // Cross emblem inside shield
        ig.moveTo(ix, iby - shH * 0.5);
        ig.lineTo(ix, iby + shH * 0.4);
        ig.stroke({ color: 0x4466cc, width: 1.5, alpha: 0.7 });
        ig.moveTo(ix - shW * 0.5, iby - shH * 0.1);
        ig.lineTo(ix + shW * 0.5, iby - shH * 0.1);
        ig.stroke({ color: 0x4466cc, width: 1.5, alpha: 0.7 });
      } else {
        // Fallback: original star shape
        ig.star(ix, iby, 4, TS * 0.15, TS * 0.08);
        ig.fill(ITEM_COLOR);
        ig.star(ix, iby, 4, TS * 0.07, TS * 0.04);
        ig.fill({ color: 0xffffff, alpha: 0.5 });
      }

      // Sparkle (original + extras)
      this._tileGfx.circle(ix + 3, iby - 3, 1.5);
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.8 });
      // Second sparkle
      this._tileGfx.circle(ix - 2, iby + 2, 1);
      this._tileGfx.fill({ color: 0xffffff, alpha: 0.5 * itemPulse });

      // Ring outline around item
      this._tileGfx.circle(ix, iby, TS * 0.22);
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
      this._staticTileGfx.rect(x, y, TS, 1);
      this._staticTileGfx.fill(edgeColor);
      this._staticTileGfx.rect(x, y + 1, TS, 1);
      this._staticTileGfx.fill(edgeMid);
      this._staticTileGfx.rect(x, y + 2, TS, 1);
      this._staticTileGfx.fill(edgeDark);
      // Corner bevels: small diagonal highlight triangles
      this._staticTileGfx.moveTo(x, y);
      this._staticTileGfx.lineTo(x + 3, y);
      this._staticTileGfx.lineTo(x, y + 3);
      this._staticTileGfx.closePath();
      this._staticTileGfx.fill({ color: 0x333355, alpha: 0.5 });
      this._staticTileGfx.moveTo(x + TS, y);
      this._staticTileGfx.lineTo(x + TS - 3, y);
      this._staticTileGfx.lineTo(x + TS, y + 3);
      this._staticTileGfx.closePath();
      this._staticTileGfx.fill({ color: 0x333355, alpha: 0.5 });
    }
    if (isFloor(col, row + 1)) {
      // Bottom edge: 3-step bevel (brighter, floor shadow)
      this._staticTileGfx.rect(x, y + TS - 3, TS, 1);
      this._staticTileGfx.fill(edgeDark);
      this._staticTileGfx.rect(x, y + TS - 2, TS, 1);
      this._staticTileGfx.fill(edgeMid);
      this._staticTileGfx.rect(x, y + TS - 1, TS, 1);
      this._staticTileGfx.fill(0x333350);
      // Corner bevels
      this._staticTileGfx.moveTo(x, y + TS);
      this._staticTileGfx.lineTo(x + 3, y + TS);
      this._staticTileGfx.lineTo(x, y + TS - 3);
      this._staticTileGfx.closePath();
      this._staticTileGfx.fill({ color: 0x383858, alpha: 0.5 });
      this._staticTileGfx.moveTo(x + TS, y + TS);
      this._staticTileGfx.lineTo(x + TS - 3, y + TS);
      this._staticTileGfx.lineTo(x + TS, y + TS - 3);
      this._staticTileGfx.closePath();
      this._staticTileGfx.fill({ color: 0x383858, alpha: 0.5 });
    }
    if (isFloor(col - 1, row)) {
      // Left edge: 3-step bevel
      this._staticTileGfx.rect(x, y, 1, TS);
      this._staticTileGfx.fill(edgeColor);
      this._staticTileGfx.rect(x + 1, y, 1, TS);
      this._staticTileGfx.fill(edgeMid);
      this._staticTileGfx.rect(x + 2, y, 1, TS);
      this._staticTileGfx.fill(edgeDark);
    }
    if (isFloor(col + 1, row)) {
      // Right edge: 3-step bevel
      this._staticTileGfx.rect(x + TS - 3, y, 1, TS);
      this._staticTileGfx.fill(edgeDark);
      this._staticTileGfx.rect(x + TS - 2, y, 1, TS);
      this._staticTileGfx.fill(edgeMid);
      this._staticTileGfx.rect(x + TS - 1, y, 1, TS);
      this._staticTileGfx.fill(edgeColor);
    }
  }

  // -------------------------------------------------------------------------
  // Ambient effects (lava particles, ice mist)
  // -------------------------------------------------------------------------

  private _drawAmbientEffects(state: RiftWizardState, dt: number): void {
    this._ambientGfx.clear();

    // Calculate visible tile range for culling
    const visMinCol = Math.max(0, Math.floor(-this.worldLayer.x / TS) - 1);
    const visMaxCol = Math.min(state.level.width, Math.ceil((-this.worldLayer.x + 1000) / TS) + 1);
    const visMinRow = Math.max(0, Math.floor(-this.worldLayer.y / TS) - 1);
    const visMaxRow = Math.min(state.level.height, Math.ceil((-this.worldLayer.y + 700) / TS) + 1);

    // Spawn ambient particles from lava tiles
    if (Math.random() < dt * 8) {
      for (let row = visMinRow; row < visMaxRow; row++) {
        for (let col = visMinCol; col < visMaxCol; col++) {
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

    // --- 1. Dungeon atmosphere fog ---
    for (let i = 0; i < 10; i++) {
      const fogX = ((i * 7) % state.level.width) * TS + Math.sin(this._time * 0.3 + i * 1.7) * TS * 1.5;
      const fogY = ((i * 13) % state.level.height) * TS + Math.cos(this._time * 0.25 + i * 2.3) * TS * 1.2;
      const fogRadius = TS * (3 + (i % 3));
      const fogAlpha = 0.04 + 0.02 * Math.sin(this._time * 0.4 + i);
      this._ambientGfx.circle(fogX, fogY, fogRadius);
      this._ambientGfx.fill({ color: 0x1a1a3a, alpha: fogAlpha });
    }

    // --- 2. Floor dust motes & 4. Torch effects & 5. Chasm mist ---
    for (let row = visMinRow; row < visMaxRow; row++) {
      for (let col = visMinCol; col < visMaxCol; col++) {
        const tile = state.level.tiles[row][col];

        // Floor dust motes
        if ((tile === RWTileType.FLOOR || tile === RWTileType.CORRIDOR) && (col + row) % 5 === 0) {
          const dustX = col * TS + TS * 0.5 + Math.sin(this._time + col * 3) * TS * 0.3;
          const dustY = row * TS + TS * 0.5 + Math.cos(this._time * 0.8 + row * 2.7) * TS * 0.25;
          this._ambientGfx.circle(dustX, dustY, 1);
          this._ambientGfx.fill({ color: 0xaaaacc, alpha: 0.12 });
        }

        // Torch effects on select wall tiles bordering a floor
        if (tile === RWTileType.WALL && (col * 7 + row * 11) % 13 === 0) {
          let floorDirCol = 0;
          let floorDirRow = 0;
          const adjOffsets: [number, number][] = [[-1, 0], [1, 0], [0, -1], [0, 1]];
          for (const [dc, dr] of adjOffsets) {
            const nc = col + dc;
            const nr = row + dr;
            if (nc >= 0 && nc < state.level.width && nr >= 0 && nr < state.level.height) {
              const adj = state.level.tiles[nr][nc];
              if (adj === RWTileType.FLOOR || adj === RWTileType.CORRIDOR) {
                floorDirCol = dc;
                floorDirRow = dr;
                break;
              }
            }
          }
          if (floorDirCol !== 0 || floorDirRow !== 0) {
            const torchX = col * TS + TS * 0.5 + floorDirCol * TS * 0.3;
            const torchY = row * TS + TS * 0.5 + floorDirRow * TS * 0.3;
            // Bracket (vertical line for torch body)
            this._ambientGfx.moveTo(torchX, torchY + 2);
            this._ambientGfx.lineTo(torchX, torchY - 4);
            this._ambientGfx.stroke({ color: 0x886644, width: 1.5, alpha: 0.4 });
            // Flickering flame triangles
            const flicker = Math.sin(this._time * 4 + col) * 1.5;
            for (let f = 0; f < 3; f++) {
              const fOff = (f - 1) * 2;
              const fHeight = 3 + f * 0.5 + flicker * (f === 1 ? 1 : 0.5);
              this._ambientGfx.moveTo(torchX + fOff - 1, torchY - 4);
              this._ambientGfx.lineTo(torchX + fOff + 1, torchY - 4);
              this._ambientGfx.lineTo(torchX + fOff + flicker * 0.3, torchY - 4 - fHeight);
              this._ambientGfx.closePath();
              this._ambientGfx.fill({ color: f === 1 ? 0xffcc44 : 0xff8833, alpha: 0.35 });
            }
            // Warm glow on the floor side
            const glowX = torchX + floorDirCol * TS * 0.5;
            const glowY = torchY + floorDirRow * TS * 0.5;
            this._ambientGfx.circle(glowX, glowY, TS * 0.8);
            this._ambientGfx.fill({ color: 0xff8844, alpha: 0.04 });
            // Smaller bright core glow
            this._ambientGfx.circle(torchX, torchY - 5, TS * 0.3);
            this._ambientGfx.fill({ color: 0xffcc66, alpha: 0.06 });
          }
        }

        // Chasm mist wisps
        if (tile === RWTileType.CHASM) {
          const wispPhase = (this._time * 0.5 + col * 1.3 + row * 2.1) % 3.0;
          const wispX = col * TS + TS * 0.5 + Math.sin(this._time * 0.7 + col * 2) * TS * 0.3;
          const wispBaseY = row * TS + TS - wispPhase * TS * 0.6;
          const wispSway = Math.sin(this._time * 1.2 + row + col) * 3;
          // Thin wisp polygon
          this._ambientGfx.moveTo(wispX - 1, wispBaseY);
          this._ambientGfx.lineTo(wispX + wispSway, wispBaseY - TS * 0.35);
          this._ambientGfx.lineTo(wispX + wispSway + 1, wispBaseY - TS * 0.3);
          this._ambientGfx.lineTo(wispX + 1, wispBaseY + 2);
          this._ambientGfx.closePath();
          this._ambientGfx.fill({ color: 0x222244, alpha: 0.08 });
          // Second smaller wisp offset
          const w2X = wispX + TS * 0.25;
          const w2Phase = (this._time * 0.4 + col * 0.9 + row * 1.7) % 2.5;
          const w2BaseY = row * TS + TS - w2Phase * TS * 0.5;
          this._ambientGfx.moveTo(w2X - 0.5, w2BaseY);
          this._ambientGfx.lineTo(w2X + wispSway * 0.7, w2BaseY - TS * 0.25);
          this._ambientGfx.lineTo(w2X + wispSway * 0.7 + 0.5, w2BaseY - TS * 0.2);
          this._ambientGfx.lineTo(w2X + 0.5, w2BaseY + 1);
          this._ambientGfx.closePath();
          this._ambientGfx.fill({ color: 0x1a1a3a, alpha: 0.06 });
        }
      }
    }

    // --- 3. Magical ley lines between shrines ---
    if (state.level.shrines.length >= 2) {
      for (let i = 0; i < state.level.shrines.length - 1; i++) {
        const s1 = state.level.shrines[i];
        const s2 = state.level.shrines[i + 1];
        const s1x = s1.col * TS + TS / 2;
        const s1y = s1.row * TS + TS / 2;
        const s2x = s2.col * TS + TS / 2;
        const s2y = s2.row * TS + TS / 2;
        const leyColor = SCHOOL_COLORS[s1.school] ?? 0x9933ff;
        this._ambientGfx.moveTo(s1x, s1y);
        const steps = 8;
        for (let s = 1; s <= steps; s++) {
          const t = s / steps;
          const mx = s1x + (s2x - s1x) * t;
          const my = s1y + (s2y - s1y) * t;
          const perpX = -(s2y - s1y);
          const perpY = s2x - s1x;
          const len = Math.sqrt(perpX * perpX + perpY * perpY) || 1;
          const wave = Math.sin(this._time * 1.5 + t * Math.PI * 4) * 3;
          this._ambientGfx.lineTo(mx + (perpX / len) * wave, my + (perpY / len) * wave);
        }
        this._ambientGfx.stroke({ color: leyColor, width: 1, alpha: 0.06 });
      }
    }

    // --- 6. Wizard magical aura (enhanced with concentric rotating rings) ---
    const wx = state.wizard.col * TS + TS / 2;
    const wy = state.wizard.row * TS + TS / 2;
    const wizPulse = 0.3 + 0.15 * Math.sin(this._time * 2);
    // Base glow (preserved original)
    this._ambientGfx.circle(wx, wy, TS * 0.6);
    this._ambientGfx.fill({ color: WIZARD_COLOR, alpha: wizPulse * 0.1 });
    // Concentric rotating rings with cardinal dot markers
    const ringRadii = [TS * 0.45, TS * 0.7, TS * 0.95];
    const ringSpeeds = [1.2, -0.8, 0.5];
    for (let r = 0; r < 3; r++) {
      const radius = ringRadii[r];
      const speed = ringSpeeds[r];
      const ringAlpha = 0.04 + 0.02 * Math.sin(this._time * 1.5 + r);
      this._ambientGfx.circle(wx, wy, radius);
      this._ambientGfx.stroke({ color: WIZARD_COLOR, width: 0.5, alpha: ringAlpha });
      for (let d = 0; d < 4; d++) {
        const angle = this._time * speed + (d * Math.PI * 0.5);
        const dotX = wx + Math.cos(angle) * radius;
        const dotY = wy + Math.sin(angle) * radius;
        this._ambientGfx.circle(dotX, dotY, 1.5);
        this._ambientGfx.fill({ color: WIZARD_COLOR, alpha: 0.12 });
      }
    }

    // --- 7. Rift portal energy tendrils ---
    for (const portal of state.level.riftPortals) {
      const px = portal.col * TS + TS / 2;
      const py = portal.row * TS + TS / 2;
      const portalColor = SCHOOL_COLORS[portal.theme] ?? 0x9933ff;
      for (let t = 0; t < 4; t++) {
        const baseAngle = (t * Math.PI * 0.5) + this._time * 0.3;
        this._ambientGfx.moveTo(px, py);
        const tendrilSteps = 6;
        const tendrilLen = TS * 1.5;
        for (let s = 1; s <= tendrilSteps; s++) {
          const frac = s / tendrilSteps;
          const dist = frac * tendrilLen;
          const wobble = Math.sin(this._time * 3 + t * 2.1 + frac * Math.PI * 3) * TS * 0.2 * frac;
          const tx = px + Math.cos(baseAngle) * dist + Math.cos(baseAngle + Math.PI * 0.5) * wobble;
          const ty = py + Math.sin(baseAngle) * dist + Math.sin(baseAngle + Math.PI * 0.5) * wobble;
          this._ambientGfx.lineTo(tx, ty);
        }
        this._ambientGfx.stroke({ color: portalColor, width: 1, alpha: 0.08 });
      }
    }

    // Status effect ground visuals on enemy tiles
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      const ex = enemy.col * TS;
      const ey = enemy.row * TS;

      const burnEffect = enemy.statusEffects.find((e) => e.type === "burn" && e.turnsRemaining > 0);
      const freezeEffect = enemy.statusEffects.find((e) => e.type === "freeze" && e.turnsRemaining > 0);
      const poisonEffect = enemy.statusEffects.find((e) => e.type === "poison" && e.turnsRemaining > 0);
      const slowEffect = enemy.statusEffects.find((e) => e.type === "slow" && e.turnsRemaining > 0);

      // Burn: flickering orange-red ground fire
      if (burnEffect) {
        const flicker = 0.3 + 0.2 * Math.sin(this._time * 6 + enemy.col * 3);
        // Small flame shapes on the ground
        for (let i = 0; i < 3; i++) {
          const fx = ex + 4 + i * (TS - 8) / 2;
          const fy = ey + TS - 2;
          const fh = 4 + Math.sin(this._time * 8 + i * 2) * 2;
          this._ambientGfx.moveTo(fx, fy);
          this._ambientGfx.lineTo(fx + 2, fy - fh);
          this._ambientGfx.lineTo(fx + 4, fy);
          this._ambientGfx.closePath();
          this._ambientGfx.fill({ color: 0xff6600, alpha: flicker });
        }
        // Ground scorch mark
        this._ambientGfx.rect(ex + 2, ey + TS - 3, TS - 4, 2);
        this._ambientGfx.fill({ color: 0x331100, alpha: 0.3 });
      }

      // Freeze: ice crystal ground patches
      if (freezeEffect) {
        const shimmer = 0.25 + 0.1 * Math.sin(this._time * 3 + enemy.row);
        // Ice patch
        this._ambientGfx.rect(ex + 2, ey + 2, TS - 4, TS - 4);
        this._ambientGfx.fill({ color: 0x44aaff, alpha: shimmer * 0.15 });
        // Small ice crystals
        const cx = ex + TS / 2;
        const cy = ey + TS / 2;
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI / 2) + this._time * 0.3;
          const dx = Math.cos(angle) * TS * 0.25;
          const dy = Math.sin(angle) * TS * 0.25;
          this._ambientGfx.moveTo(cx + dx, cy + dy - 3);
          this._ambientGfx.lineTo(cx + dx + 2, cy + dy);
          this._ambientGfx.lineTo(cx + dx, cy + dy + 3);
          this._ambientGfx.lineTo(cx + dx - 2, cy + dy);
          this._ambientGfx.closePath();
          this._ambientGfx.fill({ color: 0xaaddff, alpha: shimmer });
        }
      }

      // Poison: green bubbling ground
      if (poisonEffect) {
        // Green puddle
        this._ambientGfx.circle(ex + TS / 2, ey + TS - 4, TS * 0.35);
        this._ambientGfx.fill({ color: 0x33aa33, alpha: 0.12 });
        // Bubbles
        for (let i = 0; i < 3; i++) {
          const bx = ex + 6 + ((i * 7 + Math.floor(this._time * 2)) % (TS - 12));
          const by = ey + TS - 6 - Math.abs(Math.sin(this._time * 3 + i * 1.5)) * 6;
          this._ambientGfx.circle(bx, by, 1.5);
          this._ambientGfx.stroke({ color: 0x66cc66, width: 0.5, alpha: 0.4 });
        }
      }

      // Slow: purple/arcane ground chains
      if (slowEffect) {
        // Slow field circle
        this._ambientGfx.circle(ex + TS / 2, ey + TS / 2, TS * 0.4);
        this._ambientGfx.stroke({ color: 0xaa44ff, width: 1, alpha: 0.2 });
        // Clock-like marks
        for (let i = 0; i < 4; i++) {
          const angle = (i * Math.PI / 2) + this._time * 0.5;
          const scx = ex + TS / 2 + Math.cos(angle) * TS * 0.3;
          const scy = ey + TS / 2 + Math.sin(angle) * TS * 0.3;
          this._ambientGfx.rect(scx - 1, scy - 1, 2, 2);
          this._ambientGfx.fill({ color: 0xaa44ff, alpha: 0.25 });
        }
      }
    }

    // Persistent ground decals
    for (let i = this._groundDecals.length - 1; i >= 0; i--) {
      const decal = this._groundDecals[i];
      decal.age += dt;
      if (decal.age >= decal.maxAge) {
        this._groundDecals.splice(i, 1);
        continue;
      }
      const fadeAlpha = 1 - (decal.age / decal.maxAge);
      const dx = decal.col * TS;
      const dy = decal.row * TS;

      if (decal.type === "scorch") {
        // Scorch mark: dark irregular shape
        this._ambientGfx.circle(dx + TS / 2, dy + TS / 2, TS * 0.35);
        this._ambientGfx.fill({ color: 0x1a0a00, alpha: fadeAlpha * 0.15 });
        // Soot streaks
        for (let s = 0; s < 4; s++) {
          const angle = s * Math.PI / 2 + 0.3;
          this._ambientGfx.moveTo(dx + TS / 2, dy + TS / 2);
          this._ambientGfx.lineTo(dx + TS / 2 + Math.cos(angle) * TS * 0.3, dy + TS / 2 + Math.sin(angle) * TS * 0.3);
          this._ambientGfx.stroke({ color: 0x221100, width: 1, alpha: fadeAlpha * 0.1 });
        }
      } else if (decal.type === "ice_patch") {
        // Ice patch: blue transparent overlay
        this._ambientGfx.rect(dx + 3, dy + 3, TS - 6, TS - 6);
        this._ambientGfx.fill({ color: 0x44aaff, alpha: fadeAlpha * 0.08 });
        this._ambientGfx.rect(dx + 3, dy + 3, TS - 6, TS - 6);
        this._ambientGfx.stroke({ color: 0x88ccff, width: 0.5, alpha: fadeAlpha * 0.12 });
      } else if (decal.type === "crack") {
        // Ground crack from earthquake
        this._ambientGfx.moveTo(dx + 3, dy + TS / 2);
        this._ambientGfx.lineTo(dx + TS / 2, dy + 5);
        this._ambientGfx.lineTo(dx + TS - 3, dy + TS / 2 + 3);
        this._ambientGfx.stroke({ color: 0x443322, width: 1, alpha: fadeAlpha * 0.12 });
      } else if (decal.type === "blood") {
        // Small blood splatter
        this._ambientGfx.circle(dx + TS / 2 - 2, dy + TS / 2 + 2, 3);
        this._ambientGfx.fill({ color: 0x660000, alpha: fadeAlpha * 0.1 });
        this._ambientGfx.circle(dx + TS / 2 + 3, dy + TS / 2 - 1, 2);
        this._ambientGfx.fill({ color: 0x550000, alpha: fadeAlpha * 0.08 });
      }
    }
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

      const pg = this._entityGfx;
      const pLeft = portal.col * TS;
      const pTop = portal.row * TS;
      const pillarW = 4;
      const archInnerW = TS - pillarW * 2 - 4;

      // Outer glow
      pg.circle(px, py, TS * 0.55);
      pg.fill({ color: portalColor, alpha: 0.15 * pulse });

      // Left pillar polygon
      pg.rect(pLeft + 2, pTop + 4, pillarW, TS - 5);
      pg.fill({ color: portalColor, alpha: 0.8 });
      pg.rect(pLeft + 2, pTop + 4, pillarW, TS - 5);
      pg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });
      // Right pillar polygon
      pg.rect(pLeft + TS - pillarW - 2, pTop + 4, pillarW, TS - 5);
      pg.fill({ color: portalColor, alpha: 0.8 });
      pg.rect(pLeft + TS - pillarW - 2, pTop + 4, pillarW, TS - 5);
      pg.stroke({ color: 0xffffff, width: 0.5, alpha: 0.4 });

      // Curved arch top (multi-segment arc connecting pillars)
      const archCx = px;
      const archCy = pTop + 6;
      const archRx = archInnerW * 0.5 + pillarW * 0.5;
      const archRy = TS * 0.35;
      pg.moveTo(pLeft + 2 + pillarW * 0.5, pTop + 6);
      for (let ai = 0; ai <= 12; ai++) {
        const aa = Math.PI + (ai / 12) * Math.PI;
        pg.lineTo(archCx + Math.cos(aa) * archRx, archCy + Math.sin(aa) * archRy);
      }
      pg.stroke({ color: portalColor, width: 2, alpha: 0.9 });

      // Rune symbols on pillars (diamond + triangle pairs)
      for (const side of [-1, 1]) {
        const rpx = px + side * (TS * 0.5 - pillarW * 0.5 - 2);
        // Diamond rune
        const rd = 2;
        pg.moveTo(rpx, pTop + 12);
        pg.lineTo(rpx + rd, pTop + 12 + rd);
        pg.lineTo(rpx, pTop + 12 + rd * 2);
        pg.lineTo(rpx - rd, pTop + 12 + rd);
        pg.closePath();
        pg.fill({ color: 0xffffff, alpha: 0.5 * pulse });
        // Triangle rune below
        pg.moveTo(rpx, pTop + 20);
        pg.lineTo(rpx + rd, pTop + 20 + rd * 1.5);
        pg.lineTo(rpx - rd, pTop + 20 + rd * 1.5);
        pg.closePath();
        pg.fill({ color: 0xffffff, alpha: 0.4 * pulse });
      }

      // Swirling energy inside: concentric irregular polygons that rotate
      for (let ri = 0; ri < 3; ri++) {
        const swirlR = (3 - ri) * TS * 0.1 + 2;
        const swirlPts = 5 + ri;
        const swirlAngle = this._time * (2 + ri * 0.7) * (ri % 2 === 0 ? 1 : -1);
        pg.moveTo(
          px + Math.cos(swirlAngle) * swirlR,
          py + Math.sin(swirlAngle) * swirlR * 0.8,
        );
        for (let si = 1; si <= swirlPts; si++) {
          const sa = swirlAngle + (si / swirlPts) * Math.PI * 2;
          const wobble = 1 + 0.2 * Math.sin(this._time * 3 + si + ri);
          pg.lineTo(
            px + Math.cos(sa) * swirlR * wobble,
            py + Math.sin(sa) * swirlR * 0.8 * wobble,
          );
        }
        pg.closePath();
        pg.stroke({ color: portalColor, width: 1, alpha: (0.5 - ri * 0.12) * pulse });
      }

      // Inner bright core fill
      pg.circle(px, py, TS * 0.18);
      pg.fill({ color: 0xffffff, alpha: 0.15 * pulse });

      // Glowing threshold at the bottom (bright line)
      pg.moveTo(pLeft + 2 + pillarW, pTop + TS - 2);
      pg.lineTo(pLeft + TS - 2 - pillarW, pTop + TS - 2);
      pg.stroke({ color: 0xffffff, width: 2, alpha: 0.6 * pulse });

      // Rotating particles around portal
      for (let i = 0; i < 3; i++) {
        const angle = this._time * 2 + (i * Math.PI * 2 / 3);
        const dx = Math.cos(angle) * TS * 0.35;
        const dy = Math.sin(angle) * TS * 0.35;
        pg.circle(px + dx, py + dy, 2);
        pg.fill({ color: 0xffffff, alpha: 0.7 });
      }
    }

    // Draw spawners with tower/obelisk shape
    for (const spawner of state.level.spawners) {
      if (!spawner.alive) continue;
      const sx = spawner.col * TS;
      const sy = spawner.row * TS;
      const cx = sx + TS / 2;
      const pulse = 0.5 + 0.3 * Math.sin(this._time * 2);
      const g = this._entityGfx;

      // Outer glow
      g.circle(cx, sy + TS / 2, TS * 0.55);
      g.fill({ color: SPAWNER_COLOR, alpha: 0.12 * pulse });

      // Base - wide trapezoid at the bottom
      const baseTop = sy + TS - 6;
      const baseBot = sy + TS - 1;
      g.moveTo(sx + 2, baseBot);
      g.lineTo(sx + TS - 2, baseBot);
      g.lineTo(sx + TS - 5, baseTop);
      g.lineTo(sx + 5, baseTop);
      g.closePath();
      g.fill(0x7a5522);

      // Tower body - narrower rect above the base
      const towerLeft = sx + 6;
      const towerRight = sx + TS - 6;
      const towerTop = sy + 5;
      const towerBot = baseTop;
      g.rect(towerLeft, towerTop, towerRight - towerLeft, towerBot - towerTop);
      g.fill(SPAWNER_COLOR);
      g.rect(towerLeft, towerTop, towerRight - towerLeft, towerBot - towerTop);
      g.stroke({ color: 0xaa7733, width: 1 });

      // Horizontal line textures on tower body (2-3 lines)
      const towerH = towerBot - towerTop;
      for (let li = 1; li <= 3; li++) {
        const ly = towerTop + (towerH * li) / 4;
        g.moveTo(towerLeft + 1, ly);
        g.lineTo(towerRight - 1, ly);
        g.stroke({ color: 0x7a5522, width: 1, alpha: 0.6 });
      }

      // Battlements - alternating small rects on top
      const crenW = 3;
      const crenH = 3;
      for (let bx = towerLeft; bx < towerRight; bx += crenW * 2) {
        g.rect(bx, towerTop - crenH, crenW, crenH);
        g.fill(SPAWNER_COLOR);
        g.rect(bx, towerTop - crenH, crenW, crenH);
        g.stroke({ color: 0xaa7733, width: 0.5 });
      }

      // Glowing window - small bright rect in middle of tower, pulsing
      const winW = 4;
      const winH = 4;
      const winX = cx - winW / 2;
      const winY = towerTop + towerH * 0.3;
      g.rect(winX, winY, winW, winH);
      g.fill({ color: 0xffdd44, alpha: 0.5 + 0.4 * pulse });
      g.rect(winX, winY, winW, winH);
      g.stroke({ color: 0xffaa00, width: 0.5, alpha: 0.8 });

      // Dark doorway - small dark arch at the bottom center
      const doorW = 5;
      const doorH = 5;
      const doorX = cx - doorW / 2;
      const doorY = towerBot - doorH;
      g.rect(doorX, doorY, doorW, doorH);
      g.fill({ color: 0x111111, alpha: 0.9 });
      // Arch top
      g.circle(cx, doorY, doorW / 2);
      g.fill({ color: 0x111111, alpha: 0.9 });

      // Rune glow - 2-3 school-colored rune shapes on tower sides that pulse
      const runeColor = 0xcc8844;
      const runePulse = 0.4 + 0.6 * Math.sin(this._time * 3);
      // Left rune
      g.circle(towerLeft + 3, towerTop + towerH * 0.55, 1.5);
      g.fill({ color: runeColor, alpha: runePulse });
      // Right rune
      g.circle(towerRight - 3, towerTop + towerH * 0.55, 1.5);
      g.fill({ color: runeColor, alpha: runePulse });
      // Center rune (below window)
      g.circle(cx, winY + winH + 4, 1.5);
      g.fill({ color: runeColor, alpha: runePulse * 0.8 });

      // Spawn indicator - when HP < 50%, pulsing warning rings
      if (spawner.hp < spawner.maxHp * 0.5) {
        const warnPulse = 0.3 + 0.7 * Math.abs(Math.sin(this._time * 4));
        g.circle(cx, sy + TS / 2, TS * 0.45);
        g.stroke({ color: 0xff4444, width: 1.5, alpha: 0.3 * warnPulse });
        g.circle(cx, sy + TS / 2, TS * 0.6);
        g.stroke({ color: 0xff4444, width: 1, alpha: 0.15 * warnPulse });
      }

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
    const g = this._entityGfx;

    if (enemy.isBoss) {
      const pulse = 0.8 + 0.2 * Math.sin(this._time * 3);
      const s = TS * 0.42;

      // Outer octagon body
      for (let layer = 0; layer < 2; layer++) {
        const r = layer === 0 ? s : s * 0.7;
        const fillColor = layer === 0 ? color : 0x000000;
        const fillAlpha = layer === 0 ? 1 : 0.3;
        g.moveTo(ex + r, ey);
        for (let i = 1; i <= 8; i++) {
          const a = (i / 8) * Math.PI * 2;
          g.lineTo(ex + Math.cos(a) * r, ey + Math.sin(a) * r);
        }
        g.closePath();
        g.fill({ color: fillColor, alpha: fillAlpha });
      }
      // Inner diamond
      const ds = s * 0.55;
      g.moveTo(ex, ey - ds);
      g.lineTo(ex + ds, ey);
      g.lineTo(ex, ey + ds);
      g.lineTo(ex - ds, ey);
      g.closePath();
      g.fill({ color, alpha: 0.9 });
      g.moveTo(ex, ey - ds);
      g.lineTo(ex + ds, ey);
      g.lineTo(ex, ey + ds);
      g.lineTo(ex - ds, ey);
      g.closePath();
      g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.3 });

      // Armor scales: small overlapping diamonds on body
      for (let si = 0; si < 5; si++) {
        const sa = ((si - 2) / 5) * Math.PI * 0.6;
        const sd = s * 0.35;
        const scx = ex + Math.cos(sa) * sd;
        const scy = ey + Math.sin(sa) * sd;
        g.moveTo(scx, scy - 3);
        g.lineTo(scx + 2.5, scy);
        g.lineTo(scx, scy + 3);
        g.lineTo(scx - 2.5, scy);
        g.closePath();
        g.fill({ color: 0xffffff, alpha: 0.12 });
      }

      // Horns: two curved horns from top
      for (const side of [-1, 1]) {
        const hx1 = ex + side * 5;
        const hy1 = ey - s * 0.85;
        const hx2 = ex + side * 10;
        const hy2 = ey - s * 1.05;
        const hx3 = ex + side * 14;
        const hy3 = ey - s * 0.9;
        g.moveTo(hx1, hy1);
        g.lineTo(hx2, hy2);
        g.lineTo(hx3, hy3);
        g.stroke({ color: 0xddaa44, width: 2 });
      }

      // Wings: two triangular wing shapes from sides with vein lines
      for (const side of [-1, 1]) {
        const wy = ey - 2;
        const wtip = ex + side * (s * 1.5);
        g.moveTo(ex + side * s * 0.5, ey - s * 0.3);
        g.lineTo(wtip, wy - s * 0.4);
        g.lineTo(wtip, wy + s * 0.2);
        g.lineTo(ex + side * s * 0.5, ey + s * 0.15);
        g.closePath();
        g.fill({ color, alpha: 0.4 });
        g.moveTo(ex + side * s * 0.5, ey - s * 0.3);
        g.lineTo(wtip, wy - s * 0.4);
        g.lineTo(wtip, wy + s * 0.2);
        g.lineTo(ex + side * s * 0.5, ey + s * 0.15);
        g.closePath();
        g.stroke({ color, width: 1, alpha: 0.7 });
        // Vein lines inside wing
        for (let v = 0; v < 3; v++) {
          const t = (v + 1) / 4;
          const vx1 = ex + side * (s * 0.5 + t * (s * 1.0));
          g.moveTo(vx1, wy - s * 0.3 * (1 - t * 0.5));
          g.lineTo(vx1, wy + s * 0.1);
          g.stroke({ color, width: 0.5, alpha: 0.5 });
        }
      }

      // Crown: 5-pointed crown with gem circles at tips
      const crownY = ey - s * 0.75;
      const crownW = 10;
      const crownH = 6;
      g.moveTo(ex - crownW, crownY);
      for (let ci = 0; ci < 5; ci++) {
        const tipX = ex - crownW + (ci / 4) * crownW * 2;
        g.lineTo(tipX, crownY - crownH);
        if (ci < 4) g.lineTo(tipX + crownW * 0.25, crownY - 1);
      }
      g.lineTo(ex + crownW, crownY);
      g.closePath();
      g.fill(0xffcc00);
      // Gem circles at crown tips
      for (let ci = 0; ci < 5; ci++) {
        const tipX = ex - crownW + (ci / 4) * crownW * 2;
        g.circle(tipX, crownY - crownH, 1.5);
        g.fill({ color: 0xff4488, alpha: pulse });
      }

      // Three glowing eyes in triangle pattern
      const eyeAlpha = 0.7 + 0.3 * Math.sin(this._time * 5);
      g.circle(ex - 4, ey - 3, 2);
      g.fill({ color: 0xffff00, alpha: eyeAlpha });
      g.circle(ex + 4, ey - 3, 2);
      g.fill({ color: 0xffff00, alpha: eyeAlpha });
      g.circle(ex, ey + 1, 2);
      g.fill({ color: 0xffff00, alpha: eyeAlpha });

    } else if (enemy.defId === "spider") {
      // --- Spider: small oval body with 8 bent legs ---
      const bw = TS * 0.18;
      const bh = TS * 0.12;
      // Body (ellipse approximated as rect with rounded feel)
      g.rect(ex - bw, ey - bh, bw * 2, bh * 2);
      g.fill(color);
      g.rect(ex - bw, ey - bh, bw * 2, bh * 2);
      g.stroke({ color: 0x000000, width: 1 });
      // 8 legs, each with 2 segments (bent)
      const legAngles = [-0.9, -0.55, -0.2, 0.15, 0.5, 0.85, 1.2, 1.55];
      for (let li = 0; li < 8; li++) {
        const baseAngle = legAngles[li] * Math.PI;
        const side = li < 4 ? -1 : 1;
        const mirrorAngle = side === -1 ? Math.PI - baseAngle : baseAngle;
        const seg1 = TS * 0.22;
        const seg2 = TS * 0.18;
        const bendAngle = mirrorAngle + side * 0.5;
        // Joint point
        const jx = ex + Math.cos(mirrorAngle) * seg1;
        const jy = ey + Math.sin(mirrorAngle) * seg1;
        // Tip point
        const tx = jx + Math.cos(bendAngle) * seg2;
        const ty = jy + Math.sin(bendAngle) * seg2;
        // Segment 1: body to joint
        g.moveTo(ex, ey);
        g.lineTo(jx, jy);
        g.stroke({ color, width: 1.5 });
        // Segment 2: joint to tip
        g.moveTo(jx, jy);
        g.lineTo(tx, ty);
        g.stroke({ color, width: 1 });
      }
      // Small eyes
      g.circle(ex - 2, ey - bh * 0.3, 1.2);
      g.fill({ color: 0xff4444, alpha: 0.9 });
      g.circle(ex + 2, ey - bh * 0.3, 1.2);
      g.fill({ color: 0xff4444, alpha: 0.9 });

    } else if (enemy.defId === "swordsman") {
      // --- Swordsman: armored humanoid with helm, shield, sword ---
      const r = TS * 0.3;

      // Body (rect) with chainmail crosshatch pattern
      g.rect(ex - r * 0.4, ey - r * 0.55, r * 0.8, r * 1.1);
      g.fill(color);
      g.rect(ex - r * 0.4, ey - r * 0.55, r * 0.8, r * 1.1);
      g.stroke({ color: 0x000000, width: 1 });
      // Chainmail crosshatch diagonal lines
      for (let ci = 0; ci < 5; ci++) {
        const cxOff = -r * 0.35 + ci * r * 0.18;
        g.moveTo(ex + cxOff, ey - r * 0.5);
        g.lineTo(ex + cxOff + r * 0.3, ey + r * 0.5);
        g.stroke({ color: 0x000000, width: 0.4, alpha: 0.3 });
        g.moveTo(ex + cxOff + r * 0.3, ey - r * 0.5);
        g.lineTo(ex + cxOff, ey + r * 0.5);
        g.stroke({ color: 0x000000, width: 0.4, alpha: 0.3 });
      }

      // Helmet polygon (flat-top with cheek guards and nasal bar)
      const helmTop = ey - r * 1.2;
      const helmBot = ey - r * 0.55;
      const helmW = r * 0.42;
      g.moveTo(ex - helmW, helmBot);
      g.lineTo(ex - helmW - 2, helmTop + 4); // left cheek guard
      g.lineTo(ex - helmW + 1, helmTop);      // left top corner
      g.lineTo(ex + helmW - 1, helmTop);      // flat top
      g.lineTo(ex + helmW + 2, helmTop + 4);  // right top corner
      g.lineTo(ex + helmW, helmBot);           // right cheek guard
      g.closePath();
      g.fill(color);
      g.moveTo(ex - helmW, helmBot);
      g.lineTo(ex - helmW - 2, helmTop + 4);
      g.lineTo(ex - helmW + 1, helmTop);
      g.lineTo(ex + helmW - 1, helmTop);
      g.lineTo(ex + helmW + 2, helmTop + 4);
      g.lineTo(ex + helmW, helmBot);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1 });
      // Nasal bar (vertical line down center of helm)
      g.moveTo(ex, helmTop);
      g.lineTo(ex, helmBot - 1);
      g.stroke({ color: 0x000000, width: 1.2, alpha: 0.6 });
      // Eye slit (thin horizontal line)
      g.moveTo(ex - helmW + 3, ey - r * 0.9);
      g.lineTo(ex + helmW - 3, ey - r * 0.9);
      g.stroke({ color: 0xffff88, width: 1.5 });

      // Left leg with boot (trapezoid boot shape)
      g.moveTo(ex - r * 0.35, ey + r * 0.55);
      g.lineTo(ex - r * 0.1, ey + r * 0.55);
      g.lineTo(ex - r * 0.15, ey + r * 0.95);
      g.lineTo(ex - r * 0.55, ey + r * 0.95);
      g.lineTo(ex - r * 0.55, ey + r * 1.15);
      g.lineTo(ex - r * 0.1, ey + r * 1.15);
      g.lineTo(ex - r * 0.1, ey + r * 0.95);
      g.closePath();
      g.fill({ color: 0x333333, alpha: 0.9 });
      // Right leg with boot
      g.moveTo(ex + r * 0.1, ey + r * 0.55);
      g.lineTo(ex + r * 0.35, ey + r * 0.55);
      g.lineTo(ex + r * 0.4, ey + r * 0.95);
      g.lineTo(ex + r * 0.55, ey + r * 0.95);
      g.lineTo(ex + r * 0.55, ey + r * 1.15);
      g.lineTo(ex + r * 0.15, ey + r * 1.15);
      g.lineTo(ex + r * 0.15, ey + r * 0.95);
      g.closePath();
      g.fill({ color: 0x333333, alpha: 0.9 });

      // Kite shield polygon on left arm (pointed bottom, rounded top)
      const shX = ex - r * 0.7;
      const shY = ey - r * 0.1;
      g.moveTo(shX, shY - r * 0.55);
      g.lineTo(shX + r * 0.35, shY - r * 0.45);
      g.lineTo(shX + r * 0.35, shY + r * 0.1);
      g.lineTo(shX, shY + r * 0.6);
      g.lineTo(shX - r * 0.35, shY + r * 0.1);
      g.lineTo(shX - r * 0.35, shY - r * 0.45);
      g.closePath();
      g.fill(0x884444);
      g.moveTo(shX, shY - r * 0.55);
      g.lineTo(shX + r * 0.35, shY - r * 0.45);
      g.lineTo(shX + r * 0.35, shY + r * 0.1);
      g.lineTo(shX, shY + r * 0.6);
      g.lineTo(shX - r * 0.35, shY + r * 0.1);
      g.lineTo(shX - r * 0.35, shY - r * 0.45);
      g.closePath();
      g.stroke({ color: 0x000000, width: 0.7 });
      // Shield boss (small circle)
      g.circle(shX, shY, 2);
      g.fill(0xccaa44);

      // Sword blade: elongated diamond/leaf shape (4-point) instead of triangle
      const swTipY = ey - r * 1.5;
      const swBaseY = ey - r * 0.3;
      const swMidY = (swTipY + swBaseY) * 0.5;
      const swHalf = r * 0.15;
      g.moveTo(ex + r * 0.6, swTipY);       // tip
      g.lineTo(ex + r * 0.6 + swHalf, swMidY - r * 0.15); // right bulge upper
      g.lineTo(ex + r * 0.6 + swHalf, swMidY + r * 0.15); // right bulge lower
      g.lineTo(ex + r * 0.6, swBaseY);       // base
      g.lineTo(ex + r * 0.6 - swHalf, swMidY + r * 0.15);
      g.lineTo(ex + r * 0.6 - swHalf, swMidY - r * 0.15);
      g.closePath();
      g.fill(0xcccccc);
      g.moveTo(ex + r * 0.6, swTipY);
      g.lineTo(ex + r * 0.6 + swHalf, swMidY - r * 0.15);
      g.lineTo(ex + r * 0.6 + swHalf, swMidY + r * 0.15);
      g.lineTo(ex + r * 0.6, swBaseY);
      g.lineTo(ex + r * 0.6 - swHalf, swMidY + r * 0.15);
      g.lineTo(ex + r * 0.6 - swHalf, swMidY - r * 0.15);
      g.closePath();
      g.stroke({ color: 0x888888, width: 0.5 });
      // Fuller line down center of blade
      g.moveTo(ex + r * 0.6, swTipY + 2);
      g.lineTo(ex + r * 0.6, swBaseY - 2);
      g.stroke({ color: 0xaaaaaa, width: 0.5, alpha: 0.5 });
      // Sword handle
      g.rect(ex + r * 0.5, ey - r * 0.3, r * 0.2, r * 0.35);
      g.fill(0x885533);
      // Cross-guard
      g.rect(ex + r * 0.4, ey - r * 0.35, r * 0.4, 2);
      g.fill(0xaaaa44);

    } else if (enemy.defId === "archer") {
      // --- Archer: hooded figure with recurve bow, quiver, cloak ---
      const r = TS * 0.3;

      // Cloak draping polygon behind the figure
      g.moveTo(ex - r * 0.3, ey - r * 0.7);
      g.lineTo(ex + r * 0.4, ey - r * 0.6);
      g.lineTo(ex + r * 0.5, ey + r * 0.8);
      g.lineTo(ex + r * 0.3, ey + r * 1.0);
      g.lineTo(ex + r * 0.1, ey + r * 0.85);
      g.lineTo(ex - r * 0.1, ey + r * 0.95);
      g.lineTo(ex - r * 0.35, ey + r * 0.7);
      g.closePath();
      g.fill({ color: 0x2a3322, alpha: 0.7 });

      // Body (rect)
      g.rect(ex - r * 0.35, ey - r * 0.55, r * 0.7, r * 1.0);
      g.fill(color);
      g.rect(ex - r * 0.35, ey - r * 0.55, r * 0.7, r * 1.0);
      g.stroke({ color: 0x000000, width: 1 });

      // Hood polygon (triangular top with draped sides) replacing circle head
      const hoodTip = ey - r * 1.35;
      g.moveTo(ex, hoodTip);
      g.lineTo(ex + r * 0.45, ey - r * 0.65);
      g.lineTo(ex + r * 0.35, ey - r * 0.45);
      g.lineTo(ex - r * 0.35, ey - r * 0.45);
      g.lineTo(ex - r * 0.45, ey - r * 0.65);
      g.closePath();
      g.fill(color);
      g.moveTo(ex, hoodTip);
      g.lineTo(ex + r * 0.45, ey - r * 0.65);
      g.lineTo(ex + r * 0.35, ey - r * 0.45);
      g.lineTo(ex - r * 0.35, ey - r * 0.45);
      g.lineTo(ex - r * 0.45, ey - r * 0.65);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1 });
      // Shadow inside hood
      g.moveTo(ex - r * 0.2, ey - r * 0.55);
      g.lineTo(ex + r * 0.2, ey - r * 0.55);
      g.lineTo(ex + r * 0.25, ey - r * 0.45);
      g.lineTo(ex - r * 0.25, ey - r * 0.45);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.4 });

      // Eyes glowing inside hood
      g.circle(ex - 2, ey - r * 0.55, 1);
      g.fill(0xffff88);
      g.circle(ex + 2, ey - r * 0.55, 1);
      g.fill(0xffff88);

      // Left leg
      g.moveTo(ex - r * 0.3, ey + r * 0.45);
      g.lineTo(ex - r * 0.05, ey + r * 0.45);
      g.lineTo(ex - r * 0.4, ey + r * 1.15);
      g.closePath();
      g.fill({ color, alpha: 0.85 });
      // Right leg
      g.moveTo(ex + r * 0.05, ey + r * 0.45);
      g.lineTo(ex + r * 0.3, ey + r * 0.45);
      g.lineTo(ex + r * 0.4, ey + r * 1.15);
      g.closePath();
      g.fill({ color, alpha: 0.85 });

      // Quiver on back (small rectangle with 3 arrow tips poking out)
      const qx = ex + r * 0.3;
      const qy = ey - r * 0.4;
      g.rect(qx - 2, qy, 4, r * 0.8);
      g.fill(0x664422);
      g.rect(qx - 2, qy, 4, r * 0.8);
      g.stroke({ color: 0x553311, width: 0.5 });
      // Arrow tips poking out
      for (let qi = 0; qi < 3; qi++) {
        const aqx = qx - 1.5 + qi * 1.5;
        g.moveTo(aqx, qy);
        g.lineTo(aqx - 1, qy - 3);
        g.lineTo(aqx + 1, qy - 3);
        g.closePath();
        g.fill(0xcccccc);
      }

      // Recurve bow on left side (more arc segments with distinct limb tips)
      const bowCx = ex - r * 0.9;
      const br = r * 0.8;
      // Main bow curve (12 segments for smoother arc)
      for (let bi = 0; bi < 12; bi++) {
        const a1 = -Math.PI * 0.4 + (bi / 12) * Math.PI * 0.8;
        const a2 = -Math.PI * 0.4 + ((bi + 1) / 12) * Math.PI * 0.8;
        g.moveTo(bowCx + Math.cos(a1) * br, ey + Math.sin(a1) * br);
        g.lineTo(bowCx + Math.cos(a2) * br, ey + Math.sin(a2) * br);
        g.stroke({ color: 0x885533, width: 2 });
      }
      // Recurve tips (small curves at ends going outward)
      const tipLen = r * 0.2;
      const topA = -Math.PI * 0.4;
      const botA = Math.PI * 0.4;
      g.moveTo(bowCx + Math.cos(topA) * br, ey + Math.sin(topA) * br);
      g.lineTo(bowCx + Math.cos(topA) * br - tipLen * 0.3, ey + Math.sin(topA) * br - tipLen);
      g.stroke({ color: 0x885533, width: 1.5 });
      g.moveTo(bowCx + Math.cos(botA) * br, ey + Math.sin(botA) * br);
      g.lineTo(bowCx + Math.cos(botA) * br - tipLen * 0.3, ey + Math.sin(botA) * br + tipLen);
      g.stroke({ color: 0x885533, width: 1.5 });

      // Bowstring
      g.moveTo(bowCx + Math.cos(-Math.PI * 0.4) * br - tipLen * 0.3, ey + Math.sin(-Math.PI * 0.4) * br - tipLen);
      g.lineTo(bowCx + Math.cos(Math.PI * 0.4) * br - tipLen * 0.3, ey + Math.sin(Math.PI * 0.4) * br + tipLen);
      g.stroke({ color: 0xcccccc, width: 0.5 });

      // Arrow on right side (thin line with triangle tip)
      g.moveTo(ex + r * 0.2, ey);
      g.lineTo(ex + r * 1.4, ey);
      g.stroke({ color: 0x885533, width: 1 });
      // Arrow tip (small triangle)
      g.moveTo(ex + r * 1.4, ey);
      g.lineTo(ex + r * 1.6, ey - 2);
      g.lineTo(ex + r * 1.6, ey + 2);
      g.closePath();
      g.fill(0xcccccc);
      // Fletching: small V-shaped polygon at the tail end of arrow
      g.moveTo(ex + r * 0.25, ey);
      g.lineTo(ex + r * 0.1, ey - 2.5);
      g.lineTo(ex + r * 0.35, ey);
      g.closePath();
      g.fill({ color: 0xcc4444, alpha: 0.7 });
      g.moveTo(ex + r * 0.25, ey);
      g.lineTo(ex + r * 0.1, ey + 2.5);
      g.lineTo(ex + r * 0.35, ey);
      g.closePath();
      g.fill({ color: 0xcc4444, alpha: 0.7 });

    } else if (enemy.defId === "bat") {
      // --- Bat: small circle body with large triangular scalloped wings ---
      const bodyR = TS * 0.1;
      // Body (small circle)
      g.circle(ex, ey, bodyR);
      g.fill(color);
      g.circle(ex, ey, bodyR);
      g.stroke({ color: 0x000000, width: 1 });
      // Wings (two large triangles with scalloped/zigzag bottom edges)
      for (const side of [-1, 1]) {
        const wingTipX = ex + side * TS * 0.48;
        const wingTopY = ey - TS * 0.25;
        // Top edge of wing
        g.moveTo(ex + side * bodyR * 0.5, ey - bodyR * 0.5);
        g.lineTo(wingTipX, wingTopY);
        // Scalloped bottom edge (zigzag back to body)
        const scallops = 4;
        for (let si = 0; si < scallops; si++) {
          const sx = wingTipX * (1 - (si + 0.5) / scallops) + (ex + side * bodyR * 0.5) * ((si + 0.5) / scallops);
          const sy = ey + TS * 0.12 + ((si % 2 === 0) ? TS * 0.08 : 0);
          g.lineTo(sx, sy);
        }
        g.lineTo(ex + side * bodyR * 0.5, ey + bodyR * 0.3);
        g.closePath();
        g.fill({ color, alpha: 0.8 });
        g.moveTo(ex + side * bodyR * 0.5, ey - bodyR * 0.5);
        g.lineTo(wingTipX, wingTopY);
        for (let si = 0; si < scallops; si++) {
          const sx = wingTipX * (1 - (si + 0.5) / scallops) + (ex + side * bodyR * 0.5) * ((si + 0.5) / scallops);
          const sy = ey + TS * 0.12 + ((si % 2 === 0) ? TS * 0.08 : 0);
          g.lineTo(sx, sy);
        }
        g.lineTo(ex + side * bodyR * 0.5, ey + bodyR * 0.3);
        g.closePath();
        g.stroke({ color: 0x000000, width: 0.5 });
      }
      // Small eyes
      g.circle(ex - 2, ey - 1, 1);
      g.fill({ color: 0xff4444, alpha: 0.9 });
      g.circle(ex + 2, ey - 1, 1);
      g.fill({ color: 0xff4444, alpha: 0.9 });
      // Small ears
      for (const side of [-1, 1]) {
        g.moveTo(ex + side * bodyR * 0.6, ey - bodyR);
        g.lineTo(ex + side * bodyR * 1.2, ey - bodyR * 2.2);
        g.lineTo(ex + side * bodyR * 0.2, ey - bodyR * 1.1);
        g.closePath();
        g.fill(color);
      }

    } else if (enemy.defId === "fire_mage" || enemy.defId === "ice_mage") {
      // --- Fire/Ice Mage: robed figure with staff and orb ---
      const r = TS * 0.3;
      const isFire = enemy.defId === "fire_mage";
      const orbColor = isFire ? 0xff6600 : 0x44bbff;
      // Head (circle)
      g.circle(ex, ey - r * 0.85, r * 0.3);
      g.fill(color);
      g.circle(ex, ey - r * 0.85, r * 0.3);
      g.stroke({ color: 0x000000, width: 1 });
      // Robed body (trapezoid - wider at bottom)
      g.moveTo(ex - r * 0.3, ey - r * 0.55);
      g.lineTo(ex + r * 0.3, ey - r * 0.55);
      g.lineTo(ex + r * 0.6, ey + r * 1.0);
      g.lineTo(ex - r * 0.6, ey + r * 1.0);
      g.closePath();
      g.fill(color);
      g.moveTo(ex - r * 0.3, ey - r * 0.55);
      g.lineTo(ex + r * 0.3, ey - r * 0.55);
      g.lineTo(ex + r * 0.6, ey + r * 1.0);
      g.lineTo(ex - r * 0.6, ey + r * 1.0);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1 });
      // Staff (vertical line on left side)
      const staffX = ex - r * 0.75;
      const staffTop = ey - r * 1.5;
      const staffBot = ey + r * 0.8;
      g.moveTo(staffX, staffTop);
      g.lineTo(staffX, staffBot);
      g.stroke({ color: 0x885533, width: 2 });
      // Orb at top of staff
      g.circle(staffX, staffTop - 2, 3);
      g.fill({ color: orbColor, alpha: 0.9 });
      g.circle(staffX, staffTop - 2, 4);
      g.stroke({ color: orbColor, width: 1, alpha: 0.5 });
      if (isFire) {
        // Flame shapes around orb (3 small flame triangles)
        for (let fi = 0; fi < 3; fi++) {
          const fa = (fi / 3) * Math.PI * 2 - Math.PI / 2;
          const fd = 5;
          const fcx = staffX + Math.cos(fa) * fd;
          const fcy = (staffTop - 2) + Math.sin(fa) * fd;
          g.moveTo(fcx, fcy);
          g.lineTo(fcx - 1.5, fcy + 3);
          g.lineTo(fcx + 1.5, fcy + 3);
          g.closePath();
          g.fill({ color: 0xff4400, alpha: 0.7 });
          // Inner flame
          g.moveTo(fcx, fcy + 0.5);
          g.lineTo(fcx - 0.8, fcy + 2.5);
          g.lineTo(fcx + 0.8, fcy + 2.5);
          g.closePath();
          g.fill({ color: 0xffaa00, alpha: 0.8 });
        }
      } else {
        // Crystal shapes around orb (3 small diamond/crystal shapes)
        for (let ci = 0; ci < 3; ci++) {
          const ca = (ci / 3) * Math.PI * 2 - Math.PI / 2;
          const cd = 6;
          const ccx = staffX + Math.cos(ca) * cd;
          const ccy = (staffTop - 2) + Math.sin(ca) * cd;
          g.moveTo(ccx, ccy - 3);
          g.lineTo(ccx + 2, ccy);
          g.lineTo(ccx, ccy + 3);
          g.lineTo(ccx - 2, ccy);
          g.closePath();
          g.fill({ color: 0x88ddff, alpha: 0.7 });
          g.moveTo(ccx, ccy - 3);
          g.lineTo(ccx + 2, ccy);
          g.lineTo(ccx, ccy + 3);
          g.lineTo(ccx - 2, ccy);
          g.closePath();
          g.stroke({ color: 0xaaeeff, width: 0.5, alpha: 0.8 });
        }
      }
      // Eyes (glow with school color)
      g.circle(ex - 2, ey - r * 0.9, 1);
      g.fill({ color: orbColor, alpha: 0.9 });
      g.circle(ex + 2, ey - r * 0.9, 1);
      g.fill({ color: orbColor, alpha: 0.9 });

    } else if (enemy.defId === "goblin") {
      // --- Goblin: hunched, toothy, with spiked club and loincloth ---
      const r = TS * 0.3;

      // Hunched asymmetric body polygon (wider on right, slightly tilted)
      g.moveTo(ex - r * 0.45, ey - r * 0.25);
      g.lineTo(ex + r * 0.6, ey - r * 0.4);
      g.lineTo(ex + r * 0.65, ey + r * 0.5);
      g.lineTo(ex + r * 0.5, ey + r * 0.55);
      g.lineTo(ex - r * 0.5, ey + r * 0.55);
      g.lineTo(ex - r * 0.55, ey + r * 0.45);
      g.closePath();
      g.fill(color);
      g.moveTo(ex - r * 0.45, ey - r * 0.25);
      g.lineTo(ex + r * 0.6, ey - r * 0.4);
      g.lineTo(ex + r * 0.65, ey + r * 0.5);
      g.lineTo(ex + r * 0.5, ey + r * 0.55);
      g.lineTo(ex - r * 0.5, ey + r * 0.55);
      g.lineTo(ex - r * 0.55, ey + r * 0.45);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1 });

      // Warts/bumps: 3 small circles on body for texture
      g.circle(ex - r * 0.15, ey + r * 0.1, 1.3);
      g.fill({ color: 0x000000, alpha: 0.25 });
      g.circle(ex + r * 0.3, ey - r * 0.1, 1);
      g.fill({ color: 0x000000, alpha: 0.2 });
      g.circle(ex + r * 0.1, ey + r * 0.35, 1.1);
      g.fill({ color: 0x000000, alpha: 0.2 });

      // Head (slightly smaller rect on top)
      g.rect(ex - r * 0.35, ey - r * 0.75, r * 0.7, r * 0.45);
      g.fill(color);
      g.rect(ex - r * 0.35, ey - r * 0.75, r * 0.7, r * 0.45);
      g.stroke({ color: 0x000000, width: 1 });
      // Large pointed ears (two triangles)
      for (const side of [-1, 1]) {
        g.moveTo(ex + side * r * 0.35, ey - r * 0.65);
        g.lineTo(ex + side * r * 0.9, ey - r * 1.2);
        g.lineTo(ex + side * r * 0.5, ey - r * 0.35);
        g.closePath();
        g.fill(color);
        g.moveTo(ex + side * r * 0.35, ey - r * 0.65);
        g.lineTo(ex + side * r * 0.9, ey - r * 1.2);
        g.lineTo(ex + side * r * 0.5, ey - r * 0.35);
        g.closePath();
        g.stroke({ color: 0x000000, width: 0.5 });
      }

      // Short legs
      for (const side of [-1, 1]) {
        g.rect(ex + side * r * 0.2 - 2, ey + r * 0.55, 4, r * 0.4);
        g.fill({ color, alpha: 0.85 });
      }

      // Ragged loincloth polygon (3-4 irregular triangular points hanging from waist)
      g.moveTo(ex - r * 0.4, ey + r * 0.5);
      g.lineTo(ex - r * 0.3, ey + r * 0.75);
      g.lineTo(ex - r * 0.1, ey + r * 0.6);
      g.lineTo(ex + r * 0.05, ey + r * 0.8);
      g.lineTo(ex + r * 0.2, ey + r * 0.65);
      g.lineTo(ex + r * 0.35, ey + r * 0.78);
      g.lineTo(ex + r * 0.45, ey + r * 0.5);
      g.closePath();
      g.fill({ color: 0x554422, alpha: 0.8 });
      g.moveTo(ex - r * 0.4, ey + r * 0.5);
      g.lineTo(ex - r * 0.3, ey + r * 0.75);
      g.lineTo(ex - r * 0.1, ey + r * 0.6);
      g.lineTo(ex + r * 0.05, ey + r * 0.8);
      g.lineTo(ex + r * 0.2, ey + r * 0.65);
      g.lineTo(ex + r * 0.35, ey + r * 0.78);
      g.lineTo(ex + r * 0.45, ey + r * 0.5);
      g.closePath();
      g.stroke({ color: 0x443311, width: 0.5 });

      // Club weapon (thick line with circle end) on right side
      g.moveTo(ex + r * 0.55, ey - r * 0.1);
      g.lineTo(ex + r * 1.3, ey - r * 0.5);
      g.stroke({ color: 0x885533, width: 3 });
      // Club head (circle at end) with spikes
      const clubX = ex + r * 1.3;
      const clubY = ey - r * 0.5;
      g.circle(clubX, clubY, 3.5);
      g.fill(0x664422);
      g.circle(clubX, clubY, 3.5);
      g.stroke({ color: 0x553311, width: 1 });
      // Spikes on club head (small triangle polygons around the circle)
      for (let sp = 0; sp < 5; sp++) {
        const spAngle = (sp / 5) * Math.PI * 2 + 0.3;
        const spBase = 3.5;
        const spLen = 3;
        const bx1 = clubX + Math.cos(spAngle - 0.4) * spBase;
        const by1 = clubY + Math.sin(spAngle - 0.4) * spBase;
        const bx2 = clubX + Math.cos(spAngle + 0.4) * spBase;
        const by2 = clubY + Math.sin(spAngle + 0.4) * spBase;
        const tx = clubX + Math.cos(spAngle) * (spBase + spLen);
        const ty = clubY + Math.sin(spAngle) * (spBase + spLen);
        g.moveTo(bx1, by1);
        g.lineTo(tx, ty);
        g.lineTo(bx2, by2);
        g.closePath();
        g.fill(0x553311);
      }

      // Eyes (beady)
      g.circle(ex - 2, ey - r * 0.6, 1.2);
      g.fill(0xffff44);
      g.circle(ex + 2, ey - r * 0.6, 1.2);
      g.fill(0xffff44);
      // Teeth: white zigzag polygon line for the grin
      g.moveTo(ex - 4, ey - r * 0.4);
      g.lineTo(ex - 2.5, ey - r * 0.35);
      g.lineTo(ex - 1, ey - r * 0.42);
      g.lineTo(ex + 0.5, ey - r * 0.34);
      g.lineTo(ex + 2, ey - r * 0.43);
      g.lineTo(ex + 3.5, ey - r * 0.36);
      g.lineTo(ex + 4, ey - r * 0.4);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.85 });

    } else {
      // --- Unrecognized enemy: armored warrior silhouette ---
      const r = TS * 0.3;

      // Irregular warrior polygon (wider shoulders, narrower waist, armored legs)
      g.moveTo(ex, ey - r * 1.05);          // head top
      g.lineTo(ex + r * 0.35, ey - r * 0.85); // head right
      g.lineTo(ex + r * 0.8, ey - r * 0.6);  // right shoulder
      g.lineTo(ex + r * 0.7, ey - r * 0.1);  // right arm
      g.lineTo(ex + r * 0.45, ey + r * 0.1); // right waist
      g.lineTo(ex + r * 0.55, ey + r * 0.6); // right leg out
      g.lineTo(ex + r * 0.35, ey + r * 1.0); // right foot
      g.lineTo(ex + r * 0.1, ey + r * 0.7);  // inner right leg
      g.lineTo(ex - r * 0.1, ey + r * 0.7);  // inner left leg
      g.lineTo(ex - r * 0.35, ey + r * 1.0); // left foot
      g.lineTo(ex - r * 0.55, ey + r * 0.6); // left leg out
      g.lineTo(ex - r * 0.45, ey + r * 0.1); // left waist
      g.lineTo(ex - r * 0.7, ey - r * 0.1);  // left arm
      g.lineTo(ex - r * 0.8, ey - r * 0.6);  // left shoulder
      g.lineTo(ex - r * 0.35, ey - r * 0.85); // head left
      g.closePath();
      g.fill(color);
      // Re-draw for stroke
      g.moveTo(ex, ey - r * 1.05);
      g.lineTo(ex + r * 0.35, ey - r * 0.85);
      g.lineTo(ex + r * 0.8, ey - r * 0.6);
      g.lineTo(ex + r * 0.7, ey - r * 0.1);
      g.lineTo(ex + r * 0.45, ey + r * 0.1);
      g.lineTo(ex + r * 0.55, ey + r * 0.6);
      g.lineTo(ex + r * 0.35, ey + r * 1.0);
      g.lineTo(ex + r * 0.1, ey + r * 0.7);
      g.lineTo(ex - r * 0.1, ey + r * 0.7);
      g.lineTo(ex - r * 0.35, ey + r * 1.0);
      g.lineTo(ex - r * 0.55, ey + r * 0.6);
      g.lineTo(ex - r * 0.45, ey + r * 0.1);
      g.lineTo(ex - r * 0.7, ey - r * 0.1);
      g.lineTo(ex - r * 0.8, ey - r * 0.6);
      g.lineTo(ex - r * 0.35, ey - r * 0.85);
      g.closePath();
      g.stroke({ color: 0x000000, width: 1 });

      // Armor plates on torso
      for (let pi = 0; pi < 2; pi++) {
        const py = ey - r * 0.4 + pi * r * 0.4;
        g.moveTo(ex - r * 0.4, py - 2);
        g.lineTo(ex + r * 0.4, py - 3);
        g.lineTo(ex + r * 0.45, py + 1);
        g.lineTo(ex - r * 0.45, py + 2);
        g.closePath();
        g.fill({ color: 0xffffff, alpha: 0.1 });
        g.moveTo(ex - r * 0.4, py - 2);
        g.lineTo(ex + r * 0.4, py - 3);
        g.lineTo(ex + r * 0.45, py + 1);
        g.lineTo(ex - r * 0.45, py + 2);
        g.closePath();
        g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 });
      }

      // Short tattered cape polygon (3-4 ragged bottom points)
      g.moveTo(ex - r * 0.5, ey - r * 0.55);
      g.lineTo(ex + r * 0.5, ey - r * 0.55);
      g.lineTo(ex + r * 0.6, ey + r * 0.15);
      g.lineTo(ex + r * 0.4, ey + r * 0.35);
      g.lineTo(ex + r * 0.15, ey + r * 0.2);
      g.lineTo(ex - r * 0.1, ey + r * 0.38);
      g.lineTo(ex - r * 0.35, ey + r * 0.22);
      g.lineTo(ex - r * 0.6, ey + r * 0.3);
      g.closePath();
      g.fill({ color: 0x000000, alpha: 0.25 });

      // Angular visor eye slit (thin horizontal polygon)
      g.moveTo(ex - r * 0.3, ey - r * 0.88);
      g.lineTo(ex + r * 0.3, ey - r * 0.92);
      g.lineTo(ex + r * 0.28, ey - r * 0.84);
      g.lineTo(ex - r * 0.28, ey - r * 0.82);
      g.closePath();
      g.fill({ color: 0xffff88, alpha: 0.8 });

      // Halberd/spear weapon: long shaft with complex blade polygon
      const halbX = ex + r + 3;
      const halbTopY = ey - r * 1.5;
      const halbBotY = ey + r * 0.8;
      // Shaft
      g.moveTo(halbX, halbBotY);
      g.lineTo(halbX, halbTopY);
      g.stroke({ color: 0x886644, width: 2 });
      // Complex blade: axe + spike shape at top
      g.moveTo(halbX, halbTopY - 3);           // spike tip
      g.lineTo(halbX + 1.5, halbTopY);         // right of spike
      g.lineTo(halbX + 6, halbTopY + 2);       // axe blade right tip
      g.lineTo(halbX + 5, halbTopY + 5);       // axe blade bottom right
      g.lineTo(halbX + 1.5, halbTopY + 4);     // axe inner right
      g.lineTo(halbX + 1, halbTopY + 7);       // lower hook
      g.lineTo(halbX - 1, halbTopY + 7);       // lower hook left
      g.lineTo(halbX - 1.5, halbTopY + 4);     // left inner
      g.lineTo(halbX - 1.5, halbTopY);         // left of spike
      g.closePath();
      g.fill(0xcccccc);
      g.moveTo(halbX, halbTopY - 3);
      g.lineTo(halbX + 1.5, halbTopY);
      g.lineTo(halbX + 6, halbTopY + 2);
      g.lineTo(halbX + 5, halbTopY + 5);
      g.lineTo(halbX + 1.5, halbTopY + 4);
      g.lineTo(halbX + 1, halbTopY + 7);
      g.lineTo(halbX - 1, halbTopY + 7);
      g.lineTo(halbX - 1.5, halbTopY + 4);
      g.lineTo(halbX - 1.5, halbTopY);
      g.closePath();
      g.stroke({ color: 0x888888, width: 0.5 });

      // Feet: two small trapezoids below body
      for (const side of [-1, 1]) {
        const fx = ex + side * 4;
        const fy = ey + r * 0.95;
        g.moveTo(fx - 3, fy);
        g.lineTo(fx + 3, fy);
        g.lineTo(fx + 4, fy + 4);
        g.lineTo(fx - 2, fy + 4);
        g.closePath();
        g.fill({ color: 0x333333, alpha: 0.9 });
      }
    }
  }

  private _drawSummonFallback(summon: RWSummonInstance): void {
    const sx = summon.col * TS + TS / 2;
    const sy = summon.row * TS + TS / 2;
    const g = this._entityGfx;
    const r = TS * 0.32;

    // Leaf-shaped body: pointed top, curved sides, pointed bottom
    g.moveTo(sx, sy - r);
    g.lineTo(sx + r * 0.6, sy - r * 0.3);
    g.lineTo(sx + r * 0.7, sy + r * 0.15);
    g.lineTo(sx + r * 0.45, sy + r * 0.6);
    g.lineTo(sx, sy + r);
    g.lineTo(sx - r * 0.45, sy + r * 0.6);
    g.lineTo(sx - r * 0.7, sy + r * 0.15);
    g.lineTo(sx - r * 0.6, sy - r * 0.3);
    g.closePath();
    g.fill(SUMMON_COLOR);
    g.moveTo(sx, sy - r);
    g.lineTo(sx + r * 0.6, sy - r * 0.3);
    g.lineTo(sx + r * 0.7, sy + r * 0.15);
    g.lineTo(sx + r * 0.45, sy + r * 0.6);
    g.lineTo(sx, sy + r);
    g.lineTo(sx - r * 0.45, sy + r * 0.6);
    g.lineTo(sx - r * 0.7, sy + r * 0.15);
    g.lineTo(sx - r * 0.6, sy - r * 0.3);
    g.closePath();
    g.stroke({ color: 0x66ffaa, width: 1 });

    // Inner glow: 2 concentric smaller leaf shapes
    for (let layer = 0; layer < 2; layer++) {
      const sc = 0.6 - layer * 0.2;
      const alpha = 0.25 + layer * 0.2;
      g.moveTo(sx, sy - r * sc);
      g.lineTo(sx + r * 0.6 * sc, sy - r * 0.3 * sc);
      g.lineTo(sx + r * 0.7 * sc, sy + r * 0.15 * sc);
      g.lineTo(sx + r * 0.45 * sc, sy + r * 0.6 * sc);
      g.lineTo(sx, sy + r * sc);
      g.lineTo(sx - r * 0.45 * sc, sy + r * 0.6 * sc);
      g.lineTo(sx - r * 0.7 * sc, sy + r * 0.15 * sc);
      g.lineTo(sx - r * 0.6 * sc, sy - r * 0.3 * sc);
      g.closePath();
      g.fill({ color: 0xaaffcc, alpha });
    }

    // 4 petal shapes radiating from center
    for (let pi = 0; pi < 4; pi++) {
      const pa = (pi / 4) * Math.PI * 2 + Math.PI / 4;
      const pd = r * 0.55;
      const pcx = sx + Math.cos(pa) * pd;
      const pcy = sy + Math.sin(pa) * pd;
      const perpX = Math.cos(pa + Math.PI / 2);
      const perpY = Math.sin(pa + Math.PI / 2);
      const tipX = sx + Math.cos(pa) * (pd + r * 0.3);
      const tipY = sy + Math.sin(pa) * (pd + r * 0.3);
      g.moveTo(pcx + perpX * 3, pcy + perpY * 3);
      g.lineTo(tipX, tipY);
      g.lineTo(pcx - perpX * 3, pcy - perpY * 3);
      g.lineTo(sx + Math.cos(pa) * pd * 0.6, sy + Math.sin(pa) * pd * 0.6);
      g.closePath();
      g.fill({ color: 0x88ffbb, alpha: 0.5 });
    }

    // Single bright center eye
    g.circle(sx, sy, 2.5);
    g.fill({ color: 0xffffff, alpha: 0.9 });
    g.circle(sx, sy, 1.2);
    g.fill({ color: 0xccffee, alpha: 1 });

    // 3 tendrils extending downward, curving slightly
    for (let ti = 0; ti < 3; ti++) {
      const ta = Math.PI / 2 + (ti - 1) * 0.4;
      const t1x = sx + Math.cos(ta) * r * 0.5;
      const t1y = sy + Math.sin(ta) * r * 0.5;
      const t2x = sx + Math.cos(ta + 0.15) * r * 1.1;
      const t2y = sy + Math.sin(ta + 0.15) * r * 1.1;
      const t3x = sx + Math.cos(ta + 0.3) * r * 1.5;
      const t3y = sy + Math.sin(ta + 0.3) * r * 1.5;
      g.moveTo(t1x, t1y);
      g.lineTo(t2x, t2y);
      g.stroke({ color: SUMMON_COLOR, width: 1.5, alpha: 0.7 });
      g.moveTo(t2x, t2y);
      g.lineTo(t3x, t3y);
      g.stroke({ color: SUMMON_COLOR, width: 1, alpha: 0.4 });
    }
  }

  private _drawWizardFallback(state: RiftWizardState): void {
    const wx = state.wizard.col * TS + TS / 2;
    const wy = state.wizard.row * TS + TS / 2;
    const g = this._entityGfx;
    const t = this._time;

    // Magical aura: 2-3 concentric semi-transparent rings pulsing with time
    for (let ri = 0; ri < 3; ri++) {
      const auraR = TS * (0.42 + ri * 0.08);
      const auraAlpha = (0.12 - ri * 0.03) * (0.6 + 0.4 * Math.sin(t * 3 + ri * 1.5));
      g.circle(wx, wy, auraR);
      g.stroke({ color: WIZARD_COLOR, width: 1.5, alpha: auraAlpha });
    }

    // Cape/cloak: billowing polygon behind the wizard with wavy animated bottom
    const capeTopY = wy - TS * 0.10;
    const capeBotY = wy + TS * 0.40;
    const capeW = TS * 0.34;
    g.moveTo(wx - capeW * 0.5, capeTopY);
    g.lineTo(wx + capeW * 0.5, capeTopY);
    g.lineTo(wx + capeW * 0.7, capeBotY - 4);
    // Wavy bottom edge with 8 points
    const capePoints = 8;
    for (let ci = capePoints; ci >= 0; ci--) {
      const frac = ci / capePoints;
      const cpx = wx - capeW * 0.7 + frac * capeW * 1.4;
      const waveOff = Math.sin(t * 2.5 + ci * 0.9) * 2.5;
      const cpy = capeBotY + waveOff + (ci % 2 === 0 ? 1.5 : -1);
      g.lineTo(cpx, cpy);
    }
    g.closePath();
    g.fill({ color: 0x1a2266, alpha: 0.85 });
    // Cape edge highlight
    for (let ci = 0; ci <= capePoints; ci++) {
      const frac = ci / capePoints;
      const cpx = wx - capeW * 0.7 + frac * capeW * 1.4;
      const waveOff = Math.sin(t * 2.5 + ci * 0.9) * 2.5;
      const cpy = capeBotY + waveOff + (ci % 2 === 0 ? 1.5 : -1);
      if (ci === 0) g.moveTo(cpx, cpy);
      else g.lineTo(cpx, cpy);
    }
    g.stroke({ color: 0x4466aa, width: 0.7, alpha: 0.6 });

    // Inner dark robe layer (slightly narrower, darker)
    const robeTop = wy - TS * 0.12;
    const robeBot = wy + TS * 0.38;
    const topHalf = TS * 0.16;
    const botHalf = TS * 0.28;
    const innerInset = 2;
    g.moveTo(wx - topHalf + innerInset, robeTop + 1);
    g.lineTo(wx + topHalf - innerInset, robeTop + 1);
    g.lineTo(wx + botHalf - innerInset, robeBot - 1);
    g.lineTo(wx - botHalf + innerInset, robeBot - 1);
    g.closePath();
    g.fill({ color: 0x223388, alpha: 0.7 });

    // Outer robes: multi-point polygon with flowing wavy hem
    g.moveTo(wx - topHalf, robeTop);
    g.lineTo(wx + topHalf, robeTop);
    g.lineTo(wx + botHalf, robeBot - 3);
    // Wavy hem bottom edge (10 points for organic look)
    const hemPts = 10;
    for (let hi = hemPts; hi >= 0; hi--) {
      const frac = hi / hemPts;
      const hx = wx - botHalf + frac * botHalf * 2;
      const hemWave = Math.sin(t * 2 + hi * 1.2) * 1.5;
      const hy = robeBot + hemWave + (hi % 2 === 0 ? 1 : -0.5);
      g.lineTo(hx, hy);
    }
    g.closePath();
    g.fill(WIZARD_COLOR);
    // Robe outline
    g.moveTo(wx - topHalf, robeTop);
    g.lineTo(wx + topHalf, robeTop);
    g.lineTo(wx + botHalf, robeBot - 3);
    for (let hi = hemPts; hi >= 0; hi--) {
      const frac = hi / hemPts;
      const hx = wx - botHalf + frac * botHalf * 2;
      const hemWave = Math.sin(t * 2 + hi * 1.2) * 1.5;
      const hy = robeBot + hemWave + (hi % 2 === 0 ? 1 : -0.5);
      g.lineTo(hx, hy);
    }
    g.closePath();
    g.stroke({ color: 0x6699ff, width: 1 });

    // Vertical fold lines on robes
    for (let fi = -1; fi <= 1; fi++) {
      const fx = wx + fi * (topHalf * 0.5);
      const fbx = wx + fi * (botHalf * 0.5);
      g.moveTo(fx, robeTop + 2);
      g.lineTo(fbx, robeBot - 1);
      g.stroke({ color: 0x3366cc, width: 0.7, alpha: 0.4 });
    }

    // Belt: horizontal line across midsection
    const beltY = wy + TS * 0.08;
    const beltLeftX = wx - (topHalf + (botHalf - topHalf) * 0.4);
    const beltRightX = wx + (topHalf + (botHalf - topHalf) * 0.4);
    g.moveTo(beltLeftX, beltY);
    g.lineTo(beltRightX, beltY);
    g.stroke({ color: 0x886633, width: 1.5 });
    // Belt buckle polygon (small ornate octagon)
    const bkS = 2.5;
    g.moveTo(wx - bkS, beltY - bkS * 0.5);
    g.lineTo(wx - bkS * 0.5, beltY - bkS);
    g.lineTo(wx + bkS * 0.5, beltY - bkS);
    g.lineTo(wx + bkS, beltY - bkS * 0.5);
    g.lineTo(wx + bkS, beltY + bkS * 0.5);
    g.lineTo(wx + bkS * 0.5, beltY + bkS);
    g.lineTo(wx - bkS * 0.5, beltY + bkS);
    g.lineTo(wx - bkS, beltY + bkS * 0.5);
    g.closePath();
    g.fill(0xccaa44);
    g.moveTo(wx - bkS, beltY - bkS * 0.5);
    g.lineTo(wx - bkS * 0.5, beltY - bkS);
    g.lineTo(wx + bkS * 0.5, beltY - bkS);
    g.lineTo(wx + bkS, beltY - bkS * 0.5);
    g.lineTo(wx + bkS, beltY + bkS * 0.5);
    g.lineTo(wx + bkS * 0.5, beltY + bkS);
    g.lineTo(wx - bkS * 0.5, beltY + bkS);
    g.lineTo(wx - bkS, beltY + bkS * 0.5);
    g.closePath();
    g.stroke({ color: 0xeedd66, width: 0.5 });

    // Shoulders: pauldron polygons on each side (6-point armored shape)
    for (const side of [-1, 1]) {
      const shx = wx + side * topHalf;
      const shy = robeTop;
      g.moveTo(shx, shy - 1);
      g.lineTo(shx + side * 3, shy - 4);
      g.lineTo(shx + side * 6, shy - 3);
      g.lineTo(shx + side * 7, shy + 0);
      g.lineTo(shx + side * 6, shy + 3);
      g.lineTo(shx + side * 1, shy + 3);
      g.closePath();
      g.fill({ color: 0x3366bb, alpha: 0.85 });
      g.moveTo(shx, shy - 1);
      g.lineTo(shx + side * 3, shy - 4);
      g.lineTo(shx + side * 6, shy - 3);
      g.lineTo(shx + side * 7, shy + 0);
      g.lineTo(shx + side * 6, shy + 3);
      g.lineTo(shx + side * 1, shy + 3);
      g.closePath();
      g.stroke({ color: 0x6699ff, width: 0.5 });
      // Pauldron inner ridge line
      g.moveTo(shx + side * 2, shy - 2);
      g.lineTo(shx + side * 5, shy + 1);
      g.stroke({ color: 0x4477cc, width: 0.5, alpha: 0.5 });
    }

    // Face: lighter area with glowing eye dots and thin beard
    const faceY = wy - TS * 0.2;
    g.circle(wx, faceY, 5);
    g.fill({ color: 0xddccaa, alpha: 0.7 });
    // Glowing eyes
    const eyeGlow = 0.7 + 0.3 * Math.sin(t * 4);
    g.circle(wx - 2.5, faceY - 0.5, 1.2);
    g.fill({ color: 0x88ddff, alpha: eyeGlow });
    g.circle(wx + 2.5, faceY - 0.5, 1.2);
    g.fill({ color: 0x88ddff, alpha: eyeGlow });
    // Thin beard: 3 small downward lines
    for (let bi = -1; bi <= 1; bi++) {
      g.moveTo(wx + bi * 1.5, faceY + 3);
      g.lineTo(wx + bi * 1.8, faceY + 6);
      g.stroke({ color: 0xaaaaaa, width: 0.6, alpha: 0.5 });
    }

    // Hat: pointed wizard hat with curved brim arc, hat band, star buckle
    const hatBrimY = wy - TS * 0.28;
    const hatTipY = wy - TS * 0.62;
    // Curved brim (arc of small segments instead of flat line)
    const brimHalf = TS * 0.28;
    const brimSegs = 10;
    g.moveTo(wx - brimHalf, hatBrimY);
    for (let bi = 1; bi <= brimSegs; bi++) {
      const frac = bi / brimSegs;
      const bx = wx - brimHalf + frac * brimHalf * 2;
      const by = hatBrimY - Math.sin(frac * Math.PI) * 2;
      g.lineTo(bx, by);
    }
    g.stroke({ color: WIZARD_COLOR, width: 2.5 });
    // Hat cone body
    g.moveTo(wx + 2, hatTipY);
    g.lineTo(wx + TS * 0.18, hatBrimY);
    g.lineTo(wx - TS * 0.18, hatBrimY);
    g.closePath();
    g.fill(WIZARD_COLOR);
    g.moveTo(wx + 2, hatTipY);
    g.lineTo(wx + TS * 0.18, hatBrimY);
    g.lineTo(wx - TS * 0.18, hatBrimY);
    g.closePath();
    g.stroke({ color: 0x6699ff, width: 1 });
    // Hat band
    const bandY = hatBrimY - 3;
    g.moveTo(wx - TS * 0.14, bandY);
    g.lineTo(wx + TS * 0.14, bandY);
    g.stroke({ color: 0x886633, width: 2 });
    // Star buckle polygon on hat band (6-point star polygon)
    const starCx = wx;
    const starCy = bandY;
    const starOuter = 3;
    const starInner = 1.4;
    g.moveTo(starCx, starCy - starOuter);
    for (let si = 1; si < 12; si++) {
      const sa = (si / 12) * Math.PI * 2 - Math.PI / 2;
      const sr = si % 2 === 0 ? starOuter : starInner;
      g.lineTo(starCx + Math.cos(sa) * sr, starCy + Math.sin(sa) * sr);
    }
    g.closePath();
    g.fill(0xffff88);
    g.moveTo(starCx, starCy - starOuter);
    for (let si = 1; si < 12; si++) {
      const sa = (si / 12) * Math.PI * 2 - Math.PI / 2;
      const sr = si % 2 === 0 ? starOuter : starInner;
      g.lineTo(starCx + Math.cos(sa) * sr, starCy + Math.sin(sa) * sr);
    }
    g.closePath();
    g.stroke({ color: 0xffdd44, width: 0.4 });

    // Staff: vertical line with ornate crescent moon + glowing faceted gem
    const staffBaseX = wx - topHalf - 3;
    const staffBaseY = robeBot - 2;
    const staffTopX = wx - topHalf - 3;
    const staffTopY = wy - TS * 0.58;
    // Staff shaft
    g.moveTo(staffBaseX, staffBaseY);
    g.lineTo(staffTopX, staffTopY);
    g.stroke({ color: 0x886644, width: 2.5 });
    // Staff shaft highlight
    g.moveTo(staffBaseX + 1, staffBaseY);
    g.lineTo(staffTopX + 1, staffTopY + 2);
    g.stroke({ color: 0xaa8866, width: 0.5, alpha: 0.4 });

    // Crescent moon polygon at staff top
    const moonCx = staffTopX;
    const moonCy = staffTopY - 3;
    const moonR = 5;
    // Outer arc of crescent (left side)
    g.moveTo(moonCx, moonCy - moonR);
    for (let mi = 1; mi <= 8; mi++) {
      const ma = -Math.PI / 2 + (mi / 8) * Math.PI;
      g.lineTo(moonCx + Math.cos(ma) * moonR, moonCy + Math.sin(ma) * moonR);
    }
    // Inner arc (makes it a crescent)
    for (let mi = 8; mi >= 0; mi--) {
      const ma = -Math.PI / 2 + (mi / 8) * Math.PI;
      g.lineTo(moonCx + Math.cos(ma) * moonR * 0.5 + moonR * 0.3, moonCy + Math.sin(ma) * moonR * 0.7);
    }
    g.closePath();
    g.fill({ color: 0xccddff, alpha: 0.85 });
    g.moveTo(moonCx, moonCy - moonR);
    for (let mi = 1; mi <= 8; mi++) {
      const ma = -Math.PI / 2 + (mi / 8) * Math.PI;
      g.lineTo(moonCx + Math.cos(ma) * moonR, moonCy + Math.sin(ma) * moonR);
    }
    for (let mi = 8; mi >= 0; mi--) {
      const ma = -Math.PI / 2 + (mi / 8) * Math.PI;
      g.lineTo(moonCx + Math.cos(ma) * moonR * 0.5 + moonR * 0.3, moonCy + Math.sin(ma) * moonR * 0.7);
    }
    g.closePath();
    g.stroke({ color: 0x88aaff, width: 0.5 });

    // Faceted diamond gem at center of crescent
    const gemCx = moonCx + 1;
    const gemCy = moonCy;
    g.moveTo(gemCx, gemCy - 3.5);
    g.lineTo(gemCx + 2.5, gemCy - 1);
    g.lineTo(gemCx + 2.5, gemCy + 1);
    g.lineTo(gemCx, gemCy + 3.5);
    g.lineTo(gemCx - 2.5, gemCy + 1);
    g.lineTo(gemCx - 2.5, gemCy - 1);
    g.closePath();
    g.fill({ color: 0xaaddff, alpha: 0.9 });
    // Gem facet lines
    g.moveTo(gemCx, gemCy - 3.5);
    g.lineTo(gemCx, gemCy + 3.5);
    g.stroke({ color: 0xffffff, width: 0.3, alpha: 0.4 });
    g.moveTo(gemCx - 2.5, gemCy);
    g.lineTo(gemCx + 2.5, gemCy);
    g.stroke({ color: 0xffffff, width: 0.3, alpha: 0.3 });
    // Gem glow
    const crystalGlow = 0.3 + 0.3 * Math.sin(t * 5);
    g.circle(gemCx, gemCy, 5);
    g.fill({ color: 0x88ccff, alpha: crystalGlow });
  }

  private _drawEntityOverlays(state: RiftWizardState): void {
    const g = this._entityGfx;

    // HP bars for all entities
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      this._drawHpBar(enemy.col * TS, enemy.row * TS - 5, enemy.hp, enemy.maxHp);

      // Stun indicator: chain-link shapes around the entity
      if (enemy.stunTurns > 0) {
        const ex = enemy.col * TS + TS / 2;
        const ey = enemy.row * TS + TS / 2;
        const chainR = TS * 0.38;
        const numLinks = 8;
        for (let i = 0; i < numLinks; i++) {
          const a = (i / numLinks) * Math.PI * 2 + this._time * 1.5;
          const lx = ex + Math.cos(a) * chainR;
          const ly = ey + Math.sin(a) * chainR;
          // Each chain link is a small oval (two arcs approximated as an ellipse)
          const ovalW = 4;
          const ovalH = 2.5;
          const cosA = Math.cos(a);
          const sinA = Math.sin(a);
          // Draw oval aligned tangent to circle (6-point polygon approximation)
          for (let oi = 0; oi <= 6; oi++) {
            const oa = (oi / 6) * Math.PI * 2;
            const ox = Math.cos(oa) * ovalW;
            const oy = Math.sin(oa) * ovalH;
            // Rotate oval to be tangent
            const rx = ox * (-sinA) - oy * cosA;
            const ry = ox * cosA + oy * (-sinA);
            if (oi === 0) g.moveTo(lx + rx, ly + ry);
            else g.lineTo(lx + rx, ly + ry);
          }
          g.closePath();
          g.stroke({ color: 0x88ccff, width: 1.5, alpha: 0.7 });
        }
        // Stars above head for stun (keep original)
        for (let i = 0; i < 3; i++) {
          const angle = this._time * 3 + (i * Math.PI * 2 / 3);
          const dx = Math.cos(angle) * 6;
          const dy = Math.sin(angle) * 3;
          g.star(ex + dx, ey - TS * 0.45 + dy, 4, 2, 1);
          g.fill({ color: 0xffff44, alpha: 0.8 });
        }
      }

      // Burn indicator: small flame shapes near enemies with stunTurns (as a proxy for status)
      if (enemy.stunTurns > 0) {
        const ex = enemy.col * TS + TS / 2;
        const ey = enemy.row * TS + TS / 2;
        const flicker = 0.6 + 0.4 * Math.sin(this._time * 8);
        for (let fi = 0; fi < 2; fi++) {
          const fx = ex + (fi === 0 ? -TS * 0.35 : TS * 0.35);
          const fy = ey + TS * 0.1;
          // Flame polygon: teardrop shape
          g.moveTo(fx, fy - 5 * flicker);
          g.lineTo(fx + 2.5, fy - 1);
          g.lineTo(fx + 2, fy + 3);
          g.lineTo(fx, fy + 4);
          g.lineTo(fx - 2, fy + 3);
          g.lineTo(fx - 2.5, fy - 1);
          g.closePath();
          g.fill({ color: 0xff6622, alpha: 0.5 * flicker });
          // Inner flame
          g.moveTo(fx, fy - 3 * flicker);
          g.lineTo(fx + 1.2, fy);
          g.lineTo(fx, fy + 2);
          g.lineTo(fx - 1.2, fy);
          g.closePath();
          g.fill({ color: 0xffcc44, alpha: 0.6 * flicker });
        }
      }
    }

    for (const summon of state.level.summons) {
      if (!summon.alive) continue;
      this._drawHpBar(summon.col * TS, summon.row * TS - 5, summon.hp, summon.maxHp);
    }

    // Wizard HP bar
    this._drawHpBar(state.wizard.col * TS, state.wizard.row * TS - 7, state.wizard.hp, state.wizard.maxHp);

    // Shield indicator: hexagonal shield pattern (6 segments) with faceted look
    if (state.wizard.shields > 0) {
      const wx = state.wizard.col * TS + TS / 2;
      const wy = state.wizard.row * TS + TS / 2;
      const pulse = 0.6 + 0.4 * Math.sin(this._time * 4);
      const shieldR = TS * 0.42;

      // Outer hex outline
      g.moveTo(wx + shieldR, wy);
      for (let i = 1; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.lineTo(wx + Math.cos(a) * shieldR, wy + Math.sin(a) * shieldR);
      }
      g.closePath();
      g.stroke({ color: 0x44ddff, width: 2, alpha: pulse * 0.7 });

      // 6 faceted segments: lines from center to each vertex
      for (let i = 0; i < 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.moveTo(wx, wy);
        g.lineTo(wx + Math.cos(a) * shieldR, wy + Math.sin(a) * shieldR);
        g.stroke({ color: 0x44ddff, width: 1, alpha: pulse * 0.35 });
      }

      // Inner hex for faceted depth
      const innerR = shieldR * 0.6;
      g.moveTo(wx + innerR, wy);
      for (let i = 1; i <= 6; i++) {
        const a = (i / 6) * Math.PI * 2;
        g.lineTo(wx + Math.cos(a) * innerR, wy + Math.sin(a) * innerR);
      }
      g.closePath();
      g.stroke({ color: 0x44ddff, width: 1, alpha: pulse * 0.4 });

      // Shield count indicator dots
      for (let si = 0; si < Math.min(state.wizard.shields, 5); si++) {
        const sa = (si / 5) * Math.PI * 2 - Math.PI / 2;
        g.circle(wx + Math.cos(sa) * (shieldR + 4), wy + Math.sin(sa) * (shieldR + 4), 1.5);
        g.fill({ color: 0x88eeff, alpha: pulse });
      }
    }
  }

  private _drawHpBar(x: number, y: number, hp: number, maxHp: number): void {
    const g = this._entityGfx;
    const barWidth = TS - 4;
    const barHeight = 4;
    const ratio = Math.max(0, hp / maxHp);
    const bx = x + 2;

    // Background with border
    g.rect(bx, y, barWidth, barHeight);
    g.fill(0x1a0000);
    g.rect(bx, y, barWidth, barHeight);
    g.stroke({ color: 0x333333, width: 0.5 });

    // Fill with gradient-like effect
    const color = ratio > 0.6 ? 0x00cc00 : ratio > 0.3 ? 0xcccc00 : 0xcc0000;
    const fillW = barWidth * ratio;
    if (fillW > 0) {
      g.rect(bx, y, fillW, barHeight);
      g.fill(color);
    }

    // Beveled 3D look: bright line on top edge, dark line on bottom edge
    if (fillW > 0) {
      g.moveTo(bx, y);
      g.lineTo(bx + fillW, y);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.35 });
      g.moveTo(bx, y + barHeight);
      g.lineTo(bx + fillW, y + barHeight);
      g.stroke({ color: 0x000000, width: 1, alpha: 0.4 });
    }

    // Tick marks at 25%, 50%, 75%
    for (const pct of [0.25, 0.5, 0.75]) {
      const tx = bx + barWidth * pct;
      g.moveTo(tx, y);
      g.lineTo(tx, y + barHeight);
      g.stroke({ color: 0x000000, width: 0.5, alpha: 0.5 });
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
  // Status effect overlays (drawn on top of sprites)
  // -------------------------------------------------------------------------

  private _drawStatusOverlays(state: RiftWizardState): void {
    this._statusOverlayGfx.clear();
    const g = this._statusOverlayGfx;

    // Enemy status effect visuals
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      const cx = enemy.col * TS + TS / 2;
      const cy = enemy.row * TS + TS / 2;
      const ex = enemy.col * TS;
      const ey = enemy.row * TS;

      // Frozen / stunned: blue tint overlay + ice crystal shapes
      if (enemy.stunTurns > 0 || enemy.statusEffects.some(e => e.type === "freeze" && e.turnsRemaining > 0)) {
        // Blue tint overlay on the tile
        g.rect(ex + 1, ey + 1, TS - 2, TS - 2);
        g.fill({ color: 0x4488ff, alpha: 0.18 });
        // Ice crystal diamond shapes around the enemy
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 + this._time * 0.8;
          const dist = TS * 0.38;
          const dx = cx + Math.cos(angle) * dist;
          const dy = cy + Math.sin(angle) * dist;
          const cSize = 3 + Math.sin(this._time * 2 + i) * 0.5;
          // Diamond shape
          g.moveTo(dx, dy - cSize);
          g.lineTo(dx + cSize * 0.6, dy);
          g.lineTo(dx, dy + cSize);
          g.lineTo(dx - cSize * 0.6, dy);
          g.closePath();
          g.fill({ color: 0x88ccff, alpha: 0.6 });
          g.moveTo(dx, dy - cSize);
          g.lineTo(dx + cSize * 0.6, dy);
          g.lineTo(dx, dy + cSize);
          g.lineTo(dx - cSize * 0.6, dy);
          g.closePath();
          g.stroke({ color: 0xaaddff, width: 0.5, alpha: 0.8 });
        }
      }

      // Burn status: orange/red flickering overlay + flame particles
      if (enemy.statusEffects.some(e => e.type === "burn" && e.turnsRemaining > 0)) {
        const flicker = 0.1 + 0.08 * Math.sin(this._time * 7 + enemy.col * 2.3);
        // Orange-red flickering overlay
        g.rect(ex + 1, ey + 1, TS - 2, TS - 2);
        g.fill({ color: 0xff4400, alpha: flicker });
        // Small flame triangles (2-3)
        for (let i = 0; i < 3; i++) {
          const fx = cx + (i - 1) * 7;
          const fBaseY = cy + TS * 0.25;
          const fh = 6 + Math.sin(this._time * 9 + i * 2.5) * 3;
          // Outer flame (orange)
          g.moveTo(fx - 2.5, fBaseY);
          g.lineTo(fx, fBaseY - fh);
          g.lineTo(fx + 2.5, fBaseY);
          g.closePath();
          g.fill({ color: 0xff6600, alpha: 0.55 });
          // Inner flame (yellow)
          g.moveTo(fx - 1.2, fBaseY);
          g.lineTo(fx, fBaseY - fh * 0.6);
          g.lineTo(fx + 1.2, fBaseY);
          g.closePath();
          g.fill({ color: 0xffcc00, alpha: 0.65 });
        }
      }

      // Poison status: green tint + bubble circles
      if (enemy.statusEffects.some(e => e.type === "poison" && e.turnsRemaining > 0)) {
        // Green tint overlay
        g.rect(ex + 1, ey + 1, TS - 2, TS - 2);
        g.fill({ color: 0x33cc33, alpha: 0.12 });
        // Green bubble circles
        for (let i = 0; i < 4; i++) {
          const bx = cx + Math.cos(this._time * 1.5 + i * 1.7) * TS * 0.28;
          const by = cy + Math.sin(this._time * 1.2 + i * 2.1) * TS * 0.28 - Math.abs(Math.sin(this._time * 2.5 + i)) * 4;
          const br = 1.5 + Math.sin(this._time * 3 + i) * 0.5;
          g.circle(bx, by, br);
          g.stroke({ color: 0x66ff66, width: 1, alpha: 0.55 });
          // Highlight on bubble
          g.circle(bx - 0.5, by - 0.5, br * 0.3);
          g.fill({ color: 0xaaffaa, alpha: 0.4 });
        }
      }
    }

    // Wizard shield: blue glowing circle
    if (state.wizard.shields > 0 || state.wizard.statusEffects.some(e => e.type === "shield" && e.turnsRemaining > 0)) {
      const wx = state.wizard.col * TS + TS / 2;
      const wy = state.wizard.row * TS + TS / 2;
      const pulse = 0.5 + 0.3 * Math.sin(this._time * 3);
      // Outer glow ring
      g.circle(wx, wy, TS * 0.52);
      g.fill({ color: 0x4488ff, alpha: pulse * 0.08 });
      g.circle(wx, wy, TS * 0.48);
      g.stroke({ color: 0x44aaff, width: 2.5, alpha: pulse * 0.5 });
      // Inner glow ring
      g.circle(wx, wy, TS * 0.42);
      g.stroke({ color: 0x88ccff, width: 1, alpha: pulse * 0.35 });
    }
  }

  // -------------------------------------------------------------------------
  // Telegraphed tiles: pulsing warning indicators
  // -------------------------------------------------------------------------

  private _drawTelegraphedTiles(state: RiftWizardState): void {
    this._telegraphGfx.clear();
    const g = this._telegraphGfx;

    if (!state.telegraphedTiles || state.telegraphedTiles.length === 0) return;

    for (const tile of state.telegraphedTiles) {
      const tx = tile.col * TS;
      const ty = tile.row * TS;
      const cx = tx + TS / 2;
      // Alpha based on turnDelay: more opaque = about to trigger
      const urgency = Math.max(0.2, 1 - (tile.turnDelay - 1) * 0.25);
      const pulseRate = 3 + (1 - urgency) * 2; // faster pulse when about to trigger
      const pulse = 0.5 + 0.5 * Math.sin(this._time * pulseRate);
      const baseAlpha = urgency * 0.5 * pulse;

      // Red/orange pulsing rectangle
      g.rect(tx + 1, ty + 1, TS - 2, TS - 2);
      g.fill({ color: 0xff4400, alpha: baseAlpha * 0.4 });
      g.rect(tx + 1, ty + 1, TS - 2, TS - 2);
      g.stroke({ color: 0xff6622, width: 1.5, alpha: baseAlpha * 0.7 });

      // Inner pulsing rect
      g.rect(tx + 3, ty + 3, TS - 6, TS - 6);
      g.fill({ color: 0xff8800, alpha: baseAlpha * 0.25 });

      // Warning "!" icon above the tile
      const iconY = ty - 6;
      const iconAlpha = urgency * (0.6 + 0.4 * pulse);

      // Exclamation mark background circle
      g.circle(cx, iconY, 5);
      g.fill({ color: 0xff2200, alpha: iconAlpha * 0.7 });

      // "!" stem (vertical line)
      g.rect(cx - 1, iconY - 3.5, 2, 4.5);
      g.fill({ color: 0xffffff, alpha: iconAlpha });
      // "!" dot
      g.circle(cx, iconY + 2.5, 0.8);
      g.fill({ color: 0xffffff, alpha: iconAlpha });

      // School-colored corner accents if school is defined
      if (tile.school) {
        const schoolColor = SCHOOL_COLORS[tile.school] ?? 0xff4400;
        // Small corner diamonds
        const corners = [
          { x: tx + 3, y: ty + 3 },
          { x: tx + TS - 3, y: ty + 3 },
          { x: tx + 3, y: ty + TS - 3 },
          { x: tx + TS - 3, y: ty + TS - 3 },
        ];
        for (const c of corners) {
          g.moveTo(c.x, c.y - 2);
          g.lineTo(c.x + 1.5, c.y);
          g.lineTo(c.x, c.y + 2);
          g.lineTo(c.x - 1.5, c.y);
          g.closePath();
          g.fill({ color: schoolColor, alpha: baseAlpha * 0.8 });
        }
      }
    }
  }

  // -------------------------------------------------------------------------
  // Spell preview (targeting mode enhancements)
  // -------------------------------------------------------------------------

  private _drawSpellPreview(state: RiftWizardState): void {
    if (state.phase !== RWPhase.TARGETING) return;
    if (state.selectedSpellIndex < 0) return;

    const spell = state.spells[state.selectedSpellIndex];
    if (!spell) return;

    const spellDef = SPELL_DEFS[spell.defId];
    if (!spellDef) return;

    const g = this._cursorGfx;
    const tc = state.targetCursor;
    const wizCol = state.wizard.col;
    const wizRow = state.wizard.row;
    const wizX = wizCol * TS + TS / 2;
    const wizY = wizRow * TS + TS / 2;
    const spellColor = SCHOOL_COLORS[spell.school] ?? 0xff4444;

    // Range ring around the wizard (circle outline showing max spell range)
    const rangePixels = spell.range * TS;
    if (spell.range > 0) {
      g.circle(wizX, wizY, rangePixels);
      g.stroke({ color: spellColor, width: 1.5, alpha: 0.2 });
      // Dashed inner ring for clarity
      const dashCount = 24;
      for (let i = 0; i < dashCount; i += 2) {
        const a1 = (i / dashCount) * Math.PI * 2;
        const a2 = ((i + 1) / dashCount) * Math.PI * 2;
        g.moveTo(wizX + Math.cos(a1) * (rangePixels - 2), wizY + Math.sin(a1) * (rangePixels - 2));
        g.lineTo(wizX + Math.cos(a2) * (rangePixels - 2), wizY + Math.sin(a2) * (rangePixels - 2));
        g.stroke({ color: spellColor, width: 1, alpha: 0.12 });
      }
    }

    // Tint valid/invalid target tiles
    if (tc) {
      const distToCursor = Math.abs(tc.col - wizCol) + Math.abs(tc.row - wizRow);
      const inRange = distToCursor <= spell.range && (spell.range > 0 || distToCursor === 0);
      // Tint the target tile
      const tintColor = inRange ? 0x44ff44 : 0xff4444;
      g.rect(tc.col * TS + 1, tc.row * TS + 1, TS - 2, TS - 2);
      g.fill({ color: tintColor, alpha: 0.12 });
    }

    if (!tc) return;

    const mechanic = spellDef.mechanic;

    // AoE radius highlighted tiles (semi-transparent yellow/orange circles)
    if (spell.aoeRadius > 0 && (mechanic === "projectile_aoe" || mechanic === "global_aoe" || mechanic === "aoe_slow" || mechanic === "aoe_knockback")) {
      for (let dr = -spell.aoeRadius; dr <= spell.aoeRadius; dr++) {
        for (let dc = -spell.aoeRadius; dc <= spell.aoeRadius; dc++) {
          if (Math.abs(dr) + Math.abs(dc) > spell.aoeRadius) continue;
          const hx = (tc.col + dc) * TS + TS / 2;
          const hy = (tc.row + dr) * TS + TS / 2;
          // Semi-transparent yellow/orange circle
          g.circle(hx, hy, TS * 0.4);
          g.fill({ color: 0xffaa33, alpha: 0.12 });
          g.circle(hx, hy, TS * 0.38);
          g.stroke({ color: 0xffcc44, width: 1, alpha: 0.2 });
        }
      }
    }

    // Chain spells: draw connector lines showing potential bounce paths to nearby enemies
    if (mechanic === "chain" && spell.maxBounces > 0) {
      const aliveEnemies = state.level.enemies.filter(e => e.alive);
      // Find enemies within range from the cursor as potential starting targets
      let chainTarget: { col: number; row: number } | null = null;
      for (const enemy of aliveEnemies) {
        if (enemy.col === tc.col && enemy.row === tc.row) {
          chainTarget = { col: enemy.col, row: enemy.row };
          break;
        }
      }
      if (chainTarget) {
        const visited = new Set<number>();
        visited.add(chainTarget.col * 1000 + chainTarget.row);
        let current = chainTarget;
        let bounces = 0;
        while (bounces < spell.maxBounces) {
          // Find nearest unvisited enemy
          let nearest: { col: number; row: number; dist: number } | null = null;
          for (const enemy of aliveEnemies) {
            const key = enemy.col * 1000 + enemy.row;
            if (visited.has(key)) continue;
            const d = Math.abs(enemy.col - current.col) + Math.abs(enemy.row - current.row);
            if (d <= (spell.range || 5) && (!nearest || d < nearest.dist)) {
              nearest = { col: enemy.col, row: enemy.row, dist: d };
            }
          }
          if (!nearest) break;
          // Draw connector line
          const fromPx = current.col * TS + TS / 2;
          const fromPy = current.row * TS + TS / 2;
          const toPx = nearest.col * TS + TS / 2;
          const toPy = nearest.row * TS + TS / 2;

          // Dashed line with lightning-like zigzag
          const segments = 4;
          let lx = fromPx, ly = fromPy;
          for (let s = 1; s <= segments; s++) {
            const frac = s / segments;
            let nx = fromPx + (toPx - fromPx) * frac;
            let ny = fromPy + (toPy - fromPy) * frac;
            if (s < segments) {
              nx += (Math.random() - 0.5) * 6;
              ny += (Math.random() - 0.5) * 6;
            }
            g.moveTo(lx, ly);
            g.lineTo(nx, ny);
            g.stroke({ color: spellColor, width: 1, alpha: 0.3 });
            lx = nx;
            ly = ny;
          }

          // Small circle at bounce target
          g.circle(toPx, toPy, 4);
          g.stroke({ color: spellColor, width: 1, alpha: 0.4 });

          visited.add(nearest.col * 1000 + nearest.row);
          current = { col: nearest.col, row: nearest.row };
          bounces++;
        }
      }
    }

    // Cone spells: highlight the cone area
    if (mechanic === "cone") {
      const dx = tc.col - wizCol;
      const dy = tc.row - wizRow;
      const angle = Math.atan2(dy, dx);
      const coneHalfAngle = Math.PI / 4; // 45 degree half-angle
      const coneRange = spell.range || 3;

      for (let row = 0; row < state.level.height; row++) {
        for (let col = 0; col < state.level.width; col++) {
          const tdx = col - wizCol;
          const tdy = row - wizRow;
          const dist = Math.abs(tdx) + Math.abs(tdy);
          if (dist === 0 || dist > coneRange) continue;
          const tileAngle = Math.atan2(tdy, tdx);
          let angleDiff = tileAngle - angle;
          // Normalize to -PI..PI
          while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
          while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
          if (Math.abs(angleDiff) <= coneHalfAngle) {
            const hx = col * TS + TS / 2;
            const hy = row * TS + TS / 2;
            g.circle(hx, hy, TS * 0.35);
            g.fill({ color: spellColor, alpha: 0.12 });
          }
        }
      }
    }
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

    // Danger zone highlighting - show tiles enemies can attack
    for (const enemy of state.level.enemies) {
      if (!enemy.alive) continue;
      const attackRange = enemy.range ?? 1;
      // Only highlight if wizard is potentially in danger
      const distToWiz = Math.abs(enemy.col - state.wizard.col) + Math.abs(enemy.row - state.wizard.row);
      if (distToWiz <= attackRange + 3) { // Only nearby threats
        // Highlight enemy's attack range tiles
        for (let dr = -attackRange; dr <= attackRange; dr++) {
          for (let dc = -attackRange; dc <= attackRange; dc++) {
            if (Math.abs(dr) + Math.abs(dc) > attackRange) continue;
            const tr = enemy.row + dr;
            const tc2 = enemy.col + dc;
            if (tr < 0 || tc2 < 0 || tr >= state.level.height || tc2 >= state.level.width) continue;
            this._cursorGfx.rect(tc2 * TS + 1, tr * TS + 1, TS - 2, TS - 2);
            this._cursorGfx.fill({ color: 0xff0000, alpha: 0.03 });
          }
        }
      }
    }

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

    // Damage preview on enemies in AoE
    if (spell.aoeRadius > 0) {
      for (const enemy of state.level.enemies) {
        if (!enemy.alive) continue;
        const dist = Math.abs(enemy.col - tc.col) + Math.abs(enemy.row - tc.row);
        if (dist <= spell.aoeRadius) {
          // Ghost damage number
          const previewX = enemy.col * TS + TS / 2;
          const previewY = enemy.row * TS - 8;
          this._cursorGfx.circle(previewX, previewY, 8);
          this._cursorGfx.fill({ color: 0x000000, alpha: 0.5 });
          // Draw damage amount as simple tally marks (small lines)
          const dmg = spell.damage;
          const digits = dmg.toString();
          // Draw each digit as a pattern of small dots
          for (let d = 0; d < digits.length; d++) {
            const digit = parseInt(digits[d]);
            const dx = previewX - (digits.length * 3) + d * 6;
            // Simple dot pattern for the digit
            for (let dot = 0; dot < Math.min(digit, 5); dot++) {
              this._cursorGfx.circle(dx + dot * 1.5, previewY - 1, 0.8);
              this._cursorGfx.fill({ color: spellColor, alpha: 0.7 });
            }
            if (digit > 5) {
              for (let dot = 0; dot < digit - 5; dot++) {
                this._cursorGfx.circle(dx + dot * 1.5, previewY + 2, 0.8);
                this._cursorGfx.fill({ color: spellColor, alpha: 0.7 });
              }
            }
          }
        }
      }
    } else {
      // Single target preview
      for (const enemy of state.level.enemies) {
        if (!enemy.alive) continue;
        if (enemy.col === tc.col && enemy.row === tc.row) {
          const previewX = enemy.col * TS + TS / 2;
          const previewY = enemy.row * TS - 10;
          // Damage indicator circle
          this._cursorGfx.circle(previewX, previewY, 8);
          this._cursorGfx.fill({ color: 0x000000, alpha: 0.5 });
          this._cursorGfx.circle(previewX, previewY, 6);
          this._cursorGfx.stroke({ color: spellColor, width: 1, alpha: 0.6 });
          // Crosshair on target
          this._cursorGfx.moveTo(previewX - 4, previewY);
          this._cursorGfx.lineTo(previewX + 4, previewY);
          this._cursorGfx.stroke({ color: spellColor, width: 1, alpha: 0.8 });
          this._cursorGfx.moveTo(previewX, previewY - 4);
          this._cursorGfx.lineTo(previewX, previewY + 4);
          this._cursorGfx.stroke({ color: spellColor, width: 1, alpha: 0.8 });
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
        // Add appropriate ground decals based on animation type
        if (event.type === RWAnimationType.FIREBALL) {
          this.addGroundDecal(event.toCol, event.toRow, "scorch", 0x331100);
        } else if (event.type === RWAnimationType.ICE_BALL || event.type === RWAnimationType.FROST_BREATH) {
          this.addGroundDecal(event.toCol, event.toRow, "ice_patch", 0x44aaff);
        } else if (event.type === RWAnimationType.EARTHQUAKE) {
          // Add cracks around the epicenter
          for (let dr = -1; dr <= 1; dr++) {
            for (let dc = -1; dc <= 1; dc++) {
              if (Math.random() < 0.5) {
                this.addGroundDecal(event.fromCol + dc, event.fromRow + dr, "crack", 0x443322, 8);
              }
            }
          }
        } else if (event.type === RWAnimationType.DEATH) {
          this.addGroundDecal(event.fromCol, event.fromRow, "blood", 0x660000, 6);
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
    let writeIdx = 0;
    for (let i = 0; i < this._particles.length; i++) {
      const p = this._particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) continue; // skip dead particles
      const alpha = p.life / p.maxLife;
      this._fxParticleGfx.circle(p.x, p.y, p.size * alpha);
      this._fxParticleGfx.fill({ color: p.color, alpha });
      // Compact: move live particle to writeIdx
      if (writeIdx !== i) {
        this._particles[writeIdx] = p;
      }
      writeIdx++;
    }
    this._particles.length = writeIdx; // trim dead ones in O(1)
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
        const isFire = event.type === RWAnimationType.FIREBALL;
        const color = isFire ? 0xff6600 : 0x44bbff;
        const trailColor = isFire ? 0xff3300 : 0x2288cc;
        const accentColor = isFire ? 0xffaa22 : 0xaaddff;
        if (t < 0.5) {
          const pt = t * 2;
          const px = fromX + (toX - fromX) * pt;
          const py = fromY + (toY - fromY) * pt;
          // Extended trail with 5 segments
          for (let j = 0; j < 5; j++) {
            const tt = Math.max(0, pt - j * 0.08);
            const tx = fromX + (toX - fromX) * tt;
            const ty = fromY + (toY - fromY) * tt;
            this._fxGfx.circle(tx, ty, 3.5 - j * 0.6);
            this._fxGfx.fill({ color: trailColor, alpha: (1 - j * 0.18) * 0.5 });
          }
          // Smoke trail behind projectile (fire) / frost spiral trail (ice)
          for (let st = 0; st < 4; st++) {
            const sTT = Math.max(0, pt - st * 0.06 - 0.04);
            const stx = fromX + (toX - fromX) * sTT;
            const sty = fromY + (toY - fromY) * sTT;
            const spiralAngle = pt * Math.PI * 8 + st * Math.PI * 0.5;
            const spiralR = isFire ? 3 + st * 0.8 : 5 + st * 1.2;
            const sox = stx + Math.cos(spiralAngle) * spiralR;
            const soy = sty + Math.sin(spiralAngle) * spiralR;
            this._fxGfx.circle(sox, soy, isFire ? 2 - st * 0.3 : 1.5);
            this._fxGfx.fill({ color: isFire ? 0x555555 : 0xaaddff, alpha: (0.35 - st * 0.07) });
          }
          // Projectile with glow
          this._fxGfx.circle(px, py, 6);
          this._fxGfx.fill({ color, alpha: 0.3 });
          this._fxGfx.circle(px, py, 4);
          this._fxGfx.fill(color);
          this._fxGfx.circle(px, py, 2);
          this._fxGfx.fill(0xffffff);
          // Rotating polygon ring: 5 small triangles orbiting the projectile
          for (let ri = 0; ri < 5; ri++) {
            const orbitAngle = (ri / 5) * Math.PI * 2 + pt * Math.PI * 6;
            const orbitR = 9;
            const ocx = px + Math.cos(orbitAngle) * orbitR;
            const ocy = py + Math.sin(orbitAngle) * orbitR;
            const triSize = 2.5;
            this._fxGfx.moveTo(ocx, ocy - triSize);
            this._fxGfx.lineTo(ocx - triSize * 0.87, ocy + triSize * 0.5);
            this._fxGfx.lineTo(ocx + triSize * 0.87, ocy + triSize * 0.5);
            this._fxGfx.closePath();
            this._fxGfx.fill({ color, alpha: 0.6 });
          }
          // Ember particles spiraling outward (fire) / crystalline shards (ice)
          if (Math.random() < 0.5) {
            const eAngle = Math.random() * Math.PI * 2;
            const eSpeed = 12 + Math.random() * 18;
            this._particles.push({
              x: px + Math.cos(eAngle) * 4, y: py + Math.sin(eAngle) * 4,
              vx: Math.cos(eAngle) * eSpeed,
              vy: Math.sin(eAngle) * eSpeed + (isFire ? -8 : 0),
              life: 0.2 + Math.random() * 0.15,
              maxLife: 0.35,
              color: isFire ? accentColor : 0xddeeFF,
              size: 1 + Math.random(),
            });
          }
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
          // Heat shimmer ring (fire) / ice crystal ring (ice)
          if (radius > 2) {
            this._fxGfx.circle(toX, toY, radius * 1.15);
            this._fxGfx.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.25 });
            // Secondary shimmer ring
            this._fxGfx.circle(toX, toY, radius * 1.3);
            this._fxGfx.stroke({ color: isFire ? 0xff4400 : 0x88ccff, width: 1.5, alpha: alpha * 0.15 });
            const spokeCount = 10;
            for (let si = 0; si < spokeCount; si++) {
              const sa = (si / spokeCount) * Math.PI * 2;
              const innerR = radius * 0.3;
              const outerR = radius * 1.1;
              this._fxGfx.moveTo(toX + Math.cos(sa) * innerR, toY + Math.sin(sa) * innerR);
              this._fxGfx.lineTo(toX + Math.cos(sa) * outerR, toY + Math.sin(sa) * outerR);
              this._fxGfx.stroke({ color, width: 1, alpha: alpha * 0.3 });
            }
          }
          // Ice crystal fragment shapes on explosion (ice only)
          if (!isFire && radius > 4) {
            for (let ci = 0; ci < 6; ci++) {
              const cAngle = (ci / 6) * Math.PI * 2 + et * 0.5;
              const cDist = radius * 0.6;
              const ccx = toX + Math.cos(cAngle) * cDist;
              const ccy = toY + Math.sin(cAngle) * cDist;
              // Diamond crystal shape
              const cSize = 3 * alpha;
              this._fxGfx.moveTo(ccx, ccy - cSize);
              this._fxGfx.lineTo(ccx + cSize * 0.6, ccy);
              this._fxGfx.lineTo(ccx, ccy + cSize);
              this._fxGfx.lineTo(ccx - cSize * 0.6, ccy);
              this._fxGfx.closePath();
              this._fxGfx.fill({ color: 0xddeeFF, alpha: alpha * 0.5 });
            }
          }
          // Spawn explosion particles (6 for more drama)
          if (et < 0.3) {
            for (let j = 0; j < 6; j++) {
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
            // Snowflake particles (ice) / smoke puffs (fire)
            for (let j = 0; j < 2; j++) {
              const angle = Math.random() * Math.PI * 2;
              this._particles.push({
                x: toX + Math.cos(angle) * radius * 0.3,
                y: toY + Math.sin(angle) * radius * 0.3,
                vx: Math.cos(angle) * 15,
                vy: isFire ? -20 - Math.random() * 10 : Math.sin(angle) * 15,
                life: 0.3 + Math.random() * 0.2,
                maxLife: 0.5,
                color: isFire ? 0x666666 : 0xeeffFF,
                size: 1.5 + Math.random(),
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
            // Main bolt with more segments for jagged look
            const segments = 6;
            let lastX = ax, lastY = ay;
            for (let s = 1; s <= segments; s++) {
              const frac = s / segments;
              let nx = ax + (bx - ax) * frac;
              let ny = ay + (by - ay) * frac;
              if (s < segments) {
                nx += (Math.random() - 0.5) * 14;
                ny += (Math.random() - 0.5) * 14;
              }
              // Wide outer glow line
              this._fxGfx.moveTo(lastX, lastY);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xffff88, width: 5, alpha: alpha * 0.2 });
              // Mid glow line
              this._fxGfx.moveTo(lastX, lastY);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xffff44, width: 3, alpha: alpha * 0.35 });
              // Bright core line (thin)
              this._fxGfx.moveTo(lastX, lastY);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xffffff, width: 1, alpha });
              // Branching fork (50% chance per segment)
              if (Math.random() < 0.5) {
                const midX = (lastX + nx) / 2;
                const midY = (lastY + ny) / 2;
                const forkAngle = Math.atan2(ny - lastY, nx - lastX) + (Math.random() - 0.5) * Math.PI * 0.8;
                const forkLen = 8 + Math.random() * 10;
                const forkEndX = midX + Math.cos(forkAngle) * forkLen;
                const forkEndY = midY + Math.sin(forkAngle) * forkLen;
                this._fxGfx.moveTo(midX, midY);
                this._fxGfx.lineTo(forkEndX, forkEndY);
                this._fxGfx.stroke({ color: 0xffff44, width: 1, alpha: alpha * 0.6 });
                this._fxGfx.moveTo(midX, midY);
                this._fxGfx.lineTo(forkEndX, forkEndY);
                this._fxGfx.stroke({ color: 0xffff88, width: 2.5, alpha: alpha * 0.15 });
              }
              lastX = nx;
              lastY = ny;
            }
            // Secondary thinner jittery bolt (parallel arc)
            let last2X = ax, last2Y = ay;
            for (let s = 1; s <= segments; s++) {
              const frac = s / segments;
              let nx = ax + (bx - ax) * frac;
              let ny = ay + (by - ay) * frac;
              if (s < segments) {
                nx += (Math.random() - 0.5) * 18;
                ny += (Math.random() - 0.5) * 18;
              }
              this._fxGfx.moveTo(last2X, last2Y);
              this._fxGfx.lineTo(nx, ny);
              this._fxGfx.stroke({ color: 0xccccff, width: 0.8, alpha: alpha * 0.4 });
              last2X = nx;
              last2Y = ny;
            }
            // Bright flash circle at each connection point
            this._fxGfx.circle(ax, ay, 4 * alpha);
            this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.7 });
            this._fxGfx.circle(ax, ay, 7 * alpha);
            this._fxGfx.stroke({ color: 0xffff88, width: 1, alpha: alpha * 0.3 });
            // Electric spark particles at each bounce point
            if (t < 0.4 && Math.random() < 0.4) {
              for (let sp = 0; sp < 2; sp++) {
                const spAngle = Math.random() * Math.PI * 2;
                this._particles.push({
                  x: bx, y: by,
                  vx: Math.cos(spAngle) * 25,
                  vy: Math.sin(spAngle) * 25,
                  life: 0.12 + Math.random() * 0.1,
                  maxLife: 0.22,
                  color: 0xffffcc,
                  size: 1 + Math.random(),
                });
              }
            }
            // Impact flash at each target with pulsing ring
            this._fxGfx.circle(bx, by, 5 * alpha);
            this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.5 });
            this._fxGfx.circle(bx, by, 8 * alpha);
            this._fxGfx.stroke({ color: 0xffff88, width: 1, alpha: alpha * 0.3 });
            // Subtle arc ring at target
            this._fxGfx.circle(bx, by, 11 * alpha);
            this._fxGfx.stroke({ color: 0xffff44, width: 0.5, alpha: alpha * 0.15 });
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
        const projX = px + nx * wave;
        const projY = py + ny * wave;
        // Stardust particle trail
        for (let st = 1; st <= 5; st++) {
          const stT = Math.max(0, t - st * 0.03);
          const stpx = fromX + (toX - fromX) * stT;
          const stpy = fromY + (toY - fromY) * stT;
          const stWave = Math.sin(stT * 20) * 4;
          this._fxGfx.circle(stpx + nx * stWave, stpy + ny * stWave, 1.5 - st * 0.2);
          this._fxGfx.fill({ color: 0xcc88ff, alpha: (0.5 - st * 0.08) * alpha });
        }
        // Pulsing glow aura around projectile
        const pulseSize = 8 + Math.sin(this._time * 15) * 2;
        this._fxGfx.circle(projX, projY, pulseSize);
        this._fxGfx.fill({ color: 0x8833cc, alpha: alpha * 0.15 });
        // Glow
        this._fxGfx.circle(projX, projY, 6);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.3 });
        // Core
        this._fxGfx.circle(projX, projY, 3);
        this._fxGfx.fill({ color: 0xcc66ff, alpha });
        this._fxGfx.circle(projX, projY, 1.5);
        this._fxGfx.fill({ color: 0xffffff, alpha });
        // Stardust sparkle particles
        if (Math.random() < 0.4) {
          this._particles.push({
            x: projX, y: projY,
            vx: (Math.random() - 0.5) * 12,
            vy: (Math.random() - 0.5) * 12,
            life: 0.15 + Math.random() * 0.1,
            maxLife: 0.25,
            color: Math.random() > 0.5 ? 0xddaaff : 0xffffff,
            size: 1 + Math.random() * 0.5,
          });
        }
        // Impact sparkle burst at end
        if (t > 0.85) {
          const impactT = (t - 0.85) / 0.15;
          for (let ib = 0; ib < 4; ib++) {
            const ibAngle = (ib / 4) * Math.PI * 2 + this._time * 8;
            const ibR = impactT * 10;
            this._fxGfx.circle(toX + Math.cos(ibAngle) * ibR, toY + Math.sin(ibAngle) * ibR, 1.5);
            this._fxGfx.fill({ color: 0xeeddff, alpha: (1 - impactT) * 0.6 });
          }
        }
        break;
      }

      case RWAnimationType.DEATH_BOLT: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Dark energy particles orbiting the bolt
        for (let oi = 0; oi < 3; oi++) {
          const oAngle = (oi / 3) * Math.PI * 2 + this._time * 6;
          const oR = 7 + Math.sin(this._time * 10 + oi) * 2;
          const ox = px + Math.cos(oAngle) * oR;
          const oy = py + Math.sin(oAngle) * oR;
          this._fxGfx.circle(ox, oy, 1.5);
          this._fxGfx.fill({ color: 0x551155, alpha: alpha * 0.6 });
        }
        // Dark wisp trails
        for (let wi = 0; wi < 3; wi++) {
          const wT = Math.max(0, t - wi * 0.05);
          const wx = fromX + (toX - fromX) * wT;
          const wy = fromY + (toY - fromY) * wT;
          const wDrift = Math.sin(this._time * 8 + wi * 2) * 5;
          this._fxGfx.circle(wx + wDrift, wy - wi * 2, 2.5 - wi * 0.5);
          this._fxGfx.fill({ color: 0x331133, alpha: (0.3 - wi * 0.08) * alpha });
        }
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
        // Skull outline flash on impact
        if (t > 0.8) {
          const impT = (t - 0.8) / 0.2;
          const skullAlpha = (1 - impT) * 0.5;
          // Skull head outline
          this._fxGfx.circle(toX, toY - 3, 6 * (1 - impT * 0.3));
          this._fxGfx.stroke({ color: 0x886688, width: 1.5, alpha: skullAlpha });
          // Eye sockets
          this._fxGfx.circle(toX - 2.5, toY - 4, 1.5);
          this._fxGfx.fill({ color: 0xaa44aa, alpha: skullAlpha * 0.8 });
          this._fxGfx.circle(toX + 2.5, toY - 4, 1.5);
          this._fxGfx.fill({ color: 0xaa44aa, alpha: skullAlpha * 0.8 });
          // Dark burst ring
          this._fxGfx.circle(toX, toY, impT * 15);
          this._fxGfx.stroke({ color: 0x442244, width: 1, alpha: skullAlpha * 0.4 });
        }
        break;
      }

      case RWAnimationType.HOLY_LIGHT: {
        const px = fromX + (toX - fromX) * t;
        const py = fromY + (toY - fromY) * t;
        // Divine halo ring around projectile
        const haloR = 10 + Math.sin(this._time * 12) * 1.5;
        this._fxGfx.circle(px, py, haloR);
        this._fxGfx.stroke({ color: 0xffdd66, width: 1, alpha: alpha * 0.35 });
        // Golden beam glow
        this._fxGfx.circle(px, py, 8);
        this._fxGfx.fill({ color: 0xffffaa, alpha: alpha * 0.3 });
        this._fxGfx.circle(px, py, 4);
        this._fxGfx.fill({ color: 0xffff88, alpha });
        this._fxGfx.star(px, py, 4, 6, 2);
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.6 });
        // Dramatic golden rays radiating outward
        for (let ri = 0; ri < 6; ri++) {
          const rayAngle = (ri / 6) * Math.PI * 2 + this._time * 3;
          const rayLen = 12 + Math.sin(this._time * 8 + ri * 1.5) * 4;
          this._fxGfx.moveTo(px, py);
          this._fxGfx.lineTo(px + Math.cos(rayAngle) * rayLen, py + Math.sin(rayAngle) * rayLen);
          this._fxGfx.stroke({ color: 0xffee44, width: 1.5, alpha: alpha * 0.35 });
        }
        // Cross/star burst pattern at impact
        if (t > 0.7) {
          const burstT = (t - 0.7) / 0.3;
          const burstR = burstT * 18;
          // Vertical beam
          this._fxGfx.moveTo(toX, toY - burstR);
          this._fxGfx.lineTo(toX, toY + burstR);
          this._fxGfx.stroke({ color: 0xffff88, width: 2, alpha: (1 - burstT) * 0.6 });
          // Horizontal beam
          this._fxGfx.moveTo(toX - burstR, toY);
          this._fxGfx.lineTo(toX + burstR, toY);
          this._fxGfx.stroke({ color: 0xffff88, width: 2, alpha: (1 - burstT) * 0.6 });
          // Diagonal beams
          this._fxGfx.moveTo(toX - burstR * 0.7, toY - burstR * 0.7);
          this._fxGfx.lineTo(toX + burstR * 0.7, toY + burstR * 0.7);
          this._fxGfx.stroke({ color: 0xffee66, width: 1, alpha: (1 - burstT) * 0.35 });
          this._fxGfx.moveTo(toX + burstR * 0.7, toY - burstR * 0.7);
          this._fxGfx.lineTo(toX - burstR * 0.7, toY + burstR * 0.7);
          this._fxGfx.stroke({ color: 0xffee66, width: 1, alpha: (1 - burstT) * 0.35 });
        }
        // Ascending sparkle particles
        if (Math.random() < 0.4) {
          this._particles.push({
            x: px + (Math.random() - 0.5) * 8,
            y: py,
            vx: (Math.random() - 0.5) * 6,
            vy: -15 - Math.random() * 10,
            life: 0.2 + Math.random() * 0.15,
            maxLife: 0.35,
            color: Math.random() > 0.5 ? 0xffff88 : 0xffffff,
            size: 1 + Math.random() * 0.5,
          });
        }
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
        // Spiral vortex pattern at origin (dissolving)
        for (let vi = 0; vi < 5; vi++) {
          const vAngle = (vi / 5) * Math.PI * 2 + this._time * 8;
          const vR = TS * 0.45 * alpha * (0.5 + vi * 0.1);
          const vx = fromX + Math.cos(vAngle) * vR;
          const vy = fromY + Math.sin(vAngle) * vR;
          this._fxGfx.circle(vx, vy, 1.5);
          this._fxGfx.fill({ color: 0xcc88ff, alpha: alpha * 0.5 });
        }
        // Distortion ring at origin
        this._fxGfx.circle(fromX, fromY, TS * 0.55 * alpha);
        this._fxGfx.stroke({ color: 0x8822cc, width: 1, alpha: alpha * 0.2 });
        // Destination materialize
        this._fxGfx.circle(toX, toY, TS * 0.5 * t);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: t * 0.4 });
        this._fxGfx.circle(toX, toY, TS * 0.3 * t);
        this._fxGfx.stroke({ color: 0xcc66ff, width: 2, alpha: t * 0.6 });
        // Spiral vortex at destination (materializing)
        for (let vi = 0; vi < 5; vi++) {
          const vAngle = (vi / 5) * Math.PI * 2 - this._time * 8;
          const vR = TS * 0.45 * t * (0.5 + vi * 0.1);
          const vx = toX + Math.cos(vAngle) * vR;
          const vy = toY + Math.sin(vAngle) * vR;
          this._fxGfx.circle(vx, vy, 1.5);
          this._fxGfx.fill({ color: 0xcc88ff, alpha: t * 0.5 });
        }
        // Distortion ring at destination
        this._fxGfx.circle(toX, toY, TS * 0.55 * t);
        this._fxGfx.stroke({ color: 0x8822cc, width: 1, alpha: t * 0.2 });
        // Sparkles
        for (let i = 0; i < 4; i++) {
          const angle = this._time * 5 + i * Math.PI / 2;
          const r = TS * 0.4 * (t < 0.5 ? alpha : t);
          const cx = (t < 0.5 ? fromX : toX) + Math.cos(angle) * r;
          const cy = (t < 0.5 ? fromY : toY) + Math.sin(angle) * r;
          this._fxGfx.circle(cx, cy, 2);
          this._fxGfx.fill({ color: 0xffffff, alpha: 0.7 });
        }
        // Dissolve particles
        if (Math.random() < 0.4) {
          const activeSide = t < 0.5;
          const sx = activeSide ? fromX : toX;
          const sy = activeSide ? fromY : toY;
          const pAngle = Math.random() * Math.PI * 2;
          this._particles.push({
            x: sx + Math.cos(pAngle) * 6, y: sy + Math.sin(pAngle) * 6,
            vx: Math.cos(pAngle) * 18,
            vy: Math.sin(pAngle) * 18,
            life: 0.15 + Math.random() * 0.15,
            maxLife: 0.3,
            color: 0xcc66ff,
            size: 1 + Math.random(),
          });
        }
        break;
      }

      case RWAnimationType.HEAL: {
        // Healing rune circle below target
        const runeR = TS * 0.55 * Math.min(1, t * 2);
        this._fxGfx.circle(toX, toY + 4, runeR);
        this._fxGfx.stroke({ color: 0x22aa22, width: 1.5, alpha: alpha * 0.3 });
        // Rune marks on the circle
        for (let rm = 0; rm < 8; rm++) {
          const rmAngle = (rm / 8) * Math.PI * 2 + this._time * 1.5;
          const rmx = toX + Math.cos(rmAngle) * runeR;
          const rmy = toY + 4 + Math.sin(rmAngle) * runeR * 0.4;
          this._fxGfx.circle(rmx, rmy, 1);
          this._fxGfx.fill({ color: 0x66ff66, alpha: alpha * 0.4 });
        }
        // Rising green cross
        this._fxGfx.circle(toX, toY, TS * 0.6 * t);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.2 });
        // Cross shape
        const cs = TS * 0.25 * Math.min(1, t * 3);
        this._fxGfx.rect(toX - cs / 4, toY - cs, cs / 2, cs * 2);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.6 });
        this._fxGfx.rect(toX - cs, toY - cs / 4, cs * 2, cs / 2);
        this._fxGfx.fill({ color: 0x44ff44, alpha: alpha * 0.6 });
        // Rising green sparkles (more of them)
        for (let i = 0; i < 5; i++) {
          const spx = toX + (Math.sin(this._time * 4 + i * 1.4) * 10);
          const spy = toY - t * 25 - i * 4;
          this._fxGfx.circle(spx, spy, 1.5 - i * 0.15);
          this._fxGfx.fill({ color: 0x88ff88, alpha: alpha * (0.8 - i * 0.1) });
        }
        // Orbiting leaf/nature polygon shapes rising upward
        for (let li = 0; li < 4; li++) {
          const leafAngle = (li / 4) * Math.PI * 2 + this._time * 3;
          const leafR = TS * 0.35 * Math.min(1, t * 2);
          const leafX = toX + Math.cos(leafAngle) * leafR;
          const leafY = toY - t * 15 - li * 4 + Math.sin(leafAngle) * leafR;
          // Leaf shape (small diamond/pointed oval)
          this._fxGfx.moveTo(leafX, leafY - 3);
          this._fxGfx.lineTo(leafX + 2, leafY);
          this._fxGfx.lineTo(leafX, leafY + 3);
          this._fxGfx.lineTo(leafX - 2, leafY);
          this._fxGfx.closePath();
          this._fxGfx.fill({ color: 0x33cc33, alpha: alpha * 0.6 });
          // Leaf vein
          this._fxGfx.moveTo(leafX, leafY - 2);
          this._fxGfx.lineTo(leafX, leafY + 2);
          this._fxGfx.stroke({ color: 0x228822, width: 0.5, alpha: alpha * 0.5 });
        }
        // Ring of small plus-signs around the heal area
        const plusRingR = TS * 0.5 * Math.min(1, t * 2.5);
        for (let pi = 0; pi < 6; pi++) {
          const pa = (pi / 6) * Math.PI * 2 + this._time * 2;
          const pcx = toX + Math.cos(pa) * plusRingR;
          const pcy = toY + Math.sin(pa) * plusRingR;
          const ps = 2;
          // Vertical bar of plus
          this._fxGfx.rect(pcx - ps * 0.25, pcy - ps, ps * 0.5, ps * 2);
          this._fxGfx.fill({ color: 0x88ff88, alpha: alpha * 0.5 });
          // Horizontal bar of plus
          this._fxGfx.rect(pcx - ps, pcy - ps * 0.25, ps * 2, ps * 0.5);
          this._fxGfx.fill({ color: 0x88ff88, alpha: alpha * 0.5 });
        }
        // Rising sparkle particles
        if (Math.random() < 0.35) {
          this._particles.push({
            x: toX + (Math.random() - 0.5) * 12,
            y: toY + 4,
            vx: (Math.random() - 0.5) * 6,
            vy: -12 - Math.random() * 10,
            life: 0.25 + Math.random() * 0.15,
            maxLife: 0.4,
            color: 0x66ff66,
            size: 1 + Math.random() * 0.5,
          });
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
        const isFireBreath = event.type === RWAnimationType.FIRE_BREATH;
        const color = isFireBreath ? 0xff6600 : 0x44bbff;
        const innerColor = isFireBreath ? 0xffaa22 : 0xaaddff;
        const edgeColor = isFireBreath ? 0xff2200 : 0x2266cc;
        const bdx = toX - fromX;
        const bdy = toY - fromY;
        const spread = t * TS * 2;
        // Outer cone
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + bdx * t + spread * 0.5, fromY + bdy * t - spread * 0.3);
        this._fxGfx.lineTo(fromX + bdx * t - spread * 0.5, fromY + bdy * t + spread * 0.3);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color, alpha: alpha * 0.4 });
        // Mid cone layer for gradient effect
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + bdx * t * 0.85 + spread * 0.35, fromY + bdy * t * 0.85 - spread * 0.22);
        this._fxGfx.lineTo(fromX + bdx * t * 0.85 - spread * 0.35, fromY + bdy * t * 0.85 + spread * 0.22);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color: innerColor, alpha: alpha * 0.25 });
        // Inner cone (brightest)
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + bdx * t * 0.7 + spread * 0.25, fromY + bdy * t * 0.7 - spread * 0.15);
        this._fxGfx.lineTo(fromX + bdx * t * 0.7 - spread * 0.25, fromY + bdy * t * 0.7 + spread * 0.15);
        this._fxGfx.closePath();
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.12 });
        // Edge sparks (fire) / ice crystals (frost) along cone edges
        for (let ei = 0; ei < 4; ei++) {
          const edgeFrac = 0.3 + ei * 0.15;
          const side = ei % 2 === 0 ? 1 : -1;
          const ex = fromX + bdx * t * edgeFrac + spread * 0.5 * side * edgeFrac;
          const ey = fromY + bdy * t * edgeFrac - spread * 0.3 * side * edgeFrac;
          if (isFireBreath) {
            // Spark dot
            this._fxGfx.circle(ex, ey, 1.5);
            this._fxGfx.fill({ color: 0xffcc44, alpha: alpha * 0.5 });
          } else {
            // Small crystal diamond
            this._fxGfx.moveTo(ex, ey - 2);
            this._fxGfx.lineTo(ex + 1.5, ey);
            this._fxGfx.lineTo(ex, ey + 2);
            this._fxGfx.lineTo(ex - 1.5, ey);
            this._fxGfx.closePath();
            this._fxGfx.fill({ color: 0xddeeFF, alpha: alpha * 0.5 });
          }
        }
        // Cone edge outlines
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + bdx * t + spread * 0.5, fromY + bdy * t - spread * 0.3);
        this._fxGfx.stroke({ color: edgeColor, width: 1, alpha: alpha * 0.25 });
        this._fxGfx.moveTo(fromX, fromY);
        this._fxGfx.lineTo(fromX + bdx * t - spread * 0.5, fromY + bdy * t + spread * 0.3);
        this._fxGfx.stroke({ color: edgeColor, width: 1, alpha: alpha * 0.25 });
        // Particles (more of them)
        if (t < 0.7 && Math.random() < 0.5) {
          for (let pi = 0; pi < 2; pi++) {
            this._particles.push({
              x: fromX + bdx * t * Math.random(),
              y: fromY + bdy * t * Math.random(),
              vx: (Math.random() - 0.5) * 20,
              vy: -10 - Math.random() * 15,
              life: 0.3 + Math.random() * 0.3,
              maxLife: 0.6,
              color: Math.random() > 0.5 ? color : innerColor,
              size: 1 + Math.random() * 2,
            });
          }
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
        // Screen-wide dust cloud layer
        this._fxGfx.rect(0, 0, 1000, 800);
        this._fxGfx.fill({ color: 0xaa8855, alpha: alpha * 0.06 });
        // Radial cracks (more, with branching)
        for (let i = 0; i < 12; i++) {
          const angle = i * Math.PI / 6 + Math.random() * 0.3;
          const len = t * 200;
          this._fxGfx.moveTo(fromX, fromY);
          const crackEndX = fromX + Math.cos(angle) * len;
          const crackEndY = fromY + Math.sin(angle) * len;
          this._fxGfx.lineTo(crackEndX, crackEndY);
          this._fxGfx.stroke({ color: 0x664422, width: 2, alpha: alpha * 0.5 });
          // Sub-cracks branching off main crack
          if (len > 40) {
            const branchFrac = 0.4 + Math.random() * 0.3;
            const bx = fromX + Math.cos(angle) * len * branchFrac;
            const by = fromY + Math.sin(angle) * len * branchFrac;
            const bAngle = angle + (Math.random() - 0.5) * 1.2;
            const bLen = len * 0.3;
            this._fxGfx.moveTo(bx, by);
            this._fxGfx.lineTo(bx + Math.cos(bAngle) * bLen, by + Math.sin(bAngle) * bLen);
            this._fxGfx.stroke({ color: 0x553311, width: 1, alpha: alpha * 0.35 });
          }
        }
        // Shockwave ring
        const quakeR = t * 180;
        this._fxGfx.circle(fromX, fromY, quakeR);
        this._fxGfx.stroke({ color: 0x886633, width: 2, alpha: alpha * 0.2 });
        // Rock debris particles (more)
        if (t < 0.5 && Math.random() < 0.4) {
          for (let j = 0; j < 4; j++) {
            this._particles.push({
              x: fromX + (Math.random() - 0.5) * 120,
              y: fromY + (Math.random() - 0.5) * 120,
              vx: (Math.random() - 0.5) * 30,
              vy: -20 - Math.random() * 30,
              life: 0.4 + Math.random() * 0.3,
              maxLife: 0.7,
              color: Math.random() > 0.5 ? 0x886644 : 0x665533,
              size: 2 + Math.random() * 2.5,
            });
          }
        }
        // Dust particles settling
        if (t > 0.3 && Math.random() < 0.25) {
          this._particles.push({
            x: fromX + (Math.random() - 0.5) * 160,
            y: fromY + (Math.random() - 0.5) * 80,
            vx: (Math.random() - 0.5) * 8,
            vy: 5 + Math.random() * 8,
            life: 0.3 + Math.random() * 0.3,
            maxLife: 0.6,
            color: 0xaa9966,
            size: 1 + Math.random(),
          });
        }
        break;
      }

      case RWAnimationType.FIRE_AURA: {
        const r = TS * 2 * t;
        // Heat ripple effect (inner expanding ring)
        this._fxGfx.circle(fromX, fromY, r * 0.5);
        this._fxGfx.fill({ color: 0xff4400, alpha: alpha * 0.08 });
        // Expanding fire ring
        this._fxGfx.circle(fromX, fromY, r);
        this._fxGfx.stroke({ color: 0xff6600, width: 4, alpha: alpha * 0.6 });
        this._fxGfx.circle(fromX, fromY, r * 0.8);
        this._fxGfx.stroke({ color: 0xffaa22, width: 2, alpha: alpha * 0.4 });
        // Inner fire particles (small flames around center)
        for (let fi = 0; fi < 5; fi++) {
          const fAngle = (fi / 5) * Math.PI * 2 + this._time * 5;
          const fR = r * 0.3;
          const fx2 = fromX + Math.cos(fAngle) * fR;
          const fy2 = fromY + Math.sin(fAngle) * fR;
          this._fxGfx.circle(fx2, fy2 - 2, 2);
          this._fxGfx.fill({ color: 0xffcc22, alpha: alpha * 0.4 });
        }
        // Flickering flame tongues along the ring
        for (let ft = 0; ft < 6; ft++) {
          const ftAngle = (ft / 6) * Math.PI * 2 + this._time * 3;
          const ftx = fromX + Math.cos(ftAngle) * r;
          const fty = fromY + Math.sin(ftAngle) * r;
          const flicker = Math.sin(this._time * 10 + ft * 2) * 3;
          // Flame tongue (upward triangle)
          this._fxGfx.moveTo(ftx - 2, fty);
          this._fxGfx.lineTo(ftx, fty - 5 - flicker);
          this._fxGfx.lineTo(ftx + 2, fty);
          this._fxGfx.closePath();
          this._fxGfx.fill({ color: 0xff8822, alpha: alpha * 0.4 });
        }
        // Outer heat ripple ring
        this._fxGfx.circle(fromX, fromY, r * 1.15);
        this._fxGfx.stroke({ color: 0xff4400, width: 1, alpha: alpha * 0.15 });
        // Fire particles
        if (Math.random() < 0.35) {
          const angle = Math.random() * Math.PI * 2;
          this._particles.push({
            x: fromX + Math.cos(angle) * r,
            y: fromY + Math.sin(angle) * r,
            vx: (Math.random() - 0.5) * 10,
            vy: -15 - Math.random() * 10,
            life: 0.3,
            maxLife: 0.3,
            color: Math.random() > 0.5 ? 0xff6600 : 0xffaa22,
            size: 2,
          });
        }
        break;
      }

      case RWAnimationType.MELEE_HIT: {
        // Quick slash effect
        const slashT = Math.min(1, t * 3);
        // Dramatic impact flash (bigger, brighter)
        this._fxGfx.circle(toX, toY, TS * 0.5 * (1 - t));
        this._fxGfx.fill({ color: 0xffffff, alpha: alpha * 0.5 });
        this._fxGfx.circle(toX, toY, TS * 0.3 * (1 - t));
        this._fxGfx.fill({ color: 0xffffcc, alpha: alpha * 0.3 });
        // First slash line (top-left to bottom-right)
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
        // Second cross-slash line (top-right to bottom-left) forming X pattern
        const slashAngle2 = -Math.PI * 0.25;
        this._fxGfx.moveTo(
          toX - Math.cos(slashAngle2) * slashLen,
          toY - Math.sin(slashAngle2) * slashLen,
        );
        this._fxGfx.lineTo(
          toX + Math.cos(slashAngle2) * slashLen,
          toY + Math.sin(slashAngle2) * slashLen,
        );
        this._fxGfx.stroke({ color: 0xffffff, width: 3, alpha: alpha * 0.7 });
        // Speed lines radiating outward from impact direction
        for (let sl = 0; sl < 4; sl++) {
          const slAngle = Math.PI * 0.25 + (sl - 1.5) * 0.3;
          const slInner = TS * 0.35 * slashT;
          const slOuter = TS * 0.6 * slashT;
          this._fxGfx.moveTo(
            toX + Math.cos(slAngle) * slInner,
            toY + Math.sin(slAngle) * slInner,
          );
          this._fxGfx.lineTo(
            toX + Math.cos(slAngle) * slOuter,
            toY + Math.sin(slAngle) * slOuter,
          );
          this._fxGfx.stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.3 });
        }
        // Starburst pattern: 8 short lines radiating from impact point
        for (let sb = 0; sb < 8; sb++) {
          const sbAngle = (sb / 8) * Math.PI * 2;
          const sbInner = TS * 0.08;
          const sbOuter = TS * 0.25 * slashT;
          this._fxGfx.moveTo(
            toX + Math.cos(sbAngle) * sbInner,
            toY + Math.sin(sbAngle) * sbInner,
          );
          this._fxGfx.lineTo(
            toX + Math.cos(sbAngle) * sbOuter,
            toY + Math.sin(sbAngle) * sbOuter,
          );
          this._fxGfx.stroke({ color: 0xffffcc, width: 1.5, alpha: alpha * 0.5 });
        }
        // Impact sparks (more)
        if (t < 0.3) {
          for (let j = 0; j < 4; j++) {
            this._particles.push({
              x: toX, y: toY,
              vx: (Math.random() - 0.5) * 50,
              vy: (Math.random() - 0.5) * 50,
              life: 0.12 + Math.random() * 0.08,
              maxLife: 0.2,
              color: Math.random() > 0.5 ? 0xffffaa : 0xffffff,
              size: 1 + Math.random(),
            });
          }
        }
        break;
      }

      case RWAnimationType.DEATH: {
        const fx = fromX;
        const fy = fromY;

        // Phase 1: Flash and collapse (t < 0.3) - more dramatic flash
        if (t < 0.3) {
          const flashT = t / 0.3;
          // Bigger white flash that fades
          this._fxGfx.circle(fx, fy, TS * 0.7 * (1 - flashT * 0.5));
          this._fxGfx.fill({ color: 0xffffff, alpha: (1 - flashT) * 0.7 });
          this._fxGfx.circle(fx, fy, TS * 0.5 * (1 - flashT * 0.5));
          this._fxGfx.fill({ color: 0xffffff, alpha: (1 - flashT) * 0.5 });
          // Collapsing silhouette
          this._fxGfx.circle(fx, fy, TS * 0.35 * (1 - flashT * 0.3));
          this._fxGfx.fill({ color: 0xff2222, alpha: alpha * 0.5 });
          // Flash burst lines
          for (let fb = 0; fb < 6; fb++) {
            const fbAngle = (fb / 6) * Math.PI * 2;
            const fbLen = TS * 0.6 * (1 - flashT);
            this._fxGfx.moveTo(fx, fy);
            this._fxGfx.lineTo(fx + Math.cos(fbAngle) * fbLen, fy + Math.sin(fbAngle) * fbLen);
            this._fxGfx.stroke({ color: 0xff4444, width: 1.5, alpha: (1 - flashT) * 0.4 });
          }
        }

        // Phase 2: Disintegration (t 0.3-0.7)
        if (t >= 0.3 && t < 0.7) {
          const disT = (t - 0.3) / 0.4;
          // Shrinking core
          this._fxGfx.circle(fx, fy, TS * 0.25 * (1 - disT));
          this._fxGfx.fill({ color: 0xcc0000, alpha: alpha * 0.4 });
          // Skull silhouette fading
          // Head
          this._fxGfx.circle(fx, fy - 3, 5 * (1 - disT));
          this._fxGfx.fill({ color: 0xdddddd, alpha: alpha * 0.3 });
          // Eyes
          this._fxGfx.rect(fx - 3, fy - 5, 2, 2);
          this._fxGfx.fill({ color: 0x000000, alpha: alpha * 0.4 });
          this._fxGfx.rect(fx + 1, fy - 5, 2, 2);
          this._fxGfx.fill({ color: 0x000000, alpha: alpha * 0.4 });
          // Jaw
          this._fxGfx.moveTo(fx - 3, fy);
          this._fxGfx.lineTo(fx, fy + 4 * (1 - disT));
          this._fxGfx.lineTo(fx + 3, fy);
          this._fxGfx.closePath();
          this._fxGfx.fill({ color: 0xcccccc, alpha: alpha * 0.2 });
        }

        // Soul wisp rising effect (throughout animation)
        if (t > 0.2) {
          const soulT = (t - 0.2) / 0.8;
          for (let sw = 0; sw < 3; sw++) {
            const swx = fx + Math.sin(this._time * 4 + sw * 2.2) * (6 + sw * 3);
            const swy = fy - soulT * 30 - sw * 8;
            this._fxGfx.circle(swx, swy, 2 - sw * 0.4);
            this._fxGfx.fill({ color: 0xaabbcc, alpha: (1 - soulT) * 0.4 });
          }
        }

        // Bone fragment particles throughout (more)
        if (t < 0.6) {
          for (let j = 0; j < 4; j++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 20 + Math.random() * 30;
            this._particles.push({
              x: fx + (Math.random() - 0.5) * 10,
              y: fy + (Math.random() - 0.5) * 10,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed - 15,
              life: 0.4 + Math.random() * 0.4,
              maxLife: 0.8,
              color: Math.random() > 0.5 ? 0xff2222 : (Math.random() > 0.5 ? 0xcccccc : 0x882222),
              size: 1.5 + Math.random() * 1.5,
            });
          }
        }

        // Smoke ring expanding outward
        const smokeR = t * TS * 0.8;
        this._fxGfx.circle(fx, fy, smokeR);
        this._fxGfx.stroke({ color: 0x444444, width: 1.5, alpha: alpha * 0.2 });
        // Second inner smoke ring
        this._fxGfx.circle(fx, fy, smokeR * 0.6);
        this._fxGfx.stroke({ color: 0x555555, width: 1, alpha: alpha * 0.15 });

        break;
      }

      default: {
        // Generic arcane flash for unrecognized animation types (extensibility)
        const flashRadius = TS * 0.4 * (1 - t);
        this._fxGfx.circle(fromX, fromY, flashRadius);
        this._fxGfx.fill({ color: 0xaa44ff, alpha: alpha * 0.5 });
        // Arcane sparkle ring
        for (let sp = 0; sp < 6; sp++) {
          const spAngle = (sp / 6) * Math.PI * 2 + this._time * 4;
          const spDist = flashRadius * 1.3;
          this._fxGfx.circle(
            fromX + Math.cos(spAngle) * spDist,
            fromY + Math.sin(spAngle) * spDist,
            1.5,
          );
          this._fxGfx.fill({ color: 0xcc88ff, alpha: alpha * 0.4 });
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
    this._staticTileGfx.destroy();
    this._tileGfx.destroy();
    this._ambientGfx.destroy();
    this._entityGfx.destroy();
    this._spriteLayer.destroy();
    this._fxGfx.destroy();
    this._fxParticleGfx.destroy();
    this._statusOverlayGfx.destroy();
    this._telegraphGfx.destroy();
    this._cursorGfx.destroy();
  }
}
