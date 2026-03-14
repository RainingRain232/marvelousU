// ---------------------------------------------------------------------------
// Survivor FX — damage numbers, weapon FX, orbiting weapon visuals
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { BalanceConfig } from "@sim/config/BalanceConfig";
import { WEAPON_DEFS } from "../config/SurvivorWeaponDefs";
import type { SurvivorState } from "../state/SurvivorState";

const TS = BalanceConfig.TILE_SIZE;

interface DmgNumber {
  text: Text;
  lifetime: number;
  vy: number;
}

interface WeaponFXParticle {
  gfx: Graphics;
  lifetime: number;
  vx: number;
  vy: number;
  startAlpha: number;
}

interface ArcBoulder {
  gfx: Graphics;
  sx: number; sy: number;
  tx: number; ty: number;
  color: number;
  area: number;
  progress: number; // 0→1
  duration: number;
}

interface TrailParticle {
  gfx: Graphics;
  lifetime: number;
  vx: number;
  vy: number;
}

export class SurvivorFX {
  readonly dmgNumberContainer = new Container();
  readonly weaponFxContainer = new Container();

  private _dmgNumbers: DmgNumber[] = [];
  private _weaponFxParticles: WeaponFXParticle[] = [];
  private _orbitGfx: Graphics[] = [];

  pendingDmgNumbers: { x: number; y: number; amount: number; isCrit: boolean; isHeal: boolean }[] = [];
  pendingWeaponFx: { x: number; y: number; color: number; radius: number; weaponId?: string }[] = [];
  pendingChainFx: { points: { x: number; y: number }[]; color: number }[] = [];
  pendingArcFx: { sx: number; sy: number; tx: number; ty: number; color: number; area: number }[] = [];
  pendingScreenFlash: { color: number; alpha: number; duration: number }[] = [];
  private _chainBolts: { gfx: Graphics; lifetime: number }[] = [];
  private _arcBoulders: ArcBoulder[] = [];
  private _trailParticles: TrailParticle[] = [];
  private _screenFlashes: { gfx: Graphics; lifetime: number; maxLifetime: number }[] = [];

  init(): void {
    this.dmgNumberContainer.removeChildren();
    this.weaponFxContainer.removeChildren();
    this._dmgNumbers = [];
    this._weaponFxParticles = [];
    this._orbitGfx = [];
    this.pendingDmgNumbers = [];
    this.pendingWeaponFx = [];
    this.pendingChainFx = [];
    this.pendingArcFx = [];
    this.pendingScreenFlash = [];
    this._chainBolts = [];
    this._arcBoulders = [];
    this._trailParticles = [];
    this._screenFlashes = [];
  }

  spawnDamageNumbers(): void {
    for (const dn of this.pendingDmgNumbers) {
      const text = new Text({
        text: dn.isHeal ? `+${Math.ceil(dn.amount)}` : `-${Math.ceil(dn.amount)}`,
        style: new TextStyle({
          fontFamily: "monospace",
          fontSize: dn.isCrit ? 16 : 12,
          fill: dn.isHeal ? 0x44ff44 : dn.isCrit ? 0xffd700 : 0xff4444,
          fontWeight: dn.isCrit ? "bold" : "normal",
        }),
      });
      text.anchor.set(0.5, 0.5);
      text.position.set(dn.x * TS + (Math.random() * 20 - 10), dn.y * TS - 20);
      this.dmgNumberContainer.addChild(text);
      this._dmgNumbers.push({ text, lifetime: 0.8, vy: -40 });
    }
    this.pendingDmgNumbers = [];
  }

  updateDamageNumbers(dt: number): void {
    for (let i = this._dmgNumbers.length - 1; i >= 0; i--) {
      const dn = this._dmgNumbers[i];
      dn.lifetime -= dt;
      dn.text.position.y += dn.vy * dt;
      dn.text.alpha = Math.max(0, dn.lifetime / 0.5);
      if (dn.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(dn.text);
        dn.text.destroy();
        this._dmgNumbers.splice(i, 1);
      }
    }
  }

