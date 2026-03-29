// ---------------------------------------------------------------------------
// Igwaine — PixiJS Renderer (Visually Rich Edition)
// Golden solar knight aesthetic: layered landscape, ambient particles,
// distinct enemy silhouettes, motion-blur projectiles, horizon glow
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { IgwainePhase, Virtue, EnemyKind, EnemyAI, Difficulty, PerkId } from "../types";
import type { IgwaineState, Enemy } from "../types";
import { IGB, VIRTUE_COLORS, ALL_PERKS, DIFFICULTY_SETTINGS, WAVE_MODIFIER_LABELS } from "../config/IgwaineBalance";
import { getSunPower, getSunBrightness, getEffectiveSunPower } from "../systems/IgwaineSystem";

const STYLE_TITLE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 52, fill: 0xffd700, fontWeight: "bold", letterSpacing: 8, dropShadow: { color: 0x000000, distance: 3, blur: 8, alpha: 0.7 } });
const STYLE_SUB = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 16, fill: 0xaa9966, fontStyle: "italic" });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x776644, lineHeight: 18 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xddccaa, fontWeight: "bold" });
const STYLE_HUD_R = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0xffd700, fontWeight: "bold" });
const STYLE_WAVE_ANNOUNCE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 32, fill: 0xffd700, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 6, alpha: 0.7 } });
const STYLE_DEAD = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 44, fill: 0xcc3333, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const STYLE_STATS = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xccbbaa, lineHeight: 22 });
const STYLE_PROMPT = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xffd700, fontWeight: "bold" });
const STYLE_PAUSE = new TextStyle({ fontFamily: "Georgia, serif", fontSize: 36, fill: 0xffd700, fontWeight: "bold" });
const STYLE_VIRTUE = new TextStyle({ fontFamily: "monospace", fontSize: 11, fill: 0xddccaa, lineHeight: 15 });
const STYLE_COMBO = new TextStyle({ fontFamily: "monospace", fontSize: 16, fill: 0xff8844, fontWeight: "bold" });
const STYLE_SOLAR_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: 0xffd700, fontWeight: "bold" });

const FLOAT_POOL = 50;

// Pre-computed landscape silhouette heights (procedural hills)
const HILLS_BACK: number[] = [];
const HILLS_FRONT: number[] = [];
for (let i = 0; i <= 100; i++) {
  const t = i / 100;
  HILLS_BACK.push(Math.sin(t * 3.7) * 12 + Math.sin(t * 7.3 + 1) * 6 + Math.sin(t * 13.1) * 3);
  HILLS_FRONT.push(Math.sin(t * 2.9 + 0.5) * 18 + Math.sin(t * 5.7 + 2) * 8 + Math.sin(t * 11.3) * 4);
}

