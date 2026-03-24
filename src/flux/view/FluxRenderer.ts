// ---------------------------------------------------------------------------
// Flux — PixiJS Renderer
// Deep space void aesthetic with gravity distortion
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { FluxPhase, EnemyType } from "../types";
import type { FluxState, FluxMeta } from "../types";
import { FLUX_BALANCE as B } from "../config/FluxBalance";

const ST = (opts: ConstructorParameters<typeof TextStyle>[0]) => new TextStyle(opts);
const S_TITLE = ST({ fontFamily: "monospace", fontSize: 52, fill: B.COLOR_PLAYER, fontWeight: "bold", letterSpacing: 12, dropShadow: { color: 0x000000, distance: 3, blur: 8, alpha: 0.7 } });
const S_SUB = ST({ fontFamily: "monospace", fontSize: 15, fill: 0x6666aa, fontStyle: "italic" });
const S_CTRL = ST({ fontFamily: "monospace", fontSize: 12, fill: 0x556677, lineHeight: 18 });
const S_HUD = ST({ fontFamily: "monospace", fontSize: 14, fill: B.COLOR_TEXT, fontWeight: "bold" });
const S_HUDR = ST({ fontFamily: "monospace", fontSize: 13, fill: B.COLOR_GOLD, fontWeight: "bold" });
const S_BIG = ST({ fontFamily: "monospace", fontSize: 40, fill: B.COLOR_SUCCESS, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const S_DEAD = ST({ fontFamily: "monospace", fontSize: 44, fill: B.COLOR_DANGER, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const S_STAT = ST({ fontFamily: "monospace", fontSize: 14, fill: 0xcccccc, lineHeight: 22 });
const S_PROMPT = ST({ fontFamily: "monospace", fontSize: 18, fill: B.COLOR_GOLD, fontWeight: "bold" });
const S_FLOAT = ST({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } });
const S_PAUSE = ST({ fontFamily: "monospace", fontSize: 36, fill: B.COLOR_GOLD, fontWeight: "bold" });
const FPOOL = 20;

export class FluxRenderer {
  readonly container = new Container();
  private _g = new Graphics(); private _ui = new Graphics();
  private _hudL = new Text({ text: "", style: S_HUD }); private _hudR = new Text({ text: "", style: S_HUDR });
  private _title = new Text({ text: "FLUX", style: S_TITLE });
  private _sub = new Text({ text: "No weapons. Only gravity. Bend the battlefield.", style: S_SUB });
  private _ctrl = new Text({ text: "", style: S_CTRL });
  private _meta2 = new Text({ text: "", style: ST({ fontFamily: "monospace", fontSize: 13, fill: 0x556677, lineHeight: 20 }) });
  private _prompt = new Text({ text: "", style: S_PROMPT }); private _big = new Text({ text: "", style: S_BIG });
  private _dead = new Text({ text: "VOID CONSUMED", style: S_DEAD });
  private _stats = new Text({ text: "", style: S_STAT }); private _pause = new Text({ text: "PAUSED", style: S_PAUSE });
  private _tutorial = new Text({ text: "", style: ST({ fontFamily: "monospace", fontSize: 15, fill: B.COLOR_PLAYER, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 3, alpha: 0.8 } }) });
  private _fl: Text[] = []; private _flC = new Container();

  build(): void {
    this.container.addChild(this._g, this._ui);
    for (const e of [this._hudL, this._hudR, this._title, this._sub, this._ctrl, this._meta2, this._prompt, this._big, this._dead, this._stats, this._pause, this._tutorial])
      this.container.addChild(e);
    for (let i = 0; i < FPOOL; i++) {
      const t = new Text({ text: "", style: S_FLOAT }); t.anchor.set(0.5); t.visible = false;
      this._fl.push(t); this._flC.addChild(t);
    }
    this.container.addChild(this._flC);
    this._ctrl.text = "WASD — Move    Arrows — Aim (or move if no WASD)\nSPACE — Place gravity well    Shift — Slingshot to nearest well\nE — Repulsor (push enemies away)    R — Gravity Bomb (charged from kills)\nUpgrade your wells between waves. Crash enemies. Redirect shots.\nESC — Pause";
  }

  destroy(): void { this.container.removeChildren(); this._g.destroy(); this._ui.destroy(); this._fl.forEach(t => t.destroy()); this._fl = []; }

  render(s: FluxState, sw: number, sh: number, meta: FluxMeta): void {
    const g = this._g; g.clear();
    const pad = B.ARENA_PADDING;
    let sx = 0, sy = 0;
    if (s.screenShake > 0) { sx = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; sy = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; }
    const ox = pad + sx, oy = pad + sy;

    // Deep space background with nebula and star layers
    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);
    // Nebula clouds (large soft color patches)
    for (let ni = 0; ni < 8; ni++) {
      const nx = ((ni * 311 + 7) % 100) / 100 * sw;
      const ny = ((ni * 197 + 13) % 100) / 100 * sh;
      const nr = 50 + ni * 25;
      const nc = [0x0a1133, 0x1a0a33, 0x0a2222, 0x1a1a0a][ni % 4];
      g.circle(nx, ny, nr).fill({ color: nc, alpha: 0.06 + 0.02 * Math.sin(s.time * 0.2 + ni) });
    }
    // Background star field (3 layers: dim distant, medium, bright close)
    for (let si = 0; si < 80; si++) {
      const stx = ((si * 73 + 42) % 1000) / 1000 * sw;
      const sty = ((si * 137 + 42) % 1000) / 1000 * sh;
      const layer = si % 3;
      const starSize = layer === 0 ? 0.4 : layer === 1 ? 0.7 : 1.1;
      const starAlpha = (layer === 0 ? 0.03 : layer === 1 ? 0.05 : 0.08) + 0.03 * Math.sin(s.time * (0.3 + layer * 0.2) + si * 1.7);
      const starColor = layer === 2 ? 0x6688bb : 0x445577;
      g.circle(stx, sty, starSize).fill({ color: starColor, alpha: starAlpha });
      // Bright stars get a tiny glow
      if (layer === 2 && si % 5 === 0) {
        g.circle(stx, sty, starSize * 3).fill({ color: starColor, alpha: starAlpha * 0.3 });
      }
    }

    // Arena center sigil (slow rotating arcane circle)
    const acx = ox + s.arenaW / 2, acy = oy + s.arenaH / 2;
    const sigR = Math.min(s.arenaW, s.arenaH) * 0.3;
    g.circle(acx, acy, sigR).stroke({ color: B.COLOR_ARENA_GRID, width: 0.6, alpha: 0.07 });
    g.circle(acx, acy, sigR * 0.6).stroke({ color: B.COLOR_ARENA_GRID, width: 0.4, alpha: 0.05 });
    for (let si = 0; si < 6; si++) {
      const sa = si * Math.PI / 3 + s.time * 0.03;
      g.moveTo(acx + Math.cos(sa) * sigR * 0.1, acy + Math.sin(sa) * sigR * 0.1)
        .lineTo(acx + Math.cos(sa) * sigR, acy + Math.sin(sa) * sigR)
        .stroke({ color: B.COLOR_ARENA_GRID, width: 0.4, alpha: 0.04 });
    }

    // Grid (distorted near wells + ambient wave ripple)
    const gridSz = 30;
    const stepSz = 3;
    for (let gx = 0; gx <= s.arenaW; gx += gridSz) {
      for (let gy = 0; gy < s.arenaH; gy += stepSz) {
        let dx2 = 0;
        let brightBoost = 0;
        // Ambient wave ripple (subtle breathing movement)
        dx2 += Math.sin(gy * 0.04 + s.time * 0.8) * 0.8;
        for (const w of s.wells) {
          const d = dist2(gx, gy, w.x, w.y);
          if (d < w.radius * 1.3) {
            const f = Math.pow(1 - Math.min(1, d / (w.radius * 1.3)), 2) * 25 * (w.life / w.maxLife);
            dx2 += (w.x - gx) / (d + 5) * f;
            brightBoost = Math.max(brightBoost, (1 - d / w.radius) * 0.3);
          }
        }
        // Player proximity brightening
        const pd = dist2(gx, gy, s.px, s.py);
        if (pd < 80) brightBoost = Math.max(brightBoost, (1 - pd / 80) * 0.1);
        g.rect(ox + gx + dx2, oy + gy, 0.6, stepSz).fill({ color: B.COLOR_ARENA_GRID, alpha: 0.16 + brightBoost });
      }
    }
    for (let gy = 0; gy <= s.arenaH; gy += gridSz) {
      for (let gx = 0; gx < s.arenaW; gx += stepSz) {
        let dy2 = 0;
        let brightBoost = 0;
        dy2 += Math.sin(gx * 0.04 + s.time * 0.8) * 0.8;
        for (const w of s.wells) {
          const d = dist2(gx, gy, w.x, w.y);
          if (d < w.radius * 1.3) {
            const f = Math.pow(1 - Math.min(1, d / (w.radius * 1.3)), 2) * 25 * (w.life / w.maxLife);
            dy2 += (w.y - gy) / (d + 5) * f;
            brightBoost = Math.max(brightBoost, (1 - d / w.radius) * 0.3);
          }
        }
        const pd = dist2(gx, gy, s.px, s.py);
        if (pd < 80) brightBoost = Math.max(brightBoost, (1 - pd / 80) * 0.1);
        g.rect(ox + gx, oy + gy + dy2, stepSz, 0.6).fill({ color: B.COLOR_ARENA_GRID, alpha: 0.16 + brightBoost });
      }
    }

    // Well-to-well connection lines (gravitational bridges)
    for (let wi = 0; wi < s.wells.length; wi++) {
      for (let wj = wi + 1; wj < s.wells.length; wj++) {
        const w1 = s.wells[wi], w2 = s.wells[wj];
        const wd = dist2(w1.x, w1.y, w2.x, w2.y);
        if (wd < w1.radius + w2.radius) {
          const la = Math.min(w1.life / w1.maxLife, w2.life / w2.maxLife);
          // Pulsing bridge line
          const bp2 = 0.08 + 0.04 * Math.sin(s.time * 4);
          g.moveTo(ox + w1.x, oy + w1.y).lineTo(ox + w2.x, oy + w2.y)
            .stroke({ color: B.COLOR_WELL_CORE, width: 1.5, alpha: la * bp2 });
          // Energy dots along bridge
          for (let bd = 0; bd < 3; bd++) {
            const bt = ((s.time * 2 + bd * 0.33) % 1);
            const bx = w1.x + (w2.x - w1.x) * bt;
            const by = w1.y + (w2.y - w1.y) * bt;
            g.circle(ox + bx, oy + by, 1.5).fill({ color: B.COLOR_WELL_CORE, alpha: la * 0.25 });
          }
        }
      }
    }

    // Ambient void particles drifting across arena
    for (let vi = 0; vi < 15; vi++) {
      const vx2 = ((vi * 257 + 31) % 1000) / 1000 * s.arenaW;
      const vy2 = ((vi * 439 + 67) % 1000) / 1000 * s.arenaH;
      const vDrift = Math.sin(s.time * 0.3 + vi * 2.1) * 20;
      const vAlpha = 0.04 + 0.03 * Math.sin(s.time * 0.6 + vi * 1.3);
      g.circle(ox + vx2 + vDrift, oy + vy2 + Math.cos(s.time * 0.25 + vi) * 15, 1.5 + (vi % 3) * 0.5)
        .fill({ color: vi % 3 === 0 ? 0x4444aa : 0x6633aa, alpha: vAlpha });
    }

    // Arena border (animated energy field)
    const ba = 0.35 + (s.arenaPulse > 0 ? 0.35 * Math.sin(s.arenaPulse) : 0);
    const borderCol = s.arenaPulse > 0 ? B.COLOR_DANGER : B.COLOR_ARENA_BORDER;
    // Double frame
    g.rect(ox - 2, oy - 2, s.arenaW + 4, s.arenaH + 4).stroke({ color: borderCol, width: 0.5, alpha: ba * 0.3 });
    g.rect(ox, oy, s.arenaW, s.arenaH).stroke({ color: borderCol, width: 2, alpha: ba });
    // Animated energy nodes along border
    for (let bi = 0; bi < 20; bi++) {
      const bt = (s.time * 0.5 + bi * 0.05) % 1;
      const side = bi % 4;
      let bx: number, by: number;
      if (side === 0) { bx = ox + s.arenaW * bt; by = oy; }
      else if (side === 1) { bx = ox + s.arenaW; by = oy + s.arenaH * bt; }
      else if (side === 2) { bx = ox + s.arenaW * (1 - bt); by = oy + s.arenaH; }
      else { bx = ox; by = oy + s.arenaH * (1 - bt); }
      g.circle(bx, by, 1.5).fill({ color: B.COLOR_PLAYER, alpha: 0.25 + 0.15 * Math.sin(s.time * 3 + bi) });
    }
    // Ornate corners with glow
    const cn = 22;
    for (const [ccx, ccy, cdx, cdy] of [[0,0,1,1],[s.arenaW,0,-1,1],[0,s.arenaH,1,-1],[s.arenaW,s.arenaH,-1,-1]] as [number,number,number,number][]) {
      const cx2 = ox + ccx, cy2 = oy + ccy;
      g.moveTo(cx2, cy2 + cdy * cn).lineTo(cx2, cy2).lineTo(cx2 + cdx * cn, cy2)
        .stroke({ color: B.COLOR_PLAYER, width: 2.5, alpha: 0.6 });
      g.moveTo(cx2 + cdx * 3, cy2 + cdy * (cn - 5)).lineTo(cx2 + cdx * 3, cy2 + cdy * 3).lineTo(cx2 + cdx * (cn - 5), cy2 + cdy * 3)
        .stroke({ color: B.COLOR_PLAYER, width: 1, alpha: 0.25 });
      g.circle(cx2 + cdx * 4, cy2 + cdy * 4, 2.5).fill({ color: B.COLOR_PLAYER, alpha: 0.45 });
      // Corner glow
      g.circle(cx2 + cdx * 4, cy2 + cdy * 4, 8).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.04 });
    }

    // ----- Gravity wells (dramatically enhanced) -----
    for (const w of s.wells) {
      const wa = w.life / w.maxLife;
      const wx = ox + w.x, wy = oy + w.y;
      const birthProgress = Math.min(1, (w.maxLife - w.life) / 0.3); // 0→1 in first 0.3s

      // Birth expanding ring
      if (birthProgress < 1) {
        const birthR = w.radius * birthProgress;
        g.circle(wx, wy, birthR).stroke({ color: B.COLOR_WELL_CORE, width: 3 * (1 - birthProgress), alpha: 0.5 * (1 - birthProgress) });
        g.circle(wx, wy, birthR * 0.6).stroke({ color: 0xffffff, width: 1.5 * (1 - birthProgress), alpha: 0.3 * (1 - birthProgress) });
      }

      const isRepulsor = w.strength < 0;
      const wellColor = isRepulsor ? 0x44ddff : B.COLOR_WELL_RING;
      const wellCore = isRepulsor ? 0xaaeeff : B.COLOR_WELL_CORE;

      // Outer distortion rings
      g.circle(wx, wy, w.radius).stroke({ color: wellColor, width: 1.5, alpha: wa * 0.25 });
      g.circle(wx, wy, w.radius * 0.8).stroke({ color: wellColor, width: 0.7, alpha: wa * 0.15 });
      g.circle(wx, wy, w.radius * 0.5).stroke({ color: wellColor, width: 0.5, alpha: wa * 0.1 });
      if (!isRepulsor) {
        // Dark void fill (gravity well only)
        g.circle(wx, wy, w.radius * 0.6).fill({ color: 0x000011, alpha: wa * 0.15 });
        g.circle(wx, wy, w.radius * 0.3).fill({ color: 0x000005, alpha: wa * 0.2 });
      } else {
        // Bright center for repulsor
        g.circle(wx, wy, w.radius * 0.5).fill({ color: 0x113344, alpha: wa * 0.08 });
      }

      // Spiral arms (inward for wells, outward for repulsor)
      const spiralDir = isRepulsor ? -1 : 1;
      for (let si = 0; si < 8; si++) {
        const sa = s.time * 4 * spiralDir + si * Math.PI / 4;
        const r1 = w.radius * 0.1, r2 = w.radius * 0.9;
        g.moveTo(wx + Math.cos(sa) * r1, wy + Math.sin(sa) * r1)
          .lineTo(wx + Math.cos(sa + 0.5 * spiralDir) * r2, wy + Math.sin(sa + 0.5 * spiralDir) * r2)
          .stroke({ color: isRepulsor ? 0x44ddff : B.COLOR_WELL, width: 1.5, alpha: wa * 0.25 });
      }

      // Pulsing core with bloom
      const coreR = 6 + Math.sin(s.time * 8) * 3;
      g.circle(wx, wy, coreR * 4).fill({ color: isRepulsor ? 0x44ddff : B.COLOR_WELL, alpha: wa * 0.02 });
      g.circle(wx, wy, coreR * 3).fill({ color: isRepulsor ? 0x44ddff : B.COLOR_WELL, alpha: wa * 0.04 });
      g.circle(wx, wy, coreR * 2).fill({ color: wellCore, alpha: wa * 0.06 });
      g.circle(wx, wy, coreR * 1.3).fill({ color: wellCore, alpha: wa * 0.12 });
      g.circle(wx, wy, coreR).fill({ color: wellCore, alpha: wa * 0.7 });
      g.circle(wx, wy, coreR * 0.4).fill({ color: 0xffffff, alpha: wa * 0.4 });

      // Orbiting dots (inward for wells, outward for repulsor)
      for (let di = 0; di < 6; di++) {
        const da = s.time * 2.5 * spiralDir + di * Math.PI / 3;
        const prog = ((s.time * 0.8 + di * 0.17) % 1);
        const dr = isRepulsor ? w.radius * (0.2 + prog * 0.7) : w.radius * (1 - prog * 0.85);
        const dotSize = isRepulsor ? 2 * prog : 2 * (1 - prog);
        g.circle(wx + Math.cos(da) * dr, wy + Math.sin(da) * dr, dotSize)
          .fill({ color: wellColor, alpha: wa * 0.4 * (isRepulsor ? prog : (1 - prog)) });
      }

      // Life indicator
      g.circle(wx, wy, w.radius * wa).stroke({ color: wellCore, width: 0.5, alpha: 0.15 });
    }

    // ----- Spawn warnings -----
    for (const w of s.spawnWarnings) {
      const wa = w.timer / B.SPAWN_WARNING_TIME;
      const wx2 = ox + w.x, wy2 = oy + w.y;
      g.circle(wx2, wy2, 14 + (1 - wa) * 10).stroke({ color: B.COLOR_DANGER, width: 2, alpha: wa * 0.5 });
      g.circle(wx2, wy2, 5).fill({ color: B.COLOR_DANGER, alpha: wa * 0.35 });
    }

    // ----- Gravity bomb visual (epic bloom explosion) -----
    if (s.gravBombActive > 0) {
      const ba2 = s.gravBombActive / B.GRAV_BOMB_DURATION;
      const br2 = B.GRAV_BOMB_RADIUS * Math.min(1, (1 - ba2) * 3);
      const bpx = ox + s.px, bpy = oy + s.py;
      // Bloom layers (massive glow)
      g.circle(bpx, bpy, br2 * 1.3).fill({ color: B.COLOR_WELL, alpha: ba2 * 0.02 });
      g.circle(bpx, bpy, br2 * 1.1).fill({ color: B.COLOR_WELL, alpha: ba2 * 0.04 });
      g.circle(bpx, bpy, br2).fill({ color: B.COLOR_WELL, alpha: ba2 * 0.06 });
      // Dark inner void
      g.circle(bpx, bpy, br2 * 0.4).fill({ color: 0x000011, alpha: ba2 * 0.3 });
      // Outer ring with pulse
      g.circle(bpx, bpy, br2).stroke({ color: B.COLOR_WELL_CORE, width: 4, alpha: ba2 * 0.5 });
      g.circle(bpx, bpy, br2 * 0.95).stroke({ color: 0xffffff, width: 1, alpha: ba2 * 0.15 });
      // 12 spiral arms
      for (let bi = 0; bi < 12; bi++) {
        const ba3 = s.time * 6 + bi * Math.PI / 6;
        const r1 = br2 * 0.1, r2 = br2 * 0.95;
        g.moveTo(bpx + Math.cos(ba3) * r1, bpy + Math.sin(ba3) * r1)
          .lineTo(bpx + Math.cos(ba3 + 0.3) * r2, bpy + Math.sin(ba3 + 0.3) * r2)
          .stroke({ color: B.COLOR_WELL_CORE, width: 1.5, alpha: ba2 * 0.25 });
      }
      // Inward-falling debris
      for (let di = 0; di < 8; di++) {
        const da = s.time * 3 + di * Math.PI / 4;
        const prog = ((s.time + di * 0.13) % 1);
        const dr = br2 * (1 - prog * 0.85);
        g.circle(bpx + Math.cos(da) * dr, bpy + Math.sin(da) * dr, 2 * (1 - prog))
          .fill({ color: B.COLOR_WELL_RING, alpha: ba2 * 0.5 * (1 - prog) });
      }
      // Central singularity
      const singR = 8 + Math.sin(s.time * 10) * 4;
      g.circle(bpx, bpy, singR).fill({ color: B.COLOR_WELL_CORE, alpha: ba2 * 0.6 });
      g.circle(bpx, bpy, singR * 0.4).fill({ color: 0xffffff, alpha: ba2 * 0.4 });
    }

    // ----- Enemies (enhanced visuals per type + gravity drag trails + death FX) -----
    for (const e of s.enemies) {
      const ex = ox + e.x, ey = oy + e.y;
      const alive = e.alive;
      const alpha = alive ? 1 : Math.max(0, e.deathTimer / 0.3);
      const scale = alive ? 1 : 1 + (1 - alpha) * 0.5;
      const flash = e.flashTimer > 0;
      const color = flash ? 0xffffff : e.color;
      const darkColor = flash ? 0xcccccc : lerpC(e.color, 0x000000, 0.3);
      const r = e.radius * scale;

      // Outer glow (bloom layer)
      g.circle(ex, ey, r * 2.5).fill({ color: e.color, alpha: alpha * 0.02 });
      g.circle(ex, ey, r * 1.6).fill({ color: e.color, alpha: alpha * 0.05 });
      // Flash impact bloom (when recently hit)
      if (flash) {
        g.circle(ex, ey, r * 2).fill({ color: 0xffffff, alpha: 0.08 });
      }

      // Gravity drag trails — lines stretching toward active wells
      if (alive) {
        for (const w of s.wells) {
          const wd = dist2(e.x, e.y, w.x, w.y);
          if (wd < w.radius && wd > 10) {
            const dragAlpha = (1 - wd / w.radius) * 0.25 * (w.life / w.maxLife);
            const wa = Math.atan2(w.y - e.y, w.x - e.x);
            const dragLen = Math.min(30, (1 - wd / w.radius) * 40);
            g.moveTo(ex, ey).lineTo(ex + Math.cos(wa) * dragLen, ey + Math.sin(wa) * dragLen)
              .stroke({ color: B.COLOR_WELL_RING, width: r * 0.4, alpha: dragAlpha });
            // Stretch dot at tip
            g.circle(ex + Math.cos(wa) * dragLen, ey + Math.sin(wa) * dragLen, 1.5)
              .fill({ color: B.COLOR_WELL_CORE, alpha: dragAlpha * 1.5 });
          }
        }
      }

      // Velocity trail
      const sp = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
      if (sp > 30 && alive) {
        const tl = Math.min(18, sp * 0.035);
        g.moveTo(ex - e.vx / sp * tl, ey - e.vy / sp * tl).lineTo(ex, ey)
          .stroke({ color: e.color, width: r * 0.5, alpha: 0.25 });
      }

      // Type-specific rendering
      switch (e.type) {
        case EnemyType.DRONE:
          g.circle(ex, ey, r).fill({ color, alpha: alpha * 0.85 });
          // Inner ring
          g.circle(ex, ey, r * 0.55).stroke({ color: darkColor, width: 1, alpha: alpha * 0.3 });
          // Orbiting dot
          g.circle(ex + Math.cos(s.time * 3) * r * 0.5, ey + Math.sin(s.time * 3) * r * 0.5, 1.5)
            .fill({ color: 0xffffff, alpha: alpha * 0.3 });
          break;
        case EnemyType.SHOOTER:
          // Diamond body
          g.star(ex, ey, 4, r, r * 0.55).fill({ color, alpha: alpha * 0.85 });
          g.star(ex, ey, 4, r, r * 0.55).stroke({ color: 0xffffff, width: 0.7, alpha: alpha * 0.15 });
          // Crosshair
          g.moveTo(ex - r * 0.4, ey).lineTo(ex + r * 0.4, ey).stroke({ color: 0xffffff, width: 0.8, alpha: alpha * 0.25 });
          g.moveTo(ex, ey - r * 0.4).lineTo(ex, ey + r * 0.4).stroke({ color: 0xffffff, width: 0.8, alpha: alpha * 0.25 });
          g.circle(ex, ey, 2).fill({ color: 0xffffff, alpha: alpha * 0.4 });
          // Barrel glow when about to fire
          if (e.attackTimer < 0.5) {
            const fireGlow = (0.5 - e.attackTimer) / 0.5;
            g.circle(ex, ey, r * 0.7).fill({ color: B.COLOR_ENEMY_PROJ, alpha: alpha * fireGlow * 0.15 });
          }
          break;
        case EnemyType.TANK:
          // Hexagonal shield
          g.star(ex, ey, 6, r, r * 0.87).fill({ color, alpha: alpha * 0.85 });
          g.star(ex, ey, 6, r, r * 0.87).stroke({ color: 0xffffff, width: 2.5, alpha: alpha * 0.25 });
          // Inner hex
          g.star(ex, ey, 6, r * 0.5, r * 0.43).fill({ color: darkColor, alpha: alpha * 0.3 });
          // Center mass indicator
          g.circle(ex, ey, r * 0.2).fill({ color: 0xffffff, alpha: alpha * 0.2 });
          // Rotating armor plates
          for (let ai = 0; ai < 3; ai++) {
            const aa = s.time * 0.5 + ai * Math.PI * 2 / 3;
            g.circle(ex + Math.cos(aa) * r * 0.65, ey + Math.sin(aa) * r * 0.65, 2)
              .fill({ color: 0xaaaacc, alpha: alpha * 0.2 });
          }
          break;
        case EnemyType.SWARM:
          // Tiny vibrating triangle
          const vibX = Math.sin(s.time * 15 + e.x) * 1.5;
          const vibY = Math.cos(s.time * 15 + e.y) * 1.5;
          g.star(ex + vibX, ey + vibY, 3, r, r * 0.5).fill({ color, alpha: alpha * 0.85 });
          break;
        case EnemyType.BOMBER:
          // Pulsing danger orb
          const bp = 0.7 + 0.3 * Math.sin(s.time * 5);
          g.circle(ex, ey, r * bp).fill({ color, alpha: alpha * 0.85 });
          g.circle(ex, ey, r * 0.5 * bp).fill({ color: 0xffaa44, alpha: alpha * 0.35 });
          // Danger ring expanding/contracting
          g.circle(ex, ey, r * 1.3 * bp).stroke({ color: 0xff6644, width: 1, alpha: alpha * 0.2 });
          // Fuse sparks
          for (let fi = 0; fi < 2; fi++) {
            const fa = s.time * 8 + fi * Math.PI;
            g.circle(ex + Math.cos(fa) * r * 0.7, ey + Math.sin(fa) * r * 0.7, 1)
              .fill({ color: 0xffdd44, alpha: alpha * 0.5 });
          }
          break;
      }

      // Universal outer ring
      g.circle(ex, ey, r).stroke({ color: 0xffffff, width: 0.5, alpha: alpha * 0.08 });

      // HP bar
      if (e.maxHp > 2 && alive) {
        const bw = r * 2.2;
        g.roundRect(ex - bw / 2, ey - r - 6, bw, 3, 1).fill({ color: 0x111111, alpha: 0.6 });
        g.roundRect(ex - bw / 2, ey - r - 6, bw * (e.hp / e.maxHp), 3, 1).fill({ color: B.COLOR_HP, alpha: 0.75 });
      }

      // Death effects (per type, with bloom)
      if (!alive) {
        const dp = 1 - e.deathTimer / 0.3;
        // Universal death bloom flash
        g.circle(ex, ey, r * (1 + dp * 3)).fill({ color: e.color, alpha: alpha * 0.04 });
        switch (e.type) {
          case EnemyType.BOMBER:
            // Explosion with bloom layers
            g.circle(ex, ey, e.explodeRadius * dp * 1.2).fill({ color: 0xff4422, alpha: alpha * 0.03 });
            g.circle(ex, ey, e.explodeRadius * dp).fill({ color: 0xff6644, alpha: alpha * 0.06 });
            g.circle(ex, ey, e.explodeRadius * dp).stroke({ color: 0xff6644, width: 3, alpha: alpha * 0.5 });
            g.circle(ex, ey, e.explodeRadius * dp * 0.7).stroke({ color: 0xffaa44, width: 2, alpha: alpha * 0.35 });
            g.circle(ex, ey, e.explodeRadius * dp * 0.3).fill({ color: 0xffdd88, alpha: alpha * 0.2 });
            // Inner flash
            g.circle(ex, ey, e.explodeRadius * dp * 0.1).fill({ color: 0xffffff, alpha: alpha * 0.3 });
            break;
          case EnemyType.TANK:
            // Crumble fragments with trails
            for (let fi = 0; fi < 6; fi++) {
              const fa = fi * Math.PI / 3 + dp * 0.5;
              const fr = r * (1 + dp * 3.5);
              const fx2 = ex + Math.cos(fa) * fr, fy2 = ey + Math.sin(fa) * fr;
              g.moveTo(ex + Math.cos(fa) * r * 0.5, ey + Math.sin(fa) * r * 0.5).lineTo(fx2, fy2)
                .stroke({ color: e.color, width: 1, alpha: alpha * 0.15 });
              g.circle(fx2, fy2, 3.5 * alpha).fill({ color: e.color, alpha: alpha * 0.5 });
            }
            g.circle(ex, ey, r * (1 + dp)).stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.12 });
            break;
          case EnemyType.SWARM:
            g.circle(ex, ey, r * (1 + dp * 5)).stroke({ color: e.color, width: 1, alpha: alpha * 0.5 });
            g.circle(ex, ey, r * (1 + dp * 3)).fill({ color: e.color, alpha: alpha * 0.06 });
            break;
          default:
            g.circle(ex, ey, r * (1 + dp * 3)).stroke({ color: e.color, width: 2, alpha: alpha * 0.4 });
            g.circle(ex, ey, r * (1 + dp * 2)).stroke({ color: 0xffffff, width: 0.7, alpha: alpha * 0.15 });
            g.circle(ex, ey, r * (1 + dp)).fill({ color: e.color, alpha: alpha * 0.05 });
        }
      }
    }

    // ----- Redirect trajectory preview (show where projectile will curve) -----
    for (const p of s.projectiles) {
      if (!p.fromEnemy || p.redirected) continue;
      // Check if near any well
      for (const w of s.wells) {
        const pd = dist2(p.x, p.y, w.x, w.y);
        if (pd < w.radius * 1.5 && pd > 10) {
          // Show predicted curve: 3 dots ahead
          let pvx = p.vx, pvy = p.vy;
          let ppx2 = p.x, ppy2 = p.y;
          for (let pi = 0; pi < 4; pi++) {
            const pdt = 0.08;
            const pd2 = dist2(ppx2, ppy2, w.x, w.y);
            if (pd2 < w.radius && pd2 > 3) {
              const force = w.strength * (1 - pd2 / w.radius) * 2;
              const pa = Math.atan2(w.y - ppy2, w.x - ppx2);
              pvx += Math.cos(pa) * force * pdt;
              pvy += Math.sin(pa) * force * pdt;
            }
            ppx2 += pvx * pdt; ppy2 += pvy * pdt;
            g.circle(ox + ppx2, oy + ppy2, 1.5).fill({ color: B.COLOR_REDIRECT, alpha: 0.15 - pi * 0.03 });
          }
          break;
        }
      }
    }

    // ----- Projectiles (bloom-enhanced) -----
    for (const p of s.projectiles) {
      const px2 = ox + p.x, py2 = oy + p.y;
      const alpha = Math.min(1, p.life * 2);
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      // Trail
      if (sp > 30) {
        const tl = Math.min(15, sp * 0.03);
        g.moveTo(px2 - p.vx / sp * tl, py2 - p.vy / sp * tl).lineTo(px2, py2)
          .stroke({ color: p.color, width: p.radius * 0.8, alpha: alpha * 0.4 });
      }
      if (p.redirected) {
        // Redirected: multi-layer green bloom
        const rp = 0.7 + 0.3 * Math.sin(s.time * 12);
        g.circle(px2, py2, p.radius * 4).fill({ color: B.COLOR_REDIRECT, alpha: alpha * 0.03 * rp });
        g.circle(px2, py2, p.radius * 2.5).fill({ color: B.COLOR_REDIRECT, alpha: alpha * 0.06 * rp });
        g.circle(px2, py2, p.radius * 1.5).stroke({ color: B.COLOR_REDIRECT, width: 1.5, alpha: alpha * 0.35 * rp });
        g.circle(px2, py2, p.radius).fill({ color: B.COLOR_REDIRECT, alpha });
        g.circle(px2, py2, p.radius * 0.35).fill({ color: 0xffffff, alpha: alpha * 0.7 });
      } else if (p.fromEnemy) {
        // Enemy: rotating danger star
        const rot = s.time * 8;
        g.circle(px2, py2, p.radius * 2.5).fill({ color: B.COLOR_DANGER, alpha: alpha * 0.04 });
        g.circle(px2, py2, p.radius * 1.8).stroke({ color: B.COLOR_DANGER, width: 1, alpha: alpha * 0.2 });
        g.star(px2, py2, 3, p.radius, p.radius * 0.4, rot).fill({ color: p.color, alpha });
        g.circle(px2, py2, p.radius * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.5 });
      } else {
        g.circle(px2, py2, p.radius * 1.8).fill({ color: p.color, alpha: alpha * 0.06 });
        g.circle(px2, py2, p.radius).fill({ color: p.color, alpha });
        g.circle(px2, py2, p.radius * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.5 });
      }
    }

    // ----- Particles (with bloom) -----
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      const px2 = ox + p.x, py2 = oy + p.y;
      const sp = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp > 15) {
        const tl = Math.min(8, sp * 0.025);
        g.moveTo(px2 - p.vx / sp * tl, py2 - p.vy / sp * tl).lineTo(px2, py2)
          .stroke({ color: p.color, width: p.size * alpha * 0.6, alpha: alpha * 0.35 });
      }
      // Bloom glow on larger particles
      if (p.size > 2) {
        g.circle(px2, py2, p.size * alpha * 2).fill({ color: p.color, alpha: alpha * 0.04 });
      }
      g.circle(px2, py2, p.size * alpha).fill({ color: p.color, alpha });
      // Bright core on big particles
      if (p.size > 2.5) {
        g.circle(px2, py2, p.size * alpha * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.25 });
      }
    }

    // ----- Player -----
    const ppx = ox + s.px, ppy = oy + s.py;
    if (s.invincibleTimer > 0 && Math.floor(s.invincibleTimer * 8) % 2 === 0) { /* blink */ } else {
      // Momentum trail
      const psp = Math.sqrt(s.pvx * s.pvx + s.pvy * s.pvy);
      if (psp > 20) {
        const tl = Math.min(22, psp * 0.05);
        g.moveTo(ppx - s.pvx / psp * tl, ppy - s.pvy / psp * tl).lineTo(ppx, ppy)
          .stroke({ color: B.COLOR_PLAYER, width: B.PLAYER_RADIUS * 0.7, alpha: 0.2 });
        // Extra afterimage
        g.circle(ppx - s.pvx / psp * tl * 0.5, ppy - s.pvy / psp * tl * 0.5, B.PLAYER_RADIUS * 0.6)
          .fill({ color: B.COLOR_PLAYER, alpha: 0.08 });
      }
      // Orbiting shield ring (3 dots circling)
      const orbR = B.PLAYER_RADIUS * 2;
      for (let oi = 0; oi < 3; oi++) {
        const oa = s.time * 2.5 + oi * Math.PI * 2 / 3;
        g.circle(ppx + Math.cos(oa) * orbR, ppy + Math.sin(oa) * orbR, 2)
          .fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.5 });
        g.circle(ppx + Math.cos(oa) * orbR, ppy + Math.sin(oa) * orbR, 5)
          .fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.04 });
      }
      g.circle(ppx, ppy, orbR).stroke({ color: B.COLOR_PLAYER_GLOW, width: 0.5, alpha: 0.08 });

      // Player bloom layers
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 4.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.01 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 3.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.02 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 2.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.035 });
      // Body
      g.circle(ppx, ppy, B.PLAYER_RADIUS).fill(B.COLOR_PLAYER);
      g.circle(ppx, ppy, B.PLAYER_RADIUS).stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 0.45).fill({ color: 0xffffff, alpha: 0.35 });
      // Thruster flame when moving
      if (psp > 30) {
        const thrustA = Math.atan2(-s.pvy, -s.pvx); // behind movement
        const thrustLen = Math.min(12, psp * 0.03);
        for (let ti = 0; ti < 3; ti++) {
          const tOff = (ti - 1) * 0.3;
          const tx = ppx + Math.cos(thrustA + tOff) * (B.PLAYER_RADIUS + thrustLen * (0.5 + ti * 0.25));
          const ty = ppy + Math.sin(thrustA + tOff) * (B.PLAYER_RADIUS + thrustLen * (0.5 + ti * 0.25));
          g.circle(tx, ty, 2 - ti * 0.4).fill({ color: ti === 0 ? 0xffffff : B.COLOR_PLAYER_GLOW, alpha: 0.3 - ti * 0.08 });
        }
      }

      // Aim indicator — shows where next well will be placed
      const aimLen = B.WELL_PLACE_RANGE;
      const aimX = ppx + Math.cos(s.aimAngle) * aimLen;
      const aimY = ppy + Math.sin(s.aimAngle) * aimLen;
      // Dashed aim line
      for (let ai = 0; ai < 6; ai++) {
        const t1 = ai / 6, t2 = (ai + 0.4) / 6;
        const ax1 = ppx + Math.cos(s.aimAngle) * aimLen * t1;
        const ay1 = ppy + Math.sin(s.aimAngle) * aimLen * t1;
        const ax2 = ppx + Math.cos(s.aimAngle) * aimLen * t2;
        const ay2 = ppy + Math.sin(s.aimAngle) * aimLen * t2;
        g.moveTo(ax1, ay1).lineTo(ax2, ay2).stroke({ color: B.COLOR_WELL_RING, width: 1.5, alpha: 0.2 });
      }
      // Aim endpoint (well placement preview)
      if (s.wellCharges > 0) {
        const aimPulse = 0.4 + 0.2 * Math.sin(s.time * 5);
        g.circle(aimX, aimY, 8).stroke({ color: B.COLOR_WELL_RING, width: 1, alpha: aimPulse });
        g.circle(aimX, aimY, 3).fill({ color: B.COLOR_WELL_CORE, alpha: aimPulse });
      }

      // Slingshot line to nearest well
      if (s.wells.length > 0) {
        let nw = s.wells[0], nd = Infinity;
        for (const w of s.wells) { const d = dist2(s.px, s.py, w.x, w.y); if (d < nd) { nd = d; nw = w; } }
        g.moveTo(ppx, ppy).lineTo(ox + nw.x, oy + nw.y).stroke({ color: B.COLOR_WELL_RING, width: 1, alpha: 0.08 });
      }
    }

    // Vignette (danger-tinted)
    const dangerLevel = s.hp <= 2 ? 0.5 + 0.5 * Math.sin(s.arenaPulse) : 0;
    const vigColor = dangerLevel > 0 ? lerpC(0x000000, B.COLOR_DANGER, dangerLevel * 0.3) : 0x000000;
    for (let vi = 0; vi < 6; vi++) {
      const ins = 65 - vi * 11; if (ins <= 0) continue;
      const va = 0.02 + vi * 0.022;
      g.rect(0, 0, ins, sh).fill({ color: vigColor, alpha: va });
      g.rect(sw - ins, 0, ins, sh).fill({ color: vigColor, alpha: va });
      g.rect(ins, 0, sw - ins * 2, ins * 0.5).fill({ color: vigColor, alpha: va });
      g.rect(ins, sh - ins * 0.5, sw - ins * 2, ins * 0.5).fill({ color: vigColor, alpha: va });
    }
    // Purple void tint on edges
    const tintAlpha = 0.025 + (s.wells.length > 0 ? 0.01 : 0);
    g.rect(0, 0, 35, sh).fill({ color: B.COLOR_WELL, alpha: tintAlpha });
    g.rect(sw - 35, 0, 35, sh).fill({ color: B.COLOR_WELL, alpha: tintAlpha });
    g.rect(0, 0, sw, 25).fill({ color: B.COLOR_WELL, alpha: tintAlpha * 0.7 });
    g.rect(0, sh - 25, sw, 25).fill({ color: B.COLOR_WELL, alpha: tintAlpha * 0.7 });

    if (s.screenFlashTimer > 0) g.rect(0, 0, sw, sh).fill({ color: s.screenFlashColor, alpha: s.screenFlashTimer / B.FLASH_DURATION * 0.2 });

    // Tutorial hints (center-bottom)
    this._tutorial.visible = s.tutorialTimer > 0 && s.phase === FluxPhase.PLAYING && s.tutorialStep < 5;
    if (this._tutorial.visible) {
      const hints = [
        "Press SPACE to place a gravity well near enemies!",
        "Wells redirect enemy shots! Pull bullets into enemies!",
        "Pull enemies into each other for CRASH damage!",
        "Press Shift to slingshot dash to your nearest well!",
        "You've mastered the basics! Good luck!",
      ];
      this._tutorial.text = hints[Math.min(s.tutorialStep, hints.length - 1)];
      this._tutorial.anchor.set(0.5);
      this._tutorial.x = sw / 2; this._tutorial.y = sh * 0.84;
      this._tutorial.alpha = Math.min(1, s.tutorialTimer * 2);
      // Panel behind text
      const htW = this._tutorial.width + 24;
      g.roundRect((sw - htW) / 2, sh * 0.84 - 10, htW, 26, 6).fill({ color: 0x000000, alpha: this._tutorial.alpha * 0.55 });
      g.roundRect((sw - htW) / 2, sh * 0.84 - 10, htW, 26, 6).stroke({ color: B.COLOR_PLAYER, width: 1, alpha: this._tutorial.alpha * 0.25 });
    }

    // On-screen ability indicators around player (when off cooldown)
    if (s.phase === FluxPhase.PLAYING) {
      const px3 = ox + s.px, py3 = oy + s.py;
      // Gravity bomb ready indicator
      if (s.gravBombCharge >= B.GRAV_BOMB_COST) {
        const rp2 = 0.3 + 0.2 * Math.sin(s.time * 4);
        g.circle(px3, py3, B.PLAYER_RADIUS * 5).stroke({ color: B.COLOR_WELL_CORE, width: 1.5, alpha: rp2 });
      }
      // Repulsor ready indicator
      if (s.repulsorCooldown <= 0) {
        g.circle(px3, py3, B.PLAYER_RADIUS * 3.5).stroke({ color: 0x44ddff, width: 0.5, alpha: 0.1 + 0.05 * Math.sin(s.time * 3) });
      }
    }

    // ===== UI =====
    const ui = this._ui; ui.clear();
    // HP
    const hpW = 100, hpH = 7, hpX = 10, hpY = sh - 20;
    ui.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).fill({ color: 0x111122, alpha: 0.7 });
    ui.roundRect(hpX, hpY, hpW * (s.hp / s.maxHp), hpH, 2).fill(s.hp <= 2 ? lerpC(B.COLOR_HP, 0xffaa22, 0.5 + 0.5 * Math.sin(s.time * 6)) : B.COLOR_HP);
    // Well charges
    for (let ci = 0; ci < s.maxWellCharges; ci++) {
      const ccx = hpX + hpW + 15 + ci * 16;
      const filled = ci < s.wellCharges;
      ui.circle(ccx, hpY + hpH / 2, 5).fill({ color: filled ? B.COLOR_CHARGE : 0x222244, alpha: filled ? 0.8 : 0.4 });
      if (filled) ui.circle(ccx, hpY + hpH / 2, 7).stroke({ color: B.COLOR_CHARGE, width: 0.5, alpha: 0.3 });
    }
    // Dash cooldown
    const dcx = hpX + hpW + 15 + (s.maxWellCharges + s.upgradeMaxCharges) * 16 + 10;
    if (s.dashCooldown > 0) {
      ui.roundRect(dcx, hpY, 24, hpH, 2).fill({ color: 0x111122, alpha: 0.5 });
      ui.roundRect(dcx, hpY, 24 * (1 - s.dashCooldown / B.DASH_COOLDOWN), hpH, 2).fill({ color: B.COLOR_PLAYER, alpha: 0.4 });
    }
    // Repulsor cooldown
    const rcx = dcx + 32;
    if (s.repulsorCooldown > 0) {
      ui.roundRect(rcx, hpY, 24, hpH, 2).fill({ color: 0x111122, alpha: 0.5 });
      ui.roundRect(rcx, hpY, 24 * (1 - s.repulsorCooldown / B.REPULSOR_COOLDOWN), hpH, 2).fill({ color: 0x44ddff, alpha: 0.4 });
    } else {
      ui.roundRect(rcx, hpY, 24, hpH, 2).fill({ color: 0x44ddff, alpha: 0.25 });
    }
    // Gravity bomb charge bar
    const bombX = rcx + 32;
    const bombFill = s.gravBombCharge / B.GRAV_BOMB_COST;
    const bombReady = s.gravBombCharge >= B.GRAV_BOMB_COST;
    ui.roundRect(bombX, hpY, 50, hpH, 2).fill({ color: 0x111122, alpha: 0.6 });
    ui.roundRect(bombX, hpY, 50 * bombFill, hpH, 2).fill({ color: bombReady ? B.COLOR_WELL_CORE : B.COLOR_WELL, alpha: 0.7 });
    if (bombReady) {
      ui.roundRect(bombX - 2, hpY - 2, 54, hpH + 4, 3).stroke({ color: B.COLOR_WELL_CORE, width: 1, alpha: 0.3 + 0.2 * Math.sin(s.time * 5) });
    }

    const show = s.phase === FluxPhase.PLAYING || s.phase === FluxPhase.PAUSED || s.phase === FluxPhase.WAVE_CLEAR;
    this._hudL.visible = show; this._hudR.visible = show;
    if (show) {
      this._hudL.text = `Wave ${s.wave}  |  HP: ${s.hp}/${s.maxHp}  |  Wells: ${s.wellCharges}/${s.maxWellCharges}`;
      this._hudL.x = 10; this._hudL.y = 6;
      const cStr = s.combo > 1 ? `  Combo: ${s.combo}x` : "";
      this._hudR.text = `Score: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}  |  Redirects: ${s.totalRedirects}${cStr}`;
      this._hudR.x = sw - this._hudR.width - 10; this._hudR.y = 6;
    }

    // Floating texts
    let fi = 0;
    for (const ft of s.floatingTexts) {
      if (fi >= FPOOL) break;
      const t = this._fl[fi]; t.visible = true; t.text = ft.text;
      (t.style as TextStyle).fill = ft.color;
      t.x = ox + ft.x; t.y = oy + ft.y; t.alpha = ft.life / ft.maxLife; fi++;
    }
    for (; fi < FPOOL; fi++) this._fl[fi].visible = false;

    // Overlays
    const ovs = [this._title, this._sub, this._ctrl, this._meta2, this._prompt, this._big, this._dead, this._stats, this._pause];
    for (const o of ovs) o.visible = false;

    if (s.phase === FluxPhase.START) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
      show2(this._title, sw / 2, sh * 0.2); show2(this._sub, sw / 2, sh * 0.2 + 55);
      show2(this._ctrl, sw / 2, sh * 0.45);
      this._meta2.visible = true; this._meta2.anchor.set(0.5); this._meta2.x = sw / 2; this._meta2.y = sh * 0.65;
      this._meta2.text = meta.gamesPlayed > 0 ? `High Score: ${meta.highScore}  |  Best Wave: ${meta.bestWave}  |  Kills: ${meta.totalKills}` : "First gravitational anomaly...";
      show2(this._prompt, sw / 2, sh * 0.8); this._prompt.text = "Press SPACE to begin"; this._prompt.alpha = 0.6 + 0.4 * Math.sin(s.time * 3);
    }
    if (s.phase === FluxPhase.PAUSED) { ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 }); show2(this._pause, sw / 2, sh / 2); }
    if (s.phase === FluxPhase.WAVE_CLEAR) {
      show2(this._big, sw / 2, sh * 0.3); this._big.text = `WAVE ${s.wave} CLEAR`;
      this._big.alpha = Math.min(1, s.waveClearTimer * 2);
      // Wave upgrade picker
      show2(this._stats, sw / 2, sh * 0.5);
      this._stats.text = "Choose an upgrade:\n[1] Well Power  [2] Well Range  [3] Recharge Speed  [4] +Charge Slot";
      show2(this._prompt, sw / 2, sh * 0.65);
      this._prompt.text = "Press 1-4 to upgrade, or wait to continue";
      this._prompt.alpha = 0.6 + 0.3 * Math.sin(s.time * 4);
    }
    if (s.phase === FluxPhase.DEAD) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });
      show2(this._dead, sw / 2, sh * 0.12);
      show2(this._stats, sw / 2, sh * 0.28);
      this._stats.text = `Wave: ${s.wave}  |  Score: ${Math.floor(s.score)}\nKills: ${s.totalKills}  |  Redirects: ${s.totalRedirects}  |  Collisions: ${s.totalCollisions}  |  Combo: ${s.bestCombo}x\nShards earned: +${s.wave * B.SHARDS_PER_WAVE}`;
      // Persistent upgrade shop
      const up = meta.upgrades;
      const costs = B.UPGRADE_COSTS as Record<string, number[]>;
      const names = ["+HP", "Well Power", "+Charge", "Bomb Speed"];
      const upKeys = ["maxHp", "wellPower", "extraCharge", "bombCharge"];
      let shopLines = `Void Shards: ${meta.voidShards}\n`;
      for (let i = 0; i < upKeys.length; i++) {
        const k = upKeys[i];
        const lvl = (up as unknown as Record<string, number>)[k] || 0;
        const c = costs[k];
        const bar = "■".repeat(lvl) + "□".repeat(c.length - lvl);
        shopLines += `[${i + 1}] ${names[i].padEnd(12)} ${bar}  ${lvl >= c.length ? "MAX" : c[lvl]}\n`;
      }
      show2(this._prompt, sw / 2, sh * 0.52); this._prompt.text = shopLines + "\nSPACE to retry  |  ESC to exit";
    }
    if (s.phase === FluxPhase.VICTORY) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
      show2(this._big, sw / 2, sh * 0.25); this._big.text = "GRAVITY MASTER"; (this._big.style as TextStyle).fill = B.COLOR_GOLD;
      show2(this._stats, sw / 2, sh * 0.45); this._stats.text = `All ${s.wave} waves bent!\nScore: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}  |  Redirects: ${s.totalRedirects}`;
      show2(this._prompt, sw / 2, sh * 0.65); this._prompt.text = "SPACE to play again  |  ESC to exit";
    }
  }
}

function show2(t: Text, x: number, y: number) { t.visible = true; t.anchor.set(0.5); t.x = x; t.y = y; }
function dist2(ax: number, ay: number, bx: number, by: number) { return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2); }
function lerpC(a: number, b: number, t: number): number {
  return (Math.round(((a >> 16) & 0xff) + (((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * t) << 16) |
    (Math.round(((a >> 8) & 0xff) + (((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * t) << 8) |
    Math.round((a & 0xff) + ((b & 0xff) - (a & 0xff)) * t);
}