  spawnWeaponFx(): void {
    for (const fx of this.pendingWeaponFx) {
      const wid = fx.weaponId ?? "";
      const px = fx.x * TS;
      const py = fx.y * TS;
      const r = fx.radius * TS * 0.3;

      if (wid === "ice_nova") {
        // --- ICE NOVA: crystalline expanding ring with ice shards ---
        const ring = new Graphics()
          .circle(0, 0, r).stroke({ color: 0x88eeff, width: 5, alpha: 0.7 })
          .circle(0, 0, r * 0.85).stroke({ color: 0xffffff, width: 2, alpha: 0.4 })
          .circle(0, 0, r).fill({ color: 0x44aaff, alpha: 0.08 });
        ring.position.set(px, py);
        this.weaponFxContainer.addChild(ring);
        this._weaponFxParticles.push({ gfx: ring, lifetime: 0.6, vx: 0, vy: 0, startAlpha: 0.7 });
        // Ice shards
        for (let i = 0; i < 10; i++) {
          const shard = new Graphics();
          const sz = 3 + Math.random() * 4;
          shard.moveTo(0, -sz).lineTo(sz * 0.4, 0).lineTo(0, sz).lineTo(-sz * 0.4, 0).closePath()
            .fill({ color: 0xbbddff, alpha: 0.8 });
          const angle = Math.random() * Math.PI * 2;
          const speed = 50 + Math.random() * 70;
          shard.position.set(px, py);
          shard.rotation = angle;
          this.weaponFxContainer.addChild(shard);
          this._weaponFxParticles.push({ gfx: shard, lifetime: 0.5, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, startAlpha: 0.9 });
        }
      } else if (wid === "holy_circle") {
        // --- HOLY CIRCLE: divine light burst with cross pattern ---
        const light = new Graphics()
          .circle(0, 0, r).fill({ color: 0xffd700, alpha: 0.12 })
          .circle(0, 0, r).stroke({ color: 0xffffcc, width: 3, alpha: 0.5 });
        light.position.set(px, py);
        this.weaponFxContainer.addChild(light);
        this._weaponFxParticles.push({ gfx: light, lifetime: 0.5, vx: 0, vy: 0, startAlpha: 0.5 });
        // Cross rays
        for (let i = 0; i < 4; i++) {
          const ray = new Graphics();
          const angle = (Math.PI / 2) * i;
          ray.rect(-1.5, 0, 3, r * 1.2).fill({ color: 0xffd700, alpha: 0.3 });
          ray.position.set(px, py);
          ray.rotation = angle;
          this.weaponFxContainer.addChild(ray);
          this._weaponFxParticles.push({ gfx: ray, lifetime: 0.4, vx: 0, vy: 0, startAlpha: 0.3 });
        }
        // Sparkle motes
        for (let i = 0; i < 8; i++) {
          const mote = new Graphics().circle(0, 0, 1.5).fill({ color: 0xffffcc });
          const angle = Math.random() * Math.PI * 2;
          const dist = Math.random() * r;
          mote.position.set(px + Math.cos(angle) * dist, py + Math.sin(angle) * dist);
          this.weaponFxContainer.addChild(mote);
          this._weaponFxParticles.push({ gfx: mote, lifetime: 0.6, vx: Math.cos(angle) * 15, vy: Math.sin(angle) * 15 - 20, startAlpha: 1 });
        }
      } else if (wid === "warp_field") {
        // --- WARP FIELD: void implosion with swirl ---
        const voidCircle = new Graphics()
          .circle(0, 0, r * 0.4).fill({ color: 0x220044, alpha: 0.8 })
          .circle(0, 0, r).stroke({ color: 0x9944cc, width: 3, alpha: 0.6 })
          .circle(0, 0, r * 0.7).stroke({ color: 0xbb66ee, width: 2, alpha: 0.4 });
        voidCircle.position.set(px, py);
        this.weaponFxContainer.addChild(voidCircle);
        this._weaponFxParticles.push({ gfx: voidCircle, lifetime: 0.6, vx: 0, vy: 0, startAlpha: 0.8 });
        // Swirl particles moving inward
        for (let i = 0; i < 12; i++) {
          const p = new Graphics().circle(0, 0, 2).fill({ color: 0xdd88ff, alpha: 0.7 });
          const angle = Math.random() * Math.PI * 2;
          const dist = r * 0.8 + Math.random() * r * 0.3;
          p.position.set(px + Math.cos(angle) * dist, py + Math.sin(angle) * dist);
          this.weaponFxContainer.addChild(p);
          this._weaponFxParticles.push({ gfx: p, lifetime: 0.4, vx: -Math.cos(angle) * 80, vy: -Math.sin(angle) * 80, startAlpha: 0.7 });
        }
      } else if (wid === "rune_circle") {
        // --- RUNE CIRCLE: arcane ground sigil with pink/magenta lines ---
        const sigil = new Graphics()
          .circle(0, 0, r).stroke({ color: 0xff4488, width: 2, alpha: 0.7 })
          .circle(0, 0, r * 0.6).stroke({ color: 0xff66aa, width: 1.5, alpha: 0.5 });
        // Draw X pattern
        for (let i = 0; i < 3; i++) {
          const angle = (Math.PI / 3) * i;
          sigil.moveTo(Math.cos(angle) * -r, Math.sin(angle) * -r)
            .lineTo(Math.cos(angle) * r, Math.sin(angle) * r)
            .stroke({ color: 0xff4488, width: 1, alpha: 0.4 });
        }
        sigil.circle(0, 0, r).fill({ color: 0xff4488, alpha: 0.06 });
        sigil.position.set(px, py);
        this.weaponFxContainer.addChild(sigil);
        this._weaponFxParticles.push({ gfx: sigil, lifetime: 0.7, vx: 0, vy: 0, startAlpha: 0.7 });
        // Rising arcane sparks
        for (let i = 0; i < 8; i++) {
          const spark = new Graphics().circle(0, 0, 2).fill({ color: 0xff88cc });
          const ox = (Math.random() - 0.5) * r * 2;
          const oy = (Math.random() - 0.5) * r * 2;
          spark.position.set(px + ox, py + oy);
          this.weaponFxContainer.addChild(spark);
          this._weaponFxParticles.push({ gfx: spark, lifetime: 0.5, vx: 0, vy: -40 - Math.random() * 30, startAlpha: 1 });
        }
      } else if (wid === "soul_drain") {
        // --- SOUL DRAIN: ghostly wisps spiraling ---
        const soulGlow = new Graphics()
          .circle(0, 0, r * 0.5).fill({ color: 0x44ff88, alpha: 0.1 });
        soulGlow.position.set(px, py);
        this.weaponFxContainer.addChild(soulGlow);
        this._weaponFxParticles.push({ gfx: soulGlow, lifetime: 0.4, vx: 0, vy: 0, startAlpha: 0.1 });
        for (let i = 0; i < 6; i++) {
          const wisp = new Graphics().circle(0, 0, 2.5).fill({ color: i % 2 === 0 ? 0x44ff88 : 0x88ffcc, alpha: 0.8 });
          const angle = Math.random() * Math.PI * 2;
          wisp.position.set(px + Math.cos(angle) * 8, py + Math.sin(angle) * 8);
          this.weaponFxContainer.addChild(wisp);
          this._weaponFxParticles.push({ gfx: wisp, lifetime: 0.5, vx: Math.cos(angle + 1.5) * 30, vy: -30 - Math.random() * 20, startAlpha: 0.8 });
        }
      } else {
        // --- DEFAULT: enhanced AoE pulse ring ---
        const ring = new Graphics()
          .circle(0, 0, r).stroke({ color: fx.color, width: 4, alpha: 0.6 })
          .circle(0, 0, r * 0.85).stroke({ color: 0xffffff, width: 1.5, alpha: 0.3 });
        ring.position.set(px, py);
        this.weaponFxContainer.addChild(ring);
        this._weaponFxParticles.push({ gfx: ring, lifetime: 0.5, vx: 0, vy: 0, startAlpha: 0.6 });

        // Fill flash
        const flash = new Graphics().circle(0, 0, r * 0.85).fill({ color: fx.color, alpha: 0.15 });
        flash.position.set(px, py);
        this.weaponFxContainer.addChild(flash);
        this._weaponFxParticles.push({ gfx: flash, lifetime: 0.35, vx: 0, vy: 0, startAlpha: 0.15 });

        // More sparks
        for (let i = 0; i < 10; i++) {
          const spark = new Graphics().circle(0, 0, 1.5 + Math.random() * 2).fill({ color: fx.color });
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 60;
          spark.position.set(px, py);
          this.weaponFxContainer.addChild(spark);
          this._weaponFxParticles.push({ gfx: spark, lifetime: 0.4, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, startAlpha: 1 });
        }
      }
    }
    this.pendingWeaponFx = [];
  }

