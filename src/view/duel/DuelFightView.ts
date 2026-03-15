// ---------------------------------------------------------------------------
// Duel mode – main fight rendering view (skeleton-based)
// ---------------------------------------------------------------------------

import { Container, Graphics } from "pixi.js";
import { DuelFighterState } from "../../types";
import { DUEL_CHARACTERS } from "../../duel/config/DuelCharacterDefs";
import type { DuelFighter, DuelState } from "../../duel/state/DuelState";
import {
  drawFighterSkeleton,
  drawFighterShadow,
  type FighterPose,
  type FighterPalette,
  type DrawFighterOptions,
} from "./DuelSkeletonRenderer";
import { ARTHUR_PALETTE, ARTHUR_POSES, drawArthurExtras, drawArthurBackExtras } from "./DuelArthurPoses";
import { MERLIN_PALETTE, MERLIN_POSES, drawMerlinExtras } from "./DuelMerlinPoses";
import { ELAINE_PALETTE, ELAINE_POSES, drawElaineExtras } from "./DuelElainePoses";
import { LANCELOT_PALETTE, LANCELOT_POSES, drawLancelotExtras, drawLancelotBackExtras } from "./DuelLancelotPoses";
import { GUINEVERE_PALETTE, GUINEVERE_POSES, drawGuinevereExtras, drawGuinevereBackExtras } from "./DuelGuineverePoses";
import { MORGAN_PALETTE, MORGAN_POSES, drawMorganExtras } from "./DuelMorganPoses";
import { GAWAIN_PALETTE, GAWAIN_POSES, drawGawainExtras } from "./DuelGawainPoses";
import { MORDRED_PALETTE, MORDRED_POSES, drawMordredExtras, drawMordredBackExtras } from "./DuelMordredPoses";
import { GALAHAD_PALETTE, GALAHAD_POSES, drawGalahadExtras, drawGalahadBackExtras } from "./DuelGalahadPoses";
import { PERCIVAL_PALETTE, PERCIVAL_POSES, drawPercivalExtras, drawPercivalBackExtras } from "./DuelPercivalPoses";
import { TRISTAN_PALETTE, TRISTAN_POSES, drawTristanExtras, drawTristanBackExtras } from "./DuelTristanPoses";
import { NIMUE_PALETTE, NIMUE_POSES, drawNimueExtras } from "./DuelNimuePoses";
import { KAY_PALETTE, KAY_POSES, drawKayExtras } from "./DuelKayPoses";
import { BEDIVERE_PALETTE, BEDIVERE_POSES, drawBedivereExtras, drawBedivereBackExtras } from "./DuelBediverePoses";
import { PELLINORE_PALETTE, PELLINORE_POSES, drawPellinoreExtras } from "./DuelPellinorePoses";
import { IGRAINE_PALETTE, IGRAINE_POSES, drawIgraineExtras } from "./DuelIgrainePoses";
import { ECTOR_PALETTE, ECTOR_POSES, drawEctorExtras } from "./DuelEctorPoses";
import { BORS_PALETTE, BORS_POSES, drawBorsExtras } from "./DuelBorsPoses";
import { UTHER_PALETTE, UTHER_POSES, drawUtherExtras } from "./DuelUtherPoses";
import { LOT_PALETTE, LOT_POSES, drawLotExtras, drawLotBackExtras } from "./DuelLotPoses";

// ---- Character data lookup -------------------------------------------------

const PALETTES: Record<string, FighterPalette> = {
  arthur: ARTHUR_PALETTE,
  merlin: MERLIN_PALETTE,
  elaine: ELAINE_PALETTE,
  lancelot: LANCELOT_PALETTE,
  guinevere: GUINEVERE_PALETTE,
  morgan: MORGAN_PALETTE,
  gawain: GAWAIN_PALETTE,
  mordred: MORDRED_PALETTE,
  galahad: GALAHAD_PALETTE,
  percival: PERCIVAL_PALETTE,
  tristan: TRISTAN_PALETTE,
  nimue: NIMUE_PALETTE,
  kay: KAY_PALETTE,
  bedivere: BEDIVERE_PALETTE,
  pellinore: PELLINORE_PALETTE,
  igraine: IGRAINE_PALETTE,
  ector: ECTOR_PALETTE,
  bors: BORS_PALETTE,
  uther: UTHER_PALETTE,
  lot: LOT_PALETTE,
};

const POSES: Record<string, Record<string, FighterPose[]>> = {
  arthur: ARTHUR_POSES,
  merlin: MERLIN_POSES,
  elaine: ELAINE_POSES,
  lancelot: LANCELOT_POSES,
  guinevere: GUINEVERE_POSES,
  morgan: MORGAN_POSES,
  gawain: GAWAIN_POSES,
  mordred: MORDRED_POSES,
  galahad: GALAHAD_POSES,
  percival: PERCIVAL_POSES,
  tristan: TRISTAN_POSES,
  nimue: NIMUE_POSES,
  kay: KAY_POSES,
  bedivere: BEDIVERE_POSES,
  pellinore: PELLINORE_POSES,
  igraine: IGRAINE_POSES,
  ector: ECTOR_POSES,
  bors: BORS_POSES,
  uther: UTHER_POSES,
  lot: LOT_POSES,
};