export class IgwaineRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudL = new Text({ text: "", style: STYLE_HUD });
  private _hudR = new Text({ text: "", style: STYLE_HUD_R });
  private _title = new Text({ text: "IGWAINE", style: STYLE_TITLE });
  private _sub = new Text({ text: "The Solar Knight. Your power waxes and wanes with the sun.", style: STYLE_SUB });
  private _controls = new Text({ text: "", style: STYLE_CONTROLS });
  private _waveText = new Text({ text: "", style: STYLE_WAVE_ANNOUNCE });
  private _dead = new Text({ text: "FALLEN", style: STYLE_DEAD });
  private _stats = new Text({ text: "", style: STYLE_STATS });
  private _prompt = new Text({ text: "", style: STYLE_PROMPT });
  private _pause = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _virtueText = new Text({ text: "", style: STYLE_VIRTUE });
  private _comboText = new Text({ text: "", style: STYLE_COMBO });
  private _solarHud = new Text({ text: "", style: STYLE_SOLAR_HUD });
  private _floats: Text[] = [];
  private _floatC = new Container();

  build(): void {
    this.container.addChild(this._gfx, this._uiGfx);
    const els = [this._hudL, this._hudR, this._title, this._sub, this._controls, this._waveText, this._dead, this._stats, this._prompt, this._pause, this._virtueText, this._comboText, this._solarHud];
    for (const e of els) this.container.addChild(e);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } }) });
      t.anchor.set(0.5); t.visible = false;
      this._floats.push(t); this._floatC.addChild(t);
    }
    this.container.addChild(this._floatC);
    this._controls.text =
      "WASD — Move    Arrows — Attack (hold to charge)\n" +
      "Shift — Dash    Space — Shield    R — Solar Flare\n" +
      "ESC — Pause / Exit\n\n" +
      "Your power follows the sun — strike hard at noon, survive the night.\n" +
      "Night kills give bonus score. Collect all 5 virtues for Pentangle Synergy.\n" +
      "Revenants split on death. Eclipses plunge the world into darkness.\n" +
      "Banshees scream to slow you and teleport away — watch for purple!\n" +
      "Dawn & dusk trigger Golden Hour — a brief power spike.\n" +
      "Shield just before a hit for a RIPOSTE counter-attack!\n" +
      "Level up every 8 kills — certain perk combos unlock synergies.";
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy(); this._uiGfx.destroy();
    this._floats.forEach(t => t.destroy()); this._floats = [];
  }

  render(s: IgwaineState): void {
    const g = this._gfx, ui = this._uiGfx;
    g.clear(); ui.clear();
    const sw = s.screenW, sh = s.screenH;
    const cx = sw / 2, cy = sh / 2;
    const isEclipse = s.eclipseTimer > 0;
    const sunBright = isEclipse ? 0 : getSunBrightness(s.sunPhase);
    const sunPow = isEclipse ? IGB.SUN_POWER_MIN : getSunPower(s.sunPhase);

    let shX = 0, shY = 0;
    if (s.screenShake > 0) { shX = (Math.random() - 0.5) * s.screenShake * 2; shY = (Math.random() - 0.5) * s.screenShake * 2; }

    // ── BACKGROUND ──────────────────────────────────────────────────────────
    this._drawBackground(g, sw, sh, s, sunBright, isEclipse);

    // ── SCREEN-SPACE LIGHTING ────────────────────────────────────────────────
    if (s.phase === IgwainePhase.PLAYING || s.phase === IgwainePhase.PAUSED) {
      // Player light pool — warm radial glow that scales with sun power
      const lightRadius = 80 + sunBright * 60;
      const lightCol = isEclipse ? 0x220044 : _lerpColor(0x223355, IGB.COLOR_SUN, sunBright);
      const lightIntensity = isEclipse ? 0.015 : 0.02 + sunBright * 0.03;
      g.circle(s.px + shX, s.py + shY, lightRadius * 1.5).fill({ color: lightCol, alpha: lightIntensity * 0.4 });
      g.circle(s.px + shX, s.py + shY, lightRadius).fill({ color: lightCol, alpha: lightIntensity });
      g.circle(s.px + shX, s.py + shY, lightRadius * 0.5).fill({ color: lightCol, alpha: lightIntensity * 0.8 });

      // Enemy glow pools (small colored pools under each enemy)
      for (const e of s.enemies) {
        if (e.spawnImmunity > 0) continue;
        const eGlowR = e.radius * 2;
        const eGlowAlpha = e.kind === EnemyKind.GREEN_KNIGHT ? 0.025 : 0.012;
        const eGlowCol = e.enraged ? IGB.COLOR_ENRAGE : e.color;
        g.circle(e.x + shX, e.y + shY, eGlowR).fill({ color: eGlowCol, alpha: eGlowAlpha * (e.phaseTimer > 0 ? 0.3 : 1) });
      }

      // Golden Hour ambient light (golden wash across arena)
      if (s.goldenHourTimer > 0) {
        const ghIntensity = Math.min(1, s.goldenHourTimer * 0.5) * 0.02;
        g.circle(cx + shX, cy + shY, IGB.ARENA_RADIUS * 0.8).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghIntensity });
      }
    }

    // ── ARENA ────────────────────────────────────────────────────────────────
    this._drawArena(g, cx + shX, cy + shY, sunBright, isEclipse, s.gameTime);

    // ── HAZARDS ──────────────────────────────────────────────────────────────
    for (const h of s.hazards) {
      const segments = 20, hazAlpha = 0.15 + 0.06 * Math.sin(s.gameTime * 4);
      for (let si = 0; si < segments; si++) {
        const t = si / segments;
        const a = h.angle - h.arcWidth / 2 + t * h.arcWidth, a2 = a + h.arcWidth / segments;
        g.moveTo(cx + shX + Math.cos(a) * h.innerRadius, cy + shY + Math.sin(a) * h.innerRadius);
        g.lineTo(cx + shX + Math.cos(a) * h.outerRadius, cy + shY + Math.sin(a) * h.outerRadius);
        g.lineTo(cx + shX + Math.cos(a2) * h.outerRadius, cy + shY + Math.sin(a2) * h.outerRadius);
        g.lineTo(cx + shX + Math.cos(a2) * h.innerRadius, cy + shY + Math.sin(a2) * h.innerRadius);
        g.fill({ color: h.color, alpha: hazAlpha * (0.5 + 0.5 * Math.sin(s.gameTime * 8 + si)) });
      }
      // Ember particles along hazard edge
      for (let ei = 0; ei < 6; ei++) {
        const ea = h.angle - h.arcWidth / 2 + (ei / 6) * h.arcWidth;
        const er = h.innerRadius + Math.sin(s.gameTime * 3 + ei * 1.3) * (h.outerRadius - h.innerRadius) * 0.5 + (h.outerRadius - h.innerRadius) * 0.5;
        const emberSize = 1.5 + Math.sin(s.gameTime * 5 + ei * 2) * 0.5;
        g.circle(cx + shX + Math.cos(ea) * er, cy + shY + Math.sin(ea) * er, emberSize).fill({ color: 0xff8833, alpha: hazAlpha * 1.5 });
      }
    }

    // ── PENTANGLE WATERMARK ──────────────────────────────────────────────────
    const pentAlpha = s.pentangleBurstTimer > 0 ? 0.3 + 0.3 * Math.sin(s.gameTime * 20) : undefined;
    this._drawPentangle(g, cx + shX, cy + shY, 80, sunBright, s.gameTime, pentAlpha);

    // ── SHOCKWAVES (enhanced with multi-ring, inner gradient, sparks) ───────
    for (const sw2 of s.shockwaves) {
      const swt = sw2.life / sw2.maxLife; // 1→0 as wave expands
      const swx = sw2.x + shX, swy = sw2.y + shY;
      const baseAlpha = swt * 0.45;
      // Inner filled gradient (fading disk)
      g.circle(swx, swy, sw2.radius * 0.5).fill({ color: sw2.color, alpha: swt * 0.04 });
      // Main ring — thicker, brighter
      g.circle(swx, swy, sw2.radius).stroke({ color: sw2.color, width: 4 + swt * 2, alpha: baseAlpha });
      // Secondary ring — slightly inside, thinner
      g.circle(swx, swy, sw2.radius * 0.88).stroke({ color: sw2.color, width: 1.5, alpha: baseAlpha * 0.5 });
      // Outer soft ring — expanding glow halo
      g.circle(swx, swy, sw2.radius * 1.08).stroke({ color: sw2.color, width: 1, alpha: baseAlpha * 0.25 });
      // Leading edge highlight (white) — gives the "distortion edge" feel
      g.circle(swx, swy, sw2.radius).stroke({ color: 0xffffff, width: 1.5, alpha: swt * 0.12 });
      // Spark ring — small bright dots along the wave front
      const sparkCount = Math.floor(sw2.maxRadius / 12);
      for (let si = 0; si < sparkCount; si++) {
        const sa = (Math.PI * 2 * si) / sparkCount + s.gameTime * 2;
        const sparkR = sw2.radius + (Math.sin(sa * 3 + s.gameTime * 8) * 4);
        const sparkSize = 1 + swt * 1.5;
        g.circle(swx + Math.cos(sa) * sparkR, swy + Math.sin(sa) * sparkR, sparkSize).fill({ color: 0xffffff, alpha: swt * 0.3 });
      }
    }

    // ── VIRTUE PICKUPS ───────────────────────────────────────────────────────
    for (const vp of s.virtuePickups) {
      const col = VIRTUE_COLORS[vp.virtue];
      const pulse = 0.8 + 0.2 * Math.sin(s.gameTime * 5);
      const fade = vp.life < 2 ? vp.life / 2 : 1;
      const vpx = vp.x + shX, vpy = vp.y + shY;
      // Vertical light beam
      const beamH = 30 + pulse * 8;
      g.moveTo(vpx - 2, vpy); g.lineTo(vpx, vpy - beamH); g.lineTo(vpx + 2, vpy);
      g.fill({ color: col, alpha: 0.08 * fade });
      g.moveTo(vpx - 0.5, vpy); g.lineTo(vpx, vpy - beamH * 0.7); g.lineTo(vpx + 0.5, vpy);
      g.fill({ color: 0xffffff, alpha: 0.04 * fade });
      // Ground glow
      g.circle(vpx, vpy + 3, 8 * pulse).fill({ color: col, alpha: 0.06 * fade });
      // Outer glow
      g.circle(vpx, vpy, 14 * pulse).fill({ color: col, alpha: 0.12 * fade });
      g.circle(vpx, vpy, 10 * pulse).fill({ color: col, alpha: 0.2 * fade });
      // Core
      g.circle(vpx, vpy, 5).fill({ color: col, alpha: 0.9 * fade });
      g.circle(vpx, vpy, 3).fill({ color: 0xffffff, alpha: 0.4 * fade });
      // Orbiting sparkles
      for (let i = 0; i < 5; i++) {
        const a = (Math.PI * 2 * i) / 5 - Math.PI / 2 + s.gameTime * 3;
        g.circle(vpx + Math.cos(a) * 9, vpy + Math.sin(a) * 9, 1.5).fill({ color: col, alpha: 0.6 * fade });
      }
    }

    // ── HP ORBS ──────────────────────────────────────────────────────────────
    for (const orb of s.hpOrbs) {
      const orbFade = orb.life < 2 ? orb.life / 2 : 1;
      const orbPulse = 0.8 + 0.2 * Math.sin(s.gameTime * 6);
      g.circle(orb.x + shX, orb.y + shY, IGB.HP_ORB_RADIUS * orbPulse).fill({ color: 0x44ff44, alpha: 0.15 * orbFade });
      g.circle(orb.x + shX, orb.y + shY, 5 * orbPulse).fill({ color: 0x66ff66, alpha: 0.8 * orbFade });
      g.circle(orb.x + shX, orb.y + shY, 2).fill({ color: 0xeeffee, alpha: 0.7 * orbFade });
      // Cross shape
      g.moveTo(orb.x + shX - 3, orb.y + shY); g.lineTo(orb.x + shX + 3, orb.y + shY);
      g.moveTo(orb.x + shX, orb.y + shY - 3); g.lineTo(orb.x + shX, orb.y + shY + 3);
      g.stroke({ color: 0xffffff, width: 1, alpha: 0.5 * orbFade });
    }

    // ── GROUND SHADOWS ────────────────────────────────────────────────────────
    const shadowAlpha = 0.08 + sunBright * 0.06;
    // Player shadow
    if (s.phase === IgwainePhase.PLAYING || s.phase === IgwainePhase.PAUSED) {
      g.circle(s.px + shX + 2, s.py + shY + IGB.PLAYER_RADIUS * 0.7, IGB.PLAYER_RADIUS * 0.9).fill({ color: 0x000000, alpha: shadowAlpha });
    }
    // Enemy shadows
    for (const e of s.enemies) {
      const eShadowA = shadowAlpha * (e.phaseTimer > 0 ? 0.3 : 1) * (e.spawnImmunity > 0 ? 0.3 : 1);
      g.circle(e.x + shX + 1, e.y + shY + e.radius * 0.6, e.radius * 0.85).fill({ color: 0x000000, alpha: eShadowA });
    }

    // ── ENEMIES ──────────────────────────────────────────────────────────────
    for (const e of s.enemies) {
      const col = e.flashTimer > 0 ? 0xffffff : e.color;
      const spawnFade = e.spawnImmunity > 0 ? 1 - e.spawnImmunity / IGB.SPAWN_IMMUNITY : 1;
      const alpha = (e.stunTimer > 0 ? 0.5 : 1) * (e.phaseTimer > 0 ? 0.25 : 1) * spawnFade;
      if (e.kind === EnemyKind.GREEN_KNIGHT) this._drawGreenKnight(g, e, shX, shY, s.gameTime, alpha, col);
      else this._drawRegularEnemy(g, e, shX, shY, s.gameTime, alpha, col);

      // Elite crown and golden aura
      if (e.elite) {
        const eex = e.x + shX, eey = e.y + shY;
        // Golden aura pulse
        const elitePulse = 0.5 + 0.3 * Math.sin(s.gameTime * 4);
        g.circle(eex, eey, e.radius + 6).stroke({ color: IGB.COLOR_ELITE, width: 1.5, alpha: elitePulse * 0.4 * alpha });
        g.circle(eex, eey, e.radius + 3).fill({ color: IGB.COLOR_ELITE, alpha: 0.04 * alpha });
        // Crown (3 triangular points)
        const crownY = eey - e.radius - 6;
        const crownW = e.radius * 0.7;
        g.moveTo(eex - crownW, crownY);
        g.lineTo(eex - crownW * 0.5, crownY - 6);
        g.lineTo(eex, crownY);
        g.lineTo(eex + crownW * 0.5, crownY - 6);
        g.lineTo(eex + crownW, crownY);
        g.lineTo(eex + crownW, crownY + 3);
        g.lineTo(eex - crownW, crownY + 3);
        g.fill({ color: IGB.COLOR_ELITE, alpha: 0.85 * alpha });
      }

      // HP bar with gradient
      if (e.hp < e.maxHp) {
        const bw = e.radius * 2.4, bx = e.x + shX - bw / 2, by = e.y + shY - e.radius - 11;
        g.rect(bx - 1, by - 1, bw + 2, 5).fill({ color: 0x000000, alpha: 0.4 });
        g.rect(bx, by, bw, 3).fill({ color: 0x220808, alpha: 0.8 });
        const hpPct = Math.max(0, e.hp / e.maxHp);
        const hpCol = e.kind === EnemyKind.GREEN_KNIGHT ? IGB.COLOR_GREEN_KNIGHT : (hpPct > 0.5 ? IGB.COLOR_HP : 0xff2222);
        g.rect(bx, by, bw * hpPct, 3).fill({ color: hpCol, alpha: 0.9 });
        if (e.regenRate > 0) g.rect(bx, by, bw * hpPct, 3).fill({ color: 0x88ff88, alpha: 0.25 + 0.15 * Math.sin(s.gameTime * 6) });
      }
    }

    // ── PROJECTILES (enhanced with layered glow, scatter sparks, pierce aura) ─
    for (const p of s.projectiles) {
      const px = p.x + shX, py = p.y + shY;
      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      const pnx = speed > 0 ? p.vx / speed : 0, pny = speed > 0 ? p.vy / speed : 0;

      if (p.fromPlayer) {
        const tailLen = p.charged ? 16 : 8;
        const fadeLife = Math.min(1, p.life * 3); // fade in on spawn

        // Outer comet halo (soft wide glow)
        g.circle(px, py, p.radius + (p.charged ? 8 : 4)).fill({ color: p.color, alpha: (p.charged ? 0.08 : 0.05) * fadeLife });

        // Multi-segment comet tail with taper
        const segments = p.charged ? 4 : 3;
        for (let ti = 0; ti < segments; ti++) {
          const t = (ti + 1) / segments;
          const tx = px - pnx * tailLen * t * 2;
          const ty = py - pny * tailLen * t * 2;
          const tw = p.radius * (1 - t * 0.7) * (p.charged ? 1.3 : 0.8);
          g.circle(tx, ty, tw).fill({ color: p.color, alpha: 0.12 * (1 - t) * fadeLife });
        }

        // Core glow layers
        g.circle(px, py, p.radius * 1.4).fill({ color: p.color, alpha: 0.2 * fadeLife });
        g.circle(px, py, p.radius).fill({ color: p.color, alpha: 0.92 * fadeLife });
        // Hot white center
        g.circle(px, py, p.radius * 0.45).fill({ color: 0xffffff, alpha: (p.charged ? 0.75 : 0.35) * fadeLife });

        // Pierce visual — spinning energy ring
        if (p.pierce > 0) {
          const pierceR = p.radius + 2 + p.pierce;
          g.circle(px, py, pierceR).stroke({ color: 0xffffff, width: 1, alpha: 0.35 * fadeLife });
          // Orbiting pierce dots
          for (let pi2 = 0; pi2 < p.pierce + 1; pi2++) {
            const pa = s.gameTime * 10 + (Math.PI * 2 * pi2) / (p.pierce + 1);
            g.circle(px + Math.cos(pa) * pierceR, py + Math.sin(pa) * pierceR, 1).fill({ color: 0xffffff, alpha: 0.5 * fadeLife });
          }
        }

        // Charged shot special — pulsing energy halo + radial spikes
        if (p.charged) {
          const chgPulse = 0.5 + 0.3 * Math.sin(s.gameTime * 15);
          g.circle(px, py, p.radius + 5 + chgPulse * 3).stroke({ color: 0xffffff, width: 1, alpha: 0.15 * fadeLife });
          // Radial energy spikes
          for (let si = 0; si < 6; si++) {
            const sa = (Math.PI * 2 * si) / 6 + s.gameTime * 6;
            const sLen = p.radius + 3 + chgPulse * 4;
            g.moveTo(px + Math.cos(sa) * p.radius, py + Math.sin(sa) * p.radius);
            g.lineTo(px + Math.cos(sa) * sLen, py + Math.sin(sa) * sLen);
            g.stroke({ color: p.color, width: 1, alpha: 0.25 * fadeLife });
          }
        }
      } else {
        // Enemy projectile — sinister cold trail with flicker
        const tailLen = 5;
        const flicker = 0.7 + 0.3 * Math.sin(s.gameTime * 20 + px);
        // Soft tail
        g.moveTo(px - pnx * tailLen * 2, py - pny * tailLen * 2);
        g.lineTo(px, py);
        g.stroke({ color: p.color, width: p.radius * 0.5, alpha: 0.15 * flicker });
        // Outer glow
        g.circle(px, py, p.radius + 2).fill({ color: p.color, alpha: 0.12 * flicker });
        // Core
        g.circle(px, py, p.radius).fill({ color: p.color, alpha: 0.85 * flicker });
        // Dark center (enemy projectiles have a "void" core)
        g.circle(px, py, p.radius * 0.3).fill({ color: 0x000011, alpha: 0.3 });
      }
    }

    // ── PARTICLES (enhanced with glow + shape variety) ──────────────────────
    for (const p of s.particles) {
      const a = p.life / p.maxLife;
      const px2 = p.x + shX, py2 = p.y + shY;
      const sz = p.size * a;
      // Outer glow halo
      if (sz > 2) g.circle(px2, py2, sz * 1.8).fill({ color: p.color, alpha: a * 0.06 });
      // Speed-based elongation (motion streak)
      const pSpd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (pSpd > 80 && sz > 1.5) {
        const pnx = p.vx / pSpd, pny = p.vy / pSpd;
        const streakLen = Math.min(sz * 2.5, pSpd * 0.02);
        g.moveTo(px2 - pnx * streakLen, py2 - pny * streakLen);
        g.lineTo(px2, py2);
        g.stroke({ color: p.color, width: sz * 0.6, alpha: a * 0.3 });
      }
      // Core
      g.circle(px2, py2, sz).fill({ color: p.color, alpha: a * 0.8 });
      // Hot center for larger particles
      if (sz > 3) g.circle(px2, py2, sz * 0.35).fill({ color: 0xffffff, alpha: a * 0.2 });
    }

    // ── AMBIENT PARTICLES ────────────────────────────────────────────────────
    this._drawAmbientParticles(g, sw, sh, s.gameTime, sunBright, isEclipse);

    // ── PENTANGLE BURST (above everything) ───────────────────────────────────
    if (s.pentangleBurstTimer > 0) {
      const t = s.pentangleBurstTimer / IGB.PENTANGLE_BURST_DURATION;
      g.circle(cx + shX, cy + shY, IGB.PENTANGLE_RADIUS * (1 - t)).fill({ color: IGB.COLOR_PENTANGLE_BURST, alpha: t * 0.15 });
    }

    // ── PLAYER ───────────────────────────────────────────────────────────────
    if (s.phase === IgwainePhase.PLAYING || s.phase === IgwainePhase.PAUSED) {
      this._drawPlayer(g, s, shX, shY, sunBright);
    }

    // ── FLOATING TEXTS ───────────────────────────────────────────────────────
    let fi = 0;
    for (const ft of s.floatingTexts) {
      if (fi >= FLOAT_POOL) break;
      const txt = this._floats[fi];
      txt.text = ft.text; txt.style.fill = ft.color; txt.style.fontSize = Math.round(12 * ft.scale);
      txt.position.set(ft.x + shX, ft.y + shY); txt.alpha = Math.min(1, ft.life * 2); txt.visible = true;
      fi++;
    }
    for (; fi < FLOAT_POOL; fi++) this._floats[fi].visible = false;

    // ── POST-PROCESSING OVERLAYS ─────────────────────────────────────────────
    // Low HP vignette (thicker, more dramatic)
    if (s.phase === IgwainePhase.PLAYING && s.hp < s.maxHp * 0.4 && s.hp > 0) {
      const intensity = 1 - s.hp / (s.maxHp * 0.4);
      const pulse = 0.3 + 0.2 * Math.sin(s.gameTime * 4);
      const vw = 3 + intensity * 6; // gets thicker as HP drops
      ui.rect(0, 0, sw, vw).fill({ color: IGB.COLOR_DANGER, alpha: intensity * pulse });
      ui.rect(0, sh - vw, sw, vw).fill({ color: IGB.COLOR_DANGER, alpha: intensity * pulse });
      ui.rect(0, 0, vw, sh).fill({ color: IGB.COLOR_DANGER, alpha: intensity * pulse });
      ui.rect(sw - vw, 0, vw, sh).fill({ color: IGB.COLOR_DANGER, alpha: intensity * pulse });
      // Corner darkening
      const cornerA = intensity * 0.12;
      for (let ci = 0; ci < 4; ci++) {
        const ccx = ci % 2 === 0 ? 0 : sw, ccy = ci < 2 ? 0 : sh;
        ui.circle(ccx, ccy, 120).fill({ color: 0x000000, alpha: cornerA });
      }
    }

    if (isEclipse) ui.rect(0, 0, sw, sh).fill({ color: IGB.COLOR_ECLIPSE, alpha: 0.03 + 0.02 * Math.sin(s.gameTime * 3) });
    if (s.screenFlashTimer > 0) ui.rect(0, 0, sw, sh).fill({ color: s.screenFlashColor, alpha: s.screenFlashTimer * 0.6 });
    if (s.slowMoTimer > 0) ui.rect(0, 0, sw, sh).fill({ color: 0x000022, alpha: 0.08 });
    // Golden Hour warm overlay
    if (s.goldenHourTimer > 0) {
      const ghAlpha = Math.min(0.06, s.goldenHourTimer * 0.02);
      ui.rect(0, 0, sw, sh).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghAlpha });
      // Pulsing golden border
      const ghPulse = 0.3 + 0.2 * Math.sin(s.gameTime * 5);
      ui.rect(0, 0, sw, 2).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghPulse * 0.3 });
      ui.rect(0, sh - 2, sw, 2).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghPulse * 0.3 });
      ui.rect(0, 0, 2, sh).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghPulse * 0.3 });
      ui.rect(sw - 2, 0, 2, sh).fill({ color: IGB.COLOR_GOLDEN_HOUR, alpha: ghPulse * 0.3 });
    }
    // Fear (Banshee) purple distortion overlay
    if (s.fearTimer > 0) {
      const fearAlpha = Math.min(0.08, s.fearTimer * 0.04);
      ui.rect(0, 0, sw, sh).fill({ color: IGB.COLOR_FEAR, alpha: fearAlpha + 0.02 * Math.sin(s.gameTime * 8) });
    }

    // ── HUD ──────────────────────────────────────────────────────────────────
    this._hideAll();
    if (s.phase === IgwainePhase.START) { this._renderStartScreen(s, cx, sh, g); return; }
    if (s.phase === IgwainePhase.PLAYING || s.phase === IgwainePhase.PAUSED) this._renderPlayingHUD(s, ui, sw, sh, cx, cy, sunBright, sunPow, isEclipse);
    if (s.phase === IgwainePhase.PAUSED) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
      this._pause.visible = true; this._pause.anchor.set(0.5); this._pause.position.set(cx, sh * 0.2);
      this._prompt.visible = true; this._prompt.anchor.set(0.5); this._prompt.position.set(cx, sh * 0.32);
      this._prompt.text = "ESC — Resume    Q — Quit";
      if (s.perks.length > 0) {
        this._stats.visible = true; this._stats.anchor.set(0.5); this._stats.position.set(cx, sh * 0.5);
        const perkMap = new Map<string, number>();
        for (const pid of s.perks) { const def = ALL_PERKS.find(p => p.id === pid); if (def) perkMap.set(def.name, (perkMap.get(def.name) ?? 0) + 1); }
        let pStr = "— PERKS —\n";
        for (const [name, count] of perkMap) pStr += `${name}${count > 1 ? ` x${count}` : ""}\n`;
        this._stats.text = pStr.trim();
      }
    }
    if (s.phase === IgwainePhase.DEAD) this._renderDeathScreen(s, ui, sw, sh, cx);
  }

  // =========================================================================
  // BACKGROUND — layered landscape with sky gradient + horizon glow
  // =========================================================================

  private _drawBackground(g: Graphics, sw: number, sh: number, s: IgwaineState, sunBright: number, isEclipse: boolean): void {
    // Sky gradient (4 horizontal bands)
    const skyTop = isEclipse ? 0x050012 : _lerpColor(0x020818, 0x0e0820, sunBright);
    const skyMid = isEclipse ? 0x0a0020 : _lerpColor(0x060610, 0x1a1420, sunBright);
    const skyLow = isEclipse ? 0x100028 : _lerpColor(0x080818, 0x221a28, sunBright);
    const bandH = sh * 0.25;
    g.rect(0, 0, sw, bandH).fill(skyTop);
    g.rect(0, bandH, sw, bandH).fill(_lerpColor(skyTop, skyMid, 0.5));
    g.rect(0, bandH * 2, sw, bandH).fill(skyMid);
    g.rect(0, bandH * 3, sw, bandH).fill(skyLow);

    // Horizon glow — warm at day, cool at night, follows sun position
    const horizonY = sh * 0.42;
    const sunX = sw * 0.15 + s.sunPhase * sw * 0.7;
    const glowCol = isEclipse ? 0x220044 : _lerpColor(0x112244, 0x443311, sunBright);
    const glowAlpha = isEclipse ? 0.06 : 0.04 + sunBright * 0.08;
    g.circle(sunX, horizonY, 200).fill({ color: glowCol, alpha: glowAlpha });
    if (sunBright > 0.3 && !isEclipse) {
      g.circle(sunX, horizonY, 120).fill({ color: _lerpColor(0x332200, 0x664400, sunBright), alpha: glowAlpha * 0.6 });
    }

    // Sun arc
    if (!isEclipse) this._drawSunArc(g, sw, sh, s.sunPhase, sunBright);
    else {
      const arcW = sw * 0.7, arcStartX = (sw - arcW) / 2;
      const sx = arcStartX + s.sunPhase * arcW, sy = 40 - Math.sin(s.sunPhase * Math.PI) * 25;
      g.circle(sx, sy, 12).fill({ color: 0x110022, alpha: 0.9 });
      g.circle(sx, sy, 16).stroke({ color: 0x440066, width: 2, alpha: 0.4 });
      // Eclipse corona
      for (let i = 0; i < 8; i++) {
        const a = (Math.PI * 2 * i) / 8 + s.gameTime * 0.5;
        g.moveTo(sx + Math.cos(a) * 14, sy + Math.sin(a) * 14);
        g.lineTo(sx + Math.cos(a) * 22, sy + Math.sin(a) * 22);
        g.stroke({ color: 0x6633aa, width: 1, alpha: 0.3 });
      }
    }

    // Stars
    if (sunBright < 0.6 || isEclipse) {
      const starAlpha = isEclipse ? 0.9 : (1 - sunBright / 0.6) * 0.7;
      for (let i = 0; i < 60; i++) {
        const sx = ((i * 137 + 42) % 1000) / 1000 * sw;
        const sy = ((i * 73 + 11) % 600) / 600 * (sh * 0.35);
        const tw = 0.5 + 0.5 * Math.sin(s.gameTime * 2 + i * 1.7);
        const starR = i % 7 === 0 ? 1.5 : 1; // some bigger stars
        g.circle(sx, sy, starR + tw * 0.4).fill({ color: isEclipse ? 0x8866cc : 0xffffff, alpha: starAlpha * tw });
      }
    }

    // Landscape silhouettes — back layer (mountains)
    const hillBaseY = sh * 0.48;
    const hillCol1 = isEclipse ? 0x0a0018 : _lerpColor(0x060612, 0x151018, sunBright);
    g.moveTo(0, hillBaseY);
    for (let i = 0; i <= 100; i++) g.lineTo((i / 100) * sw, hillBaseY - 20 + HILLS_BACK[i]);
    g.lineTo(sw, sh); g.lineTo(0, sh);
    g.fill({ color: hillCol1, alpha: 0.7 });

    // Landscape — front layer (closer hills with trees)
    const hillBaseY2 = sh * 0.52;
    const hillCol2 = isEclipse ? 0x060010 : _lerpColor(0x040410, 0x100c14, sunBright);
    g.moveTo(0, hillBaseY2);
    for (let i = 0; i <= 100; i++) g.lineTo((i / 100) * sw, hillBaseY2 - 10 + HILLS_FRONT[i]);
    g.lineTo(sw, sh); g.lineTo(0, sh);
    g.fill({ color: hillCol2, alpha: 0.8 });

    // Tree silhouettes on hills (tiny triangles)
    const treeCol = isEclipse ? 0x060010 : _lerpColor(0x030408, 0x0a080c, sunBright);
    const treePositions = [0.05, 0.09, 0.15, 0.22, 0.28, 0.35, 0.42, 0.55, 0.62, 0.7, 0.78, 0.88, 0.93];
    for (const tp of treePositions) {
      const tx = tp * sw;
      const idx = Math.min(100, Math.floor(tp * 100));
      const treeBase = hillBaseY2 - 10 + HILLS_FRONT[idx];
      const treeH = 8 + (tp * 17 % 7); // varied heights
      g.moveTo(tx - 3, treeBase); g.lineTo(tx, treeBase - treeH); g.lineTo(tx + 3, treeBase);
      g.fill({ color: treeCol, alpha: 0.6 });
    }

    // Castle tower silhouettes (2 towers on hills)
    const towerCol = isEclipse ? 0x08000e : _lerpColor(0x040408, 0x0c080e, sunBright);
    g.rect(sw * 0.12, hillBaseY - 35, 8, 35).fill({ color: towerCol, alpha: 0.6 });
    g.rect(sw * 0.12 - 3, hillBaseY - 38, 14, 5).fill({ color: towerCol, alpha: 0.6 });
    // Battlement notches
    for (let bi = 0; bi < 3; bi++) g.rect(sw * 0.12 - 2 + bi * 5, hillBaseY - 40, 3, 3).fill({ color: towerCol, alpha: 0.5 });
    g.rect(sw * 0.85, hillBaseY - 28, 6, 28).fill({ color: towerCol, alpha: 0.5 });
    g.rect(sw * 0.85 - 2, hillBaseY - 31, 10, 4).fill({ color: towerCol, alpha: 0.5 });

    // Cloud wisps (very slow-drifting translucent shapes)
    if (!isEclipse) {
      const cloudAlpha = 0.03 + sunBright * 0.02;
      const cloudCol = _lerpColor(0x334466, 0x443322, sunBright);
      for (let ci = 0; ci < 4; ci++) {
        const cx2 = ((ci * 271 + 50) % 1000) / 1000 * sw + Math.sin(s.gameTime * 0.02 + ci * 2) * 40;
        const cy2 = sh * 0.08 + ci * sh * 0.06;
        const cw = 60 + ci * 20;
        g.circle(cx2, cy2, 15).fill({ color: cloudCol, alpha: cloudAlpha });
        g.circle(cx2 + cw * 0.3, cy2 - 3, 12).fill({ color: cloudCol, alpha: cloudAlpha * 0.8 });
        g.circle(cx2 - cw * 0.25, cy2 + 2, 10).fill({ color: cloudCol, alpha: cloudAlpha * 0.6 });
      }
    }

    // Moon (opposite side of sun arc, visible at night)
    if (sunBright < 0.4 && !isEclipse) {
      const moonPhase = (s.sunPhase + 0.5) % 1; // opposite the sun
      const arcW2 = sw * 0.7, arcStartX2 = (sw - arcW2) / 2;
      const mx = arcStartX2 + moonPhase * arcW2;
      const my = 40 - Math.sin(moonPhase * Math.PI) * 25;
      const moonAlpha = (0.4 - sunBright) * 2;
      // Moon glow
      g.circle(mx, my, 10).fill({ color: 0x8899bb, alpha: moonAlpha * 0.06 });
      g.circle(mx, my, 6).fill({ color: 0xaabbcc, alpha: moonAlpha * 0.5 });
      // Crescent shadow (offset circle to make crescent)
      g.circle(mx + 2, my - 1, 5).fill({ color: _lerpColor(0x020818, 0x0e0820, sunBright), alpha: moonAlpha * 0.7 });
    }

    // Sun light shaft (crepuscular ray from sun toward arena, visible around noon)
    if (sunBright > 0.5 && !isEclipse) {
      const shaftAlpha = (sunBright - 0.5) * 0.04;
      const sunX2 = sw * 0.15 + s.sunPhase * sw * 0.7;
      const sunY2 = 38 - Math.sin(s.sunPhase * Math.PI) * 28;
      // Triangular shaft widening downward
      g.moveTo(sunX2 - 8, sunY2 + 10);
      g.lineTo(sw / 2 - 60, sh * 0.55);
      g.lineTo(sw / 2 + 60, sh * 0.55);
      g.lineTo(sunX2 + 8, sunY2 + 10);
      g.fill({ color: IGB.COLOR_SUN, alpha: shaftAlpha });
    }

    // Star constellations (connect star triplets with faint lines)
    if (sunBright < 0.4 && !isEclipse) {
      const consAlpha = (0.4 - sunBright) * 0.2;
      const starIdx = [[0, 3, 7], [12, 18, 22], [30, 35, 40], [45, 50, 55]];
      for (const group of starIdx) {
        const pts = group.map(i => ({
          x: ((i * 137 + 42) % 1000) / 1000 * sw,
          y: ((i * 73 + 11) % 600) / 600 * (sh * 0.35),
        }));
        g.moveTo(pts[0].x, pts[0].y);
        for (let ci = 1; ci < pts.length; ci++) g.lineTo(pts[ci].x, pts[ci].y);
        g.stroke({ color: 0x6688aa, width: 0.5, alpha: consAlpha });
      }
    }
  }

  // =========================================================================
  // ARENA — stone floor with runic detail
  // =========================================================================

  private _drawArena(g: Graphics, acx: number, acy: number, sunBright: number, isEclipse: boolean, time: number): void {
    const arenaAlpha = 0.3 + sunBright * 0.2;
    const floorCol = isEclipse ? _lerpColor(0x080816, 0x080816, 0) : _lerpColor(0x0c0c1a, 0x1a1814, sunBright);

    // Arena fill with subtle radial gradient (darker center)
    g.circle(acx, acy, IGB.ARENA_RADIUS).fill({ color: floorCol, alpha: 0.5 });
    g.circle(acx, acy, IGB.ARENA_RADIUS * 0.6).fill({ color: floorCol, alpha: 0.1 });

    // Concentric stone rings
    for (let r = 1; r <= 4; r++) {
      const ringR = IGB.ARENA_RADIUS * (r / 4.5);
      g.circle(acx, acy, ringR).stroke({ color: isEclipse ? 0x221133 : IGB.COLOR_ARENA_BORDER, width: 0.5, alpha: arenaAlpha * 0.25 });
    }

    // Cardinal rune marks (N/S/E/W)
    const cardinalR = IGB.ARENA_RADIUS * 0.92;
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i - Math.PI / 2;
      const rx = acx + Math.cos(a) * cardinalR, ry = acy + Math.sin(a) * cardinalR;
      // Diamond rune shape
      g.moveTo(rx, ry - 5); g.lineTo(rx + 3, ry); g.lineTo(rx, ry + 5); g.lineTo(rx - 3, ry); g.lineTo(rx, ry - 5);
      g.stroke({ color: IGB.COLOR_GOLD, width: 0.8, alpha: arenaAlpha * 0.5 });
    }

    // Cross-hair lines (faint)
    g.moveTo(acx, acy - IGB.ARENA_RADIUS * 0.85); g.lineTo(acx, acy + IGB.ARENA_RADIUS * 0.85);
    g.moveTo(acx - IGB.ARENA_RADIUS * 0.85, acy); g.lineTo(acx + IGB.ARENA_RADIUS * 0.85, acy);
    g.stroke({ color: IGB.COLOR_ARENA_BORDER, width: 0.3, alpha: arenaAlpha * 0.15 });

    // Arena border (double ring)
    g.circle(acx, acy, IGB.ARENA_RADIUS).stroke({ color: isEclipse ? 0x440066 : IGB.COLOR_ARENA_BORDER, width: 2.5, alpha: arenaAlpha });
    g.circle(acx, acy, IGB.ARENA_RADIUS - 4).stroke({ color: isEclipse ? 0x330044 : IGB.COLOR_ARENA_BORDER, width: 0.5, alpha: arenaAlpha * 0.5 });

    // Rotating rune marks on border
    for (let i = 0; i < 12; i++) {
      const a = (Math.PI * 2 * i) / 12 + time * 0.05;
      const rx = acx + Math.cos(a) * (IGB.ARENA_RADIUS - 7), ry = acy + Math.sin(a) * (IGB.ARENA_RADIUS - 7);
      const runeSize = 2 + Math.sin(time * 0.5 + i) * 0.5;
      g.circle(rx, ry, runeSize).fill({ color: isEclipse ? 0x6633aa : IGB.COLOR_GOLD, alpha: arenaAlpha * 0.5 });
    }

    // Animated rune circle (inner mystical ring that pulses with sun power)
    const innerRuneR = IGB.ARENA_RADIUS * 0.45;
    const runeGlow = isEclipse ? 0.08 : 0.04 + sunBright * 0.06;
    const runeColor = isEclipse ? 0x6633aa : _lerpColor(0x334466, IGB.COLOR_GOLD, sunBright);
    for (let i = 0; i < 8; i++) {
      const ra = (Math.PI * 2 * i) / 8 + time * -0.08;
      const rnx = acx + Math.cos(ra) * innerRuneR, rny = acy + Math.sin(ra) * innerRuneR;
      // Diamond rune glyph
      const gs = 4 + Math.sin(time * 1.5 + i * 0.8) * 1;
      g.moveTo(rnx, rny - gs); g.lineTo(rnx + gs * 0.6, rny); g.lineTo(rnx, rny + gs); g.lineTo(rnx - gs * 0.6, rny);
      g.fill({ color: runeColor, alpha: runeGlow });
      // Connecting arc segments between glyphs
      if (i < 8) {
        const nextA = (Math.PI * 2 * (i + 1)) / 8 + time * -0.08;
        const nnx = acx + Math.cos(nextA) * innerRuneR, nny = acy + Math.sin(nextA) * innerRuneR;
        g.moveTo(rnx, rny); g.lineTo(nnx, nny);
        g.stroke({ color: runeColor, width: 0.5, alpha: runeGlow * 0.5 });
      }
    }
    g.circle(acx, acy, innerRuneR).stroke({ color: runeColor, width: 0.5, alpha: runeGlow * 0.6 });

    // Ground texture — subtle scattered stone dots
    for (let i = 0; i < 40; i++) {
      const stoneAngle = (i * 137.5 + 42) * Math.PI / 180;
      const stoneDist = ((i * 73 + 11) % 100) / 100 * (IGB.ARENA_RADIUS - 20);
      const sx2 = acx + Math.cos(stoneAngle) * stoneDist, sy2 = acy + Math.sin(stoneAngle) * stoneDist;
      const stoneSize = 0.8 + (i % 3) * 0.4;
      g.circle(sx2, sy2, stoneSize).fill({ color: isEclipse ? 0x110022 : _lerpColor(0x0a0a14, 0x161212, sunBright), alpha: arenaAlpha * 0.3 });
    }
  }

  // =========================================================================
  // AMBIENT PARTICLES — floating motes that shift with day/night
  // =========================================================================

  private _drawAmbientParticles(g: Graphics, sw: number, sh: number, time: number, sunBright: number, isEclipse: boolean): void {
    const count = 25;
    for (let i = 0; i < count; i++) {
      // Deterministic but animated positions
      const baseX = ((i * 173 + 67) % 1000) / 1000 * sw;
      const baseY = ((i * 251 + 31) % 1000) / 1000 * sh;
      const drift = Math.sin(time * 0.3 + i * 1.3) * 20;
      const bob = Math.cos(time * 0.5 + i * 0.9) * 15;
      const x = baseX + drift, y = baseY + bob;
      const lifePhase = (Math.sin(time * 0.8 + i * 2.1) + 1) * 0.5; // 0-1 pulsing

      if (isEclipse) {
        // Purple wisps
        g.circle(x, y, 1 + lifePhase * 1.5).fill({ color: 0x6633aa, alpha: lifePhase * 0.15 });
      } else if (sunBright > 0.5) {
        // Golden motes at day
        g.circle(x, y, 1 + lifePhase).fill({ color: IGB.COLOR_GOLD, alpha: lifePhase * 0.08 * sunBright });
      } else {
        // Blue-silver wisps at night
        g.circle(x, y, 1 + lifePhase * 1.2).fill({ color: 0x6688bb, alpha: lifePhase * 0.1 * (1 - sunBright) });
      }
    }
  }

  // =========================================================================
  // PLAYER — knight silhouette with sword arm and cape trail
  // =========================================================================

  private _drawPlayer(g: Graphics, s: IgwaineState, shX: number, shY: number, sunBright: number): void {
    const pAlpha = s.invulnTimer > 0 ? 0.5 + 0.5 * Math.sin(s.gameTime * 30) : 1;
    const playerCol = _lerpColor(IGB.COLOR_MOON, IGB.COLOR_PLAYER, sunBright);
    const ppx = s.px + shX, ppy = s.py + shY;
    const R = IGB.PLAYER_RADIUS;

    // Shield
    if (s.shielding) {
      const canReflect = s.virtues[Virtue.COURTESY] >= IGB.SHIELD_REFLECT_THRESHOLD && s.energy >= 10;
      const shieldCol = canReflect ? 0x66ddff : IGB.COLOR_SHIELD;
      g.circle(ppx, ppy, R + 12).fill({ color: shieldCol, alpha: 0.08 });
      g.circle(ppx, ppy, R + 10).stroke({ color: shieldCol, width: canReflect ? 3 : 2, alpha: 0.45 });
      // Shield rune ring
      const runeCount = canReflect ? 8 : 6;
      for (let i = 0; i < runeCount; i++) {
        const a = (Math.PI * 2 * i) / runeCount + s.gameTime * 3;
        g.circle(ppx + Math.cos(a) * (R + 10), ppy + Math.sin(a) * (R + 10), canReflect ? 2 : 1.5).fill({ color: shieldCol, alpha: 0.5 });
      }
    }

    // Charge indicator
    if (s.chargeTime > 0) {
      const chgPct = Math.min(1, (s.chargeTime - IGB.CHARGE_TIME_MIN) / (IGB.CHARGE_TIME_MAX - IGB.CHARGE_TIME_MIN));
      const ready = s.chargeTime >= IGB.CHARGE_TIME_MIN;
      const chargeR = R + 6 + chgPct * 14;
      g.circle(ppx, ppy, chargeR).stroke({ color: ready ? IGB.COLOR_CHARGED : 0x665533, width: 2, alpha: 0.5 + chgPct * 0.3 });
      // Charge direction preview with thickening line
      const previewLen = 30 + chgPct * 25;
      g.moveTo(ppx + s.chargeAimX * R, ppy + s.chargeAimY * R);
      g.lineTo(ppx + s.chargeAimX * previewLen, ppy + s.chargeAimY * previewLen);
      g.stroke({ color: IGB.COLOR_CHARGED, width: 1 + chgPct * 3, alpha: 0.3 + chgPct * 0.5 });
      // Charge glow intensifies
      if (ready) g.circle(ppx, ppy, R + 3).fill({ color: IGB.COLOR_CHARGED, alpha: 0.1 + chgPct * 0.1 });
    }

    // Solar glow (layered, more dramatic)
    const glowR = R + 4 + sunBright * 12;
    g.circle(ppx, ppy, glowR + 8).fill({ color: playerCol, alpha: 0.04 * pAlpha });
    g.circle(ppx, ppy, glowR).fill({ color: playerCol, alpha: 0.1 * pAlpha });
    if (sunBright > 0.7) g.circle(ppx, ppy, glowR + 12).fill({ color: IGB.COLOR_SUN, alpha: 0.04 * pAlpha });

    // Movement dust (when moving, not dashing)
    const moveSpeed = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy);
    if (moveSpeed > 100 && s.dashTimer <= 0) {
      const dustCount = 3;
      for (let di = 0; di < dustCount; di++) {
        const dustAngle = Math.atan2(-s.pvy, -s.pvx) + (Math.random() - 0.5) * 1.2;
        const dustR = R + 2 + Math.random() * 4;
        const dustX = ppx + Math.cos(dustAngle) * dustR;
        const dustY = ppy + Math.sin(dustAngle) * dustR + R * 0.5;
        const dustSize = 1 + Math.random() * 1.5;
        const dustPhase = (s.gameTime * 10 + di * 3.7) % 1;
        if (dustPhase < 0.3) {
          g.circle(dustX, dustY, dustSize * (1 - dustPhase * 3)).fill({ color: _lerpColor(0x665544, playerCol, 0.2), alpha: 0.15 * (1 - dustPhase * 3) });
        }
      }
    }

    // Cape trail (opposite of aim direction) — enhanced with flutter and layers
    const capeLen = 10 + (s.dashTimer > 0 ? 10 : 0);
    const capeDirX = -s.aimDirX, capeDirY = -s.aimDirY;
    const capeFlutter1 = Math.sin(s.gameTime * 8) * 2;
    const capeFlutter2 = Math.sin(s.gameTime * 12 + 1) * 1.5;
    const capePerpX = -capeDirY, capePerpY = capeDirX;
    // Outer cape layer (darker, wider)
    const outerW = 5.5;
    g.moveTo(ppx + capeDirX * R * 0.25 - capePerpX * outerW, ppy + capeDirY * R * 0.25 - capePerpY * outerW);
    g.lineTo(ppx + capeDirX * (R + capeLen * 1.1) + capePerpX * capeFlutter2, ppy + capeDirY * (R + capeLen * 1.1) + capePerpY * capeFlutter2);
    g.lineTo(ppx + capeDirX * R * 0.25 + capePerpX * outerW, ppy + capeDirY * R * 0.25 + capePerpY * outerW);
    g.fill({ color: _lerpColor(0x441111, playerCol, 0.15), alpha: 0.3 * pAlpha });
    // Inner cape layer (brighter, narrower, flutters differently)
    g.moveTo(ppx + capeDirX * R * 0.3 - capePerpX * 4, ppy + capeDirY * R * 0.3 - capePerpY * 4);
    g.lineTo(ppx + capeDirX * (R + capeLen) + capePerpX * capeFlutter1, ppy + capeDirY * (R + capeLen) + capePerpY * capeFlutter1);
    g.lineTo(ppx + capeDirX * R * 0.3 + capePerpX * 4, ppy + capeDirY * R * 0.3 + capePerpY * 4);
    g.fill({ color: _lerpColor(0x882222, playerCol, 0.3), alpha: 0.4 * pAlpha });

    // Body (slightly larger, with highlight)
    g.circle(ppx, ppy, R).fill({ color: playerCol, alpha: 0.85 * pAlpha });
    // Top highlight (rim light)
    g.circle(ppx - R * 0.15, ppy - R * 0.2, R * 0.4).fill({ color: 0xffffff, alpha: 0.07 * pAlpha });

    // Helmet visor slit (horizontal dark band across face area)
    const visorY = ppy - R * 0.15;
    g.moveTo(ppx - R * 0.45, visorY); g.lineTo(ppx + R * 0.45, visorY);
    g.stroke({ color: 0x000000, width: 2.5, alpha: 0.35 * pAlpha });
    // Visor glow (eyes behind the slit — color shifts with sun)
    const visorGlow = _lerpColor(0x4466aa, IGB.COLOR_SUN, sunBright);
    g.circle(ppx - R * 0.18, visorY, 1.5).fill({ color: visorGlow, alpha: 0.6 * pAlpha });
    g.circle(ppx + R * 0.18, visorY, 1.5).fill({ color: visorGlow, alpha: 0.6 * pAlpha });

    // Helmet crest (pointed peak on top)
    g.moveTo(ppx - R * 0.15, ppy - R * 0.7);
    g.lineTo(ppx, ppy - R * 1.1 - sunBright * 2);
    g.lineTo(ppx + R * 0.15, ppy - R * 0.7);
    g.fill({ color: playerCol, alpha: 0.5 * pAlpha });

    // Sun emblem on chest (golden circle with rays, pulses with sun power)
    const emblemR = R * 0.22;
    const emblemGlow = 0.2 + sunBright * 0.5;
    g.circle(ppx, ppy + R * 0.1, emblemR + 2).fill({ color: IGB.COLOR_SUN, alpha: emblemGlow * 0.08 * pAlpha });
    g.circle(ppx, ppy + R * 0.1, emblemR).fill({ color: IGB.COLOR_SUN, alpha: emblemGlow * 0.3 * pAlpha });
    // Tiny rays from emblem
    for (let ei = 0; ei < 6; ei++) {
      const ea = (Math.PI * 2 * ei) / 6 + s.gameTime * 2;
      g.moveTo(ppx + Math.cos(ea) * emblemR, ppy + R * 0.1 + Math.sin(ea) * emblemR);
      g.lineTo(ppx + Math.cos(ea) * (emblemR + 2.5), ppy + R * 0.1 + Math.sin(ea) * (emblemR + 2.5));
      g.stroke({ color: IGB.COLOR_SUN, width: 0.5, alpha: emblemGlow * 0.35 * pAlpha });
    }

    // Pentangle on body (below emblem, subtler)
    this._drawMiniPentangle(g, ppx, ppy + R * 0.35, R * 0.35, sunBright, pAlpha * 0.6);

    // Sword arm (in aim direction) — enhanced with guard and glow
    const swordLen = R + 10 + sunBright * 4;
    const sx1 = ppx + s.aimDirX * R * 0.6, sy1 = ppy + s.aimDirY * R * 0.6;
    const sx2 = ppx + s.aimDirX * swordLen, sy2 = ppy + s.aimDirY * swordLen;
    // Sword glow (faint light along blade)
    g.moveTo(sx1, sy1); g.lineTo(sx2, sy2);
    g.stroke({ color: playerCol, width: 4, alpha: 0.06 * pAlpha });
    // Blade
    g.moveTo(sx1, sy1); g.lineTo(sx2, sy2);
    g.stroke({ color: _lerpColor(0x999999, playerCol, 0.5), width: 2.2, alpha: 0.75 * pAlpha });
    // Blade highlight edge
    const bladePerp = { x: -s.aimDirY, y: s.aimDirX };
    g.moveTo(sx1 + bladePerp.x * 0.5, sy1 + bladePerp.y * 0.5);
    g.lineTo(sx2 + bladePerp.x * 0.3, sy2 + bladePerp.y * 0.3);
    g.stroke({ color: 0xffffff, width: 0.5, alpha: 0.15 * pAlpha });
    // Crossguard
    const guardX = ppx + s.aimDirX * R * 0.65, guardY = ppy + s.aimDirY * R * 0.65;
    g.moveTo(guardX - bladePerp.x * 4, guardY - bladePerp.y * 4);
    g.lineTo(guardX + bladePerp.x * 4, guardY + bladePerp.y * 4);
    g.stroke({ color: playerCol, width: 2, alpha: 0.5 * pAlpha });
    // Sword tip ember
    g.circle(sx2, sy2, 2.5).fill({ color: playerCol, alpha: 0.7 * pAlpha });
    if (sunBright > 0.5) g.circle(sx2, sy2, 1.5).fill({ color: 0xffffff, alpha: 0.3 * pAlpha });

    // Dash trail (more ghostly)
    if (s.dashTimer > 0) {
      for (let i = 1; i <= 4; i++) {
        const t = i * 0.012;
        g.circle(ppx - s.pvx * t, ppy - s.pvy * t, R * (0.85 - i * 0.12)).fill({ color: IGB.COLOR_GOLD, alpha: 0.2 / i });
      }
    }

    // Riposte flash
    if (s.riposteFlashTimer > 0) {
      const ripAlpha = s.riposteFlashTimer / 0.3;
      g.circle(ppx, ppy, R + 18).stroke({ color: IGB.COLOR_RIPOSTE, width: 3, alpha: ripAlpha * 0.6 });
      g.circle(ppx, ppy, R + 12).fill({ color: IGB.COLOR_RIPOSTE, alpha: ripAlpha * 0.1 });
    }

    // Riposte window indicator (brief white flash on shield start)
    if (s.riposteWindow > 0 && s.shielding) {
      const rwAlpha = s.riposteWindow / IGB.RIPOSTE_WINDOW;
      g.circle(ppx, ppy, R + 14).stroke({ color: 0xffffff, width: 1, alpha: rwAlpha * 0.4 });
    }

    // Orbital Blades
    const bladeStacks = s.perkCounts[PerkId.ORBITAL_BLADES] ?? 0;
    if (bladeStacks > 0) {
      const bladeTotal = bladeStacks + 1;
      for (let bi = 0; bi < bladeTotal; bi++) {
        const ba = s.orbitalAngle + (Math.PI * 2 * bi) / bladeTotal;
        const bx = ppx + Math.cos(ba) * IGB.ORBITAL_BLADE_RADIUS;
        const by = ppy + Math.sin(ba) * IGB.ORBITAL_BLADE_RADIUS;
        // Blade trail
        const trailAngle = ba - 0.3;
        g.moveTo(ppx + Math.cos(trailAngle) * IGB.ORBITAL_BLADE_RADIUS, ppy + Math.sin(trailAngle) * IGB.ORBITAL_BLADE_RADIUS);
        g.lineTo(bx, by);
        g.stroke({ color: IGB.COLOR_ORBITAL, width: 2, alpha: 0.15 });
        // Blade glow
        g.circle(bx, by, 5).fill({ color: IGB.COLOR_ORBITAL, alpha: 0.12 });
        // Blade core (diamond shape)
        const perpX = -Math.sin(ba), perpY = Math.cos(ba);
        g.moveTo(bx + Math.cos(ba) * 4, by + Math.sin(ba) * 4);
        g.lineTo(bx + perpX * 3, by + perpY * 3);
        g.lineTo(bx - Math.cos(ba) * 4, by - Math.sin(ba) * 4);
        g.lineTo(bx - perpX * 3, by - perpY * 3);
        g.fill({ color: IGB.COLOR_ORBITAL, alpha: 0.85 });
        // Inner glow
        g.circle(bx, by, 2).fill({ color: 0xffffff, alpha: 0.4 });
      }
      // Orbit ring (faint)
      g.circle(ppx, ppy, IGB.ORBITAL_BLADE_RADIUS).stroke({ color: IGB.COLOR_ORBITAL, width: 0.5, alpha: 0.08 });
    }

    // Ready indicators
    if (s.solarFlareReady) g.circle(ppx, ppy, R + 20).stroke({ color: IGB.COLOR_SOLAR_FLARE, width: 1.5, alpha: 0.4 + 0.3 * Math.sin(s.gameTime * 8) });
    if (s.pentangleSynergyReady) g.circle(ppx, ppy, R + 24).stroke({ color: IGB.COLOR_PENTANGLE_BURST, width: 1.5, alpha: 0.3 + 0.3 * Math.sin(s.gameTime * 6) });
  }

  // =========================================================================
  // ENEMY DRAWING
  // =========================================================================

  private _drawGreenKnight(g: Graphics, e: Enemy, shX: number, shY: number, time: number, alpha: number, col: number): void {
    const ex = e.x + shX, ey = e.y + shY, R = e.radius;
    if (e.spawnFlash > 0) g.circle(ex, ey, R + 25).fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: e.spawnFlash * 0.3 });
    // Charge telegraph
    if (e.charging) {
      g.moveTo(ex, ey); g.lineTo(e.chargeTargetX + shX, e.chargeTargetY + shY);
      g.stroke({ color: 0xff4444, width: 2, alpha: 0.4 + 0.3 * Math.sin(time * 15) });
      for (let i = 1; i <= 4; i++) g.circle(ex - e.vx * i * 0.01, ey - e.vy * i * 0.01, R * (0.8 - i * 0.12)).fill({ color: 0x116611, alpha: 0.15 / i });
    }
    if (!e.charging && e.chargeCd < 2.0 && e.chargeCd > 0) g.circle(ex, ey, R + 14).stroke({ color: 0xff4444, width: 1.5, alpha: 0.3 + 0.3 * Math.sin(time * 12) });
    if (e.slamTimer > 0) g.circle(ex, ey, R + 10).fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: 0.2 * (0.5 + 0.5 * Math.sin(time * 20)) });
    // Dark aura (layered)
    g.circle(ex, ey, R + 8).fill({ color: 0x0a2a0a, alpha: 0.2 * alpha });
    g.circle(ex, ey, R + 4).fill({ color: 0x115511, alpha: 0.25 * alpha });
    // Body
    g.circle(ex, ey, R).fill({ color: col, alpha: 0.85 * alpha });
    // Helm cross
    g.moveTo(ex - R * 0.4, ey); g.lineTo(ex + R * 0.4, ey);
    g.moveTo(ex, ey - R * 0.4); g.lineTo(ex, ey + R * 0.4);
    g.stroke({ color: 0x88ff88, width: 2, alpha: 0.35 * alpha });
    // Rotating crown
    for (let i = 0; i < 5; i++) {
      const a = (Math.PI * 2 * i) / 5 - Math.PI / 2 + time * 0.8;
      g.circle(ex + Math.cos(a) * (R + 9), ey + Math.sin(a) * (R + 9), 3.5).fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: 0.85 * alpha });
    }
    // Glowing red eyes
    const eo = R * 0.28;
    g.circle(ex - eo, ey - eo * 0.3, 3.5).fill({ color: 0xff3333, alpha: 0.9 * alpha });
    g.circle(ex + eo, ey - eo * 0.3, 3.5).fill({ color: 0xff3333, alpha: 0.9 * alpha });
    g.circle(ex - eo, ey - eo * 0.3, 2).fill({ color: 0xffaaaa, alpha: 0.4 * alpha });
    g.circle(ex + eo, ey - eo * 0.3, 2).fill({ color: 0xffaaaa, alpha: 0.4 * alpha });

    // Green fire axe (weapon arm in movement direction)
    const weapDirX = e.vx, weapDirY = e.vy;
    const weapLen2 = Math.sqrt(weapDirX * weapDirX + weapDirY * weapDirY);
    if (weapLen2 > 1) {
      const wnx = weapDirX / weapLen2, wny = weapDirY / weapLen2;
      const axeLen = R + 12;
      const axeTipX = ex + wnx * axeLen, axeTipY = ey + wny * axeLen;
      // Axe handle
      g.moveTo(ex + wnx * R * 0.5, ey + wny * R * 0.5);
      g.lineTo(axeTipX, axeTipY);
      g.stroke({ color: 0x556633, width: 2, alpha: 0.6 * alpha });
      // Axe head (perpendicular triangle)
      const perpX = -wny, perpY = wnx;
      g.moveTo(axeTipX + perpX * 5, axeTipY + perpY * 5);
      g.lineTo(axeTipX + wnx * 4, axeTipY + wny * 4);
      g.lineTo(axeTipX - perpX * 5, axeTipY - perpY * 5);
      g.fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: 0.7 * alpha });
      // Green fire on axe head
      const fireFlicker = 0.5 + 0.5 * Math.sin(time * 12);
      g.circle(axeTipX, axeTipY, 4 + fireFlicker * 2).fill({ color: 0x44ff44, alpha: 0.15 * alpha });
      g.circle(axeTipX, axeTipY, 2 + fireFlicker).fill({ color: 0x88ff88, alpha: 0.25 * alpha });
    }

    // Breathing green fire aura (subtle ambient particles around boss)
    const auraColor = e.enraged ? IGB.COLOR_ENRAGE : 0x44ff44;
    for (let fi = 0; fi < (e.enraged ? 8 : 4); fi++) {
      const fa = time * (e.enraged ? 2.5 : 1.5) + fi * (e.enraged ? 0.78 : 1.57);
      const fDist = R + 4 + Math.sin(time * 3 + fi) * (e.enraged ? 6 : 4);
      const fx = ex + Math.cos(fa) * fDist, fy = ey + Math.sin(fa) * fDist - Math.sin(time * 4 + fi) * 3;
      g.circle(fx, fy, 1.5 + Math.sin(time * 5 + fi * 2) * (e.enraged ? 1 : 0.5)).fill({ color: auraColor, alpha: (e.enraged ? 0.2 : 0.12) * alpha });
    }

    // Enrage visual — red pulsing aura and crackling energy
    if (e.enraged) {
      const enragePulse = 0.4 + 0.3 * Math.sin(time * 8);
      g.circle(ex, ey, R + 14).fill({ color: IGB.COLOR_ENRAGE, alpha: enragePulse * 0.08 * alpha });
      g.circle(ex, ey, R + 10).stroke({ color: IGB.COLOR_ENRAGE, width: 2, alpha: enragePulse * 0.4 * alpha });
      // Red eyes override
      const eo2 = R * 0.28;
      g.circle(ex - eo2, ey - eo2 * 0.3, 4.5).fill({ color: 0xff0000, alpha: enragePulse * alpha });
      g.circle(ex + eo2, ey - eo2 * 0.3, 4.5).fill({ color: 0xff0000, alpha: enragePulse * alpha });
    }
  }

  private _drawRegularEnemy(g: Graphics, e: Enemy, shX: number, shY: number, time: number, alpha: number, col: number): void {
    const ex = e.x + shX, ey = e.y + shY, R = e.radius;
    if (e.spawnFlash > 0) g.circle(ex, ey, R + 8).fill({ color: e.color, alpha: e.spawnFlash * 0.25 });

    // Movement trail for fast enemies
    const spd2 = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
    if (spd2 > 120 && alpha > 0.3) {
      const tnx = e.vx / spd2, tny = e.vy / spd2;
      g.circle(ex - tnx * 8, ey - tny * 8, R * 0.65).fill({ color: e.color, alpha: 0.07 * alpha });
      if (spd2 > 200) g.circle(ex - tnx * 14, ey - tny * 14, R * 0.45).fill({ color: e.color, alpha: 0.04 * alpha });
    }

    // Outer aura
    g.circle(ex, ey, R + 3).fill({ color: e.color, alpha: 0.1 * alpha });

    // Type-specific body shapes
    if (e.kind === EnemyKind.WRAITH) {
      // Wraith — ghostly teardrop shape
      g.circle(ex, ey - R * 0.15, R).fill({ color: col, alpha: 0.6 * alpha });
      g.moveTo(ex - R * 0.6, ey + R * 0.3); g.lineTo(ex, ey + R * 1.2); g.lineTo(ex + R * 0.6, ey + R * 0.3);
      g.fill({ color: col, alpha: 0.35 * alpha }); // tail
      if (e.phaseTimer > 0) {
        for (let gi = 1; gi <= 3; gi++) { const ga = time * 5 + gi * 2; g.circle(ex + Math.cos(ga) * 7, ey + Math.sin(ga) * 7, R * 0.6).fill({ color: e.color, alpha: 0.06 }); }
      }
    } else if (e.kind === EnemyKind.DARK_KNIGHT) {
      // Dark Knight — angular body with shield in movement direction
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.7 * alpha });
      const sz = R * 0.5;
      g.rect(ex - sz, ey - sz, sz * 2, sz * 2).fill({ color: 0x222244, alpha: 0.35 * alpha });
      // Shield held in front (movement direction)
      const dkSpeed = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (dkSpeed > 1) {
        const dnx = e.vx / dkSpeed, dny = e.vy / dkSpeed;
        const shieldDist = R + 3;
        const shieldPx = -dny, shieldPy = dnx; // perpendicular
        const sx = ex + dnx * shieldDist, sy = ey + dny * shieldDist;
        // Shield arc (3 segments perpendicular to movement)
        g.moveTo(sx + shieldPx * 5, sy + shieldPy * 5);
        g.lineTo(sx + dnx * 3, sy + dny * 3);
        g.lineTo(sx - shieldPx * 5, sy - shieldPy * 5);
        g.stroke({ color: 0x6666aa, width: 2.5, alpha: 0.5 * alpha });
      } else {
        // Static shield chevron
        g.moveTo(ex - R * 0.4, ey - R * 0.3); g.lineTo(ex, ey + R * 0.4); g.lineTo(ex + R * 0.4, ey - R * 0.3);
        g.stroke({ color: 0x6666aa, width: 1, alpha: 0.4 * alpha });
      }
    } else if (e.kind === EnemyKind.SHADE) {
      // Shade — small, wispy, rapid
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.55 * alpha });
      const ta = time * 5 + e.circleAngle;
      g.circle(ex + Math.cos(ta) * 5, ey + Math.sin(ta) * 5, R * 0.5).fill({ color: e.color, alpha: 0.15 * alpha });
      g.circle(ex + Math.cos(ta + 2) * 4, ey + Math.sin(ta + 2) * 4, R * 0.4).fill({ color: e.color, alpha: 0.1 * alpha });
    } else if (e.kind === EnemyKind.SPECTER) {
      // Specter — ringed, arcane
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.65 * alpha });
      g.circle(ex, ey, R + 5).stroke({ color: 0x7777cc, width: 1.5, alpha: 0.3 * alpha });
      g.circle(ex, ey, R + 8).stroke({ color: 0x5555aa, width: 0.5, alpha: 0.15 * alpha });
      // Arcane diamond in center
      g.moveTo(ex, ey - R * 0.35); g.lineTo(ex + R * 0.25, ey); g.lineTo(ex, ey + R * 0.35); g.lineTo(ex - R * 0.25, ey);
      g.fill({ color: 0x8888dd, alpha: 0.25 * alpha });
      // Charging glow when about to fire (shootTimer near 0)
      if (e.shootTimer < 0.5 && e.shootTimer > 0) {
        const chgA = (0.5 - e.shootTimer) * 2; // 0→1 as firing approaches
        g.circle(ex, ey, R + 3 + chgA * 6).fill({ color: 0x6666cc, alpha: chgA * 0.2 * alpha });
        // Orbiting charge sparks
        for (let ci = 0; ci < 3; ci++) {
          const ca = time * 8 + ci * 2.1;
          g.circle(ex + Math.cos(ca) * (R + 4), ey + Math.sin(ca) * (R + 4), 1.5).fill({ color: 0x8888ff, alpha: chgA * 0.5 * alpha });
        }
      }
    } else if (e.kind === EnemyKind.REVENANT) {
      // Revenant — cracked, bone-like
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.65 * alpha });
      // Skull
      g.circle(ex, ey - R * 0.1, R * 0.4).fill({ color: 0xddcc99, alpha: 0.45 * alpha });
      // Crack lines
      g.moveTo(ex - R * 0.3, ey - R * 0.2); g.lineTo(ex + R * 0.1, ey + R * 0.3);
      g.moveTo(ex + R * 0.2, ey - R * 0.3); g.lineTo(ex - R * 0.1, ey + R * 0.2);
      g.stroke({ color: 0x443322, width: 0.8, alpha: 0.3 * alpha });
      if (e.splitCount > 0) g.circle(ex, ey, R + 4).stroke({ color: IGB.COLOR_REVENANT, width: 1, alpha: 0.25 * alpha });
    } else if (e.kind === EnemyKind.BANSHEE) {
      // Banshee — ghostly, translucent with flowing wisps
      g.circle(ex, ey, R + 5).fill({ color: IGB.COLOR_BANSHEE, alpha: 0.06 * alpha });
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.5 * alpha });
      // Wispy tendrils (flowing downward/outward)
      for (let wi = 0; wi < 4; wi++) {
        const wa = time * 2 + wi * 1.57;
        const wDist = R + 3 + Math.sin(time * 3 + wi) * 5;
        const wx = ex + Math.cos(wa) * wDist;
        const wy = ey + Math.sin(wa) * wDist + Math.sin(time * 4 + wi) * 3;
        g.circle(wx, wy, 2).fill({ color: IGB.COLOR_BANSHEE, alpha: 0.2 * alpha });
      }
      // Open mouth (screaming)
      if (e.screamCd < 1.0) {
        const mouthOpen = (1.0 - e.screamCd) * 3;
        g.circle(ex, ey + R * 0.2, 2 + mouthOpen).fill({ color: 0x220033, alpha: 0.6 * alpha });
        // Scream charge ring
        g.circle(ex, ey, R + 8 + mouthOpen * 4).stroke({ color: IGB.COLOR_FEAR, width: 1, alpha: 0.2 + mouthOpen * 0.1 });
      }
      // Glowing purple eyes
      const beo = R * 0.3;
      g.circle(ex - beo, ey - beo * 0.3, 2.5).fill({ color: 0xdd88ff, alpha: 0.8 * alpha });
      g.circle(ex + beo, ey - beo * 0.3, 2.5).fill({ color: 0xdd88ff, alpha: 0.8 * alpha });
    } else {
      g.circle(ex, ey, R).fill({ color: col, alpha: 0.7 * alpha });
    }

    // Shielded modifier
    if (e.shieldedTimer > 0) {
      const sp = 0.4 + 0.2 * Math.sin(time * 6);
      g.circle(ex, ey, R + 6).stroke({ color: 0x4488cc, width: 2, alpha: sp * alpha });
      g.circle(ex, ey, R + 3).fill({ color: 0x4488cc, alpha: 0.06 * alpha });
    }

    // Eyes (Banshee draws its own eyes above)
    if (e.kind !== EnemyKind.BANSHEE) {
      const eo = R * 0.33;
      const eyeCol = e.kind === EnemyKind.WRAITH ? 0xddddff : e.kind === EnemyKind.DARK_KNIGHT ? 0x8888cc : 0xccccff;
      g.circle(ex - eo, ey - eo * 0.4, 2).fill({ color: eyeCol, alpha: 0.8 * alpha });
      g.circle(ex + eo, ey - eo * 0.4, 2).fill({ color: eyeCol, alpha: 0.8 * alpha });
    }
  }

  // =========================================================================
  // SUN ARC
  // =========================================================================

  private _drawSunArc(g: Graphics, sw: number, sh: number, sunPhase: number, sunBright: number): void {
    const arcY = 38, arcW = sw * 0.7, arcStartX = (sw - arcW) / 2;
    // Arc path
    g.moveTo(arcStartX, arcY);
    for (let t = 0; t <= 1; t += 0.02) g.lineTo(arcStartX + t * arcW, arcY - Math.sin(t * Math.PI) * 28);
    g.stroke({ color: 0x554422, width: 1, alpha: 0.25 });

    const sunX = arcStartX + sunPhase * arcW, sunY = arcY - Math.sin(sunPhase * Math.PI) * 28;
    const sunR = 6 + sunBright * 8, sunCol = _lerpColor(IGB.COLOR_MOON, IGB.COLOR_SUN, sunBright);

    // Multi-layer sun glow
    g.circle(sunX, sunY, sunR + 18).fill({ color: sunCol, alpha: 0.03 });
    g.circle(sunX, sunY, sunR + 10).fill({ color: sunCol, alpha: 0.08 });
    g.circle(sunX, sunY, sunR + 4).fill({ color: sunCol, alpha: 0.18 });
    g.circle(sunX, sunY, sunR).fill({ color: sunCol, alpha: 0.92 });
    // Hot core
    g.circle(sunX, sunY, sunR * 0.5).fill({ color: 0xffffff, alpha: sunBright * 0.3 });

    // Rays (animated rotation)
    if (sunBright > 0.35) {
      const rayAlpha = (sunBright - 0.35) * 0.5;
      const numRays = sunBright > 0.7 ? 16 : 10;
      for (let i = 0; i < numRays; i++) {
        const a = (Math.PI * 2 * i) / numRays + sunPhase * 0.5; // subtle rotation
        const rayLen = sunR + 6 + sunBright * 10 + Math.sin(a * 3) * 3;
        g.moveTo(sunX + Math.cos(a) * (sunR + 1), sunY + Math.sin(a) * (sunR + 1));
        g.lineTo(sunX + Math.cos(a) * rayLen, sunY + Math.sin(a) * rayLen);
        g.stroke({ color: IGB.COLOR_SUN, width: i % 2 === 0 ? 1.5 : 1, alpha: rayAlpha });
      }
    }
  }

  // =========================================================================
  // PENTANGLE HELPERS
  // =========================================================================

  private _drawPentangle(g: Graphics, cx: number, cy: number, r: number, sunBright: number, time: number, overrideAlpha?: number): void {
    const alpha = overrideAlpha ?? (0.06 + sunBright * 0.08);
    const rot = time * 0.03;
    const pts: [number, number][] = [];
    for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2 + rot; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    const ord = [0, 2, 4, 1, 3, 0];
    g.moveTo(pts[ord[0]][0], pts[ord[0]][1]);
    for (let i = 1; i < ord.length; i++) g.lineTo(pts[ord[i]][0], pts[ord[i]][1]);
    g.stroke({ color: IGB.COLOR_GOLD, width: overrideAlpha ? 2 : 1, alpha });
    g.circle(cx, cy, r + 2).stroke({ color: IGB.COLOR_GOLD, width: 0.5, alpha: alpha * 0.6 });
    // Vertex dots
    if (alpha > 0.08) {
      for (const p of pts) g.circle(p[0], p[1], 2).fill({ color: IGB.COLOR_GOLD, alpha: alpha * 0.8 });
    }
  }

  private _drawMiniPentangle(g: Graphics, cx: number, cy: number, r: number, sunBright: number, pAlpha: number): void {
    const alpha = (0.3 + sunBright * 0.5) * pAlpha;
    const pts: [number, number][] = [];
    for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2; pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
    const ord = [0, 2, 4, 1, 3, 0];
    g.moveTo(pts[ord[0]][0], pts[ord[0]][1]);
    for (let i = 1; i < ord.length; i++) g.lineTo(pts[ord[i]][0], pts[ord[i]][1]);
    g.stroke({ color: IGB.COLOR_GOLD, width: 0.8, alpha });
  }

  // =========================================================================
  // HUD SCREENS
  // =========================================================================

  private _renderStartScreen(s: IgwaineState, cx: number, sh: number, g: Graphics): void {
    const ui = this._uiGfx;

    // Animated large pentangle behind title
    const titlePentR = 70;
    const titlePentY = sh * 0.12;
    const trot = s.gameTime * 0.15;
    const tpts: [number, number][] = [];
    for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2 + trot; tpts.push([cx + Math.cos(a) * titlePentR, titlePentY + Math.sin(a) * titlePentR]); }
    const tord = [0, 2, 4, 1, 3, 0];
    ui.moveTo(tpts[tord[0]][0], tpts[tord[0]][1]);
    for (let ti = 1; ti < tord.length; ti++) ui.lineTo(tpts[tord[ti]][0], tpts[tord[ti]][1]);
    ui.stroke({ color: IGB.COLOR_GOLD, width: 1.5, alpha: 0.1 + 0.05 * Math.sin(s.gameTime * 2) });
    ui.circle(cx, titlePentY, titlePentR + 3).stroke({ color: IGB.COLOR_GOLD, width: 0.5, alpha: 0.06 });
    // Vertex sparkles
    for (const p of tpts) ui.circle(p[0], p[1], 2).fill({ color: IGB.COLOR_GOLD, alpha: 0.15 });

    // Floating golden particles on start screen
    for (let pi = 0; pi < 15; pi++) {
      const px = ((pi * 193 + 30) % 1000) / 1000 * (cx * 2);
      const py2 = ((pi * 307 + 70) % 1000) / 1000 * sh;
      const pdrift = Math.sin(s.gameTime * 0.4 + pi * 1.7) * 15;
      const pbob = Math.cos(s.gameTime * 0.6 + pi * 0.8) * 10;
      const plife = (Math.sin(s.gameTime * 0.7 + pi * 2.3) + 1) * 0.5;
      ui.circle(px + pdrift, py2 + pbob, 1.5).fill({ color: IGB.COLOR_GOLD, alpha: plife * 0.1 });
    }

    this._title.visible = true; this._sub.visible = true; this._controls.visible = true; this._prompt.visible = true;
    this._title.anchor.set(0.5); this._title.position.set(cx, sh * 0.10);
    this._sub.anchor.set(0.5); this._sub.position.set(cx, sh * 0.10 + 55);
    this._controls.anchor.set(0.5); this._controls.position.set(cx, sh * 0.38);

    // Difficulty selector with colored boxes
    const diffs = [Difficulty.EASY, Difficulty.NORMAL, Difficulty.HARD];
    const diffY = sh * 0.65;
    for (let di = 0; di < 3; di++) {
      const d = diffs[di], ds = DIFFICULTY_SETTINGS[d];
      const dx = cx - 120 + di * 120;
      const selected = s.difficulty === d;
      ui.rect(dx - 45, diffY - 14, 90, 28).fill({ color: selected ? ds.color : 0x111118, alpha: selected ? 0.3 : 0.5 });
      ui.rect(dx - 45, diffY - 14, 90, 28).stroke({ color: ds.color, width: selected ? 2.5 : 1, alpha: selected ? 0.9 : 0.3 });
    }
    this._comboText.visible = true; this._comboText.anchor.set(0.5); this._comboText.position.set(cx, diffY - 28);
    this._comboText.text = "DIFFICULTY"; this._comboText.style.fill = 0x888888; this._comboText.alpha = 0.7;
    this._virtueText.visible = true; this._virtueText.anchor.set(0.5); this._virtueText.position.set(cx, diffY);
    this._virtueText.text = `[1] EASY      [2] NORMAL      [3] HARD`;

    this._prompt.anchor.set(0.5); this._prompt.position.set(cx, sh * 0.78);
    this._prompt.text = "Press ENTER to begin";
    if (s.bestWave > 0) {
      this._stats.visible = true; this._stats.anchor.set(0.5); this._stats.position.set(cx, sh * 0.88);
      this._stats.text = `Best: Wave ${s.bestWave}  |  Score: ${s.bestScore}`;
    }
  }

  private _renderPlayingHUD(s: IgwaineState, ui: Graphics, sw: number, sh: number, cx: number, cy: number, sunBright: number, sunPow: number, isEclipse: boolean): void {
    this._hudL.visible = true; this._hudR.visible = true;
    this._hudL.position.set(12, 8); this._hudR.position.set(sw - 12, 8); this._hudR.anchor.set(1, 0);

    // HUD backdrop panel
    const barW = 170, barH = 8, barX = 12;
    ui.rect(barX - 4, 24, barW + 8, 48).fill({ color: 0x000000, alpha: 0.2 });
    ui.rect(barX - 4, 24, barW + 8, 48).stroke({ color: 0x333333, width: 0.5, alpha: 0.15 });

    // HP bar with cross icon
    ui.rect(barX - 1, 27, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.3 });
    ui.rect(barX, 28, barW, barH).fill({ color: 0x331111, alpha: 0.7 });
    const hpPct = Math.max(0, s.hp / s.maxHp);
    ui.rect(barX, 28, barW * hpPct, barH).fill({ color: hpPct > 0.3 ? IGB.COLOR_HP : 0xff2222, alpha: 0.9 });
    ui.rect(barX, 28, barW * hpPct, 2).fill({ color: 0xffffff, alpha: 0.08 });
    // Low HP pulse on bar
    if (hpPct < 0.3 && hpPct > 0) {
      const hpPulse = 0.3 + 0.3 * Math.sin(s.gameTime * 6);
      ui.rect(barX, 28, barW * hpPct, barH).fill({ color: 0xff0000, alpha: hpPulse * 0.3 });
    }

    // Energy bar with diamond icon
    ui.rect(barX - 1, 39, barW + 2, barH + 2).fill({ color: 0x000000, alpha: 0.3 });
    ui.rect(barX, 40, barW, barH).fill({ color: 0x111133, alpha: 0.7 });
    const enPct = Math.max(0, s.energy / s.maxEnergy);
    ui.rect(barX, 40, barW * enPct, barH).fill({ color: IGB.COLOR_ENERGY, alpha: 0.9 });
    ui.rect(barX, 40, barW * enPct, 2).fill({ color: 0xffffff, alpha: 0.06 });

    // Dash + Flare + XP compact bars
    const cdY = 52;
    const dashPct = s.dashCd > 0 ? 1 - s.dashCd / IGB.DASH_CD : 1;
    ui.rect(barX, cdY, barW * 0.4, 3).fill({ color: 0x222222, alpha: 0.5 });
    ui.rect(barX, cdY, barW * 0.4 * dashPct, 3).fill({ color: dashPct >= 1 ? IGB.COLOR_GOLD : 0x665522, alpha: 0.7 });
    const flarePct = s.solarFlareCd > 0 ? 1 - s.solarFlareCd / IGB.SOLAR_FLARE_CD : 1;
    ui.rect(barX, cdY + 5, barW * 0.4, 3).fill({ color: 0x222222, alpha: 0.5 });
    ui.rect(barX, cdY + 5, barW * 0.4 * flarePct, 3).fill({ color: s.solarFlareReady ? IGB.COLOR_SOLAR_FLARE : (flarePct >= 1 ? 0x886622 : 0x443311), alpha: 0.7 });
    // XP bar
    const totalForLevel = IGB.KILLS_PER_LEVEL + s.level * 2;
    const xpPct = Math.max(0, Math.min(1, (totalForLevel - s.killsToLevel) / totalForLevel));
    ui.rect(barX, cdY + 10, barW * 0.6, 3).fill({ color: 0x222222, alpha: 0.5 });
    ui.rect(barX, cdY + 10, barW * 0.6 * xpPct, 3).fill({ color: IGB.COLOR_GOLD, alpha: 0.8 });

    this._hudL.text = `HP: ${Math.ceil(s.hp)}/${s.maxHp}`;
    this._hudR.text = `Wave ${s.wave}  |  Lv${s.level}  |  Score: ${s.score}  |  Kills: ${s.kills}`;

    // Solar indicator
    this._solarHud.visible = true; this._solarHud.anchor.set(0.5, 0); this._solarHud.position.set(cx, 8);
    let solarText = isEclipse ? "ECLIPSE" : `Solar: ${sunPow.toFixed(1)}x`;
    if (s.goldenHourTimer > 0) solarText += "  GOLDEN HOUR!";
    if (s.fearTimer > 0) solarText += "  FEARED!";
    this._solarHud.text = solarText;
    this._solarHud.style.fill = s.goldenHourTimer > 0 ? IGB.COLOR_GOLDEN_HOUR : isEclipse ? IGB.COLOR_ECLIPSE : (s.fearTimer > 0 ? IGB.COLOR_FEAR : _lerpColor(IGB.COLOR_MOON, IGB.COLOR_GOLD, sunBright));

    // Combo
    if (s.combo >= 2) {
      this._comboText.visible = true; this._comboText.anchor.set(0.5, 0); this._comboText.position.set(cx, 30);
      this._comboText.text = `${s.combo}x COMBO`; this._comboText.alpha = 0.7 + 0.3 * Math.sin(s.gameTime * 10);
      this._comboText.style.fill = s.combo >= 10 ? 0xff4444 : s.combo >= 5 ? IGB.COLOR_COMBO : 0xddaa44;
    }

    // Kill streak
    if (s.streakTextTimer > 0 && s.streakText) {
      this._waveText.visible = true; this._waveText.anchor.set(0.5); this._waveText.position.set(cx, sh * 0.28);
      this._waveText.text = s.streakText; this._waveText.style.fill = s.streakCount >= 5 ? 0xff4444 : IGB.COLOR_COMBO;
      this._waveText.alpha = Math.min(1, s.streakTextTimer * 1.5);
    }

    // Virtues
    this._virtueText.visible = true; this._virtueText.position.set(12, 72);
    let vStr = "";
    for (const v of Object.values(Virtue)) if (s.virtues[v] > 0) vStr += `${v}: ${s.virtues[v]}\n`;
    if (s.activeSynergies.length > 0) vStr += "\n" + s.activeSynergies.map(syn => `[${syn}]`).join(" ");
    if (vStr) this._virtueText.text = vStr; else this._virtueText.visible = false;

    // Wave announce with decorative borders
    if (s.waveAnnounceTimer > 0) {
      const waAlpha = Math.min(1, s.waveAnnounceTimer * 2);
      const isBoss = s.wave % IGB.GREEN_KNIGHT_WAVE_INTERVAL === 0;
      const waColor = isBoss ? IGB.COLOR_GREEN_KNIGHT : IGB.COLOR_GOLD;
      const waY = sh * 0.35;
      // Banner background
      ui.rect(cx - 180, waY - 20, 360, 40).fill({ color: 0x000000, alpha: 0.35 * waAlpha });
      // Decorative horizontal lines
      ui.rect(cx - 160, waY - 18, 320, 1).fill({ color: waColor, alpha: 0.3 * waAlpha });
      ui.rect(cx - 160, waY + 17, 320, 1).fill({ color: waColor, alpha: 0.3 * waAlpha });
      // Corner dots
      for (const [dx2, dy2] of [[-165, -18], [165, -18], [-165, 17], [165, 17]]) {
        ui.circle(cx + dx2, waY + dy2, 2).fill({ color: waColor, alpha: 0.5 * waAlpha });
      }

      this._waveText.visible = true; this._waveText.anchor.set(0.5); this._waveText.position.set(cx, waY);
      this._waveText.text = isBoss ? `— WAVE ${s.wave} — THE GREEN KNIGHT —` : `— WAVE ${s.wave} —`;
      this._waveText.style.fill = waColor; this._waveText.style.fontSize = 32;
      this._waveText.alpha = waAlpha;
    }

    // Boss HP bar with name and decorations
    const boss = s.enemies.find(e => e.kind === EnemyKind.GREEN_KNIGHT);
    if (boss) {
      const bossBarW = sw * 0.45, bossBarH = 12, bossBarX = (sw - bossBarW) / 2, bossBarY = sh - 32;
      // Boss name label
      this._waveText.visible = true; this._waveText.anchor.set(0.5, 1); this._waveText.position.set(cx, bossBarY - 4);
      this._waveText.text = "THE GREEN KNIGHT"; this._waveText.style.fill = IGB.COLOR_GREEN_KNIGHT;
      this._waveText.style.fontSize = 13; this._waveText.alpha = 0.7;
      // Bar frame
      ui.rect(bossBarX - 2, bossBarY - 2, bossBarW + 4, bossBarH + 4).fill({ color: 0x000000, alpha: 0.45 });
      // Bar fill
      ui.rect(bossBarX, bossBarY, bossBarW, bossBarH).fill({ color: 0x0a1a0a, alpha: 0.85 });
      const bossHpPct = Math.max(0, boss.hp / boss.maxHp);
      ui.rect(bossBarX, bossBarY, bossBarW * bossHpPct, bossBarH).fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: 0.9 });
      // Regen shimmer
      ui.rect(bossBarX, bossBarY, bossBarW * bossHpPct, bossBarH).fill({ color: 0x88ff88, alpha: 0.15 + 0.1 * Math.sin(s.gameTime * 6) });
      // Highlight strip
      ui.rect(bossBarX, bossBarY, bossBarW * bossHpPct, 3).fill({ color: 0xffffff, alpha: 0.06 });
      // Frame border
      ui.rect(bossBarX - 2, bossBarY - 2, bossBarW + 4, bossBarH + 4).stroke({ color: IGB.COLOR_GREEN_KNIGHT, width: 1.5, alpha: 0.5 });
      // Corner diamonds
      const corners = [[bossBarX - 5, bossBarY + bossBarH / 2], [bossBarX + bossBarW + 5, bossBarY + bossBarH / 2]];
      for (const [dcx, dcy] of corners) {
        ui.moveTo(dcx, dcy - 4); ui.lineTo(dcx + 3, dcy); ui.lineTo(dcx, dcy + 4); ui.lineTo(dcx - 3, dcy);
        ui.fill({ color: IGB.COLOR_GREEN_KNIGHT, alpha: 0.6 });
      }
    }

    // Perk selection UI
    if (s.perkChoice) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.6 });
      // Radial glow behind
      ui.circle(cx, sh * 0.45, 200).fill({ color: IGB.COLOR_GOLD, alpha: 0.03 });

      this._waveText.visible = true; this._waveText.anchor.set(0.5); this._waveText.position.set(cx, sh * 0.18);
      this._waveText.text = `— LEVEL ${s.level} — CHOOSE A PERK —`; this._waveText.style.fill = IGB.COLOR_GOLD; this._waveText.style.fontSize = 28; this._waveText.alpha = 1;
      // Decorative lines under title
      ui.rect(cx - 120, sh * 0.18 + 20, 240, 1).fill({ color: IGB.COLOR_GOLD, alpha: 0.25 });

      const opts = s.perkChoice.options;
      for (let pi = 0; pi < opts.length; pi++) {
        const perk = opts[pi], py = sh * 0.28 + pi * 75;
        const boxW = 340, boxH = 60, boxX = cx - boxW / 2;
        // Card background
        ui.rect(boxX, py, boxW, boxH).fill({ color: 0x0a0a14, alpha: 0.92 });
        ui.rect(boxX, py, boxW, boxH).stroke({ color: perk.color, width: 1.5, alpha: 0.6 });
        // Left colored accent bar
        ui.rect(boxX, py, 4, boxH).fill({ color: perk.color, alpha: 0.7 });
        // Perk icon glow circle
        const iconX = boxX + 28, iconY = py + boxH / 2;
        ui.circle(iconX, iconY, 14).fill({ color: perk.color, alpha: 0.12 });
        ui.circle(iconX, iconY, 10).stroke({ color: perk.color, width: 1.5, alpha: 0.5 });
        // Number inside icon
        ui.circle(iconX, iconY, 8).fill({ color: perk.color, alpha: 0.15 });
        // Diamond sparkle on icon
        ui.moveTo(iconX, iconY - 6); ui.lineTo(iconX + 4, iconY); ui.lineTo(iconX, iconY + 6); ui.lineTo(iconX - 4, iconY);
        ui.fill({ color: perk.color, alpha: 0.25 });
      }

      this._prompt.visible = true; this._prompt.anchor.set(0.5); this._prompt.position.set(cx, sh * 0.28 + opts.length * 75 + 10);
      let perkStr = "";
      for (let pi = 0; pi < opts.length; pi++) perkStr += `[${pi + 1}] ${opts[pi].name} — ${opts[pi].desc}\n`;
      this._prompt.text = perkStr.trim(); this._prompt.alpha = 1; this._prompt.style.fontSize = 14;
      return;
    }

    // Minimap
    const mmR = 42, mmX = sw - mmR - 12, mmY = sh - mmR - 48;
    ui.circle(mmX, mmY, mmR + 1).fill({ color: 0x000000, alpha: 0.35 });
    ui.circle(mmX, mmY, mmR).stroke({ color: 0x444444, width: 1, alpha: 0.45 });
    const mmScale = mmR / IGB.ARENA_RADIUS;
    // Minimap arena border
    ui.circle(mmX, mmY, mmR - 1).stroke({ color: 0x333333, width: 0.5, alpha: 0.3 });
    ui.circle(mmX + (s.px - cx) * mmScale, mmY + (s.py - cy) * mmScale, 2.5).fill({ color: IGB.COLOR_PLAYER, alpha: 0.9 });
    for (const e of s.enemies) {
      const emx = mmX + (e.x - cx) * mmScale, emy = mmY + (e.y - cy) * mmScale;
      if (Math.sqrt((emx - mmX) ** 2 + (emy - mmY) ** 2) < mmR - 2) {
        ui.circle(emx, emy, e.kind === EnemyKind.GREEN_KNIGHT ? 3 : 1.5).fill({ color: e.kind === EnemyKind.GREEN_KNIGHT ? IGB.COLOR_GREEN_KNIGHT : e.color, alpha: 0.7 });
      }
    }
    // Hazards on minimap as arcs
    for (const h of s.hazards) {
      const hMidR = ((h.innerRadius + h.outerRadius) / 2) * mmScale;
      for (let hi = 0; hi < 4; hi++) {
        const ha = h.angle - h.arcWidth / 2 + (hi / 4) * h.arcWidth;
        ui.circle(mmX + Math.cos(ha) * hMidR, mmY + Math.sin(ha) * hMidR, 1.5).fill({ color: 0xff4411, alpha: 0.35 });
      }
    }
    // Minimap pentangle watermark
    const mmPentR = mmR * 0.4;
    for (let i = 0; i < 5; i++) {
      const a1 = (Math.PI * 2 * i) / 5 - Math.PI / 2;
      const a2 = (Math.PI * 2 * ((i + 2) % 5)) / 5 - Math.PI / 2;
      ui.moveTo(mmX + Math.cos(a1) * mmPentR, mmY + Math.sin(a1) * mmPentR);
      ui.lineTo(mmX + Math.cos(a2) * mmPentR, mmY + Math.sin(a2) * mmPentR);
      ui.stroke({ color: IGB.COLOR_GOLD, width: 0.3, alpha: 0.1 });
    }

    // Wave modifier
    if (s.waveModifier !== "none" && s.waveModifierText) this._solarHud.text += `  [${s.waveModifierText}]`;

    // Tutorial / hints
    if (s.wave <= 1 && s.gameTime < 5) { this._prompt.visible = true; this._prompt.anchor.set(0.5, 1); this._prompt.position.set(cx, sh - 12); this._prompt.text = "Arrow keys to attack  |  WASD to move"; this._prompt.alpha = 0.6; }
    else if (s.wave === 2 && s.waveAnnounceTimer > 0.5) { this._prompt.visible = true; this._prompt.anchor.set(0.5, 1); this._prompt.position.set(cx, sh - 12); this._prompt.text = "Hold arrow keys to charge a powerful shot"; this._prompt.alpha = 0.5; }
    else if (s.wave === 3 && s.waveAnnounceTimer > 0.5) { this._prompt.visible = true; this._prompt.anchor.set(0.5, 1); this._prompt.position.set(cx, sh - 12); this._prompt.text = "Space = Shield  |  Shift = Dash  |  Collect virtue orbs!"; this._prompt.alpha = 0.5; }
    else {
      let hint = "";
      if (s.solarFlareReady) hint = "R — Solar Flare Ready!";
      else if (s.pentangleSynergyReady) hint = "Pentangle Synergy active — collect a virtue!";
      if (hint) { this._prompt.visible = true; this._prompt.anchor.set(0.5, 1); this._prompt.position.set(cx, sh - 12); this._prompt.text = hint; this._prompt.alpha = 0.5 + 0.3 * Math.sin(s.gameTime * 6); }
    }
  }

  private _renderDeathScreen(s: IgwaineState, ui: Graphics, sw: number, sh: number, cx: number): void {
    // Dramatic dark overlay with radial fade
    ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
    // Blood-red radial vignette
    for (let vi = 0; vi < 4; vi++) {
      const vcx = vi % 2 === 0 ? 0 : sw, vcy = vi < 2 ? 0 : sh;
      ui.circle(vcx, vcy, 200).fill({ color: 0x220000, alpha: 0.15 });
    }
    // Broken pentangle behind title
    const pentR = 50;
    const pts: [number, number][] = [];
    for (let i = 0; i < 5; i++) { const a = (Math.PI * 2 * i) / 5 - Math.PI / 2; pts.push([cx + Math.cos(a) * pentR, sh * 0.22 + Math.sin(a) * pentR]); }
    const ord = [0, 2, 4, 1, 3, 0];
    // Draw broken (skip segments randomly based on score seed)
    for (let i = 0; i < ord.length - 1; i++) {
      if ((s.score + i * 17) % 3 !== 0) { // some segments missing = "broken"
        ui.moveTo(pts[ord[i]][0], pts[ord[i]][1]); ui.lineTo(pts[ord[i + 1]][0], pts[ord[i + 1]][1]);
        ui.stroke({ color: IGB.COLOR_HP, width: 1, alpha: 0.2 });
      }
    }

    this._dead.visible = true; this._stats.visible = true; this._prompt.visible = true;
    this._dead.anchor.set(0.5); this._dead.position.set(cx, sh * 0.22);
    this._stats.anchor.set(0.5); this._stats.position.set(cx, sh * 0.43);

    const rank = s.score >= 10000 ? "LEGEND" : s.score >= 5000 ? "CHAMPION" : s.score >= 2000 ? "KNIGHT" : s.score >= 500 ? "SQUIRE" : "PEASANT";
    const rankCol = s.score >= 10000 ? 0xffd700 : s.score >= 5000 ? 0xcc8833 : s.score >= 2000 ? 0x8888cc : s.score >= 500 ? 0x888888 : 0x666666;
    const diffLabel = DIFFICULTY_SETTINGS[s.difficulty].label;
    let statsText = `Rank: ${rank}  (${diffLabel})\nWave: ${s.wave}  |  Level: ${s.level}\nScore: ${s.score}\nKills: ${s.kills}\nTime: ${Math.floor(s.gameTime)}s\nBest combo: ${s.bestCombo}`;
    if (s.perks.length > 0) statsText += `\nPerks: ${s.perks.length}`;
    const vTotal = Object.values(s.virtues).reduce((a, b) => a + b, 0);
    if (vTotal > 0) statsText += `  |  Virtues: ${vTotal}`;
    if (s.shardsEarned > 0) statsText += `\nShards earned: +${s.shardsEarned}`;
    statsText += `\n\nBest Wave: ${s.bestWave}  |  Best Score: ${s.bestScore}`;
    this._stats.text = statsText;

    // Rank underline decoration
    ui.rect(cx - 60, sh * 0.37, 120, 1).fill({ color: rankCol, alpha: 0.3 });

    this._prompt.anchor.set(0.5); this._prompt.position.set(cx, sh * 0.75);
    this._prompt.text = "ENTER — Retry    ESC — Exit";
  }

  private _hideAll(): void {
    this._title.visible = false; this._sub.visible = false; this._controls.visible = false;
    this._waveText.visible = false; this._dead.visible = false; this._stats.visible = false;
    this._prompt.visible = false; this._pause.visible = false; this._hudL.visible = false;
    this._hudR.visible = false; this._virtueText.visible = false; this._comboText.visible = false;
    this._solarHud.visible = false;
  }
}

function _lerpColor(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, t));
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