  updateWeaponFx(dt: number): void {
    for (let i = this._weaponFxParticles.length - 1; i >= 0; i--) {
      const p = this._weaponFxParticles[i];
      p.lifetime -= dt;
      p.gfx.position.x += p.vx * dt;
      p.gfx.position.y += p.vy * dt;
      p.gfx.alpha = p.startAlpha * Math.max(0, p.lifetime / 0.5);
      // Scale up rings
      if (p.vx === 0 && p.vy === 0) {
        const scale = 1 + (1 - p.lifetime / 0.5) * 2;
        p.gfx.scale.set(scale);
      }
      if (p.lifetime <= 0) {
        this.weaponFxContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this._weaponFxParticles.splice(i, 1);
      }
    }
  }

  spawnChainFx(): void {
    for (const chain of this.pendingChainFx) {
      if (chain.points.length < 2) continue;
      const bolt = new Graphics();
      // Draw jagged lightning bolt between each pair of points
      for (let i = 0; i < chain.points.length - 1; i++) {
        const from = chain.points[i];
        const to = chain.points[i + 1];
        const sx = from.x * TS;
        const sy = from.y * TS;
        const ex = to.x * TS;
        const ey = to.y * TS;
        const dx = ex - sx;
        const dy = ey - sy;
        const segments = 5 + Math.floor(Math.random() * 4);

        // Main bolt
        bolt.moveTo(sx, sy);
        for (let j = 1; j < segments; j++) {
          const t = j / segments;
          const jitter = 6 + Math.random() * 8;
          const perpX = -dy / (Math.sqrt(dx * dx + dy * dy) || 1) * (Math.random() - 0.5) * jitter;
          const perpY = dx / (Math.sqrt(dx * dx + dy * dy) || 1) * (Math.random() - 0.5) * jitter;
          bolt.lineTo(sx + dx * t + perpX, sy + dy * t + perpY);
        }
        bolt.lineTo(ex, ey);
        bolt.stroke({ color: chain.color, width: 2.5, alpha: 0.9 });

        // Glow bolt (wider, lower alpha)
        bolt.moveTo(sx, sy);
        for (let j = 1; j < segments; j++) {
          const t = j / segments;
          const jitter = 4 + Math.random() * 6;
          const perpX = -dy / (Math.sqrt(dx * dx + dy * dy) || 1) * (Math.random() - 0.5) * jitter;
          const perpY = dx / (Math.sqrt(dx * dx + dy * dy) || 1) * (Math.random() - 0.5) * jitter;
          bolt.lineTo(sx + dx * t + perpX, sy + dy * t + perpY);
        }
        bolt.lineTo(ex, ey);
        bolt.stroke({ color: 0xffffff, width: 1, alpha: 0.5 });
      }
      this.weaponFxContainer.addChild(bolt);
      this._chainBolts.push({ gfx: bolt, lifetime: 0.25 });
    }
    this.pendingChainFx = [];
  }

