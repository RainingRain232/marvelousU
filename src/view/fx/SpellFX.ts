// Spell impact visual effects — unique animations per spell type.
//
// Uses Graphics drawn directly on the fx layer with gsap animation.
// Each effect auto-removes after its animation completes.

import { Container, Graphics } from "pixi.js";
import gsap from "gsap";
import type { ViewManager } from "@view/ViewManager";
import { BalanceConfig } from "@sim/config/BalanceConfig";

const TS = BalanceConfig.TILE_SIZE;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeContainer(vm: ViewManager, x: number, y: number): Container {
  const c = new Container();
  c.position.set(x, y);
  vm.addToLayer("fx", c);
  return c;
}

function autoCleanup(vm: ViewManager, c: Container, delay: number): void {
  gsap.delayedCall(delay, () => {
    vm.removeFromLayer("fx", c);
    c.destroy({ children: true });
  });
}

// ---------------------------------------------------------------------------
// SpellFX
// ---------------------------------------------------------------------------

export class SpellFX {
  private _vm!: ViewManager;

  init(vm: ViewManager): void {
    this._vm = vm;
  }

  /**
   * Play a damage spell effect at a world-pixel position.
   * @param spell  unique spell key (fireball, meteor, blizzard, etc.)
   */
  playDamage(worldX: number, worldY: number, radius: number, spell: string): void {
    const r = radius * TS;
    switch (spell) {
      case "fireball":        return this._fireball(worldX, worldY, r);
      case "meteor":          return this._meteor(worldX, worldY, r);
      case "blizzard":        return this._blizzard(worldX, worldY, r);
      case "lightning":       return this._lightning(worldX, worldY, r);
      case "earthquake":      return this._earthquake(worldX, worldY, r);
      case "void_rift":       return this._voidRift(worldX, worldY, r);
      case "holy_smite":      return this._holySmite(worldX, worldY, r);
      case "poison_cloud":    return this._poisonCloud(worldX, worldY, r);
      case "arcane_missile":  return this._arcaneMissile(worldX, worldY, r);
      case "arcane_storm":    return this._arcaneStorm(worldX, worldY, r);
      case "frost_nova":      return this._frostNova(worldX, worldY, r);
      case "chain_lightning":  return this._chainLightning(worldX, worldY, r);
      case "inferno":         return this._inferno(worldX, worldY, r);
      case "mana_surge":      return this._manaSurge(worldX, worldY, r);
      case "arcane_barrage":  return this._arcaneBarrage(worldX, worldY, r);
      case "temporal_blast":  return this._temporalBlast(worldX, worldY, r);
      case "purifying_flame": return this._purifyingFlame(worldX, worldY, r);
      case "celestial_wrath": return this._celestialWrath(worldX, worldY, r);
      case "shadow_bolt":     return this._shadowBolt(worldX, worldY, r);
      case "curse_of_darkness": return this._curseOfDarkness(worldX, worldY, r);
      case "death_coil":      return this._deathCoil(worldX, worldY, r);
      case "nether_storm":    return this._netherStorm(worldX, worldY, r);
      case "siphon_soul":     return this._siphonSoul(worldX, worldY, r);
      // Gap-fill spells
      case "flame_spark":     return this._flameSpark(worldX, worldY, r);
      case "pyroclasm":       return this._pyroclasm(worldX, worldY, r);
      case "glacial_crush":   return this._glacialCrush(worldX, worldY, r);
      case "absolute_zero":   return this._absoluteZero(worldX, worldY, r);
      case "spark":           return this._spark(worldX, worldY, r);
      case "thunderstorm":    return this._thunderstorm(worldX, worldY, r);
      case "ball_lightning":  return this._ballLightning(worldX, worldY, r);
      case "mjolnir_strike":  return this._mjolnirStrike(worldX, worldY, r);
      case "stone_shard":     return this._stoneShard(worldX, worldY, r);
      case "landslide":       return this._landslide(worldX, worldY, r);
      case "tectonic_ruin":   return this._tectonicRuin(worldX, worldY, r);
      case "arcane_cataclysm": return this._arcaneCataclysm(worldX, worldY, r);
      case "shadow_plague":   return this._shadowPlague(worldX, worldY, r);
      case "oblivion":        return this._oblivion(worldX, worldY, r);
      case "venomous_spray":  return this._venomousSpray(worldX, worldY, r);
      case "plague_swarm":    return this._plagueSwarm(worldX, worldY, r);
      case "toxic_miasma":    return this._toxicMiasma(worldX, worldY, r);
      case "pandemic":        return this._pandemic(worldX, worldY, r);
      case "void_spark":      return this._voidSpark(worldX, worldY, r);
      case "dimensional_tear": return this._dimensionalTear(worldX, worldY, r);
      case "singularity":     return this._singularity(worldX, worldY, r);
      case "necrotic_touch":  return this._necroticTouch(worldX, worldY, r);
      case "soul_rend":       return this._soulRend(worldX, worldY, r);
      case "apocalypse":      return this._apocalypse(worldX, worldY, r);
      case "thorn_barrage":   return this._thornBarrage(worldX, worldY, r);
      case "natures_wrath":   return this._naturesWrath(worldX, worldY, r);
      case "primal_storm":    return this._primalStorm(worldX, worldY, r);
      // Round 2 spells
      case "ember_bolt":      return this._genericDamage(worldX, worldY, r);
      case "flame_wave":      return this._fireball(worldX, worldY, r);
      case "magma_burst":     return this._meteor(worldX, worldY, r);
      case "fire_storm":      return this._inferno(worldX, worldY, r);
      case "dragons_breath":  return this._pyroclasm(worldX, worldY, r);
      case "ice_shard":       return this._frostNova(worldX, worldY, r);
      case "frostbite":       return this._blizzard(worldX, worldY, r);
      case "ice_storm":       return this._glacialCrush(worldX, worldY, r);
      case "frozen_tomb":     return this._absoluteZero(worldX, worldY, r);
      case "permafrost":      return this._absoluteZero(worldX, worldY, r);
      case "static_shock":    return this._spark(worldX, worldY, r);
      case "arc_bolt":        return this._lightning(worldX, worldY, r);
      case "storm_surge":     return this._chainLightning(worldX, worldY, r);
      case "thunder_clap":    return this._ballLightning(worldX, worldY, r);
      case "zeus_wrath":      return this._mjolnirStrike(worldX, worldY, r);
      case "mud_splash":      return this._stoneShard(worldX, worldY, r);
      case "rock_throw":      return this._stoneShard(worldX, worldY, r);
      case "avalanche":       return this._landslide(worldX, worldY, r);
      case "seismic_slam":    return this._earthquake(worldX, worldY, r);
      case "world_breaker":   return this._tectonicRuin(worldX, worldY, r);
      case "mana_bolt":       return this._arcaneMissile(worldX, worldY, r);
      case "arcane_pulse":    return this._manaSurge(worldX, worldY, r);
      case "ether_blast":     return this._arcaneBarrage(worldX, worldY, r);
      case "arcane_torrent":  return this._temporalBlast(worldX, worldY, r);
      case "astral_rift":     return this._arcaneCataclysm(worldX, worldY, r);
      case "sacred_strike":   return this._holySmite(worldX, worldY, r);
      case "judgment":        return this._celestialWrath(worldX, worldY, r);
      case "heavens_gate":    return this._celestialWrath(worldX, worldY, r);
      case "dark_pulse":      return this._shadowBolt(worldX, worldY, r);
      case "shadow_strike":   return this._curseOfDarkness(worldX, worldY, r);
      case "nightmare":       return this._shadowPlague(worldX, worldY, r);
      case "dark_void":       return this._oblivion(worldX, worldY, r);
      case "eclipse":         return this._oblivion(worldX, worldY, r);
      case "toxic_dart":      return this._genericDamage(worldX, worldY, r);
      case "acid_splash":     return this._venomousSpray(worldX, worldY, r);
      case "blight":          return this._plagueSwarm(worldX, worldY, r);
      case "corrosion":       return this._toxicMiasma(worldX, worldY, r);
      case "plague_wind":     return this._pandemic(worldX, worldY, r);
      case "phase_shift":     return this._voidSpark(worldX, worldY, r);
      case "warp_bolt":       return this._dimensionalTear(worldX, worldY, r);
      case "rift_storm":      return this._dimensionalTear(worldX, worldY, r);
      case "void_crush":      return this._singularity(worldX, worldY, r);
      case "event_horizon":   return this._singularity(worldX, worldY, r);
      case "grave_chill":     return this._necroticTouch(worldX, worldY, r);
      case "wither":          return this._deathCoil(worldX, worldY, r);
      case "corpse_explosion": return this._siphonSoul(worldX, worldY, r);
      case "doom":            return this._soulRend(worldX, worldY, r);
      case "requiem":         return this._apocalypse(worldX, worldY, r);
      case "vine_whip":       return this._genericDamage(worldX, worldY, r);
      case "bramble_burst":   return this._thornBarrage(worldX, worldY, r);
      case "entangle":        return this._naturesWrath(worldX, worldY, r);
      case "overgrowth":      return this._naturesWrath(worldX, worldY, r);
      case "gaias_fury":      return this._primalStorm(worldX, worldY, r);
      // Tier 6 & 7 spells
      case "hellfire_eruption": return this._inferno(worldX, worldY, r);
      case "solar_fury": return this._pyroclasm(worldX, worldY, r);
      case "supernova": return this._pyroclasm(worldX, worldY, r);
      case "world_blaze": return this._pyroclasm(worldX, worldY, r);
      case "frozen_abyss": return this._absoluteZero(worldX, worldY, r);
      case "arctic_devastation": return this._absoluteZero(worldX, worldY, r);
      case "eternal_winter": return this._absoluteZero(worldX, worldY, r);
      case "ice_age": return this._absoluteZero(worldX, worldY, r);
      case "divine_thunder": return this._mjolnirStrike(worldX, worldY, r);
      case "tempest_fury": return this._mjolnirStrike(worldX, worldY, r);
      case "ragnarok_bolt": return this._mjolnirStrike(worldX, worldY, r);
      case "cosmic_storm": return this._mjolnirStrike(worldX, worldY, r);
      case "continental_crush": return this._tectonicRuin(worldX, worldY, r);
      case "magma_core": return this._tectonicRuin(worldX, worldY, r);
      case "cataclysm": return this._tectonicRuin(worldX, worldY, r);
      case "planet_shatter": return this._tectonicRuin(worldX, worldY, r);
      case "arcane_annihilation": return this._arcaneCataclysm(worldX, worldY, r);
      case "reality_warp": return this._arcaneCataclysm(worldX, worldY, r);
      case "cosmic_rift": return this._arcaneCataclysm(worldX, worldY, r);
      case "omniscience": return this._arcaneCataclysm(worldX, worldY, r);
      case "wrath_of_god": return this._celestialWrath(worldX, worldY, r);
      case "divine_judgment": return this._celestialWrath(worldX, worldY, r);
      case "eternal_darkness": return this._oblivion(worldX, worldY, r);
      case "void_corruption": return this._oblivion(worldX, worldY, r);
      case "abyssal_doom": return this._oblivion(worldX, worldY, r);
      case "shadow_annihilation": return this._oblivion(worldX, worldY, r);
      case "extinction_cloud": return this._pandemic(worldX, worldY, r);
      case "plague_of_ages": return this._pandemic(worldX, worldY, r);
      case "death_blossom": return this._pandemic(worldX, worldY, r);
      case "toxic_apocalypse": return this._pandemic(worldX, worldY, r);
      case "reality_collapse": return this._singularity(worldX, worldY, r);
      case "dimensional_implosion": return this._singularity(worldX, worldY, r);
      case "entropy": return this._singularity(worldX, worldY, r);
      case "end_of_all": return this._singularity(worldX, worldY, r);
      case "mass_extinction": return this._apocalypse(worldX, worldY, r);
      case "grim_harvest": return this._apocalypse(worldX, worldY, r);
      case "armageddon": return this._apocalypse(worldX, worldY, r);
      case "death_incarnate": return this._apocalypse(worldX, worldY, r);
      case "world_trees_fury": return this._primalStorm(worldX, worldY, r);
      case "elemental_chaos": return this._primalStorm(worldX, worldY, r);
      case "genesis_storm": return this._primalStorm(worldX, worldY, r);
      case "wrath_of_gaia": return this._primalStorm(worldX, worldY, r);
      // Extra T1 & T2 spells
      case "candle_flame": return this._flameSpark(worldX, worldY, r);
      case "heat_wave": return this._flameSpark(worldX, worldY, r);
      case "scorch": return this._fireball(worldX, worldY, r);
      case "chill_touch": return this._frostNova(worldX, worldY, r);
      case "icicle": return this._frostNova(worldX, worldY, r);
      case "cold_snap": return this._blizzard(worldX, worldY, r);
      case "jolt": return this._spark(worldX, worldY, r);
      case "zap": return this._spark(worldX, worldY, r);
      case "shock_wave": return this._lightning(worldX, worldY, r);
      case "pebble_toss": return this._stoneShard(worldX, worldY, r);
      case "dust_devil": return this._stoneShard(worldX, worldY, r);
      case "tremor": return this._earthquake(worldX, worldY, r);
      case "magic_dart": return this._arcaneMissile(worldX, worldY, r);
      case "sparkle_burst": return this._arcaneMissile(worldX, worldY, r);
      case "arcane_bolt": return this._manaSurge(worldX, worldY, r);
      case "smite": return this._holySmite(worldX, worldY, r);
      case "dark_whisper": return this._shadowBolt(worldX, worldY, r);
      case "shadow_flicker": return this._shadowBolt(worldX, worldY, r);
      case "night_shade": return this._curseOfDarkness(worldX, worldY, r);
      case "sting": return this._poisonCloud(worldX, worldY, r);
      case "noxious_puff": return this._poisonCloud(worldX, worldY, r);
      case "venom_strike": return this._venomousSpray(worldX, worldY, r);
      case "null_bolt": return this._voidSpark(worldX, worldY, r);
      case "void_touch": return this._voidSpark(worldX, worldY, r);
      case "rift_pulse": return this._dimensionalTear(worldX, worldY, r);
      case "deaths_grasp": return this._necroticTouch(worldX, worldY, r);
      case "bone_chill": return this._necroticTouch(worldX, worldY, r);
      case "drain_life": return this._deathCoil(worldX, worldY, r);
      case "leaf_blade": return this._thornBarrage(worldX, worldY, r);
      case "thorn_prick": return this._thornBarrage(worldX, worldY, r);
      case "root_snare": return this._thornBarrage(worldX, worldY, r);
      default:                return this._genericDamage(worldX, worldY, r);
    }
  }

  /**
   * Play a healing spell effect at a world-pixel position.
   * @param spell  "healing_wave" | "divine_restoration" (optional, defaults to wave)
   */
  playHeal(worldX: number, worldY: number, radius: number, spell?: string): void {
    const r = radius * TS;
    if (spell === "divine_restoration") {
      return this._divineRestoration(worldX, worldY, r);
    }
    if (spell === "blessing_of_light") {
      return this._blessingOfLight(worldX, worldY, r);
    }
    if (spell === "radiant_nova") {
      return this._radiantNova(worldX, worldY, r);
    }
    if (spell === "divine_miracle") {
      return this._divineMiracle(worldX, worldY, r);
    }
    if (spell === "holy_light") {
      return this._blessingOfLight(worldX, worldY, r);
    }
    if (spell === "divine_shield") {
      return this._divineMiracle(worldX, worldY, r);
    }
    if (spell === "seraphims_light") return this._divineMiracle(worldX, worldY, r);
    if (spell === "ascension") return this._divineMiracle(worldX, worldY, r);
    if (spell === "holy_touch") return this._blessingOfLight(worldX, worldY, r);
    if (spell === "consecrate") return this._blessingOfLight(worldX, worldY, r);
    return this._healingWave(worldX, worldY, r);
  }