const EXTRAS: Record<string, (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void> = {
  arthur: drawArthurExtras,
  merlin: drawMerlinExtras,
  elaine: drawElaineExtras,
  lancelot: drawLancelotExtras,
  guinevere: drawGuinevereExtras,
  morgan: drawMorganExtras,
  gawain: drawGawainExtras,
  mordred: drawMordredExtras,
  galahad: drawGalahadExtras,
  percival: drawPercivalExtras,
  tristan: drawTristanExtras,
  nimue: drawNimueExtras,
  kay: drawKayExtras,
  bedivere: drawBedivereExtras,
  pellinore: drawPellinoreExtras,
  igraine: drawIgraineExtras,
  ector: drawEctorExtras,
  bors: drawBorsExtras,
  uther: drawUtherExtras,
  lot: drawLotExtras,
};

const BACK_EXTRAS: Record<string, (g: Graphics, p: FighterPose, pal: FighterPalette, isFlashing: boolean, flashColor: number) => void> = {
  arthur: drawArthurBackExtras,
  lancelot: drawLancelotBackExtras,
  guinevere: drawGuinevereBackExtras,
  mordred: drawMordredBackExtras,
  galahad: drawGalahadBackExtras,
  percival: drawPercivalBackExtras,
  tristan: drawTristanBackExtras,
  bedivere: drawBedivereBackExtras,
  lot: drawLotBackExtras,
};

// ---- Projectile colors -----------------------------------------------------

const PROJECTILE_COLORS: Record<string, number> = {
  arcane_bolt: 0x8888ff,
  frost_wave: 0x88ccff,
  power_shot: 0xddbb44,
  backflip_shot: 0xddbb44,
  spear_throw: 0xccbb88,
  // Morgan
  shadow_bolt: 0xaa44ff,
  dark_wave: 0x6622aa,
  // Gawain
  sun_arrow: 0xffcc00,
  solar_flip: 0xffcc00,
  rapid_volley: 0xffcc00,
  radiant_shot: 0xffee44,
  // Nimue
  water_bolt: 0x44ccff,
  // Tristan
  lance_toss: 0xccbb88,
  // Kay
  pike_toss: 0x998877,
  // Igraine
  holy_bolt: 0xffee88,
  sacred_wave: 0xffee88,
  // Ector
  crossbow_bolt: 0x888899,
  retreat_shot: 0x888899,
  rapid_bolts: 0x888899,
  heavy_bolt: 0x888899,
  // Uther
  dragon_bolt: 0xcc4422,
  low_shot: 0xcc4422,
  pendragon_retreat: 0xcc4422,
  siege_volley: 0xcc4422,
  dragon_bolt_heavy: 0xff4422,
};

// ---- Hit spark -------------------------------------------------------------

const SPARK_DURATION = 15;

interface HitSpark {
  x: number;
  y: number;
  timer: number;
}

// ---- Special move VFX definitions ------------------------------------------

// Which moves are specials (need flashy VFX)
const ARTHUR_SPECIALS = new Set([
  "sword_thrust", "overhead_cleave", "low_sweep",
  "rising_slash", "shield_charge", "excalibur",
  "hundred_slashes", "parry_counter",
]);
const MERLIN_SPECIALS = new Set([
  "arcane_bolt", "thunder_strike", "frost_wave",
  "teleport", "arcane_storm", "mystic_barrier",
  "void_rift", "mana_shield",
]);
const ELAINE_SPECIALS = new Set([
  "power_shot", "rain_of_arrows", "leg_sweep",
  "backflip_shot", "triple_shot", "hunters_trap",
  "piercing_arrow", "evasive_strike",
]);
const LANCELOT_SPECIALS = new Set([
  "spear_lunge", "overhead_impale", "lance_sweep",
  "rising_lance", "lance_charge", "spear_throw",
  "thousand_thrusts", "counter_stance",
]);
const ALL_SPECIALS: Record<string, Set<string>> = {
  arthur: ARTHUR_SPECIALS,
  merlin: MERLIN_SPECIALS,
  elaine: ELAINE_SPECIALS,
  lancelot: LANCELOT_SPECIALS,
  guinevere: new Set(["divine_thrust", "holy_cleave", "sanctified_sweep", "radiant_rise", "royal_charge", "blessed_blade", "divine_flurry", "royal_parry"]),
  morgan: new Set(["shadow_bolt", "hex_strike", "dark_wave", "shadow_step", "curse_storm", "fay_barrier", "soul_drain", "dark_counter"]),
  gawain: new Set(["sun_arrow", "blazing_rain", "low_kick", "solar_flip", "rapid_volley", "sun_trap", "radiant_shot", "dawn_strike"]),
  mordred: new Set(["dark_thrust", "treachery_cleave", "shadow_sweep", "usurper_rise", "dark_charge", "betrayal_blade", "shadow_frenzy", "dark_parry"]),
  galahad: new Set(["holy_thrust", "divine_cleave", "purifying_sweep", "ascending_light", "shield_rush", "grail_strike", "holy_barrage", "aegis_counter"]),
  percival: new Set(["quest_thrust", "pilgrim_cleave", "seeker_sweep", "grail_rise", "zealous_charge", "quest_strike", "pilgrim_fury", "pilgrim_guard"]),
  tristan: new Set(["lance_pierce", "sorrow_impale", "lance_trip", "mourning_rise", "grief_charge", "lance_toss", "cross_lance", "sorrow_counter"]),
  nimue: new Set(["water_bolt", "tidal_strike", "frost_wave", "mist_step", "lake_storm", "water_shield", "whirlpool", "ice_counter"]),
  kay: new Set(["pike_thrust", "authority_slam", "pike_sweep", "pike_vault", "bull_rush", "pike_toss", "pike_storm", "stern_guard"]),
  bedivere: new Set(["shield_thrust", "tower_slam", "low_bash", "rising_guard", "fortress_charge", "last_stand", "shield_barrage", "iron_wall"]),
  pellinore: new Set(["axe_cleave", "beast_slam", "ground_smash", "savage_rise", "stampede", "questing_blow", "wild_swing", "beast_guard"]),
  igraine: new Set(["holy_bolt", "divine_strike", "sacred_wave", "grace_step", "heaven_storm", "divine_barrier", "smite", "prayer_counter"]),
  ector: new Set(["crossbow_bolt", "bomb_lob", "caltrops", "retreat_shot", "rapid_bolts", "bear_trap", "heavy_bolt", "gadget_dodge"]),
  bors: new Set(["axe_lunge", "overhead_axe", "low_chop", "rising_axe", "bull_charge", "steadfast_blow", "berserker_chops", "iron_resolve"]),
  uther: new Set(["dragon_bolt", "fire_rain", "low_shot", "pendragon_retreat", "siege_volley", "dragon_trap", "dragon_bolt_heavy", "royal_dodge"]),
  lot: new Set(["death_thrust", "orkney_cleave", "reaper_sweep", "death_rise", "dark_charge", "soul_reap", "death_flurry", "death_counter"]),
};

// Zeal (ultimate) moves — even flashier VFX
const ZEAL_MOVES: Record<string, Set<string>> = {
  arthur: new Set(["royal_judgment", "excalibur_unleashed"]),
  merlin: new Set(["thunder_wrath", "arcane_apocalypse"]),
  elaine: new Set(["storm_volley", "celestial_arrow"]),
  lancelot: new Set(["dragon_lance", "spear_whirlwind"]),
  guinevere: new Set(["divine_retribution", "queens_judgment"]),
  morgan: new Set(["shadow_apocalypse", "fay_eclipse"]),
  gawain: new Set(["solar_barrage", "sunburst_arrow"]),
  mordred: new Set(["usurper_wrath", "treachery_unleashed"]),
  galahad: new Set(["holy_radiance", "grail_ascension"]),
  percival: new Set(["grail_quest", "sacred_revelation"]),
  tristan: new Set(["sorrow_tempest", "lament_drive"]),
  nimue: new Set(["tidal_wrath", "lake_judgment"]),
  kay: new Set(["seneschal_fury", "martial_authority"]),
  bedivere: new Set(["bulwark_crash", "loyal_sacrifice"]),
  pellinore: new Set(["questing_beast", "primal_fury"]),
  igraine: new Set(["divine_grace", "cornwall_judgment"]),
  ector: new Set(["siege_barrage", "engineer_masterwork"]),
  bors: new Set(["steadfast_fury", "unbreakable_will"]),
  uther: new Set(["pendragon_barrage", "dragon_fury"]),
  lot: new Set(["orkney_doom", "death_sentence"]),
};

// Zeal VFX colors — brighter, more intense than specials
const ZEAL_COLORS: Record<string, { primary: number; secondary: number; glow: number }> = {
  arthur: { primary: 0xffee88, secondary: 0xffaa22, glow: 0xffffff },
  merlin: { primary: 0xaaaaff, secondary: 0x6644ff, glow: 0xffffff },
  elaine: { primary: 0x88eeff, secondary: 0x44aadd, glow: 0xffffff },
  lancelot: { primary: 0xffee66, secondary: 0xddaa22, glow: 0xffffff },
  guinevere: { primary: 0xffffaa, secondary: 0xddaa33, glow: 0xffffff },
  morgan: { primary: 0xcc66ff, secondary: 0x8822cc, glow: 0xffffff },
  gawain: { primary: 0xffdd44, secondary: 0xff8800, glow: 0xffffff },
  mordred: { primary: 0xff4444, secondary: 0xcc0000, glow: 0xffffff },
  galahad: { primary: 0xaaddff, secondary: 0x6699dd, glow: 0xffffff },
  percival: { primary: 0x88bbee, secondary: 0x4488cc, glow: 0xffffff },
  tristan: { primary: 0x6699cc, secondary: 0x445577, glow: 0xffffff },
  nimue: { primary: 0x66eeff, secondary: 0x2299cc, glow: 0xffffff },
  kay: { primary: 0xccbb88, secondary: 0x998866, glow: 0xffffff },
  bedivere: { primary: 0xaabbaa, secondary: 0x778877, glow: 0xffffff },
  pellinore: { primary: 0xddaa44, secondary: 0xaa7722, glow: 0xffffff },
  igraine: { primary: 0xffeeaa, secondary: 0xddcc66, glow: 0xffffff },
  ector: { primary: 0xaabb99, secondary: 0x778866, glow: 0xffffff },
  bors: { primary: 0x88aa66, secondary: 0x668844, glow: 0xffffff },
  uther: { primary: 0xff6644, secondary: 0xcc3311, glow: 0xffffff },
  lot: { primary: 0x66ff88, secondary: 0x44aa55, glow: 0xffffff },
};

// Special VFX color themes per character
const SPECIAL_COLORS: Record<string, { primary: number; secondary: number; glow: number }> = {
  arthur: { primary: 0xffdd44, secondary: 0xff8800, glow: 0xffffaa },
  merlin: { primary: 0x8866ff, secondary: 0x4422cc, glow: 0xccaaff },
  elaine: { primary: 0x44ddff, secondary: 0x2288aa, glow: 0xaaeeff },
  lancelot: { primary: 0xddcc44, secondary: 0xaa8822, glow: 0xffeeaa },
  guinevere: { primary: 0xffee66, secondary: 0xddaa22, glow: 0xffffcc },
  morgan: { primary: 0xaa44ff, secondary: 0x6622aa, glow: 0xcc88ff },
  gawain: { primary: 0xffcc00, secondary: 0xdd8800, glow: 0xffee88 },
  mordred: { primary: 0xcc2222, secondary: 0x880000, glow: 0xff6666 },
  galahad: { primary: 0x88ccff, secondary: 0x4488cc, glow: 0xccddff },
  percival: { primary: 0x6699cc, secondary: 0x4466aa, glow: 0xaaccee },
  tristan: { primary: 0x4477aa, secondary: 0x335577, glow: 0x88aacc },
  nimue: { primary: 0x44ccff, secondary: 0x2299cc, glow: 0x88eeff },
  kay: { primary: 0xaa9966, secondary: 0x886644, glow: 0xccbb88 },
  bedivere: { primary: 0x889988, secondary: 0x667766, glow: 0xaabbaa },
  pellinore: { primary: 0xcc8833, secondary: 0xaa6622, glow: 0xddaa55 },
  igraine: { primary: 0xffee88, secondary: 0xddcc44, glow: 0xffffcc },
  ector: { primary: 0x889977, secondary: 0x667755, glow: 0xaabb99 },
  bors: { primary: 0x669944, secondary: 0x447722, glow: 0x88bb66 },
  uther: { primary: 0xcc4422, secondary: 0xaa2211, glow: 0xff6644 },
  lot: { primary: 0x44aa44, secondary: 0x228822, glow: 0x66ff88 },
};

// ---- Special VFX particle --------------------------------------------------

interface SpecialVFXParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  type: "spark" | "trail" | "ring" | "slash" | "lightning" | "flash";
}

