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
import {
  generateStormMageFrames,
  generateMageFrames,
  type MagePalette,
  PALETTE_FIRE_MAGE,
  PALETTE_SUMMONER,
  PALETTE_COLD_MAGE,
  PALETTE_DISTORTION_MAGE,
  PALETTE_CLERIC,
  PALETTE_SAINT,
  PALETTE_MONK,
} from "@view/animation/StormMageSpriteGen";
import {
  generateFireAdeptMageFrames,
  generateColdAdeptMageFrames,
  generateLightningAdeptMageFrames,
  generateDistortionAdeptMageFrames,
  generateFireMasterMageFrames,
  generateColdMasterMageFrames,
  generateLightningMasterMageFrames,
  generateDistortionMasterMageFrames,
} from "@view/animation/AdeptMageSpriteGen";
import {
  generateDragonFrames,
  PALETTE_RED_DRAGON,
  PALETTE_FROST_DRAGON,
  type DragonPalette,
} from "@view/animation/DragonSpriteGen";
import {
  generateCyclopsFrames,
  PALETTE_CYCLOPS,
  type CyclopsPalette,
} from "@view/animation/CyclopsSpriteGen";
import { generatePikemanFrames } from "@view/animation/PikemanSpriteGen";
import { generateMageHunterFrames } from "@view/animation/MageHunterSpriteGen";
import { generateGladiatorFrames } from "@view/animation/GladiatorSpriteGen";
import { generateSiegeHunterFrames } from "@view/animation/SiegeHunterSpriteGen";
import { generateHorseArcherFrames } from "@view/animation/HorseArcherSpriteGen";
import { generateScoutCavalryFrames } from "@view/animation/ScoutCavalrySpriteGen";
import { generateLancerFrames } from "@view/animation/LancerSpriteGen";
import { generateEliteLancerFrames } from "@view/animation/EliteLancerSpriteGen";
import { generateKnightLancerFrames } from "@view/animation/KnightLancerSpriteGen";
import { generateKnightFrames } from "@view/animation/KnightSpriteGen";
import { generateQuestingKnightFrames } from "@view/animation/QuestingKnightSpriteGen";
import { generateHalberdierFrames } from "@view/animation/HalberdierSpriteGen";
import { generateElvenArcherFrames } from "@view/animation/ElvenArcherSpriteGen";
import { generateBatteringRamFrames } from "@view/animation/BatteringRamSpriteGen";
import { generateBallistaFrames } from "@view/animation/BallistaSpriteGen";
import { generateBoltThrowerFrames } from "@view/animation/BoltThrowerSpriteGen";
import { generateCatapultFrames } from "@view/animation/CatapultSpriteGen";
import { generateSiegeCatapultFrames } from "@view/animation/SiegeCatapultSpriteGen";
import { generateTrebuchetFrames } from "@view/animation/TrebuchetSpriteGen";
import { generateDefenderFrames } from "@view/animation/DefenderSpriteGen";
import { generatePhalanxFrames } from "@view/animation/PhalanxSpriteGen";
import { generateRoyalPhalanxFrames } from "@view/animation/RoyalPhalanxSpriteGen";
import { generateRoyalDefenderFrames } from "@view/animation/RoyalDefenderSpriteGen";
import { generateAxemanFrames } from "@view/animation/AxemanSpriteGen";
import { generateBerserkerFrames } from "@view/animation/BerserkerSpriteGen";
import { generateJavelineerFrames } from "@view/animation/JavelineerSpriteGen";
import { generateArbelestierFrames } from "@view/animation/ArbelestierSpriteGen";
import { generateLongbowmanFrames } from "@view/animation/LongbowmanSpriteGen";
import { generateCrossbowmanFrames } from "@view/animation/CrossbowmanSpriteGen";
import { generateGiantFrogFrames } from "@view/animation/GiantFrogSpriteGen";
import { generateVoidSnailFrames } from "@view/animation/VoidSnailSpriteGen";
import { generateSpiderFrames } from "@view/animation/SpiderSpriteGen";
import { generateDevourerFrames } from "@view/animation/DevourerSpriteGen";
import { generateDiplomatFrames } from "@view/animation/DiplomatSpriteGen";
import { generateGolemFrames } from "@view/animation/GolemSpriteGen";
import { generateSummonedFrames } from "@view/animation/SummonedSpriteGen";
import { generateConstructionistFrames } from "@view/animation/ConstructionistSpriteGen";
import { generateAssassinFrames } from "@view/animation/AssassinSpriteGen";
import { generateRepeaterFrames } from "@view/animation/RepeaterSpriteGen";
import { generateRoyalLancerFrames } from "@view/animation/RoyalLancerSpriteGen";
import { generateTrollFrames } from "@view/animation/TrollSpriteGen";
import { generateRhinoFrames } from "@view/animation/RhinoSpriteGen";
import { generatePixieFrames } from "@view/animation/PixieSpriteGen";
import {
  generateFireImpFrames,
  generateIceImpFrames,
  generateLightningImpFrames,
  generateDistortionImpFrames,
} from "@view/animation/ImpSpriteGen";
import { generateBatFrames } from "@view/animation/BatSpriteGen";
import { generateTemplarFrames } from "@view/animation/TemplarSpriteGen";
import { generateAngelFrames } from "@view/animation/AngelSpriteGen";
import { generateHeroFrames } from "@view/animation/HeroSpriteGen";
import { generateWarchiefFrames } from "@view/animation/WarchiefSpriteGen";
import { generateArchmageFrames } from "@view/animation/ArchmageSpriteGen";
import { generateRufusFrames } from "@view/animation/RufusSpriteGen";
import { generateTroubadourFrames } from "@view/animation/TroubadourSpriteGen";
import { generateGiantCourtJesterFrames } from "@view/animation/GiantCourtJesterSpriteGen";
import { generateFishermanFrames } from "@view/animation/FishermanSpriteGen";
import { generateFireElementalFrames } from "@view/animation/FireElementalSpriteGen";
import { generateIceElementalFrames } from "@view/animation/IceElementalSpriteGen";
import { generateVampireBatFrames } from "@view/animation/VampireBatSpriteGen";
import { generateMinorFireElementalFrames } from "@view/animation/MinorFireElementalSpriteGen";
import { generateMinorIceElementalFrames } from "@view/animation/MinorIceElementalSpriteGen";
import { generateLightningElementalFrames } from "@view/animation/LightningElementalSpriteGen";
import { generateDistortionElementalFrames } from "@view/animation/DistortionElementalSpriteGen";
import { generateMinorLightningElementalFrames } from "@view/animation/MinorLightningElementalSpriteGen";
import { generateMinorDistortionElementalFrames } from "@view/animation/MinorDistortionElementalSpriteGen";

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
      } else if (key === "storm_mage") {
        this._generateStormMageSprites(key, renderer);
      } else if (key === "fire_mage") {
        this._generateMageSprites(key, renderer, PALETTE_FIRE_MAGE);
      } else if (key === "summoner") {
        this._generateMageSprites(key, renderer, PALETTE_SUMMONER);
      } else if (key === "cold_mage") {
        this._generateMageSprites(key, renderer, PALETTE_COLD_MAGE);
      } else if (key === "distortion_mage") {
        this._generateMageSprites(key, renderer, PALETTE_DISTORTION_MAGE);
      } else if (key === "cleric") {
        this._generateMageSprites(key, renderer, PALETTE_CLERIC);
      } else if (key === "saint") {
        this._generateMageSprites(key, renderer, PALETTE_SAINT);
      } else if (key === "monk") {
        this._generateMageSprites(key, renderer, PALETTE_MONK);
      } else if (key === "fire_adept_mage") {
        this._generateFireAdeptMageSprites(key, renderer);
      } else if (key === "cold_adept_mage") {
        this._generateColdAdeptMageSprites(key, renderer);
      } else if (key === "lightning_adept_mage") {
        this._generateLightningAdeptMageSprites(key, renderer);
      } else if (key === "distortion_adept_mage") {
        this._generateDistortionAdeptMageSprites(key, renderer);
      } else if (key === "fire_master_mage") {
        this._generateFireMasterMageSprites(key, renderer);
      } else if (key === "cold_master_mage") {
        this._generateColdMasterMageSprites(key, renderer);
      } else if (key === "lightning_master_mage") {
        this._generateLightningMasterMageSprites(key, renderer);
      } else if (key === "distortion_master_mage") {
        this._generateDistortionMasterMageSprites(key, renderer);
      } else if (key === "red_dragon") {
        this._generateDragonSprites(key, renderer, PALETTE_RED_DRAGON, false);
      } else if (key === "frost_dragon") {
        this._generateDragonSprites(key, renderer, PALETTE_FROST_DRAGON, true);
      } else if (key === "cyclops") {
        this._generateCyclopsSprites(key, renderer, PALETTE_CYCLOPS);
      } else if (key === "pikeman") {
        this._generatePikemanSprites(key, renderer);
      } else if (key === "mage_hunter") {
        this._generateMageHunterSprites(key, renderer);
      } else if (key === "gladiator") {
        this._generateGladiatorSprites(key, renderer);
      } else if (key === "siege_hunter") {
        this._generateSiegeHunterSprites(key, renderer);
      } else if (key === "horse_archer") {
        this._generateHorseArcherSprites(key, renderer);
      } else if (key === "scout_cavalry") {
        this._generateScoutCavalrySprites(key, renderer);
      } else if (key === "lancer") {
        this._generateLancerSprites(key, renderer);
      } else if (key === "elite_lancer") {
        this._generateEliteLancerSprites(key, renderer);
      } else if (key === "knight_lancer") {
        this._generateKnightLancerSprites(key, renderer);
      } else if (key === "knight") {
        this._generateKnightSprites(key, renderer);
      } else if (key === "questing_knight") {
        this._generateQuestingKnightSprites(key, renderer);
      } else if (key === "halberdier") {
        this._generateHalberdierSprites(key, renderer);
      } else if (key === "elven_archer") {
        this._generateElvenArcherSprites(key, renderer);
      } else if (key === "hero") {
        this._generateHeroSprites(key, renderer);
      } else if (key === "warchief") {
        this._generateWarchiefSprites(key, renderer);
      } else if (key === "archmage") {
        this._generateArchmageSprites(key, renderer);
      } else if (key === "battering_ram") {
        this._generateBatteringRamSprites(key, renderer);
      } else if (key === "ballista") {
        this._generateBallistaSprites(key, renderer);
      } else if (key === "bolt_thrower") {
        this._generateBoltThrowerSprites(key, renderer);
      } else if (key === "catapult") {
        this._generateCatapultSprites(key, renderer);
      } else if (key === "siege_catapult") {
        this._generateSiegeCatapultSprites(key, renderer);
      } else if (key === "trebuchet") {
        this._generateTrebuchetSprites(key, renderer);
      } else if (key === "longbowman") {
        this._generateLongbowmanSprites(key, renderer);
      } else if (key === "crossbowman") {
        this._generateCrossbowmanSprites(key, renderer);
      } else if (key === "giant_frog") {
        this._generateGiantFrogSprites(key, renderer);
      } else if (key === "void_snail") {
        this._generateVoidSnailSprites(key, renderer);
      } else if (key === "spider") {
        this._generateSpiderSprites(key, renderer);
      } else if (key === "devourer") {
        this._generateDevourerSprites(key, renderer);
      } else if (key === "diplomat") {
        this._generateDiplomatSprites(key, renderer);
      } else if (key === "summoner") {
        this._generateGolemSprites(key, renderer);
      } else if (key === "summoned") {
        this._generateSummonedSprites(key, renderer);
      } else if (key === "constructionist") {
        this._generateConstructionistSprites(key, renderer);
      } else if (key === "assassin") {
        this._generateAssassinSprites(key, renderer);
      } else if (key === "repeater") {
        this._generateRepeaterSprites(key, renderer);
      } else if (key === "royal_lancer") {
        this._generateRoyalLancerSprites(key, renderer);
      } else if (key === "troll") {
        this._generateTrollSprites(key, renderer);
      } else if (key === "rhino") {
        this._generateRhinoSprites(key, renderer);
      } else if (key === "pixie") {
        this._generatePixieSprites(key, renderer);
      } else if (key === "fire_imp") {
        this._generateFireImpSprites(key, renderer);
      } else if (key === "ice_imp") {
        this._generateIceImpSprites(key, renderer);
      } else if (key === "lightning_imp") {
        this._generateLightningImpSprites(key, renderer);
      } else if (key === "distortion_imp") {
        this._generateDistortionImpSprites(key, renderer);
      } else if (key === "bat") {
        this._generateBatSprites(key, renderer);
      } else if (key === "templar") {
        this._generateTemplarSprites(key, renderer);
      } else if (key === "angel") {
        this._generateAngelSprites(key, renderer);
      } else if (key === "dark_savant") {
        this._generateMageSprites(key, renderer, PALETTE_FIRE_MAGE);
      } else if (key === "defender") {
        this._generateDefenderSprites(key, renderer);
      } else if (key === "phalanx") {
        this._generatePhalanxSprites(key, renderer);
      } else if (key === "royal_phalanx") {
        this._generateRoyalPhalanxSprites(key, renderer);
      } else if (key === "royal_defender") {
        this._generateRoyalDefenderSprites(key, renderer);
      } else if (key === "axeman") {
        this._generateAxemanSprites(key, renderer);
      } else if (key === "berserker") {
        this._generateBerserkerSprites(key, renderer);
      } else if (key === "javelin") {
        this._generateJavelineerSprites(key, renderer);
      } else if (key === "arbelestier") {
        this._generateArbelestierSprites(key, renderer);
      } else if (key === "rufus") {
        this._generateRufusSprites(key, renderer);
      } else if (key === "troubadour") {
        this._generateTroubadourSprites(key, renderer);
      } else if (key === "giant_court_jester") {
        this._generateGiantCourtJesterSprites(key, renderer);
      } else if (key === "fisherman") {
        this._generateFishermanSprites(key, renderer);
      } else if (key === "fire_elemental") {
        this._generateFireElementalSprites(key, renderer);
      } else if (key === "ice_elemental") {
        this._generateIceElementalSprites(key, renderer);
      } else if (key === "vampire_bat") {
        this._generateVampireBatSprites(key, renderer);
      } else if (key === "minor_fire_elemental") {
        this._generateMinorFireElementalSprites(key, renderer);
      } else if (key === "minor_ice_elemental") {
        this._generateMinorIceElementalSprites(key, renderer);
      } else if (key === "lightning_elemental") {
        this._generateLightningElementalSprites(key, renderer);
      } else if (key === "distortion_elemental") {
        this._generateDistortionElementalSprites(key, renderer);
      } else if (key === "minor_lightning_elemental") {
        this._generateMinorLightningElementalSprites(key, renderer);
      } else if (key === "minor_distortion_elemental") {
        this._generateMinorDistortionElementalSprites(key, renderer);
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

  /**
   * Generate detailed procedural storm mage sprites using the dedicated
   * StormMageSpriteGen module. Populates the cache for all states.
   */
  private _generateStormMageSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateStormMageFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  /**
   * Generate procedural mage sprites for a palette-recoloured mage variant.
   * Used for fire_mage, summoner, cold_mage, and distortion_mage.
   */
  private _generateMageSprites(
    key: string,
    renderer: Renderer,
    palette: MagePalette,
  ): void {
    const stateTextures = generateMageFrames(renderer, palette);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateFireAdeptMageSprites(key: string, renderer: Renderer): void {
    const textures = generateFireAdeptMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateColdAdeptMageSprites(key: string, renderer: Renderer): void {
    const textures = generateColdAdeptMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateLightningAdeptMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateLightningAdeptMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateDistortionAdeptMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateDistortionAdeptMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateFireMasterMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateFireMasterMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateColdMasterMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateColdMasterMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateLightningMasterMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateLightningMasterMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateDistortionMasterMageSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateDistortionMasterMageFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  /**
   * Generate procedural dragon sprites for red or frost dragons.
   * Used for red_dragon and frost_dragon.
   */
  private _generateDragonSprites(
    key: string,
    renderer: Renderer,
    palette: DragonPalette,
    isFrost: boolean,
  ): void {
    const textures = generateDragonFrames(renderer, palette, isFrost);

    // Map the 40 frames to animation states (8 frames per state)
    const states = [
      UnitState.IDLE,
      UnitState.MOVE,
      UnitState.ATTACK,
      UnitState.CAST,
      UnitState.DIE,
    ];

    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
      const state = states[stateIndex];
      const stateTextures = textures.slice(
        stateIndex * 8,
        (stateIndex + 1) * 8,
      );
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, stateTextures);
      }
    }
  }

  /**
   * Generate procedural cyclops sprites.
   * Used for cyclops.
   */
  private _generateCyclopsSprites(
    key: string,
    renderer: Renderer,
    palette: CyclopsPalette,
  ): void {
    const textures = generateCyclopsFrames(renderer, palette);

    // Map the 40 frames to animation states (8 frames per state)
    const states = [
      UnitState.IDLE,
      UnitState.MOVE,
      UnitState.ATTACK,
      UnitState.CAST,
      UnitState.DIE,
    ];

    for (let stateIndex = 0; stateIndex < states.length; stateIndex++) {
      const state = states[stateIndex];
      const stateTextures = textures.slice(
        stateIndex * 8,
        (stateIndex + 1) * 8,
      );
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, stateTextures);
      }
    }
  }

  /**
   * Generate procedural pikeman sprites.
   * Used for pikeman.
   */
  private _generatePikemanSprites(key: string, renderer: Renderer): void {
    const textures = generatePikemanFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural mage hunter sprites.
   * Used for mage_hunter.
   */
  private _generateMageHunterSprites(key: string, renderer: Renderer): void {
    const textures = generateMageHunterFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural gladiator sprites.
   * Used for gladiator.
   */
  private _generateGladiatorSprites(key: string, renderer: Renderer): void {
    const textures = generateGladiatorFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural siege hunter sprites.
   * Used for siege_hunter.
   */
  private _generateSiegeHunterSprites(key: string, renderer: Renderer): void {
    const textures = generateSiegeHunterFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural horse archer sprites.
   * Used for horse_archer.
   */
  private _generateHorseArcherSprites(key: string, renderer: Renderer): void {
    const textures = generateHorseArcherFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural scout cavalry sprites.
   * Used for scout_cavalry.
   */
  private _generateScoutCavalrySprites(key: string, renderer: Renderer): void {
    const textures = generateScoutCavalryFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural lancer sprites.
   * Used for lancer.
   */
  private _generateLancerSprites(key: string, renderer: Renderer): void {
    const textures = generateLancerFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural elite lancer sprites.
   * Used for elite_lancer.
   */
  private _generateEliteLancerSprites(key: string, renderer: Renderer): void {
    const textures = generateEliteLancerFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural knight lancer sprites.
   * Used for knight_lancer.
   */
  private _generateKnightLancerSprites(key: string, renderer: Renderer): void {
    const textures = generateKnightLancerFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  /**
   * Generate procedural knight sprites.
   * Used for knight.
   */
  private _generateKnightSprites(key: string, renderer: Renderer): void {
    const textures = generateKnightFrames(renderer);

    // Map the frames to animation states
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  private _generateQuestingKnightSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateQuestingKnightFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) {
          this._cache.set(ck, stateTextures);
        }
      }
    }
  }

  private _generateHalberdierSprites(key: string, renderer: Renderer): void {
    const textures = generateHalberdierFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateElvenArcherSprites(key: string, renderer: Renderer): void {
    const textures = generateElvenArcherFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateWarchiefSprites(key: string, renderer: Renderer): void {
    const textures = generateWarchiefFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateArchmageSprites(key: string, renderer: Renderer): void {
    const textures = generateArchmageFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateHeroSprites(key: string, renderer: Renderer): void {
    const textures = generateHeroFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateBatteringRamSprites(key: string, renderer: Renderer): void {
    const textures = generateBatteringRamFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateBallistaSprites(key: string, renderer: Renderer): void {
    const textures = generateBallistaFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateBoltThrowerSprites(key: string, renderer: Renderer): void {
    const textures = generateBoltThrowerFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateCatapultSprites(key: string, renderer: Renderer): void {
    const textures = generateCatapultFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateSiegeCatapultSprites(key: string, renderer: Renderer): void {
    const textures = generateSiegeCatapultFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateTrebuchetSprites(key: string, renderer: Renderer): void {
    const textures = generateTrebuchetFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateLongbowmanSprites(key: string, renderer: Renderer): void {
    const textures = generateLongbowmanFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateCrossbowmanSprites(key: string, renderer: Renderer): void {
    const textures = generateCrossbowmanFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateGiantFrogSprites(key: string, renderer: Renderer): void {
    const textures = generateGiantFrogFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateVoidSnailSprites(key: string, renderer: Renderer): void {
    const textures = generateVoidSnailFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateSpiderSprites(key: string, renderer: Renderer): void {
    const textures = generateSpiderFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateDevourerSprites(key: string, renderer: Renderer): void {
    const textures = generateDevourerFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateDiplomatSprites(key: string, renderer: Renderer): void {
    const textures = generateDiplomatFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  /** Find the largest frame count for a given (sheet, state) pair. */
  private _generateGolemSprites(key: string, renderer: Renderer): void {
    const textures = generateGolemFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateSummonedSprites(key: string, renderer: Renderer): void {
    const textures = generateSummonedFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateConstructionistSprites(
    key: string,
    renderer: Renderer,
  ): void {
    const textures = generateConstructionistFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateAssassinSprites(key: string, renderer: Renderer): void {
    const textures = generateAssassinFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

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

  private _generateRepeaterSprites(key: string, renderer: Renderer): void {
    const textures = generateRepeaterFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateRoyalLancerSprites(key: string, renderer: Renderer): void {
    const textures = generateRoyalLancerFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateTrollSprites(key: string, renderer: Renderer): void {
    const textures = generateTrollFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateRhinoSprites(key: string, renderer: Renderer): void {
    const textures = generateRhinoFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generatePixieSprites(key: string, renderer: Renderer): void {
    const textures = generatePixieFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateFireImpSprites(key: string, renderer: Renderer): void {
    const textures = generateFireImpFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateIceImpSprites(key: string, renderer: Renderer): void {
    const textures = generateIceImpFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateLightningImpSprites(key: string, renderer: Renderer): void {
    const textures = generateLightningImpFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateDistortionImpSprites(key: string, renderer: Renderer): void {
    const textures = generateDistortionImpFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateBatSprites(key: string, renderer: Renderer): void {
    const textures = generateBatFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateTemplarSprites(key: string, renderer: Renderer): void {
    const textures = generateTemplarFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateAngelSprites(key: string, renderer: Renderer): void {
    const textures = generateAngelFrames(renderer);
    for (let row = 0; row < 5; row++) {
      const state = Object.values(UnitState)[row];
      const stateTextures: Texture[] = [];
      for (let col = 0; col < 8; col++) {
        stateTextures.push(textures[row * 8 + col]);
      }
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
    }
  }

  private _generateDefenderSprites(key: string, renderer: Renderer): void {
    const textures = generateDefenderFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generatePhalanxSprites(key: string, renderer: Renderer): void {
    const textures = generatePhalanxFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateRoyalPhalanxSprites(key: string, renderer: Renderer): void {
    const textures = generateRoyalPhalanxFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateRoyalDefenderSprites(key: string, renderer: Renderer): void {
    const textures = generateRoyalDefenderFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateAxemanSprites(key: string, renderer: Renderer): void {
    const textures = generateAxemanFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateBerserkerSprites(key: string, renderer: Renderer): void {
    const textures = generateBerserkerFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  /**
   * Generate detailed procedural javelineer sprites using dedicated
   * JavelineerSpriteGen module. Populates cache for all states.
   */
  private _generateJavelineerSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateJavelineerFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  /**
   * Generate detailed procedural arbelestier sprites using dedicated
   * ArbelestierSpriteGen module. Populates cache for all states.
   */
  private _generateArbelestierSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateArbelestierFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateRufusSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateRufusFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateTroubadourSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateTroubadourFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateGiantCourtJesterSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateGiantCourtJesterFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateFishermanSprites(key: string, renderer: Renderer): void {
    const stateTextures = generateFishermanFrames(renderer);
    for (const [state, textures] of stateTextures) {
      const ck = cacheKey(key, state);
      if (!this._cache.has(ck)) {
        this._cache.set(ck, textures);
      }
    }
  }

  private _generateFireElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateFireElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateIceElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateIceElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateVampireBatSprites(key: string, renderer: Renderer): void {
    const textures = generateVampireBatFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateMinorFireElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateMinorFireElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateMinorIceElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateMinorIceElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateLightningElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateLightningElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateDistortionElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateDistortionElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateMinorLightningElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateMinorLightningElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }

  private _generateMinorDistortionElementalSprites(key: string, renderer: Renderer): void {
    const textures = generateMinorDistortionElementalFrames(renderer);
    for (const state of Object.values(UnitState)) {
      const stateTextures = textures.get(state);
      if (stateTextures) {
        const ck = cacheKey(key, state);
        if (!this._cache.has(ck)) this._cache.set(ck, stateTextures);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Singleton
// ---------------------------------------------------------------------------

export const animationManager = new AnimationManager();