  updateChainFx(dt: number): void {
    for (let i = this._chainBolts.length - 1; i >= 0; i--) {
      const b = this._chainBolts[i];
      b.lifetime -= dt;
      b.gfx.alpha = Math.max(0, b.lifetime / 0.15);
      if (b.lifetime <= 0) {
        this.weaponFxContainer.removeChild(b.gfx);
        b.gfx.destroy();
        this._chainBolts.splice(i, 1);
      }
    }
  }

  spawnArcFx(): void {
    for (const arc of this.pendingArcFx) {
      const g = new Graphics();
      // Boulder body
      g.circle(0, 0, 6).fill({ color: arc.color, alpha: 0.9 });
      g.circle(-2, -2, 2).fill({ color: 0x000000, alpha: 0.2 }); // crack detail
      g.position.set(arc.sx * TS, arc.sy * TS);
      this.weaponFxContainer.addChild(g);
      this._arcBoulders.push({
        gfx: g,
        sx: arc.sx * TS, sy: arc.sy * TS,
        tx: arc.tx * TS, ty: arc.ty * TS,
        color: arc.color,
        area: arc.area,
        progress: 0,
        duration: 0.4,
      });
    }
    this.pendingArcFx = [];
  }

  updateArcFx(dt: number): void {
    for (let i = this._arcBoulders.length - 1; i >= 0; i--) {
      const b = this._arcBoulders[i];
      b.progress += dt / b.duration;

      if (b.progress >= 1) {
        // Impact — spawn ring + rock fragments
        this.weaponFxContainer.removeChild(b.gfx);
        b.gfx.destroy();
        this._arcBoulders.splice(i, 1);

        // Impact ring
        const ring = new Graphics()
          .circle(0, 0, b.area * TS * 0.3)
          .stroke({ color: b.color, width: 2.5, alpha: 0.8 });
        ring.position.set(b.tx, b.ty);
        this.weaponFxContainer.addChild(ring);
        this._weaponFxParticles.push({ gfx: ring, lifetime: 0.5, vx: 0, vy: 0, startAlpha: 0.8 });

        // Rock fragments
        for (let j = 0; j < 6; j++) {
          const frag = new Graphics();
          const sz = 2 + Math.random() * 3;
          frag.rect(-sz / 2, -sz / 2, sz, sz).fill({ color: b.color, alpha: 0.8 });
          frag.position.set(b.tx, b.ty);
          const angle = Math.random() * Math.PI * 2;
          const speed = 40 + Math.random() * 60;
          this.weaponFxContainer.addChild(frag);
          this._weaponFxParticles.push({
            gfx: frag,
            lifetime: 0.4,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - 20,
            startAlpha: 0.8,
          });
        }

        // Dust puff
        const dust = new Graphics()
          .circle(0, 0, 10)
          .fill({ color: 0x998877, alpha: 0.4 });
        dust.position.set(b.tx, b.ty);
        this.weaponFxContainer.addChild(dust);
        this._weaponFxParticles.push({ gfx: dust, lifetime: 0.6, vx: 0, vy: 0, startAlpha: 0.4 });
      } else {
        // Parabolic arc: y offset = arcHeight * 4 * t * (1-t)
        const t = b.progress;
        const dx = b.tx - b.sx;
        const dy = b.ty - b.sy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const arcHeight = Math.max(40, dist * 0.4);
        const x = b.sx + dx * t;
        const y = b.sy + dy * t - arcHeight * 4 * t * (1 - t);
        b.gfx.position.set(x, y);
        // Scale up slightly as it reaches peak
        const scale = 0.8 + 0.4 * Math.sin(t * Math.PI);
        b.gfx.scale.set(scale);
      }
    }
  }