// ---- Fight view class ------------------------------------------------------

export class DuelFightView {
  readonly container = new Container();

  private _arenaLayer = new Container();
  private _fighterLayer = new Container();
  private _fxLayer = new Container();

  private _p1Gfx = new Graphics();
  private _p2Gfx = new Graphics();
  private _projGfx = new Graphics();
  private _sparkGfx = new Graphics();
  private _shadowGfx = new Graphics();
  private _specialFxGfx = new Graphics();
  private _slashTrailGfx = new Graphics();

  private _sparks: HitSpark[] = [];
  private _specialParticles: SpecialVFXParticle[] = [];

  // Track previous move to detect special start
  private _prevMoves: [string | null, string | null] = [null, null];

  // Track previous HP for hit-flash detection
  private _prevFighterHp: [number, number] = [0, 0];

  // Hit flash timers per fighter (white flash on defender)
  private _hitFlashTimers: [number, number] = [0, 0];

  // Screen shake intensity (decays over time for heavy hits)
  private _screenShakeIntensity = 0;
  private _screenShakeDuration = 0;

  // Slash trail positions for sword/weapon attacks
  private _slashTrails: Array<{
    points: Array<{ x: number; y: number; alpha: number }>;
    color: number;
    life: number;
    maxLife: number;
  }> = [];

  constructor() {
    this.container.addChild(this._arenaLayer);
    this.container.addChild(this._shadowGfx);
    this.container.addChild(this._specialFxGfx);
    this.container.addChild(this._slashTrailGfx);
    this.container.addChild(this._fighterLayer);
    this.container.addChild(this._fxLayer);

    this._fighterLayer.addChild(this._p1Gfx);
    this._fighterLayer.addChild(this._p2Gfx);
    this._fxLayer.addChild(this._projGfx);
    this._fxLayer.addChild(this._sparkGfx);
  }

  get arenaLayer(): Container {
    return this._arenaLayer;
  }

  init(_sw: number, _sh: number): void {
    this._sparks = [];
    this._specialParticles = [];
    this._prevMoves = [null, null];
    this._prevFighterHp = [0, 0];
    this._hitFlashTimers = [0, 0];
    this._screenShakeIntensity = 0;
    this._screenShakeDuration = 0;
    this._slashTrails = [];
  }

  /** Call each display frame to render current state. */
  update(state: DuelState): void {
    // Check for new specials and spawn VFX
    this._checkSpecialStarts(state);

    // Detect hits for enhanced flash/shake effects
    this._detectHitEffects(state);

    // Spawn slash trails for active melee attacks
    this._updateSlashTrails(state);

    this._drawFighter(this._p1Gfx, state.fighters[0], state, 0);
    this._drawFighter(this._p2Gfx, state.fighters[1], state, 1);
    this._drawShadows(state);
    this._drawProjectiles(state);
    this._drawSparks();
    this._drawSpecialVFX(state);
    this._drawSlashTrails();

    // Decay hit flash timers
    for (let i = 0; i < 2; i++) {
      if (this._hitFlashTimers[i] > 0) this._hitFlashTimers[i]--;
    }

    // Enhanced screen shake: combines hit freeze shake with heavy hit shake
    if (this._screenShakeDuration > 0) {
      this._screenShakeDuration--;
      const decay = this._screenShakeDuration / 12;
      const shakeX = (Math.random() - 0.5) * this._screenShakeIntensity * decay;
      const shakeY = (Math.random() - 0.5) * this._screenShakeIntensity * decay * 0.7;
      this.container.position.set(shakeX, shakeY);
    } else if (state.slowdownFrames > 0) {
      // Standard hit freeze shake
      const shake = (Math.random() - 0.5) * 6;
      this.container.position.set(shake, (Math.random() - 0.5) * 4);
    } else {
      this.container.position.set(0, 0);
    }
  }

  /** Spawn a hit spark effect at the given position. */
  addSpark(x: number, y: number): void {
    this._sparks.push({ x, y, timer: SPARK_DURATION });
  }

  /** Called externally when a hit is detected with damage info. */
  addHitEffect(defenderIdx: 0 | 1, damage: number, maxHp: number, attackerX: number, defenderX: number, defenderY: number, isHeavy: boolean): void {
    // Hit flash on defender
    this._hitFlashTimers[defenderIdx] = isHeavy ? 10 : 6;

    // Screen shake intensity based on damage
    const dmgRatio = damage / maxHp;
    if (dmgRatio > 0.08) {
      this._screenShakeIntensity = isHeavy ? 14 : 8;
      this._screenShakeDuration = isHeavy ? 12 : 6;
    }

    // Impact sparks burst (more particles than the basic spark)
    const hitX = (attackerX + defenderX) / 2;
    const hitY = defenderY - 60;
    const dir = attackerX < defenderX ? 1 : -1;
    const sparkCount = isHeavy ? 18 : 10;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (Math.random() - 0.5) * Math.PI * 1.2 + (dir > 0 ? 0 : Math.PI);
      const speed = 3 + Math.random() * (isHeavy ? 8 : 5);
      this._specialParticles.push({
        x: hitX + (Math.random() - 0.5) * 12,
        y: hitY + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 10 + Math.random() * 8,
        maxLife: 18,
        size: 2 + Math.random() * (isHeavy ? 4 : 2.5),
        color: isHeavy ? (Math.random() > 0.3 ? 0xffdd44 : 0xffffff) : (Math.random() > 0.5 ? 0xffaa44 : 0xffffff),
        type: "spark",
      });
    }