  /**
   * Play a summon rune circle effect at a world position.
   */
  playSummonRune(worldX: number, worldY: number): void {
    const c = makeContainer(this._vm, worldX, worldY);
    const runeColors = [0x9966ff, 0xcc99ff, 0xddaaff];

    // Three concentric rotating circles with glyph diamonds
    for (let i = 0; i < 3; i++) {
      const r = 12 + i * 10;
      const g = new Graphics();
      g.circle(0, 0, r).stroke({ color: runeColors[i], width: 1.5, alpha: 0.8 });
      for (let j = 0; j < 6 + i * 2; j++) {
        const a = (j / (6 + i * 2)) * TAU;
        const gx = Math.cos(a) * r;
        const gy = Math.sin(a) * r;
        g.moveTo(gx, gy - 2)
          .lineTo(gx + 1.5, gy)
          .lineTo(gx, gy + 2)
          .lineTo(gx - 1.5, gy)
          .closePath()
          .fill({ color: 0xddaaff, alpha: 0.6 });
      }
      g.alpha = 0;
      c.addChild(g);

      gsap.to(g, { alpha: 0.9 - i * 0.15, duration: 0.3, delay: i * 0.1 });
      gsap.to(g, { rotation: (i % 2 === 0 ? 1 : -1) * Math.PI, duration: 1.5, ease: "power1.out" });
      gsap.to(g, { alpha: 0, duration: 0.5, delay: 1.0 });
    }

    // Upward particle sparkles
    for (let i = 0; i < 12; i++) {
      const spark = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: 0xddaaff, alpha: 0.8 });
      spark.position.set(
        (Math.random() - 0.5) * 40,
        (Math.random() - 0.5) * 20,
      );
      c.addChild(spark);
      gsap.to(spark, {
        y: spark.position.y - 30 - Math.random() * 20,
        alpha: 0,
        duration: 0.8 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // DAMAGE SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Fireball ──────────────────────────────────────────────────────────────
  // Classic explosion: white-hot core → fire ring → embers → smoke
  private _fireball(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Inner white-hot core flash
    const core = new Graphics()
      .circle(0, 0, r * 0.15)
      .fill({ color: 0xffffee, alpha: 1 });
    c.addChild(core);
    gsap.to(core, {
      pixi: { scaleX: 3, scaleY: 3 },
      alpha: 0,
      duration: 0.25,
      ease: "power1.out",
    });

    // Expanding fire ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.25)
      .stroke({ color: 0xff6622, width: 4, alpha: 0.9 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.25), scaleY: r / (r * 0.25) },
      alpha: 0,
      duration: 0.5,
      ease: "power2.out",
    });

    // Inner orange fill that fades
    const fill = new Graphics()
      .circle(0, 0, r * 0.7)
      .fill({ color: 0xff4400, alpha: 0.35 });
    c.addChild(fill);
    gsap.to(fill, {
      pixi: { scaleX: 1.4, scaleY: 1.4 },
      alpha: 0,
      duration: 0.4,
    });

    // Ember particles — shoot outward and arc downward
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * TAU;
      const dist = r * (0.5 + Math.random() * 0.6);
      const size = 1 + Math.random() * 2;
      const colors = [0xffaa44, 0xff6622, 0xffdd00];
      const ember = new Graphics()
        .circle(0, 0, size)
        .fill({ color: colors[i % 3], alpha: 0.9 });
      c.addChild(ember);
      gsap.to(ember, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist + 8 + Math.random() * 12,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.4,
        ease: "power1.out",
      });
    }

    // Smoke wisps rising from the blast
    for (let i = 0; i < 6; i++) {
      const smoke = new Graphics()
        .circle(0, 0, 3 + Math.random() * 4)
        .fill({ color: 0x333333, alpha: 0.25 });
      smoke.position.set(
        (Math.random() - 0.5) * r,
        (Math.random() - 0.5) * r * 0.4,
      );
      c.addChild(smoke);
      gsap.to(smoke, {
        y: smoke.position.y - 20 - Math.random() * 15,
        alpha: 0,
        pixi: { scaleX: 2.5, scaleY: 2.5 },
        duration: 0.8 + Math.random() * 0.4,
        delay: 0.1 + Math.random() * 0.2,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Meteor Strike ─────────────────────────────────────────────────────────
  // A glowing meteor falls from the sky → impact flash, shockwaves, debris
  private _meteor(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // ── Meteor body falling diagonally ──
    const meteorBody = new Container();
    // Outer glow
    const meteorGlow = new Graphics()
      .circle(0, 0, 8)
      .fill({ color: 0xff6622, alpha: 0.5 });
    // Core
    const meteorCore = new Graphics()
      .circle(0, 0, 5)
      .fill({ color: 0xffaa22, alpha: 1 })
      .circle(0, 0, 3)
      .fill({ color: 0xffffcc, alpha: 0.9 });
    meteorBody.addChild(meteorGlow, meteorCore);
    meteorBody.position.set(-r * 2.5, -r * 3.5);
    c.addChild(meteorBody);

    // Trail container for particles behind the meteor
    const trailContainer = new Container();
    c.addChild(trailContainer);

    // Animate meteor falling to impact
    const tl = gsap.timeline();
    tl.to(meteorBody, {
      x: 0,
      y: 0,
      duration: 0.45,
      ease: "power2.in",
      onUpdate: () => {
        // Spawn fire trail particles
        const colors = [0xff6622, 0xffaa44, 0xff4400];
        const tp = new Graphics()
          .circle(0, 0, 2 + Math.random() * 2.5)
          .fill({ color: colors[Math.floor(Math.random() * 3)], alpha: 0.7 });
        tp.position.set(
          meteorBody.x + (Math.random() - 0.5) * 6,
          meteorBody.y + (Math.random() - 0.5) * 6,
        );
        trailContainer.addChild(tp);
        gsap.to(tp, {
          alpha: 0,
          pixi: { scaleX: 0.2, scaleY: 0.2 },
          duration: 0.35,
          ease: "power1.out",
        });
      },
    });

    // ── Impact phase (after meteor arrives) ──
    tl.call(() => {
      meteorBody.visible = false;

      // Bright white flash
      const flash = new Graphics()
        .circle(0, 0, r * 0.6)
        .fill({ color: 0xffffff, alpha: 0.9 });
      c.addChild(flash);
      gsap.to(flash, {
        alpha: 0,
        pixi: { scaleX: 2, scaleY: 2 },
        duration: 0.25,
      });

      // Primary shockwave ring
      const ring1 = new Graphics()
        .circle(0, 0, 5)
        .stroke({ color: 0xff6622, width: 3, alpha: 1 });
      c.addChild(ring1);
      gsap.to(ring1, {
        pixi: { scaleX: r / 5, scaleY: r / 5 },
        alpha: 0,
        duration: 0.6,
        ease: "power2.out",
      });

      // Secondary shockwave (delayed, thinner)
      const ring2 = new Graphics()
        .circle(0, 0, 5)
        .stroke({ color: 0xffaa44, width: 2, alpha: 0.6 });
      c.addChild(ring2);
      gsap.to(ring2, {
        pixi: { scaleX: r / 5 * 0.7, scaleY: r / 5 * 0.7 },
        alpha: 0,
        duration: 0.5,
        delay: 0.08,
        ease: "power2.out",
      });

      // Fire fill bloom
      const fireFill = new Graphics()
        .circle(0, 0, r * 0.5)
        .fill({ color: 0xff4400, alpha: 0.4 });
      c.addChild(fireFill);
      gsap.to(fireFill, {
        alpha: 0,
        pixi: { scaleX: 1.8, scaleY: 1.8 },
        duration: 0.6,
      });

      // Crater ring (stays a moment)
      const crater = new Graphics()
        .circle(0, 0, r * 0.3)
        .stroke({ color: 0x553311, width: 2, alpha: 0.4 })
        .circle(0, 0, r * 0.3)
        .fill({ color: 0x332211, alpha: 0.15 });
      c.addChild(crater);
      gsap.to(crater, { alpha: 0, duration: 1.2, delay: 0.5 });

      // Rock & debris flying outward
      for (let i = 0; i < 22; i++) {
        const a = Math.random() * TAU;
        const dist = r * (0.5 + Math.random() * 0.8);
        const size = 1.5 + Math.random() * 2.5;
        const colors = [0x886633, 0xccaa66, 0x664422, 0x554433];
        const rock = new Graphics();
        // Irregular rock shape
        rock.moveTo(-size, 0)
          .lineTo(-size * 0.3, -size)
          .lineTo(size * 0.5, -size * 0.7)
          .lineTo(size, 0)
          .lineTo(size * 0.3, size * 0.6)
          .closePath()
          .fill({ color: colors[i % 4], alpha: 0.9 });
        c.addChild(rock);
        gsap.to(rock, {
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist - 18 - Math.random() * 22,
          rotation: Math.random() * TAU,
          alpha: 0,
          duration: 0.6 + Math.random() * 0.3,
          ease: "power1.out",
        });
      }

      // Smoke columns rising
      for (let i = 0; i < 5; i++) {
        const smoke = new Graphics()
          .circle(0, 0, 5 + Math.random() * 5)
          .fill({ color: 0x444444, alpha: 0.25 });
        smoke.position.set(
          (Math.random() - 0.5) * r * 0.6,
          (Math.random() - 0.5) * r * 0.3,
        );
        c.addChild(smoke);
        gsap.to(smoke, {
          y: smoke.position.y - 30 - Math.random() * 25,
          alpha: 0,
          pixi: { scaleX: 2.5, scaleY: 3 },
          duration: 1.0 + Math.random() * 0.5,
          delay: 0.05 + Math.random() * 0.15,
          ease: "power1.out",
        });
      }
    });

    autoCleanup(this._vm, c, 2.5);
  }

  // ── Blizzard ──────────────────────────────────────────────────────────────
  // Frost ring on ground, swirling wind arcs, ice crystals raining down
  private _blizzard(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Frost ground ring
    const frostRing = new Graphics()
      .circle(0, 0, r)
      .stroke({ color: 0xaaddff, width: 2, alpha: 0.5 });
    frostRing.alpha = 0;
    c.addChild(frostRing);
    gsap.to(frostRing, { alpha: 0.6, duration: 0.3 });
    gsap.to(frostRing, { alpha: 0, duration: 0.5, delay: 1.3 });

    // Frost ground fill
    const frostFill = new Graphics()
      .circle(0, 0, r)
      .fill({ color: 0x88bbdd, alpha: 0.12 });
    c.addChild(frostFill);
    gsap.to(frostFill, { alpha: 0, duration: 0.5, delay: 1.3 });

    // Swirling wind arcs (three curved strokes rotating)
    for (let i = 0; i < 3; i++) {
      const wind = new Graphics();
      const startAngle = (i / 3) * TAU;
      wind.moveTo(
        Math.cos(startAngle) * r * 0.3,
        Math.sin(startAngle) * r * 0.3,
      );
      for (let t = 1; t <= 10; t++) {
        const a = startAngle + (t / 10) * Math.PI * 0.9;
        const rd = r * (0.3 + (t / 10) * 0.55);
        wind.lineTo(Math.cos(a) * rd, Math.sin(a) * rd);
      }
      wind.stroke({ color: 0xccddff, width: 1.5, alpha: 0.35 });
      wind.alpha = 0;
      c.addChild(wind);
      gsap.to(wind, { alpha: 0.5, duration: 0.2, delay: i * 0.12 });
      gsap.to(wind, {
        rotation: Math.PI * 0.6,
        duration: 1.2,
        delay: i * 0.12,
        ease: "power1.inOut",
      });
      gsap.to(wind, { alpha: 0, duration: 0.4, delay: 1.0 + i * 0.1 });
    }

    // Falling ice crystals (diamond shapes)
    for (let i = 0; i < 20; i++) {
      const cx = (Math.random() - 0.5) * r * 2;
      const size = 2 + Math.random() * 3;
      const colors = [0xaaddff, 0xcceeff, 0x88bbdd, 0xddeeff];
      const crystal = new Graphics();
      crystal
        .moveTo(0, -size)
        .lineTo(size * 0.5, 0)
        .lineTo(0, size)
        .lineTo(-size * 0.5, 0)
        .closePath()
        .fill({ color: colors[i % 4], alpha: 0.8 });
      crystal.position.set(cx, -r - Math.random() * 25);
      crystal.alpha = 0;
      c.addChild(crystal);

      const delay = Math.random() * 0.9;
      gsap.to(crystal, { alpha: 0.9, duration: 0.08, delay });
      gsap.to(crystal, {
        y: (Math.random() - 0.5) * r,
        rotation: Math.random() * TAU,
        duration: 0.4 + Math.random() * 0.3,
        delay,
        ease: "power1.in",
      });
      gsap.to(crystal, { alpha: 0, duration: 0.2, delay: delay + 0.35 });
    }

    // Tiny snowflake-like frost particles
    for (let i = 0; i < 14; i++) {
      const px = (Math.random() - 0.5) * r * 1.6;
      const py = (Math.random() - 0.5) * r * 1.6;
      const dot = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: 0xeeffff, alpha: 0.7 });
      dot.position.set(px, py);
      dot.alpha = 0;
      c.addChild(dot);
      const d = 0.15 + Math.random() * 0.8;
      gsap.to(dot, { alpha: 0.8, duration: 0.1, delay: d });
      gsap.to(dot, {
        y: py + 5 + Math.random() * 8,
        alpha: 0,
        duration: 0.5,
        delay: d + 0.1,
      });
    }

    autoCleanup(this._vm, c, 2.2);
  }

  // ── Lightning Strike ──────────────────────────────────────────────────────
  // Jagged bolt from sky, bright flash, electrical sparks, fast impact
  private _lightning(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Bright white flash at impact
    const flash = new Graphics()
      .circle(0, 0, r * 0.5)
      .fill({ color: 0xffffff, alpha: 0.9 });
    c.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.12 });

    // Primary lightning bolt (jagged line from above)
    const bolt1 = this._makeJaggedBolt(r, 3, 0xffffff, 0.95);
    c.addChild(bolt1);
    gsap.to(bolt1, { alpha: 0, duration: 0.2 });

    // Secondary thinner bolt (parallel, slightly offset)
    const bolt2 = this._makeJaggedBolt(r, 1.5, 0x4488ff, 0.7);
    c.addChild(bolt2);
    gsap.to(bolt2, { alpha: 0, duration: 0.25, delay: 0.02 });

    // Tertiary bolt branch
    const bolt3 = this._makeJaggedBolt(r * 0.6, 1, 0x88bbff, 0.5);
    bolt3.position.set((Math.random() - 0.5) * 8, -r * 0.8);
    bolt3.rotation = (Math.random() - 0.5) * 0.5;
    c.addChild(bolt3);
    gsap.to(bolt3, { alpha: 0, duration: 0.18 });

    // Impact glow
    const glow = new Graphics()
      .circle(0, 0, r * 0.35)
      .fill({ color: 0x4488ff, alpha: 0.5 });
    c.addChild(glow);
    gsap.to(glow, {
      alpha: 0,
      pixi: { scaleX: 2.5, scaleY: 2.5 },
      duration: 0.35,
    });

    // Expanding ground ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.2)
      .stroke({ color: 0x4488ff, width: 2, alpha: 0.8 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
      alpha: 0,
      duration: 0.45,
      ease: "power2.out",
    });

    // Electric sparks radiating
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU;
      const dist = r * (0.3 + Math.random() * 0.6);
      const spark = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: 0xccddff, alpha: 1 });
      c.addChild(spark);
      gsap.to(spark, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        alpha: 0,
        duration: 0.15 + Math.random() * 0.15,
        ease: "power2.out",
      });
    }

    // Brief secondary flash (strobe effect)
    gsap.delayedCall(0.07, () => {
      const flash2 = new Graphics()
        .circle(0, 0, r * 0.25)
        .fill({ color: 0xffffff, alpha: 0.5 });
      c.addChild(flash2);
      gsap.to(flash2, { alpha: 0, duration: 0.08 });
    });

    // Scorched ground mark
    const scorch = new Graphics()
      .circle(0, 0, r * 0.15)
      .fill({ color: 0x222244, alpha: 0.2 });
    c.addChild(scorch);
    gsap.to(scorch, { alpha: 0, duration: 0.8, delay: 0.3 });

    autoCleanup(this._vm, c, 1.0);
  }

  /** Helper: draw a jagged lightning bolt line from above down to (0,0). */
  private _makeJaggedBolt(
    height: number,
    width: number,
    color: number,
    alpha: number,
  ): Graphics {
    const g = new Graphics();
    const segments = 8;
    let bx = (Math.random() - 0.5) * height * 0.15;
    let by = -height * 2.5;
    g.moveTo(bx, by);
    for (let i = 0; i < segments; i++) {
      bx += (Math.random() - 0.5) * 12;
      by += (height * 2.5) / segments;
      g.lineTo(bx, by);
    }
    g.lineTo(0, 0);
    g.stroke({ color, width, alpha });
    return g;
  }

  // ── Earthquake ────────────────────────────────────────────────────────────
  // Ground cracks, debris launching upward, dust cloud, container shake
  private _earthquake(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Expanding dust cloud
    const dust = new Graphics()
      .circle(0, 0, r * 0.25)
      .fill({ color: 0x886633, alpha: 0.25 });
    c.addChild(dust);
    gsap.to(dust, {
      pixi: { scaleX: r / (r * 0.25), scaleY: r / (r * 0.25) },
      alpha: 0,
      duration: 0.9,
      ease: "power1.out",
    });

    // Crack lines radiating from center
    for (let i = 0; i < 7; i++) {
      const crack = new Graphics();
      const angle = (i / 7) * TAU + (Math.random() - 0.5) * 0.3;
      let cx = 0;
      let cy = 0;
      crack.moveTo(0, 0);
      const segs = 4 + Math.floor(Math.random() * 3);
      for (let j = 0; j < segs; j++) {
        const segLen = (r / segs) * (0.5 + Math.random() * 0.8);
        cx += Math.cos(angle + (Math.random() - 0.5) * 0.5) * segLen;
        cy += Math.sin(angle + (Math.random() - 0.5) * 0.5) * segLen;
        crack.lineTo(cx, cy);
        // Add small branch cracks at some nodes
        if (j > 0 && Math.random() > 0.5) {
          const branchLen = segLen * 0.4;
          const branchA = angle + (Math.random() - 0.5) * 1.5;
          crack.lineTo(
            cx + Math.cos(branchA) * branchLen,
            cy + Math.sin(branchA) * branchLen,
          );
          crack.moveTo(cx, cy); // return to main crack
        }
      }
      crack.stroke({ color: 0x554422, width: 2, alpha: 0.7 });
      crack.alpha = 0;
      c.addChild(crack);
      gsap.to(crack, { alpha: 0.8, duration: 0.12, delay: i * 0.04 });
      gsap.to(crack, { alpha: 0, duration: 0.6, delay: 0.7 });
    }

    // Rock debris launching upward
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const spawnDist = Math.random() * r * 0.8;
      const sx = Math.cos(a) * spawnDist;
      const sy = Math.sin(a) * spawnDist;
      const size = 2 + Math.random() * 3;
      const colors = [0x886633, 0xaa8855, 0x664422, 0x775533];
      const rock = new Graphics();
      // Irregular rock silhouette
      rock
        .moveTo(-size, 0)
        .lineTo(-size * 0.3, -size)
        .lineTo(size * 0.5, -size * 0.7)
        .lineTo(size, 0)
        .lineTo(size * 0.3, size * 0.6)
        .closePath()
        .fill({ color: colors[i % 4], alpha: 0.9 });
      rock.position.set(sx, sy);
      rock.alpha = 0;
      c.addChild(rock);

      const delay = Math.random() * 0.3;
      gsap.to(rock, { alpha: 1, duration: 0.04, delay });
      gsap.to(rock, {
        y: sy - 18 - Math.random() * 28,
        rotation: Math.random() * TAU,
        duration: 0.5,
        delay,
        ease: "power2.out",
      });
      gsap.to(rock, {
        y: sy + 5,
        alpha: 0,
        duration: 0.3,
        delay: delay + 0.4,
        ease: "power2.in",
      });
    }

    // Container shake effect (rapid position jitter)
    const origX = c.x;
    const origY = c.y;
    const shakeTl = gsap.timeline();
    for (let i = 0; i < 8; i++) {
      const amplitude = 3 * (1 - i / 8); // decay
      shakeTl.to(c, {
        x: origX + (Math.random() - 0.5) * amplitude * 2,
        y: origY + (Math.random() - 0.5) * amplitude * 2,
        duration: 0.04,
      });
    }
    shakeTl.to(c, { x: origX, y: origY, duration: 0.04 });

    // Ground stain
    const stain = new Graphics()
      .circle(0, 0, r * 0.6)
      .fill({ color: 0x553322, alpha: 0.1 });
    c.addChild(stain);
    gsap.to(stain, { alpha: 0, duration: 0.8, delay: 0.5 });

    autoCleanup(this._vm, c, 1.8);
  }

  // ── Void Rift ─────────────────────────────────────────────────────────────
  // Dark portal opens → particles sucked in → implosion → particles expelled
  private _voidRift(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Dark core expanding then collapsing
    const core = new Graphics()
      .circle(0, 0, 3)
      .fill({ color: 0x110022, alpha: 0.9 });
    c.addChild(core);
    gsap.to(core, {
      pixi: { scaleX: r / 6, scaleY: r / 6 },
      duration: 0.4,
      ease: "power2.out",
    });
    gsap.to(core, {
      pixi: { scaleX: 0, scaleY: 0 },
      alpha: 0,
      duration: 0.25,
      delay: 0.7,
      ease: "power2.in",
    });

    // Two counter-rotating portal arcs
    for (let i = 0; i < 2; i++) {
      const portal = new Graphics();
      const startA = i * Math.PI;
      portal.arc(0, 0, r * 0.55, startA, startA + Math.PI);
      portal.stroke({ color: [0x9933cc, 0x6633aa][i], width: 3, alpha: 0.7 });
      portal.alpha = 0;
      c.addChild(portal);
      gsap.to(portal, { alpha: 0.8, duration: 0.2 });
      gsap.to(portal, {
        rotation: (i === 0 ? 1 : -1) * TAU,
        duration: 1.0,
        ease: "power1.inOut",
      });
      gsap.to(portal, { alpha: 0, duration: 0.25, delay: 0.8 });
    }

    // Energy tendrils (curved lines pulsing outward)
    for (let i = 0; i < 6; i++) {
      const tendril = new Graphics();
      const baseAngle = (i / 6) * TAU;
      tendril.moveTo(0, 0);
      for (let t = 1; t <= 6; t++) {
        const a = baseAngle + Math.sin(t * 1.3) * 0.5;
        const d = (t / 6) * r;
        tendril.lineTo(Math.cos(a) * d, Math.sin(a) * d);
      }
      tendril.stroke({ color: 0xaa66cc, width: 1.5, alpha: 0.5 });
      tendril.alpha = 0;
      c.addChild(tendril);
      gsap.to(tendril, { alpha: 0.6, duration: 0.15, delay: 0.1 + i * 0.04 });
      gsap.to(tendril, { alpha: 0, duration: 0.3, delay: 0.65 });
    }

    // Particles: sucked inward → expelled outward
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * TAU;
      const startDist = r * (0.8 + Math.random() * 0.5);
      const colors = [0xaa66cc, 0x663399, 0xddaaff];
      const p = new Graphics()
        .circle(0, 0, 1 + Math.random() * 1.5)
        .fill({ color: colors[i % 3], alpha: 0.8 });
      p.position.set(Math.cos(a) * startDist, Math.sin(a) * startDist);
      c.addChild(p);

      // Suck inward
      gsap.to(p, {
        x: 0,
        y: 0,
        duration: 0.35,
        delay: Math.random() * 0.2,
        ease: "power2.in",
      });
      // Expel outward after implosion
      const expelA = Math.random() * TAU;
      const expelD = r * (0.4 + Math.random() * 0.6);
      gsap.to(p, {
        x: Math.cos(expelA) * expelD,
        y: Math.sin(expelA) * expelD,
        alpha: 0,
        duration: 0.35,
        delay: 0.55 + Math.random() * 0.15,
        ease: "power2.out",
      });
    }

    // Flash on implosion moment
    gsap.delayedCall(0.7, () => {
      const impFlash = new Graphics()
        .circle(0, 0, r * 0.25)
        .fill({ color: 0xddaaff, alpha: 0.7 });
      c.addChild(impFlash);
      gsap.to(impFlash, {
        alpha: 0,
        pixi: { scaleX: 0.1, scaleY: 0.1 },
        duration: 0.2,
        ease: "power2.in",
      });
    });

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Holy Smite ────────────────────────────────────────────────────────────
  // Golden beam from above, radiant cross/star, golden sparkles
  private _holySmite(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Outer golden beam from above
    const beam = new Graphics()
      .rect(-8, -r * 3.5, 16, r * 3.5)
      .fill({ color: 0xffdd44, alpha: 0.4 });
    beam.alpha = 0;
    c.addChild(beam);
    gsap.to(beam, { alpha: 0.6, duration: 0.08 });
    gsap.to(beam, { alpha: 0, duration: 0.5, delay: 0.3 });

    // Inner bright beam core
    const beamInner = new Graphics()
      .rect(-3, -r * 3.5, 6, r * 3.5)
      .fill({ color: 0xffffff, alpha: 0.7 });
    beamInner.alpha = 0;
    c.addChild(beamInner);
    gsap.to(beamInner, { alpha: 0.9, duration: 0.08 });
    gsap.to(beamInner, { alpha: 0, duration: 0.4, delay: 0.2 });

    // Impact flash at ground
    const flash = new Graphics()
      .circle(0, 0, r * 0.25)
      .fill({ color: 0xffffff, alpha: 0.9 });
    c.addChild(flash);
    gsap.to(flash, {
      alpha: 0,
      pixi: { scaleX: 3, scaleY: 3 },
      duration: 0.35,
      delay: 0.05,
    });

    // Radiant cross pattern (4 rays at 90°)
    for (let i = 0; i < 4; i++) {
      const ray = new Graphics()
        .rect(-1.5, 0, 3, r * 0.7)
        .fill({ color: 0xffdd44, alpha: 0.45 });
      ray.rotation = (i / 4) * TAU;
      ray.alpha = 0;
      c.addChild(ray);
      gsap.to(ray, { alpha: 0.6, duration: 0.12, delay: 0.04 });
      gsap.to(ray, {
        alpha: 0,
        pixi: { scaleY: 1.3 },
        duration: 0.5,
        delay: 0.2,
      });
    }

    // Diagonal rays (45° offset, thinner)
    for (let i = 0; i < 4; i++) {
      const ray = new Graphics()
        .rect(-0.8, 0, 1.6, r * 0.5)
        .fill({ color: 0xffee88, alpha: 0.3 });
      ray.rotation = (i / 4) * TAU + Math.PI / 4;
      ray.alpha = 0;
      c.addChild(ray);
      gsap.to(ray, { alpha: 0.4, duration: 0.12, delay: 0.08 });
      gsap.to(ray, { alpha: 0, duration: 0.4, delay: 0.25 });
    }

    // Expanding golden ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.2)
      .stroke({ color: 0xffdd44, width: 2, alpha: 0.8 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
      alpha: 0,
      duration: 0.5,
      delay: 0.1,
      ease: "power2.out",
    });

    // Golden sparkles floating upward
    for (let i = 0; i < 14; i++) {
      const px = (Math.random() - 0.5) * r * 1.4;
      const py = (Math.random() - 0.5) * r;
      const colors = [0xffffaa, 0xffdd44, 0xffffff];
      const spark = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: colors[i % 3], alpha: 0.9 });
      spark.position.set(px, py);
      c.addChild(spark);
      gsap.to(spark, {
        y: py - 20 - Math.random() * 18,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.3,
        delay: 0.1 + Math.random() * 0.2,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Poison Cloud ──────────────────────────────────────────────────────────
  // Billowing toxic clouds, bubbling effect, dripping poison
  private _poisonCloud(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Multiple cloud puffs billowing outward (staggered)
    for (let i = 0; i < 9; i++) {
      const tx = (Math.random() - 0.5) * r * 1.3;
      const ty = (Math.random() - 0.5) * r * 1.3;
      const cloudSize = 6 + Math.random() * 9;
      const colors = [0x44aa33, 0x338822, 0x55bb44, 0x2d8822];
      const cloud = new Graphics()
        .circle(0, 0, cloudSize)
        .fill({ color: colors[i % 4], alpha: 0.2 });
      cloud.position.set(tx * 0.25, ty * 0.25);
      cloud.alpha = 0;
      c.addChild(cloud);

      const delay = i * 0.07;
      gsap.to(cloud, { alpha: 0.3, duration: 0.2, delay });
      gsap.to(cloud, {
        x: tx,
        y: ty,
        pixi: { scaleX: 2, scaleY: 1.5 },
        duration: 0.85,
        delay,
        ease: "power1.out",
      });
      gsap.to(cloud, { alpha: 0, duration: 0.6, delay: 0.85 + i * 0.04 });
    }

    // Bubbling effect — circles rising from ground
    for (let i = 0; i < 12; i++) {
      const bx = (Math.random() - 0.5) * r * 1.4;
      const by = (Math.random() - 0.3) * r;
      const bubble = new Graphics()
        .circle(0, 0, 1.5 + Math.random() * 2)
        .stroke({ color: 0x88dd66, width: 1, alpha: 0.5 });
      bubble.position.set(bx, by);
      bubble.alpha = 0;
      c.addChild(bubble);

      const delay = 0.15 + Math.random() * 0.6;
      gsap.to(bubble, { alpha: 0.7, duration: 0.08, delay });
      gsap.to(bubble, {
        y: by - 12 - Math.random() * 14,
        pixi: { scaleX: 1.6, scaleY: 1.6 },
        alpha: 0,
        duration: 0.4 + Math.random() * 0.3,
        delay,
        ease: "power1.out",
      });
    }

    // Toxic drip particles falling
    for (let i = 0; i < 8; i++) {
      const dx = (Math.random() - 0.5) * r;
      const drip = new Graphics()
        .circle(0, 0, 1)
        .fill({ color: 0x226611, alpha: 0.8 });
      drip.position.set(dx, -6 - Math.random() * 12);
      drip.alpha = 0;
      c.addChild(drip);

      const delay = 0.25 + Math.random() * 0.5;
      gsap.to(drip, { alpha: 0.9, duration: 0.04, delay });
      gsap.to(drip, {
        y: drip.position.y + 18 + Math.random() * 12,
        alpha: 0,
        duration: 0.3,
        delay,
        ease: "power1.in",
      });
    }

    // Green ground stain fading slowly
    const stain = new Graphics()
      .circle(0, 0, r * 0.75)
      .fill({ color: 0x226611, alpha: 0.1 });
    c.addChild(stain);
    gsap.to(stain, { alpha: 0, duration: 0.8, delay: 0.9 });

    autoCleanup(this._vm, c, 2.0);
  }

  // ── Arcane Missile ────────────────────────────────────────────────────────
  // Arcane bolt streaks diagonally to target → impact burst + rune flash
  private _arcaneMissile(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Bolt body (small glowing projectile)
    const boltBody = new Container();
    const boltGlow = new Graphics()
      .circle(0, 0, 4)
      .fill({ color: 0x9966ff, alpha: 0.4 });
    const boltCore = new Graphics()
      .circle(0, 0, 2.5)
      .fill({ color: 0xddaaff, alpha: 1 })
      .circle(0, 0, 1.2)
      .fill({ color: 0xffffff, alpha: 0.9 });
    boltBody.addChild(boltGlow, boltCore);
    boltBody.position.set(r * 1.5, -r * 2);
    c.addChild(boltBody);

    // Trail container
    const trailContainer = new Container();
    c.addChild(trailContainer);

    // Animate bolt streaking to impact
    gsap.to(boltBody, {
      x: 0,
      y: 0,
      duration: 0.18,
      ease: "power2.in",
      onUpdate: () => {
        const tp = new Graphics()
          .circle(0, 0, 1.5 + Math.random())
          .fill({ color: 0x9966ff, alpha: 0.5 });
        tp.position.set(
          boltBody.x + (Math.random() - 0.5) * 3,
          boltBody.y + (Math.random() - 0.5) * 3,
        );
        trailContainer.addChild(tp);
        gsap.to(tp, { alpha: 0, duration: 0.25 });
      },
      onComplete: () => {
        boltBody.visible = false;

        // Impact burst
        const burst = new Graphics()
          .circle(0, 0, r * 0.3)
          .fill({ color: 0x9966ff, alpha: 0.45 });
        c.addChild(burst);
        gsap.to(burst, {
          alpha: 0,
          pixi: { scaleX: 2.5, scaleY: 2.5 },
          duration: 0.35,
        });

        // Concentric rings
        for (let i = 0; i < 2; i++) {
          const ring = new Graphics()
            .circle(0, 0, r * 0.15)
            .stroke({ color: [0x9966ff, 0xddaaff][i], width: 2, alpha: 0.7 });
          c.addChild(ring);
          gsap.to(ring, {
            pixi: {
              scaleX: (r * (0.7 + i * 0.4)) / (r * 0.15),
              scaleY: (r * (0.7 + i * 0.4)) / (r * 0.15),
            },
            alpha: 0,
            duration: 0.35 + i * 0.1,
            delay: i * 0.04,
            ease: "power2.out",
          });
        }

        // Rune star flash (6-pointed)
        const rune = new Graphics();
        for (let j = 0; j < 6; j++) {
          const a = (j / 6) * TAU;
          rune.moveTo(0, 0);
          rune.lineTo(Math.cos(a) * r * 0.4, Math.sin(a) * r * 0.4);
        }
        rune.stroke({ color: 0xddaaff, width: 1, alpha: 0.5 });
        c.addChild(rune);
        gsap.to(rune, { alpha: 0, rotation: Math.PI / 6, duration: 0.4 });

        // Arcane particles
        for (let i = 0; i < 10; i++) {
          const a = Math.random() * TAU;
          const d = r * (0.3 + Math.random() * 0.5);
          const p = new Graphics()
            .circle(0, 0, 1 + Math.random())
            .fill({ color: 0xddaaff, alpha: 0.8 });
          c.addChild(p);
          gsap.to(p, {
            x: Math.cos(a) * d,
            y: Math.sin(a) * d,
            alpha: 0,
            duration: 0.35,
            ease: "power1.out",
          });
        }
      },
    });

    autoCleanup(this._vm, c, 1.2);
  }

  // ── Arcane Storm ──────────────────────────────────────────────────────────
  // Swirling vortex above, multiple arcane bolts raining down, energy arcs
  private _arcaneStorm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Swirling vortex ring at top
    const vortex = new Graphics()
      .circle(0, 0, r * 0.45)
      .stroke({ color: 0x9966ff, width: 2, alpha: 0.4 });
    vortex.position.set(0, -r * 0.6);
    vortex.alpha = 0;
    c.addChild(vortex);
    gsap.to(vortex, { alpha: 0.6, duration: 0.2 });
    gsap.to(vortex, { rotation: TAU, duration: 1.5, ease: "none" });
    gsap.to(vortex, { alpha: 0, duration: 0.3, delay: 1.3 });

    // Inner vortex (counter-rotating)
    const vortex2 = new Graphics()
      .circle(0, 0, r * 0.25)
      .stroke({ color: 0xddaaff, width: 1.5, alpha: 0.3 });
    vortex2.position.set(0, -r * 0.6);
    vortex2.alpha = 0;
    c.addChild(vortex2);
    gsap.to(vortex2, { alpha: 0.5, duration: 0.2 });
    gsap.to(vortex2, { rotation: -TAU * 1.5, duration: 1.5, ease: "none" });
    gsap.to(vortex2, { alpha: 0, duration: 0.3, delay: 1.3 });

    // Multiple arcane bolts striking sequentially
    const boltCount = 8;
    for (let i = 0; i < boltCount; i++) {
      const tx = (Math.random() - 0.5) * r * 1.6;
      const ty = (Math.random() - 0.5) * r * 1.2;
      const delay = 0.1 + i * 0.1;

      gsap.delayedCall(delay, () => {
        // Jagged bolt line from vortex height
        const bolt = new Graphics();
        let bx = tx + (Math.random() - 0.5) * 6;
        let by = -r * 1.8;
        bolt.moveTo(bx, by);
        for (let s = 0; s < 4; s++) {
          bx += (Math.random() - 0.5) * 8;
          by += (r * 1.8 + ty) / 4;
          bolt.lineTo(bx, by);
        }
        bolt.lineTo(tx, ty);
        bolt.stroke({ color: 0xddaaff, width: 2, alpha: 0.8 });
        c.addChild(bolt);
        gsap.to(bolt, { alpha: 0, duration: 0.18 });

        // Small impact flash
        const flash = new Graphics()
          .circle(tx, ty, 3)
          .fill({ color: 0xffffff, alpha: 0.8 });
        c.addChild(flash);
        gsap.to(flash, {
          alpha: 0,
          pixi: { scaleX: 2, scaleY: 2 },
          duration: 0.2,
        });

        // Small impact ring
        const ring = new Graphics()
          .circle(tx, ty, 2)
          .stroke({ color: 0x9966ff, width: 1.5, alpha: 0.6 });
        c.addChild(ring);
        gsap.to(ring, {
          pixi: { scaleX: 4, scaleY: 4 },
          alpha: 0,
          duration: 0.3,
          ease: "power2.out",
        });
      });
    }

    // Connecting energy arcs between random points
    for (let i = 0; i < 4; i++) {
      gsap.delayedCall(0.25 + i * 0.18, () => {
        const arc = new Graphics();
        const x1 = (Math.random() - 0.5) * r;
        const y1 = (Math.random() - 0.5) * r * 0.8;
        const x2 = (Math.random() - 0.5) * r;
        const y2 = (Math.random() - 0.5) * r * 0.8;
        const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 12;
        const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 12;
        arc.moveTo(x1, y1).lineTo(mx, my).lineTo(x2, y2);
        arc.stroke({ color: 0x9966ff, width: 1, alpha: 0.4 });
        c.addChild(arc);
        gsap.to(arc, { alpha: 0, duration: 0.25 });
      });
    }

    // Ambient arcane particles
    for (let i = 0; i < 12; i++) {
      const p = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: 0xddaaff, alpha: 0.6 });
      p.position.set(
        (Math.random() - 0.5) * r * 1.4,
        (Math.random() - 0.5) * r,
      );
      p.alpha = 0;
      c.addChild(p);
      const d = Math.random() * 0.9;
      gsap.to(p, { alpha: 0.7, duration: 0.1, delay: d });
      gsap.to(p, {
        y: p.position.y - 12 - Math.random() * 12,
        alpha: 0,
        duration: 0.5,
        delay: d + 0.15,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 2.2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HEALING SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Healing Wave ──────────────────────────────────────────────────────────
  // Concentric green ripple rings, rising sparkles, gentle pulse
  private _healingWave(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // 4 concentric ripple rings expanding outward
    const rippleColors = [0x22cc44, 0x33dd55, 0x44ee66, 0x22cc44];
    for (let i = 0; i < 4; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.12)
        .stroke({ color: rippleColors[i], width: 2, alpha: 0.7 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.12), scaleY: r / (r * 0.12) },
        alpha: 0,
        duration: 0.7,
        delay: i * 0.15,
        ease: "power1.out",
      });
    }

    // Gentle pulse glow at center
    const glow = new Graphics()
      .circle(0, 0, r * 0.3)
      .fill({ color: 0x22cc44, alpha: 0.25 });
    c.addChild(glow);
    gsap.to(glow, {
      pixi: { scaleX: 1.6, scaleY: 1.6 },
      alpha: 0,
      duration: 0.6,
    });

    // Rising sparkle particles (healing bubbles)
    for (let i = 0; i < 18; i++) {
      const px = (Math.random() - 0.5) * r * 1.6;
      const py = (Math.random() - 0.5) * r;
      const colors = [0xaaffbb, 0x88ff99, 0xeeffee, 0x66ee88];
      const spark = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 4], alpha: 0.8 });
      spark.position.set(px, py);
      spark.alpha = 0;
      c.addChild(spark);
      const delay = Math.random() * 0.4;
      gsap.to(spark, { alpha: 0.9, duration: 0.1, delay });
      gsap.to(spark, {
        y: py - 16 - Math.random() * 22,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.3,
        delay,
        ease: "power1.out",
      });
    }

    // Soft green ground glow
    const ground = new Graphics()
      .circle(0, 0, r)
      .fill({ color: 0x118833, alpha: 0.1 });
    c.addChild(ground);
    gsap.to(ground, { alpha: 0, duration: 0.8, delay: 0.3 });

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Divine Restoration ────────────────────────────────────────────────────
  // Golden light pillars rising, holy circle with runes, ascending motes
  private _divineRestoration(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Holy circle on ground with rune diamonds
    const holyCircle = new Graphics()
      .circle(0, 0, r)
      .stroke({ color: 0xffdd44, width: 2, alpha: 0.4 });
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const gx = Math.cos(a) * r;
      const gy = Math.sin(a) * r;
      holyCircle
        .moveTo(gx, gy - 3)
        .lineTo(gx + 2, gy)
        .lineTo(gx, gy + 3)
        .lineTo(gx - 2, gy)
        .closePath()
        .fill({ color: 0xffdd44, alpha: 0.5 });
    }
    // Inner circle
    holyCircle
      .circle(0, 0, r * 0.5)
      .stroke({ color: 0xffee88, width: 1, alpha: 0.3 });
    holyCircle.alpha = 0;
    c.addChild(holyCircle);
    gsap.to(holyCircle, { alpha: 0.7, duration: 0.3 });
    gsap.to(holyCircle, {
      alpha: 0,
      rotation: Math.PI / 8,
      duration: 0.6,
      delay: 1.0,
    });

    // Golden light pillars rising at random positions
    for (let i = 0; i < 6; i++) {
      const px = (Math.random() - 0.5) * r * 1.2;
      const py = (Math.random() - 0.5) * r * 0.8;

      const pillar = new Graphics()
        .rect(-4, 0, 8, -r * 1.8)
        .fill({ color: 0xffdd44, alpha: 0.25 });
      const pillarInner = new Graphics()
        .rect(-1.5, 0, 3, -r * 1.8)
        .fill({ color: 0xffffff, alpha: 0.45 });
      pillar.position.set(px, py);
      pillarInner.position.set(px, py);
      pillar.alpha = 0;
      pillarInner.alpha = 0;
      c.addChild(pillar, pillarInner);

      const delay = 0.08 + i * 0.1;
      gsap.to(pillar, { alpha: 0.5, duration: 0.15, delay });
      gsap.to(pillarInner, { alpha: 0.7, duration: 0.15, delay });
      gsap.to(pillar, { alpha: 0, duration: 0.5, delay: delay + 0.5 });
      gsap.to(pillarInner, { alpha: 0, duration: 0.4, delay: delay + 0.4 });
    }

    // Central bright flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.2)
      .fill({ color: 0xffffff, alpha: 0.7 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 3, scaleY: 3 },
      alpha: 0,
      duration: 0.5,
      delay: 0.15,
    });

    // Two expanding golden ring waves
    for (let i = 0; i < 2; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.15)
        .stroke({ color: 0xffdd44, width: 2, alpha: 0.6 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.15), scaleY: r / (r * 0.15) },
        alpha: 0,
        duration: 0.6,
        delay: 0.15 + i * 0.2,
        ease: "power1.out",
      });
    }

    // Golden motes ascending
    for (let i = 0; i < 22; i++) {
      const mx = (Math.random() - 0.5) * r * 1.6;
      const my = (Math.random() - 0.5) * r * 1.2;
      const colors = [0xffffaa, 0xffdd44, 0xffffff, 0xffee88];
      const mote = new Graphics()
        .circle(0, 0, 1 + Math.random() * 1.5)
        .fill({ color: colors[i % 4], alpha: 0.7 });
      mote.position.set(mx, my);
      mote.alpha = 0;
      c.addChild(mote);
      const delay = 0.1 + Math.random() * 0.5;
      gsap.to(mote, { alpha: 0.9, duration: 0.1, delay });
      gsap.to(mote, {
        y: my - 28 - Math.random() * 22,
        alpha: 0,
        duration: 0.8 + Math.random() * 0.4,
        delay,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 2.2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW ELEMENTAL SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Frost Nova ──────────────────────────────────────────────────────────
  // Ice ring blasting outward from center, frost crystal shards, frozen shimmer
  private _frostNova(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Central ice flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.15)
      .fill({ color: 0xeeffff, alpha: 0.95 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 2, scaleY: 2 },
      alpha: 0,
      duration: 0.2,
    });

    // Expanding ice ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.15)
      .stroke({ color: 0x88ddff, width: 3, alpha: 0.9 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.15), scaleY: r / (r * 0.15) },
      alpha: 0,
      duration: 0.45,
      ease: "power2.out",
    });

    // Secondary thinner ring
    const ring2 = new Graphics()
      .circle(0, 0, r * 0.12)
      .stroke({ color: 0xaaeeff, width: 1.5, alpha: 0.6 });
    c.addChild(ring2);
    gsap.to(ring2, {
      pixi: { scaleX: r / (r * 0.12) * 0.7, scaleY: r / (r * 0.12) * 0.7 },
      alpha: 0,
      duration: 0.4,
      delay: 0.06,
      ease: "power2.out",
    });

    // Frost ground fill
    const frostFill = new Graphics()
      .circle(0, 0, r * 0.8)
      .fill({ color: 0x88ccee, alpha: 0.15 });
    c.addChild(frostFill);
    gsap.to(frostFill, { alpha: 0, duration: 0.7, delay: 0.2 });

    // Ice crystal shards radiating outward
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU + (Math.random() - 0.5) * 0.2;
      const dist = r * (0.5 + Math.random() * 0.5);
      const size = 2 + Math.random() * 3;
      const colors = [0xaaddff, 0xcceeff, 0xddeeff, 0x88ccff];
      const shard = new Graphics();
      shard
        .moveTo(0, -size * 1.3)
        .lineTo(size * 0.4, 0)
        .lineTo(0, size * 0.6)
        .lineTo(-size * 0.4, 0)
        .closePath()
        .fill({ color: colors[i % 4], alpha: 0.85 });
      c.addChild(shard);
      gsap.to(shard, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        rotation: Math.random() * TAU,
        alpha: 0,
        duration: 0.4 + Math.random() * 0.2,
        ease: "power2.out",
      });
    }

    // Tiny frost sparkle particles
    for (let i = 0; i < 12; i++) {
      const dot = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: 0xeeffff, alpha: 0.8 });
      dot.position.set(
        (Math.random() - 0.5) * r * 1.2,
        (Math.random() - 0.5) * r * 1.2,
      );
      dot.alpha = 0;
      c.addChild(dot);
      const d = Math.random() * 0.3;
      gsap.to(dot, { alpha: 0.9, duration: 0.06, delay: d });
      gsap.to(dot, { alpha: 0, duration: 0.4, delay: d + 0.2 });
    }

    autoCleanup(this._vm, c, 1.2);
  }

  // ── Chain Lightning ─────────────────────────────────────────────────────
  // Multiple zigzag bolt segments arcing between random positions
  private _chainLightning(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Generate chain target points
    const points: { x: number; y: number }[] = [{ x: 0, y: 0 }];
    for (let i = 0; i < 5; i++) {
      points.push({
        x: (Math.random() - 0.5) * r * 1.8,
        y: (Math.random() - 0.5) * r * 1.4,
      });
    }

    // Draw zigzag bolt chains between consecutive points
    for (let i = 0; i < points.length - 1; i++) {
      const from = points[i];
      const to = points[i + 1];
      const delay = i * 0.06;

      gsap.delayedCall(delay, () => {
        const bolt = new Graphics();
        const segs = 5;
        bolt.moveTo(from.x, from.y);
        for (let s = 1; s <= segs; s++) {
          const t = s / (segs + 1);
          const mx = from.x + (to.x - from.x) * t + (Math.random() - 0.5) * 10;
          const my = from.y + (to.y - from.y) * t + (Math.random() - 0.5) * 10;
          bolt.lineTo(mx, my);
        }
        bolt.lineTo(to.x, to.y);
        bolt.stroke({ color: 0xccddff, width: 2.5, alpha: 0.9 });
        c.addChild(bolt);
        gsap.to(bolt, { alpha: 0, duration: 0.2 });

        // Glow at each node
        const glow = new Graphics()
          .circle(to.x, to.y, 4)
          .fill({ color: 0x4488ff, alpha: 0.6 });
        c.addChild(glow);
        gsap.to(glow, {
          alpha: 0,
          pixi: { scaleX: 2, scaleY: 2 },
          duration: 0.25,
        });

        // Small spark burst at impact point
        for (let j = 0; j < 4; j++) {
          const a = Math.random() * TAU;
          const spark = new Graphics()
            .circle(0, 0, 1)
            .fill({ color: 0xeeffff, alpha: 0.9 });
          spark.position.set(to.x, to.y);
          c.addChild(spark);
          gsap.to(spark, {
            x: to.x + Math.cos(a) * 8,
            y: to.y + Math.sin(a) * 8,
            alpha: 0,
            duration: 0.15,
          });
        }
      });
    }

    // Initial central flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.2)
      .fill({ color: 0xffffff, alpha: 0.8 });
    c.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.12 });

    // Ground scorch ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.3)
      .stroke({ color: 0x4488ff, width: 1.5, alpha: 0.4 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.3), scaleY: r / (r * 0.3) },
      alpha: 0,
      duration: 0.5,
      ease: "power2.out",
    });

    autoCleanup(this._vm, c, 1.2);
  }

  // ── Inferno ─────────────────────────────────────────────────────────────
  // Towering flame pillar, expanding fire waves, intense heat haze, ember rain
  private _inferno(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Massive fire pillar rising
    const pillar = new Graphics()
      .rect(-r * 0.3, 0, r * 0.6, -r * 4)
      .fill({ color: 0xff4400, alpha: 0.4 });
    pillar.alpha = 0;
    c.addChild(pillar);
    gsap.to(pillar, { alpha: 0.6, duration: 0.15 });
    gsap.to(pillar, { alpha: 0, duration: 0.6, delay: 0.6 });

    // Inner bright core pillar
    const pillarCore = new Graphics()
      .rect(-r * 0.1, 0, r * 0.2, -r * 4)
      .fill({ color: 0xffdd00, alpha: 0.7 });
    pillarCore.alpha = 0;
    c.addChild(pillarCore);
    gsap.to(pillarCore, { alpha: 0.8, duration: 0.12 });
    gsap.to(pillarCore, { alpha: 0, duration: 0.5, delay: 0.5 });

    // Three expanding fire wave rings
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.15)
        .stroke({ color: [0xff6622, 0xff4400, 0xffaa22][i], width: 3, alpha: 0.8 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.15), scaleY: r / (r * 0.15) },
        alpha: 0,
        duration: 0.6 + i * 0.15,
        delay: i * 0.1,
        ease: "power2.out",
      });
    }

    // Intense central flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.4)
      .fill({ color: 0xffffff, alpha: 0.9 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 2.5, scaleY: 2.5 },
      alpha: 0,
      duration: 0.3,
    });

    // Massive ember rain
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * TAU;
      const dist = r * (0.3 + Math.random() * 0.8);
      const size = 1.5 + Math.random() * 2.5;
      const colors = [0xffaa44, 0xff6622, 0xffdd00, 0xff4400];
      const ember = new Graphics()
        .circle(0, 0, size)
        .fill({ color: colors[i % 4], alpha: 0.85 });
      c.addChild(ember);
      gsap.to(ember, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist + 10 + Math.random() * 15,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.5,
        delay: Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    // Heat haze shimmer (wobbly transparent circles)
    for (let i = 0; i < 5; i++) {
      const haze = new Graphics()
        .circle(0, 0, r * (0.4 + i * 0.15))
        .fill({ color: 0xff6600, alpha: 0.04 });
      c.addChild(haze);
      gsap.to(haze, {
        y: -10 - i * 8,
        pixi: { scaleX: 1.3, scaleY: 0.8 },
        alpha: 0,
        duration: 1.0,
        delay: i * 0.08,
        ease: "power1.out",
      });
    }

    // Smoke columns
    for (let i = 0; i < 8; i++) {
      const smoke = new Graphics()
        .circle(0, 0, 4 + Math.random() * 5)
        .fill({ color: 0x333333, alpha: 0.2 });
      smoke.position.set(
        (Math.random() - 0.5) * r,
        (Math.random() - 0.5) * r * 0.5,
      );
      c.addChild(smoke);
      gsap.to(smoke, {
        y: smoke.position.y - 35 - Math.random() * 25,
        alpha: 0,
        pixi: { scaleX: 3, scaleY: 3 },
        duration: 1.0 + Math.random() * 0.5,
        delay: 0.2 + Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 2.0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW ARCANE SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Mana Surge ──────────────────────────────────────────────────────────
  // Blue/purple mana explosion, spiraling energy particles, detonation flash
  private _manaSurge(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Central mana detonation flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.2)
      .fill({ color: 0xeeddff, alpha: 0.95 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 3, scaleY: 3 },
      alpha: 0,
      duration: 0.25,
    });

    // Mana explosion fill
    const fill = new Graphics()
      .circle(0, 0, r * 0.5)
      .fill({ color: 0x6644cc, alpha: 0.35 });
    c.addChild(fill);
    gsap.to(fill, {
      pixi: { scaleX: 1.8, scaleY: 1.8 },
      alpha: 0,
      duration: 0.5,
    });

    // Expanding ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.2)
      .stroke({ color: 0x9966ff, width: 3, alpha: 0.8 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
      alpha: 0,
      duration: 0.5,
      ease: "power2.out",
    });

    // Spiraling energy particles (two spiral arms)
    for (let arm = 0; arm < 2; arm++) {
      for (let i = 0; i < 10; i++) {
        const a = arm * Math.PI + (i / 10) * TAU * 1.5;
        const dist = (i / 10) * r;
        const p = new Graphics()
          .circle(0, 0, 1.5 + Math.random())
          .fill({ color: [0x9966ff, 0xddaaff][arm], alpha: 0.8 });
        c.addChild(p);
        gsap.to(p, {
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist,
          alpha: 0,
          duration: 0.4 + i * 0.03,
          delay: i * 0.02,
          ease: "power1.out",
        });
      }
    }

    // Mana shards
    for (let i = 0; i < 8; i++) {
      const a = Math.random() * TAU;
      const dist = r * (0.4 + Math.random() * 0.5);
      const shard = new Graphics()
        .moveTo(0, -3)
        .lineTo(2, 0)
        .lineTo(0, 3)
        .lineTo(-2, 0)
        .closePath()
        .fill({ color: 0xccaaff, alpha: 0.7 });
      c.addChild(shard);
      gsap.to(shard, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        rotation: Math.random() * TAU,
        alpha: 0,
        duration: 0.45,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 1.2);
  }

  // ── Arcane Barrage ──────────────────────────────────────────────────────
  // Many small rapid arcane bolts raining from above at staggered intervals
  private _arcaneBarrage(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    const boltCount = 12;
    for (let i = 0; i < boltCount; i++) {
      const tx = (Math.random() - 0.5) * r * 1.6;
      const ty = (Math.random() - 0.5) * r * 1.2;
      const delay = i * 0.07;

      gsap.delayedCall(delay, () => {
        // Small arcane bolt falling from above
        const bolt = new Container();
        const boltGlow = new Graphics()
          .circle(0, 0, 3)
          .fill({ color: 0x9966ff, alpha: 0.4 });
        const boltCore = new Graphics()
          .circle(0, 0, 1.5)
          .fill({ color: 0xddaaff, alpha: 0.9 });
        bolt.addChild(boltGlow, boltCore);
        bolt.position.set(tx + (Math.random() - 0.5) * 10, -r * 2);
        c.addChild(bolt);

        gsap.to(bolt, {
          x: tx,
          y: ty,
          duration: 0.12,
          ease: "power2.in",
          onComplete: () => {
            bolt.visible = false;
            // Impact flash
            const impFlash = new Graphics()
              .circle(tx, ty, 3)
              .fill({ color: 0xddaaff, alpha: 0.8 });
            c.addChild(impFlash);
            gsap.to(impFlash, {
              alpha: 0,
              pixi: { scaleX: 2.5, scaleY: 2.5 },
              duration: 0.2,
            });
            // Small ring
            const impRing = new Graphics()
              .circle(tx, ty, 2)
              .stroke({ color: 0x9966ff, width: 1.5, alpha: 0.6 });
            c.addChild(impRing);
            gsap.to(impRing, {
              pixi: { scaleX: 3, scaleY: 3 },
              alpha: 0,
              duration: 0.25,
              ease: "power2.out",
            });
          },
        });
      });
    }

    // Ambient arcane shimmer on ground
    const shimmer = new Graphics()
      .circle(0, 0, r * 0.7)
      .fill({ color: 0x6644aa, alpha: 0.1 });
    c.addChild(shimmer);
    gsap.to(shimmer, { alpha: 0, duration: 0.8, delay: 0.5 });

    autoCleanup(this._vm, c, 2.0);
  }

  // ── Temporal Blast ──────────────────────────────────────────────────────
  // Concentric golden/white distortion rings, time-warp shimmer particles
  private _temporalBlast(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Bright white-gold central flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.15)
      .fill({ color: 0xffffff, alpha: 1 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 4, scaleY: 4 },
      alpha: 0,
      duration: 0.3,
    });

    // 5 concentric distortion rings expanding at staggered speeds
    const ringColors = [0xffeeaa, 0xeeddff, 0xffffff, 0xddccff, 0xffddaa];
    for (let i = 0; i < 5; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.1)
        .stroke({ color: ringColors[i], width: 2.5 - i * 0.3, alpha: 0.7 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.1) * (0.6 + i * 0.15), scaleY: r / (r * 0.1) * (0.6 + i * 0.15) },
        alpha: 0,
        duration: 0.5 + i * 0.1,
        delay: i * 0.06,
        ease: "power2.out",
      });
    }

    // Time-warp shimmer particles (golden motes that freeze then scatter)
    for (let i = 0; i < 20; i++) {
      const a = Math.random() * TAU;
      const startDist = r * (0.2 + Math.random() * 0.3);
      const endDist = r * (0.5 + Math.random() * 0.6);
      const colors = [0xffeeaa, 0xeeddff, 0xffffff, 0xddbbff];
      const mote = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 4], alpha: 0.85 });
      mote.position.set(Math.cos(a) * startDist, Math.sin(a) * startDist);
      c.addChild(mote);
      // Brief freeze then scatter
      gsap.to(mote, {
        x: Math.cos(a) * endDist,
        y: Math.sin(a) * endDist,
        alpha: 0,
        duration: 0.5,
        delay: 0.15 + Math.random() * 0.1,
        ease: "power2.out",
      });
    }

    // Central rune star (clock-like pattern)
    const rune = new Graphics();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const len = i % 3 === 0 ? r * 0.35 : r * 0.2;
      rune.moveTo(0, 0).lineTo(Math.cos(a) * len, Math.sin(a) * len);
    }
    rune.stroke({ color: 0xffeeaa, width: 1, alpha: 0.5 });
    c.addChild(rune);
    gsap.to(rune, { rotation: Math.PI / 6, alpha: 0, duration: 0.6 });

    autoCleanup(this._vm, c, 1.5);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW DIVINE SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Blessing of Light ───────────────────────────────────────────────────
  // Soft golden downward glow, gentle sparkle particles, warm pulse
  private _blessingOfLight(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Soft downward golden beam
    const beam = new Graphics()
      .rect(-r * 0.4, -r * 2.5, r * 0.8, r * 2.5)
      .fill({ color: 0xffdd44, alpha: 0.2 });
    beam.alpha = 0;
    c.addChild(beam);
    gsap.to(beam, { alpha: 0.4, duration: 0.2 });
    gsap.to(beam, { alpha: 0, duration: 0.6, delay: 0.5 });

    // Warm golden pulse at center
    const pulse = new Graphics()
      .circle(0, 0, r * 0.3)
      .fill({ color: 0xffee88, alpha: 0.3 });
    c.addChild(pulse);
    gsap.to(pulse, {
      pixi: { scaleX: 2, scaleY: 2 },
      alpha: 0,
      duration: 0.6,
    });

    // Expanding gentle ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.2)
      .stroke({ color: 0xffdd44, width: 1.5, alpha: 0.5 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
      alpha: 0,
      duration: 0.5,
      ease: "power1.out",
    });

    // Gentle golden sparkles floating down then up
    for (let i = 0; i < 14; i++) {
      const px = (Math.random() - 0.5) * r * 1.4;
      const py = -r * 0.5 - Math.random() * r;
      const colors = [0xffffcc, 0xffee88, 0xffffff];
      const spark = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: colors[i % 3], alpha: 0.7 });
      spark.position.set(px, py);
      spark.alpha = 0;
      c.addChild(spark);
      const d = Math.random() * 0.4;
      gsap.to(spark, { alpha: 0.8, duration: 0.1, delay: d });
      gsap.to(spark, {
        y: py + r + Math.random() * r * 0.5,
        alpha: 0,
        duration: 0.7 + Math.random() * 0.3,
        delay: d,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 1.3);
  }

  // ── Purifying Flame ─────────────────────────────────────────────────────
  // White-gold fire eruption, clean white particles ascending, holy ring
  private _purifyingFlame(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // White-hot core flash
    const core = new Graphics()
      .circle(0, 0, r * 0.15)
      .fill({ color: 0xffffff, alpha: 1 });
    c.addChild(core);
    gsap.to(core, {
      pixi: { scaleX: 2.5, scaleY: 2.5 },
      alpha: 0,
      duration: 0.2,
    });

    // Golden fire ring expanding
    const ring = new Graphics()
      .circle(0, 0, r * 0.2)
      .stroke({ color: 0xffdd44, width: 3, alpha: 0.9 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
      alpha: 0,
      duration: 0.5,
      ease: "power2.out",
    });

    // White-gold fire fill
    const fill = new Graphics()
      .circle(0, 0, r * 0.6)
      .fill({ color: 0xffee88, alpha: 0.3 });
    c.addChild(fill);
    gsap.to(fill, {
      pixi: { scaleX: 1.5, scaleY: 1.5 },
      alpha: 0,
      duration: 0.45,
    });

    // Clean white particles ascending (purification)
    for (let i = 0; i < 18; i++) {
      const px = (Math.random() - 0.5) * r * 1.2;
      const py = (Math.random() - 0.5) * r * 0.8;
      const colors = [0xffffff, 0xffffcc, 0xffee88, 0xffdd44];
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 4], alpha: 0.85 });
      p.position.set(px, py);
      c.addChild(p);
      gsap.to(p, {
        y: py - 22 - Math.random() * 18,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.3,
        delay: Math.random() * 0.15,
        ease: "power1.out",
      });
    }

    // Holy cross pattern (subtle)
    for (let i = 0; i < 4; i++) {
      const ray = new Graphics()
        .rect(-1, 0, 2, r * 0.5)
        .fill({ color: 0xffdd44, alpha: 0.3 });
      ray.rotation = (i / 4) * TAU;
      c.addChild(ray);
      gsap.to(ray, { alpha: 0, duration: 0.5, delay: 0.15 });
    }

    autoCleanup(this._vm, c, 1.3);
  }

  // ── Radiant Nova ────────────────────────────────────────────────────────
  // Expanding golden light ring with sparkle trail, ascending golden motes
  private _radiantNova(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Central golden flash
    const flash = new Graphics()
      .circle(0, 0, r * 0.2)
      .fill({ color: 0xffffff, alpha: 0.9 });
    c.addChild(flash);
    gsap.to(flash, {
      pixi: { scaleX: 2.5, scaleY: 2.5 },
      alpha: 0,
      duration: 0.3,
    });

    // Two expanding golden healing rings
    for (let i = 0; i < 2; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.12)
        .stroke({ color: [0xffdd44, 0xffee88][i], width: 2.5, alpha: 0.8 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.12), scaleY: r / (r * 0.12) },
        alpha: 0,
        duration: 0.55 + i * 0.1,
        delay: i * 0.08,
        ease: "power2.out",
      });
    }

    // Sparkle trail behind expanding ring
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const dist = r * (0.6 + Math.random() * 0.4);
      const colors = [0xffffaa, 0xffdd44, 0xffffff, 0xffee88];
      const spark = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 4], alpha: 0.8 });
      c.addChild(spark);
      gsap.to(spark, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.2,
        delay: 0.05,
        ease: "power2.out",
      });
    }

    // Golden motes ascending (healing visualization)
    for (let i = 0; i < 16; i++) {
      const mx = (Math.random() - 0.5) * r * 1.4;
      const my = (Math.random() - 0.5) * r;
      const mote = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: 0xffee88, alpha: 0.7 });
      mote.position.set(mx, my);
      mote.alpha = 0;
      c.addChild(mote);
      const d = 0.1 + Math.random() * 0.3;
      gsap.to(mote, { alpha: 0.8, duration: 0.1, delay: d });
      gsap.to(mote, {
        y: my - 25 - Math.random() * 20,
        alpha: 0,
        duration: 0.7 + Math.random() * 0.3,
        delay: d,
        ease: "power1.out",
      });
    }

    // Golden ground glow
    const glow = new Graphics()
      .circle(0, 0, r)
      .fill({ color: 0xffdd44, alpha: 0.1 });
    c.addChild(glow);
    gsap.to(glow, { alpha: 0, duration: 0.8, delay: 0.3 });

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Celestial Wrath ─────────────────────────────────────────────────────
  // Multiple golden beams descending, massive expanding divine rings, bright flash
  private _celestialWrath(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Multiple golden beams descending at different positions
    for (let i = 0; i < 5; i++) {
      const bx = (Math.random() - 0.5) * r * 1.2;
      const by = (Math.random() - 0.5) * r * 0.6;
      const delay = i * 0.1;

      gsap.delayedCall(delay, () => {
        // Outer beam
        const beam = new Graphics()
          .rect(bx - 6, -r * 4, 12, r * 4 + by)
          .fill({ color: 0xffdd44, alpha: 0.35 });
        beam.alpha = 0;
        c.addChild(beam);
        gsap.to(beam, { alpha: 0.5, duration: 0.06 });
        gsap.to(beam, { alpha: 0, duration: 0.4, delay: 0.2 });

        // Inner beam core
        const beamCore = new Graphics()
          .rect(bx - 2, -r * 4, 4, r * 4 + by)
          .fill({ color: 0xffffff, alpha: 0.6 });
        beamCore.alpha = 0;
        c.addChild(beamCore);
        gsap.to(beamCore, { alpha: 0.8, duration: 0.06 });
        gsap.to(beamCore, { alpha: 0, duration: 0.3, delay: 0.15 });

        // Impact flash at beam base
        const impFlash = new Graphics()
          .circle(bx, by, 5)
          .fill({ color: 0xffffff, alpha: 0.9 });
        c.addChild(impFlash);
        gsap.to(impFlash, {
          alpha: 0,
          pixi: { scaleX: 2.5, scaleY: 2.5 },
          duration: 0.25,
        });
      });
    }

    // Massive expanding divine rings
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics()
        .circle(0, 0, r * 0.15)
        .stroke({ color: [0xffdd44, 0xffee88, 0xffffff][i], width: 3, alpha: 0.7 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.15), scaleY: r / (r * 0.15) },
        alpha: 0,
        duration: 0.6 + i * 0.12,
        delay: 0.2 + i * 0.1,
        ease: "power2.out",
      });
    }

    // Star burst (8-pointed)
    const star = new Graphics();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      star.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
    }
    star.stroke({ color: 0xffdd44, width: 1.5, alpha: 0.5 });
    c.addChild(star);
    gsap.to(star, { alpha: 0, rotation: Math.PI / 8, duration: 0.6, delay: 0.2 });

    // Golden particle shower
    for (let i = 0; i < 22; i++) {
      const a = Math.random() * TAU;
      const dist = r * (0.3 + Math.random() * 0.7);
      const colors = [0xffffaa, 0xffdd44, 0xffffff];
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 3], alpha: 0.85 });
      c.addChild(p);
      gsap.to(p, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist - 10 - Math.random() * 15,
        alpha: 0,
        duration: 0.6 + Math.random() * 0.3,
        delay: 0.15 + Math.random() * 0.2,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 2.0);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW SHADOW SPELLS
  // ═══════════════════════════════════════════════════════════════════════════

  // ── Shadow Bolt ─────────────────────────────────────────────────────────
  // Dark projectile streaking from side, dark impact burst, shadow tendrils
  private _shadowBolt(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Dark bolt projectile
    const bolt = new Container();
    const boltGlow = new Graphics()
      .circle(0, 0, 5)
      .fill({ color: 0x663399, alpha: 0.5 });
    const boltCore = new Graphics()
      .circle(0, 0, 3)
      .fill({ color: 0x220033, alpha: 0.9 })
      .circle(0, 0, 1.5)
      .fill({ color: 0x9966cc, alpha: 0.8 });
    bolt.addChild(boltGlow, boltCore);
    bolt.position.set(-r * 2, -r * 1.5);
    c.addChild(bolt);

    // Trail
    const trailC = new Container();
    c.addChild(trailC);

    gsap.to(bolt, {
      x: 0,
      y: 0,
      duration: 0.2,
      ease: "power2.in",
      onUpdate: () => {
        const tp = new Graphics()
          .circle(0, 0, 1.5 + Math.random())
          .fill({ color: 0x663399, alpha: 0.4 });
        tp.position.set(
          bolt.x + (Math.random() - 0.5) * 4,
          bolt.y + (Math.random() - 0.5) * 4,
        );
        trailC.addChild(tp);
        gsap.to(tp, { alpha: 0, duration: 0.2 });
      },
      onComplete: () => {
        bolt.visible = false;

        // Dark impact burst
        const burst = new Graphics()
          .circle(0, 0, r * 0.3)
          .fill({ color: 0x330055, alpha: 0.5 });
        c.addChild(burst);
        gsap.to(burst, {
          pixi: { scaleX: 2, scaleY: 2 },
          alpha: 0,
          duration: 0.35,
        });

        // Impact ring
        const ring = new Graphics()
          .circle(0, 0, r * 0.15)
          .stroke({ color: 0x9966cc, width: 2, alpha: 0.7 });
        c.addChild(ring);
        gsap.to(ring, {
          pixi: { scaleX: r / (r * 0.15), scaleY: r / (r * 0.15) },
          alpha: 0,
          duration: 0.4,
          ease: "power2.out",
        });

        // Shadow tendrils radiating outward
        for (let i = 0; i < 6; i++) {
          const tendril = new Graphics();
          const baseA = (i / 6) * TAU;
          tendril.moveTo(0, 0);
          for (let t = 1; t <= 4; t++) {
            const a = baseA + Math.sin(t * 1.5) * 0.4;
            const d = (t / 4) * r * 0.7;
            tendril.lineTo(Math.cos(a) * d, Math.sin(a) * d);
          }
          tendril.stroke({ color: 0x663399, width: 1.5, alpha: 0.5 });
          c.addChild(tendril);
          gsap.to(tendril, { alpha: 0, duration: 0.4, delay: 0.1 });
        }

        // Dark particles
        for (let i = 0; i < 8; i++) {
          const a = Math.random() * TAU;
          const dist = r * (0.3 + Math.random() * 0.4);
          const p = new Graphics()
            .circle(0, 0, 1.5)
            .fill({ color: 0x9933cc, alpha: 0.7 });
          c.addChild(p);
          gsap.to(p, {
            x: Math.cos(a) * dist,
            y: Math.sin(a) * dist,
            alpha: 0,
            duration: 0.3,
            ease: "power1.out",
          });
        }
      },
    });

    autoCleanup(this._vm, c, 1.2);
  }

  // ── Curse of Darkness ───────────────────────────────────────────────────
  // Dark fog expanding, swirling shadow wisps, draining particles pulled inward
  private _curseOfDarkness(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Dark fog clouds expanding
    for (let i = 0; i < 8; i++) {
      const tx = (Math.random() - 0.5) * r * 1.2;
      const ty = (Math.random() - 0.5) * r * 1.2;
      const cloudSize = 6 + Math.random() * 8;
      const colors = [0x220033, 0x330044, 0x110022, 0x2a0040];
      const cloud = new Graphics()
        .circle(0, 0, cloudSize)
        .fill({ color: colors[i % 4], alpha: 0.25 });
      cloud.position.set(tx * 0.3, ty * 0.3);
      cloud.alpha = 0;
      c.addChild(cloud);

      const delay = i * 0.06;
      gsap.to(cloud, { alpha: 0.35, duration: 0.2, delay });
      gsap.to(cloud, {
        x: tx,
        y: ty,
        pixi: { scaleX: 1.8, scaleY: 1.5 },
        duration: 0.8,
        delay,
        ease: "power1.out",
      });
      gsap.to(cloud, { alpha: 0, duration: 0.5, delay: 0.9 });
    }

    // Swirling shadow wisps (curved lines rotating)
    for (let i = 0; i < 3; i++) {
      const wisp = new Graphics();
      const startA = (i / 3) * TAU;
      wisp.moveTo(
        Math.cos(startA) * r * 0.2,
        Math.sin(startA) * r * 0.2,
      );
      for (let t = 1; t <= 8; t++) {
        const a = startA + (t / 8) * Math.PI;
        const rd = r * (0.2 + (t / 8) * 0.5);
        wisp.lineTo(Math.cos(a) * rd, Math.sin(a) * rd);
      }
      wisp.stroke({ color: 0x9966cc, width: 1.5, alpha: 0.3 });
      wisp.alpha = 0;
      c.addChild(wisp);
      gsap.to(wisp, { alpha: 0.5, duration: 0.15, delay: i * 0.1 });
      gsap.to(wisp, {
        rotation: Math.PI * 0.5,
        duration: 1.0,
        delay: i * 0.1,
        ease: "power1.inOut",
      });
      gsap.to(wisp, { alpha: 0, duration: 0.3, delay: 0.8 });
    }

    // Draining particles pulled inward toward center
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * TAU;
      const startDist = r * (0.7 + Math.random() * 0.5);
      const p = new Graphics()
        .circle(0, 0, 1 + Math.random())
        .fill({ color: 0xaa88cc, alpha: 0.7 });
      p.position.set(Math.cos(a) * startDist, Math.sin(a) * startDist);
      p.alpha = 0;
      c.addChild(p);
      const d = Math.random() * 0.4;
      gsap.to(p, { alpha: 0.8, duration: 0.08, delay: d });
      gsap.to(p, {
        x: 0,
        y: 0,
        alpha: 0,
        duration: 0.5,
        delay: d + 0.1,
        ease: "power2.in",
      });
    }

    // Dark ground stain
    const stain = new Graphics()
      .circle(0, 0, r * 0.7)
      .fill({ color: 0x110022, alpha: 0.12 });
    c.addChild(stain);
    gsap.to(stain, { alpha: 0, duration: 0.6, delay: 0.8 });

    autoCleanup(this._vm, c, 1.8);
  }

  // ── Death Coil ──────────────────────────────────────────────────────────
  // Spiraling dark green/purple energy projectile, necrotic burst at impact
  private _deathCoil(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Spiraling projectile coil (moves to center from above-left)
    const coil = new Container();
    const coilGlow = new Graphics()
      .circle(0, 0, 6)
      .fill({ color: 0x336633, alpha: 0.4 });
    const coilCore = new Graphics()
      .circle(0, 0, 3)
      .fill({ color: 0x44aa44, alpha: 0.9 })
      .circle(0, 0, 1.5)
      .fill({ color: 0xaaffaa, alpha: 0.7 });
    coil.addChild(coilGlow, coilCore);
    coil.position.set(-r * 1.8, -r * 2.5);
    c.addChild(coil);

    const trailC = new Container();
    c.addChild(trailC);

    // Spiral trajectory
    const tl = gsap.timeline();
    const spiralDur = 0.35;
    tl.to(coil, {
      x: 0,
      y: 0,
      duration: spiralDur,
      ease: "power2.in",
      onUpdate: () => {
        // Spiral trail particles
        const tp = new Graphics()
          .circle(0, 0, 1.5 + Math.random())
          .fill({ color: [0x44aa44, 0x663399][Math.random() > 0.5 ? 1 : 0], alpha: 0.5 });
        tp.position.set(
          coil.x + (Math.random() - 0.5) * 6,
          coil.y + (Math.random() - 0.5) * 6,
        );
        trailC.addChild(tp);
        gsap.to(tp, { alpha: 0, duration: 0.3 });
      },
    });

    tl.call(() => {
      coil.visible = false;

      // Necrotic burst
      const burst = new Graphics()
        .circle(0, 0, r * 0.35)
        .fill({ color: 0x336633, alpha: 0.45 });
      c.addChild(burst);
      gsap.to(burst, {
        pixi: { scaleX: 2.5, scaleY: 2.5 },
        alpha: 0,
        duration: 0.4,
      });

      // Green/purple ring
      const ring = new Graphics()
        .circle(0, 0, r * 0.2)
        .stroke({ color: 0x44aa44, width: 2.5, alpha: 0.8 });
      c.addChild(ring);
      gsap.to(ring, {
        pixi: { scaleX: r / (r * 0.2), scaleY: r / (r * 0.2) },
        alpha: 0,
        duration: 0.45,
        ease: "power2.out",
      });

      // Necrotic particles
      for (let i = 0; i < 14; i++) {
        const a = Math.random() * TAU;
        const dist = r * (0.3 + Math.random() * 0.5);
        const colors = [0x44aa44, 0x663399, 0xaaffaa, 0x886699];
        const p = new Graphics()
          .circle(0, 0, 1.5 + Math.random())
          .fill({ color: colors[i % 4], alpha: 0.8 });
        c.addChild(p);
        gsap.to(p, {
          x: Math.cos(a) * dist,
          y: Math.sin(a) * dist,
          alpha: 0,
          duration: 0.4,
          ease: "power1.out",
        });
      }
    });

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Siphon Soul ─────────────────────────────────────────────────────────
  // Ghostly wisps pulled from edges to center, dark pulse, soul-drain effect
  private _siphonSoul(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Outer boundary ring that pulses inward
    const boundary = new Graphics()
      .circle(0, 0, r)
      .stroke({ color: 0x663399, width: 1.5, alpha: 0.4 });
    c.addChild(boundary);
    gsap.to(boundary, {
      pixi: { scaleX: 0.3, scaleY: 0.3 },
      alpha: 0,
      duration: 0.8,
      ease: "power2.in",
    });

    // Dark pulse at center (grows as energy is absorbed)
    const pulse = new Graphics()
      .circle(0, 0, 3)
      .fill({ color: 0x220033, alpha: 0.6 });
    c.addChild(pulse);
    gsap.to(pulse, {
      pixi: { scaleX: r / 8, scaleY: r / 8 },
      alpha: 0.8,
      duration: 0.6,
      delay: 0.2,
      ease: "power2.in",
    });
    gsap.to(pulse, {
      alpha: 0,
      pixi: { scaleX: 0, scaleY: 0 },
      duration: 0.25,
      delay: 0.8,
      ease: "power2.in",
    });

    // Ghostly wisps pulled from radius edges to center
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * TAU + (Math.random() - 0.5) * 0.3;
      const startDist = r * (0.8 + Math.random() * 0.3);
      const colors = [0xaa88cc, 0x9966bb, 0xddbbff, 0x7744aa];
      const wisp = new Graphics()
        .circle(0, 0, 2 + Math.random() * 1.5)
        .fill({ color: colors[i % 4], alpha: 0.6 });
      wisp.position.set(Math.cos(a) * startDist, Math.sin(a) * startDist);
      wisp.alpha = 0;
      c.addChild(wisp);

      const d = i * 0.03;
      gsap.to(wisp, { alpha: 0.8, duration: 0.1, delay: d });
      gsap.to(wisp, {
        x: (Math.random() - 0.5) * 4,
        y: (Math.random() - 0.5) * 4,
        alpha: 0.3,
        duration: 0.5,
        delay: d + 0.1,
        ease: "power2.in",
      });
      gsap.to(wisp, {
        alpha: 0,
        duration: 0.15,
        delay: d + 0.55,
      });
    }

    // Soul-drain connecting lines (thin lines from edge to center)
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const line = new Graphics();
      line.moveTo(Math.cos(a) * r, Math.sin(a) * r);
      line.lineTo(0, 0);
      line.stroke({ color: 0x9966cc, width: 1, alpha: 0.25 });
      line.alpha = 0;
      c.addChild(line);
      gsap.to(line, { alpha: 0.4, duration: 0.15, delay: i * 0.05 });
      gsap.to(line, { alpha: 0, duration: 0.3, delay: 0.6 });
    }

    // Final release burst
    gsap.delayedCall(0.8, () => {
      const releaseBurst = new Graphics()
        .circle(0, 0, r * 0.15)
        .fill({ color: 0xddaaff, alpha: 0.6 });
      c.addChild(releaseBurst);
      gsap.to(releaseBurst, {
        pixi: { scaleX: 3, scaleY: 3 },
        alpha: 0,
        duration: 0.3,
      });
    });

    autoCleanup(this._vm, c, 1.5);
  }

  // ── Nether Storm ────────────────────────────────────────────────────────
  // Massive dark tempest with void lightning arcing, shadow vortex, dark particles
  private _netherStorm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Shadow vortex rings rotating (two counter-rotating)
    for (let i = 0; i < 2; i++) {
      const vortex = new Graphics()
        .circle(0, 0, r * (0.5 + i * 0.15))
        .stroke({ color: [0x663399, 0x442266][i], width: 2, alpha: 0.4 });
      vortex.alpha = 0;
      c.addChild(vortex);
      gsap.to(vortex, { alpha: 0.6, duration: 0.2 });
      gsap.to(vortex, {
        rotation: (i === 0 ? 1 : -1) * TAU,
        duration: 1.5,
        ease: "none",
      });
      gsap.to(vortex, { alpha: 0, duration: 0.3, delay: 1.3 });
    }

    // Dark ground fill
    const darkFill = new Graphics()
      .circle(0, 0, r * 0.8)
      .fill({ color: 0x110022, alpha: 0.2 });
    c.addChild(darkFill);
    gsap.to(darkFill, { alpha: 0, duration: 0.5, delay: 1.2 });

    // Void lightning arcs striking at random positions
    for (let i = 0; i < 6; i++) {
      const tx = (Math.random() - 0.5) * r * 1.6;
      const ty = (Math.random() - 0.5) * r * 1.2;
      const delay = 0.1 + i * 0.15;

      gsap.delayedCall(delay, () => {
        // Dark lightning bolt
        const bolt = new Graphics();
        let bx = tx + (Math.random() - 0.5) * 8;
        let by = -r * 2;
        bolt.moveTo(bx, by);
        for (let s = 0; s < 5; s++) {
          bx += (Math.random() - 0.5) * 10;
          by += (r * 2 + ty) / 5;
          bolt.lineTo(bx, by);
        }
        bolt.lineTo(tx, ty);
        bolt.stroke({ color: 0x9966ff, width: 2, alpha: 0.7 });
        c.addChild(bolt);
        gsap.to(bolt, { alpha: 0, duration: 0.2 });

        // Dark flash at impact
        const flash = new Graphics()
          .circle(tx, ty, 4)
          .fill({ color: 0x9933cc, alpha: 0.6 });
        c.addChild(flash);
        gsap.to(flash, {
          pixi: { scaleX: 2, scaleY: 2 },
          alpha: 0,
          duration: 0.2,
        });
      });
    }

    // Shadow particles swirling
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const startDist = r * (0.3 + Math.random() * 0.5);
      const colors = [0x663399, 0x442266, 0x9966cc, 0x330055];
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random())
        .fill({ color: colors[i % 4], alpha: 0.6 });
      p.position.set(Math.cos(a) * startDist, Math.sin(a) * startDist);
      p.alpha = 0;
      c.addChild(p);
      const d = Math.random() * 0.6;
      gsap.to(p, { alpha: 0.7, duration: 0.1, delay: d });
      // Spiral inward slightly
      const endA = a + Math.PI * 0.7;
      const endDist = startDist * 0.4;
      gsap.to(p, {
        x: Math.cos(endA) * endDist,
        y: Math.sin(endA) * endDist,
        alpha: 0,
        duration: 0.7,
        delay: d + 0.15,
        ease: "power1.inOut",
      });
    }

    autoCleanup(this._vm, c, 2.2);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // GENERIC FALLBACK
  // ═══════════════════════════════════════════════════════════════════════════

  private _genericDamage(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);

    // Expanding ring
    const ring = new Graphics()
      .circle(0, 0, r * 0.25)
      .stroke({ color: 0xff4444, width: 3, alpha: 0.9 });
    c.addChild(ring);
    gsap.to(ring, {
      pixi: { scaleX: r / (r * 0.25), scaleY: r / (r * 0.25) },
      alpha: 0,
      duration: 0.6,
      ease: "power2.out",
    });

    // Flash fill
    const flash = new Graphics()
      .circle(0, 0, r)
      .fill({ color: 0xcc2222, alpha: 0.3 });
    c.addChild(flash);
    gsap.to(flash, { alpha: 0, duration: 0.4, ease: "power1.out" });

    // Scatter particles
    const count = 8 + Math.floor(r / 10);
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU;
      const dist = Math.random() * r;
      const p = new Graphics()
        .circle(0, 0, 1.5 + Math.random() * 1.5)
        .fill({ color: 0xffaaaa, alpha: 0.9 });
      p.position.set(Math.cos(a) * dist * 0.3, Math.sin(a) * dist * 0.3);
      c.addChild(p);
      gsap.to(p, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist - 10 - Math.random() * 15,
        alpha: 0,
        duration: 0.5 + Math.random() * 0.3,
        ease: "power1.out",
      });
    }

    autoCleanup(this._vm, c, 1.2);
  }
  // ═══════════════════════════════════════════════════════════════════════
  // Gap-fill spell FX methods (28 new)
  // ═══════════════════════════════════════════════════════════════════════

  // ── FIRE ─────────────────────────────────────────────────────────────
  private _flameSpark(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const flash = new Graphics().circle(0, 0, r * 0.4).fill({ color: 0xff6622, alpha: 0.7 });
    const core = new Graphics().circle(0, 0, r * 0.15).fill({ color: 0xffffaa, alpha: 0.9 });
    c.addChild(flash, core);
    gsap.to(flash, { alpha: 0, scale: 2, duration: 0.4, ease: "power1.out" });
    gsap.to(core, { alpha: 0, scale: 1.5, duration: 0.3 });
    for (let i = 0; i < 6; i++) {
      const sp = new Graphics().circle(0, 0, 1.5).fill({ color: 0xffaa44, alpha: 0.8 });
      c.addChild(sp);
      const a = Math.random() * TAU;
      gsap.to(sp, { x: Math.cos(a) * r * 0.5, y: Math.sin(a) * r * 0.5, alpha: 0, duration: 0.4, ease: "power1.out" });
    }
    autoCleanup(this._vm, c, 0.6);
  }

  private _pyroclasm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Volcanic pillar
    const pillar = new Graphics().rect(-r * 0.3, -r * 1.2, r * 0.6, r * 1.5).fill({ color: 0xff4400, alpha: 0.6 });
    pillar.alpha = 0;
    c.addChild(pillar);
    gsap.to(pillar, { alpha: 0.6, duration: 0.15 });
    gsap.to(pillar.scale, { x: 2, y: 1.3, duration: 0.8, delay: 0.2 });
    gsap.to(pillar, { alpha: 0, duration: 0.8, delay: 0.2 });
    // Lava waves
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics().circle(0, 0, r * 0.3).stroke({ color: 0xff2200, width: 3, alpha: 0.6 });
      c.addChild(ring);
      gsap.to(ring, { scale: 3 + i, alpha: 0, duration: 0.8 + i * 0.2, delay: i * 0.1 });
    }
    // Ember rain
    for (let i = 0; i < 20; i++) {
      const ember = new Graphics().circle(0, 0, 1.5 + Math.random()).fill({ color: 0xff6633, alpha: 0.8 });
      ember.position.set((Math.random() - 0.5) * r * 1.5, -r * 0.8);
      c.addChild(ember);
      gsap.to(ember, { y: r * 0.5, alpha: 0, duration: 0.6 + Math.random() * 0.4, delay: Math.random() * 0.3 });
    }
    autoCleanup(this._vm, c, 1.4);
  }

  // ── ICE ──────────────────────────────────────────────────────────────
  private _glacialCrush(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const shard = new Graphics();
      shard.moveTo(0, -r * 0.15).lineTo(r * 0.05, r * 0.1).lineTo(-r * 0.05, r * 0.1).closePath()
        .fill({ color: 0x88ccff, alpha: 0.8 });
      shard.position.set(Math.cos(a) * r, Math.sin(a) * r);
      shard.rotation = a + Math.PI;
      c.addChild(shard);
      gsap.to(shard, { x: Math.cos(a) * r * 0.1, y: Math.sin(a) * r * 0.1, duration: 0.4, ease: "power2.in" });
      gsap.to(shard, { alpha: 0, duration: 0.3, delay: 0.4 });
    }
    const crush = new Graphics().circle(0, 0, r * 0.3).fill({ color: 0xcceeFF, alpha: 0.5 });
    crush.alpha = 0;
    c.addChild(crush);
    gsap.to(crush, { alpha: 0.6, duration: 0.1, delay: 0.35 });
    gsap.to(crush, { alpha: 0, scale: 2, duration: 0.4, delay: 0.45 });
    autoCleanup(this._vm, c, 1.0);
  }

  private _absoluteZero(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Expanding ice lattice
    const field = new Graphics().circle(0, 0, r * 0.1).fill({ color: 0xcceeFF, alpha: 0.8 });
    c.addChild(field);
    gsap.to(field, { scale: r / 5, alpha: 0.15, duration: 0.6, ease: "power2.out" });
    // Crystal formations
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const crystal = new Graphics();
      crystal.moveTo(0, -r * 0.12).lineTo(r * 0.03, 0).lineTo(0, r * 0.04).lineTo(-r * 0.03, 0).closePath()
        .fill({ color: 0xffffff, alpha: 0.7 });
      crystal.position.set(Math.cos(a) * r * 0.5, Math.sin(a) * r * 0.5);
      crystal.rotation = a;
      crystal.alpha = 0;
      c.addChild(crystal);
      gsap.to(crystal, { alpha: 0.7, duration: 0.2, delay: 0.1 + i * 0.03 });
      gsap.to(crystal, { alpha: 0, duration: 0.5, delay: 0.6 });
    }
    // Frost ring
    const ring = new Graphics().circle(0, 0, r * 0.8).stroke({ color: 0x66bbff, width: 2, alpha: 0.5 });
    ring.alpha = 0;
    c.addChild(ring);
    gsap.to(ring, { alpha: 0.5, scale: 1.3, duration: 0.4, delay: 0.2 });
    gsap.to(ring, { alpha: 0, duration: 0.5, delay: 0.7 });
    autoCleanup(this._vm, c, 1.4);
  }

  // ── LIGHTNING ────────────────────────────────────────────────────────
  private _spark(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const bolt = new Graphics();
    bolt.moveTo(0, -r * 0.6).lineTo(r * 0.08, -r * 0.15).lineTo(-r * 0.05, -r * 0.05).lineTo(0, r * 0.4);
    bolt.stroke({ color: 0xffff44, width: 2.5 });
    c.addChild(bolt);
    const flash = new Graphics().circle(0, 0, r * 0.2).fill({ color: 0xffffaa, alpha: 0.6 });
    c.addChild(flash);
    gsap.to(bolt, { alpha: 0, duration: 0.25 });
    gsap.to(flash, { alpha: 0, scale: 2, duration: 0.3 });
    autoCleanup(this._vm, c, 0.5);
  }

  private _thunderstorm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Dark cloud
    const cloud = new Graphics().ellipse(0, -r * 0.5, r * 0.8, r * 0.25).fill({ color: 0x223344, alpha: 0.5 });
    c.addChild(cloud);
    gsap.to(cloud, { alpha: 0, duration: 1.0, delay: 0.3 });
    // Multiple bolts with delays
    for (let i = 0; i < 5; i++) {
      const bx = (Math.random() - 0.5) * r * 1.5;
      const bolt = new Graphics();
      bolt.moveTo(bx, -r * 0.4);
      let cy = -r * 0.4;
      for (let s = 0; s < 3; s++) {
        cy += r * 0.25;
        bolt.lineTo(bx + (Math.random() - 0.5) * r * 0.2, cy);
      }
      bolt.stroke({ color: 0xffff44, width: 2, alpha: 0.9 });
      bolt.alpha = 0;
      c.addChild(bolt);
      const d = i * 0.15;
      gsap.to(bolt, { alpha: 0.9, duration: 0.05, delay: d });
      gsap.to(bolt, { alpha: 0, duration: 0.15, delay: d + 0.08 });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  private _ballLightning(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const orb = new Graphics().circle(0, 0, r * 0.35).fill({ color: 0xaaddff, alpha: 0.5 });
    const core = new Graphics().circle(0, 0, r * 0.15).fill({ color: 0xffffff, alpha: 0.8 });
    c.addChild(orb, core);
    gsap.to(orb, { scale: 2.5, alpha: 0, duration: 0.7 });
    gsap.to(core, { alpha: 0, duration: 0.5 });
    // Arcing bolts
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const arc = new Graphics();
      arc.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6);
      arc.stroke({ color: 0xffff88, width: 1.5, alpha: 0.7 });
      c.addChild(arc);
      gsap.to(arc, { alpha: 0, duration: 0.3, delay: 0.1 + i * 0.05 });
    }
    autoCleanup(this._vm, c, 0.9);
  }

  private _mjolnirStrike(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Massive bolt from sky
    const mainBolt = new Graphics();
    mainBolt.moveTo(0, -r * 2).lineTo(r * 0.1, -r * 0.8).lineTo(-r * 0.08, -r * 0.4).lineTo(r * 0.05, 0);
    mainBolt.stroke({ color: 0xffff44, width: 4 });
    c.addChild(mainBolt);
    gsap.to(mainBolt, { alpha: 0, duration: 0.4, delay: 0.1 });
    // Impact flash
    const impact = new Graphics().circle(0, 0, r * 0.3).fill({ color: 0xffffaa, alpha: 0.9 });
    c.addChild(impact);
    gsap.to(impact, { scale: 4, alpha: 0, duration: 0.6 });
    // Shockwave rings
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics().circle(0, 0, r * 0.2).stroke({ color: 0xffff66, width: 2, alpha: 0.6 });
      c.addChild(ring);
      gsap.to(ring, { scale: 3 + i, alpha: 0, duration: 0.6 + i * 0.15, delay: i * 0.08 });
    }
    // Branch lightning
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const branch = new Graphics();
      branch.moveTo(0, 0).lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      branch.stroke({ color: 0xffffaa, width: 1.5, alpha: 0.5 });
      c.addChild(branch);
      gsap.to(branch, { alpha: 0, duration: 0.2, delay: 0.1 });
    }
    autoCleanup(this._vm, c, 1.0);
  }

  // ── EARTH ────────────────────────────────────────────────────────────
  private _stoneShard(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const dust = new Graphics().circle(0, 0, r * 0.4).fill({ color: 0xaa9977, alpha: 0.3 });
    c.addChild(dust);
    gsap.to(dust, { scale: 2, alpha: 0, duration: 0.5 });
    for (let i = 0; i < 6; i++) {
      const rock = new Graphics();
      rock.moveTo(0, -3).lineTo(2, 0).lineTo(0, 2).lineTo(-2, 0).closePath().fill({ color: 0x887766, alpha: 0.9 });
      c.addChild(rock);
      const a = Math.random() * TAU;
      gsap.to(rock, { x: Math.cos(a) * r * 0.5, y: Math.sin(a) * r * 0.5, alpha: 0, rotation: Math.random() * 3, duration: 0.4 });
    }
    autoCleanup(this._vm, c, 0.6);
  }

  private _landslide(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Wave of boulders
    for (let i = 0; i < 12; i++) {
      const sz = 3 + Math.random() * 5;
      const boulder = new Graphics().circle(0, 0, sz).fill({ color: 0x776655 - Math.floor(Math.random() * 0x222222), alpha: 0.8 });
      boulder.position.set(-r + Math.random() * r * 0.5, (Math.random() - 0.5) * r * 0.6);
      c.addChild(boulder);
      gsap.to(boulder, { x: boulder.position.x + r * 1.5, y: boulder.position.y + Math.random() * r * 0.3, alpha: 0, rotation: Math.random() * 4, duration: 0.6 + Math.random() * 0.3 });
    }
    const earthWave = new Graphics().ellipse(0, 0, r * 0.8, r * 0.3).fill({ color: 0x998866, alpha: 0.3 });
    c.addChild(earthWave);
    gsap.to(earthWave, { scale: 1.5, alpha: 0, duration: 0.8 });
    autoCleanup(this._vm, c, 1.2);
  }

  private _tectonicRuin(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Ground cracks radiating outward
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const crack = new Graphics();
      crack.moveTo(0, 0);
      let cx2 = 0, cy2 = 0;
      for (let s = 0; s < 4; s++) {
        cx2 += Math.cos(a + (Math.random() - 0.5) * 0.5) * r * 0.2;
        cy2 += Math.sin(a + (Math.random() - 0.5) * 0.5) * r * 0.2;
        crack.lineTo(cx2, cy2);
      }
      crack.stroke({ color: 0xff4400, width: 2, alpha: 0.7 });
      crack.alpha = 0;
      c.addChild(crack);
      gsap.to(crack, { alpha: 0.7, duration: 0.15, delay: i * 0.04 });
      gsap.to(crack, { alpha: 0, duration: 0.6, delay: 0.4 });
    }
    // Debris eruption
    for (let i = 0; i < 15; i++) {
      const debris = new Graphics().rect(0, 0, 2 + Math.random() * 3, 2 + Math.random() * 3).fill({ color: 0x887766, alpha: 0.8 });
      c.addChild(debris);
      const a = Math.random() * TAU;
      gsap.to(debris, { x: Math.cos(a) * r * 0.8, y: Math.sin(a) * r * 0.8 - r * 0.3, alpha: 0, rotation: Math.random() * 5, duration: 0.7, ease: "power1.out" });
    }
    // Shockwave
    const quakeRing = new Graphics().circle(0, 0, r * 0.2).stroke({ color: 0xaa6622, width: 3, alpha: 0.5 });
    c.addChild(quakeRing);
    gsap.to(quakeRing, { scale: 4, alpha: 0, duration: 0.8 });
    autoCleanup(this._vm, c, 1.2);
  }

  // ── ARCANE ───────────────────────────────────────────────────────────
  private _arcaneCataclysm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Layered expanding rings
    for (let i = 0; i < 4; i++) {
      const ring = new Graphics().circle(0, 0, r * 0.2).stroke({ color: 0x9966ff, width: 2.5, alpha: 0.6 });
      c.addChild(ring);
      gsap.to(ring, { scale: 3 + i, alpha: 0, duration: 0.7 + i * 0.15, delay: i * 0.08 });
    }
    // Central detonation
    const coreFlash = new Graphics().circle(0, 0, r * 0.25).fill({ color: 0xffffff, alpha: 0.8 });
    c.addChild(coreFlash);
    gsap.to(coreFlash, { scale: 3, alpha: 0, duration: 0.5 });
    // Arcane bolts
    for (let i = 0; i < 10; i++) {
      const bolt = new Graphics();
      const a = Math.random() * TAU;
      bolt.moveTo(0, 0).lineTo(Math.cos(a) * r, Math.sin(a) * r);
      bolt.stroke({ color: 0xaa77ff, width: 1.5, alpha: 0.6 });
      c.addChild(bolt);
      gsap.to(bolt, { alpha: 0, duration: 0.3, delay: Math.random() * 0.2 });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  // ── HOLY ─────────────────────────────────────────────────────────────
  private _divineMiracle(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Massive golden pillar
    const beam = new Graphics().rect(-r * 0.4, -r * 2, r * 0.8, r * 2.5).fill({ color: 0xffdd44, alpha: 0.3 });
    beam.alpha = 0;
    c.addChild(beam);
    gsap.to(beam, { alpha: 0.3, duration: 0.2 });
    gsap.to(beam, { alpha: 0, duration: 0.8, delay: 0.3 });
    // Expanding golden ring
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics().circle(0, 0, r * 0.3).stroke({ color: 0xffee66, width: 2, alpha: 0.5 });
      c.addChild(ring);
      gsap.to(ring, { scale: 3 + i, alpha: 0, duration: 0.8 + i * 0.15, delay: i * 0.1 });
    }
    // Healing sparkles rising
    for (let i = 0; i < 20; i++) {
      const sparkle = new Graphics().circle(0, 0, 1.5 + Math.random()).fill({ color: 0xffffcc, alpha: 0.8 });
      sparkle.position.set((Math.random() - 0.5) * r * 1.5, (Math.random() - 0.5) * r);
      c.addChild(sparkle);
      gsap.to(sparkle, { y: sparkle.position.y - r * 0.6, alpha: 0, duration: 0.8 + Math.random() * 0.4, delay: Math.random() * 0.3 });
    }
    autoCleanup(this._vm, c, 1.4);
  }

  // ── SHADOW ───────────────────────────────────────────────────────────
  private _shadowPlague(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Creeping dark tendrils
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const tendril = new Graphics();
      tendril.moveTo(0, 0);
      tendril.quadraticCurveTo(Math.cos(a + 0.3) * r * 0.4, Math.sin(a + 0.3) * r * 0.4,
        Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8);
      tendril.stroke({ color: 0x663399, width: 2, alpha: 0.6 });
      tendril.alpha = 0;
      c.addChild(tendril);
      gsap.to(tendril, { alpha: 0.6, duration: 0.3, delay: i * 0.06 });
      gsap.to(tendril, { alpha: 0, duration: 0.5, delay: 0.5 });
    }
    const darkCloud = new Graphics().circle(0, 0, r * 0.5).fill({ color: 0x331155, alpha: 0.3 });
    c.addChild(darkCloud);
    gsap.to(darkCloud, { scale: 2, alpha: 0, duration: 0.9 });
    autoCleanup(this._vm, c, 1.2);
  }

  private _oblivion(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Darkness vortex
    const voidField = new Graphics().circle(0, 0, r * 0.8).fill({ color: 0x110022, alpha: 0.6 });
    c.addChild(voidField);
    gsap.to(voidField, { scale: 0.1, alpha: 0.9, duration: 0.5 });
    gsap.to(voidField, { scale: 3, alpha: 0, duration: 0.5, delay: 0.5 });
    // Spiral rings
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics().circle(0, 0, r * (0.3 + i * 0.2)).stroke({ color: 0x8833cc, width: 1.5, alpha: 0.4 });
      c.addChild(ring);
      gsap.to(ring, { rotation: Math.PI * 2, scale: 0.1, alpha: 0, duration: 0.8, delay: i * 0.1, ease: "power2.in" });
    }
    // Particles sucked in
    for (let i = 0; i < 12; i++) {
      const a = Math.random() * TAU;
      const p = new Graphics().circle(0, 0, 1.5).fill({ color: 0xaa66ff, alpha: 0.6 });
      p.position.set(Math.cos(a) * r, Math.sin(a) * r);
      c.addChild(p);
      gsap.to(p, { x: 0, y: 0, alpha: 0, duration: 0.5, delay: Math.random() * 0.3, ease: "power2.in" });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  // ── POISON ───────────────────────────────────────────────────────────
  private _venomousSpray(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    for (let i = 0; i < 12; i++) {
      const drop = new Graphics().circle(0, 0, 1.5 + Math.random() * 2).fill({ color: 0x66cc44, alpha: 0.7 });
      c.addChild(drop);
      const a = -Math.PI / 4 + Math.random() * Math.PI / 2; // Fan spread
      const dist = r * 0.3 + Math.random() * r * 0.7;
      gsap.to(drop, { x: Math.cos(a) * dist, y: Math.sin(a) * dist, alpha: 0, duration: 0.4 + Math.random() * 0.2 });
    }
    autoCleanup(this._vm, c, 0.8);
  }

  private _plagueSwarm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const haze = new Graphics().circle(0, 0, r * 0.6).fill({ color: 0x448822, alpha: 0.2 });
    c.addChild(haze);
    gsap.to(haze, { scale: 1.5, alpha: 0, duration: 1.0 });
    // Buzzing insects
    for (let i = 0; i < 15; i++) {
      const bug = new Graphics().circle(0, 0, 1).fill({ color: 0x334411, alpha: 0.8 });
      const bx = (Math.random() - 0.5) * r;
      const by = (Math.random() - 0.5) * r;
      bug.position.set(bx, by);
      c.addChild(bug);
      gsap.to(bug, { x: bx + (Math.random() - 0.5) * r * 0.5, y: by + (Math.random() - 0.5) * r * 0.5, alpha: 0, duration: 0.6 + Math.random() * 0.4 });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  private _toxicMiasma(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Dense fog clouds
    for (let i = 0; i < 4; i++) {
      const fog = new Graphics().ellipse((Math.random() - 0.5) * r * 0.5, (Math.random() - 0.5) * r * 0.3, r * 0.4 + Math.random() * r * 0.2, r * 0.25 + Math.random() * r * 0.15)
        .fill({ color: 0x44aa22, alpha: 0.2 });
      fog.alpha = 0;
      c.addChild(fog);
      gsap.to(fog, { alpha: 0.2, duration: 0.3, delay: i * 0.1 });
      gsap.to(fog, { alpha: 0, scale: 1.5, duration: 0.8, delay: 0.3 + i * 0.1 });
    }
    // Bubbling
    for (let i = 0; i < 8; i++) {
      const bubble = new Graphics().circle(0, 0, 2).stroke({ color: 0x66cc33, width: 0.8, alpha: 0.5 });
      bubble.position.set((Math.random() - 0.5) * r, r * 0.1);
      c.addChild(bubble);
      gsap.to(bubble, { y: -r * 0.4, alpha: 0, scale: 2, duration: 0.6, delay: Math.random() * 0.5 });
    }
    autoCleanup(this._vm, c, 1.4);
  }

  private _pandemic(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Central toxic burst
    const toxicCore = new Graphics().circle(0, 0, r * 0.2).fill({ color: 0x66ff33, alpha: 0.7 });
    c.addChild(toxicCore);
    gsap.to(toxicCore, { scale: 3, alpha: 0, duration: 0.5 });
    // Spreading poison waves
    for (let i = 0; i < 4; i++) {
      const wave = new Graphics().circle(0, 0, r * 0.3).stroke({ color: 0x44aa22, width: 2, alpha: 0.5 });
      c.addChild(wave);
      gsap.to(wave, { scale: 3 + i, alpha: 0, duration: 0.7 + i * 0.15, delay: i * 0.1 });
    }
    // Poison motes
    for (let i = 0; i < 15; i++) {
      const mote = new Graphics().circle(0, 0, 1.5).fill({ color: 0x88ff44, alpha: 0.6 });
      c.addChild(mote);
      const a = Math.random() * TAU;
      gsap.to(mote, { x: Math.cos(a) * r, y: Math.sin(a) * r, alpha: 0, duration: 0.6 + Math.random() * 0.3 });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  // ── VOID ─────────────────────────────────────────────────────────────
  private _voidSpark(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const pop = new Graphics().circle(0, 0, r * 0.3).fill({ color: 0x6622aa, alpha: 0.6 });
    const core = new Graphics().circle(0, 0, r * 0.1).fill({ color: 0x220044, alpha: 0.9 });
    c.addChild(pop, core);
    gsap.to(pop, { scale: 2, alpha: 0, duration: 0.35 });
    gsap.to(core, { alpha: 0, duration: 0.3 });
    autoCleanup(this._vm, c, 0.5);
  }

  private _dimensionalTear(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Space rip
    const tear = new Graphics();
    tear.moveTo(0, -r * 0.6).quadraticCurveTo(r * 0.2, 0, 0, r * 0.6);
    tear.stroke({ color: 0xaa44ff, width: 3, alpha: 0.8 });
    const tearGlow = new Graphics();
    tearGlow.moveTo(0, -r * 0.6).quadraticCurveTo(r * 0.2, 0, 0, r * 0.6);
    tearGlow.stroke({ color: 0xcc66ff, width: 6, alpha: 0.2 });
    c.addChild(tearGlow, tear);
    gsap.to(tear, { alpha: 0, duration: 0.8, delay: 0.2 });
    gsap.to(tearGlow.scale, { x: 1.3, y: 1.1, duration: 0.9 });
    gsap.to(tearGlow, { alpha: 0, duration: 0.9 });
    // Distortion particles
    for (let i = 0; i < 8; i++) {
      const p = new Graphics().circle(0, 0, 1.5).fill({ color: 0xbb66ff, alpha: 0.6 });
      p.position.set(r * 0.15, (Math.random() - 0.5) * r);
      c.addChild(p);
      gsap.to(p, { x: -r * 0.15, alpha: 0, duration: 0.5, delay: i * 0.06 });
    }
    autoCleanup(this._vm, c, 1.0);
  }

  private _singularity(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Event horizon
    const horizon = new Graphics().circle(0, 0, r * 0.7).fill({ color: 0x110022, alpha: 0.5 });
    c.addChild(horizon);
    gsap.to(horizon, { scale: 0.05, alpha: 1, duration: 0.6, ease: "power3.in" });
    gsap.to(horizon, { scale: 4, alpha: 0, duration: 0.4, delay: 0.6 });
    // Accretion disk
    const disk = new Graphics().circle(0, 0, r * 0.5).stroke({ color: 0xaa44ff, width: 2, alpha: 0.5 });
    c.addChild(disk);
    gsap.to(disk, { rotation: Math.PI * 3, scale: 0.1, alpha: 0, duration: 0.6, ease: "power3.in" });
    // Everything pulled in
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * TAU;
      const p = new Graphics().circle(0, 0, 1.5 + Math.random()).fill({ color: 0xcc88ff, alpha: 0.6 });
      p.position.set(Math.cos(a) * r, Math.sin(a) * r);
      c.addChild(p);
      gsap.to(p, { x: 0, y: 0, alpha: 0, duration: 0.6, delay: Math.random() * 0.2, ease: "power3.in" });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  // ── DEATH ────────────────────────────────────────────────────────────
  private _necroticTouch(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    const burst = new Graphics().circle(0, 0, r * 0.35).fill({ color: 0x44aa66, alpha: 0.5 });
    c.addChild(burst);
    gsap.to(burst, { scale: 2, alpha: 0, duration: 0.4 });
    for (let i = 0; i < 5; i++) {
      const wisp = new Graphics().circle(0, 0, 1.5).fill({ color: 0x226633, alpha: 0.7 });
      c.addChild(wisp);
      const a = Math.random() * TAU;
      gsap.to(wisp, { x: Math.cos(a) * r * 0.4, y: Math.sin(a) * r * 0.4, alpha: 0, duration: 0.4 });
    }
    autoCleanup(this._vm, c, 0.6);
  }

  private _soulRend(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Ghostly wisps torn outward
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * TAU;
      const wisp = new Graphics().ellipse(0, 0, r * 0.06, r * 0.2).fill({ color: 0x88ffaa, alpha: 0.5 });
      wisp.rotation = a;
      c.addChild(wisp);
      gsap.to(wisp, { x: Math.cos(a) * r * 0.7, y: Math.sin(a) * r * 0.7, alpha: 0, duration: 0.6, ease: "power1.out" });
    }
    // Dark pulse
    const pulse = new Graphics().circle(0, 0, r * 0.2).fill({ color: 0x336644, alpha: 0.6 });
    c.addChild(pulse);
    gsap.to(pulse, { scale: 2.5, alpha: 0, duration: 0.5 });
    autoCleanup(this._vm, c, 0.8);
  }

  private _apocalypse(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Death wave
    const deathField = new Graphics().circle(0, 0, r * 0.3).fill({ color: 0x112211, alpha: 0.7 });
    c.addChild(deathField);
    gsap.to(deathField, { scale: 4, alpha: 0, duration: 0.8 });
    // Expanding death rings
    for (let i = 0; i < 3; i++) {
      const ring = new Graphics().circle(0, 0, r * 0.3).stroke({ color: 0x44aa66, width: 2.5, alpha: 0.5 });
      c.addChild(ring);
      gsap.to(ring, { scale: 3 + i, alpha: 0, duration: 0.7 + i * 0.15, delay: i * 0.1 });
    }
    // Skeletal shapes
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const skull = new Graphics().circle(0, 0, 3).fill({ color: 0xddddcc, alpha: 0.5 });
      skull.circle(-1, -0.5, 0.8).fill({ color: 0x44ff66, alpha: 0.7 });
      skull.circle(1, -0.5, 0.8).fill({ color: 0x44ff66, alpha: 0.7 });
      skull.position.set(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      c.addChild(skull);
      gsap.to(skull, { x: Math.cos(a) * r * 0.9, y: Math.sin(a) * r * 0.9, alpha: 0, duration: 0.7, ease: "power1.out" });
    }
    autoCleanup(this._vm, c, 1.2);
  }

  // ── NATURE ───────────────────────────────────────────────────────────
  private _thornBarrage(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    for (let i = 0; i < 15; i++) {
      const thorn = new Graphics();
      thorn.moveTo(0, -4).lineTo(1.5, 2).lineTo(-1.5, 2).closePath().fill({ color: 0x44aa33, alpha: 0.8 });
      thorn.position.set((Math.random() - 0.5) * r * 1.5, -r * 0.8);
      c.addChild(thorn);
      gsap.to(thorn, { y: (Math.random() - 0.5) * r * 0.5, alpha: 0, duration: 0.3 + Math.random() * 0.2, delay: Math.random() * 0.3 });
    }
    autoCleanup(this._vm, c, 0.8);
  }

  private _naturesWrath(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Erupting roots
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      const vine = new Graphics();
      vine.moveTo(0, 0);
      vine.quadraticCurveTo(Math.cos(a + 0.5) * r * 0.4, Math.sin(a + 0.5) * r * 0.4,
        Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7);
      vine.stroke({ color: 0x338822, width: 2, alpha: 0.7 });
      vine.alpha = 0;
      c.addChild(vine);
      gsap.to(vine, { alpha: 0.7, duration: 0.2, delay: i * 0.06 });
      gsap.to(vine, { alpha: 0, duration: 0.5, delay: 0.5 });
    }
    // Swirling leaves
    for (let i = 0; i < 10; i++) {
      const leaf = new Graphics().ellipse(0, 0, 2, 1).fill({ color: 0x66cc44, alpha: 0.7 });
      c.addChild(leaf);
      const a = Math.random() * TAU;
      gsap.to(leaf, { x: Math.cos(a) * r * 0.8, y: Math.sin(a) * r * 0.8, rotation: Math.random() * 6, alpha: 0, duration: 0.6 + Math.random() * 0.3 });
    }
    autoCleanup(this._vm, c, 1.0);
  }

  private _primalStorm(wx: number, wy: number, r: number): void {
    const c = makeContainer(this._vm, wx, wy);
    // Wind ring
    const windRing = new Graphics().circle(0, 0, r * 0.5).stroke({ color: 0x88ff88, width: 2, alpha: 0.4 });
    c.addChild(windRing);
    gsap.to(windRing, { rotation: Math.PI * 2, scale: 2, alpha: 0, duration: 0.8 });
    // Thorns
    for (let i = 0; i < 8; i++) {
      const thorn = new Graphics();
      thorn.moveTo(0, -3).lineTo(1, 1).lineTo(-1, 1).closePath().fill({ color: 0x44aa33, alpha: 0.8 });
      const a = (i / 8) * TAU;
      thorn.position.set(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      c.addChild(thorn);
      gsap.to(thorn, { x: Math.cos(a) * r, y: Math.sin(a) * r, alpha: 0, rotation: Math.random() * 5, duration: 0.5 });
    }
    // Earth + lightning
    for (let i = 0; i < 4; i++) {
      const bolt = new Graphics();
      const bx = (Math.random() - 0.5) * r;
      bolt.moveTo(bx, -r * 0.4).lineTo(bx + (Math.random() - 0.5) * r * 0.3, r * 0.2);
      bolt.stroke({ color: 0xaaff44, width: 1.5, alpha: 0.6 });
      bolt.alpha = 0;
      c.addChild(bolt);
      gsap.to(bolt, { alpha: 0.6, duration: 0.05, delay: 0.2 + i * 0.1 });
      gsap.to(bolt, { alpha: 0, duration: 0.15, delay: 0.3 + i * 0.1 });
    }
    autoCleanup(this._vm, c, 1.0);
  }
}

export const spellFX = new SpellFX();