  updateTrailParticles(dt: number): void {
    for (let i = this._trailParticles.length - 1; i >= 0; i--) {
      const p = this._trailParticles[i];
      p.lifetime -= dt;
      p.gfx.position.x += p.vx * dt;
      p.gfx.position.y += p.vy * dt;
      p.gfx.alpha = Math.max(0, p.lifetime / 0.3);
      p.gfx.scale.set(Math.max(0.2, p.lifetime / 0.3));
      if (p.lifetime <= 0) {
        this.weaponFxContainer.removeChild(p.gfx);
        p.gfx.destroy();
        this._trailParticles.splice(i, 1);
      }
    }
  }

  renderOrbitingWeapons(s: SurvivorState): void {
    // Cleanup old
    for (const g of this._orbitGfx) {
      this.weaponFxContainer.removeChild(g);
      g.destroy();
    }
    this._orbitGfx = [];

    const px = s.player.position.x * TS;
    const py = s.player.position.y * TS;
    const time = s.gameTime;

    for (const ws of s.weapons) {
      if (ws.id === "fireball_ring" || ws.id === "spinning_blade") {
        const def = WEAPON_DEFS[ws.id];
        const count = def.baseCount + def.countPerLevel * (ws.level - 1);
        const radius = (def.baseArea + def.areaPerLevel * (ws.level - 1)) * s.player.areaMultiplier * TS * 0.6;
        const speed = ws.id === "spinning_blade" ? 4 : 2;

        for (let i = 0; i < count; i++) {
          const angle = time * speed + (i * Math.PI * 2) / count;
          const ox = Math.cos(angle) * radius;
          const oy = Math.sin(angle) * radius;

          const g = new Graphics();
          if (ws.id === "fireball_ring") {
            g.circle(0, 0, 5).fill({ color: 0xff6600, alpha: 0.9 });
            g.circle(0, 0, 3).fill({ color: 0xffcc00, alpha: 0.8 });

            // Spawn ember trail particles behind the fireball
            for (let t = 0; t < 2; t++) {
              const ember = new Graphics();
              const sz = 1.5 + Math.random() * 2;
              ember.circle(0, 0, sz).fill({ color: Math.random() > 0.5 ? 0xff6600 : 0xffcc00, alpha: 0.7 });
              ember.position.set(px + ox + (Math.random() - 0.5) * 4, py + oy + (Math.random() - 0.5) * 4);
              this.weaponFxContainer.addChild(ember);
              const trailAngle = angle + Math.PI + (Math.random() - 0.5) * 0.8;
              this._trailParticles.push({
                gfx: ember,
                lifetime: 0.2 + Math.random() * 0.15,
                vx: Math.cos(trailAngle) * (10 + Math.random() * 15),
                vy: Math.sin(trailAngle) * (10 + Math.random() * 15) - 8,
              });
            }
          } else {
            g.rect(-6, -2, 12, 4).fill({ color: 0xcccccc, alpha: 0.9 });
            g.rotation = angle;
          }
          g.position.set(px + ox, py + oy);
          this.weaponFxContainer.addChild(g);
          this._orbitGfx.push(g);
        }
      } else if (ws.id === "holy_circle") {
        const radius = (WEAPON_DEFS[ws.id].baseArea + WEAPON_DEFS[ws.id].areaPerLevel * (ws.level - 1)) * s.player.areaMultiplier * TS * 0.6;
        const pulse = 0.7 + Math.sin(time * 3) * 0.3;
        const g = new Graphics()
          .circle(0, 0, radius * pulse)
          .stroke({ color: 0xffd700, width: 3, alpha: 0.35 })
          .circle(0, 0, radius * pulse * 0.92)
          .stroke({ color: 0xffffcc, width: 1, alpha: 0.2 })
          .circle(0, 0, radius * pulse)
          .fill({ color: 0xffd700, alpha: 0.06 });
        g.position.set(px, py);
        this.weaponFxContainer.addChild(g);
        this._orbitGfx.push(g);
      }
    }
  }