    // Impact flash at contact point
    if (isHeavy) {
      this._specialParticles.push({
        x: hitX,
        y: hitY,
        vx: 0, vy: 0,
        life: 8,
        maxLife: 8,
        size: 60,
        color: 0xffffff,
        type: "flash",
      });
    }
  }

  /** Detect hit events and trigger enhanced visual effects. */
  private _detectHitEffects(state: DuelState): void {
    for (let i = 0; i < 2; i++) {
      const f = state.fighters[i];
      const prevHp = this._prevFighterHp[i];

      if (prevHp > 0 && f.hp < prevHp) {
        const damage = prevHp - f.hp;
        const isHeavy = damage > f.maxHp * 0.08;
        const attackerIdx = i === 0 ? 1 : 0;
        const attacker = state.fighters[attackerIdx];

        this.addHitEffect(
          i as 0 | 1,
          damage,
          f.maxHp,
          attacker.position.x,
          f.position.x,
          f.position.y,
          isHeavy,
        );
      }

      this._prevFighterHp[i] = f.hp;
    }
  }

  /** Spawn and update weapon slash trails during melee attacks. */
  private _updateSlashTrails(state: DuelState): void {
    for (const f of state.fighters) {
      if (f.state !== DuelFighterState.ATTACK || !f.currentMove) continue;

      const charDef = DUEL_CHARACTERS[f.characterId];
      const move = charDef.normals[f.currentMove] ?? charDef.specials[f.currentMove] ?? charDef.zeals[f.currentMove];
      if (!move || move.isProjectile) continue;

      // Only during active frames
      if (f.moveFrame < move.startup || f.moveFrame >= move.startup + move.active) continue;

      // Get the fighter type for trail color
      const fType = charDef.fighterType;
      const colors = SPECIAL_COLORS[f.characterId] ?? SPECIAL_COLORS.arthur;
      const isSpecial = ALL_SPECIALS[f.characterId]?.has(f.currentMove);
      const isZeal = ZEAL_MOVES[f.characterId]?.has(f.currentMove);
      const trailColor = isZeal ? 0xffffff : isSpecial ? colors.primary : (fType === "sword" || fType === "axe" ? 0xccccdd : fType === "spear" ? 0xbbaa88 : 0xaabbcc);

      const dir = f.facingRight ? 1 : -1;
      const hbX = f.position.x + dir * move.hitbox.x;
      const hbY = f.position.y + move.hitbox.y;

      // Find existing trail for this move or create one
      let trail = this._slashTrails.find(t => t.life > 0 && t.color === trailColor && t.points.length < 12);
      if (!trail) {
        trail = {
          points: [],
          color: trailColor,
          life: move.active + 8,
          maxLife: move.active + 8,
        };
        this._slashTrails.push(trail);
      }

      // Add point to trail
      trail.points.push({
        x: hbX + (Math.random() - 0.5) * 6,
        y: hbY - move.hitbox.height / 2 + (Math.random() - 0.5) * 6,
        alpha: 1.0,
      });
    }

    // Decay trails
    for (let i = this._slashTrails.length - 1; i >= 0; i--) {
      this._slashTrails[i].life--;
      // Fade points
      for (const p of this._slashTrails[i].points) {
        p.alpha *= 0.88;
      }
      if (this._slashTrails[i].life <= 0) {
        this._slashTrails.splice(i, 1);
      }
    }
  }

  /** Draw weapon slash trails. */
  private _drawSlashTrails(): void {
    this._slashTrailGfx.clear();
    for (const trail of this._slashTrails) {
      if (trail.points.length < 2) continue;
      const t = trail.life / trail.maxLife;

      for (let j = 1; j < trail.points.length; j++) {
        const p0 = trail.points[j - 1];
        const p1 = trail.points[j];
        const segAlpha = Math.min(p0.alpha, p1.alpha) * t;
        if (segAlpha < 0.02) continue;

        // Bright slash line
        const width = 4 + (1 - j / trail.points.length) * 6;
        this._slashTrailGfx.moveTo(p0.x, p0.y);
        this._slashTrailGfx.lineTo(p1.x, p1.y);
        this._slashTrailGfx.stroke({ color: trail.color, width: width * t, alpha: segAlpha * 0.7, cap: "round" });

        // Bright core
        this._slashTrailGfx.moveTo(p0.x, p0.y);
        this._slashTrailGfx.lineTo(p1.x, p1.y);
        this._slashTrailGfx.stroke({ color: 0xffffff, width: width * t * 0.3, alpha: segAlpha * 0.5, cap: "round" });
      }

      // Glow around trail tip
      if (trail.points.length > 0) {
        const tip = trail.points[trail.points.length - 1];
        if (tip.alpha > 0.1) {
          this._slashTrailGfx.circle(tip.x, tip.y, 8 * t);
          this._slashTrailGfx.fill({ color: trail.color, alpha: tip.alpha * 0.3 * t });
        }
      }
    }
  }

  // ---- Special VFX detection -----------------------------------------------

  private _checkSpecialStarts(state: DuelState): void {
    for (let i = 0; i < 2; i++) {
      const f = state.fighters[i];
      const prevMove = this._prevMoves[i];
      const curMove = f.state === DuelFighterState.ATTACK ? f.currentMove : null;

      // Detect when a new special or zeal move starts
      if (curMove && curMove !== prevMove) {
        const isZeal = ZEAL_MOVES[f.characterId]?.has(curMove);
        const isSpecial = ALL_SPECIALS[f.characterId]?.has(curMove);
        if (isZeal) {
          this._spawnZealVFX(f, curMove, state);
        } else if (isSpecial) {
          this._spawnSpecialVFX(f, curMove);
        }
      }

      this._prevMoves[i] = curMove;

      // Spawn trailing particles during active frames
      if (
        f.state === DuelFighterState.ATTACK &&
        f.currentMove
      ) {
        const isZeal = ZEAL_MOVES[f.characterId]?.has(f.currentMove);
        const isSpecial = ALL_SPECIALS[f.characterId]?.has(f.currentMove);
        if (isZeal || isSpecial) {
          const charDef = DUEL_CHARACTERS[f.characterId];
          const move = isZeal ? charDef.zeals[f.currentMove] : charDef.specials[f.currentMove];
          if (move && f.moveFrame >= move.startup && f.moveFrame < move.startup + move.active) {
            this._spawnActiveTrail(f, isZeal);
          }
        }
      }
    }
  }

  private _spawnSpecialVFX(fighter: DuelFighter, moveId: string): void {
    const colors = SPECIAL_COLORS[fighter.characterId] ?? SPECIAL_COLORS.arthur;
    const dir = fighter.facingRight ? 1 : -1;
    const x = fighter.position.x;
    const y = fighter.position.y;

    // Initial burst of energy sparks
    const sparkCount = 12;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 3 + Math.random() * 5;
      this._specialParticles.push({
        x: x + dir * 20 + Math.random() * 20 - 10,
        y: y - 90 + Math.random() * 40 - 20,
        vx: Math.cos(angle) * speed * dir,
        vy: Math.sin(angle) * speed - 2,
        life: 18 + Math.random() * 10,
        maxLife: 28,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? colors.primary : colors.glow,
        type: "spark",
      });
    }

    // Expanding ring effect
    this._specialParticles.push({
      x: x + dir * 15,
      y: y - 85,
      vx: 0,
      vy: 0,
      life: 20,
      maxLife: 20,
      size: 10,
      color: colors.primary,
      type: "ring",
    });

    // Character-specific startup flash (based on fighter type for new characters)
    const charDef = DUEL_CHARACTERS[fighter.characterId];
    const fType = charDef?.fighterType ?? "sword";
    if (fType === "sword" || fType === "axe") {
      this._spawnSlashArc(x + dir * 30, y - 100, dir, colors, moveId);
    } else if (fType === "mage") {
      this._spawnMagicBurst(x, y - 90, colors);
    } else if (fType === "archer") {
      this._spawnWindTrail(x + dir * 20, y - 80, dir, colors);
    } else if (fType === "spear") {
      this._spawnLanceTrail(x + dir * 20, y - 90, dir, colors, moveId);
    }
  }

  private _spawnSlashArc(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
    moveId: string,
  ): void {
    // Create a sweeping arc of particles that follow a slash path
    const isVertical = moveId === "rising_slash" || moveId === "excalibur" || moveId === "overhead_cleave";
    const count = 8;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      let angle: number;
      if (isVertical) {
        angle = -Math.PI * 0.8 + t * Math.PI * 0.6;
      } else {
        angle = -Math.PI * 0.3 + t * Math.PI * 0.6;
      }
      const dist = 25 + t * 30;
      this._specialParticles.push({
        x: cx + Math.cos(angle) * dist * dir,
        y: cy + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 1.5 * dir,
        vy: Math.sin(angle) * 1.5 - 1,
        life: 12 + i * 2,
        maxLife: 12 + i * 2,
        size: 6 - t * 2,
        color: i % 2 === 0 ? colors.glow : colors.primary,
        type: "slash",
      });
    }
  }

  private _spawnMagicBurst(
    cx: number, cy: number,
    colors: { primary: number; secondary: number; glow: number },
  ): void {
    // Spiral particles outward
    for (let i = 0; i < 16; i++) {
      const angle = (i / 16) * Math.PI * 2;
      const speed = 2 + Math.random() * 3;
      this._specialParticles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 22 + Math.random() * 8,
        maxLife: 30,
        size: 2 + Math.random() * 3,
        color: i % 3 === 0 ? colors.glow : i % 3 === 1 ? colors.primary : colors.secondary,
        type: "spark",
      });
    }
    // Second ring
    this._specialParticles.push({
      x: cx,
      y: cy,
      vx: 0,
      vy: 0,
      life: 25,
      maxLife: 25,
      size: 5,
      color: colors.secondary,
      type: "ring",
    });
  }

  private _spawnWindTrail(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
  ): void {
    // Horizontal streak particles
    for (let i = 0; i < 10; i++) {
      this._specialParticles.push({
        x: cx - dir * i * 8,
        y: cy + Math.random() * 30 - 15,
        vx: dir * (4 + Math.random() * 4),
        vy: Math.random() * 2 - 1,
        life: 15 + Math.random() * 8,
        maxLife: 23,
        size: 2 + Math.random() * 3,
        color: i % 2 === 0 ? colors.primary : colors.glow,
        type: "trail",
      });
    }
  }

  private _spawnActiveTrail(fighter: DuelFighter, isZeal = false): void {
    if (!isZeal && Math.random() > 0.4) return; // don't spawn every frame
    if (isZeal && Math.random() > 0.7) return; // zeal spawns more often
    const colors = isZeal
      ? (ZEAL_COLORS[fighter.characterId] ?? ZEAL_COLORS.arthur)
      : (SPECIAL_COLORS[fighter.characterId] ?? SPECIAL_COLORS.arthur);
    const dir = fighter.facingRight ? 1 : -1;
    const x = fighter.position.x + dir * (30 + Math.random() * 40);
    const y = fighter.position.y - 60 - Math.random() * 80;

    this._specialParticles.push({
      x,
      y,
      vx: dir * (1 + Math.random() * 2),
      vy: -1 - Math.random(),
      life: 10 + Math.random() * 8,
      maxLife: 18,
      size: 2 + Math.random() * 3,
      color: Math.random() > 0.5 ? colors.primary : colors.glow,
      type: "spark",
    });
  }

  // ---- Zeal VFX (ultra-flashy ultimates) ------------------------------------

  private _spawnZealVFX(fighter: DuelFighter, moveId: string, state: DuelState): void {
    const colors = ZEAL_COLORS[fighter.characterId] ?? ZEAL_COLORS.arthur;
    const dir = fighter.facingRight ? 1 : -1;
    const x = fighter.position.x;
    const y = fighter.position.y;

    // Screen flash
    this._specialParticles.push({
      x: state.screenW / 2,
      y: state.screenH / 2,
      vx: 0, vy: 0,
      life: 15,
      maxLife: 15,
      size: Math.max(state.screenW, state.screenH),
      color: colors.glow,
      type: "flash",
    });

    // Massive burst of energy sparks (3x more than specials)
    const sparkCount = 36;
    for (let i = 0; i < sparkCount; i++) {
      const angle = (i / sparkCount) * Math.PI * 2 + Math.random() * 0.2;
      const speed = 4 + Math.random() * 8;
      this._specialParticles.push({
        x: x + dir * 15 + Math.random() * 30 - 15,
        y: y - 90 + Math.random() * 60 - 30,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        life: 25 + Math.random() * 15,
        maxLife: 40,
        size: 4 + Math.random() * 6,
        color: Math.random() > 0.3 ? colors.primary : colors.glow,
        type: "spark",
      });
    }

    // Double expanding rings
    this._specialParticles.push({
      x: x + dir * 10,
      y: y - 85,
      vx: 0, vy: 0,
      life: 30,
      maxLife: 30,
      size: 15,
      color: colors.primary,
      type: "ring",
    });
    this._specialParticles.push({
      x: x + dir * 10,
      y: y - 85,
      vx: 0, vy: 0,
      life: 22,
      maxLife: 22,
      size: 8,
      color: colors.glow,
      type: "ring",
    });

    // Rising energy pillar particles
    for (let i = 0; i < 16; i++) {
      this._specialParticles.push({
        x: x + Math.random() * 40 - 20,
        y: y - Math.random() * 20,
        vx: Math.random() * 2 - 1,
        vy: -6 - Math.random() * 8,
        life: 20 + Math.random() * 10,
        maxLife: 30,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.5 ? colors.primary : 0xffffff,
        type: "spark",
      });
    }

    // Character-specific zeal effects (type-based for new characters)
    const zealCharDef = DUEL_CHARACTERS[fighter.characterId];
    const zealFType = zealCharDef?.fighterType ?? "sword";
    if (fighter.characterId === "merlin" && moveId === "thunder_wrath") {
      this._spawnThunderZap(fighter, state, colors);
    } else if (zealFType === "sword" || zealFType === "axe") {
      this._spawnZealSlashBarrage(x, y, dir, colors, moveId);
    } else if (zealFType === "mage") {
      this._spawnArcaneExplosion(x, y, colors);
    } else if (zealFType === "archer") {
      this._spawnZealArrowBarrage(x, y, dir, colors, moveId);
    } else if (zealFType === "spear") {
      this._spawnZealLanceBarrage(x, y, dir, colors, moveId);
    }
  }

  /** Merlin Zeal 1: Lightning zap line from Merlin to opponent */
  private _spawnThunderZap(
    fighter: DuelFighter, state: DuelState,
    colors: { primary: number; secondary: number; glow: number },
  ): void {
    const opponentIdx = state.fighters[0] === fighter ? 1 : 0;
    const opponent = state.fighters[opponentIdx];
    const sx = fighter.position.x;
    const sy = fighter.position.y - 90;
    const ex = opponent.position.x;
    const ey = opponent.position.y - 90;

    // Create jagged lightning segments between start and end
    const segments = 12;
    let px = sx;
    let py = sy;
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const nx = sx + (ex - sx) * t + (i < segments ? (Math.random() - 0.5) * 40 : 0);
      const ny = sy + (ey - sy) * t + (i < segments ? (Math.random() - 0.5) * 50 : 0);

      // Main bolt segment
      this._specialParticles.push({
        x: px, y: py,
        vx: (nx - px) * 0.02,
        vy: (ny - py) * 0.02,
        life: 18 + Math.random() * 6,
        maxLife: 24,
        size: 6 + Math.random() * 3,
        color: 0xffffff,
        type: "lightning",
      });

      // Branch sparks at each node
      if (Math.random() > 0.4) {
        this._specialParticles.push({
          x: nx, y: ny,
          vx: (Math.random() - 0.5) * 6,
          vy: (Math.random() - 0.5) * 6,
          life: 10 + Math.random() * 8,
          maxLife: 18,
          size: 3 + Math.random() * 2,
          color: Math.random() > 0.5 ? 0x88aaff : colors.primary,
          type: "spark",
        });
      }

      px = nx;
      py = ny;
    }

    // Impact spark shower at opponent
    for (let i = 0; i < 20; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 3 + Math.random() * 6;
      this._specialParticles.push({
        x: ex + Math.random() * 20 - 10,
        y: ey + Math.random() * 20 - 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 15 + Math.random() * 10,
        maxLife: 25,
        size: 3 + Math.random() * 4,
        color: Math.random() > 0.3 ? 0xffffff : 0x6688ff,
        type: "spark",
      });
    }

    // Flash at impact point
    this._specialParticles.push({
      x: ex, y: ey,
      vx: 0, vy: 0,
      life: 12,
      maxLife: 12,
      size: 80,
      color: 0xaaccff,
      type: "flash",
    });
  }

  /** Arthur zeal: multi-slash arcs with energy trails */
  private _spawnZealSlashBarrage(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
    moveId: string,
  ): void {
    const slashCount = moveId === "excalibur_unleashed" ? 4 : 3;
    for (let s = 0; s < slashCount; s++) {
      const offset = s * 5;
      const angleBase = -Math.PI * 0.5 + s * 0.4;
      for (let i = 0; i < 10; i++) {
        const t = i / 10;
        const angle = angleBase + t * Math.PI * 0.7;
        const dist = 30 + t * 45 + s * 10;
        this._specialParticles.push({
          x: cx + Math.cos(angle) * dist * dir + dir * 20,
          y: cy - 100 + Math.sin(angle) * dist,
          vx: Math.cos(angle) * 2 * dir,
          vy: Math.sin(angle) * 2 - 1,
          life: 14 + offset + i * 1.5,
          maxLife: 14 + offset + i * 1.5,
          size: 7 - t * 2,
          color: i % 3 === 0 ? 0xffffff : colors.primary,
          type: "slash",
        });
      }
    }
  }

  /** Merlin zeal 2: massive arcane explosion */
  private _spawnArcaneExplosion(
    cx: number, cy: number,
    colors: { primary: number; secondary: number; glow: number },
  ): void {
    // Dense spiral explosion
    for (let i = 0; i < 40; i++) {
      const angle = (i / 40) * Math.PI * 4;
      const speed = 2 + (i / 40) * 6;
      this._specialParticles.push({
        x: cx, y: cy - 90,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 28 + Math.random() * 12,
        maxLife: 40,
        size: 3 + Math.random() * 5,
        color: i % 4 === 0 ? 0xffffff : i % 2 === 0 ? colors.primary : colors.secondary,
        type: "spark",
      });
    }
    // Triple rings
    for (let r = 0; r < 3; r++) {
      this._specialParticles.push({
        x: cx, y: cy - 90,
        vx: 0, vy: 0,
        life: 30 - r * 6,
        maxLife: 30 - r * 6,
        size: 10 + r * 8,
        color: r === 0 ? colors.glow : colors.primary,
        type: "ring",
      });
    }
  }

  /** Elaine zeal: barrage of glowing arrows */
  private _spawnZealArrowBarrage(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
    moveId: string,
  ): void {
    const count = moveId === "celestial_arrow" ? 20 : 14;
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * 40;
      this._specialParticles.push({
        x: cx - dir * (i * 6),
        y: cy - 80 + spread,
        vx: dir * (8 + Math.random() * 6),
        vy: spread * 0.1 + Math.random() * 2 - 1,
        life: 18 + Math.random() * 10,
        maxLife: 28,
        size: 3 + Math.random() * 4,
        color: i % 3 === 0 ? 0xffffff : colors.primary,
        type: "trail",
      });
    }
    if (moveId === "celestial_arrow") {
      // Giant glowing arrow trail
      for (let i = 0; i < 8; i++) {
        this._specialParticles.push({
          x: cx + dir * 20,
          y: cy - 90 + Math.random() * 10 - 5,
          vx: dir * (12 + i * 2),
          vy: 0,
          life: 20 + i * 2,
          maxLife: 20 + i * 2,
          size: 8 - i * 0.5,
          color: 0xffffff,
          type: "trail",
        });
      }
    }
  }

  /** Lancelot special: directional lance thrust streak */
  private _spawnLanceTrail(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
    moveId: string,
  ): void {
    const isVertical = moveId === "rising_lance" || moveId === "overhead_impale" || moveId === "spear_vault";
    const count = 10;
    for (let i = 0; i < count; i++) {
      const t = i / count;
      if (isVertical) {
        // Vertical thrust streak
        this._specialParticles.push({
          x: cx + (Math.random() - 0.5) * 20,
          y: cy + t * 60 - 30,
          vx: (Math.random() - 0.5) * 2,
          vy: -4 - Math.random() * 4,
          life: 14 + i * 1.5,
          maxLife: 14 + i * 1.5,
          size: 5 - t * 2,
          color: i % 2 === 0 ? colors.glow : colors.primary,
          type: "trail",
        });
      } else {
        // Horizontal lance thrust streak
        this._specialParticles.push({
          x: cx - dir * i * 10,
          y: cy + (Math.random() - 0.5) * 20,
          vx: dir * (5 + Math.random() * 5),
          vy: (Math.random() - 0.5) * 1.5,
          life: 14 + Math.random() * 8,
          maxLife: 22,
          size: 3 + Math.random() * 3,
          color: i % 2 === 0 ? colors.primary : colors.glow,
          type: "trail",
        });
      }
    }
    // Impact point spark
    this._specialParticles.push({
      x: cx + dir * 30,
      y: cy,
      vx: 0, vy: 0,
      life: 16,
      maxLife: 16,
      size: 8,
      color: colors.primary,
      type: "ring",
    });
  }

  /** Lancelot zeal: spinning spear barrage / dragon lance charge */
  private _spawnZealLanceBarrage(
    cx: number, cy: number, dir: number,
    colors: { primary: number; secondary: number; glow: number },
    moveId: string,
  ): void {
    if (moveId === "spear_whirlwind") {
      // Spinning vortex of lance energy
      for (let i = 0; i < 30; i++) {
        const angle = (i / 30) * Math.PI * 4;
        const dist = 20 + (i / 30) * 60;
        const speed = 2 + (i / 30) * 4;
        this._specialParticles.push({
          x: cx + Math.cos(angle) * dist * 0.3,
          y: cy - 90 + Math.sin(angle) * dist * 0.3,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 24 + Math.random() * 12,
          maxLife: 36,
          size: 3 + Math.random() * 5,
          color: i % 4 === 0 ? 0xffffff : i % 2 === 0 ? colors.primary : colors.secondary,
          type: "slash",
        });
      }
      // Triple rings for whirlwind
      for (let r = 0; r < 3; r++) {
        this._specialParticles.push({
          x: cx, y: cy - 90,
          vx: 0, vy: 0,
          life: 28 - r * 5,
          maxLife: 28 - r * 5,
          size: 10 + r * 10,
          color: r === 0 ? colors.glow : colors.primary,
          type: "ring",
        });
      }
    } else {
      // Dragon Lance: forward charge trail with intense golden energy
      const count = 18;
      for (let i = 0; i < count; i++) {
        const spread = (Math.random() - 0.5) * 30;
        this._specialParticles.push({
          x: cx - dir * i * 8,
          y: cy - 90 + spread,
          vx: dir * (8 + Math.random() * 8),
          vy: spread * 0.08 + (Math.random() - 0.5) * 2,
          life: 20 + Math.random() * 12,
          maxLife: 32,
          size: 4 + Math.random() * 5,
          color: i % 3 === 0 ? 0xffffff : colors.primary,
          type: "trail",
        });
      }
      // Giant lance tip trail
      for (let i = 0; i < 6; i++) {
        this._specialParticles.push({
          x: cx + dir * 20,
          y: cy - 90 + (Math.random() - 0.5) * 8,
          vx: dir * (14 + i * 2),
          vy: 0,
          life: 22 + i * 2,
          maxLife: 22 + i * 2,
          size: 7 - i * 0.6,
          color: 0xffffff,
          type: "trail",
        });
      }
    }
  }

  // ---- Fighter drawing -----------------------------------------------------

  private _drawFighter(
    g: Graphics,
    fighter: DuelFighter,
    _state: DuelState,
    fighterIdx: number = 0,
  ): void {
    g.clear();

    const charId = fighter.characterId;
    const palette = PALETTES[charId];
    const poses = POSES[charId];
    const extras = EXTRAS[charId];

    if (!palette || !poses) return;

    // Determine which pose to use
    const poseKey = this._getPoseKey(fighter);
    const poseFrames = poses[poseKey] ?? poses["idle"];
    if (!poseFrames || poseFrames.length === 0) return;

    // Determine frame index based on state timer / move frame
    const frameIdx = Math.min(
      this._getFrameIndex(fighter, poseFrames),
      poseFrames.length - 1,
    );
    const currentPose = poseFrames[frameIdx];
    if (!currentPose) return;

    // Position and flip the graphics
    g.position.set(fighter.position.x, fighter.position.y);
    g.scale.x = fighter.facingRight ? 1 : -1;

    // Flash effect on hit (combines hitstun flicker with hit-flash from damage detection)
    const hitFlashTimer = this._hitFlashTimers[fighterIdx] ?? 0;
    const isHitFlash = (fighter.state === DuelFighterState.HIT_STUN &&
      fighter.hitstunFrames % 4 < 2) || (hitFlashTimer > 0 && hitFlashTimer % 3 < 2);

    // Invincibility flicker
    if (fighter.invincibleFrames > 0 && fighter.invincibleFrames % 4 < 2) {
      g.alpha = 0.4;
    } else {
      g.alpha = 1;
    }

    // Hit flash: draw a white/red overlay behind the fighter when just hit
    if (hitFlashTimer > 0) {
      const flashAlpha = (hitFlashTimer / 10) * 0.3;
      g.circle(0, -90, 55);
      g.fill({ color: 0xff4444, alpha: flashAlpha * 0.4 });
      g.circle(0, -90, 35);
      g.fill({ color: 0xffffff, alpha: flashAlpha * 0.3 });
    }

    // Knockback visual: speed lines behind a fighter getting knocked back
    if ((fighter.state === DuelFighterState.HIT_STUN || fighter.state === DuelFighterState.KNOCKDOWN) &&
        fighter.hitstunFrames > 6) {
      const dir = fighter.facingRight ? 1 : -1;
      const kbAlpha = Math.min(fighter.hitstunFrames / 20, 0.5);
      for (let li = 0; li < 5; li++) {
        const lx = -dir * (20 + li * 12) + (Math.random() - 0.5) * 4;
        const ly = -60 - 30 + li * 15 + (Math.random() - 0.5) * 8;
        g.moveTo(lx, ly);
        g.lineTo(lx - dir * (25 + Math.random() * 15), ly);
        g.stroke({ color: 0xffffff, width: 1.5, alpha: kbAlpha * (1 - li * 0.15), cap: "round" });
      }
    }

    // Special/Zeal move glow: add a body aura
    const isZeal = fighter.state === DuelFighterState.ATTACK &&
      fighter.currentMove &&
      ZEAL_MOVES[charId]?.has(fighter.currentMove);
    const isSpecial = !isZeal && fighter.state === DuelFighterState.ATTACK &&
      fighter.currentMove &&
      ALL_SPECIALS[charId]?.has(fighter.currentMove);

    if (isZeal) {
      const colors = ZEAL_COLORS[charId] ?? ZEAL_COLORS.arthur;
      const pulse = 0.5 + Math.sin(fighter.moveFrame * 0.7) * 0.2;
      // Big intense aura for zeal
      g.circle(0, -90, 75 + Math.sin(fighter.moveFrame * 0.4) * 12);
      g.fill({ color: colors.primary, alpha: pulse * 0.35 });
      g.circle(0, -90, 50 + Math.sin(fighter.moveFrame * 0.5) * 6);
      g.fill({ color: colors.glow, alpha: pulse * 0.25 });
      g.circle(0, -90, 30);
      g.fill({ color: 0xffffff, alpha: pulse * 0.15 });
    } else if (isSpecial) {
      const colors = SPECIAL_COLORS[charId] ?? SPECIAL_COLORS.arthur;
      const pulse = 0.3 + Math.sin(fighter.moveFrame * 0.5) * 0.15;
      g.circle(0, -90, 55 + Math.sin(fighter.moveFrame * 0.3) * 8);
      g.fill({ color: colors.primary, alpha: pulse * 0.25 });
      g.circle(0, -90, 35);
      g.fill({ color: colors.glow, alpha: pulse * 0.15 });
    }

    const backExtras = BACK_EXTRAS[charId];

    // Breathing phase: use stateTimer for a slow breathing cycle during idle states
    const isIdleState = fighter.state === DuelFighterState.IDLE ||
      fighter.state === DuelFighterState.WALK_FORWARD ||
      fighter.state === DuelFighterState.WALK_BACK ||
      fighter.state === DuelFighterState.CROUCH_IDLE ||
      fighter.state === DuelFighterState.BLOCK_STAND ||
      fighter.state === DuelFighterState.BLOCK_CROUCH;
    const breathePhase = isIdleState ? fighter.stateTimer * 0.08 : 0;

    const opts: DrawFighterOptions = {
      pose: currentPose,
      palette,
      isFlashing: isHitFlash,
      flashColor: 0xffffff,
      isHurt: fighter.state === DuelFighterState.HIT_STUN || fighter.state === DuelFighterState.KNOCKDOWN,
      breathePhase,
      helmeted: charId === "arthur" || charId === "lancelot" || charId === "mordred" || charId === "percival" || charId === "kay" || charId === "bedivere" || charId === "lot" || charId === "pellinore",
      helmColor: charId === "lancelot" ? 0x7788aa : charId === "mordred" ? 0x222233 : charId === "percival" ? 0x6688aa : charId === "lot" ? 0x333344 : charId === "bedivere" ? 0x777788 : charId === "pellinore" ? 0x886644 : charId === "kay" ? 0x776655 : 0x888899,
      drawBackExtras: backExtras,
      drawExtras: extras,
    };

    drawFighterSkeleton(g, opts);

    // Draw weapon trail / energy effect on top of fighter during specials/zeals
    if ((isSpecial || isZeal) && currentPose.frontArm) {
      const colors = SPECIAL_COLORS[charId] ?? SPECIAL_COLORS.arthur;
      const handX = currentPose.frontArm.handX;
      const handY = currentPose.frontArm.handY;
      const pulse = 0.5 + Math.sin(fighter.moveFrame * 0.6) * 0.3;

      // Glowing energy at weapon/hand point
      g.circle(handX, handY, 12 + Math.sin(fighter.moveFrame * 0.4) * 4);
      g.fill({ color: colors.glow, alpha: pulse * 0.4 });
      g.circle(handX, handY, 6);
      g.fill({ color: 0xffffff, alpha: pulse * 0.6 });

      // Small energy sparks around the hand
      const sparkTime = fighter.moveFrame * 0.15;
      for (let i = 0; i < 4; i++) {
        const a = sparkTime + (i / 4) * Math.PI * 2;
        const r = 14 + Math.sin(sparkTime * 2 + i) * 4;
        const sx = handX + Math.cos(a) * r;
        const sy = handY + Math.sin(a) * r;
        g.circle(sx, sy, 2);
        g.fill({ color: colors.primary, alpha: 0.6 + Math.sin(a) * 0.3 });
      }
    }
  }

  /** Map fighter state to pose key. */
  private _getPoseKey(fighter: DuelFighter): string {
    switch (fighter.state) {
      case DuelFighterState.IDLE:
        return "idle";
      case DuelFighterState.WALK_FORWARD:
        return "walk_forward";
      case DuelFighterState.WALK_BACK:
        return "walk_back";
      case DuelFighterState.CROUCH:
      case DuelFighterState.CROUCH_IDLE:
        return "crouch";
      case DuelFighterState.JUMP:
      case DuelFighterState.JUMP_FORWARD:
      case DuelFighterState.JUMP_BACK:
        return "jump";
      case DuelFighterState.BLOCK_STAND:
        return "block_stand";
      case DuelFighterState.BLOCK_CROUCH:
        return "block_crouch";
      case DuelFighterState.DASH_FORWARD:
        return "walk_forward"; // reuse walk pose for dash
      case DuelFighterState.DASH_BACK:
        return "walk_back";
      case DuelFighterState.HIT_STUN:
      case DuelFighterState.GRABBED:
        return "hit_stun";
      case DuelFighterState.KNOCKDOWN:
        return "knockdown";
      case DuelFighterState.GET_UP:
        return "get_up";
      case DuelFighterState.VICTORY:
        return "victory";
      case DuelFighterState.DEFEAT:
        return "defeat";
      case DuelFighterState.ATTACK:
        // Use the current move name as pose key
        return fighter.currentMove ?? "idle";
      case DuelFighterState.GRAB:
        return "grab";
      default:
        return "idle";
    }
  }

  /** Calculate frame index for animation. */
  private _getFrameIndex(fighter: DuelFighter, frames: FighterPose[]): number {
    if (frames.length <= 1) return 0;

    switch (fighter.state) {
      case DuelFighterState.ATTACK:
      case DuelFighterState.GRAB: {
        // Map moveFrame to pose frames based on startup/active/recovery
        const charDef = DUEL_CHARACTERS[fighter.characterId];
        const move =
          charDef.normals[fighter.currentMove ?? ""] ??
          charDef.specials[fighter.currentMove ?? ""] ??
          (fighter.currentMove === "grab" ? charDef.grab : null);

        if (move) {
          const totalFrames = move.startup + move.active + move.recovery;
          const progress = Math.min(fighter.moveFrame / totalFrames, 0.999);
          return Math.floor(progress * frames.length);
        }
        return 0;
      }

      case DuelFighterState.IDLE:
      case DuelFighterState.WALK_FORWARD:
      case DuelFighterState.WALK_BACK: {
        // Loop based on stateTimer / frameCount
        const animSpeed = fighter.state === DuelFighterState.IDLE ? 12 : 8;
        return Math.floor(fighter.stateTimer / animSpeed) % frames.length;
      }

      case DuelFighterState.DASH_FORWARD:
      case DuelFighterState.DASH_BACK: {
        // Fast cycle through walk frames during dash
        return Math.floor(fighter.stateTimer / 3) % frames.length;
      }

      case DuelFighterState.KNOCKDOWN:
      case DuelFighterState.GET_UP:
      case DuelFighterState.HIT_STUN: {
        // Progress through frames based on stateTimer
        const maxTimer = fighter.state === DuelFighterState.KNOCKDOWN ? 40 :
          fighter.state === DuelFighterState.GET_UP ? 20 :
          (fighter.hitstunFrames + fighter.stateTimer);
        if (maxTimer <= 0) return 0;
        const progress = Math.min(fighter.stateTimer / maxTimer, 0.999);
        return Math.max(0, Math.floor(progress * frames.length));
      }

      default:
        return 0;
    }
  }

  // ---- Shadows --------------------------------------------------------------

  private _drawShadows(state: DuelState): void {
    this._shadowGfx.clear();
    for (const f of state.fighters) {
      drawFighterShadow(this._shadowGfx, f.position.x, state.stageFloorY, f.grounded);
    }
  }

  // ---- Projectiles ----------------------------------------------------------

  private _drawProjectiles(state: DuelState): void {
    this._projGfx.clear();
    for (const proj of state.projectiles) {
      const color = PROJECTILE_COLORS[proj.moveId] ?? 0xff8844;
      const x = proj.position.x;
      const y = proj.position.y;
      const w = proj.hitbox.width;
      const h = proj.hitbox.height;

      // Outer glow
      this._projGfx.circle(x, y, w * 1.2);
      this._projGfx.fill({ color, alpha: 0.15 });

      // Mid glow
      this._projGfx.circle(x, y, w * 0.8);
      this._projGfx.fill({ color, alpha: 0.3 });

      // Core
      this._projGfx.ellipse(x, y, w / 2, h / 2);
      this._projGfx.fill({ color, alpha: 0.9 });
      this._projGfx.stroke({ color: 0xffffff, width: 1.5, alpha: 0.6 });

      // Inner bright
      this._projGfx.circle(x, y, w * 0.2);
      this._projGfx.fill({ color: 0xffffff, alpha: 0.8 });

      // Trail
      const trailDir = proj.velocity.x > 0 ? -1 : 1;
      this._projGfx.moveTo(x, y - h / 3);
      this._projGfx.lineTo(x + trailDir * w * 1.5, y);
      this._projGfx.lineTo(x, y + h / 3);
      this._projGfx.fill({ color, alpha: 0.25 });
    }
  }

  // ---- Hit sparks -----------------------------------------------------------

  private _drawSparks(): void {
    this._sparkGfx.clear();
    for (let i = this._sparks.length - 1; i >= 0; i--) {
      const spark = this._sparks[i];
      spark.timer--;
      if (spark.timer <= 0) {
        this._sparks.splice(i, 1);
        continue;
      }

      const t = spark.timer / SPARK_DURATION;
      const size = 14 + (1 - t) * 24;

      // Outer energy glow (large, soft)
      this._sparkGfx.circle(spark.x, spark.y, size * 1.2 * t);
      this._sparkGfx.fill({ color: 0xff6600, alpha: t * 0.15 });

      // Starburst rays (more rays, varied thickness)
      const rayCount = 12;
      for (let j = 0; j < rayCount; j++) {
        const angle = (j / rayCount) * Math.PI * 2 + (1 - t) * 2.5;
        const innerR = size * 0.2 * (1 - t);
        const outerR = size * (1 - t * 0.25) * (0.8 + Math.sin(j * 1.7) * 0.2);
        this._sparkGfx.moveTo(
          spark.x + Math.cos(angle) * innerR,
          spark.y + Math.sin(angle) * innerR,
        );
        this._sparkGfx.lineTo(
          spark.x + Math.cos(angle) * outerR,
          spark.y + Math.sin(angle) * outerR,
        );
        const rayWidth = j % 3 === 0 ? 4 : 2.5;
        const rayColor = j % 2 === 0 ? 0xffff88 : 0xffcc44;
        this._sparkGfx.stroke({ color: rayColor, width: rayWidth, alpha: t });
      }

      // Orange mid glow
      this._sparkGfx.circle(spark.x, spark.y, size * 0.5 * t);
      this._sparkGfx.fill({ color: 0xff8800, alpha: t * 0.5 });

      // Bright yellow ring
      this._sparkGfx.circle(spark.x, spark.y, size * 0.35 * t);
      this._sparkGfx.stroke({ color: 0xffee66, width: 2 * t, alpha: t * 0.6 });

      // White center flash
      this._sparkGfx.circle(spark.x, spark.y, 6 * t);
      this._sparkGfx.fill({ color: 0xffffff, alpha: t * 0.95 });

      // Small debris particles flying out (drawn as tiny circles)
      for (let d = 0; d < 4; d++) {
        const dAngle = (d / 4) * Math.PI * 2 + t * 5 + spark.x * 0.01;
        const dDist = size * (1 - t) * 0.8;
        const dx = spark.x + Math.cos(dAngle) * dDist;
        const dy = spark.y + Math.sin(dAngle) * dDist;
        this._sparkGfx.circle(dx, dy, 1.5 * t);
        this._sparkGfx.fill({ color: 0xffdd44, alpha: t * 0.7 });
      }
    }
  }

  // ---- Special move VFX particles ------------------------------------------

  private _drawSpecialVFX(_state: DuelState): void {
    this._specialFxGfx.clear();

    for (let i = this._specialParticles.length - 1; i >= 0; i--) {
      const p = this._specialParticles[i];
      p.life--;
      p.x += p.vx;
      p.y += p.vy;

      if (p.life <= 0) {
        this._specialParticles.splice(i, 1);
        continue;
      }

      const t = p.life / p.maxLife; // 1 = fresh, 0 = dead
      const g = this._specialFxGfx;

      switch (p.type) {
        case "spark": {
          // Fading, shrinking bright spark
          g.circle(p.x, p.y, p.size * t);
          g.fill({ color: p.color, alpha: t * 0.8 });
          // Bright core
          if (p.size > 3) {
            g.circle(p.x, p.y, p.size * t * 0.4);
            g.fill({ color: 0xffffff, alpha: t * 0.6 });
          }
          break;
        }

        case "trail": {
          // Elongated streak that fades
          g.moveTo(p.x - p.vx * 2, p.y - p.vy * 2);
          g.lineTo(p.x, p.y);
          g.stroke({ color: p.color, width: p.size * t * 1.5, alpha: t * 0.7, cap: "round" });
          // Bright tip
          g.circle(p.x, p.y, p.size * t * 0.5);
          g.fill({ color: 0xffffff, alpha: t * 0.5 });
          break;
        }

        case "ring": {
          // Expanding ring
          const radius = p.size + (1 - t) * 50;
          g.circle(p.x, p.y, radius);
          g.stroke({ color: p.color, width: 3 * t, alpha: t * 0.6 });
          // Inner ring
          g.circle(p.x, p.y, radius * 0.7);
          g.stroke({ color: 0xffffff, width: 1.5 * t, alpha: t * 0.3 });
          break;
        }

        case "slash": {
          // Bright arc fragment
          const sz = p.size * (0.5 + t * 0.5);
          g.circle(p.x, p.y, sz);
          g.fill({ color: p.color, alpha: t * 0.9 });
          // Glow
          g.circle(p.x, p.y, sz * 2);
          g.fill({ color: p.color, alpha: t * 0.2 });
          break;
        }

        case "lightning": {
          // Jagged bright bolt segment
          const boltW = p.size * (0.3 + t * 0.7);
          const jitter = (1 - t) * 8;
          const jx = (Math.random() - 0.5) * jitter;
          const jy = (Math.random() - 0.5) * jitter;
          // Outer glow
          g.circle(p.x + jx, p.y + jy, boltW * 2.5);
          g.fill({ color: 0x4466ff, alpha: t * 0.2 });
          // Core bolt
          g.circle(p.x + jx, p.y + jy, boltW);
          g.fill({ color: 0xffffff, alpha: t * 0.9 });
          // Bright center
          g.circle(p.x + jx, p.y + jy, boltW * 0.4);
          g.fill({ color: 0xccddff, alpha: t });
          break;
        }

        case "flash": {
          // Full-screen or localized flash that fades
          g.rect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
          g.fill({ color: p.color, alpha: t * 0.4 });
          break;
        }
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
