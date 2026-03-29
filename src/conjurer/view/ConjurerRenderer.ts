// ---------------------------------------------------------------------------
// Conjurer — PixiJS Renderer
// Neon geometric style: glowing spells, particle trails, pulsing arena
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { ConjurerPhase, SpellElement, EnemyState, EnemyType } from "../types";
import type { ConjurerState, ConjurerMeta } from "../types";
import { CONJURER_BALANCE as B, ELEMENT_COLORS } from "../config/ConjurerBalance";

const STYLE_TITLE = new TextStyle({ fontFamily: "monospace", fontSize: 52, fill: B.COLOR_PLAYER, fontWeight: "bold", letterSpacing: 10, dropShadow: { color: 0x000000, distance: 3, blur: 8, alpha: 0.7 } });
const STYLE_SUB = new TextStyle({ fontFamily: "monospace", fontSize: 15, fill: 0x6688aa, fontStyle: "italic" });
const STYLE_CONTROLS = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0x556677, lineHeight: 18 });
const STYLE_HUD = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: B.COLOR_TEXT, fontWeight: "bold" });
const STYLE_HUD_R = new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: B.COLOR_GOLD, fontWeight: "bold" });
const STYLE_BIG = new TextStyle({ fontFamily: "monospace", fontSize: 40, fill: B.COLOR_SUCCESS, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const STYLE_DEAD = new TextStyle({ fontFamily: "monospace", fontSize: 44, fill: B.COLOR_DANGER, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const STYLE_STATS = new TextStyle({ fontFamily: "monospace", fontSize: 14, fill: 0xcccccc, lineHeight: 22 });
const STYLE_PROMPT = new TextStyle({ fontFamily: "monospace", fontSize: 18, fill: B.COLOR_GOLD, fontWeight: "bold" });
const STYLE_FLOAT = new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } });
const STYLE_WAVE = new TextStyle({ fontFamily: "monospace", fontSize: 22, fill: B.COLOR_PLAYER, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 2, blur: 4, alpha: 0.6 } });
const STYLE_PAUSE = new TextStyle({ fontFamily: "monospace", fontSize: 36, fill: B.COLOR_GOLD, fontWeight: "bold" });

const FLOAT_POOL = 20;

