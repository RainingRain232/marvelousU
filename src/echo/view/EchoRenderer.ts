// ---------------------------------------------------------------------------
// Echo — PixiJS Renderer
// Time-loop aesthetic: ghost trails, loop timer ring, recording indicator
// ---------------------------------------------------------------------------

import { Container, Graphics, Text, TextStyle } from "pixi.js";
import { EchoPhase } from "../types";
import type { EchoState, EchoMeta } from "../types";
import { ECHO_BALANCE as B } from "../config/EchoBalance";

const ST = (o: ConstructorParameters<typeof TextStyle>[0]) => new TextStyle(o);
const S_TITLE = ST({ fontFamily: "monospace", fontSize: 48, fill: B.COLOR_PLAYER, fontWeight: "bold", letterSpacing: 10, dropShadow: { color: 0x000000, distance: 3, blur: 8, alpha: 0.7 } });
const S_SUB = ST({ fontFamily: "monospace", fontSize: 15, fill: 0x6688aa, fontStyle: "italic" });
const S_CTRL = ST({ fontFamily: "monospace", fontSize: 12, fill: 0x556677, lineHeight: 18 });
const S_HUD = ST({ fontFamily: "monospace", fontSize: 14, fill: B.COLOR_TEXT, fontWeight: "bold" });
const S_HUDR = ST({ fontFamily: "monospace", fontSize: 13, fill: B.COLOR_GOLD, fontWeight: "bold" });
const S_BIG = ST({ fontFamily: "monospace", fontSize: 38, fill: B.COLOR_LOOP, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const S_DEAD = ST({ fontFamily: "monospace", fontSize: 42, fill: B.COLOR_DANGER, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 3, blur: 6, alpha: 0.7 } });
const S_STAT = ST({ fontFamily: "monospace", fontSize: 14, fill: 0xcccccc, lineHeight: 22 });
const S_PROMPT = ST({ fontFamily: "monospace", fontSize: 18, fill: B.COLOR_GOLD, fontWeight: "bold" });
const S_FLOAT = ST({ fontFamily: "monospace", fontSize: 12, fill: 0xffffff, fontWeight: "bold", dropShadow: { color: 0x000000, distance: 1, blur: 2, alpha: 0.8 } });
const S_PAUSE = ST({ fontFamily: "monospace", fontSize: 36, fill: B.COLOR_GOLD, fontWeight: "bold" });
const FPOOL = 20;

export class EchoRenderer {
  readonly container = new Container();
  private _g = new Graphics(); private _ui = new Graphics();
  private _hudL = new Text({ text: "", style: S_HUD }); private _hudR = new Text({ text: "", style: S_HUDR });
  private _title = new Text({ text: "ECHO", style: S_TITLE });
  private _sub = new Text({ text: "Record. Loop. Multiply. Your past fights beside you.", style: S_SUB });
  private _ctrl = new Text({ text: "", style: S_CTRL });
  private _meta2 = new Text({ text: "", style: ST({ fontFamily: "monospace", fontSize: 13, fill: 0x556677, lineHeight: 20 }) });
  private _prompt = new Text({ text: "", style: S_PROMPT }); private _big = new Text({ text: "", style: S_BIG });
  private _dead = new Text({ text: "TIME COLLAPSED", style: S_DEAD });
  private _stats = new Text({ text: "", style: S_STAT }); private _pause = new Text({ text: "PAUSED", style: S_PAUSE });
  private _fl: Text[] = []; private _flC = new Container();

  build(): void {
    this.container.addChild(this._g, this._ui);
    for (const e of [this._hudL, this._hudR, this._title, this._sub, this._ctrl, this._meta2, this._prompt, this._big, this._dead, this._stats, this._pause])
      this.container.addChild(e);
    for (let i = 0; i < FPOOL; i++) {
      const t = new Text({ text: "", style: S_FLOAT }); t.anchor.set(0.5); t.visible = false;
      this._fl.push(t); this._flC.addChild(t);
    }
    this.container.addChild(this._flC);
    this._ctrl.text = "WASD — Move    Arrows — Aim    SPACE — Shoot\nQ — Time Stop (unlocked at 3 ghosts)\nSurvive 18-second loops. Defeat the boss each loop.\nYour actions replay as ghosts. Stack 5 loops to win.\nESC — Pause";
  }

  destroy(): void { this.container.removeChildren(); this._g.destroy(); this._ui.destroy(); this._fl.forEach(t => t.destroy()); this._fl = []; }

  render(s: EchoState, sw: number, sh: number, meta: EchoMeta): void {
    const g = this._g; g.clear();
    const pad = B.ARENA_PADDING;
    let sx = 0, sy = 0;
    if (s.screenShake > 0) { sx = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; sy = (Math.random() - 0.5) * B.SHAKE_INTENSITY * 2; }
    const ox = pad + sx, oy = pad + sy;

    g.rect(0, 0, sw, sh).fill(B.COLOR_BG);

    // Nebula clouds (time-themed deep blues and cyans)
    for (let ni = 0; ni < 6; ni++) {
      const nx = ((ni * 311 + 7) % 100) / 100 * sw;
      const ny = ((ni * 197 + 13) % 100) / 100 * sh;
      const nr = 45 + ni * 22;
      const nc = [0x0a1133, 0x0a2233, 0x081828, 0x0a0a33, 0x102030, 0x0a1828][ni];
      g.circle(nx, ny, nr).fill({ color: nc, alpha: 0.06 + 0.02 * Math.sin(s.time * 0.15 + ni) });
    }

    // Stars (3 layers)
    for (let si = 0; si < 60; si++) {
      const stx = ((si * 73 + 42) % 1000) / 1000 * sw;
      const sty = ((si * 137 + 42) % 1000) / 1000 * sh;
      const layer = si % 3;
      const sz = layer === 0 ? 0.4 : layer === 1 ? 0.7 : 1.0;
      const sa = (layer === 0 ? 0.03 : layer === 1 ? 0.05 : 0.07) + 0.025 * Math.sin(s.time * (0.3 + layer * 0.2) + si * 1.7);
      g.circle(stx, sty, sz).fill({ color: layer === 2 ? 0x6688bb : 0x445577, alpha: sa });
      if (layer === 2 && si % 5 === 0) g.circle(stx, sty, sz * 3).fill({ color: 0x6688bb, alpha: sa * 0.3 });
    }

    // Ambient time motes (slowly drifting glowing dots)
    for (let mi = 0; mi < 10; mi++) {
      const mx = ((mi * 257 + 31) % 1000) / 1000 * s.arenaW;
      const my = ((mi * 439 + 67) % 1000) / 1000 * s.arenaH;
      const md = Math.sin(s.time * 0.3 + mi * 2.1) * 18;
      const ma = 0.04 + 0.03 * Math.sin(s.time * 0.5 + mi * 1.3);
      g.circle(ox + mx + md, oy + my + Math.cos(s.time * 0.2 + mi) * 12, 1.5)
        .fill({ color: mi % 2 === 0 ? 0x4488cc : 0x44ccaa, alpha: ma });
    }

    // Grid (player-proximity brightening)
    for (let gx = 0; gx <= s.arenaW; gx += 30) {
      const gd = Math.abs(gx - s.px);
      const ga = 0.15 + Math.max(0, 0.12 * (1 - gd / 100));
      g.moveTo(ox + gx, oy).lineTo(ox + gx, oy + s.arenaH).stroke({ color: B.COLOR_ARENA_GRID, width: 0.5, alpha: ga });
    }
    for (let gy = 0; gy <= s.arenaH; gy += 30) {
      const gd = Math.abs(gy - s.py);
      const ga = 0.15 + Math.max(0, 0.12 * (1 - gd / 100));
      g.moveTo(ox, oy + gy).lineTo(ox + s.arenaW, oy + gy).stroke({ color: B.COLOR_ARENA_GRID, width: 0.5, alpha: ga });
    }

    // Clock circle motif (enhanced — ornate with sweep trail)
    const ccx = ox + s.arenaW / 2, ccy = oy + s.arenaH / 2;
    const clockR = Math.min(s.arenaW, s.arenaH) * 0.35;
    const clockAlpha = 0.08 + s.timePressure * 0.14;
    const clockColor = s.timePressure > 0.5 ? B.COLOR_DANGER : B.COLOR_ARENA_GRID;
    // Triple concentric rings
    g.circle(ccx, ccy, clockR).stroke({ color: clockColor, width: 1, alpha: clockAlpha });
    g.circle(ccx, ccy, clockR * 1.05).stroke({ color: clockColor, width: 0.3, alpha: clockAlpha * 0.4 });
    g.circle(ccx, ccy, clockR * 0.6).stroke({ color: clockColor, width: 0.5, alpha: clockAlpha * 0.5 });
    // Hour marks (thicker at 12/3/6/9)
    for (let hi = 0; hi < 12; hi++) {
      const ha = hi * Math.PI / 6;
      const isCardinal = hi % 3 === 0;
      const markLen = isCardinal ? 0.82 : 0.88;
      const markW = isCardinal ? 2 : 1;
      const markAlpha2 = clockAlpha + (s.timePressure > 0 ? 0.06 * Math.sin(s.time * 8 + hi) : 0);
      g.moveTo(ccx + Math.cos(ha) * clockR * markLen, ccy + Math.sin(ha) * clockR * markLen)
        .lineTo(ccx + Math.cos(ha) * clockR, ccy + Math.sin(ha) * clockR)
        .stroke({ color: clockColor, width: markW, alpha: markAlpha2 });
      // Dot at cardinal positions
      if (isCardinal) {
        g.circle(ccx + Math.cos(ha) * clockR * (markLen - 0.04), ccy + Math.sin(ha) * clockR * (markLen - 0.04), 1.5)
          .fill({ color: clockColor, alpha: markAlpha2 * 0.8 });
      }
    }
    // Minute ticks (60 small marks)
    for (let mi = 0; mi < 60; mi++) {
      if (mi % 5 === 0) continue; // skip hour marks
      const ma = mi * Math.PI / 30;
      g.moveTo(ccx + Math.cos(ma) * clockR * 0.95, ccy + Math.sin(ma) * clockR * 0.95)
        .lineTo(ccx + Math.cos(ma) * clockR, ccy + Math.sin(ma) * clockR)
        .stroke({ color: clockColor, width: 0.3, alpha: clockAlpha * 0.4 });
    }
    // Rotating hand with sweep trail
    if (s.phase === EchoPhase.RECORDING) {
      const handAngle = -Math.PI / 2 + (s.loopTimer / s.loopDuration) * Math.PI * 2;
      const handColor = s.timePressure > 0.3 ? B.COLOR_DANGER : B.COLOR_TIMER;
      // Sweep trail (arc from start to current position)
      const sweepSegs = 30;
      for (let si = 0; si < sweepSegs; si++) {
        const t1 = si / sweepSegs, t2 = (si + 1) / sweepSegs;
        const a1 = -Math.PI / 2 + t1 * (s.loopTimer / s.loopDuration) * Math.PI * 2;
        const a2 = -Math.PI / 2 + t2 * (s.loopTimer / s.loopDuration) * Math.PI * 2;
        const sweepAlpha = (t1 * 0.06 + 0.01) * (1 + s.timePressure);
        g.moveTo(ccx + Math.cos(a1) * clockR * 0.3, ccy + Math.sin(a1) * clockR * 0.3)
          .lineTo(ccx + Math.cos(a2) * clockR * 0.3, ccy + Math.sin(a2) * clockR * 0.3)
          .stroke({ color: handColor, width: clockR * 0.55, alpha: sweepAlpha });
      }
      // Hand line
      g.moveTo(ccx, ccy).lineTo(ccx + Math.cos(handAngle) * clockR * 0.88, ccy + Math.sin(handAngle) * clockR * 0.88)
        .stroke({ color: handColor, width: 2.5, alpha: 0.25 + s.timePressure * 0.25 });
      // Hand glow tip
      g.circle(ccx + Math.cos(handAngle) * clockR * 0.88, ccy + Math.sin(handAngle) * clockR * 0.88, 3 + s.timePressure * 3)
        .fill({ color: handColor, alpha: 0.2 + s.timePressure * 0.3 });
      // Center hub
      g.circle(ccx, ccy, 4).fill({ color: handColor, alpha: 0.2 + s.timePressure * 0.2 });
      g.circle(ccx, ccy, 2).fill({ color: 0xffffff, alpha: 0.15 });
    }

    // Arena border (pulses red under time pressure)
    const borderColor = s.timePressure > 0.3
      ? lerpC(B.COLOR_ARENA_BORDER, B.COLOR_DANGER, s.timePressure)
      : B.COLOR_ARENA_BORDER;
    const borderAlpha = 0.4 + s.timePressure * 0.3;
    g.rect(ox, oy, s.arenaW, s.arenaH).stroke({ color: borderColor, width: 2, alpha: borderAlpha });
    // Time pressure edge pulse
    if (s.timePressure > 0.3) {
      const pulseA = s.timePressure * 0.08 * (0.5 + 0.5 * Math.sin(s.time * 10));
      g.rect(ox, oy, s.arenaW, 2).fill({ color: B.COLOR_DANGER, alpha: pulseA });
      g.rect(ox, oy + s.arenaH - 2, s.arenaW, 2).fill({ color: B.COLOR_DANGER, alpha: pulseA });
      g.rect(ox, oy, 2, s.arenaH).fill({ color: B.COLOR_DANGER, alpha: pulseA });
      g.rect(ox + s.arenaW - 2, oy, 2, s.arenaH).fill({ color: B.COLOR_DANGER, alpha: pulseA });
    }
    // Animated energy nodes along border
    const nodeColor = s.timePressure > 0.3 ? B.COLOR_DANGER : B.COLOR_PLAYER;
    for (let ni = 0; ni < 16; ni++) {
      const nt = (s.time * 0.4 + ni * 0.0625) % 1;
      const side2 = ni % 4;
      let nx2: number, ny2: number;
      if (side2 === 0) { nx2 = ox + s.arenaW * nt; ny2 = oy; }
      else if (side2 === 1) { nx2 = ox + s.arenaW; ny2 = oy + s.arenaH * nt; }
      else if (side2 === 2) { nx2 = ox + s.arenaW * (1 - nt); ny2 = oy + s.arenaH; }
      else { nx2 = ox; ny2 = oy + s.arenaH * (1 - nt); }
      g.circle(nx2, ny2, 1.5).fill({ color: nodeColor, alpha: 0.2 + 0.1 * Math.sin(s.time * 3 + ni) });
    }
    // Ornate corners with glow
    for (const [cx2, cy2, dx3, dy3] of [[0,0,1,1],[s.arenaW,0,-1,1],[0,s.arenaH,1,-1],[s.arenaW,s.arenaH,-1,-1]] as [number,number,number,number][]) {
      const ccx2 = ox + cx2, ccy2 = oy + cy2;
      g.moveTo(ccx2,ccy2+dy3*20).lineTo(ccx2,ccy2).lineTo(ccx2+dx3*20,ccy2)
        .stroke({ color: nodeColor, width: 2.5, alpha: 0.55 });
      g.moveTo(ccx2+dx3*3,ccy2+dy3*16).lineTo(ccx2+dx3*3,ccy2+dy3*3).lineTo(ccx2+dx3*16,ccy2+dy3*3)
        .stroke({ color: nodeColor, width: 1, alpha: 0.2 });
      g.circle(ccx2 + dx3 * 4, ccy2 + dy3 * 4, 2.5).fill({ color: nodeColor, alpha: 0.45 });
      g.circle(ccx2 + dx3 * 4, ccy2 + dy3 * 4, 7).fill({ color: nodeColor, alpha: 0.03 });
    }

    const frame = s.ghostFrame;

    // ----- Ghost trails with afterimage echoes -----
    for (const ghost of s.ghosts) {
      if (ghost.frames.length < 2) continue;
      const step = Math.max(1, Math.floor(ghost.frames.length / 80));
      const headFi = frame % ghost.frames.length;
      // Path lines
      for (let fi = step; fi < ghost.frames.length; fi += step) {
        const f0 = ghost.frames[fi - step], f1 = ghost.frames[fi];
        const distToHead = Math.abs(fi - headFi);
        const nearHead = distToHead < ghost.frames.length * 0.12;
        g.moveTo(ox + f0.x, oy + f0.y).lineTo(ox + f1.x, oy + f1.y)
          .stroke({ color: ghost.color, width: nearHead ? 1.8 : 0.8, alpha: nearHead ? 0.18 : 0.05 });
      }
      // Afterimage echoes (4 fading copies of the ghost behind its current position)
      for (let ei = 1; ei <= 4; ei++) {
        const echoFi = (headFi - ei * 8 + ghost.frames.length) % ghost.frames.length;
        const ef = ghost.frames[echoFi];
        const echoAlpha = 0.12 - ei * 0.025;
        g.circle(ox + ef.x, oy + ef.y, B.PLAYER_RADIUS * (0.9 - ei * 0.1))
          .fill({ color: ghost.color, alpha: echoAlpha });
      }
    }

    // ----- Temporal threads (lines connecting ghosts to player) -----
    for (let gi = 0; gi < s.ghosts.length; gi++) {
      const ghost = s.ghosts[gi];
      if (ghost.frames.length === 0) continue;
      const fi2 = frame % ghost.frames.length;
      const gf = ghost.frames[fi2];
      // Pulsing thread from ghost to player
      const threadAlpha = 0.04 + 0.02 * Math.sin(s.time * 3 + gi * 1.5);
      g.moveTo(ox + s.px, oy + s.py).lineTo(ox + gf.x, oy + gf.y)
        .stroke({ color: ghost.color, width: 0.8, alpha: threadAlpha });
      // Energy dot traveling along thread
      const dotT = (s.time * 1.5 + gi * 0.4) % 1;
      const dtx = s.px + (gf.x - s.px) * dotT;
      const dty = s.py + (gf.y - s.py) * dotT;
      g.circle(ox + dtx, oy + dty, 1.5).fill({ color: ghost.color, alpha: 0.2 });
    }

    // ----- Ghost positions (current frame) — much more visible -----
    for (let gi = 0; gi < s.ghosts.length; gi++) {
      const ghost = s.ghosts[gi];
      if (ghost.frames.length === 0) continue;
      const fi = frame % ghost.frames.length;
      const f = ghost.frames[fi];
      const gx2 = ox + f.x, gy2 = oy + f.y;

      // Bloom glow layers
      g.circle(gx2, gy2, B.PLAYER_RADIUS * 3.5).fill({ color: ghost.color, alpha: 0.015 });
      g.circle(gx2, gy2, B.PLAYER_RADIUS * 2.5).fill({ color: ghost.color, alpha: 0.03 });
      // Body — unique shape per ghost number
      const ghostR = B.PLAYER_RADIUS;
      switch (gi % 5) {
        case 0: // Circle (classic)
          g.circle(gx2, gy2, ghostR).fill({ color: ghost.color, alpha: 0.55 });
          break;
        case 1: // Diamond
          g.star(gx2, gy2, 4, ghostR, ghostR * 0.6).fill({ color: ghost.color, alpha: 0.55 });
          break;
        case 2: // Triangle
          g.star(gx2, gy2, 3, ghostR, ghostR * 0.55).fill({ color: ghost.color, alpha: 0.55 });
          break;
        case 3: // Pentagon
          g.star(gx2, gy2, 5, ghostR, ghostR * 0.7).fill({ color: ghost.color, alpha: 0.55 });
          break;
        case 4: // Hexagon
          g.star(gx2, gy2, 6, ghostR, ghostR * 0.87).fill({ color: ghost.color, alpha: 0.55 });
          break;
      }
      g.circle(gx2, gy2, ghostR).stroke({ color: 0xffffff, width: 1.5, alpha: 0.25 });
      g.circle(gx2, gy2, ghostR * 0.35).fill({ color: 0xffffff, alpha: 0.2 });
      // Aim line (longer, brighter)
      const aimLen = 22;
      g.moveTo(gx2, gy2).lineTo(gx2 + Math.cos(f.aimAngle) * aimLen, gy2 + Math.sin(f.aimAngle) * aimLen)
        .stroke({ color: ghost.color, width: 2, alpha: 0.4 });
      g.circle(gx2 + Math.cos(f.aimAngle) * aimLen, gy2 + Math.sin(f.aimAngle) * aimLen, 2)
        .fill({ color: ghost.color, alpha: 0.5 });
      // Ghost number label (small "1", "2", etc.)
      // Show as orbiting dot with unique pattern per ghost
      const orbA = s.time * 2 + gi * Math.PI / 2;
      g.circle(gx2 + Math.cos(orbA) * B.PLAYER_RADIUS * 1.5, gy2 + Math.sin(orbA) * B.PLAYER_RADIUS * 1.5, 2)
        .fill({ color: ghost.color, alpha: 0.45 });
      // Shooting flash (when ghost fires)
      if (f.shooting) {
        g.circle(gx2 + Math.cos(f.aimAngle) * B.PLAYER_RADIUS, gy2 + Math.sin(f.aimAngle) * B.PLAYER_RADIUS, 4)
          .fill({ color: ghost.color, alpha: 0.25 });
      }
    }

    // ----- Enemies -----
    for (const e of s.enemies) {
      const ex = ox + e.x, ey = oy + e.y;
      const alpha = e.alive ? 1 : Math.max(0, e.deathTimer / 0.3);
      const scale = e.alive ? 1 : 1 + (1 - alpha) * 0.5;
      const r = e.radius * scale;
      const color = e.flashTimer > 0 ? 0xffffff : e.color;

      // Glow (bigger for elites)
      g.circle(ex, ey, r * (e.isElite ? 2.5 : 1.6)).fill({ color: e.color, alpha: alpha * (e.isElite ? 0.06 : 0.04) });
      g.circle(ex, ey, r * (e.isElite ? 1.6 : 1.2)).fill({ color: e.color, alpha: alpha * (e.isElite ? 0.04 : 0.03) });

      if (e.isRusher) {
        // Rusher: triangle + speed lines trailing behind
        g.star(ex, ey, 3, r, r * 0.5).fill({ color, alpha: alpha * 0.85 });
        // Inner triangle
        g.star(ex, ey, 3, r * 0.4, r * 0.2).fill({ color: lerpC(e.color, 0x000000, 0.3), alpha: alpha * 0.3 });
        // Speed streaks behind movement
        if (e.alive) {
          const ea = Math.atan2(s.py - e.y, s.px - e.x);
          for (let si2 = 1; si2 <= 3; si2++) {
            g.circle(ex - Math.cos(ea) * r * si2 * 0.5, ey - Math.sin(ea) * r * si2 * 0.5, r * 0.15)
              .fill({ color: e.color, alpha: alpha * (0.15 - si2 * 0.04) });
          }
        }
      } else if (e.isElite) {
        // Elite: hexagon with armor plates + pulsing core
        g.star(ex, ey, 6, r, r * 0.87).fill({ color, alpha: alpha * 0.85 });
        g.star(ex, ey, 6, r, r * 0.87).stroke({ color: 0xffffff, width: 2.5, alpha: alpha * 0.3 });
        // Inner hex armor
        g.star(ex, ey, 6, r * 0.5, r * 0.43).fill({ color: lerpC(e.color, 0x000000, 0.3), alpha: alpha * 0.25 });
        // Pulsing core
        const ep = 0.7 + 0.3 * Math.sin(s.time * 3);
        g.circle(ex, ey, r * 0.25 * ep).fill({ color: 0xffcc44, alpha: alpha * 0.3 });
        // Rotating armor dots
        for (let ai = 0; ai < 3; ai++) {
          const aa = s.time * 0.5 + ai * Math.PI * 2 / 3;
          g.circle(ex + Math.cos(aa) * r * 0.65, ey + Math.sin(aa) * r * 0.65, 2)
            .fill({ color: 0xcccccc, alpha: alpha * 0.2 });
        }
      } else if (e.isBoss) {
        // Boss: large octagon with multiple layers
        g.star(ex, ey, 8, r, r * 0.92).fill({ color, alpha: alpha * 0.85 });
        g.star(ex, ey, 8, r, r * 0.92).stroke({ color: 0xffffff, width: 3, alpha: alpha * 0.3 });
        g.star(ex, ey, 8, r * 0.6, r * 0.55).fill({ color: lerpC(e.color, 0x000000, 0.3), alpha: alpha * 0.3 });
        // Rotating time sigil inside
        const bsa = s.time * 1.5;
        for (let bi = 0; bi < 4; bi++) {
          const ba = bsa + bi * Math.PI / 2;
          g.moveTo(ex + Math.cos(ba) * r * 0.2, ey + Math.sin(ba) * r * 0.2)
            .lineTo(ex + Math.cos(ba) * r * 0.5, ey + Math.sin(ba) * r * 0.5)
            .stroke({ color: 0xffffff, width: 1, alpha: alpha * 0.2 });
        }
        g.circle(ex, ey, r * 0.15).fill({ color: 0xffffff, alpha: alpha * 0.25 });
      } else {
        // Standard: circle with inner ring + center dot
        g.circle(ex, ey, r).fill({ color, alpha: alpha * 0.85 });
        g.circle(ex, ey, r * 0.55).stroke({ color: lerpC(e.color, 0x000000, 0.3), width: 0.8, alpha: alpha * 0.25 });
        g.circle(ex, ey, r * 0.15).fill({ color: 0xffffff, alpha: alpha * 0.15 });
      }
      // Time stop frozen indicator
      if (s.timeStopActive > 0 && e.alive) {
        g.circle(ex, ey, r + 3).stroke({ color: B.COLOR_TIMER, width: 1.5, alpha: 0.4 });
      }
      g.circle(ex, ey, r).stroke({ color: 0xffffff, width: 0.5, alpha: alpha * 0.08 });
      // Tier indicator (inner dots)
      for (let ti = 0; ti < Math.min(e.tier, 5); ti++) {
        const ta = ti * Math.PI * 2 / Math.min(e.tier, 5) + s.time * 0.5;
        g.circle(ex + Math.cos(ta) * r * 0.5, ey + Math.sin(ta) * r * 0.5, 1.5)
          .fill({ color: 0xffffff, alpha: alpha * 0.15 });
      }
      // Attack telegraph (charging glow before shooting)
      if (e.alive && !e.isRusher && e.attackTimer < 0.6 && e.attackTimer > 0) {
        const chargeProgress = 1 - e.attackTimer / 0.6;
        g.circle(ex, ey, r * (1 + chargeProgress * 0.5)).fill({ color: B.COLOR_ENEMY_PROJ, alpha: chargeProgress * 0.15 });
        g.circle(ex, ey, r * 1.3).stroke({ color: B.COLOR_ENEMY_PROJ, width: 1, alpha: chargeProgress * 0.3 });
      }

      if (e.maxHp > 3 && e.alive) {
        const bw = r * 2.2;
        g.roundRect(ex - bw / 2, ey - r - 6, bw, 3, 1).fill({ color: 0x111111, alpha: 0.6 });
        g.roundRect(ex - bw / 2, ey - r - 6, bw * (e.hp / e.maxHp), 3, 1).fill({ color: B.COLOR_HP, alpha: 0.75 });
      }
      if (!e.alive) {
        const dp = 1 - e.deathTimer / 0.3;
        g.circle(ex, ey, r * (1 + dp * 3)).fill({ color: e.color, alpha: alpha * 0.04 });
        g.circle(ex, ey, r * (1 + dp * 2.5)).stroke({ color: e.color, width: 1.5, alpha: alpha * 0.4 });
      }
    }

    // ----- Bullets (bloom-enhanced, distinct player vs enemy) -----
    for (const b of s.bullets) {
      const bx = ox + b.x, by = oy + b.y;
      const alpha = Math.min(1, b.life * 3);
      const sp = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
      // Trail
      if (sp > 50) {
        const tl = Math.min(12, sp * 0.025);
        g.moveTo(bx - b.vx / sp * tl, by - b.vy / sp * tl).lineTo(bx, by)
          .stroke({ color: b.color, width: b.radius * 0.8, alpha: alpha * 0.4 });
      }
      if (b.fromPlayer) {
        // Player/ghost bullet: bloom + bright core
        g.circle(bx, by, b.radius * 2).fill({ color: b.color, alpha: alpha * 0.06 });
        g.circle(bx, by, b.radius).fill({ color: b.color, alpha: alpha * 0.85 });
        g.circle(bx, by, b.radius * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.5 });
      } else {
        // Enemy bullet: rotating danger star
        const rot = s.time * 8;
        g.circle(bx, by, b.radius * 2).stroke({ color: B.COLOR_DANGER, width: 0.8, alpha: alpha * 0.2 });
        g.star(bx, by, 3, b.radius, b.radius * 0.4, rot).fill({ color: b.color, alpha: alpha * 0.9 });
        g.circle(bx, by, b.radius * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.4 });
      }
    }

    // ----- Particles (with bloom + motion streaks) -----
    for (const p of s.particles) {
      const alpha = p.life / p.maxLife;
      const px2 = ox + p.x, py2 = oy + p.y;
      const sp2 = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (sp2 > 15) {
        const tl2 = Math.min(6, sp2 * 0.02);
        g.moveTo(px2 - p.vx / sp2 * tl2, py2 - p.vy / sp2 * tl2).lineTo(px2, py2)
          .stroke({ color: p.color, width: p.size * alpha * 0.5, alpha: alpha * 0.3 });
      }
      if (p.size > 2) g.circle(px2, py2, p.size * alpha * 2).fill({ color: p.color, alpha: alpha * 0.04 });
      g.circle(px2, py2, p.size * alpha).fill({ color: p.color, alpha });
      if (p.size > 2.5) g.circle(px2, py2, p.size * alpha * 0.3).fill({ color: 0xffffff, alpha: alpha * 0.2 });
    }

    // ----- Time stop overlay -----
    if (s.timeStopActive > 0) {
      const tsAlpha = Math.min(0.08, s.timeStopActive * 0.1);
      g.rect(ox, oy, s.arenaW, s.arenaH).fill({ color: B.COLOR_TIMER, alpha: tsAlpha });
      // Frozen time particles
      for (let tsi = 0; tsi < 8; tsi++) {
        const tsa = s.time * 0.5 + tsi * Math.PI / 4; // slow rotation
        const tsr = Math.min(s.arenaW, s.arenaH) * 0.3;
        g.circle(ccx + Math.cos(tsa) * tsr, ccy + Math.sin(tsa) * tsr, 2)
          .fill({ color: B.COLOR_TIMER, alpha: 0.15 });
      }
    }

    // ----- Loop timer ring around player -----
    if (s.phase === EchoPhase.RECORDING) {
      const ringR = 30;
      const progress = s.loopTimer / s.loopDuration;
      const ringColor = s.timePressure > 0.3 ? B.COLOR_DANGER : B.COLOR_TIMER;
      // Background ring
      g.circle(ox + s.px, oy + s.py, ringR).stroke({ color: ringColor, width: 1.5, alpha: 0.08 });
      // Filled arc segments
      const segs = 36;
      const filled = Math.floor(segs * progress);
      for (let si2 = 0; si2 < segs; si2++) {
        const a1 = -Math.PI / 2 + (si2 / segs) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((si2 + 0.6) / segs) * Math.PI * 2;
        const segAlpha = si2 < filled ? (0.35 + s.timePressure * 0.25) : 0.04;
        g.moveTo(ox + s.px + Math.cos(a1) * ringR, oy + s.py + Math.sin(a1) * ringR)
          .lineTo(ox + s.px + Math.cos(a2) * ringR, oy + s.py + Math.sin(a2) * ringR)
          .stroke({ color: si2 < filled ? ringColor : 0x333366, width: 2.5, alpha: segAlpha });
      }
    }

    // ----- Player (enhanced with bloom, orbit, movement trail) -----
    const ppx = ox + s.px, ppy = oy + s.py;
    if (s.invincibleTimer > 0 && Math.floor(s.invincibleTimer * 8) % 2 === 0) { /* blink */ } else {
      // Bloom layers
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 4.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.012 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 3.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.02 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 2.5).fill({ color: B.COLOR_PLAYER_GLOW, alpha: 0.035 });
      // Body
      g.circle(ppx, ppy, B.PLAYER_RADIUS).fill(B.COLOR_PLAYER);
      g.circle(ppx, ppy, B.PLAYER_RADIUS).stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 });
      g.circle(ppx, ppy, B.PLAYER_RADIUS * 0.4).fill({ color: 0xffffff, alpha: 0.3 });
      // Shield ring (1 ring per ghost level)
      if (s.ghosts.length > 0) {
        const shieldR = B.PLAYER_RADIUS * 1.8;
        g.circle(ppx, ppy, shieldR).stroke({ color: B.COLOR_PLAYER_GLOW, width: 0.5, alpha: 0.08 * s.ghosts.length });
      }
      // Orbiting ghost dots
      for (let oi = 0; oi < s.ghosts.length; oi++) {
        const oa = s.time * 2 + oi * Math.PI * 2 / Math.max(1, s.ghosts.length);
        const orbR2 = B.PLAYER_RADIUS * 2;
        g.circle(ppx + Math.cos(oa) * orbR2, ppy + Math.sin(oa) * orbR2, 2.5)
          .fill({ color: s.ghosts[oi].color, alpha: 0.65 });
        g.circle(ppx + Math.cos(oa) * orbR2, ppy + Math.sin(oa) * orbR2, 6)
          .fill({ color: s.ghosts[oi].color, alpha: 0.04 });
      }
      // Movement trail (3 fading afterimages behind aim)
      const backA = s.aimAngle + Math.PI;
      for (let ti = 1; ti <= 3; ti++) {
        g.circle(ppx + Math.cos(backA) * ti * 5, ppy + Math.sin(backA) * ti * 5, B.PLAYER_RADIUS * (0.7 - ti * 0.15))
          .fill({ color: B.COLOR_PLAYER, alpha: 0.06 - ti * 0.015 });
      }
      // Aim line with readiness indicator
      const aimLen2 = 30;
      const aimAlpha2 = s.shootCooldown <= 0 ? 0.65 : 0.3;
      g.moveTo(ppx, ppy).lineTo(ppx + Math.cos(s.aimAngle) * aimLen2, ppy + Math.sin(s.aimAngle) * aimLen2)
        .stroke({ color: B.COLOR_PLAYER, width: 2, alpha: aimAlpha2 });
      g.circle(ppx + Math.cos(s.aimAngle) * aimLen2, ppy + Math.sin(s.aimAngle) * aimLen2, 3)
        .fill({ color: B.COLOR_PLAYER, alpha: aimAlpha2 });
      // Ready ring on aim dot
      if (s.shootCooldown <= 0) {
        g.circle(ppx + Math.cos(s.aimAngle) * aimLen2, ppy + Math.sin(s.aimAngle) * aimLen2, 6)
          .stroke({ color: B.COLOR_PLAYER, width: 0.8, alpha: 0.2 + 0.1 * Math.sin(s.time * 8) });
      }
    }

    // Recording indicator (enhanced — REC label with pulsing dot + ring)
    if (s.phase === EchoPhase.RECORDING) {
      const rp = 0.5 + 0.5 * Math.sin(s.time * 4);
      // Dot
      g.circle(ox + 15, oy + 15, 5).fill({ color: 0xff3333, alpha: rp });
      // Ring
      g.circle(ox + 15, oy + 15, 9).stroke({ color: 0xff3333, width: 1, alpha: rp * 0.4 });
      // REC label area
      g.roundRect(ox + 23, oy + 8, 30, 14, 3).fill({ color: 0x000000, alpha: 0.4 });
    }

    // Loop transition overlay (dramatic time-rewind effect)
    if (s.loopTransitionTimer > 0) {
      const tp = s.loopTransitionTimer / 0.8;
      // Golden wash
      g.rect(0, 0, sw, sh).fill({ color: B.COLOR_LOOP, alpha: (1 - tp) * 0.12 });
      // Expanding time rings from player
      for (let ri = 0; ri < 4; ri++) {
        const rr = (1 - tp + ri * 0.12) * Math.max(sw, sh) * 0.5;
        if (rr > 0) {
          g.circle(ox + s.px, oy + s.py, rr).stroke({ color: B.COLOR_LOOP, width: 2.5 - ri * 0.5, alpha: tp * 0.3 });
        }
      }
      // Rewind clock hands spinning backward
      const rewindSpeed = (1 - tp) * 30;
      for (let rhi = 0; rhi < 3; rhi++) {
        const rha = -s.time * rewindSpeed + rhi * Math.PI * 2 / 3;
        const rhLen = clockR * 0.7;
        g.moveTo(ccx, ccy).lineTo(ccx + Math.cos(rha) * rhLen, ccy + Math.sin(rha) * rhLen)
          .stroke({ color: B.COLOR_LOOP, width: 1.5, alpha: tp * 0.2 });
      }
      // Radial scan lines
      for (let rli = 0; rli < 8; rli++) {
        const rla = rli * Math.PI / 4 + s.time * 5;
        g.moveTo(ox + s.px, oy + s.py)
          .lineTo(ox + s.px + Math.cos(rla) * sw, oy + s.py + Math.sin(rla) * sw)
          .stroke({ color: B.COLOR_LOOP, width: 0.5, alpha: tp * 0.04 });
      }
    }

    // Screen flash
    if (s.screenFlashTimer > 0) g.rect(0, 0, sw, sh).fill({ color: s.screenFlashColor, alpha: s.screenFlashTimer / B.FLASH_DURATION * 0.2 });

    // Vignette (time-tinted)
    const vigTint = s.loopTransitionTimer > 0 ? B.COLOR_LOOP : 0x000000;
    for (let vi = 0; vi < 6; vi++) {
      const ins = 60 - vi * 10; if (ins <= 0) continue;
      const va = 0.02 + vi * 0.022;
      g.rect(0, 0, ins, sh).fill({ color: vigTint, alpha: va });
      g.rect(sw - ins, 0, ins, sh).fill({ color: vigTint, alpha: va });
      g.rect(ins, 0, sw - ins * 2, ins * 0.5).fill({ color: vigTint, alpha: va });
      g.rect(ins, sh - ins * 0.5, sw - ins * 2, ins * 0.5).fill({ color: vigTint, alpha: va });
    }
    // Cyan time-tint on edges
    g.rect(0, 0, 25, sh).fill({ color: B.COLOR_TIMER, alpha: 0.015 });
    g.rect(sw - 25, 0, 25, sh).fill({ color: B.COLOR_TIMER, alpha: 0.015 });

    // ===== UI =====
    const ui = this._ui; ui.clear();

    // Loop timer ring (circular countdown around player)
    if (s.phase === EchoPhase.RECORDING) {
      const progress = s.loopTimer / s.loopDuration;
      const ringR = 35;
      // Background ring
      g.circle(ppx, ppy, ringR).stroke({ color: B.COLOR_TIMER, width: 2, alpha: 0.1 });
      // Progress arc
      const segments = 40;
      const filled = Math.floor(segments * progress);
      for (let si = 0; si < segments; si++) {
        const a1 = -Math.PI / 2 + (si / segments) * Math.PI * 2;
        const a2 = -Math.PI / 2 + ((si + 0.7) / segments) * Math.PI * 2;
        const alpha2 = si < filled ? 0.5 : 0.05;
        g.moveTo(ppx + Math.cos(a1) * ringR, ppy + Math.sin(a1) * ringR)
          .lineTo(ppx + Math.cos(a2) * ringR, ppy + Math.sin(a2) * ringR)
          .stroke({ color: si < filled ? B.COLOR_TIMER : 0x333366, width: 2.5, alpha: alpha2 });
      }
    }

    // HP bar
    const hpW = 100, hpH = 7, hpX = 10, hpY = sh - 20;
    ui.roundRect(hpX - 1, hpY - 1, hpW + 2, hpH + 2, 3).fill({ color: 0x111122, alpha: 0.7 });
    ui.roundRect(hpX, hpY, hpW * (s.hp / s.maxHp), hpH, 2).fill(B.COLOR_HP);

    // Ghost count indicators
    for (let gi = 0; gi < B.MAX_LOOPS; gi++) {
      const gx3 = hpX + hpW + 12 + gi * 14;
      const filled = gi < s.ghosts.length;
      const color2 = filled ? B.GHOST_COLORS[gi] : 0x222244;
      ui.circle(gx3, hpY + hpH / 2, 4).fill({ color: color2, alpha: filled ? 0.8 : 0.3 });
    }

    // Time stop cooldown indicator
    const tsX = hpX + hpW + 12 + B.MAX_LOOPS * 14 + 8;
    if (s.ghosts.length >= 3) {
      const tsReady = s.timeStopCooldown <= 0 && s.timeStopActive <= 0;
      const tsW = 35, tsH2 = hpH;
      ui.roundRect(tsX, hpY, tsW, tsH2, 2).fill({ color: 0x111122, alpha: 0.6 });
      if (tsReady) {
        ui.roundRect(tsX, hpY, tsW, tsH2, 2).fill({ color: B.COLOR_TIMER, alpha: 0.3 + 0.15 * Math.sin(s.time * 5) });
        ui.roundRect(tsX, hpY, tsW, tsH2, 2).stroke({ color: B.COLOR_TIMER, width: 1, alpha: 0.3 });
      } else if (s.timeStopActive > 0) {
        ui.roundRect(tsX, hpY, tsW * (s.timeStopActive / B.TIME_STOP_DURATION), tsH2, 2).fill({ color: B.COLOR_TIMER, alpha: 0.5 });
      } else {
        ui.roundRect(tsX, hpY, tsW * (1 - s.timeStopCooldown / B.TIME_STOP_COOLDOWN), tsH2, 2).fill({ color: B.COLOR_TIMER, alpha: 0.2 });
      }
    } else {
      // Locked indicator
      ui.roundRect(tsX, hpY, 35, hpH, 2).fill({ color: 0x111122, alpha: 0.4 });
      ui.roundRect(tsX, hpY, 35, hpH, 2).stroke({ color: 0x333344, width: 0.5 });
    }

    // HUD text
    const show = s.phase === EchoPhase.RECORDING || s.phase === EchoPhase.PAUSED || s.phase === EchoPhase.LOOP_COMPLETE;
    this._hudL.visible = show; this._hudR.visible = show;
    if (show) {
      const timeLeft = Math.max(0, Math.ceil(s.loopDuration - s.loopTimer));
      this._hudL.text = `Loop ${s.loopNumber}/${B.MAX_LOOPS}  |  HP: ${s.hp}/${s.maxHp}  |  Time: ${timeLeft}s  |  Ghosts: ${s.ghosts.length}`;
      this._hudL.x = 10; this._hudL.y = 6;
      const cStr = s.combo > 1 ? `  ${s.combo}x` : "";
      this._hudR.text = `Score: ${Math.floor(s.score)}  |  Kills: ${s.totalKills}${cStr}`;
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

    if (s.phase === EchoPhase.START) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.75 });
      show2(this._title, sw / 2, sh * 0.2); show2(this._sub, sw / 2, sh * 0.2 + 55);
      show2(this._ctrl, sw / 2, sh * 0.45);
      this._meta2.visible = true; this._meta2.anchor.set(0.5); this._meta2.x = sw / 2; this._meta2.y = sh * 0.65;
      this._meta2.text = meta.gamesPlayed > 0 ? `High Score: ${meta.highScore}  |  Best Loop: ${meta.bestLoop}  |  Kills: ${meta.totalKills}` : "First echo...";
      show2(this._prompt, sw / 2, sh * 0.8); this._prompt.text = "Press SPACE to begin"; this._prompt.alpha = 0.6 + 0.4 * Math.sin(s.time * 3);
    }
    if (s.phase === EchoPhase.PAUSED) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.5 });
      show2(this._pause, sw / 2, sh * 0.4);
      show2(this._prompt, sw / 2, sh * 0.55);
      this._prompt.text = "ESC — Resume    Q — Quit to menu";
    }
    if (s.phase === EchoPhase.LOOP_COMPLETE) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.4 });
      show2(this._big, sw / 2, sh * 0.2); this._big.text = `LOOP ${s.loopNumber - 1} RECORDED`;
      show2(this._stats, sw / 2, sh * 0.35);
      this._stats.text = `${s.ghosts.length} ghost${s.ghosts.length > 1 ? "s" : ""} will fight with you\n\nChoose an upgrade for the next loop:`;
      show2(this._prompt, sw / 2, sh * 0.55);
      this._prompt.text = `[1] Fire Rate (${s.upgradeFireRate})   [2] Bullet Power (${s.upgradeBulletSize})\n[3] Move Speed (${s.upgradeSpeed})   [4] +Max HP (${s.upgradeMaxHp})\n\nor SPACE to skip`;
      this._prompt.alpha = 0.7 + 0.3 * Math.sin(s.time * 3);
    }
    if (s.phase === EchoPhase.DEAD) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.65 });
      show2(this._dead, sw / 2, sh * 0.25);
      show2(this._stats, sw / 2, sh * 0.45); this._stats.text = `Loop: ${s.loopNumber}  |  Ghosts: ${s.ghosts.length}\nScore: ${Math.floor(s.score)}  |  Kills: ${s.totalKills} (${s.ghostKills} by ghosts)  |  Combo: ${s.bestCombo}x`;
      show2(this._prompt, sw / 2, sh * 0.65); this._prompt.text = "SPACE to retry  |  ESC to exit";
    }
    if (s.phase === EchoPhase.VICTORY) {
      ui.rect(0, 0, sw, sh).fill({ color: 0x000000, alpha: 0.55 });
      show2(this._big, sw / 2, sh * 0.25); this._big.text = "TIME MASTER"; (this._big.style as TextStyle).fill = B.COLOR_GOLD;
      show2(this._stats, sw / 2, sh * 0.45); this._stats.text = `All ${B.MAX_LOOPS} loops complete!\nScore: ${Math.floor(s.score)}  |  Kills: ${s.totalKills} (${s.ghostKills} by ghosts)  |  Combo: ${s.bestCombo}x`;
      show2(this._prompt, sw / 2, sh * 0.65); this._prompt.text = "SPACE to play again  |  ESC to exit";
    }
  }
}
function show2(t: Text, x: number, y: number) { t.visible = true; t.anchor.set(0.5); t.x = x; t.y = y; }
function lerpC(a: number, b: number, t: number): number {
  return (Math.round(((a >> 16) & 0xff) + (((b >> 16) & 0xff) - ((a >> 16) & 0xff)) * t) << 16) |
    (Math.round(((a >> 8) & 0xff) + (((b >> 8) & 0xff) - ((a >> 8) & 0xff)) * t) << 8) |
    Math.round((a & 0xff) + ((b & 0xff) - (a & 0xff)) * t);
}