  spawnScreenFlash(sw: number, sh: number): void {
    for (const sf of this.pendingScreenFlash) {
      const gfx = new Graphics().rect(0, 0, sw, sh).fill({ color: sf.color, alpha: sf.alpha });
      gfx.position.set(0, 0);
      // Screen flashes go on top of everything in dmgNumberContainer (which is on top)
      this.dmgNumberContainer.addChild(gfx);
      this._screenFlashes.push({ gfx, lifetime: sf.duration, maxLifetime: sf.duration });
    }
    this.pendingScreenFlash = [];
  }

  updateScreenFlash(dt: number): void {
    for (let i = this._screenFlashes.length - 1; i >= 0; i--) {
      const sf = this._screenFlashes[i];
      sf.lifetime -= dt;
      sf.gfx.alpha = Math.max(0, sf.lifetime / sf.maxLifetime) * 0.3;
      if (sf.lifetime <= 0) {
        this.dmgNumberContainer.removeChild(sf.gfx);
        sf.gfx.destroy();
        this._screenFlashes.splice(i, 1);
      }
    }
  }

  cleanup(): void {
    this._dmgNumbers = [];
    this._weaponFxParticles = [];
    this._orbitGfx = [];
    this._arcBoulders = [];
    this._trailParticles = [];
    this._screenFlashes = [];
  }
}
