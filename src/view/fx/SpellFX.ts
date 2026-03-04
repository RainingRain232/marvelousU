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
}

export const spellFX = new SpellFX();