export class ConjurerRenderer {
  readonly container = new Container();
  private _gfx = new Graphics();
  private _uiGfx = new Graphics();
  private _hudL = new Text({ text: "", style: STYLE_HUD });
  private _hudR = new Text({ text: "", style: STYLE_HUD_R });
  private _title = new Text({ text: "CONJURER", style: STYLE_TITLE });
  private _sub = new Text({ text: "Survive the arcane arena. Master the four elements.", style: STYLE_SUB });
  private _controls = new Text({ text: "", style: STYLE_CONTROLS });
  private _meta = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 13, fill: 0x556677, lineHeight: 20 }) });
  private _prompt = new Text({ text: "", style: STYLE_PROMPT });
  private _big = new Text({ text: "", style: STYLE_BIG });
  private _dead = new Text({ text: "DEFEATED", style: STYLE_DEAD });
  private _stats = new Text({ text: "", style: STYLE_STATS });
  private _wave = new Text({ text: "", style: STYLE_WAVE });
  private _pause = new Text({ text: "PAUSED", style: STYLE_PAUSE });
  private _shop = new Text({ text: "", style: new TextStyle({ fontFamily: "monospace", fontSize: 12, fill: 0xaaaacc, lineHeight: 17 }) });
  private _floats: Text[] = [];
  private _floatC = new Container();

  build(): void {
    this.container.addChild(this._gfx, this._uiGfx);
    const els = [this._hudL, this._hudR, this._title, this._sub, this._controls, this._meta, this._prompt, this._big, this._dead, this._stats, this._wave, this._pause, this._shop];
    for (const e of els) this.container.addChild(e);
    for (let i = 0; i < FLOAT_POOL; i++) {
      const t = new Text({ text: "", style: STYLE_FLOAT }); t.anchor.set(0.5); t.visible = false;
      this._floats.push(t); this._floatC.addChild(t);
    }
    this.container.addChild(this._floatC);
    this._controls.text = "WASD — Move    Arrows — Aim    SPACE — Cast spell\n1-4 / Tab — Switch element    Shift — Dodge roll    R — Ultimate\nESC — Pause";
  }

  destroy(): void {
    this.container.removeChildren();
    this._gfx.destroy(); this._uiGfx.destroy();
    this._floats.forEach(t => t.destroy()); this._floats = [];
  }

  render(s: ConjurerState, sw: number, sh: number, meta: ConjurerMeta): void {
    const g = this._gfx;
    g.clear();

    const pad = B.ARENA_PADDING;
    let shakeX = 0, shakeY = 0;
    if (s.screenShake > 0) { shakeX = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; shakeY = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; }
    const ox = pad + shakeX, oy = pad + shakeY;

    // Background
    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);

    // Deep background nebula clouds (large, colorful)
    const nebulaColors = [0x0a1540, 0x150a35, 0x0a0a30, 0x1a0828, 0x081530, 0x120a2a, 0x0a1428];
    for (let ni = 0; ni < 10; ni++) {
      const nx = ((ni * 311 + 7) % 100) / 100 * sw;
      const ny = ((ni * 197 + 13) % 100) / 100 * sh;
      const nr = 60 + ni * 25;
      g.circle(nx, ny, nr).fill({ color: nebulaColors[ni % nebulaColors.length], alpha: 0.06 + 0.02 * Math.sin(s.time * 0.2 + ni * 1.3) });
    }

    // Animated starfield (more stars, varied colors and sizes)
    const starSeed = 42;
    const starColors = [0x445577, 0x5566aa, 0x6677bb, 0x4488cc, 0x7788aa, 0xaa8866];
    for (let si = 0; si < 120; si++) {
      const sx2 = ((si * 73 + starSeed) % 1000) / 1000 * sw;
      const sy2 = ((si * 137 + starSeed) % 1000) / 1000 * sh;
      const sBright = 0.03 + 0.05 * Math.sin(s.time * 0.5 + si * 1.7);
      const sSize = 0.4 + (si % 4) * 0.35;
      const sColor = starColors[si % starColors.length];
      g.circle(sx2, sy2, sSize).fill({ color: sColor, alpha: sBright });
      // Diffraction spikes for larger stars
      if (sSize > 1.0 && sBright > 0.04) {
        const spikeLen = sSize * 3;
        g.moveTo(sx2 - spikeLen, sy2).lineTo(sx2 + spikeLen, sy2).stroke({ color: sColor, width: 0.3, alpha: sBright * 0.3 });
        g.moveTo(sx2, sy2 - spikeLen).lineTo(sx2, sy2 + spikeLen).stroke({ color: sColor, width: 0.3, alpha: sBright * 0.3 });
      }
    }

    // Distant galaxy spirals
    for (let gi = 0; gi < 2; gi++) {
      const gx = sw * (0.2 + gi * 0.6), gy = sh * (0.15 + gi * 0.5);
      const gr = 20 + gi * 8;
      const ga = s.time * 0.04 + gi * 3;
      for (let arm = 0; arm < 3; arm++) {
        const armA = ga + (arm / 3) * Math.PI * 2;
        for (let d = 0; d < 6; d++) {
          const da = armA + d * 0.35;
          g.circle(gx + Math.cos(da) * (d / 6) * gr, gy + Math.sin(da) * (d / 6) * gr, 1.2 - d * 0.15)
            .fill({ color: 0x4455aa, alpha: 0.03 });
        }
      }
    }

    // Arena grid — responsive brightness near player
    const gridSize = 40;
    const gridSizeSm = 20;
    const ppxG = s.px, ppyG = s.py;
    // Fine grid with proximity brightening
    for (let gx = 0; gx <= s.arenaW; gx += gridSizeSm) {
      // Brighten lines near player
      const gDist = Math.abs(gx - ppxG);
      const gAlpha = 0.12 + Math.max(0, 0.15 * (1 - gDist / 120));
      g.moveTo(ox + gx, oy).lineTo(ox + gx, oy + s.arenaH).stroke({ color: B.COLOR_ARENA_GRID, width: 0.3, alpha: gAlpha });
    }
    for (let gy = 0; gy <= s.arenaH; gy += gridSizeSm) {
      const gDist = Math.abs(gy - ppyG);
      const gAlpha = 0.12 + Math.max(0, 0.15 * (1 - gDist / 120));
      g.moveTo(ox, oy + gy).lineTo(ox + s.arenaW, oy + gy).stroke({ color: B.COLOR_ARENA_GRID, width: 0.3, alpha: gAlpha });
    }
    // Major grid
    for (let gx = 0; gx <= s.arenaW; gx += gridSize) {
      const gDist = Math.abs(gx - ppxG);
      const gAlpha = 0.3 + Math.max(0, 0.2 * (1 - gDist / 100));
      g.moveTo(ox + gx, oy).lineTo(ox + gx, oy + s.arenaH).stroke({ color: B.COLOR_ARENA_GRID, width: 0.7, alpha: gAlpha });
    }
    for (let gy = 0; gy <= s.arenaH; gy += gridSize) {
      const gDist = Math.abs(gy - ppyG);
      const gAlpha = 0.3 + Math.max(0, 0.2 * (1 - gDist / 100));
      g.moveTo(ox, oy + gy).lineTo(ox + s.arenaW, oy + gy).stroke({ color: B.COLOR_ARENA_GRID, width: 0.7, alpha: gAlpha });
    }
    // Grid intersection dots at major crossings near player
    for (let gx = 0; gx <= s.arenaW; gx += gridSize) {
      for (let gy = 0; gy <= s.arenaH; gy += gridSize) {
        const d = Math.sqrt((gx - ppxG) ** 2 + (gy - ppyG) ** 2);
        if (d < 100) {
          g.circle(ox + gx, oy + gy, 1.5).fill({ color: B.COLOR_ARENA_GRID, alpha: 0.2 * (1 - d / 100) });
        }
      }
    }
    // Player ground light
    const ec3 = ELEMENT_COLORS[s.activeElement];
    g.circle(ox + s.px, oy + s.py, 70).fill({ color: ec3.main, alpha: 0.025 });
    g.circle(ox + s.px, oy + s.py, 35).fill({ color: ec3.main, alpha: 0.02 });

    // Arena floor rune circles (decorative arcane patterns)
    const acx = ox + s.arenaW / 2, acy = oy + s.arenaH / 2;
    const runeR = Math.min(s.arenaW, s.arenaH) * 0.35;
    g.circle(acx, acy, runeR).stroke({ color: B.COLOR_ARENA_GRID, width: 0.8, alpha: 0.12 });
    g.circle(acx, acy, runeR * 0.6).stroke({ color: B.COLOR_ARENA_GRID, width: 0.5, alpha: 0.08 });
    // Rune spokes
    for (let ri = 0; ri < 8; ri++) {
      const ra = ri * Math.PI / 4 + s.time * 0.05;
      g.moveTo(acx + Math.cos(ra) * runeR * 0.15, acy + Math.sin(ra) * runeR * 0.15)
        .lineTo(acx + Math.cos(ra) * runeR, acy + Math.sin(ra) * runeR)
        .stroke({ color: B.COLOR_ARENA_GRID, width: 0.5, alpha: 0.06 });
    }
    // Outer rune ring
    g.circle(acx, acy, runeR * 1.1).stroke({ color: B.COLOR_ARENA_GRID, width: 0.3, alpha: 0.05 });
    // Small rune marks at spoke ends
    for (let ri = 0; ri < 8; ri++) {
      const ra = ri * Math.PI / 4 + s.time * 0.05;
      g.circle(acx + Math.cos(ra) * runeR, acy + Math.sin(ra) * runeR, 3)
        .stroke({ color: B.COLOR_ARENA_GRID, width: 0.5, alpha: 0.08 });
    }

    // Arena border (pulsing when low HP, double-line frame)
    const borderAlpha = 0.4 + (s.arenaPulse > 0 ? 0.3 * Math.sin(s.arenaPulse) : 0);
    const borderColor = s.arenaPulse > 0 ? B.COLOR_DANGER : B.COLOR_ARENA_BORDER;
    g.rect(ox - 1, oy - 1, s.arenaW + 2, s.arenaH + 2).stroke({ color: borderColor, width: 1, alpha: borderAlpha * 0.4 });
    g.rect(ox, oy, s.arenaW, s.arenaH).stroke({ color: borderColor, width: 2, alpha: borderAlpha });
    // Ornate corner pieces
    const cn = 20;
    for (const [cx2, cy2, dx2, dy2] of [[0, 0, 1, 1], [s.arenaW, 0, -1, 1], [0, s.arenaH, 1, -1], [s.arenaW, s.arenaH, -1, -1]] as [number, number, number, number][]) {
      const ccx = ox + cx2, ccy = oy + cy2;
      // L-shaped bracket
      g.moveTo(ccx, ccy + dy2 * cn).lineTo(ccx, ccy).lineTo(ccx + dx2 * cn, ccy)
        .stroke({ color: B.COLOR_PLAYER, width: 2.5, alpha: 0.65 });
      // Inner L
      g.moveTo(ccx + dx2 * 3, ccy + dy2 * (cn - 4)).lineTo(ccx + dx2 * 3, ccy + dy2 * 3).lineTo(ccx + dx2 * (cn - 4), ccy + dy2 * 3)
        .stroke({ color: B.COLOR_PLAYER, width: 1, alpha: 0.3 });
      // Corner dot
      g.circle(ccx + dx2 * 4, ccy + dy2 * 4, 2).fill({ color: B.COLOR_PLAYER, alpha: 0.5 });
    }

    // ----- Spell effects (enhanced) -----
    for (const fx of s.spellEffects) {
      const ec = ELEMENT_COLORS[fx.element];
      const alpha = fx.life / fx.maxLife;
      const fxx = ox + fx.x, fxy = oy + fx.y;

      if (fx.element === SpellElement.FIRE) {
        // Inner fill (hot zone fading outward)
        g.circle(fxx, fxy, fx.radius * 0.8).fill({ color: ec.glow, alpha: alpha * 0.04 });
        g.circle(fxx, fxy, fx.radius).fill({ color: ec.main, alpha: alpha * 0.03 });
        // Main ring (thick + thin)
        g.circle(fxx, fxy, fx.radius).stroke({ color: ec.main, width: 4, alpha: alpha * 0.7 });
        g.circle(fxx, fxy, fx.radius * 0.92).stroke({ color: ec.glow, width: 1.5, alpha: alpha * 0.5 });
        // Radial flame spokes
        const spokeCount = 12;
        for (let si = 0; si < spokeCount; si++) {
          const sa = si * Math.PI * 2 / spokeCount + s.time * 3;
          const innerR = fx.radius * 0.6;
          const outerR = fx.radius * (0.95 + Math.sin(sa * 3 + s.time * 8) * 0.05);
          g.moveTo(fxx + Math.cos(sa) * innerR, fxy + Math.sin(sa) * innerR)
            .lineTo(fxx + Math.cos(sa) * outerR, fxy + Math.sin(sa) * outerR)
            .stroke({ color: ec.glow, width: 2, alpha: alpha * 0.35 });
        }
        // Ember dots along ring
        for (let ei = 0; ei < 8; ei++) {
          const ea = s.time * 5 + ei * Math.PI / 4;
          const er = fx.radius + Math.sin(ea * 3) * 6;
          g.circle(fxx + Math.cos(ea) * er, fxy + Math.sin(ea) * er, 2)
            .fill({ color: 0xffcc44, alpha: alpha * 0.5 });
        }
        // Hot center pulse
        g.circle(fxx, fxy, 8 * alpha).fill({ color: 0xffaa22, alpha: alpha * 0.15 });
      } else if (fx.element === SpellElement.VOID) {
        // Outer distortion ring
        g.circle(fxx, fxy, fx.radius * 1.1).stroke({ color: ec.glow, width: 0.5, alpha: alpha * 0.15 });
        // Dark inner fill (sucking light in)
        g.circle(fxx, fxy, fx.radius).fill({ color: 0x110022, alpha: alpha * 0.2 });
        g.circle(fxx, fxy, fx.radius * 0.7).fill({ color: ec.main, alpha: alpha * 0.08 });
        // Spiral arms (8 swirling lines)
        for (let si = 0; si < 8; si++) {
          const sa = s.time * 4 + si * Math.PI / 4;
          const sr1 = fx.radius * 0.15, sr2 = fx.radius * 0.95;
          const bend = 0.6; // how much the spiral curves
          g.moveTo(fxx + Math.cos(sa) * sr1, fxy + Math.sin(sa) * sr1)
            .lineTo(fxx + Math.cos(sa + bend) * sr2, fxy + Math.sin(sa + bend) * sr2)
            .stroke({ color: ec.glow, width: 1.5, alpha: alpha * 0.3 });
        }
        // Pulsing singularity core
        const coreR = 5 + Math.sin(s.time * 10) * 3;
        g.circle(fxx, fxy, coreR).fill({ color: ec.main, alpha: alpha * 0.7 });
        g.circle(fxx, fxy, coreR * 1.5).fill({ color: 0xffffff, alpha: alpha * 0.08 });
        // Outer ring
        g.circle(fxx, fxy, fx.radius).stroke({ color: ec.glow, width: 1.5, alpha: alpha * 0.25 });
        // Debris dots being pulled inward
        for (let di = 0; di < 6; di++) {
          const da = s.time * 2.5 + di * Math.PI / 3;
          const progress = ((s.time * 0.8 + di * 0.3) % 1);
          const dr = fx.radius * (1 - progress * 0.8);
          g.circle(fxx + Math.cos(da) * dr, fxy + Math.sin(da) * dr, 1.5 * (1 - progress))
            .fill({ color: 0xaaaacc, alpha: alpha * 0.4 * (1 - progress) });
        }
      }
    }

    // ----- Mana crystals (with pull beams) -----
    for (const c of s.manaCrystals) {
      const ca = c.life / B.CRYSTAL_LIFE;
      const cp = 0.7 + 0.3 * Math.sin(s.time * 5 + c.x);
      const cx2 = ox + c.x, cy2 = oy + c.y;
      // Pull beam when magnetized
      if (c.magnetized) {
        const beamAlpha = 0.15 + 0.1 * Math.sin(s.time * 8);
        g.moveTo(cx2, cy2).lineTo(ox + s.px, oy + s.py).stroke({ color: B.COLOR_MANA_GLOW, width: 1.5, alpha: beamAlpha });
        // Trailing sparkle
        const t = (s.time * 3) % 1;
        const tx = cx2 + (ox + s.px - cx2) * t, ty = cy2 + (oy + s.py - cy2) * t;
        g.circle(tx, ty, 2).fill({ color: B.COLOR_MANA, alpha: 0.4 });
      }
      g.circle(cx2, cy2, 7 * cp).fill({ color: B.COLOR_MANA_GLOW, alpha: ca * 0.12 });
      g.star(cx2, cy2, 4, 5 * cp, 2.5 * cp).fill({ color: B.COLOR_MANA, alpha: ca });
      g.circle(cx2, cy2, 2).fill({ color: 0xffffff, alpha: ca * 0.4 }); // bright center
    }

    // ----- Spawn warnings -----
    for (const w of s.spawnWarnings) {
      const wa = w.timer / B.SPAWN_WARNING_TIME;
      g.circle(ox + w.x, oy + w.y, 12 + (1 - wa) * 8).stroke({ color: B.COLOR_DANGER, width: 2, alpha: wa * 0.6 });
      g.circle(ox + w.x, oy + w.y, 4).fill({ color: B.COLOR_DANGER, alpha: wa * 0.4 });
    }

    // ----- Arena hazard beam (enhanced visuals) -----
    if (s.hazardActive) {
      const hcx = ox + s.arenaW / 2, hcy = oy + s.arenaH / 2;
      const hLen = Math.max(s.arenaW, s.arenaH);
      const ha = s.hazardAngle;
      const beamPulse = 0.8 + 0.2 * Math.sin(s.time * 6);

      for (const dir of [1, -1]) {
        const hx = Math.cos(ha) * hLen * dir, hy = Math.sin(ha) * hLen * dir;
        const ex = hcx + hx, ey = hcy + hy;
        // Outer glow (wide, faint)
        g.moveTo(hcx, hcy).lineTo(ex, ey).stroke({ color: B.COLOR_DANGER, width: B.HAZARD_WIDTH * 1.5, alpha: 0.04 * beamPulse });
        // Core beam
        g.moveTo(hcx, hcy).lineTo(ex, ey).stroke({ color: B.COLOR_DANGER, width: B.HAZARD_WIDTH * 0.6, alpha: 0.12 * beamPulse });
        // Bright center line
        g.moveTo(hcx, hcy).lineTo(ex, ey).stroke({ color: 0xff6644, width: 2, alpha: 0.35 * beamPulse });
        g.moveTo(hcx, hcy).lineTo(ex, ey).stroke({ color: 0xffffff, width: 1, alpha: 0.2 * beamPulse });
        // Edge particles along beam
        for (let bp = 0; bp < 3; bp++) {
          const bt = 0.2 + Math.random() * 0.6;
          const bpx = hcx + hx * bt + (Math.random() - 0.5) * 12;
          const bpy = hcy + hy * bt + (Math.random() - 0.5) * 12;
          g.circle(bpx, bpy, 1.5).fill({ color: B.COLOR_DANGER, alpha: 0.3 * beamPulse });
        }
      }
      // Center orb
      g.circle(hcx, hcy, 6 + Math.sin(s.time * 4) * 2).fill({ color: B.COLOR_DANGER, alpha: 0.4 });
      g.circle(hcx, hcy, 10).stroke({ color: B.COLOR_DANGER, width: 1, alpha: 0.2 });
    }

    // ----- Enemies (enhanced shapes + inner detail + death FX) -----
    for (const e of s.enemies) {
      if (e.state === EnemyState.DEAD) continue;
      const ex = ox + e.x, ey = oy + e.y;
      const dying = e.state === EnemyState.DYING;
      const alpha = dying ? e.deathTimer / 0.3 : 1;
      const scale = dying ? 1 + (1 - alpha) * 0.5 : 1;
      const flash = e.flashTimer > 0;
      const frozen = e.slowTimer > 0;
      const color = flash ? 0xffffff : (frozen ? B.COLOR_ICE : e.color);
      const r = e.radius * scale;
      const darkColor = flash ? 0xcccccc : (frozen ? 0x2288aa : lerpColor(e.color, 0x000000, 0.3));

      // Outer glow
      g.circle(ex, ey, r * 1.6).fill({ color: e.color, alpha: alpha * 0.06 });

      // Death expanding ring effect
      if (dying) {
        const deathProg = 1 - e.deathTimer / 0.3;
        g.circle(ex, ey, r * (1 + deathProg * 2)).stroke({ color: e.color, width: 2, alpha: alpha * 0.5 });
        g.circle(ex, ey, r * (1 + deathProg * 1.2)).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.2 });
      }

      if (e.phased) {
        // Wraith phased: flickering outline
        const wFlicker = Math.sin(s.time * 20) > 0 ? 0.4 : 0.15;
        g.star(ex, ey, 5, r, r * 0.4).stroke({ color, width: 1.5, alpha: alpha * wFlicker });
      } else {
        switch (e.type) {
          case EnemyType.THRALL: {
            g.star(ex, ey, 3, r, r * 0.5).fill({ color, alpha: alpha * 0.85 });
            // Inner triangle
            g.star(ex, ey, 3, r * 0.45, r * 0.2).fill({ color: darkColor, alpha: alpha * 0.4 });
            break;
          }
          case EnemyType.ARCHER: {
            g.star(ex, ey, 4, r, r * 0.55).fill({ color, alpha: alpha * 0.85 });
            // Crosshair
            g.moveTo(ex - r * 0.3, ey).lineTo(ex + r * 0.3, ey).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.25 });
            g.moveTo(ex, ey - r * 0.3).lineTo(ex, ey + r * 0.3).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.25 });
            g.circle(ex, ey, 2).fill({ color: 0xffffff, alpha: alpha * 0.4 });
            break;
          }
          case EnemyType.KNIGHT: {
            // Shield body
            g.star(ex, ey, 6, r, r * 0.87).fill({ color, alpha: alpha * 0.85 });
            g.star(ex, ey, 6, r, r * 0.87).stroke({ color: 0xffffff, width: 2, alpha: alpha * 0.3 });
            // Shield emblem (inner hexagon)
            g.star(ex, ey, 6, r * 0.45, r * 0.39).fill({ color: darkColor, alpha: alpha * 0.3 });
            // Center boss
            g.circle(ex, ey, r * 0.15).fill({ color: 0xffffff, alpha: alpha * 0.2 });
            break;
          }
          case EnemyType.WRAITH: {
            g.star(ex, ey, 5, r, r * 0.4).fill({ color, alpha: alpha * 0.75 });
            // Wispy trails
            for (let wi = 0; wi < 3; wi++) {
              const wa = s.time * 3 + wi * Math.PI * 2 / 3;
              const wr = r * 0.7;
              g.circle(ex + Math.cos(wa) * wr, ey + Math.sin(wa) * wr, 2)
                .fill({ color, alpha: alpha * 0.25 });
            }
            break;
          }
          case EnemyType.GOLEM: {
            g.star(ex, ey, 8, r, r * 0.92).fill({ color, alpha: alpha * 0.85 });
            g.star(ex, ey, 8, r, r * 0.92).stroke({ color: 0xffffff, width: 2.5, alpha: alpha * 0.2 });
            // Inner glowing core with pulse
            const gp = 0.7 + 0.3 * Math.sin(s.time * 3);
            g.circle(ex, ey, r * 0.4 * gp).fill({ color: 0xffaa44, alpha: alpha * 0.4 });
            g.circle(ex, ey, r * 0.25).fill({ color: 0xffdd88, alpha: alpha * 0.2 });
            // Cracks radiating from core
            for (let ci = 0; ci < 4; ci++) {
              const ca = ci * Math.PI / 2 + 0.3;
              g.moveTo(ex + Math.cos(ca) * r * 0.3, ey + Math.sin(ca) * r * 0.3)
                .lineTo(ex + Math.cos(ca) * r * 0.75, ey + Math.sin(ca) * r * 0.75)
                .stroke({ color: 0xffaa44, width: 1, alpha: alpha * 0.2 });
            }
            break;
          }
          case EnemyType.SORCERER: {
            g.star(ex, ey, 5, r, r * 0.6).fill({ color, alpha: alpha * 0.85 });
            // Magic circle
            g.circle(ex, ey, r * 0.55).stroke({ color: 0xff44cc, width: 1.5, alpha: alpha * 0.4 });
            // Rotating rune dots
            for (let mi = 0; mi < 3; mi++) {
              const ma = s.time * 2 + mi * Math.PI * 2 / 3;
              g.circle(ex + Math.cos(ma) * r * 0.55, ey + Math.sin(ma) * r * 0.55, 1.5)
                .fill({ color: 0xff88ee, alpha: alpha * 0.5 });
            }
            break;
          }
          default:
            g.circle(ex, ey, r).fill({ color, alpha: alpha * 0.85 });
        }
        // Universal thin outer ring
        g.circle(ex, ey, r).stroke({ color: 0xffffff, width: 0.5, alpha: alpha * 0.08 });
      }

      // HP bar
      if (e.maxHp > 4 && e.state === EnemyState.ALIVE) {
        const bw = r * 2.2, bh = 3;
        g.roundRect(ex - bw / 2, ey - r - 7, bw, bh, 1).fill({ color: 0x111111, alpha: 0.7 });
        g.roundRect(ex - bw / 2, ey - r - 7, bw * (e.hp / e.maxHp), bh, 1).fill({ color: B.COLOR_HP, alpha: 0.85 });
      }

      // Frozen ring with ice crystal dots
      if (frozen && !dying) {
        g.circle(ex, ey, r + 3).stroke({ color: B.COLOR_ICE, width: 1.5, alpha: 0.5 });
        for (let fi = 0; fi < 4; fi++) {
          const fa = s.time * 1.5 + fi * Math.PI / 2;
          g.circle(ex + Math.cos(fa) * (r + 3), ey + Math.sin(fa) * (r + 3), 1.5)
            .fill({ color: 0xffffff, alpha: 0.4 });
        }
      }
    }

    // ----- Lightning arcs -----
    for (const arc of s.lightningArcs) {
      const a = arc.life / 0.2;
      const ax1 = ox + arc.x1, ay1 = oy + arc.y1;
      const ax2 = ox + arc.x2, ay2 = oy + arc.y2;
      // Jagged lightning line (3 segments with offsets)
      const mx = (ax1 + ax2) / 2 + (Math.random() - 0.5) * 20;
      const my = (ay1 + ay2) / 2 + (Math.random() - 0.5) * 20;
      g.moveTo(ax1, ay1).lineTo(mx, my).lineTo(ax2, ay2).stroke({ color: B.COLOR_LIGHTNING, width: 2.5, alpha: a * 0.8 });
      g.moveTo(ax1, ay1).lineTo(mx, my).lineTo(ax2, ay2).stroke({ color: 0xffffff, width: 1, alpha: a * 0.4 });
    }

    // ----- Projectiles (player vs enemy distinct visuals) -----
    for (const p of s.projectiles) {
      const px2 = ox + p.x, py2 = oy + p.y;
      const alpha = Math.min(1, p.life * 3);
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);

      if (p.element !== null) {
        // --- Player projectile ---
        if (sp > 50) {
          const tl = Math.min(14, sp * 0.025);
          g.moveTo(px2 - (p.vx / sp) * tl, py2 - (p.vy / sp) * tl).lineTo(px2, py2)
            .stroke({ color: p.color, width: p.radius * 0.8, alpha: alpha * 0.4 });
        }
        g.circle(px2, py2, p.radius * 1.5).fill({ color: p.color, alpha: alpha * 0.1 });
        if (p.element === SpellElement.ICE) {
          // Ice shard: elongated diamond aligned with velocity
          const ang = Math.atan2(p.vy, p.vx);
          const len = p.radius * 1.8, wid = p.radius * 0.6;
          g.poly([
            px2 + Math.cos(ang) * len, py2 + Math.sin(ang) * len,
            px2 + Math.cos(ang + Math.PI / 2) * wid, py2 + Math.sin(ang + Math.PI / 2) * wid,
            px2 - Math.cos(ang) * len * 0.4, py2 - Math.sin(ang) * len * 0.4,
            px2 - Math.cos(ang + Math.PI / 2) * wid, py2 - Math.sin(ang + Math.PI / 2) * wid,
          ]).fill({ color: p.color, alpha });
          g.circle(px2, py2, p.radius * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.6 });
        } else if (p.element === SpellElement.LIGHTNING) {
          // Lightning bolt: bright with jagged outline
          g.circle(px2, py2, p.radius).fill({ color: p.color, alpha });
          g.circle(px2, py2, p.radius * 0.5).fill({ color: 0xffffff, alpha: alpha * 0.7 });
          g.circle(px2, py2, p.radius * 2).fill({ color: p.color, alpha: alpha * 0.06 });
        } else {
          g.circle(px2, py2, p.radius).fill({ color: p.color, alpha });
          g.circle(px2, py2, p.radius * 0.4).fill({ color: 0xffffff, alpha: alpha * 0.5 });
        }
      } else {
        // --- Enemy projectile: pulsing warning ring + rotating core ---
        const pulse = 0.7 + 0.3 * Math.sin(s.time * 12 + p.x * 0.1);
        // Outer warning ring
        g.circle(px2, py2, p.radius * 2.5 * pulse).stroke({ color: B.COLOR_DANGER, width: 1, alpha: alpha * 0.3 });
        // Rotating spiky core
        const rot = s.time * 8;
        g.star(px2, py2, p.homing ? 5 : 3, p.radius * pulse, p.radius * 0.4 * pulse, rot).fill({ color: p.color, alpha });
        // Hot center
        g.circle(px2, py2, p.radius * 0.35).fill({ color: 0xffffff, alpha: alpha * 0.6 });
        // Trail (longer for homing)
        if (sp > 30) {
          const tl = Math.min(p.homing ? 18 : 10, sp * 0.03);
          g.moveTo(px2 - (p.vx / sp) * tl, py2 - (p.vy / sp) * tl).lineTo(px2, py2)
            .stroke({ color: p.color, width: p.radius * 0.6, alpha: alpha * 0.35 });
        }
        // Homing: extra glow
        if (p.homing) {
          g.circle(px2, py2, p.radius * 2).fill({ color: 0xff44cc, alpha: alpha * 0.08 });
        }
      }
    }

    // ----- Particles -----
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      const px2 = ox + p.x, py2 = oy + p.y;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 15) {
        const tl = Math.min(6, sp * 0.02);
        g.moveTo(px2 - (p.vx / sp) * tl, py2 - (p.vy / sp) * tl).lineTo(px2, py2)
          .stroke({ color: p.color, width: p.size * alpha * 0.6, alpha: alpha * 0.4 });
      }
      g.circle(px2, py2, p.size * alpha).fill({ color: p.color, alpha });
    }

    // ----- Ultimate visual (multi-element explosion) -----
    if (s.ultimateActive > 0) {
      const uAlpha = s.ultimateActive / B.ULTIMATE_DURATION;
      const uProgress = 1 - uAlpha;
      const uRadius = B.ULTIMATE_RADIUS * Math.min(1, uProgress * 2);
      const upx = ox + s.px, upy = oy + s.py;
      // Outer dark zone
      g.circle(upx, upy, uRadius * 1.1).fill({ color: 0x000000, alpha: uAlpha * 0.06 });
      // Multi-element rings (4 colors at different radii)
      const uelems = [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID];
      for (let ui2 = 0; ui2 < 4; ui2++) {
        const uec = ELEMENT_COLORS[uelems[ui2]];
        const urOff = uRadius * (0.6 + ui2 * 0.12);
        const uRot = s.time * (3 + ui2) + ui2 * Math.PI / 4;
        g.circle(upx, upy, urOff).stroke({ color: uec.main, width: 2, alpha: uAlpha * 0.35 });
        // Orbiting element dots on each ring
        for (let ud = 0; ud < 3; ud++) {
          const uda = uRot + ud * Math.PI * 2 / 3;
          g.circle(upx + Math.cos(uda) * urOff, upy + Math.sin(uda) * urOff, 3)
            .fill({ color: uec.glow, alpha: uAlpha * 0.5 });
        }
      }
      // Central gold burst
      g.circle(upx, upy, 12 + Math.sin(s.time * 10) * 4).fill({ color: B.COLOR_GOLD, alpha: uAlpha * 0.4 });
      g.circle(upx, upy, 6).fill({ color: 0xffffff, alpha: uAlpha * 0.3 });
      // Expanding outer ring
      g.circle(upx, upy, uRadius).stroke({ color: B.COLOR_GOLD, width: 3, alpha: uAlpha * 0.5 });
      // Radial lines (starburst)
      for (let rl = 0; rl < 12; rl++) {
        const rla = rl * Math.PI / 6 + s.time * 2;
        g.moveTo(upx + Math.cos(rla) * 15, upy + Math.sin(rla) * 15)
          .lineTo(upx + Math.cos(rla) * uRadius * 0.9, upy + Math.sin(rla) * uRadius * 0.9)
          .stroke({ color: B.COLOR_GOLD, width: 1, alpha: uAlpha * 0.15 });
      }
    }

    // ----- Player movement trail (element-colored fading dots) -----
    // We approximate by drawing dots behind the player based on velocity
    if (s.phase === ConjurerPhase.PLAYING) {
      const ec0 = ELEMENT_COLORS[s.activeElement];
      for (let ti = 1; ti <= 4; ti++) {
        const trailAlpha = 0.08 * (1 - ti * 0.2);
        const tOff = ti * 5;
        // Approximate trail behind player using aim direction as proxy for movement
        // (actual velocity not stored, so this creates a subtle stationary halo)
        g.circle(ox + s.px - Math.cos(s.aimAngle) * tOff * 0.3, oy + s.py - Math.sin(s.aimAngle) * tOff * 0.3, B.PLAYER_RADIUS * (0.8 - ti * 0.12))
          .fill({ color: ec0.main, alpha: trailAlpha });
      }
    }

    // ----- Player -----
    const ppx = ox + s.px, ppy = oy + s.py;
    const isDodging = s.dodgeTimer > 0;

    // Dodge invincibility flash: bright shield ring during roll
    if (isDodging) {
      const dodgeFlash = 0.6 + 0.4 * Math.sin(s.time * 30);
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 2.5).stroke({ color: 0xffffff, width: 2.5, alpha: dodgeFlash * 0.5 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 2.5).fill({ color: B.COLOR_PLAYER, alpha: 0.08 });
      // Afterimage trail
      const trailX = ppx - s.dodgeDirX * 20, trailY = ppy - s.dodgeDirY * 20;
      g.circle(trailX, trailY, B.PLAYER_RADIUS * 0.8).fill({ color: B.COLOR_PLAYER, alpha: 0.2 });
      const trailX2 = ppx - s.dodgeDirX * 40, trailY2 = ppy - s.dodgeDirY * 40;
      g.circle(trailX2, trailY2, B.PLAYER_RADIUS * 0.5).fill({ color: B.COLOR_PLAYER, alpha: 0.1 });
    }

    if (s.invincibleTimer > 0 && !isDodging && Math.floor(s.invincibleTimer * 8) % 2 === 0) {
      // damage blink
    } else {
      const ec = ELEMENT_COLORS[s.activeElement];

      // Orbiting element ring (4 orbs)
      const orbR = B.PLAYER_RADIUS * 2.2;
      const elOrbs = [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID];
      for (let oi = 0; oi < 4; oi++) {
        const oa = s.time * 1.5 + oi * Math.PI / 2;
        const orbC = ELEMENT_COLORS[elOrbs[oi]];
        const isActive = elOrbs[oi] === s.activeElement;
        const orbSize = isActive ? 4 : 2;
        const orbAlpha = isActive ? 0.85 : 0.25;
        g.circle(ppx + Math.cos(oa) * orbR, ppy + Math.sin(oa) * orbR, orbSize)
          .fill({ color: orbC.main, alpha: orbAlpha });
        if (isActive) {
          g.circle(ppx + Math.cos(oa) * orbR, ppy + Math.sin(oa) * orbR, orbSize + 4)
            .fill({ color: orbC.glow, alpha: 0.12 });
        }
      }

      // Passive aura ring
      const auraPulse = 0.12 + 0.06 * Math.sin(s.time * 3);
      g.circle(ppx, ppy, B.AURA_RADIUS).stroke({ color: ec.main, width: 1.5, alpha: auraPulse });
      g.circle(ppx, ppy, B.AURA_RADIUS).fill({ color: ec.main, alpha: 0.02 });

      // Aura glow
      const auraScale = s.ultimateCharge >= B.ULTIMATE_COST ? 4.5 : 3;
      g.circle(ppx, ppy, B.PLAYER_RADIUS * auraScale).fill({ color: ec.main, alpha: 0.05 });
      if (s.ultimateCharge >= B.ULTIMATE_COST) {
        const rp = 0.5 + 0.5 * Math.sin(s.time * 5);
        g.circle(ppx, ppy, B.PLAYER_RADIUS * 4).stroke({ color: B.COLOR_GOLD, width: 1.5, alpha: rp * 0.35 });
      }

      // Body
      if (isDodging) {
        g.ellipse(ppx, ppy, B.PLAYER_RADIUS * 1.5, B.PLAYER_RADIUS * 0.5).fill({ color: 0xffffff, alpha: 0.7 });
      } else {
        g.circle(ppx, ppy, B.PLAYER_RADIUS).fill(B.COLOR_PLAYER);
        g.circle(ppx, ppy, B.PLAYER_RADIUS).stroke({ color: 0xffffff, width: 1.5, alpha: 0.35 });
        g.circle(ppx, ppy, B.PLAYER_RADIUS * 0.5).fill({ color: 0xffffff, alpha: 0.25 });
      }

      // Aim line + dot
      const aimLen = 32;
      const aimAlpha = 0.5 + (s.spellCooldowns[s.activeElement] <= 0 ? 0.2 : 0);
      g.moveTo(ppx, ppy)
        .lineTo(ppx + Math.cos(s.aimAngle) * aimLen, ppy + Math.sin(s.aimAngle) * aimLen)
        .stroke({ color: ec.main, width: 2, alpha: aimAlpha });
      g.circle(ppx + Math.cos(s.aimAngle) * aimLen, ppy + Math.sin(s.aimAngle) * aimLen, 3.5)
        .fill({ color: ec.main, alpha: aimAlpha + 0.15 });
      // Aim range circle when cooldown ready
      if (s.spellCooldowns[s.activeElement] <= 0 && s.mana >= B.SPELL_COSTS[s.activeElement]) {
        g.circle(ppx + Math.cos(s.aimAngle) * aimLen, ppy + Math.sin(s.aimAngle) * aimLen, 6)
          .stroke({ color: ec.glow, width: 1, alpha: 0.3 + 0.15 * Math.sin(s.time * 8) });
      }
    }

    // Ambient floating arcane motes
    for (let mi = 0; mi < 12; mi++) {
      const mx = ((mi * 257 + 31) % 1000) / 1000 * s.arenaW;
      const my = ((mi * 439 + 67) % 1000) / 1000 * s.arenaH;
      const mDrift = Math.sin(s.time * 0.4 + mi * 2.1) * 15;
      const mAlpha = 0.06 + 0.04 * Math.sin(s.time * 0.8 + mi * 1.3);
      const mSize = 1 + (mi % 3) * 0.5;
      const mColor = mi % 4 === 0 ? 0x4466aa : mi % 4 === 1 ? 0x6644aa : mi % 4 === 2 ? 0xaa6644 : 0x44aa66;
      g.circle(ox + mx + mDrift, oy + my + Math.cos(s.time * 0.3 + mi) * 10, mSize).fill({ color: mColor, alpha: mAlpha });
    }

    // Vignette (element-tinted)
    const vigEc = ELEMENT_COLORS[s.activeElement];
    const vig = 70;
    for (let vi = 0; vi < 6; vi++) {
      const inset = vig - vi * 12;
      if (inset > 0) {
        const va = 0.015 + vi * 0.02;
        g.rect(0, 0, inset, sh).fill({ color: 0x000000, alpha: va });
        g.rect(sw - inset, 0, inset, sh).fill({ color: 0x000000, alpha: va });
        g.rect(inset, 0, sw - inset * 2, inset * 0.5).fill({ color: 0x000000, alpha: va });
        g.rect(inset, sh - inset * 0.5, sw - inset * 2, inset * 0.5).fill({ color: 0x000000, alpha: va });
      }
    }
    // Element color tint on vignette edges
    const tintAlpha = 0.02 + (s.arenaPulse > 0 ? 0.02 * Math.sin(s.arenaPulse) : 0);
    g.rect(0, 0, 40, sh).fill({ color: vigEc.main, alpha: tintAlpha });
    g.rect(sw - 40, 0, 40, sh).fill({ color: vigEc.main, alpha: tintAlpha });
    g.rect(0, 0, sw, 30).fill({ color: vigEc.main, alpha: tintAlpha * 0.7 });
    g.rect(0, sh - 30, sw, 30).fill({ color: vigEc.main, alpha: tintAlpha * 0.7 });

    // Screen flash
    if (s.screenFlashTimer > 0) {
      g.rect(0, 0, sw, sh).fill({ color: s.screenFlashColor, alpha: s.screenFlashTimer / B.FLASH_DURATION * 0.2 });
    }

    // ===== UI =====
    const ui = this._uiGfx;
    ui.clear();

    // HP bar (with low-HP glow and tick marks)
    const hpW = 120, hpH = 8, hpX = 10, hpY = sh - 22;
    ui.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).fill({ color: 0x111122, alpha: 0.75 });
    const hpFill = s.hp / s.maxHp;
    const hpColor = hpFill <= 0.3 ? lerpColor(B.COLOR_HP, 0xffaa22, 0.5 + 0.5 * Math.sin(s.time * 6)) : B.COLOR_HP;
    ui.roundRect(hpX, hpY, hpW * hpFill, hpH, 2).fill(hpColor);
    // Tick marks for each HP point
    for (let hi = 1; hi < s.maxHp; hi++) {
      const tx = hpX + (hpW * hi / s.maxHp);
      ui.rect(tx, hpY, 1, hpH).fill({ color: 0x000000, alpha: 0.3 });
    }
    // Low HP glow
    if (hpFill <= 0.3) {
      ui.roundRect(hpX - 3, hpY - 3, hpW + 6, hpH + 6, 5).stroke({ color: B.COLOR_HP, width: 1, alpha: 0.2 + 0.15 * Math.sin(s.time * 6) });
    }
    ui.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).stroke({ color: 0x333344, width: 0.5 });

    // Mana bar (with shimmer)
    const mpX = hpX + hpW + 10;
    ui.roundRect(mpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).fill({ color: 0x111122, alpha: 0.75 });
    const manaFill = s.mana / s.maxMana;
    ui.roundRect(mpX, hpY, hpW * manaFill, hpH, 2).fill(B.COLOR_MANA);
    // Mana shimmer (moving highlight)
    if (manaFill > 0.1) {
      const shimX = mpX + ((s.time * 40) % (hpW * manaFill));
      ui.rect(shimX, hpY, 8, hpH).fill({ color: 0xffffff, alpha: 0.08 });
    }
    ui.roundRect(mpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).stroke({ color: 0x333344, width: 0.5 });

    // Element indicator with cooldown-ready pulse
    const elX = mpX + hpW + 15, elY = hpY - 2;
    const ec2 = ELEMENT_COLORS[s.activeElement];
    const cd = s.spellCooldowns[s.activeElement];
    const cdMax = B.SPELL_COOLDOWNS[s.activeElement];
    const cdReady = cd <= 0 && s.mana >= B.SPELL_COSTS[s.activeElement];
    const readyPulse = cdReady ? 0.8 + 0.2 * Math.sin(s.time * 6) : 0.6;
    ui.roundRect(elX, elY - 2, 80, hpH + 6, 4).fill({ color: 0x111122, alpha: 0.7 });
    ui.roundRect(elX, elY - 2, 80, hpH + 6, 4).stroke({ color: ec2.main, width: cdReady ? 2 : 1.5, alpha: readyPulse });
    if (cd > 0) {
      ui.roundRect(elX + 1, elY - 1, 78 * (cd / cdMax), hpH + 4, 3).fill({ color: ec2.main, alpha: 0.2 });
    } else if (cdReady) {
      // Ready glow
      ui.roundRect(elX - 2, elY - 4, 84, hpH + 10, 6).fill({ color: ec2.main, alpha: 0.06 * readyPulse });
    }

    // Combo bar (shows timer decay)
    if (s.combo > 1) {
      const cbX = sw / 2 - 60, cbY = sh - 12;
      const cbW = 120, cbH = 4;
      const cbFill = s.comboTimer / B.COMBO_WINDOW;
      const cbColor = s.combo >= 10 ? B.COLOR_GOLD : B.COLOR_COMBO;
      ui.roundRect(cbX, cbY, cbW, cbH, 2).fill({ color: 0x111122, alpha: 0.5 });
      ui.roundRect(cbX, cbY, cbW * cbFill, cbH, 2).fill({ color: cbColor, alpha: 0.7 });
    }

    // All 4 element indicators (small dots)
    const elDots = [SpellElement.FIRE, SpellElement.ICE, SpellElement.LIGHTNING, SpellElement.VOID];
    for (let ei = 0; ei < elDots.length; ei++) {
      const dotEl = elDots[ei];
      const dotX = elX + 6 + ei * 18, dotY = elY - 10;
      const dotC = ELEMENT_COLORS[dotEl];
      const isActive = dotEl === s.activeElement;
      const dotR = isActive ? 4 : 2.5;
      ui.circle(dotX, dotY, dotR).fill({ color: dotC.main, alpha: isActive ? 0.9 : 0.35 });
      if (isActive) ui.circle(dotX, dotY, dotR + 2).stroke({ color: dotC.glow, width: 1, alpha: 0.5 });
    }

    // Ultimate charge bar (below mana)
    const ultW = 80, ultH = 5, ultX = hpX, ultY = hpY + hpH + 4;
    ui.roundRect(ultX - 1, ultY - 1, ultW + 2, ultH + 2, 2).fill({ color: 0x111122, alpha: 0.5 });
    const ultFill = s.ultimateCharge / B.ULTIMATE_COST;
    const ultReady = s.ultimateCharge >= B.ULTIMATE_COST;
    const ultColor = ultReady ? B.COLOR_GOLD : 0x886633;
    ui.roundRect(ultX, ultY, ultW * ultFill, ultH, 1).fill({ color: ultColor, alpha: ultReady ? 0.9 : 0.6 });
    if (ultReady) {
      ui.roundRect(ultX - 2, ultY - 2, ultW + 4, ultH + 4, 3).stroke({ color: B.COLOR_GOLD, width: 1, alpha: 0.3 + 0.2 * Math.sin(s.time * 5) });
    }

    // Dodge cooldown indicator
    if (s.dodgeCooldown > 0) {
      const dcX = ultX + ultW + 8;
      ui.roundRect(dcX, ultY, 30, ultH, 2).fill({ color: 0x111122, alpha: 0.5 });
      ui.roundRect(dcX, ultY, 30 * (1 - s.dodgeCooldown / B.DODGE_COOLDOWN), ultH, 2).fill({ color: B.COLOR_PLAYER, alpha: 0.4 });
    }

    // HUD text
    const showHud = s.phase === ConjurerPhase.PLAYING || s.phase === ConjurerPhase.PAUSED || s.phase === ConjurerPhase.WAVE_CLEAR;
    this._hudL.visible = showHud;
    this._hudR.visible = showHud;
    this._wave.visible = showHud;
    if (showHud) {
      this._hudL.text = `Wave ${s.wave}  |  HP: ${s.hp}/${s.maxHp}  |  Mana: ${Math.floor(s.mana)}`;
      this._hudL.x = 10; this._hudL.y = 6;
      const comboStr = s.combo > 1 ? `  Combo: ${s.combo}x` : "";
      this._hudR.text = `Score: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}${comboStr}`;
      this._hudR.x = sw - this._hudR.width - 10; this._hudR.y = 6;
      // Wave indicator
      this._wave.text = `${s.activeElement.toUpperCase()} Lv${s.spellLevels[s.activeElement]}`;
      this._wave.anchor.set(0.5); this._wave.x = sw / 2; this._wave.y = sh - 20;
      (this._wave.style as TextStyle).fill = ec2.main;
    }

    // Floating texts
    let fi = 0;
    for (const ft of s.floatingTexts) {
      if (fi >= FLOAT_POOL) break;
      const t = this._floats[fi]; t.visible = true; t.text = ft.text;
      (t.style as TextStyle).fill = ft.color;
      t.x = ox + ft.x; t.y = oy + ft.y; t.alpha = ft.life / ft.maxLife; fi++;
    }
    for (; fi < FLOAT_POOL; fi++) this._floats[fi].visible = false;

    // Phase overlays
    const overlays = [this._title, this._sub, this._controls, this._meta, this._prompt, this._big, this._dead, this._stats, this._pause, this._shop];
    for (const o of overlays) o.visible = false;

    if (s.phase === ConjurerPhase.START) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
      this._title.visible = true; this._title.anchor.set(0.5); this._title.x = sw / 2; this._title.y = sh * 0.2;
      this._sub.visible = true; this._sub.anchor.set(0.5); this._sub.x = sw / 2; this._sub.y = sh * 0.2 + 55;
      this._controls.visible = true; this._controls.anchor.set(0.5); this._controls.x = sw / 2; this._controls.y = sh * 0.45;
      this._meta.visible = true; this._meta.anchor.set(0.5); this._meta.x = sw / 2; this._meta.y = sh * 0.62;
      this._meta.text = meta.gamesPlayed > 0
        ? `High Score: ${meta.highScore}  |  Best Wave: ${meta.bestWave}  |  Best Combo: ${meta.bestCombo}x  |  Total Kills: ${meta.totalKills}`
        : "First conjuration...";
      this._prompt.visible = true; this._prompt.anchor.set(0.5); this._prompt.x = sw / 2; this._prompt.y = sh * 0.8;
      this._prompt.text = "Press SPACE to begin"; this._prompt.alpha = 0.6 + 0.4 * Math.sin(s.time * 3);
    }
    if (s.phase === ConjurerPhase.PAUSED) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
      this._pause.visible = true; this._pause.anchor.set(0.5); this._pause.x = sw / 2; this._pause.y = sh / 2;
    }
    if (s.phase === ConjurerPhase.WAVE_CLEAR) {
      this._big.visible = true; this._big.anchor.set(0.5); this._big.x = sw / 2; this._big.y = sh / 2 - 20;
      this._big.text = `WAVE ${s.wave} CLEAR`;
      this._big.alpha = Math.min(1, s.waveClearTimer * 2);
    }
    if (s.phase === ConjurerPhase.DEAD) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });
      this._dead.visible = true; this._dead.anchor.set(0.5); this._dead.x = sw / 2; this._dead.y = sh * 0.12;
      this._stats.visible = true; this._stats.anchor.set(0.5); this._stats.x = sw / 2; this._stats.y = sh * 0.25;
      this._stats.text = `Wave: ${s.wave}  |  Score: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}  |  Combo: ${s.bestCombo}x\nShards earned: +${s.wave * B.SHARDS_PER_WAVE}`;

      // Upgrade shop
      this._shop.visible = true; this._shop.anchor.set(0.5); this._shop.x = sw / 2; this._shop.y = sh * 0.42;
      const up = meta.upgrades;
      const costs = B.UPGRADE_COSTS as Record<string, number[]>;
      const names = ["+HP", "Mana Regen", "Aura Range", "Magnet Range", "Dodge Speed"];
      const upKeys = ["maxHp", "manaRegen", "auraRange", "magnetRange", "dodgeSpeed"];
      const lines: string[] = [`Arcane Shards: ${meta.arcaneShards}`, ""];
      for (let i = 0; i < upKeys.length; i++) {
        const k = upKeys[i];
        const lvl = (up as unknown as Record<string, number>)[k] || 0;
        const c = costs[k];
        const maxed = lvl >= c.length;
        const cost = maxed ? "MAX" : `${c[lvl]}`;
        const bar = "■".repeat(lvl) + "□".repeat(c.length - lvl);
        lines.push(`[${i + 1}] ${names[i].padEnd(13)} ${bar}  ${cost}`);
      }
      this._shop.text = lines.join("\n");

      this._prompt.visible = true; this._prompt.anchor.set(0.5); this._prompt.x = sw / 2; this._prompt.y = sh * 0.78;
      this._prompt.text = "SPACE to retry  |  ESC to exit";
    }
    if (s.phase === ConjurerPhase.VICTORY) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
      this._big.visible = true; this._big.anchor.set(0.5); this._big.x = sw / 2; this._big.y = sh * 0.25;
      this._big.text = "ARCHMAGE"; (this._big.style as TextStyle).fill = B.COLOR_GOLD;
      this._stats.visible = true; this._stats.anchor.set(0.5); this._stats.x = sw / 2; this._stats.y = sh * 0.45;
      this._stats.text = `All ${s.wave} waves conquered!\nScore: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}  |  Combo: ${s.bestCombo}x`;
      this._prompt.visible = true; this._prompt.anchor.set(0.5); this._prompt.x = sw / 2; this._prompt.y = sh * 0.65;
      this._prompt.text = "SPACE to play again  |  ESC to exit";
    }
  }
}

function lerpColor(a: number, b: number, t: number): number {
  const ar = (a >> 16) & 0xff, ag = (a >> 8) & 0xff, ab = a & 0xff;
  const br = (b >> 16) & 0xff, bg = (b >> 8) & 0xff, bb = b & 0xff;
  return (Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t);
}
