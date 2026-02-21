// Loads spritesheet atlases and maps unit types → animation frame sets.
//
// Loading strategy:
//   1. Attempt to load a real atlas from "assets/sheets/<key>.json"
//      (standard PixiJS Spritesheet format).
//   2. If the asset is absent or loading fails, generate procedural
//      placeholder textures — 8-column × 5-row colored grid, one color
//      per animation state, so states are visually distinguishable in dev.
//
// Usage:
//   await animationManager.load(app.renderer);
//   const textures = animationManager.getFrames(UnitType.SWORDSMAN, UnitState.MOVE);
//   const sprite = new AnimatedSprite(textures);

import {
  Assets,
  Spritesheet,
  Texture,
  RenderTexture,
  Graphics,
  type Renderer,
} from "pixi.js";
import { UnitType, UnitState } from "@/types";
import {
  ANIMATION_DEFS,
  type AnimFrameSet,
} from "@view/animation/AnimationDefs";
import { generateSwordsmanFrames } from "@view/animation/SwordsmanSpriteGen";
import { generateArcherFrames } from "@view/animation/ArcherSpriteGen";

// ---------------------------------------------------------------------------
// Placeholder palette — one color per animation row
// ---------------------------------------------------------------------------

const PLACEHOLDER_COLORS: Record<UnitState, number> = {
  [UnitState.IDLE]: 0x8888aa,
  [UnitState.MOVE]: 0x44aaff,
  [UnitState.ATTACK]: 0xff6644,
  [UnitState.CAST]: 0xcc66ff,
  [UnitState.DIE]: 0x666666,
};

/** Frame size for generated placeholder textures (pixels). */
const PLACEHOLDER_FRAME_PX = 48;

// Base path for atlas JSON files (relative to Vite's public/ dir)
const ATLAS_BASE = "assets/sheets/";

// ---------------------------------------------------------------------------
// Cache key
// ---------------------------------------------------------------------------

function cacheKey(spriteKey: string, state: UnitState): string {
  return `${spriteKey}:${state}`;
}

// ---------------------------------------------------------------------------
// AnimationManager
// ---------------------------------------------------------------------------

export class AnimationManager {
  /** Cache: `"<spriteKey>:<state>"` → ordered Texture array */
  private _cache = new Map<string, Texture[]>();
  /** Sheet keys that were loaded from real atlas files. */
  private _realSheets = new Set<string>();
  private _loaded = false;

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  /**
   * Load all atlas files for every registered unit type.
   * Falls back to generated placeholder textures when a file is missing.
   * Must be awaited before calling `getFrames()`.
   */
  async load(renderer: Renderer): Promise<void> {
    const keys = this._allSheetKeys();

    await Promise.all(keys.map((key) => this._loadSheet(key, renderer)));

    this._loaded = true;
  }

  /** Returns true once `load()` has completed. */
  get isLoaded(): boolean {
    return this._loaded;
  }

  // ---------------------------------------------------------------------------
  // Frame access
  // ---------------------------------------------------------------------------

  /**
   * Get the ordered Texture array for a unit type + animation state.
   * Returns a single-frame fallback if the animation was never loaded.
   */
  getFrames(unitType: UnitType, state: UnitState): Texture[] {
    const def = ANIMATION_DEFS[unitType];
    const frameSet = def[state];
    const key = cacheKey(frameSet.sheet, state);
    return this._cache.get(key) ?? [Texture.WHITE];
  }

  /**
   * Get the full AnimFrameSet metadata (fps, loop flag, etc.) for a unit
   * type + state. View code uses this to configure AnimatedSprite.
   */
  getFrameSet(unitType: UnitType, state: UnitState): AnimFrameSet {
    return ANIMATION_DEFS[unitType][state];
  }

  /** Returns true if the sheet was loaded from a real atlas file. */
  isRealSheet(spriteKey: string): boolean {
    return this._realSheets.has(spriteKey);
  }

  // ---------------------------------------------------------------------------
  // Private — sheet loading
  // ---------------------------------------------------------------------------

  private _allSheetKeys(): string[] {
    const seen = new Set<string>();
    for (const def of Object.values(ANIMATION_DEFS)) {
      for (const frameSet of Object.values(def) as AnimFrameSet[]) {
        seen.add(frameSet.sheet);
      }
    }
    return [...seen];
  }

  private async _loadSheet(key: string, renderer: Renderer): Promise<void> {
    const url = `${ATLAS_BASE}${key}.json`;

    try {
      // Attempt to load the real atlas
      const spritesheet: Spritesheet = await Assets.load(url);
      await spritesheet.parse();

      // Extract ordered textures from the atlas (frame names are expected to
      // be named "<key>_<index>.png" or simply ordered by name)
      this._extractFromSpritesheet(key, spritesheet);
      this._realSheets.add(key);
    } catch {
      // Asset not found — use detailed procedural generators where available,
      // otherwise fall back to generic colored-square placeholders.
      if (key === "swordsman") {
        this._generateSwordsmanSprites(key, renderer);
      } else if (key === "archer") {
        this._generateArcherSprites(key, renderer);
      } else {
        this._generatePlaceholders(key, renderer);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private — real spritesheet extraction
  // ---------------------------------------------------------------------------

  /**
   * Extract textures from a loaded Spritesheet and populate the cache.
   * Assumes frame names sort in the same order as their indices.
   */
  private _extractFromSpritesheet(key: string, sheet: Spritesheet): void {
    // Collect all textures sorted by frame name
    const sortedNames = Object.keys(sheet.textures).sort();
    const allTextures = sortedNames.map((n) => sheet.textures[n]);

    // Populate cache for each UnitState that uses this sheet
    for (const unitType of Object.values(UnitType)) {
      const def = ANIMATION_DEFS[unitType as UnitType];
      for (const state of Object.values(UnitState)) {
        const frameSet = def[state as UnitState];
        if (frameSet.sheet !== key) continue;
        const ck = cacheKey(key, state as UnitState);
        if (this._cache.has(ck)) continue; // already set by another unit

        const textures = frameSet.frames.map(
          (idx) => allTextures[idx] ?? Texture.WHITE,
        );
        this._cache.set(ck, textures);
      }
    }
  }

  // ---------------------------------------------------------------------------
  // Private — placeholder generation
  // ---------------------------------------------------------------------------

  /**
   * Generate solid-color placeholder textures for every UnitState that
   * references `key`. Each state gets its own palette color so you can tell
   * them apart at a glance during development.
   */
  private _generatePlaceholders(key: string, renderer: Renderer): void {
    const FP = PLACEHOLDER_FRAME_PX;

    for (const state of Object.values(UnitState)) {
      const ck = cacheKey(key, state as UnitState);
      if (this._cache.has(ck)) continue;

      // Find how many frames this state needs (check any unit using this sheet)
      const frameCount = this._getMaxFrameCount(key, state as UnitState);
      const color = PLACEHOLDER_COLORS[state as UnitState];

      const textures: Texture[] = [];

      for (let i = 0; i < frameCount; i++) {
        const g = new Graphics();
        // Colored background
        g.rect(0, 0, FP, FP).fill({ color });
        // Frame index label area (darker strip at bottom)
        g.rect(0, FP - 10, FP, 10).fill({ color: 0x000000, alpha: 0.4 });
        // Small white dot to indicate frame number visually
        const dotX = 4 + (i % 8) * 5;
        g.circle(dotX, FP - 5, 2).fill({ color: 0xffffff });

        const rt = RenderTexture.create({ width: FP, height: FP });
        renderer.render({ container: g, target: rt });
        textures.push(rt);

        g.destroy();
      }

      this._cache.set(ck, textures);
    }
  }

  /**
   * Generate detailed procedural swordsman sprites using the dedicated
   * SwordsmanSpriteGen module. Populates the cache for all states.
   */
  private _generateSwordsmanSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateSwordsmanFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  /**
   * Generate detailed procedural archer sprites using the dedicated
   * ArcherSpriteGen module. Populates the cache for all states.
   */
  private _generateArcherSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateArcherFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  /** Find the largest frame count for a given (sheet, state) pair. */
  private _getMaxFrameCount(sheet: string, state: UnitState): number {
    let max = 1;
    for (const unitType of Object.values(UnitType)) {
      const frameSet = ANIMATION_DEFS[unitType as UnitType][state];
      if (frameSet.sheet === sheet && frameSet.frames.length > max) {
        max = frameSet.frames.length;
      }
    }
    return max;
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const animationManager = new AnimationManager();
